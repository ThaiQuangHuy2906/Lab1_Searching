// TypeScript mirror of docs/SCHEMA.md — keep field names IDENTICAL.

export type Algorithm =
  | "bfs" | "dfs" | "iddfs" | "ucs" | "dijkstra"
  | "astar" | "greedy" | "bidijkstra" | "idastar" | "beam";
export type Mode = "distance" | "time" | "balanced";
export type TimeSlot = "07:30" | "12:00" | "17:30" | "22:00";
export type GraphLevel = "demo" | "real";
export type GraphView = "full" | "teach_7" | "teach_15" | "teach_25";
export type TspMethod = "held_karp" | "nn_2opt" | "sa";
export type RiskKey = "flood" | "construction" | "narrow_alley" | "traffic_light";

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

export interface TraceStep {
  step: number;
  expanded: string;
  frontier: string[];
  g: Record<string, number> | null;
  h: Record<string, number> | null;
  f: Record<string, number> | null;
  depth_limit?: number | null;
  side?: "forward" | "backward" | null;
}

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

export interface Explanation {
  summary_vi: string;
  congested_segments: CongestedSegment[];
  alternatives: Alternative[];
}

export interface Trace {
  algorithm: Algorithm;
  mode: Mode;
  time_slot: TimeSlot;
  graph: GraphLevel;
  applied_scenario: AppliedScenario | null;
  found: boolean;
  path: string[];
  metrics: Metrics;
  trace: TraceStep[];
  explanation: Explanation;
}

export interface LegMetrics { total_cost: number; total_distance_m: number; total_time_s: number }

export interface Leg { from_node: string; to_node: string; path: string[]; metrics: LegMetrics }

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

export interface MultirouteResponse {
  method: TspMethod;
  mode: Mode;
  time_slot: TimeSlot;
  graph: GraphLevel;
  applied_scenario: AppliedScenario | null;
  found: boolean;
  order: string[];
  legs: Leg[];
  totals: LegMetrics | null;
  original_order_totals: LegMetrics | null;
  savings_pct: number | null;
  optimal_guarantee: boolean;
  optimization_trace: OptimizationTrace | null;
  optimizer_stats: SaOptimizerStats | null;
}

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
