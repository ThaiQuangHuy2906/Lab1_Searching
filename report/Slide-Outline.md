# OUTLINE SLIDE THUYẾT TRÌNH — 14 slide (map thẳng vào rubric)

> ⚠️ **SỐ TẠM (2026-07-27):** mọi con số exp1–exp7 trong tài liệu này lấy từ lượt chạy
> congestion **synthetic** — và CẢ CÁC SỐ VÍ DỤ CHẠY TAY (446/341/+31%/+104 s/ma trận
> 304/120/beam 415…) cũng đổi theo profiles, không riêng số benchmark. Sau khi có
> TomTom, phần data đã được làm mới theo `03b real → 04 → 03b demo → validate_data`;
> benchmark, hiệu chuẩn γ và `scripts/gen_teaching_doc.py` vẫn chờ lượt cuối.
> Chỉ thay số theo Phụ lục A của `docs/KIEMTOAN.md` sau lượt đó rồi mới nộp.
>
> **Tiến độ:** raw TomTom đủ 4/4 snapshot đại diện trên hai ngày thứ Hai;
> profile hiện là `tomtom+synthetic`, `G_demo` là 51/298; raw GraphML/TomTom/cache
> hiện được Git track dưới `data/raw/`. Đây vẫn là outline,
> chưa phải file PPTX/PDF. Phải thay số, điền danh tính và chèn hình/screenshot
> thật trước khi xuất bản nộp.

> Mỗi slide: tối đa 3 bullet nội dung + ghi chú **"Nói gì trong 45–60 s"**.
> Quy ước hình: screenshot GUI ở chế độ TỐI (DESIGN.md §1); biểu đồ lấy từ `results/figs/`.

---

**Slide 1 — Tiêu đề**
- Tên đề tài: *Tìm đường tối ưu cho shipper giao hàng đa điểm tại TP.HCM*
- Nhóm [ĐIỀN] — 5 thành viên + vai trò một dòng
- Ảnh nền: screenshot bản đồ dark + lớp ùn tắc (cảnh đẹp nhất của app)
> 🗣 45s: một câu vấn đề ("giờ cao điểm, tuyến ngắn nhất không phải tuyến nhanh nhất") + một câu sản phẩm ("web app 10 thuật toán tìm kiếm + 3 thuật toán TSP trên topology dẫn xuất từ snapshot OSM khu trung tâm").

**Slide 2 — Bối cảnh & bài toán** *(rubric: VN context 10đ)*
- Shipper TP.HCM: ùn tắc theo giờ, 1 433/4 699 cạnh MỘT CHIỀU, ngập + lô cốt
- 2 bài toán đề yêu cầu: tìm đường 2 điểm + tối ưu thứ tự nhiều điểm giao
- Vì sao chọn kịch bản shipper: chứa cả hai bài toán một cách tự nhiên
> 🗣 60s: kể 1 tình huống cụ thể (đơn Chợ Bến Thành → Bitexco: có đường trực tiếp nhưng MỘT CHIỀU ngược — chiều đi phải vòng, tuyến vòng ít cạnh nhất lại kẹt).

**Slide 3 — Mô hình hoá + hàm chi phí** *(rubric: modeling 15đ)*
- Đồ thị CÓ HƯỚNG; cạnh mang length/speed/congestion(4 khung giờ)/risk 0-1
- `w = t_free·f_cong + penalty` — QUY HẾT VỀ GIÂY (điểm khác công thức mẫu của đề)
- γ=1,5 là HẰNG SỐ THIẾT KẾ (kẹt cứng mức 5 ⇒ thời gian ×2,5 lúc thoáng); exp5 là PHÂN TÍCH ĐỘ NHẠY — chênh cả dải γ∈[0;3] chỉ ~2,6% ⇒ kết luận ít nhạy với lựa chọn γ
> 🗣 60s: nhấn lý do "cùng đơn vị mới cộng có nghĩa"; mỗi lượt băng qua vùng ngập = +60 s
> (flag tại cạnh ĐI VÀO vùng — trả một lần mỗi lượt, không cộng dồn theo đoạn OSM).

**Slide 4 — Dữ liệu 2 tầng** *(rubric: dataset trong 15đ modeling)*
- G_real: 2 118 nút / 4 699 cạnh từ OSM (OSMnx v2, bbox trung tâm) — để benchmark
- G_demo: 51 POI do nhóm curate / 298 cạnh co kế thừa chiều dài/hướng corridor G_real, không lưu polyline (mọi cặp ≤1,5× thời gian G_real, ≤1,8× distance, ≤1,5× balanced ở 4 khung giờ) — để giảng + demo
- Congestion: `tomtom+synthetic` — TomTom trên 635/4 699 cạnh G_real mỗi slot, phần còn lại fallback seed 42; demo OFFLINE 100%
- Hình: `data/gdemo_preview.png`
> 🗣 45s: vì sao 2 tầng (một để NHÌN, một để ĐO); mọi thứ tái lập được.

**Slide 5 — Thuật toán vô hướng: BFS/DFS/IDDFS + UCS** *(rubric: 4 bắt buộc 20đ)*
- Bảng chạy tay BFS trên đồ thị 7 node thật (GIAI-THICH-THUAT-TOAN §1)
- BẪY ngay bài chính BT→BX: BFS chọn tuyến ít cạnh ĐẮT (446 s) thay vì tuyến tối ưu (341 s) — +31%
- UCS: lan theo CHI PHÍ → tối ưu (khớp NetworkX 1200/1200 — exp1)
> 🗣 60s: đứng ở phản ví dụ — "ít cạnh nhất ≠ rẻ nhất" là lý do cần thuật toán có trọng số.

**Slide 6 — A\* và heuristic** *(rubric: 20đ + heuristic design)*
- h = haversine/v_max — CHỨNG MINH admissible + consistent (Bổ đề đường-chim-bay)
- Bảng chạy tay A*: bước 1 tie-break f bằng nhau → chọn h nhỏ (đúng luật nhóm)
- Kiểm thực nghiệm: 0 vi phạm h ≤ h* trên 21 170 điểm; scatter `admissibility_scatter.png`
> 🗣 60s: kể bài học làm tròn ~3 cm suýt phá admissible (test bắt được) — điểm cộng trưởng thành.

**Slide 7 — So sánh trực quan trên GUI** *(rubric: GUI 10đ)*
- [SCREENSHOT: animation A* — frontier cyan, expanded violet, node trắng pulse]
- Timeline trình phát + bảng g/h/f đồng bộ 2 chiều — công cụ GIẢNG thuật toán
- [SCREENSHOT: Dijkstra hai chiều 2 màu lan từ 2 phía]
> 🗣 45s: demo tại chỗ nếu được phép, không thì chiếu 2 hình này.

**Slide 8 — Thuật toán bổ sung** *(rubric: additional 10đ)*
- Nhóm làm 6 (đề cần ≥2): Dijkstra, Greedy, BiDijkstra, IDA* (ε=5 m ở distance,
  5 s ở time/balanced; guarantee chỉ khi chưa chạm cap 1.000 vòng), Beam, IDDFS
- Greedy: expand ít nhất (62) nhưng gap 60,9% — "linh cảm" phản chủ
- Beam k=50: nhanh nhưng 1,5% ca KHÔNG tìm thấy — incomplete bằng số
> 🗣 60s: mỗi thuật toán một câu "đánh đổi cái gì lấy cái gì".

**Slide 9 — TSP đa điểm** *(rubric: multi-location 10đ)*
- ATSP vì ma trận BẤT đối xứng (một chiều): BT→SC 304 s nhưng SC→BT 120 s
- Held-Karp = tối ưu tuyệt đối (≤15 điểm); NN+2-opt, SA = xấp xỉ
- Kịch bản 10 điểm: tiết kiệm **53,6%** so thứ tự nhập; hình `exp7_tsp_map.png`
> 🗣 60s: nói rõ cái nào đảm bảo tối ưu, cái nào không — đề yêu cầu tuyên bố điều này.

**Slide 10 — Kiến trúc hệ thống**
- Pipeline offline → data JSON → FastAPI (6 endpoint, hợp đồng `trace` duy nhất) → Next.js
- Mọi thuật toán trả CÙNG cấu trúc trace → 1 animation engine dùng cho cả 10
- Thuật toán tự cài thuần Python + heapq; NetworkX CHỈ làm baseline test
> 🗣 45s: nhấn "hợp đồng dữ liệu chốt trước khi code" — cách 5 người làm song song không giẫm chân.

**Slide 11 — Demo GUI** *(demo live hoặc video 60–90 s)*
- Kịch bản: chọn Đi/Đến → A* → play timeline → tab Giải thích → multiroute
- Dự phòng: chế độ Offline (mất wifi vẫn demo) + video quay sẵn
> 🗣 chạy demo theo checklist mục 11 Video-KichBan.md.

**Slide 12 — Benchmark** *(rubric: comparison trong 20đ + report 10đ)*
- 10 thuật toán × 200 cặp × 2 khung giờ trên G_real (biểu đồ expand + runtime, thang log)
- A* tiết kiệm 37% expand so Dijkstra; nhóm tối ưu gap = 0 (đúng lý thuyết)
- Đúng đắn: 1 200/1 200 khớp NetworkX sai số ≤ 1e-6
> 🗣 60s: đọc biểu đồ log — "cột cao nhất là cái giá của tiết kiệm bộ nhớ (IDA*/IDDFS)".

**Slide 13 — Ùn tắc đổi tuyến + giải thích lộ trình** *(rubric: explanation 10đ)*
- 83,5% cặp đổi tuyến giữa 07:30 và 22:00 (exp4)
- [SCREENSHOT: tab Giải thích — summary tiếng Việt + tuyến thay thế + vì sao bị loại]
- Đối chứng Google Maps: 5 cặp (exp6) — trùng/khác và lý do
> 🗣 60s: đọc to 1 câu giải thích thật của app — cho giảng viên thấy máy "nói được tiếng người".

**Slide 14 — Hạn chế & hướng phát triển**
- Trung thực: heuristic lỏng (h/h*≈0,57), TomTom chỉ phủ mẫu và còn synthetic fallback, chưa turn-penalty, GUI chưa mobile
- Hướng phát triển: TomTom real-time, landmark ALT, VRP nhiều shipper
- Cảm ơn + Q&A
> 🗣 30s + để thời gian cho hỏi đáp.
