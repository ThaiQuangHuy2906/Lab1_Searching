# CLAUDE.md — Lab 1: Search Algorithms for Vietnamese Traffic

## Tổng quan (10 dòng)

Ứng dụng hỗ trợ shipper giao hàng đa điểm tại TP.HCM: tìm đường 2 điểm bằng 10 thuật toán
(bfs, dfs, iddfs, ucs, dijkstra, astar, greedy, bidijkstra, idastar, beam) và tối ưu thứ tự
giao hàng ATSP (held_karp, nn_2opt, sa). Dữ liệu 2 tầng: `G_demo` (~50 node địa danh thật,
để visualize/quay video) và `G_real` (vài nghìn node từ OSM, để benchmark); congestion 4 khung
giờ (07:30/12:00/17:30/22:00) từ TomTom hoặc synthetic fallback — demo chạy offline hoàn toàn.
Chi phí quy hết về GIÂY: `t_free·f_cong + penalty` (γ=1.5; ngập 60/lô cốt 90/hẻm 30/đèn 25),
3 mode distance/time/balanced; heuristic haversine/v_max (admissible + consistent).
Backend FastAPI (port 8000) + frontend Next.js 15 (port 3000, MapLibre + deck.gl).
Mọi thuật toán trả về MỘT cấu trúc `trace` duy nhất — quy tắc vàng, xem `docs/SCHEMA.md`.
Làm theo 8 phase, cuối mỗi phase dừng chờ duyệt — xem `PROMPT-MASTER.md` + `docs/TIENDO.md`.

## Bắt đầu session mới — đọc theo thứ tự

1. `CLAUDE.md` (file này) → 2. `docs/TIENDO.md` (đang ở phase nào) → 3. `PROMPT-MASTER.md`
(luật + đặc tả phase) → 4. `docs/SCHEMA.md` (3 hợp đồng dữ liệu). Tiếp tục phase đang dở,
không bao giờ làm lại thứ đã xong.

## Lệnh chạy (Windows — PowerShell hoặc Git Bash)

```bash
# venv (đã tạo bằng Python 3.14 — xem Ghi chú môi trường)
py -3.14 -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt

# sinh mock data (deterministic, seed 42)
.venv/Scripts/python.exe scripts/00_generate_mock.py

# test
.venv/Scripts/python.exe -m pytest backend/tests/ -v

# pipeline dữ liệu (offline một lần; 01 cần mạng, có cache trong data/raw/)
.venv/Scripts/python.exe scripts/01_download_osm.py
.venv/Scripts/python.exe scripts/02_build_graph.py
.venv/Scripts/python.exe scripts/03b_build_profiles.py real
.venv/Scripts/python.exe scripts/04_build_gdemo.py
.venv/Scripts/python.exe scripts/03b_build_profiles.py demo
.venv/Scripts/python.exe scripts/validate_data.py
# (03a_crawl_tomtom.py tuỳ chọn — cần TOMTOM_API_KEY trong .env, chạy 4 lần đúng 4 khung giờ)

# backend API (cwd backend/): ../.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000
# frontend (cwd frontend/):   npm install && npm run dev   → http://localhost:3000
#   (thiết kế bám docs/DESIGN.md — token trong frontend/tailwind.config.ts)
```

## Quy ước bất biến (chi tiết: PROMPT-MASTER.md mục 1)

- **Schema trước code** — đổi hợp đồng dữ liệu phải sửa `docs/SCHEMA.md` trước và báo rõ.
- **Trace chuẩn duy nhất** cho cả 10 thuật toán; đơn vị chi phí duy nhất là **GIÂY**.
- Thuật toán sản phẩm tự cài (Python thuần + `heapq`); **NetworkX chỉ trong test/benchmark**.
- OSMnx **v2**, query bbox **tuple** `(106.680, 10.760, 106.720, 10.800)` — cấm cú pháp v1, cấm query theo tên quận.
- Không gọi mạng khi demo; mọi random có seed (mặc định 42, SA 5 seed 0–4).
- Ngôn ngữ: code/commit tiếng Anh — UI/explanation/báo cáo/docs tiếng Việt.
- Mỗi phase một commit `phase-N: <nội dung>`; sửa giữa chừng `fix: <nội dung>`.

## Ghi chú môi trường (đã duyệt Phase 0)

- **Python 3.14 là chuẩn của dự án** (PROMPT-MASTER §8 đã cập nhật từ 3.11 ngày 2026-07-26).
  Đã kiểm chứng: 8 gói khoa học (osmnx, geopandas, shapely, pyproj, numpy, scipy, pandas,
  matplotlib) đều có wheel `cp314 win_amd64` / `py3-none-any` trên PyPI — cài không cần build.
  Version pin trong `backend/requirements.txt` kiểm chứng trên 3.14/Win11. Cả nhóm cài đúng 3.14.
- File đề bài tên thật là `docs/Lab 1 - Searching.pdf` (dấu cách, không phải `Lab_1_-_Searching.pdf`).
- Console Windows mặc định cp1252 — script Python in tiếng Việt phải wrap stdout UTF-8
  (hoặc chỉ print ASCII); mọi file đọc/ghi với `encoding="utf-8"`.
- Đường dẫn repo chứa dấu tiếng Việt + khoảng trắng — luôn quote path trong lệnh shell.
