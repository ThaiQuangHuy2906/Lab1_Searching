# TIENDO.md — Bảng tiến độ theo phase

> Cập nhật cuối mỗi phase (PROMPT-MASTER luật 1). Trạng thái: ⬜ chưa làm · 🔄 đang làm · ✅ xong.

| Phase | Nội dung | Trạng thái | Ghi chú | Commit |
|---|---|---|---|---|
| 0 | Scaffold repo, CLAUDE.md, SCHEMA.md (3 hợp đồng), mock 8 node + test schema | ✅ | 13/13 test pass. **Đang chờ duyệt `docs/SCHEMA.md`** trước khi sang Phase 1. Quyết định đã duyệt: dùng Python 3.14 (máy không có 3.11). Quyết định tự đưa (đã báo): `git init` tại Phase 0; mock đánh dấu rõ chiều một chiều là đơn giản hoá | `phase-0: scaffold repo, data contracts, mock data` |
| 1 | Data pipeline scripts/01→04 + DATA.md (G_real, G_demo, profiles) | ✅ | G_real **2118 node / 4699 cạnh** (trong mục tiêu 2000–6000 → đề xuất GIỮ bbox hiện tại, chờ user chốt). G_demo 50 node / 138 cạnh / 44 oneway từ 51 POI (chờ review danh sách POI + preview PNG). Build không cần API key (synthetic); validate + 20/20 test pass | `phase-1: offline data pipeline` |
| 2 | costs.py + heuristic + search.py (6 thuật toán lõi) + HEURISTIC-PROOF.md | ✅ | 38/38 test: UCS/Dijkstra/A* khớp NetworkX 1e-6 trên **toàn bộ 2 550 cặp G_demo × 12 (mode,slot)** + 50 cặp G_real; consistency kiểm trên từng cạnh. Phát hiện & sửa lỗi làm tròn phá admissible (length ceil 0.1 m, t_free tính exact) — HEURISTIC-PROOF §6b. graph_store.py viết sớm (search cần) | `phase-2: six core search algorithms` |
| 3 | search_advanced.py (4 thuật toán) + tsp.py (Held-Karp, NN+2opt, SA) | ⬜ | | |
| 4 | FastAPI main.py, graph_store.py, explain.py | ⬜ | | |
| 5 | Frontend Next.js 15 (map, animation, so sánh, multiroute, benchmark) | ⬜ | Theo dõi rủi ro: path repo có dấu tiếng Việt khi scaffold | |
| 6 | benchmark.py — 7 thí nghiệm → results/ | ⬜ | | |
| 7 | Deliverables: BaoCao-Khung, Slide-Outline, Video-KichBan, GIAI-THICH-THUAT-TOAN, README | ⬜ | | |

## Câu hỏi mở (không tự quyết — PROMPT-MASTER §9)

- **Bbox cuối cùng:** G_real thực tế = 2 118 node / 4 699 cạnh, NẰM TRONG mục tiêu 2 000–6 000 → đề xuất giữ bbox `(106.680, 10.760, 106.720, 10.800)`. Chờ user chốt.
- **Danh sách 51 POI** (`data/gdemo_pois.json`) + preview `data/gdemo_preview.png`: chờ nhóm/giảng viên review.
- Nhóm tự gửi mail giảng viên (`vntan.work@gmail.com`): xác nhận kịch bản shipper + việc dùng NetworkX làm baseline test.
- Điền tên thành viên A–E vào bảng phân công (phương án §8) + chốt người nộp bài.

## Nhật ký quyết định

- **2026-07-26 (Phase 2):** (a) Test consistency phát hiện **lỗi làm tròn phá admissible** (~3 cm): sửa bằng `ceil_dm` (length làm tròn LÊN 0.1 m) + `edge_weight` tính `t_free` exact từ length/speed thay vì field đã tròn → rebuild data (G_demo giờ 51 node / 141 cạnh / 55 oneway). (b) `graph_store.py` viết ở Phase 2 thay vì Phase 4 vì search cần (Phase 4 chỉ còn main.py + explain.py). (c) `metrics` totals không làm tròn (để đối chứng 1e-6); g/h/f trong trace round 0.1 chỉ để hiển thị. (d) Goal-test thống nhất khi EXPAND (pop) ở mọi thuật toán để video giảng nhất quán. (e) IDDFS giới hạn depth 100, chỉ khả thi thực tế trên G_demo.
- **2026-07-26 (Phase 0):** Dùng Python 3.14.0 thay vì 3.11 (user duyệt — máy chỉ có 3.14); pin `pydantic==2.13.4`, `pytest==9.1.1`. Chốt trong SCHEMA: enum algorithm đủ 10 giá trị; multiroute nhận ≤ 16 điểm tổng, riêng `held_karp` ≤ 15 (vượt → 422 `HELD_KARP_LIMIT`); error model `{error:{code,message_vi}}`; trace cắt tại 5 000 bước (`trace_truncated`); `include_trace` mặc định demo=true/real=false; `return_to_start` mặc định false.
- **2026-07-26 (Phase 1):** Tách profiles thành 2 file `traffic_profiles_real.json` / `traffic_profiles_demo.json` (edge id space của 2 graph trùng nhau — SCHEMA §A.4 đã cập nhật; lệch tên so với cây thư mục PROMPT-MASTER §2). Quyết định build tự đưa (ghi trong DATA.md): dedup cạnh song song giữ cạnh nhanh nhất; `oneway` suy từ cấu trúc cuối; G_demo nối k-gần-nhất (k=4) + luật một chiều 1.4× + tỉa cạnh thừa khi đường vòng ≤1.5× (191→138 cạnh); *Nhà thờ Tân Định* bị gộp node với *Chợ Tân Định*; Bưu điện TP mang type `warehouse` làm depot kịch bản shipper. Hạn chế ghi nhận: `narrow_alley` hiếm (drive network loại hẻm) — G_demo 0 cạnh hẻm.
- **2026-07-26 (duyệt SCHEMA — vòng 1):** (a) **Chốt Python 3.14 làm chuẩn dự án** sau kiểm chứng thật: `pip download` trong venv cp314 → 8/8 gói (osmnx 2.1.1, geopandas 1.1.4, shapely 2.1.2, pyproj 3.7.2, numpy 2.5.1, scipy 1.18.0, pandas 3.0.5, matplotlib 3.11.1) đều về wheel — 6 gói binary có `cp314-cp314-win_amd64`, 2 gói pure-python `py3-none-any`; đối chứng thêm bằng PyPI JSON API. Không gói nào rơi về sdist. Đã cập nhật PROMPT-MASTER §8, CLAUDE.md, README. (b) **Schema `trace` thêm trường `side`** (`forward|backward`) bắt buộc mỗi bước với `bidijkstra`, cấm với thuật toán khác; node nằm trong cả 2 frontier → map `g` hiển thị giá trị nhỏ hơn (phục vụ GUI tô 2 màu). Cập nhật SCHEMA §B.3 + models.py + mock mới `trace_bidijkstra_mock.json` + 4 test (17/17 pass).
