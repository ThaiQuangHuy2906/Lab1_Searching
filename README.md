# Lab 1 — Search Algorithms for Vietnamese Traffic

Ứng dụng hỗ trợ shipper giao hàng đa điểm tại TP.HCM: tìm đường giữa 2 điểm bằng 10 thuật toán
tìm kiếm (BFS → A* → Bidirectional Dijkstra…) và tối ưu thứ tự giao hàng (ATSP: Held-Karp,
NN+2-opt, Simulated Annealing), có GUI trực quan hoá từng bước thuật toán.

> README này là bản tối thiểu (Phase 0). Bản đầy đủ (pipeline dữ liệu, backend, frontend,
> benchmark, troubleshooting) hoàn thiện ở Phase 7 theo `PROMPT-MASTER.md`.

## Yêu cầu môi trường

| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| **Python** | **3.14** | Chuẩn dự án — cả nhóm cài đúng bản này. Đã kiểm chứng (2026-07-26): mọi gói khoa học cần dùng đều có wheel `cp314 win_amd64` trên PyPI, cài không cần build |
| Node.js | ≥ 20 (đang dùng 24) | Cho frontend Next.js (từ Phase 5) |
| Git | bất kỳ | |
| Hệ điều hành | Windows 11 (chính); script hỗ trợ cả bash | |

## Cài đặt & chạy (trạng thái Phase 0)

PowerShell:

```powershell
py -3.14 -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.venv\Scripts\python.exe scripts\00_generate_mock.py   # sinh mock data (seed 42)
.venv\Scripts\python.exe -m pytest backend\tests\ -v   # 17/17 pass
```

Git Bash:

```bash
py -3.14 -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
.venv/Scripts/python.exe scripts/00_generate_mock.py
.venv/Scripts/python.exe -m pytest backend/tests/ -v
```

## Tài liệu

| File | Vai trò |
|---|---|
| `docs/Lab 1 - Searching.pdf` | Đề bài gốc |
| `docs/Lab1-ChotPhuongAn.md` | Phương án nhóm đã chốt |
| `PROMPT-MASTER.md` | Chỉ dẫn thi công 8 phase (luật của dự án) |
| `docs/SCHEMA.md` | 3 hợp đồng dữ liệu (graph / trace / REST API) |
| `docs/TIENDO.md` | Bảng tiến độ theo phase |
| `CLAUDE.md` | Hướng dẫn cho Claude Code khi mở session mới |
