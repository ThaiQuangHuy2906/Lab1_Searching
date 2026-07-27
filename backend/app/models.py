"""Pydantic v2 models — executable form of docs/SCHEMA.md.

If this file and SCHEMA.md ever disagree, SCHEMA.md wins and this file
must be fixed. Any schema change goes through SCHEMA.md first
(PROMPT-MASTER rule 2).
"""

from __future__ import annotations

import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ---------------------------------------------------------------------------
# Shared enums / aliases (SCHEMA.md — "Các enum dùng chung")
# ---------------------------------------------------------------------------

Algorithm = Literal[
    "bfs", "dfs", "iddfs", "ucs", "dijkstra",
    "astar", "greedy", "bidijkstra", "idastar", "beam",
]
Mode = Literal["distance", "time", "balanced"]
TimeSlot = Literal["07:30", "12:00", "17:30", "22:00"]
GraphLevel = Literal["demo", "real"]
TspMethod = Literal["held_karp", "nn_2opt", "sa"]
NodeType = Literal["landmark", "intersection", "warehouse", "hospital", "school"]

NodeId = Annotated[str, Field(pattern=r"^n\d{4}$")]
EdgeId = Annotated[str, Field(pattern=r"^e\d{5}$")]
Congestion = Annotated[int, Field(ge=1, le=5)]
Flag01 = Literal[0, 1]

TIME_SLOTS: tuple[TimeSlot, ...] = ("07:30", "12:00", "17:30", "22:00")

#: Which of g/h/f each algorithm must populate in trace steps (SCHEMA §B.3).
TRACE_FIELD_SPEC: dict[str, tuple[bool, bool, bool]] = {
    "bfs": (False, False, False),
    "dfs": (False, False, False),
    "iddfs": (False, False, False),
    "ucs": (True, False, False),
    "dijkstra": (True, False, False),
    "bidijkstra": (True, False, False),
    "greedy": (False, True, False),
    "astar": (True, True, True),
    "idastar": (True, True, True),
    "beam": (True, True, True),
}

# Rounding tolerance for free_travel_time_s (stored rounded to 0.1 s).
_TIME_FORMULA_TOL_S = 0.06


class StrictModel(BaseModel):
    """Base: unknown keys are schema violations."""

    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------------------------
# §A — graph.json + traffic_profiles.json
# ---------------------------------------------------------------------------


class RiskFlags(StrictModel):
    flood: Flag01 = 0
    construction: Flag01 = 0
    narrow_alley: Flag01 = 0
    traffic_light: Flag01 = 0


class GraphMeta(StrictModel):
    name: str
    bbox: tuple[float, float, float, float]  # [left, bottom, right, top]
    directed: Literal[True]
    created: datetime.date
    crs: Literal["EPSG:4326"]
    node_count: Annotated[int, Field(ge=1)]
    edge_count: Annotated[int, Field(ge=1)]


class Node(StrictModel):
    id: NodeId
    name: str | None
    lat: Annotated[float, Field(ge=-90, le=90)]
    lon: Annotated[float, Field(ge=-180, le=180)]
    type: NodeType


class Edge(StrictModel):
    id: EdgeId
    u: NodeId
    v: NodeId
    name: str | None
    length_m: Annotated[float, Field(gt=0)]
    highway: str
    oneway: bool
    free_speed_kmh: Annotated[float, Field(gt=0)]
    free_travel_time_s: Annotated[float, Field(gt=0)]
    risk: RiskFlags

    @model_validator(mode="after")
    def _check(self) -> "Edge":
        if self.u == self.v:
            raise ValueError(f"edge {self.id}: self-loop {self.u} -> {self.v}")
        expected = self.length_m / (self.free_speed_kmh / 3.6)
        if abs(self.free_travel_time_s - expected) > _TIME_FORMULA_TOL_S:
            raise ValueError(
                f"edge {self.id}: free_travel_time_s={self.free_travel_time_s} "
                f"deviates from length_m/(free_speed_kmh/3.6)={expected:.3f}"
            )
        return self


class GraphFile(StrictModel):
    """Whole graph.json document (G_demo / G_real / mock)."""

    meta: GraphMeta
    nodes: list[Node]
    edges: list[Edge]

    @model_validator(mode="after")
    def _check(self) -> "GraphFile":
        if len(self.nodes) != self.meta.node_count:
            raise ValueError(
                f"meta.node_count={self.meta.node_count} != len(nodes)={len(self.nodes)}"
            )
        if len(self.edges) != self.meta.edge_count:
            raise ValueError(
                f"meta.edge_count={self.meta.edge_count} != len(edges)={len(self.edges)}"
            )

        node_ids = [n.id for n in self.nodes]
        if len(set(node_ids)) != len(node_ids):
            raise ValueError("duplicate node ids")
        node_set = set(node_ids)

        left, bottom, right, top = self.meta.bbox
        for n in self.nodes:
            if not (left <= n.lon <= right and bottom <= n.lat <= top):
                raise ValueError(f"node {n.id} ({n.lat}, {n.lon}) outside meta.bbox")

        edge_ids = [e.id for e in self.edges]
        if len(set(edge_ids)) != len(edge_ids):
            raise ValueError("duplicate edge ids")

        seen_uv: dict[tuple[str, str], str] = {}
        for e in self.edges:
            if e.u not in node_set or e.v not in node_set:
                raise ValueError(f"edge {e.id}: endpoint not in nodes")
            if (e.u, e.v) in seen_uv:
                raise ValueError(
                    f"edges {seen_uv[(e.u, e.v)]} and {e.id} duplicate pair ({e.u}, {e.v})"
                )
            seen_uv[(e.u, e.v)] = e.id

        # Two-way street rule: oneway=false edge requires a reverse twin.
        for e in self.edges:
            if not e.oneway:
                twin = seen_uv.get((e.v, e.u))
                if twin is None:
                    raise ValueError(
                        f"edge {e.id} is oneway=false but reverse edge ({e.v}->{e.u}) is missing"
                    )
        return self


class ProfilesMeta(StrictModel):
    graph: str
    created: datetime.date
    source: Literal["tomtom+synthetic", "synthetic"]


class TrafficProfiles(StrictModel):
    """traffic_profiles.json — congestion 1–5 per edge per time slot."""

    meta: ProfilesMeta
    profiles: dict[TimeSlot, dict[str, Congestion]]

    @model_validator(mode="after")
    def _check(self) -> "TrafficProfiles":
        missing = [s for s in TIME_SLOTS if s not in self.profiles]
        if missing:
            raise ValueError(f"missing time slots: {missing}")
        return self


# ---------------------------------------------------------------------------
# §B — trace (single return contract for all 10 algorithms)
# ---------------------------------------------------------------------------


class TraceStep(StrictModel):
    step: Annotated[int, Field(ge=1)]
    expanded: NodeId
    frontier: list[NodeId]
    g: dict[str, float] | None = None
    h: dict[str, float] | None = None
    f: dict[str, float] | None = None
    depth_limit: Annotated[int, Field(ge=0)] | None = None  # iddfs only
    # bidijkstra only: which search direction expanded at this step. A node
    # present in both frontiers shows the SMALLER of its two g values.
    side: Literal["forward", "backward"] | None = None


class Metrics(StrictModel):
    total_cost: float | None
    total_distance_m: float | None
    total_time_s: float | None
    nodes_expanded: Annotated[int, Field(ge=0)]
    max_frontier: Annotated[int, Field(ge=0)]
    runtime_ms: Annotated[float, Field(ge=0)]
    optimal_guarantee: bool  # guarantee for this completed/terminated run
    epsilon_bound: float | None = None  # idastar only
    beam_width: Annotated[int, Field(ge=1)] | None = None  # beam only
    trace_truncated: bool = False


class CongestedSegment(StrictModel):
    edge: EdgeId
    name: str | None
    level: Congestion


class Alternative(StrictModel):
    label: str
    path: list[NodeId]
    total_distance_m: float
    total_time_s: float
    why_not_vi: str


class Explanation(StrictModel):
    """Filled by explain.py (Phase 4); Phases 2–3 return the empty shape."""

    summary_vi: str = ""
    congested_segments: list[CongestedSegment] = []
    alternatives: list[Alternative] = []


class Trace(StrictModel):
    algorithm: Algorithm
    mode: Mode
    time_slot: TimeSlot
    graph: GraphLevel
    found: bool
    path: list[NodeId]
    metrics: Metrics
    trace: list[TraceStep] = []
    explanation: Explanation = Explanation()

    @model_validator(mode="after")
    def _check(self) -> "Trace":
        if self.found and not self.path:
            raise ValueError("found=true requires a non-empty path")
        if not self.found:
            if self.path:
                raise ValueError("found=false requires path=[]")
            m = self.metrics
            if not (m.total_cost is None and m.total_distance_m is None and m.total_time_s is None):
                raise ValueError("found=false requires null total_cost/total_distance_m/total_time_s")

        if self.metrics.epsilon_bound is not None and self.algorithm != "idastar":
            raise ValueError("metrics.epsilon_bound is idastar-only")
        if self.metrics.beam_width is not None and self.algorithm != "beam":
            raise ValueError("metrics.beam_width is beam-only")

        need_g, need_h, need_f = TRACE_FIELD_SPEC[self.algorithm]
        for st in self.trace:
            for field_name, need in (("g", need_g), ("h", need_h), ("f", need_f)):
                val = getattr(st, field_name)
                if need and val is None:
                    raise ValueError(
                        f"step {st.step}: {self.algorithm} requires '{field_name}' (SCHEMA §B.3)"
                    )
                if not need and val is not None:
                    raise ValueError(
                        f"step {st.step}: {self.algorithm} must keep '{field_name}' null (SCHEMA §B.3)"
                    )
            if self.algorithm == "iddfs":
                if st.depth_limit is None:
                    raise ValueError(f"step {st.step}: iddfs requires depth_limit")
            elif st.depth_limit is not None:
                raise ValueError(f"step {st.step}: depth_limit is iddfs-only")
            if self.algorithm == "bidijkstra":
                if st.side is None:
                    raise ValueError(f"step {st.step}: bidijkstra requires side")
            elif st.side is not None:
                raise ValueError(f"step {st.step}: side is bidijkstra-only")
        return self


# ---------------------------------------------------------------------------
# §C — REST API request/response models
# ---------------------------------------------------------------------------


class RouteParams(StrictModel):
    beam_width: Annotated[int, Field(ge=1)] | None = None
    epsilon: Annotated[float, Field(gt=0)] | None = None


class RouteRequest(StrictModel):
    start: NodeId
    goal: NodeId
    algorithm: Algorithm
    mode: Mode = "balanced"
    time_slot: TimeSlot
    graph: GraphLevel = "demo"
    include_trace: bool | None = None  # None -> default: demo=true, real=false
    params: RouteParams | None = None


class MultirouteRequest(StrictModel):
    start: NodeId
    stops: Annotated[list[NodeId], Field(min_length=1, max_length=15)]
    method: TspMethod
    mode: Mode = "balanced"
    time_slot: TimeSlot
    graph: GraphLevel = "demo"
    return_to_start: bool = False

    @model_validator(mode="after")
    def _check(self) -> "MultirouteRequest":
        if len(set(self.stops)) != len(self.stops):
            raise ValueError("stops must be unique")
        if self.start in self.stops:
            raise ValueError("start must not appear in stops")
        k = 1 + len(self.stops)
        if self.method == "held_karp" and k > 15:
            raise ValueError(
                f"held_karp supports at most 15 points total, got {k}; use nn_2opt or sa"
            )
        return self


class LegMetrics(StrictModel):
    total_cost: float
    total_distance_m: float
    total_time_s: float


class Leg(StrictModel):
    """One start->stop segment of a multiroute answer (condensed trace)."""

    from_node: NodeId
    to_node: NodeId
    path: list[NodeId]
    metrics: LegMetrics


class MultirouteResponse(StrictModel):
    method: TspMethod
    mode: Mode
    time_slot: TimeSlot
    graph: GraphLevel
    found: bool
    order: list[NodeId]
    legs: list[Leg]
    totals: LegMetrics | None
    original_order_totals: LegMetrics | None
    savings_pct: float | None
    optimal_guarantee: bool

    @model_validator(mode="after")
    def _check(self) -> "MultirouteResponse":
        if self.found:
            if not self.order or not self.legs:
                raise ValueError("found=true requires non-empty order and legs")
            if self.totals is None or self.original_order_totals is None or self.savings_pct is None:
                raise ValueError("found=true requires totals, original_order_totals, savings_pct")
            for prev, nxt in zip(self.legs, self.legs[1:]):
                if prev.to_node != nxt.from_node:
                    raise ValueError("legs must chain: to_node of leg i == from_node of leg i+1")
            if self.legs[0].from_node != self.order[0]:
                raise ValueError("first leg must start at order[0]")
        elif self.order or self.legs:
            raise ValueError("found=false requires empty order and legs")
        return self


class HealthResponse(StrictModel):
    status: Literal["ok"]
    versions: dict[str, str]


class TrafficResponse(StrictModel):
    slot: TimeSlot
    graph: GraphLevel
    congestion: dict[str, Congestion]


class BenchmarkRequest(StrictModel):
    experiment_id: Annotated[int, Field(ge=1, le=7)] | None = None


class ExperimentResult(StrictModel):
    experiment_id: Annotated[int, Field(ge=1, le=7)]
    csv_path: str
    fig_paths: list[str]
    rows: list[dict]


class BenchmarkResponse(StrictModel):
    experiments: list[ExperimentResult]


class ErrorDetail(StrictModel):
    code: Literal[
        "NODE_NOT_FOUND", "RESULTS_NOT_FOUND", "VALIDATION_ERROR", "HELD_KARP_LIMIT", "INTERNAL"
    ]
    message_vi: str


class ErrorResponse(StrictModel):
    error: ErrorDetail
