# results/ — kết quả 7 thí nghiệm benchmark

> ⚠️ **SỐ TẠM:** toàn bộ CSV/PNG/GeoJSON trong thư mục này thuộc lượt chạy
> **congestion synthetic** ngày 2026-07-26 (seed 42, `traffic_profiles_*.json`
> có `meta.source = "synthetic"`). Lưu ý thêm: dữ liệu graph đã được rebuild
> ngày 2026-07-27 (fix penalty theo vùng — KIEMTOAN L1-01) nên các file ở đây
> đang là số của lượt CŨ. Data refresh 2026-08-03 đã dùng đủ bốn snapshot đại
> diện lấy trên hai ngày thứ Hai, tạo profile `tomtom+synthetic` và rebuild
> `G_demo`; benchmark/hiệu chuẩn γ/generator cuối vẫn chưa được chạy. Các
> artifact trong thư mục này chỉ được thay TRỌN MỘT LƯỢT sau khi code ổn định
> và có ủy quyền riêng.
> UI/documentation refresh 2026-08-08 không chạy benchmark và không sửa bất kỳ
> CSV/PNG/GeoJSON kết quả nào trong thư mục này.
> Thay đổi contract cùng ngày đã loại lựa chọn route `dijkstra` độc lập. Vì chưa
> được phép chạy lại benchmark, CSV/PNG cũ vẫn có dòng/series legacy này; API và
> trang benchmark lọc nó khỏi giao diện. Lượt tái sinh cuối phải tạo exp1 theo
> UCS/A* (800 ca) và exp3 theo 9 thuật toán (3.600 dòng).
>
> **Tái sinh (chạy MỘT MÌNH, ~7 phút, không tiến trình song song):**
> từ `backend/` chạy `..\.venv\Scripts\python.exe -m app.benchmark` (PowerShell)
> hoặc `../.venv/Scripts/python.exe -m app.benchmark` (Git Bash).
> Sau đó từ repo root hiệu chuẩn γ từ raw TomTom:
> `.venv\Scripts\python.exe scripts\05_calibrate_gamma.py`
> → `results/gamma_calibration.csv`; cuối cùng chạy
> `.venv\Scripts\python.exe scripts\gen_teaching_doc.py` và đồng bộ số/banner theo
> Phụ lục A của `docs/KIEMTOAN.md`. Chỉ thực hiện trọn chuỗi này khi được ủy quyền.

| File | Thí nghiệm |
|---|---|
| exp1_correctness.csv | Đối chứng UCS/A* vs NetworkX (800 ca sau lượt tái sinh cuối) |
| exp2_admissibility.csv | Kiểm h ≤ h* trên mọi node reachable |
| exp3_benchmark.csv | 9 thuật toán × 200 cặp × 2 khung giờ trên G_real sau lượt tái sinh cuối |
| exp4_congestion.csv (+exp4_examples/) | % cặp đổi tuyến 07:30 vs 22:00 |
| exp5_gamma.csv | Độ nhạy γ ∈ [0; 3] |
| exp6_pairs.json (+exp6_routes/) | 5 cặp đối chứng Google Maps |
| exp7_tsp.csv | Held-Karp vs NN+2-opt vs SA, kịch bản 10 điểm |
| figs/ | PNG chèn báo cáo (bảng màu light, nền trắng) |
| gamma_calibration.csv | (sau TomTom) γ̂ ước lượng độc lập — scripts/05 |
