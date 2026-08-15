import type {
  AtspComputationMetrics, AtspMethodStats, Mode, PathCostBreakdown,
} from "./types";

// Keep these tiny render helpers local: `npm test` imports this TypeScript
// module directly with Node's strip-types runner, which does not implement
// Next's extensionless runtime module resolution. The output matches
// `lib/format.ts` exactly.
function formatVietnameseNumber(value: number, digits = 1): string {
  const fixed = value.toFixed(digits);
  const negative = fixed.startsWith("-");
  const [integer, fraction] = fixed.replace("-", "").split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const formatted = (negative ? "-" : "") + grouped + (fraction ? `,${fraction}` : "");
  return formatted.endsWith(",0") ? formatted.slice(0, -2) : formatted;
}

function formatKilometres(metres: number): string {
  const digits = Math.abs(metres) > 0 && Math.abs(metres) < 10 ? 3 : 2;
  return `${formatVietnameseNumber(metres / 1000, digits)} km`;
}

function formatMinutes(seconds: number): string {
  return `${formatVietnameseNumber(seconds / 60, 1)} phút`;
}

/**
 * UI-facing route/ATSP outcome metrics. `total_time_s` deliberately stays out
 * of this primary presentation because the API contract defines it as the
 * balanced path weight in every mode, not always as pure travel time.
 */
export type OutcomeMetricKey = "total_cost" | "total_distance_m";

export type OutcomeMetric = {
  key: OutcomeMetricKey;
  label: string;
  unit: "mét" | "giây";
};

const OUTCOME_METRICS: Record<Mode, readonly OutcomeMetric[]> = {
  distance: [
    { key: "total_cost", label: "Quãng đường", unit: "mét" },
  ],
  time: [
    { key: "total_cost", label: "Thời gian ước tính theo ùn tắc", unit: "giây" },
    { key: "total_distance_m", label: "Quãng đường", unit: "mét" },
  ],
  balanced: [
    { key: "total_cost", label: "Chi phí cân bằng", unit: "giây" },
    { key: "total_distance_m", label: "Quãng đường", unit: "mét" },
  ],
};

export function outcomeMetricsForMode(mode: Mode): readonly OutcomeMetric[] {
  return OUTCOME_METRICS[mode];
}

export function primaryOutcomeMetric(mode: Mode): OutcomeMetric {
  return OUTCOME_METRICS[mode][0];
}

/**
 * Identify the displayed measurement by its UI contract, not by the backing
 * field name. In distance mode, `total_cost` is expressed in metres.
 */
export function isDistanceOutcomeMetric(metric: OutcomeMetric): boolean {
  return metric.unit === "mét";
}

/**
 * The API keeps distances in metres and costs in seconds, while the UI uses
 * the units people scan most easily during a demo: kilometres and minutes.
 */
export function formatOutcomeMetricValue(metric: OutcomeMetric, value: number): string {
  return isDistanceOutcomeMetric(metric) ? formatKilometres(value) : formatMinutes(value);
}

export function presentationUnitForMode(mode: Mode): "km" | "phút" {
  return mode === "distance" ? "km" : "phút";
}

/** Convert a raw backend epsilon (metres/seconds) to its visible UI unit. */
export function rawEpsilonToPresentation(mode: Mode, epsilon: number | null | undefined): number {
  const raw = epsilon ?? 5;
  return mode === "distance" ? raw / 1000 : raw / 60;
}

/** Convert a value entered in km/minutes back to the backend's raw unit. */
export function presentationEpsilonToRaw(mode: Mode, value: number): number {
  return mode === "distance" ? value * 1000 : value * 60;
}

const VERBOSE_ALGORITHM_NAMES: ReadonlyArray<readonly [RegExp, string]> = [
  [/BFS\s*\(tìm theo bề rộng\)/g, "BFS"],
  [/DFS\s*\(tìm theo chiều sâu\)/g, "DFS"],
  [/IDDFS\s*\(đào sâu dần\)/g, "IDDFS"],
  [/UCS\s*\(chi phí đồng nhất\)/g, "UCS"],
];

function parseVietnameseNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Backend explanation copy is intentionally preserved as data. This display
 * adapter only removes duplicated raw-unit phrasing such as "254 s ≈ 4,2
 * phút", keeping the same value in the UI's km/minute convention.
 */
export function presentRouteNarrative(copy: string): string {
  let presented = copy;
  for (const [pattern, shortName] of VERBOSE_ALGORITHM_NAMES) {
    presented = presented.replace(pattern, shortName);
  }
  presented = presented.replace(
    /~?(\d+(?:[,.]\d+)?)\s*s\s*≈\s*(\d+(?:[,.]\d+)?)\s*phút/g,
    (_match, _seconds, minutes) => `${minutes} phút`,
  );
  presented = presented.replace(/(~?)(\d+(?:[,.]\d+)?)\s*(?:s|giây)\b/g, (_match, approximate, seconds) => {
    const value = parseVietnameseNumber(seconds);
    return value === null ? _match : `${approximate}${formatMinutes(value)}`;
  });
  return presented.replace(/(~?)(\d+(?:[,.]\d+)?)\s*m\b/g, (_match, approximate, metres) => {
    const value = parseVietnameseNumber(metres);
    return value === null ? _match : `${approximate}${formatKilometres(value)}`;
  });
}

export interface CostBreakdownRow {
  key: keyof PathCostBreakdown;
  label: string;
  value: number;
  unit: "m" | "s";
  affectsObjective: boolean;
}

/** Structured breakdown rows; no value is reconstructed from localized prose. */
export function costBreakdownRows(
  mode: Mode,
  breakdown: PathCostBreakdown,
): CostBreakdownRow[] {
  const rows: CostBreakdownRow[] = [
    {
      key: "distance_m", label: "Quãng đường", value: breakdown.distance_m,
      unit: "m", affectsObjective: mode === "distance",
    },
    {
      key: "free_flow_time_s", label: "Thời gian thông thoáng", value: breakdown.free_flow_time_s,
      unit: "s", affectsObjective: false,
    },
    {
      key: "congestion_adjusted_time_s", label: "Thời gian ước tính theo ùn tắc",
      value: breakdown.congestion_adjusted_time_s, unit: "s", affectsObjective: mode !== "distance",
    },
    {
      key: "congestion_delay_s", label: "Phần tăng do ùn tắc",
      value: breakdown.congestion_delay_s, unit: "s", affectsObjective: mode !== "distance",
    },
    {
      key: "risk_penalty_total_s", label: "Tổng phần phạt rủi ro",
      value: breakdown.risk_penalty_total_s, unit: "s", affectsObjective: mode === "balanced",
    },
    {
      key: "balanced_cost_s", label: "Chi phí cân bằng",
      value: breakdown.balanced_cost_s, unit: "s", affectsObjective: mode === "balanced",
    },
  ];
  return rows;
}

export function atspComputationRows(metrics: AtspComputationMetrics): Array<{
  key: keyof AtspComputationMetrics;
  label: string;
  value: number;
  unit: "count" | "ms";
}> {
  return [
    { key: "matrix_search_runs", label: "Số lượt tìm đường dựng ma trận", value: metrics.matrix_search_runs, unit: "count" },
    { key: "matrix_nodes_expanded", label: "Node mở rộng khi dựng ma trận", value: metrics.matrix_nodes_expanded, unit: "count" },
    { key: "matrix_runtime_ms", label: "Dựng ma trận", value: metrics.matrix_runtime_ms, unit: "ms" },
    { key: "optimizer_runtime_ms", label: "Tối ưu thứ tự", value: metrics.optimizer_runtime_ms, unit: "ms" },
    { key: "total_runtime_ms", label: "Tổng xử lý backend", value: metrics.total_runtime_ms, unit: "ms" },
  ];
}

export function atspMethodStatsLabels(stats: AtspMethodStats): string[] {
  if (stats.kind === "held_karp") return ["Trạng thái DP đã giải", "Transition đã đánh giá"];
  if (stats.kind === "nn_local_search") return [
    "Ứng viên NN", "Ứng viên 2-opt", "Ứng viên Or-opt", "Move 2-opt chấp nhận", "Move Or-opt chấp nhận",
  ];
  return [
    "Move cải thiện chấp nhận", "Move bằng nhau chấp nhận",
    "Move kém hơn chấp nhận", "Move bị từ chối", "Độ lệch chuẩn mẫu qua seed",
  ];
}

const RAW_ABS_TOLERANCE = 1e-6;
const RAW_REL_TOLERANCE = 1e-9;

export function rawEquivalent(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(
    RAW_ABS_TOLERANCE,
    RAW_REL_TOLERANCE * Math.max(Math.abs(left), Math.abs(right)),
  );
}

export function exactOptimalityGap(
  selected: number | null,
  exactReference: number | null,
): { raw: number; pct: number | null } | null {
  if (selected === null || exactReference === null) return null;
  const raw = rawEquivalent(selected, exactReference) ? 0 : selected - exactReference;
  if (raw < 0) return null;
  if (rawEquivalent(exactReference, 0)) {
    return { raw, pct: rawEquivalent(selected, 0) ? 0 : null };
  }
  return { raw, pct: raw / exactReference * 100 };
}
