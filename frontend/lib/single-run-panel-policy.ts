import type {
  Algorithm, MultiStrategy, ProblemMode, RunKind, TspMethod,
} from "./types";

export interface ActivePanelControls {
  showGoal: boolean;
  showStops: boolean;
  showStrategy: boolean;
  selection: "route_algorithm" | "atsp_method" | "comparison_pending";
}

export function activePanelControls(
  problemMode: ProblemMode,
  multiStrategy: MultiStrategy,
  runKind: RunKind,
): ActivePanelControls {
  const routeFlow = problemMode === "two_point" || multiStrategy === "ordered_search";
  return {
    showGoal: problemMode === "two_point",
    showStops: problemMode === "multi_point",
    showStrategy: problemMode === "multi_point",
    selection: runKind === "compare"
      ? "comparison_pending"
      : routeFlow ? "route_algorithm" : "atsp_method",
  };
}

const ALGORITHM_LABEL: Record<Algorithm, string> = {
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

const METHOD_LABEL: Record<TspMethod, string> = {
  held_karp: "Held–Karp",
  nn_2opt: "NN + 2-opt/Or-opt",
  sa: "Simulated Annealing",
};

export interface SingleRunCtaInput {
  problemMode: ProblemMode;
  multiStrategy: MultiStrategy;
  runKind: RunKind;
  start: string | null;
  goal: string | null;
  stops: readonly string[];
  algorithm: Algorithm;
  method: TspMethod;
}

export interface SingleRunCta {
  label: string;
  action: "route" | "atsp" | null;
  blockedReason: string | null;
}

export function singleRunCta(input: SingleRunCtaInput): SingleRunCta {
  if (input.runKind === "compare") {
    return {
      label: "So sánh nhiều",
      action: null,
      blockedReason:
        "Không gian so sánh nhiều bản đồ thuộc Phase 6. Lựa chọn này không chạy nhầm tác vụ đơn.",
    };
  }
  if (input.problemMode === "multi_point" && input.multiStrategy === "atsp") {
    let blockedReason: string | null = null;
    if (!input.start || input.stops.length === 0) {
      blockedReason = "Cần điểm Đi và ít nhất 1 điểm giao để tối ưu thứ tự.";
    } else if (input.stops.length > 15) {
      blockedReason = "ATSP hỗ trợ tối đa 15 điểm giao.";
    } else if (new Set([input.start, ...input.stops]).size !== input.stops.length + 1) {
      blockedReason = "Điểm Đi và các điểm giao không được trùng nhau.";
    } else {
      const pointCount = input.stops.length + 1;
      const limit = input.method === "held_karp" ? 15 : 16;
      if (pointCount > limit) {
        blockedReason = `${input.method} nhận ${pointCount} điểm, vượt giới hạn ${limit} điểm.`;
      }
    }
    return {
      label: `Tối ưu bằng ${METHOD_LABEL[input.method]}`,
      action: "atsp",
      blockedReason,
    };
  }
  const blockedReason = !input.start
    ? "Hãy chọn điểm Đi."
    : input.problemMode === "two_point"
      ? !input.goal
        ? "Hãy chọn điểm Đến."
        : input.start === input.goal ? "Điểm Đi và Đến phải khác nhau." : null
      : input.stops.length === 0
        ? "Hãy thêm ít nhất một điểm giao."
        : new Set([input.start, ...input.stops]).size !== input.stops.length + 1
          ? "Điểm Đi và các điểm giao phải khác nhau."
          : null;
  return {
    label: input.problemMode === "two_point"
      ? `Chạy ${ALGORITHM_LABEL[input.algorithm]}: Đi → Đến`
      : `Chạy ${ALGORITHM_LABEL[input.algorithm]} theo thứ tự đã chọn`,
    action: "route",
    blockedReason,
  };
}

export type StopMoveDirection = "up" | "down";

export interface StopMoveResult {
  order: string[];
  movedIndex: number;
  announcement: string;
}

export function moveStop(
  stops: readonly string[],
  index: number,
  direction: StopMoveDirection,
  nameOf: (id: string) => string = (id) => id,
): StopMoveResult | null {
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= stops.length || nextIndex < 0 || nextIndex >= stops.length)
    return null;
  const order = [...stops];
  const [moved] = order.splice(index, 1);
  order.splice(nextIndex, 0, moved);
  return {
    order,
    movedIndex: nextIndex,
    announcement: `Đã chuyển ${nameOf(moved)} ${direction === "up" ? "lên" : "xuống"} vị trí ${nextIndex + 1}/${stops.length}.`,
  };
}

/** Page-local layout state: deliberately carries no computation fields. */
export function controlsLayoutPatch(controlsOpen: boolean): { controlsOpen: boolean } {
  return { controlsOpen };
}
