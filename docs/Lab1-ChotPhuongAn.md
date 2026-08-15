# CHỐT PHƯƠNG ÁN — Lab 1: Search Algorithms for Vietnamese Traffic

> **Kiểm lại 2026-08-09:** đây là bản quyết định dự án hiện hành, đứng sau đề bài
> và trước đặc tả thi công lịch sử `PROMPT-MASTER.md`. ✅ = đã chốt; ⬜ = việc
> con người hoặc dữ liệu cuối chưa hoàn tất.
> UI Clarity Phase 2026-08-07 là mốc lịch sử đã hoàn tất và không đổi kịch bản,
> thuật toán, API, graph, cost hay dữ liệu đã chốt.
>
> **Quyết định bổ sung được người dùng duyệt 2026-08-09:** mở phase riêng
> **UI & Explanation v2** để cải thiện cách chọn bài toán, so sánh nhiều kết quả,
> số liệu, Dijkstra hai chiều và phần Giải thích. Phase này được phép mở rộng
> **additive** response/trace contract theo `docs/SCHEMA.md` §F, nhưng không được
> đổi graph, công thức cost, heuristic, tie-break, đường đi/kết quả thuật toán,
> seed, dữ liệu hay benchmark. Việc triển khai phải backend-first, giữ reader cũ
> hoạt động trong giai đoạn chuyển tiếp và qua các gate đã chốt trong
> `docs/SCHEMA.md` §F.
> **Cập nhật audit 2026-08-11:** Phase 0–6 đã hoàn tất; Phase 7 ATSP comparison
> 2–3 và Phase 8 hardening đã được triển khai end-to-end. Contract/UI Explanation
> v2 hiện phát và đọc payload version 2. Regression IDA* từng bị validator bác
> nhầm nghiệm hợp lệ trong biên ε đã được sửa và có test. Fresh automated gates
> của audit cuối: backend 235/235, frontend 137/137, TypeScript, production build
> và data validator đều đạt. Chrome Desktop full-view ngày 2026-08-11 đã pass
> route single/compare 2–4, ordered multi-point và ATSP single/compare 2–3; nếu
> audit machine không phải máy demo cuối thì `FINAL DEMO-MACHINE PREFLIGHT REQUIRED`.
> **Tái xác minh read-only 2026-08-15:** backend 235/235, frontend 137/137,
> TypeScript và data validator tiếp tục đạt; 19/19 checksum của bộ kết quả chính
> thức vẫn khớp. Browser/build không được chạy lại trong lượt tài liệu này.

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
| TomTom | ✅ Raw đủ 4/4 slot đại diện; 07:30/12:00 thu 2026-07-27 và 17:30/22:00 thu 2026-08-03 (hai ngày thứ Hai, không phải chuỗi đo cùng ngày) |
| Profile hiện hành | ✅ `traffic_profiles_demo.json` và `traffic_profiles_real.json`, cả hai là `source="tomtom+synthetic"` |
| Risk | ✅ 8 mục trong `manual_risks.json`; 8/8 `source_url` đã review và tích hợp, chỉ hỗ trợ bối cảnh lịch sử ở cấp tuyến/khu vực |
| Free-flow | ✅ Nhóm đặt theo `highway`, không tuyên bố là tốc độ giới hạn pháp lý |

Raw GraphML, bốn TomTom JSON và OSMnx cache hiện được Git track dưới
`data/raw/`; chúng vẫn phải có trong Data ZIP cuối để giữ provenance.

### Hai tầng graph hiện hành

| Tầng | Snapshot hiện hành | Mục đích |
|---|---:|---|
| `G_demo` | 51 node / 298 cạnh có hướng / 60 one-way (refresh 2026-08-03) | animation, chạy tay, video và giảng thuật toán |
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
| 5 | A* | Bắt buộc | tối ưu với heuristic đã chứng minh |
| 6 | Greedy Best-First | Bổ sung | không tối ưu |
| 7 | Bidirectional Dijkstra | Bổ sung | tối ưu; xử lý graph có hướng bằng reverse adjacency |
| 8 | IDA* | Bổ sung | trong `C* + ε` khi tìm được trước cap |
| 9 | Beam Search | Bổ sung | không complete, không tối ưu |

Đề yêu cầu ít nhất 2 thuật toán bổ sung; dự án có 5 thuật toán bổ sung nếu đếm
IDDFS tách riêng. Ngày 2026-08-08, nhóm loại lựa chọn Dijkstra một chiều độc lập
vì trùng cơ chế với UCS; Bidirectional Dijkstra vẫn là thuật toán riêng.

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
| Một kiểu `Trace` cho 9 thuật toán | `docs/SCHEMA.md` §B | search, API, timeline/map/drawer |
| REST API + error envelope | `docs/SCHEMA.md` §C | FastAPI, frontend |
| Cost + heuristic | `docs/SCHEMA.md` §D | GraphStore, search, explanation |

Hiện thân executable là `backend/app/models.py`; mismatch phải được báo và xử
lý theo contract, không tự chọn im lặng.

## 7. Bảy thí nghiệm

| # | Thí nghiệm | Artifact |
|---:|---|---|
| 1 | UCS/A* vs NetworkX trên 800 ca | `exp1_correctness.csv` |
| 2 | kiểm tra thực nghiệm heuristic `h ≤ h*` | `exp2_admissibility.csv` + figure |
| 3 | 9 thuật toán × 200 cặp × 2 khung giờ | `exp3_benchmark.csv` + 3 figure |
| 4 | A* 07:30 vs 22:00, tỷ lệ đổi tuyến | `exp4_congestion.csv` + examples |
| 5 | độ nhạy γ từ 0 đến 3 | `exp5_gamma.csv` + curve |
| 6 | 5 cặp đối chứng Google Maps định tính | `exp6_pairs.json` + routes |
| 7 | 3 ATSP trên kịch bản 10 điểm | `exp7_tsp.csv` + map |

> `results/` đã được tái sinh chính thức ngày 2026-08-11 từ graph/profile
> `tomtom+synthetic` hiện hành, sau pre-gate test + validator và trong một lượt
> benchmark cô lập seed 42. Chuỗi tiếp tục với hiệu chuẩn γ và teaching generator;
> headline, môi trường và checksum input/source/output nằm tại
> [`results/README.md`](../results/README.md). Nếu graph, profile hoặc source
> algorithm/producer đổi, phải hạ trạng thái bộ kết quả và chạy lại trọn chuỗi
> trước khi trích vào bản nộp.

## 8. Thông tin nhóm và phân công đã xác nhận

- **GroupID:** 2 (không dùng tên nhóm).
- **Repository:** <https://github.com/ThaiQuangHuy2906/Lab1_Searching>
- **Người đại diện nộp chính thức:** Thái Quang Huy.
- **Tỷ lệ đóng góp do nhóm khai báo:** 100% cho từng thành viên.

| MSSV | Họ tên | Phạm vi đã xác nhận | Vai trò tổng quát |
|---|---|---|---|
| 24127078 | Nguyễn Hữu Gia Minh | Chưa chốt | Chưa chốt |
| 24127177 | Thái Quang Huy | 3 thuật toán ATSP | Chưa chốt |
| 24127205 | Nguyễn Văn Minh | 9 thuật toán tìm đường hai điểm | Chưa chốt |
| 24127249 | Mai Phương Thùy | Chưa chốt | Chưa chốt |
| 24127505 | Trần Hoàng Phúc | Chưa chốt | Chưa chốt |

Phân công vai trò thực tế và người phụ trách các mục report còn lại sẽ được
chốt sau; không suy diễn phân công ATSP thành quyền sở hữu toàn bộ vai trò C cũ.

## 9. Bộ nộp

```text
2.zip
├── 2 - SC.txt
├── 2 - Report.pdf
├── 2 - Slide.pptx hoặc 2 - Slide.pdf
├── 2 - Video.txt
└── 2 - Data.zip hoặc 2 - Data.txt
```

Link source/video phải mở được ở tab ẩn danh. `2 - SC.txt` đã có URL do nhóm cung
cấp; report, slide, video link và data package cuối vẫn chưa tồn tại.

## 10. Ngoài phạm vi

- traffic realtime trong lúc demo;
- turn penalty/cấm rẽ theo edge-state;
- ALT landmark heuristic;
- VRP nhiều shipper;
- Genetic Algorithm/Ant Colony;
- cloud deployment.

Offline, accessibility desktop và đúng độ phân giải máy demo vẫn là phạm vi QA
trước bảo vệ. Mobile/tablet/narrow responsive không thuộc lượt final audit
Desktop-only ngày 2026-08-11; các claim lịch sử về chúng không được dùng thay cho
preflight trên máy demo cuối.

## 11. Việc còn lại theo thứ tự

1. ✅ Raw TomTom đủ bốn slot đại diện; nhóm chấp nhận bộ đo trên hai ngày thứ
   Hai và phải công bố giới hạn này trong deliverable.
2. ✅ Chốt profile `tomtom+synthetic`; chuỗi data `03b real → 04 → 03b demo →
   validate_data` đã hoàn tất; chuỗi benchmark/hiệu chuẩn γ/generator chính thức
   hoàn tất ngày 2026-08-11 mà không rebuild data.
3. ✅ Đã review và tích hợp 8 `source_url`; metadata risk dùng wording nguồn
   lịch sử, không xác nhận real-time/tọa độ/bán kính/penalty. Vẫn mở lại link
   bằng tab ẩn danh trên máy nộp bài trong final QA.
4. ✅ Đã đồng bộ/gỡ năm banner tạm và số liệu sau benchmark + generator cuối;
   provenance/checksum nằm tại `results/README.md`.
5. ⬜ Điền danh tính/nội dung, chụp ảnh, tạo report/slide/video/data description.
6. ⬜ Clean restart service, Chrome maximized trên máy demo, kiểm link ẩn danh và
   đóng ZIP. Nếu audit chạy trên máy khác, vẫn phải làm preflight trên máy demo.
