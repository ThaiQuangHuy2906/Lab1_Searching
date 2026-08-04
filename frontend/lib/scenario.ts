// Request-scoped scenario normalization and client-side cost preview.
// The backend remains the validation and fingerprint authority.

import type {
  EdgeOverride, GraphEdge, GraphNode, GraphView, RiskKey, ScenarioConfig, TimeSlot,
} from "./types";

const SLOT_ORDER: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const RISK_ORDER: RiskKey[] = [
  "flood", "construction", "narrow_alley", "traffic_light",
];
const PENALTY_S: Record<RiskKey, number> = {
  flood: 60, construction: 90, narrow_alley: 30, traffic_light: 25,
};

export type EdgeOverridePatch = {
  length_m?: number | undefined;
  free_speed_kmh?: number | undefined;
  congestion?: Partial<Record<TimeSlot, number | undefined>>;
  risk?: Partial<Record<RiskKey, 0 | 1 | undefined>>;
};

export interface EdgeCostBreakdown {
  length_m: number;
  free_speed_kmh: number;
  t_free_s: number;
  congestion: number;
  congestion_factor: number;
  penalty_flood_s: number;
  penalty_construction_s: number;
  penalty_narrow_alley_s: number;
  penalty_traffic_light_s: number;
  penalty_total_s: number;
  weight_distance_m: number;
  weight_time_s: number;
  weight_balanced_s: number;
}

function sortedCongestion(
  congestion: Partial<Record<TimeSlot, number>> | undefined,
): Partial<Record<TimeSlot, number>> | undefined {
  if (!congestion) return undefined;
  const sorted = Object.fromEntries(
    SLOT_ORDER.filter((slot) => congestion[slot] !== undefined)
      .map((slot) => [slot, congestion[slot]!]),
  ) as Partial<Record<TimeSlot, number>>;
  return Object.keys(sorted).length ? sorted : undefined;
}

function sortedRisk(
  risk: EdgeOverride["risk"],
): EdgeOverride["risk"] | undefined {
  if (!risk) return undefined;
  const sorted = Object.fromEntries(
    RISK_ORDER.filter((key) => risk[key] !== undefined)
      .map((key) => [key, risk[key]!]),
  ) as NonNullable<EdgeOverride["risk"]>;
  return Object.keys(sorted).length ? sorted : undefined;
}

export function normalizeEdgeOverride(
  override: EdgeOverride,
): EdgeOverride | undefined {
  const normalized: EdgeOverride = { edge_id: override.edge_id };
  if (override.length_m !== undefined) normalized.length_m = override.length_m;
  if (override.free_speed_kmh !== undefined) normalized.free_speed_kmh = override.free_speed_kmh;
  const congestion = sortedCongestion(override.congestion);
  const risk = sortedRisk(override.risk);
  if (congestion) normalized.congestion = congestion;
  if (risk) normalized.risk = risk;
  return Object.keys(normalized).length > 1 ? normalized : undefined;
}

export function buildScenario(
  graphView: GraphView, overrides: Record<string, EdgeOverride>,
): ScenarioConfig | undefined {
  const edgeOverrides = Object.values(overrides)
    .map(normalizeEdgeOverride)
    .filter((override): override is EdgeOverride => Boolean(override))
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
  if (graphView === "full" && edgeOverrides.length === 0) return undefined;
  const scenario: ScenarioConfig = {};
  if (graphView !== "full") scenario.graph_view = graphView;
  if (edgeOverrides.length) scenario.edge_overrides = edgeOverrides;
  return scenario;
}

export function scenarioKey(
  graphView: GraphView, overrides: Record<string, EdgeOverride>,
): string {
  return JSON.stringify(buildScenario(graphView, overrides) ?? null);
}

export function applyEdgeOverridePatch(
  edge: GraphEdge,
  baseTraffic: Record<string, number>,
  current: EdgeOverride | undefined,
  patch: EdgeOverridePatch,
): EdgeOverride | undefined {
  const next: EdgeOverride = {
    edge_id: edge.id,
    ...(current?.length_m !== undefined ? { length_m: current.length_m } : {}),
    ...(current?.free_speed_kmh !== undefined
      ? { free_speed_kmh: current.free_speed_kmh } : {}),
    ...(current?.congestion ? { congestion: { ...current.congestion } } : {}),
    ...(current?.risk ? { risk: { ...current.risk } } : {}),
  };
  if ("length_m" in patch) {
    if (patch.length_m === undefined || patch.length_m === edge.length_m) delete next.length_m;
    else next.length_m = patch.length_m;
  }
  if ("free_speed_kmh" in patch) {
    if (patch.free_speed_kmh === undefined || patch.free_speed_kmh === edge.free_speed_kmh)
      delete next.free_speed_kmh;
    else next.free_speed_kmh = patch.free_speed_kmh;
  }
  if (patch.congestion) {
    const congestion = { ...(next.congestion ?? {}) };
    for (const slot of SLOT_ORDER) {
      if (!(slot in patch.congestion)) continue;
      const value = patch.congestion[slot];
      if (value === undefined || value === baseTraffic[edge.id]) delete congestion[slot];
      else congestion[slot] = value;
    }
    const normalized = sortedCongestion(congestion);
    if (normalized) next.congestion = normalized;
    else delete next.congestion;
  }
  if (patch.risk) {
    const risk = { ...(next.risk ?? {}) };
    for (const key of RISK_ORDER) {
      if (!(key in patch.risk)) continue;
      const value = patch.risk[key];
      if (value === undefined || value === edge.risk[key]) delete risk[key];
      else risk[key] = value;
    }
    const normalized = sortedRisk(risk);
    if (normalized) next.risk = normalized;
    else delete next.risk;
  }
  return normalizeEdgeOverride(next);
}

export function effectiveCongestion(
  edgeId: string,
  baseTraffic: Record<string, number>,
  slot: TimeSlot,
  override: EdgeOverride | undefined,
): number {
  return override?.congestion?.[slot] ?? baseTraffic[edgeId] ?? 1;
}

export function minimumEdgeLength(
  edge: GraphEdge, nodes: GraphNode[],
): number {
  const u = nodes.find((node) => node.id === edge.u);
  const v = nodes.find((node) => node.id === edge.v);
  if (!u || !v) return edge.length_m;
  const r = 6_371_000;
  const radians = Math.PI / 180;
  const p1 = u.lat * radians;
  const p2 = v.lat * radians;
  const dp = (v.lat - u.lat) * radians;
  const dl = (v.lon - u.lon) * radians;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  const distance = 2 * r * Math.asin(Math.sqrt(a));
  return Math.ceil(Math.round(distance * 10 * 1_000_000) / 1_000_000) / 10;
}

export function edgeCostBreakdown(
  edge: GraphEdge,
  baseTraffic: Record<string, number>,
  slot: TimeSlot,
  override: EdgeOverride | undefined,
): EdgeCostBreakdown {
  const length_m = override?.length_m ?? edge.length_m;
  const free_speed_kmh = override?.free_speed_kmh ?? edge.free_speed_kmh;
  const congestion = effectiveCongestion(edge.id, baseTraffic, slot, override);
  const risk = { ...edge.risk, ...override?.risk };
  const t_free_s = length_m / (free_speed_kmh / 3.6);
  const congestion_factor = 1 + 1.5 * (congestion - 1) / 4;
  const penalty_flood_s = PENALTY_S.flood * risk.flood;
  const penalty_construction_s = PENALTY_S.construction * risk.construction;
  const penalty_narrow_alley_s = PENALTY_S.narrow_alley * risk.narrow_alley;
  const penalty_traffic_light_s = PENALTY_S.traffic_light * risk.traffic_light;
  const penalty_total_s = penalty_flood_s + penalty_construction_s
    + penalty_narrow_alley_s + penalty_traffic_light_s;
  const weight_time_s = t_free_s * congestion_factor;
  return {
    length_m, free_speed_kmh, t_free_s, congestion, congestion_factor,
    penalty_flood_s, penalty_construction_s, penalty_narrow_alley_s,
    penalty_traffic_light_s, penalty_total_s,
    weight_distance_m: length_m,
    weight_time_s,
    weight_balanced_s: weight_time_s + penalty_total_s,
  };
}
