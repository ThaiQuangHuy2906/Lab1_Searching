# CHỐT PHƯƠNG ÁN — Lab 1: Search Algorithms for Vietnamese Traffic

> Bản tóm tắt 1 trang để cả nhóm nắm nhanh "mình chọn gì". Chi tiết kỹ thuật xem file `Lab1-Search-KeHoach-ChiTiet.md`.
> ✅ = đã chốt · ⬜ = nhóm cần quyết

---

## 1. Kịch bản

| Hạng mục | Lựa chọn |
|---|---|
| Kịch bản (đề cho 7 lựa chọn) | ✅ **Ứng dụng hỗ trợ shipper giao hàng đa điểm tại TP.HCM** |
| Vì sao chọn | Có sẵn cả 2 bài toán đề yêu cầu: tìm đường 2 điểm + tối ưu thứ tự nhiều điểm. Các kịch bản khác (cứu thương, du lịch) chỉ mạnh 1 trong 2 |
| Phạm vi địa lý | Khu lõi TP.HCM — bounding box `(106.680, 10.760, 106.720, 10.800)` ⬜ *chốt lại sau khi A tải thử* |
| Phương tiện mô hình hoá | Xe máy (mặc định) + xe tải (để minh hoạ ràng buộc cấm tải theo giờ) |

---

## 2. Dữ liệu

| Hạng mục | Lựa chọn |
|---|---|
| Hướng dữ liệu (đề cho 3 hướng) | ✅ **Hướng 3 — Hybrid** (đề khuyến nghị) |
| Cấu trúc mạng lưới đường | ✅ OpenStreetMap qua **OSMnx 2.1.x** (dùng API v2, không dùng cú pháp v1) |
| Cách truy vấn | ✅ **Bounding box toạ độ**, KHÔNG dùng tên quận (do bỏ cấp quận từ 01/7/2025) |
| Mức độ ùn tắc | ✅ **TomTom Traffic Flow API** — `currentSpeed / freeFlowSpeed` → thang 1–5 |
| Đối chiếu định tính | ✅ Cổng giao thông TP.HCM `giaothong.hochiminhcity.gov.vn` |
| Rủi ro (ngập / lô cốt / hẻm / cấm tải) | ✅ Luật nghiệp vụ do nhóm định nghĩa, có dẫn nguồn |
| Tốc độ free-flow | ✅ Nhóm tự đặt theo `highway type` (25–50 km/h nội đô), **không** dùng tốc độ giới hạn pháp lý |
| Số khung giờ chụp | ✅ 4 mốc: **07:30 · 12:00 · 17:30 · 22:00** |
| Cách lưu | ✅ 2 file tách biệt: `graph.json` (tĩnh) + `traffic_profiles.json` (động theo giờ), commit vào repo |

### Kiến trúc 2 tầng đồ thị (quyết định quan trọng nhất)

| Tầng | Quy mô | Dùng để làm gì |
|---|---|---|
| `G_demo` | 40–60 node, ~120 cạnh, tên địa danh thật | Visualize từng bước, quay video, giảng thuật toán, ví dụ tính tay |
| `G_real` | Vài nghìn node từ OSM | Benchmark, đo số node expand, chứng minh scale |

*(Đề yêu cầu tối thiểu 20 node / 30 cạnh → `G_demo` đã vượt xa.)*

---

## 3. Hàm chi phí & heuristic

```
cost(e, h) = t_free(e) · f_cong(e,h) + penalty(e)          [đơn vị: GIÂY]

t_free   = length / v_free
f_cong   = 1 + γ·(congestion − 1)/4          γ = 1.5
penalty  = 60·ngập + 90·lô_cốt + 30·hẻm_nhỏ + 25·đèn_đỏ
```

| Quyết định | Nội dung |
|---|---|
| Không cộng đại lượng khác đơn vị | ✅ Quy **tất cả về giây** thay vì `α·dist + β·time + γ·cong` như công thức mẫu của đề |
| 3 chế độ tối ưu | ✅ `distance` / `time` / `balanced` — **mặc định là `balanced`** |
| Heuristic | ✅ `h(n) = haversine(n, goal) / v_max` (mode time & balanced) · `h = haversine(n, goal)` (mode distance) |
| Tính chất heuristic | ✅ **Admissible và consistent** — có chứng minh toán học + kiểm chứng thực nghiệm |

---

## 4. Thuật toán

### Tìm đường 2 điểm

| # | Thuật toán | Nhóm | Tối ưu? | Người làm |
|---|---|---|---|---|
| 1 | BFS | Bắt buộc | Chỉ khi cạnh đồng trọng số | B |
| 2 | DFS (+ IDDFS) | Bắt buộc | ❌ Không | B |
| 3 | UCS | Bắt buộc | ✅ Có | B |
| 4 | A\* | Bắt buộc | ✅ Có | B |
| 5 | Dijkstra | Bổ sung | ✅ Có | B |
| 6 | Greedy Best-First | Bổ sung | ❌ Không | C |
| 7 | Bidirectional Dijkstra | Bổ sung | ✅ Có | C |
| 8 | IDA\* (ε = 5s) | Bổ sung | ✅ Có (với ngưỡng ε) | C |
| 9 | Beam Search (k) | Bổ sung | ❌ Không complete | C |

→ Đề yêu cầu **≥ 2** thuật toán bổ sung, nhóm làm **5**.

### Tối ưu đa điểm (TSP)

| Thuật toán | Vai trò | Tối ưu? | Giới hạn |
|---|---|---|---|
| **Held-Karp (DP)** | Ground truth để đo các heuristic khác | ✅ **Tối ưu tuyệt đối** | n ≤ 12–15 |
| **Nearest Neighbor + 2-opt** | Nhanh, thực dụng | ❌ Xấp xỉ (~2–5% so với tối ưu) | Không giới hạn |
| **Simulated Annealing** | Metaheuristic, chạy 5 seed | ❌ Xấp xỉ | Không giới hạn |

→ Đề yêu cầu **≥ 1** phương pháp, nhóm làm **3**. Ma trận chi phí là **bất đối xứng (ATSP)** vì có đường một chiều.

---

## 5. Công nghệ

| Tầng | Lựa chọn |
|---|---|
| Backend | ✅ **Python 3.11 + FastAPI** — thuật toán, benchmark, explanation |
| Frontend | ✅ **Next.js 15 (App Router) + TypeScript** |
| Bản đồ | ✅ **MapLibre GL** (qua `react-map-gl`) + **deck.gl** cho lớp overlay |
| State | ✅ zustand · Biểu đồ: recharts |
| Xử lý dữ liệu offline | ✅ OSMnx + NetworkX + pandas |
| NetworkX trong sản phẩm | ✅ **Chỉ dùng làm baseline đối chứng** trong test, KHÔNG dùng cho tính năng chính ⬜ *cần hỏi giảng viên xác nhận* |
| Nơi chạy khi demo | ✅ **localhost** — không phụ thuộc cloud/wifi trường |

---

## 6. Ba hợp đồng dữ liệu phải chốt trong tuần 1

| Hợp đồng | Nội dung | Ai dùng |
|---|---|---|
| `graph.json` schema | Node (id, name, lat, lon, type) + Edge (length_m, **free_travel_time_s**, highway, oneway, risk...) | A → B, C, D |
| `trace` schema | `{path, metrics, trace[], explanation, alternatives}` — **mọi thuật toán trả về giống hệt nhau** | B, C → D, E |
| REST API | `POST /api/route` · `POST /api/multiroute` · `GET /api/graph` · `POST /api/benchmark` | E → D |

> **Quy tắc vàng:** không ai code trước khi chốt xong 3 hợp đồng này. Sau khi chốt, A và E tạo dữ liệu giả đúng schema để D làm frontend song song ngay từ ngày 2.

---

## 7. Thí nghiệm sẽ chạy (số liệu cho report)

| # | Thí nghiệm | Đầu ra |
|---|---|---|
| 1 | Kiểm chứng đúng đắn — 200 cặp OD, đối chứng NetworkX | "200/200 test pass" |
| 2 | Kiểm chứng admissible bằng Dijkstra ngược | Scatter plot `h` vs `h*` |
| 3 | Benchmark 9 thuật toán × 200 cặp × 2 khung giờ | Bảng chính + biểu đồ cột |
| 4 | Ảnh hưởng ùn tắc — 07:30 vs 22:00 | "% cặp OD đổi tuyến" |
| 5 | Độ nhạy trọng số γ (0 → 3) | Biểu đồ 2 đường cong |
| 6 | Đối chứng Google Maps (định tính) | 5 ảnh so sánh |
| 7 | TSP: thứ tự gốc vs tối ưu | "Tiết kiệm ~36% thời gian" |

---

## 8. Phân công

| Người | Vai trò | File chính | Mục report |
|---|---|---|---|
| **A** ⬜ | Data Engineer | `scripts/01–03`, `graph.json`, `G_demo` | d |
| **B** ⬜ | Core Search | `search.py` (BFS/DFS/UCS/A\*/Dijkstra) + trace | e, f |
| **C** ⬜ | Advanced + TSP | `search_advanced.py`, `tsp.py` | e, h |
| **D** ⬜ | Frontend | toàn bộ `frontend/` | i |
| **E** ⬜ | API + Eval + Report | `main.py`, `explain.py`, `benchmark.py` | a, b, g, j |

⬜ **Điền tên thành viên vào bảng này ngay trong buổi họp đầu tiên.**

---

## 9. Sản phẩm nộp

```
[GroupID].zip
├── [GroupID - SC].txt        link GitHub (public / mời giảng viên)
├── [GroupID - Report].pdf    10 mục a–j, 35–50 trang
├── [GroupID - Slide].pptx    12–15 slide
├── [GroupID - Video].txt     link 18–25 phút (KIỂM TRA QUYỀN Ở TAB ẨN DANH)
└── [GroupID - Data].zip      graph.json + traffic_profiles.json + DATA.md
```

⬜ **Người đại diện nộp bài:** đề xuất E — cần cả nhóm xác nhận.

---

## 10. Những gì nhóm KHÔNG làm (chốt để tránh vỡ tiến độ)

| Không làm | Lý do |
|---|---|
| Dữ liệu giao thông **thời gian thực** khi demo | Snapshot tĩnh commit sẵn → demo luôn tái lập được, không sợ mất mạng |
| Turn penalty / cấm rẽ trái (edge-based graph) | Chi phí cài đặt cao → đưa vào mục "Future Work" |
| Landmark heuristic (ALT) | Chỉ làm nếu tuần 3 còn dư thời gian |
| VRP nhiều shipper | Ngoài phạm vi đề → mục "Future Work" |
| Genetic Algorithm, Ant Colony | Đã đủ số lượng thuật toán; chỉ thêm nếu C xong sớm |
| Deploy lên cloud | Không cần cho việc chấm; chạy localhost |
| Giao diện mobile responsive | Ghi nhận là hạn chế ở mục a (mức hoàn thành GUI 95%) |

---

## 11. Việc cần làm ngay

1. ⬜ **Họp chốt 3 hợp đồng dữ liệu** (mục 6) → ghi vào `docs/SCHEMA.md`
2. ⬜ **Điền tên vào bảng phân công** (mục 8) và chốt người nộp bài
3. ⬜ **A tải thử OSM bằng bbox** → biết đồ thị thật bao nhiêu node → chốt phạm vi cuối
4. ⬜ **E đăng ký API key TomTom** (miễn phí, không cần thẻ) → crawl thử 10 điểm
5. ⬜ **Gửi mail giảng viên** (`vntan.work@gmail.com`): xác nhận kịch bản shipper + hỏi có được dùng `networkx` làm baseline đối chứng không
