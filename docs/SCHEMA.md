# SCHEMA.md — Ba hợp đồng dữ liệu (chốt tại Phase 0)

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
| `tsp_method` | `held_karp` · `nn_2opt` · `sa` |
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
    "created": "2026-07-26",             // ISO date, ngày build
    "crs": "EPSG:4326",                  // cố định
    "node_count": 52,                    // PHẢI khớp len(nodes)
    "edge_count": 128                    // PHẢI khớp len(edges)
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
  "meta": { "graph": "G_demo", "created": "2026-07-26", "source": "tomtom+synthetic" },  // source: "tomtom+synthetic" | "synthetic"
  "profiles": {
    "07:30": { "e00001": 4, "e00002": 3 /* … MỌI edge id của graph tương ứng */ },
    "12:00": { /* … */ },
    "17:30": { /* … */ },
    "22:00": { /* … */ }
  }
}
```

**Ràng buộc:** đủ đúng 4 khung giờ; mỗi khung giờ phủ **100% edge id** của graph đi kèm (không thiếu, không thừa id lạ); giá trị congestion là **số nguyên 1–5** (1 = thông thoáng, 5 = kẹt cứng).

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
  "found": true,                  // false nếu không tìm được đường (Beam có thể; các thuật toán khác chỉ khi goal không tới được)
  "path": ["n0001", "n0014", "n0027"],  // dãy node id liên tiếp có cạnh nối; [] nếu found=false; [start] nếu start==goal
  "metrics": { /* B.2 */ },
  "trace": [ /* B.3 — [] nếu include_trace=false */ ],
  "explanation": { /* B.4 */ }
}
```

### B.2 `metrics`

```jsonc
{
  "total_cost": 812.4,            // tổng weight theo mode đang chạy — GIÂY với time/balanced, MÉT với distance; null nếu found=false
  "total_distance_m": 3120.0,     // luôn tính (tổng length_m dọc path); null nếu found=false
  "total_time_s": 812.4,          // luôn tính (tổng t_free·f_cong + penalty dọc path, tức weight balanced) — để mọi mode so sánh được với nhau; null nếu found=false
  "nodes_expanded": 143,          // số lần pop-và-expand thật sự (IDDFS/IDA*: cộng dồn qua mọi vòng lặp)
  "max_frontier": 38,             // kích thước frontier/open lớn nhất quan sát được
  "runtime_ms": 4.2,              // thời gian chạy thuật toán (không tính build explanation)
  "optimal_guarantee": true,      // theo LÝ THUYẾT trên đồ thị trọng số này (bảng B.5) — không phụ thuộc kết quả lần chạy
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
  "depth_limit": 3                // CHỈ iddfs (giới hạn độ sâu của vòng hiện tại); thuật toán khác: null/vắng mặt
}
```

**Bảng quy định g/h/f theo thuật toán** (`✓` = bắt buộc có, `–` = null):

| algorithm | g | h | f | Ghi chú |
|---|---|---|---|---|
| bfs, dfs | – | – | – | |
| iddfs | – | – | – | có thêm `depth_limit` mỗi bước |
| ucs, dijkstra | ✓ | – | – | g = chi phí tích luỹ theo `weight(mode)` |
| bidijkstra | ✓ | – | – | frontier = hợp 2 phía; g của phía tương ứng |
| greedy | – | ✓ | – | g vẫn được tính nội bộ để ra metrics, nhưng không xuất trong trace |
| astar, idastar | ✓ | ✓ | ✓ | f = g + h; A* tie-break theo h nhỏ hơn |
| beam | ✓ | ✓ | ✓ | frontier = beam hiện tại (≤ k phần tử) |

**Chống phình payload:** server cắt `trace` tại **5 000 bước** và đặt `metrics.trace_truncated = true` (metrics vẫn tính trên toàn bộ quá trình chạy, chỉ danh sách bước bị cắt). Cờ `include_trace` trong request: mặc định `true` với `graph=demo`, `false` với `graph=real`; khi `false` → `trace: []`.

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

### B.5 `optimal_guarantee` chuẩn theo thuật toán (giá trị cố định ghi vào metrics)

| algorithm | optimal_guarantee | Lý do ngắn |
|---|---|---|
| bfs | `false` | chỉ tối ưu khi cạnh đồng trọng số — đồ thị này không đồng |
| dfs, iddfs | `false` | không theo chi phí |
| ucs, dijkstra, bidijkstra | `true` | chứng minh chuẩn với weight ≥ 0 |
| astar | `true` | heuristic admissible + consistent (docs/HEURISTIC-PROOF.md) |
| idastar | `true` | trong ngưỡng ε = 5 s (`epsilon_bound`) |
| greedy, beam | `false` | greedy theo h / cắt frontier, không complete (beam) |

---

## §C. REST API (FastAPI, port 8000, prefix `/api`)

CORS mở cho `http://localhost:3000`. Mọi response lỗi dùng **error model thống nhất §C.7**.

### C.1 `GET /api/health`

Response `200`:
```jsonc
{ "status": "ok", "versions": { "python": "3.14.0", "app": "0.1.0" } }
```

### C.2 `GET /api/graph?level=demo|real`

Trả nguyên văn `graph.json` tương ứng (cấu trúc §A.1). `level` mặc định `demo`. `level` lạ → 422.

### C.3 `GET /api/traffic?slot=07:30&level=demo`

Response `200`: map congestion của khung giờ đó, đúng graph đó:
```jsonc
{ "slot": "07:30", "graph": "demo", "congestion": { "e00001": 4, "e00002": 3 } }
```
`slot` ngoài 4 mốc → 422.

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
  "params": {                     // tuỳ chọn theo thuật toán, bỏ qua nếu không liên quan
    "beam_width": 5,              // beam; mặc định 5 (demo) / 50 (real)
    "epsilon": 5.0                // idastar; mặc định 5.0 giây — đổi phải hỏi (PROMPT-MASTER luật 4)
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
  "return_to_start": false                // mặc định false — shipper kết thúc tại điểm giao cuối (giả định ghi vào báo cáo)
}
```

**Giới hạn kích thước (chốt mâu thuẫn n≤15 vs k≤16):** tổng số điểm `k = 1 + len(stops)` ≤ **16**. Riêng `method=held_karp` yêu cầu `k ≤ 15` (từ 13 trở lên server ghi cảnh báo vào log); `k = 16` với `held_karp` → 422 `HELD_KARP_LIMIT` gợi ý dùng `nn_2opt`/`sa`.

Response `200`:
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
      "rows": [ { /* CSV-as-JSON: mỗi row một object, key = tên cột */ } ] }
  ]
}
```
Chưa có kết quả trong `results/` → 404 `RESULTS_NOT_FOUND` (message hướng dẫn chạy benchmark trước). *(Shape `rows` theo từng thí nghiệm chốt ở Phase 6 — nếu cần thêm trường sẽ cập nhật SCHEMA.md và báo.)*

### C.7 Error model thống nhất

```jsonc
{ "error": { "code": "NODE_NOT_FOUND", "message_vi": "Không tìm thấy node 'n9999' trong đồ thị demo." } }
```

| HTTP | code | Khi nào |
|---|---|---|
| 404 | `NODE_NOT_FOUND` | start/goal/stops chứa id không tồn tại trong graph đã chọn |
| 404 | `RESULTS_NOT_FOUND` | benchmark chưa chạy |
| 422 | `VALIDATION_ERROR` | enum sai, thiếu trường, stops rỗng/trùng, quá 15 stops (message_vi nêu trường sai) |
| 422 | `HELD_KARP_LIMIT` | held_karp với k = 16 |
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

Tính chất admissible + consistent: chứng minh tại `docs/HEURISTIC-PROOF.md` (Phase 2) + kiểm chứng thực nghiệm (thí nghiệm 2). Hằng số γ, penalty, ε=5 s: **đổi phải hỏi** (PROMPT-MASTER luật 4).

---

## Phụ lục: ví dụ JSON hợp lệ tối thiểu

Xem 4 file mock sinh bởi `scripts/00_generate_mock.py` (seed 42, tái lập 100%):

| File | Minh hoạ |
|---|---|
| `data/mock/graph_mock.json` | §A graph 8 node / 16 cạnh, địa danh thật Q1 |
| `data/mock/traffic_profiles_mock.json` | §A.4 đủ 4 khung giờ × 16 cạnh |
| `data/mock/trace_mock.json` | §B trace A* đầy đủ từng bước g/h/f |
| `data/mock/multiroute_mock.json` | §C.5 response multiroute nn_2opt |

> ⚠️ Mock chỉ để frontend làm song song + test schema. Chiều một chiều của vài đường trong mock là **đơn giản hoá**, không cam kết đúng thực địa — G_demo thật (Phase 1) lấy `oneway` từ OSM.
