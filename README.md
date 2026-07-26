# Lab 1 — Search Algorithms for Vietnamese Traffic

Ứng dụng hỗ trợ **shipper giao hàng đa điểm tại TP.HCM**: tìm đường giữa 2 điểm bằng
**10 thuật toán tìm kiếm** (BFS, DFS, IDDFS, UCS, Dijkstra, A*, Greedy, Bidirectional
Dijkstra, IDA*, Beam) và tối ưu thứ tự giao hàng **ATSP** (Held-Karp, NN+2-opt,
Simulated Annealing) — trên dữ liệu OSM thật khu trung tâm, GUI trực quan hoá từng
bước thuật toán, giải thích lộ trình bằng tiếng Việt.

| Tài liệu | Vai trò |
|---|---|
| `docs/Lab 1 - Searching.pdf` · `docs/Lab1-ChotPhuongAn.md` · `PROMPT-MASTER.md` | Đề bài · phương án · chỉ dẫn thi công |
| `docs/SCHEMA.md` | 3 hợp đồng dữ liệu (graph / trace / REST API) |
| `docs/HEURISTIC-PROOF.md` | Chứng minh heuristic admissible + consistent |
| `docs/GIAI-THICH-THUAT-TOAN.md` | Tài liệu giảng + bảng chạy tay (sinh từ data thật) |
| `data/DATA.md` | Nguồn dữ liệu, luật xây dựng, giả định |
| `docs/DESIGN.md` | Hợp đồng thiết kế UI (token 2 chế độ Sáng/Tối) |
| `report/` | Khung báo cáo a–j · outline 14 slide · kịch bản video |
| `docs/TIENDO.md` | Nhật ký tiến độ 8 phase |

## Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| **Python** | **3.14** | chuẩn dự án — mọi gói đã kiểm chứng có wheel `cp314 win_amd64` |
| **Node.js** | ≥ 20 (đã kiểm trên 24) | kèm npm |
| Git | bất kỳ | |
| HĐH | Windows 11 (chính); lệnh bash tương đương bên dưới | |

## Dựng lại toàn bộ từ zero — 5 bước

> Data snapshot đã **commit sẵn trong repo** — bước 3 (build lại data) là TUỲ CHỌN,
> chỉ cần khi muốn tải OSM mới. **Demo không cần mạng** (trừ bản đồ nền — có Chế độ
> offline thay thế).

**PowerShell (Windows):**

```powershell
# 1. Môi trường Python
py -3.14 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# 2. Kiểm tra: toàn bộ test phải xanh
.venv\Scripts\python.exe -m pytest backend\tests\ -q          # kỳ vọng: 79 passed

# 3. (TUỲ CHỌN) build lại data từ OSM — cần mạng, ~2 phút
.venv\Scripts\python.exe scripts\01_download_osm.py
.venv\Scripts\python.exe scripts\02_build_graph.py
.venv\Scripts\python.exe scripts\03b_build_profiles.py real
.venv\Scripts\python.exe scripts\04_build_gdemo.py
.venv\Scripts\python.exe scripts\03b_build_profiles.py demo
.venv\Scripts\python.exe scripts\validate_data.py             # kỳ vọng: ALL DATA VALID

# 4. Backend — GIỮ CỬA SỔ NÀY CHẠY
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000

# 5. Frontend — CỬA SỔ MỚI, rồi mở http://localhost:3000
cd frontend
npm install
npm run dev
```

**bash (Git Bash / macOS / Linux):** thay `.venv\Scripts\python.exe` bằng
`.venv/Scripts/python.exe` (Windows) hoặc `.venv/bin/python` (macOS/Linux); các lệnh
còn lại giữ nguyên.

**Benchmark (tuỳ chọn, ~7 phút — sinh `results/`):**

```powershell
cd backend
..\.venv\Scripts\python.exe -m app.benchmark          # cả 7 thí nghiệm, seed 42
```

**Sinh lại tài liệu giảng từ data hiện tại:**
`.venv\Scripts\python.exe scripts\gen_teaching_doc.py`

## Bảng cổng & địa chỉ

| Dịch vụ | Địa chỉ | Ghi chú |
|---|---|---|
| Backend FastAPI | http://localhost:8000 | docs tự sinh: `/docs` |
| Frontend Next.js | http://localhost:3000 | trang chính + `/benchmark` |
| API cho frontend | `NEXT_PUBLIC_API_BASE` | mặc định `http://localhost:8000` |

## Luồng demo gợi ý (5 phút)

1. G_demo · 07:30 · Cân bằng · A* → chọn *Bưu điện Thành phố* → *Chợ Bến Thành* →
   **Chạy thuật toán** → bấm ▶ (phím `Space`; `←/→` đi từng bước).
2. Kéo timeline — bản đồ và bảng g/h/f nhảy theo; click 1 hàng trong bảng để nhảy
   tới bước node đó được expand.
3. Tab **Giải thích** — đọc summary tiếng Việt; các đoạn ùn tắc tô đỏ trên bản đồ.
4. Đổi thuật toán *Dijkstra hai chiều* → chạy lại — 2 màu lan từ 2 phía.
5. Thêm 5–9 điểm giao → **Tối ưu thứ tự** (Held-Karp) — xem % tiết kiệm.
6. Bật **Lớp ùn tắc**, đổi khung giờ 22:00 → chạy lại A* xem tuyến đổi.

## Troubleshooting

| Triệu chứng | Nguyên nhân & cách xử |
|---|---|
| Frontend báo "Không gọi được backend" | Chưa chạy bước 4 — bật uvicorn rồi bấm **Thử lại** |
| `uvicorn: Address already in use` / port 8000 bận | `netstat -ano \| findstr :8000` → `taskkill /F /PID <pid>` (PowerShell) |
| Port 3000 bận | như trên với `:3000`, hoặc `npm run dev -- -p 3001` |
| Bản đồ nền trống / lỗi tile | Mất mạng — bật công tắc **Chế độ offline** (toast cũng tự nhắc) |
| Trang chỉ còn chữ không có giao diện (404 static hàng loạt) | Cache Next hỏng: tắt dev server → xoá thư mục `frontend/.next` → `npm run dev` lại. KHÔNG chạy `npm run build` khi dev server đang mở |
| Đổi `next.config.ts` xong giao diện không nhận | Bắt buộc restart `npm run dev` |
| `pytest` báo thiếu file data | Repo đã kèm data; nếu lỡ xoá → chạy bước 3 |
| Chữ tiếng Việt lỗi khi in từ script Python | Console Windows cp1252 — các script đã tự ép UTF-8; nếu viết script mới hãy `sys.stdout.reconfigure(encoding="utf-8")` |

## Kiểm chứng chất lượng (đã tự động hoá)

- `pytest backend/tests/` — 79 test: schema, thuật toán đối chứng NetworkX
  (2 550 cặp G_demo × 12 tổ hợp + G_real), TSP vs brute-force, API TestClient,
  regression méo khoảng cách G_demo (bất biến demo/real ≤1,5× time / ≤1,8× dist).
- `python scripts/validate_data.py` — ràng buộc SCHEMA + liên thông mạnh + phủ profile.
- `python scripts/check_contrast.py` — tương phản WCAG cả 2 theme (đồ hoạ ≥3,0; chữ ≥4,5).
- `python -m app.benchmark` (cwd backend) — 7 thí nghiệm, seed 42, số liệu trong `results/`.
