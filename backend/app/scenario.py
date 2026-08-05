"""Request-scoped graph-view resolution for the public API.

Base snapshots stay in ``GraphStore.load()``.  Teaching views are recreated as
small induced stores from the tracked preset config, so neither cached base
models nor on-disk JSON can be mutated by an API request.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .costs import ceil_dm, haversine_m
from .graph_store import GraphStore
from .models import (
    AppliedScenario,
    EdgeOverride,
    GraphFile,
    GraphResponse,
    GraphView,
    GraphViewMeta,
    ScenarioConfig,
    TrafficProfiles,
)


ROOT = Path(__file__).resolve().parents[2]
PRESET_PATH = ROOT / "data" / "teaching_graph_presets.json"
MIN_TEACHING_NODES = 3
MAX_TEACHING_NODES = 50
CHECKPOINT_VIEWS = ("teach_7", "teach_15", "teach_25")
EXPECTED_CHECKPOINT_SHAPES = {
    "teach_7": (7, 24),
    "teach_15": (15, 62),
    "teach_25": (25, 114),
}
CANONICAL_TEACH_7 = (
    "n0018", "n0019", "n0020", "n0022", "n0028", "n0037", "n0038",
)


class GraphViewUnavailable(Exception):
    """Typed boundary failure; details stay in server logs for config errors."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(detail)
        self.status_code = status_code


class ScenarioOverrideError(Exception):
    """Typed, safe public failure for a semantically invalid edge override."""

    status_code: int
    code: str

    def __init__(self, detail: str, *, status_code: int, code: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.code = code


class EdgeNotFound(ScenarioOverrideError):
    def __init__(self, edge_id: str) -> None:
        super().__init__(
            f"edge {edge_id} is not present in the resolved graph view",
            status_code=404,
            code="EDGE_NOT_FOUND",
        )


class InvalidEdgeOverride(ScenarioOverrideError):
    def __init__(self, detail: str) -> None:
        super().__init__(detail, status_code=422, code="INVALID_EDGE_OVERRIDE")


@dataclass(frozen=True)
class TeachingPreset:
    node_ids: tuple[str, ...]
    expected_edge_count: int


@dataclass(frozen=True)
class ResolvedScenario:
    store: GraphStore
    applied_scenario: AppliedScenario


def _config_error(detail: str) -> GraphViewUnavailable:
    return GraphViewUnavailable(detail, status_code=500)


def _strongly_connected(node_ids: set[str], edges: list) -> bool:
    if not node_ids:
        return False
    forward = {node_id: [] for node_id in node_ids}
    reverse = {node_id: [] for node_id in node_ids}
    for edge in edges:
        forward[edge.u].append(edge.v)
        reverse[edge.v].append(edge.u)

    def reached(adjacency: dict[str, list[str]]) -> set[str]:
        root = next(iter(node_ids))
        seen = {root}
        stack = [root]
        while stack:
            for neighbour in adjacency[stack.pop()]:
                if neighbour not in seen:
                    seen.add(neighbour)
                    stack.append(neighbour)
        return seen

    return reached(forward) == node_ids and reached(reverse) == node_ids


def validate_teaching_presets(
    base: GraphStore, preset_path: Path = PRESET_PATH,
) -> dict[str, TeachingPreset]:
    """Parse and fully validate the tracked teaching-view config.

    This deliberately uses the same pure-Python SCC check as the data gate,
    not NetworkX, because it is production runtime code.
    """
    try:
        raw = json.loads(preset_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise _config_error(f"cannot read teaching preset config: {exc}") from exc

    if not isinstance(raw, dict) or set(raw) != {
        "version", "base_graph", "base_created", "node_order", "views",
    }:
        raise _config_error("teaching preset config has an invalid top-level shape")
    if raw["version"] != 2:
        raise _config_error("teaching preset config version must be 2")
    if raw["base_graph"] != base.graph.meta.name:
        raise _config_error("teaching preset base_graph does not match G_demo")
    if raw["base_created"] != base.graph.meta.created.isoformat():
        raise _config_error("teaching preset base_created does not match G_demo")

    base_node_ids = {node.id for node in base.graph.nodes}
    node_order = raw["node_order"]
    if (not isinstance(node_order, list)
            or not all(isinstance(node_id, str) for node_id in node_order)):
        raise _config_error("teaching node_order must be a list of node IDs")
    if len(node_order) != base.graph.meta.node_count or len(set(node_order)) != len(node_order):
        raise _config_error("teaching node_order must contain every base node exactly once")
    if set(node_order) != base_node_ids:
        raise _config_error("teaching node_order does not match the G_demo node set")
    if len(node_order) != MAX_TEACHING_NODES + 1:
        raise _config_error("teaching node_order must contain the canonical 51 nodes")

    views = raw["views"]
    if not isinstance(views, dict) or set(views) != set(CHECKPOINT_VIEWS):
        raise _config_error("teaching preset config must define the three compatibility checkpoints")

    checkpoints: dict[str, TeachingPreset] = {}
    for view in CHECKPOINT_VIEWS:
        item = views[view]
        if not isinstance(item, dict) or set(item) != {"node_ids", "expected_edge_count"}:
            raise _config_error(f"{view} has an invalid shape")
        node_ids = item["node_ids"]
        expected_edge_count = item["expected_edge_count"]
        if (not isinstance(node_ids, list) or not all(isinstance(node_id, str) for node_id in node_ids)
                or isinstance(expected_edge_count, bool) or not isinstance(expected_edge_count, int)):
            raise _config_error(f"{view} has invalid node_ids or expected_edge_count")
        expected_nodes, expected_edges = EXPECTED_CHECKPOINT_SHAPES[view]
        if len(node_ids) != expected_nodes or expected_edge_count != expected_edges:
            raise _config_error(f"{view} does not match its canonical size")
        if len(set(node_ids)) != len(node_ids):
            raise _config_error(f"{view} contains duplicate node IDs")
        unknown = set(node_ids) - base_node_ids
        if unknown:
            raise _config_error(f"{view} contains unknown node IDs: {sorted(unknown)}")
        checkpoints[view] = TeachingPreset(tuple(node_ids), expected_edge_count)

    if set(checkpoints["teach_7"].node_ids) != set(CANONICAL_TEACH_7):
        raise _config_error("teach_7 no longer matches the teaching-generator source set")

    for view, checkpoint in checkpoints.items():
        count = int(view.removeprefix("teach_"))
        node_set = set(node_order[:count])
        if node_set != set(checkpoint.node_ids):
            raise _config_error(f"{view} no longer matches its canonical prefix")
        induced_edges = [
            edge for edge in base.graph.edges
            if edge.u in node_set and edge.v in node_set
        ]
        if len(induced_edges) != checkpoint.expected_edge_count:
            raise _config_error(
                f"{view} has {len(induced_edges)} induced edges, expected "
                f"{checkpoint.expected_edge_count}"
            )

    presets: dict[str, TeachingPreset] = {}
    for count in range(MIN_TEACHING_NODES, len(node_order) + 1):
        node_ids = tuple(node_order[:count])
        node_set = set(node_ids)
        induced_edges = [
            edge for edge in base.graph.edges
            if edge.u in node_set and edge.v in node_set
        ]
        if not _strongly_connected(node_set, induced_edges):
            raise _config_error(f"canonical {count}-node prefix is not strongly connected")
        if count <= MAX_TEACHING_NODES:
            presets[f"teach_{count}"] = TeachingPreset(node_ids, len(induced_edges))
    return presets


def resolve_view_store(base: GraphStore, view: GraphView) -> GraphStore:
    """Return the full base or a new immutable induced teaching view."""
    if view == "full":
        return base
    if base.level != "demo":
        raise GraphViewUnavailable("G_real only supports view=full", status_code=422)

    presets = validate_teaching_presets(base)
    preset = presets.get(view)
    if preset is None:
        raise GraphViewUnavailable(f"unsupported graph view: {view}", status_code=422)
    node_set = set(preset.node_ids)
    nodes = [node for node in base.graph.nodes if node.id in node_set]
    edges = [
        edge for edge in base.graph.edges
        if edge.u in node_set and edge.v in node_set
    ]
    left = min(node.lon for node in nodes)
    bottom = min(node.lat for node in nodes)
    right = max(node.lon for node in nodes)
    top = max(node.lat for node in nodes)
    graph = GraphFile(
        meta=base.graph.meta.model_copy(update={
            "name": f"{base.graph.meta.name}:{view}",
            "bbox": (left, bottom, right, top),
            "node_count": len(nodes),
            "edge_count": len(edges),
        }),
        nodes=nodes,
        edges=edges,
    )
    edge_ids = {edge.id for edge in edges}
    profiles = TrafficProfiles(
        meta=base.profiles.meta.model_copy(update={"graph": graph.meta.name}),
        profiles={
            slot: {
                edge_id: congestion
                for edge_id, congestion in slot_profile.items()
                if edge_id in edge_ids
            }
            for slot, slot_profile in base.profiles.profiles.items()
        },
    )
    return GraphStore(graph, profiles, base.level)


def graph_response(base: GraphStore, view: GraphView) -> GraphResponse:
    """Build the response-only graph envelope without changing persisted JSON."""
    store = resolve_view_store(base, view)
    return GraphResponse(
        **store.graph.model_dump(mode="python"),
        view_meta=GraphViewMeta(
            base_graph=base.level,
            graph_view=view,
            base_node_count=base.graph.meta.node_count,
        ),
    )


def canonical_fingerprint(
    base: GraphStore, graph_view: GraphView, edge_overrides: list[dict[str, Any]] | None = None,
) -> str:
    """Fingerprint validated effective scenario values, never raw request order."""
    payload = {
        "version": "scenario-v1",
        "graph_level": base.level,
        "base_graph": {
            "name": base.graph.meta.name,
            "created": base.graph.meta.created.isoformat(),
        },
        "profile": {
            "created": base.profiles.meta.created.isoformat(),
            "source": base.profiles.meta.source,
        },
        "graph_view": graph_view,
        "edge_overrides": edge_overrides or [],
    }
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return f"scenario-v1:{hashlib.sha256(serialized).hexdigest()}"


def _edge_minimum_length(store: GraphStore, edge_id: str) -> float:
    edge = store.edges[edge_id]
    u, v = store.nodes[edge.u], store.nodes[edge.v]
    return ceil_dm(haversine_m(u.lat, u.lon, v.lat, v.lon))


def _effective_overrides(
    store: GraphStore, overrides: list[EdgeOverride],
) -> list[dict[str, Any]]:
    """Validate semantic constraints and remove accepted no-op fields/edges."""
    effective: list[dict[str, Any]] = []
    for override in overrides:
        edge = store.edges.get(override.edge_id)
        if edge is None:
            raise EdgeNotFound(override.edge_id)
        item: dict[str, Any] = {"edge_id": override.edge_id}
        if override.length_m is not None:
            minimum = _edge_minimum_length(store, override.edge_id)
            if override.length_m < minimum:
                raise InvalidEdgeOverride(
                    f"length_m for {override.edge_id} is below its haversine floor",
                )
            if override.length_m != edge.length_m:
                item["length_m"] = override.length_m
        if override.free_speed_kmh is not None and override.free_speed_kmh != edge.free_speed_kmh:
            item["free_speed_kmh"] = override.free_speed_kmh
        if override.congestion:
            congestion = {
                slot: value for slot, value in override.congestion.items()
                if value != store.congestion(override.edge_id, slot)
            }
            if congestion:
                item["congestion"] = congestion
        if override.risk:
            risk = {
                key: value for key, value in override.risk.model_dump(exclude_none=True).items()
                if value != getattr(edge.risk, key)
            }
            if risk:
                item["risk"] = risk
        if len(item) > 1:
            effective.append(item)
    return sorted(effective, key=lambda item: item["edge_id"])


def _store_with_overrides(
    store: GraphStore, effective: list[dict[str, Any]],
) -> GraphStore:
    """Clone and apply overrides privately; cached stores and JSON stay immutable."""
    graph_raw = store.graph.model_dump(mode="python")
    profiles_raw = store.profiles.model_dump(mode="python")
    edges = {edge["id"]: edge for edge in graph_raw["edges"]}

    for override in effective:
        edge_id = override["edge_id"]
        edge = edges[edge_id]
        if "length_m" in override:
            edge["length_m"] = override["length_m"]
        if "free_speed_kmh" in override:
            edge["free_speed_kmh"] = override["free_speed_kmh"]
        if "risk" in override:
            edge["risk"] = {**edge["risk"], **override["risk"]}
        edge["free_travel_time_s"] = round(
            edge["length_m"] / (edge["free_speed_kmh"] / 3.6), 1,
        )
        for slot, congestion in override.get("congestion", {}).items():
            profiles_raw["profiles"][slot][edge_id] = congestion

    graph = GraphFile.model_validate(graph_raw)
    profiles = TrafficProfiles.model_validate(profiles_raw)
    return GraphStore(graph, profiles, store.level)


def resolve_scenario(
    base: GraphStore, config: ScenarioConfig | None,
) -> ResolvedScenario:
    """Resolve one view/override scenario without mutating shared snapshots."""
    scenario = config or ScenarioConfig()
    store = resolve_view_store(base, scenario.graph_view)
    effective = _effective_overrides(store, scenario.edge_overrides)
    if effective:
        store = _store_with_overrides(store, effective)
    provenance = (
        "sandbox_override" if effective
        else "base" if scenario.graph_view == "full"
        else "graph_view"
    )
    applied = AppliedScenario(
        graph_view=scenario.graph_view,
        override_count=len(effective),
        provenance=provenance,
        fingerprint=canonical_fingerprint(base, scenario.graph_view, effective),
    )
    return ResolvedScenario(store=store, applied_scenario=applied)
