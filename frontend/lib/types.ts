// TypeScript mirror of docs/SCHEMA.md — keep field names IDENTICAL.

export type Algorithm =
  | "bfs" | "dfs" | "iddfs" | "ucs" | "dijkstra"
  | "astar" | "greedy" | "bidijkstra" | "idastar" | "beam";
export type Mode = "distance" | "time" | "balanced";
export type TimeSlot = "07:30" | "12:00" | "17:30" | "22:00";
export type GraphLevel = "demo" | "real";
export type TspMethod = "held_karp" | "nn_2opt" | "sa";
export type TravelMode = "driving" | "walking" | "cycling";
export type OptimizationMetric = "duration" | "distance" | "custom";

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
  risk: { flood: 0 | 1; construction: 0 | 1; narrow_alley: 0 | 1; traffic_light: 0 | 1 };
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
  found: boolean;
  path: string[];
  metrics: Metrics;
  trace: TraceStep[];
  explanation: Explanation;
}

export interface LegMetrics { total_cost: number; total_distance_m: number; total_time_s: number }

export interface Leg { from_node: string; to_node: string; path: string[]; metrics: LegMetrics }

export interface MultirouteResponse {
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

export interface CoordinateLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface SnappedLocation extends CoordinateLocation {
  nodeId: string;
  snapDistanceMeters: number;
  order: number | null;
}

export interface OptimizedRouteLeg {
  fromId: string;
  toId: string;
  distanceMeters: number;
  durationSeconds: number;
  optimizationCost: number;
  geometry: string;
  pathNodeIds: string[];
  directions: string[];
}

export interface OptimizeRouteResponse {
  found: boolean;
  optimizedOrder: SnappedLocation[];
  legs: OptimizedRouteLeg[];
  totalDistanceMeters: number | null;
  totalDurationSeconds: number | null;
  totalOptimizationCost: number | null;
  originalOrderTotals: {
    distanceMeters: number;
    durationSeconds: number;
    optimizationCost: number;
  } | null;
  savingsPercent: number | null;
  routeGeometry: string;
  algorithm: "held-karp" | "nearest-neighbor-2opt" | "simulated-annealing";
  optimalGuarantee: boolean;
  travelMode: TravelMode;
  optimizationMetric: OptimizationMetric;
  returnToStart: boolean;
}

export interface TrafficResponse {
  slot: TimeSlot;
  graph: GraphLevel;
  congestion: Record<string, number>;
}

export interface ExperimentResult {
  experiment_id: number;
  csv_path: string;
  fig_paths: string[];
  rows: Record<string, string>[];
}

export interface ApiError { error: { code: string; message_vi: string } }
