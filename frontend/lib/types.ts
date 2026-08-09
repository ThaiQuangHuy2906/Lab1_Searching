// TypeScript mirror of docs/SCHEMA.md — keep field names IDENTICAL.

export type Algorithm =
  | "bfs" | "dfs" | "iddfs" | "ucs"
  | "astar" | "greedy" | "bidijkstra" | "idastar" | "beam";
export type Mode = "distance" | "time" | "balanced";
export type TimeSlot = "07:30" | "12:00" | "17:30" | "22:00";
export type GraphLevel = "demo" | "real";
export type GraphView = "full" | `teach_${number}`;
export type TspMethod = "held_karp" | "nn_2opt" | "sa";
export type RiskKey = "flood" | "construction" | "narrow_alley" | "traffic_light";
export type ProblemMode = "two_point" | "multi_point";
export type MultiStrategy = "ordered_search" | "atsp";
export type RunKind = "single" | "compare";
export type ContractCapability = "v1" | "v2";

export type RiskFlags = Record<RiskKey, 0 | 1>;

export interface GraphNode {
  id: string;
  name: string | null;
  lat: number;
  lon: number;
  type: "landmark" | "intersection" | "warehouse" | "hospital" | "school";
}

export interface GraphEdge {
  id: string;
  u: string;
  v: string;
  name: string | null;
  length_m: number;
  highway: string;
  oneway: boolean;
  free_speed_kmh: number;
  free_travel_time_s: number;
  risk: RiskFlags;
}

export interface GraphFile {
  meta: {
    name: string;
    bbox: [number, number, number, number];
    directed: true;
    created: string;
    crs: "EPSG:4326";
    node_count: number;
    edge_count: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphViewMeta {
  base_graph: GraphLevel;
  graph_view: GraphView;
  base_node_count: number;
}

export interface GraphResponse extends GraphFile {
  view_meta: GraphViewMeta;
}

export interface ScenarioConfig {
  graph_view?: GraphView;
  edge_overrides?: EdgeOverride[];
}

export interface RiskOverride {
  flood?: 0 | 1;
  construction?: 0 | 1;
  narrow_alley?: 0 | 1;
  traffic_light?: 0 | 1;
}

export interface EdgeOverride {
  edge_id: string;
  length_m?: number;
  free_speed_kmh?: number;
  congestion?: Partial<Record<TimeSlot, number>>;
  risk?: RiskOverride;
}

export interface AppliedScenario {
  graph_view: GraphView;
  override_count: number;
  fingerprint: string;
  provenance: "base" | "graph_view" | "sandbox_override";
}

export type SelectionRule =
  | "fifo" | "lifo" | "depth_limited_lifo" | "lowest_g" | "lowest_h"
  | "lowest_f_then_h" | "bidirectional_min_key" | "f_bound_dfs" | "top_k_f";
export type TerminationReason =
  | "start_equals_goal" | "goal_expanded" | "bidirectional_bound_met"
  | "frontier_exhausted" | "depth_cap_reached" | "round_cap_reached"
  | "beam_exhausted_after_pruning";
export type ReachabilityConclusion = "route_found" | "proven_unreachable" | "inconclusive";
export type SolutionQuality = "exact" | "epsilon_bounded" | "feasible_unproven" | "not_applicable";

export interface DecisionScores {
  g: number | null;
  h: number | null;
  f: number | null;
  depth: number | null;
}

export interface DecisionCandidate extends DecisionScores { node: string }
export interface BidirectionalTop { node: string; g: number }

export interface TraceDecision {
  rule: SelectionRule;
  selected_scores: DecisionScores | null;
  runner_up: DecisionCandidate | null;
  frontier_size_before: number;
  frontier_size_after: number;
  neighbors_scanned: number;
  frontier_added: number;
  frontier_updated: number;
  pruned_count: number;
  iteration: number | null;
  bound: number | null;
  layer: number | null;
  beam_width: number | null;
  top_forward: BidirectionalTop | null;
  top_backward: BidirectionalTop | null;
  mu_before: number | null;
}

export interface BidirectionalFrontierSide {
  nodes: string[];
  g: Record<string, number>;
}

export interface BidirectionalFrontiers {
  forward: BidirectionalFrontierSide;
  backward: BidirectionalFrontierSide;
  best_path_cost: number | null;
  meeting_node: string | null;
}

export interface BidirectionalBoundEvidence {
  top_forward: BidirectionalTop | null;
  top_backward: BidirectionalTop | null;
  mu: number;
  meeting_node: string;
}

export interface RouteTermination {
  reason: TerminationReason;
  reachability: ReachabilityConclusion;
  solution_quality: SolutionQuality;
  bidirectional_bound: BidirectionalBoundEvidence | null;
}

interface TraceStepCommon {
  step: number;
  expanded: string;
  frontier: string[];
  g: Record<string, number> | null;
  h: Record<string, number> | null;
  f: Record<string, number> | null;
  depth_limit?: number | null;
  side?: "forward" | "backward" | null;
}

export interface TraceStepV1 extends TraceStepCommon {
  decision?: never;
  bidirectional_frontiers?: never;
}

export interface TraceStepV2 extends TraceStepCommon {
  decision: TraceDecision;
  bidirectional_frontiers: BidirectionalFrontiers | null;
}

export type TraceStep = TraceStepV1 | TraceStepV2;

export interface Metrics {
  total_cost: number | null;
  total_distance_m: number | null;
  total_time_s: number | null;
  nodes_expanded: number;
  max_frontier: number;
  runtime_ms: number;
  optimal_guarantee: boolean;
  epsilon_bound?: number | null;
  beam_width?: number | null;
  trace_truncated: boolean;
}

export interface CongestedSegment { edge: string; name: string | null; level: number }

export interface Alternative {
  label: string;
  path: string[];
  total_distance_m: number;
  total_time_s: number;
  why_not_vi: string;
}

export interface PathCostBreakdown {
  distance_m: number;
  free_flow_time_s: number;
  congestion_adjusted_time_s: number;
  congestion_delay_s: number;
  penalty_flood_s: number;
  penalty_construction_s: number;
  penalty_narrow_alley_s: number;
  penalty_traffic_light_s: number;
  risk_penalty_total_s: number;
  balanced_cost_s: number;
}

export interface ExplanationObjective {
  mode: Mode;
  selected_value: number | null;
  exact_reference_value: number | null;
  optimality_gap: number | null;
  optimality_gap_pct: number | null;
}

export interface ExplanationFactor {
  id: string;
  kind:
    | "objective_truth" | "optimality_gap" | "congestion" | "flood"
    | "construction" | "narrow_alley" | "traffic_light" | "algorithm_limit"
    | "scenario_effect";
  affects_objective: boolean;
  source: "cost_breakdown" | "reference_comparison" | "trace" | "scenario";
  edge_ids: string[];
  node_ids: string[];
  contribution_raw: number | null;
  contribution_unit: "m" | "s" | null;
  timeline_step: number | null;
}

export interface ReferenceRoute {
  id: string;
  kind:
    | "same_objective_optimum" | "distance_optimum" | "balanced_optimum"
    | "avoid_edge_counterfactual";
  provenance: "posthoc_ucs";
  generated_for_mode: Mode;
  excluded_edge: string | null;
  path: string[];
  metrics: LegMetrics;
  cost_breakdown: PathCostBreakdown;
  reference_minus_selected_cost: number;
  reference_minus_selected_pct: number | null;
  reference_minus_selected_distance_m: number;
  reference_minus_selected_balanced_cost_s: number;
  relation_to_selected: "better" | "equivalent" | "worse";
}

export interface ExplanationEvidence {
  selection_rule: SelectionRule;
  objective: ExplanationObjective;
  cost_breakdown: PathCostBreakdown | null;
  factors: ExplanationFactor[];
  reference_routes: ReferenceRoute[];
}

interface ExplanationCommon {
  summary_vi: string;
  congested_segments: CongestedSegment[];
  alternatives: Alternative[];
}

export interface ExplanationV1 extends ExplanationCommon { evidence?: never }
export interface ExplanationV2 extends ExplanationCommon { evidence: ExplanationEvidence }
export type Explanation = ExplanationV1 | ExplanationV2;

interface TraceCommon {
  algorithm: Algorithm;
  mode: Mode;
  time_slot: TimeSlot;
  graph: GraphLevel;
  found: boolean;
  path: string[];
  metrics: Metrics;
}

export interface TraceV1 extends TraceCommon {
  contract_version?: never;
  applied_scenario: AppliedScenario | null;
  trace: TraceStepV1[];
  explanation: ExplanationV1;
  termination?: never;
}

export interface TraceV2 extends TraceCommon {
  contract_version: 2;
  applied_scenario: AppliedScenario | null;
  trace: TraceStepV2[];
  explanation: ExplanationV2;
  termination: RouteTermination;
}

export type Trace = TraceV1 | TraceV2;

export interface LegMetrics { total_cost: number; total_distance_m: number; total_time_s: number }

export interface Leg {
  from_node: string;
  to_node: string;
  path: string[];
  metrics: LegMetrics;
  cost_breakdown?: PathCostBreakdown | null;
}

export interface AtspCandidate { node: string; cost: number }

interface OptimizationEventBase {
  ordinal: number;
}

export interface HeldKarpUpdateEvent extends OptimizationEventBase {
  kind: "held_karp_update";
  mask: number;
  subset: string[];
  endpoint: string;
  predecessor: string;
  candidate_cost: number;
  previous_cost: number | null;
  new_cost: number;
}

export interface HeldKarpReconstructEvent extends OptimizationEventBase {
  kind: "held_karp_reconstruct";
  order: string[];
  total_cost: number;
}

export interface NnDecisionEvent extends OptimizationEventBase {
  kind: "nn_decision";
  current: string;
  candidates: AtspCandidate[];
  selected: string;
  order: string[];
}

export interface LocalImprovementEvent extends OptimizationEventBase {
  kind: "local_improvement";
  move_type: "2_opt" | "or_opt";
  i: number;
  j: number;
  segment_length: number;
  before_order: string[];
  before_cost: number;
  after_order: string[];
  after_cost: number;
  rejected_candidates_since_previous: number;
}

export interface SaSeedBoundaryEvent extends OptimizationEventBase {
  kind: "sa_seed_boundary";
  boundary: "start" | "end";
  seed: number;
  iteration: number;
  temperature: number;
  current_order: string[];
  current_cost: number;
  best_order: string[];
  best_cost: number;
}

export interface SaIterationEvent extends OptimizationEventBase {
  kind: "sa_iteration";
  sample_reason: "new_best" | "periodic";
  seed: number;
  iteration: number;
  temperature: number;
  current_order: string[];
  current_cost: number;
  candidate_order: string[];
  candidate_cost: number;
  delta: number;
  accepted: boolean;
  resulting_order: string[];
  resulting_cost: number;
  best_order: string[];
  best_cost: number;
}

export interface SaSeedOptimizerStats {
  seed: number;
  iterations: number;
  final_cost: number;
  best_cost: number;
  best_order: string[];
}

export interface SaOptimizerStats {
  seeds: SaSeedOptimizerStats[];
  best_seed: number;
  best_cost: number;
  mean_best_cost: number;
  stddev_best_cost: number;
}

export interface SaFinalBestEvent extends OptimizationEventBase {
  kind: "sa_final_best";
  final_order: string[];
  final_cost: number;
  optimizer_stats: SaOptimizerStats;
}

export interface OptimizationSummaryEvent extends OptimizationEventBase {
  kind: "optimization_summary";
  method: TspMethod;
  final_order: string[];
  final_cost: number;
}

export type OptimizationEvent =
  | HeldKarpUpdateEvent
  | HeldKarpReconstructEvent
  | NnDecisionEvent
  | LocalImprovementEvent
  | SaSeedBoundaryEvent
  | SaIterationEvent
  | SaFinalBestEvent
  | OptimizationSummaryEvent;

export interface OptimizationTrace {
  method: TspMethod;
  total_events: number;
  recorded_events: number;
  sampling_policy:
    | "all-or-stride-v1"
    | "chronological-prefix-final-v1"
    | "priority-periodic-20-v1";
  trace_truncated: boolean;
  events: OptimizationEvent[];
}

export interface AtspAsymmetryExample {
  from_node: string;
  to_node: string;
  forward_cost: number;
  reverse_cost: number;
  absolute_delta: number;
}

export interface AtspMatrixEvidence {
  point_count: number;
  directed_pair_count: number;
  reachable_directed_pair_count: number;
  asymmetric_unordered_pair_count: number;
  asymmetry_example: AtspAsymmetryExample | null;
}

export interface AtspComputationMetrics {
  matrix_search_runs: number;
  matrix_nodes_expanded: number;
  matrix_runtime_ms: number;
  optimizer_runtime_ms: number;
  total_runtime_ms: number;
}

export interface MultirouteFailure {
  kind: "matrix_incomplete";
  from_node: string;
  to_node: string;
}

export interface HeldKarpMethodStats {
  kind: "held_karp";
  dp_states_solved: number;
  transitions_evaluated: number;
}

export interface NnLocalSearchMethodStats {
  kind: "nn_local_search";
  nn_initial_cost: number;
  nn_candidates_evaluated: number;
  two_opt_candidates_evaluated: number;
  or_opt_candidates_evaluated: number;
  accepted_2opt_moves: number;
  accepted_oropt_moves: number;
  final_cost: number;
  improvement_after_nn: number;
}

export interface SaSeedMethodStats {
  seed: number;
  iterations: number;
  final_cost: number;
  best_cost: number;
  best_order: string[];
  attempted_moves: number;
  accepted_improving_moves: number;
  accepted_equal_moves: number;
  accepted_worse_moves: number;
  rejected_moves: number;
}

export interface SimulatedAnnealingMethodStats {
  kind: "simulated_annealing";
  seed_count: number;
  best_seed: number;
  best_cost: number;
  mean_best_cost: number;
  stddev_best_cost: number;
  attempted_moves: number;
  accepted_improving_moves: number;
  accepted_equal_moves: number;
  accepted_worse_moves: number;
  rejected_moves: number;
  seeds: SaSeedMethodStats[];
}

export type AtspMethodStats =
  | HeldKarpMethodStats | NnLocalSearchMethodStats | SimulatedAnnealingMethodStats;

interface MultirouteCommon {
  method: TspMethod;
  mode: Mode;
  time_slot: TimeSlot;
  graph: GraphLevel;
  found: boolean;
  order: string[];
  legs: Leg[];
  totals: LegMetrics | null;
  original_order_totals: LegMetrics | null;
  savings_pct: number | null;
  optimal_guarantee: boolean;
}

export interface MultirouteV1 extends MultirouteCommon {
  contract_version?: never;
  applied_scenario: AppliedScenario | null;
  optimization_trace: OptimizationTrace | null;
  optimizer_stats: SaOptimizerStats | null;
  return_to_start?: never;
  original_order?: never;
  original_order_legs?: never;
  totals_breakdown?: never;
  original_order_breakdown?: never;
  matrix_evidence?: never;
  computation_metrics?: never;
  failure?: never;
  method_stats?: never;
}

interface MultirouteV2Common extends MultirouteCommon {
  contract_version: 2;
  applied_scenario: AppliedScenario | null;
  optimization_trace: OptimizationTrace | null;
  optimizer_stats: SaOptimizerStats | null;
  return_to_start: boolean;
  original_order: string[];
  original_order_legs: Leg[];
  matrix_evidence: AtspMatrixEvidence;
  computation_metrics: AtspComputationMetrics;
}

export interface MultirouteV2Found extends MultirouteV2Common {
  found: true;
  totals: LegMetrics;
  original_order_totals: LegMetrics;
  savings_pct: number;
  totals_breakdown: PathCostBreakdown;
  original_order_breakdown: PathCostBreakdown;
  failure: null;
  method_stats: AtspMethodStats;
}

export interface MultirouteV2NotFound extends MultirouteV2Common {
  found: false;
  order: [];
  legs: [];
  totals: null;
  original_order_totals: null;
  savings_pct: null;
  optimization_trace: null;
  optimizer_stats: null;
  original_order_legs: [];
  totals_breakdown: null;
  original_order_breakdown: null;
  failure: MultirouteFailure;
  method_stats: null;
}

export type MultirouteV2 = MultirouteV2Found | MultirouteV2NotFound;
export type MultirouteResponse = MultirouteV1 | MultirouteV2;

export interface NormalizedScenarioConfig {
  readonly graph_view: GraphView;
  readonly edge_overrides: readonly EdgeOverride[];
}

export interface JourneyDrafts {
  start: string | null;
  twoPointGoal: string | null;
  multiStops: string[];
  returnToStart: boolean;
}

export type EffectiveRouteParams = Readonly<{
  beam_width?: number;
  epsilon?: number;
}>;

export type RouteParamsByAlgorithm = Partial<Record<Algorithm, EffectiveRouteParams>>;

export interface RunSnapshot {
  readonly graph: GraphLevel;
  readonly graphView: GraphView;
  readonly slot: TimeSlot;
  readonly mode: Mode;
  readonly scenario: NormalizedScenarioConfig | null;
  readonly scenarioKey: string;
  readonly problemMode: ProblemMode;
  readonly multiStrategy: MultiStrategy | null;
  readonly start: string | null;
  readonly goal: string | null;
  readonly stops: readonly string[];
  readonly returnToStart: boolean;
  readonly algorithms: readonly Algorithm[];
  readonly routeParamsByAlgorithm: Readonly<RouteParamsByAlgorithm>;
  readonly methods: readonly TspMethod[];
  readonly includeRouteTrace: boolean;
  readonly includeOptimizationTrace: boolean;
}

export type CompareRunStatus =
  | "queued" | "running" | "success" | "no_path" | "error" | "cancelled";

export interface ResultEnvelope<T extends Trace | MultirouteResponse> {
  readonly id: string;
  readonly runId: number;
  readonly snapshot: RunSnapshot;
  readonly capability: ContractCapability;
  readonly scenarioFingerprint: string;
  readonly response: T;
}

export type RouteResultEnvelope = ResultEnvelope<Trace> & {
  readonly kind: "route";
  /** Ordered source legs from the backend; one item for a two-point result. */
  readonly sourceResponses: readonly Trace[];
};
export type AtspResultEnvelope = ResultEnvelope<MultirouteResponse> & { readonly kind: "atsp" };
export type AppResultEnvelope = RouteResultEnvelope | AtspResultEnvelope;

export interface CompareRun<T extends AppResultEnvelope = AppResultEnvelope> {
  readonly id: string;
  readonly status: CompareRunStatus;
  readonly result: T | null;
  readonly error: string | null;
}

export interface CompareSession<T extends AppResultEnvelope = AppResultEnvelope> {
  readonly id: string;
  readonly kind: "route" | "atsp";
  readonly snapshot: RunSnapshot;
  readonly authoritativeScenarioFingerprint: string | null;
  readonly capability: ContractCapability | null;
  readonly selectedIds: readonly string[];
  readonly runs: readonly CompareRun<T>[];
  readonly focusedId: string | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
}

export type ExplanationSubject =
  | { kind: "single_route"; runId: string }
  | { kind: "route_comparison"; sessionId: string; resultId: string }
  | { kind: "single_atsp"; runId: string }
  | { kind: "atsp_comparison"; sessionId: string; resultId: string }
  | null;

export type ExplanationOverlay =
  | { kind: "factor"; resultId: string; factorId: string; edgeIds: string[] }
  | { kind: "reference_route"; resultId: string; referenceId: string }
  | { kind: "leg"; resultId: string; legIndex: number }
  | { kind: "unreachable_pair"; resultId: string; from: string; to: string }
  | null;

export interface TrafficResponse {
  slot: TimeSlot;
  graph: GraphLevel;
  graph_view: GraphView;
  congestion: Record<string, number>;
}

export interface ExperimentResult {
  experiment_id: number;
  csv_path: string;
  fig_paths: string[];
  rows: Record<string, string>[];
}

export interface ApiError { error: { code: string; message_vi: string } }
