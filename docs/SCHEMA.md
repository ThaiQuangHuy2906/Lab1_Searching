# SCHEMA.md — Các hợp đồng dữ liệu và API

> **Trạng thái kiểm lại 2026-08-07:** §A–§D mô tả contract base đang chạy. §E khóa phần
> mở rộng đã được người dùng duyệt: GraphView dạy học, scenario edge-override
> request-scoped, `AppliedScenario`/fingerprint và ATSP optimization trace.
> **Milestone 2 đã triển khai** GraphView, graph/traffic response echo và
> `AppliedScenario`/fingerprint cho scenario không override. **Milestone 3 đã triển khai** ATSP optimization trace:
> `include_trace`, event union, sampler deterministic, `optimizer_stats` và player
> frontend. **Milestone 4 đã triển khai** `EdgeOverride` request-scoped với
> validation finite/physical, canonical no-op, clone private bất biến, recompute
> derived cost/`v_max`, fingerprint server-authoritative và editor frontend.
> Không được tự coi code cũ là authority để bỏ hoặc đổi các semantics đã khóa ở §E.
> Dữ liệu benchmark trong `results/` là artifact cũ và không thay đổi contract này.
>
> **Quy tắc vàng của nhóm:** không ai code trước khi 3 hợp đồng này được duyệt.
> Sau khi duyệt, **mọi** thay đổi schema phải cập nhật file này và báo rõ trong tóm tắt phase (PROMPT-MASTER luật 2).
>
> Hiện thân executable của file này là `backend/app/models.py` (Pydantic v2) — test `backend/tests/test_schema.py` bảo đảm mock data khớp schema. Nếu file này và `models.py` lệch nhau → `models.py` sai, phải sửa theo file này.

**Phạm vi:** §A định dạng dữ liệu đồ thị + hồ sơ ùn tắc · §B cấu trúc `trace` mọi thuật toán trả về · §C REST API · §D công thức cost & heuristic (tham chiếu chung cho §B, §C).

**Các enum dùng chung toàn dự án:**

| Enum | Giá trị hợp lệ |
|---|---|
| `algorithm` | `bfs` · `dfs` · `iddfs` · `ucs` · `dijkstra` · `astar` · `greedy` · `bidijkstra` · `idastar` · `beam` (10 giá trị — phương án đếm "9 thuật toán" do gộp DFS+IDDFS một dòng; ta cài và benchmark đủ 10) |
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

**Quy tắc vàng (PROMPT-MASTER luật 3):** cả 10 thuật toán trả về đúng một cấu trúc này, không ngoại lệ. Hàm ký danh chuẩn (Phase 2):

```
run(graph_store, start, goal, mode, time_slot, include_trace, **params) -> Trace
```

### B.1 Cấu trúc đầy đủ

```jsonc
{
  "algorithm": "astar",           // enum algorithm (10 giá trị)
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
| ucs, dijkstra | ✓ | – | – | g = chi phí tích luỹ theo `weight(mode)` |
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
      "why_not_vi": "Ngắn hơn 320 m nhưng lúc 07:30 dính đoạn ùn tắc mức 4/5 và 2 đèn đỏ, ước chậm hơn ~178 s." }
  ]
}
```

### B.5 `optimal_guarantee` chuẩn theo thuật toán và termination

| algorithm | optimal_guarantee | Lý do ngắn |
|---|---|---|
| bfs | `false` | chỉ tối ưu khi cạnh đồng trọng số — đồ thị này không đồng |
| dfs, iddfs | `false` | không theo chi phí |
| ucs, dijkstra, bidijkstra | `true` | chứng minh chuẩn với weight ≥ 0 |
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

Ghi chú thi công (Phase 3): ma trận chi phí bất đối xứng, dựng bằng Dijkstra từ từng điểm theo `(mode, time_slot)`; path từng leg được cache để trả về. `sa` chạy 5 seed 0–4, trả nghiệm tốt nhất (best/mean/std đưa vào benchmark, không vào response này).

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

Phần này **mở rộng theo kiểu additive** §A–§D. Nó là source-of-truth cho
Milestone 2–4 của `PLAN.md`; khi một mô tả cũ ở §C.2–§C.5 thiếu field mới,
§E được ưu tiên. Không thay đổi format của `graph_demo.json`,
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

`Trace.trace` tiếp tục chỉ thuộc mười thuật toán route và dùng `TraceStep` duy nhất.
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
