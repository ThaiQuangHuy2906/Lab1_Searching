# MUST TODO — Công việc còn lại trước khi nộp Lab 01

> **Final-audit refresh 2026-08-11:** baseline `main` / HEAD
> `821e77d38b41bb98e473be620b17c76e09a000d8`, initial tracked worktree clean.
> UI & Explanation v2 đã triển khai qua Phase 8; official-result closeout đạt
> backend 235/235, frontend 137/137, TypeScript, production build và
> `ALL DATA VALID`. Chrome
> Desktop full-view và hai ảnh README đã pass/capture lại trong lượt audit; nếu
> máy audit khác máy demo cuối: `FINAL DEMO-MACHINE PREFLIGHT REQUIRED`.
>
> File này lưu backlog tổng trước khi nộp. Bộ screenshot/report/slide/video nộp
> cuối vẫn chưa hoàn tất. Chuỗi benchmark/gamma/generator chính thức đã hoàn tất
> ngày 2026-08-11 và năm banner `SỐ TẠM` đã được đồng bộ/gỡ đúng cùng lượt. Các
> checkpoint/count 2026-08-08 ở §3.1 là lịch sử, không thay cho evidence closeout
> phía trên.
>
> Bằng chứng UI hiện hành được ghi tại §2, §3.1,
> `docs/UI-V2-PHASE8-READINESS.md` và `docs/CODEX-CODEBASE-MAP.md`; provenance số
> chính thức nằm tại `results/README.md`. Bộ ảnh nộp cuối, report PDF, slide thật,
> video và submission ZIP vẫn là việc thủ công chưa hoàn tất.
>
> **Tái xác minh read-only 2026-08-15:** 19/19 checksum trong ledger kết quả vẫn
> khớp; backend `235 passed`, frontend `137/137`, TypeScript và data validator
> đều đạt. Không chạy lại benchmark/gamma/generator.
>
> **Cập nhật contract 2026-08-08:** nhóm loại lựa chọn `dijkstra` độc lập vì
> trùng UCS; sản phẩm còn 9 thuật toán route và vẫn giữ Bidirectional Dijkstra.
> Benchmark/teaching artifact hiện hành là output của chuỗi có ủy quyền ngày
> 2026-08-11; nếu input fingerprint đổi thì phải hạ trạng thái về stale.
>
> **Cập nhật provenance 2026-08-08:** 8/8 `source_url` manual risk đã được
> review/tích hợp và data validator đạt. Nguồn chỉ hỗ trợ bối cảnh lịch sử ở cấp
> tuyến/khu vực; lượt mở tab ẩn danh trên máy nộp bài vẫn thuộc final link QA.

> **Ưu tiên giao việc ngay:** (1) chốt vai trò còn lại, chia 10 mục a–j và xử lý
> 23 marker nội dung report;
> (2) hoàn thiện/chốt report, slide, screenshot và video từ số chính thức;
> (3) mở lại các link nguồn bằng tab ẩn danh trong final link QA. Không tự rerun
> benchmark/gamma/generator nếu input chưa đổi và chưa có ủy quyền mới.

## 1. Trạng thái nguồn rủi ro thủ công

Biên bản review chi tiết, bằng chứng và caveat bắt buộc khi viết deliverable nằm
trong `manual_risks_sources_review.md` và `data/DATA.md` §2.1. File này chỉ giữ
những việc nộp bài còn mở.

Trạng thái `source_url`:

- ✅ cả 8 record có nguồn phù hợp và được mô tả trung thực là giả định minh họa;
- ✅ nội dung, ngày đăng và URL trực tiếp đã được review;
- ✅ `data/manual_risks.json` có 8 URL HTTPS, 0 `TODO`;
- ✅ data validator trả `ALL DATA VALID` sau tích hợp;
- ⬜ mở lại bằng tab ẩn danh trên máy/mạng nộp bài — giữ trong final link QA.

## 2. Trạng thái kỹ thuật hiện hành

Sau final audit, chưa phát hiện blocker bắt buộc nào trong core
backend/frontend/data ở các gate tự động:

- backend: `235 passed`, 1 Starlette/httpx dependency warning;
- data validator: `ALL DATA VALID`;
- frontend tests: `137/137` passed;
- TypeScript: `npx tsc --noEmit --incremental false` passed;
- production build: Next.js 15.5.22 compile/type/static generation 6/6;
- Chrome Desktop runtime đã pass ở màn hình vật lý 2560×1440, scale 150%,
  viewport CSS 1707×825/DPR 1,5: console sạch, keyboard/focus, reduced motion,
  loading/error/retry/cancel/stale guard và screenshot đều được kiểm;
- contrast checker: checkpoint UI Clarity 2026-08-08 đã pass đủ bảy theme; final
  audit 2026-08-11 không rerun vì không đổi token/màu;
- active frontend là `frontend/`;
- current `G_demo`: 51 node, 298 directed edge, gồm 60 one-way edge;
- current `G_real`: 2.118 node, 4.699 directed edge;
- profile hiện tại là `tomtom+synthetic`, đủ bốn slot `07:30`, `12:00`,
  `17:30`, `22:00`.

`results/` và generated teaching document là bộ chính thức ngày 2026-08-11.
Chúng được đối chiếu độc lập với input hiện hành; checksum/provenance và headline
nằm tại `results/README.md`. Runtime benchmark phụ thuộc máy, còn oracle/shape,
aggregate và fingerprint là bằng chứng ổn định.

## 3. Phase cải thiện UI đã hoàn thành

UI/frontend đã được triển khai theo phạm vi nhóm chốt. Trong phase này nhóm đã
giữ các ràng buộc sau:

- không chạy benchmark cuối;
- không chạy gamma calibration cuối;
- không regenerate numerical teaching document;
- không gỡ bất kỳ banner `SỐ TẠM` nào;
- không quay video cuối;
- không chụp bộ screenshot dùng cho bản nộp cuối, vì UI còn có thể đổi;
- không crawl lại OSM/TomTom;
- không rebuild graph/profile nếu phase chỉ thay UI;
- giữ API/schema/data contract hiện tại, trừ khi nhóm chủ động mở một thay đổi
  contract riêng và cập nhật đầy đủ consumer/tests/docs.

Các stop gate kết thúc phase đã được kiểm:

- kiểm tra route hai điểm;
- kiểm tra compare mode;
- kiểm tra multiroute/ATSP;
- kiểm tra animation/trace;
- kiểm tra dark/light và các theme còn lại;
- kiểm tra responsive ở 1366×768 hoặc đúng độ phân giải máy chiếu;
- kiểm tra console/network request;
- cập nhật hai README screenshot sau khi giao diện ổn định;
- freeze UI/code trước khi bắt đầu chuỗi benchmark và sản xuất deliverable cuối.

Từ thời điểm này không mở thêm feature/polish UI nếu không có lỗi ảnh hưởng demo,
rubric hoặc tính đúng. Ưu tiên chuyển sang provenance, report, benchmark cuối và
deliverable.

### 3.1. Phase UI Clarity đã freeze — evidence 2026-08-08

Các yêu cầu kết thúc phase ở trên đã được kiểm chứng trên worktree UI freeze
ngay trước thay đổi catalog, không dùng checkpoint trước phase làm bằng chứng thay thế:

- `frontend/` là frontend duy nhất được sửa; không dùng hoặc khôi phục
  `frontend1/`.
- Full route, compare, sequential route, trace/timeline, ATSP (Held-Karp,
  NN + local improvement, SA), scenario override/restore, G_real guardrail,
  offline/error/loading/empty state và `/benchmark` đã được chạy qua UI thật.
- Browser Chromium đã QA ở 1366×768, 1024×768, 390×844 (thêm 320×568): không
  có horizontal page scroll; keyboard/focus/Escape/focus trap, seven themes,
  reduced motion sau reload và console/network sạch ở clean session đã được
  kiểm. `GET /api/graph?level=demo&view=full` trả 51 node, 298 cạnh có hướng,
  60 cạnh một chiều; các request route/multiroute cuối cùng trả 200.
- Verification mới nhất sau contract route: `npm test` 41/41, `npx tsc --noEmit`,
  production build, backend pytest 177/177 (1 Starlette/httpx deprecation warning) và data
  validator đều đạt. `scripts/check_contrast.py` đạt cho đủ bảy theme.
- Hai ảnh README đã chụp trong lượt UI freeze sau clean restart/hard refresh,
  request thành công và được inspect ở độ phân giải gốc. Lượt UI đó không chạy
  benchmark, gamma calibration, generator hoặc pipeline data và chưa có thay đổi
  contract route; catalog 9 thuật toán được áp dụng sau khi chụp.
- Bổ sung 2026-08-08: editor kịch bản được gom về tab `Thử nghiệm`, có
  `Chọn nhanh`/`Chỉnh chi tiết`, bảng so sánh ba cột và marker Đi/Đến nổi
  bật. Hai ảnh README được chụp lại sau clean restart với route/multiroute 200
  và console 0 errors; production build được chạy sau khi dừng dev server.

Các bước delivery còn lại của file này vẫn giữ nguyên. Phase UI freeze chỉ mở
đường cho các bước đó khi nhóm có đủ người phụ trách và ủy quyền tương ứng.

### 3.2. UI & Explanation v2 Phase 0–8 — final audit 2026-08-11

- Phase 0–6: hoàn tất; route comparison hỗ trợ 2–4 thuật toán.
- Phase 7: **READY** — ATSP comparison 2–3 đã triển khai với immutable snapshot, sequential
  run, partial success, cancel/retry, stale/fingerprint guards, N map và baseline
  không tạo map giả.
- Phase 8: **READY WITH KNOWN ISSUES** — persistent single-run error/retry, invalidation, backend/basemap/offline
  handling, reduced motion, Desktop a11y semantics và final-only comparison maps
  đã có code/test.
- Known issue IDA* cũ đã được sửa và có regression; không còn workaround trong
  README/hướng dẫn hiện hành.
- Hai ảnh README đã được chụp lại ngày 2026-08-11 từ Chrome Desktop runtime thật;
  ảnh ATSP hiện minh hoạ comparison ba phương pháp và không có baseline map giả.

## 4. Đồng bộ Git để nhóm có đầy đủ context

Base UI Clarity đã được đồng bộ; thay đổi hiện tại vẫn là worktree local. Checklist
cho nhóm:

- [x] Review toàn bộ `git diff` hiện tại.
- [x] Xác nhận các Markdown audit và hai ảnh README mới là đúng.
- [x] Track backlog nộp bài và biên bản review nguồn rủi ro trong repo.
- [x] Không đưa `.env`, dependency, cache hay secret vào commit.
- [x] Commit UI Clarity và documentation liên quan, push thành công lên
      `origin/main`.
- [ ] Review diff contract 9 thuật toán + thông tin nhóm + `2 - SC.txt`.
- [ ] Commit/push lượt hiện tại khi nhóm duyệt.
- [ ] Sau đó thành viên khác pull và xác nhận nhìn thấy catalog 9 thuật toán,
      `data/raw/`, documentation mới và các file nhiệm vụ.

Không tự reset/revert những thay đổi chưa commit của thành viên khác.

## 5. Hoàn thành báo cáo kỹ thuật

`report/BaoCao-Khung.md` hiện vẫn là scaffold. Fresh scan có 25 lần xuất hiện
`[ĐIỀN…]`; loại hai lần chỉ nhắc/giải thích quy ước còn **23 marker nội dung thực
tế** phải hoàn thành. Ngoài ra còn 13 occurrence marker screenshot và 8 entry
phụ trách thực tế `CHƯA CHỐT`.

### 5.1. Thông tin nhóm

- [x] GroupID là **2**; giảng viên không yêu cầu tên nhóm.
- [x] Điền họ tên và MSSV của 5 thành viên.
- [ ] Điền vai trò và đóng góp cụ thể.
- [x] Điền tỷ lệ đóng góp do nhóm khai báo: **100% mỗi người**.
- [x] Người đại diện nộp chính thức: **Thái Quang Huy**.
- [ ] Chốt người phụ trách mục c của report (Problem Modeling). Phân công 3 ATSP
      cho Thái Quang Huy không tự động bao gồm mục c này.

| MSSV | Họ tên | Phạm vi đã xác nhận |
|---|---|---|
| 24127078 | Nguyễn Hữu Gia Minh | Chưa chốt |
| 24127177 | Thái Quang Huy | 3 thuật toán ATSP |
| 24127205 | Nguyễn Văn Minh | 9 thuật toán tìm đường hai điểm |
| 24127249 | Mai Phương Thùy | Chưa chốt |
| 24127505 | Trần Hoàng Phúc | Chưa chốt |

### 5.2. Phân công nội dung

| Người | Nội dung chính đã xác nhận |
|---|---|
| Nguyễn Văn Minh | 9 thuật toán tìm đường hai điểm; phần thuật toán route ở mục e/video |
| Thái Quang Huy | 3 thuật toán ATSP; mục h và phần ATSP trong video |
| Nguyễn Hữu Gia Minh | Chưa chốt |
| Mai Phương Thùy | Chưa chốt |
| Trần Hoàng Phúc | Chưa chốt |
| Cả nhóm | Khó khăn thật, giới hạn, future work, đóng góp và tự đánh giá rubric |

`report_algorithm.md` và tài liệu giải thích thuật toán có thể làm nguồn cho
phần e/h và video, nhưng thành viên cần viết lại bằng lời hiểu của mình, kiểm
đúng implementation hiện tại và không chép máy móc.

### 5.3. Nguyên tắc viết sau official-result closeout

- Chỉ dùng headline có thể truy về CSV/JSON chính thức hoặc generated document.
- Nêu runtime là số đo trên môi trường benchmark, không phải hằng số tái lập.
- Giữ đúng caveat: exp2 là kiểm tra thực nghiệm trên mẫu; heuristic không có
  guarantee thì không gọi là optimal; dữ liệu TomTom là snapshot đại diện.
- Nếu bất kỳ input fingerprint nào trong `results/README.md` đổi, hạ toàn bộ số
  phụ thuộc về stale cho tới khi có một coherent rerun được ủy quyền.
- Không hand-edit numerical section của generated teaching document.

## 6. Chuỗi validation/benchmark/generated-document cuối — ĐÃ HOÀN TẤT

Ngày 2026-08-11, sau explicit authorization, chuỗi này đã chạy cô lập trên data
`tomtom+synthetic` 2026-08-03. Không crawl/rebuild graph/profile. Backup trước
run được giữ ngoài repository; input hash được kiểm trước/sau.

Evidence chính:

- exp1: 800/800 hàng khớp NetworkX trong sai số `1e-6`;
- exp2: 0 vi phạm trên 21.170 điểm, `max(h/h*) = 0,8886`;
- exp3: đúng 3.600 hàng duy nhất, 9 thuật toán × 200 cặp × 2 slot;
- exp4: recompute độc lập khớp 200/200 hàng, 149/200 đổi tuyến;
- exp5: 7 mốc gamma; exp6: 5 route; exp7: 5 hàng/method-run hợp lệ;
- gamma calibration: 160 điểm, `γ̂ = 1,238`;
- 11 PNG đọc được; không orphan exp4; generator chạy lại byte-identical;
- checksum input/output và môi trường nằm tại `results/README.md`.

### 6.1. Thứ tự bắt buộc

1. ✅ Chạy full backend tests và data validation.
2. ✅ Từ `backend/`, chạy đủ benchmark exp1–exp7 đúng một lượt.
3. ✅ Từ repo root, chạy `scripts/05_calibrate_gamma.py`.
4. ✅ Chạy `scripts/gen_teaching_doc.py`.
5. ✅ Inspect và validate toàn bộ CSV/JSON/PNG/generated Markdown mới.
6. ✅ Đối chiếu con số giữa results, report, slide, video script và README liên
   quan.
7. ✅ Sau khi tất cả khớp, đồng bộ/gỡ đủ năm banner `SỐ TẠM`.

### 6.2. Năm vị trí đã đồng bộ cùng lượt

- `results/README.md`
- `report/BaoCao-Khung.md`
- `report/Slide-Outline.md`
- `report/Video-KichBan.md`
- `docs/GIAI-THICH-THUAT-TOAN.md`

Ngoài năm vị trí này, current-state/provenance cũng đã sync vào README, schema,
design, data docs, codebase map, readiness và trang `/benchmark`.

Không hand-edit numerical section của
`docs/GIAI-THICH-THUAT-TOAN.md`; phải thay nguồn/generator thích hợp rồi
regenerate.

### 6.3. Không chạy lại data pipeline nếu chỉ đổi UI/source metadata

Không cần:

- crawl lại OSM;
- crawl lại TomTom;
- rebuild `graph_real.json`;
- rebuild `graph_demo.json`;
- rebuild traffic profiles.

Thay `source_url`/mô tả/`note_vi` không ảnh hưởng cost hoặc graph; lượt
2026-08-08 đã validate JSON/data và không rebuild graph/profile.

## 7. Bộ ảnh và hình minh họa cuối

Chỉ chụp sau khi UI được freeze.

### 7.1. Chín screenshot GUI

- [ ] Toàn cảnh trang chính với `G_demo` và congestion 07:30.
- [ ] Animation A* đang chạy: frontier, expanded và bảng `g/h/f`.
- [ ] Tuyến kết quả, panel số liệu và badge guarantee phù hợp.
- [ ] Tab giải thích: summary tiếng Việt, đoạn ùn tắc và alternative.
- [ ] Bidirectional Dijkstra với hai phía tìm kiếm.
- [ ] Compare mode, ví dụ A* và BFS.
- [ ] Multiroute/ATSP với thứ tự điểm và tỷ lệ tiết kiệm.
- [ ] Tab Thử nghiệm: cạnh đang chọn và bảng Thông số/Gốc/Đang thử.
- [ ] Trang `/benchmark` với artifact cuối.

### 7.2. Đối chứng và figure

- [ ] Chụp 5 ảnh Google Maps cho năm cặp exp6.
- [ ] Ghi rõ đối chứng là định tính và khác thời điểm/traffic model nếu có.
- [ ] Chèn preview `G_demo` cần thiết.
- [x] Sinh và kiểm tra 6 figure benchmark + 5 route PNG từ lượt chính thức.
- [x] Đối chiếu structure/headline của figure với CSV/JSON tương ứng.
- [ ] Chèn các figure benchmark được sinh từ lượt cuối.
- [ ] Khi chèn vào report/slide, kiểm lại caption và độ đọc được ở kích thước xuất.
- [ ] Không tái sử dụng ảnh cũ nếu UI hoặc con số hiển thị đã thay đổi.

## 8. Hoàn thành slide

- [ ] Dựng slide thật từ `report/Slide-Outline.md`.
- [ ] Đưa GroupID 2 và danh sách thành viên đã xác nhận vào slide thật.
- [x] Đồng bộ số chính thức vào source `report/Slide-Outline.md`.
- [ ] Chèn ảnh UI và figure rõ, đọc được trên máy chiếu.
- [ ] Không nhồi toàn bộ prose report lên slide.
- [ ] Kiểm font, dấu tiếng Việt, contrast và kích thước chữ.
- [ ] Xuất `.pptx` hoặc `.pdf` theo đúng tên nộp.
- [ ] Mở thử bản xuất trên máy khác hoặc viewer khác.

## 9. Quay và kiểm video

- [ ] Dùng `report/Video-KichBan.md` làm kịch bản.
- [ ] Giải thích các thuật toán bằng ví dụ do nhóm thiết kế.
- [ ] Cho thấy start, goal, expansion order, frontier/open list và final path.
- [ ] Giải thích cost của UCS/A* và heuristic của A*/Greedy.
- [ ] Trình diễn route hai điểm.
- [ ] Trình diễn multiroute/ATSP.
- [ ] Chạy nhiều điều kiện giao thông và so sánh hành vi thuật toán.
- [ ] Giải thích vì sao tuyến được chọn và guarantee/giới hạn tương ứng.
- [ ] Đọc số theo artifact/màn hình chính thức và đối chiếu lại trong rehearsal.
- [ ] Kiểm âm thanh, độ phân giải, con trỏ và nội dung nhạy cảm trên màn hình.
- [ ] Upload video và thử link bằng tab ẩn danh.
- [ ] Tạo `2 - Video.txt` chứa link cuối.

Outline hiện dự kiến video khoảng 18–25 phút; ưu tiên đủ nội dung, rõ ràng và
không đọc nguyên văn toàn bộ tài liệu.

## 10. Tạo đủ năm thành phần nộp bài

Với GroupID đã chốt, bộ nộp là:

```text
2.zip
├── 2 - SC.txt
├── 2 - Report.pdf
├── 2 - Slide.pptx hoặc 2 - Slide.pdf
├── 2 - Video.txt
└── 2 - Data.zip hoặc 2 - Data.txt
```

Hiện đã có `2 - SC.txt`; bốn thành phần còn lại chưa có artifact cuối.

### 10.1. Source code link

- [ ] Repository chứa toàn bộ code/docs/data cần thiết đã được push.
- [x] Tạo `2 - SC.txt` với URL repo do nhóm cung cấp.
- [ ] Nếu repository private, public repo hoặc cấp quyền theo hướng dẫn môn học.
- [ ] Thử link bằng tab ẩn danh hoặc tài khoản không thuộc nhóm.
- [ ] Không commit secret/API key.

### 10.2. Report

- [ ] Hoàn thành đủ các mục a–j của đề.
- [ ] Xóa toàn bộ marker nội dung có chủ đích.
- [ ] Kiểm mục lục, heading, caption, citation và numbering.
- [ ] Xuất `2 - Report.pdf`.
- [ ] Mở và inspect từng trang, đặc biệt bảng/hình/dấu tiếng Việt.

### 10.3. Slide

- [ ] Xuất `2 - Slide.pptx` hoặc `2 - Slide.pdf`.
- [ ] Đảm bảo bản nộp là bản đã dùng để rehearsal.

### 10.4. Video link

- [ ] Tạo `2 - Video.txt`.
- [ ] Link mở được ở tab ẩn danh.

### 10.5. Dataset hoặc data description

Data package nên chứa tối thiểu:

- `graph_demo.json`;
- `graph_real.json`;
- `traffic_profiles_demo.json`;
- `traffic_profiles_real.json`;
- `gdemo_pois.json`;
- `gdemo_corridors.json`;
- `manual_risks.json`;
- `teaching_graph_presets.json`;
- `DATA.md`;
- raw GraphML, raw TomTom và cache provenance hiện được project quyết định đưa
  vào Data ZIP.

Tạo `2 - Data.zip` hoặc `2 - Data.txt` theo phương án nhóm chốt.
Nếu nén data:

- [ ] Có manifest/danh sách file.
- [ ] Có giải thích tracked repository, local provenance và final Data ZIP.
- [ ] Công bố profile là `tomtom+synthetic`, không nói TomTom phủ toàn graph.
- [ ] Công bố bốn snapshot được lấy trên hai ngày thứ Hai, không phải time series
      cùng ngày.
- [ ] Công bố manual risk và giới hạn của nguồn/tọa độ/bán kính.
- [ ] Không chứa API key hoặc secret.

Không đưa vào source/Data ZIP:

- `.env`;
- `.venv/`;
- `node_modules/`;
- `.next/`;
- `__pycache__/`;
- log, temporary output hoặc cache không thuộc provenance;
- credential, API key hoặc dữ liệu cá nhân không cần thiết.

## 11. Full verification sau khi mọi thứ đã chốt

### 11.1. Backend và data

Từ repo root:

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -v
.venv\Scripts\python.exe scripts\validate_data.py
```

### 11.2. Frontend

Từ `frontend/`, khi không có Next dev server đang ghi `.next`:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Không báo `PASS` nếu command không thực sự chạy. Nếu thiếu dependency/tool thì
ghi `NOT RUN` cùng lý do.

### 11.3. Browser/runtime QA

- [ ] Stop service cũ và restart backend/frontend sạch.
- [ ] Hard-refresh browser.
- [ ] `/api/graph?level=demo` trả 51 node và 298 directed edge.
- [ ] Route bằng A* hoạt động và trace phát đúng.
- [ ] Bidirectional Dijkstra hoạt động.
- [ ] Ít nhất một thuật toán không trọng số hoạt động.
- [ ] Compare mode hoạt động.
- [ ] Held-Karp, NN + local improvement và SA hoạt động.
- [ ] Scenario/edge override không làm thay base graph ngoài request.
- [ ] Dark/light/theme cuối không có lỗi tương phản rõ ràng.
- [ ] Không có console error hoặc API request thất bại ngoài expected case.
- [ ] Kiểm Google Chrome maximized ở độ phân giải native của laptop demo cuối.
- [ ] Không thay mục trên bằng Mobile/Tablet/Narrow QA; nếu khác máy audit thì
      ghi `FINAL DEMO-MACHINE PREFLIGHT REQUIRED` cho tới khi chạy thật.
- [ ] Kiểm reduced motion/offline behavior nếu report tuyên bố hỗ trợ.

### 11.4. Repository/documentation QA

- [ ] `git diff --check` đạt.
- [ ] Internal Markdown links còn hợp lệ.
- [ ] README screenshot khớp UI cuối.
- [ ] README, DATA, SCHEMA, report, slide và video không mâu thuẫn số liệu.
- [ ] Không còn machine-specific path không cần thiết.
- [ ] Không có secret trong Git diff/history chuẩn bị nộp.
- [ ] Working tree sạch hoặc chỉ còn thay đổi có chủ đích đã biết.

## 12. Kiểm tra gói nộp

- [ ] Tên `2.zip` đúng tuyệt đối.
- [ ] Bên trong có đúng đủ năm thành phần yêu cầu.
- [ ] Không lồng thêm một thư mục vô nghĩa làm giảng viên khó tìm file.
- [ ] Giải nén thử sang một thư mục mới.
- [ ] Report PDF mở được.
- [ ] Slide mở được.
- [ ] SC/video link mở được ở tab ẩn danh.
- [ ] Data ZIP giải nén được và có Data Description/manifest.
- [ ] Source chạy được theo README trên một môi trường sạch hợp lý.
- [ ] Không chứa secret, `.env`, dependency/cache hoặc file cá nhân.

## 13. Việc không phải blocker bắt buộc

Các mục sau là hardening tốt nếu còn thời gian nhưng không nên chặn việc hoàn
thành deliverable, trừ khi nhóm đưa ra claim mạnh tương ứng:

- QA screen reader đầy đủ;
- kiểm hardware GPU thực trên nhiều máy;
- cải thiện sâu offline-first;
- thêm test unreachable multistop riêng;
- mở rộng fingerprint ledger tự động nếu về sau có thêm producer/input;
- thêm time/cancel budget cho các thuật toán có iteration/depth cap;
- polish UI không gắn với lỗi usability hoặc rubric cụ thể.

Sau UI/result freeze, nên ngừng mở thêm feature mới và ưu tiên report, slide,
video, packaging và rehearsal.

## 14. Về việc gửi email giảng viên

PDF đề gốc chỉ ghi `vntan.work@gmail.com` ở mục **Contact**. Kịch bản shipper
TP.HCM đã nằm trong danh sách kịch bản được cho phép. Vì vậy:

- gửi mail khi nhóm có câu hỏi hoặc cần xác nhận riêng;
- không coi email là thành phần nộp hoặc blocker bắt buộc, trừ khi giảng viên có
  thông báo bổ sung ngoài PDF.

## 15. Thứ tự thực hiện từ trạng thái hiện tại

1. Review rồi commit/push worktree hiện tại; sau đó mọi thành viên pull latest
   `origin/main`. Nhóm chốt các vai trò còn lại và chia các khối report chưa có
   chủ; người đại diện nộp đã chốt là Thái Quang Huy.
2. ✅ Đã review, tích hợp tám `source_url` theo
   `manual_risks_sources_review.md`, chạy data validation và giữ nguyên
   graph/profile/risk counts.
3. ✅ Chuỗi benchmark → gamma calibration → teaching generator đã chạy; artifact,
   prose số liệu và năm former banner đã được kiểm/sync.
4. Hoàn thành 23 marker nội dung report và mọi vai trò/phân công còn lại.
5. Chụp chín screenshot UI cuối và năm ảnh Google Maps; đối chiếu với artifact
   cuối.
6. Dựng slide, quay/upload video và thử mọi link bằng tab ẩn danh.
7. Chạy `FINAL DEMO-MACHINE PREFLIGHT REQUIRED` trên laptop demo thật.
8. Xuất Report PDF, tạo SC/Video/Data artifact và chạy full final QA.
9. Đóng, giải nén thử và kiểm `2.zip` trước khi nộp.

## Definition of Done

Lab 01 chỉ được coi là sẵn sàng nộp khi:

- phase UI đã freeze và verification mới đạt;
- ✅ 8 manual risk đã được xử lý trung thực; final QA còn mở link ẩn danh trên
  máy nộp bài;
- ✅ results được tái sinh từ graph/profile hiện hành;
- ✅ generated teaching document và source số liệu deliverable đã đồng bộ;
- ✅ không còn banner `SỐ TẠM` sai trạng thái; các marker nội dung thủ công vẫn
  phải được điền trước khi xuất report;
- report, slide, video, source link và data package đều tồn tại;
- tất cả link mở được ở tab ẩn danh;
- final ZIP đúng tên, đủ file, giải nén/mở được;
- repository không chứa secret hoặc artifact dependency/cache không cần thiết.
