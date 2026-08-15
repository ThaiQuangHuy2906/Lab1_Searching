# Tìm đường cho shipper đa điểm tại TP.HCM

Đồ án Lab 1 môn Cơ sở Trí tuệ nhân tạo, mô hình hóa giao thông đô thị bằng đồ
thị có hướng. Hệ thống trực quan hóa 9 thuật toán tìm đường giữa hai điểm và tối
ưu thứ tự giao hàng bằng 3 phương pháp ATSP.

- **Backend:** FastAPI và Pydantic.
- **Frontend:** Next.js, React, MapLibre và deck.gl.
- **Dữ liệu:** snapshot graph/traffic được lưu trong repository; luồng tìm đường
  và tối ưu không gọi mạng.
- **Mục tiêu:** hỗ trợ học, so sánh và giải thích thuật toán trên một kịch bản
  giao hàng gần với giao thông trung tâm TP.HCM.

Repository: <https://github.com/ThaiQuangHuy2906/Lab1_Searching>

## Xem nhanh

| A* với route trace — giao diện tối | So sánh ba phương pháp ATSP — giao diện sáng |
|---|---|
| ![Kết quả A* với tuyến đường, timeline và metrics](artifacts/readme/dark-route-result.png) | ![So sánh Held–Karp, NN + local search và Simulated Annealing](artifacts/readme/light-atsp-result.png) |

Hai ảnh được chụp từ runtime hiện hành ngày 11/08/2026 sau khi khởi động sạch
backend và frontend.

## Trạng thái hiện hành

| Hạng mục | Bằng chứng gần nhất |
|---|---|
| Backend | `235 passed`, 1 dependency warning, ngày 15/08/2026 |
| Frontend | `137/137` tests và `npx tsc --noEmit` đạt, ngày 15/08/2026 |
| Dữ liệu | `ALL DATA VALID`; `G_demo` 51 nút/298 cạnh/60 cạnh một chiều; `G_real` 2.118 nút/4.699 cạnh/1.433 cạnh một chiều |
| Production build | Next.js 15.5.22 compile, type-check và sinh 6/6 trang tĩnh, ngày 11/08/2026 |
| Benchmark | Exp1–Exp7 là bộ kết quả chính thức ngày 11/08/2026; provenance và checksum nằm trong [`results/README.md`](results/README.md) |
| UI runtime | Route đơn/so sánh 2–4 thuật toán, ATSP đơn/so sánh 2–3 phương pháp, offline/retry/cancel và reduced motion đã được kiểm trên Chrome Desktop ngày 11/08/2026 |

Các mốc trên mô tả đúng phạm vi kiểm tra đã chạy, không phải bảo đảm rằng ứng
dụng không còn lỗi. Trước khi trình diễn trên máy khác, cần khởi động lại hai
service, hard-refresh trình duyệt và chạy smoke test trên chính máy đó.

## Tính năng chính

- Chạy 9 thuật toán tìm đường trên cùng contract kết quả và `Trace`.
- Xem từng bước mở rộng nút, frontier, timeline và các giá trị `g/h/f` phù hợp
  với từng thuật toán.
- Chạy một hoặc so sánh đồng thời 2–4 thuật toán tìm đường trên các bản đồ độc lập.
- Tối ưu hành trình đa điểm bằng Held–Karp, Nearest Neighbor + local search bất
  đối xứng và Simulated Annealing; hỗ trợ chạy một hoặc so sánh 2–3 phương pháp.
- Chọn `G_demo` để giảng dạy/trực quan hóa hoặc `G_real` để đánh giá ở quy mô lớn hơn.
- Thử thay đổi điều kiện cạnh trong phạm vi request/phiên mà không sửa snapshot gốc.
- Hiển thị giải thích tiếng Việt dựa trên evidence có cấu trúc từ backend.
- Có chế độ offline không basemap, điều khiển bàn phím và fallback
  `prefers-reduced-motion`.
- Trang benchmark chỉ đọc các artifact đã được sinh và kiểm chứng trước đó.

Hướng dẫn thao tác chi tiết nằm trong
[`docs/HUONG-DAN-SU-DUNG-UI.md`](docs/HUONG-DAN-SU-DUNG-UI.md).

## Kiến trúc

```text
OSM + TomTom snapshot + manual risks
                  │
                  ▼
         pipeline data + validator
                  │
                  ▼
     graph/profile JSON trong data/
                  │
                  ▼
       GraphStore + cost + algorithms
                  │
           ┌──────┴────────┐
           ▼               ▼
     FastAPI /api/*    benchmark.py
           │               │
           ▼               ▼
 Next.js + MapLibre    results/ + tài liệu sinh
```

Backend sản phẩm chỉ đọc snapshot đã commit trong `data/`. Việc tải OSM, crawl
TomTom, build dữ liệu và sinh benchmark là các quy trình ngoại tuyến riêng.
Endpoint `/api/benchmark` chỉ đọc artifact trong `results/`, không tự chạy lại
benchmark.

## Thuật toán và bảo đảm

### Tìm đường hai điểm

| Thuật toán | Ưu tiên | Bảo đảm trong dự án |
|---|---|---|
| BFS | số cạnh | Tìm tuyến ít cạnh; không tối ưu chi phí có trọng số |
| DFS | chiều sâu | Không bảo đảm tối ưu |
| IDDFS | độ sâu tăng dần | Tìm nghiệm nông nhất trong depth cap; không tối ưu chi phí |
| UCS | `g` | Tối ưu khi trọng số không âm |
| A* | `g + h` | Tối ưu khi heuristic thỏa điều kiện admissible và consistent |
| Greedy Best-First | `h` | Không bảo đảm tối ưu |
| Bidirectional Dijkstra | `g` từ hai phía | Tối ưu trên graph có hướng khi backward search dùng đúng chiều đảo |
| IDA* | ngưỡng `g + h` | Nằm trong `C* + ε` nếu tìm được trước cap; mặc định ε là 5 m cho `distance`, 5 s cho các mode còn lại |
| Beam Search | top-k theo `g + h` | Có thể bỏ lỡ nghiệm và không bảo đảm tối ưu |

Mọi thuật toán trả cùng một contract `Trace`. Giới hạn 5.000 bước chỉ cắt payload
trace; nó không được cắt công việc tìm kiếm hoặc metrics của lượt chạy đầy đủ.
Điều kiện heuristic được trình bày trong
[`docs/HEURISTIC-PROOF.md`](docs/HEURISTIC-PROOF.md).

### Tối ưu đa điểm ATSP

| Phương pháp | Tính chất |
|---|---|
| Held–Karp | Quy hoạch động chính xác; bảo đảm tối ưu; tối đa 15 điểm kể cả điểm xuất phát |
| Nearest Neighbor + local search | Heuristic nhanh; local search giữ đúng chi phí bất đối xứng; không bảo đảm tối ưu |
| Simulated Annealing | Metaheuristic có seed; không bảo đảm tối ưu |

Request đa điểm hỗ trợ tối đa 16 điểm kể cả điểm xuất phát; trường hợp 16 điểm
phải dùng phương pháp heuristic.

## Dữ liệu và hàm chi phí

Hệ thống dùng hai snapshot đồ thị có hướng:

- `G_demo`: 51 địa điểm, phục vụ giảng dạy và trực quan hóa.
- `G_real`: 2.118 nút, phục vụ benchmark và đánh giá ở quy mô lớn hơn.

Traffic profile hiện hành có nguồn `tomtom+synthetic`: dữ liệu TomTom chỉ phủ các
điểm mẫu trên một số trục chính, phần cạnh còn lại dùng fallback xác định với
seed 42. Đây là các snapshot đại diện theo khung giờ, không phải luồng giao thông
thời gian thực.

Ba cost mode được hỗ trợ:

- `distance`: chi phí tính bằng mét.
- `time`: chi phí tính bằng giây.
- `balanced`: thời gian đã cộng ảnh hưởng ùn tắc và rủi ro, tính bằng giây.

Nguồn dữ liệu, công thức, giả định và giới hạn được mô tả tại
[`data/DATA.md`](data/DATA.md) và [`docs/SCHEMA.md`](docs/SCHEMA.md).

## Môi trường đã kiểm

| Thành phần | Phiên bản/môi trường |
|---|---|
| Hệ điều hành | Windows 11 + PowerShell |
| Python | 3.14.0 |
| Node.js / npm | 24.14.1 / 11.11.0 |
| Backend chính | FastAPI 0.140.0, Pydantic 2.13.4, pytest 9.1.1 |
| Frontend chính | Next.js 15.5.22, React 19.2.8, TypeScript 5.9.3 |

Python dependencies được pin trong `backend/requirements.txt`; frontend sử dụng
`frontend/package-lock.json`.

## Cài đặt

Chạy từ repository root bằng PowerShell:

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

Set-Location frontend
npm ci
Set-Location ..
```

TomTom API key không cần thiết để chạy ứng dụng với snapshot hiện hành. Chỉ tạo
`.env` khi chủ động chạy lại bước crawl ngoại tuyến:

```powershell
Copy-Item .env.example .env
# Điền TOMTOM_API_KEY trong .env; không commit file này.
```

## Chạy ứng dụng

Terminal 1, từ repository root:

```powershell
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Terminal 2:

```powershell
Set-Location frontend
npm run dev
```

Sau đó mở:

- Giao diện: <http://localhost:3000>
- Benchmark viewer: <http://localhost:3000/benchmark>
- OpenAPI/Swagger: <http://localhost:8000/docs>

Mặc định, frontend gọi `/api/*` cùng origin và Next.js chuyển tiếp request tới
`http://127.0.0.1:8000`. Nếu backend chạy ở địa chỉ khác, tạo
`frontend/.env.local`:

```dotenv
BACKEND_INTERNAL_URL=http://127.0.0.1:8000
```

Chỉ dùng `NEXT_PUBLIC_API_BASE` khi trình duyệt cần gọi thẳng FastAPI; khi đó cần
cấu hình CORS tương ứng. Các file môi trường local đã được Git ignore.

Với Git Bash trên Windows, dùng `.venv/Scripts/python.exe`; với macOS/Linux, dùng
`.venv/bin/python`.

## REST API

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/health` | Trạng thái backend và version |
| GET | `/api/graph?level=demo\|real&view=...` | Graph snapshot hoặc teaching view đã resolve |
| GET | `/api/traffic?slot=07:30&level=demo&view=...` | Mức ùn tắc theo graph, view và khung giờ |
| POST | `/api/route` | Chạy một trong 9 thuật toán tìm đường; nhận `scenario` tùy chọn |
| POST | `/api/multiroute` | Tối ưu đa điểm; nhận `scenario` và `include_trace` tùy chọn |
| POST | `/api/benchmark` | Đọc kết quả benchmark đã cache |

Request/response, enum, đơn vị và error envelope đầy đủ nằm trong
[`docs/SCHEMA.md`](docs/SCHEMA.md). `found=false` là response HTTP 200 hợp lệ,
không nhất thiết là lỗi API.

## Kiểm tra

Chạy từ repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\ -q
.\.venv\Scripts\python.exe scripts\validate_data.py

Set-Location frontend
npm test
npx tsc --noEmit
```

Chỉ chạy `npm run build` sau khi đã tắt mọi Next.js dev process. `npm run dev` và
`npm run build` cùng ghi vào `frontend/.next`, vì vậy không chạy đồng thời.

Benchmark và pipeline dữ liệu có thể ghi đè artifact được Git theo dõi. Không
chạy lại từng bước nếu chưa đọc dependency chain và quy tắc provenance trong
[`results/README.md`](results/README.md) cùng [`data/DATA.md`](data/DATA.md).

## Cấu trúc repository

```text
backend/app/       API, graph store, cost, search, ATSP và benchmark
backend/tests/     test schema, data, cost, search, TSP và API
artifacts/readme/  ảnh minh họa giao diện cho README
data/              graph/profile snapshot, POI, risk và tài liệu dữ liệu
docs/              đề bài, contract, thiết kế, proof và hướng dẫn
frontend/          ứng dụng Next.js và test frontend
report/            nguồn báo cáo Markdown, outline và tài nguyên hình
results/           benchmark chính thức cùng provenance/checksum
scripts/           pipeline data, validator, generator và QA
```

## Tài liệu chính

| Tài liệu | Nội dung |
|---|---|
| [`docs/Lab 1 - Searching.pdf`](docs/Lab%201%20-%20Searching.pdf) | Đề bài, rubric và quy cách nộp chính thức |
| [`docs/SCHEMA.md`](docs/SCHEMA.md) | Contract graph, traffic, trace, API và cost |
| [`data/DATA.md`](data/DATA.md) | Nguồn, pipeline, snapshot, giả định và giới hạn dữ liệu |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Thiết kế và hành vi giao diện |
| [`docs/HUONG-DAN-SU-DUNG-UI.md`](docs/HUONG-DAN-SU-DUNG-UI.md) | Hướng dẫn chạy và thao tác các chế độ UI |
| [`docs/HEURISTIC-PROOF.md`](docs/HEURISTIC-PROOF.md) | Điều kiện và chứng minh heuristic |
| [`docs/GIAI-THICH-THUAT-TOAN.md`](docs/GIAI-THICH-THUAT-TOAN.md) | Tài liệu giải thích thuật toán được sinh từ dữ liệu hiện hành |
| [`results/README.md`](results/README.md) | Kết quả chính thức, môi trường, provenance và SHA-256 |
| [`report/Report_3ATSP_Final.md`](report/Report_3ATSP_Final.md) | Phần báo cáo ATSP tiếng Việt |
| [`report/Report_3ATSP_EN.md`](report/Report_3ATSP_EN.md) | Bản tiếng Anh của phần báo cáo ATSP |
| [`report_dataset_graphmodel.md`](report_dataset_graphmodel.md) | Bối cảnh, mô hình hóa graph, dataset và giới hạn dữ liệu |
| [`report/problem_context_improved.md`](report/problem_context_improved.md) | Bản cải thiện phần bối cảnh do Thùy cung cấp |
| [`report/report_limitations_future_work_improved.md`](report/report_limitations_future_work_improved.md) | Bản cải thiện phần hạn chế và hướng phát triển do Thùy cung cấp |

Repository ưu tiên lưu nguồn báo cáo dưới dạng Markdown. Các artifact nộp cuối
như PDF, slide, video/link và gói dữ liệu vẫn phải tuân theo quy cách trong đề
bài và được kiểm tra riêng trước khi nộp.

## Nhóm thực hiện

- **GroupID:** 2
- **Người đại diện:** Thái Quang Huy

| Họ tên | MSSV | Tỷ lệ đóng góp |
|---|---:|---:|
| Nguyễn Hữu Gia Minh | 24127078 | 100% |
| Thái Quang Huy | 24127177 | 100% |
| Nguyễn Văn Minh | 24127205 | 100% |
| Mai Phương Thùy | 24127249 | 100% |
| Trần Hoàng Phúc | 24127505 | 100% |

## Troubleshooting

| Triệu chứng | Cách xử lý |
|---|---|
| Frontend không gọi được backend | Chạy uvicorn, kiểm `BACKEND_INTERNAL_URL`, rồi restart frontend |
| API trả graph cũ | Tắt process cũ, restart backend, hard-refresh và kiểm `/api/graph?level=demo` |
| Port 8000 hoặc 3000 bận | Dùng `netstat -ano \| findstr :<port>` và chỉ tắt đúng PID cần thiết |
| Map nền trống | Kiểm tra mạng hoặc bật chế độ offline không basemap |
| Next.js trả nhiều lỗi 404 asset | Tắt dev server, xóa riêng `frontend/.next`, rồi chạy lại `npm run dev` |
| Thay đổi `next.config.ts` chưa có hiệu lực | Restart dev server |
| Chữ Việt lỗi trên console Windows | Dùng UTF-8 cho file và stdout của script |

## Giấy phép và nội dung bên thứ ba

Mã nguồn và tài liệu gốc do nhóm sở hữu được cấp phép theo
[MIT License](LICENSE), bản quyền năm 2026 thuộc năm thành viên được liệt kê ở
trên. Giấy phép này cho phép sử dụng, sửa đổi và phân phối phần nội dung thuộc
phạm vi MIT với điều kiện giữ lại thông báo bản quyền và giấy phép.

MIT không tự động áp dụng cho dữ liệu hoặc tài sản bên thứ ba. Đặc biệt:

- dữ liệu OpenStreetMap và database dẫn xuất tuân theo
  [Open Data Commons ODbL](https://www.openstreetmap.org/copyright);
- dữ liệu và response TomTom tiếp tục chịu
  [điều khoản TomTom](https://developer.tomtom.com/terms-and-conditions);
- `data/`, `results/`, ảnh/basemap, PDF đề bài hoặc tài liệu tham khảo và các
  dependency bên thứ ba không được tái cấp phép bằng MIT, trừ khi từng tệp có
  thông báo riêng.

Xem [`LICENSE`](LICENSE) để biết toàn văn MIT và
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) để biết phạm vi dữ liệu, tài
liệu và tài sản bên thứ ba.
