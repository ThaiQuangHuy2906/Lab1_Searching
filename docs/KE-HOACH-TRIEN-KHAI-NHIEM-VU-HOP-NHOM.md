# Kế hoạch triển khai nhiệm vụ sau buổi họp nhóm

> **Mục đích:** tài liệu này lưu toàn bộ kết quả audit và kế hoạch triển khai để
> các thành viên A–E có thể dùng làm context khi đọc, thảo luận hoặc viết prompt
> cho các lượt làm việc tiếp theo.
>
> **Ghi chú audit 2026-08-08:** đây là kế hoạch/biên bản triển khai lịch sử.
> Mô tả bốn GraphView cố định ở phần thân phản ánh quyết định M1–M5 khi đó; code
> hiện hành đã mở rộng thành `full` hoặc `teach_3`…`teach_50`, preset version 2.
> Fresh automated evidence của Phase 0 ngày 2026-08-09: backend `189 passed`
> (1 dependency warning), validator `ALL DATA VALID`, frontend `42/42` và
> TypeScript/production build pass. Browser QA của UI v2 chưa áp dụng vì runtime
> v2 chưa được triển khai. Bằng chứng browser ở 1366×768, 1024×768 và 390×844 thuộc lượt
> UI Clarity ngay trước thay đổi catalog
> và đã kiểm tra GraphView, route/trace, ATSP, sandbox, bốn tab kết quả, theme,
> responsive/focus và reduced motion. Catalog hiện hành có 9 route + 3 ATSP; mọi
> mốc 10 route/13 phương pháp trong thân file là baseline lịch sử. `docs/SCHEMA.md`, `README.md`,
> code và fresh gates là nguồn trạng thái hiện hành; các bảng “Hiện trạng”, “Có một phần” và
> “Chưa có” bên dưới ghi lại baseline 2026-08-04, không phải mô tả current code.
> Tương tự, các dòng “8 `source_url` TODO” trong thân file đã được supersede ngày
> 2026-08-08: 8/8 URL hiện đã review/tích hợp, còn caveat lịch sử/không gian/ngữ
> nghĩa được ghi tại `data/DATA.md` §2.1.
>
> **Bổ sung trạng thái 2026-08-10:** UI & Explanation v2 đã triển khai qua
> Phase 6. Phase 0–6 hoàn tất; Phase 6 READY sau manual browser QA do người dùng
> xác nhận. Known issue validator IDA* được theo dõi riêng; Phase 7–8 chưa triển khai. Implementation brief duy nhất
> là `UI_caithien.md`; contract migration additive là `docs/SCHEMA.md` §F và thiết
> kế đích là `docs/DESIGN.md` §13. Không dùng các đề xuất UI lịch sử trong thân
> file này để ghi đè Phase 0–8, numeric semantics, compatibility matrix hoặc
> acceptance/DoD của brief mới.
>
> **Ngày audit:** 2026-08-04.

## 1. Tóm tắt baseline trước triển khai

Lượt audit ban đầu hoàn tất ở chế độ chỉ đọc. Sau đó nhóm đã duyệt và hoàn tất
chuỗi `03b real → 04 → 03b demo → validate_data`, rồi triển khai M1–M5. Benchmark,
generator và build frontend vẫn chưa chạy; `results/` tiếp tục là `SỐ TẠM`.

| Trạng thái | Hiện trạng |
|---|---|
| Đã có | Mô hình graph có hướng, schema node/edge, `adj`/`radj`, ba công thức cost, `GraphStore` bất biến, 10 thuật toán dùng chung `Trace`, ba phương pháp ATSP, timeline route hai điểm, kết quả ATSP theo legs, chứng minh heuristic đầy đủ. |
| Có một phần | Báo cáo mục c/d mới ở mức tóm tắt. Tài liệu generated có ví dụ cho 10 thuật toán nhưng chưa theo template 15 mục và một số bảng IDDFS/IDA* còn provisional. Tài liệu Role C giải thích tốt bốn thuật toán nâng cao và ba ATSP nhưng không phủ sáu thuật toán lõi. UI hiển thị thứ tự/legs ATSP nhưng chưa hiển thị quá trình tối ưu thứ tự. |
| Chưa có | Graph dạy học giảm node thực sự; contract `graph_view`; ATSP optimization trace; edge-override sandbox; provenance bốn nhóm đầy đủ; ví dụ chạy tay đồng nhất cho đủ 13 phương pháp trong report. |
| Đã gỡ chặn dữ liệu | Raw TomTom đủ 4/4 snapshot đại diện trên hai ngày thứ Hai, hai profile là `tomtom+synthetic`, `G_demo` đã rebuild và validator đạt. Benchmark/hiệu chuẩn γ/generator vẫn chờ code ổn định và ủy quyền riêng; `results/` tiếp tục là `SỐ TẠM`. |
| Bằng chứng baseline 2026-08-04 | Backend: **111 passed**; validator: **ALL DATA VALID**; frontend: **8 tests passed**; TypeScript: exit 0. Đây là số lịch sử của audit trước M1–M5. |
| Bằng chứng sau M1–M5 (2026-08-05) | Backend: **148 passed** (1 dependency warning); validator: **ALL DATA VALID**; frontend: **19/19**; TypeScript: exit 0; browser/runtime QA M1–M5 đã kiểm tra theo phạm vi ghi trong `PLAN.md`. Đây là checkpoint lịch sử. |
| Bằng chứng audit 2026-08-07 | Backend: **176 passed** (1 dependency warning); validator: **ALL DATA VALID**; frontend: **35/35**; TypeScript: exit 0; production build: 6/6 static pages. Fresh browser QA đại diện ở 1366×768 xác nhận A*/route trace, Held–Karp/optimization trace, giao diện Đen/Trắng, API thành công và không có console error; full pre-flight vẫn phải lặp trước khi quay. |

Trạng thái dữ liệu cuối đã xác minh: raw TomTom đủ **4/4** tại 07:30, 12:00,
17:30 và 22:00. Hai slot đầu thu ngày 2026-07-27, hai slot sau thu ngày
2026-08-03; cả hai là thứ Hai. Nhóm chấp nhận đây là snapshot đại diện, không
phải chuỗi đo cùng ngày. `G_real` dùng TomTom cho các cạnh trục chính được gán
và synthetic fallback cho phần còn lại; `G_demo` kế thừa qua corridor weighted
mean. Raw GraphML, bốn TomTom JSON và OSMnx cache hiện được Git track dưới
`data/raw/` và vẫn phải được đưa vào Data ZIP cuối.

Các số hiện hành đã xác minh:

- `G_demo`: 51 node, 298 cạnh có hướng, 60 cạnh `oneway`.
- `G_real`: 2.118 node, 4.699 cạnh có hướng, 1.433 cạnh `oneway`.
- Cả hai strongly connected và có profile `tomtom+synthetic` đủ bốn slot.
- Tập bảy node hiện dùng trong generator có 24 cạnh induced, strongly connected
  và chính là checkpoint `teach_7` của backend. Chỉ tuyên bố parity khi GUI chọn
  đúng view đó và dùng cùng request settings với generator.
- Tám manual risk vẫn có tám `source_url` TODO. Metadata đã được đồng bộ với luật
  cạnh đi vào vùng (`u` ngoài, `v` trong); URL thật vẫn là việc tay trước submission.

## 2. Bảng mapping

| Meeting note | Yêu cầu cụ thể | File hiện tại | Gap | Đề xuất | Tiêu chí nghiệm thu |
|---|---|---|---|---|---|
| Bổ sung mô hình hóa graph | Formalize `G=(V,E)`, state/action/goal, directed edges, path cost, `G_demo`/`G_real`, ATSP | `SCHEMA.md`, `DATA.md`, `BaoCao-Khung.md` | Report thiếu bảng field, `adj`/`radj`, cách co hành lang, sơ đồ và ví dụ | Viết lại mục c; thêm pipeline, node-edge schema và graph con bảy node | Đủ mọi mục A1; không mâu thuẫn schema/code; giải thích được đường một/two-way và bất đối xứng |
| Bổ sung nguồn dữ liệu | Provenance bốn nhóm, TomTom/OSM/derived/manual/synthetic | `DATA.md`, report mục d | Hiện còn mô tả “seed/real” khái quát | Bảng provenance theo từng field; ghi đúng profile hỗn hợp TomTom 4/4 + fallback | Không tuyên bố TomTom phủ toàn graph; tám TODO và giới hạn POI/risk được nêu rõ |
| Giải thích trọng số | Công thức, đơn vị, mục đích, điều kiện không âm | `costs.py`, `SCHEMA.md`, `HEURISTIC-PROOF.md` | Report mới có công thức ngắn, chưa giải thích đơn vị và guarantee | Viết mục d.3 thống nhất với `edge_weight()` và `path_metrics()` | Không cộng mét với giây; ghi đúng `total_time_s`; nêu đủ tiền đề heuristic |
| Hiểu và tự trình bày thuật toán | 15 mục thống nhất cho 10 search + 3 ATSP | Generated guide, Role C guide, report e/g/h | Coverage phân mảnh, pseudocode/complexity/guarantee chưa đồng đều | Một template chung, cùng graph bảy node, truth table completeness/optimality | Đủ 13 thuật toán; mọi cap/default khớp code; không dùng benchmark thay chứng minh |
| Demo ít node | Graph nhìn thấy phải là graph thuật toán chạy | UI hiện chỉ chọn `demo/real` | Không có subgraph hoặc node-count control | Preset strongly-connected 7/15/25/51, induced directed graph backend | Path chỉ chứa node trong preset; `/graph`, traffic, route và multiroute cùng view |
| Demo ATSP từng bước | Trace riêng cho quá trình tìm thứ tự | `tsp.py`, ATSP components | Response chỉ có final order/legs | Optimization trace phân biệt theo method, có sampling/cap | `include_trace` không đổi order/cost/seed; UI play/pause/step đầy đủ |
| Chỉnh thuộc tính cạnh | Sandbox theo phiên, route thật sự dùng override | Map hiện không pickable cạnh; GraphStore base cached | Chưa có editor, validation hoặc request contract | Client giữ state, gửi override trong từng request; backend dựng store tạm | Không sửa JSON; reset khôi phục chính xác; heuristic và mọi mode được recompute |
| So sánh bằng số liệu | Protocol tái lập, chưa sinh số | `results/`, report g/h | `results/` cũ hơn graph | Chỉ thêm bảng placeholder/protocol trong lượt triển khai tài liệu | Mỗi dòng cuối có graph/date/profile/mode/slot/OD/seed/command/commit |

## 3. Thiết kế đề xuất cho ba tính năng UI

> **Ngữ cảnh lịch sử:** phần C1 dưới đây ghi quyết định preset cố định của lượt
> thiết kế 2026-08-04. Sau đó implementation đã chuyển sang node-count động
> 3…51 trên một `node_order` version 2 đã kiểm SCC; xem `docs/SCHEMA.md §E.1`.

### C1. Graph dạy học giảm node

So sánh:

| Phương án | Ưu điểm | Rủi ro | Kết luận |
|---|---|---|---|
| Preset cố định | Tái lập, review được, quay video ổn định | Ít linh hoạt hơn slider | **Khuyến nghị** |
| Custom node count | Người dùng chọn mọi `N` | Khó bảo đảm strong connectivity và đúng mục đích giảng | Để giai đoạn sau |
| Vùng/bán kính | Trực quan địa lý | Số node không ổn định, dễ cắt đường một chiều | Không chọn mặc định |
| Induced subgraph thuần | Không tạo cạnh giả | Có thể mất liên thông | Dùng làm phép dựng, nhưng preset phải được kiểm định |
| Connected expansion ổn định | Có thể tạo `N` theo anchor/ordering | Phức tạp; weak connectivity chưa đủ cho graph có hướng | Chỉ dùng nếu sau này bắt buộc custom `N` |

Thiết kế đề nghị:

```text
GraphView preset
      ↓
lọc node + induced directed edges + traffic tương ứng
      ↓
request-scoped GraphStore
      ├─ GET graph/traffic
      ├─ route hai điểm
      └─ multiroute
```

- Identifier canonical chỉ gồm `full`, `teach_7`, `teach_15`, `teach_25`.
  UI có thể ghi “Toàn bộ G_demo — 51 node”, nhưng API vẫn gửi `full`.
- Nếu query/request không có `view`, backend resolve mặc định `full`. `G_real`
  chỉ chấp nhận `full`; mọi view `teach_*` với real phải bị reject rõ ràng.
- `teach_7` tái sử dụng đúng bảy POI của generator hiện hành; tập này đã được
  audit là strongly connected. Chỉ sau khi backend view này tồn tại và parity
  được test mới được nói bảng generator khớp GUI.
- Preset 15/25 phải được chọn thủ công để dễ giảng, sau đó validator kiểm tra
  exact count, node tồn tại, induced edges và strong connectivity.
- Không tạo cạnh tắt và không bỏ hướng cạnh.
- Backend route trên đúng `GraphStore` đã lọc; vì vậy path không thể chứa node ẩn.
- `GET /api/graph`, `GET /api/traffic`, route và multiroute đều nhận cùng `view`.
- `real` chỉ hỗ trợ `full`; không giả vờ rằng preset demo áp dụng cho `G_real`.
- Đổi preset sẽ hủy route, comparison, multiroute, trace, start/goal/stops và
  override cũ.
- Nếu preset lỗi hoặc không strongly connected: API trả lỗi rõ ràng, không
  silent fallback sang graph đầy đủ.
- Nút “Toàn bộ G_demo — 51 node” luôn hiện.

### C2. ATSP optimization trace

Optimization trace là quá trình chọn thứ tự ghé. Nó khác với animation legs,
vốn chỉ chạy dọc các tuyến đường sau khi thứ tự cuối đã được tìm ra.

Trace đề xuất:

- Held–Karp:

  - Chỉ ghi sự kiện DP được cập nhật.
  - `mask`, `subset`, `endpoint`, `predecessor`, `candidate_cost`,
    `previous_cost`, `new_cost`.
  - Có bước reconstruction cuối.

- NN + 2-opt/Or-opt:

  - NN: current point, toàn bộ candidates/cost, selected point, order hiện tại.
  - Local search: `move_type`, indices/segment, tour trước/sau, cost trước/sau,
    improvement.
  - Chỉ ghi move thực sự cải thiện tour; candidate bị loại được tổng hợp bằng
    counter.

- Simulated Annealing:

  - `seed`, `iteration`, `temperature`, `current_cost`, `candidate_cost`,
    `delta`, `accepted`, `best_so_far`.
  - Kèm current/candidate/best order ở những bước được lấy mẫu.

Chính sách payload đề nghị:

| Method | Sampling | Cap |
|---|---|---:|
| Held–Karp | `n≤8`: mọi DP update; lớn hơn: deterministic stride theo upper bound transition và capacity còn lại | 2.000 |
| NN + local search | Mọi NN decision và accepted improvement đến cap | 2.000 |
| SA | Seed start/end, final-best, new-best, rồi periodic mỗi 20 iteration theo priority | 1.500 |

Trong mục này, `n` là **tổng số điểm kể cả start**. `total_events` là số eligible
event trước sampling; `recorded_events` là số event thực có trong response. Cap
chỉ giới hạn payload, không dừng optimizer. Reconstruction/final summary luôn
được reserve và giữ lại.

- Held–Karp với `n≤8` giữ mọi DP update. Với `n>8`, stride deterministic được
  suy từ upper bound số candidate transition và capacity còn lại sau phần reserve.
- NN/local giữ mọi decision/improvement theo thứ tự phát sinh đến capacity, đồng
  thời reserve final summary.
- SA ưu tiên seed start/end và final-best, sau đó new-best, sau đó periodic mỗi
  20 iteration. Nếu một priority class vượt capacity, sample đều theo event
  ordinal một cách deterministic.
- Recorder/sampler chỉ quan sát và tuyệt đối không gọi RNG.

Response ghi `total_events`, `recorded_events`, `sampling_policy` và
`trace_truncated`. Trace-on/off chỉ phải bằng nhau ở các semantic field
deterministic: `found/order/legs/path`, totals/cost, `nodes_expanded` và
`max_frontier` nếu có, `optimal_guarantee`, seed và per-seed optimizer stats.
Không yêu cầu bằng nhau đối với `runtime_ms`, trace payload, `trace_truncated`
hoặc recorded/sampling counters.

UI dùng timeline hiện có nhưng state phải phân biệt `route_trace` và `atsp_trace`:

- Play/pause, step back/forward, slider, tốc độ.
- Panel chi tiết theo method trong drawer.
- Map hiển thị thứ tự stop trung gian bằng đường conceptual nét đứt; không gọi đó
  là tuyến đường.
- Final legs vẫn được giữ riêng và chỉ nổi hoàn toàn ở bước cuối.
- Ở `prefers-reduced-motion`, mặc định paused, không route-flow/autoplay; slider
  và nút bước vẫn dùng được.
- Không thêm rail mới: tại 1366×768 vẫn giữ 320 px trái, 400 px drawer, phần còn
  lại cho map.

### C3. Edge-override sandbox

Kiến trúc khuyến nghị là **state trong bộ nhớ frontend + payload theo từng
request**:

| Phương án | Đánh giá |
|---|---|
| Chỉ lưu client-side | Không đạt vì backend không dùng override |
| Backend session | Thêm lifecycle, cleanup, concurrency và nguy cơ UI/server lệch trạng thái |
| Client state + gửi mỗi request | **Đơn giản, stateless, deterministic, refresh tự reset** |

Luồng:

1. Người dùng bật “Chỉnh cạnh thử nghiệm”.
2. Map chỉ lúc đó mới cho pick cạnh.
3. Drawer “Thử nghiệm” hiện giá trị gốc/current và provenance `sandbox override`.
4. Mỗi thay đổi lập tức clear mọi kết quả cũ.
5. Route, comparison và multiroute gửi cùng scenario.
6. Backend clone graph/profile trong request, áp override, recompute toàn bộ
   weight và `v_max`.
7. Reset edge/all xóa override; base cache và JSON không đổi.

Validation:

- `length_m > 0` và không nhỏ hơn `ceil_dm(haversine(u,v))`.
- `free_speed_kmh` trong khoảng đề nghị `1..200`.
- Mọi float trong request, kể cả epsilon và override, phải hữu hạn; không nhận
  NaN/Infinity và không silent clamp.
- Congestion là số nguyên `1..5`, theo từng slot.
- Risk flag chỉ `0/1`; penalty vì vậy luôn không âm.
- `free_travel_time_s` luôn được suy lại, không cho nhập trực tiếp.
- `v_max` phải lấy max trên toàn graph scenario sau mọi override.
- Không cho nhập “weight” tùy ý.
- `edge_overrides` unique theo `edge_id`; duplicate bị reject. Edge phải thuộc
  resolved view. Số override vì vậy bị giới hạn tự nhiên bởi số unique edge của
  view đang chọn.

UI hiển thị ngay:

- `t_free`;
- congestion level và factor;
- từng risk penalty và tổng penalty;
- `weight_distance`, `weight_time`, `weight_balanced`;
- original/current;
- edge đang override trên map và trong legend;
- Reset edge, Reset all, số edge đang chỉnh.

## 4. Các thay đổi contract/schema dự kiến

[`docs/SCHEMA.md`](SCHEMA.md) phải được cập nhật và duyệt trước code.

| Contract | Thay đổi |
|---|---|
| `GraphView` | Enum `full`, `teach_7`, `teach_15`, `teach_25`; `real` chỉ nhận `full` |
| `GraphResponse` nhỏ, response-only | Giữ `GraphFile` persisted nguyên vẹn; response thêm `view_meta={base_graph, graph_view, base_node_count}`. `node_count/edge_count` trong graph meta phản ánh view thực; không biến field view thành required trong `graph_*.json` |
| Graph/traffic API | `GET /api/graph?level=demo&view=teach_7`; `view` vắng mặt mặc định `full`; traffic nhận cùng `view` và chỉ trả edge trong view |
| `EdgeOverride` | `edge_id`, optional `length_m`, `free_speed_kmh`, partial congestion map, partial risk flags; yêu cầu có ít nhất một field |
| `ScenarioConfig` | `graph_view=full`, `edge_overrides=[]`; không có session ID và không persistence |
| `RouteRequest` | Thêm `scenario: ScenarioConfig | null = null`; giữ `include_trace` hiện hành |
| `MultirouteRequest` | Thêm `scenario: ScenarioConfig | null = null` và `include_trace: bool = false`; UI demo gửi `true` khi người dùng bật |
| `AppliedScenario` | Additive field `applied_scenario` (optional/default null để tương thích) ở cả route `Trace` và `MultirouteResponse`; gồm resolved view, override count, canonical fingerprint, provenance |
| `OptimizationTrace` | Envelope chung và union các event Held–Karp/NN/improvement/SA |
| `MultirouteResponse` | Thêm `optimization_trace`; không nhét ATSP steps vào `Trace.trace` |
| Error codes | Thêm `GRAPH_VIEW_UNAVAILABLE`, `EDGE_NOT_FOUND`, `INVALID_EDGE_OVERRIDE` |
| Base data | Không đổi schema hay ghi lại `graph_*.json`/profile; preset nằm trong config riêng |

Bất biến được giữ:

- Mười thuật toán hai điểm vẫn dùng duy nhất một `Trace`.
- Các hàm search nhận `GraphStore`; không cần biết scenario được dựng thế nào.
- Không đưa NetworkX vào runtime.
- `total_time_s` vẫn luôn là tổng balanced weight.
- `scenario` absent, `null` và `{}` có cùng base semantics; current client không
  gửi scenario vẫn chạy như hiện tại. Request mới gửi old backend sẽ 422, nên
  rollout backend trước rồi frontend; rollback frontend trước rồi backend.
- Base cache và JSON bất biến; scenario luôn request-scoped.
- Không có override thì provenance là `base` (view `full`) hoặc `graph_view`
  (view `teach_*`), không được gọi `sandbox_override`.
- `include_trace=false` không được đổi RNG hay các semantic field deterministic
  đã liệt kê ở C2; `runtime_ms` và trace/counter payload không thuộc equality gate.

### 4.1. Canonical scenario fingerprint

Server là authority duy nhất sinh fingerprint; frontend chỉ hiển thị/đối chiếu
giá trị echo, không tự tạo một thuật toán hash khác.

- Format versioned rõ ràng: `scenario-v1:<sha256-hex>`.
- Input gồm graph level; base graph id/name và `created`; profile `created` và
  `source`; resolved graph view; toàn bộ override **đã validate và thực sự apply**.
- Override sort theo `edge_id`; key slot/risk theo thứ tự canonical. Serialize
  JSON UTF-8 với sorted keys, compact separators và cấm NaN/Infinity.
- Loại `include_trace`, UI state và request ordering khỏi input.
- Hai request khác thứ tự nhưng cùng semantic scenario phải cùng fingerprint.
  Fingerprint phải đổi nếu base graph/profile/view hoặc applied value thay đổi.

## 5. Kế hoạch file-by-file

### 5.1. Nội dung report/data/algorithm

Mục c của report sẽ có bốn tiểu mục:

1. State-space model: node, start, goal, action `u→v`, transition, goal test.
2. Representation:

   - Node: `id`, `name`, `lat`, `lon`, `type`.
   - Edge: `id`, `u`, `v`, `name`, `length_m`, `highway`, `oneway`,
     `free_speed_kmh`, `free_travel_time_s`, bốn risk flags.
   - `adj[u]` lưu cạnh đi ra; `radj[v]` lưu cùng cạnh theo chiều truy ngược.
   - Đường hai chiều là hai edge riêng. `oneway=false` yêu cầu reverse twin,
     nhưng hai chiều vẫn có thể có cost khác nhau.

3. Path và graph layers:

   - Path `P=(v0,…,vk)` hợp lệ khi `(vi,vi+1)∈E`.
   - `cost(P)=Σw(vi,vi+1)`.
   - `G_real` là mạng OSM; `G_demo` là 51 POI nối bằng các hành lang có hướng
     được co từ đường trong `G_real`.
   - Mỗi chiều corridor được tính riêng, không xuyên qua POI thứ ba.

4. ATSP: do `c(a,b)≠c(b,a)`, tối ưu thứ tự là ATSP, không phải TSP đối xứng.

Bốn artifact minh họa:

- Pipeline OSM/POI/risk/TomTom → graph/profile → GraphStore → search/TSP →
  API → UI.
- Hình schema node-edge có `u`, `v`, `adj`, `radj`.
- Graph con bảy node quanh Chợ Bến Thành.
- Bảng field node/edge, type, unit, provenance và consumer.

Bảng provenance dự kiến:

> **Superseded wording note 2026-08-07:** bảng dưới giữ nguyên ngôn ngữ đề xuất
> của kế hoạch 2026-08-04. Khi viết deliverable hiện hành, phải gọi topology,
> tọa độ và tag là **OSM-derived từ raw GraphML local**, không phải ground truth
> được live re-query; `oneway` public của G_real là reverse-pair semantics sau
> dedup, không phải raw OSM tag. Raw TomTom local kiểm được payload/derivation
> nhưng không chứng minh tính đại diện ngoài đời.

| Hạng mục | Phân loại đúng | Diễn giải report |
|---|---|---|
| Topology đường | Nguồn thực tế | OSM/OSMnx, SCC mạng `drive` |
| Tọa độ node `G_real` | Nguồn thực tế | Tọa độ node OSM |
| POI và tọa độ ban đầu | Nhóm đặt thủ công | 51 địa danh thật, tọa độ gần đúng do nhóm chọn |
| Tọa độ node `G_demo` | Suy ra | POI được snap vào node `G_real` |
| Tên đường/highway | Nguồn thực tế | Tag OSM; corridor demo kế thừa/tổng hợp |
| `oneway` `G_real` | Nguồn thực tế | Semantics hướng từ OSM |
| Hướng corridor `G_demo` | Suy ra | Khả năng đi theo từng chiều trong `G_real` |
| `length_m` | Suy ra từ nguồn thực tế | `G_real` từ geometry; `G_demo` là tổng corridor |
| `free_speed_kmh` | Giả định của nhóm | Bảng theo highway, không phải tốc độ pháp lý |
| `free_travel_time_s` | Suy ra | `length/(speed/3.6)` |
| Congestion bốn slot hiện hành | Nguồn hỗn hợp | TomTom trên các cạnh trục chính được gán; synthetic fallback cho phần còn lại |
| Raw TomTom | Nguồn thực tế đã tích hợp có giới hạn | Đủ 07:30, 12:00, 17:30 và 22:00 trên hai ngày thứ Hai; không phải chuỗi cùng ngày, không phủ toàn graph, raw phải vào Data ZIP |
| Flood/construction | Nhóm đặt thủ công | 8 vùng; cả 8 URL còn TODO |
| Narrow alley | Suy ra từ OSM | Từ nhóm highway; bị hạn chế bởi `network_type=drive` |
| Traffic light | Suy ra từ OSM | Edge kết thúc tại node `traffic_signals` |
| Corridor `G_demo` | Suy ra | Co đường có hướng từ `G_real`, aggregate thuộc tính/risk/profile |

Mục trọng số sẽ ghi:

- `length_m`: mét.
- `free_speed_kmh`: km/h, giả định free-flow.
- `t_free`: giây.
- `f_cong`: không đơn vị, từ 1 đến 2,5 khi congestion từ 1 đến 5.
- Risk flag: `0/1`; penalty: giây.
- `distance` dùng mét; `time` và `balanced` dùng giây, nên không có phép cộng
  mét với giây.
- `total_time_s` của response vẫn là balanced sum để các tuyến ở các mode khác
  nhau so sánh được.
- Trọng số dương/không âm khi length và speed dương, congestion ≥1,
  `gamma≥0`, risk/penalty không âm.
- Heuristic giữ admissible/consistent khi `length_m≥ceil_dm(haversine)` và
  `v_max` là max toàn scenario.

Đặc tả thuật toán dùng ký hiệu `V`, `E`, branching factor `b`, depth nghiệm `d`,
số điểm ATSP `n`, SA iterations `I`, seed count `S`, số local-search pass `P`.

| Thuật toán | Priority | Complexity cần trình bày | Guarantee/cap hiện hành |
|---|---|---|---|
| BFS | FIFO | `O(V+E)`, space `O(V)` | Complete trên graph hữu hạn; chỉ tối ưu số cạnh, không weighted cost |
| DFS | LIFO | `O(V+E)`, space `O(V)` | Complete với closed set trên graph hữu hạn; không optimal |
| IDDFS | depth limit tăng dần | Tổng quát `O(b^d)` | Chỉ complete nếu nghiệm không sâu hơn cap 100; không tối ưu weighted cost |
| UCS | nhỏ nhất `g` | `O((V+E)logV)` | Complete/optimal với trọng số không âm |
| Dijkstra | nhỏ nhất `g` | `O((V+E)logV)` | Như UCS; khác chủ yếu về cách trình bày/mục đích |
| A* | nhỏ nhất `f=g+h` | Worst-case có thể xét toàn graph | Optimal nhờ heuristic admissible/consistent, không nhờ benchmark |
| Greedy | nhỏ nhất `h` | `O((V+E)logV)` | Complete trên graph hữu hạn hiện hành; không optimal dù `h` admissible |
| Bidirectional Dijkstra | hai heap `g` | Worst-case như Dijkstra | Optimal với weight không âm, dùng `radj`, dừng `top_f+top_b≥mu` |
| IDA* | threshold trên `f` | Time tổng quát `O(b^d)`; space implementation `O(V+Q)` do `best_g`, `parent`, `h_of` và pending explicit stack `Q` | Biên `C*+epsilon` nếu kết thúc trước cap; epsilon 5 m ở distance, 5 s ở time/balanced; cap 1.000 rounds |
| Beam | giữ `k` tốt nhất/layer | Khoảng `O(bkd)` | Không complete, không optimal; `k=5` demo, `50` real |
| Held–Karp | DP subset/mask | `O(n²2ⁿ)`, space `O(n2ⁿ)` | Global optimum; tối đa 15 điểm tổng |
| NN + 2-opt/Or-opt | nearest rồi local moves | NN `O(n² log n)` do sort mỗi vòng; local `O(Pn³)` = `Θ(n²)` candidate/pass × `Θ(n)` full re-cost | Heuristic; asymmetric-safe; có thể dừng ở local optimum |
| SA | temperature/iteration | `O(SIn)` | Seed 0–4, 2.000 iteration/seed; không bảo đảm global optimum |

Phần heuristic sẽ đưa chứng minh thật từ `HEURISTIC-PROOF.md`: haversine lower
bound, bất đẳng thức tam giác, edge lower bound, distance/time/balanced,
consistent ⇒ admissible, `gamma≥0`, congestion ≥1, penalty ≥0, graph-wide
`v_max`, và lý do `ceil_dm`.

Phần local/global optimum đặt riêng trong mục h. Không dùng thuật ngữ local
optimum cho BFS/Dijkstra/A*. Held–Karp là global; 2-opt/Or-opt dừng khi không có
move cục bộ tốt hơn; SA chấp nhận bước xấu theo xác suất nhưng vẫn không có chứng
minh global.

Bảng benchmark hiện chỉ là placeholder:

| Graph/date/profile source | Mode/slot | OD set | Algorithm/params | Seed | Command/commit | Result |
|---|---|---|---|---|---|---|
| `[CHỜ FINAL]` | `[CHỜ]` | `[CHỜ]` | `[CHỜ]` | `[CHỜ]` | `[CHỜ]` | Không lấy từ `results/` cũ |

### 5.2. File và consumer

| File | Thay đổi/model/signature | Consumer | Test |
|---|---|---|---|
| `docs/SCHEMA.md` | Khóa toàn bộ contract ở mục 4 | Backend, frontend, report | Schema review + model tests |
| `docs/DESIGN.md` | Bổ sung graph-view, ATSP timeline, scenario drawer, reduced-motion và token override | Frontend components/colors | Browser visual QA |
| `report/BaoCao-Khung.md` | Viết lại c/d/e/g/h theo blueprint trên | Báo cáo cuối, video | Link/heading/table/placeholder audit |
| `data/DATA.md` | Bảng provenance; trạng thái TomTom; mô tả đúng luật risk/corridor | Report, validator | Đối chiếu JSON + validator |
| `docs/HEURISTIC-PROOF.md` | Thêm bổ đề scenario override và recompute `v_max` | A*/IDA*/sandbox docs | Edge override proof tests |
| `docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md` | Đồng bộ trace mới, local/global và terminology | Role C, report h | Link/code-constant audit |
| `scripts/gen_teaching_doc.py` | Sinh đủ template và ATSP trace example; không chạy ngay | Generated guide/report appendix | Artifact-generation tests |
| `docs/GIAI-THICH-THUAT-TOAN.md` | Chỉ regenerate qua script ở giai đoạn cuối | Nhóm học/video | Generated marker + reproducibility |
| `report/figures/*` | Pipeline, node-edge schema, graph bảy node; lưu source diagram cùng SVG | Report/PDF | Render/visual inspection |
| `data/teaching_graph_presets.json` mới | Danh sách nested preset/node IDs | Scenario builder, validator | Exact count/SCC/subset |
| `scripts/validate_data.py` | Thêm preset existence, induced edge và SCC checks | Data gate | `validate_data.py` |
| `backend/app/models.py` | `GraphView`, override/scenario, applied scenario, optimization event union | FastAPI/OpenAPI/frontend types | `test_schema.py` |
| `backend/app/scenario.py` mới | `build_scenario_store(base, config)` và canonical fingerprint | `main.py`, route/multiroute | `test_scenario.py` mới |
| `backend/app/costs.py` | Chuẩn hóa cost breakdown và physical minimum helper | Scenario validation/tests | `test_costs.py` |
| `backend/app/graph_store.py` | Base cache vẫn immutable; hỗ trợ dựng store từ graph/profile đã lọc | Search, TSP, explain | Scenario immutability tests |
| `backend/app/search.py` | Không đổi public signature/Trace semantics | Route API | Chạy regression đủ sáu thuật toán |
| `backend/app/search_advanced.py` | Không đổi public signature; chỉ regression với scenario store | Route API | Đủ bốn thuật toán |
| `backend/app/tsp.py` | `solve_multiroute(..., include_trace=False)`; internal recorder optional, tuple kết quả lõi giữ nguyên | Multiroute API | Trace/result-equivalence tests |
| `backend/app/explain.py` | Explanation nhận provenance scenario và dùng store đã override | Drawer giải thích | Explanation sandbox tests |
| `backend/app/main.py` | `graph_payload(level, view)`; dựng scenario store cho route/multiroute | API client | `test_api.py` |
| `backend/tests/test_schema.py` | Positive/negative payload và event union | Models | pytest |
| `backend/tests/test_data.py` | Preset/subgraph membership | Validator | pytest |
| `backend/tests/test_scenario.py` mới | Haversine, weights, `v_max`, immutability, fingerprint | Scenario builder | pytest |
| `backend/tests/test_tsp.py` | Trace từng method, cap/sampling, trace true/false equality | TSP | pytest |
| `backend/tests/test_api.py` | View mismatch, override errors, response echo, unreachable view | API | pytest |
| `frontend/lib/types.ts` | Mirror contract mới | Mọi component | TypeScript |
| `frontend/lib/api.ts` | Query `view`, request `scenario/include_trace` | Store | Request-shape tests |
| `frontend/lib/store.ts` | `graphView`, overrides, selected edge, timeline source; invalidation tập trung | Toàn UI | Pure-state tests |
| `frontend/lib/scenario.ts` mới | Normalize, validate và preview formulas | Editor | Node tests + backend parity fixtures |
| `frontend/components/control-panel.tsx` | Preset selector, full reset, compact sandbox controls | Store | Browser/keyboard |
| `frontend/components/map-view.tsx` | Pickable edge khi edit mode, override layer, intermediate ATSP order | Timeline/editor | Browser/map QA |
| `frontend/components/timeline.tsx` | Discriminated route/ATSP timeline | Map, drawer | Event formatting tests |
| `frontend/lib/use-animation.ts` | Giữ route animation; tách source rõ | Timeline/map | Regression |
| `frontend/lib/use-atsp-animation.ts` mới | State diễn tiến tour/DP/SA | Map, ATSP trace panel | Unit tests |
| `frontend/components/atsp/atsp-trace.tsx` mới | Method-specific trace detail | Drawer | Render/state tests |
| `frontend/components/atsp/*.tsx` | Setup gửi trace; result phân biệt final legs/optimizer trace | Drawer | TypeScript/browser |
| `frontend/components/drawer/drawer.tsx` | Thêm tab “Thử nghiệm” | Editor | Focus/responsive QA |
| `frontend/components/drawer/scenario-tab.tsx` mới | Form original/current/breakdown/reset | Store | Validation/browser |
| `frontend/components/legend.tsx` | Legend optimization order và sandbox edge | Map | Light/dark visual QA |
| `frontend/lib/colors.ts`, `app/globals.css`, `tailwind.config.ts` | Token semantic cho override, không hard-code | Map/editor | Contrast + theme QA |
| `frontend/tests/*.test.mjs` | Scenario invalidation, request normalization, ATSP event formatting | Frontend logic | `npm test` |

## 6. Kế hoạch chia milestone nhỏ

### Prerequisite regression trước feature

Prompt triển khai tiếp theo phải giữ xanh các baseline vừa sửa, trước khi thêm
contract/feature mới:

- epsilon hữu hạn và >0;
- OpenAPI typed `GraphFile`/`ErrorResponse`;
- experiment 6 parse JSON và bulk benchmark partial semantics;
- BiDijkstra tính cả hai endpoint trong initial `max_frontier`;
- route `start==goal` dùng đúng đơn vị theo mode;
- same-slot no-op và traffic không lẫn slot/stale response;
- route hai điểm loại trừ stops và endpoint/stop unique;
- step legend dựa trên effective trace;
- ATSP savings dương/âm/zero dùng copy và tone sign-aware.

### Milestone 1 — Report/data/algorithm specification

- Cập nhật `SCHEMA.md` và `DESIGN.md` ở mức contract đã duyệt.
- Viết phần lý thuyết ổn định, provenance, heuristic proof và benchmark protocol.
- Khóa template 15 mục cho đủ 13 thuật toán.
- Chưa chạy generator và chưa đưa số benchmark.
- Exit: review không còn phát biểu sai về complete/optimal/unit/source.

### Milestone 2 — Reduced teaching graph

- Tạo preset 7/15/25/51 và validator.
- Backend graph/traffic/route/multiroute cùng `graph_view`.
- Frontend selector, full reset và invalidation.
- Exit: mọi path/order/leg chỉ dùng node trong view; presets strongly connected.

### Milestone 3 — ATSP trace

- Thêm contract, recorder và trace cho ba method.
- Xây timeline/panel/map state trung gian.
- Exit: trace on/off cho kết quả giống hệt; SA deterministic; payload không vượt
  cap.

### Milestone 4 — Edge-override sandbox

- Dựng scenario service và validation.
- Frontend edge picking/editor/reset/provenance.
- Route, compare và multiroute đều gửi scenario.
- Exit: base cache/JSON không đổi; reset trả đúng kết quả base; heuristic vẫn hợp
  lệ.

### Milestone 5 — Integration, browser QA và đồng bộ tài liệu

- Full backend/frontend/data gates.
- Browser QA 1366×768, light/dark, keyboard và reduced motion.
- Đồng bộ report/API screenshots/video script.
- Data refresh 4/4 và rebuild/validate đã hoàn tất. Sau khi code ổn định và được
  cho phép riêng: chạy benchmark → hiệu chuẩn γ → generator theo dependency chain.
- Không tự commit/push.

## 7. Ma trận test/verification

| Lớp | Kiểm tra chính | Gate |
|---|---|---|
| Models/schema | Strict enum, event union, invalid override, view/graph compatibility | Targeted pytest |
| Baseline repair | Finite epsilon, typed OpenAPI/error, exp6 JSON/partial, BiDijkstra frontier, trivial units | Targeted pytest + full backend suite |
| Preset graph | Exact node count, induced edges, hướng cạnh, SCC, no hidden path | `test_data`, `test_scenario`, validator |
| Search | Đủ 10 thuật toán trên mỗi preset; cap trace không đổi metrics | Search suites |
| ATSP | Event semantics, cap/sampling, result equality trace on/off, seed deterministic | `test_tsp.py` |
| Override | Haversine floor, speed/range, risk, congestion, recompute `v_max`, original immutable | `test_costs`, `test_scenario` |
| API | Graph/traffic/view alignment, route/multi scenario echo, error envelope | `test_api.py` |
| Frontend logic | Baseline slot/traffic, route-vs-stops, uniqueness, effective legend, sign-aware savings; sau đó request payload, invalidation, formula parity, timeline event selection | `npm test` |
| Type safety | Mọi union event được xử lý exhaustively | `npx tsc --noEmit` |
| Data | Base graph/profile và preset guards | `scripts/validate_data.py` |
| Browser 1366×768 | Preset/full reset; route/multiroute; edge edit/reset; no hidden node | Manual runtime QA |
| Accessibility | Keyboard/focus, aria, light/dark, reduced motion | Browser QA |
| ATSP visual | Play/pause/step/speed; optimizer trace khác final legs | Browser QA cả ba method |
| Sandbox visual | Edge pick, original/current, marker, reset edge/all, refresh reset | Browser QA |
| Report | Diagram render, bảng không vỡ, links, headings, placeholder/stale-number scan | Structural + rendered QA |
| Final regression | Backend full suite, validator, frontend tests, tsc | Tất cả exit 0 |
| Repository | `git diff --check`, review diff, `git status --short` | Không có file ngoài scope |

Lệnh tối thiểu sau triển khai:

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -v
.venv\Scripts\python.exe scripts\validate_data.py

Set-Location frontend
npm test
npx tsc --noEmit
```

Không chạy `npm run build` nếu Next dev server đang hoạt động. Benchmark và
generator vẫn cần ủy quyền riêng.

## 8. Phân công gợi ý cho vai trò A–E

| Vai trò hiện có | Phần chính | Review chéo |
|---|---|---|
| A — Data Engineer | Provenance, preset node sets, validator, diagrams pipeline, duy trì snapshot TomTom 4/4 đã chốt | B review semantics graph; E review report |
| B — Core Search | Scenario builder, `GraphStore`, cost breakdown, sáu thuật toán lõi và heuristic proof | A review data assumptions; C review guarantees |
| C — Advanced + TSP | ATSP recorder, bốn thuật toán nâng cao, ba ATSP, local/global optimum | B review search semantics; D review event usability |
| D — Frontend | Preset selector, ATSP player, edge editor, map layers, responsive/reduced-motion QA | E review contract; C review trace display |
| E — API + Eval + Report | `SCHEMA.md`, FastAPI integration, error contract, report assembly, test matrix, final benchmark protocol | Toàn nhóm ký xác nhận provenance/guarantee |

Điểm đồng bộ bắt buộc:

- A + B duyệt graph view và physical constraints.
- B + C duyệt mọi câu complete/optimal.
- C + D duyệt nghĩa từng ATSP event.
- D + E duyệt payload TypeScript/OpenAPI.
- E chỉ đưa số vào report sau khi A xác nhận dependency chain dữ liệu cuối.

## 9. Bốn quyết định cần duyệt và một quyết định đã chốt

| # | Quyết định | Trạng thái | Khuyến nghị đủ để duyệt | Trade-off |
|---:|---|---|---|---|
| 1 | Cách chọn số node demo | **ĐÃ TRIỂN KHAI M2 · SAU ĐÓ ĐƯỢC MỞ RỘNG** | Quyết định ban đầu là preset 7/15/25/51; current implementation dùng UI 3…51, API `teach_3`…`teach_50` và `full` ở 51; real chỉ `full` | Mọi prefix vẫn nested, strong-connected; ba mốc 7/15/25 được giữ làm checkpoint hồi quy |
| 2 | Nơi giữ edge override | **ĐÃ DUYỆT · ĐÃ TRIỂN KHAI M4** | Frontend memory + `scenario` optional request-scoped; backend rollout trước, duplicate/non-finite/out-of-view reject, base bất biến | Payload lớn hơn chút, đổi lại stateless, refresh reset và không cần backend session |
| 3 | ATSP trace policy | **ĐÃ DUYỆT · ĐÃ TRIỂN KHAI M3** | Cap HK/NN/SA = **2.000/2.000/1.500**, SA periodic mỗi 20 iteration; priority/stride deterministic, reserve final, cap không dừng optimizer | Payload có sampling với bài lớn, nhưng kết quả và final summary vẫn đầy đủ |
| 4 | Provenance scenario trong response | **ĐÃ DUYỆT · ĐÃ TRIỂN KHAI M2/M4** | Additive `AppliedScenario` + server-generated `scenario-v1` SHA-256 fingerprint trong route và multiroute | Contract rộng hơn, nhưng chứng minh được UI và backend chạy cùng scenario |
| 5 | Dữ liệu TomTom cuối | **ĐÃ CHỐT** | Giữ 4/4 snapshot đại diện trên hai ngày thứ Hai; profile `tomtom+synthetic`, `G_demo` 51/298 đã validate; benchmark/hiệu chuẩn γ/generator vẫn hoãn đến khi code ổn định | Không còn là quyết định mở; phải công bố giới hạn và đóng gói raw trong Data ZIP |

Các quyết định trên đã được duyệt và triển khai theo thứ tự schema → backend →
frontend; riêng quyết định 1 đã được mở rộng như ghi ở bảng. Milestone 5 đã hoàn tất integration/runtime QA ở checkpoint 2026-08-05; bước tiếp theo
là chuẩn bị submission và chỉ chạy benchmark/hiệu chuẩn γ/generator trong một
lượt riêng có ủy quyền.
