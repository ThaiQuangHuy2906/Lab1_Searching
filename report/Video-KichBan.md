# KỊCH BẢN VIDEO DEMO — 18–25 phút (bám đề mục 4.10)

> ⚠️ **SỐ TẠM (2026-07-27):** mọi con số exp1–exp7 trong tài liệu này lấy từ lượt chạy
> congestion **synthetic** — và CẢ CÁC SỐ VÍ DỤ CHẠY TAY (446/341/+31%/+104 s/ma trận
> 304/120/beam 415…) cũng đổi theo profiles, không riêng số benchmark. Sau khi có
> TomTom, phần data đã được làm mới theo `03b real → 04 → 03b demo → validate_data`;
> benchmark, hiệu chuẩn γ và `scripts/gen_teaching_doc.py` vẫn chờ lượt cuối.
> Chỉ thay số theo Phụ lục A của `docs/KIEMTOAN.md` sau lượt đó rồi mới nộp.
> Contract route ngày 2026-08-08 đã loại `dijkstra` độc lập; kịch bản hiện theo 9
> thuật toán và vẫn giữ Bidirectional Dijkstra. CSV/biểu đồ cũ còn series legacy.
>
> **Tiến độ:** raw TomTom đủ 4/4 snapshot đại diện trên hai ngày thứ Hai;
> profile hiện là `tomtom+synthetic`, `G_demo` là 51/298; raw GraphML/TomTom/cache
> hiện được Git track dưới `data/raw/`. Đây là kịch bản, chưa
> có video hoặc file link nộp. Chỉ quay sau benchmark/generator cuối, restart
> service và QA trình duyệt ở đúng độ phân giải quay.

> **Chuẩn bị trước khi quay:** backend + frontend chạy sẵn (localhost:8000/3000, chế độ
> TỐI); mở sẵn `docs/GIAI-THICH-THUAT-TOAN.md` để dẫn bảng; OBS quay 1920×1080; mic rõ.
> Phân công nội dung đã xác nhận: Nguyễn Văn Minh chuẩn bị 9 thuật toán route;
> Thái Quang Huy chuẩn bị 3 ATSP. Phân công này không khóa người nói trong video:
> người trình bày từng đoạn vẫn chưa chốt và MỖI THÀNH VIÊN phải giảng ít nhất
> một thuật toán bằng lời mình.
>
> ✅ **Trước khi nộp: dán link video vào `2 - Video.txt` và MỞ THỬ Ở TAB ẨN DANH**
> (yêu cầu phương án §9 — video không xem được = mất trọn 5 điểm video).

## 0:00 – 2:00 · Mở đầu & demo chớp nhoáng

- (0:00) Màn hình tiêu đề: tên đề tài + **GroupID 2** + 5 thành viên. 1 câu vấn đề: *"Ở TP.HCM giờ cao điểm,
  đường ngắn nhất hiếm khi là đường nhanh nhất."*
- (0:30) Vào thẳng app: chọn **Bưu điện Thành phố → Chợ Bến Thành**, A*, 07:30,
  bấm Chạy → play animation 2× → tuyến vàng hiện + đọc to 1 câu trong tab Giải thích.
- (1:30) Giới thiệu cấu trúc video: "giảng 9 thuật toán trên ví dụ tự thiết kế →
  demo đầy đủ → benchmark".

## 2:00 – 11:00 · Giảng thuật toán trên ví dụ TỰ THIẾT KẾ (đề 4.10a)

> Dùng đồ thị 7 node khu Bến Thành (GIAI-THICH-THUAT-TOAN §0) — chiếu bảng cạnh + bảng
> h MỘT LẦN ở 2:00 rồi giảng từng thuật toán trên đúng đồ thị đó. Với MỖI thuật toán
> phải chỉ rõ trên màn hình (checklist đề): điểm đầu/cuối · thứ tự expand · frontier/
> open list · giá trị cost (UCS/A*) · giá trị heuristic (A*/Greedy) · cách
> suy ra tuyến cuối. Backend/UI hiện hỗ trợ induced view `teach_7`; preset này có
> đúng 7 node/24 cạnh của generator. Chỉ quay và tuyên bố parity khi UI chọn đúng
> 7 node, cùng slot/mode/start/goal/parameter với tài liệu generated; full G_demo
> hoặc request khác vẫn là bằng chứng khác, không được gọi là khớp từng bước.

- (2:00) **Đồ thị ví dụ** — 7 POI, 24 cạnh induced của G_demo, chỉ vào cạnh một chiều
  BX→BT (Công trường Quách Thị Trang) + bảng h (haversine/v_max). Nêu bài toán chính
  BT → BX: "có đường trực tiếp nhưng chỉ chiều VỀ — chiều đi phải vòng".
- (3:00) **BFS**: dùng bảng 7 node BT→BX; chạy GUI bước-một trên đúng
  `teach_7` và cùng request settings sau pre-flight parity. BFS chọn tuyến ít cạnh
  nhưng đắt (446 s) vs tối ưu (341 s) — đắt hơn +31%; chốt "ít cạnh ≠ rẻ".
- (4:00) **DFS + IDDFS**: DFS lao sâu (chỉ thứ tự expand); IDDFS cột
  "giới hạn d" tăng dần, số expand CỘNG DỒN — cái giá của chạy lại; chỉ complete
  nếu lời giải không sâu hơn cap 100.
- (5:00) **UCS**: chỉ cột g tăng dần theo hàng đợi ưu tiên; goal-test khi POP.
- (5:45) **A\***: chỉ vào cột f — node hướng về đích có f nhỏ được
  ưu tiên; nêu luật tie-break khi hai node cùng f (chọn h nhỏ hơn); so số expand A*
  với UCS bằng exp3 sau lượt benchmark cuối.
  Nói 1 câu về admissible: "h là thời gian bay thẳng ở tốc độ lớn nhất của đồ thị (45 km/h) — không bao giờ đoán quá."
- (7:00) **Greedy**: cùng cặp BT→BX — lao theo h "nhìn gần đích" nên sập
  cùng bẫy với BFS (+104 s, +31%); đối chiếu với A* cũng dùng h nhưng CÓ g nên không bị.
- (7:45) **Dijkstra hai chiều**: GUI 2 màu lan từ 2 phía (cột "Phía" trong
  bảng); nêu chiều ngược chạy trên đồ thị ĐẢO CẠNH vì một chiều; luật dừng
  top_xuôi + top_ngược ≥ μ.
- (8:45) **IDA\***: ngưỡng f nới dần ε = 5 m ở distance, 5 s ở
  time/balanced; guarantee C*+ε chỉ khi chưa chạm cap 1.000 vòng. Không gọi
  implementation hiện hành là O(bd): nó giữ `best_g`, `parent`, `h_of` và
  explicit stack đang chờ (O(V+Q)).
- (9:30) **Beam**: chạy k=2 rồi k=5 trên GUI; nói "incomplete" +
  số benchmark: k=50 vẫn lỡ 1,5% ca trên G_real.
- (10:15) **Ba thuật toán ATSP mini**: chỉ tính bất đối xứng trên
  ma trận 4×4, rồi phân biệt Held–Karp tối ưu tuyệt đối, NN + 2-opt/Or-opt là
  local-search heuristic và SA là metaheuristic có seed; hẹn demo 10 điểm ở phần sau.

## 11:00 – 20:00 · Demo sản phẩm đầy đủ (đề 4.10b)

- (11:00) **Tổng quan giao diện** [CHƯA CHỐT]: 3 vùng; panel trái theo nhóm; legend;
  đổi Sáng/Tối; công tắc **Lớp ùn tắc** 07:30 → chỉ thang màu 1→5.
- (12:00) **Route 2 điểm — test case 1** (07:30, Cân bằng, A*): ĐH KHTN → Thảo Cầm Viên.
  Play → pause giữa chừng chỉ frontier/expanded → tuyến + Số liệu (badge "Đảm bảo tối ưu").
- (13:30) **Đổi khung giờ — test case 2**: cùng OD lúc 22:00 → TUYẾN ĐỔI (nhắc exp4:
  83,5% cặp đổi tuyến). Đọc to phần Giải thích: breakdown ùn tắc và trade-off với
  tuyến tham chiếu UCS hậu kiểm; không nói thuật toán chính đã xét/bị loại full route.
- (15:00) **Đổi tiêu chí — test case 3**: cùng OD "Ngắn nhất" vs "Cân bằng" — objective
  đổi giữa quãng đường và chi phí cân bằng; UI luôn trình bày km/phút, không đọc raw mét/giây.
- (15:45) **So sánh nhiều thuật toán**: chuyển `Chế độ chạy` sang `So sánh nhiều`,
  chọn A*/UCS/Greedy cùng OD → ba map final-only cùng kích thước; zoom một map để
  chứng minh camera độc lập rồi đọc bảng N-way về objective/expand/guarantee.
- (16:20) **Thử nghiệm một đoạn đường**: mở tab `Thử nghiệm`, dùng `Chọn nhanh`,
  chọn một cạnh trên map rồi cho thấy bảng `Thông số/Gốc/Đang thử`; khôi phục đoạn
  để chứng minh thay đổi chỉ có hiệu lực trong phiên/request hiện tại.
- (17:00) **G_real**: đổi đồ thị, click chọn 2 điểm trên bản đồ 2 118 nút, chạy
  Dijkstra hai chiều → nói "2 118 nút" và ĐỌC ĐÚNG runtime đang hiện trên màn
  hình; không đọc số từ CSV benchmark cũ.
- (17:45) **Multiroute 9 điểm**: thêm 9 điểm giao (chế độ chọn trên bản đồ
  GIỮ NGUYÊN sau mỗi click — bấm liên tục 9 nút giao, banner đếm n/15; app tự BỎ điểm
  Đến kèm toast khi thêm điểm đầu tiên — đó là hành vi đúng, cứ nói "tour chỉ cần điểm
  Đi + các điểm giao") → Held-Karp → thứ tự đánh số trên bản đồ + card "Tiết kiệm";
  đọc đúng tỷ lệ đang hiện rồi lần lượt đổi sang NN+2-opt/Or-opt và SA, so kết quả
  nhưng không gọi hai heuristic này là tối ưu toàn cục.
- (19:00) **Chế độ Offline**: tắt wifi thật trên màn hình → bật công tắc → app vẫn
  chạy đủ (điểm cộng độ bền demo).

## 20:00 – 23:00 · Benchmark & phân tích

- (20:00) Trang /benchmark: 2 biểu đồ cột (log) — đọc: nhóm tối ưu ~1 200 expand,
  A*/BiDijkstra ~750, IDA*/IDDFS hàng trăm nghìn (cái giá tiết kiệm bộ nhớ);
  số nói to phải khớp số trên màn hình cùng khung hình.
- (21:00) Chiếu `admissibility_scatter.png` (0 vi phạm/21 170 điểm) + kể bài học
  làm tròn 3 cm suýt phá admissible (test tự bắt được).
- (22:00) `exp5_gamma_curves.png`: PHÂN TÍCH ĐỘ NHẠY γ — nói rõ "γ=1,5 là hằng số
  thiết kế; đường cong cho thấy kết quả chênh cả dải γ∈[0;3] chỉ ~2,6%, tức kết luận
  ít nhạy với lựa chọn γ" (KHÔNG nói "chọn 1,5 vì cực tiểu tại 1,5" — thước đo exp5
  tự dùng γ=1,5, lập luận đó là vòng); 1 câu về exp1
  (UCS/A* khớp NetworkX; điền số từ exp1 mới, mục tiêu 800 ca).

## 23:00 – 25:00 · Hạn chế & kết

- (23:00) 3 hạn chế trung thực (TomTom chỉ phủ mẫu và còn synthetic fallback;
  heuristic lỏng h/h*≈0,57; chưa turn-penalty) + 2 hướng phát triển (TomTom
  real-time, ALT).
- (24:00) Chốt: 9 thuật toán một hợp đồng trace, 3 phương pháp TSP, topology
  G_real dẫn xuất từ OSM và 51 POI G_demo do nhóm curate rồi snap; profile traffic
  hiện là `tomtom+synthetic` từ bốn snapshot
  đại diện trên hai ngày thứ Hai; demo route engine chạy offline. Cảm ơn.

---

## Checklist sau khi quay (tick từng dòng)

- [ ] Đủ checklist đề 4.10a cho TỪNG thuật toán (đầu/cuối, thứ tự expand, frontier, cost, heuristic, tuyến cuối)
- [ ] Đủ 4.10b: chọn điểm & thuật toán · route 2 điểm · multiroute · ≥3 test case khác điều kiện · so sánh thuật toán · giải thích tuyến
- [ ] Thời lượng 18–25 phút; tiếng rõ; con trỏ chuột không che số
- [ ] Link video dán vào `2 - Video.txt` — **đã mở thử ở tab ẩn danh** ✅
