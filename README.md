# Tìm đường cho shipper đa điểm tại TP.HCM

Đồ án Lab 1 môn Cơ sở Trí tuệ nhân tạo: mô hình hoá giao thông đô thị bằng đồ
thị có hướng, trực quan hoá 9 thuật toán tìm đường hai điểm và tối ưu thứ tự
giao hàng bằng 3 phương pháp ATSP. Backend dùng FastAPI; frontend dùng Next.js,
MapLibre và deck.gl; dữ liệu chạy demo được lưu cục bộ nên thuật toán không cần
gọi mạng.

Implementation frontend hiện hành và duy nhất trong tracked tree là
`frontend/`. Thư mục draft cũ `frontend1/` đã bị xoá và không được dùng làm
bằng chứng cho hành vi sản phẩm.

## Nhóm thực hiện

- **GroupID:** 2; không sử dụng tên nhóm.
- **Repository:** <https://github.com/ThaiQuangHuy2906/Lab1_Searching>
- **Người đại diện nộp chính thức:** Thái Quang Huy.

| MSSV | Họ tên | Phạm vi đã xác nhận | Đóng góp khai báo |
|---|---|---|---:|
| 24127078 | Nguyễn Hữu Gia Minh | Chưa chốt | 100% |
| 24127177 | Thái Quang Huy | 3 thuật toán ATSP | 100% |
| 24127205 | Nguyễn Văn Minh | 9 thuật toán tìm đường hai điểm | 100% |
| 24127249 | Mai Phương Thùy | Chưa chốt | 100% |
| 24127505 | Trần Hoàng Phúc | Chưa chốt | 100% |

Vai trò thực tế và các mục báo cáo còn lại sẽ được nhóm chốt sau.

## Xem nhanh

| A* + route trace — giao diện Đen | Held–Karp + optimization trace — giao diện Trắng |
|---|---|
| ![Kết quả A* và timeline route trace trên giao diện Đen](artifacts/readme/dark-route-result.png) | ![Kết quả Held-Karp và timeline optimization trace trên giao diện Trắng](artifacts/readme/light-atsp-result.png) |

Hai ảnh trên được chụp từ lượt UI freeze ngày 2026-08-08 ở 1366×768 sau clean
restart. Thay đổi catalog 9 thuật toán sau đó không đổi hai cảnh đang minh hoạ;
catalog mới đã qua test/build nhưng chưa chụp lại browser. Đây không phải ảnh
thay thế cho toàn bộ screenshot bắt buộc trong report/video.

### Tính năng nổi bật

- 9 thuật toán tìm đường dùng chung contract `Trace`, timeline và bảng g/h/f.
- Ba phương pháp ATSP cho hành trình nhiều điểm trên đồ thị có hướng, bất đối xứng.
- Bản đồ G_demo/G_real, lớp ùn tắc, offline mode và chọn điểm trực tiếp trên map.
- GraphView backend thật cho G_demo: `full` hoặc `teach_3`…`teach_50`; UI nhận
  số node nguyên 3…51, với 51 ánh xạ về `full`. Mọi graph, traffic, route và
  multiroute cùng resolve một view; G_real chỉ hỗ trợ `full`.
- ATSP optimization trace opt-in có player riêng; không trộn với route `Trace`.
- Sandbox chỉnh cạnh chỉ trong request/phiên hiện tại, có preview cost, provenance và
  fingerprint do backend sinh; không sửa graph/profile gốc.
- Luồng sáng nhấn tuyến, focus/keyboard đầy đủ và fallback `prefers-reduced-motion`.
- Giải thích tiếng Việt từ evidence typed cho đủ 9 thuật toán route; ở chế độ
  Chạy một có đối chiếu tuyến tham chiếu hậu kiểm và overlay nét đứt. So sánh
  route chọn 2–4 thuật toán, đúng N lựa chọn tạo N map final-only độc lập và bảng
  N-way trong drawer; ATSP hiện vẫn chỉ đối chiếu trước/sau một phương pháp.
- Drawer kết quả có bốn tab `Số liệu`, `Giải thích`, `So sánh`, `Thử nghiệm`;
  editor kịch bản chỉ nằm ở tab `Thử nghiệm` với `Chọn nhanh`/`Chỉnh chi tiết`.
- Tên thuật toán dùng nhãn ngắn; số liệu hành trình hiển thị km/phút. Ở desktop,
  objective và quãng đường nằm cạnh nhau; thời gian xử lý thuật toán vẫn dùng ms.
- Benchmark viewer chỉ đọc với cảnh báo nguồn dữ liệu rõ ràng.

> **Trạng thái ngày 2026-08-10 — UI & Explanation v2 đã triển khai qua Phase 6,
> chưa được nộp:**
> Lượt data refresh cuối đã tích hợp đủ raw TomTom 07:30, 12:00, 17:30 và 22:00
> dưới dạng bốn snapshot đại diện lấy trên hai ngày thứ Hai; profile hiện là
> `tomtom+synthetic`. Raw GraphML, bốn TomTom JSON và OSMnx cache hiện được Git
> track dưới `data/raw/`. Contract/runtime Explanation v2, map extraction Phase 5
> và route comparison 2–4 Phase 6 đã được nối end-to-end. Phase 6 đang ở trạng
> thái `READY` sau manual browser QA do người dùng xác nhận; Phase 7 ATSP comparison chưa triển
> khai. Gate gần nhất đạt `230 passed` backend, `ALL DATA VALID`, `124/124`
> frontend test và TypeScript; `G_demo` hiện có
> 51 node / 298 cạnh.
> `results/` vẫn là số tạm từ lượt 2026-07-26 và không được dùng làm kết quả
> chính thức. Không rerun data; benchmark/hiệu chuẩn γ/generator vẫn chờ một
> lượt cuối được cho phép riêng sau khi code ổn định.

## Trạng thái kiểm chứng

| Hạng mục | Trạng thái hiện tại | Bằng chứng |
|---|---|---|
| Backend | **Đạt, có known issue IDA\*** | `230 passed, 1 warning`; validator hiện còn bác một số nghiệm `epsilon_bounded` hợp lệ khi exact reference tốt hơn nhưng gap vẫn nằm trong ε |
| Data contract | **Đạt** | `ALL DATA VALID`; profile `tomtom+synthetic`; raw GraphML và TomTom 4/4 hiện diện, được Git track |
| Frontend automated | **Đạt** | `npm test`: 124/124 pass |
| TypeScript | **Đạt** | `npx tsc --noEmit` exit 0 |
| Frontend production build | **Chưa chạy lại sau Phase 6** | Build 6/6 static pages đã đạt ở UI freeze trước; lượt Phase 6 chỉ chạy test/TypeScript vì Next dev server đang hoạt động |
| G_demo | **Hiện hành** | 51 node, 298 cạnh có hướng, 60 cạnh một chiều |
| G_real | **Hiện hành** | 2.118 node, 4.699 cạnh có hướng, 1.433 cạnh một chiều |
| Benchmark | **Chưa hiện hành** | `results/` cũ hơn graph; xem [`results/README.md`](results/README.md) |
| UI/runtime | **Phase 5–6 READY** | Người dùng đã manual browser QA N-map 2/3/4, camera độc lập, thêm/bỏ thuật toán, khóa chỉnh sửa trong compare mode, bảng so sánh và resize drawer; vẫn nên pre-flight lại trên đúng máy/độ phân giải trước khi quay |
| Backend sau clean restart | **Đạt tại lượt audit; phải lặp trước demo** | `/api/graph?level=demo&view=full` trả G_demo 51/298 từ snapshot trên đĩa |
| Trước khi nộp | **Còn việc tay** | 8 URL nguồn risk đã tích hợp nhưng còn final link QA; report vẫn còn nhiều marker nội dung/screenshot và phân công chưa chốt; ảnh/sơ đồ ngoài hai ảnh README, report PDF, slide, video/link và ZIP chưa hoàn tất |

Backend dùng cache theo vòng đời process. Trước khi demo hoặc chụp hình, phải
restart cả hai service, hard-refresh trình duyệt và xác nhận
`/api/graph?level=demo` trả `51` node / `298` cạnh.

## Sản phẩm và rubric

| Tiêu chí đề bài | Hiện thực trong repo |
|---|---|
| Bối cảnh giao thông Việt Nam | Shipper giao nhiều điểm ở trung tâm TP.HCM; ùn tắc theo 4 khung giờ; ngập, lô cốt, hẻm và đèn tín hiệu |
| Mô hình, dataset, cost | Hai graph có hướng G_demo/G_real; OSM; cost `distance`, `time`, `balanced`; contract trong [`docs/SCHEMA.md`](docs/SCHEMA.md) |
| Thuật toán bắt buộc | BFS, DFS, UCS, A* |
| Thuật toán bổ sung | IDDFS, Greedy, Bidirectional Dijkstra, IDA*, Beam |
| Đa điểm | Held–Karp, Nearest Neighbor + cải thiện bất đối xứng, Simulated Annealing |
| GUI | Shell điều hành với bảy giao diện, chọn điểm trên map, animation trace và luồng sáng tuyến có reduced-motion, timeline, bảng g/h/f, ATSP, route comparison 2–4 bằng N map độc lập, explanation typed theo từng result/thuật toán và trang benchmark có trạng thái dữ liệu tạm |
| Báo cáo và video | Có khung a–j, outline 14 slide và kịch bản video; vẫn cần nhóm hoàn thiện artifact thật |

Rubric chính thức 100 điểm và yêu cầu đóng gói nằm trong
[`docs/Lab 1 - Searching.pdf`](docs/Lab%201%20-%20Searching.pdf). Bản đối chiếu
chi tiết xem [`docs/CODEX-CODEBASE-MAP.md`](docs/CODEX-CODEBASE-MAP.md).

## Kiến trúc

```text
OSM + TomTom tùy chọn + manual risks
                 │
                 ▼
        scripts/01–05 + validator
                 │
                 ▼
   graph/profile JSON đã commit trong data/
                 │
                 ▼
      GraphStore + 9 search + 3 ATSP
                 │
          ┌──────┴────────┐
          ▼               ▼
   FastAPI /api/*    benchmark.py
          │               │
          ▼               ▼
 Next.js + MapLibre   results/ + tài liệu sinh
```

Luồng chạy sản phẩm chỉ đọc snapshot trong `data/`; các bước tải OSM/crawl
TomTom là pipeline ngoại tuyến. `/api/benchmark` chỉ đọc artifact cached trong
`results/`, không tự chạy benchmark.

## Thuật toán và bảo đảm

| Thuật toán | Thứ tự ưu tiên | Bảo đảm trong dự án |
|---|---|---|
| BFS | số cạnh | Tìm tuyến ít cạnh; không tối ưu cost có trọng số |
| DFS | chiều sâu | Không bảo đảm tối ưu |
| IDDFS | độ sâu tăng dần | Tìm nghiệm nông nhất trong depth cap; không tối ưu cost, chủ yếu dùng G_demo |
| UCS | `g` | Tối ưu với trọng số không âm |
| A* | `g + h` | Tối ưu nhờ heuristic admissible + consistent |
| Greedy | `h` | Không bảo đảm tối ưu |
| Bidirectional Dijkstra | `g` từ hai phía | Tối ưu trên graph có hướng với backward search đúng chiều đảo |
| IDA* | ngưỡng `g + h` | Trong `C* + ε` khi tìm được trước cap; mặc định ε = 5 m ở `distance`, 5 s ở mode còn lại |
| Beam | top-k theo `g + h` | Có thể không tìm thấy dù đường tồn tại; không bảo đảm tối ưu |

Mọi thuật toán trả cùng một kiểu `Trace`; cap 5.000 bước chỉ giới hạn payload,
không được cắt công việc tìm kiếm hay metrics. Chứng minh heuristic xem
[`docs/HEURISTIC-PROOF.md`](docs/HEURISTIC-PROOF.md).

ATSP hỗ trợ tối đa 16 điểm kể cả điểm xuất phát; riêng Held–Karp tối đa 15 điểm
và có bảo đảm tối ưu. `nn_2opt` và `sa` là heuristic, không có bảo đảm tối ưu.

## Yêu cầu môi trường

| Thành phần | Mốc đã kiểm |
|---|---|
| Windows | Windows 11 + PowerShell |
| Python | 3.14.0 |
| Node.js / npm | 24.14.1 / 11.11.0 |
| Backend chính | FastAPI 0.140.0, Pydantic 2.13.4, pytest 9.1.1 |
| Frontend chính | Next 15.5.22, React 19.2.8, TypeScript 5.9.3 |

Python dependencies được pin trong `backend/requirements.txt`; frontend lock
bằng `frontend/package-lock.json`.

## Cài đặt nhanh trên PowerShell

Chạy từ repo root:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

Set-Location frontend
npm ci
Set-Location ..
```

TomTom chỉ cần cho crawl tùy chọn. Không commit key:

```powershell
Copy-Item .env.example .env
# Điền TOMTOM_API_KEY trong .env khi thực sự crawl.
```

Mặc định, frontend gọi `/api/*` cùng origin và Next.js chuyển tiếp request tới
`http://127.0.0.1:8000`. Cách này hoạt động cả khi mở giao diện bằng `localhost`
lẫn IP LAN. Nếu backend chạy ở địa chỉ khác, tạo `frontend/.env.local`:

```dotenv
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
```

Chỉ đặt `NEXT_PUBLIC_API_BASE` khi muốn trình duyệt gọi thẳng FastAPI; khi đó
backend phải cho phép origin của frontend qua CORS.

`.env`, các biến thể local và `frontend/.env.local` đã được Git ignore;
`.env.example` vẫn được track.

## Chạy ứng dụng

Terminal 1:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Terminal 2:

```powershell
Set-Location frontend
npm run dev
```

Mở:

- giao diện: <http://localhost:3000>
- benchmark viewer: <http://localhost:3000/benchmark>
- OpenAPI/Swagger: <http://localhost:8000/docs>

Hướng dẫn thao tác Chạy một, So sánh nhiều 2–4 map, timeline, tab Giải thích,
tuyến tham chiếu, đường đỏ ùn tắc và nhiều điểm nằm tại
[`docs/HUONG-DAN-SU-DUNG-UI.md`](docs/HUONG-DAN-SU-DUNG-UI.md).

Với Git Bash trên Windows, dùng `.venv/Scripts/python.exe` và dấu `/`; trên
macOS/Linux dùng `.venv/bin/python`. Không sao chép nguyên lệnh PowerShell có
dấu `\` sang Bash.

## REST API

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/health` | health và version |
| GET | `/api/graph?level=demo\|real&view=full\|teach_*` | graph snapshot/view đã resolve |
| GET | `/api/traffic?slot=07:30&level=demo&view=...` | congestion của graph/view/slot đã resolve |
| POST | `/api/route` | một trong 9 thuật toán hai điểm; nhận `scenario` tùy chọn |
| POST | `/api/multiroute` | tối ưu thứ tự nhiều điểm; nhận `scenario` và `include_trace` tùy chọn |
| POST | `/api/benchmark` | đọc kết quả benchmark cached |

Request/response, enum, đơn vị và error envelope đầy đủ nằm trong
[`docs/SCHEMA.md`](docs/SCHEMA.md). `distance` dùng mét; `time` và `balanced`
dùng giây. `found=false` là response 200 hợp lệ, không nhất thiết là lỗi HTTP.

## Kiểm tra an toàn

Chạy từ repo root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\ -q
.\.venv\Scripts\python.exe scripts\validate_data.py

Set-Location frontend
npm test
npx tsc --noEmit
```

Mốc FINAL-01 đã chạy ngày 2026-08-03 trên baseline commit `f22698c`:

- pytest: `95 passed, 1 warning in 15.68s`;
- validator: `ALL DATA VALID` với cảnh báo nguồn của snapshot tại thời điểm
  FINAL-01; checkpoint lịch sử này đã được data refresh 4/4 ngày 2026-08-03 thay thế;
- contrast checker: toàn bộ token dark/light đạt;
- TypeScript: exit code 0;
- browser QA: 71/71 kiểm tra UI chính; 20 ảnh UI-03, 10 ảnh UI-04 và 10 ảnh
  luồng sáng tuyến ở các viewport/kịch bản đã kiểm đều không rỗng.

FINAL-01 đã kiểm runtime dark/light, offline, keyboard/focus, reduced motion,
responsive 1180×720, 1366×768 và 1600×900, cùng G_demo/G_real. Vẫn phải chạy lại
pre-flight trên máy chiếu thật trước khi quay. Hiệu năng luồng sáng tuyến G_real trên
Chromium SwiftShader chỉ khoảng 16 FPS; kết quả với GPU phần cứng chưa tái lập,
vì vậy đây vẫn là cảnh báo chứ không phải bằng chứng hiệu năng thực tế.

## Dữ liệu và benchmark

Snapshot graph/profile hiện hành đủ để chạy demo offline. Bản đồ nền Carto vẫn
cần mạng; UI có chế độ offline không basemap.

Lượt data cuối đã hoàn tất đúng chuỗi profile → G_demo → validator. Các bước còn lại:

1. giữ nguyên snapshot `tomtom+synthetic` đã validate, không rebuild lại;
2. hoàn tất thay đổi code và full verification;
3. tắt service, chạy benchmark riêng đúng một lượt khi được cho phép;
4. hiệu chuẩn γ, sinh lại tài liệu rồi đồng bộ đủ 5 banner/số liệu.

Các lệnh trên ghi đè artifact dữ liệu được Git theo dõi. Không chạy từng phần
và không trộn graph/profile/result từ các lượt khác nhau.

## Cấu trúc thư mục

```text
backend/app/       API, graph store, cost, search, ATSP, benchmark
backend/tests/     test schema, data, cost, search, TSP và API
artifacts/readme/  hai ảnh minh hoạ giao diện hiện hành cho README
data/              graph/profile snapshot, POI, risk và DATA.md
docs/              đề bài, contract, proof, design, baseline và audit
frontend/app/      trang chính và /benchmark
frontend/components/
frontend/lib/      API client, types, format và Zustand store
report/            khung báo cáo, slide và video
results/           benchmark tạm, cũ hơn graph hiện tại
scripts/           pipeline data, validator, generator và QA
```

## Bản đồ tài liệu

| Tài liệu | Vai trò |
|---|---|
| [`docs/Lab 1 - Searching.pdf`](docs/Lab%201%20-%20Searching.pdf) | đề bài và rubric chính thức |
| [`docs/Lab1-ChotPhuongAn.md`](docs/Lab1-ChotPhuongAn.md) | quyết định dự án đã chốt |
| [`PROMPT-MASTER.md`](PROMPT-MASTER.md) | đặc tả thi công gốc; phần phase là lịch sử |
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | contract graph, trace, API và cost |
| [`data/DATA.md`](data/DATA.md) | nguồn, pipeline, giả định và snapshot |
| [`docs/DESIGN.md`](docs/DESIGN.md) | contract thiết kế UI |
| [`docs/HUONG-DAN-SU-DUNG-UI.md`](docs/HUONG-DAN-SU-DUNG-UI.md) | hướng dẫn thao tác giao diện hiện hành qua Phase 6 |
| [`UI_PLAN.md`](UI_PLAN.md) | checklist triển khai và bằng chứng hoàn tất phase UI Clarity |
| [`UI_caithien.md`](UI_caithien.md) | master plan UI & Explanation v2; Phase 5–6 hiện hành dùng hệ phase này |
| [`docs/CODEX-BASELINE.md`](docs/CODEX-BASELINE.md) | baseline kỹ thuật ngày 2026-07-27; giữ làm lịch sử |
| [`docs/CODEX-CODEBASE-MAP.md`](docs/CODEX-CODEBASE-MAP.md) | bản đồ kiến trúc và current-state đã cập nhật qua UI & Explanation v2 Phase 6 |
| [`docs/TIENDO.md`](docs/TIENDO.md) · [`docs/KIEMTOAN.md`](docs/KIEMTOAN.md) · [`docs/AUDIT-CLAUDE-PRE-SUBMISSION.md`](docs/AUDIT-CLAUDE-PRE-SUBMISSION.md) | nhật ký/audit lịch sử, không phải bằng chứng current |
| [`docs/GIAI-THICH-THUAT-TOAN.md`](docs/GIAI-THICH-THUAT-TOAN.md) | tài liệu sinh tự động; hiện vẫn là số tạm |
| [`docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md`](docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md) | tài liệu lịch sử tên Role C; hiện dùng để học thuật toán nâng cao và ATSP, không đại diện vai trò đã chốt |

## Checklist nộp bài

Với GroupID 2, gói nộp `2.zip` gồm:

- `2 - SC.txt` — đã tạo; còn phải thử link source ở tab ẩn danh;
- `2 - Report.pdf` — báo cáo kỹ thuật hoàn chỉnh;
- `2 - Slide.pptx` hoặc `2 - Slide.pdf`;
- `2 - Video.txt` — link video mở được ở tab ẩn danh;
- `2 - Data.zip` hoặc `2 - Data.txt`.

Tám `source_url` của manual risk đã được đối chiếu và tích hợp ngày 2026-08-08;
đây là nguồn sự kiện lịch sử ở cấp tuyến/khu vực, không phải dữ liệu real-time và
không xác nhận tọa độ/bán kính/penalty. Trước khi đóng gói vẫn phải mở lại các
link bằng tab ẩn danh trên máy nộp bài, tự chốt vai trò/phân công còn lại, xử lý
toàn bộ marker, chụp screenshot/Google Maps, tạo report/slide/video thật, chạy
benchmark/generator cuối được duyệt, rồi mới gỡ 5 banner `SỐ TẠM`.

## Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| Frontend không gọi được backend | chạy uvicorn, kiểm `BACKEND_INTERNAL_URL`, rồi restart frontend |
| API trả graph cũ | tắt process cũ, restart backend, hard-refresh và kiểm `/api/graph?level=demo` |
| Port 8000/3000 bận | tìm PID bằng `netstat -ano \| findstr :<port>` rồi chỉ tắt đúng process đó |
| Map nền trống | kiểm mạng hoặc bật chế độ offline |
| IDA* đôi lúc trả HTTP 500 với ε mặc định | known issue validator `epsilon_bounded`; thử ε nhỏ hơn hoặc A*/UCS cho demo, sau đó sửa theo `SCHEMA.md` §F.3 thay vì coi graph vô đường |
| 404 hàng loạt file Next | tắt dev server, xoá riêng `frontend/.next`, chạy `npm run dev` lại |
| Đổi `next.config.ts` nhưng không có hiệu lực | restart dev server |
| Chữ Việt lỗi trên console Windows | đọc/ghi UTF-8 và cấu hình stdout UTF-8 trong script |

Không chạy `npm run build` đồng thời với `npm run dev`: cả hai cùng ghi
`frontend/.next`. Chỉ build sau khi đã tắt mọi Next dev process.

## Quyền sử dụng

Repository hiện không có file `LICENSE`; vì vậy không nên suy luận rằng mã nguồn
được cấp phép tái sử dụng hoặc phân phối. Nhóm cần chốt chính sách với giảng viên
và chủ sở hữu trước khi thêm license hoặc công khai repository.
