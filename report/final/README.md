# Final report — file index

Đây là thư mục tập hợp các bản thảo report theo đúng 10 mục a–j của đề. Các
tài liệu nguồn ở root, `docs/` và `report/` vẫn được giữ để đối chiếu; các
file trong `final/` là bản đang được biên tập để ghép thành báo cáo cuối.

## Bản đồ mục a–j → file

| Mục | Nội dung | File trong `final/` | Nguồn gốc |
|---|---|---|---|
| **a. Group Introduction** | Thông tin nhóm, MSSV, đóng góp, tự chấm rubric | `a_group_introduction.md` | `report/group_introduction.md` + rubric của đề |
| **b. Problem Context** | Bối cảnh, vấn đề thực tế, ý nghĩa | `b_problem_context.md` | `report/problem_context_improved.md` |
| **c. Problem Modeling** | Đồ thị, node/edge/state, cost function | `c_problem_modeling.md` | `report_dataset_graphmodel.md` |
| **d. Dataset** | Nguồn dữ liệu, địa điểm, giả định | `d_dataset.md` + `d_dataset_description.txt` (tài liệu phụ) | `report_dataset_graphmodel.md` + `2 - Data.txt` |
| **e. Algorithm Principles** | Lý thuyết 9 thuật toán 2 điểm | `e_g_two_point_algorithms_theory_and_comparison.md` (Chương 5) | `report/2point.md` |
| | Lý thuyết 3 thuật toán ATSP | `e_atsp_algorithms_theory.md` | `report_algorithm.md` |
| | Chứng minh heuristic admissible/consistent | `e_heuristic_proof.md` | `docs/HEURISTIC-PROOF.md` |
| **f. Program Flow** | Flowchart, module, GUI↔thuật toán | `f_program_flow.md` | `PROGRAM-FLOW.md` (root) |
| **g. Algorithm Comparison** | Bảng lý thuyết + thực nghiệm 9 thuật toán | cùng file với e (Chương 7, trong `e_g_two_point_algorithms_theory_and_comparison.md`) | `report/2point.md` |
| **h. Multi-location Optimization** | Bài toán đa điểm, so sánh trước/sau tối ưu | `h_multi_location_optimization.md` (+ bản Anh `_en.md`) | `report/Report_3ATSP_Final.md` / `Report_3ATSP_EN.md` |
| **i. Program Instructions** | Cài đặt, hướng dẫn GUI, ví dụ, screenshot | `i_program_instructions.md` + `.docx` | `report_program_instructions.*` (root) |
| **j. Limitations & Future Work** | Khó khăn, hạn chế, hướng phát triển | `j_limitations_future_work.md` | `report/report_limitations_future_work_improved.md` + `report_dataset_graphmodel.md` §j |

`00_master_outline_a-j.md` là khung gốc (từ `report/BaoCao-Khung.md`) và
vẫn chứa các marker biên tập. Khi tạo báo cáo hợp nhất, dùng các file trong
bảng trên theo thứ tự a→j thay cho nội dung placeholder của khung.

## Các nguồn trùng nội dung đã được đối chiếu

- **Mục b**: `report_dataset_graphmodel.md` và
  `problem_context_improved.md` là các nguồn cũ. Bản được chọn để ghép là
  `final/b_problem_context.md`.
- **Mục j**: nội dung kỹ thuật từ `report_dataset_graphmodel.md` đã được
  hợp nhất với bản tổng quan từ
  `report/report_limitations_future_work_improved.md` trong
  `final/j_limitations_future_work.md`.

## Không gom vào đây (chỉ tham khảo, không phải văn report)

- `docs/GIAI-THICH-THUAT-TOAN.md`, `docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md`
  — tài liệu ôn tập/tự học cho buổi bảo vệ (giọng văn không phải report),
  là nguồn `report/2point.md` và `report_algorithm.md` được viết dựa vào.
- `DATA-GRAPH-WEIGHTS-SOURCE-OF-TRUTH.md` — tài liệu đối chiếu nội bộ rất
  dài (98 KB), phục vụ kiểm chứng số liệu cho mục c/d, không phải văn report.
- `results/README.md` + các file CSV trong `results/` — nguồn số liệu thô
  cho bảng thực nghiệm ở mục g (đã được trích một phần vào `e_g_...md`).
- `report/Slide-Outline.md`, `report/Video-KichBan.md` — slide và kịch bản
  video, không thuộc 10 mục a–j.
