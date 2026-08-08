import type { Algorithm, AppliedScenario, GraphView, Mode } from "./types";

export const MODE_PRESENTATION: Record<Mode, {
  label: string;
  unit: "km" | "phút";
}> = {
  balanced: {
    label: "Cân bằng",
    unit: "phút",
  },
  time: {
    label: "Nhanh nhất",
    unit: "phút",
  },
  distance: {
    label: "Ngắn nhất",
    unit: "km",
  },
};

export function graphViewLabel(view: GraphView): string {
  return view === "full" ? "Đồ thị đầy đủ" : `Đồ thị minh hoạ ${view.replace("teach_", "")}`;
}

export function scenarioProvenanceLabel(provenance: AppliedScenario["provenance"]): string {
  switch (provenance) {
    case "base": return "dữ liệu gốc";
    case "graph_view": return "đồ thị minh hoạ";
    case "sandbox_override": return "điều chỉnh thử nghiệm";
  }
}

export const ALGORITHM_SUMMARY: Record<Algorithm, string> = {
  bfs: "Tìm theo lớp; không tối ưu theo chi phí cạnh có trọng số.",
  dfs: "Đi sâu trước; không tối ưu theo chi phí và có thể đi vòng.",
  iddfs: "Lặp giới hạn độ sâu; không tối ưu theo chi phí cạnh có trọng số.",
  ucs: "Mở điểm có tổng chi phí nhỏ nhất; đảm bảo tối ưu khi trọng số không âm.",
  dijkstra: "Tìm đường chi phí nhỏ nhất; đảm bảo tối ưu khi trọng số không âm.",
  astar: "Dùng g + h với heuristic nhất quán; đảm bảo tối ưu theo hợp đồng dữ liệu.",
  greedy: "Ưu tiên heuristic gần đích; nhanh nhưng không đảm bảo tối ưu.",
  bidijkstra: "Tìm từ hai đầu; đảm bảo tối ưu khi trọng số không âm.",
  idastar: "Dùng ngưỡng f tăng dần; nghiệm nằm trong biên C* + ε đã chọn.",
  beam: "Giữ k ứng viên mỗi lớp; giảm công sức tìm kiếm nhưng không đảm bảo tối ưu.",
};
