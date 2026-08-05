"""Pydantic v2 models — executable form of docs/SCHEMA.md.

If this file and SCHEMA.md ever disagree, SCHEMA.md wins and this file
must be fixed. Any schema change goes through SCHEMA.md first
(PROMPT-MASTER rule 2).
"""

from __future__ import annotations

import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError

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
GraphView = Annotated[
    str,
    Field(pattern=r"^(?:full|teach_(?:[3-9]|[1-4][0-9]|50))$"),
]
TspMethod = Literal["held_karp", "nn_2opt", "sa"]
NodeType = Literal["landmark", "intersection", "warehouse", "hospital", "school"]

NodeId = Annotated[str, Field(pattern=r"^n\d{4}$")]
EdgeId = Annotated[str, Field(pattern=r"^e\d{5}$")]
Congestion = Annotated[int, Field(ge=1, le=5)]
Flag01 = Literal[0, 1]
FiniteFloat = Annotated[float, Field(allow_inf_nan=False)]
OverrideLength = Annotated[float, Field(strict=True, gt=0, allow_inf_nan=False)]
OverrideSpeed = Annotated[float, Field(strict=True, ge=1, le=200, allow_inf_nan=False)]
OverrideCongestion = Annotated[int, Field(strict=True, ge=1, le=5)]
OverrideFlag = Annotated[int, Field(strict=True, ge=0, le=1)]

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


class GraphViewMeta(StrictModel):
    """Response-only provenance for a resolved graph view."""

    base_graph: GraphLevel
    graph_view: GraphView
    base_node_count: Annotated[int, Field(ge=1)]


class GraphResponse(GraphFile):
    """Graph payload returned by the API; persisted graph JSON stays GraphFile."""

    view_meta: GraphViewMeta


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


ScenarioProvenance = Literal["base", "graph_view", "sandbox_override"]


class AppliedScenario(StrictModel):
    """Server-authoritative scenario provenance echoed on API responses."""

    graph_view: GraphView
    override_count: Annotated[int, Field(ge=0)]
    fingerprint: Annotated[str, Field(pattern=r"^scenario-v1:[0-9a-f]{64}$")]
    provenance: ScenarioProvenance


class Trace(StrictModel):
    algorithm: Algorithm
    mode: Mode
    time_slot: TimeSlot
    graph: GraphLevel
    applied_scenario: AppliedScenario | None = None
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
    epsilon: Annotated[float, Field(gt=0, allow_inf_nan=False)] | None = None


class RiskOverride(StrictModel):
    """Partial risk update for one edge in a request-scoped scenario."""

    flood: OverrideFlag | None = None
    construction: OverrideFlag | None = None
    narrow_alley: OverrideFlag | None = None
    traffic_light: OverrideFlag | None = None

    @model_validator(mode="after")
    def _has_field(self) -> "RiskOverride":
        if all(value is None for value in self.model_dump().values()):
            raise PydanticCustomError(
                "edge_override_empty_risk",
                "risk must contain at least one flag",
            )
        return self


class EdgeOverride(StrictModel):
    """Client-supplied fields only; the server recomputes every derived value."""

    edge_id: EdgeId
    length_m: OverrideLength | None = None
    free_speed_kmh: OverrideSpeed | None = None
    congestion: dict[TimeSlot, OverrideCongestion] | None = None
    risk: RiskOverride | None = None

    @model_validator(mode="after")
    def _has_effective_input(self) -> "EdgeOverride":
        if self.congestion is not None and not self.congestion:
            raise PydanticCustomError(
                "edge_override_empty_congestion",
                "congestion must contain at least one slot",
            )
        if all(value is None for value in (
            self.length_m, self.free_speed_kmh, self.congestion, self.risk,
        )):
            raise PydanticCustomError(
                "edge_override_empty",
                "edge override requires at least one editable field",
            )
        return self


class ScenarioConfig(StrictModel):
    """Request-scoped view plus partial edge overrides; never persisted."""

    graph_view: GraphView = "full"
    edge_overrides: list[EdgeOverride] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique_edge_ids(self) -> "ScenarioConfig":
        edge_ids = [override.edge_id for override in self.edge_overrides]
        if len(edge_ids) != len(set(edge_ids)):
            raise PydanticCustomError(
                "edge_override_duplicate",
                "edge_overrides must contain unique edge_id values",
            )
        return self


class RouteRequest(StrictModel):
    start: NodeId
    goal: NodeId
    algorithm: Algorithm
    mode: Mode = "balanced"
    time_slot: TimeSlot
    graph: GraphLevel = "demo"
    scenario: ScenarioConfig | None = None
    include_trace: bool | None = None  # None -> default: demo=true, real=false
    params: RouteParams | None = None


class MultirouteRequest(StrictModel):
    start: NodeId
    stops: Annotated[list[NodeId], Field(min_length=1, max_length=15)]
    method: TspMethod
    mode: Mode = "balanced"
    time_slot: TimeSlot
    graph: GraphLevel = "demo"
    scenario: ScenarioConfig | None = None
    return_to_start: bool = False
    include_trace: bool = False

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


class AtspCandidate(StrictModel):
    node: NodeId
    cost: FiniteFloat


class HeldKarpUpdateEvent(StrictModel):
    kind: Literal["held_karp_update"]
    ordinal: Annotated[int, Field(ge=0)]
    mask: Annotated[int, Field(ge=0)]
    subset: list[NodeId]
    endpoint: NodeId
    predecessor: NodeId
    candidate_cost: FiniteFloat
    previous_cost: FiniteFloat | None
    new_cost: FiniteFloat


class HeldKarpReconstructEvent(StrictModel):
    kind: Literal["held_karp_reconstruct"]
    ordinal: Annotated[int, Field(ge=0)]
    order: list[NodeId]
    total_cost: FiniteFloat


class NnDecisionEvent(StrictModel):
    kind: Literal["nn_decision"]
    ordinal: Annotated[int, Field(ge=0)]
    current: NodeId
    candidates: list[AtspCandidate]
    selected: NodeId
    order: list[NodeId]


class LocalImprovementEvent(StrictModel):
    kind: Literal["local_improvement"]
    ordinal: Annotated[int, Field(ge=0)]
    move_type: Literal["2_opt", "or_opt"]
    i: Annotated[int, Field(ge=0)]
    j: Annotated[int, Field(ge=0)]
    segment_length: Annotated[int, Field(ge=1)]
    before_order: list[NodeId]
    before_cost: FiniteFloat
    after_order: list[NodeId]
    after_cost: FiniteFloat
    rejected_candidates_since_previous: Annotated[int, Field(ge=0)]

    @model_validator(mode="after")
    def _check_improvement(self) -> "LocalImprovementEvent":
        if not self.after_cost < self.before_cost:
            raise ValueError("local_improvement requires after_cost < before_cost")
        return self


class SaSeedBoundaryEvent(StrictModel):
    kind: Literal["sa_seed_boundary"]
    ordinal: Annotated[int, Field(ge=0)]
    boundary: Literal["start", "end"]
    seed: Annotated[int, Field(ge=0)]
    iteration: Annotated[int, Field(ge=0)]
    temperature: Annotated[FiniteFloat, Field(ge=0)]
    current_order: list[NodeId]
    current_cost: FiniteFloat
    best_order: list[NodeId]
    best_cost: FiniteFloat


class SaIterationEvent(StrictModel):
    kind: Literal["sa_iteration"]
    ordinal: Annotated[int, Field(ge=0)]
    sample_reason: Literal["new_best", "periodic"]
    seed: Annotated[int, Field(ge=0)]
    iteration: Annotated[int, Field(ge=1)]
    temperature: Annotated[FiniteFloat, Field(gt=0)]
    current_order: list[NodeId]
    current_cost: FiniteFloat
    candidate_order: list[NodeId]
    candidate_cost: FiniteFloat
    delta: FiniteFloat
    accepted: bool
    resulting_order: list[NodeId]
    resulting_cost: FiniteFloat
    best_order: list[NodeId]
    best_cost: FiniteFloat


class SaSeedOptimizerStats(StrictModel):
    seed: Annotated[int, Field(ge=0)]
    iterations: Annotated[int, Field(ge=0)]
    final_cost: FiniteFloat
    best_cost: FiniteFloat
    best_order: list[NodeId]

    @model_validator(mode="after")
    def _check_best(self) -> "SaSeedOptimizerStats":
        if self.best_cost > self.final_cost:
            raise ValueError("best_cost cannot exceed final_cost")
        return self


class SaOptimizerStats(StrictModel):
    seeds: list[SaSeedOptimizerStats]
    best_seed: Annotated[int, Field(ge=0)]
    best_cost: FiniteFloat
    mean_best_cost: FiniteFloat
    stddev_best_cost: Annotated[FiniteFloat, Field(ge=0)]

    @model_validator(mode="after")
    def _check_seeds(self) -> "SaOptimizerStats":
        if [item.seed for item in self.seeds] != list(range(5)):
            raise ValueError("SA optimizer stats require seeds 0 through 4 in order")
        costs = [item.best_cost for item in self.seeds]
        if self.best_cost != min(costs):
            raise ValueError("best_cost must equal the minimum per-seed best_cost")
        if self.best_seed not in [item.seed for item in self.seeds]:
            raise ValueError("best_seed must be present in seeds")
        return self


class SaFinalBestEvent(StrictModel):
    kind: Literal["sa_final_best"]
    ordinal: Annotated[int, Field(ge=0)]
    final_order: list[NodeId]
    final_cost: FiniteFloat
    optimizer_stats: SaOptimizerStats


class OptimizationSummaryEvent(StrictModel):
    kind: Literal["optimization_summary"]
    ordinal: Annotated[int, Field(ge=0)]
    method: TspMethod
    final_order: list[NodeId]
    final_cost: FiniteFloat


OptimizationEvent = Annotated[
    HeldKarpUpdateEvent
    | HeldKarpReconstructEvent
    | NnDecisionEvent
    | LocalImprovementEvent
    | SaSeedBoundaryEvent
    | SaIterationEvent
    | SaFinalBestEvent
    | OptimizationSummaryEvent,
    Field(discriminator="kind"),
]


class OptimizationTrace(StrictModel):
    method: TspMethod
    total_events: Annotated[int, Field(ge=0)]
    recorded_events: Annotated[int, Field(ge=0)]
    sampling_policy: Literal[
        "all-or-stride-v1",
        "chronological-prefix-final-v1",
        "priority-periodic-20-v1",
    ]
    trace_truncated: bool
    events: list[OptimizationEvent]

    @model_validator(mode="after")
    def _check(self) -> "OptimizationTrace":
        if self.recorded_events != len(self.events):
            raise ValueError("recorded_events must equal len(events)")
        if self.total_events < self.recorded_events:
            raise ValueError("total_events cannot be less than recorded_events")
        if self.trace_truncated != (self.total_events > self.recorded_events):
            raise ValueError("trace_truncated must reflect total_events > recorded_events")
        expected_policy = {
            "held_karp": "all-or-stride-v1",
            "nn_2opt": "chronological-prefix-final-v1",
            "sa": "priority-periodic-20-v1",
        }[self.method]
        if self.sampling_policy != expected_policy:
            raise ValueError("sampling_policy does not match optimization method")
        if not self.events or self.events[-1].kind != "optimization_summary":
            raise ValueError("optimization_summary must be the final event")
        if self.events[-1].method != self.method:
            raise ValueError("optimization_summary method must match trace method")
        ordinals = [event.ordinal for event in self.events]
        if any(next_ordinal <= ordinal for ordinal, next_ordinal in zip(ordinals, ordinals[1:])):
            raise ValueError("event ordinals must be strictly increasing")

        kinds = {event.kind for event in self.events[:-1]}
        allowed = {
            "held_karp": {"held_karp_update", "held_karp_reconstruct"},
            "nn_2opt": {"nn_decision", "local_improvement"},
            "sa": {"sa_seed_boundary", "sa_iteration", "sa_final_best"},
        }[self.method]
        if not kinds <= allowed:
            raise ValueError("optimization event kind does not match trace method")
        if self.method == "held_karp":
            if len(self.events) < 2 or self.events[-2].kind != "held_karp_reconstruct":
                raise ValueError("held_karp reconstruction must precede the summary")
        if self.method == "sa":
            if len(self.events) < 2 or self.events[-2].kind != "sa_final_best":
                raise ValueError("SA final-best event must precede the summary")
        return self


class MultirouteResponse(StrictModel):
    method: TspMethod
    mode: Mode
    time_slot: TimeSlot
    graph: GraphLevel
    applied_scenario: AppliedScenario | None = None
    found: bool
    order: list[NodeId]
    legs: list[Leg]
    totals: LegMetrics | None
    original_order_totals: LegMetrics | None
    savings_pct: float | None
    optimal_guarantee: bool
    optimization_trace: OptimizationTrace | None = None
    optimizer_stats: SaOptimizerStats | None = None

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
        if not self.found and (self.optimization_trace is not None or self.optimizer_stats is not None):
            raise ValueError("found=false requires null optimization_trace and optimizer_stats")
        if self.found and self.optimization_trace is not None:
            if self.optimization_trace.method != self.method:
                raise ValueError("optimization trace method must match response method")
        if self.method == "sa":
            if self.found and self.optimizer_stats is None:
                raise ValueError("reachable SA response requires optimizer_stats")
        elif self.optimizer_stats is not None:
            raise ValueError("optimizer_stats is SA-only")
        return self


class HealthResponse(StrictModel):
    status: Literal["ok"]
    versions: dict[str, str]


class TrafficResponse(StrictModel):
    slot: TimeSlot
    graph: GraphLevel
    graph_view: GraphView = "full"
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
        "NODE_NOT_FOUND", "RESULTS_NOT_FOUND", "VALIDATION_ERROR", "HELD_KARP_LIMIT",
        "GRAPH_VIEW_UNAVAILABLE", "EDGE_NOT_FOUND", "INVALID_EDGE_OVERRIDE", "INTERNAL",
    ]
    message_vi: str


class ErrorResponse(StrictModel):
    error: ErrorDetail
