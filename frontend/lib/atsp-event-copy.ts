import type { Mode, OptimizationEvent, OptimizationTrace } from "./types";

export type OptimizationEventPresentation = {
  title: string;
  description: string;
  sequenceLabel: string;
  sequence: string[];
  notation: "order" | "set";
};

type NameOf = (nodeId: string) => string;

const identity: NameOf = (nodeId) => nodeId;

// Kept local so this presentation helper stays runnable by the repository's
// dependency-free Node test harness as well as by the bundled application.
function fmtVi(value: number, digits = 1): string {
  const fixed = value.toFixed(digits);
  const negative = fixed.startsWith("-");
  const [integer, fraction] = fixed.replace("-", "").split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const result = `${negative ? "-" : ""}${grouped}${fraction ? `,${fraction}` : ""}`;
  return result.endsWith(",0") ? result.slice(0, -2) : result;
}

function conceptualOrder(event: OptimizationEvent): string[] {
  switch (event.kind) {
    case "held_karp_update": return [event.predecessor, event.endpoint];
    case "held_karp_reconstruct": return event.order;
    case "nn_decision": return event.order;
    case "local_improvement": return event.after_order;
    case "sa_seed_boundary": return event.current_order;
    case "sa_iteration": return event.resulting_order;
    case "sa_final_best": return event.final_order;
    case "optimization_summary": return event.final_order;
  }
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${fmtVi(value, 1)}`;
}

function formatCost(value: number, mode: Mode): string {
  if (mode === "distance") {
    const kilometres = value / 1000;
    const digits = Math.abs(value) > 0 && Math.abs(value) < 10 ? 3 : 2;
    return `${fmtVi(kilometres, digits)} km`;
  }
  return `${fmtVi(value / 60, 1)} phút`;
}

export function describeOptimizationEvent(
  event: OptimizationEvent,
  nameOf: NameOf = identity,
  mode: Mode = "balanced",
): OptimizationEventPresentation {
  const order = conceptualOrder(event).map(nameOf);

  switch (event.kind) {
    case "held_karp_update":
      return {
        title: "Cập nhật bảng quy hoạch động",
        description: `Đang thử đi từ ${nameOf(event.predecessor)} đến ${nameOf(event.endpoint)} để lưu chi phí tốt nhất cho tập điểm này.`,
        sequenceLabel: "Tập điểm đang xét",
        sequence: event.subset.map(nameOf),
        notation: "set",
      };
    case "held_karp_reconstruct":
      return {
        title: "Dựng lại thứ tự tối ưu",
        description: "Đã truy vết bảng quy hoạch động để dựng lại thứ tự ghé có tổng chi phí nhỏ nhất.",
        sequenceLabel: "Thứ tự được dựng lại",
        sequence: order,
        notation: "order",
      };
    case "nn_decision":
      return {
        title: "Chọn điểm ghé gần nhất",
        description: `Từ ${nameOf(event.current)}, phương pháp lân cận gần nhất chọn ${nameOf(event.selected)} trong ${event.candidates.length} ứng viên.`,
        sequenceLabel: "Thứ tự đang xây dựng",
        sequence: order,
        notation: "order",
      };
    case "local_improvement":
      return {
        title: event.move_type === "2_opt" ? "Cải thiện thứ tự bằng 2-opt" : "Cải thiện thứ tự bằng Or-opt",
        description: `Một phép đổi thứ tự được chấp nhận vì giảm chi phí từ ${formatCost(event.before_cost, mode)} xuống ${formatCost(event.after_cost, mode)}.`,
        sequenceLabel: "Thứ tự sau cải thiện",
        sequence: order,
        notation: "order",
      };
    case "sa_seed_boundary":
      return {
        title: event.boundary === "start" ? "Bắt đầu một lượt Simulated Annealing" : "Kết thúc một lượt Simulated Annealing",
        description: `Lượt seed ${event.seed} đang ở vòng ${event.iteration}; giao diện giữ lại trạng thái hiện tại để đối chiếu với nghiệm tốt nhất.`,
        sequenceLabel: "Thứ tự hiện tại của lượt seed",
        sequence: order,
        notation: "order",
      };
    case "sa_iteration": {
      const outcome = {
        accepted_non_worse: "Ứng viên không kém hơn được chấp nhận.",
        accepted_worse: "Ứng viên kém hơn vẫn được chấp nhận để tránh kẹt ở nghiệm cục bộ.",
        rejected_worse: "Ứng viên kém hơn bị từ chối.",
      }[!event.accepted ? "rejected_worse" : event.delta > 0 ? "accepted_worse" : "accepted_non_worse"];
      return {
        title: "Thử một thay đổi thứ tự",
        description: `Seed ${event.seed}, vòng ${event.iteration}: ${outcome}`,
        sequenceLabel: "Thứ tự sau bước đang xét",
        sequence: order,
        notation: "order",
      };
    }
    case "sa_final_best":
      return {
        title: "Chọn nghiệm tốt nhất qua các lượt chạy",
        description: `Đã chọn nghiệm tốt nhất của các seed với tổng chi phí ${formatCost(event.final_cost, mode)}.`,
        sequenceLabel: "Thứ tự tốt nhất",
        sequence: order,
        notation: "order",
      };
    case "optimization_summary":
      return {
        title: "Tóm tắt thứ tự cuối cùng",
        description: `Tối ưu thứ tự ghé hoàn tất với tổng chi phí ${formatCost(event.final_cost, mode)}.`,
        sequenceLabel: "Thứ tự cuối cùng",
        sequence: order,
        notation: "order",
      };
  }
}

export function optimizationSamplingLabel(
  policy: OptimizationTrace["sampling_policy"],
): string {
  switch (policy) {
    case "all-or-stride-v1": return "giữ toàn bộ sự kiện hoặc lấy mẫu theo nhịp xác định";
    case "chronological-prefix-final-v1": return "giữ diễn biến theo thời gian và luôn có mốc cuối";
    case "priority-periodic-20-v1": return "ưu tiên mốc quan trọng, kèm mẫu định kỳ mỗi 20 vòng";
  }
}

export function optimizationTechnicalSummary(event: OptimizationEvent): string {
  if (event.kind !== "sa_iteration") return "";
  const probability = event.delta <= 0 ? 1 : event.temperature > 0 ? Math.exp(-event.delta / event.temperature) : 0;
  return `Δ ${signed(event.delta)} · p=${fmtVi(probability, 4)} · T=${fmtVi(event.temperature, 3)}`;
}
