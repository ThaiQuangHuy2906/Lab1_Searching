import type {
  Algorithm, Mode, PathCostBreakdown, ReferenceRoute, SolutionQuality,
} from "./types";

function fmtVi(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  const [integer, fraction] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return fraction && Number(fraction) !== 0 ? `${grouped},${fraction}` : grouped;
}

function fmtKm(value: number): string {
  return `${fmtVi(value / 1000, Math.abs(value) > 0 && Math.abs(value) < 10 ? 3 : 2)} km`;
}

function fmtMinutes(value: number): string {
  return `${fmtVi(value / 60, 1)} phút`;
}

export interface ReferenceComparisonRow {
  key: "distance" | "traffic_time" | "congestion_delay" | "risk" | "balanced";
  label: string;
  selectedValue: number;
  referenceValue: number;
  unit: "m" | "s";
  affectsObjective: boolean;
}

const REFERENCE_KIND_LABEL: Record<ReferenceRoute["kind"], string> = {
  same_objective_optimum: "Tuyến tối ưu cùng tiêu chí",
  distance_optimum: "Tuyến ngắn nhất theo quãng đường",
  balanced_optimum: "Tuyến có chi phí cân bằng thấp nhất",
  avoid_edge_counterfactual: "Tuyến tránh một đoạn của tuyến hiện tại",
};

const ALGORITHM_LIMIT: Partial<Record<Algorithm, string>> = {
  bfs: "BFS ưu tiên số đoạn đường, không tối ưu trọng số",
  dfs: "DFS trả tuyến đầu tiên tìm thấy theo nhánh đi sâu",
  iddfs: "IDDFS ưu tiên độ sâu và số bước, không tối ưu trọng số",
  greedy: "Greedy ưu tiên ước lượng còn lại và bỏ qua chi phí đã đi khi chọn",
  beam: "Beam chỉ giữ lại một số phương án có triển vọng ở mỗi lớp",
};

const ALGORITHM_NAME: Record<Algorithm, string> = {
  bfs: "BFS",
  dfs: "DFS",
  iddfs: "IDDFS",
  ucs: "UCS",
  astar: "A*",
  greedy: "Greedy Best-First",
  bidijkstra: "Dijkstra hai chiều",
  idastar: "IDA*",
  beam: "Beam Search",
};

const COMPARISON_TOLERANCE = 1e-6;

export function referenceKindLabel(kind: ReferenceRoute["kind"]): string {
  return REFERENCE_KIND_LABEL[kind];
}

export function referenceComparisonRows(
  mode: Mode,
  selected: PathCostBreakdown,
  reference: PathCostBreakdown,
): ReferenceComparisonRow[] {
  return [
    {
      key: "distance",
      label: "Quãng đường",
      selectedValue: selected.distance_m,
      referenceValue: reference.distance_m,
      unit: "m",
      affectsObjective: mode === "distance",
    },
    {
      key: "traffic_time",
      label: "Thời gian theo ùn tắc",
      selectedValue: selected.congestion_adjusted_time_s,
      referenceValue: reference.congestion_adjusted_time_s,
      unit: "s",
      affectsObjective: mode !== "distance",
    },
    {
      key: "congestion_delay",
      label: "Phần tăng do ùn tắc",
      selectedValue: selected.congestion_delay_s,
      referenceValue: reference.congestion_delay_s,
      unit: "s",
      affectsObjective: mode !== "distance",
    },
    {
      key: "risk",
      label: "Tổng phạt rủi ro",
      selectedValue: selected.risk_penalty_total_s,
      referenceValue: reference.risk_penalty_total_s,
      unit: "s",
      affectsObjective: mode === "balanced",
    },
    {
      key: "balanced",
      label: "Chi phí cân bằng",
      selectedValue: selected.balanced_cost_s,
      referenceValue: reference.balanced_cost_s,
      unit: "s",
      affectsObjective: mode === "balanced",
    },
  ];
}

function objectiveName(mode: Mode): string {
  if (mode === "distance") return "quãng đường";
  if (mode === "time") return "thời gian ước tính theo ùn tắc";
  return "chi phí cân bằng";
}

function formatObjectiveDelta(mode: Mode, value: number): string {
  return mode === "distance" ? fmtKm(value) : fmtMinutes(value);
}

function qualityContext(algorithm: Algorithm, quality: SolutionQuality): string {
  if (quality === "exact") {
    return `${ALGORITHM_NAME[algorithm]} có bảo đảm tối ưu theo tiêu chí hiện tại trong snapshot này.`;
  }
  if (quality === "epsilon_bounded") {
    return "IDA* có bảo đảm trong biên sai số ε, nên kết quả không nhất thiết trùng hoàn toàn với tuyến tối ưu hậu kiểm.";
  }
  const limitation = ALGORITHM_LIMIT[algorithm];
  return limitation
    ? `${limitation}, nên kết quả không được xem là tối ưu trọng số.`
    : `${ALGORITHM_NAME[algorithm]} không có bảo đảm tối ưu trọng số cho kết quả này.`;
}

export function referenceTradeoffConclusion(
  algorithm: Algorithm,
  mode: Mode,
  quality: SolutionQuality,
  reference: ReferenceRoute,
): string {
  const objective = objectiveName(mode);
  const objectiveDelta = reference.reference_minus_selected_cost;
  const distanceDelta = reference.reference_minus_selected_distance_m;
  const balancedDelta = reference.reference_minus_selected_balanced_cost_s;

  if (
    mode !== "distance"
    && distanceDelta < -COMPARISON_TOLERANCE
    && objectiveDelta > COMPARISON_TOLERANCE
  ) {
    return `Tuyến tham chiếu ngắn hơn ${fmtKm(Math.abs(distanceDelta))}, nhưng ${objective} cao hơn `
      + `${formatObjectiveDelta(mode, objectiveDelta)}. Vì đang tối ưu ${objective}, tuyến kết quả có lợi hơn theo tiêu chí này. `
      + qualityContext(algorithm, quality);
  }
  if (
    mode === "distance"
    && balancedDelta < -COMPARISON_TOLERANCE
    && objectiveDelta > COMPARISON_TOLERANCE
  ) {
    return `Tuyến tham chiếu có chi phí cân bằng thấp hơn ${fmtMinutes(Math.abs(balancedDelta))}, nhưng dài hơn `
      + `${fmtKm(objectiveDelta)}. Vì đang tối ưu quãng đường, tuyến kết quả được ưu tiên. `
      + qualityContext(algorithm, quality);
  }
  if (reference.relation_to_selected === "equivalent") {
    return `Hai tuyến tương đương theo ${objective}; khác biệt nằm ở hình dạng tuyến hoặc các chỉ số phụ. `
      + qualityContext(algorithm, quality);
  }
  if (reference.relation_to_selected === "better") {
    return `Hậu kiểm cho thấy tuyến tham chiếu có ${objective} thấp hơn `
      + `${formatObjectiveDelta(mode, Math.abs(objectiveDelta))}. `
      + qualityContext(algorithm, quality);
  }
  return `Tuyến kết quả có ${objective} thấp hơn tuyến tham chiếu `
    + `${formatObjectiveDelta(mode, Math.abs(objectiveDelta))}. `
    + qualityContext(algorithm, quality);
}
