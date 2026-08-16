# Final report — file index

Đây là bản gom lại các file report đang nằm rải rác trong repo (root,
`docs/`, `report/`) theo đúng 10 mục a–j của đề. **Đây là bản copy** — file
gốc vẫn còn nguyên ở vị trí cũ, không có gì bị xoá hay di chuyển.

## Bản đồ mục a–j → file

| Mục | Nội dung | File trong `final/` | Nguồn gốc |
|---|---|---|---|
| **a. Group Introduction** | Thông tin nhóm, MSSV, đóng góp, tự chấm rubric | nằm trong `00_master_outline_a-j.md` §a (chưa có file tách riêng) | `report/BaoCao-Khung.md` |
| **b. Problem Context** | Bối cảnh, vấn đề thực tế, ý nghĩa | `b_problem_context.md` | `report/problem_context_improved.md` |
| **c. Problem Modeling** | Đồ thị, node/edge/state, cost function | `c_d_problem_modeling_and_dataset.md` §c | `report_dataset_graphmodel.md` |
| **d. Dataset** | Nguồn dữ liệu, địa điểm, giả định | cùng file trên, §d + `d_dataset_description.txt` | `report_dataset_graphmodel.md` + `2 - Data.txt` |
| **e. Algorithm Principles** | Lý thuyết 9 thuật toán 2 điểm | `e_g_two_point_algorithms_theory_and_comparison.md` (Chương 5) | `report/2point.md` |
| | Lý thuyết 3 thuật toán ATSP | `e_atsp_algorithms_theory.md` | `report_algorithm.md` |
| | Chứng minh heuristic admissible/consistent | `e_heuristic_proof.md` | `docs/HEURISTIC-PROOF.md` |
| **f. Program Flow** | Flowchart, module, GUI↔thuật toán | `f_program_flow.md` | `PROGRAM-FLOW.md` (root) |
| **g. Algorithm Comparison** | Bảng lý thuyết + thực nghiệm 9 thuật toán | cùng file với e (Chương 7, trong `e_g_two_point_algorithms_theory_and_comparison.md`) | `report/2point.md` |
| **h. Multi-location Optimization** | Bài toán đa điểm, so sánh trước/sau tối ưu | `h_multi_location_optimization.md` (+ bản Anh `_en.md`) | `report/Report_3ATSP_Final.md` / `Report_3ATSP_EN.md` |
| **i. Program Instructions** | Cài đặt, hướng dẫn GUI, ví dụ, screenshot | `i_program_instructions.md` + `.docx` | `report_program_instructions.*` (root) |
| **j. Limitations & Future Work** | Khó khăn, hạn chế, hướng phát triển | `j_limitations_future_work.md` | `report/report_limitations_future_work_improved.md` |

`00_master_outline_a-j.md` là khung gốc (từ `report/BaoCao-Khung.md`) — có
đủ marker `[ĐIỀN]`/`[SỐ LIỆU]`/`[HÌNH]`/`[SCREENSHOT]`, bảng thành viên,
bảng tự chấm rubric 100 điểm. **File này chưa được cập nhật để trỏ tới các
file b/c/d/e/h/j đã viết riêng ở trên** — cần nhóm tự ghép nội dung từ các
file trong bảng trên vào đúng mục của khung, hoặc thay khung bằng cách nối
các file theo đúng thứ tự a→j.

## ⚠️ Chỗ có 2 bản — cần nhóm chọn 1

- **Mục b**: `report_dataset_graphmodel.md` (file gốc) cũng có sẵn 1 bản
  draft "b. Problem Context" ở đầu file — có thể là bản cũ hơn
  `problem_context_improved.md` (tên "_improved" gợi ý bản sau mới hơn).
  Nên dùng bản trong `final/b_problem_context.md`, kiểm tra không trùng ý
  với phần "b." ở đầu `c_d_problem_modeling_and_dataset.md`.
- **Mục j**: tương tự — `report_dataset_graphmodel.md` cũng có sẵn 1 bản
  "j. Limitations and Future Work" ở cuối file (§j.1–j.3), khả năng là bản
  cũ hơn `report_limitations_future_work_improved.md` (đã dùng trong
  `final/j_limitations_future_work.md`, có thêm §10.4 thứ tự ưu tiên).

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

## Còn thiếu hẳn (chưa có file nào)

- **Mục a — Group Introduction** dạng file riêng (hiện chỉ có trong khung
  `00_master_outline_a-j.md`, và nhiều vai trò/% đóng góp còn ghi
  "CHƯA CHỐT").
