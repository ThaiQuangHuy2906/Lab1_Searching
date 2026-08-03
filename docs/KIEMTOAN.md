# KIEMTOAN.md — Báo cáo Hội đồng phản biện độc lập

> **Lưu ý hiện hành (2026-08-04):** phần từ “TRẠNG THÁI FIX BATCH” trở xuống là
> sổ kiểm toán/fix lịch sử tại các commit
> ghi trong tài liệu. Không dùng các số test, line number hay kết luận cũ làm bằng
> chứng cho worktree hiện tại. FINAL-01 và các mục cập nhật UI dưới đây cũng là
> evidence lịch sử. Current-state nằm trong `README.md`, phần current-state của
> `docs/CODEX-CODEBASE-MAP.md` và
> `docs/KE-HOACH-TRIEN-KHAI-NHIEM-VU-HOP-NHOM.md`; kết luận cuối vẫn phải dựa trên
> code/data hiện hành và lệnh kiểm chứng fresh.
>
> **Ngày kiểm:** 2026-07-27 · **Commit kiểm:** `9598141` (git sạch, đồng bộ origin/main)
> **Phương pháp:** Lượt 0 (mốc chân lý) chạy trước; 6 lượt kiểm toán độc lập chạy **song song**
> (14 agent, ~24 phút máy, ~390 lệnh/tool); mọi phát hiện BLOCKER/MAJOR (tối đa 3/lượt) bị một
> agent hoài nghi **tái lập độc lập từ đầu** trước khi vào báo cáo (cột "Phản biện chéo").
> Script tái lập nằm nguyên trong `audit_tmp/` (luot1…luot6, verify/) — không commit.
> Sau toàn bộ cuộc kiểm: `git status` chỉ còn untracked `audit_tmp/` — **không file nguồn nào bị sửa**.

---

## Cập nhật UI compare + ATSP tabs — 2026-08-03

**Phạm vi:** làm rõ hai tuyến thuật toán khi trùng cạnh; thêm nội dung ATSP thật
cho tab Giải thích và So sánh; chuyển handoff về local-only, không dùng dịch vụ
tài liệu/lưu trữ bên ngoài nếu người dùng chưa chủ động bật lại.

- Compare A/B: tuyến B giữ nguyên node path, API và metrics nhưng casing, nét đứt
  và mũi tên được dịch 4 px ở tầng render. Drawer hiển thị số cạnh có hướng chung,
  chỉ A, chỉ B và tỷ lệ `chung / hợp`; ảnh dark G_demo đã được kiểm bằng mắt.
- ATSP Giải thích: diễn giải method/guarantee, tiêu chí, bất đối xứng và tác động
  trước/sau từ đúng `MultirouteResponse`.
- ATSP So sánh: đối chiếu thứ tự nhập với thứ tự sau tối ưu cho cost/time/distance;
  UI ghi rõ đây không phải so sánh đồng thời hai method vì store chỉ giữ một `multi`.
- `npx tsc --noEmit`: exit 0. `git diff --check`: exit 0 (chỉ cảnh báo line-ending
  hiện có của `docs/DESIGN.md`). Không chạy backend suite, validator, build,
  benchmark hoặc data rebuild vì thay đổi chỉ ở frontend/tài liệu.
- Runtime ATSP 1366×768: **53/53 assertion**, 13 PNG; dark/light explanation +
  before/after compare, loading/disabled, invalidation, Held-Karp 14/15 stop,
  G_real picking, route/explanation/compare/offline/drawer/error-retry regression.
- Runtime route/flow 1366×768: **11/12 assertion**, 10 PNG; dark/light, compare,
  trace, clear, G_real và reduced motion đạt. Cổng FPS G_real còn không đạt trên
  Chromium SwiftShader (xấp xỉ 14 FPS), cùng rủi ro GPU giả lập đã biết từ FINAL-01;
  chưa tái lập bằng GPU phần cứng.
- Lỗi console quan sát được chỉ gồm favicon 404 và lỗi `/api/graph` được script
  cố ý tạo để kiểm error/retry; không có exception UI ngoài dự kiến.

---

## Cập nhật hậu kiểm FINAL-01 — 2026-08-03

**Baseline đã kiểm:** commit `f22698c` (`feat: refine benchmark data presentation`),
đồng bộ `origin/main` tại thời điểm kiểm. Các sửa tài liệu sau mốc này không phải
thay đổi sản phẩm.

| Cổng phát hành | Kết luận hiện tại | Bằng chứng |
|---|---|---|
| Demo | **DEMO-READY WITH WARNINGS** | Backend/data/TypeScript/contrast đạt; UI chính, ATSP, benchmark và route-flow đã QA runtime |
| Nộp bài | **SUBMISSION BLOCKED** | Thiếu GroupID ZIP, Report PDF, Slide PPTX/PDF và Video TXT/link; marker/danh tính/ảnh/link nguồn chưa hoàn tất |
| Dữ liệu cuối | **FINAL-DATA NOT ALLOWED** | TomTom mới đủ 2/4 khung giờ; profile vẫn `synthetic`; `results/` cũ hơn graph và vẫn là `SỐ TẠM` |

### Bằng chứng đã chạy thật trong FINAL-01

- Backend: `95 passed, 1 warning in 15.68s`; warning duy nhất là deprecation
  Starlette/httpx.
- Data: `ALL DATA VALID`; validator vẫn cảnh báo chỉ có hai raw TomTom và profile
  đang `synthetic`.
- Frontend: `npx tsc --noEmit` exit 0; contrast checker đạt toàn bộ token
  dark/light.
- Clean runtime: API khớp snapshot trên đĩa — G_demo 51 node/292 cạnh; G_real
  2.118 node/4.699 cạnh.
- UI chính: 71/71 assertion; kiểm dark/light, route, trace, compare, explanation,
  ATSP, offline, drawer, keyboard/focus, reduced motion và các viewport 1180×720,
  1366×768, 1600×900.
- Benchmark viewer: đã kiểm ready/loading/empty/error/retry/partial và provenance
  `SỐ TẠM`; không chạy lại benchmark.
- Route-flow: 11/12 assertion đạt; các state G_demo/G_real, compare, trace,
  clear/invalidate và reduced motion hoạt động. Assertion hiệu năng G_real không
  đạt trong Chromium SwiftShader (xấp xỉ 16 FPS); chưa tái lập bằng GPU phần cứng.
- Evidence: 20 ảnh UI-03 + 10 ảnh UI-04 + 10 ảnh route-flow, cùng 10 trang đề bài;
  các PNG evidence đều không rỗng.

### Việc còn chặn

- **P0:** tạo đủ bốn artifact đóng gói còn thiếu: GroupID ZIP, Report PDF, Slide
  PPTX/PDF, Video TXT/link.
- **P1:** hoàn tất 40 marker trên 30 dòng nội dung, 12 marker screenshot, danh tính
  và đóng góp nhóm, 8 `source_url`; thu TomTom 17:30/22:00 rồi mới quyết định
  profile cuối và chạy trọn data → validation → benchmark → generator một lượt.
- **P2:** favicon còn 404; chưa kiểm bằng screen reader thật/formal WCAG; hiệu năng
  route-flow G_real trên GPU phần cứng chưa có bằng chứng.

Không được gỡ banner `SỐ TẠM`, trích số `results/` làm benchmark hiện tại hoặc
coi repository là submission-ready trước khi các blocker trên được đóng.

---

## ✅ TRẠNG THÁI FIX BATCH (duyệt 2026-07-27 — làm trọn một lượt TRƯỚC benchmark TomTom)

| # | Mục | Finding | Trạng thái |
|---|---|---|---|
| A1 | Risk theo vùng: flag cạnh ĐI VÀO (u ngoài, v trong); rebuild 2 graph + profiles; bất biến balanced ≤1,5× ×4 slot + SÀN time/dist; sửa câu "điểm ngập = 60 s" | L1-01 | ✅ XONG — real flood 402→**54**, construction 107→**19**; G_demo 253→**292 cạnh**/56 oneway (repair 6 bất biến); demo congestion nay KẾ THỪA trung bình trọng số hành lang thật (quyết định tự đưa, ghi TIENDO — TomTom sẽ tự lan sang demo); validator 6/6 PASS (bal max 1,49); CVHLĐ→HCR giữ 1891,8 m |
| A2 | Vá 6 assert Phụ lục B vào validate_data.py | Phụ lục B | ✅ XONG — B.1 length≥haversine · B.2 speed theo bảng · B.3 profile sanity (đỉnh>đêm, ≥2 mức, 22:00⊆{1,2} khi synthetic) · B.4 sàn ratio · B.5 risk counts ±20% · B.6 source vs data/raw/tomtom |
| B3 | L3-01 start==goal: explain early-return + frontend chặn Đi==Đến | L3-01 | ✅ XONG — explain.py early-return khi len(path)<2 (summary_vi tiếng Việt); dropdown Đi/Đến loại trừ nhau, map-pick chặn trùng kèm toast, store chặn thêm 1 lớp; test API mới: 10/10 thuật toán start==goal → 200, path=[start], cost 0 |
| B4 | L3-02 guard 11 điểm snapshot sau cap 5000 | L3-02 | ✅ XONG — _Recorder.active (enabled + chưa chạm cap) gác 13 điểm dựng snapshot (7 search.py + 6 search_advanced.py); đo lại đúng ca treo: idastar real n2037→n0725 trace 4,29 s vs no-trace 4,03 s = 1,07× (trước 7,5–10,9×), kết quả + max_frontier giống hệt |
| B5 | L3-03 updateTriggers layer nodes + rà 10 layer | L3-03 | ✅ XONG — thêm anim.steps.length vào getFillColor layer nodes (đúng fix verify agent đã chứng minh bằng diffProps); rà lại 10 layer còn lại: data động rebuild mỗi render hoặc đã có trigger theme — không layer nào cùng bệnh |
| B6 | L3-04 guard start/goal/stops sau await + khoá panel khi đang bay | L3-04 | ✅ XONG — cả 3 action so đủ graph/slot/mode/algorithm/start/goal/stops (runCompare còn đòi trace gốc còn sống); khoá chéo running/comparing/multiRunning ở cả store lẫn UI (dropdown, swap, ✕, thêm điểm, map click, 3 nút chạy) |
| B7 | L3-05 mã lỗi method lạ · L3-06 envelope 404/405 · L3-07 format VN /benchmark | L3-05/06/07 | ✅ XONG — chỉ map HELD_KARP_LIMIT khi msg 'held_karp supports at most' (+test); handler StarletteHTTPException trả envelope §C.7 tiếng Việt cho 404/405 (+test); /benchmark: formatter/tickFormatter fmtVi cho 2 bar chart + chart γ (kể cả nhãn 'γ = 1,5'); npx tsc --noEmit = 0 lỗi |
| C8 | L4-01 viết lại 4 vị trí γ theo khung ĐỘ NHẠY | L4-01 | ✅ XONG — Slide:27, Video 22:00 (kèm lời dặn 'KHÔNG nói chọn 1,5 vì cực tiểu'), BaoCao hint mục c (dòng 77) + khối [ĐIỀN 101-116 viết lại trọn: hằng số thiết kế + giải thích vì sao lập luận cũ là vòng + độ nhạy ~2,6% |
| C9 | L4-04 tiêu đề hình exp5 trung tính | L4-04 | ✅ XONG — benchmark.py: 'Độ nhạy γ: thời gian & quãng đường tuyến được chọn'; PNG sẽ tự đúng ở lượt benchmark TomTom duy nhất |
| C10 | L4-02 viết scripts/05_calibrate_gamma.py + dòng γ̂ vào BaoCao c | L4-02 | ✅ XONG — fit f=1+γ(c−1)/4 least-squares trên inflation freeFlow/current, level lấy đúng mapping ratio_to_level dùng chung với 03b (chuyển vào pipeline_common); xuất results/gamma_calibration.csv; chưa có snapshot → thông báo rõ + exit 1 (đã smoke); BaoCao mục c có sẵn dòng trích γ̂; DATA.md §1 thêm bước 05 |
| C11 | L4-03 caveat exp7 vào template gen_teaching_doc | L4-03 | ✅ XONG — thêm 'Caveat bắt buộc khi nói: … kết quả trên INSTANCE 10 điểm này, KHÔNG phải bảo đảm tổng quát' ngay dưới câu exp7 trong template; GIAI-THICH tái sinh ở D12 |
| D12 | gen_teaching_doc bỏ hardcode exp3/exp7 — đọc results/*.csv | L6-01/L4-05 | ✅ XONG — load_benchmark_numbers() đọc exp3 (expand A*/Dijkstra + % tiết kiệm) và exp7 (% tiết kiệm, câu 'đạt nghiệm HK' giờ ĐIỀU KIỆN theo ratio_optimal, SA mean±std) từ CSV mỗi lần tái sinh; regen 2 lần byte-idempotent; số ví dụ mới sau rebuild A1 (BFS 446/+31%, beam k=5 415, ma trận 304/120, HK 397/−14%) đã đồng bộ vào Slide/Video/BaoCao |
| D13 | Mở rộng cảnh báo SỐ TẠM 4 file (kể cả số chạy tay) | L6-01 | ✅ XONG — banner 3 file report + header GIAI-THICH (trong template) đều nêu rõ: số chạy tay cũng đổi theo profiles, quy trình làm mới MỘT lượt (03b→benchmark→gen_teaching_doc→Phụ lục A) |
| D14 | results/README.md nguồn synthetic + seed + lệnh tái sinh | L6-02 | ✅ XONG — kèm ghi chú quan trọng: graph đã rebuild 2026-07-27 nên CSV hiện tại là số của lượt data CŨ, càng phải thay trọn sau TomTom |
| D15 | SCHEMA câu đơn vị ε theo mode · Video sửa ~7 ms/~1 000 | L2-01/L6-03 | ✅ XONG — SCHEMA §B.5 + §C.4 ghi 'ε theo đơn vị chi phí của mode'; Video 16:45 → 'vài mili-giây, đọc đúng số màn hình (mean ~2,7 ms)', 20:00 → '~1 200 expand' + dặn khớp số cùng khung hình |

> **KẾT THÚC BATCH (15/15 ✅):** verify cuối — pytest **82 passed** (79 cũ + 3 regression
> mới) · validate_data **ALL DATA VALID** (6 bất biến + 6 assert mới) · gen_teaching_doc
> regen **byte-idempotent** · check_contrast **ALL PASS**. 4 commit: A `7d3cc55` ·
> B `45b42ab` · C `886a5ce` · D (commit này). Benchmark **CHƯA chạy lại** — results/ vẫn
> là synthetic 2026-07-26 (đợi đủ 4 mốc TomTom; results/README.md cảnh báo).
>
> ⚠️ Phụ lục A bên dưới lập TRƯỚC batch: cột "Giá trị/Vị trí" của các số ví dụ chạy tay
> và cấu trúc demo đã đổi theo batch (446/341/+31%/+104 s/304/120/415/397/−14%;
> G_demo 292 cạnh/56 oneway; risk real 54/19/8/185, demo 24/24/0/131). Cột **"Đổi sau
> TomTom?"** — mục đích chính của sổ — vẫn dùng nguyên làm checklist thay số cuối.

---

## 0. Mốc Lượt 0 + hai tiền đề của đề bài kiểm toán LỆCH thực tế

**Mốc đã tái xác minh — tất cả KHỚP:**

| Mốc | Kết quả đo lại |
|---|---|
| Git | SẠCH tại `9598141`, không còn gì chưa commit |
| pytest | **79 passed** / 12,6 s — khớp README; 76 hàm `def test_` + 2 `parametrize` (×3 mode trong test_api, ×2 level trong test_data) = 79 test. README **không nói quá** |
| G_demo | 51 node / **253 cạnh** / 51 oneway (meta khớp số đếm thật) |
| CVHLĐ↔HCR | demo 1891,8 m vs real 1584,2 m (1,19×); ngược 1473,4 / 1405,2 — đúng từng chữ số |
| Profiles | `meta.source = "synthetic"` cả 2 file → mọi số benchmark là **SỐ TẠM** (đúng bối cảnh) |

**Hai tiền đề trong đề bài kiểm toán lệch thực tế (tin thực tế, theo đúng luật Lượt 0):**

1. *"data/manual_risks.json: 8/8 đã có source_url → nghi URL máy tự sinh"* — **SAI**: cả 8
   `source_url` đang là placeholder chữ `"TODO: dán link…"`, **không có URL nào để fetch, không
   có link bịa**. Trạng thái khớp TIENDO "Còn lại" + DATA.md §2 → là việc tay chủ đích, không
   phải lỗi. Nỗi lo "link bịa tệ hơn link trống" **không xảy ra**.
2. *"28 marker [ĐIỀN"* — đếm thật là **40 lượt trên 30 dòng** (mốc "28" không đếm từng ô bảng
   thành viên 15 ô + 9 ô rubric). Toàn bộ vẫn nằm trong khung chủ đích, không phải marker sót.

---

## 1. Tóm tắt

**Đếm theo mức:** **0 BLOCKER** · **10 MAJOR** · **3 MINOR** · **4 NIT** (+1 finding gộp trùng).
7/10 MAJOR đã qua phản biện chéo độc lập và được **CONFIRMED**; 1 finding bị hạ từ BLOCKER
xuống MAJOR sau phản biện; 2 finding giữ mác MAJOR theo chỉ thị 26/07 của trưởng nhóm nhưng
hội đồng phản biện thẩm định tác hại thực tế ở mức MINOR (ghi rõ trong bảng).

**Ba rủi ro lớn nhất trước khi nộp:**

1. **Chuỗi γ "không trả lời nổi" khi vấn đáp (L4-01 + L4-02):** cả 3 deliverable đang dạy nhóm
   trình bày γ=1,5 bằng lập luận vòng ("cực tiểu tại γ=1,5 ⇒ chọn 1,5" trong khi thước đo tự
   dùng γ=1,5 — phản chứng đã chạy: khoá đồng hồ γ=0 thì "cực tiểu" nhảy về 0, khoá γ=3 thì về 3);
   đây là đúng dòng rubric nặng nhất (R2 modeling 15đ) và là câu hỏi vặn tất yếu.
2. **Quy trình "thay số sau TomTom" như đang viết sẽ bỏ sót 2 lớp số (L6-01):** số ví dụ chạy
   tay (498/341/+46%/266/232…) đã chép vào prose Slide/Video/BaoCao nhưng cảnh báo SỐ TẠM chỉ
   nói "số exp1–exp7"; và `gen_teaching_doc.py` hardcode số exp3/exp7 nên tái sinh sau TomTom
   vẫn in số synthetic cũ → video đọc số mâu thuẫn GUI đúng ngày chấm.
3. **Giảng viên chạm lỗi trong ≤2 click (chùm L3):** chọn Đi = Đến → toast lỗi server 500 trên
   cả 10 thuật toán; bật "Trace trên G_real" + IDA* cặp xa → treo biểu kiến ~38–42 s không có
   cancel; gạt toggle OFF → node giữ nguyên màu tím/lam cũ; sửa hành trình khi request đang bay
   → kết quả cũ vẽ đè hành trình mới.

Ngoài ra một phát hiện mô hình dữ liệu đáng chú ý đã CONFIRMED: **penalty risk bị tính chồng
theo micro-segment trên G_real** (một điểm ngập bị tính 13–17 lần ≈ 780–1020 s trên một tuyến,
trái câu "một điểm ngập đắt ngang 60 giây" mà báo cáo sẽ in) — L1-01.

**Tin tốt cần nói rõ:** Lượt 5 (người lạ dựng từ 0, đúng từng chữ README, clone sạch không
`.env`) ra **0 finding** — mọi lời hứa định lượng của README đều đúng. Lượt 2 bắn ~5 700 phép
kiểm bất biến thuật toán (A*==Dijkstra==UCS==BiDijkstra 1e-6; IDA*≤C*+ε; NN+2opt & SA ≥
Held-Karp; path⊆trace; start==goal ở tầng thuật toán; trọng số ~0; tie hàng loạt; unreachable)
— **toàn bộ sạch**. Sổ số liệu Lượt 6: **mọi con số** trong 4 deliverable khớp nguồn hiện tại
(chỉ 2 số "nói tròn" lệch trong kịch bản video — L6-03).

---

## 2. Bảng phát hiện

Mức: theo thang đã giao (BLOCKER/MAJOR/MINOR/NIT). Cột **PBC** = phản biện chéo độc lập:
✅C = CONFIRMED bởi agent hoài nghi; "—" = chưa qua phản biện chéo (bằng chứng vẫn tái lập được).

| ID | Mức | Vị trí | Tái lập | Expected vs Actual | Fix 1 câu | PBC |
|---|---|---|---|---|---|---|
| **L1-01** | MAJOR | `scripts/02_build_graph.py` (gán risk theo bán kính cho từng cạnh; xem `scripts/pipeline_common.py:96-108`) + `backend/app/costs.py:39-44` | `.venv/Scripts/python.exe audit_tmp/luot1/probe_penalty_proof.py`; độc lập: `audit_tmp/verify/L1-01/verify_l101.py` | Báo cáo (BaoCao:101-103) nói 1 điểm ngập ≈ 60 s MỘT LẦN. Thực tế G_real: vùng risk bán kính 250–400 m flag mọi micro-segment (402 cạnh flood, median ~56 m) → tuyến n1140→n0027 time@07:30 dính **17×60 = 1020 s** cho đúng 1 điểm; tuyến balanced tối ưu vẫn 13× = 780 s; n2070→n0109: 1645 m mà 1227,6 s → UI hiện "20,5 phút" ≈ **4,8 km/h**; demo/real cùng OD balanced tụt còn **0,64×** (417/2550 = 16,4% cặp < 0,85, min 0,25 — bất biến đã siết chỉ phủ time/dist, bỏ ngỏ balanced) | Chuẩn hoá penalty theo LƯỢT băng qua vùng (1 lần/chuỗi cạnh liên tiếp cùng flag) rồi rebuild + rerun, hoặc tối thiểu ghi hạn chế vào DATA.md §8 và sửa câu "một điểm ngập = 60 giây" trong report | ✅C |
| **L3-01** | MAJOR (hạ từ BLOCKER) | `backend/app/explain.py:202` (gọi từ `main.py:135`) | `curl -X POST :8001/api/route -d '{"start":"n0001","goal":"n0001","algorithm":"astar","time_slot":"07:30","graph":"demo"}'`; độc lập: `audit_tmp/verify/L3-01/` (TestClient 20/20 ca + uvicorn thật port 8003) | SCHEMA §B.1 hứa start==goal → 200, `path=[start]`, cost 0 — và **cả 10 thuật toán ĐÃ trả đúng** ở tầng search (`_trivial`). Nhưng `build_explanation` truy cập `trace.path[1]` → IndexError → **500 INTERNAL trên cả 10 thuật toán**; GUI chạm được trong 2 click vì dropdown Đi/Đến không loại trừ nhau (`control-panel.tsx:120`) | `explain.py`: early-return Explanation tầm thường khi `len(trace.path) < 2` (trước dòng 202) | ✅C (hạ mức: không hiển thị kết quả sai, hồi phục ngay, nhưng vi phạm hợp đồng tự nộp + fail đồng loạt) |
| **L3-02** | MAJOR | `backend/app/search_advanced.py:246-254`; cùng pattern guard `if rec.enabled:` ở 11 chỗ (search.py:152/200/245/312/328, search_advanced.py:73/86/171/246/333/343) | POST /api/route idastar n2037→n0725 real include_trace=true; độc lập: `audit_tmp/verify/L3-02/repro_idastar_trace.py` | Sau khi trace đầy cap 5000 bước, chi phí ghi trace phải ~0. Thực tế khối dựng snapshot (quét stack + sort + tính h/f) vẫn chạy đủ **3 512 507 expansion** rồi mới gọi `rec.record` (đã no-op): **37,7–41,9 s** vs 3,5–5,6 s không trace (7,5–10,9×); bản vá thử 1 dòng đo được 4,06 s, kết quả giống hệt. GUI có đường vào thật: công tắc "Trace trên G_real" | Đổi guard thành `if rec.enabled and len(rec.steps) < MAX_TRACE_STEPS:` tại mọi điểm dựng snapshot | ✅C |
| **L3-03** | MAJOR | `frontend/components/map-view.tsx:248` (layer `nodes`: `updateTriggers.getFillColor=[anim.stepIdx, trace, theme]`) | Chuỗi: G_real → bật Trace → Chạy dijkstra → gạt OFF; cơ chế chạy thật bằng `diffProps` của deck.gl 9.3.7 trong node_modules: `audit_tmp/verify/L3-03/diff_props_test.mjs` → "stale-fill-color REPRODUCED" | DESIGN v10c (fix 784f7fc) cam kết OFF → lớp bước biến mất NGAY. Thực tế `traceOnReal` không nằm trong updateTriggers, data ref ổn định → deck.gl không tính lại `getFillColor` → **node giữ màu tím/lam cũ** (đúng bug class đã tự ghi chú cho TextLayer tại map-view.tsx:308-310, sót layer nodes) | Thêm `anim.steps.length` (hoặc `traceOnReal`) vào updateTriggers.getFillColor của layer nodes | ✅C (tầng cơ chế; chưa E2E browser — 2 chuỗi thao tác kiểm tay <1 phút ghi sẵn) |
| **L3-04** | MAJOR | `frontend/lib/store.ts:209` (runRoute), `:236` (runCompare), `:258` (runMulti) | Chuỗi 1: IDA*+trace real (cửa sổ tới 42 s) → đổi "Đến" giữa chừng → response cũ về, guard chỉ so graph/slot → vẽ tuyến tới Đến CŨ dưới chip Đến MỚI. Chuỗi 2 (cửa sổ 0,4–1 s đo thật): Tối ưu thứ tự → click thêm điểm khi đang bay | Bất biến DESIGN v10f: "bản đồ không bao giờ hiển thị kết quả lệch với panel". Guard sau await **thiếu start/goal/stops** (8a420cb chỉ che graph/slot); panel hành trình không khoá khi busy; nút Chạy không disable khi multiRunning → 2 kết quả chéo có thể cùng đáp | So sánh snapshot start/goal/stops sau await, y hệt check graph/slot hiện có | — (đọc code + git show; chưa E2E) |
| **L4-01** | MAJOR | `report/Slide-Outline.md:27` · `report/Video-KichBan.md:85` · `report/BaoCao-Khung.md:77,104-106`; thước tự quy chiếu: `backend/app/benchmark.py:317-318` | grep các câu nguyên văn; **phản chứng định lượng**: `audit_tmp/verify/L4-01/verify_circularity.py` — 30 cặp cùng stream seed 42 của benchmark, đo bằng 3 đồng hồ: clock γ=0 → argmin=0; clock γ=1,5 → argmin=1,5; clock γ=3 → argmin=3 | Chỉ thị 26/07(a): exp5 phải trình bày là PHÂN TÍCH ĐỘ NHẠY. Thực tế Slide 3: "γ=1,5 chọn bằng THÍ NGHIỆM: cực tiểu tại γ=1,5"; Video 22:00: "vì sao chọn γ=1,5 bằng số liệu"; BaoCao c hướng dẫn điền đúng lập luận cực-tiểu-nên-chọn — **cực tiểu là artifact của thước đo**, không phải bằng chứng. (Hình + chart frontend thì đã đúng kiểu độ nhạy sẵn) | Viết lại 3 câu thành khung độ nhạy: "γ=1,5 là hằng số thiết kế; exp5 chứng minh kết luận ít nhạy (chênh cả dải 0→3 chỉ ~2,6%: 790,8–811,8 s)" | ✅C |
| **L4-02** | MAJOR¹ | `scripts/` (file vắng mặt) | `ls scripts/ \| grep -i calib` → rỗng; `grep -ri calibrat` toàn repo = 0 hit ngoài audit_tmp; `git log --all --grep=calibrat` = 0 | Chỉ thị 26/07(b): `scripts/05_calibrate_gamma.py` (ước γ từ currentSpeed/freeFlowSpeed TomTom) phải tồn tại. Thực tế **không tồn tại, không tài liệu nào hứa nó, TIENDO không ghi thực thi cũng không ghi huỷ**; hệ quả cộng hưởng L4-01: câu "γ=1,5 lấy đâu ra" hiện không có đường trả lời không-vòng | Viết script kèm lượt crawl TomTom (03a đã lưu raw đủ để calibrate từ cache — viết sau crawl không mất gì), HOẶC chính thức huỷ chỉ thị trong TIENDO kèm câu trả lời thay thế | ✅C sự kiện; ¹PBC đề nghị **MINOR** (đề PDF §4.3 chỉ đòi "how the weights are selected", không đòi calibration; tác hại vấn đáp đã đếm ở L4-01) |
| **L4-03** | MAJOR¹ | `docs/GIAI-THICH-THUAT-TOAN.md:356-357`; gốc template: `scripts/gen_teaching_doc.py:396-397` | `sed -n '350,360p' docs/GIAI-THICH-THUAT-TOAN.md` — không một chữ caveat quanh câu "NN+2-opt và SA đều đạt đúng nghiệm Held-Karp" | Chỉ thị 26/07(c): caveat "chỉ trên instance này, không bảo đảm tổng quát" phải có ở mọi chỗ trình bày exp7. Có tại BaoCao:290,295-296 + Slide:63; **thiếu tại GIAI-THICH §11** — đúng tài liệu thành viên dùng để nói video (phụ lục dòng 380 có "✘ xấp xỉ" nhưng cách 24 dòng) | Thêm vế caveat vào template `gen_teaching_doc.py:397` rồi tái sinh | ✅C sự kiện; ¹PBC đề nghị **MINOR** (câu đã tự scope "Trên kịch bản 10 điểm thật (benchmark exp7)"; header dặn "đừng đọc nguyên văn"; thiếu 1/4 vị trí) |
| **L4-04** | MAJOR | `backend/app/benchmark.py:337` (chuỗi hardcode) → `results/figs/exp5_gamma_curves.png` (hình sẽ chèn báo cáo theo BaoCao:104) | `cat results/exp5_gamma.csv` → avg_distance_m **giảm đơn điệu** 3902,9 (γ=0) → 3778,6 (γ=3); mở PNG thấy tiêu đề | Tiêu đề hình phải khớp dữ liệu của chính nó. Thực tế tiêu đề in "tăng phạt ùn tắc → **tuyến dài hơn** nhưng nhanh hơn" trong khi đường km trên cùng hình đi XUỐNG ("nhanh hơn" cũng chỉ đúng tới γ=1,5 rồi tăng lại 795,0 tại γ=3); TIENDO Phase 6e đã tự ghi nhận chiều đúng ("distance giảm") mà tiêu đề vẫn ngược; hardcode nên lượt TomTom vẫn in nguyên câu sai | Sửa chuỗi tại benchmark.py:337 thành trung tính ("Độ nhạy γ: thời gian & quãng đường tuyến được chọn") — hình tự đúng ở lượt benchmark cuối | — (bằng chứng CSV vs chuỗi hardcode, tự thẩm được trong 1 phút) |
| **L6-01** | MAJOR | `scripts/gen_teaching_doc.py:308,396-397` (hardcode exp3/exp7) · cảnh báo SỐ TẠM 4 file chỉ nói "số exp1–exp7" · số chạy tay trong prose: Slide:39,62 · Video:37,48,56-57 · BaoCao:277 | Độc lập: `audit_tmp/verify/L6-01/` — (b) copy generator đổi output → diff bản commit **byte-identical** + grep xác nhận chuỗi literal; (a) `probe_profile_dependence.py`: hạ mỗi congestion 07:30 đi 1 bậc → 498/341/+46%/266/232 thành **435/273/+59%/228/210** — cả 4 số ĐỔI, kể cả %; 03b có snapshot TomTom chắc chắn đổi congestion demo | Sau lượt TomTom, làm đúng chỉ dẫn hiện tại thì: prose giữ số chạy tay cũ (vì cảnh báo không phủ chúng — header GIAI-THICH còn khẳng định bảng chạy tay "KHÔNG phụ thuộc benchmark", củng cố ngộ nhận) và regen GIAI-THICH vẫn in 771/1226/53,6%/3564,6±9,7 synthetic → **số đọc trên video mâu thuẫn GUI khi chấm** | Mở rộng cảnh báo 4 file thêm vế "kể cả số ví dụ chạy tay — chạy lại gen_teaching_doc.py và đồng bộ prose"; sửa generator đọc exp3/exp7 từ `results/*.csv` (L4-05 gộp vào đây) | ✅C |
| L3-05 | MINOR | `backend/app/main.py:68-71` | POST /api/multiroute `method:"brute"` → 422 `HELD_KARP_LIMIT` | Phải là `VALIDATION_ERROR` nêu trường sai; handler match substring 'held_karp' trên message enum của pydantic → dán nhãn nhầm + khuyên lạc hướng ("dùng nn_2opt/sa cho 16 điểm") | Chỉ map HELD_KARP_LIMIT khi msg chứa 'held_karp supports at most' | — |
| L4-06 | MINOR | `report/BaoCao-Khung.md:94,101-104` · `data/DATA.md` (0 hit căn cứ) | `grep -n penalty data/DATA.md docs/*.md report/*.md` — mọi chỗ chỉ NÊU 60/90/30/25, không nguồn, không độ nhạy penalty | Đề 4.3 đòi tường minh "how the weights are selected"; câu vặn "sao lô cốt 90 > ngập 60?" hiện chỉ đỡ bằng "đơn vị giây đọc được" (R2 = 15đ, dòng nặng nhất rubric) | Thêm 1 đoạn căn cứ chọn penalty vào [ĐIỀN] mục c + trích HEURISTIC-PROOF:113 (proof đúng với mọi penalty ≥ 0) | — |
| L6-02 | MINOR | `results/` (không có file cảnh báo nào) | `ls results/` | 4 deliverable có banner SỐ TẠM nhưng ai mở thẳng CSV/PNG (giảng viên xem data nộp kèm) không biết là lượt synthetic | Thêm `results/README.md` 3-4 dòng: nguồn synthetic + ngày + seed + lệnh tái sinh | — |
| L2-01 | NIT | `backend/app/search_advanced.py:29` vs SCHEMA §B.5/§C.4 ("ε = 5 s") | Fixture tie-graph: idastar mode distance trả 0,5 khi C*=0,3 (lệnh đầy đủ trong audit_tmp/luot2) | ε=5.0 áp nguyên theo đơn vị mode → ở distance là 5 MÉT chứ không phải 5 giây; trên graph thật sai lệch tối đa 5 m (~0,3%) — chỉ lệch câu chữ docs nếu bị hỏi | Thêm 1 câu vào SCHEMA: "ε tính theo đơn vị chi phí của mode (giây với time/balanced, mét với distance)" | — |
| L3-06 | NIT | `backend/app/main.py:63-96` | `curl :8001/api/nope` → `{"detail":"Not Found"}`; GET /api/route → 405 `{"detail":...}` | SCHEMA §C: "mọi response lỗi dùng envelope §C.7" — 404 đường lạ/405 sai method trả JSON Starlette mặc định tiếng Anh | Thêm exception_handler cho StarletteHTTPException map về envelope | — |
| L3-07 | NIT | `frontend/app/benchmark/page.tsx:142,158,176` | Mở /benchmark, hover tooltip: "111.7", "0.85" | DESIGN §2 + lib/format.ts quy định dấu phẩy VN; mọi component khác theo, riêng Recharts trang benchmark render số thô kiểu Mỹ — trang giảng viên chắc chắn mở | Truyền `formatter`/`tickFormatter` dùng fmtVi cho RTooltip + trục | — |
| L6-03 | NIT | `report/Video-KichBan.md:73,81` | `audit_tmp/luot6/verify_numbers.py` (pandas trên exp3): bidijkstra mean 2,73 ms · p95 5,96; ucs/dijkstra expand mean 1226,0 | Kịch bản dặn đọc "~7 ms" (chỉ đúng đuôi phân bố) và "~1 000 expand" (non 23%) — số đọc to sẽ lệch số GUI cùng khung hình | Đổi thành "~3 ms"/"vài mili-giây" và "~1 200 expand", hoặc dặn người quay đọc đúng số trên màn hình | — |

*(L4-05 — generator hardcode số benchmark — trùng gốc với L6-01, đã gộp.)*

---

## 3. Đã kiểm và SẠCH

**Thuật toán & bất biến (Lượt 2 — ~5 700 phép kiểm, tất cả PASS):**
- A* == Dijkstra == UCS == BiDijkstra sai khác ≤1e-6: 100 cặp demo + 20 real × 3 mode × 2 slot = 2 160 phép so, kèm tự kiểm total_cost == tổng weight dọc path.
- IDA* ≤ C* + ε: 640 tổ hợp, `epsilon_bound=5.0` đúng.
- TSP: NN+2opt ≥ Held-Karp, SA (5 seed) ≥ Held-Karp trên 12 bộ n=4..9 × return_to_start; Held-Karp == brute-force trên 16 bộ n≤7; multiroute legs nối chuỗi đúng, Σcost legs == totals.
- path ⊆ node trong trace: đủ 10 thuật toán × 30 cặp; mọi Trace qua pydantic validator (luật g/h/f/side/depth_limit §B.3) trong ~3 500 lần chạy.
- start==goal ở **tầng thuật toán**: 10/10 trả found=true, path=[start], cost 0 (lỗi chỉ nằm ở tầng explanation — L3-01).
- Input hiểm: đồ thị cạnh 0,1 m tie hàng loạt — thứ tự khớp closed-form, 4 thuật toán tối ưu lệch ≤1e-9; fixture 2 đảo → found=false sạch cả 10 thuật toán + multiroute, không treo; G_real liên thông mạnh 2118/2118 cả 2 chiều.
- `gen_teaching_doc.py` tái sinh → **byte-identical** 380 dòng (kiểm độc lập 2 lần: Lượt 2 chạy thật + restore, Lượt 6 chạy bản copy đổi output) — cam kết "khớp 100% GUI" đứng vững với data hiện tại.

**Dữ liệu (Lượt 1 + 2):**
- 40 cặp OD (20/graph): 0 cặp đường-ngắn-hơn-chim-bay; 6 cặp >1,8× đều có căn cứ địa lý (một chiều Q1, hai bờ sông — bảng trong audit_tmp/luot1); tốc độ suy ra 80 lượt đều trong [10,50] km/h, 07:30 chậm hơn 22:00 đúng chiều, 0 ca đảo ngược.
- Profiles cả 2 graph: trục chính 07:30 mean 4,23 vs 22:00 1,48–1,52; đêm < trưa < đỉnh; 100% cạnh tuân luật synthetic DATA.md §5; free_speed real 4699/4699 khớp tuyệt đối bảng DATA.md §3.
- Hình học: `length_m ≥ haversine(u,v)` trên **toàn bộ** 4 699 + 253 cạnh (chuỗi admissibility nguyên vẹn); oneway nhất quán topology 100%; profiles demo phủ đúng 253 edge id × 4 slot; 253 cạnh co (gồm ~112 cạnh repair) khớp contract từng field với shortest path thật của G_real — 0 mismatch; v_max demo = real = 45 km/h; 0 cạnh name=null.
- Bất biến demo/real không thể "vỡ về sau" qua bước SCC (chứng minh phản chứng); prune deterministic; `check_demo_invariant` chặn vĩnh viễn mọi lần build.

**API (Lượt 3 — 49 ca):** n9999→404 đúng envelope; node rác/thiếu trường/JSON hỏng/enum lạ/beam_width 0/-1→422 đúng; held_karp k=16→422 HELD_KARP_LIMIT đúng, k=15 chạy 410–936 ms; stops rỗng/trùng/start-trong-stops→422; include_trace default đúng §B.3; cắt trace 5000 + trace_truncated đúng end-to-end; /api/benchmark 200 đủ 7 exp/5 422 rows (exp3 = 4 000 đúng); found=false có kiểm soát (beam k=1); không ca nào treo ngoài L3-02.

**Frontend (Lượt 3):** `npx tsc --noEmit` = 0 lỗi; 10 layer deck.gl được audit — chỉ sót 1 trigger (L3-03); format số VN đi qua fmtVi ở mọi nơi trừ /benchmark (L3-07); màu ngoài token duy nhất là 2 hex chấm Đi/Đến — trùng đúng token chipStart/chipGoal cố định 2 theme (đúng thiết kế v9d); double-click các nút Chạy/Tối ưu/So sánh đều có disable đúng.

**Dựng từ 0 (Lượt 5 — 0 finding):** clone sạch không .env: venv 3.14 + 44 wheel không build; pytest **79 passed**; validate "ALL DATA VALID"; uvicorn không cần key, /api/route trả đúng 1891,8 m cặp quy chiếu; npm install + dev Ready 12,2 s, GET / và /benchmark 200; **0 hardcode đường dẫn máy cá nhân** trong file tracked; clone đủ data/ + results/ cho giảng viên; .env.example có mặt, không lộ secret. (2 lần đổi port hoàn toàn do máy audit đang chạy server của chính user.)

**Hồ sơ chấm (Lượt 4 + 6):** rubric 9 dòng = đúng 100đ, BaoCao phủ 10/10 mục 4.9a–j theo nội dung thật; Video-KichBan phủ 13/13 hạng mục 4.10; Slide 14 trang map đủ 9/9 dòng rubric; NetworkX đúng 2 import (test + benchmark baseline) — 0 trong code sản phẩm; 10/10 thuật toán + 3/3 TSP tự cài. **Sổ số liệu: toàn bộ số trong 4 deliverable khớp nguồn hiện tại** (điểm nhấn: bảng exp3 mục g khớp 40/40 số với aggregate pandas từ 4 000 dòng CSV; exp7 khớp 9/9; "21 170 điểm" exp2 giải thích được = 21 180 − 10 goal). Cảnh báo SỐ TẠM có ở 4/4 file deliverable. Marker sót ngoài khung chủ đích: **0**. manual_risks: không có link bịa (8/8 TODO chữ — việc tay như đã ghi).

---

## 4. Nghi vấn chưa chứng minh

1. **L3-03/L3-04 chưa quan sát trong browser thật** (môi trường audit không có browser): cơ chế đã tái lập ở tầng deck.gl `diffProps` chạy thật + đọc code zustand; 2 chuỗi thao tác kiểm tay (<1 phút/chuỗi) ghi sẵn trong bảng phát hiện — nhóm nên bấm thử trước khi fix.
2. **message_vi lai tiếng Anh** ở lỗi 422 ("Tham số không hợp lệ: body.start: Field required") — SCHEMA chỉ đòi "nêu trường sai" nên không tính lỗi; chuẩn "tiếng Việt có nghĩa" đạt một nửa, nhóm tự cân nhắc.
3. **repair_invariant có kịch bản giả định không hội tụ** (mọi cặp POI dọc dist-path đã có cạnh contract theo time-path) → abort. Không tái lập trên data hiện tại; là abort CÓ CHỦ ĐÍCH kêu to lúc build + validator chặn sau — không bao giờ ra data sai âm thầm.
4. **"raw 2 230 node / 4 922 cạnh" trước SCC** (BaoCao:127, DATA.md §7): cache graphml đã là hậu-SCC nên không kiểm được offline; chuỗi số nhất quán (2 118 ✓, 4 721−22=4 699 ✓) nên không nghi sai.
5. **Tên đường "Phạm Khắc"** trên cạnh co e00234: cơ chế "tên theo đoạn dài nhất" đúng code; tính xác thực tên OSM ngoài đời không kiểm được offline; chỉ là nhãn hiển thị.
6. **Cận trên thời gian idastar+trace real** (L3-02 đo cặp xa nhất 41,9 s): chưa quét mọi cặp, có thể tồn tại cặp tệ hơn (benchmark không-trace từng ghi nhận 19,5 triệu expansion).
7. **Card multiroute GUI hiện "53,6%"** đúng cảnh video 17:30: số khớp CSV nhưng chưa bấm end-to-end với đúng 9 điểm EXP7_STOPS; kịch bản video **không liệt kê tên 9 điểm** — đã đưa vào checklist mục 7.
8. **npm audit "3 high vulnerabilities"** (transitive của hệ Next 15) — không chứng minh được hệ quả cụ thể cho việc chấm/demo.

---

## 5. Chưa kiểm + lý do

- **Chạy lại benchmark / pipeline 00→04 / 03a-03b trỏ data thật** — cấm theo luật kiểm toán (ghi đè data/, results/); logic build chỉ kiểm qua import hàm + bản copy đổi path.
- **Nhánh TomTom của 03b** (ratio→mức, bán kính 250 m) — không có snapshot trong data/raw/tomtom/ để chạy; sẽ chỉ kiểm được sau lượt crawl thật.
- **GUI sống trong browser** (animation, kéo timeline, screenshot, 2 theme render thật, WCAG đo lại) — không có browser automation; đã kiểm ở mức code + tsc + HTTP smoke.
- **Nội dung pixel 11 file PNG** (figs + exp6_routes + preview) — chỉ kiểm tồn tại; đối chiếu hình-vs-số là việc mắt của nhóm khi dán vào báo cáo.
- **Toán trong HEURISTIC-PROOF.md** (Bổ đề 1–3, Định lý 1–3) — ngoài phạm vi lượt nào; các con số được trích từ nó (3 cm, v_max 45) đều khớp; thực nghiệm exp2 0 vi phạm/21 170 điểm ủng hộ.
- **Đối chiếu risk-flag OR cạnh-theo-cạnh 253 cạnh demo với hành lang real** — mới kiểm qua hệ quả chi phí tổng thể (và đã lộ L1-01 ở phía real).
- **CORS ngoài localhost:3000, chịu tải song song, memory leak chạy lâu** — ngoài kịch bản chấm 1 người dùng.
- **Toạ độ 51 POI so thực địa** — cần Google Maps; nhóm đã review tay 2026-07-26 (TIENDO).

---

## 6. Hai mươi câu hỏi vặn + ý trả lời (file bằng chứng kèm theo)

> 19/20 trả lời được bằng tài liệu sẵn có. **Câu 3 hiện KHÔNG trả lời nổi theo cách không-vòng**
> (đúng trọng tâm L4-01/L4-02); câu 4 mỏng (L4-06). Sau khi fix L4-01 thì câu 3 có đáp án chuẩn.

1. **Heuristic admissible/consistent chứng minh đâu?** → HEURISTIC-PROOF.md (Bổ đề 1–3, Định lý 1–3, §6b xử lý làm tròn) + exp2: 0 vi phạm/21 170 điểm. `results/exp2_admissibility.csv`.
2. **Vì sao quy chi phí về giây thay vì α·dist+β·time+γ·cong — trái đề không?** → Không: đủ các thành phần đề nêu, cùng thứ nguyên nên phép cộng có nghĩa, penalty đọc được, chứng minh heuristic sạch. `BaoCao:74-77,101-104; Lab1-ChotPhuongAn §3`.
3. **γ=1,5 lấy đâu ra, nhất là khi số đang synthetic?** → **[KHÔNG TRẢ LỜI NỔI hiện tại]** — exp5 tự đo bằng thước γ=1,5 (`benchmark.py:317-318`); đáp án đứng vững phải là: "hằng số thiết kế (kẹt cấp 5 = 2,5× thời gian thoáng) + exp5 chứng minh kết luận ÍT NHẠY (~2,6% cả dải γ∈[0,3])" — chưa tài liệu nào viết vậy → L4-01, L4-02.
4. **Penalty 60/90/30/25 căn cứ gì, sao lô cốt 90 > ngập 60?** → Mỏng: chỉ có lập luận "đơn vị giây đọc được"; đỡ bằng HEURISTIC-PROOF:113 (chứng minh đúng với mọi penalty ≥ 0) → L4-06. *(Lưu ý thêm L1-01: trên G_real một điểm risk thực tế đang bị tính 13–17 lần.)*
5. **Một chiều xử lý sao trong heuristic?** → Haversine là cận dưới hình học bất kể chiều (Bổ đề 1); BiDijkstra chiều ngược chạy trên đồ thị đảo cạnh. `search_advanced.py; GIAI-THICH §8`.
6. **Beam/Greedy không tối ưu — đưa vào làm gì?** → Minh hoạ trade-off bằng số (Greedy 62 expand/gap 60,9%; Beam k=50 miss 1,5%); app không nói dối: explanation phân nhánh optimal_guarantee + gap. `explain.py; TIENDO Phase 4b`.
7. **IDA* ε=5 s nghĩa là gì — còn tối ưu không?** → Ngưỡng nới tối thiểu mỗi vòng; nghiệm trong C*+ε, trả `epsilon_bound`; test ε→0 khớp exact. `TIENDO Phase 3; GIAI-THICH §9`. *(Nếu bị hỏi ε ở mode distance: xem L2-01 — trả lời "ε theo đơn vị của mode".)*
8. **ATSP khác TSP? Vì sao Held-Karp đúng cho bất đối xứng?** → Ma trận bất đối xứng do một chiều (BT→SC 266 vs SC→BT 232); DP theo tập con không giả định đối xứng; test khớp brute-force n=7 cả 2 chiều return_to_start. `GIAI-THICH §11; tsp.py`.
9. **Hai tầng demo/real có phải gian lận benchmark?** → Mọi số benchmark trên G_real 2 118 node; G_demo chỉ để giảng, bị cưỡng chế bất biến ≤1,5×/≤1,8× so đường thật từng cặp POI bằng validator + regression test. `TIENDO 26/07`. *(Biết trước điểm yếu: mode balanced chưa nằm trong bất biến — L1-01.)*
10. **NetworkX ở đâu — phạm luật tự cài không?** → Chỉ `tests/test_search.py:11` + `benchmark.py:28` (baseline); sản phẩm thuần Python+heapq. **Nhắc: mail xin xác nhận giảng viên CHƯA GỬI.**
11. **Số synthetic thì kết luận nào còn đứng?** → Đứng: exp1, exp2 (proof chỉ cần c≥1, γ≥0, penalty≥0), nhóm tối ưu gap=0. Sẽ đổi số: exp3, exp4 83,5%, hình dạng exp5, exp7 53,6% (cảnh báo TẠM đã gắn 4 file). *(Sau fix L6-01 thì câu này trả lời trọn vẹn cả phần số chạy tay.)*
12. **BFS không tối ưu mà found 100%? gap 39,3% là gì?** → SCC nên luôn có đường; BFS tối ưu SỐ CẠNH; gap = % chi phí vượt tuyến tối ưu. `DATA.md; exp3`.
13. **Vì sao goal-test khi POP?** → Test khi sinh có thể trả nghiệm chưa tối ưu (UCS/A*); thống nhất cả 10 thuật toán cho video nhất quán. `TIENDO Phase 2d`.
14. **UCS với Dijkstra là một — đếm 2 có phồng không?** → Nhóm tự khai quan hệ (GIAI-THICH §5); bỏ Dijkstra vẫn còn 5 bổ sung (đề đòi ≥2).
15. **Luật dừng BiDijkstra top_f+top_b ≥ μ — chứng minh đâu?** → Không có proof giấy (điểm mỏng tự khai); kiểm thực nghiệm khớp Dijkstra 1e-6 trên 150+20 cặp (Phase 3) + 2 160 phép so của kiểm toán này. `GIAI-THICH §8`.
16. **Chọn 2 điểm không tới được nhau?** → SCC nên mọi cặp tới được; found=false vẫn hợp lệ trong schema (Beam k=1 fail sạch); GUI hiển thị được. `TIENDO Phase 3`.
17. **Trace cắt 5 000 bước — animation lừa không?** → Cờ `trace_truncated` (SCHEMA); G_real mặc định include_trace=false; metrics đo đầy đủ không phụ thuộc trace. *(Biết trước điểm yếu: IDA*+trace vẫn tốn CPU sau cap — L3-02, nên fix trước khi demo.)*
18. **Ví dụ video có chép tutorial không?** → Đồ thị con 7 node từ G_demo thật, bảng sinh tự động từ chính code (`gen_teaching_doc.py`; kiểm toán xác nhận byte-identical 2 lần độc lập).
19. **Sao không real-time mà 4 khung giờ tĩnh?** → Chủ đích: demo tái lập 100%, không phụ thuộc mạng khi chấm (ChotPhuongAn §10); real-time ở Future Work mục j.
20. **Beam k=5 tệ hơn k=2 — bug à?** → Semantics "đã vào beam là chốt" (xác minh code Phase 3, không phải bug); đã viết thành "nghịch lý đáng giảng" + chú thích frontier hiển thị ứng viên trước khi cắt k. `GIAI-THICH §10; TIENDO 26/07 vòng 2d`.

---

## 7. CHECKLIST VIỆC TAY trước khi nộp

**Bắt buộc (thiếu là mất điểm/không chấm được):**

1. ☐ **Điền 40 ô/khối [ĐIỀN]** trong BaoCao-Khung (tên/MSSV 5 thành viên, bảng phân công, prose từng mục) + **phân công mục c** (marker `CHƯA PHÂN CÔNG` dòng 71).
2. ☐ **Dán 8 source_url thật** vào `data/manual_risks.json` (hiện 8/8 là chữ "TODO: dán link…" — chưa có link nào, cũng không có link bịa).
3. ☐ **Gửi mail giảng viên** (`vntan.work@gmail.com`): xác nhận kịch bản shipper + việc dùng NetworkX làm baseline test.
4. ☐ **Lượt TomTom cuối:** crawl 03a đúng 4 khung giờ → 03b rebuild profiles (cả real lẫn demo) → `python -m app.benchmark` MỘT lượt → **thay số theo Sổ số liệu (Phụ lục A)** — cột "Đổi sau TomTom?" là danh sách cần thay. **Chú ý L6-01: phải thay CẢ số chạy tay trong prose (498/341/+46%/+157s/266/232/449) và chạy lại `gen_teaching_doc.py` SAU khi sửa generator hết hardcode** — nếu không video sẽ đọc số cũ.
5. ☐ **Chụp 8 screenshot GUI (chế độ TỐI)** + 5 ảnh Google Maps đối chứng exp6; đối chiếu bằng mắt hình PNG figs với số CSV khi dán.
6. ☐ **Quay video 18–25′** theo Video-KichBan; cảnh multiroute **phải chọn đúng 9 điểm EXP7_STOPS** (`benchmark.py:423-427`: Chợ Bến Thành, Nhà thờ Đức Bà, Bitexco, Chợ Tân Định, Thảo Cầm Viên, BV Từ Dũ, Bùi Viện, Chùa Vĩnh Nghiêm, CV Lê Văn Tám) thì card mới hiện đúng "53,6%"; đọc số theo màn hình (L6-03); upload xong **mở thử tab ẩn danh**.
7. ☐ **Xuất PDF báo cáo** (mục tiêu tự đặt 35–50 trang) + dựng slide từ 14 trang outline.
8. ☐ **Đóng gói `[GroupID].zip`** đủ 5 file theo đề §1 (bảng nguồn ở Phụ lục A-H): `SC.txt` (link GitHub — **⚠ repo đang khuyến nghị Private: phải public hoặc mời giảng viên TRƯỚC hạn chấm, nếu không link chết**), `Report.pdf`, `Slide.pptx/pdf`, `Video.txt`, `Data.zip` (graph_*.json + traffic_profiles_*.json + gdemo_pois + manual_risks + DATA.md; **loại data/raw/**). Khi nén repo: loại `node_modules/`, `.venv/`, `.next/`, `__pycache__/` (pyc chứa đường dẫn máy cá nhân), `audit_tmp/`, `.env`.

**Fix code/hồ sơ chờ lệnh batch (không tự làm trong cuộc kiểm này):** L1-01 · L3-01 · L3-02 · L3-03 · L3-04 · L4-01 · L4-02 · L4-03 · L4-04 · L6-01 (kèm L4-05) · nhóm MINOR/NIT. Sau batch: chạy lại pytest + `gen_teaching_doc.py` + check_contrast; các fix chạm costs/data (L1-01) phải rebuild + rerun benchmark trong cùng lượt TomTom cuối để chỉ tốn một lần thay số.

---

## 8. PHỤ LỤC

### A. SỔ SỐ LIỆU — checklist làm mới số sau lượt benchmark TomTom

Phương pháp: mọi số đọc lại THẬT từ nguồn (pandas trên `results/*.csv`, json trên `data/*.json`,
đếm graphml cache, pypdf trên đề). GIAI-THICH kiểm toàn cục bằng regen **byte-identical**.
Cột cuối: **ĐỔI** = phải thay sau lượt TomTom (số từ results/ hoặc phụ thuộc traffic_profiles);
**KHÔNG** = cấu trúc graph/hằng số/số test/hình học — giữ nguyên.

#### A.1 report/BaoCao-Khung.md

| Vị trí | Giá trị | Nguồn đối chiếu | Khớp? | Đổi sau TomTom? |
|---|---|---|---|---|
| L7 | PDF 35–50 trang | tự đặt (đề không quy định) | — | KHÔNG |
| L40–50 | rubric 10/15/20/10/10/10/10/10/5 = 100 | PDF đề §5 | ✅ từng dòng | KHÔNG |
| L44 | 1200/1200 khớp NetworkX | exp1: 1200 PASS, max lệch 0.0 | ✅ | ĐỔI |
| L45 | 6 thuật toán bổ sung | code | ✅ | KHÔNG |
| L63 | 1 433/4 699 cạnh một chiều | graph_real.json | ✅ | KHÔNG |
| L93–94 | γ=1,5; congestion [1..5]; penalty 60/90/30/25 | costs.py:16,18 | ✅ | KHÔNG |
| L105–106 | 790,8 s @γ=1,5 vs 811,8 s @γ=0 | exp5_gamma.csv (argmin=1,5) | ✅ | ĐỔI |
| L108 | 83,5% cặp đổi tuyến | exp4: 167/200 | ✅ | ĐỔI |
| L127 | 2 118 node (raw 2 230, SCC) | graph ✅; raw 2 230 unproven offline (cache hậu-SCC) | ✅/⚠ | KHÔNG |
| L128 | 4 699 (1 433 oneway); demo 51/253 (51) | 2 file graph | ✅ | KHÔNG |
| L129 | risk real 185/402/107/8 · demo 122/39/31/0 | đếm flags | ✅ cả 8 số | KHÔNG |
| L130 | bất biến ≤1,5× / ≤1,8× | validator + mốc L0 | ✅ | KHÔNG |
| L137 | 51 điểm G_demo | gdemo_pois.json | ✅ | KHÔNG |
| L151 | ε = 5 s | search_advanced.py:29 | ✅ | KHÔNG |
| L156 | 0 vi phạm / 21 170 điểm; h/h* ≈ 0,565 | exp2 (21 180 − 10 goal); max 0,5653 | ✅ | 21 170 KHÔNG; 0,565 ĐỔI |
| L159 | v_max 45 km/h | max free_speed 2 graph | ✅ | KHÔNG |
| L160 | A* 771 vs Dijkstra 1 226 | exp3: 770,7 / 1 226,0 | ✅ | ĐỔI |
| L234 | 200 cặp × 2 khung giờ | exp3: 400 dòng/thuật toán | ✅ | KHÔNG |
| L239–248 | bảng 10 thuật toán × (expand·ms·gap·found) | exp3 aggregate pandas — khớp 40/40 số (bfs 1242/0,9/39,3/100 · dfs 1036/19,0/1631,3/100 · iddfs 109 612/299,2/39,3/100 · ucs 1226/2,8/0/100 · dijkstra 1226/2,6/0/100 · astar 771/2,8/0/100 · greedy 62/0,2/60,9/100 · bidijkstra 751/2,7/0/100 · idastar 630 225/649,5/0,1/100 · beam 1075/3,0/22,4/98,5) | ✅ 40/40 | **ĐỔI cả bảng** |
| L255 | A*/BiDijkstra tiết kiệm ~37–39% | 37,1% / 38,7% | ✅ | ĐỔI |
| L259 | Beam lỡ 1,5% | 6/400 | ✅ | ĐỔI |
| L262 | 167/200 (83,5%) | exp4 | ✅ | ĐỔI |
| L266 | 5 cặp exp6 | exp6_pairs.json | ✅ | ĐỔI (time_s) |
| L277 | ma trận mini 266 vs 232 | GIAI-THICH regen | ✅ | **ĐỔI (L6-01 — số chạy tay)** |
| L284–291 | 7 662,1 / 3 557,5 / 53,6% / HK 2,8 / NN 0,7 / SA 29,3 / 3 564,6 ± 9,7 | exp7_tsp.csv — 9/9 | ✅ | ĐỔI |
| L315–323 | 8 screenshot | đếm = 8 | ✅ | KHÔNG |
| L337 | h/h* ≈ 0,565 | exp2 | ✅ | ĐỔI |
| L339 | narrow_alley real 8 / demo 0 | đếm graph | ✅ | KHÔNG |

#### A.2 report/Slide-Outline.md

| Vị trí | Giá trị | Khớp? | Đổi? |
|---|---|---|---|
| L1 | 14 slide | ✅ | KHÔNG |
| L16 | 10 thuật toán + 3 TSP | ✅ | KHÔNG |
| L19, L31–32 | 1 433/4 699 · 2 118/4 699 · 51/253 · ≤1,5× | ✅ | KHÔNG |
| L27 | γ=1,5 cực tiểu exp5 | ✅ số | ĐỔI (+viết lại câu theo L4-01) |
| L28 | 1 điểm ngập = +60 s | ✅ công thức | KHÔNG (câu chữ xem L1-01) |
| L39 | BFS 498 vs 341 (+46%) | ✅ | **ĐỔI (L6-01)** |
| L40, L81 | 1200/1200 ≤1e-6 | ✅ | ĐỔI |
| L46 | 0 vi phạm / 21 170 | ✅ | kết quả ĐỔI |
| L56 | 6 bổ sung; ε=5 s | ✅ | KHÔNG |
| L57–58 | Greedy 62/60,9% · k=50 1,5% | ✅ | ĐỔI |
| L62 | BT→SC 266 / SC→BT 232 | ✅ | **ĐỔI (L6-01)** |
| L63–64 | HK ≤15; 53,6% | ✅ | 53,6% ĐỔI |
| L79–80 | 10×200×2; −37%; gap nhóm tối ưu = 0 | ✅ | ĐỔI |
| L85, L87, L91 | 83,5% · 5 cặp · h/h*≈0,57 | ✅ | 83,5%/0,57 ĐỔI |

#### A.3 report/Video-KichBan.md

| Vị trí | Giá trị | Khớp? | Đổi? |
|---|---|---|---|
| L1+L101 | 18–25 phút | — tự đặt | KHÔNG |
| L26+L33 | 7 node / 23 cạnh | ✅ | KHÔNG |
| L37, L48 | 498 vs 341 (+46%); +157 s | ✅ | **ĐỔI (L6-01)** |
| L44–45 | 771 vs 1 226 | ✅ | ĐỔI |
| L46 | 45 km/h | ✅ | KHÔNG |
| L52–53 | ε=5 s; 630k expand | ✅ | 630k ĐỔI |
| L55 | k=50 lỡ 1,5% | ✅ | ĐỔI |
| L56–57 | 266 vs 232 | ✅ | **ĐỔI (L6-01)** |
| L65–66 | 83,5% | ✅ | ĐỔI |
| L72–73 | 2 118 nút; **"~7 ms"** | ⚠ lệch (nguồn mean 2,73 ms — L6-03) | ĐỔI |
| L74–75 | 9 điểm; card 53,6% | ✅ số / ⚠ cần đúng 9 điểm EXP7_STOPS | ĐỔI |
| L81–82 | "~1 000 expand" (⚠ nguồn 1 226 — L6-03); ~750 ✅; hàng trăm nghìn ✅ | ⚠ 1 số | ĐỔI |
| L83–85, L90 | 0/21 170 · ~3 cm · γ=1,5 · 1200/1200 · h/h*≈0,57 | ✅ | 3 cm KHÔNG; còn lại ĐỔI |

#### A.4 docs/GIAI-THICH-THUAT-TOAN.md

Kiểm toàn cục: regen (bản copy generator, đổi output) → **diff IDENTICAL 380 dòng** — mọi bảng
khớp code + data hiện tại 100%.

| Vị trí | Giá trị | Đổi sau TomTom? |
|---|---|---|
| L14 | 7 địa danh · 23 cạnh | KHÔNG |
| L34–58 | bảng w 23 cạnh (dùng profiles demo 07:30) | **ĐỔI** (congestion đổi) |
| L64, L69–75 | v_max 45; bảng h | KHÔNG (hình học) |
| §1–§10 | 498/341/449; số expand từng thuật toán | **ĐỔI — regen tự cập nhật, NHƯNG chỉ sau khi 03b demo rebuild** |
| L220–223 | 771 vs 1 226 (~37%) | ĐỔI — **regen KHÔNG tự cập nhật (hardcode gen_teaching_doc.py:308 — L6-01)** |
| L356–357 | 53,6%; 3 564,6 ± 9,7 | ĐỔI — **regen KHÔNG tự cập nhật (hardcode :396-397 — L6-01)** |

#### A.5 Trạng thái cảnh báo "SỐ TẠM"

| File | Cảnh báo đầu file? |
|---|---|
| report/BaoCao-Khung.md · Slide-Outline.md · Video-KichBan.md | ✅ L3–5 (phạm vi cần mở rộng — L6-01) |
| docs/GIAI-THICH-THUAT-TOAN.md | ✅ L8–10 (phạm vi thiếu — L6-01) |
| results/ | ❌ không có — L6-02 |
| README.md | không trích số benchmark → không cần |

#### A.6 data/manual_risks.json

8/8 `source_url` = placeholder `"TODO: dán link…"` (r01 Nguyễn Hữu Cảnh · r02 Đinh Tiên Hoàng ·
r03 Cống Quỳnh · r04 Calmette · r05 Trần Hưng Đạo · r06 Lê Thánh Tôn · r07 Hai Bà Trưng ·
r08 Võ Thị Sáu) — không có URL nào để kiểm, không có link bịa; việc tay #2 mục 7.

### B. Sáu lớp lỗi dữ liệu mà `scripts/validate_data.py` KHÔNG bắt được (Lượt 1)

Mỗi lớp đã dựng ví dụ chạy thật in-memory (`audit_tmp/luot1/probe_validate_gaps.py`) — mọi biến
thể hỏng đều PASS toàn bộ validator hiện tại:

| # | Lớp lỗi | Ví dụ lọt lưới | Hệ quả nếu xảy ra |
|---|---|---|---|
| A | `length_m` < haversine(u,v) | cạnh 56,6 m khi chim bay 566,4 m → PASS | heuristic hết admissible, A*/IDA* có thể trả tuyến không tối ưu |
| B | free_speed vô lý | 500 km/h → PASS | v_max nhiễm độc → h co ~11×, A*/Greedy/Beam gần như mù mà không test nào kêu |
| C | Profile phản thực tế (đảo 07:30↔22:00; 100% một mức) | PASS cả hai | exp4 + toàn bộ narrative ùn tắc vô nghĩa |
| D | Bất biến demo/real chỉ có CẬN TRÊN | cạnh co còn 0,5 m → PASS | G_demo "nhanh hơn vật lý cho phép" — chiều ngược của đúng lớp lỗi đã trị 26/07 |
| E | Risk flags rỗng toàn bộ | PASS (validator chỉ IN đếm, không assert) | balanced ≡ time, mất 1/3 số mode |
| F | meta.source nói dối | 'tomtom+synthetic' trên data synthetic → PASS | trích nguồn sai trong báo cáo — rủi ro thật ở lượt TomTom sắp tới |

Đề xuất vá (1 dòng/mục): (1) assert length ≥ haversine; (2) assert free_speed theo bảng DATA.md;
(3) assert mean(07:30) > mean(22:00) trên trục chính + mỗi slot ≥2 mức + 22:00 ⊆ {1,2};
(4) thêm SÀN ratio ≥ 1,0−ε vào check_demo_invariant; (5) assert tổng từng loại risk > 0 và khớp
±20% DATA.md §7; (6) đối chiếu meta.source với sự tồn tại data/raw/tomtom/.

### C. Bảng chấm rubric (Lượt 4 — vai giảng viên; bảng đầy đủ: `audit_tmp/luot4/bang_cham.md`)

| Rubric (điểm) | Bằng chứng | Mức tin |
|---|---|---|
| R1 Bối cảnh VN (10) | ChotPhuongAn §1; BaoCao b; 51 POI thật + manual_risks đặt đúng tuyến nổi tiếng | **CHẮC** (source_url chờ dán) |
| R2 Modeling + dataset + cost (15) | SCHEMA §A/§D; costs.py; dataset vượt chuẩn 20/30; HEURISTIC-PROOF | CHẮC cấu trúc — **MỎNG đúng chỗ "how weights are selected"** (L4-01/02/06 + L1-01) |
| R3 Cài đúng thuật toán bắt buộc (20) | search.py tự cài heapq; exp1 1200/1200; 79/79 test; bảng GIAI-THICH sinh từ code | **CHẮC** |
| R4 Thuật toán bổ sung (10) | 6 bổ sung (đề đòi ≥2) + exp3 | **CHẮC** |
| R5 Multi-location (10) | tsp.py HK/NN+2opt/SA; ATSP bất đối xứng có ví dụ số; exp7 | **CHẮC** (một vết L4-03) |
| R6 GUI + visualize search (10) | Đủ 4.7; animation frontier/expanded + bảng g/h/f; 8 [SCREENSHOT] chờ chụp | **CHẮC theo code** — chùm L3 nên fix trước demo |
| R7 Giải thích tuyến + so sánh (10) | explain.py đúng format ví dụ 4.8; ≥1 alternative thật; exp4 làm chất liệu | **CHẮC** (trừ L3-01 start=goal) |
| R8 Báo cáo (10) | Khung 10/10 mục chuẩn; số đã verify | **MỎNG chủ đích** — chấm được sau khi điền |
| R9 Video (5) | Kịch bản phủ 13/13 mục 4.10 | **MỎNG chủ đích** — chưa quay |

---

*Hội đồng DỪNG tại đây theo đúng luật kiểm toán — không sửa file nguồn nào. Chờ lệnh fix theo batch.*
