"""Coordinate-based adapters for sequential multi-destination planning.

The current provider is the committed local driving graph. The interfaces keep
geocoding/snap, optimization, and directions presentation separate so a future
Google/Mapbox/HERE/OSRM adapter can replace one layer without changing the API.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol
import unicodedata

from .costs import haversine_m
from .graph_store import GraphStore
from .models import (
    LocationInput, Mode, OptimizationMetric, OptimizeRouteRequest,
    OptimizeRouteResponse, OptimizedRouteLeg, RouteTotals, SnappedLocation,
    TspMethod,
)
from .tsp import solve_multiroute_with_paths

AUTO_EXACT_MAX_POINTS = 11
# Accept points just outside the downloaded bbox when they can be snapped to a
# boundary road. This covers normal geocoder/POI rounding without pretending
# the snapshot supports another district (~0.0025° is about 275 m latitude).
SNAP_BBOX_MARGIN_DEG = 0.0025


class RoutePlanningError(ValueError):
    """Expected domain error with a stable public API code."""

    def __init__(self, code: str, message_vi: str) -> None:
        super().__init__(message_vi)
        self.code = code
        self.message_vi = message_vi


class LocationService(Protocol):
    def search(self, query: str, limit: int) -> list[SnappedLocation]: ...

    def snap(self, location: LocationInput) -> SnappedLocation: ...


class DirectionsService(Protocol):
    def geometry(self, path: list[str]) -> str: ...


class OptimizationService(Protocol):
    def optimize(self, request: OptimizeRouteRequest) -> OptimizeRouteResponse: ...


def _fold(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.casefold())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


@dataclass(slots=True)
class LocalGraphLocationService:
    store: GraphStore

    def search(self, query: str, limit: int = 8) -> list[SnappedLocation]:
        needle = _fold(query.strip())
        matches = []
        for node in self.store.graph.nodes:
            name = node.name or node.id
            haystack = _fold(f"{name} {node.id}")
            if needle and needle not in haystack:
                continue
            rank = (0 if _fold(name).startswith(needle) else 1, name.casefold(), node.id)
            matches.append((rank, node))
        matches.sort(key=lambda item: item[0])
        return [
            SnappedLocation(
                id=node.id,
                name=node.name or node.id,
                latitude=node.lat,
                longitude=node.lon,
                node_id=node.id,
                snap_distance_meters=0.0,
            )
            for _rank, node in matches[:limit]
        ]

    def snap(self, location: LocationInput) -> SnappedLocation:
        left, bottom, right, top = self.store.graph.meta.bbox
        if not (
            left - SNAP_BBOX_MARGIN_DEG
            <= location.longitude
            <= right + SNAP_BBOX_MARGIN_DEG
            and bottom - SNAP_BBOX_MARGIN_DEG
            <= location.latitude
            <= top + SNAP_BBOX_MARGIN_DEG
        ):
            raise RoutePlanningError(
                "LOCATION_OUT_OF_BOUNDS",
                f"Địa điểm '{location.name}' nằm ngoài vùng bản đồ được hỗ trợ.",
            )
        node = min(
            self.store.graph.nodes,
            key=lambda candidate: haversine_m(
                location.latitude,
                location.longitude,
                candidate.lat,
                candidate.lon,
            ),
        )
        distance = haversine_m(
            location.latitude, location.longitude, node.lat, node.lon,
        )
        return SnappedLocation(
            id=location.id,
            name=location.name,
            latitude=location.latitude,
            longitude=location.longitude,
            node_id=node.id,
            snap_distance_meters=round(distance, 1),
        )


@dataclass(slots=True)
class LocalGraphDirectionsService:
    store: GraphStore

    def geometry(self, path: list[str]) -> str:
        coordinates = [self.store.coord[node_id] for node_id in path]
        return encode_polyline(coordinates)


def encode_polyline(coordinates: list[tuple[float, float]]) -> str:
    """Encode (latitude, longitude) pairs with Google Polyline precision 5."""

    output: list[str] = []
    previous_lat = previous_lon = 0

    def encode_delta(delta: int) -> None:
        value = ~(delta << 1) if delta < 0 else delta << 1
        while value >= 0x20:
            output.append(chr((0x20 | (value & 0x1F)) + 63))
            value >>= 5
        output.append(chr(value + 63))

    for latitude, longitude in coordinates:
        lat = round(latitude * 100_000)
        lon = round(longitude * 100_000)
        encode_delta(lat - previous_lat)
        encode_delta(lon - previous_lon)
        previous_lat, previous_lon = lat, lon
    return "".join(output)


def metric_to_mode(metric: OptimizationMetric) -> Mode:
    return {
        "duration": "time",
        "distance": "distance",
        "custom": "balanced",
    }[metric]  # type: ignore[return-value]


def choose_method(request: OptimizeRouteRequest) -> TspMethod:
    if request.algorithm != "auto":
        return request.algorithm
    total_points = 1 + len(request.destinations)
    return "held_karp" if total_points <= AUTO_EXACT_MAX_POINTS else "nn_2opt"


@dataclass(slots=True)
class SequentialRouteOptimizationService:
    store: GraphStore

    def optimize(self, request: OptimizeRouteRequest) -> OptimizeRouteResponse:
        if request.travel_mode != "driving":
            label = "đi bộ" if request.travel_mode == "walking" else "xe đạp"
            raise RoutePlanningError(
                "TRAVEL_MODE_UNSUPPORTED",
                f"Snapshot đường hiện tại chỉ hỗ trợ lái xe; chưa hỗ trợ {label}.",
            )

        locations = LocalGraphLocationService(self.store)
        directions = LocalGraphDirectionsService(self.store)
        snapped = [
            locations.snap(request.start),
            *(locations.snap(item) for item in request.destinations),
        ]
        node_ids = [item.node_id for item in snapped]
        if len(set(node_ids)) != len(node_ids):
            raise RoutePlanningError(
                "DUPLICATE_LOCATION",
                "Hai hoặc nhiều địa điểm được định vị vào cùng một nút đường; "
                "hãy chọn các vị trí khác nhau.",
            )

        method = choose_method(request)
        mode = metric_to_mode(request.optimization_metric)
        result, path_matrix = solve_multiroute_with_paths(
            self.store,
            node_ids[0],
            node_ids[1:],
            method,
            mode=mode,
            time_slot=request.time_slot,
            return_to_start=request.return_to_start,
        )
        algorithm = {
            "held_karp": "held-karp",
            "nn_2opt": "nearest-neighbor-2opt",
            "sa": "simulated-annealing",
        }[method]
        if not result.found or result.totals is None or result.original_order_totals is None:
            raise RoutePlanningError(
                "ROUTE_NOT_FOUND",
                "Không tìm thấy đường giữa ít nhất một cặp địa điểm đã chọn.",
            )

        by_node = {item.node_id: item for item in snapped}
        optimized_order = [
            by_node[node_id].model_copy(update={"order": index})
            for index, node_id in enumerate(result.order)
        ]
        legs: list[OptimizedRouteLeg] = []
        route_nodes: list[str] = []
        total_duration_seconds = 0.0
        for leg in result.legs:
            if route_nodes and route_nodes[-1] == leg.path[0]:
                route_nodes.extend(leg.path[1:])
            else:
                route_nodes.extend(leg.path)
            # The legacy LegMetrics.total_time_s is deliberately balanced.
            # Public durationSeconds must be pure traffic-adjusted travel time
            # on this exact selected path, without risk penalties (§C.8).
            duration_seconds = self.store.path_metrics(
                leg.path, "time", request.time_slot,
            )[0]
            total_duration_seconds += duration_seconds
            legs.append(OptimizedRouteLeg(
                from_id=by_node[leg.from_node].id,
                to_id=by_node[leg.to_node].id,
                distance_meters=leg.metrics.total_distance_m,
                duration_seconds=duration_seconds,
                optimization_cost=leg.metrics.total_cost,
                geometry=directions.geometry(leg.path),
                path_node_ids=leg.path,
                directions=[],
            ))

        original = result.original_order_totals
        totals = result.totals
        original_pairs = list(zip(node_ids, node_ids[1:]))
        if request.return_to_start:
            original_pairs.append((node_ids[-1], node_ids[0]))
        original_duration_seconds = sum(
            self.store.path_metrics(
                path_matrix[(from_node, to_node)], "time", request.time_slot,
            )[0]
            for from_node, to_node in original_pairs
        )
        return OptimizeRouteResponse(
            found=True,
            optimized_order=optimized_order,
            legs=legs,
            total_distance_meters=totals.total_distance_m,
            total_duration_seconds=total_duration_seconds,
            total_optimization_cost=totals.total_cost,
            original_order_totals=RouteTotals(
                distance_meters=original.total_distance_m,
                duration_seconds=original_duration_seconds,
                optimization_cost=original.total_cost,
            ),
            savings_percent=result.savings_pct,
            route_geometry=directions.geometry(route_nodes),
            algorithm=algorithm,
            optimal_guarantee=result.optimal_guarantee,
            travel_mode=request.travel_mode,
            optimization_metric=request.optimization_metric,
            return_to_start=request.return_to_start,
        )
