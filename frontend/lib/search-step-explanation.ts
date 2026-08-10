import type { Mode, Trace, TraceDecision, TraceStepV2 } from "./types";

export interface SearchStepPresentation {
  availability: "structured_v2" | "legacy_fallback" | "trace_off";
  title: string;
  summary: string;
  action: string;
  rule: string;
  evidence: string;
  effect: string;
  caveat: string | null;
}

function fmtVi(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  const [integer, fraction] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return fraction && Number(fraction) !== 0 ? `${grouped},${fraction}` : grouped;
}

export function formatSearchCost(value: number | null | undefined, mode: Mode): string {
  if (value === null || value === undefined) return "chưa có";
  if (mode === "distance") {
    const kilometres = value / 1000;
    return `${fmtVi(kilometres, Math.abs(value) > 0 && Math.abs(value) < 10 ? 3 : 2)} km`;
  }
  return `${fmtVi(value / 60, 1)} phút${mode === "balanced" ? " quy đổi" : ""}`;
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
  summary: string;
  rule: string;
  evidence: string;
  effect?: string;
  caveat: string | null;
} {
  const decision = step.decision;
  const selected = decision.selected_scores;
  const runner = decision.runner_up;
  switch (decision.rule) {
    case "fifo":
      return {
        summary: "BFS lấy điểm đã chờ lâu nhất để mở rộng tiếp, giống như phục vụ một hàng đợi.",
        rule: "BFS lấy node ở đầu hàng đợi FIFO.",
        evidence: `Frontier hiệu lực trước khi lấy có ${decision.frontier_size_before} node.`,
        caveat: "BFS tối ưu số cạnh/lớp, không bảo đảm tối ưu weighted objective.",
      };
    case "lifo":
      return {
        summary: "DFS tiếp tục đi sâu theo nhánh hiện tại trước khi quay lại thử nhánh khác.",
        rule: "DFS lấy node trên đỉnh ngăn xếp LIFO.",
        evidence: `Frontier hiệu lực trước khi lấy có ${decision.frontier_size_before} node.`,
        caveat: "DFS trả path đầu theo stable adjacency order, không bảo đảm tối ưu cost.",
      };
    case "depth_limited_lifo":
      return {
        summary: "IDDFS đang tìm trong một giới hạn độ sâu; nếu chưa thấy đích, vòng sau sẽ cho phép đi sâu hơn.",
        rule: "IDDFS dùng DFS giới hạn sâu và tăng giới hạn qua từng vòng.",
        evidence: `Vòng ${decision.iteration}; depth=${score(selected?.depth ?? null)}; `
          + `giới hạn=${decision.bound ?? "không có"}.`,
        caveat: "Chạm depth cap làm no-path inconclusive; không tự chứng minh graph vô đường.",
      };
    case "lowest_g":
      return {
        summary: "UCS chọn phương án có chi phí đã đi thấp nhất trong các phương án đang chờ.",
        rule: "UCS chọn node có g nhỏ nhất.",
        evidence: `Node được chọn có g=${formatSearchCost(selected?.g, mode)}; `
          + `ứng viên kế tiếp ${runner?.node ?? "không có"} có g=${formatSearchCost(runner?.g, mode)}.`,
        caveat: "Bảo đảm exact cần weight không âm trong snapshot này.",
      };
    case "lowest_h":
      return {
        summary: "Greedy chọn điểm có vẻ gần đích nhất theo ước lượng, chưa tính chi phí đã đi để ra quyết định này.",
        rule: "Greedy Best-First chọn node có h nhỏ nhất và không dùng g để chọn.",
        evidence: `Node được chọn có h=${formatSearchCost(selected?.h, mode)}; `
          + `ứng viên kế tiếp ${runner?.node ?? "không có"} có h=${formatSearchCost(runner?.h, mode)}.`,
        caveat: "Greedy không có bảo đảm weighted optimum.",
      };
    case "lowest_f_then_h":
      return {
        summary: "A* chọn phương án có tổng chi phí đã đi và phần ước lượng còn lại thấp nhất.",
        rule: "A* chọn f=g+h nhỏ nhất và tie-break theo h.",
        evidence: `Node được chọn có g=${formatSearchCost(selected?.g, mode)}, `
          + `h=${formatSearchCost(selected?.h, mode)}, f=${formatSearchCost(selected?.f, mode)}; `
          + `ứng viên kế tiếp ${runner?.node ?? "không có"} có f=${formatSearchCost(runner?.f, mode)}.`,
        caveat: "Bảo đảm exact phụ thuộc heuristic admissible và consistent của snapshot.",
      };
    case "bidirectional_min_key": {
      const sides = step.bidirectional_frontiers;
      const side = step.side === "forward" ? "phía Đi" : "phía Đến";
      return {
        summary: `Dijkstra hai chiều đang mở rộng ${side} vì phía này có chi phí chờ thấp hơn.`,
        rule: "Dijkstra hai chiều chọn phía có giá trị nhỏ nhất đang chờ (effective top key) thấp hơn.",
        evidence: `Trước bước: chọn mở rộng ${side} với g=${formatSearchCost(selected?.g, mode)}; `
          + `top F=${formatSearchCost(decision.top_forward?.g, mode)}, `
          + `top B=${formatSearchCost(decision.top_backward?.g, mode)}, μ trước=${formatSearchCost(decision.mu_before, mode)}.`,
        effect: `${effect(decision)} Hàng chờ phía Đi/Đến sau bước có `
          + `${sides?.forward.nodes.length ?? 0}/${sides?.backward.nodes.length ?? 0} điểm; `
          + `μ sau=${formatSearchCost(sides?.best_path_cost, mode)}, điểm gặp=${sides?.meeting_node ?? "chưa có"}.`,
        caveat: "g ở phía ngược là chi phí từ điểm đó đến Đến (node→Goal) trên đồ thị gốc; dữ liệu v1 không được dùng để dựng giả hai hàng chờ.",
      };
    }
    case "f_bound_dfs":
      return {
        summary: "IDA* đang đi sâu trong ngưỡng chi phí ước lượng hiện tại; vượt ngưỡng sẽ được xét ở vòng sau.",
        rule: "IDA* duyệt DFS trong f-bound hiện tại.",
        evidence: `Vòng ${decision.iteration}; f=${formatSearchCost(selected?.f, mode)}; `
          + `bound=${formatSearchCost(decision.bound, mode)}.`,
        caveat: "Bảo đảm sai số cộng không quá ε chỉ áp dụng nếu hoàn tất trước round cap.",
      };
    case "top_k_f":
      return {
        summary: "Beam chỉ giữ lại một số phương án có triển vọng nhất ở lớp này và bỏ bớt phần còn lại.",
        rule: "Beam giữ top-k ứng viên theo f ở mỗi lớp.",
        evidence: `Lớp ${decision.layer}; k=${decision.beam_width}; `
          + `f được chọn=${formatSearchCost(selected?.f, mode)}; đã cắt ${decision.pruned_count} ứng viên.`,
        caveat: "Pruning làm Beam incomplete và không có optimal guarantee.",
      };
  }
}

export function presentBidirectionalTermination(trace: Trace): string | null {
  if (trace.contract_version !== 2
      || trace.termination.reason !== "bidirectional_bound_met"
      || !trace.termination.bidirectional_bound) return null;
  const bound = trace.termination.bidirectional_bound;
  const effectiveTop = (value: number | null | undefined) => value === null || value === undefined
    ? "+∞ (frontier rỗng)"
    : formatSearchCost(value, trace.mode);
  return `Điều kiện dừng toàn bộ phép tìm: top F (${effectiveTop(bound.top_forward?.g)}) `
    + `+ top B (${effectiveTop(bound.top_backward?.g)}) ≥ μ `
    + `(${formatSearchCost(bound.mu, trace.mode)}), gặp tại ${bound.meeting_node}.`;
}

export function presentSearchStep(trace: Trace, stepIndex: number): SearchStepPresentation {
  if (trace.trace.length === 0) {
    return {
      availability: "trace_off",
      title: "Không có timeline từng bước",
      summary: "Lần chạy này không ghi lại diễn biến tìm kiếm để giải thích từng bước.",
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
      summary: "Backend legacy chỉ cho biết điểm vừa được mở rộng, chưa đủ bằng chứng để giải thích vì sao nó được chọn.",
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
    summary: presentation.summary,
    action: `Đang mở rộng ${v2Step.expanded}.`,
    rule: presentation.rule,
    evidence: presentation.evidence,
    effect: presentation.effect ?? effect(v2Step.decision),
    caveat: trace.metrics.trace_truncated
      ? `${presentation.caveat ?? ""} Timeline là payload rút gọn; metrics và kết quả vẫn là full run.`.trim()
      : presentation.caveat,
  };
}
