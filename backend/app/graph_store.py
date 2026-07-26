"""GraphStore — loads a graph + its traffic profiles and serves weights.

One store per graph level ("demo" | "real"); `GraphStore.load(level)` is
memoized. Weights for all (mode, time_slot) pairs are precomputed at load
time so the search algorithms only do dict lookups on the hot path.

The algorithms themselves (search.py, Phase 2/3) use plain Python +
heapq on the adjacency lists exposed here — no NetworkX in product code
(PROMPT-MASTER rule 6).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from .costs import edge_weight, haversine_m, heuristic_m, heuristic_s
from .models import (
    Edge, GraphFile, GraphLevel, Mode, Node, TimeSlot, TrafficProfiles,
    TIME_SLOTS,
)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"

MODES: tuple[Mode, ...] = ("distance", "time", "balanced")


class GraphStore:
    """Immutable view of one graph + profiles, with precomputed weights."""

    def __init__(self, graph: GraphFile, profiles: TrafficProfiles,
                 level: GraphLevel) -> None:
        self.level: GraphLevel = level
        self.graph = graph
        self.profiles = profiles

        self.nodes: dict[str, Node] = {n.id: n for n in graph.nodes}
        self.coord: dict[str, tuple[float, float]] = {
            n.id: (n.lat, n.lon) for n in graph.nodes
        }
        self.edges: dict[str, Edge] = {e.id: e for e in graph.edges}
        self.edge_by_uv: dict[tuple[str, str], Edge] = {
            (e.u, e.v): e for e in graph.edges
        }
        # Neighbor order is stable (sorted by edge id) — DFS/BFS determinism.
        self.adj: dict[str, list[tuple[str, str]]] = {n.id: [] for n in graph.nodes}
        self.radj: dict[str, list[tuple[str, str]]] = {n.id: [] for n in graph.nodes}
        for e in graph.edges:  # graph.edges is already id-sorted per SCHEMA
            self.adj[e.u].append((e.v, e.id))
            self.radj[e.v].append((e.u, e.id))

        self.v_max_ms: float = max(e.free_speed_kmh for e in graph.edges) / 3.6

        # weight[(mode, slot)][edge_id] — ~12 * |E| floats, trivial memory.
        self._weight: dict[tuple[Mode, TimeSlot], dict[str, float]] = {}
        for mode in MODES:
            for slot in TIME_SLOTS:
                cong = profiles.profiles[slot]
                self._weight[(mode, slot)] = {
                    e.id: edge_weight(e, cong[e.id], mode) for e in graph.edges
                }

    # ------------------------------------------------------------------ api

    def has_node(self, node_id: str) -> bool:
        return node_id in self.nodes

    def congestion(self, edge_id: str, slot: TimeSlot) -> int:
        return self.profiles.profiles[slot][edge_id]

    def weight(self, edge_id: str, mode: Mode, slot: TimeSlot) -> float:
        return self._weight[(mode, slot)][edge_id]

    def weights(self, mode: Mode, slot: TimeSlot) -> dict[str, float]:
        """The full edge_id -> weight map for one (mode, slot) — hot path."""
        return self._weight[(mode, slot)]

    def heuristic(self, node_id: str, goal_id: str, mode: Mode) -> float:
        (lat, lon), (glat, glon) = self.coord[node_id], self.coord[goal_id]
        if mode == "distance":
            return heuristic_m(lat, lon, glat, glon)
        return heuristic_s(lat, lon, glat, glon, self.v_max_ms)

    def straight_line_m(self, a: str, b: str) -> float:
        (la, lo), (lb, lo2) = self.coord[a], self.coord[b]
        return haversine_m(la, lo, lb, lo2)

    def path_metrics(self, path: list[str], mode: Mode, slot: TimeSlot
                     ) -> tuple[float, float, float]:
        """(total_cost by mode, total_distance_m, total_time_s).

        total_time_s is ALWAYS the balanced-weight sum (SCHEMA §B.2) so
        routes from different modes stay comparable.
        """
        cost = dist = time_s = 0.0
        for a, b in zip(path, path[1:]):
            e = self.edge_by_uv[(a, b)]
            cost += self._weight[(mode, slot)][e.id]
            dist += e.length_m
            time_s += self._weight[("balanced", slot)][e.id]
        return cost, dist, time_s

    # ---------------------------------------------------------------- load

    @staticmethod
    @lru_cache(maxsize=4)
    def load(level: GraphLevel, data_dir: str | None = None) -> "GraphStore":
        base = Path(data_dir) if data_dir else DATA_DIR
        graph = GraphFile.model_validate_json(
            (base / f"graph_{level}.json").read_text(encoding="utf-8"))
        profiles = TrafficProfiles.model_validate_json(
            (base / f"traffic_profiles_{level}.json").read_text(encoding="utf-8"))
        return GraphStore(graph, profiles, level)
