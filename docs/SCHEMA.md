# SCHEMA.md — Các hợp đồng dữ liệu và API

> **Trạng thái kiểm lại 2026-08-11:** §A–§F là contract hiện hành. GraphView,
> scenario edge-override request-scoped, `AppliedScenario`/fingerprint, ATSP
> optimization trace và toàn bộ contract additive UI & Explanation v2 tại §F đã
> được triển khai trong model, producer, API, frontend guards/consumers và tests.
> `/api/route` hiện phát `contract_version=2`; từng variant bắt buộc phải có đủ
> termination/decision/explanation evidence theo §F, không còn trạng thái rollout
> v1→v2. Biên bản QA cuối còn giữ tại
> `docs/UI-V2-PHASE8-READINESS.md`; bản đồ triển khai tổng hợp nằm trong
> `docs/CODEX-CODEBASE-MAP.md`.
> Dữ liệu benchmark trong `results/` đã được tái sinh chính thức ngày 2026-08-11
> từ contract này; provenance/checksum nằm tại `results/README.md`. Việc refresh
> artifact không đổi API contract. UI chỉ đổi mét/giây sang km/phút ở tầng presentation theo
> `docs/DESIGN.md` §12; API/store vẫn dùng đơn vị raw đã khóa tại §B–§D.
> **Thay đổi được nhóm duyệt 2026-08-08:** loại lựa chọn route `dijkstra` độc lập
> vì implementation một-cặp trùng với UCS. Contract còn 9 thuật toán route;
> `bidijkstra` vẫn được giữ vì là tìm kiếm hai chiều trên graph có hướng.
>
> **Quy tắc vàng của nhóm:** không ai code trước khi 3 hợp đồng này được duyệt.
> Sau khi duyệt, **mọi** thay đổi schema phải cập nhật file này và báo rõ trong tóm tắt phase (PROMPT-MASTER luật 2).
>
> Hiện thân executable của §A–§F là `backend/app/models.py` (Pydantic v2) — test
> `backend/tests/test_schema.py` bảo đảm mock data khớp schema. Nếu §A–§F và
> `models.py` lệch nhau → phải truy về requirement và đồng bộ, không tự chọn một
> phía. Vì producer đã phát `contract_version=2`, models/code/tests phải khớp toàn
> bộ variant §F; payload nửa v1/nửa v2 là contract error.

**Phạm vi:** §A định dạng dữ liệu đồ thị + hồ sơ ùn tắc · §B cấu trúc `trace` mọi thuật toán trả về · §C REST API · §D công thức cost & heuristic (tham chiếu chung cho §B, §C) · §E GraphView/scenario/optimization trace · §F contract hiện hành của UI & Explanation v2.

**Các enum dùng chung toàn dự án:**

| Enum | Giá trị hợp lệ |
|---|---|
| `algorithm` | `bfs` · `dfs` · `iddfs` · `ucs` · `astar` · `greedy` · `bidijkstra` · `idastar` · `beam` (9 giá trị) |
| `mode` | `distance` · `time` · `balanced` (mặc định `balanced`) |
| `time_slot` | `07:30` · `12:00` · `17:30` · `22:00` |
| `graph` | `demo` · `real` |
| `graph_view` | `full` hoặc `teach_N` với số nguyên `N ∈ [3,50]` |
| `tsp_method` | `held_karp` · `nn_2opt` · `sa` |
| `scenario_provenance` | `base` · `graph_view` · `sandbox_override` |
| `node.type` | `landmark` · `intersection` · `warehouse` · `hospital` · `school` |

---

## §A. `graph.json` + `traffic_profiles.json`

Một định dạng duy nhất dùng chung cho `data/graph_demo.json` (G_demo) và `data/graph_real.json` (G_real). Mock 8 node ở `data/mock/graph_mock.json` cũng đúng định dạng này.

### A.1 Cấu trúc tổng thể

```jsonc
{
  "meta": {
    "name": "G_demo",                    // "G_demo" | "G_real" | "G_mock"
    "bbox": [106.680, 10.760, 106.720, 10.800],  // [left, bottom, right, top] = [lon_min, lat_min, lon_max, lat_max]
    "directed": true,                    // luôn true
    "created": "2026-08-03",             // ISO date, ngày build G_demo hiện hành
    "crs": "EPSG:4326",                  // cố định
    "node_count": 51,                    // PHẢI khớp len(nodes)
    "edge_count": 298                    // PHẢI khớp len(edges)
  },
  "nodes": [ /* A.2 */ ],
  "edges": [ /* A.3 */ ]
}
```

### A.2 Node

```jsonc
{
  "id": "n0001",              // ^n\d{4}$ — ổn định giữa các lần build (đánh số sau khi sort theo osmid)
  "name": "Chợ Bến Thành",    // string | null (G_real: đa số null; G_demo: luôn có tên thật)
  "lat": 10.7725,             // WGS84, phải nằm trong bbox của meta
  "lon": 106.6980,
  "type": "landmark"          // enum node.type
}
```

### A.3 Edge

```jsonc
{
  "id": "e00001",             // ^e\d{5}$ — ổn định giữa các lần build
  "u": "n0001",               // node đi — phải tồn tại trong nodes
  "v": "n0002",               // node đến — phải tồn tại, v ≠ u
  "name": "Lê Lợi",           // string | null
  "length_m": 420.5,          // > 0, mét, làm tròn 0.1 m
  "highway": "primary",       // tag OSM: trunk|primary|secondary|tertiary|residential|alley|service|... (giữ nguyên giá trị OSM)
  "oneway": true,             // true = đường một chiều (chỉ tồn tại cạnh u→v)
                              // false = đường hai chiều (BẮT BUỘC tồn tại cạnh ngược v→u, cũng oneway=false)
  "free_speed_kmh": 35,       // do nhóm đặt theo highway type (bảng trong DATA.md, Phase 1) — KHÔNG phải tốc độ pháp lý
  "free_travel_time_s": 43.3, // = length_m / (free_speed_kmh / 3.6), làm tròn 0.1 s
  "risk": {                   // các cờ 0/1
    "flood": 0,               // điểm ngập (nguồn: data/manual_risks.json, có source_url)
    "construction": 0,        // lô cốt / công trình
    "narrow_alley": 0,        // hẻm nhỏ (suy từ highway type theo luật trong DATA.md)
    "traffic_light": 1        // cạnh KẾT THÚC tại node có đèn tín hiệu (OSM highway=traffic_signals)
  }
}
```

**Ràng buộc toàn cục của graph.json:**

1. Đồ thị **có hướng**. Đường hai chiều sinh **2 cạnh ngược nhau** (id khác nhau, cùng `oneway=false`).
2. Không có 2 cạnh trùng cặp `(u, v)` — giữa một cặp node theo một chiều chỉ có tối đa 1 cạnh (khi OSM có nhiều đường song song, pipeline giữ cạnh có `free_travel_time_s` nhỏ nhất).
3. Không self-loop (`u ≠ v`).
4. Đồ thị **liên thông mạnh** (pipeline lấy thành phần liên thông mạnh lớn nhất).
5. `free_travel_time_s` phải khớp công thức từ `length_m` và `free_speed_kmh` (dung sai ±0.06 s do làm tròn 0.1).
6. Mọi node nằm trong `meta.bbox`; `node_count`/`edge_count` khớp số phần tử thật.
7. `id` ổn định giữa các lần build: sort node theo `osmid` tăng dần rồi đánh số `n0001…`; edge sort theo `(u, v)` rồi đánh số `e00001…`.

### A.4 `traffic_profiles.json`

```jsonc
{
  "meta": { "graph": "G_demo", "created": "2026-08-03", "source": "tomtom+synthetic" },  // source: "tomtom+synthetic" | "synthetic"
  "profiles": {
    "07:30": { "e00001": 4, "e00002": 3 /* … MỌI edge id của graph tương ứng */ },
    "12:00": { /* … */ },
    "17:30": { /* … */ },
    "22:00": { /* … */ }
  }
}
```

**Ràng buộc:** đủ đúng 4 khung giờ; mỗi khung giờ phủ **100% edge id** của graph đi kèm (không thiếu, không thừa id lạ); giá trị congestion là **số nguyên 1–5** (1 = thông thoáng, 5 = kẹt cứng).

**File trên đĩa (chốt Phase 1):** mỗi graph có file profiles **riêng** vì không
gian edge id của G_demo và G_real trùng nhau (`e00001` tồn tại ở cả hai):
`data/traffic_profiles_real.json` và `data/traffic_profiles_demo.json`
(mock: `data/mock/traffic_profiles_mock.json`). Tên `traffic_profiles.json`
trong heading chỉ contract logic dùng chung, không phải tên artifact trên đĩa.

---

## §B. `trace` — cấu trúc trả về CHUNG của mọi thuật toán tìm đường

**Quy tắc vàng (PROMPT-MASTER luật 3):** cả 9 thuật toán trả về đúng một cấu trúc này, không ngoại lệ. Hàm ký danh chuẩn (Phase 2):

```
run(graph_store, start, goal, mode, time_slot, include_trace, **params) -> Trace
```

### B.1 Cấu trúc đầy đủ

```jsonc
{
  "algorithm": "astar",           // enum algorithm (9 giá trị)
  "mode": "balanced",             // enum mode
  "time_slot": "07:30",           // enum time_slot
  "graph": "demo",                // enum graph
  "found": true,                  // false nếu không tìm được đường; cũng có thể false khi thuật toán có cap (Beam/IDDFS/IDA*) dừng trước khi chứng minh
  "path": ["n0001", "n0014", "n0027"],  // dãy node id liên tiếp có cạnh nối; [] nếu found=false; [start] nếu start==goal
  "metrics": { /* B.2 */ },
  "trace": [ /* B.3 — [] nếu include_trace=false */ ],
  "explanation": { /* B.4 */ },
  "applied_scenario": { /* §E.3 — API endpoint mới luôn non-null */ }
}
```

### B.2 `metrics`

```jsonc
{
  "total_cost": 812.4,            // tổng weight theo mode đang chạy — GIÂY với time/balanced, MÉT với distance; null nếu found=false
  "total_distance_m": 3120.0,     // luôn tính (tổng length_m dọc path); null nếu found=false
  "total_time_s": 812.4,          // luôn tính (tổng t_free·f_cong + penalty dọc path, tức weight balanced) — để mọi mode so sánh được với nhau; null nếu found=false
  "nodes_expanded": 143,          // số lần pop-và-expand thật sự (IDDFS/IDA*: cộng dồn qua mọi vòng lặp)
  "max_frontier": 38,             // kích thước frontier/open lớn nhất; Beam đo selected beam (≤ beam_width), không đo raw candidate pool
  "runtime_ms": 4.2,              // thời gian chạy thuật toán (không tính build explanation)
  "optimal_guarantee": true,      // bảo đảm áp dụng cho kết quả/termination hiện tại theo bảng B.5
  "epsilon_bound": 5.0,           // CHỈ idastar; các thuật toán khác: null/vắng mặt
  "beam_width": 5,                // CHỈ beam; các thuật toán khác: null/vắng mặt
  "trace_truncated": false        // true nếu trace bị cắt tại 5 000 bước (B.3)
}
```

### B.3 `trace[]` — từng bước expand (nuôi animation + bảng g/h/f trên GUI + ví dụ tính tay)

```jsonc
{
  "step": 1,                      // 1-based, tăng liên tục
  "expanded": "n0001",            // node vừa được lấy ra expand ở bước này
  "frontier": ["n0002", "n0005"], // toàn bộ frontier/open list NGAY SAU khi expand xong bước này
  "g": {"n0002": 43.3, "n0005": 61.0},   // map node→giá trị cho các node trong frontier — hoặc null (bảng dưới)
  "h": {"n0002": 120.5, "n0005": 98.2},  // null nếu thuật toán không dùng h
  "f": {"n0002": 163.8, "n0005": 159.2}, // null nếu thuật toán không dùng f
  "depth_limit": 3,               // CHỈ iddfs (giới hạn độ sâu của vòng hiện tại); thuật toán khác: null/vắng mặt
  "side": "forward"               // CHỈ bidijkstra (phía vừa expand ở bước này: "forward" | "backward"); thuật toán khác: null/vắng mặt
}
```

**Trường `side` (bidijkstra):** bắt buộc mỗi bước với `bidijkstra`, cấm với mọi thuật toán khác — để GUI tô 2 màu 2 phía khi demo bidirectional. `frontier` là **hợp** của 2 frontier; node nằm trong cả 2 frontier thì map `g` hiển thị **giá trị nhỏ hơn** của 2 phía.

**Bảng quy định g/h/f theo thuật toán** (`✓` = bắt buộc có, `–` = null):

| algorithm | g | h | f | Ghi chú |
|---|---|---|---|---|
| bfs, dfs | – | – | – | |
| iddfs | – | – | – | có thêm `depth_limit` mỗi bước |
| ucs | ✓ | – | – | g = chi phí tích luỹ theo `weight(mode)` |
| bidijkstra | ✓ | – | – | bắt buộc `side` mỗi bước; frontier = hợp 2 phía; node ở cả 2 frontier → `g` = min 2 phía |
| greedy | – | ✓ | – | g vẫn được tính nội bộ để ra metrics, nhưng không xuất trong trace |
| astar, idastar | ✓ | ✓ | ✓ | f = g + h; A* tie-break theo h nhỏ hơn |
| beam | ✓ | ✓ | ✓ | frontier = top-k ứng viên của beam lớp kế tiếp đã chọn sau bước expand (≤ k); không chứa raw pool chưa cắt |

**Chống phình payload:** server cắt `trace` tại **5 000 bước** và đặt `metrics.trace_truncated = true` (metrics vẫn tính trên toàn bộ quá trình chạy, chỉ danh sách bước bị cắt). Cờ `include_trace` trong request: mặc định `true` với `graph=demo`, `false` với `graph=real`; khi `false` → `trace: []`.

**Ngoại lệ biểu diễn của Beam theo lớp:** các node cùng lớp đang lần lượt được
expand không được trộn với raw candidate pool trong `frontier`. Sau mỗi bước,
trace chỉ hiển thị top-k ứng viên lớp kế tiếp đã được chọn ở thời điểm đó; nhờ
vậy `frontier` và `max_frontier` cùng tuân thủ giới hạn `beam_width`.

### B.4 `explanation`

Do `explain.py` điền ở Phase 4. **Phase 2–3 trả đúng shape rỗng:** `{"summary_vi": "", "congested_segments": [], "alternatives": []}`.

```jsonc
{
  "summary_vi": "Tuyến Bến Thành → Hồ Con Rùa → … được chọn vì tổng chi phí thấp nhất (812 s ≈ 13,5 phút; 3,1 km). …",
  "congested_segments": [         // các cạnh TRÊN PATH có congestion ≥ 4 tại time_slot đang chạy
    { "edge": "e00007", "name": "Nguyễn Thị Minh Khai", "level": 4 }
  ],
  "alternatives": [               // ≥1 tuyến thay thế để so sánh (cùng OD: mode=distance, tuyến greedy, …)
    { "label": "Ngắn nhất theo km", "path": ["n0001", "…"],
      "total_distance_m": 2800.0, "total_time_s": 990.0,
      "why_not_vi": "Ngắn hơn 320 m nhưng chi phí cân bằng cao hơn 178 s quy đổi trong hồ sơ 07:30." }
  ]
}
```

`alternatives` và `why_not_vi` là tên field legacy. Các path trong danh sách
này do hệ thống chạy UCS **sau** route chính để đối chiếu; chúng không
nhất thiết là full route mà thuật toán chính đã xét hoặc loại. Producer/UI
v1 phải dùng copy trung tính “tuyến tham chiếu được tính thêm sau khi
chạy”. `Alternative.total_time_s` giữ đúng semantics §B.2 là balanced path
weight, không phải thời gian thuần/ETA. Trước khi `ReferenceRoute.metrics`
của §F.3 được triển khai, prose legacy chỉ được nói relation theo
objective nếu backend tính relation từ `total_cost` của đúng `mode`.

Mọi mức ùn tắc trong explanation là từ **hồ sơ khung giờ đại diện**
theo `time_slot`, không phải dữ liệu giao thông trực tiếp. Copy không
dùng “lúc 07:30” theo cách khiến người đọc hiểu đó là hiện trạng live.

### B.5 `optimal_guarantee` chuẩn theo thuật toán và termination

| algorithm | optimal_guarantee | Lý do ngắn |
|---|---|---|
| bfs | `false` | chỉ tối ưu khi cạnh đồng trọng số — đồ thị này không đồng |
| dfs, iddfs | `false` | không theo chi phí |
| ucs, bidijkstra | `true` | chứng minh chuẩn với weight ≥ 0 |
| astar | `true` | heuristic admissible + consistent (docs/HEURISTIC-PROOF.md) |
| idastar | `true` khi tìm được nghiệm trong biên ε hoặc đã duyệt cạn và chứng minh không tới được; `false` nếu dừng do chạm safety cap `max_rounds` | ε tính theo **đơn vị chi phí của mode đang chạy**: giây với time/balanced, mét với distance; cap không tạo ra chứng minh |
| greedy, beam | `false` | greedy theo h / cắt frontier, không complete (beam) |

---

## §C. REST API (FastAPI, port 8000, prefix `/api`)

CORS mở cho `http://localhost:3000`. Mọi response lỗi dùng **error model thống nhất §C.7**.

### C.1 `GET /api/health`

Response `200`:
```jsonc
{ "status": "ok", "versions": { "python": "3.14.0", "app": "0.1.0" } }
```

### C.2 `GET /api/graph?level=demo|real&view=...`

`level` mặc định `demo`; `view` mặc định `full`. Response đích là `GraphResponse`
§E.1: base graph ở `full`, hoặc induced view thật ở `teach_*`. `level`/`view` lạ →
422; `G_real` với `teach_*` → 422 `GRAPH_VIEW_UNAVAILABLE`.

### C.3 `GET /api/traffic?slot=07:30&level=demo&view=full`

Response `200`: map congestion của khung giờ đó, đúng graph đó:
```jsonc
{ "slot": "07:30", "graph": "demo", "congestion": { "e00001": 4, "e00002": 3 } }
```
`slot` ngoài 4 mốc → 422. Response đích thêm `graph_view` echo và `congestion`
chỉ chứa edge thuộc resolved view (§E.1).

### C.4 `POST /api/route` — tìm đường 2 điểm

Request:
```jsonc
{
  "start": "n0001",               // bắt buộc, node id tồn tại
  "goal": "n0027",                // bắt buộc, node id tồn tại
  "algorithm": "astar",           // enum algorithm
  "mode": "balanced",             // mặc định "balanced"
  "time_slot": "07:30",           // bắt buộc
  "graph": "demo",                // mặc định "demo"
  "include_trace": null,          // null → theo mặc định (demo:true, real:false)
  "scenario": null,               // null/vắng mặt/{} → full graph, không override (§E.2)
  "params": {                     // tuỳ chọn theo thuật toán, bỏ qua nếu không liên quan
    "beam_width": 5,              // beam; mặc định 5 (demo) / 50 (real)
    "epsilon": 5.0                // idastar; số hữu hạn > 0, mặc định 5.0 theo ĐƠN VỊ của mode (giây với time/balanced, mét với distance) — đổi phải hỏi (PROMPT-MASTER luật 4)
  }
}
```

Response `200`: **một object `trace`** (§B.1). Lỗi: `start`/`goal` không tồn tại → 404 (`NODE_NOT_FOUND`); enum sai / thiếu trường → 422.
Lưu ý: `found=false` vẫn là **200** với trace hợp lệ (`path: []`) — không phải lỗi HTTP.

### C.5 `POST /api/multiroute` — tối ưu thứ tự đa điểm (ATSP)

Request:
```jsonc
{
  "start": "n0001",
  "stops": ["n0014", "n0027", "n0033"],   // 1–15 điểm, khác nhau, khác start
  "method": "nn_2opt",                    // enum tsp_method
  "mode": "balanced",
  "time_slot": "07:30",
  "graph": "demo",
  "return_to_start": false,       // mặc định false — shipper kết thúc tại điểm giao cuối
  "scenario": null,               // null/vắng mặt/{} → full graph, không override (§E.2)
  "include_trace": false          // optimization trace ATSP riêng, không phải route Trace (§E.4)
}
```

**Giới hạn kích thước (chốt mâu thuẫn n≤15 vs k≤16):** tổng số điểm `k = 1 + len(stops)` ≤ **16**. Riêng `method=held_karp` yêu cầu `k ≤ 15` (từ 13 trở lên server ghi cảnh báo vào log); `k = 16` với `held_karp` → 422 `HELD_KARP_LIMIT` gợi ý dùng `nn_2opt`/`sa`.

Response `200` (base fields bên dưới, cộng `applied_scenario`,
`optimization_trace`, `optimizer_stats` theo §E.3–§E.4):
```jsonc
{
  "method": "nn_2opt", "mode": "balanced", "time_slot": "07:30", "graph": "demo",
  "found": true,                          // false nếu có cặp điểm không tới được nhau → order/legs rỗng, totals null
  "order": ["n0001", "n0027", "n0014", "n0033"],  // thứ tự thăm tối ưu, PHẦN TỬ ĐẦU luôn là start
  "legs": [                               // k−1 leg (hoặc k nếu return_to_start) — trace RÚT GỌN, không có trace[] và explanation
    { "from_node": "n0001", "to_node": "n0027",
      "path": ["n0001", "n0005", "n0027"],
      "metrics": { "total_cost": 412.0, "total_distance_m": 1650.0, "total_time_s": 412.0 } }
  ],
  "totals":                { "total_cost": 1830.5, "total_distance_m": 7420.0, "total_time_s": 1830.5 },
  "original_order_totals": { "total_cost": 2860.2, "total_distance_m": 11020.0, "total_time_s": 2860.2 },  // đi theo đúng thứ tự nhập
  "savings_pct": 36.0,                    // (original.total_cost − totals.total_cost) / original.total_cost × 100, làm tròn 0.1
  "optimal_guarantee": false              // held_karp: true; nn_2opt/sa: false
}
```

Ghi chú thi công (Phase 3): ma trận chi phí bất đối xứng, dựng bằng tìm kiếm chi phí đồng nhất (UCS) từ từng điểm theo `(mode, time_slot)`; path từng leg được cache để trả về. `sa` chạy 5 seed 0–4, trả nghiệm tốt nhất (best/mean/std đưa vào benchmark, không vào response này).

### C.6 `POST /api/benchmark`

Request: `{ "experiment_id": 3 }` (1–7) hoặc `{}` = trả kết quả cached của **toàn bộ** thí nghiệm từ `results/`.

Response `200`:
```jsonc
{
  "experiments": [
    { "experiment_id": 3,
      "csv_path": "results/exp3_benchmark.csv",
      "fig_paths": ["results/figs/exp3_expanded_bar.png", "results/figs/exp3_runtime_bar.png", "results/figs/exp3_gap.png"],
      "rows": [ { /* CSV/JSON artifact thành JSON: mỗi row một object */ } ] }
  ]
}
```
Với `experiment_id` cụ thể, artifact thiếu → 404 `RESULTS_NOT_FOUND`. Với request `{}`,
server trả các artifact đang có và bỏ qua experiment còn thiếu; chỉ trả 404 khi không
có artifact nào. Artifact `.csv` được parse theo header; artifact `.json` (hiện là
experiment 6) phải là một list các object. JSON sai shape là lỗi server 500
`INTERNAL`, không được trả success với `rows=[]`. *(Shape field bên trong từng row
theo artifact của thí nghiệm; nếu cần thêm contract chặt hơn sẽ cập nhật SCHEMA.md
và báo.)*

### C.7 Error model thống nhất

```jsonc
{ "error": { "code": "NODE_NOT_FOUND", "message_vi": "Không tìm thấy node 'n9999' trong đồ thị demo." } }
```

| HTTP | code | Khi nào |
|---|---|---|
| 404 | `NODE_NOT_FOUND` | start/goal/stops chứa id không tồn tại trong graph đã chọn |
| 404 | `EDGE_NOT_FOUND` | edge override không thuộc graph view đã resolve |
| 404 | `RESULTS_NOT_FOUND` | benchmark chưa chạy |
| 422 | `VALIDATION_ERROR` | enum sai, thiếu trường, stops rỗng/trùng, quá 15 stops (message_vi nêu trường sai) |
| 422 | `HELD_KARP_LIMIT` | held_karp với k = 16 |
| 422 | `GRAPH_VIEW_UNAVAILABLE` | yêu cầu `teach_*` trên G_real |
| 422 | `INVALID_EDGE_OVERRIDE` | finite/range/physical/cross-field validation của scenario không đạt |
| 500 | `GRAPH_VIEW_UNAVAILABLE` | preset tracked missing/corrupt; client chỉ nhận message chung |
| 500 | `INTERNAL` | lỗi không lường trước (log server, message chung chung) |

---

## §D. Hàm chi phí & heuristic (tham chiếu — đặc tả gốc: PROMPT-MASTER §4)

**Đơn vị chi phí duy nhất: GIÂY** (mode `distance` là ngoại lệ có chủ đích, đơn vị mét).

```
t_free(e)   = length_m / (free_speed_kmh / 3.6)                    # giây
f_cong(e,h) = 1 + γ · (congestion(e,h) − 1) / 4                    # γ = 1.5; congestion ∈ [1..5] theo time_slot h
penalty(e)  = 60·flood + 90·construction + 30·narrow_alley + 25·traffic_light   # giây

weight(e,h,mode):
  distance → length_m                       # mét
  time     → t_free · f_cong                # giây
  balanced → t_free · f_cong + penalty      # giây (MẶC ĐỊNH)
```

Heuristic (astar, greedy, idastar):

```
distance      → h(n) = haversine(n, goal)            # mét
time|balanced → h(n) = haversine(n, goal) / v_max    # giây; v_max = max free_speed toàn đồ thị, đổi ra m/s
```

Tính chất admissible + consistent: chứng minh tại `docs/HEURISTIC-PROOF.md` (Phase 2) + kiểm chứng thực nghiệm (thí nghiệm 2). Hằng số γ, penalty, ε=5 theo đơn vị chi phí của mode (mét với `distance`, giây với `time`/`balanced`): **đổi phải hỏi** (PROMPT-MASTER luật 4).

---

## §E. Mở rộng đã duyệt 2026-08-04 — GraphView, scenario và ATSP trace

Phần này **mở rộng theo kiểu additive** §A–§D. Khi một mô tả cũ ở
§C.2–§C.5 thiếu field mới, §E được ưu tiên. Không thay đổi format của `graph_demo.json`,
`graph_real.json` hay profile đã persist trên đĩa.

### E.1. GraphView và graph response dẫn xuất

```text
GraphView = "full" | "teach_N", N là số nguyên từ 3 đến 50
```

- `view` vắng mặt luôn là `full`.
- G_demo đủ 51 node được biểu diễn bằng `full`, không có `teach_51`. Frontend
  cho nhập số node 3…51 và ánh xạ 51 về `full`.
- `G_real` chỉ hỗ trợ `full`; mọi `teach_*` trên `graph=real` là lỗi 422.
- `full` dùng nguyên base snapshot. `teach_*` là **induced directed subgraph**
  của `G_demo`: giữ node thuộc preset và chỉ giữ edge có cả `u`, `v` thuộc preset.
  Không được dựng một graph mới bằng shortcut, lọc frontend, hoặc đổi hướng edge.
- Mọi endpoint graph/traffic/route/compare/multiroute phải resolve **cùng một
  view**. Node/edge ngoài view được xử lý như không tồn tại đối với request đó.
  `path`, `order` và `leg.path` không được chứa node ẩn.
- Profile của view là map bốn slot đã lọc theo đúng induced edge ID. Không tính lại
  congestion và không thay đổi raw profile/base cache.

Preset là config tracked, versioned ở `data/teaching_graph_presets.json`, không
phải dữ liệu persist thêm vào `graph_*.json`:

```jsonc
{
  "version": 2,
  "base_graph": "G_demo",
  "base_created": "2026-08-03",
  "node_order": ["n0018", "n0019", "...", "n0051"],
  "views": {
    "teach_7":  { "node_ids": ["..."], "expected_edge_count": 24 },
    "teach_15": { "node_ids": ["..."], "expected_edge_count": 62 },
    "teach_25": { "node_ids": ["..."], "expected_edge_count": 114 }
  }
}
```

`node_order` chứa đúng 51 node base, mỗi node đúng một lần. `teach_N` lấy đúng
prefix `N` phần tử của thứ tự này; runtime kiểm mọi prefix 3…51 đều strongly
connected, nhưng chỉ materialize `teach_3`…`teach_50` vì 51 là `full`. Object
`views` chỉ giữ ba checkpoint compatibility 7/15/25 và edge count kỳ vọng.

Danh sách node của ba checkpoint hiện hành:

```text
teach_7  = n0018 n0019 n0020 n0022 n0028 n0037 n0038
teach_15 = n0005 n0018 n0019 n0020 n0021 n0022 n0023 n0025
           n0028 n0029 n0030 n0036 n0037 n0038 n0040
teach_25 = n0002 n0004 n0005 n0007 n0016 n0017 n0018 n0019
           n0020 n0021 n0022 n0023 n0025 n0026 n0028 n0029
           n0030 n0035 n0036 n0037 n0038 n0039 n0040 n0044 n0045
```

| view | node | induced directed edge | liên thông mạnh |
|---|---:|---:|---|
| `teach_7` | 7 | 24 | có |
| `teach_15` | 15 | 62 | có |
| `teach_25` | 25 | 114 | có |
| `full` (G_demo) | 51 | 298 | có |

Mọi prefix tạo quan hệ nested; cụ thể `teach_7 ⊂ teach_15 ⊂ teach_25 ⊂ full`.
Loader/validator phải kiểm version 2, base graph/name/created, `node_order` đủ
51 node không trùng/lạ, ba checkpoint khớp prefix và expected edge count, mọi
prefix 3…51 có induced edge đúng và SCC bằng duyệt xuôi/ngược, và bảy node
`teach_7` khớp source của teaching generator.

`GET /api/graph` trả `GraphResponse`, tức mọi field của `GraphFile` cộng:

```jsonc
{
  "view_meta": {
    "base_graph": "demo",       // demo | real
    "graph_view": "teach_7",    // GraphView đã resolve
    "base_node_count": 51
  }
}
```

`meta.node_count`, `meta.edge_count` và `meta.bbox` phản ánh graph view thật;
`created`, `directed`, `crs` kế thừa base snapshot. Với `full`, `meta.name` giữ
tên base (`G_demo`/`G_real`); với teach view, nó là `${base_name}:${graph_view}`
(ví dụ `G_demo:teach_7`) để payload tự mô tả đúng. `view_meta` là **response-only**:
không được thêm vào graph JSON trên đĩa.

`GET /api/traffic` nhận `view` cùng default `full` và response thêm:

```jsonc
{ "slot": "07:30", "graph": "demo", "graph_view": "teach_7", "congestion": { "e00001": 4 } }
```

`graph_view` là echo bắt buộc do server resolve; default trong model chỉ để fixture
và direct call cũ tương thích. Frontend phải từ chối response thiếu echo hoặc echo
khác config đã gửi, không silently render `full` thay cho một teach view.

### E.2. ScenarioConfig và edge override request-scoped

Scenario là phần request **tùy chọn**, không phải session, database, localStorage
hay mutation của data source. `scenario` vắng mặt, `null`, hoặc `{}` cùng nghĩa:
`graph_view="full"`, không có override. Current client không gửi `scenario` vẫn
nhận đúng hành vi base; rollout phải backend trước frontend, rollback frontend
trước backend.

```jsonc
{
  "graph_view": "teach_7",       // optional, default "full"
  "edge_overrides": [
    {
      "edge_id": "e00001",
      "length_m": 421.0,
      "free_speed_kmh": 30.0,
      "congestion": { "07:30": 5, "17:30": 4 },
      "risk": { "construction": 1 }
    }
  ]
}
```

`RiskOverride` có các key tùy chọn `flood`, `construction`, `narrow_alley`,
`traffic_light`; giá trị là **JSON integer** `0` hoặc `1`, không nhận JSON boolean.
Object `risk` phải có ít nhất một key. `EdgeOverride` có `edge_id` và ít nhất một
trong `length_m`, `free_speed_kmh`, `congestion`, `risk`; object congestion nếu có
phải có ít nhất một slot hợp lệ.

| Field | Contract validation |
|---|---|
| `edge_id` | `^e\d{5}$`, unique trong toàn `edge_overrides`, thuộc resolved view |
| `length_m` | finite JSON number, `> 0`, và `>= ceil_dm(haversine(u,v))` |
| `free_speed_kmh` | finite JSON number trong `[1, 200]` |
| `congestion[slot]` | JSON integer 1–5, boolean không hợp lệ; slot không gửi giữ profile hiện hành |
| `risk[key]` | JSON integer 0 hoặc 1, boolean không hợp lệ; key không gửi giữ risk hiện hành |

Không có cap số override độc lập: vì `edge_id` phải unique và thuộc view, giới hạn
tự nhiên là số edge unique của selected view. Nhờ vậy request không thể override
edge ẩn/lặp chỉ để vượt một quota hình thức.

Không có `weight`, `free_travel_time_s`, `v_max`, penalty hoặc bất kỳ field derived
nào từ client. Server tính lại `free_travel_time_s = round(length_m / (speed/3.6),
1)` chỉ để giữ GraphFile hợp lệ; weight product luôn tính từ `length_m`/speed/profile
effective. Sau mỗi scenario, `v_max` dùng heuristic phải là max speed của **toàn
selected scenario graph**. Không clamp im lặng NaN/Infinity, range hay physical
floor: input sai trả lỗi.

Resolver thực hiện theo thứ tự: resolve view → kiểm edge membership/physical
constraint → clone model/profile private cho request → apply field partial →
recompute derived values/weights/`v_max`. `GraphStore.load()` base cache, graph/profile
base và mọi JSON trên đĩa phải bất biến. View base immutable có thể cache theo
level/view/base version; store có override **không** được cache toàn cục.

Một override có raw field nhưng mọi giá trị trùng effective base được chấp nhận rồi
canonicalize thành no-op: các field/edge đó bị bỏ. Scenario cuối không còn effective
override có semantics base/view, không phải `sandbox_override`.

### E.3. AppliedScenario và fingerprint canonical

Mỗi response API route/multiroute mới phải echo `AppliedScenario` không null.
`Trace.applied_scenario` là nullable chỉ để direct algorithm call/fixture cũ còn
hợp lệ; `MultirouteResponse.applied_scenario` cũng additive/nullable vì lý do đó.

```jsonc
{
  "graph_view": "teach_7",
  "override_count": 1,
  "provenance": "sandbox_override",
  "fingerprint": "scenario-v1:0123456789abcdef...64 lowercase hex chars"
}
```

`provenance` là `base` khi full + zero effective override, `graph_view` khi teach
view + zero effective override, và `sandbox_override` khi còn ít nhất một effective
edge override. `override_count` là số edge còn effective sau canonicalization, không
phải số raw object user đã gửi.

Server là authority duy nhất tạo fingerprint. Input trước SHA-256 là JSON canonical
UTF-8 theo shape sau (ví dụ minh họa):

```jsonc
{
  "version": "scenario-v1",
  "graph_level": "demo",
  "base_graph": { "name": "G_demo", "created": "2026-08-03" },
  "profile": { "created": "2026-08-03", "source": "tomtom+synthetic" },
  "graph_view": "teach_7",
  "edge_overrides": []
}
```

Rules canonicalization:

1. Hash validated/effective values, không hash raw request.
2. Bỏ no-op field và no-op edge; sort edge override theo `edge_id`.
3. Slot theo thứ tự `07:30`, `12:00`, `17:30`, `22:00`; risk key theo
   `flood`, `construction`, `narrow_alley`, `traffic_light`.
4. Serialize bằng UTF-8, `sort_keys=True`, `separators=(",", ":")`,
   `allow_nan=False`; output là `scenario-v1:` + 64 lowercase hex SHA-256.
5. Exclude `include_trace`, thứ tự raw request, UI selected edge/playback,
   runtime và mọi state không đổi semantics graph/cost.

Hai request cùng semantic scenario phải cùng fingerprint; fingerprint phải đổi khi
base graph/profile, resolved view hoặc effective override đổi. Frontend chỉ hiển thị
và đối chiếu echo của server, không tự sinh một hash khác.

### E.4. ATSP optimization trace tách biệt route Trace

`Trace.trace` tiếp tục chỉ thuộc chín thuật toán route và dùng `TraceStep` duy nhất.
ATSP **không** nhét event DP/local search/SA vào field này. `POST /api/multiroute`
nhận field additive `include_trace: bool = false`; khi true và bài toán reachable,
response có `optimization_trace`, khi false field đó là `null`. `include_trace`
không được đổi RNG, tour, leg, total, guarantee hoặc per-seed statistic.

Regression trace-on/off so các field deterministic: `found`, `order`, `legs`,
totals/original totals/savings, guarantee và SA per-seed optimizer stats (cùng node
expanded/max frontier nếu response method có field đó). Không đòi bằng nhau đối với
`runtime_ms`, trace payload, `trace_truncated`, `recorded_events` hay sampling counters.

```text
OptimizationTrace
  method: TspMethod
  total_events: int >= 0          # event eligible trước sampling
  recorded_events: int >= 0       # đúng bằng len(events)
  sampling_policy:
    "all-or-stride-v1" | "chronological-prefix-final-v1" | "priority-periodic-20-v1"
  trace_truncated: bool           # total_events > recorded_events
  events: discriminated union, ordinal tăng dần, có thể không liên tiếp sau sampling
```

Mọi event có `ordinal` (0-based vị trí trong dòng eligible) và `kind`. Union:

| `kind` | Field tối thiểu |
|---|---|
| `held_karp_update` | `mask`, `subset`, `endpoint`, `predecessor`, `candidate_cost`, `previous_cost|null`, `new_cost` |
| `held_karp_reconstruct` | `order`, `total_cost` |
| `nn_decision` | `current`, ordered `candidates[{node,cost}]`, `selected`, `order` |
| `local_improvement` | `move_type` (`2_opt`/`or_opt`), indices/segment length, before/after order & cost, `rejected_candidates_since_previous` |
| `sa_seed_boundary` | `boundary` (`start`/`end`), `seed`, `iteration`, `temperature`, current/best order & cost |
| `sa_iteration` | `sample_reason` (`new_best`/`periodic`), seed/iteration/temperature, current, candidate, delta, accepted, resulting and best-so-far state |
| `sa_final_best` | final order/cost và per-seed statistics |
| `optimization_summary` | method, final order/cost; luôn là event cuối |

Tên field executable của các event được khóa như sau để backend và frontend
không tự diễn giải khác nhau. Mọi số thực trong bảng này (`cost`, `temperature`,
`delta`) phải hữu hạn; `ordinal`, `mask`, `iteration` và các chỉ số đều là số
nguyên không âm.

- `held_karp_update`: `mask`, `subset`, `endpoint`, `predecessor`,
  `candidate_cost`, `previous_cost`, `new_cost`.
- `held_karp_reconstruct`: `order`, `total_cost`.
- `nn_decision`: `current`, `candidates` (mỗi phần tử là `{node, cost}` theo
  thứ tự xét), `selected`, `order` (sau quyết định).
- `local_improvement`: `move_type`, `i`, `j`, `segment_length`,
  `before_order`, `before_cost`, `after_order`, `after_cost`,
  `rejected_candidates_since_previous`. Event này chỉ tồn tại khi nước đi đã
  được chấp nhận và `after_cost < before_cost`.
- `sa_seed_boundary`: `boundary`, `seed`, `iteration`, `temperature`,
  `current_order`, `current_cost`, `best_order`, `best_cost`.
- `sa_iteration`: `sample_reason`, `seed`, `iteration`, `temperature`,
  `current_order`, `current_cost`, `candidate_order`, `candidate_cost`,
  `delta`, `accepted`, `resulting_order`, `resulting_cost`, `best_order`,
  `best_cost`.
- `sa_final_best`: `final_order`, `final_cost`, `optimizer_stats`.
- `optimization_summary`: `method`, `final_order`, `final_cost`.

`SaOptimizerStats` có `seeds` theo đúng thứ tự 0–4. Mỗi phần tử có `seed`,
`iterations`, `final_cost`, `best_cost`, `best_order`; wrapper có `best_seed`,
`best_cost`, `mean_best_cost`, `stddev_best_cost`. Response non-SA luôn trả
`optimizer_stats: null`; response SA reachable luôn có object này, kể cả khi
`include_trace=false`.

`n` trong các cap dưới là tổng số điểm gồm start. Cap chỉ cắt **payload**, không
dừng optimizer hay metric:

- Held–Karp: cap 2 000. Với `n <= 8` giữ mọi successful DP update (cộng
  reconstruction/summary). Với `n > 8`, dùng stride xác định từ upper bound
  `(n-1) + (n-1)(n-2)2^(n-3)`, reserve reconstruction + summary.
- NN + local 2-opt/Or-opt: cap 2 000, giữ chronological prefix của `nn_decision`
  và accepted `local_improvement`, aggregate rejected candidate count, reserve summary.
- SA: cap 1 500, periodic mỗi 20 iteration. Ưu tiên seed start/end và final-best,
  rồi new-best, rồi periodic; nếu một priority class vượt capacity, sample đều theo
  ordinal deterministically. Reserve final-best + summary. Recorder/sampler không
  gọi RNG.

`SaOptimizerStats` chỉ non-null cho `sa`, độc lập với trace, gồm seed theo thứ tự
0–4, mỗi seed có `iterations`, `final_cost`, `best_cost`, `best_order`; wrapper có
`best_seed`, `best_cost`, `mean_best_cost`, `stddev_best_cost`. Nó cho phép test
trace-on/off semantic equality mà không so `runtime_ms`, payload, `trace_truncated`
hay counters sampling.

### E.5. Endpoint shape, defaults và compatibility

| Endpoint | Contract đích đã khóa |
|---|---|
| `GET /api/graph?level=&view=` | `level=demo`, `view=full`; trả `GraphResponse` §E.1 |
| `GET /api/traffic?slot=&level=&view=` | `view=full`; trả selected-view congestion + required `graph_view` echo |
| `POST /api/route` | thêm `scenario: ScenarioConfig | null = null`; route uses resolved scenario và echo `Trace.applied_scenario` |
| `POST /api/multiroute` | thêm `scenario: ScenarioConfig | null = null`, `include_trace: bool = false`, `applied_scenario`, `optimization_trace`, `optimizer_stats` |

Old frontend → new backend phải giữ base behavior: query thiếu `view`, request thiếu
`scenario`, và response additive bị reader cũ bỏ qua. New frontend → old backend
không được hỗ trợ rollout: request scenario có thể 422, query view có thể bị server
cũ bỏ qua; frontend phải phát hiện echo mismatch thay vì hiển thị sai view.

Trong đoạn này, “old backend” là bản **trước §E**. Compatibility B1/B2 ở §F.5
định nghĩa B1 là backend hiện hành đã triển khai đầy đủ §A–§E; vì vậy F2→B1 có
dual-read giới hạn và không mâu thuẫn cảnh báo trên.

### E.6. Error envelope mới

Mọi lỗi vẫn dùng §C.7 envelope. Bổ sung code typed, không dò substring message:

| Failure | HTTP / code |
|---|---|
| `G_real` + `teach_*` | 422 / `GRAPH_VIEW_UNAVAILABLE` |
| preset tracked missing/corrupt | 500 / `GRAPH_VIEW_UNAVAILABLE` (chi tiết chỉ trong server log) |
| override edge không thuộc resolved view | 404 / `EDGE_NOT_FOUND` |
| field/range/finite/physical/cross-field override sai | 422 / `INVALID_EDGE_OVERRIDE` |
| node không thuộc resolved view | 404 / `NODE_NOT_FOUND` |
| enum hoặc JSON shape sai | 422 / `VALIDATION_ERROR` |
| unexpected internal error | 500 / `INTERNAL`, không leak exception |

## §F. Contract đích đã duyệt 2026-08-09 — UI & Explanation v2

### F.0. Trạng thái, phạm vi và version

§F là migration contract **additive** đã được duyệt và triển khai đầy đủ trong
backend models/producers/tests cùng frontend consumers. Không nội dung nào ở §F
cho phép đổi graph, cost,
heuristic, tie-break, traversal order, stopping rule tạo nghiệm, path
reconstruction, seed, data hoặc benchmark đã chốt.

Producer v2 thêm `contract_version: 2` vào root của response `Trace` và
`MultirouteResponse`. Reader phải hiểu field vắng mặt là v1. Producer chỉ được
phát version 2 khi **toàn bộ field bắt buộc cho đúng endpoint/result variant** đã
được điền và qua validation; không phát version 2 cho payload nửa v1/nửa v2.
Mọi field §A–§E vẫn giữ tên, type, default và semantics. Đặc biệt:

- `total_cost` là objective theo request `mode`;
- `total_time_s` luôn là balanced path weight, kể cả mode `distance` hoặc `time`;
- trace cap 5.000 chỉ cắt payload, không cắt search hay full-run metrics;
- ATSP vẫn asymmetric, order không lặp Start cuối và closing leg nằm trong `legs`;
- field v2 mới không được làm thay đổi result khi bật/tắt route/optimization trace.

### F.1. Số học dùng chung: breakdown, tolerance, signed trade-off và phần trăm

`PathCostBreakdown` áp dụng cho route path, từng ATSP leg và tổng nhiều leg:

```text
PathCostBreakdown
  distance_m: finite float >= 0
  free_flow_time_s: finite float >= 0
  congestion_adjusted_time_s: finite float >= 0
  congestion_delay_s: finite float >= 0
  penalty_flood_s: finite float >= 0
  penalty_construction_s: finite float >= 0
  penalty_narrow_alley_s: finite float >= 0
  penalty_traffic_light_s: finite float >= 0
  risk_penalty_total_s: finite float >= 0
  balanced_cost_s: finite float >= 0
```

Nguồn tính duy nhất là aggregate của `backend/app/costs.py::edge_cost_breakdown`
trên đúng directed edges của path. Các identity phải đúng trong comparison
tolerance:

```text
congestion_delay_s
  = congestion_adjusted_time_s - free_flow_time_s

risk_penalty_total_s
  = penalty_flood_s + penalty_construction_s
  + penalty_narrow_alley_s + penalty_traffic_light_s

balanced_cost_s
  = congestion_adjusted_time_s + risk_penalty_total_s

mode=distance  -> metrics.total_cost = distance_m
mode=time      -> metrics.total_cost = congestion_adjusted_time_s
mode=balanced  -> metrics.total_cost = balanced_cost_s
mọi mode       -> metrics.total_time_s = balanced_cost_s
```

Không dùng số đã format/round để quyết định tie, rank, relation hoặc integrity.
Comparison equality dùng raw active-mode unit:

```text
COMPARISON_ABS_TOLERANCE = 1e-6       # mét với distance, giây với time/balanced
COMPARISON_REL_TOLERANCE = 1e-9

equivalent(a, b) iff
  abs(a-b) <= max(COMPARISON_ABS_TOLERANCE,
                  COMPARISON_REL_TOLERANCE * max(abs(a), abs(b)))
```

Đây là tolerance của contract/UI comparison, **khác** tolerance cải thiện nội bộ
`1e-12` của local search hiện hành; không được dùng nó để đổi quyết định thuật toán.

Ba phép so sánh không được trộn tên hoặc dấu:

1. `reference_minus_selected_cost = reference.total_cost - selected.total_cost`.
   Âm ngoài tolerance nghĩa là reference tốt hơn; dương nghĩa là reference kém
   hơn; trong tolerance là equivalent. Đây là signed trade-off, không phải gap.
2. `optimality_gap = selected.total_cost - exact_reference.total_cost`, chỉ có
   khi reference exact cùng snapshot/mode/topology. Trong tolerance serialize 0;
   nếu âm ngoài tolerance là contract-integrity error. `optimality_gap_pct =
   optimality_gap / exact_reference.total_cost * 100` khi mẫu số lớn hơn
   tolerance. Nếu cả exact và selected equivalent 0 thì gap và pct đều 0; nếu
   exact equivalent 0 nhưng selected dương thì pct là `null` và UI nói mẫu số 0.
3. `savings_pct = (original.total_cost - optimized.total_cost) /
   original.total_cost * 100`, chỉ khi baseline và optimized cùng open/closed
   topology. Nếu original và optimized đều equivalent 0 thì savings là 0; nếu
   original equivalent 0 nhưng optimized không equivalent 0 thì savings là
   `null` và response bị đánh dấu integrity error. Savings âm là tăng chi phí.

Response legacy `savings_pct` tiếp tục round 0,1 điểm phần trăm như §C.5; mọi
relation/ranking vẫn dùng totals raw trước round. Không frontend nào tự tính lại
breakdown hoặc relation từ localized prose.

### F.2. Route Trace v2: termination, decision và Dijkstra hai chiều

Root `Trace` version 2 luôn thêm `termination`, kể cả `include_trace=false`,
found=false hoặc start=goal:

```text
termination
  reason:
    start_equals_goal | goal_expanded | bidirectional_bound_met | frontier_exhausted |
    depth_cap_reached | round_cap_reached |
    beam_exhausted_after_pruning
  reachability: route_found | proven_unreachable | inconclusive
  solution_quality: exact | epsilon_bounded | feasible_unproven | not_applicable
  bidirectional_bound:
    {top_forward: {node, g} | null,
     top_backward: {node, g} | null,
     mu: finite float >= 0,
     meeting_node: node id} | null
```

Mapping bắt buộc:

- `start_equals_goal`: found, `route_found`, `not_applicable`; không đánh giá chất
  lượng một tuyến khi không có cạnh nào cần đi và giữ nguyên
  `optimal_guarantee` legacy theo algorithm policy hiện hành.
- `goal_expanded`: found; UCS/A* là `exact` khi precondition §B.5 giữ;
  IDA* là `epsilon_bounded`; BFS/DFS/IDDFS/Greedy/Beam là `feasible_unproven`.
- `bidirectional_bound_met`: chỉ dùng cho Bidirectional Dijkstra found khi đã
  có finite μ/meeting path và effective `top_forward + top_backward >= μ`;
  quality là `exact` khi precondition non-negative weight §B.5 giữ. Không
  gán `goal_expanded` cho thành công này vì Goal không nhất thiết bị phía
  forward expand trước khi stop rule chứng minh tối ưu.
- `frontier_exhausted`: not found, `proven_unreachable`, `not_applicable`.
- ba reason cap/pruning: not found, `inconclusive`, `not_applicable`.

`bidirectional_bound` bắt buộc non-null **iff** reason là
`bidirectional_bound_met`; mọi reason khác bắt buộc null. Đây là state effective
tại chính loop stop check sau khi bỏ stale heap entries, kể cả khi
`include_trace=false`. `top_forward`/`top_backward` null nghĩa là effective
frontier tương ứng rỗng và được thuật toán xem như key `+∞`; JSON không serialize
Infinity. Mọi g và μ được serialize là raw finite algorithm value. Nhờ field root
này, validator/UI không phải suy stop condition từ frontier display đã round.
`meeting_node` phải nằm trên result path và μ equivalent
`metrics.total_cost` theo tolerance §F.1.

Nếu precondition guarantee không được attested trong result snapshot, hạ quality
về `feasible_unproven`; frontend không suy quality chỉ từ tên algorithm.
`optimal_guarantee` legacy phải nhất quán với quality khi found.

IDDFS không được mặc định coi mọi lần chạm `iddfs_max_depth` là inconclusive.
Depth-limited search nội bộ phải phân biệt `found`, `failure`, `cutoff`:

- `cutoff` chỉ khi ít nhất một effective successor state bị bỏ **chỉ vì** depth
  limit sau cùng, theo đúng duplicate/best-depth policy của implementation;
- final round `cutoff` -> `depth_cap_reached`;
- final round `failure` -> `frontier_exhausted`.

Beam theo dõi full-run `ever_pruned`. Một layer chỉ tính là pruned khi pool unique
sau khi quét toàn layer có hơn `beam_width` node và node bị loại chỉ vì top-k;
visited/duplicate skip không phải pruning. Not-found với `ever_pruned=true` dùng
`beam_exhausted_after_pruning`; không có pruning dùng `frontier_exhausted`.
IDA* chỉ dùng `round_cap_reached` khi còn threshold hữu hạn cần thử nhưng đã hết
`max_rounds`; nếu probe trả exhaustive/no next threshold thì dùng
`frontier_exhausted`.

Mỗi recorded `TraceStep` của producer version 2 bắt buộc thêm `decision`; reader
v2 vẫn cho phép field vắng ở payload version 1:

```text
decision
  rule: fifo | lifo | depth_limited_lifo | lowest_g | lowest_h |
        lowest_f_then_h | bidirectional_min_key | f_bound_dfs | top_k_f
  selected_scores:
    {g: finite float | null, h: finite float | null,
     f: finite float | null, depth: int >= 0 | null} | null
  runner_up:
    {node, g: finite float | null, h: finite float | null,
     f: finite float | null, depth: int >= 0 | null} | null
  frontier_size_before: int >= 0
  frontier_size_after: int >= 0
  neighbors_scanned: int >= 0
  frontier_added: int >= 0
  frontier_updated: int >= 0
  pruned_count: int >= 0
  iteration: int >= 1 | null
  bound: finite float | null
  layer: int >= 1 | null
  beam_width: int >= 1 | null
  top_forward: {node, g} | null
  top_backward: {node, g} | null
  mu_before: finite float >= 0 | null
```

Scores, runner-up, frontier-before, top keys và `mu_before` là state effective
ngay trước pop/expand, sau khi bỏ stale heap entries. Counters và frontier-after
là state của action vừa ghi. `iteration` (IDDFS/IDA*) và `layer` (Beam) serialize
**1-based**; `ordinal` ATSP ở §E.4 vẫn 0-based. Producer B2 serialize đủ keys của
`decision`; field không áp dụng mang null. BFS/DFS được dùng
`selected_scores=null`; score-driven algorithm có object với ít nhất một score
non-null. Reader B1 vẫn cho phép thiếu toàn bộ `decision`.
Snapshot chỉ được tạo khi recorder active và không được thêm RNG call.

Riêng `bidijkstra`, mỗi recorded step thêm:

```text
bidirectional_frontiers
  forward: {nodes: sorted unique node ids, g: same-key trace-display map}
  backward: {nodes: sorted unique node ids, g: same-key trace-display map}
  best_path_cost: finite float >= 0 | null
  meeting_node: node id | null
```

Forward `g` là Start→node; backward `g` là node→Goal trên graph gốc. Node overlap
ở cả hai list và giữ hai giá trị. Legacy `frontier` bằng union; legacy `g` dùng
giá trị phía duy nhất hoặc min khi overlap; `side` là phía vừa expand.
`decision.mu_before` là μ trước expansion; `best_path_cost` là μ sau expansion.
Key set của mỗi nested `g` phải bằng chính xác `nodes`; giá trị dùng
cùng presentation-rounding policy với legacy trace `g`, không dùng giá trị
đã round để ra quyết định search. Ngược lại, selected/runner-up/top-key
scores, bound và μ trong `decision`/`termination.bidirectional_bound` serialize raw finite algorithm
values; frontend tự format presentation. Nhờ vậy UI có thể giải thích tie/stop
rule mà không lấy một giá trị làm tròn để thay cho state thật.
Producer v2 bắt buộc payload này ở mọi recorded bidirectional step và cấm nó ở
algorithm khác. Reader v1/v2 thiếu field chỉ được render union có nhãn fallback,
không tái dựng hai phía.

### F.3. Explanation v2 và tuyến tham chiếu

Giữ `summary_vi`, `congested_segments`, `alternatives` legacy trong rollout, nhưng
producer sinh chúng từ cùng typed facts. UI v2 dùng `explanation.evidence` làm
nguồn chính:

```text
evidence
  selection_rule: decision rule enum
  objective:
    {mode,
     selected_value: finite float >= 0 | null,
     exact_reference_value: finite float >= 0 | null,
     optimality_gap: finite float >= 0 | null,
     optimality_gap_pct: finite float >= 0 | null}
  cost_breakdown: PathCostBreakdown | null
  factors: [ExplanationFactor]
  reference_routes: [ReferenceRoute]    # tối đa 2
```

Found route có finite `selected_value` và non-null breakdown; trivial có value 0
và breakdown toàn 0. Ba field exact/gap luôn hiện diện nhưng null khi không có
exact same-snapshot/same-objective reference. Not-found có
`selected_value=null`, exact/gap null,
`cost_breakdown=null`, references rỗng; factors chỉ được mô tả typed
cap/pruning/context thật. `selection_rule` phải khớp algorithm/decision enum.
Không dùng missing key và null như hai trạng thái cạnh tranh trong payload B2.

`ExplanationFactor`:

```text
id: stable non-localized id
kind: objective_truth | optimality_gap | congestion | flood | construction |
      narrow_alley | traffic_light | algorithm_limit | scenario_effect
affects_objective: bool
source: cost_breakdown | reference_comparison | trace | scenario
edge_ids: unique directed edge ids
node_ids: unique node ids
contribution_raw: finite float | null
contribution_unit: m | s | null
timeline_step: int >= 1 | null
```

`contribution_raw` và `contribution_unit` cùng null hoặc cùng non-null. Raw value
có thể signed. `affects_objective=false` bắt buộc cả hai null; context seconds
được đọc từ `cost_breakdown`, không giả là contribution của distance objective.
Khi non-null, unit theo active objective: `m` cho distance, `s` cho
time/balanced. Traffic level/count và contiguous road group là view-model derive
từ edge/profile/path facts, không phải một response factor shape thứ hai.

`ReferenceRoute`:

```text
id: stable non-localized id
kind: same_objective_optimum | distance_optimum | balanced_optimum |
      avoid_edge_counterfactual
provenance: posthoc_ucs
generated_for_mode: mode
excluded_edge: edge id | null
path: directed-valid node ids
metrics: LegMetrics
cost_breakdown: PathCostBreakdown
reference_minus_selected_cost: finite float
reference_minus_selected_pct: finite float | null
reference_minus_selected_distance_m: finite float
reference_minus_selected_balanced_cost_s: finite float
relation_to_selected: better | equivalent | worse
```

`reference_minus_selected_pct = reference_minus_selected_cost /
selected.total_cost * 100` khi selected lớn hơn tolerance. Nếu cả selected và
reference equivalent 0 thì pct=0; nếu selected equivalent 0 nhưng reference không
equivalent 0 thì pct=`null`. Đây vẫn là signed trade-off. Optimality gap chỉ nằm
trong objective evidence và chỉ dùng exact same-objective reference. Tuyến reference là hậu kiểm;
localized copy không được nói thuật toán chính đã “xét” hay “loại” full route đó.
Hai field distance/balanced còn lại cũng luôn dùng dấu `reference - selected`,
không đổi dấu theo localized sentence.
Result có `solution_quality=exact` mà reference exact tốt hơn ngoài tolerance là
integrity error: frontend dừng claim/ranking thay vì che mâu thuẫn. Với IDA*
`solution_quality=epsilon_bounded`, exact reference được phép tốt hơn selected
route khi `0 ≤ selected.total_cost - exact.total_cost ≤ metrics.epsilon_bound`
trong tolerance; chỉ gap âm hoặc vượt ε mới là integrity error. Không dùng riêng
`metrics.optimal_guarantee=true` để suy result là exact.

Mỗi ordered-search leg phải giữ nguyên explanation/termination của route response
gốc. Aggregate không được tạo một whole-tour alternative giả hoặc biến đảm bảo
từng chặng thành đảm bảo tối ưu thứ tự điểm.

### F.4. MultirouteResponse v2

Response reachable thêm các field sau, ngoài field v1 và §E:

```text
return_to_start: bool                         # echo request sau validation
original_order: [start, ...stops]             # không lặp start cuối
original_order_legs: [Leg]
totals_breakdown: PathCostBreakdown
original_order_breakdown: PathCostBreakdown
matrix_evidence: AtspMatrixEvidence
computation_metrics:
  matrix_search_runs: int >= 0
  matrix_nodes_expanded: int >= 0
  matrix_runtime_ms: finite float >= 0
  optimizer_runtime_ms: finite float >= 0
  total_runtime_ms: finite float >= 0
failure: MultirouteFailure | null
method_stats: AtspMethodStats | null
```

Mỗi optimized/baseline `Leg` thêm `cost_breakdown: PathCostBreakdown`. Totals và
hai aggregate breakdown bằng tổng đúng các leg tương ứng trong tolerance.
`original_order_legs` có closing leg khi return=true. Với tối đa 15 stops: open
có tối đa 15 legs, closed có tối đa **16** legs.

`AtspMatrixEvidence` luôn non-null khi facade đã bắt đầu xử lý, kể cả
`matrix_incomplete`:

```text
point_count: int >= 2
directed_pair_count: int >= 2                 # k * (k - 1)
reachable_directed_pair_count: int >= 0
asymmetric_unordered_pair_count: int >= 0
asymmetry_example:
  {from_node, to_node,
   forward_cost: finite float >= 0,
   reverse_cost: finite float >= 0,
   absolute_delta: finite float > 0} | null
```

`reachable_directed_pair_count <= directed_pair_count`; response reachable phải
bằng nhau. `asymmetric_unordered_pair_count <= k*(k-1)/2`. Unordered pair chỉ
được xét asymmetric khi cả hai directed costs đã
có và khác ngoài tolerance §F.1. Example chọn pair có absolute delta lớn nhất,
tie bằng `(from_node, to_node)` tăng dần; `from_node < to_node` theo node ID để
khóa orientation, `forward_cost=cost[from_node,to_node]`, và
`absolute_delta=abs(forward_cost-reverse_cost)`. Nếu không có pair đủ điều kiện,
example null. Mọi cost dùng active mode raw unit, không lấy số display đã round.

`matrix_search_runs` là số lượt multi-target UCS thực sự bắt đầu;
`matrix_nodes_expanded` cộng pop/settle hợp lệ của các lượt đó.
`matrix_runtime_ms` bao toàn bộ dựng cost/path matrix; `optimizer_runtime_ms` chỉ
bao solver trên matrix; `total_runtime_ms` đo facade sau validation đến hết result
assembly. Đo bằng monotonic clock ở raw precision, validate
`total_raw >= matrix_raw + optimizer_raw`, rồi mới round từng field 3 chữ số thập
phân như route runtime. Nếu chỉ kiểm serialized values, cho sai số accounting tối
đa 0,002 ms do ba phép round. Không runtime nào được dùng làm benchmark khoa học.
Trace recorder/assembly có thể làm runtime khác; vì vậy trace-on/off regression bỏ
qua runtime nhưng phải so mọi field deterministic khác.

`AtspMethodStats` là discriminated union và, khi reachable/optimizer đã chạy,
luôn đo **full run**, không derive từ sampled events. Field này bắt buộc
non-null cho response reachable v2 và bắt buộc null cho `matrix_incomplete`.
Reachable bắt buộc `failure=null`; `method_stats.kind` phải map lần lượt
`held_karp→held_karp`, `nn_2opt→nn_local_search`, `sa→simulated_annealing`:

```text
kind: held_karp
  dp_states_solved
  transitions_evaluated

kind: nn_local_search
  nn_initial_cost
  nn_candidates_evaluated
  two_opt_candidates_evaluated
  or_opt_candidates_evaluated
  accepted_2opt_moves
  accepted_oropt_moves
  final_cost
  improvement_after_nn

kind: simulated_annealing
  seed_count
  best_seed
  best_cost
  mean_best_cost
  stddev_best_cost
  attempted_moves
  accepted_improving_moves
  accepted_equal_moves
  accepted_worse_moves
  rejected_moves
  seeds: [{seed, iterations, final_cost, best_cost, best_order,
           attempted_moves, accepted_improving_moves,
           accepted_equal_moves, accepted_worse_moves, rejected_moves}]
```

Định nghĩa count:

- Mọi field tên `*_count`, `*_evaluated`, `*_moves`, `*_states_solved`,
  `transitions_evaluated` và `iterations` là integer >= 0. Mọi cost/mean/stddev
  hữu hạn và >= 0. `seed_count=len(seeds)>=1`; `best_seed` thuộc `seeds`;
  mỗi `best_order` là permutation bắt đầu bằng Start và không lặp Start cuối.

- Held–Karp `dp_states_solved` là số entry `(mask, endpoint)` materialized sau DP,
  gồm base `(1,start)`. `transitions_evaluated` tăng cho mỗi phép tính candidate
  trong recurrence `cost_i + c[i][j]`, kể cả candidate không cải thiện; không gồm
  scan chọn endpoint cuối, reconstruction hoặc trace sampling.
- NN `nn_candidates_evaluated` cộng số node trong candidate set ở mỗi greedy
  decision. Hai local-search counters tăng cho mỗi candidate tour thực sự được
  full-recost theo đúng loop/move type; no-op bị skip không tính. Accepted counter
  tăng đúng khi move qua internal improvement rule hiện hành.
  `improvement_after_nn = nn_initial_cost - final_cost` bằng raw active-mode unit.
- SA `attempted_moves` tăng sau mỗi candidate được recost với
  `delta = candidate_cost - current_cost`; phân loại
  **đúng dấu raw dùng bởi acceptance hiện hành**: `delta < 0` improving,
  `delta == 0` equal, `delta > 0` worse. Accepted-equal là field riêng vì code
  nhận mọi `delta <= 0`. Identity bắt buộc:
  `attempted = accepted_improving + accepted_equal + accepted_worse + rejected`.
  Việc ghi stats không thêm RNG call và không đổi acceptance.
- `best_seed` là seed có `best_cost` nhỏ nhất, tie theo thứ tự seed input (mặc định
  0–4). Mean là arithmetic mean của per-seed best costs. `stddev_best_cost` là
  **sample standard deviation** (mẫu số `seed_count-1`, tương đương
  `statistics.stdev`); bằng 0 khi chỉ có một seed.

`optimizer_stats` SA legacy ở §E.4 tiếp tục tồn tại và phải được sinh từ chính
`method_stats`, không phải một bộ đếm thứ hai.

Khi matrix thiếu một directed pair, response 200 có:

```text
found=false
return_to_start=<echo request>
order=[]
legs=[]
totals=null
totals_breakdown=null
original_order=[start, ...stops]
original_order_legs=[]
original_order_totals=null
original_order_breakdown=null
savings_pct=null
failure={kind: matrix_incomplete, from_node, to_node}
method_stats=null
matrix_evidence=<partial counters/asymmetry đã thu được>
computation_metrics=<counters/timing đã thu được>
```

Optimizer không chạy sau `matrix_incomplete`. Copy chỉ được nói không dựng được
ma trận đầy đủ cho pair có hướng, không khẳng định mọi open order đều bất khả thi.
HTTP validation errors trước khi facade bắt đầu vẫn dùng §C.7 và không cần response
shape trên.

### F.5. Compatibility, rollout và rollback

Comparison client phải deep-copy normalized typed `ScenarioConfig` trong immutable
request snapshot; không giữ draft string/reference và không tự hash. Session có
`authoritative_scenario_fingerprint: string|null`, khởi tạo null. Fingerprint của
response hợp lệ đầu tiên (kể cả found=false) thiết lập field đúng một lần; mọi
response/retry sau phải khớp. Missing/mismatch là contract error, không vào
ranking; capability/fingerprint đổi giữa session buộc cancel phần còn lại và tạo
session mới. Ordered-search comparison kiểm mỗi `/api/route` leg response, kể cả
closing/failed leg, không đợi tới merged result.

Compatibility matrix bắt buộc:

| Frontend | Backend | Hành vi |
|---|---|---|
| v1 | v1 | Hành vi hiện hành §A–§E |
| v1 | v2 | Phải hoạt động; reader cũ bỏ field additive, field legacy không đổi |
| v2 | v1 | Dual-read: union bidi có nhãn fallback; Explanation dùng copy bảo thủ; ẩn breakdown/baseline/stats thiếu dữ liệu. Open/closed chỉ lấy từ immutable request snapshot, không suy từ số legs. Response thiếu server scenario fingerprint bắt buộc là contract error và không được xếp hạng |
| v2 | v2 | Toàn bộ §F; vẫn validate từng capability/field bắt buộc theo result variant |

Rollout theo thứ tự:

1. Cập nhật schema/models/tests và deploy backend v2 trong khi frontend v1 còn chạy.
2. Chạy producer/legacy compatibility tests và xác nhận path/cost/result parity.
3. Deploy frontend v2 với dual-read/capability checks; không chỉ kiểm một global
   version rồi giả định nested field luôn có.
4. Chỉ bỏ fallback trong một schema version/decision riêng sau telemetry/QA; không
   thuộc phase này.

Rollback frontend v2→v1 an toàn vì backend giữ legacy fields. Rollback backend
v2→v1 khi frontend v2 đang chạy chỉ an toàn trong phạm vi dual-read ở matrix trên;
frontend phải degrade thay vì fabricate. Phase này không có DB/persistent schema,
không cần migration/backfill và rollback không xóa data. Mọi response v2 đã lưu
trong memory của session bị clear khi backend capability/fingerprint thay đổi;
không trộn v1/v2 result trong cùng comparison session.

## Phụ lục: ví dụ JSON hợp lệ tối thiểu

Xem 4 file mock sinh bởi `scripts/00_generate_mock.py` (seed 42, tái lập 100%):

| File | Minh hoạ |
|---|---|
| `data/mock/graph_mock.json` | §A graph 8 node / 16 cạnh, địa danh thật Q1 |
| `data/mock/traffic_profiles_mock.json` | §A.4 đủ 4 khung giờ × 16 cạnh |
| `data/mock/trace_mock.json` | §B trace A* đầy đủ từng bước g/h/f |
| `data/mock/trace_bidijkstra_mock.json` | §B trace Bidirectional Dijkstra với `side` từng bước (GUI tô 2 màu) |
| `data/mock/multiroute_mock.json` | §C.5 response multiroute nn_2opt |
| `data/mock/scenario_cost_golden.json` | fixture formula chung cho preview TypeScript và `edge_cost_breakdown` Python |

> ⚠️ Mock chỉ để frontend làm song song + test schema. Chiều một chiều của vài
> đường trong mock là **đơn giản hoá**, không cam kết đúng thực địa. Với snapshot
> thật, `oneway` public là semantics structural của directed edge set cuối:
> G_real suy từ reverse ordered pair sau dedup; G_demo suy từ các corridor được
> giữ/repair/prune. Nó không phải raw OSM tag được copy nguyên xi.
