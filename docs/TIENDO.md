# TIENDO.md — Bảng tiến độ theo phase

> Cập nhật cuối mỗi phase (PROMPT-MASTER luật 1). Trạng thái: ⬜ chưa làm · 🔄 đang làm · ✅ xong.

| Phase | Nội dung | Trạng thái | Ghi chú | Commit |
|---|---|---|---|---|
| 0 | Scaffold repo, CLAUDE.md, SCHEMA.md (3 hợp đồng), mock 8 node + test schema | ✅ | 13/13 test pass. **Đang chờ duyệt `docs/SCHEMA.md`** trước khi sang Phase 1. Quyết định đã duyệt: dùng Python 3.14 (máy không có 3.11). Quyết định tự đưa (đã báo): `git init` tại Phase 0; mock đánh dấu rõ chiều một chiều là đơn giản hoá | `phase-0: scaffold repo, data contracts, mock data` |
| 1 | Data pipeline scripts/01→04 + DATA.md (G_real, G_demo, profiles) | ⬜ | Chờ duyệt SCHEMA; cuối phase báo số node/edge G_real để chốt bbox | |
| 2 | costs.py + heuristic + search.py (6 thuật toán lõi) + HEURISTIC-PROOF.md | ⬜ | | |
| 3 | search_advanced.py (4 thuật toán) + tsp.py (Held-Karp, NN+2opt, SA) | ⬜ | | |
| 4 | FastAPI main.py, graph_store.py, explain.py | ⬜ | | |
| 5 | Frontend Next.js 15 (map, animation, so sánh, multiroute, benchmark) | ⬜ | Theo dõi rủi ro: path repo có dấu tiếng Việt khi scaffold | |
| 6 | benchmark.py — 7 thí nghiệm → results/ | ⬜ | | |
| 7 | Deliverables: BaoCao-Khung, Slide-Outline, Video-KichBan, GIAI-THICH-THUAT-TOAN, README | ⬜ | | |

## Câu hỏi mở (không tự quyết — PROMPT-MASTER §9)

- Bbox cuối cùng: chờ số liệu node/edge thật của G_real ở Phase 1 (mục tiêu 2 000–6 000 node).
- Nhóm tự gửi mail giảng viên (`vntan.work@gmail.com`): xác nhận kịch bản shipper + việc dùng NetworkX làm baseline test.
- Điền tên thành viên A–E vào bảng phân công (phương án §8) + chốt người nộp bài.

## Nhật ký quyết định

- **2026-07-26 (Phase 0):** Dùng Python 3.14.0 thay vì 3.11 (user duyệt — máy chỉ có 3.14); pin `pydantic==2.13.4`, `pytest==9.1.1`. Chốt trong SCHEMA: enum algorithm đủ 10 giá trị; multiroute nhận ≤ 16 điểm tổng, riêng `held_karp` ≤ 15 (vượt → 422 `HELD_KARP_LIMIT`); error model `{error:{code,message_vi}}`; trace cắt tại 5 000 bước (`trace_truncated`); `include_trace` mặc định demo=true/real=false; `return_to_start` mặc định false.
- **2026-07-26 (duyệt SCHEMA — vòng 1):** (a) **Chốt Python 3.14 làm chuẩn dự án** sau kiểm chứng thật: `pip download` trong venv cp314 → 8/8 gói (osmnx 2.1.1, geopandas 1.1.4, shapely 2.1.2, pyproj 3.7.2, numpy 2.5.1, scipy 1.18.0, pandas 3.0.5, matplotlib 3.11.1) đều về wheel — 6 gói binary có `cp314-cp314-win_amd64`, 2 gói pure-python `py3-none-any`; đối chứng thêm bằng PyPI JSON API. Không gói nào rơi về sdist. Đã cập nhật PROMPT-MASTER §8, CLAUDE.md, README. (b) **Schema `trace` thêm trường `side`** (`forward|backward`) bắt buộc mỗi bước với `bidijkstra`, cấm với thuật toán khác; node nằm trong cả 2 frontier → map `g` hiển thị giá trị nhỏ hơn (phục vụ GUI tô 2 màu). Cập nhật SCHEMA §B.3 + models.py + mock mới `trace_bidijkstra_mock.json` + 4 test (17/17 pass).
