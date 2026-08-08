# PROMPT MASTER — Lab 1: Search Algorithms for Vietnamese Traffic

> **Trạng thái 2026-07-27:** đây là đặc tả thi công gốc và lịch sử chia phase,
> không còn là run-book cho worktree hiện tại. Quy tắc vận hành mới xem
> `AGENTS.md`; trạng thái hiện hành xem `README.md`, `data/DATA.md` và kiểm tra
> trực tiếp code/data. `docs/CODEX-BASELINE.md` chỉ giữ bằng chứng lịch sử.
> Các mốc dừng/commit theo phase bên dưới chỉ mô tả quy trình đã dùng khi xây
> dự án, không tự động áp dụng cho yêu cầu mới.
>
> **Current UI delta 2026-08-08:** §6.5 bên dưới là yêu cầu lịch sử, không phải
> inventory hiện hành. Frontend hiện có 9 thuật toán, drawer bốn tab
> `Số liệu/Giải thích/So sánh/Thử nghiệm`, scenario editor request-scoped và
> presentation km/phút; contract UI mới nhất nằm ở `docs/DESIGN.md` §12 và
> bằng chứng triển khai nằm ở `UI_PLAN.md`.
>
> **Current route-contract delta 2026-08-08:** lựa chọn `dijkstra` độc lập trong
> đặc tả lịch sử bên dưới đã bị loại vì trùng UCS; `bidijkstra` vẫn được giữ.
> `docs/SCHEMA.md`, code và test hiện hành mới là nguồn chuẩn cho enum 9 thuật toán.
>
> File đặt ở gốc repo, cùng với:
> - `docs/Lab 1 - Searching.pdf` — đề bài gốc (nguồn chân lý #1 về **YÊU CẦU**)
> - `docs/Lab1-ChotPhuongAn.md` — phương án nhóm đã chốt (nguồn chân lý #2 về **LỰA CHỌN**)
>
> Nếu 3 tài liệu mâu thuẫn: **đề bài > phương án > file này**, và phải BÁO RÕ mâu thuẫn cho tôi trước khi tự quyết.

---

## 0. Vai trò của bạn

Bạn là kỹ sư trưởng chịu trách nhiệm xây dựng **toàn bộ** đồ án này: data pipeline, 10 thuật toán tìm đường, 3 thuật toán TSP, backend FastAPI, frontend Next.js, bộ thí nghiệm benchmark, và bộ khung deliverables (báo cáo, slide, kịch bản video). Nhóm 5 sinh viên (A–E) sẽ review, điền nội dung báo cáo, chụp screenshot, quay video và bảo vệ trước giảng viên — vì vậy mọi thứ bạn làm phải **chạy được từ zero, tái lập được, và giải thích được**.

---

## 1. LUẬT CỨNG — không bao giờ vi phạm

1. **Làm theo phase (mục 5).** Cuối mỗi phase: chạy test, commit, cập nhật `docs/TIENDO.md`, tóm tắt ≤10 dòng, rồi **DỪNG chờ tôi duyệt** — trừ khi tôi ra lệnh "làm liên tục Phase X→Y".
2. **Schema trước code.** Ba hợp đồng dữ liệu (mục 3) được chốt ở Phase 0 trong `docs/SCHEMA.md`. Sau khi tôi duyệt, mọi thay đổi schema phải cập nhật `SCHEMA.md` **và báo rõ trong tóm tắt phase**.
3. **Mọi thuật toán tìm đường trả về cùng một cấu trúc `trace`** (mục 3.2), không ngoại lệ. Đây là quy tắc vàng của nhóm.
4. **Không trộn đơn vị.** `distance` dùng mét; `time` và `balanced` dùng giây. Công thức cost/heuristic đúng như mục 4, hằng số đúng như phương án: γ = 1.5; penalty ngập 60 / lô cốt 90 / hẻm nhỏ 30 / đèn đỏ 25 giây; IDA* dùng ε = 5 đơn vị cost của mode (mét cho `distance`, giây cho hai mode còn lại). Muốn đổi hằng số → hỏi tôi.
5. **OSMnx phiên bản 2.x, cú pháp v2.** Query bằng **bounding box dạng tuple** `(left, bottom, right, top)` = `(106.680, 10.760, 106.720, 10.800)`. Cấm cú pháp v1 (tham số rời `north, south, east, west`), cấm query theo tên quận/phường. Khi không chắc API của OSMnx / react-map-gl / deck.gl, **kiểm tra docs của version đã cài**, không đoán theo trí nhớ.
6. **NetworkX chỉ được dùng trong test/benchmark làm baseline đối chứng.** Mọi thuật toán trong sản phẩm (`search.py`, `search_advanced.py`, `tsp.py`) phải tự cài đặt, chỉ dùng cấu trúc dữ liệu thuần Python + `heapq`.
7. **Không gọi mạng khi demo.** Dữ liệu là snapshot tĩnh commit sẵn trong repo. Script crawl TomTom là bước tuỳ chọn chạy một lần (cần `TOMTOM_API_KEY` trong `.env`, không commit key); pipeline phải có **bộ sinh congestion tổng hợp (synthetic) làm fallback** để không có key vẫn build được toàn bộ dữ liệu.
8. **Danh sách KHÔNG LÀM** (chỉ ghi vào Future Work, cấm cài đặt): turn penalty / cấm rẽ (edge-based graph), landmark heuristic ALT, VRP nhiều shipper, Genetic Algorithm, Ant Colony, deploy cloud, giao diện mobile responsive, dữ liệu real-time khi demo.
9. **Ngôn ngữ:** code, tên biến, tên file, commit message → tiếng Anh. Docstring → tiếng Anh ngắn gọn. UI, phần giải thích lộ trình (explanation), báo cáo, `DATA.md`, `GIAI-THICH-THUAT-TOAN.md` → **tiếng Việt**.
10. **Tái lập 100%:** mọi random đều có seed cố định (mặc định 42; SA chạy 5 seed 0–4); `requirements.txt` và `package.json` pin version đã kiểm chứng chạy được; README có lệnh chạy từ zero cho cả bash lẫn PowerShell (thành viên nhóm dùng Windows).
11. **Mỗi phase một commit** với message dạng `phase-N: <nội dung>`; sửa lỗi giữa chừng thì commit `fix: <nội dung>`.
12. **Khi bắt đầu session mới:** đọc lại `CLAUDE.md` → `docs/TIENDO.md` → `PROMPT-MASTER.md` → `docs/SCHEMA.md` rồi tiếp tục phase đang dở. Không bao giờ làm lại từ đầu thứ đã xong.

---

## 2. Cấu trúc repo

```
.
├── CLAUDE.md                     # tạo ở Phase 0: tổng quan 10 dòng, lệnh chạy, quy ước, trỏ tới TIENDO.md
├── PROMPT-MASTER.md              # file này
├── docs/
│   ├── Lab 1 - Searching.pdf
│   ├── Lab1-ChotPhuongAn.md
│   ├── SCHEMA.md                 # 3 hợp đồng dữ liệu (Phase 0)
│   ├── TIENDO.md                 # bảng: phase | trạng thái | ghi chú | commit
│   ├── HEURISTIC-PROOF.md        # chứng minh admissible + consistent (Phase 2)
│   └── GIAI-THICH-THUAT-TOAN.md  # tài liệu ôn để quay video (Phase 7)
├── data/
│   ├── graph_demo.json           # G_demo: 40–60 node địa danh thật
│   ├── graph_real.json           # G_real: vài nghìn node từ OSM
│   ├── traffic_profiles_demo.json # congestion G_demo theo 4 khung giờ
│   ├── traffic_profiles_real.json # congestion G_real theo 4 khung giờ
│   └── DATA.md                   # nguồn, giả định, luật synthetic, dẫn nguồn risk
├── scripts/                      # pipeline offline, chạy tuần tự 01→04
│   ├── 01_download_osm.py
│   ├── 02_build_graph.py
│   ├── 03a_crawl_tomtom.py       # TUỲ CHỌN, cần API key
│   ├── 03b_build_profiles.py     # TomTom nếu có + synthetic fallback
│   └── 04_build_gdemo.py
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI, CORS cho localhost:3000
│   │   ├── models.py             # Pydantic models đúng SCHEMA.md
│   │   ├── graph_store.py        # load graph + profiles, tính weight theo (mode, time_slot)
│   │   ├── costs.py              # hàm chi phí + heuristic (mục 4)
│   │   ├── search.py             # BFS, DFS, IDDFS, UCS, Dijkstra, A*
│   │   ├── search_advanced.py    # Greedy BF, Bidirectional Dijkstra, IDA*, Beam
│   │   ├── tsp.py                # ma trận ATSP, Held-Karp, NN+2-opt, SA
│   │   ├── explain.py            # sinh giải thích tiếng Việt + alternatives
│   │   └── benchmark.py          # 7 thí nghiệm (mục 6.6)
│   ├── tests/                    # pytest, đối chứng NetworkX
│   └── requirements.txt
├── frontend/                     # Next.js 15 App Router + TypeScript
├── results/                      # CSV + PNG do benchmark sinh ra (commit bản cuối)
└── report/
    ├── BaoCao-Khung.md           # khung báo cáo a–j (đặc tả mục 7)
    ├── Slide-Outline.md
    └── Video-KichBan.md
```

---

## 3. Ba hợp đồng dữ liệu (chốt tại Phase 0 trong `docs/SCHEMA.md`)

### 3.1 `graph.json` (dùng chung cho G_demo và G_real)

```jsonc
{
  "meta": {
    "name": "G_demo",                       // hoặc "G_real"
    "bbox": [106.680, 10.760, 106.720, 10.800],
    "directed": true,
    "created": "2026-08-03",
    "crs": "EPSG:4326",
    "node_count": 51, "edge_count": 298
  },
  "nodes": [
    { "id": "n0001", "name": "Chợ Bến Thành", // G_real: name có thể null
      "lat": 10.7725, "lon": 106.6980,
      "type": "landmark" }                    // landmark|intersection|warehouse|hospital|school
  ],
  "edges": [
    { "id": "e00001", "u": "n0001", "v": "n0002",
      "name": "Lê Lợi",                       // có thể null
      "length_m": 420.5,
      "highway": "primary",                   // theo tag OSM
      "oneway": true,                         // đường 1 chiều = chỉ có cạnh u→v
      "free_speed_kmh": 35,                   // do nhóm đặt theo highway type (mục 6.1)
      "free_travel_time_s": 43.3,             // = length_m / (free_speed_kmh/3.6)
      "risk": { "flood": 0, "construction": 0, "narrow_alley": 0, "traffic_light": 1 } // 0/1
    }
  ]
}
```

Đồ thị **có hướng**: đường 2 chiều sinh 2 cạnh ngược nhau. `id` node/edge ổn định giữa các lần build (sort theo osmid).

### 3.2 `trace` — MỌI thuật toán trả về đúng cấu trúc này

```jsonc
{
  "algorithm": "astar",                        // bfs|dfs|iddfs|ucs|dijkstra|astar|greedy|bidijkstra|idastar|beam
  "mode": "balanced",                          // distance|time|balanced
  "time_slot": "07:30",                        // 07:30|12:00|17:30|22:00
  "graph": "demo",                             // demo|real
  "found": true,
  "path": ["n0001", "n0014", "n0027"],
  "metrics": {
    "total_cost": 812.4,                       // theo mode (giây, hoặc mét nếu mode=distance)
    "total_distance_m": 3120.0,
    "total_time_s": 812.4,                     // luôn tính kèm để so sánh
    "nodes_expanded": 143,
    "max_frontier": 38,
    "runtime_ms": 4.2,
    "optimal_guarantee": true                  // theo lý thuyết của thuật toán
  },
  "trace": [                                   // từng bước, phục vụ animation + ví dụ tính tay
    { "step": 1, "expanded": "n0001",
      "frontier": ["n0002", "n0005"],
      "g": {"n0002": 43.3, "n0005": 61.0},     // null với BFS/DFS
      "h": {"n0002": 120.5, "n0005": 98.2},    // null nếu thuật toán không dùng h
      "f": {"n0002": 163.8, "n0005": 159.2} }
  ],
  "explanation": {                             // do explain.py điền (mục 6.4)
    "summary_vi": "…",
    "congested_segments": [{"edge": "e00007", "name": "Nguyễn Thị Minh Khai", "level": 4}],
    "alternatives": [{ "label": "Ngắn nhất theo km", "path": ["…"],
                       "total_distance_m": 2800, "total_time_s": 990,
                       "why_not_vi": "…" }]
  }
}
```

**Chống phình payload:** request có cờ `include_trace` (mặc định `true` với G_demo, `false` với G_real); server cắt trace tại 5 000 bước và ghi `trace_truncated: true`.

### 3.3 REST API (FastAPI, port 8000)

| Endpoint | Method | Body / Query | Trả về |
|---|---|---|---|
| `/api/health` | GET | — | `{status, versions}` |
| `/api/graph` | GET | `?level=demo\|real` | graph.json tương ứng |
| `/api/traffic` | GET | `?slot=07:30` | map `edge_id → congestion 1–5` |
| `/api/route` | POST | `{start, goal, algorithm, mode, time_slot, graph, include_trace, params?}` (`params`: `beam_width`, `epsilon`…) | 1 object `trace` |
| `/api/multiroute` | POST | `{start, stops[], method: held_karp\|nn_2opt\|sa, mode, time_slot, graph, return_to_start=false}` | `{order, legs: [trace rút gọn], totals, original_order_totals, savings_pct, optimal_guarantee}` |
| `/api/benchmark` | POST | `{experiment_id}` hoặc `{}` = trả kết quả cached từ `results/` | CSV-as-JSON + đường dẫn hình |

---

## 4. Hàm chi phí & heuristic — đặc tả chính xác

```
weight(e, h, mode):
  t_free  = length_m / (free_speed_kmh / 3.6)                      # giây
  f_cong  = 1 + γ · (congestion(e,h) − 1) / 4                      # γ = 1.5, congestion ∈ [1..5]
  penalty = 60·flood + 90·construction + 30·narrow_alley + 25·traffic_light   # giây

  mode=distance → weight = length_m                                 # mét
  mode=time     → weight = t_free · f_cong                          # giây
  mode=balanced → weight = t_free · f_cong + penalty                # giây  (MẶC ĐỊNH)
```

Heuristic (chỉ dùng cho A*, Greedy, IDA*, và ước lượng của Bidirectional nếu cần):

```
mode=distance → h(n) = haversine(n, goal)                # mét
mode=time|balanced → h(n) = haversine(n, goal) / v_max   # giây, v_max = max free_speed trên toàn đồ thị (m/s)
```

**Yêu cầu bắt buộc kèm theo (Phase 2):**
- `docs/HEURISTIC-PROOF.md` (tiếng Việt): chứng minh admissible + consistent. Khung lập luận: haversine ≤ chiều dài đường thực; `weight ≥ t_free ≥ length/v_max`; bất đẳng thức tam giác của haversine ⇒ consistent. Viết thành chứng minh chặt chẽ từng bước, có ký hiệu rõ ràng — mục này vào thẳng báo cáo phần e.
- Script kiểm chứng thực nghiệm: chạy Dijkstra ngược từ goal để lấy `h*(n)` thật, xuất scatter `h` vs `h*` (`results/figs/admissibility_scatter.png`) và assert `h ≤ h*` trên toàn bộ mẫu (thí nghiệm 2, mục 6.6).

---

## 5. Lộ trình phase & Definition of Done

| Phase | Nội dung | DoD (Definition of Done) |
|---|---|---|
| **0** | Scaffold repo, `CLAUDE.md`, `docs/SCHEMA.md` (3 hợp đồng), `docs/TIENDO.md`, mock data generator sinh graph giả 8 node đúng schema (cho frontend làm song song) | Cây thư mục đủ; SCHEMA.md đầy đủ 3 hợp đồng + ví dụ JSON; `pytest tests/test_schema.py` pass trên mock. **DỪNG chờ duyệt SCHEMA.** |
| **1** | Data pipeline `scripts/01→04` + `DATA.md` | `graph_real.json`, `graph_demo.json`, `traffic_profiles_{real,demo}.json` build được không cần API key; script validate schema pass; **báo số node/edge thực tế của G_real để tôi chốt bbox cuối** (mục tiêu ~2 000–6 000 node; lệch nhiều → đề xuất bbox mới và DỪNG). |
| **2** | `costs.py`, heuristic, `search.py` (BFS, DFS, IDDFS, UCS, Dijkstra, A*) + trace + tests + `HEURISTIC-PROOF.md` | Toàn bộ test pass, trong đó UCS/Dijkstra/A* khớp chi phí NetworkX (sai số 1e-6) trên G_demo và 50 cặp mẫu G_real, đủ 3 mode × 4 khung giờ. |
| **3** | `search_advanced.py` (Greedy, Bidirectional Dijkstra, IDA* ε=5 đơn vị mode, Beam k) + `tsp.py` (ma trận ATSP, Held-Karp, NN+2-opt, SA 5 seed) + tests | Bidirectional & IDA* khớp Dijkstra (IDA* trong ngưỡng ε); Held-Karp khớp brute-force với n≤8; NN+2-opt và SA không bao giờ tốt hơn Held-Karp (sanity ATSP). |
| **4** | FastAPI `main.py`, `models.py`, `graph_store.py`, `explain.py` | `uvicorn` chạy; smoke test cả 6 endpoint bằng TestClient; explanation tiếng Việt tự nhiên, đúng số liệu, có ≥1 alternative. |
| **5** | Frontend Next.js hoàn chỉnh (mục 6.5) | `npm run dev` chạy; demo được đầy đủ luồng: chọn 2 điểm → chạy từng thuật toán → animation từng bước → panel số liệu + giải thích; multiroute hiển thị thứ tự tối ưu; trang benchmark vẽ biểu đồ từ API. |
| **6** | `benchmark.py` chạy 7 thí nghiệm (mục 6.6) | `results/` có đủ CSV + PNG của cả 7 thí nghiệm; số liệu tái lập với seed 42; tóm tắt số liệu chính in ra console. |
| **7** | Deliverables: `report/BaoCao-Khung.md` (mục 7), `Slide-Outline.md`, `Video-KichBan.md`, `docs/GIAI-THICH-THUAT-TOAN.md`, `DATA.md` hoàn thiện, README tổng, rà lại toàn bộ test | Tất cả file deliverable tồn tại đúng đặc tả; `pytest` xanh toàn bộ; README một-lệnh-một-bước dựng lại được toàn hệ thống. |

---

## 6. Đặc tả chi tiết từng module

### 6.1 Data pipeline (Phase 1)

- **`01_download_osm.py`**: OSMnx v2, `ox.graph_from_bbox((106.680, 10.760, 106.720, 10.800), network_type="drive")`, `ox.settings.use_cache = True`. Lấy **thành phần liên thông mạnh lớn nhất** (đồ thị có hướng). Lưu graphml trung gian vào `data/raw/` (gitignore).
- **`02_build_graph.py`**: chuyển sang schema 3.1. Free-flow speed theo `highway` type do nhóm đặt (KHÔNG dùng maxspeed pháp lý): ví dụ khởi điểm `trunk/primary 45, secondary 40, tertiary 35, residential 30, alley/service 25` km/h — ghi bảng này vào `DATA.md`. `traffic_light`: suy từ node OSM có tag `highway=traffic_signals` (cạnh kết thúc tại node đèn → flag 1). `narrow_alley`: suy từ highway ∈ {residential hẹp, alley, service} theo luật ghi trong DATA.md. `flood`/`construction`: đọc từ file thủ công `data/manual_risks.json` (tạo sẵn 6–10 điểm ngập/lô cốt tiêu biểu khu trung tâm, mỗi mục có trường `source_url` placeholder để nhóm dán link cổng giao thông TP.HCM / báo chí).
- **`03a_crawl_tomtom.py`** (tuỳ chọn): đọc `TOMTOM_API_KEY` từ `.env`; gọi Flow Segment Data cho ~30–50 điểm mẫu rải trên trục chính; lưu raw JSON kèm timestamp vào `data/raw/tomtom/`. Ghi rõ trong docstring: chạy 4 lần đúng 4 khung giờ 07:30 / 12:00 / 17:30 / 22:00.
- **`03b_build_profiles.py`**: sinh `traffic_profiles_real.json` hoặc `traffic_profiles_demo.json` dạng `{"07:30": {"e00001": 4, …}, …}`. Ưu tiên nội suy từ dữ liệu TomTom (`currentSpeed/freeFlowSpeed` → thang 1–5, gán cho các cạnh gần điểm đo trên cùng trục); cạnh không có dữ liệu → **luật synthetic** (documented trong DATA.md): giờ cao điểm 07:30/17:30 đường trunk/primary mức 4–5, secondary 3–4, residential 2–3; 12:00 giảm 1 mức; 22:00 hầu hết mức 1–2; thêm nhiễu ngẫu nhiên seed 42.
- **`04_build_gdemo.py`**: G_demo **bán tự động để vừa thật vừa không sai**: (1) danh sách ~45–55 POI địa danh thật trong bbox (Chợ Bến Thành, Nhà thờ Đức Bà, Dinh Độc Lập, Bưu điện TP, Bitexco, Công viên Tao Đàn, chợ Tân Định, ĐH Khoa học Tự nhiên Nguyễn Văn Cừ, BV Nhi Đồng 2, phố Bùi Viện, Hồ Con Rùa, Thảo Cầm Viên… — bạn đề xuất đủ danh sách với toạ độ, tôi sẽ review); (2) snap mỗi POI vào node G_real gần nhất; (3) cạnh G_demo = co (contract) đường đi ngắn nhất giữa các POI kề nhau trên G_real, **kế thừa length/oneway/highway thật**; (4) đắp risk flags từ manual_risks. Mục tiêu thi công ban đầu là 40–60 node, ~120 cạnh; snapshot hiện hành sau repair 2026-08-03 có **51 node / 298 cạnh / 60 one-way** để giữ các bất biến contraction. Xuất thêm `data/gdemo_preview.png` (matplotlib) để nhóm soát bằng mắt.
- **Validator** `scripts/validate_data.py`: kiểm schema, liên thông mạnh, không cạnh trùng, mọi edge có profile đủ 4 khung giờ.

### 6.2 `search.py` — 6 thuật toán lõi (Phase 2)

Tất cả nhận `(graph_store, start, goal, mode, time_slot, include_trace, **params)` và trả `trace` chuẩn 3.2. Ghi chú cài đặt:

| Thuật toán | Lưu ý bắt buộc |
|---|---|
| BFS | Ít cạnh nhất. `optimal_guarantee=true` **chỉ khi** cạnh đồng trọng số — trên đồ thị này ghi `false`, nhưng vẫn tính đủ cost/time của path tìm được để so sánh. |
| DFS | Có visited set, đi theo thứ tự láng giềng ổn định. `optimal_guarantee=false`. |
| IDDFS | Deepening theo độ sâu, ghi số node expand cộng dồn qua các vòng. |
| UCS | `heapq` theo `g` = weight(mode). Lazy deletion (bỏ entry stale khi pop). |
| Dijkstra | Cài riêng, early-exit tại goal; trong báo cáo phần so sánh sẽ bàn quan hệ UCS ↔ Dijkstra. |
| A* | `f = g + h` với heuristic mục 4; tie-break theo `h` nhỏ hơn. |

### 6.3 `search_advanced.py` + `tsp.py` (Phase 3)

- **Greedy Best-First**: xếp theo `h` thuần; `optimal_guarantee=false`.
- **Bidirectional Dijkstra**: chiều ngược chạy trên **đồ thị đảo cạnh** (bắt buộc vì có hướng); điều kiện dừng chuẩn `top_f + top_b ≥ μ` (μ = cost gặp nhau tốt nhất đã thấy); ghép path tại đỉnh gặp nhau.
- **IDA\***: ngưỡng theo `f`; vòng sau `threshold = max(min_f_vượt_ngưỡng, threshold + ε)` với ε = 5 đơn vị cost của mode; ghi vào metrics `epsilon_bound: 5` và `optimal_guarantee=true` kèm chú thích "trong ngưỡng ε".
- **Beam Search**: giữ k tốt nhất theo `f` mỗi lớp; mặc định `k=5` (G_demo) / `k=50` (G_real), nhận qua `params.beam_width`; `optimal_guarantee=false`, có thể `found=false` — phải xử lý đẹp.
- **`tsp.py`**: ma trận chi phí **bất đối xứng (ATSP)** — với k điểm (start + stops) chạy Dijkstra từ từng điểm tới k−1 điểm còn lại theo `(mode, time_slot)` hiện hành, cache luôn path từng leg để trả về. Giới hạn k ≤ 16.
  - **Held-Karp**: bitmask DP O(n²·2ⁿ), enforce n ≤ 15 (warn từ 13); ground truth.
  - **NN + 2-opt**: ⚠️ vì ma trận **bất đối xứng**, KHÔNG dùng công thức delta 2-opt đối xứng — mỗi nước đảo đoạn phải **tính lại chi phí đoạn bị đảo theo đúng chiều mới** (n nhỏ nên O(n)/nước là chấp nhận được). Thêm Or-opt (di chuyển đoạn 1–3 điểm, giữ chiều) nếu tiện.
  - **Simulated Annealing**: neighborhood = swap + insert; lịch giảm nhiệt hình học (T0, α ghi rõ trong docstring); chạy 5 seed 0–4, trả best + mean ± std.
  - `return_to_start` mặc định `false` (shipper kết thúc ở điểm giao cuối) — ghi rõ giả định này để đưa vào báo cáo.

### 6.4 `explain.py` (Phase 4) — yêu cầu đề mục 4.8

Sinh giải thích **tiếng Việt tự nhiên, đúng số liệu**, theo template có logic (không phải chuỗi cứng):
- Chạy thêm route thay thế: cùng OD với `mode=distance` (tuyến ngắn nhất theo km) và tuyến Greedy; so sánh với tuyến được chọn.
- `summary_vi` phải nêu: tuyến được chọn + tổng cost/time/km; nó tối ưu theo tiêu chí nào; thuật toán có đảm bảo tối ưu không; đoạn nào đang ùn tắc nặng (tên đường + mức 1–5 + khung giờ); vì sao tuyến ngắn hơn về km lại bị loại (chênh bao nhiêu giây, dính đoạn kẹt/penalty nào).
- Mẫu giọng văn: *"Tuyến Bến Thành → Hồ Con Rùa → Dinh Độc Lập được chọn vì tổng chi phí thấp nhất (812 s ≈ 13,5 phút, 3,1 km). Tuyến qua Nguyễn Thị Minh Khai ngắn hơn 300 m nhưng lúc 07:30 đoạn này ùn tắc mức 4/5 và có 2 đèn đỏ, ước chậm hơn ~178 s, nên bị loại. A* đảm bảo tối ưu theo hàm chi phí đã định nghĩa."*

### 6.5 Frontend (Phase 5) — Next.js 15 App Router + TypeScript

- **Stack:** `react-map-gl` (entry MapLibre) + `maplibre-gl` + `deck.gl` overlay + `zustand` + `recharts`. Map component phải `'use client'` và dynamic import `ssr: false`. Chọn version tương thích đã kiểm chứng build được rồi pin lại.
- **Trang chính `/`:** bản đồ MapLibre (basemap raster OSM) + **công tắc "Chế độ offline"** vẽ thuần đồ thị bằng deck.gl trên nền trơn — bảo hiểm khi wifi phòng bảo vệ chập chờn, demo không bao giờ chết.
  - Panel điều khiển: chọn graph (G_demo/G_real), khung giờ (4 mốc), chế độ tối ưu (3 mode), thuật toán (9), start/goal (dropdown tên địa danh với G_demo, click bản đồ với G_real), danh sách stops cho multiroute, tham số phụ (beam k), nút Chạy.
  - **Animation từng bước từ `trace[]`**: nút play/pause/step/tua, slider tốc độ; tô màu phân biệt: đã expand / đang expand / frontier / path cuối. Với G_demo hiển thị thêm **bảng g/h/f của frontier tại bước hiện tại** (đúng thứ đề yêu cầu quay trong video).
  - Panel kết quả: path, tổng km / tổng thời gian / tổng cost / nodes expanded / max frontier / runtime, cờ đảm bảo tối ưu.
  - Panel **Giải thích** (render `explanation.summary_vi` + bảng alternatives, tô đỏ các cạnh ùn tắc trên bản đồ).
  - Chế độ **So sánh**: chạy 2 thuật toán cùng OD cạnh nhau (2 map nhỏ hoặc toggle layer), bảng đối chiếu metrics.
  - Multiroute: nhập stops → hiện thứ tự tối ưu đánh số trên bản đồ, tuyến nối các leg, bảng "thứ tự gốc vs tối ưu, tiết kiệm x%".
- **Trang `/benchmark`:** đọc `/api/benchmark`, vẽ recharts: cột nodes-expanded & runtime theo thuật toán, đường sensitivity γ, bảng kết quả chính.
- Toàn bộ label UI tiếng Việt.

### 6.6 `benchmark.py` — 7 thí nghiệm (Phase 6)

Sampling chung: 200 cặp OD trên G_real, seed 42, loại cặp có khoảng cách lưới < 1 km. Mỗi thí nghiệm xuất CSV vào `results/` + hình PNG vào `results/figs/` (matplotlib), tên file cố định để báo cáo trỏ tới.

| # | Thí nghiệm | Output |
|---|---|---|
| 1 | Đúng đắn: UCS/Dijkstra/A* vs NetworkX Dijkstra cùng weight, 200 cặp × mode balanced × 2 khung giờ | `exp1_correctness.csv` → mục tiêu "200/200 pass" |
| 2 | Admissibility: Dijkstra ngược lấy `h*`, so `h` | `exp2_admissibility.csv`, `admissibility_scatter.png` |
| 3 | Benchmark 10 thuật toán × 200 cặp × {07:30, 22:00}: cost, gap so tối ưu, expanded, runtime, tỉ lệ found | `exp3_benchmark.csv`, `exp3_expanded_bar.png`, `exp3_runtime_bar.png`, `exp3_gap.png` |
| 4 | Ảnh hưởng ùn tắc: A* balanced, cùng 200 cặp, 07:30 vs 22:00 → % cặp đổi tuyến + 3 ví dụ minh hoạ xuất GeoJSON | `exp4_congestion.csv`, `exp4_examples/` |
| 5 | Độ nhạy γ ∈ {0, 0.5, 1, 1.5, 2, 2.5, 3}: avg time & avg distance của tuyến chọn | `exp5_gamma.csv`, `exp5_gamma_curves.png` (2 đường) |
| 6 | Đối chứng Google Maps định tính: chọn sẵn 5 cặp OD tiêu biểu, xuất tuyến của ta thành PNG/GeoJSON để nhóm chụp Google Maps đặt cạnh | `exp6_pairs.json`, `exp6_routes/` (screenshot Google là việc của nhóm — chừa placeholder trong báo cáo) |
| 7 | TSP: kịch bản 10 điểm giao; thứ tự gốc (thứ tự nhập) vs Held-Karp vs NN+2opt vs SA; % tiết kiệm | `exp7_tsp.csv`, `exp7_tsp_map.png` |

### 6.7 `docs/GIAI-THICH-THUAT-TOAN.md` (Phase 7) — tài liệu ôn & quay video

Đề (mục 4.10a) bắt nhóm **tự giảng từng thuật toán trên ví dụ tự thiết kế, cấm chép tutorial**. Vì vậy: chọn MỘT đồ thị con cố định 6–7 node của G_demo (địa danh thật, có cost thật lấy từ data, có 1 cạnh một chiều), rồi với TỪNG thuật toán viết: ý tưởng 5 dòng → pseudocode ngắn → **bảng chạy tay từng bước trên đúng đồ thị con đó** (node expand, frontier/open list, giá trị g/h/f ở mỗi bước) → path kết quả → complete? optimal? vì sao. Cùng một ví dụ xuyên suốt để video mạch lạc và khớp với những gì GUI hiển thị. Đây là tài liệu để cả nhóm **hiểu và tự trình bày lại**, không phải để đọc nguyên văn.

---

## 7. Đặc tả `report/BaoCao-Khung.md` — KHUNG BÁO CÁO (Phase 7)

Mục tiêu: 10 mục **a–j đúng đề**, khi hoàn thiện đạt 35–50 trang. Khung phải giúp nhóm điền nhanh mà không sót tiêu chí chấm.

**Quy ước marker (khai báo ở đầu file):**
- `[ĐIỀN: mô tả ngắn việc cần viết]` — nhóm tự viết prose.
- `[SỐ LIỆU → results/exp3_benchmark.csv]` — số lấy từ file benchmark, ghi rõ file nào.
- `[HÌNH → results/figs/exp5_gamma_curves.png]` — hình đã sinh sẵn, chỉ việc chèn.
- `[SCREENSHOT: mô tả chính xác màn hình cần chụp]` — nhóm chụp GUI.
- `> 💡 Gợi ý:` — 3–5 bullet: cần chạm ý gì, độ dài đề xuất, lỗi thường gặp, **tiêu chí chấm nào ăn điểm ở mục này** (map với bảng 100 điểm trong đề).
- `> ✍️ Phụ trách:` — theo bảng phân công trong phương án (A→d; B→e,f; C→e,h; D→i; E→a,b,g,j). **⚠️ Mục c chưa có người nhận trong phương án — gắn cờ `[⚠️ CHƯA PHÂN CÔNG — đề xuất B hỗ trợ A]` ngay đầu mục c.**

**Mức độ điền sẵn:** khung + heading con + bảng có header + công thức đã chốt + danh sách checklist thì **điền sẵn**; phần lập luận/prose để `[ĐIỀN]` kèm gợi ý — nhóm phải tự viết bằng lời của mình. Riêng: bảng so sánh lý thuyết ở mục g (complexity, complete, optimal) điền sẵn giá trị chuẩn nhưng đánh dấu `[nhóm kiểm tra lại]`; công thức cost + schema ở mục c chèn sẵn từ SCHEMA.md; mục i dựng sẵn từ README.

**Nội dung từng mục (kèm ước lượng số trang khi hoàn thiện):**

- **a. Giới thiệu nhóm (2–3 tr):** bảng thành viên (MSSV, tên — placeholder), bảng đóng góp %, **bảng mức độ hoàn thành theo từng dòng của rubric 100 điểm** (điền sẵn danh sách tiêu chí, cột % để trống; gợi ý ghi chú hạn chế mobile-responsive ~"GUI 95%").
- **b. Bối cảnh (2–3 tr):** kịch bản shipper đa điểm TP.HCM; vấn đề thật: ùn tắc giờ cao điểm, một chiều dày đặc, ngập, lô cốt, hẻm và đèn tín hiệu; vì sao tối ưu lộ trình có ích. 💡 nhắc dẫn 1–2 nguồn (cổng giao thông TP.HCM…).
- **c. Mô hình hoá (3–5 tr):** định nghĩa hình thức state/node/edge/goal/transition; bảng thuộc tính cạnh (chèn từ SCHEMA); **công thức cost đầy đủ và tách đơn vị rõ**: `distance` tối ưu mét, còn `time`/`balanced` tối ưu giây; `balanced` cộng congestion/risk trong cùng đơn vị giây thay vì trộn α·dist + β·time đa đơn vị. Giải thích cách chọn γ=1.5 và các penalty (trỏ sang thí nghiệm 5).
- **d. Dataset (3–5 tr):** pipeline 01→04 (kèm sơ đồ), nguồn (OSM/OSMnx v2, TomTom, cổng giao thông, luật synthetic), kiến trúc 2 tầng G_demo/G_real và lý do, bảng free-speed theo highway type, giả định (chèn từ DATA.md), `[SỐ LIỆU: node/edge thực tế]`.
- **e. Nguyên lý thuật toán (8–12 tr):** mỗi thuật toán một tiểu mục theo khung: ý tưởng / pseudocode / ví dụ minh hoạ `[ĐIỀN — viết lại bằng lời của bạn từ docs/GIAI-THICH-THUAT-TOAN.md]` / complete–optimal; tiểu mục heuristic chèn sẵn từ HEURISTIC-PROOF.md kèm `[HÌNH → admissibility_scatter.png]`.
- **f. Program flow (2–3 tr):** khung sơ đồ Mermaid dựng sẵn (kiến trúc tổng + sequence GUI→API→search→explain), mô tả module chính `[ĐIỀN]`.
- **g. So sánh thuật toán (4–6 tr):** bảng lý thuyết điền sẵn `[kiểm tra lại]`; bảng thực nghiệm `[SỐ LIỆU → exp3]` + `[HÌNH]`; phân tích expanded/runtime/gap `[ĐIỀN]`; ùn tắc đổi tuyến `[SỐ LIỆU → exp4]`; đối chứng Google Maps 5 cặp `[SCREENSHOT ×5]`.
- **h. Multi-location (3–4 tr):** phát biểu ATSP (vì sao bất đối xứng), 3 phương pháp + bảng "gốc vs tối ưu" `[SỐ LIỆU → exp7]`, thảo luận tối ưu tuyệt đối (Held-Karp) vs xấp xỉ (NN+2opt, SA — best/mean/std 5 seed).
- **i. Hướng dẫn (2–3 tr):** cài đặt + chạy (dựng sẵn từ README, cả bash/PowerShell), hướng dẫn GUI theo luồng, ví dụ input/output, `[SCREENSHOT: danh sách 8 màn hình cụ thể — liệt kê sẵn từng cái]`.
- **j. Hạn chế & Future work (1–2 tr):** điền sẵn bullet từ mục 10 phương án (turn penalty, ALT, VRP, real-time, GA/ACO, mobile) + `[ĐIỀN: khó khăn thực tế nhóm gặp]`.

**`report/Slide-Outline.md`:** 14 slide map thẳng vào rubric — 1 tiêu đề · 2 bối cảnh · 3 mô hình + cost · 4 dữ liệu 2 tầng · 5–7 thuật toán lõi (ví dụ chạy tay) · 8 thuật toán bổ sung · 9 TSP · 10 kiến trúc hệ thống · 11 demo GUI · 12 benchmark · 13 ảnh hưởng ùn tắc + giải thích tuyến · 14 hạn chế & hướng phát triển. Mỗi slide: 3 bullet nội dung + ghi chú "nói gì trong 45–60 s".

**`report/Video-KichBan.md`:** timeline 18–25 phút bám đề mục 4.10: 0:00–2:00 giới thiệu bài toán & demo nhanh; 2:00–11:00 giảng từng thuật toán trên ví dụ G_demo (checklist đề: điểm đầu/cuối, thứ tự expand, frontier, giá trị cost của UCS/Dijkstra/A*, giá trị heuristic của A*/Greedy, cách suy ra tuyến cuối); 11:00–20:00 demo sản phẩm (chọn điểm & thuật toán, route 2 điểm, multiroute, ≥3 test case khác khung giờ, so sánh thuật toán, đọc phần giải thích tuyến); 20:00–23:00 benchmark & phân tích; 23:00–25:00 hạn chế + kết. Ghi chú cuối: **kiểm tra link video ở tab ẩn danh trước khi nộp** (yêu cầu trong phương án §9).

---

## 8. Chất lượng & kiểm thử

- **Python 3.14** (đổi từ 3.11 — duyệt 2026-07-26 sau khi kiểm chứng cả 8 gói osmnx/geopandas/shapely/pyproj/numpy/scipy/pandas/matplotlib đều có wheel cp314 win_amd64 trên PyPI, không gói nào phải build từ sdist; cả nhóm cài đúng 3.14), type hints đầy đủ, Pydantic v2 cho models, cấu trúc thuần `heapq`/`dict` cho thuật toán. TypeScript `strict: true`.
- `pytest` bắt buộc: validate schema; unit cost/heuristic; từng thuật toán vs NetworkX (G_demo toàn bộ cặp, G_real 50 cặp mẫu); Held-Karp vs brute force n≤8; sanity ATSP (heuristic ≥ Held-Karp); API TestClient smoke; kiểm tra trace hợp lệ (mọi node trong path đều từng ở frontier/expanded).
- Không nuốt lỗi: fail rõ ràng, message tiếng Anh có ngữ cảnh.
- README gốc: yêu cầu môi trường, 5 lệnh dựng lại toàn bộ (venv → pip → scripts 01–04 → uvicorn → npm run dev), bảng cổng, troubleshooting ngắn.

## 9. Giao thức làm việc với tôi

- Kết mỗi phase: tóm tắt ≤10 dòng (làm gì, test ra sao, số liệu chính, quyết định đã tự đưa, việc chờ tôi) rồi DỪNG.
- Lệnh tôi sẽ dùng: `tiếp tục` (phase kế) · `làm liên tục Phase X→Y, chỉ dừng khi gặp quyết định lớn` · `sửa schema: …` (→ cập nhật SCHEMA.md + refactor) · `chạy lại benchmark` · `trạng thái?` (→ đọc TIENDO.md trả lời).
- Quyết định đã chốt sau phase: bbox giữ `(106.680, 10.760, 106.720, 10.800)`; Python 3.14; `return_to_start=false`; NetworkX bị cô lập khỏi product runtime; người đại diện nộp chính thức là Thái Quang Huy. Việc nhóm còn phải chốt bằng con người: vai trò/phân công còn lại, xác nhận giảng viên nếu cần và bộ artifact nộp cuối.
