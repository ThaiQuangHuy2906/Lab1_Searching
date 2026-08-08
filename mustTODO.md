# MUST TODO — Công việc còn lại trước khi nộp Lab 01

> Trạng thái rà soát: 2026-08-08. Branch `main` đã đồng bộ UI Clarity và
> documentation lên `origin/main`; người nhận checklist phải chạy
> `git pull origin main` trước khi bắt đầu, không dùng một hash cũ trong tài liệu
> làm release marker.
>
> File này lưu backlog tổng trước khi nộp. **UI Clarity Phase đã freeze** và hai
> ảnh README đã được cập nhật; bộ screenshot/report/slide/video nộp cuối vẫn chưa
> hoàn tất. Benchmark cuối chưa chạy và mọi banner `SỐ TẠM` vẫn phải được giữ.
>
> Bằng chứng UI hiện hành được ghi tại §2, §3.1 và `UI_PLAN.md`.
> Benchmark/gamma/generator, bộ ảnh nộp cuối, video và các banner `SỐ TẠM` vẫn
> chưa được thực hiện/thay đổi.

> **Ưu tiên giao việc ngay:** (1) điền thông tin nhóm và chia 40 khối report;
> (2) xử lý tám nguồn manual risk theo `mustdo.md`; (3) chuẩn bị prose không phụ
> thuộc benchmark. Không ai tự chạy benchmark/gamma/generator trước khi ba điều
> kiện freeze, provenance và ủy quyền ở §6 đều đạt.

## 1. Phân biệt hai file MUST DO

- `mustdo.md`: phiếu giao việc riêng về 8 `source_url` của manual risk, sẵn sàng
  gửi nhóm nhưng chưa hoàn thành.
- `mustTODO.md`: backlog tổng từ sau phase UI cho tới lúc đóng gói bài nộp.

Việc `source_url` chỉ được coi là hoàn thành khi:

- cả 8 record có nguồn phù hợp hoặc được mô tả trung thực là giả định minh họa;
- URL đã được review và mở thử ở tab ẩn danh;
- `data/manual_risks.json` đã được cập nhật;
- data validator chạy đạt.

## 2. Trạng thái kỹ thuật hiện hành

Tại lượt verification sau UI Clarity, chưa phát hiện blocker bắt buộc nào trong
core backend/frontend/data:

- backend: `176 passed`, 1 warning;
- data validator: `ALL DATA VALID`;
- frontend tests: `40/40` passed;
- TypeScript: passed;
- production build: passed;
- browser QA bằng UI thật: passed ở 1366×768, 1024×768, 390×844 và kiểm bổ sung
  320×568;
- keyboard/focus/Escape/focus trap, reduced motion, loading/error/empty/offline,
  console và network: đã kiểm;
- contrast checker: passed đủ bảy theme;
- active frontend là `frontend/`;
- current `G_demo`: 51 node, 298 directed edge, gồm 60 one-way edge;
- current `G_real`: 2.118 node, 4.699 directed edge;
- profile hiện tại là `tomtom+synthetic`, đủ bốn slot `07:30`, `12:00`,
  `17:30`, `22:00`.

Đây là bằng chứng đã chạy cho phiên bản UI freeze ngày 2026-08-08, không phải
lời hứa thay thế verification cuối sau benchmark và trước khi đóng gói.

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

Các yêu cầu kết thúc phase ở trên đã được kiểm chứng trên current worktree,
không dùng checkpoint trước phase làm bằng chứng thay thế:

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
- Verification mới: `npm test` 40/40, `npx tsc --noEmit`, production build,
  backend pytest 176/176 (1 Starlette/httpx deprecation warning) và data
  validator đều đạt. `scripts/check_contrast.py` đạt cho đủ bảy theme.
- Hai ảnh README đã chụp lại sau clean restart/hard refresh, request thành công
  và inspect ở độ phân giải gốc. Không chạy benchmark, gamma calibration,
  generator hoặc pipeline data; không thay đổi API/backend/schema/data/results.
- Bổ sung 2026-08-08: editor kịch bản được gom về tab `Thử nghiệm`, có
  `Chọn nhanh`/`Chỉnh chi tiết`, bảng so sánh ba cột và marker Đi/Đến nổi
  bật. Hai ảnh README được chụp lại sau clean restart với route/multiroute 200
  và console 0 errors; production build được chạy sau khi dừng dev server.

Các bước delivery còn lại của file này vẫn giữ nguyên. Phase UI freeze chỉ mở
đường cho các bước đó khi nhóm có đủ người phụ trách và ủy quyền tương ứng.

## 4. Đồng bộ Git để nhóm có đầy đủ context

UI và documentation hiện hành đã được đồng bộ. Checklist cho nhóm:

- [x] Review toàn bộ `git diff` hiện tại.
- [x] Xác nhận các Markdown audit và hai ảnh README mới là đúng.
- [x] Track `mustdo.md` và `mustTODO.md` trong repo.
- [x] Không đưa `.env`, dependency, cache hay secret vào commit.
- [x] Commit UI Clarity và documentation liên quan, push thành công lên
      `origin/main`.
- [ ] Thành viên khác pull và xác nhận nhìn thấy `data/raw/`, documentation mới
      và các file nhiệm vụ.

Không tự reset/revert những thay đổi chưa commit của thành viên khác.

## 5. Hoàn thành báo cáo kỹ thuật

`report/BaoCao-Khung.md` hiện vẫn là scaffold. Có 42 lần xuất hiện
`[ĐIỀN...]`; loại hai lần chỉ giải thích quy ước còn **40 ô/khối nội dung thực
tế** phải hoàn thành.

### 5.1. Thông tin nhóm

- [ ] Điền tên nhóm.
- [ ] Điền họ tên và MSSV của 3–5 thành viên.
- [ ] Điền vai trò và đóng góp cụ thể.
- [ ] Điền tỷ lệ đóng góp trung thực.
- [ ] Chốt một người đại diện nộp bài.
- [ ] Chốt người phụ trách mục c; khuyến nghị B hỗ trợ A.

### 5.2. Phân công nội dung

| Vai trò | Nội dung chính |
|---|---|
| A — Data Engineer | Mục d; provenance; graph/profile/data assumptions; phối hợp B viết mục c |
| B — Core Search | Mục e, f; sáu thuật toán lõi; graph/cost modeling ở mục c |
| C — Advanced + ATSP | Bốn thuật toán nâng cao; ba ATSP; mục h |
| D — Frontend | Mục i; hướng dẫn GUI; input/output; screenshot và UI QA |
| E — API + Eval + Report | Mục a, b, g, j; benchmark protocol; ghép và rà toàn báo cáo |
| Cả nhóm | Khó khăn thật, giới hạn, future work, đóng góp và tự đánh giá rubric |

`report_algorithm.md` và tài liệu giải thích thuật toán có thể làm nguồn cho
phần e/h và video, nhưng thành viên cần viết lại bằng lời hiểu của mình, kiểm
đúng implementation hiện tại và không chép máy móc.

### 5.3. Nguyên tắc viết trong lúc benchmark chưa refresh

- Có thể hoàn thành prose không phụ thuộc benchmark ngay trong phase UI.
- Không gọi số trong `results/` là kết quả hiện tại/chính thức.
- Không chép headline exp1–exp7 cũ vào kết luận cuối.
- Giữ nguyên các cảnh báo `SỐ TẠM`.
- Để phần nhận xét phụ thuộc số liệu chờ chuỗi benchmark cuối.

## 6. Chuỗi validation/benchmark/generated-document cuối

`results/` hiện thuộc lượt `synthetic` ngày 2026-07-26 và cũ hơn data refresh
`tomtom+synthetic` ngày 2026-08-03. Chỉ chạy chuỗi dưới đây sau khi:

- phase UI hoàn tất;
- code/data/schema đã freeze;
- đầu việc `source_url` đã được tích hợp;
- nhóm có người theo dõi toàn bộ output và documentation bị ảnh hưởng;
- có ủy quyền rõ ràng cho các command ghi lại `results/` và generated Markdown.

### 6.1. Thứ tự bắt buộc

1. Chạy full backend tests và data validation.
2. Từ `backend/`, chạy đủ benchmark exp1–exp7 đúng một lượt.
3. Từ repo root, chạy `scripts/05_calibrate_gamma.py`.
4. Chạy `scripts/gen_teaching_doc.py`.
5. Inspect toàn bộ CSV/JSON/PNG/generated Markdown mới.
6. Đối chiếu con số giữa results, report, slide, video script và README liên
   quan.
7. Chỉ khi tất cả khớp mới gỡ đủ năm banner `SỐ TẠM`.

### 6.2. Năm vị trí phải đồng bộ cùng lượt

- `results/README.md`
- `report/BaoCao-Khung.md`
- `report/Slide-Outline.md`
- `report/Video-KichBan.md`
- `docs/GIAI-THICH-THUAT-TOAN.md`

Không hand-edit numerical section của
`docs/GIAI-THICH-THUAT-TOAN.md`; phải thay nguồn/generator thích hợp rồi
regenerate.

### 6.3. Không chạy lại data pipeline nếu chỉ đổi UI/source URL

Không cần:

- crawl lại OSM;
- crawl lại TomTom;
- rebuild `graph_real.json`;
- rebuild `graph_demo.json`;
- rebuild traffic profiles.

Chỉ thay `source_url` không ảnh hưởng cost hoặc graph; cần validate JSON/data
nhưng không cần rebuild graph/profile.

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
- [ ] Chèn các figure benchmark được sinh từ lượt cuối.
- [ ] Đối chiếu từng figure với CSV tương ứng trước khi đưa vào report/slide.
- [ ] Không tái sử dụng ảnh cũ nếu UI hoặc con số hiển thị đã thay đổi.

## 8. Hoàn thành slide

- [ ] Dựng slide thật từ `report/Slide-Outline.md`.
- [ ] Điền tên nhóm/thành viên.
- [ ] Thay mọi số benchmark bằng số của lượt cuối.
- [ ] Chèn ảnh UI và figure rõ, đọc được trên máy chiếu.
- [ ] Không nhồi toàn bộ prose report lên slide.
- [ ] Kiểm font, dấu tiếng Việt, contrast và kích thước chữ.
- [ ] Xuất `.pptx` hoặc `.pdf` theo đúng tên nộp.
- [ ] Mở thử bản xuất trên máy khác hoặc viewer khác.

## 9. Quay và kiểm video

- [ ] Dùng `report/Video-KichBan.md` làm kịch bản.
- [ ] Giải thích các thuật toán bằng ví dụ do nhóm thiết kế.
- [ ] Cho thấy start, goal, expansion order, frontier/open list và final path.
- [ ] Giải thích cost của UCS/Dijkstra/A* và heuristic của A*/Greedy.
- [ ] Trình diễn route hai điểm.
- [ ] Trình diễn multiroute/ATSP.
- [ ] Chạy nhiều điều kiện giao thông và so sánh hành vi thuật toán.
- [ ] Giải thích vì sao tuyến được chọn và guarantee/giới hạn tương ứng.
- [ ] Đọc số theo artifact/màn hình của phiên bản cuối, không đọc số
      `SỐ TẠM`.
- [ ] Kiểm âm thanh, độ phân giải, con trỏ và nội dung nhạy cảm trên màn hình.
- [ ] Upload video và thử link bằng tab ẩn danh.
- [ ] Tạo `[GroupID - Video].txt` chứa link cuối.

Outline hiện dự kiến video khoảng 18–25 phút; ưu tiên đủ nội dung, rõ ràng và
không đọc nguyên văn toàn bộ tài liệu.

## 10. Tạo đủ năm thành phần nộp bài

Đề gốc yêu cầu một `[GroupID].zip` chứa:

```text
[GroupID].zip
├── [GroupID - SC].txt
├── [GroupID - Report].pdf
├── [GroupID - Slide].pptx hoặc [GroupID - Slide].pdf
├── [GroupID - Video].txt
└── [GroupID - Data].zip hoặc [GroupID - Data].txt
```

Hiện chưa có artifact cuối nào trong năm nhóm trên.

### 10.1. Source code link

- [ ] Repository chứa toàn bộ code/docs/data cần thiết đã được push.
- [ ] Tạo `[GroupID - SC].txt` với đúng link.
- [ ] Nếu repository private, public repo hoặc cấp quyền theo hướng dẫn môn học.
- [ ] Thử link bằng tab ẩn danh hoặc tài khoản không thuộc nhóm.
- [ ] Không commit secret/API key.

### 10.2. Report

- [ ] Hoàn thành đủ các mục a–j của đề.
- [ ] Xóa toàn bộ marker nội dung có chủ đích.
- [ ] Kiểm mục lục, heading, caption, citation và numbering.
- [ ] Xuất `[GroupID - Report].pdf`.
- [ ] Mở và inspect từng trang, đặc biệt bảng/hình/dấu tiếng Việt.

### 10.3. Slide

- [ ] Xuất `[GroupID - Slide].pptx` hoặc `[GroupID - Slide].pdf`.
- [ ] Đảm bảo bản nộp là bản đã dùng để rehearsal.

### 10.4. Video link

- [ ] Tạo `[GroupID - Video].txt`.
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

Tạo `[GroupID - Data].zip` hoặc `[GroupID - Data].txt` theo phương án nhóm chốt.
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
- [ ] Kiểm ở 1366×768 hoặc đúng độ phân giải máy chiếu.
- [ ] Kiểm responsive/mobile mức nhóm cam kết.
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

- [ ] Tên `[GroupID].zip` đúng tuyệt đối.
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
- thêm fingerprint graph/profile vào benchmark artifact;
- thêm time/cancel budget cho các thuật toán có iteration/depth cap;
- polish UI không gắn với lỗi usability hoặc rubric cụ thể.

Sau phase UI đang dự kiến, nên ngừng mở thêm feature mới và ưu tiên benchmark,
report, slide, video, packaging và rehearsal.

## 14. Về việc gửi email giảng viên

PDF đề gốc chỉ ghi `vntan.work@gmail.com` ở mục **Contact**. Kịch bản shipper
TP.HCM đã nằm trong danh sách kịch bản được cho phép. Vì vậy:

- gửi mail khi nhóm có câu hỏi hoặc cần xác nhận riêng;
- không coi email là thành phần nộp hoặc blocker bắt buộc, trừ khi giảng viên có
  thông báo bổ sung ngoài PDF.

## 15. Thứ tự thực hiện từ trạng thái hiện tại

1. Mọi thành viên pull latest `origin/main`; trưởng nhóm điền tên, vai trò,
   người đại diện nộp và chia 40 khối report.
2. Giao, review và tích hợp tám `source_url` theo `mustdo.md`; chạy data
   validation và inspect diff.
3. Hoàn thành prose report không phụ thuộc benchmark trong lúc chờ nguồn.
4. Khi provenance đóng và có ủy quyền ghi artifact, chạy full test + data
   validation rồi chạy đúng một chuỗi benchmark → gamma calibration → teaching
   generator.
5. Inspect artifact, đồng bộ mọi con số và chỉ sau đó gỡ đủ năm banner
   `SỐ TẠM`.
6. Hoàn thành 40 khối report và mọi thông tin thành viên/đóng góp còn lại.
7. Chụp chín screenshot UI cuối và năm ảnh Google Maps; đối chiếu với artifact
   cuối.
8. Dựng slide, quay/upload video và thử mọi link bằng tab ẩn danh.
9. Xuất Report PDF, tạo SC/Video/Data artifact và chạy full final QA.
10. Đóng, giải nén thử và kiểm `[GroupID].zip` trước khi nộp.

## Definition of Done

Lab 01 chỉ được coi là sẵn sàng nộp khi:

- phase UI đã freeze và verification mới đạt;
- 8 manual risk đã được xử lý trung thực;
- results được tái sinh từ graph/profile hiện hành;
- generated teaching document và mọi số liệu deliverable đã đồng bộ;
- không còn banner `SỐ TẠM` không còn đúng hoặc marker nội dung chưa điền;
- report, slide, video, source link và data package đều tồn tại;
- tất cả link mở được ở tab ẩn danh;
- final ZIP đúng tên, đủ file, giải nén/mở được;
- repository không chứa secret hoặc artifact dependency/cache không cần thiết.
