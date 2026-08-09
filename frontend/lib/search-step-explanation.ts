import type { Mode, Trace, TraceDecision, TraceStepV2 } from "./types";

export interface SearchStepPresentation {
  availability: "structured_v2" | "legacy_fallback" | "trace_off";
  title: string;
  action: string;
  rule: string;
  evidence: string;
  effect: string;
  caveat: string | null;
}

function rawCost(value: number | null | undefined, mode: Mode): string {
  if (value === null || value === undefined) return "chưa có";
  return `${value} ${mode === "distance" ? "m" : "s"}`;
}

function score(value: number | null): string {
  return value === null ? "không áp dụng" : `${value}`;
}

function effect(decision: TraceDecision): string {
  return `Đã quét ${decision.neighbors_scanned} cạnh; thêm ${decision.frontier_added} node; `
    + `cải thiện ${decision.frontier_updated} node; frontier sau bước có `
    + `${decision.frontier_size_after} node.`;
}

function structuredRule(step: TraceStepV2, mode: Mode): {
  rule: string;
  evidence: string;
  caveat: string | null;
} {
  const decision = step.decision;
  const selected = decision.selected_scores;
  const runner = decision.runner_up;
  switch (decision.rule) {
    case "fifo":
      return {
        rule: "BFS lấy node ở đầu hàng đợi FIFO.",
        evidence: `Frontier hiệu lực trước khi lấy có ${decision.frontier_size_before} node.`,
        caveat: "BFS tối ưu số cạnh/lớp, không bảo đảm tối ưu weighted objective.",
      };
    case "lifo":
      return {
        rule: "DFS lấy node trên đỉnh ngăn xếp LIFO.",
        evidence: `Frontier hiệu lực trước khi lấy có ${decision.frontier_size_before} node.`,
        caveat: "DFS trả path đầu theo stable adjacency order, không bảo đảm tối ưu cost.",
      };
    case "depth_limited_lifo":
      return {
        rule: "IDDFS dùng DFS giới hạn sâu và tăng giới hạn qua từng vòng.",
        evidence: `Vòng ${decision.iteration}; depth=${score(selected?.depth ?? null)}; `
          + `giới hạn=${rawCost(decision.bound, "distance").replace(" m", "")}.`,
        caveat: "Chạm depth cap làm no-path inconclusive; không tự chứng minh graph vô đường.",
      };
    case "lowest_g":
      return {
        rule: "UCS chọn node có g nhỏ nhất.",
        evidence: `Node được chọn có g=${rawCost(selected?.g, mode)}; `
          + `ứng viên kế tiếp ${runner?.node ?? "không có"} có g=${rawCost(runner?.g, mode)}.`,
        caveat: "Bảo đảm exact cần weight không âm trong snapshot này.",
      };
    case "lowest_h":
      return {
        rule: "Greedy Best-First chọn node có h nhỏ nhất và không dùng g để chọn.",
        evidence: `Node được chọn có h=${rawCost(selected?.h, mode)}; `
          + `ứng viên kế tiếp ${runner?.node ?? "không có"} có h=${rawCost(runner?.h, mode)}.`,
        caveat: "Greedy không có bảo đảm weighted optimum.",
      };
    case "lowest_f_then_h":
      return {
        rule: "A* chọn f=g+h nhỏ nhất và tie-break theo h.",
        evidence: `Node được chọn có g=${rawCost(selected?.g, mode)}, `
          + `h=${rawCost(selected?.h, mode)}, f=${rawCost(selected?.f, mode)}; `
          + `ứng viên kế tiếp ${runner?.node ?? "không có"} có f=${rawCost(runner?.f, mode)}.`,
        caveat: "Bảo đảm exact phụ thuộc heuristic admissible và consistent của snapshot.",
      };
    case "bidirectional_min_key": {
      const sides = step.bidirectional_frontiers;
      const side = step.side === "forward" ? "phía Đi" : "phía Đến";
      return {
        rule: "Bidirectional Dijkstra chọn phía có effective top key nhỏ hơn.",
        evidence: `Bước này mở rộng ${side}; top F=${rawCost(decision.top_forward?.g, mode)}, `
          + `top B=${rawCost(decision.top_backward?.g, mode)}, μ trước=${rawCost(decision.mu_before, mode)}, `
          + `μ sau=${rawCost(sides?.best_path_cost, mode)}.`,
        caveat: "Backward g là chi phí node→Goal trên graph gốc; hai frontier không được suy từ legacy union.",
      };
    }
    case "f_bound_dfs":
      return {
        rule: "IDA* duyệt DFS trong f-bound hiện tại.",
        evidence: `Vòng ${decision.iteration}; f=${rawCost(selected?.f, mode)}; `
          + `bound=${rawCost(decision.bound, mode)}.`,
        caveat: "Bảo đảm sai số cộng không quá ε chỉ áp dụng nếu hoàn tất trước round cap.",
      };
    case "top_k_f":
      return {
        rule: "Beam giữ top-k ứng viên theo f ở mỗi lớp.",
        evidence: `Lớp ${decision.layer}; k=${decision.beam_width}; `
          + `f được chọn=${rawCost(selected?.f, mode)}; đã cắt ${decision.pruned_count} ứng viên.`,
        caveat: "Pruning làm Beam incomplete và không có optimal guarantee.",
      };
  }
}

export function presentSearchStep(trace: Trace, stepIndex: number): SearchStepPresentation {
  if (trace.trace.length === 0) {
    return {
      availability: "trace_off",
      title: "Không có timeline từng bước",
      action: "Lần chạy này không ghi diễn biến từng bước.",
      rule: "Kết quả và guarantee vẫn dùng full run.",
      evidence: "Backend hiện tại chưa cung cấp step để trình bày.",
      effect: "Không suy diễn frontier hoặc selected score.",
      caveat: null,
    };
  }
  const boundedIndex = Math.max(0, Math.min(stepIndex, trace.trace.length - 1));
  const step = trace.trace[boundedIndex];
  if (trace.contract_version !== 2) {
    return {
      availability: "legacy_fallback",
      title: `Bước ${boundedIndex + 1}/${trace.trace.length}`,
      action: `Bước này vừa mở rộng ${step.expanded}.`,
      rule: "Response legacy chưa có decision evidence để chứng minh thứ tự ưu tiên lúc chọn.",
      evidence: `Frontier sau bước có ${step.frontier.length} node.`,
      effect: "Chỉ trình bày snapshot sau expansion; không suy selected score từ g/h/f đã sort.",
      caveat: trace.metrics.trace_truncated
        ? "Trace nguồn bị cap; metrics và kết quả vẫn là full run."
        : null,
    };
  }
  const v2Step = trace.trace[boundedIndex];
  const presentation = structuredRule(v2Step, trace.mode);
  return {
    availability: "structured_v2",
    title: `Bước ${boundedIndex + 1}/${trace.trace.length}`,
    action: `Đang mở rộng ${v2Step.expanded}.`,
    rule: presentation.rule,
    evidence: presentation.evidence,
    effect: effect(v2Step.decision),
    caveat: trace.metrics.trace_truncated
      ? `${presentation.caveat ?? ""} Timeline là payload rút gọn; metrics và kết quả vẫn là full run.`.trim()
      : presentation.caveat,
  };
}
