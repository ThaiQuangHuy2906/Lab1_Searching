# CHỐT PHƯƠNG ÁN — Lab 1: Search Algorithms for Vietnamese Traffic

> **Cập nhật 2026-07-27:** đây là bản quyết định dự án hiện hành, đứng sau đề bài
> và trước đặc tả thi công lịch sử `PROMPT-MASTER.md`. ✅ = đã chốt; ⬜ = việc
> con người hoặc dữ liệu cuối chưa hoàn tất.

## 1. Kịch bản và phạm vi

| Hạng mục | Lựa chọn đã chốt |
|---|---|
| Kịch bản | ✅ Ứng dụng hỗ trợ shipper giao hàng đa điểm tại TP.HCM |
| Hai bài toán | ✅ Tìm đường giữa hai điểm + tối ưu thứ tự nhiều điểm giao |
| Phạm vi | ✅ Khu lõi TP.HCM, bbox `(106.680, 10.760, 106.720, 10.800)` |
| Mạng đường | ✅ OSM `network_type="drive"`, đồ thị có hướng |
| Cách chạy demo | ✅ Localhost, route engine đọc snapshot local và không gọi mạng |

Không mô hình hoá ràng buộc riêng cho xe tải/cấm tải theo giờ. Risk hiện thực chỉ
gồm ngập, lô cốt, hẻm nhỏ và đèn tín hiệu.

## 2. Dữ liệu

| Hạng mục | Lựa chọn |
|---|---|
| Hướng dữ liệu | ✅ Hybrid: OSM + TomTom tùy chọn + luật synthetic + risk thủ công |
| OSM | ✅ OSMnx 2.1.1, API v2, query bbox; không query theo tên quận/phường |
| Congestion | ✅ 4 mốc 07:30, 12:00, 17:30, 22:00; mức 1–5 |
| TomTom | ⬜ Raw đã có 07:30 và 12:00; còn 17:30 và 22:00 |
| Profile hiện hành | ✅ `traffic_profiles_demo.json` và `traffic_profiles_real.json`, cả hai vẫn `source="synthetic"` |
| Risk | ⬜ 8 mục trong `manual_risks.json`; 8 `source_url` còn TODO |
| Free-flow | ✅ Nhóm đặt theo `highway`, không tuyên bố là tốc độ giới hạn pháp lý |

### Hai tầng graph hiện hành

| Tầng | Snapshot 2026-07-27 | Mục đích |
|---|---:|---|
| `G_demo` | 51 node / 292 cạnh có hướng / 56 one-way | animation, chạy tay, video và giảng thuật toán |
| `G_real` | 2.118 node / 4.699 cạnh có hướng / 1.433 one-way | scale, benchmark và đối chứng |

G_demo vượt yêu cầu tối thiểu 20 node / 30 cạnh. Cạnh co kế thừa hành lang thật
trên G_real và được validator bảo vệ bằng các cận contraction ghi trong
`data/DATA.md`.

## 3. Cost và heuristic

```text
distance: w(e) = length_m                                      [mét]
time:     w(e,h) = t_free(e) × f_cong(e,h)                     [giây]
balanced: w(e,h) = t_free(e) × f_cong(e,h) + penalty(e)        [giây]

t_free  = length / v_free
f_cong  = 1 + γ × (congestion - 1) / 4,  γ = 1,5
penalty = 60×ngập + 90×lô_cốt + 30×hẻm + 25×đèn_tín_hiệu
```

| Quyết định | Nội dung |
|---|---|
| Mode | ✅ `distance`, `time`, `balanced`; mặc định `balanced` |
| Đơn vị | ✅ Không trộn: distance dùng mét; time/balanced dùng giây |
| Heuristic distance | ✅ `h = haversine(node, goal)` mét |
| Heuristic time/balanced | ✅ `h = haversine(node, goal) / v_max` giây |
| Tính chất | ✅ Có chứng minh admissible + consistent trong `docs/HEURISTIC-PROOF.md` |
| IDA* epsilon | ✅ Mặc định 5 đơn vị cost của mode: 5 m hoặc 5 s |

## 4. Thuật toán

### Tìm đường hai điểm

| # | Thuật toán | Nhóm đề bài | Bảo đảm hiện thực |
|---:|---|---|---|
| 1 | BFS | Bắt buộc | tuyến ít cạnh; không tối ưu cost có trọng số |
| 2 | DFS | Bắt buộc | không tối ưu |
| 3 | IDDFS | Bổ sung | nông nhất trong depth cap; không tối ưu weighted cost |
| 4 | UCS | Bắt buộc | tối ưu với trọng số không âm |
| 5 | Dijkstra | Bổ sung | tối ưu với trọng số không âm |
| 6 | A* | Bắt buộc | tối ưu với heuristic đã chứng minh |
| 7 | Greedy Best-First | Bổ sung | không tối ưu |
| 8 | Bidirectional Dijkstra | Bổ sung | tối ưu; xử lý graph có hướng bằng reverse adjacency |
| 9 | IDA* | Bổ sung | trong `C* + ε` khi tìm được trước cap |
| 10 | Beam Search | Bổ sung | không complete, không tối ưu |

Đề yêu cầu ít nhất 2 thuật toán bổ sung; dự án có 6 thuật toán bổ sung nếu đếm
IDDFS tách riêng.

### Tối ưu đa điểm (ATSP)

| Thuật toán | Vai trò | Bảo đảm | Giới hạn |
|---|---|---|---|
| Held–Karp | ground truth bằng dynamic programming | tối ưu tuyệt đối | tối đa 15 điểm kể cả start |
| Nearest Neighbor + cải thiện bất đối xứng | heuristic nhanh | không bảo đảm tối ưu | tổng tối đa 16 điểm |
| Simulated Annealing | metaheuristic, seed 0–4 | không bảo đảm tối ưu | tổng tối đa 16 điểm |

Ma trận chi phí là bất đối xứng vì graph có đường một chiều.
`return_to_start=false` là mặc định đã chốt.

## 5. Công nghệ

| Tầng | Lựa chọn hiện hành |
|---|---|
| Backend | ✅ Python 3.14.0 + FastAPI 0.140.0 + Pydantic 2.13.4 |
| Frontend | ✅ Next.js 15.5.22 + React 19.2.8 + TypeScript 5.9.3 |
| Map | ✅ MapLibre GL + react-map-gl + deck.gl |
| State/chart | ✅ Zustand + Recharts |
| Pipeline | ✅ OSMnx + NetworkX + Matplotlib |
| NetworkX | ✅ Chỉ pipeline/test/benchmark; không nằm trong product search/TSP/API |
| Runtime | ✅ Localhost; basemap có thể cần mạng, có chế độ offline |

## 6. Contract đã chốt

| Contract | Nguồn chuẩn | Consumer |
|---|---|---|
| Graph + traffic profile | `docs/SCHEMA.md` §A | pipeline, GraphStore, frontend |
| Một kiểu `Trace` cho 10 thuật toán | `docs/SCHEMA.md` §B | search, API, timeline/map/drawer |
| REST API + error envelope | `docs/SCHEMA.md` §C | FastAPI, frontend |
| Cost + heuristic | `docs/SCHEMA.md` §D | GraphStore, search, explanation |

Hiện thân executable là `backend/app/models.py`; mismatch phải được báo và xử
lý theo contract, không tự chọn im lặng.

## 7. Bảy thí nghiệm

| # | Thí nghiệm | Artifact |
|---:|---|---|
| 1 | UCS/Dijkstra/A* vs NetworkX trên 1.200 ca | `exp1_correctness.csv` |
| 2 | kiểm tra thực nghiệm heuristic `h ≤ h*` | `exp2_admissibility.csv` + figure |
| 3 | 10 thuật toán × 200 cặp × 2 khung giờ | `exp3_benchmark.csv` + 3 figure |
| 4 | A* 07:30 vs 22:00, tỷ lệ đổi tuyến | `exp4_congestion.csv` + examples |
| 5 | độ nhạy γ từ 0 đến 3 | `exp5_gamma.csv` + curve |
| 6 | 5 cặp đối chứng Google Maps định tính | `exp6_pairs.json` + routes |
| 7 | 3 ATSP trên kịch bản 10 điểm | `exp7_tsp.csv` + map |

> `results/` hiện là lượt synthetic ngày 2026-07-26 và cũ hơn graph hiện hành.
> Không chép headline từ đó vào bản nộp. Chạy lại đúng một lượt sau quyết định
> dữ liệu cuối.

## 8. Phân công cần điền

| Vai trò | Người | Phạm vi chính | Mục report |
|---|---|---|---|
| A — Data Engineer | ⬜ | `scripts/`, `data/` | c, d |
| B — Core Search | ⬜ | `search.py`, trace | e, f |
| C — Advanced + ATSP | ⬜ | `search_advanced.py`, `tsp.py` | e, h |
| D — Frontend | ⬜ | `frontend/` | i |
| E — API + Eval + Report | ⬜ | API, explanation, benchmark, deliverables | a, b, g, j |

⬜ Điền họ tên, MSSV, tỷ lệ đóng góp và chốt người đại diện nộp bài.

## 9. Bộ nộp

```text
[GroupID].zip
├── [GroupID - SC].txt
├── [GroupID - Report].pdf
├── [GroupID - Slide].pptx hoặc [GroupID - Slide].pdf
├── [GroupID - Video].txt
└── [GroupID - Data].zip hoặc [GroupID - Data].txt
```

Link source/video phải mở được ở tab ẩn danh. Repository hiện mới có khung
Markdown, chưa có đầy đủ artifact cuối.

## 10. Ngoài phạm vi

- traffic realtime trong lúc demo;
- turn penalty/cấm rẽ theo edge-state;
- ALT landmark heuristic;
- VRP nhiều shipper;
- Genetic Algorithm/Ant Colony;
- cloud deployment.

Mobile/responsive, offline, accessibility và projector resolution vẫn là phạm
vi QA trước bảo vệ, dù không mở rộng thành một thiết kế mobile riêng.

## 11. Việc còn lại theo thứ tự

1. ⬜ Thu nốt TomTom 17:30 và 22:00; chưa chạy 03b/benchmark.
2. ⬜ Chốt nguồn dữ liệu cuối, rồi chạy trọn pipeline trong `hdcrawl.md`.
3. ⬜ Thay 8 `source_url` TODO và sửa metadata risk theo luật cạnh đi vào vùng.
4. ⬜ Đồng bộ 5 banner/số liệu sau benchmark + generator cuối.
5. ⬜ Điền danh tính/nội dung, chụp ảnh, tạo report/slide/video/data description.
6. ⬜ Restart service, QA browser/máy chiếu, kiểm link ẩn danh và đóng ZIP.
