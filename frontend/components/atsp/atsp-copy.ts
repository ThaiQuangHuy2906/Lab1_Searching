import type { Mode, TspMethod } from "@/lib/types";

export const ATSP_METHOD_LABEL: Record<TspMethod, string> = {
  held_karp: "Held-Karp",
  nn_2opt: "NN + 2-opt/Or-opt",
  sa: "Simulated Annealing",
};

export const ATSP_MODE_LABEL: Record<Mode, string> = {
  balanced: "Cân bằng",
  time: "Nhanh nhất",
  distance: "Ngắn nhất",
};

export const ATSP_METHOD_EXPLANATION: Record<TspMethod, string> = {
  held_karp:
    "Held-Karp dùng quy hoạch động để đối chiếu các tập điểm đã ghé và điểm dừng cuối. Khi kết quả có đảm bảo tối ưu, thứ tự trả về có tổng chi phí nhỏ nhất cho đúng tập điểm và tiêu chí đang chọn.",
  nn_2opt:
    "NN dựng thứ tự ban đầu từ điểm gần nhất, sau đó 2-opt đảo đoạn và Or-opt di chuyển đoạn dài 1–3 để cải thiện. Đây là nghiệm xấp xỉ: có thể rất tốt nhưng không phải bằng chứng tối ưu toàn cục.",
  sa:
    "Simulated Annealing thử các thay đổi thứ tự và có thể tạm chấp nhận bước kém hơn để thoát nghiệm cục bộ. Kết quả là nghiệm xấp xỉ, không phải chứng minh tối ưu toàn cục.",
};
