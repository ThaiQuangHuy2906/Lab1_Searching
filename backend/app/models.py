"""Pydantic v2 models — executable form of docs/SCHEMA.md.

If this file and SCHEMA.md ever disagree, SCHEMA.md wins and this file
must be fixed. Any schema change goes through SCHEMA.md first
(PROMPT-MASTER rule 2).
"""

from __future__ import annotations

import datetime
import math
import statistics
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError

# ---------------------------------------------------------------------------
# Shared enums / aliases (SCHEMA.md — "Các enum dùng chung")
# ---------------------------------------------------------------------------

Algorithm = Literal[
    "bfs", "dfs", "iddfs", "ucs",
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
NonNegativeFiniteFloat = Annotated[float, Field(ge=0, allow_inf_nan=False)]
OverrideLength = Annotated[float, Field(strict=True, gt=0, allow_inf_nan=False)]
OverrideSpeed = Annotated[float, Field(strict=True, ge=1, le=200, allow_inf_nan=False)]
OverrideCongestion = Annotated[int, Field(strict=True, ge=1, le=5)]
OverrideFlag = Annotated[int, Field(strict=True, ge=0, le=1)]

TIME_SLOTS: tuple[TimeSlot, ...] = ("07:30", "12:00", "17:30", "22:00")

COMPARISON_ABS_TOLERANCE = 1e-6
COMPARISON_REL_TOLERANCE = 1e-9


def comparison_equivalent(left: float, right: float) -> bool:
    """Raw-value equality used by the public v2 contract (SCHEMA §F.1)."""
    return math.isclose(
        left,
        right,
        rel_tol=COMPARISON_REL_TOLERANCE,
        abs_tol=COMPARISON_ABS_TOLERANCE,
    )

#: Which of g/h/f each algorithm must populate in trace steps (SCHEMA §B.3).
TRACE_FIELD_SPEC: dict[str, tuple[bool, bool, bool]] = {
    "bfs": (False, False, False),
    "dfs": (False, False, False),
    "iddfs": (False, False, False),
    "ucs": (True, False, False),
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
# §B — trace (single return contract for all 9 algorithms)
# ---------------------------------------------------------------------------


SelectionRule = Literal[
    "fifo", "lifo", "depth_limited_lifo", "lowest_g", "lowest_h",
    "lowest_f_then_h", "bidirectional_min_key", "f_bound_dfs", "top_k_f",
]
TerminationReason = Literal[
    "start_equals_goal", "goal_expanded", "bidirectional_bound_met",
    "frontier_exhausted", "depth_cap_reached", "round_cap_reached",
    "beam_exhausted_after_pruning",
]
ReachabilityConclusion = Literal[
    "route_found", "proven_unreachable", "inconclusive",
]
SolutionQuality = Literal[
    "exact", "epsilon_bounded", "feasible_unproven", "not_applicable",
]

SELECTION_RULE_BY_ALGORITHM: dict[str, SelectionRule] = {
    "bfs": "fifo",
    "dfs": "lifo",
    "iddfs": "depth_limited_lifo",
    "ucs": "lowest_g",
    "astar": "lowest_f_then_h",
    "greedy": "lowest_h",
    "bidijkstra": "bidirectional_min_key",
    "idastar": "f_bound_dfs",
    "beam": "top_k_f",
}


class DecisionScores(StrictModel):
    g: NonNegativeFiniteFloat | None
    h: NonNegativeFiniteFloat | None
    f: NonNegativeFiniteFloat | None
    depth: Annotated[int, Field(ge=0)] | None


class DecisionCandidate(DecisionScores):
    node: NodeId


class BidirectionalTop(StrictModel):
    node: NodeId
    g: NonNegativeFiniteFloat


class TraceDecision(StrictModel):
    rule: SelectionRule
    selected_scores: DecisionScores | None
    runner_up: DecisionCandidate | None
    frontier_size_before: Annotated[int, Field(ge=0)]
    frontier_size_after: Annotated[int, Field(ge=0)]
    neighbors_scanned: Annotated[int, Field(ge=0)]
    frontier_added: Annotated[int, Field(ge=0)]
    frontier_updated: Annotated[int, Field(ge=0)]
    pruned_count: Annotated[int, Field(ge=0)]
    iteration: Annotated[int, Field(ge=1)] | None
    bound: NonNegativeFiniteFloat | None
    layer: Annotated[int, Field(ge=1)] | None
    beam_width: Annotated[int, Field(ge=1)] | None
    top_forward: BidirectionalTop | None
    top_backward: BidirectionalTop | None
    mu_before: NonNegativeFiniteFloat | None

    @model_validator(mode="after")
    def _check_rule_fields(self) -> "TraceDecision":
        required_score = {
            "depth_limited_lifo": "depth",
            "lowest_g": "g",
            "lowest_h": "h",
            "lowest_f_then_h": "f",
            "bidirectional_min_key": "g",
            "f_bound_dfs": "f",
            "top_k_f": "f",
        }.get(self.rule)
        if required_score is not None:
            if self.selected_scores is None or getattr(self.selected_scores, required_score) is None:
                raise ValueError(f"decision rule {self.rule} requires selected {required_score}")
        elif self.selected_scores is not None:
            raise ValueError(f"decision rule {self.rule} requires selected_scores=null")

        if self.runner_up is not None and required_score is not None:
            if getattr(self.runner_up, required_score) is None:
                raise ValueError(f"decision rule {self.rule} requires runner-up {required_score}")

        iterative = self.rule in ("depth_limited_lifo", "f_bound_dfs")
        if iterative != (self.iteration is not None):
            raise ValueError("iteration is required only for IDDFS/IDA* decisions")
        if iterative != (self.bound is not None):
            raise ValueError("bound is required only for IDDFS/IDA* decisions")

        is_beam = self.rule == "top_k_f"
        if is_beam != (self.layer is not None and self.beam_width is not None):
            raise ValueError("layer and beam_width are required only for Beam decisions")
        if not is_beam and (self.layer is not None or self.beam_width is not None):
            raise ValueError("layer and beam_width are Beam-only")

        is_bidi = self.rule == "bidirectional_min_key"
        if not is_bidi and any(value is not None for value in (
            self.top_forward, self.top_backward, self.mu_before,
        )):
            raise ValueError("top_forward/top_backward/mu_before are bidijkstra-only")
        return self


class BidirectionalFrontierSide(StrictModel):
    nodes: list[NodeId]
    g: dict[NodeId, NonNegativeFiniteFloat]

    @model_validator(mode="after")
    def _check_membership(self) -> "BidirectionalFrontierSide":
        if self.nodes != sorted(set(self.nodes)):
            raise ValueError("bidirectional frontier nodes must be sorted and unique")
        if set(self.g) != set(self.nodes):
            raise ValueError("bidirectional frontier g keys must equal nodes")
        return self


class BidirectionalFrontiers(StrictModel):
    forward: BidirectionalFrontierSide
    backward: BidirectionalFrontierSide
    best_path_cost: NonNegativeFiniteFloat | None
    meeting_node: NodeId | None

    @model_validator(mode="after")
    def _check_best_pair(self) -> "BidirectionalFrontiers":
        if (self.best_path_cost is None) != (self.meeting_node is None):
            raise ValueError("best_path_cost and meeting_node must both be null or non-null")
        return self


class BidirectionalBoundEvidence(StrictModel):
    top_forward: BidirectionalTop | None
    top_backward: BidirectionalTop | None
    mu: NonNegativeFiniteFloat
    meeting_node: NodeId


class RouteTermination(StrictModel):
    reason: TerminationReason
    reachability: ReachabilityConclusion
    solution_quality: SolutionQuality
    bidirectional_bound: BidirectionalBoundEvidence | None

    @model_validator(mode="after")
    def _check_reason_shape(self) -> "RouteTermination":
        has_bound = self.bidirectional_bound is not None
        if has_bound != (self.reason == "bidirectional_bound_met"):
            raise ValueError("bidirectional_bound is required iff reason=bidirectional_bound_met")
        expected_reachability = {
            "start_equals_goal": "route_found",
            "goal_expanded": "route_found",
            "bidirectional_bound_met": "route_found",
            "frontier_exhausted": "proven_unreachable",
            "depth_cap_reached": "inconclusive",
            "round_cap_reached": "inconclusive",
            "beam_exhausted_after_pruning": "inconclusive",
        }[self.reason]
        if self.reachability != expected_reachability:
            raise ValueError("termination reachability does not match reason")
        if self.reachability != "route_found" and self.solution_quality != "not_applicable":
            raise ValueError("not-found termination requires solution_quality=not_applicable")
        if self.reason == "start_equals_goal" and self.solution_quality != "not_applicable":
            raise ValueError("start_equals_goal requires solution_quality=not_applicable")
        return self


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
    decision: TraceDecision | None = None
    bidirectional_frontiers: BidirectionalFrontiers | None = None


class Metrics(StrictModel):
    total_cost: NonNegativeFiniteFloat | None
    total_distance_m: NonNegativeFiniteFloat | None
    total_time_s: NonNegativeFiniteFloat | None
    nodes_expanded: Annotated[int, Field(ge=0)]
    max_frontier: Annotated[int, Field(ge=0)]
    runtime_ms: NonNegativeFiniteFloat
    optimal_guarantee: bool  # guarantee for this completed/terminated run
    epsilon_bound: NonNegativeFiniteFloat | None = None  # idastar only
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


class LegMetrics(StrictModel):
    total_cost: NonNegativeFiniteFloat
    total_distance_m: NonNegativeFiniteFloat
    total_time_s: NonNegativeFiniteFloat


class PathCostBreakdown(StrictModel):
    distance_m: NonNegativeFiniteFloat
    free_flow_time_s: NonNegativeFiniteFloat
    congestion_adjusted_time_s: NonNegativeFiniteFloat
    congestion_delay_s: NonNegativeFiniteFloat
    penalty_flood_s: NonNegativeFiniteFloat
    penalty_construction_s: NonNegativeFiniteFloat
    penalty_narrow_alley_s: NonNegativeFiniteFloat
    penalty_traffic_light_s: NonNegativeFiniteFloat
    risk_penalty_total_s: NonNegativeFiniteFloat
    balanced_cost_s: NonNegativeFiniteFloat

    @model_validator(mode="after")
    def _check_identities(self) -> "PathCostBreakdown":
        identities = (
            (self.congestion_delay_s,
             self.congestion_adjusted_time_s - self.free_flow_time_s,
             "congestion_delay_s"),
            (self.risk_penalty_total_s,
             self.penalty_flood_s + self.penalty_construction_s
             + self.penalty_narrow_alley_s + self.penalty_traffic_light_s,
             "risk_penalty_total_s"),
            (self.balanced_cost_s,
             self.congestion_adjusted_time_s + self.risk_penalty_total_s,
             "balanced_cost_s"),
        )
        for actual, expected, label in identities:
            if not comparison_equivalent(actual, expected):
                raise ValueError(f"{label} identity does not hold")
        return self

    def objective_value(self, mode: Mode) -> float:
        return {
            "distance": self.distance_m,
            "time": self.congestion_adjusted_time_s,
            "balanced": self.balanced_cost_s,
        }[mode]


class ExplanationObjective(StrictModel):
    mode: Mode
    selected_value: NonNegativeFiniteFloat | None
    exact_reference_value: NonNegativeFiniteFloat | None
    optimality_gap: NonNegativeFiniteFloat | None
    optimality_gap_pct: NonNegativeFiniteFloat | None

    @model_validator(mode="after")
    def _check_gap(self) -> "ExplanationObjective":
        if self.selected_value is None:
            if any(value is not None for value in (
                self.exact_reference_value, self.optimality_gap, self.optimality_gap_pct,
            )):
                raise ValueError("not-found objective requires null selected/exact/gap")
            return self
        if self.exact_reference_value is None:
            if self.optimality_gap is not None or self.optimality_gap_pct is not None:
                raise ValueError("gap requires an exact reference")
            return self
        raw_gap = self.selected_value - self.exact_reference_value
        if raw_gap < 0 and not comparison_equivalent(
            self.selected_value, self.exact_reference_value,
        ):
            raise ValueError("selected objective cannot beat an exact reference")
        expected_gap = 0.0 if comparison_equivalent(
            self.selected_value, self.exact_reference_value,
        ) else raw_gap
        if self.optimality_gap is None or not comparison_equivalent(
            self.optimality_gap, expected_gap,
        ):
            raise ValueError("optimality_gap does not match selected - exact")
        if comparison_equivalent(self.exact_reference_value, 0.0):
            expected_pct = 0.0 if comparison_equivalent(self.selected_value, 0.0) else None
        else:
            expected_pct = expected_gap / self.exact_reference_value * 100.0
        if expected_pct is None:
            if self.optimality_gap_pct is not None:
                raise ValueError("optimality_gap_pct must be null for a zero denominator")
        elif self.optimality_gap_pct is None or not comparison_equivalent(
            self.optimality_gap_pct, expected_pct,
        ):
            raise ValueError("optimality_gap_pct identity does not hold")
        return self


class ExplanationFactor(StrictModel):
    id: Annotated[str, Field(min_length=1)]
    kind: Literal[
        "objective_truth", "optimality_gap", "congestion", "flood",
        "construction", "narrow_alley", "traffic_light", "algorithm_limit",
        "scenario_effect",
    ]
    affects_objective: bool
    source: Literal["cost_breakdown", "reference_comparison", "trace", "scenario"]
    edge_ids: list[EdgeId]
    node_ids: list[NodeId]
    contribution_raw: FiniteFloat | None
    contribution_unit: Literal["m", "s"] | None
    timeline_step: Annotated[int, Field(ge=1)] | None

    @model_validator(mode="after")
    def _check_contribution(self) -> "ExplanationFactor":
        if len(self.edge_ids) != len(set(self.edge_ids)):
            raise ValueError("factor edge_ids must be unique")
        if len(self.node_ids) != len(set(self.node_ids)):
            raise ValueError("factor node_ids must be unique")
        if (self.contribution_raw is None) != (self.contribution_unit is None):
            raise ValueError("contribution_raw and contribution_unit must be paired")
        if not self.affects_objective and self.contribution_raw is not None:
            raise ValueError("context-only factor cannot claim objective contribution")
        return self


class ReferenceRoute(StrictModel):
    id: Annotated[str, Field(min_length=1)]
    kind: Literal[
        "same_objective_optimum", "distance_optimum", "balanced_optimum",
        "avoid_edge_counterfactual",
    ]
    provenance: Literal["posthoc_ucs"]
    generated_for_mode: Mode
    excluded_edge: EdgeId | None
    path: Annotated[list[NodeId], Field(min_length=2)]
    metrics: LegMetrics
    cost_breakdown: PathCostBreakdown
    reference_minus_selected_cost: FiniteFloat
    reference_minus_selected_pct: FiniteFloat | None
    reference_minus_selected_distance_m: FiniteFloat
    reference_minus_selected_balanced_cost_s: FiniteFloat
    relation_to_selected: Literal["better", "equivalent", "worse"]

    @model_validator(mode="after")
    def _check_metrics(self) -> "ReferenceRoute":
        if not comparison_equivalent(
            self.metrics.total_distance_m, self.cost_breakdown.distance_m,
        ):
            raise ValueError("reference distance metric disagrees with breakdown")
        if not comparison_equivalent(
            self.metrics.total_time_s, self.cost_breakdown.balanced_cost_s,
        ):
            raise ValueError("reference balanced metric disagrees with breakdown")
        if self.kind == "avoid_edge_counterfactual" and self.excluded_edge is None:
            raise ValueError("avoid-edge reference requires excluded_edge")
        if self.kind != "avoid_edge_counterfactual" and self.excluded_edge is not None:
            raise ValueError("excluded_edge is counterfactual-only")
        return self


class ExplanationEvidence(StrictModel):
    selection_rule: SelectionRule
    objective: ExplanationObjective
    cost_breakdown: PathCostBreakdown | None
    factors: list[ExplanationFactor]
    reference_routes: Annotated[list[ReferenceRoute], Field(max_length=2)]

    @model_validator(mode="after")
    def _check_ids(self) -> "ExplanationEvidence":
        factor_ids = [factor.id for factor in self.factors]
        reference_ids = [reference.id for reference in self.reference_routes]
        if len(factor_ids) != len(set(factor_ids)):
            raise ValueError("explanation factor ids must be unique")
        if len(reference_ids) != len(set(reference_ids)):
            raise ValueError("reference route ids must be unique")
        return self


class Explanation(StrictModel):
    """Filled by explain.py (Phase 4); Phases 2–3 return the empty shape."""

    summary_vi: str = ""
    congested_segments: list[CongestedSegment] = []
    alternatives: list[Alternative] = []
    evidence: ExplanationEvidence | None = None


ScenarioProvenance = Literal["base", "graph_view", "sandbox_override"]


class AppliedScenario(StrictModel):
    """Server-authoritative scenario provenance echoed on API responses."""

    graph_view: GraphView
    override_count: Annotated[int, Field(ge=0)]
    fingerprint: Annotated[str, Field(pattern=r"^scenario-v1:[0-9a-f]{64}$")]
    provenance: ScenarioProvenance


class Trace(StrictModel):
    contract_version: Literal[2] | None = None
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
    termination: RouteTermination | None = None

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

            if st.decision is not None:
                expected_rule = SELECTION_RULE_BY_ALGORITHM[self.algorithm]
                if st.decision.rule != expected_rule:
                    raise ValueError(
                        f"step {st.step}: decision rule does not match {self.algorithm}"
                    )
                if st.decision.frontier_size_after != len(st.frontier):
                    raise ValueError(
                        f"step {st.step}: frontier_size_after must equal legacy frontier length"
                    )

            if self.algorithm == "bidijkstra":
                if st.bidirectional_frontiers is not None:
                    bidi = st.bidirectional_frontiers
                    union = sorted(set(bidi.forward.nodes) | set(bidi.backward.nodes))
                    if st.frontier != union:
                        raise ValueError(
                            f"step {st.step}: legacy frontier must equal two-side union"
                        )
                    if st.g is None:
                        raise ValueError(f"step {st.step}: bidijkstra requires legacy g")
                    expected_g = {}
                    for node in union:
                        values = []
                        if node in bidi.forward.g:
                            values.append(bidi.forward.g[node])
                        if node in bidi.backward.g:
                            values.append(bidi.backward.g[node])
                        expected_g[node] = min(values)
                    if st.g != expected_g:
                        raise ValueError(
                            f"step {st.step}: legacy g must use the two-side minimum"
                        )
            elif st.bidirectional_frontiers is not None:
                raise ValueError(
                    f"step {st.step}: bidirectional_frontiers is bidijkstra-only"
                )

            if self.contract_version == 2:
                if st.decision is None:
                    raise ValueError(f"step {st.step}: v2 requires decision")
                if self.algorithm == "bidijkstra" and st.bidirectional_frontiers is None:
                    raise ValueError(
                        f"step {st.step}: v2 bidijkstra requires bidirectional_frontiers"
                    )

        if self.contract_version == 2:
            if self.termination is None:
                raise ValueError("v2 trace requires termination")
            if self.explanation.evidence is None:
                raise ValueError("v2 trace requires explanation.evidence")

        if self.termination is not None:
            term = self.termination
            if self.found != (term.reachability == "route_found"):
                raise ValueError("found must agree with termination reachability")
            if term.reason == "start_equals_goal":
                if len(self.path) != 1:
                    raise ValueError("start_equals_goal requires a one-node path")
            elif self.found and term.reason not in (
                "goal_expanded", "bidirectional_bound_met",
            ):
                raise ValueError("found route has an invalid termination reason")
            if term.reason == "bidirectional_bound_met":
                if self.algorithm != "bidijkstra" or not self.found:
                    raise ValueError("bidirectional_bound_met is successful bidijkstra-only")
                bound = term.bidirectional_bound
                assert bound is not None
                if bound.meeting_node not in self.path:
                    raise ValueError("bidirectional meeting node must be on the result path")
                if not comparison_equivalent(bound.mu, self.metrics.total_cost):
                    raise ValueError("bidirectional mu must equal result total_cost")
                top_f = bound.top_forward.g if bound.top_forward is not None else math.inf
                top_b = bound.top_backward.g if bound.top_backward is not None else math.inf
                if top_f + top_b < bound.mu and not comparison_equivalent(
                    top_f + top_b, bound.mu,
                ):
                    raise ValueError("bidirectional stop bound is not satisfied")
            elif term.bidirectional_bound is not None:
                raise ValueError("bidirectional bound is invalid for this termination")

            if self.found and term.reason != "start_equals_goal":
                if term.solution_quality in ("exact", "epsilon_bounded") \
                        and not self.metrics.optimal_guarantee:
                    raise ValueError("exact/epsilon quality requires optimal_guarantee=true")
                if term.solution_quality == "feasible_unproven" \
                        and self.metrics.optimal_guarantee:
                    raise ValueError("feasible_unproven requires optimal_guarantee=false")

        evidence = self.explanation.evidence
        if evidence is not None:
            if evidence.selection_rule != SELECTION_RULE_BY_ALGORITHM[self.algorithm]:
                raise ValueError("explanation selection_rule does not match algorithm")
            if evidence.objective.mode != self.mode:
                raise ValueError("explanation objective mode does not match trace mode")
            expected_unit = "m" if self.mode == "distance" else "s"
            for factor in evidence.factors:
                if factor.contribution_raw is not None \
                        and factor.contribution_unit != expected_unit:
                    raise ValueError("explanation factor contribution unit mismatches mode")
            if self.found:
                if evidence.cost_breakdown is None:
                    raise ValueError("found route explanation requires cost_breakdown")
                breakdown = evidence.cost_breakdown
                assert self.metrics.total_cost is not None
                assert self.metrics.total_distance_m is not None
                assert self.metrics.total_time_s is not None
                if evidence.objective.selected_value is None or not comparison_equivalent(
                    evidence.objective.selected_value, self.metrics.total_cost,
                ):
                    raise ValueError("selected objective does not match metrics.total_cost")
                if not comparison_equivalent(
                    breakdown.objective_value(self.mode), self.metrics.total_cost,
                ):
                    raise ValueError("route objective does not match cost breakdown")
                if not comparison_equivalent(
                    breakdown.distance_m, self.metrics.total_distance_m,
                ) or not comparison_equivalent(
                    breakdown.balanced_cost_s, self.metrics.total_time_s,
                ):
                    raise ValueError("route metrics disagree with cost breakdown")
                if self.termination is not None \
                        and self.termination.solution_quality == "exact" \
                        and evidence.objective.optimality_gap is not None \
                        and not comparison_equivalent(
                            evidence.objective.optimality_gap, 0.0,
                        ):
                    raise ValueError("exact result conflicts with exact UCS reference")
                for reference in evidence.reference_routes:
                    expected_generated_mode = {
                        "same_objective_optimum": self.mode,
                        "distance_optimum": "distance",
                        "balanced_optimum": "balanced",
                    }.get(reference.kind)
                    if expected_generated_mode is not None \
                            and reference.generated_for_mode != expected_generated_mode:
                        raise ValueError("reference kind disagrees with generated_for_mode")
                    if reference.path[0] != self.path[0] or reference.path[-1] != self.path[-1]:
                        raise ValueError("reference route must use the selected route endpoints")
                    expected_ref_cost = reference.cost_breakdown.objective_value(self.mode)
                    if not comparison_equivalent(
                        reference.metrics.total_cost, expected_ref_cost,
                    ):
                        raise ValueError("reference total_cost does not use the active mode")
                    signed = reference.metrics.total_cost - self.metrics.total_cost
                    if not comparison_equivalent(
                        reference.reference_minus_selected_cost, signed,
                    ):
                        raise ValueError("reference signed objective trade-off is invalid")
                    if not comparison_equivalent(
                        reference.reference_minus_selected_distance_m,
                        reference.metrics.total_distance_m - self.metrics.total_distance_m,
                    ) or not comparison_equivalent(
                        reference.reference_minus_selected_balanced_cost_s,
                        reference.metrics.total_time_s - self.metrics.total_time_s,
                    ):
                        raise ValueError("reference distance/balanced trade-off is invalid")
                    if comparison_equivalent(self.metrics.total_cost, 0.0):
                        expected_pct = 0.0 if comparison_equivalent(
                            reference.metrics.total_cost, 0.0,
                        ) else None
                    else:
                        expected_pct = signed / self.metrics.total_cost * 100.0
                    if expected_pct is None:
                        if reference.reference_minus_selected_pct is not None:
                            raise ValueError("reference pct must be null for zero denominator")
                    elif reference.reference_minus_selected_pct is None or not comparison_equivalent(
                        reference.reference_minus_selected_pct, expected_pct,
                    ):
                        raise ValueError("reference pct identity does not hold")
                    expected_relation = (
                        "equivalent" if comparison_equivalent(
                            reference.metrics.total_cost, self.metrics.total_cost,
                        ) else "better" if signed < 0 else "worse"
                    )
                    if reference.relation_to_selected != expected_relation:
                        raise ValueError("reference relation_to_selected is invalid")
                    if self.metrics.optimal_guarantee \
                            and reference.kind == "same_objective_optimum" \
                            and expected_relation == "better":
                        raise ValueError("guaranteed result conflicts with exact reference")
            else:
                if evidence.objective.selected_value is not None \
                        or evidence.cost_breakdown is not None \
                        or evidence.reference_routes:
                    raise ValueError("not-found explanation cannot carry route objective facts")
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


class Leg(StrictModel):
    """One start->stop segment of a multiroute answer (condensed trace)."""

    from_node: NodeId
    to_node: NodeId
    path: list[NodeId]
    metrics: LegMetrics
    cost_breakdown: PathCostBreakdown | None = None


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


class AtspAsymmetryExample(StrictModel):
    from_node: NodeId
    to_node: NodeId
    forward_cost: NonNegativeFiniteFloat
    reverse_cost: NonNegativeFiniteFloat
    absolute_delta: Annotated[float, Field(gt=0, allow_inf_nan=False)]

    @model_validator(mode="after")
    def _check_delta(self) -> "AtspAsymmetryExample":
        if self.from_node >= self.to_node:
            raise ValueError("asymmetry example orientation requires from_node < to_node")
        if not comparison_equivalent(
            self.absolute_delta, abs(self.forward_cost - self.reverse_cost),
        ):
            raise ValueError("asymmetry absolute_delta identity does not hold")
        if comparison_equivalent(self.forward_cost, self.reverse_cost):
            raise ValueError("asymmetry example costs are equivalent")
        return self


class AtspMatrixEvidence(StrictModel):
    point_count: Annotated[int, Field(ge=2)]
    directed_pair_count: Annotated[int, Field(ge=2)]
    reachable_directed_pair_count: Annotated[int, Field(ge=0)]
    asymmetric_unordered_pair_count: Annotated[int, Field(ge=0)]
    asymmetry_example: AtspAsymmetryExample | None

    @model_validator(mode="after")
    def _check_counts(self) -> "AtspMatrixEvidence":
        expected_pairs = self.point_count * (self.point_count - 1)
        if self.directed_pair_count != expected_pairs:
            raise ValueError("directed_pair_count must equal k*(k-1)")
        if self.reachable_directed_pair_count > self.directed_pair_count:
            raise ValueError("reachable directed-pair count exceeds total")
        if self.asymmetric_unordered_pair_count > expected_pairs // 2:
            raise ValueError("asymmetric unordered-pair count exceeds total")
        if (self.asymmetric_unordered_pair_count == 0) != (self.asymmetry_example is None):
            raise ValueError("asymmetry example must exist iff an asymmetric pair exists")
        return self


class AtspComputationMetrics(StrictModel):
    matrix_search_runs: Annotated[int, Field(ge=0)]
    matrix_nodes_expanded: Annotated[int, Field(ge=0)]
    matrix_runtime_ms: NonNegativeFiniteFloat
    optimizer_runtime_ms: NonNegativeFiniteFloat
    total_runtime_ms: NonNegativeFiniteFloat

    @model_validator(mode="after")
    def _check_accounting(self) -> "AtspComputationMetrics":
        if self.total_runtime_ms + 0.002 < self.matrix_runtime_ms + self.optimizer_runtime_ms:
            raise ValueError("total runtime cannot be smaller than matrix + optimizer runtime")
        return self


class MultirouteFailure(StrictModel):
    kind: Literal["matrix_incomplete"]
    from_node: NodeId
    to_node: NodeId


class HeldKarpMethodStats(StrictModel):
    kind: Literal["held_karp"]
    dp_states_solved: Annotated[int, Field(ge=1)]
    transitions_evaluated: Annotated[int, Field(ge=0)]


class NnLocalSearchMethodStats(StrictModel):
    kind: Literal["nn_local_search"]
    nn_initial_cost: NonNegativeFiniteFloat
    nn_candidates_evaluated: Annotated[int, Field(ge=0)]
    two_opt_candidates_evaluated: Annotated[int, Field(ge=0)]
    or_opt_candidates_evaluated: Annotated[int, Field(ge=0)]
    accepted_2opt_moves: Annotated[int, Field(ge=0)]
    accepted_oropt_moves: Annotated[int, Field(ge=0)]
    final_cost: NonNegativeFiniteFloat
    improvement_after_nn: NonNegativeFiniteFloat

    @model_validator(mode="after")
    def _check_improvement(self) -> "NnLocalSearchMethodStats":
        if self.final_cost > self.nn_initial_cost and not comparison_equivalent(
            self.final_cost, self.nn_initial_cost,
        ):
            raise ValueError("local search final cost cannot exceed NN initial cost")
        if not comparison_equivalent(
            self.improvement_after_nn, self.nn_initial_cost - self.final_cost,
        ):
            raise ValueError("improvement_after_nn identity does not hold")
        return self


class SaSeedMethodStats(StrictModel):
    seed: Annotated[int, Field(ge=0)]
    iterations: Annotated[int, Field(ge=0)]
    final_cost: NonNegativeFiniteFloat
    best_cost: NonNegativeFiniteFloat
    best_order: list[NodeId]
    attempted_moves: Annotated[int, Field(ge=0)]
    accepted_improving_moves: Annotated[int, Field(ge=0)]
    accepted_equal_moves: Annotated[int, Field(ge=0)]
    accepted_worse_moves: Annotated[int, Field(ge=0)]
    rejected_moves: Annotated[int, Field(ge=0)]

    @model_validator(mode="after")
    def _check_counts(self) -> "SaSeedMethodStats":
        if self.best_cost > self.final_cost and not comparison_equivalent(
            self.best_cost, self.final_cost,
        ):
            raise ValueError("SA seed best cost cannot exceed final cost")
        classified = (
            self.accepted_improving_moves + self.accepted_equal_moves
            + self.accepted_worse_moves + self.rejected_moves
        )
        if self.attempted_moves != classified or self.iterations != self.attempted_moves:
            raise ValueError("SA seed move-count identity does not hold")
        return self


class SimulatedAnnealingMethodStats(StrictModel):
    kind: Literal["simulated_annealing"]
    seed_count: Annotated[int, Field(ge=1)]
    best_seed: Annotated[int, Field(ge=0)]
    best_cost: NonNegativeFiniteFloat
    mean_best_cost: NonNegativeFiniteFloat
    stddev_best_cost: NonNegativeFiniteFloat
    attempted_moves: Annotated[int, Field(ge=0)]
    accepted_improving_moves: Annotated[int, Field(ge=0)]
    accepted_equal_moves: Annotated[int, Field(ge=0)]
    accepted_worse_moves: Annotated[int, Field(ge=0)]
    rejected_moves: Annotated[int, Field(ge=0)]
    seeds: list[SaSeedMethodStats]

    @model_validator(mode="after")
    def _check_aggregate(self) -> "SimulatedAnnealingMethodStats":
        if self.seed_count != len(self.seeds):
            raise ValueError("seed_count must equal len(seeds)")
        if [seed.seed for seed in self.seeds] != list(range(5)):
            raise ValueError("SA method stats require seeds 0 through 4 in order")
        costs = [seed.best_cost for seed in self.seeds]
        best_index = min(range(len(costs)), key=costs.__getitem__)
        if self.best_seed != self.seeds[best_index].seed \
                or not comparison_equivalent(self.best_cost, costs[best_index]):
            raise ValueError("SA best seed/cost is inconsistent")
        expected_mean = statistics.mean(costs)
        expected_stddev = statistics.stdev(costs) if len(costs) > 1 else 0.0
        if not comparison_equivalent(self.mean_best_cost, expected_mean) \
                or not comparison_equivalent(self.stddev_best_cost, expected_stddev):
            raise ValueError("SA mean/sample-stddev identity does not hold")
        counters = (
            "attempted_moves", "accepted_improving_moves", "accepted_equal_moves",
            "accepted_worse_moves", "rejected_moves",
        )
        for field_name in counters:
            if getattr(self, field_name) != sum(
                getattr(seed, field_name) for seed in self.seeds
            ):
                raise ValueError(f"SA aggregate {field_name} is inconsistent")
        return self


AtspMethodStats = Annotated[
    HeldKarpMethodStats | NnLocalSearchMethodStats | SimulatedAnnealingMethodStats,
    Field(discriminator="kind"),
]


class MultirouteResponse(StrictModel):
    contract_version: Literal[2] | None = None
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
    return_to_start: bool | None = None
    original_order: list[NodeId] | None = None
    original_order_legs: list[Leg] | None = None
    totals_breakdown: PathCostBreakdown | None = None
    original_order_breakdown: PathCostBreakdown | None = None
    matrix_evidence: AtspMatrixEvidence | None = None
    computation_metrics: AtspComputationMetrics | None = None
    failure: MultirouteFailure | None = None
    method_stats: AtspMethodStats | None = None

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

        if self.contract_version == 2:
            required = {
                "return_to_start": self.return_to_start,
                "original_order": self.original_order,
                "original_order_legs": self.original_order_legs,
                "matrix_evidence": self.matrix_evidence,
                "computation_metrics": self.computation_metrics,
            }
            missing = [name for name, value in required.items() if value is None]
            if missing:
                raise ValueError(f"v2 multiroute missing required fields: {missing}")
            assert self.original_order is not None
            assert self.original_order_legs is not None
            assert self.matrix_evidence is not None
            if len(self.original_order) < 2:
                raise ValueError("v2 original_order requires start plus at least one stop")
            if len(self.original_order) != len(set(self.original_order)):
                raise ValueError("original_order must not repeat Start/stops")
            if self.matrix_evidence.point_count != len(self.original_order):
                raise ValueError("matrix point_count must equal len(original_order)")

            if self.found:
                if any(value is None for value in (
                    self.totals_breakdown, self.original_order_breakdown,
                    self.method_stats,
                )):
                    raise ValueError("reachable v2 multiroute requires breakdowns/method_stats")
                if self.failure is not None:
                    raise ValueError("reachable v2 multiroute requires failure=null")
                if self.matrix_evidence.reachable_directed_pair_count \
                        != self.matrix_evidence.directed_pair_count:
                    raise ValueError("reachable v2 multiroute requires a complete matrix")
                if self.order[0] != self.original_order[0]:
                    raise ValueError("optimized and original order must share Start")
                if sorted(self.order) != sorted(self.original_order):
                    raise ValueError("optimized order must be a permutation of original_order")
                self._check_leg_topology(
                    self.order, self.legs, bool(self.return_to_start), "optimized",
                )
                self._check_leg_topology(
                    self.original_order, self.original_order_legs,
                    bool(self.return_to_start), "original",
                )
                assert self.totals is not None
                assert self.original_order_totals is not None
                assert self.totals_breakdown is not None
                assert self.original_order_breakdown is not None
                self._check_aggregate(
                    self.legs, self.totals, self.totals_breakdown, "optimized",
                )
                self._check_aggregate(
                    self.original_order_legs, self.original_order_totals,
                    self.original_order_breakdown, "original",
                )
                expected_kind = {
                    "held_karp": "held_karp",
                    "nn_2opt": "nn_local_search",
                    "sa": "simulated_annealing",
                }[self.method]
                if self.method_stats.kind != expected_kind:
                    raise ValueError("method_stats discriminator does not match method")
                if self.method == "sa":
                    assert isinstance(self.method_stats, SimulatedAnnealingMethodStats)
                    assert self.optimizer_stats is not None
                    for seed in self.method_stats.seeds:
                        if not seed.best_order \
                                or seed.best_order[0] != self.original_order[0] \
                                or sorted(seed.best_order) != sorted(self.original_order):
                            raise ValueError("SA per-seed best_order is not a valid permutation")
                    legacy = self.optimizer_stats
                    if legacy.best_seed != self.method_stats.best_seed \
                            or not comparison_equivalent(legacy.best_cost, self.method_stats.best_cost) \
                            or not comparison_equivalent(
                                legacy.mean_best_cost, self.method_stats.mean_best_cost,
                            ) or not comparison_equivalent(
                                legacy.stddev_best_cost, self.method_stats.stddev_best_cost,
                            ):
                        raise ValueError("legacy optimizer_stats drifted from method_stats")
                assert self.savings_pct is not None
                original_cost = self.original_order_totals.total_cost
                optimized_cost = self.totals.total_cost
                if comparison_equivalent(original_cost, 0.0):
                    expected_savings = 0.0 if comparison_equivalent(
                        optimized_cost, 0.0,
                    ) else None
                else:
                    expected_savings = round(
                        (original_cost - optimized_cost) / original_cost * 100.0, 1,
                    )
                if expected_savings is None or not comparison_equivalent(
                    self.savings_pct, expected_savings,
                ):
                    raise ValueError("legacy savings_pct identity does not hold")
            else:
                if self.failure is None or self.failure.kind != "matrix_incomplete":
                    raise ValueError("not-found v2 multiroute requires matrix_incomplete failure")
                if any(value is not None for value in (
                    self.totals, self.totals_breakdown, self.original_order_totals,
                    self.original_order_breakdown, self.savings_pct, self.method_stats,
                    self.optimizer_stats, self.optimization_trace,
                )):
                    raise ValueError("matrix_incomplete response contains optimizer/result data")
                if self.original_order_legs:
                    raise ValueError("matrix_incomplete requires original_order_legs=[]")
        return self

    @staticmethod
    def _check_leg_topology(
        order: list[str], legs: list[Leg], return_to_start: bool, label: str,
    ) -> None:
        expected_pairs = list(zip(order, order[1:]))
        if return_to_start:
            expected_pairs.append((order[-1], order[0]))
        actual_pairs = [(leg.from_node, leg.to_node) for leg in legs]
        if actual_pairs != expected_pairs:
            raise ValueError(f"{label} legs do not match order/open-closed topology")
        for leg in legs:
            if not leg.path or leg.path[0] != leg.from_node or leg.path[-1] != leg.to_node:
                raise ValueError(f"{label} leg path endpoints are invalid")
            if leg.cost_breakdown is None:
                raise ValueError(f"{label} v2 leg requires cost_breakdown")

    @staticmethod
    def _check_aggregate(
        legs: list[Leg], totals: LegMetrics,
        breakdown: PathCostBreakdown, label: str,
    ) -> None:
        metric_sums = {
            "total_cost": sum(leg.metrics.total_cost for leg in legs),
            "total_distance_m": sum(leg.metrics.total_distance_m for leg in legs),
            "total_time_s": sum(leg.metrics.total_time_s for leg in legs),
        }
        for field_name, expected in metric_sums.items():
            if not comparison_equivalent(getattr(totals, field_name), expected):
                raise ValueError(f"{label} totals do not equal leg metrics")
        for field_name in PathCostBreakdown.model_fields:
            expected = sum(
                getattr(leg.cost_breakdown, field_name) for leg in legs
                if leg.cost_breakdown is not None
            )
            if not comparison_equivalent(getattr(breakdown, field_name), expected):
                raise ValueError(f"{label} breakdown does not equal leg breakdowns")


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
