import type { ExplanationFactor, Mode } from "./types";

function fmtVi(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  const [integer, fraction] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return fraction && Number(fraction) !== 0 ? `${grouped},${fraction}` : grouped;
}

function formatContribution(factor: ExplanationFactor, mode: Mode): string | null {
  if (factor.contribution_raw === null || factor.contribution_unit === null) return null;
  if (factor.contribution_unit === "m") {
    const metres = factor.contribution_raw;
    return `${fmtVi(metres / 1000, Math.abs(metres) > 0 && Math.abs(metres) < 10 ? 3 : 2)} km`;
  }
  return `${fmtVi(factor.contribution_raw / 60, 1)} phút${mode === "balanced" ? " quy đổi" : ""}`;
}

const TITLE: Record<ExplanationFactor["kind"], string> = {
  objective_truth: "Tổng chi phí của chặng",
  optimality_gap: "So với tuyến tối ưu tham chiếu",
  congestion: "Thời gian tăng do ùn tắc",
  flood: "Phần cộng do nguy cơ ngập",
  construction: "Phần cộng do công trình",
  narrow_alley: "Phần cộng do hẻm nhỏ",
  traffic_light: "Phần cộng do đèn tín hiệu",
  algorithm_limit: "Giới hạn của thuật toán",
  scenario_effect: "Thay đổi do kịch bản thử nghiệm",
};

const SOURCE: Record<ExplanationFactor["source"], string> = {
  cost_breakdown: "Tính từ các đoạn đường thực sự nằm trên tuyến.",
  reference_comparison: "Đối chiếu hậu kiểm với tuyến tối ưu cùng tiêu chí bằng UCS.",
  trace: "Dựa trên trạng thái kết thúc và giới hạn của lần chạy thuật toán.",
  scenario: "Dựa trên các thay đổi tạm thời trong kịch bản thử nghiệm.",
};

export interface FactorDisplay {
  title: string;
  status: string;
  valueText: string | null;
  sourceText: string;
}

export function presentFactor(factor: ExplanationFactor, mode: Mode): FactorDisplay {
  const value = formatContribution(factor, mode);
  let valueText: string | null = value;
  if (factor.kind === "objective_truth" && value) valueText = `Tổng theo tiêu chí: ${value}`;
  else if (factor.kind === "optimality_gap") {
    valueText = factor.contribution_raw === 0
      ? "Bằng tuyến tối ưu tham chiếu"
      : value ? `Cao hơn tuyến tối ưu: ${value}` : null;
  } else if (factor.kind === "congestion" && value) valueText = `Tăng thêm: ${value}`;
  else if (["flood", "construction", "narrow_alley", "traffic_light"].includes(factor.kind) && value)
    valueText = `Cộng thêm: ${value}`;
  else if (factor.kind === "scenario_effect" && value) valueText = `Thay đổi: ${value}`;

  return {
    title: TITLE[factor.kind],
    status: factor.affects_objective ? "Có tính vào tiêu chí" : "Chỉ để tham khảo",
    valueText,
    sourceText: SOURCE[factor.source],
  };
}

export function criterionExplanation(mode: Mode): string {
  if (mode === "distance") {
    return "Đang tối ưu quãng đường. Ùn tắc và rủi ro vẫn có thể được nêu để tham khảo nhưng không làm thay đổi tổng số km.";
  }
  if (mode === "time") {
    return "Đang tối ưu thời gian ước tính theo ùn tắc. Các phần phạt rủi ro chỉ để tham khảo và không được cộng vào tổng.";
  }
  return "Đang tối ưu chi phí cân bằng: thời gian theo ùn tắc cộng các phần phạt rủi ro. Đơn vị là phút quy đổi, không phải ETA trực tiếp.";
}

export function objectiveTotalLabel(mode: Mode): string {
  if (mode === "distance") return "Tổng quãng đường";
  if (mode === "time") return "Tổng thời gian ước tính";
  return "Tổng chi phí cân bằng";
}
