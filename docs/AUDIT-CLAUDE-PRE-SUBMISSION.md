# Audit Claude trước khi bàn giao — ảnh chụp lịch sử

> **Phạm vi thời gian:** báo cáo nguyên bản Claude gửi trước lượt onboarding Codex
> ngày 2026-07-27. Toàn bộ số test, graph count, trạng thái B-* và kết luận bên
> dưới chỉ phản ánh snapshot lịch sử, không phải trạng thái hiện hành. Audit
> documentation/route-contract refresh ngày 2026-08-08 có 177 backend test, 41 frontend test,
> `ALL DATA VALID` và TypeScript pass; tra `README.md`, `data/DATA.md`,
> `docs/SCHEMA.md` và phần current-state của `docs/CODEX-CODEBASE-MAP.md`, rồi
> vẫn xác minh bằng lệnh fresh. Catalog hiện hành có 9 route; mọi dòng 10 thuật
> toán/Dijkstra và “8 source_url placeholder” trong nguyên bản bên dưới chỉ là
> bằng chứng lịch sử. Tám URL đã được review/tích hợp ngày 2026-08-08 với giới
> hạn nguồn sự kiện lịch sử ở cấp tuyến/khu vực.
> Nội dung gốc được giữ bên dưới để bảo toàn bằng chứng và mạch quyết định.

## Báo cáo nguyên bản

**BÁO CÁO KIỂM TRA TOÀN DIỆN TRƯỚC KHI NỘP — Project01**
Kết luận tổng quan: Phần kỹ thuật (code, data, test, toán học) ở trạng thái rất tốt — 82/82 test pass, data hợp lệ, heuristic được chứng minh lại độc lập là admissible + consistent, NetworkX cách ly tuyệt đối, seed đầy đủ. Nhưng chưa nộp được ngay: 25/100 điểm rubric (báo cáo 10đ + video 5đ + một phần các mục khác) phụ thuộc vào deliverables còn ở dạng khung; toàn bộ số benchmark trong results/ là của data cũ 26/07 (đo được 65/200 cặp lệch chi phí); và có 3 lỗi hiển thị trace/đơn vị sẽ lộ ngay trong video giảng thuật toán. Tổng cộng: 6 BLOCKER, 14 NÊN SỬA, ~20 GÓP Ý. Không có lỗi toán học hay lỗi bảo mật nào ở mức nghiêm trọng.

1. Kiểm chứng đã tự chạy (không tin docs)
Lệnh	Kết quả
pytest backend/tests/ -v	✅ 82 passed / 17,5s (khớp con số README/TIENDO)
scripts/validate_data.py	✅ ALL DATA VALID — G_real 2118/4699, G_demo 51/292, profiles 4×100%, 6 bất biến demo/real đạt
npx tsc --noEmit	✅ 0 lỗi
Smoke 6 endpoint trên server live	✅ health/graph/traffic/route/multiroute/benchmark đều 200; node lạ → 404 envelope NODE_NOT_FOUND đúng §C.7
Đo idastar G_real (code + data hiện tại)	✅ 3,8s không trace / 4,2s kèm trace, cắt đúng 5000 bước; cost 1173,8 = tối ưu + 3,7s ≤ ε=5 ✓
⚠️ Phát hiện khi smoke: backend + frontend đang chạy trên máy là process cũ từ 26/07 — trả về G_demo edge_count:141 (bản dữ liệu méo khoảng cách đã bị audit loại bỏ) do lru_cache giữ trong RAM, và idastar mất 23,8s (code cũ trước fix _Recorder.active). Code hiện tại trên đĩa không có 2 vấn đề này → xem BLOCKER-6.

2. Bảng đối chiếu rubric 100 điểm với sản phẩm thực tế
Tiêu chí (điểm)	Trạng thái	Ghi chú giám khảo
Bối cảnh giao thông VN thực tế (10)	✅ Mạnh	Shipper Q1 TP.HCM, 51 POI thật, congestion 4 khung giờ, ngập/lô cốt có toạ độ thật. Rủi ro: 8/8 source_url trong manual_risks.json còn placeholder
Mô hình đồ thị + dataset + cost (15)	✅ Mạnh	Đủ thuộc tính cạnh đề yêu cầu; vượt xa mức "≥20 node/30 cạnh"; cost quy về giây có lập luận + exp5 độ nhạy γ. Rủi ro: số exp5 đang là số cũ (BLOCKER-1), mô tả luật risk trong manual_risks.json mâu thuẫn DATA.md (NÊN SỬA-8)
Cài đúng 4 thuật toán bắt buộc BFS/DFS/UCS/A* (20)	✅	exp1 1200/1200 khớp NetworkX; test 91 800 phép so trên G_demo; goal-test thống nhất tại pop; trace 4 thuật toán này sạch
≥2 thuật toán bổ sung (10)	✅ Vượt (6+3)	dijkstra, greedy, bidijkstra, idastar, beam, iddfs + Held-Karp/NN-2opt/SA. Nhưng 2/6 có lỗi hiển thị trace (BLOCKER-3)
Tối ưu đa điểm (10)	✅ Mạnh	ATSP bất đối xứng đúng cách, Held-Karp ground truth, SA 5 seed, savings % + so thứ tự gốc, optimal_guarantee rõ ràng
GUI + visualize từng bước (10)	✅ nhưng có lỗi lộ khi demo	Animation/frontier/g-h-f/so sánh/multiroute đầy đủ. Lỗi: /benchmark không cuộn (BLOCKER-5), Space bị cướp phím, contrast theme Sáng
Giải thích tuyến + so alternatives (10)	✅	summary_vi số liệu thật, ≥1 alternative, nêu gap so tối ưu. Lỗi đơn vị ở mode Ngắn nhất (BLOCKER-4)
Báo cáo kỹ thuật (10)	❌ Chỉ có khung	BaoCao-Khung.md đủ 10 mục a–j, marker đầy đủ, bảng exp3 khớp CSV 40/40 ô — nhưng còn 31 chỗ [ĐIỀN], chưa export PDF
Video demo (5)	❌ Chưa quay	Kịch bản 18–25 phút bám checklist 4.10 đã sẵn
Đóng gói nộp (§1 đề)	❌ Chưa làm	Chưa có [GroupID].zip với 5 thành phần; chưa điền tên nhóm A–E; mail xác nhận giảng viên chưa gửi (TIENDO.md ghi nhận)
3. 🔴 BLOCKER — phải xử lý trước khi nộp
B-1. Toàn bộ số trong results/ là của data cũ 26/07 — bắt buộc chạy lại benchmark, kể cả khi không kịp TomTom.
Data đã rebuild 27/07 (risk theo vùng, G_demo 292 cạnh) nhưng exp1–7 chưa chạy lại. Agent đã đo mức lệch thật: 65/200 cặp lệch chi phí balanced (cặp nặng nhất −57%: 1552,3s → 666,3s); headline exp4 "83,5% đổi tuyến" chạy lại sẽ là 85,5% — con số này đang nằm ở 6 vị trí trong deliverables. Cảnh báo "SỐ TẠM" có đủ và trung thực, nhưng nộp bài với số không tái lập được từ data đã nộp là vi phạm chính cam kết tái lập 100% của nhóm. Quy trình thay số đã có sẵn trong hdcrawl.md — chỉ cần thực thi (kèm 2 lỗi nhỏ của chính checklist đó: xem NÊN SỬA-9).

B-2. Ba trên năm thành phần nộp chưa tồn tại — báo cáo PDF (31 [ĐIỀN]), video, slide; cộng tên thành viên, 8 source_url, 8 screenshot + 5 ảnh Google Maps, gói ZIP. Đây là việc nhóm đã lên lịch (KIEMTOAN §7 còn nguyên 8 ô ☐), nhưng ở góc nhìn giám khảo: ~25 điểm rubric hiện chưa có vật chứng. Lưu ý thứ tự: phải làm SAU B-1 vì báo cáo/slide/video đều trích số benchmark.

B-3. iddfs + idastar chụp frontier TRƯỚC khi expand — 8 thuật toán kia chụp SAU (đúng SCHEMA §B.3 "ngay SAU khi expand xong").
search.py:262-274, search_advanced.py:246-262. Hậu quả đã in vào tài liệu giảng: bảng IDDFS/IDA* trong GIAI-THICH-THUAT-TOAN.md hiện frontier ∅ ngay bước expand node có 3 cạnh ra; GUI animation hiện node expand không có láng giềng. Đề mục 4.10a yêu cầu video show "the generated frontier" — giảng theo bảng này là dạy sai, giám khảo so với UCS cùng đồ thị sẽ thấy mâu thuẫn ngay. Kèm theo cùng nhóm: bidijkstra in BT=0 trong frontier backward (lấy min trên map khoảng cách thay vì trên frontier — search_advanced.py:174-176). Sửa nhỏ (di chuyển record sau vòng push + lọc theo frontier), sau đó bắt buộc regen teaching doc + đồng bộ số sang Video/Slide/BaoCao (workflow gen_teaching_doc đã tự đọc CSV nên regen là đủ).

B-4. explain.py in đơn vị "s" cho đại lượng tính bằng MÉT ở mode Ngắn nhất — explain.py:295-306: câu "đắt hơn tuyến tối ưu ~420 s" thực chất là 420 m; cùng lỗi cho chuỗi "ε = … s" (explain.py:289-290). Nhánh này chạy cho cả 5 thuật toán không-tối-ưu ở mode distance — kịch bản so sánh thuật toán trong video gần như chắc chắn giẫm phải. Sửa 2 dòng (helper đơn vị theo mode đã có sẵn trong chính file này).

B-5. Trang /benchmark không cuộn được — body có overflow-hidden (layout.tsx:36) áp toàn app; trên màn 1366×768/máy chiếu, biểu đồ γ (chốt hạ của kịch bản video phút 22) bị cắt, không scrollbar. Sửa: chuyển overflow-hidden xuống shell trang bản đồ, hoặc cho /benchmark container cuộn riêng.

B-6. Trước MỌI buổi demo/chụp screenshot/quay video: restart backend + hard-refresh frontend.
Không phải lỗi code — nhưng ngay lúc này máy bạn đang phục vụ G_demo 141 cạnh (data lỗi cũ) và idastar 23,8s. Screenshot/video quay từ process này sẽ chứa số liệu sai không khớp báo cáo. Đề nghị ghi 1 dòng vào mục pre-flight của hdcrawl.md/README: "kill uvicorn + npm dev, chạy lại, F5 cứng, kiểm edge_count = 292 qua /api/graph".

4. 🟡 NÊN SỬA — đáng làm nếu còn thời gian (xếp theo độ lộ khi chấm)
Timeline cướp phím toàn cục — timeline.tsx:48-67: khi đã có trace, Space trên switch/select đang focus bị preventDefault thành play/pause; mũi tên bước ×2 trên slider. Thêm điều kiện bỏ qua khi target là button/[role=...].
IDA/IDDFS không có giới hạn thời gian, GUI cho nhập ε tới 0,1* — control-panel.tsx:307-317, models.py:299-300: một request có thể chạy nhiều phút, UI khoá cứng, không có nút huỷ, F5 vẫn để thread tính tiếp (agent đo được: idastar mode distance có cặp cần 8 triệu expansions). Cap ε server-side (vd ge=0.5, le=600) + budget thời gian trả found=false có cờ, hoặc tối thiểu: đừng demo ε nhỏ trên G_real.
Beam: frontier trong trace là pool chưa cắt (>k phần tử) — search_advanced.py:321-327 — mâu thuẫn SCHEMA §B.3 "≤ k"; và max_frontier của beam/idastar mâu thuẫn với chính bảng trace (search_advanced.py:352, :263). Theo luật "schema trước code": hoặc sửa code, hoặc amend SCHEMA + chú thích GUI — hiện đang lơ lửng giữa hai (KIEMTOAN có ghi chú nhưng SCHEMA chưa đổi).
IDA hết 1000 vòng vẫn trả optimal_guarantee=true + found=false* — search_advanced.py:267-270. Không kích hoạt được trên data hiện tại (agent đã đo biên) nhưng là lời hứa sai về mặt lý thuyết; đặt optimal_guarantee=false khi cạn vòng.
Theme Sáng rớt contrast chữ màu nhỏ (badge "Đảm bảo tối ưu" ~3,1:1, nhãn nhóm thuật toán, header cột So sánh, "mức x/5" — cần 4,5:1) — badge.tsx:11-13 và các vị trí agent liệt kê. check_contrast.py chỉ đo màu bản đồ nên lọt. Nếu không kịp: quy ước demo/screenshot ở theme Tối (đã là quy ước sẵn) và ghi hạn chế.
Chống rủi ro wifi phòng bảo vệ: offlineMode không được persist (store.ts:98, :112) — F5 là quay lại gọi Carto; và next/font/google cần mạng ở lần build/dev-compile đầu (layout.tsx:2) — clone mới offline sẽ không chạy được. Persist offlineMode + cân nhắc font local; tối thiểu ghi vào README "build 1 lần khi còn mạng".
store.set() invalidate cả khi giá trị không đổi — store.ts:134-162: re-chọn đúng dropdown đang chọn cũng xoá kết quả khỏi bản đồ — giám khảo rất hay bấm lại. So sánh giá trị cũ/mới trước khi invalidate.
manual_risks.json meta.description_vi còn mô tả luật CŨ ("đầu mút trong bán kính") — mâu thuẫn DATA.md và lập luận mục c báo cáo ("cạnh ĐI VÀO vùng"); file này nằm trong Data.zip sẽ nộp.
Sửa 2 lỗi của chính bộ docs vận hành: results/README.md:18 nói exp1 đối chứng "10 thuật toán" (thực tế 3: ucs/dijkstra/astar); checklist gỡ banner trong hdcrawl.md:118-121 đếm 4 file nhưng thực tế 5 — sót đúng results/README.md (file này lại được dặn "không bị đụng" khi ghi đè kết quả → sẽ nộp với banner "SỐ TẠM" đã hết đúng).
ValidationError (Pydantic) đang bị map thành 422 đổ lỗi client — main.py:90-94: bug server tương lai sẽ hiện "Yêu cầu không hợp lệ" kèm text validator nội bộ; thêm isinstance(exc, pydantic.ValidationError) → 500 INTERNAL.
UI cho phép "Đi" trùng điểm giao → 422 với message nửa tiếng Anh "start must not appear in stops" — control-panel.tsx:150-156; lọc stops khỏi picker start như đã làm chiều ngược lại.
README biến thể bash sai thực tế — README.md:68-70: "các lệnh còn lại giữ nguyên" để nguyên backslash trong đối số (backend\requirements.txt → Git Bash hiểu thành backendrequirements.txt); PROMPT-MASTER luật 10 yêu cầu đủ 2 shell.
Pulse ring rebuild toàn bộ layer deck.gl 20 lần/giây khi có trace trên màn (map-view.tsx:90-97 + dep pulse của layers memo) — với "Trace trên G_real" là ~5–6k object/tick; tách pulse ra layer riêng. Kèm: nút "Xoá mọi thứ" không confirm/undo — một misclick giữa video là mất 15 điểm giao đã chọn.
max_frontier của dfs/iddfs/bidijkstra tính O(frontier·log) mỗi bước cả khi không trace (search.py:197-199, :262-264, search_advanced.py:169-170) — 7 thuật toán kia O(1); cột runtime exp3 đang bất lợi hệ thống cho đúng 3 thuật toán này. Nếu không sửa trước khi chạy lại benchmark (B-1), thêm 1 câu caveat vào mục g báo cáo.
5. 🟢 GÓP Ý — không chặn nộp
Trace/hiển thị: f hiển thị ≠ round(g)+round(h) lệch 0,1 ở ~1/3 số hàng trong khi GUI in caption "f = g + h" (tính f từ g,h đã round là hết); start==goal trả trace: [] kể cả include_trace=true → animation trống dù có route.
Vệ sinh code: dict OPTIMAL_GUARANTEE chết (search.py:37-40) + import sys thừa trong main.py — xoá; docstring greedy mô tả cơ chế "track g" không tồn tại; beam_width=0 rơi về default do or; thiếu assert gamma >= 0 cho reweighted(); docstring _best_first nên ghi tiền đề w>0; print() trong tsp.py khi n≥13 → logging; EMPTY_EXPLANATION dùng chung 1 instance mutable.
Test/chứng minh: test consistency chỉ lấy mẫu 3 goal trong khi HEURISTIC-PROOF.md:138 nói "mọi" — thay bằng chặn goal-independent (agent đã tính sẵn: mạnh hơn và rẻ hơn 36×); đổi tên DEFAULT_EPSILON_S (là mét ở mode distance) + ghi "(hiện tại)" cạnh v_max=45 trong HEURISTIC-PROOF.
Docs nội bộ: SCHEMA.md:350 còn 1 chỗ "ε=5 s" chưa theo L2-01; KIEMTOAN Phụ lục A lệch số dòng 2–13 dòng so với BaoCao hiện tại (hdcrawl §6 lại dặn đi theo file:dòng) + 2 hàng tự mâu thuẫn với D12/D14 + 1 checklist trỏ số đã không còn tồn tại; bảng phase TIENDO giữ số cũ (59/59, 141 cạnh…) — chấp nhận được như nhật ký nhưng nên thêm 1 dòng "số hiện hành xem entry 27/07".
A11y/UX nhỏ: thiếu prefers-reduced-motion toàn app; congestion 1→5 chỉ mã hoá bằng hue (CVD đỏ-lục khó phân biệt — cân nhắc độ dày theo mức); click hàng g/h/f nhảy bước là tính năng ăn điểm nhưng mouse-only + chỉ gợi ý qua hover title; <th> thiếu scope="col"; nút ✕/Xong/info-tip nhỏ hơn 24px; 2 <aside> không có aria-label phân biệt; "2 118" trong panel dùng space thường thay vì NBSP; color-scheme: dark chưa khai báo.
Khác: toast "xem tab Giải thích" nhưng mở tab Số liệu; swap khi đang tour-mode làm mất điểm Đi; comment tốc độ playback ghi tới 8× nhưng UI có 16×; /api/benchmark parse lại CSV mỗi call + gửi đủ 4000 rows trong khi trang chỉ dùng 10 điểm tổng hợp; ghi chú runtime_ms là wall-clock (không byte-reproducible) vào results/README; comment requirements.txt nên ghi networkx dùng cả cho test/benchmark; .claude/ + skills-lock.json đang untracked — thêm vào .gitignore cho repo nộp sạch.
6. ✅ Những gì đã xác nhận ĐÚNG (dùng được khi bảo vệ)
Quy tắc vàng giữ vững ở lõi: 10 thuật toán cùng 1 chữ ký + 1 model Pydantic extra="forbid"; validator per-algorithm cho g/h/f/side/depth_limit hoạt động 2 chiều; metrics không round, chỉ trace round 0,1; trace cắt 5000 giữ metrics full-run; models.py khớp SCHEMA field-for-field.
Đơn vị giây sạch trong thuật toán: không nơi nào cộng mét với giây; total_time_s luôn là weight balanced; heuristic cùng mode với weight ở cả 4 thuật toán dùng h (lỗi duy nhất là chuỗi hiển thị B-4).
Toán học: admissibility + consistency đúng trên mọi cạnh × mode × slot cả 2 đồ thị (kiểm bằng chặn mạnh hơn test suite; margin G_real 0,13mm chứng tỏ fix ceil_dm là cần thiết thật); BiDijkstra đúng qua 30 600 so sánh cạn kiệt trên G_demo + 1000 trên G_real (0 lệch); lập luận ε-optimality của IDA* biến thể best_g được chứng minh chặt; A* tie-break theo h đúng như đặc tả.
Cách ly & tái lập: NetworkX 0 vi phạm — cấu trúc import bảo đảm process API không bao giờ nạp nó; 5 module thuật toán thuần stdlib; backend 0 lệnh gọi mạng; SA đúng 5 seed 0–4, mọi RNG có seed, frontend không Math.random; tie-break heap có counter đơn điệu nên kết quả không phụ thuộc hash order.
An toàn/ổn định: không path traversal (whitelist file benchmark), không race (GraphStore immutable, gamma override chỉ tạo instance mới trong process benchmark riêng), stale-response guard phía frontend hoạt động đúng như quảng cáo, không bare except, không secrets trong repo.
Docs số liệu hiện hành: quét số cũ (253/141/402/60km/h/498/449…) 0 hit trong report/ + GIAI-THICH; bảng exp3 trong BaoCao khớp CSV 40/40 ô; DATA.md khớp code từng hằng số; khung báo cáo đủ 10 mục a–j, 6/6 hình tồn tại, bảng rubric cộng đúng 100.
7. Thứ tự hành động đề xuất (tôi không sửa gì — bạn quyết)
Sửa nhóm lỗi code nhỏ ảnh hưởng số liệu/demo: B-3, B-4, B-5 (+ NÊN SỬA 1, 2, 7 nếu kịp) → chạy pytest + regen teaching doc.
Chạy TomTom theo hdcrawl.md (hoặc quyết định bỏ TomTom) → B-1: benchmark một lượt duy nhất → thay số + gỡ banner 5 file (nhớ results/README.md).
B-6: restart backend/frontend, xác minh /api/graph trả 292 cạnh → chụp 8 screenshot + 5 ảnh Google Maps, quay video.
B-2: điền báo cáo (31 [ĐIỀN]), tên nhóm, source_url, export PDF, làm slide, đóng gói [GroupID].zip, gửi mail xác nhận giảng viên (kiểm tra link video ở tab ẩn danh).
Nếu bạn muốn, bước tiếp theo tôi có thể bắt tay sửa các BLOCKER code (B-3/B-4/B-5) — chỉ cần bạn ra lệnh.
