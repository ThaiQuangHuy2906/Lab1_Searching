# MUST TODO — Công việc còn lại trước khi nộp Lab 01

> Trạng thái rà soát: 2026-08-08. Base UI Clarity đã có trên `origin/main`, nhưng
> thay đổi contract 9 thuật toán, thông tin nhóm và `2 - SC.txt` trong worktree
> hiện tại **chưa commit/push**. Chỉ yêu cầu thành viên khác pull sau khi lượt này
> được review và đẩy lên remote; không dùng một hash cũ trong tài liệu làm release
> marker.
>
> File này lưu backlog tổng trước khi nộp. **UI Clarity Phase đã freeze** và hai
> ảnh README đã được cập nhật; bộ screenshot/report/slide/video nộp cuối vẫn chưa
> hoàn tất. Benchmark cuối chưa chạy và mọi banner `SỐ TẠM` vẫn phải được giữ.
>
> Bằng chứng UI hiện hành được ghi tại §2, §3.1 và `UI_PLAN.md`.
> Benchmark/gamma/generator, bộ ảnh nộp cuối, video và các banner `SỐ TẠM` vẫn
> chưa được thực hiện/thay đổi.
>
> **Cập nhật contract 2026-08-08:** nhóm loại lựa chọn `dijkstra` độc lập vì
> trùng UCS; sản phẩm còn 9 thuật toán route và vẫn giữ Bidirectional Dijkstra.
> Raw benchmark/teaching artifact cũ chỉ được thay trong chuỗi cuối có ủy quyền.
>
> **Cập nhật provenance 2026-08-08:** 8/8 `source_url` manual risk đã được
> review/tích hợp và data validator đạt. Nguồn chỉ hỗ trợ bối cảnh lịch sử ở cấp
> tuyến/khu vực; lượt mở tab ẩn danh trên máy nộp bài vẫn thuộc final link QA.

> **Ưu tiên giao việc ngay:** (1) chốt vai trò còn lại và chia 11 khối report;
> (2) chuẩn bị prose không phụ thuộc benchmark; (3) mở lại các link nguồn bằng
> tab ẩn danh trong final link QA. Không ai tự chạy benchmark/gamma/generator
> trước khi các điều kiện freeze và ủy quyền ở §6 đều đạt.

## 1. Phân biệt hai file MUST DO

- `mustdo.md`: biên bản đóng đầu việc 8 `source_url`, gồm verdict, verification
  và các caveat bắt buộc giữ khi viết deliverable.
- `mustTODO.md`: backlog tổng từ sau phase UI cho tới lúc đóng gói bài nộp.

Trạng thái `source_url`:

- ✅ cả 8 record có nguồn phù hợp và được mô tả trung thực là giả định minh họa;
- ✅ nội dung, ngày đăng và URL trực tiếp đã được review;
- ✅ `data/manual_risks.json` có 8 URL HTTPS, 0 `TODO`;
- ✅ data validator trả `ALL DATA VALID` sau tích hợp;
- ⬜ mở lại bằng tab ẩn danh trên máy/mạng nộp bài — giữ trong final link QA,
  vì browser automation hiện lỗi tương thích CLI/Node.

## 2. Trạng thái kỹ thuật hiện hành

Sau thay đổi contract 9 thuật toán, chưa phát hiện blocker bắt buộc nào trong
core backend/frontend/data ở các gate tự động:

- backend: `177 passed`, 1 warning sau thay đổi contract 9 thuật toán;
- data validator: `ALL DATA VALID`;
- frontend tests: `41/41` passed sau khi thêm regression catalog 9 thuật toán;
- TypeScript: passed;
- production build: passed;
- browser QA bằng UI thật ở 1366×768, 1024×768, 390×844 và 320×568 thuộc lượt
  UI Clarity ngay trước thay đổi catalog; catalog 9 thuật toán mới đã có regression
  tự động và production build, nhưng chưa chạy lại một phiên browser thủ công;
- keyboard/focus/Escape/focus trap, reduced motion, loading/error/empty/offline,
  console và network đã được kiểm trong lượt UI Clarity đó;
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

## 4. Đồng bộ Git để nhóm có đầy đủ context

Base UI Clarity đã được đồng bộ; thay đổi hiện tại vẫn là worktree local. Checklist
cho nhóm:

- [x] Review toàn bộ `git diff` hiện tại.
- [x] Xác nhận các Markdown audit và hai ảnh README mới là đúng.
- [x] Track `mustdo.md` và `mustTODO.md` trong repo.
- [x] Không đưa `.env`, dependency, cache hay secret vào commit.
- [x] Commit UI Clarity và documentation liên quan, push thành công lên
      `origin/main`.
- [ ] Review diff contract 9 thuật toán + thông tin nhóm + `2 - SC.txt`.
- [ ] Commit/push lượt hiện tại khi nhóm duyệt.
- [ ] Sau đó thành viên khác pull và xác nhận nhìn thấy catalog 9 thuật toán,
      `data/raw/`, documentation mới và các file nhiệm vụ.

Không tự reset/revert những thay đổi chưa commit của thành viên khác.

## 5. Hoàn thành báo cáo kỹ thuật

`report/BaoCao-Khung.md` hiện vẫn là scaffold. Có 13 lần xuất hiện `[ĐIỀN...]`;
loại hai lần chỉ nhắc/giải thích quy ước còn **11 ô/khối nội dung thực tế** phải
hoàn thành.

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
- đầu việc `source_url` đã được tích hợp — **đã đạt 2026-08-08**;
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
- [ ] Chèn các figure benchmark được sinh từ lượt cuối.
- [ ] Đối chiếu từng figure với CSV tương ứng trước khi đưa vào report/slide.
- [ ] Không tái sử dụng ảnh cũ nếu UI hoặc con số hiển thị đã thay đổi.

## 8. Hoàn thành slide

- [ ] Dựng slide thật từ `report/Slide-Outline.md`.
- [ ] Đưa GroupID 2 và danh sách thành viên đã xác nhận vào slide thật.
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
- [ ] Giải thích cost của UCS/A* và heuristic của A*/Greedy.
- [ ] Trình diễn route hai điểm.
- [ ] Trình diễn multiroute/ATSP.
- [ ] Chạy nhiều điều kiện giao thông và so sánh hành vi thuật toán.
- [ ] Giải thích vì sao tuyến được chọn và guarantee/giới hạn tương ứng.
- [ ] Đọc số theo artifact/màn hình của phiên bản cuối, không đọc số
      `SỐ TẠM`.
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

1. Review rồi commit/push worktree hiện tại; sau đó mọi thành viên pull latest
   `origin/main`. Nhóm chốt các vai trò còn lại và chia các khối report chưa có
   chủ; người đại diện nộp đã chốt là Thái Quang Huy.
2. ✅ Đã review, tích hợp tám `source_url` theo `mustdo.md`, chạy data validation
   và giữ nguyên graph/profile/risk counts.
3. Hoàn thành prose report không phụ thuộc benchmark.
4. Khi có ủy quyền ghi artifact, chạy full test + data
   validation rồi chạy đúng một chuỗi benchmark → gamma calibration → teaching
   generator.
5. Inspect artifact, đồng bộ mọi con số và chỉ sau đó gỡ đủ năm banner
   `SỐ TẠM`.
6. Hoàn thành 11 khối report và mọi vai trò/phân công còn lại.
7. Chụp chín screenshot UI cuối và năm ảnh Google Maps; đối chiếu với artifact
   cuối.
8. Dựng slide, quay/upload video và thử mọi link bằng tab ẩn danh.
9. Xuất Report PDF, tạo SC/Video/Data artifact và chạy full final QA.
10. Đóng, giải nén thử và kiểm `2.zip` trước khi nộp.

## Definition of Done

Lab 01 chỉ được coi là sẵn sàng nộp khi:

- phase UI đã freeze và verification mới đạt;
- ✅ 8 manual risk đã được xử lý trung thực; final QA còn mở link ẩn danh trên
  máy nộp bài;
- results được tái sinh từ graph/profile hiện hành;
- generated teaching document và mọi số liệu deliverable đã đồng bộ;
- không còn banner `SỐ TẠM` không còn đúng hoặc marker nội dung chưa điền;
- report, slide, video, source link và data package đều tồn tại;
- tất cả link mở được ở tab ẩn danh;
- final ZIP đúng tên, đủ file, giải nén/mở được;
- repository không chứa secret hoặc artifact dependency/cache không cần thiết.
