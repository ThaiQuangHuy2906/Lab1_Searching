# DATA – GRAPH – WEIGHTS: SOURCE OF TRUTH

> **Phạm vi:** Graph Modeling, Dataset Design, Node/Edge, Connectivity,
> OSM/TomTom, traffic profiles, weights, cost, heuristic và dữ liệu mà từng
> thuật toán Searching/ATSP thực sự sử dụng.
>
> **Mốc kiểm gốc:** 2026-08-06, commit
> `2328d5f47ec2d40e283809941039189383ab489e`. Ở workspace của tác giả audit
> lúc đó chưa có `data/raw/`, nên kết luận `UNKNOWN/UNVERIFIED` về raw
> provenance là đúng theo bằng chứng sẵn có tại thời điểm kiểm.
>
> **Mốc tái kiểm provenance:** 2026-08-07 (Asia/Saigon), HEAD
> `5693ae754926cfbcc5b3a05c7544127d9308cc90`. Tài liệu này được thêm ở
> `3f6df7c` lúc 17:15; commit `faf9866` lúc 17:40 sau đó bỏ rule ignore
> `data/raw/` và track raw GraphML, OSMnx cache cùng bốn raw TomTom snapshot.
>
> **Mốc xác nhận worktree hiện tại:** 2026-08-08 (Asia/Saigon), base HEAD
> `8a78a22`. Lệnh `.venv\Scripts\python.exe scripts\validate_data.py` đã trả
> `ALL DATA VALID`; lượt UI/tài liệu này không chạy crawl, build graph/profile,
> benchmark, hiệu chuẩn gamma hoặc generator.
>
> **Verdict hiện hành:** **Correct after fixes** trong phạm vi current
> repository/workspace. Đây là tài liệu tham chiếu canonical cho implementation,
> committed data và local provenance artifacts được liệt kê bên dưới; nó không
> phải chứng nhận độc lập cho độ xác thực ngoài đời của OSM/TomTom/manual risks.
> UI/documentation refresh 2026-08-08 không đổi graph, profile, cost hoặc heuristic.
>
> **Trạng thái:** tài liệu tham chiếu hiện hành sau khi đối soát lại, đồng thời
> giữ nguyên ngữ cảnh của audit gốc. Các kết luận raw-vắng trong Phụ lục A là
> lịch sử tại mốc gốc, không phải current state. Việc raw artifact hiện diện và
> tái đối chiếu được không đồng nghĩa nguồn ngoài đời đã được gọi lại hoặc xác
> thực độc lập trong lượt audit này.

## 0. Cách đọc, phạm vi khẳng định và thứ tự bằng chứng

Tài liệu này mô tả **implementation đang tồn tại**, không mô tả một thiết kế
mong muốn trong tương lai. Thứ tự bằng chứng được dùng để lập tài liệu:

1. Assignment PDF quyết định yêu cầu bài lab.
2. Executable schema: `backend/app/models.py`.
3. Runtime implementation: `backend/app/costs.py`, `graph_store.py`,
   `search*.py`, `tsp.py`, `scenario.py`, `main.py`.
4. Persisted data hiện hành: `data/graph_*.json`,
   `data/traffic_profiles_*.json`, `gdemo_corridors.json`.
5. Pipeline code: `scripts/01` đến `04` và `pipeline_common.py`.
6. Fresh read-only checks trên worktree hiện hành.
7. Markdown cũ chỉ là evidence bổ trợ; lịch sử không chứng minh trạng thái hiện tại.

### 0.1. Ranh giới Git, local workspace và evidence bị ignore

- **Tracked Git repository:** toàn bộ source dùng để lập claim current trong tài
  liệu này đều được track: `backend/`, active `frontend/`, `scripts/`, `data/`
  (bao gồm sáu file dưới `data/raw/`), tests, schema và assignment/spec.
- **Current local workspace:** HEAD nêu trên cộng thay đổi contract route 9 thuật
  toán trong backend/frontend/tests và các cập nhật tài liệu chưa commit. Không
  có graph/profile/result artifact nào được sửa để làm tài liệu trở nên đúng.
- **Ignored local runtime:** `.env`, `.venv/`, `frontend/node_modules/`,
  `frontend/.next/`, cache, log, `audit_tmp/`, `tmp/` và `.playwright-cli/` chỉ là
  secret/dependency/build/tool state. Tài liệu này **không dùng nội dung của các
  path đó làm bằng chứng**, nên không bỏ ignore chúng.
- **Final Data ZIP:** chưa được đóng gói. Khi nộp phải chứa graph/profile hiện
  hành, data description và raw provenance cần thiết theo yêu cầu đề; việc một
  file đã được Git track không tự chứng minh ZIP cuối đã đầy đủ.

Quy tắc duy trì: nếu một artifact local đang bị ignore trở thành bằng chứng cần
thiết cho claim canonical, phải chuyển bản đã làm sạch secret vào một path
tracked/unignored có chủ đích và cập nhật evidence map; không mở ignore cả thư
mục cache/dependency chỉ để chia sẻ context.

Các nhãn provenance trong tài liệu:

| Nhãn | Ý nghĩa chính xác |
|---|---|
| `REAL RAW` | Artifact raw do pipeline ghi từ nguồn ngoài và hiện còn để đối chiếu; nhãn này không tự chứng minh nguồn ngoài tại thời điểm audit. |
| `REAL-DERIVED` | Field được transform từ raw artifact và có thể tái đối chiếu bằng pipeline hiện hành. |
| `SEED/SIMULATED` | Giá trị do rule/random có seed sinh ra, không phải quan sát thực địa. |
| `MANUAL` | Nhóm tự nhập tọa độ, loại, flag hoặc danh sách. |
| `CONFIG` | Hằng số/quy ước mô hình do nhóm chọn. |
| `RUNTIME-COMPUTED` | Giá trị được tính lúc load/request, không persist như final weight. |
| `UNKNOWN/UNVERIFIED` | Phạm vi audit tại mốc đang xét thiếu bằng chứng để khẳng định nguồn gốc. |

### 0.2. Snapshot dữ liệu đang được runtime đọc

| Snapshot | Created | Node | Directed edge | `oneway=true` | Speed thực có trong JSON |
|---|---:|---:|---:|---:|---:|
| `G_demo` | 2026-08-03 | 51 | 298 | 60 | 30–45 km/h |
| `G_real` | 2026-07-27 | 2.118 | 4.699 | 1.433 | 25–45 km/h |

Hai profile có bốn slot `07:30`, `12:00`, `17:30`, `22:00` và đều ghi
`meta.source = "tomtom+synthetic"`. Current Git/workspace có `data/raw/` với
raw GraphML, OSMnx cache và đúng một TomTom snapshot cho mỗi slot; cả 160/160
record TomTom có `currentSpeed` và `freeFlowSpeed` dương. Thành phần TomTom có
thể tái đối chiếu cục bộ với profile, nhưng không được gọi là real-time hoặc
external ground truth đã được audit độc lập; xem mục 2.6.

Evidence:

- `data/graph_demo.json`, `data/graph_real.json`.
- `data/traffic_profiles_demo.json`, `data/traffic_profiles_real.json`.
- `backend/app/graph_store.py -> GraphStore.load()`.
- `scripts/validate_data.py -> check_source_consistency()`.
- `git ls-files data/raw` và fresh read-only raw/profile reconciliation tại
  HEAD nêu trên.

### 0.3. Fresh verification record — 2026-08-08

Các command sau được chạy lại trên đúng current worktree; đây là structural và
behavioral evidence cục bộ, không phải external-source attestation:

| Command | Kết quả thực tế |
|---|---|
| `.venv\Scripts\python.exe -m pytest backend\tests\ -v` | PASS — 177 passed, 1 warning |
| `.venv\Scripts\python.exe scripts\validate_data.py` | PASS — `ALL DATA VALID`; cả hai graph strongly connected, profile 4×100% |
| `npm test` trong `frontend/` | PASS — 41/41 |
| `npx tsc --noEmit` trong `frontend/` | PASS — exit 0 |
| `npm run build` trong `frontend/` sau khi dừng dev services | PASS — Next.js production build, 6/6 static pages |

Không crawl lại OSM/TomTom, không rebuild graph/profile, không rerun benchmark,
không recalibrate γ và không regenerate teaching/benchmark Markdown trong lượt
audit này.

---

# 1. Problem Modeling

## 1.1. Bài toán được mô hình hóa

Project giải hai bài toán trên cùng graph đường có hướng:

1. **Tìm đường hai điểm:** từ một node bắt đầu `start` tới node đích `goal`
   bằng một trong chín thuật toán Searching.
2. **Giao hàng nhiều điểm:** cố định điểm xuất phát, tối ưu thứ tự thăm các
   `stops` trên cost matrix có hướng bằng Held–Karp, NN + 2-opt/Or-opt hoặc
   Simulated Annealing.

Graph tại một request được ký hiệu:

\[
G=(V,E)
\]

Trong đó `V` là tập node, `E` là tập directed edge. Mỗi edge có các thuộc tính
cơ sở; final search weight phụ thuộc `mode`, `time_slot` và optional scenario.

## 1.2. State, start state, goal state và transition rule

- **State:** ID của node hiện tại, dạng `nNNNN`.
- **Start state:** `RouteRequest.start`.
- **Goal test:** node được pop/expand bằng `RouteRequest.goal`.
- **Action/transition:** đi qua một directed edge `e` có `e.u == current`.
- **Successor:** `e.v`.
- **Step cost:** tùy thuật toán. BFS/DFS/IDDFS bỏ qua weight trong lúc search;
  các thuật toán weighted dùng `GraphStore.weight(edge_id, mode, slot)`.

Quy tắc chính xác:

```text
A → B đi được trực tiếp
⇔ tồn tại đúng một edge e trong resolved store với e.u=A và e.v=B
⇔ GraphStore.adj[A] chứa (B, e.id)
```

```text
A → C không đi được trực tiếp
⇔ không có edge e.u=A, e.v=C
```

Khoảng cách địa lý gần nhau, cùng tên đường hoặc cùng loại POI **không tự tạo
connectivity**. Nếu không có edge trực tiếp, thuật toán chỉ có thể tới C thông
qua một chuỗi directed edge khác.

Ở `graph_view=full`, resolved edges là base JSON edges. Ở teaching view, đây là
induced subset: A và B đều phải nằm trong node prefix và base edge A→B phải tồn
tại. Scenario overrides chỉ đổi attributes/profile values; chúng không thêm,
xóa hoặc đảo hướng edge. Vì vậy connectivity không đổi bởi weight override.

Evidence: `backend/app/graph_store.py -> GraphStore.__init__()` tạo `adj` và
`radj`; `backend/app/search.py` và `search_advanced.py` chỉ lấy neighbor từ hai
adjacency này.

Fresh forward/reverse traversal trên current JSON đạt 51/51 node ở G_demo và
2.118/2.118 node ở G_real theo cả hai chiều, nên hai base snapshots strongly
connected: mọi ordered node pair có **một path gián tiếp**, nhưng không có nghĩa
mọi pair có direct edge.

## 1.3. Directed edge và one-way

Graph là directed ở cả hai level. `oneway` không được search đọc như một lệnh
chặn riêng. Hướng đi đã được quyết định bởi sự tồn tại của edge `u → v`.

- `oneway=false`: executable schema yêu cầu phải có reverse twin `(v,u)`.
- `oneway=true`: mô tả rằng reverse directed edge không tồn tại trong graph đã
  build.
- Một edge `oneway=true` vẫn được đi theo chiều `u → v`.

### Ý nghĩa riêng trên G_real

Pipeline **không persist trực tiếp OSM `oneway` tag**. Sau khi deduplicate,
`scripts/02_build_graph.py` gán:

```python
e["oneway"] = (v, u) not in best
```

Vì vậy `oneway` của G_real là thuộc tính structural: reverse pair có tồn tại
hay không sau preprocessing.

### Ý nghĩa riêng trên G_demo

`oneway=true` nghĩa là abstract demo adjacency ngược không tồn tại. Reverse
corridor có thể bị loại vì shortest path ngược đi qua một POI thứ ba; do đó
không được diễn giải mọi demo edge đỏ là một OSM road segment có biển một chiều.

Evidence:

- `backend/app/models.py -> GraphFile._check()`.
- `scripts/02_build_graph.py -> main()`.
- `scripts/04_build_gdemo.py -> main()`, đoạn loại path có POI thứ ba và đoạn
  gán `oneway` khi ghi edge.

## 1.4. Schema node

Executable source: `backend/app/models.py -> Node`.

| Field | Type/constraint | Required? | Ý nghĩa | Search dùng? |
|---|---|---:|---|---|
| `id` | regex `^n\d{4}$` | Có | ID nội bộ ổn định trong snapshot | Có, làm state/key |
| `name` | `string \| null` | Có, nullable | Tên POI; G_real hiện toàn `null` | Không, chỉ UI/explanation |
| `lat` | float `[-90,90]` | Có | Vĩ độ EPSG:4326 | A*/Greedy/IDA*/Beam heuristic |
| `lon` | float `[-180,180]` | Có | Kinh độ EPSG:4326 | A*/Greedy/IDA*/Beam heuristic |
| `type` | landmark/intersection/warehouse/hospital/school | Có | Vai trò hiển thị/kịch bản | Không dùng tính cost |

**Không có node weight.** Node không chứa congestion, time, penalty hay final
search cost. Chi phí nằm ở edge/profile và được tính runtime.

Ví dụ hiện hành từ `data/graph_demo.json`:

```json
{
  "id": "n0001",
  "name": "Chùa Xá Lợi",
  "lat": 10.778537,
  "lon": 106.6865528,
  "type": "landmark"
}
```

## 1.5. Schema edge

Executable source: `backend/app/models.py -> Edge`.

| Field | Type/constraint | Ý nghĩa | Nguồn hiện hành | Dùng ở đâu |
|---|---|---|---|---|
| `id` | regex `^e\d{5}$` | ID edge | Stable sort khi build | Profile key, weight key, trace/map |
| `u` | NodeId | Source | Topology đã build | Adjacency |
| `v` | NodeId | Target | Topology đã build | Adjacency |
| `name` | string/null | Tên đường dominant/OSM | OSM-derived hoặc corridor-derived | UI/explanation |
| `length_m` | float > 0 | Chiều dài, mét | OSM length hoặc tổng corridor | Distance và mọi time weight |
| `highway` | string | Road class | OSM-derived hoặc dominant corridor | Build speed/fallback; không trực tiếp trong runtime formula |
| `oneway` | bool | Reverse edge có thiếu không | Structural-derived | Mô tả direction; topology đã enforce |
| `free_speed_kmh` | float > 0 | Tốc độ free-flow mô hình | Config theo road type/corridor average | Time, balanced, global `v_max` |
| `free_travel_time_s` | float > 0 | Giá trị display làm tròn 0,1 s | Derived | Không dùng làm runtime weight |
| `risk.flood` | 0/1 | Edge đi vào vùng ngập manual | Manual-zone-derived | Balanced penalty +60 s |
| `risk.construction` | 0/1 | Edge đi vào vùng thi công manual | Manual-zone-derived | Balanced penalty +90 s |
| `risk.narrow_alley` | 0/1 | Đường hẹp theo road class/corridor share | Rule-derived | Balanced penalty +30 s |
| `risk.traffic_light` | 0/1 | Edge kết thúc ở node traffic signal | OSM-tag-derived, locally reconciled; external origin partially verified | Balanced penalty +25 s |

Mọi field top-level của edge đều required. Các risk flag có default 0 trong
Pydantic nhưng JSON hiện hành ghi đủ cả bốn.

Ví dụ G_demo `e00001`:

```json
{
  "id": "e00001",
  "u": "n0001",
  "v": "n0008",
  "oneway": false,
  "length_m": 727.9,
  "name": "Nguyễn Thông",
  "highway": "tertiary",
  "free_speed_kmh": 36.2,
  "free_travel_time_s": 72.4,
  "risk": {
    "flood": 0,
    "construction": 0,
    "narrow_alley": 0,
    "traffic_light": 1
  }
}
```

Runtime tính lại exact `t_free = 72.387845... s`; số 72,4 s chỉ là display.

## 1.6. Schema graph

Executable source: `backend/app/models.py -> GraphMeta`, `GraphFile`.

```text
GraphFile
├── meta
│   ├── name: string
│   ├── bbox: [left, bottom, right, top]
│   ├── directed: true
│   ├── created: date
│   ├── crs: "EPSG:4326"
│   ├── node_count: int >= 1
│   └── edge_count: int >= 1
├── nodes: Node[]
└── edges: Edge[]
```

Model kiểm:

- metadata count khớp array length;
- node/edge ID không trùng;
- node nằm trong bbox;
- edge endpoint tồn tại;
- không có self-loop;
- không có hai edge cùng pair `(u,v)`;
- edge `oneway=false` phải có reverse twin.

Strong connectivity và exact traffic-profile coverage được kiểm thêm bởi
`scripts/validate_data.py`, không chỉ bằng `GraphFile` model.

## 1.7. Schema traffic profile

Executable source: `backend/app/models.py -> ProfilesMeta`, `TrafficProfiles`.

```text
TrafficProfiles
├── meta
│   ├── graph: string
│   ├── created: date
│   └── source: "synthetic" | "tomtom+synthetic"
└── profiles
    ├── "07:30": { edge_id: congestion_level 1..5 }
    ├── "12:00": { edge_id: congestion_level 1..5 }
    ├── "17:30": { edge_id: congestion_level 1..5 }
    └── "22:00": { edge_id: congestion_level 1..5 }
```

Mỗi slot hiện có đúng một level cho mọi edge của graph tương ứng. Profile
không lưu `currentSpeed`, `freeFlowSpeed`, factor, time hay final weight.

## 1.8. Schema request/response liên quan data và cost

```text
RouteRequest
├── start, goal
├── algorithm
├── mode: distance | time | balanced
├── time_slot
├── graph: demo | real
├── scenario?
│   ├── graph_view
│   └── edge_overrides[]
├── include_trace?
└── params?: beam_width, epsilon
```

```text
Trace/RouteResponse
├── path: NodeId[]
├── metrics
│   ├── total_cost
│   ├── total_distance_m
│   ├── total_time_s
│   ├── nodes_expanded
│   ├── max_frontier
│   ├── runtime_ms
│   ├── optimal_guarantee
│   ├── epsilon_bound?
│   ├── beam_width?
│   └── trace_truncated
├── trace[]: expanded/frontier/g/h/f/depth_limit/side
├── explanation
└── applied_scenario
```

```text
ScenarioConfig (optional, request-scoped)
├── graph_view: full | teach_3..teach_50
└── edge_overrides[] (edge_id unique)
    ├── edge_id
    ├── length_m?: finite > 0; semantic floor = ceil_0.1m(Haversine(u,v))
    ├── free_speed_kmh?: finite 1..200
    ├── congestion?: partial {slot: integer 1..5}
    └── risk?: partial {flood|construction|narrow_alley|traffic_light: 0|1}
```

```text
MultirouteRequest
├── start
├── stops: 1..15 distinct NodeId; không chứa start
├── method: held_karp | nn_2opt | sa
├── mode, time_slot, graph, scenario?
├── return_to_start: false mặc định
└── include_trace: false mặc định

MultirouteResponse
├── method, mode, time_slot, graph, applied_scenario
├── found, order[]
├── legs[]: from_node, to_node, path[], LegMetrics
├── totals: LegMetrics | null
├── original_order_totals: LegMetrics | null
├── savings_pct: float | null; optimal_guarantee
├── optimization_trace?
└── optimizer_stats? (chỉ SA)
```

`total_time_s` hiện được contract là **balanced-weight sum**, tức time + risk
penalty, không phải pure driving time; xem mục 3.4.

## 1.9. G_real: cách tạo và connectivity

Pipeline hiện có:

```text
OSM bbox drive network
→ OSMnx MultiDiGraph
→ largest strongly connected component
→ graph_raw.graphml
→ bỏ self-loop
→ gộp parallel edge cùng (u,v), giữ free_travel_time nhỏ nhất
→ stable NodeId/EdgeId
→ graph_real.json
→ GraphStore.adj/radj
```

Chi tiết:

- Bbox: `(106.680, 10.760, 106.720, 10.800)`.
- `network_type="drive"`.
- Raw OSMnx graph có thể là `MultiDiGraph` và có parallel edges.
- Product graph không phải multigraph: chỉ còn tối đa một edge trên mỗi ordered
  pair `(u,v)`.
- Nếu hai parallel edge có cùng `(u,v)`, pipeline giữ edge có stored
  `free_travel_time_s` nhỏ nhất sau khi làm tròn 0,1 s; nếu bằng nhau, edge gặp
  trước trong iteration được giữ.
- Edge ngược `(v,u)` là một ordered pair độc lập.
- Node G_real được stable-sort theo OSMID nhưng OSMID không được persist.
- Toàn bộ node G_real hiện là `intersection`, `name=null`.

Evidence:

- `scripts/01_download_osm.py -> main()`.
- `scripts/02_build_graph.py -> main()`.
- `data/graph_real.json`.

## 1.10. G_demo: cách tạo và connectivity

G_demo không phải graph vẽ tay độc lập. Nó là abstraction của G_real có thêm
POI manual:

```text
51 POI manual
→ snap vào node G_real gần nhất
→ nếu node đã dùng, thử node trống kế tiếp trong 120 m
→ chọn các cặp POI lân cận
→ shortest directed path trên G_real theo free-flow time
→ bỏ path đi qua POI thứ ba
→ contract real corridor thành một demo edge
→ repair sáu invariant
→ prune edge dư mà vẫn giữ invariant
→ largest SCC
→ graph_demo.json + gdemo_corridors.json
```

Một contracted edge:

- `length_m` = tổng length real edges, làm tròn lên 0,1 m;
- `free_speed_kmh` = tốc độ corridor equivalent từ tổng length/tổng free time;
- `name` và `highway` = giá trị chiếm tổng length lớn nhất;
- flood/construction/traffic_light = OR dọc corridor;
- narrow = 1 nếu narrow-road length chiếm **hơn 30%** corridor;
- `_real_eids` bị bỏ khỏi public graph và ghi riêng vào
  `data/gdemo_corridors.json`.

Build constraints:

- Free-flow time demo/real ratio tối đa 1,5.
- Distance ratio tối đa 1,8.
- Balanced ratio tối đa 1,5 ở từng slot.
- Repair tối đa 20 vòng.

## 1.11. G_demo và G_real khác nhau thế nào

| Thuộc tính | G_demo | G_real |
|---|---|---|
| Mục đích | Dạy học, GUI, trace, video | Scale, benchmark, đường nội bộ chi tiết |
| Node | 51 POI đã snap | 2.118 intersection |
| Edge | 298 contracted corridors | 4.699 processed road segments |
| Schema | Chung `GraphFile` | Chung `GraphFile` |
| Node name | Có tên POI | Hiện toàn `null` |
| Connectivity | Derived corridor giữa POI | Derived từ OSMnx drive topology |
| Geometry | Chỉ endpoint, không corridor polyline | Chỉ endpoint, không OSM polyline |
| Traffic | Weighted mean từ real corridor | TomTom-derived nếu match, còn lại fallback |
| GraphView | `full` hoặc `teach_3`…`teach_50` | Chỉ `full` |
| Algorithms | Cả 9 search + 3 ATSP | Cả 9 search + 3 ATSP |
| Benchmark | Exp 6–7 | Exp 1–5 |

GraphView executable hiện là `full` hoặc `teach_3` đến `teach_50`; 51 node được
biểu diễn bằng `full`. Teaching view là induced subgraph từ prefix
`data/teaching_graph_presets.json` version 2 và được validate strong connectivity.
Các mô tả cũ chỉ có `teach_7/15/25` là stale.

---

# 2. Dataset Design

## 2.1. Current data inventory

| Data | G_demo | G_real |
|---|---:|---:|
| Node | 51 | 2.118 |
| Edge | 298 | 4.699 |
| One-way structural edge | 60 | 1.433 |
| Flood edge | 24 | 54 |
| Construction edge | 24 | 19 |
| Narrow edge | 0 | 8 |
| Traffic-light edge | 130 | 185 |
| Node types | 40 landmark, 7 school, 3 hospital, 1 warehouse | 2.118 intersection |
| Edge name null | 0 | 635 |
| Time slots | 4 | 4 |

### 2.1.1. Current node/ID/coordinate facts

| Graph | Node ID | Edge ID | Latitude range | Longitude range | Name/type |
|---|---|---|---:|---:|---|
| G_demo | 51/51 khớp `nNNNN` | 298/298 khớp `eNNNNN` | 10,7625260–10,7928774 | 106,6814148–106,7077438 | 51/51 name non-null; 40 landmark, 7 school, 3 hospital, 1 warehouse |
| G_real | 2.118/2.118 khớp `nNNNN` | 4.699/4.699 khớp `eNNNNN` | 10,7600254–10,7999582 | 106,6800466–106,7199906 | 2.118/2.118 name null; toàn bộ type `intersection` |

Không graph nào có duplicate ID hoặc edge trỏ tới endpoint không tồn tại.
`bbox` metadata của cả hai là `[106.68, 10.76, 106.72, 10.8]`, CRS
`EPSG:4326`, `directed=true`.

### 2.1.2. Current edge-value ranges và road classes

| Graph | `length_m` min–max | `free_speed_kmh` min–max | Stored `free_travel_time_s` min–max |
|---|---:|---:|---:|
| G_demo | 23,0–2.775,6 m | 30–45 km/h | 1,8–270,8 s |
| G_real | 1,1–1.682,3 m | 25–45 km/h | 0,1–134,6 s |

Road-class counts trong current JSON:

| Highway | G_demo edge | G_real edge |
|---|---:|---:|
| residential | 27 | 2.220 |
| tertiary | 84 | 933 |
| tertiary_link | 0 | 42 |
| primary | 121 | 755 |
| primary_link | 0 | 230 |
| secondary | 66 | 447 |
| secondary_link | 0 | 31 |
| trunk | 0 | 26 |
| trunk_link | 0 | 7 |
| living_street | 0 | 8 |

Các range/count này mô tả artifact ngày audit, không phải schema constraint.
Schema cho phép highway string khác và speed dương khác nếu data được rebuild
hợp lệ.

## 2.2. Danh sách đầy đủ 51 location/POI của G_demo

Nguồn runtime: `data/graph_demo.json`. Tọa độ POI ban đầu là manual/approximate;
tọa độ trong graph là tọa độ G_real node đã snap, không nhất thiết đúng tâm POI.

| Node | Location | Type |
|---|---|---|
| n0001 | Chùa Xá Lợi | landmark |
| n0002 | Hồ Con Rùa | landmark |
| n0003 | Chợ Tân Định | landmark |
| n0004 | ĐH Kinh tế TP.HCM | school |
| n0005 | Nhà thờ Đức Bà | landmark |
| n0006 | Bảo tàng Chứng tích Chiến tranh | landmark |
| n0007 | Cung Văn hoá Lao Động | landmark |
| n0008 | Vòng xoay Dân Chủ | landmark |
| n0009 | Chùa Vĩnh Nghiêm | landmark |
| n0010 | Chợ Thái Bình | landmark |
| n0011 | BV Từ Dũ | hospital |
| n0012 | Sân vận động Hoa Lư | landmark |
| n0013 | ĐH Mở TP.HCM | school |
| n0014 | THPT Lê Quý Đôn | school |
| n0015 | Thảo Cầm Viên | landmark |
| n0016 | Đài truyền hình HTV | landmark |
| n0017 | Công viên Tao Đàn | landmark |
| n0018 | Điểm trung chuyển Hàm Nghi | landmark |
| n0019 | Bảo tàng Mỹ thuật TP.HCM | landmark |
| n0020 | Chợ Bến Thành | landmark |
| n0021 | Bưu điện Thành phố | warehouse |
| n0022 | Bitexco Financial Tower | landmark |
| n0023 | BV Nhi Đồng 2 | hospital |
| n0024 | Cầu Ông Lãnh | landmark |
| n0025 | Nhà hát Thành phố | landmark |
| n0026 | Nhà văn hoá Thanh Niên | landmark |
| n0027 | Cầu Calmette | landmark |
| n0028 | Saigon Centre (Takashimaya) | landmark |
| n0029 | Bến Bạch Đằng | landmark |
| n0030 | UBND TP.HCM | landmark |
| n0031 | Công viên Lê Văn Tám | landmark |
| n0032 | Cầu Kiệu | landmark |
| n0033 | Chợ Đa Kao | landmark |
| n0034 | BV Mắt TP.HCM | hospital |
| n0035 | Cầu Mống | landmark |
| n0036 | Phố đi bộ Bùi Viện | landmark |
| n0037 | Công viên 23/9 | landmark |
| n0038 | Đền Bà Mariamman | landmark |
| n0039 | Bảo tàng Hồ Chí Minh (Bến Nhà Rồng) | landmark |
| n0040 | Bảo tàng TP.HCM | landmark |
| n0041 | THPT Nguyễn Thị Minh Khai | school |
| n0042 | Trường Marie Curie | school |
| n0043 | ĐH Khoa học Tự nhiên (Nguyễn Văn Cừ) | school |
| n0044 | Công trường Mê Linh | landmark |
| n0045 | Dinh Độc Lập | landmark |
| n0046 | Chùa Ngọc Hoàng | landmark |
| n0047 | Cầu Ba Son | landmark |
| n0048 | Bảo tàng Lịch sử TP.HCM | landmark |
| n0049 | ĐH Kiến trúc TP.HCM | school |
| n0050 | Nhà thờ Tân Định | landmark |
| n0051 | Chợ Nancy | landmark |

## 2.3. Nguồn và phân loại từng nhóm field

| Field/data | Phân loại | Cách tạo/nguồn | Ghi chú về mức xác minh |
|---|---|---|---|
| OSM road topology ban đầu | `REAL RAW` artifact, external origin `PARTIALLY VERIFIED` | OSMnx `graph_from_bbox(..., network_type="drive")` | `data/raw/graph_raw.graphml` hiện được track và đối chiếu được; audit không gọi lại OSM |
| `G_real` node/edge connectivity | `REAL-DERIVED`, locally verified | Lấy largest strongly connected component, simplify/deduplicate rồi đổi ID | Fresh in-memory transform từ raw khớp current `graph_real.json` |
| Node `lat`, `lon` G_real | `REAL-DERIVED`, locally verified | Tọa độ OSM node được copy và làm tròn | Dùng cho heuristic/map |
| Node `name`, `type` G_real | `CONFIG`/derived | `name=null`, `type=intersection` | Không phải POI observations |
| 51 POI G_demo | `MANUAL` | `data/gdemo_pois.json` | Tên, loại và tọa độ do nhóm curate |
| POI snap vào G_real | `RUNTIME-COMPUTED` ở build time | Nearest G_real node; có thể lấy candidate thứ hai trong 120 m để tránh trùng | Kết quả được persist trong demo graph/corridor artifact |
| `length_m` G_real | `REAL-DERIVED`, locally verified | OSM/OSMnx edge length; parallel edge được chọn theo stored free time làm tròn nhỏ nhất | Mét; runtime dùng trực tiếp |
| `length_m` G_demo | `REAL-DERIVED` từ graph artifact | Tổng `length_m` trên G_real corridor | Không phải Haversine thẳng giữa hai POI |
| `highway`, `name` G_real | `REAL-DERIVED`, locally verified | OSM edge attributes được normalize | Multi-valued OSM tags được normalize bằng pipeline |
| `highway`, `name` G_demo | `RUNTIME-COMPUTED` ở build time | Dominant value trên corridor | Đại diện corridor, không đảm bảo mô tả mọi segment |
| `free_speed_kmh` G_real | `CONFIG` | Lookup theo road type | Không phải measured TomTom speed |
| `free_speed_kmh` G_demo | `RUNTIME-COMPUTED` ở build time | `length / total free-flow time` của corridor | Có thể là số lẻ như 36,2 km/h |
| `free_travel_time_s` | `REAL-DERIVED` + `CONFIG` | `length / configured speed`, persist làm tròn 0,1 s | Runtime không dùng số đã làm tròn; tính lại từ length/speed |
| Raw TomTom sampled traffic | `REAL RAW` artifact, external origin `PARTIALLY VERIFIED` | Flow Segment API, tối đa 40 sample/slot | Bốn tracked snapshot, 40 valid record/slot; audit không gọi lại TomTom |
| Persisted `congestion_level` | Mixed `REAL-DERIVED` + `SEED/SIMULATED`, locally verified | TomTom match trong 250 m hoặc seeded fallback | Reconciliation xác nhận 635 TomTom-assigned và 4.064 fallback edge/slot trên G_real |
| Flood/construction circles | `MANUAL` | 5 flood + 3 construction zones | 8/8 `source_url` đã review; chỉ hỗ trợ bối cảnh sự kiện lịch sử ở cấp tuyến/khu vực, không xác nhận circle hoặc trạng thái hiện tại |
| `risk.flood`, `construction` | `MANUAL`-derived | Edge từ ngoài đi vào circle | Flag nhị phân; không phải xác suất/mức độ |
| `risk.narrow_alley` G_real | `CONFIG`-derived | Road class thuộc nhóm hẹp của pipeline | Không được khảo sát chiều rộng thực |
| `risk.narrow_alley` G_demo | `CONFIG`-derived | Trên 30% corridor edge bị đánh dấu hẹp | Rule tổng hợp |
| `risk.traffic_light` | `REAL-DERIVED`, locally verified | Destination node có OSM `highway=traffic_signals` | Penalty áp khi đi vào node signal |
| Gamma/risk penalties/epsilon/beam width | `CONFIG` | Constants trong code | Không được fitted từ dataset thực |
| Final edge weight theo request | `RUNTIME-COMPUTED` | `costs.py`, profile slot và scenario | Không persist trong graph JSON |

## 2.4. OSM: pipeline và trạng thái bằng chứng hiện tại

Pipeline được code hóa như sau:

```text
BBOX trung tâm TP.HCM
  → scripts/01_download_osm.py
  → OSMnx graph_from_bbox(network_type="drive")
  → largest strongly connected component
  → raw GraphML
  → scripts/02_build_graph.py
  → normalize + deduplicate + stable IDs + risk flags
  → data/graph_real.json
```

BBOX config là `[106.680, 10.760, 106.720, 10.800]` theo thứ tự
`[left, bottom, right, top]`.

`scripts/02_build_graph.py` xử lý graph OSMnx dạng `MultiDiGraph`. Với nhiều
parallel edge có cùng ordered pair `(u,v)`, pipeline chọn **một** edge có
stored `free_travel_time_s` nhỏ nhất sau khi làm tròn 0,1 s (giữ edge gặp trước
nếu tie). Self-loop bị bỏ. Sau đó OSM node IDs chỉ
được dùng để sắp thứ tự ổn định rồi đổi thành ID nội bộ `nNNNN`; raw OSM ID
không còn trong public JSON.

Điểm cần diễn đạt thận trọng:

- Current Git/workspace có `data/raw/graph_raw.graphml` (2.373.739 byte,
  SHA-256 `74dd692772d9f9537e1e2206e32033120547ae4c8ccefbdc967aaedcf805e64b`)
  và OSMnx cache response liên quan.
- Raw GraphML là `MultiDiGraph` 2.118 node/4.721 directed edge. Fresh
  read-only reconstruction bỏ 2 self-loop và collapse 20 parallel duplicate,
  cho đúng 4.699 edge; node/edge fields sau transform khớp current
  `data/graph_real.json`.
- Bằng chứng trên xác minh local lineage và implementation transformation;
  audit này không gọi lại OSM để xác nhận snapshot bên ngoài, license hoặc tính
  đầy đủ của endpoint tại thời điểm crawl.
- Vì thế G_real là **processed OSM-derived directed graph artifact**, không
  phải “raw OSM dataset”; raw GraphML là input provenance đi kèm riêng.

## 2.5. Tốc độ free-flow theo road type

`scripts/pipeline_common.py -> SPEED_BY_HIGHWAY` quy định:

| OSM highway class | `free_speed_kmh` config |
|---|---:|
| motorway, motorway_link | 60 km/h |
| trunk, trunk_link, primary, primary_link | 45 km/h |
| secondary, secondary_link | 40 km/h |
| tertiary, tertiary_link | 35 km/h |
| unclassified, residential, road | 30 km/h |
| living_street, service, alley, track | 25 km/h |
| thiếu/khác | 30 km/h |

Đây là **assumed model speed**, không phải observed traffic speed. Snapshot
G_real hiện tại chỉ thực sự chứa 25–45 km/h; bảng 60 km/h vẫn là config có thể
áp dụng nếu input có motorway.

## 2.6. TomTom, traffic fallback và provenance

### Thiết kế crawler

`scripts/03a_crawl_tomtom.py`:

1. Lọc G_real edge thuộc `motorway|trunk|primary|secondary`, sort giảm dần theo
   `length_m`, lấy tọa độ source node và de-duplicate theo grid lat/lon làm tròn
   3 chữ số; dừng ở tối đa 40 điểm.
2. Gọi TomTom Flow Segment Data API theo bốn slot đại diện.
3. Ghi các field raw: `lat`, `lon`, `currentSpeed`, `freeFlowSpeed`, `frc`,
   `queried_at` vào file raw theo slot.

Crawler không được runtime gọi. API key chỉ phục vụ pipeline ngoại tuyến.

### Quy đổi TomTom thành congestion level

`scripts/03b_build_profiles.py` tính ratio:

\[
r = currentSpeed / freeFlowSpeed
\]

| Ratio | Level |
|---|---:|
| `r >= 0.85` | 1 |
| `0.70 <= r < 0.85` | 2 |
| `0.55 <= r < 0.70` | 3 |
| `0.40 <= r < 0.55` | 4 |
| `r < 0.40` | 5 |

Một sample chỉ được gán cho edge thuộc `motorway|trunk|primary|secondary` hoặc
các class `_link` tương ứng, và sample gần source node không quá 250 m. Code
hiện tại **không match theo tên đường hoặc
`frc`/road class**, dù một số Markdown cũ diễn đạt mạnh hơn. Đây là nearest
spatial sampling thô, không phải map matching vào geometry đường.

03b đọc tất cả `flow_*.json` trong directory của slot và bỏ record thiếu/zero
`currentSpeed` hoặc `freeFlowSpeed`. `meta.source` được gán
`tomtom+synthetic` nếu có ít nhất một valid TomTom point ở **bất kỳ slot nào**;
nó không chứng minh cả bốn slot đều có raw coverage. Đây là file-level label,
không phải per-edge/per-slot lineage.

### Seeded synthetic fallback

Edge không được TomTom phủ dùng `random.Random(42)` với rule:

| Road group | 07:30 peak base | 17:30 peak base |
|---|---:|---:|
| primary/trunk và link | randint 4–5 | randint 4–5 |
| secondary và link | randint 3–4 | randint 3–4 |
| tertiary và link | randint 2–4 | randint 2–4 |
| còn lại | randint 2–3 | randint 2–3 |

- Mỗi peak có xác suất 10% tăng thêm 1, cap tại 5.
- `12:00 = max(1, 07:30 - 1)`.
- `22:00 = randint(1,2)`.
- Seed 42 cho tính tái lập; đây là simulation, không phải measurements.

### Runtime và raw evidence thực sự có gì

Runtime hiện đọc four-slot levels từ committed `traffic_profiles_*.json`.
Không có HTTP/network trong demo routing. Metadata của cả hai profile nói
`tomtom+synthetic`. Current Git/workspace có đúng một tracked raw snapshot cho
mỗi slot:

| Slot | Raw file | `queried_at` | Record hợp lệ |
|---|---|---|---:|
| `07:30` | `flow_20260727T074003.json` | `20260727T074003` | 40/40 |
| `12:00` | `flow_20260727T124957.json` | `20260727T124957` | 40/40 |
| `17:30` | `flow_20260803T173001.json` | `20260803T173001` | 40/40 |
| `22:00` | `flow_20260803T222752.json` | `20260803T222752` | 40/40 |

Fresh read-only execution của logic 03b đối với raw/profile hiện hành khớp
toàn bộ level G_real: mỗi slot có 635 edge nhận nearest eligible TomTom sample
và 4.064 edge dùng deterministic fallback. So với pure fallback seed 42,
profile khác ở lần lượt 567/557/524/356 edge theo bốn slot; số này là số level
thực sự đổi, không phải số edge được TomTom assignment.

Kết luận report-safe:

- Có thể nói traffic profile hiện hành là **persisted mixed-profile artifact**
  và runtime dùng nó.
- Có thể nói bốn raw artifact hiện được track, có 160/160 record tốc độ hợp lệ
  và locally reproduce phần TomTom/fallback của profile hiện hành.
- Không được suy từ đó rằng dữ liệu là real-time, toàn bộ edge dùng TomTom, hay
  TomTom/OSM external truth đã được audit độc lập; không có live re-query trong
  lượt kiểm này.
- `meta.source="tomtom+synthetic"` vẫn là label cấp file, không phải lineage
  per-edge/per-slot; bằng chứng mạnh hơn đến từ raw reconciliation ở trên.

## 2.7. Traffic profile G_demo

`scripts/04_build_gdemo.py` không crawl TomTom lại; nó dùng profile real khi
kiểm/repair balanced invariants. Sau khi G_demo và corridor map đã tồn tại,
`scripts/03b_build_profiles.py -> derive_demo_from_corridors()` ghi profile
demo. Với mỗi demo corridor và mỗi slot, level được lấy bằng
free-flow-time-weighted mean của các G_real edge:

\[
L_{demo} = round_{half\text{-}up}
\left(
\frac{\sum_i L_i t_{free,i}}{\sum_i t_{free,i}}
\right)
\]

Kết quả clamp vào 1–5. Vì thế G_demo congestion là derived từ G_real profile,
không phải raw sample riêng ở từng demo edge.

## 2.8. Risk data

`data/manual_risks.json` chứa 5 circle ngập và 3 circle thi công;
`scripts/pipeline_common.py -> risk_entry_flags()` thực thi rule cho
flood/construction là **entry event**:

```text
risk = 1 khi u nằm ngoài vùng và v nằm trong vùng
```

Nếu bắt đầu trong vùng hoặc đi giữa hai node cùng ở trong vùng, edge đó không
nhận entry flag theo rule này. Penalty do đó là phí đi vào vùng, không phải phí
theo mỗi mét nằm trong vùng.

Current counts:

| Graph | flood | construction | narrow_alley | traffic_light |
|---|---:|---:|---:|---:|
| G_demo | 24 | 24 | 0 | 130 |
| G_real | 54 | 19 | 8 | 185 |

Toàn bộ manual zone input:

| ID | Type | Tên manual | Lat | Lon | Radius | Source status |
|---|---|---|---:|---:|---:|---|
| r01 | flood | Nguyễn Hữu Cảnh (đoạn gần cầu Sài Gòn) | 10,7925 | 106,7190 | 400 m | reviewed; strong historical segment match |
| r02 | flood | Đinh Tiên Hoàng (đoạn gần cầu Bông, Đa Kao) | 10,7955 | 106,6985 | 250 m | reviewed; source segment renamed Lê Văn Duyệt, main-edge endpoint ≈253 m from center |
| r03 | flood | Cống Quỳnh (gần BV Từ Dũ) | 10,7680 | 106,6870 | 250 m | reviewed; street-level event, exact segment unknown |
| r04 | flood | Calmette – Bến Chương Dương (phía Võ Văn Kiệt) | 10,7648 | 106,6975 | 250 m | reviewed; strong historical area match |
| r05 | flood | Trần Hưng Đạo (khu vực Trần Đình Xu – Cống Quỳnh) | 10,7625 | 106,6890 | 300 m | reviewed; corrected from the spatially mismatched Nguyễn Cư Trinh label; source remains street/event-level only |
| r06 | construction | Lê Thánh Tôn (đoạn trước chợ Bến Thành) | 10,7730 | 106,6990 | 150 m | reviewed; historical 2024–2025 improvement works |
| r07 | construction | Hai Bà Trưng (đoạn Tân Định) | 10,7890 | 106,6905 | 200 m | reviewed; 2013 sinkhole/emergency barrier, not a sewer project |
| r08 | construction | Võ Thị Sáu (Quận 3) | 10,7860 | 106,6890 | 200 m | reviewed; 2021 water-infrastructure work, not road resurfacing |

Cả 8 record có URL trực tiếp; bảng nguồn, ngày đăng và giới hạn chi tiết nằm ở
`data/DATA.md` §2.1. Chúng chỉ là external context cho giả định thủ công. Report
không được gọi các risk flag này là verified/current incident-hazard data hoặc
nói nguồn xác nhận chính xác tâm, bán kính, severity hay penalty.

## 2.9. Distance, time, congestion, road type và risk không đồng nghĩa

- `length_m`: độ dài edge/corridor, đơn vị mét.
- `free_travel_time_s`: thời gian mô hình khi congestion level = 1; field JSON
  làm tròn chỉ để mô tả.
- `congestion_level`: ordinal multiplier 1–5 theo slot; không phải km/h và
  không phải xác suất.
- `highway`: normalized road class; dùng lúc build speed/fallback, không tự là
  search cost.
- `risk.*`: bốn binary flags; chỉ tác động `balanced`.
- `oneway`: direction metadata; topology mới là điều quyết định có đi được.

## 2.10. Phân bố traffic profile hiện hành

Fresh read-only audit trên JSON, tái xác nhận ngày 2026-08-07:

| Graph/slot | Min–max | Mean | L1 | L2 | L3 | L4 | L5 | Coverage | Missing/extra ID |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| G_demo 07:30 | 2–5 | 3,336 | 0 | 21 | 161 | 111 | 5 | 298/298 | 0/0 |
| G_demo 12:00 | 1–4 | 2,426 | 12 | 152 | 129 | 5 | 0 | 298/298 | 0/0 |
| G_demo 17:30 | 1–5 | 3,389 | 2 | 23 | 138 | 127 | 8 | 298/298 | 0/0 |
| G_demo 22:00 | 1–2 | 1,466 | 159 | 139 | 0 | 0 | 0 | 298/298 | 0/0 |
| G_real 07:30 | 1–5 | 2,980 | 110 | 1.551 | 1.740 | 921 | 377 | 4.699/4.699 | 0/0 |
| G_real 12:00 | 1–4 | 2,041 | 1.544 | 1.797 | 981 | 377 | 0 | 4.699/4.699 | 0/0 |
| G_real 17:30 | 1–5 | 3,029 | 130 | 1.353 | 1.858 | 969 | 389 | 4.699/4.699 | 0/0 |
| G_real 22:00 | 1–3 | 1,518 | 2.320 | 2.324 | 55 | 0 | 0 | 4.699/4.699 | 0/0 |

`L1`…`L5` là số edge ở từng congestion level. Coverage so với đúng directed
edge set của graph tương ứng; cả tám mapping không thiếu và không thừa edge ID.

G_real 22:00 có 55 edge level 3 dù pure fallback code chỉ sinh 1–2 ở slot
đêm. Raw reconciliation xác nhận các level này thuộc mixed build hiện hành;
external TomTom truth vẫn không được live re-query trong audit.

## 2.11. Data lineage end-to-end

```text
OSM endpoint
  → [01_download_osm.py] raw GraphML                  REAL RAW artifact (tracked)
  → [02_build_graph.py] graph_real.json               processed artifact
       ├─ speed table                                 CONFIG
       ├─ manual risk circles                         MANUAL
       └─ OSM-derived road/signal attributes          locally reconciled

TomTom Flow API
  → [03a_crawl_tomtom.py] 4 raw JSON snapshots        REAL RAW artifacts (tracked)
  → [03b_build_profiles.py]
       ├─ TomTom ratio-to-level                       REAL-DERIVED, locally reconciled
       └─ deterministic fallback seed 42              SEED/SIMULATED
  → traffic_profiles_real.json                        persisted runtime input

Manual POI catalog + G_real + profile_real
  → [04_build_gdemo.py]
       ├─ nearest-node snapping / corridor search
       ├─ aggregation / third-POI exclusion
       └─ connectivity repair
  → graph_demo.json + gdemo_corridors.json

graph_demo.json + gdemo_corridors.json + profile_real
  → [03b_build_profiles.py demo] corridor weighted mean
  → traffic_profiles_demo.json

committed graph/profile JSON
  → [GraphStore.load] validate + precompute weights
  → [search/search_advanced/tsp] route/ATSP result
  → [FastAPI] JSON response
  → [Next.js] visualization/explanation
```

Không có bước runtime nào tự crawl, rebuild hoặc cập nhật traffic.

## 2.12. Mock/fixture data không phải dataset runtime

`data/mock/graph_mock.json`, `traffic_profiles_mock.json`, `trace_mock.json`,
`trace_bidijkstra_mock.json` và `multiroute_mock.json` là
`SEED/SIMULATED` fixtures do `scripts/00_generate_mock.py` tạo với seed 42,
8 landmark/16 directed edge và fixed created/runtime values. Chúng phục vụ
schema tests và frontend development; product `GraphStore.load()` **không đọc**
chúng. `data/mock/scenario_cost_golden.json` là golden fixture dùng chung để
đối chiếu Python/TypeScript cost preview. Không file mock nào được mô tả là
G_demo/G_real hoặc real traffic evidence.

---

# 3. Cost Function và Weights

## 3.1. Final edge weights

Với edge `e`, congestion level `c(e,h)` tại slot `h`, speed `v(e)` và length
`l(e)`:

\[
t_{free}(e)=\frac{l(e)}{v(e)/3.6}
\]

\[
f_{cong}(e,h)=1+\gamma\frac{c(e,h)-1}{4},\qquad \gamma=1.5
\]

Vì `c ∈ {1,2,3,4,5}`, factor tương ứng là
`1, 1.375, 1.75, 2.125, 2.5`.

\[
P(e)=60r_{flood}+90r_{construction}+30r_{narrow}+25r_{light}
\]

Ba mode:

\[
w_{distance}(e)=l(e)\quad[metres]
\]

\[
w_{time}(e,h)=t_{free}(e)\,f_{cong}(e,h)\quad[seconds]
\]

\[
w_{balanced}(e,h)=t_{free}(e)\,f_{cong}(e,h)+P(e)\quad[seconds]
\]

Evidence: `backend/app/costs.py -> edge_cost_breakdown(), edge_weight()`.

Runtime tính `t_free` từ exact `length_m/free_speed_kmh`, không đọc
`free_travel_time_s` đã làm tròn. `GraphStore` precompute 3 mode × 4 slot cho
mọi edge lúc load store hoặc resolve request-scoped scenario.

## 3.2. Nguồn, mục đích và nơi dùng của mọi constant/weight

| Constant/weight | Giá trị | Đơn vị | Phân loại | Mục đích | Nơi dùng thật |
|---|---:|---|---|---|---|
| `GAMMA` | 1,5 | không đơn vị | `CONFIG` | Scale congestion level sang time multiplier | `costs.py`; product default, gamma override chỉ cho sensitivity benchmark |
| flood penalty | 60 | s/entry flag | `CONFIG` | Tránh route đi vào flood zone | Chỉ `balanced` |
| construction penalty | 90 | s/entry flag | `CONFIG` | Tránh route đi vào construction zone | Chỉ `balanced` |
| narrow-alley penalty | 30 | s/flag | `CONFIG` | Phản ánh bất tiện/hạn chế đường hẹp | Chỉ `balanced` |
| traffic-light penalty | 25 | s/flag | `CONFIG` | Delay fixed khi edge đi vào signal node | Chỉ `balanced` |
| free speed table | 25–60 | km/h | `CONFIG` | Chuyển length thành free-flow time | `time`, `balanced`, heuristic `v_max` |
| congestion level | 1–5 | ordinal | mixed persisted data | Time-of-day multiplier | `time`, `balanced` |
| A*/Greedy/IDA*/Beam heuristic | Haversine hoặc Haversine/`v_max` | m hoặc s | `RUNTIME-COMPUTED` | Hướng dẫn search | Bốn informed algorithms |
| IDA* epsilon default | 5 | m ở distance; s ở time/balanced | `CONFIG` | Minimum threshold increment/quality bound | `search_advanced.py`; request có thể override >0 finite |
| IDA* max rounds | 1.000 | rounds | `CONFIG` safety | Ngăn loop threshold vô hạn | Internal param/default; không phải edge cost |
| Beam width | demo 5, real 50 | states/layer | `CONFIG` | Trade-off breadth/quality | Beam; request có thể override integer ≥1 |
| IDDFS max depth | 100 | edges/depth | `CONFIG` safety | Giới hạn rounds | IDDFS internal param/default; không phải edge cost |
| Trace cap | 5.000 | trace steps | `CONFIG` payload | Giới hạn response/memory | Chỉ recorder; **không cắt search work/metrics** |
| TSP max points | 16 generic; API stops max 15 | points | `CONFIG` safety | Giới hạn request | NN/SA có thể tối đa 16 total; Held–Karp tối đa 15 total |
| Held–Karp warn | 13 | points | `CONFIG` operational | Cảnh báo độ phức tạp | CLI/function warning |
| SA seeds | 0,1,2,3,4 | seed | `CONFIG` reproducibility | Năm run độc lập | SA; trả best-of-five |
| SA iterations | 2.000 | iterations/seed | `CONFIG` | Search budget | SA |
| SA initial temperature | `max(0.2 × initial_cost, 1e-9)` | cùng đơn vị cost | `CONFIG` | Normalize acceptance scale | SA |
| SA cooling `alpha` | 0,995 | ratio/iteration | `CONFIG` | Geometric cooling | SA |
| Improvement tolerance | `1e-12` | cost units | `CONFIG` numeric | Chỉ nhận local improvement đủ nhỏ | NN + 2-opt/Or-opt |
| Benchmark sampling seed | 42 | seed | `CONFIG` reproducibility | Chọn OD/sample trong experiments | Chỉ `backend/app/benchmark.py`; không đổi product route weight |

Không có evidence trong repo chứng minh gamma 1,5, penalty 60/90/30/25,
epsilon hoặc beam width được learned/fitted từ ground-truth. Chúng phải được
trình bày là project configuration/modeling choices.

`scripts/05_calibrate_gamma.py` là bước phân tích tùy chọn để ước lượng
`gamma_hat` từ raw TomTom và so với `GAMMA_LOCKED=1.5`; nó không thay product
constant lúc runtime. Raw hiện có nhưng `results/` vẫn stale; task audit này
không rerun calibration/benchmark, nên không có current calibration result
report-safe.

## 3.3. Congestion thay đổi route theo time slot như thế nào

Trong `distance`, congestion và risk không đổi selected search weight, nên cùng
graph/scenario và tie order sẽ cho cùng distance-optimal result qua các slot.

Trong `time`, level cao làm tăng time theo factor ở mục 3.1. Edge level 5 có
congested time bằng 2,5 lần free-flow. Vì level là per-edge/per-slot, relative
edge costs thay đổi và shortest path có thể đổi.

Trong `balanced`, cùng hiệu ứng traffic cộng thêm fixed risk penalties. Vì
penalty không bị nhân congestion, công thức là `timed + penalty`, không phải
`(t_free + penalty) × factor`.

## 3.4. Metrics và đơn vị API

Cho path gồm các directed edge:

```text
total_cost       = tổng weight của mode được request
total_distance_m = tổng length_m
total_time_s     = tổng balanced weight, bất kể mode request
```

Do đó:

- `mode=distance`: `total_cost` là mét; `total_time_s` vẫn là giây balanced.
- `mode=time`: `total_cost` là giây congested time, không gồm risk;
  `total_time_s` là giây balanced và có thể lớn hơn.
- `mode=balanced`: `total_cost == total_time_s` về mặt công thức.
- UI/report không được gắn hậu tố giây cho `distance` cost hoặc IDA* epsilon
  ở distance mode.

Evidence: `backend/app/graph_store.py -> path_metrics()` và
`backend/app/explain.py -> mode_cost_unit()`.

## 3.5. Request-scoped scenario/config overrides

`ScenarioConfig` có thể chọn `graph_view` và override từng edge về
`length_m`, `free_speed_kmh`, congestion per slot và từng risk flag. Resolver:

1. clone graph/profile ở phạm vi request;
2. reject unknown edge;
3. reject overridden length dưới Haversine floor;
4. recompute display `free_travel_time_s`;
5. tạo `GraphStore` mới, nên toàn bộ weights và `v_max` được tính lại;
6. không mutate cache hoặc JSON trên đĩa.

Vì API resolve scenario trước khi gọi two-point search hoặc multiroute, override
hiệu lực lên cả Searching và ATSP trong request đó. Fingerprint
`scenario-v1:<sha256>` ghi effective values đã canonicalize; nó là provenance
của sandbox request, không phải dataset mới.

Evidence: `backend/app/scenario.py -> resolve_scenario(),
_store_with_overrides(), canonical_fingerprint()`; `backend/app/main.py`.

## 3.6. Heuristic thực sự dùng

Gọi `d_H(n,g)` là Haversine great-circle distance với bán kính cầu
`R=6.371.000 m`:

\[
h_{distance}(n)=d_H(n,g)
\]

\[
h_{time}(n)=h_{balanced}(n)=\frac{d_H(n,g)}{v_{max}}
\]

`v_max` là maximum `free_speed_kmh/3.6` **trong resolved store hiện tại**, không
phải constant 60 bất biến. Với current base snapshots, G_demo/G_real đều có
max persisted speed 45 km/h.

Heuristic không dùng road name, road type, congestion, risk, actual geometry
hay precomputed landmark distances; nó chỉ dùng node coordinates và `v_max`.

### Admissible và consistent: điều kiện code/data đang enforce

Chứng minh dựa trên bốn facts:

1. Haversine thỏa triangle inequality.
2. Mỗi edge có `length_m >= Haversine(u,v)`; pipeline round length lên 0,1 m,
   validator kiểm mọi edge, scenario override cũng enforce floor.
3. `free_speed(e) <= v_max`.
4. Congestion factor `>=1` và mọi risk penalty `>=0`.

Suy ra ở distance:

\[
h(u)\le length(e)+h(v)=w_{distance}(e)+h(v)
\]

Ở time/balanced:

\[
\frac{d_H(u,g)}{v_{max}}
\le \frac{length(e)}{v_{max}}+h(v)
\le t_{free}(e)+h(v)
\le w(e)+h(v)
\]

Do đó heuristic consistent, kéo theo admissible, **nếu các invariants nói trên
được giữ**. Current code có tests/validator cho các điều kiện này. Guarantee của
A*/IDA* không phải đặc tính tự động của mọi JSON tùy ý; nếu người dùng bypass
Pydantic/validator hoặc sửa artifact trái invariant thì chứng minh không còn đủ.

Evidence: `backend/app/costs.py`, `graph_store.py`,
`scripts/validate_data.py -> check_edge_sanity()`,
`backend/tests/test_costs.py -> test_heuristic_consistent_on_every_edge`,
`docs/HEURISTIC-PROOF.md`.

## 3.7. Từng Searching algorithm thực sự dùng data/weight nào

| Algorithm | Chọn node/path dựa trên | Edge weight dùng trong search | Heuristic/data thêm | Thứ bị bỏ qua khi search | Guarantee trên resolved graph |
|---|---|---|---|---|---|
| BFS | FIFO, số directed edge ít nhất | **Không** | `adj`, stable edge-ID order | length, speed, congestion, risk, coordinates | Không tối ưu selected weighted cost |
| DFS | LIFO, depth-first | **Không** | `adj`, stable order | Toàn bộ weights và heuristic | Không |
| IDDFS | Depth-limited DFS, depth 0..100 default | **Không** | `adj`, depth | Toàn bộ weights và heuristic | Không; safety depth có thể dừng trước nghiệm sâu hơn |
| UCS | Min accumulated `g` | Selected `distance`/`time`/`balanced` weight | Non-negative edge cost, stable heap tie | Node coordinates/heuristic | Exact optimal selected cost |
| A* | Min `f=g+h` | Selected weight trong `g` | Node lat/lon, resolved `v_max` trong `h` | Names/types/road geometry | Exact nếu heuristic invariants giữ |
| Greedy Best-First | Min `h` **chỉ** | **Không dùng để xếp frontier** | Node lat/lon, resolved `v_max`; mode quyết định unit h | length/congestion/risk khi chọn path | Không |
| Bidirectional Dijkstra | Min forward/backward `g`; stop `top_f+top_b>=mu` | Selected weight | `adj` từ start, `radj` từ goal | Heuristic/coordinates | Exact với non-negative weights |
| IDA* | DFS dưới threshold `f=g+h`; tăng threshold | Selected weight trong `g` | Haversine h; epsilon 5 mode-unit default | Names/types/geometry | Found result trong `C* + epsilon` theo implementation/proof; cap exhaustion không claim guarantee |
| Beam Search | Mỗi layer giữ top `k` theo `g+h` | Selected weight trong `g` | Haversine h; k=5 demo/50 real default | Nodes bị prune; names/types/geometry | Không, và có thể `found=false` |

Nuance bắt buộc:

- BFS/DFS/IDDFS/Greedy vẫn gọi `path_metrics()` **sau khi có path**, nên response
  báo cost/distance/time theo selected mode/slot. Việc báo metric không có nghĩa
  search đã dùng weight đó để chọn path.
- Với Greedy, `h_time` và `h_balanced` giống nhau; traffic/risk không ảnh hưởng
  frontier ordering. `h_distance` chỉ khác bằng constant scale `v_max`, nên
  stable ranking về cơ bản cũng không đổi.
- Mọi thuật toán chỉ đi directed adjacency. Bidirectional search phải dùng
  reverse adjacency cho nửa backward; nó không giả graph vô hướng.
- Tất cả chín thuật toán trả cùng `Trace` schema. Trace cap 5.000 chỉ ngừng ghi
  steps; full search, `nodes_expanded`, result và cost tiếp tục được tính.

## 3.8. Non-negative weights và reproducibility

Schema yêu cầu length/speed dương, congestion 1–5 và risk flags 0/1; gamma và
penalties không âm. Vì vậy cả ba mode có strictly positive edge weights. Đây là
điều kiện cho UCS/Bidirectional Dijkstra và UCS dùng xây matrix.

`GraphStore.adj` theo thứ tự edge ID; heap chứa insertion counter làm tie-break.
BFS/DFS cũng bảo toàn neighbor order. SA có fixed seeds 0–4. Vì vậy kết quả được
thiết kế tái lập trên cùng snapshot/scenario/runtime logic.

## 3.9. Cost matrix cho multi-location/ATSP

Cho ordered point set:

\[
P=[start, stop_1,\ldots,stop_k]
\]

`backend/app/tsp.py -> build_matrix()` chạy hand-written UCS một lần từ
mỗi source point tới mọi target point, trên **cùng directed adjacency và
selected mode/slot/scenario weights**. Với mọi ordered pair `a != b`:

\[
C[a,b] = \min_{path:a\leadsto b}\sum_{e\in path}w_{mode,slot}(e)
\]

Node path đạt minimum cũng được cache để tạo từng leg response. Matrix là
asymmetric: `C[a,b]` không được giả bằng `C[b,a]`, vì direction, one-way,
topology và directed corridor có thể khác.

Không thuật toán ATSP nào tối ưu trực tiếp Euclidean/Haversine distance giữa
POI. Nó tối ưu tổng các **shortest-path matrix entries** theo requested mode:

- `distance`: tổng mét.
- `time`: tổng giây congested, không risk penalty.
- `balanced`: tổng giây congested + risk penalties.

## 3.10. Held–Karp, NN/2-opt/Or-opt và SA tối ưu gì

Tour objective cho order `p0=start,p1,...,pk`:

\[
J=\sum_{i=0}^{k-1}C[p_i,p_{i+1}]
+\mathbf{1}_{return\_to\_start}C[p_k,p_0]
\]

`return_to_start=false` mặc định nên đây là fixed-start **open ATSP path**;
`true` thêm leg về start thành cycle. Start luôn cố định ở index 0.

| Method | Cách làm thật | Objective/guarantee |
|---|---|---|
| Held–Karp | Bitmask DP `O(n²2ⁿ)`, xét directed matrix entries; ≤15 total points | Minimum exact `J` cho fixed start và open/closed setting |
| NN + 2-opt/Or-opt | Nearest neighbor chọn next có `C[current,next]` nhỏ nhất; sau đó reverse segment và relocate segment dài 1–3 | Local improvement của cùng `J`; không guarantee global optimum |
| Simulated Annealing | Khởi tạo NN; swap hoặc remove/reinsert stop; Metropolis acceptance; 2.000 iter × seeds 0–4; trả per-seed best tốt nhất | Stochastic heuristic cho cùng `J`; seeded/reproducible nhưng không guarantee optimum |

2-opt kiểu đối xứng thường chỉ xét vài changed arcs là không an toàn cho ATSP.
Implementation này re-cost **toàn bộ candidate order** sau mọi 2-opt/Or-opt/SA
move nên giữ đúng asymmetry.

Response `totals.total_cost` chính là objective của order được trả; từng leg và
`total_distance_m`/`total_time_s` được tính lại qua cached road path. Field
`savings_pct` so order tối ưu/heuristic với original input order theo
`total_cost`, không phải mặc định theo distance.

Evidence: `backend/app/tsp.py -> _ucs_to_targets(), build_matrix(),
tour_cost(), held_karp(), nearest_neighbour(), two_opt_or_opt(),
simulated_annealing(), solve_multiroute()`; `backend/tests/test_tsp.py`.

---

# 4. Assumptions

## 4.1. Assumptions hợp lý và được implementation hóa rõ

1. **Phạm vi địa lý hữu hạn:** bài toán chỉ xét road network trong BBOX trung
   tâm TP.HCM `[106.680,10.760,106.720,10.800]`, không đại diện toàn thành phố.
2. **Mạng xe cơ giới:** input OSM dự kiến dùng `network_type="drive"`.
3. **Strong connectivity ưu tiên khả năng benchmark:** chỉ largest directed SCC
   được giữ; nhờ đó current snapshots/teaching views được thiết kế để mọi node
   đi tới mọi node, nhưng các thành phần đường rời bị loại.
4. **State là node:** không có heading, previous edge hoặc turn-state. Chuyển
   trạng thái phụ thuộc duy nhất directed edge hiện có.
5. **Edge-local, additive, static-per-request cost:** tổng route là tổng edge
   costs. Slot/profile/scenario không đổi giữa chừng trong một request.
6. **Node không có weight:** mọi route preference được encode trên edge hoặc
   request config.
7. **Direction/asymmetry:** reverse leg phải được tính độc lập. Multiroute dùng
   ordered-pair matrix.
8. **Physical lower bound:** stored/overridden edge length không nhỏ hơn
   Haversine endpoint distance; điều này phục vụ heuristic proof.
9. **Determinism:** topology/edge IDs có stable ordering; synthetic traffic seed
   42; SA seeds 0–4.
10. **Shipper route convention:** start cố định, stops khác nhau, open tour mặc
    định; chỉ quay về kho khi `return_to_start=true`.

## 4.2. Modeling assumptions chưa được chứng minh bằng real measurements

1. **Free-flow speed:** bảng 25–60 km/h theo road class là assumed speed, không
   phải speed limit hoặc measured speed của từng edge.
2. **Linear congestion multiplier:** five-level ordinal scale và gamma 1,5 được
   coi đủ để xấp xỉ traffic travel time.
3. **Fixed risk delay:** 60/90/30/25 giây được coi là proxy hợp lý cho flood,
   construction, narrow alley và traffic light; chưa có calibration evidence.
4. **Risk circles:** 5 vùng ngập và 3 vùng thi công do nhóm đặt thủ công; entry
   rule được dùng để tránh tính penalty nhiều lần trong vùng.
5. **Narrow alley:** road class proxy hoặc >30% corridor length thay cho đo bề
   rộng thực tế.
6. **Traffic signal:** mọi edge kết thúc ở OSM signal node nhận cùng 25 giây,
   bất kể chu kỳ đèn, hướng rẽ hay thời điểm.
7. **TomTom spatial assignment:** source-node distance ≤250 m trên main road là
   proxy đủ tốt cho edge coverage; không có segment/geometry map matching.
8. **Uncovered traffic:** deterministic seeded ranges theo road class/time là
   proxy cho edge không có sample.
9. **Four representative slots:** persisted traffic được coi đại diện cho
   07:30/12:00/17:30/22:00; không nội suy giữa slot và không thay đổi theo ngày.
10. **POI coordinates:** catalog manual/approximate là đủ cho teaching;
    navigation node thực tế là G_real node đã snap. Candidate thứ hai trong
    120 m được chấp nhận để tránh hai POI trùng node.
11. **G_demo contraction:** shortest free-flow corridor giữa nearby POI đủ đại
    diện. Corridor đi qua POI thứ ba bị loại; repair tối đa 20 vòng thêm/thay
    edge để giữ SCC và all-pairs distortion bounds.
12. **Dominant corridor attributes:** một tên đường/highway và aggregated flags
    đủ để mô tả demo edge dù corridor có nhiều real edge khác loại.

## 4.3. Simplification assumptions có mất thông tin

- Raw OSM `MultiDiGraph` có thể có parallel edges; product JSON chỉ giữ một
  edge cho mỗi ordered `(u,v)`, chọn edge có configured free-flow time thấp
  nhất. Lane/parallel-way alternatives không còn để thuật toán lựa chọn.
- `oneway` được suy ra từ reverse-pair existence sau preprocessing, không phải
  raw OSM tag audit trail.
- Raw OSM node/way IDs, full tags, polyline geometry, lanes, access, surface,
  maxspeed, toll và turn restrictions không có trong public schema.
- Frontend tạo `LineLayer` từ tọa độ source/target; path cũng là chuỗi node
  coordinates. Vì không có edge geometry, đường hiển thị là đoạn thẳng giữa
  endpoint, không phải road centerline thật.
- `free_travel_time_s` persist làm tròn chỉ phục vụ schema/display; runtime
  dùng exact ratio.

## 4.4. Snapshot assumption cần diễn đạt đặc biệt thận trọng

Raw files xác nhận bốn TomTom sample được query lúc 07:40:03 và 12:49:57 ngày
2026-07-27, 17:30:01 và 22:27:52 ngày 2026-08-03 — hai ngày thứ Hai cách nhau
bảy ngày, không phải same-day time series. Vì thế:

- timestamps và record payload là fresh-verifiable trong current workspace;
- bốn điểm thời gian vẫn chỉ là representative snapshots, không chứng minh
  daily/weekly generalization;
- slot label là time bucket, không cam kết query đúng chính xác 07:30/12:00.

Evidence hiện hành: bốn tracked file dưới `data/raw/tomtom/`, đối chiếu với
`data/DATA.md`, `hdcrawl.md` và `scripts/validate_data.py`. Audit không live
re-query TomTom.

---

# 5. Limitations and Future Work

## 5.1. Dataset/provenance limitations

1. **OSM external provenance chưa khép kín hoàn toàn:** raw GraphML và OSMnx
   cache hiện có, locally reproduce được G_real, nhưng chưa có manifest riêng
   ghi endpoint/source URL, license, tool environment và hash trong final ZIP;
   audit không gọi lại OSM.
2. **TomTom chỉ là bốn sampled snapshots:** raw files hiện có và locally
   reproduce được 635/4.699 assignment mỗi slot, nhưng audit không gọi lại API
   để independently xác thực external response; đây không phải real-time feed.
3. **Mixed provenance không granular:** profile chỉ có một `meta.source` cho
   toàn file; không lưu per-edge/per-slot cờ `tomtom` vs `synthetic`, sample ID,
   distance-to-sample hoặc confidence.
4. **Traffic sampling thưa:** thiết kế chỉ tối đa khoảng 40 source-node sample
   mỗi slot trên 4.699 real edges; phần không phủ là synthetic.
5. **Bốn snapshots không phải time series:** lịch sử còn cho biết hai slot đầu
   và hai slot sau lấy ở hai ngày khác nhau. Không đo variability theo ngày,
   thời tiết, sự kiện hoặc mùa.
6. **Manual risk chỉ có provenance định tính:** tám `source_url` đã được review,
   nhưng chỉ ghi nhận sự kiện lịch sử ở cấp tuyến/khu vực; schema vẫn không có
   validity interval, severity, confidence hay authoritative verification cho
   circle/penalty. `r02`, `r03`, `r05`, `r07` còn giới hạn không gian/ngữ nghĩa.
7. **POI manual:** tọa độ/loại không có geocoder/source manifest trong schema;
   snapped node có thể lệch entrance thực tế.

## 5.2. Graph/model limitations

1. **Giới hạn spatial coverage:** BBOX trung tâm nhỏ và largest SCC loại phần
   disconnected; không đại diện mạng giao thông toàn HCMC.
2. **Parallel edge bị collapse:** mất lựa chọn song song và raw route identity.
3. **Không có turn restrictions/turn costs:** route có thể là chuỗi edge hợp lệ
   trong node graph nhưng không phản ánh cấm rẽ, U-turn, phase đèn hoặc delay tại
   intersection.
4. **Thiếu vehicle/access detail:** không model lane, tải trọng, chiều cao,
   surface, toll, delivery access hoặc time-dependent closures.
5. **Không có geometry thật:** map nối thẳng endpoint; không thể hiện curve,
   bridge alignment hay exact matched TomTom segment. `length_m` có thể dài hơn
   line hiển thị nhưng UI không giải thích hình học đó.
6. **G_demo là abstraction:** demo edge là corridor, không đồng nhất với một
   road segment; structural `oneway` của demo không nhất thiết là biển một chiều
   ngoài thực địa.
7. **Static edge-additive cost:** không có queue spillback, congestion thay đổi
   theo departure time, turn interaction hoặc route-dependent travel time.
8. **Risk là fixed binary entry penalty:** không model severity, affected
   length, probability, direction-specific evidence hoặc starting-inside charge.

## 5.3. Cost/algorithm/benchmark limitations

1. Speed, gamma và penalties là config chưa calibrated với observed end-to-end
   travel times; `balanced` là preference score có đơn vị giây, không phải ETA
   đã được validated.
2. Greedy/BFS/DFS/IDDFS có thể trả route rất kém theo requested cost vì không
   dùng weights trong selection. Beam có thể fail do pruning; NN/SA chỉ heuristic.
3. IDDFS depth 100 và IDA* 1.000-round safety cap là operational limits;
   guarantee chỉ được claim theo trạng thái kết thúc/code metrics tương ứng.
4. TSP matrix giả mỗi leg có cùng slot/cost snapshot, không cập nhật time slot
   theo thời gian shipper đã di chuyển.
5. ATSP hiện không model demand, vehicle capacity, delivery time windows,
   service time, multiple depots hoặc multiple shippers; chưa phải VRP đầy đủ.
6. `results/` cũ hơn graph/profile refresh hiện tại và được đánh dấu `SỐ TẠM`;
   không được dùng để báo current benchmark, gamma calibration hoặc performance.
7. Trace cap bảo vệ payload nhưng không tự bảo vệ runtime worst-case của các
   thuật toán exponential; full work vẫn chạy sau khi trace bị cap.

## 5.4. API/data-quality limitations

- Pydantic kiểm shape/local invariants; validator kiểm SCC, coverage, physical
  floor và demo ratios. Các kiểm tra này không chứng minh external provenance.
- Source-honesty validator hiện pass vì đủ bốn raw snapshots hợp lệ và profile
  mixed locally reconcile được. Gate này vẫn không chứng minh external truth.
- Không có schema field cho raw-source hash, acquisition timestamp per profile
  record, OSM way/node ID, TomTom segment ID hoặc confidence.
- Base backend không gọi network, nhưng basemap online của frontend là một concern
  hiển thị riêng; offline mode bỏ basemap và chỉ vẽ graph artifact.

## 5.5. Future work phù hợp với implementation hiện tại

1. **Khép kín provenance package:** giữ raw OSM GraphML và đủ raw TomTom
   snapshots hiện đã được Git track trong final Data ZIP; thêm manifest
   SHA-256, source URL/API endpoint, query timestamp/timezone, bbox,
   tool/version, parameters và license note.
2. **Per-edge lineage:** lưu `traffic_source`, sample/segment ID,
   match distance, confidence và fallback rule cho mỗi edge/slot; không dùng một
   `meta.source` coarse cho toàn file.
3. **Traffic tốt hơn:** crawl cùng ngày và nhiều ngày/tuần, lấy nhiều điểm hơn,
   hỗ trợ real-time/periodic refresh, uncertainty và departure-time-dependent
   edge cost.
4. **Map matching đúng segment:** giữ TomTom/OSM segment geometry/identifier;
   match theo polyline, bearing, road class/name thay vì chỉ source-node radius.
5. **Road geometry:** persist encoded polyline/GeoJSON geometry cho edge và vẽ
   route theo centerline thật; giữ raw OSM IDs để audit.
6. **Richer directed model:** giữ parallel edges hoặc explicit edge key; thêm
   turn restrictions, turn penalties, access rules, closures và signal timing.
7. **Calibrate cost:** dùng observed travel times/incidents để estimate free
   speed, gamma và penalties; báo error/confidence thay vì gọi balanced cost ETA.
8. **Risk provenance:** nâng từ một URL lịch sử/record thành source manifest có
   ngày sự kiện, validity interval và confidence; dùng nguồn active/authoritative
   khi có, model polygon/severity/time dependence và phân biệt observation với
   assumption.
9. **POI QA:** geocode/source entrance coordinates, lưu snap distance và manual
   review evidence; hỗ trợ delivery entrance thay vì POI centroid.
10. **Routing scope:** mở rộng bbox/coverage; thêm nhiều shipper, capacity,
    service time, time windows, multiple depot và giải VRP/VRPTW.
11. **Coherent final refresh:** chỉ khi được phê duyệt, chạy toàn chuỗi raw →
    profiles → G_demo → validator → gamma/benchmark → generated teaching docs;
    đồng bộ mọi banner `SỐ TẠM` và không trộn artifacts khác thế hệ.

---

# 6. Report-safe conclusion

## 6.1. Có thể khẳng định chắc chắn trong report

- Runtime hiện dùng hai committed directed snapshots: G_demo 51 node/298 edge
  và G_real 2.118 node/4.699 edge; topology, direction và current attributes có
  thể kiểm trực tiếp trong `data/graph_*.json` và `GraphStore.load()`.
- Cả hai public graph snapshots là simple directed graph ở schema level: không
  self-loop/duplicate ordered pair; G_real build code nhận MultiDiGraph nhưng
  collapse parallel edge. `oneway` là structural reverse-pair property.
- Node không có weight. Search weights nằm trên edge và được tính runtime từ
  length, configured speed, slot congestion và optional risk penalties.
- Công thức/đơn vị chính xác là mục 3.1; gamma 1,5 và penalties
  60/90/30/25 giây là config trong `backend/app/costs.py`.
- BFS/DFS/IDDFS bỏ qua weights khi chọn path; Greedy dùng heuristic-only; bảng
  mục 3.7 là mapping implementation của cả chín thuật toán.
- Cost matrix multi-stop chứa shortest selected-cost cho mọi ordered pair; ba
  ATSP methods tối ưu cùng asymmetric objective ở mục 3.10.
- Backend routing không crawl network; nó đọc JSON snapshot. Scenario override
  chỉ tạo store request-scoped và không sửa base files.
- G_demo có 51 POI với distribution 40 landmark, 7 school, 3 hospital,
  1 warehouse; G_real hiện toàn node `intersection`.

## 6.2. Phải diễn đạt thận trọng

- Nói G_real là **OSM-derived/processed theo pipeline code**; raw GraphML hiện
  có và local transform khớp current graph. Kèm caveat audit không gọi lại OSM
  để xác minh external snapshot.
- Nói current profile là **persisted `tomtom+synthetic` mixed artifact theo
  metadata** và runtime dùng level đó; bốn raw snapshot hiện có và locally
  reproduce phần assignment/fallback, nhưng không phải live external audit.
- Nếu nhắc ngày crawl hai thứ Hai 2026-07-27/2026-08-03, phải gọi đó là
  recorded history và representative snapshots, không phải same-day series.
- Gọi `free_speed_kmh`, gamma/risk penalty và synthetic traffic là modeling
  assumptions/config, không phải ground-truth measurements.
- Gọi risk flags manual/rule-derived; tám URL chỉ hỗ trợ bối cảnh lịch sử ở cấp
  tuyến/khu vực, không xác nhận circle hoặc tình trạng hiện tại.
- Nói heuristic admissible/consistent **dưới các invariants được code/validator
  enforce**, không nói đúng cho graph tùy ý.

## 6.3. Không được tuyên bố khi chưa bổ sung bằng chứng

- “Traffic là real-time”, “mọi edge dùng TomTom”, “traffic 100% real/verified”.
- “Bốn snapshot là cùng-day time series”, “traffic là live/real-time”, hoặc
  “raw response đã được TomTom xác thực độc lập trong audit hiện tại”.
- “G_real là raw OSM”, “OSM geometry/way IDs được giữ”, hoặc mọi `oneway` là
  direct OSM tag.
- “Speed là tốc độ thực/giới hạn pháp lý”, “balanced time là ETA calibrated”.
- “Flood/construction/narrow/signal risk đã được authoritative verified”.
- “Map line là geometry đường thật”.
- “G_demo edge tương ứng đúng một road segment thực”.
- “Current benchmark chứng minh thuật toán X nhanh/tốt hơn” dựa trên `results/`
  stale hoặc số `SỐ TẠM`.
- “NN/2-opt/SA tối ưu toàn cục”; chỉ Held–Karp có exact guarantee trong giới hạn.

## 6.4. Câu kết luận report-safe đề xuất

> Nhóm mô hình hóa mạng đường thành graph có hướng với chi phí nằm trên cạnh,
> không nằm trên node. Hai snapshot phục vụ hai mục tiêu: G_demo là abstraction
> 51 POI cho giảng dạy/visualization, G_real là processed intersection graph
> 2.118 node cho scale testing. Runtime tính ba loại chi phí từ length, tốc độ
> free-flow cấu hình, congestion profile theo bốn slot và risk penalties; dữ
> liệu traffic không phủ được dùng deterministic fallback seed 42. Artifact
> hiện hành tự mô tả là `tomtom+synthetic`; current Git/workspace có raw OSM và
> đủ bốn raw TomTom snapshot để tái đối chiếu local pipeline, nhưng lượt audit
> không gọi lại nguồn ngoài nên không coi đó là real-time/external ground truth
> đã xác thực độc lập. Mọi kết quả route/ATSP dùng committed directed JSON và
> asymmetric shortest-path costs, không gọi mạng khi chạy demo.

---

# Phụ lục A. Audit register lịch sử của Markdown cũ

Phần register bên dưới được giữ theo audit gốc tạo ở commit `3f6df7c`, khi
workspace của tác giả chưa nhận raw artifacts và audit không sửa các Markdown
khác. Vì vậy các câu “raw vắng”, validator fail và `UNVERIFIED` trong bảng là
**historical findings đúng tại mốc đó**, không phải đánh giá current HEAD.

Current reconciliation tại HEAD `5693ae7`:

- commit `faf9866` đã bỏ ignore `data/raw/` và track sáu raw/provenance files;
- raw/profile reconciliation và source-honesty validator hiện pass;
- các current-state Markdown đã được đồng bộ trong worktree audit hiện tại;
- `results/` vẫn stale/`SỐ TẠM`; tám manual risk URL đã được review/tích hợp
  nhưng chỉ có giá trị định tính lịch sử; external OSM/TomTom truth không được
  live re-query.

Trong bảng lịch sử, `Đúng có điều kiện` nghĩa là phần contract/toán còn hữu ích
nhưng status/số liệu phải kiểm lại; `Lịch sử` nghĩa là file không được dùng làm
current evidence.

| Markdown | Đánh giá tại audit gốc 2026-08-06 | Chỗ lệch/cũ/thiếu được ghi nhận lúc đó |
|---|---|---|
| `AGENTS.md` | Đúng phần lớn về invariants; có status không còn kiểm chứng | Counts/formulas/warnings đúng. Khẳng định raw TomTom 4/4 “exist” lệch workspace hiện tại; raw không có. |
| `CLAUDE.md` | Legacy guidance, mixed | Counts đúng; raw 4/4, `ALL DATA VALID`, test/TypeScript status là lịch sử và không đúng fresh gate hiện tại. |
| `PLAN.md` | Plan/implementation history | Fixed GraphView `full/7/15/25`, frontend 19 tests, `ALL DATA VALID`, raw 4/4 và 635 TomTom edges là stale/không fresh-verifiable. Runtime đã là `teach_3..teach_50`, preset v2. |
| `PROMPT-MASTER.md` | Original spec + một số current notes | Cost constants/core pipeline đúng. “Gán cùng trục”, “kế thừa oneway/highway thật” là mô tả thiết kế mạnh hơn implementation: TomTom match chỉ source-node radius/main-class; demo edge là aggregated corridor và structural direction. |
| `README.md` | Mixed overview/status | Counts/offline snapshot concept đúng. Fixed four GraphViews, raw 4/4, `148 passed`, `ALL DATA VALID` không phản ánh current implementation/workspace. |
| `data/DATA.md` | Chi tiết pipeline gần code nhất nhưng provenance status stale | Speed/fallback/risk/corridor rules chủ yếu đúng. Raw 4/4, timestamps và exactly 635 TomTom-covered edges không xác minh được khi raw vắng; không thể gọi topology “OSM 2026-07-27” là fresh-verified. |
| `docs/AUDIT-CLAUDE-PRE-SUBMISSION.md` | Rõ ràng là historical snapshot | 51/292, 82/111 tests và audit findings là thế hệ cũ; header đã cảnh báo không dùng làm current proof. |
| `docs/CODEX-BASELINE.md` | Historical baseline | G_demo 51/292/56, traffic-light 131, raw 2 snapshots và validator results thuộc baseline trước refresh; không phải current data. |
| `docs/CODEX-CODEBASE-MAP.md` | Code map hữu ích; status data một phần stale | Current graph/risk counts đúng. Raw 4/4, 635/4.699 và `ALL DATA VALID` không fresh-verifiable; theme/current gate claims cũng là snapshot cũ. |
| `docs/DESIGN.md` | UI intent, không phải data source | GraphView chỉ `full/7/15/25` lệch dynamic `teach_3..teach_50`; preset/UI contract đã đổi. `19 test`, TypeScript pass và dark-default là status/intent cũ so với current code/session. |
| `docs/GIAI-THICH-THUAT-TOAN.md` | Generated teaching artifact, numerical section stale | Tự ghi `SỐ TẠM`, profile synthetic/raw 2/4. Không dùng bảng số để mô tả current mixed profile hoặc current results; muốn đổi phải chạy generator theo dependency chain được duyệt. |
| `docs/HEURISTIC-PROOF.md` | Đúng có điều kiện | Chứng minh phù hợp `costs.py` và current invariants. Phải giữ caveat length floor, non-negative cost và resolved `v_max`; không tự chứng minh external data provenance. |
| `docs/KE-HOACH-TRIEN-KHAI-NHIEM-VU-HOP-NHOM.md` | Implementation plan/history | Raw 4/4, gates, fixed GraphView enum và direct OSM semantics cho `oneway` đã stale/overstated. Counts 51/298 và 2.118/4.699 còn đúng. |
| `docs/KIEMTOAN.md` | Audit ledger nhiều thế hệ | Chứa 51/253, 51/292, raw 2/4 và nhiều mốc tests khác nhau; header đã nói phần lớn là lịch sử. Không dùng một dòng rời làm current fact. |
| `docs/Lab1-ChotPhuongAn.md` | Settled choices, mixed status | Hybrid approach/cost/two-graph choices và current counts đúng. Raw TomTom 4/4 là recorded decision/status, không được current workspace chứng minh. |
| `docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md` | Conceptual algorithm guide, phần core phù hợp | Cost units, informed algorithms và ATSP concepts chủ yếu đúng; chính file cảnh báo results stale. Không phải evidence dataset/provenance hay benchmark. |
| `docs/SCHEMA.md` | Intended contract §A–§D phần lớn khớp; có executable mismatch | Node/edge/profile/cost/trace core đúng. `GraphView` fixed four values và preset JSON version 1 lệch `models.py` regex `teach_3..teach_50`, `scenario.py`/config version 2 và frontend slider 3..51. Đây là contract mismatch phải sửa riêng sau, không được audit này âm thầm chọn Markdown. |
| `docs/TIENDO.md` | History ledger | Cố ý giữ 50/138, 51/141, 51/253, 51/292 cùng các phase/test counts; không phải current behavior. |
| `hdcrawl.md` | Operational closeout/history | Khẳng định raw 4/4, timestamps, 635 coverage và `ALL DATA VALID`; các raw artifacts không có trong current workspace nên những câu này hiện unverified. |
| `report/BaoCao-Khung.md` | Report scaffold với `SỐ TẠM` | Current graph/risk counts và cost outline khá đúng. Raw 4/4/635 coverage và fixed GraphViews cần thay bằng wording mục 6; benchmark vẫn tạm. |
| `report/Slide-Outline.md` | Slide scaffold với `SỐ TẠM` | Raw 4/4 và 635 TomTom edges unverified; benchmark/figures chưa current. |
| `report/Video-KichBan.md` | Video scaffold với `SỐ TẠM` | Raw 4/4 unverified; còn câu coi `teach_7` là tương lai dù đã có và runtime đã hỗ trợ dynamic views. |
| `report_algorithm.md` | ATSP explanation gần current code; verification footer stale | Matrix/objectives/solvers đúng. “176 passed”, `ALL DATA VALID` và TypeScript passed không đúng fresh current evidence: full backend gần nhất có 174 pass/2 source-honesty fail; raw vắng làm validator fail. |
| `results/README.md` | Đúng và an toàn | Đã cảnh báo toàn bộ results là `SỐ TẠM`, cũ hơn graph/profile. Phần kể raw TomTom 4/4 vẫn chỉ là recorded history, nhưng file không cho phép dùng results làm current benchmark. |

## A.1. Disposition hiện hành cho các mismatch của audit gốc

Các mục gốc được xử lý như sau:

1. **Raw provenance — resolved locally:** đủ GraphML/cache/bốn TomTom snapshot
   hiện được Git track. External authenticity/live freshness vẫn chỉ
   `PARTIALLY VERIFIED`; final Data ZIP chưa được đóng gói.
2. **Coverage 635/4.699 — resolved locally:** fresh reconciliation xác nhận
   đúng 635 TomTom-assigned và 4.064 fallback edge ở từng G_real slot.
3. **`ALL DATA VALID` — resolved cho current artifacts:** validator hiện pass;
   đây là structural/lineage gate cục bộ, không phải external truth proof.
4. **GraphView — resolved trong current Markdown worktree:** executable hỗ trợ
   mọi `teach_3..teach_50`, `full` ở 51 và preset version 2; các current-state
   docs đã được đồng bộ, còn historical logs giữ nguyên mốc cũ.
5. **One-way/provenance:** không nói `oneway` public là raw OSM tag; G_real suy
   từ reverse-pair, G_demo suy từ abstract adjacency/corridor availability.
6. **TomTom matching:** không nói match “cùng tên/cùng trục/cùng road class”;
   code chỉ yêu cầu main-edge và nearest sample trong 250 m tính từ source node.
7. **Benchmark/test status — chỉ giải quyết một phần:** fresh tests/validator/
   TypeScript gate được báo theo command hiện hành, nhưng `results/` chưa được
   rerun và phải tiếp tục mang banner `SỐ TẠM`.

---

# Phụ lục B. Evidence map cho kết luận quan trọng

| Kết luận | Evidence ưu tiên |
|---|---|
| Executable node/edge/graph/profile/request/response schema | `backend/app/models.py` |
| Current counts/attributes/POI/profile levels | `data/graph_demo.json`, `graph_real.json`, `traffic_profiles_demo.json`, `traffic_profiles_real.json` |
| Runtime load/adjacency/reverse adjacency/weights/metrics/heuristic | `backend/app/graph_store.py` |
| Cost formulas/constants/Haversine | `backend/app/costs.py` |
| BFS/DFS/IDDFS/UCS/A* usage | `backend/app/search.py` |
| Greedy/Bidijkstra/IDA*/Beam usage/config | `backend/app/search_advanced.py` |
| Scenario, dynamic GraphView, override semantics | `backend/app/scenario.py`, `data/teaching_graph_presets.json` |
| REST default/dispatch | `backend/app/main.py` |
| OSM download/SCC | `scripts/01_download_osm.py` |
| MultiDiGraph normalization/dedup/oneway/risk build | `scripts/02_build_graph.py` |
| TomTom raw fields/sample strategy | `scripts/03a_crawl_tomtom.py` |
| Ratio mapping/spatial assignment/fallback | `scripts/03b_build_profiles.py`, `scripts/pipeline_common.py` |
| POI list/snapping/corridor/repair/profile aggregation | `data/gdemo_pois.json`, `scripts/04_build_gdemo.py`, `scripts/pipeline_common.py`, `data/gdemo_corridors.json` |
| SCC/profile coverage/length floor/demo invariants/source honesty | `scripts/validate_data.py` |
| Searching properties vs baselines | `backend/tests/test_costs.py`, `test_search.py`, `test_search_advanced.py` |
| ATSP matrix/objectives/solvers | `backend/app/tsp.py`, `backend/tests/test_tsp.py`, `test_optimization_trace.py` |
| Map draws endpoint-to-endpoint lines, no stored geometry | `frontend/components/map-view.tsx`, graph JSON schema |
| Manual risk records/provenance and caveats | `data/manual_risks.json`, `data/DATA.md` §2.1, `manual_risks_sources_review.md`, `scripts/pipeline_common.py` |
| Stale benchmark warning | `results/README.md` and dates in `results/` versus graph/profile metadata |

## B.1. Canonical maintenance rule

Nếu implementation/data thay đổi, update tài liệu này trong cùng dependency
chain và ghi rõ evidence mới. Không copy status từ ledger. Với public contract,
phải giải quyết mismatch trong `docs/SCHEMA.md` trước khi đổi code theo workflow
của repository. Với generated teaching numbers, chỉ regenerate qua
`scripts/gen_teaching_doc.py`. Với data/profile/benchmark, chỉ rebuild khi đã
được phê duyệt toàn chuỗi; không trộn artifact của các mốc khác nhau.
