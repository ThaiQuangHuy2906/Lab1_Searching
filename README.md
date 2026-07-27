# Tìm đường cho shipper đa điểm tại TP.HCM

Đồ án Lab 1 môn Cơ sở Trí tuệ nhân tạo: mô hình hoá giao thông đô thị bằng đồ
thị có hướng, trực quan hoá 10 thuật toán tìm đường hai điểm và tối ưu thứ tự
giao hàng bằng 3 phương pháp ATSP. Backend dùng FastAPI; frontend dùng Next.js,
MapLibre và deck.gl; dữ liệu chạy demo được lưu cục bộ nên thuật toán không cần
gọi mạng.

> **Trạng thái ngày 2026-07-27 — chưa phải bộ nộp cuối:** code hiện đạt 95 test,
> validator dữ liệu đạt và TypeScript không lỗi. Hai graph hiện hành đã được
> build ngày 2026-07-27, nhưng profile vẫn là `synthetic`; raw TomTom mới có
> 07:30 và 12:00, còn thiếu 17:30 và 22:00. `results/` là số tạm từ lượt
> 2026-07-26 và không được dùng làm kết quả chính thức. Không chạy 03b, rebuild,
> benchmark hoặc generator từ bộ TomTom 2/4.

## Trạng thái kiểm chứng

| Hạng mục | Trạng thái hiện tại | Bằng chứng |
|---|---|---|
| Backend | **Đạt** | `95 passed, 1 warning` ngày 2026-07-27 |
| Data contract | **Đạt, có cảnh báo nguồn** | `ALL DATA VALID`; profile vẫn `synthetic` dù raw TomTom đã có 2 snapshot |
| TypeScript | **Đạt** | `npx tsc --noEmit` exit 0 |
| G_demo | **Hiện hành** | 51 node, 292 cạnh có hướng, 56 cạnh một chiều |
| G_real | **Hiện hành** | 2.118 node, 4.699 cạnh có hướng, 1.433 cạnh một chiều |
| Benchmark | **Chưa hiện hành** | `results/` cũ hơn graph; xem [`results/README.md`](results/README.md) |
| B-3/B-4/B-5 | **Đã sửa** | trace/đơn vị/scroll có regression hoặc browser evidence trong [`docs/CODEX-BASELINE.md`](docs/CODEX-BASELINE.md) |
| Backend đang chạy | **Stale** | probe localhost:8000 vẫn trả graph 2026-07-26, 51/141 thay vì 51/292 |
| Trước khi nộp | **Còn việc tay** | 8 URL nguồn risk + metadata risk cũ, 40 marker cần điền trên 30 dòng nội dung (không tính dòng chú giải), screenshot, report PDF, slide, video/link và ZIP |

Backend dùng cache theo vòng đời process. Trước khi demo hoặc chụp hình, phải
restart cả hai service, hard-refresh trình duyệt và xác nhận
`/api/graph?level=demo` trả `51` node / `292` cạnh.

## Sản phẩm và rubric

| Tiêu chí đề bài | Hiện thực trong repo |
|---|---|
| Bối cảnh giao thông Việt Nam | Shipper giao nhiều điểm ở trung tâm TP.HCM; ùn tắc theo 4 khung giờ; ngập, lô cốt, hẻm và đèn tín hiệu |
| Mô hình, dataset, cost | Hai graph có hướng G_demo/G_real; OSM; cost `distance`, `time`, `balanced`; contract trong [`docs/SCHEMA.md`](docs/SCHEMA.md) |
| Thuật toán bắt buộc | BFS, DFS, UCS, A* |
| Thuật toán bổ sung | IDDFS, Dijkstra, Greedy, Bidirectional Dijkstra, IDA*, Beam |
| Đa điểm | Held–Karp, Nearest Neighbor + cải thiện bất đối xứng, Simulated Annealing |
| GUI | Chọn điểm trên map, animation trace, timeline, bảng g/h/f, so sánh, giải thích tiếng Việt, trang benchmark |
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
      GraphStore + 10 search + 3 ATSP
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
| Dijkstra | `g` | Tối ưu với trọng số không âm |
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

Nếu backend không ở `http://localhost:8000`, tạo
`frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

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

Với Git Bash trên Windows, dùng `.venv/Scripts/python.exe` và dấu `/`; trên
macOS/Linux dùng `.venv/bin/python`. Không sao chép nguyên lệnh PowerShell có
dấu `\` sang Bash.

## REST API

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/health` | health và version |
| GET | `/api/graph?level=demo\|real` | graph snapshot |
| GET | `/api/traffic?slot=07:30&level=demo` | congestion của một graph/slot |
| POST | `/api/route` | một trong 10 thuật toán hai điểm |
| POST | `/api/multiroute` | tối ưu thứ tự nhiều điểm |
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
npx tsc --noEmit
```

Mốc đã chạy trên worktree ngày 2026-07-27:

- pytest: `95 passed, 1 warning in 14.62s`;
- validator: `ALL DATA VALID`, kèm hai cảnh báo profile synthetic/raw TomTom 2/4;
- TypeScript: exit code 0.

Không xem test count là chứng minh cho hành vi không được test. Map, theme,
offline, accessibility, responsive và độ phân giải máy chiếu vẫn cần QA
trình duyệt trước khi quay.

## Dữ liệu và benchmark

Snapshot graph/profile đã commit đủ để chạy demo offline. Bản đồ nền Carto vẫn
cần mạng; UI có chế độ offline không basemap.

Lượt cuối phải theo đúng [`hdcrawl.md`](hdcrawl.md):

1. thu nốt TomTom 17:30 và 22:00;
2. chốt dùng TomTom hay synthetic minh bạch;
3. chạy trọn chuỗi profile → G_demo → validator đúng một lượt;
4. tắt service, chạy benchmark riêng một lượt;
5. hiệu chuẩn γ, sinh lại tài liệu và đồng bộ đủ 5 banner/số liệu.

Các lệnh trên ghi đè artifact đã commit. Không chạy từng phần và không trộn
graph/profile/result từ các lượt khác nhau.

## Cấu trúc thư mục

```text
backend/app/       API, graph store, cost, search, ATSP, benchmark
backend/tests/     test schema, data, cost, search, TSP và API
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
| [`docs/CODEX-BASELINE.md`](docs/CODEX-BASELINE.md) | bằng chứng kiểm chứng mới nhất |
| [`docs/CODEX-CODEBASE-MAP.md`](docs/CODEX-CODEBASE-MAP.md) | bản đồ kiến trúc, test gap, blocker |
| [`docs/TIENDO.md`](docs/TIENDO.md) · [`docs/KIEMTOAN.md`](docs/KIEMTOAN.md) · [`docs/AUDIT-CLAUDE-PRE-SUBMISSION.md`](docs/AUDIT-CLAUDE-PRE-SUBMISSION.md) | nhật ký/audit lịch sử, không phải bằng chứng current |
| [`docs/GIAI-THICH-THUAT-TOAN.md`](docs/GIAI-THICH-THUAT-TOAN.md) | tài liệu sinh tự động; hiện vẫn là số tạm |

## Checklist nộp bài

Đề yêu cầu một `[GroupID].zip` gồm:

- `[GroupID - SC].txt` — link source mở được;
- `[GroupID - Report].pdf` — báo cáo kỹ thuật hoàn chỉnh;
- `[GroupID - Slide].pptx` hoặc `[GroupID - Slide].pdf`;
- `[GroupID - Video].txt` — link video mở được ở tab ẩn danh;
- `[GroupID - Data].zip` hoặc `[GroupID - Data].txt`.

Trước khi đóng gói còn phải thay 8 `source_url` placeholder, sửa
`manual_risks.json` metadata sang luật cạnh đi vào vùng, điền danh tính và đóng
góp, xử lý toàn bộ marker, chụp screenshot/Google Maps, tạo report/slide/video
thật, gỡ 5 banner `SỐ TẠM` sau lượt dữ liệu cuối và kiểm tra link ẩn danh.

## Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| Frontend không gọi được backend | chạy uvicorn, kiểm `NEXT_PUBLIC_API_BASE`, rồi restart frontend |
| API trả graph cũ | tắt process cũ, restart backend, hard-refresh và kiểm `/api/graph?level=demo` |
| Port 8000/3000 bận | tìm PID bằng `netstat -ano \| findstr :<port>` rồi chỉ tắt đúng process đó |
| Map nền trống | kiểm mạng hoặc bật chế độ offline |
| 404 hàng loạt file Next | tắt dev server, xoá riêng `frontend/.next`, chạy `npm run dev` lại |
| Đổi `next.config.ts` nhưng không có hiệu lực | restart dev server |
| Chữ Việt lỗi trên console Windows | đọc/ghi UTF-8 và cấu hình stdout UTF-8 trong script |

Không chạy `npm run build` đồng thời với `npm run dev`: cả hai cùng ghi
`frontend/.next`. Chỉ build sau khi đã tắt mọi Next dev process.

## Quyền sử dụng

Repository hiện không có file `LICENSE`; vì vậy không nên suy luận rằng mã nguồn
được cấp phép tái sử dụng hoặc phân phối. Nhóm cần chốt chính sách với giảng viên
và chủ sở hữu trước khi thêm license hoặc công khai repository.
