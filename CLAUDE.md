# CLAUDE.md — Project01 handoff

## Trạng thái hiện hành

Mốc kiểm mới nhất: **2026-08-08**, base HEAD `98a82b2`; current worktree đã hoàn
tất UI Clarity Phase trong `frontend/`, đồng bộ documentation và chụp lại hai
ảnh README. Backend/API/schema/graph/profile/data/results không thay đổi.

- 10 thuật toán hai điểm: `bfs`, `dfs`, `iddfs`, `ucs`, `dijkstra`, `astar`,
  `greedy`, `bidijkstra`, `idastar`, `beam`.
- 3 ATSP: `held_karp`, `nn_2opt`, `sa`.
- `frontend/` là frontend duy nhất. Shell responsive dùng bốn tab `Số liệu`,
  `Giải thích`, `So sánh`, `Thử nghiệm`; số liệu hành trình hiển thị km/phút,
  còn API/store giữ raw mét/giây theo contract.
- G_demo: **51 node / 298 cạnh có hướng / 60 one-way**.
- G_real: **2.118 node / 4.699 cạnh có hướng / 1.433 one-way**.
- Profile hiện tại là `tomtom+synthetic`; raw TomTom đủ 07:30, 12:00, 17:30 và
  22:00. Hai slot đầu lấy ngày 2026-07-27, hai slot sau lấy ngày 2026-08-03:
  hai ngày thứ Hai cách nhau bảy ngày, không phải time series cùng ngày.
- `data/raw/graph_raw.graphml`, bốn raw TomTom JSON và OSMnx cache hiện đều được
  Git track; đây không còn là artifact local-only/Git-ignore.
- `results/` là benchmark tạm ngày 2026-07-26, cũ hơn graph ngày 2026-07-27.
- Gate mới nhất: **176 backend pytest pass**, **40 frontend test pass**,
  `ALL DATA VALID`, `npx tsc --noEmit` và production `npm run build` pass ngày
  2026-08-08.
- Các regression hiện hành đã đạt; benchmark/gamma/generator cuối và
  các deliverable thủ công vẫn được hoãn có chủ đích.

Chuỗi `03b real → 04 → 03b demo → validate_data` đã hoàn tất. Không chạy lại
graph/profile; không chạy benchmark, gamma calibration hoặc teaching generator
nếu chưa có ủy quyền riêng cho giai đoạn ghi artifact đó.

## Đọc theo thứ tự

1. `docs/Lab 1 - Searching.pdf` — đề bài/rubric.
2. `docs/Lab1-ChotPhuongAn.md` — quyết định dự án đã chốt.
3. `PROMPT-MASTER.md` — đặc tả thi công lịch sử và current-state note.
4. `docs/SCHEMA.md` — contract graph/trace/API/cost.
5. `docs/CODEX-CODEBASE-MAP.md` — kiến trúc, test gap, blocker.
6. `docs/CODEX-BASELINE.md` — snapshot lịch sử 2026-07-27.
7. `docs/AUDIT-CLAUDE-PRE-SUBMISSION.md` — audit lịch sử.

`AGENTS.md` là quy tắc vận hành repository hiện hành. `docs/TIENDO.md`,
`docs/KIEMTOAN.md`, baseline và audit Claude là lịch sử, không phải bằng chứng
cho worktree hiện tại; current code/data và lệnh kiểm chứng mới có quyền cao hơn.

## Bất biến không được phá

- Một kiểu `Trace` duy nhất cho cả 10 thuật toán.
- `distance` dùng **mét**; `time` và `balanced` dùng **giây**.
- `total_time_s` luôn là balanced path weight, kể cả khi mode đang là
  `distance` hoặc `time`.
- IDA* mặc định ε = 5 **đơn vị cost của mode**: mét cho `distance`, giây cho
  hai mode còn lại.
- Cap trace 5.000 bước chỉ cắt payload, không cắt search hay metrics.
- UCS/Dijkstra/Bidijkstra cần trọng số không âm; A*/IDA* phụ thuộc heuristic
  admissible + consistent trong `docs/HEURISTIC-PROOF.md`.
- Product search/TSP/API tự cài bằng Python/`heapq`; NetworkX chỉ dùng trong
  pipeline, test và benchmark đối chứng.
- Graph là có hướng; ma trận ATSP là bất đối xứng.
- Demo backend đọc snapshot local, không gọi mạng.
- Random phải có seed: mặc định 42; SA dùng seed 0–4.
- Không hand-edit số sinh tự động trong
  `docs/GIAI-THICH-THUAT-TOAN.md`.

## Lệnh kiểm chứng an toàn

PowerShell, từ repo root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\ -q
.\.venv\Scripts\python.exe scripts\validate_data.py

Set-Location frontend
npm test
npx tsc --noEmit
```

Git Bash trên Windows:

```bash
.venv/Scripts/python.exe -m pytest backend/tests/ -q
.venv/Scripts/python.exe scripts/validate_data.py

cd frontend
npm test
npx tsc --noEmit
```

Backend, từ `backend/`:

```powershell
..\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Frontend, từ `frontend/`:

```powershell
npm run dev
```

Không chạy `npm run build` khi dev server còn hoạt động vì cả hai cùng ghi
`.next/`. Sau khi đổi `next.config.ts`, restart dev server.

## Lệnh có ghi artifact — không chạy mặc định

- `scripts/01_download_osm.py`, `02_build_graph.py`,
  `03b_build_profiles.py`, `04_build_gdemo.py`: ghi lại `data/`.
- `backend/app/benchmark.py`: ghi lại `results/`, phải chạy một mình.
- `scripts/05_calibrate_gamma.py`: ghi calibration result.
- `scripts/gen_teaching_doc.py`: ghi tài liệu sinh tự động.

Lượt data closeout trong `hdcrawl.md` đã hoàn tất. Phần benchmark/gamma/generator
còn lại là deferred work, chỉ chạy trọn chuỗi sau khi được cho phép riêng.

## Trước demo hoặc bàn giao

- Stop process cũ, restart backend/frontend, hard-refresh.
- Xác nhận `/api/graph?level=demo` trả 51/298.
- Kiểm `/benchmark` cuộn được ở độ phân giải quay/máy chiếu.
- QA map, keyboard, theme, offline, responsive và accessibility bằng browser.
- Không quảng bá con số trong `results/` là current.
- Giữ đủ 5 banner `SỐ TẠM` cho tới khi refresh cuối hoàn tất.
- Còn 8 `source_url` TODO và các artifact tay: danh tính/đóng góp, screenshot,
  report PDF, slide, video/link, data description và `[GroupID].zip`.

## Môi trường

- Python chuẩn: 3.14.0 trên Windows 11.
- Backend pin trong `backend/requirements.txt`.
- Frontend: Next 15.5.22, React 19.2.8, TypeScript 5.9.3; dùng
  `frontend/package-lock.json`.
- Đề bài đúng tên `docs/Lab 1 - Searching.pdf`.
- Repo có đường dẫn Unicode và khoảng trắng: luôn quote absolute path khi cần.
- Console Windows có thể dùng cp1252: file/script tiếng Việt phải đọc ghi UTF-8.
