# TIENDO.md — Bảng tiến độ theo phase

> **Lưu ý audit 2026-08-08:** đây là nhật ký lịch sử; số test, số cạnh và
> trạng thái ở từng dòng đúng theo thời điểm của phase đó, không phải mốc hiện tại.
> Baseline 2026-07-27, UI-01–UI-04 và FINAL-01 đều là evidence lịch sử.
> Current-state nằm trong `README.md`, `data/DATA.md`, `docs/SCHEMA.md` và phần
> current-state của `docs/CODEX-CODEBASE-MAP.md`; audit fresh 2026-08-08 đạt
> 177 backend/41 frontend tests, validator, TypeScript và production build. Catalog
> hiện hành có 9 route; các dòng 10 thuật toán/Dijkstra bên dưới là lịch sử phase. Các con số hiện hành
> vẫn phải được xác nhận lại bằng code/data và lệnh fresh ở lượt sử dụng. Tám
> manual-risk URL đã được review/tích hợp ngày 2026-08-08; mọi dòng TODO lịch sử
> bên dưới không còn là current state.
>
> **Closeout kết quả chính thức 2026-08-11:** chuỗi được ủy quyền
> `benchmark → gamma calibration → teaching generator` đã hoàn tất trên dữ liệu
> hiện hành. Kết quả gồm exp1 800/800, exp2 0/21.170 vi phạm, exp3 3.600 dòng cho
> 9 thuật toán, exp4 149/200 tuyến đổi; provenance/checksum đầy đủ nằm tại
> `results/README.md`. Các dòng Phase 6–7 cũ bên dưới vẫn được giữ nguyên như
> nhật ký lịch sử, không phải số chính thức hiện hành.
>
> Cập nhật cuối mỗi phase (PROMPT-MASTER luật 1). Trạng thái: ⬜ chưa làm · 🔄 đang làm · ✅ xong.

| Phase | Nội dung | Trạng thái | Ghi chú | Commit |
|---|---|---|---|---|
| 0 | Scaffold repo, CLAUDE.md, SCHEMA.md (3 hợp đồng), mock 8 node + test schema | ✅ | 13/13 test pass. **Đang chờ duyệt `docs/SCHEMA.md`** trước khi sang Phase 1. Quyết định đã duyệt: dùng Python 3.14 (máy không có 3.11). Quyết định tự đưa (đã báo): `git init` tại Phase 0; mock đánh dấu rõ chiều một chiều là đơn giản hoá | `phase-0: scaffold repo, data contracts, mock data` |
| 1 | Data pipeline scripts/01→04 + DATA.md (G_real, G_demo, profiles) | ✅ | G_real **2118 node / 4699 cạnh** (trong mục tiêu 2000–6000 → đề xuất GIỮ bbox hiện tại, chờ user chốt). G_demo 50 node / 138 cạnh / 44 oneway từ 51 POI (chờ review danh sách POI + preview PNG). Build không cần API key (synthetic); validate + 20/20 test pass | `phase-1: offline data pipeline` |
| 2 | costs.py + heuristic + search.py (6 thuật toán lõi) + HEURISTIC-PROOF.md | ✅ | 38/38 test: UCS/Dijkstra/A* khớp NetworkX 1e-6 trên **toàn bộ 2 550 cặp G_demo × 12 (mode,slot)** + 50 cặp G_real; consistency kiểm trên từng cạnh. Phát hiện & sửa lỗi làm tròn phá admissible (length ceil 0.1 m, t_free tính exact) — HEURISTIC-PROOF §6b. graph_store.py viết sớm (search cần) | `phase-2: six core search algorithms` |
| 3 | search_advanced.py (4 thuật toán) + tsp.py (Held-Karp, NN+2opt, SA) | ✅ | 21 test mới (59/59 toàn suite): BiDijkstra khớp Dijkstra 1e-6 (150 cặp demo + 20 real); IDA* trong ngưỡng ε=5s và exact với ε→0; Beam k=1 fail sạch / k rộng tìm được; Held-Karp khớp brute-force n=7 (cả 2 chiều return_to_start); NN+2opt & SA không bao giờ thắng Held-Karp; ma trận xác nhận bất đối xứng thật | `phase-3: advanced search + ATSP` |
| 4 | FastAPI main.py, graph_store.py, explain.py | ✅ | uvicorn chạy thật (smoke health/route/multiroute qua HTTP); 19 test API (78/78 toàn suite): đủ 6 endpoint, error envelope §C.7, đủ 10 thuật toán qua /api/route; explanation tiếng Việt số liệu thật + ≥1 alternative khác tuyến, nêu đúng tiêu chí từng thuật toán + gap so tối ưu. G_demo rebuild: cạnh co mang **tên đường thật** (141/141) | `phase-4: FastAPI + Vietnamese explanations` |
| 5 | Frontend Next.js 15 (map, animation, so sánh, multiroute, benchmark) | ✅ | `npm run build` pass, dev server 200 cả `/` và `/benchmark` (path unicode không gây vấn đề). Đủ theo đặc tả: DESIGN.md + token trước code; panel trái 320px; MapLibre Carto dark + offline mode; timeline SIGNATURE đồng bộ 2 chiều bảng g/h/f; drawer 3 tab; multiroute; legend cố định; 10 thuật toán; guardrail G_real. ĐÃ CHỐT sau 3 vòng duyệt mắt: (v1) thêm 2 chế độ Sáng/Tối qua CSS variables + basemap positron; (v2) audit contrast WCAG bằng scripts/check_contrast.py — đo trên nền basemap THẬT, sửa 4 màu rớt, fix updateTriggers repaint; (v3) tooltip icon ?, SwitchRow thẳng hàng, bỏ label lặp, stat card icon, chú thích g/h/f | `phase-5: Next.js frontend` + 3 fix |
| 6 | benchmark.py — 7 thí nghiệm → results/ | ✅ | Chạy đủ 7 thí nghiệm (~7 phút, seed 42): **exp1 1200/1200 khớp NetworkX 1e-6**; exp2 **0 vi phạm admissible / 21 170 điểm** (h/h* max 0,565); exp3 đủ **10 thuật toán × 200 cặp × 2 khung giờ** (4 000 dòng — cả iddfs/idastar chạy full sau khi đo khả thi); exp4 **83,5% cặp đổi tuyến** 07:30 vs 22:00 + 3 GeoJSON; exp5 đường cong γ có **cực tiểu thời gian quanh γ=1,5** (ủng hộ mặc định); exp6 5 tuyến + link Google Maps; exp7 TSP 10 điểm **tiết kiệm 53,6%**, NN+2opt & SA đều đạt nghiệm Held-Karp (SA mean 3564,6±9,7). 78/78 test; /api/benchmark trả 200 với 4 000 rows | `phase-6: benchmark suite` |
| 7 | Deliverables: BaoCao-Khung, Slide-Outline, Video-KichBan, GIAI-THICH-THUAT-TOAN, README | ✅ | GIAI-THICH sinh TỰ ĐỘNG từ trace thật (`scripts/gen_teaching_doc.py` — đồ thị con 7 node khu Bến Thành; *cặp dạy sau audit dữ liệu đổi thành BT→BX, xem nhật ký 26/07 tối muộn*); BaoCao-Khung 10 mục a–j đủ marker, bảng benchmark điền số ĐÃ VERIFY từ CSV; Slide 14 trang map rubric; Video 18–25 phút đúng checklist 4.10 + nhắc tab ẩn danh; README 5 bước dựng từ zero + troubleshooting. pytest 78/78 | `phase-7: deliverables` |

## Câu hỏi mở

**Đã chốt:**
- ✅ Bbox cuối: GIỮ `(106.680, 10.760, 106.720, 10.800)` — user chốt sau Phase 1 (G_real 2 118 node nằm trong mục tiêu 2 000–6 000).
- ✅ Danh sách 51 POI: user đã review trên Google Maps (sửa 2 tên + 3 toạ độ, áp dụng + rebuild).

**Còn lại — việc của nhóm trước khi nộp:**
- Gửi mail giảng viên (`vntan.work@gmail.com`): xác nhận kịch bản shipper + việc dùng NetworkX làm baseline test (code đã cô lập NetworkX trong test theo luật 6 nên không chặn).
- Chốt các vai trò còn lại; người đại diện nộp chính thức đã chốt là Thái Quang Huy.
- Mở lại 8 URL nguồn bằng tab ẩn danh trong final link QA.
- Chụp 9 screenshot + 5 ảnh Google Maps đối chứng; quay video; đóng gói `2.zip`.

## Nhật ký quyết định

- **2026-08-11 (official result closeout):** sau explicit authorization, dừng
  service cũ và chạy cô lập một lượt `backend/app/benchmark.py` trên graph/profile
  2026-08-03, tiếp theo là `scripts/05_calibrate_gamma.py` và
  `scripts/gen_teaching_doc.py`. Đối chiếu độc lập xác nhận đủ exp1–exp7, không
  orphan exp4, 11 PNG đọc được, γ̂ = 1,238 từ 160 điểm và generator byte-idempotent.
  Số liệu được đồng bộ vào README, report/slide/video, tài liệu data/schema/design,
  trang `/benchmark` và generated teaching document; không rebuild data/crawl.
- **2026-08-08 (UI Clarity Phase + polish sau freeze):** triển khai đầy đủ
  `UI_PLAN.md` trong frontend active duy nhất `frontend/`. Shell responsive,
  keyboard/focus/reduced-motion, bốn tab kết quả, scenario editor một authority,
  marker Đi/Đến, bảng ba cột, loading/error/empty và contrast bảy theme đã được
  QA. Follow-up rút gọn tên thuật toán, chuẩn hoá số liệu UI sang km/phút, đồng
  nhất typography hành trình và đặt hai metric chính cạnh nhau trên desktop.
  Gate đạt 176 backend test, 40 frontend test, validator, TypeScript và build;
  không đổi backend/API/schema/data/results hay chạy benchmark/generator.
- **2026-08-03 (UI-01–UI-04, route-flow và FINAL-01):** bốn commit nối tiếp đã
  hoàn thiện UI mà không đổi backend/API/schema/store contract: `d44b96a` làm mới
  shell tìm đường theo hướng Operational Control Room; `f670fa6` tách và làm rõ
  setup/result ATSP; `6789f25` vá accessibility/responsive và thêm luồng sáng
  route bằng deck.gl với fallback `prefers-reduced-motion`; `f22698c` hoàn thiện
  trang benchmark ở chế độ chỉ đọc, giữ banner `SỐ TẠM` và đủ trạng thái
  loading/empty/error/retry/partial. FINAL-01 trên `f22698c` xác nhận pytest
  **95 passed, 1 warning**, validator `ALL DATA VALID`, contrast dark/light và
  TypeScript đạt; clean runtime khớp G_demo 51/292, G_real 2.118/4.699; UI chính
  đạt 71/71 assertion. Trạng thái phát hành: **DEMO-READY WITH WARNINGS**,
  **SUBMISSION BLOCKED**, **FINAL-DATA NOT ALLOWED**. Còn chặn bởi dữ liệu TomTom
  2/4, benchmark stale, 8 URL nguồn risk, marker/report/slide/video/ZIP thủ công;
  route-flow G_real mới đo khoảng 16 FPS dưới SwiftShader, chưa có bằng chứng GPU
  phần cứng.

- **2026-07-27 (UI v11 — user rà bằng mắt từng tab + hội đồng review 3 lăng kính):**
  3 đợt polish theo góp ý trực tiếp của user trên GUI đang chạy: (đợt 1) tab **So sánh**
  (câu verdict + cột Δ B/A xanh/đỏ + dòng theo mode hết trùng số + swatch tuyến ở header),
  tab **Giải thích** (tên Đi/Đến hết cắt cụt, lead/body summary, badge tối ưu, Δ so tuyến
  chính trên card alternatives), tab **Số liệu** (2 tầng "Tuyến tìm được / Công sức tìm
  kiếm", sub-line chi phí theo mode, bảng g/h/f `table-fixed` hết tràn cột, `fmtVi` thêm
  nhóm nghìn NBSP toàn app), **panel trái** (segmented 3 tiêu chí, dropdown thuật toán
  nhóm Đảm bảo/Không đảm bảo có màu + label 11px, khối ATSP ẩn control chết, hint dưới
  CTA, Section thu gọn được); (đợt 2 — "làm full") legend tự ẩn khi trống, marker G_real
  co giãn theo zoom (màu giữ v8), chuỗi chọn nối tiếp trên bản đồ (Đi→Đến, giữ mode thêm
  điểm giao n/15 + nút Xong), empty-state theo đồ thị + Mẹo demo; (đợt 3 — hot-fix theo
  user) scroll dropdown (ScrollUp/Down button — bug cắt cụt im lặng của ui/select),
  legend né timeline CHỈ khi drawer mở, **luật tour-mode: thêm điểm giao tự bỏ điểm Đến**
  (chiều ngược cho phép có chủ đích). Hội đồng review 3 lăng kính (bug/design/UX,
  ~519k token) bắt 2 MAJOR đã vá: **So sánh chạy B bằng mode hiện tại thay vì mode của
  tuyến A** (đổi Tiêu chí sau khi chạy → bảng in mét như giây; giờ B khoá theo
  mode/slot/graph của trace A) và cột h bảng g/h/f tràn ở mode Ngắn nhất (h là mét);
  + 8 MINOR/NIT (đơn vị hàng thời gian, tspMethod vào store, toast click bị nuốt,
  pickingRadius 8px, footer g/h/f hết mâu thuẫn, v.v.). DESIGN.md ghi đủ v11 đợt 1–3;
  README 79→**82 test**; `hdcrawl.md` (run-book TomTom) + `results/README.md` mới;
  `.gitignore` thêm `audit_tmp/`. tsc + pytest 82/82 xanh. Việc TomTom + thay số vẫn
  theo hdcrawl.md / Phụ lục A KIEMTOAN.

- **2026-07-27 (FIX BATCH theo docs/KIEMTOAN.md — user duyệt, 4 commit A/B/C/D, TRƯỚC
  lượt benchmark TomTom):** (a) **L1-01**: risk vùng (ngập/lô cốt) đổi từ "mọi cạnh
  trong bán kính" sang "cạnh ĐI VÀO vùng (u ngoài, v trong)" — mỗi lượt băng qua trả
  penalty đúng 1 lần, cost vẫn edge-local; real flood 402→54, construction 107→19.
  (b) **Quyết định tự đưa (báo rõ):** congestion G_demo KHÔNG quay RNG riêng nữa —
  cạnh co kế thừa trung bình trọng số mức của các cạnh thật dọc hành lang
  (`data/gdemo_corridors.json` mới, 04 sinh, 03b đọc); hệ quả: bất biến balanced kiểm
  được VÀ TomTom sau này tự lan sang demo. (c) 04 nâng lên **6 bất biến** (time ≤1,5 ·
  dist ≤1,8 · balanced ≤1,5 ×4 khung giờ, repair được phép thay hành lang có guard
  toàn cục) → G_demo 253→**292 cạnh / 56 oneway**; số ví dụ giảng đổi theo
  (BFS 446/+31%, beam k=5 415, ma trận mini 304/120, HK 397/−14%) — đã đồng bộ
  GIAI-THICH (regen) + Slide/Video/BaoCao. (d) validate_data vá 6 lớp lỗ audit
  (length≥haversine, bảng speed, sanity profile, SÀN ratio, risk counts ±20%,
  meta.source vs data/raw) + kiểm 6 bất biến vĩnh viễn. (e) Chùm 2-click L3: start==goal
  hết 500 (explain early-return + UI chặn trùng); `_Recorder.active` chặn CPU sau cap
  5000 (idastar+trace real 41,9s→4,3s); updateTriggers layer nodes; stale-guard so đủ
  hành trình + khoá panel khi đang bay; HELD_KARP_LIMIT hết match nhầm; 404/405 về
  envelope §C.7; /benchmark format số VN. (f) Hồ sơ γ: 4 vị trí lập luận vòng viết lại
  theo khung ĐỘ NHẠY; tiêu đề hình exp5 hết nói ngược data; **scripts/05_calibrate_gamma.py**
  mới (fit f=1+γ(c−1)/4 từ TomTom, chạy sau 03a). (g) Chống L6-01 tái phát:
  gen_teaching_doc đọc exp3/exp7 từ results/*.csv (hết hardcode) + caveat exp7; cảnh báo
  SỐ TẠM 4 file mở rộng phủ cả số chạy tay; results/README.md mới. (h) SCHEMA: ghi rõ ε
  theo đơn vị của mode; §A.4 không đổi cấu trúc (corridors là file build phụ trợ, không
  thuộc hợp đồng §A). pytest 79→**82** test (3 regression API mới), validate ALL VALID,
  regen byte-idempotent. **Benchmark exp1–7 CHƯA chạy lại — results/ vẫn là số synthetic
  lượt 2026-07-26, chờ đủ 4 mốc TomTom (results/README.md cảnh báo).**

- **2026-07-27 (repo GitHub + duyệt v8c–v9):** (a) Push toàn bộ lên
  `github.com/ThaiQuangHuy2906/Lab1_Searching` (khuyến nghị để Private tới khi chấm
  xong); thêm `.gitattributes` chuẩn hoá LF; README sửa 78→79 test. (b) v8c: biểu đồ
  /benchmark — Recharts tự ẩn nhãn trục X (10 cột chỉ 7 nhãn, cột idastar bị đọc nhầm
  thành bidijkstra — user bắt được) → `interval={0}` + nhãn nghiêng; trục Y đổi thang
  log đúng kịch bản video. (c) v8d–v8e: nhãn POI trắng hẳn/đậm hẳn theo chế độ + fix
  TextLayer nhãn thiếu `updateTriggers` theme (đổi theme xong nhãn giữ màu cũ — chìm
  vào nền); node/cạnh chế độ Sáng cùng bệnh chìm → zinc-600/zinc-500. (d) v9 panel:
  mọi control nhập (select/input/nút secondary) nền `surface` "khoét sâu" trên panel
  (hết trắng-trên-trắng); focus ring 2px `algo-frontier` áp THẬT vào
  Button/Select/Switch/input (DESIGN quy định từ đầu nhưng code thiếu — phát hiện khi
  rà đồng bộ); switch thumb trắng cố định (thumb đen nặng ở chế độ sáng); placeholder
  Đi/Đến phân biệt. WCAG ALL PASS sau mỗi vòng.

- **2026-07-26 (tối muộn — audit G_demo, user duyệt "sửa ngay"):** Audit độc lập bên ngoài
  phát hiện G_demo méo khoảng cách (median 1,69× · 40,1% cặp >2× · max 20,67× so G_real;
  cặp quy chiếu CVHLĐ→Hồ Con Rùa 10 159,8 m vs thật 1 584,2 m). Nguyên nhân: luật
  `ONEWAY_RATIO=1.4` xoá oan 30+ chiều ngược đi được thật; tỉa cạnh chỉ kiểm tra cục bộ
  từng cạnh; mode distance không được bảo vệ. **Sửa (04_build_gdemo viết lại):** bỏ hẳn
  ONEWAY_RATIO — mỗi chiều giữ đúng theo đường đi thật trong G_real; thêm **bất biến
  demo/real ≤1,5× (time) VÀ ≤1,8× (dist) cho MỌI cặp POI có hướng**, cưỡng chế bằng
  `repair_invariant` (thêm cạnh co dọc shortest path thật) + `prune_redundant` an-toàn-
  toàn-cục (thử gỡ → kiểm lại toàn bộ all-pairs cả 2 trọng số → hoàn tác nếu vỡ);
  validator vĩnh viễn `check_demo_invariant` trong validate_data + regression test riêng
  cặp CVHLĐ↔HCR ≤2×. **Kết quả:** 141→**253 cạnh**, 55→**51 oneway**; ratio time
  median 1,13 / p90 1,33 / max 1,50 — dist 1,11 / 1,28 / 1,67; CVHLĐ→HCR còn 1 891,8 m
  (1,19×), chiều ngược 1 473,4 m. pytest 79/79 (test traffic bỏ hardcode 141 cạnh —
  đọc edge_count động). **Cặp dạy GIAI-THICH chọn lại bằng quét toàn subgraph:** BT→BX
  — một cặp mang trọn cả 3 bài học (cạnh trực tiếp BX→BT một chiều nên chiều đi phải
  vòng; BFS lẫn Greedy cùng sập bẫy +157 s/+46%; nhóm xét chi phí đi đúng 341 s) — đồng
  bộ số vào Video-KichBan/Slide-Outline/BaoCao-Khung (ma trận ATSP mini giờ 266 vs 232).
  Benchmark exp1–7 VẪN CHƯA chạy lại — chờ TomTom (giữ nguyên cảnh báo TẠM). UI duyệt
  v8: nút ✕ xoá chọn Đi/Đến (cả dropdown G_demo lẫn chọn-trên-bản-đồ G_real).

- **2026-07-26 (rà soát vòng 2 theo lệnh user — "đừng tự tin"):** phát hiện & sửa:
  (a) **Mọi chỗ nói "v_max = 60 km/h" là SAI với dữ liệu thật** — cả G_real lẫn G_demo
  max free_speed = **45 km/h** (code luôn đúng: `GraphStore.v_max_ms` lấy max của chính
  đồ thị; chỉ CÂU VĂN sai). Sửa: HEURISTIC-PROOF §1+§5, BaoCao mục e, Video 6:00,
  template GIAI-THICH (in v_max động). (b) Template GIAI-THICH còn hardcode đích cũ
  "SC" ở khối heuristic + mục Hai chiều ("ngược từ SC") — làm động theo goal. (c)
  Substore 7-node tự tính v_max riêng (42,4) ≠ v_max G_demo đầy đủ (45) → bảng h lệch
  GUI, vi phạm cam kết "khớp 100%": build_substore giờ KẾ THỪA v_max của G_demo
  (h nhỏ đi ⇒ vẫn admissible). (d) Beam trên cặp mới: k=5 (449 s) TỆ HƠN k=2 (341 s) —
  xác minh code: đúng semantics "đã vào beam là chốt" (Phase 3), KHÔNG phải bug; viết
  thêm đoạn "Nghịch lý đáng giảng" (điều kiện hoá — chỉ in khi xảy ra) + chú thích
  "frontier hiển thị ứng viên trước khi cắt k". (e) Bảng giây làm tròn cộng tay lệch
  ±1 s (341,5 hiển thị 342 nhưng tổng 341) → thêm chú thích làm tròn ở §0. (f) Số
  stage build ghi nhầm trong DATA.md §7 (+76 → thật là +820/−744). (g) Kiểm
  DETERMINISM: chạy lại 04+03b → byte-identical (git sạch). (h) pytest 79/79 +
  check_contrast ALL PASS sau các đổi màu. UI duyệt v8 bổ sung theo yêu cầu user:
  dark nâng node zinc-500→300, cạnh zinc-600→400, nhãn POI zinc-400→200; nhãn POI
  G_demo LUÔN hiện (bỏ ngưỡng zoom 12,8 — collision filter vẫn tự nhường khi đè).

- **2026-07-26 (tối — sau chốt Phase 7):** (a) **Benchmark sẽ chạy lại MỘT lượt duy nhất khi có dữ liệu TomTom (ngày mai)** — số exp1–7 hiện tại trong `results/` và các trích dẫn trong report/ + GIAI-THICH coi là TẠM (đã gắn cảnh báo đầu từng file). (b) Chuỗi duyệt UI bằng mắt v5→v7: mũi tên hướng di chuyển CHỈ trên tuyến kết quả (route/multiroute/so sánh, cách nhau ≥220 m, viền SDF màu tuyến); drawer nới 360→400px hết cắt cột f; polish v6 (bóng trung tính cho lớp nổi, cụm nút bản đồ +/−/⌂ có transition, micro-feedback 150 ms, chú giải có tiêu đề); v7 redesign tab Giải thích (header tuyến + chips thời gian/km, GỘP đoạn ùn tắc theo tên đường kèm số đoạn, legend thêm mục "▶ Hướng di chuyển"). Mọi thay đổi ghi DESIGN.md trước khi code.

- **2026-07-26 (Phase 7):** (a) GIAI-THICH-THUAT-TOAN.md SINH TỰ ĐỘNG từ chính search.py trên đồ thị con 7 node thật của G_demo — bảng chạy tay không bao giờ lệch code/GUI, tái sinh bằng `scripts/gen_teaching_doc.py`. (b) Chọn cặp dạy: bài chính BT→SC (3 tuyến cạnh tranh, minh hoạ một chiều); phản ví dụ BX→BT cho BFS (+52% vì ít cạnh) và Greedy (+147 s vì tin h bỏ g) — quét toàn bộ cặp trong subgraph để chọn. (c) Bảng thực nghiệm mục g của báo cáo: phát hiện số nháp sai (Greedy gap thật 60,9% chứ không phải 18,3%) → mọi số trong deliverable đều tính lại từ CSV. (d) Screenshot báo cáo/video quy ước chế độ TỐI.

- **2026-07-26 (Phase 6):** (a) Đo trước idastar (~0,5 s/cặp) và iddfs (~0,3 s/cặp với depth đủ) trên G_real → chạy FULL 200 cặp cho cả 10 thuật toán, không cần cắt mẫu. (b) `costs.edge_weight`/`GraphStore` nhận `gamma` override CHỈ cho exp5 (mặc định 1,5 giữ nguyên — luật 4); tuyến chọn theo γ biến thiên nhưng ĐO bằng thước chuẩn γ=1,5 mode time. (c) exp1 dùng `nx.bidirectional_dijkstra` làm baseline (nhanh, cùng weight). (d) Hình PNG dùng bảng màu light của DESIGN trên nền trắng — thân thiện in ấn báo cáo. (e) Phát hiện exp5 đáng bàn ở mục c báo cáo: γ tăng làm tuyến RỜI trục chính kẹt (distance giảm, không tăng như trực giác) — đặc điểm của phân bố kẹt synthetic dồn vào primary. (f) Benchmark chạy một mình, không tiến trình song song, để runtime_ms sạch.

- **2026-07-26 (Phase 4):** (a) Cạnh co G_demo giờ mang `name` = tên đường thật chiếm tỉ trọng dài nhất dọc tuyến (sửa 04, rebuild — trước đó name=null làm explanation hiện "e00075"). (b) Câu mở đầu explanation phân nhánh theo `optimal_guarantee`: thuật toán không tối ưu nêu ĐÚNG tiêu chí thật của nó (BFS "ít đoạn nhất"…) thay vì nói dối "chi phí thấp nhất", kèm câu gap so tuyến tối ưu (chạy thêm Dijkstra). (c) Alternative luôn ≥1 tuyến thực sự khác nhờ fallback "cấm cạnh xuất phát". (d) Handler KeyError chỉ trả 404 khi message dạng `node '…'`, còn lại 500 (bug không giả dạng 404). (e) `/api/benchmark` trả 404 `RESULTS_NOT_FOUND` chừng nào Phase 6 chưa chạy — đúng SCHEMA. Pin fastapi 0.140.0 / uvicorn 0.51.0 / httpx 0.28.1.
- **2026-07-26 (Phase 3):** (a) IDA* dùng biến thể graph-search với `best_g` per-round (chặn chu trình bằng "đến lại phải rẻ hơn" — nhanh hơn path-set, vẫn đúng vì weight > 0); thêm `max_rounds=1000` an toàn. (b) Beam Search expand từng node trong lớp (thay vì cả lớp một nhịp) để khớp semantics trace per-step; visited set chống quay lại; `found=false` là kết quả hợp lệ. (c) SA: init từ tour NN, T0 = 20% chi phí đầu, α=0.995, 2000 iter/seed, 5 seed 0–4 — mọi candidate tour tính lại chi phí đầy đủ (an toàn bất đối xứng). (d) NN+2-opt có thêm Or-opt (đoạn 1–3 điểm, giữ chiều) như PROMPT-MASTER gợi ý. (e) `_Recorder.record` nhận thêm `side` (sạch hơn mutate step).
- **2026-07-26 (Phase 2):** (a) Test consistency phát hiện **lỗi làm tròn phá admissible** (~3 cm): sửa bằng `ceil_dm` (length làm tròn LÊN 0.1 m) + `edge_weight` tính `t_free` exact từ length/speed thay vì field đã tròn → rebuild data (G_demo giờ 51 node / 141 cạnh / 55 oneway). (b) `graph_store.py` viết ở Phase 2 thay vì Phase 4 vì search cần (Phase 4 chỉ còn main.py + explain.py). (c) `metrics` totals không làm tròn (để đối chứng 1e-6); g/h/f trong trace round 0.1 chỉ để hiển thị. (d) Goal-test thống nhất khi EXPAND (pop) ở mọi thuật toán để video giảng nhất quán. (e) IDDFS giới hạn depth 100, chỉ khả thi thực tế trên G_demo.
- **2026-07-26 (Phase 0):** Dùng Python 3.14.0 thay vì 3.11 (user duyệt — máy chỉ có 3.14); pin `pydantic==2.13.4`, `pytest==9.1.1`. Chốt trong SCHEMA: enum algorithm đủ 10 giá trị; multiroute nhận ≤ 16 điểm tổng, riêng `held_karp` ≤ 15 (vượt → 422 `HELD_KARP_LIMIT`); error model `{error:{code,message_vi}}`; trace cắt tại 5 000 bước (`trace_truncated`); `include_trace` mặc định demo=true/real=false; `return_to_start` mặc định false.
- **2026-07-26 (Phase 1):** Tách profiles thành 2 file `traffic_profiles_real.json` / `traffic_profiles_demo.json` (edge id space của 2 graph trùng nhau — SCHEMA §A.4 đã cập nhật; lệch tên so với cây thư mục PROMPT-MASTER §2). Quyết định build tự đưa (ghi trong DATA.md): dedup cạnh song song giữ cạnh nhanh nhất; `oneway` suy từ cấu trúc cuối; G_demo nối k-gần-nhất (k=4) + luật một chiều 1.4× + tỉa cạnh thừa khi đường vòng ≤1.5× (191→138 cạnh); *Nhà thờ Tân Định* bị gộp node với *Chợ Tân Định* *(hết hiệu lực sau POI review cùng ngày: đã tách thành 2 node riêng cách 72 m nhờ luật snap thứ-nhì)*; Bưu điện TP mang type `warehouse` làm depot kịch bản shipper. Hạn chế ghi nhận: `narrow_alley` hiếm (drive network loại hẻm) — G_demo 0 cạnh hẻm.
- **2026-07-26 (duyệt SCHEMA — vòng 1):** (a) **Chốt Python 3.14 làm chuẩn dự án** sau kiểm chứng thật: `pip download` trong venv cp314 → 8/8 gói (osmnx 2.1.1, geopandas 1.1.4, shapely 2.1.2, pyproj 3.7.2, numpy 2.5.1, scipy 1.18.0, pandas 3.0.5, matplotlib 3.11.1) đều về wheel — 6 gói binary có `cp314-cp314-win_amd64`, 2 gói pure-python `py3-none-any`; đối chứng thêm bằng PyPI JSON API. Không gói nào rơi về sdist. Đã cập nhật PROMPT-MASTER §8, CLAUDE.md, README. (b) **Schema `trace` thêm trường `side`** (`forward|backward`) bắt buộc mỗi bước với `bidijkstra`, cấm với thuật toán khác; node nằm trong cả 2 frontier → map `g` hiển thị giá trị nhỏ hơn (phục vụ GUI tô 2 màu). Cập nhật SCHEMA §B.3 + models.py + mock mới `trace_bidijkstra_mock.json` + 4 test (17/17 pass).
