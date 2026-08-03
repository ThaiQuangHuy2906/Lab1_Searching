import type { Algorithm } from "./types";

export const ALGORITHM_ORDER: readonly Algorithm[] = [
  "bfs", "dfs", "iddfs", "ucs", "dijkstra",
  "astar", "greedy", "bidijkstra", "idastar", "beam",
];

export const ALGORITHM_GROUPS: ReadonlyArray<{
  label: string;
  cls: string;
  algos: readonly Algorithm[];
}> = [
  {
    label: "Đảm bảo tối ưu",
    cls: "text-start",
    algos: ["ucs", "dijkstra", "astar", "bidijkstra"],
  },
  {
    label: "Bảo đảm trong biên ε",
    cls: "text-algo-frontier",
    algos: ["idastar"],
  },
  {
    label: "Không đảm bảo — đánh đổi",
    cls: "text-algo-path",
    algos: ["bfs", "dfs", "iddfs", "greedy", "beam"],
  },
];

export function chooseCompareAlgorithm(
  primary: Algorithm | null | undefined,
  preferred: Algorithm,
): Algorithm {
  if (!primary || preferred !== primary) return preferred;
  const alternative = ALGORITHM_ORDER.find((algorithm) => algorithm !== primary);
  if (!alternative) throw new Error("Không có thuật toán thay thế để so sánh.");
  return alternative;
}

export function routeGuaranteeLabel(
  algorithm: Algorithm,
  guaranteed: boolean,
  epsilon: number | null | undefined,
  unit: string,
): string {
  if (!guaranteed) return "Không đảm bảo tối ưu";
  if (algorithm !== "idastar") return "Đảm bảo tối ưu";
  const value = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 10,
  }).format(epsilon ?? 5);
  return `Tối ưu trong ε = ${value} ${unit}`;
}
