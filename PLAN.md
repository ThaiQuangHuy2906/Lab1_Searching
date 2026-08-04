# PLAN — Triển khai nhiệm vụ sau buổi họp nhóm

> Dành cho: Codex 5.6 Terra hoặc agent triển khai tương đương.
>
> Base commit đã kiểm tra: `838597a355c4147a6a203a3d9ac9fcbf13b871ab`
> trên branch `main`, ngày 2026-08-04.
>
> Trạng thái quyết định: người dùng đã **DUYỆT CẢ BỐN** quyết định GraphView,
> request-scoped edge override, ATSP optimization trace và
> `AppliedScenario`/fingerprint.
>
> **Checkpoint hiện hành — 2026-08-05:** Milestone 1 (specification), 2
> (GraphView), 3 (ATSP optimization trace), 4 (edge-override sandbox) và 5
> (integration/runtime/browser QA) đã hoàn tất trong worktree hiện hành. Fresh core
> gates đạt: backend `148 passed` (1 dependency deprecation warning), validator
> `ALL DATA VALID`, frontend `19/19`, TypeScript pass. Browser QA 1366×768 đã xác
> nhận các luồng theme, offline, route/trace, GraphView và fingerprint; các giới hạn
> pre-flight trước demo/quay vẫn phải được kiểm tra lại trên service sạch.
>
> PLAN này đã hoàn tất đến Milestone 5. Không tự chạy benchmark, hiệu chuẩn γ,
> teaching generator hoặc đóng gói submission nếu chưa có ủy quyền riêng.
>
> Tài liệu này là execution plan đã khóa. Không tạo thêm một kế hoạch tổng quát
> khác và không audit lại toàn repository. Trước mỗi milestone chỉ xác minh
> nhanh những facts trực tiếp liên quan vì code có thể đã thay đổi.

## 0. Cách dùng plan

Agent triển khai phải:

1. đọc `AGENTS.md`, `PLAN.md` và source-of-truth liên quan;
2. chạy `git status --short` trước khi sửa;
3. bảo vệ mọi thay đổi hiện hữu nếu worktree không còn sạch;
4. làm theo thứ tự schema trước producer/consumer;
5. thêm regression nhỏ nhất trước hoặc cùng root-cause change;
6. chạy targeted test trước full gate;
7. dừng đúng checkpoint được ghi trong từng milestone;
8. báo lệnh thật và kết quả thật, không suy đoán PASS;
9. không commit hoặc push nếu chưa được người dùng cho phép riêng.

Không được đổi identifier, field, default, cap hoặc semantics đã khóa trong plan
này chỉ vì một cách khác “đẹp hơn”. Nếu current code làm một yêu cầu trong plan
không thể thực hiện an toàn, dừng tại đúng blocker, đưa evidence file/symbol và
đề xuất thay đổi nhỏ nhất.

## 1. Outcome và phạm vi

### 1.1. Outcome bắt buộc

Hoàn thành bốn nhóm kết quả:

1. report/specification giải thích đúng graph, data, cost, 10 thuật toán search,
   3 phương pháp ATSP, heuristic và local/global optimum;
2. graph dạy học backend thật sự chạy trên preset 7/15/25 node;
3. ATSP optimization trace riêng, có player từng bước;
4. sandbox chỉnh edge request-scoped, không sửa base data, có provenance và
   fingerprint do server sinh.

Khi người dùng không chọn view dạy học, không bật trace ATSP và không gửi
scenario, hành vi hiện tại phải được giữ nguyên.

### 1.2. Ngoài phạm vi

Không làm trong lượt triển khai này:

- thu thêm TomTom hoặc gọi crawler;
- rebuild `graph_*.json`, traffic profile, corridor hoặc preview;
- chạy benchmark, gamma calibration hoặc teaching generator;
- hand-edit `docs/GIAI-THICH-THUAT-TOAN.md`;
- thay số `SỐ TẠM` bằng số chính thức;
- bịa tám URL nguồn manual risk;
- thêm backend session, database hoặc persistence cho sandbox;
- cho nhập raw “weight”;
- đưa NetworkX vào product runtime;
- đổi cost constants, seed, thuật toán search hoặc data snapshot;
- chạy `npm run build`;
- commit, push, branch, merge hoặc rebase.

### 1.3. Trạng thái dữ liệu bất biến

| Artifact | Current truth |
|---|---|
| G_demo | created 2026-08-03; 51 node; 298 directed edge; 60 one-way |
| G_real | created 2026-07-27; 2.118 node; 4.699 directed edge; 1.433 one-way |
| Profiles | created 2026-08-03; `tomtom+synthetic`; đủ bốn slot |
| TomTom | 40 sample/slot; 635/4.699 cạnh G_real nhận mức TomTom/slot |
| Fallback | 4.064 cạnh G_real/slot dùng deterministic synthetic seed 42 |
| G_demo traffic | kế thừa bằng corridor weighted mean |
| Data chain | `03b real → 04 → 03b demo → validate_data` đã hoàn tất |
| Results | synthetic 2026-07-26, vẫn là `SỐ TẠM` |
| Manual risk | metadata luật cạnh đi vào vùng đã đúng; tám `source_url` vẫn TODO |

Raw TomTom bị Git ignore và chỉ được đưa vào Data ZIP cuối, không đưa vào commit
source.

## 2. Source-of-truth và thứ tự đọc

Đọc theo `AGENTS.md`:

1. `docs/Lab 1 - Searching.pdf`
2. `docs/Lab1-ChotPhuongAn.md`
3. `PROMPT-MASTER.md` — lịch sử thi công
4. `docs/SCHEMA.md` — contract intended
5. `docs/CODEX-CODEBASE-MAP.md`
6. `docs/CODEX-BASELINE.md` — snapshot lịch sử
7. `docs/AUDIT-CLAUDE-PRE-SUBMISSION.md` — audit lịch sử

Sau đó đọc trực tiếp:

- `backend/app/models.py`, `graph_store.py`, `costs.py`, `main.py`, `tsp.py`;
- `backend/app/search.py`, `search_advanced.py`, `explain.py`;
- backend tests liên quan;
- `frontend/lib/types.ts`, `api.ts`, `store.ts`, `interaction-policy.ts`;
- `frontend/components/control-panel.tsx`, `map-view.tsx`, `timeline.tsx`;
- `frontend/lib/use-animation.ts` và ATSP/drawer components;
- `data/DATA.md`, `docs/HEURISTIC-PROOF.md`, `docs/DESIGN.md`;
- `report/BaoCao-Khung.md`;
- `scripts/gen_teaching_doc.py`.

Quyền ưu tiên khi có mâu thuẫn:

`assignment/settled choice → docs/SCHEMA.md → executable model → current
code/data + fresh check → tests → historical docs`.

`PLAN.md` khóa các quyết định mới đã được người dùng duyệt; `docs/SCHEMA.md`
phải được cập nhật theo plan trước khi code public contract thay đổi.

## 3. Bốn quyết định đã khóa

| # | Quyết định | Giá trị canonical |
|---:|---|---|
| 1 | Graph dạy học | `full`, `teach_7`, `teach_15`, `teach_25`; absent=`full`; G_real chỉ nhận `full` |
| 2 | Edge override | frontend memory; gửi đầy đủ trong mỗi request; backend request-scoped; không session |
| 3 | ATSP trace | cap Held–Karp 2.000, NN/local 2.000, SA 1.500; sampling deterministic; SA periodic 20 |
| 4 | Scenario provenance | response echo `AppliedScenario`; server sinh `scenario-v1:<sha256>` |

Các tên trên là duy nhất. UI label của `full` có thể là
“Toàn bộ G_demo — 51 node”.

## 4. Contract-readiness gate

### 4.1. Evidence ledger

| Claim | Evidence | Status |
|---|---|---|
| Persisted graph hiện dùng `GraphFile` strict | `backend/app/models.py::GraphFile` | STATIC |
| Base store được cache và search/TSP nhận `GraphStore` | `backend/app/graph_store.py` | STATIC |
| Route request chưa có scenario | `RouteRequest` | STATIC |
| Multiroute chưa có scenario/include trace | `MultirouteRequest` | STATIC |
| ATSP solver hiện trả final order/legs, không có optimizer trace | `backend/app/tsp.py` | STATIC |
| Frontend dùng structural TypeScript types, không runtime-parse response | `frontend/lib/api.ts` | STATIC |
| Người dùng duyệt cả bốn quyết định | conversation 2026-08-04 | USER-STATED |
| Baseline trước feature | 111 backend test; 8 frontend test; validator và tsc pass | OBSERVED tại base commit |
| External strict JSON consumers ngoài repo | không có inventory bên ngoài | UNVERIFIED |

### 4.2. Compatibility matrix

| Writer/client | Reader/backend | Kết quả yêu cầu |
|---|---|---|
| Old frontend | Old backend | hành vi hiện tại |
| Old frontend | New backend | PASS: query không có view; request không có scenario; additive response bị bỏ qua |
| New frontend | New backend | PASS: full contract mới |
| New frontend | Old backend | KHÔNG hỗ trợ rollout; POST có scenario bị 422; GET query `view` có thể bị old FastAPI bỏ qua |

Để ngăn trường hợp new frontend nói `teach_7` nhưng old backend trả full graph:

- new frontend bắt buộc kiểm `GraphResponse.view_meta.graph_view`;
- traffic bắt buộc echo `graph_view`;
- thiếu echo hoặc echo khác request phải thành client-side contract error;
- không silent fallback sang full.

Rollout bắt buộc: **backend trước, frontend sau**.

Rollback bắt buộc: **frontend trước, backend sau**.

Không có migration/backfill hoặc rewrite dữ liệu lịch sử. Thay đổi là additive
API contract và config preset mới. Rủi ro external strict consumer là
`UNVERIFIED`, nhưng repository không có consumer như vậy.

**Contract readiness verdict: READY.**

## 5. Canonical contract phải ghi vào SCHEMA

Các shape dưới đây là semantics bắt buộc. Tên class có thể điều chỉnh tối thiểu
theo style repository, nhưng JSON field và default không được đổi.

### 5.1. Graph view

```text
GraphView = "full" | "teach_7" | "teach_15" | "teach_25"
```

Rules:

- GET graph/traffic nhận query `view: GraphView = "full"`;
- route/multiroute resolve view qua `scenario.graph_view`;
- `scenario` absent/null/empty đồng nghĩa `full` + không override;
- G_real + `teach_*` → 422 `GRAPH_VIEW_UNAVAILABLE`;
- unknown enum → 422 `VALIDATION_ERROR`;
- không fallback im lặng;
- graph, traffic, route, compare và multiroute phải resolve cùng view;
- node ngoài view được xử lý như node không tồn tại cho request đó;
- mọi `path`, `order`, `leg.path` chỉ chứa node trong resolved view.

### 5.2. Persisted graph và API graph response

Không thêm field view vào persisted `graph_demo.json` hoặc `graph_real.json`.

Thêm response-only model:

```text
GraphViewMeta
  base_graph: "demo" | "real"
  graph_view: GraphView
  base_node_count: int >= 1

GraphResponse extends GraphFile
  view_meta: GraphViewMeta
```

`GraphResponse.meta.node_count`, `edge_count`, `bbox` và `name` phản ánh view
thật. `created`, `directed`, `crs` giữ từ base graph. `view_meta.base_node_count`
là 51 cho demo và 2.118 cho real.

Traffic response thêm:

```text
graph_view: GraphView = "full"
```

API luôn set echo thật; default chỉ để model/direct fixture cũ tương thích.

### 5.3. Preset config

Tạo `data/teaching_graph_presets.json`:

```json
{
  "version": 1,
  "base_graph": "G_demo",
  "base_created": "2026-08-03",
  "views": {
    "teach_7":  {"node_ids": ["..."], "expected_edge_count": 24},
    "teach_15": {"node_ids": ["..."], "expected_edge_count": 62},
    "teach_25": {"node_ids": ["..."], "expected_edge_count": 114}
  }
}
```

Exact node IDs đã kiểm tra trên snapshot hiện hành:

```text
teach_7 =
  n0018 n0019 n0020 n0022 n0028 n0037 n0038

teach_15 =
  n0005 n0018 n0019 n0020 n0021 n0022 n0023 n0025
  n0028 n0029 n0030 n0036 n0037 n0038 n0040

teach_25 =
  n0002 n0004 n0005 n0007 n0016 n0017 n0018 n0019
  n0020 n0021 n0022 n0023 n0025 n0026 n0028 n0029
  n0030 n0035 n0036 n0037 n0038 n0039 n0040 n0044 n0045
```

Các tập nested:

```text
teach_7 ⊂ teach_15 ⊂ teach_25 ⊂ full
```

| View | Node | Induced directed edge | SCC |
|---|---:|---:|---|
| `teach_7` | 7 | 24 | yes |
| `teach_15` | 15 | 62 | yes |
| `teach_25` | 25 | 114 | yes |
| `full` | 51 | 298 | yes |

Validator phải kiểm:

- base graph name/created khớp config;
- exact count, không duplicate, node tồn tại;
- nested relation;
- induced edge set đúng, không shortcut, không đổi hướng;
- expected edge count;
- strongly connected bằng traversal xuôi/ngược;
- bảy node `teach_7` khớp source của generator.

### 5.4. Scenario và override

```text
RiskOverride
  flood?: 0 | 1
  construction?: 0 | 1
  narrow_alley?: 0 | 1
  traffic_light?: 0 | 1
  requirement: ít nhất một field

EdgeOverride
  edge_id: EdgeId
  length_m?: finite float > 0
  free_speed_kmh?: finite float in [1, 200]
  congestion?: partial map TimeSlot -> integer [1, 5]
  risk?: RiskOverride
  requirement: ít nhất một editable raw field trước canonicalization

ScenarioConfig
  graph_view: GraphView = "full"
  edge_overrides: list[EdgeOverride] = []
```

Cross-field/runtime validation:

- `edge_id` unique trong request;
- edge phải thuộc resolved view;
- `length_m >= ceil_dm(haversine(u,v))`;
- không NaN/Infinity, không silent clamp;
- bool không được lách qua integer congestion/risk;
- `free_travel_time_s` không nhận từ client, luôn suy lại:
  `round(length_m / (free_speed_kmh / 3.6), 1)`;
- bỏ các field có giá trị đúng bằng base/effective value khi canonicalize;
- nếu toàn override trở thành no-op, semantics là không override;
- `v_max` là max speed của toàn selected scenario graph sau override;
- GraphStore base, cached graph/profile và JSON không được mutate.

Request changes:

```text
RouteRequest
  + scenario: ScenarioConfig | null = null

MultirouteRequest
  + scenario: ScenarioConfig | null = null
  + include_trace: bool = false
```

### 5.5. Applied scenario

```text
ScenarioProvenance = "base" | "graph_view" | "sandbox_override"

AppliedScenario
  graph_view: GraphView
  override_count: int >= 0
  fingerprint: string matching ^scenario-v1:[0-9a-f]{64}$
  provenance: ScenarioProvenance
```

Additive response fields:

```text
Trace.applied_scenario: AppliedScenario | null = null
MultirouteResponse.applied_scenario: AppliedScenario | null = null
```

Endpoint mới luôn set non-null. Default null giữ direct algorithm calls/fixtures
cũ tương thích.

Provenance:

- full + zero effective override → `base`;
- teach view + zero effective override → `graph_view`;
- ít nhất một effective override → `sandbox_override`.

### 5.6. Canonical fingerprint

Server là authority duy nhất. Frontend không tự hash.

Canonical payload trước SHA-256:

```json
{
  "version": "scenario-v1",
  "graph_level": "demo",
  "base_graph": {"name": "G_demo", "created": "2026-08-03"},
  "profile": {"created": "2026-08-03", "source": "tomtom+synthetic"},
  "graph_view": "teach_7",
  "edge_overrides": []
}
```

Rules:

- dùng validated/effective values, không dùng raw request;
- bỏ no-op fields và no-op edge;
- sort override theo `edge_id`;
- slot order canonical: `07:30`, `12:00`, `17:30`, `22:00`;
- risk order canonical:
  `flood`, `construction`, `narrow_alley`, `traffic_light`;
- JSON UTF-8, `sort_keys=True`, `separators=(",", ":")`,
  `allow_nan=False`;
- prefix output `scenario-v1:`;
- exclude request ordering, `include_trace`, UI state, selected edge,
  playback state và runtime;
- cùng semantic scenario → cùng fingerprint;
- fingerprint đổi khi base graph/profile/view/effective value đổi.

### 5.7. ATSP optimization trace

Không đưa event optimizer vào `Trace.trace`. Mười route algorithm tiếp tục dùng
duy nhất contract `TraceStep`.

Common event fields:

```text
ordinal: int >= 0
kind: discriminator literal
```

Event union:

1. `held_karp_update`

   - `mask`, `subset`, `endpoint`, `predecessor`;
   - `candidate_cost`, `previous_cost|null`, `new_cost`.

2. `held_karp_reconstruct`

   - `order`, `total_cost`.

3. `nn_decision`

   - `current`, ordered `candidates[{node,cost}]`, `selected`, `order`.

4. `local_improvement`

   - `move_type: "2_opt" | "or_opt"`;
   - indices/segment length;
   - `before_order`, `after_order`;
   - `before_cost`, `after_cost`;
   - `rejected_candidates_since_previous`.

5. `sa_seed_boundary`

   - `boundary: "start" | "end"`;
   - seed, iteration, temperature;
   - current/best order và cost.

6. `sa_iteration`

   - `sample_reason: "new_best" | "periodic"`;
   - seed, iteration, temperature;
   - current order/cost **trước** decision;
   - candidate order/cost, delta, accepted;
   - resulting order/cost và best-so-far sau decision.

7. `sa_final_best`

   - final order/cost và per-seed stats.

8. `optimization_summary`

   - method, final order/cost;
   - always reserved as last event.

Envelope:

```text
OptimizationTrace
  method: TspMethod
  total_events: int >= 0
  recorded_events: int >= 0
  sampling_policy:
    "all-or-stride-v1"
    | "chronological-prefix-final-v1"
    | "priority-periodic-20-v1"
  trace_truncated: bool
  events: discriminated event list
```

Invariants:

- `recorded_events == len(events)`;
- `recorded_events <= cap`;
- `total_events >= recorded_events`;
- `trace_truncated == (total_events > recorded_events)`;
- summary/final reconstruction không bị mất;
- cap chỉ cắt payload, không cắt solver hoặc metrics;
- recorder không gọi RNG;
- trace true/false giữ nguyên deterministic semantic result.

Add to multiroute response:

```text
optimization_trace: OptimizationTrace | null = null
optimizer_stats: SaOptimizerStats | null = null
```

`optimizer_stats` chỉ non-null cho SA và tồn tại độc lập với trace, để
trace-on/off equality kiểm được seeds/per-seed result.

Sampling policy:

- Held–Karp cap 2.000:
  - tổng điểm `n <= 8`: giữ mọi successful DP update;
  - `n > 8`: streaming stride, không giữ toàn bộ event trong RAM;
  - upper-bound candidate transition với `n >= 3`:
    `(n-1) + (n-1)(n-2)2^(n-3)`;
  - stride = ceil(upper bound / remaining capacity);
  - reserve reconstruction và summary.
- NN/local cap 2.000:
  - eligible event = NN decision + accepted improvement;
  - giữ chronological prefix tới capacity;
  - aggregate rejected candidates;
  - reserve summary.
- SA cap 1.500:
  - eligible = seed start/end, new-best, periodic mỗi 20 iteration, final-best;
  - priority: boundaries/final-best → new-best → periodic;
  - nếu một class vượt capacity, sample đều theo ordinal;
  - reserve summary;
  - không gọi thêm `random()` để quyết định sampling.

### 5.8. Error contract

Mở rộng `ErrorDetail.code`:

- `GRAPH_VIEW_UNAVAILABLE`
- `EDGE_NOT_FOUND`
- `INVALID_EDGE_OVERRIDE`

Status:

| Failure | Status/code |
|---|---|
| G_real + teach view | 422 / `GRAPH_VIEW_UNAVAILABLE` |
| tracked preset missing/corrupt | 500 / `GRAPH_VIEW_UNAVAILABLE`, log detail |
| override edge không thuộc view | 404 / `EDGE_NOT_FOUND` |
| length/speed/congestion/risk/cross-field sai | 422 / `INVALID_EDGE_OVERRIDE` |
| unknown node trong resolved view | 404 / `NODE_NOT_FOUND` |
| invalid enum/shape | 422 / `VALIDATION_ERROR` |
| unexpected internal error | 500 / `INTERNAL`, không leak exception |

Dùng typed exception thay vì dò substring message cho ba lỗi mới.

## 6. Kiến trúc và data flow

```text
Base GraphStore.load(level), cached và bất biến
                  |
                  v
resolve view từ query/scenario
                  |
                  v
View GraphStore (induced nodes/edges/profile)
                  |
          có effective overrides?
             /              \
           no                yes
           |                  |
           v                  v
     dùng view store      clone model + apply + recompute
             \              /
              v            v
          ResolvedScenario(store, applied_scenario)
                         |
             +-----------+-----------+
             |                       |
          route                    multiroute
             |                       |
          Trace                 ATSP result + optimizer trace
             \                       /
              +---- echo fingerprint+
```

`GraphStore` không biết HTTP hoặc frontend. Search algorithms không biết cách
scenario được dựng. `scenario.py` chịu trách nhiệm duy nhất cho view,
override, canonicalization và fingerprint.

## 7. Milestone 0 — Preflight ngắn

### Actions

1. `git status --short`
2. `git rev-parse HEAD`
3. đọc diff nếu worktree dirty;
4. chạy targeted baseline nhỏ để chắc checkout không lệch:

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\test_schema.py backend\tests\test_api.py -q
Set-Location frontend
npm test
npx tsc --noEmit
```

### Abort

Dừng nếu baseline fail do repository hiện hành hoặc source authority mâu thuẫn
với contract đã duyệt. Không sửa unrelated failure chỉ để tiếp tục.

## 8. Milestone 1 — Khóa contract và hoàn thiện specification/report (đã hoàn thành)

Milestone này **chỉ sửa specification/report/source prose**. Chưa triển khai
backend/frontend feature.

### 8.1. `docs/SCHEMA.md`

Viết đầy đủ § mới theo mục 5:

- GraphView/GraphResponse/TrafficResponse;
- RiskOverride/EdgeOverride/ScenarioConfig;
- request changes;
- AppliedScenario/fingerprint;
- OptimizationTrace event union;
- multiroute additive fields;
- error/status table;
- compatibility/rollout rule.

Phải field-by-field rõ required/optional/default/null/unit.

### 8.2. `docs/DESIGN.md`

Khóa UX:

- selector view chỉ hiện preset demo; real chỉ full;
- đổi view clear endpoint/stops/results/timeline/selected edge/overrides;
- same-value view là no-op;
- toggle “Hiện quá trình tối ưu” mặc định off;
- ATSP player dùng timeline hiện có, mặc định paused;
- reduced motion không autoplay/route-flow;
- optimizer conceptual order khác final route legs;
- edge edit chỉ pick edge khi edit mode bật;
- drawer tab “Thử nghiệm” có original/current/formula/reset/provenance;
- refresh reset override;
- semantic tokens cho override, không hard-code màu.

### 8.3. `report/BaoCao-Khung.md`

Hoàn thiện mục c/d/e/g/h:

> **Ranh giới M1:** milestone này khóa khung 13 phương pháp, các phát biểu
> correctness/complexity/provenance và placeholder có nguồn. Nó không tuyên bố
> prose nhóm tự viết, ví dụ chạy tay sau data refresh, screenshot hay report PDF
> cuối đã hoàn thành; các phần đó vẫn là manual final-submission work và phải giữ
> marker `[ĐIỀN]`/`SỐ TẠM` cho đến lượt được ủy quyền.

#### Graph model

- `G=(V,E)` có hướng;
- state/start/goal/action/transition/goal test;
- `adj` và `radj`;
- edge một chiều; đường hai chiều là hai directed edge;
- path hợp lệ và `cost(P)=Σw(e)`;
- G_real/G_demo/corridor contraction;
- ATSP bất đối xứng `c(a,b) != c(b,a)`.

#### Provenance bốn nhóm

| Field | Nhóm |
|---|---|
| topology, G_real coordinate, name/highway/oneway | nguồn thực tế OSM |
| G_demo coordinate/direction/length/corridor, free time, traffic light, narrow alley | suy ra |
| POI ban đầu, free-speed assumption, flood/construction zones | nhóm đặt thủ công |
| uncovered congestion | synthetic deterministic fallback |

Nêu rõ TomTom 4 snapshot trên hai ngày thứ Hai, không real-time, không same-day
series, không phủ toàn graph; tám manual risk URL vẫn TODO.

#### Cost

```text
t_free = length_m / (free_speed_kmh / 3.6)
f_cong = 1 + 1.5 * (congestion - 1) / 4
penalty = 60*flood + 90*construction + 30*narrow_alley + 25*traffic_light
distance = length_m
time = t_free * f_cong
balanced = t_free * f_cong + penalty
```

- distance: mét;
- time/balanced: giây;
- `total_time_s`: luôn balanced sum;
- free speed là giả định, không phải speed limit pháp lý;
- điều kiện non-negative;
- không cộng mét với giây;
- IDA* epsilon 5 m ở distance, 5 s ở time/balanced.

#### Template 13 phương pháp

Mỗi phương pháp có cùng 15 mục:

1. mục đích;
2. trực giác;
3. input/parameters/default;
4. output;
5. cấu trúc dữ liệu;
6. các bước;
7. pseudocode;
8. priority/đại lượng quyết định;
9. time complexity;
10. space complexity;
11. complete và điều kiện;
12. optimal và điều kiện;
13. ưu điểm;
14. nhược điểm/khi dùng;
15. ví dụ chạy tay + so sánh phương pháp gần nhất.

Complexity/guarantee bắt buộc:

| Method | Implementation-faithful statement |
|---|---|
| BFS/DFS | graph traversal `O(V+E)`, space `O(V)` |
| IDDFS | textbook `O(b^d)`; complete chỉ nếu depth nghiệm ≤100 |
| UCS/Dijkstra | `O((V+E)logV)`, optimal với weight không âm |
| A* | worst-case có thể xét toàn graph; optimal nhờ proof |
| Greedy | finite closed-set implementation có thể tìm path; không optimal |
| Bidirectional Dijkstra | worst-case cùng bậc Dijkstra; đúng nhờ `radj` và stop rule |
| IDA* | time thường `O(b^d)`; implementation space `O(V+Q)`; cap 1.000 rounds |
| Beam | khoảng `O(bkd)`; k=5 demo, 50 real; không complete/optimal |
| Held–Karp | `O(n²2ⁿ)`, space `O(n2ⁿ)`, global optimum, n≤15 |
| NN | `O(n²logn)` vì sort mỗi vòng |
| 2-opt/Or-opt | `O(Pn³)` vì Θ(n²) candidate × Θ(n) full re-cost/pass |
| SA | `O(SIn)`; S=5, I=2.000; không guarantee global |

Không dùng benchmark thay proof. Không gọi local optimum cho BFS/Dijkstra/A*.

#### Benchmark protocol

Chỉ thêm placeholder có:

- graph id/created;
- profile created/source;
- view/scenario fingerprint;
- mode/slot;
- OD/stop set;
- algorithm/params;
- seed;
- command;
- commit;
- result placeholder.

Giữ nguyên mọi banner `SỐ TẠM`.

### 8.4. Docs liên quan

- `data/DATA.md`: provenance table và current limitations;
- `docs/HEURISTIC-PROOF.md`: bổ đề scenario vẫn giữ
  `length>=haversine`, speed dương, congestion≥1, penalty≥0 và recomputed v_max;
- `docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md`: terminology trace,
  local/global, caps;
- không sửa generated output;
- chưa làm generator phụ thuộc preset cho tới Milestone 2 có config thật.

### 8.5. Milestone 1 verification

- scan đơn vị epsilon;
- scan stale TomTom/data claim;
- scan complexity/guarantee;
- local Markdown links/headings;
- `git diff --check`;
- review chỉ có docs/report thuộc scope.

### STOP GATE 1

Sau Milestone 1, báo:

- contract fields/default/error/compatibility;
- files đã sửa;
- checks đã chạy;
- unresolved wording nếu có.

**DỪNG và chờ người dùng duyệt `docs/SCHEMA.md` trước code.**

## 9. Milestone 2 — GraphView end-to-end (đã hoàn thành)

Chỉ bắt đầu khi STOP GATE 1 được duyệt.

### 9.1. Regression-first

Thêm test đỏ cho:

- preset config exact count/nesting/SCC;
- graph default full;
- demo teach response đúng count/edge;
- real teach trả error;
- traffic chỉ chứa induced edge;
- route đủ 10 algorithm không có hidden node;
- multiroute order/leg/path không có hidden node;
- old request absent scenario vẫn chạy full;
- GraphResponse echo mismatch bị frontend từ chối.

### 9.2. Data config và validator

Files:

- add `data/teaching_graph_presets.json`;
- update `scripts/validate_data.py`;
- update `scripts/gen_teaching_doc.py` đọc `teach_7` từ config thay vì giữ
  duplicate `SUB_NAMES`; không chạy generator.

Generator source phải dùng cùng view-building rule và `v_max` của selected
GraphStore. Chỉ được tuyên bố GUI parity sau final generator run ở giai đoạn
được cấp phép.

### 9.3. Backend

Files/symbols:

- `backend/app/models.py`: GraphView, GraphViewMeta, GraphResponse,
  TrafficResponse echo, ScenarioConfig tối thiểu, AppliedScenario;
- add `backend/app/scenario.py`:
  - load/validate preset config;
  - `resolve_view_store(base, view)`;
  - `resolve_scenario(base, config)`;
  - `canonical_fingerprint(...)`;
- `backend/app/graph_store.py`: giữ `load()` base cache; không mutate;
- `backend/app/main.py`:
  - graph/traffic query view;
  - route/multi resolve scenario;
  - response echo applied scenario;
  - typed error handlers.

View construction:

1. filter node IDs;
2. induced edge nếu cả u/v thuộc set;
3. filter profile mọi slot đúng edge IDs;
4. recompute meta count/bbox/name;
5. construct new `GraphFile`, `TrafficProfiles`, `GraphStore`;
6. không thay base object;
7. không NetworkX.

Full/no override có thể reuse base store. Cached view store được phép nếu immutable
và cache key là `(level, view, base created/profile created)`. Store có override
không được cache toàn cục.

### 9.4. Frontend

Types/API:

- add GraphView/ViewMeta/Scenario/AppliedScenario types;
- `api.graph(level, view)`;
- `api.traffic(slot, level, view)`;
- route/multi optional scenario.

Store:

- `graphView: GraphView = "full"`;
- `setGraphView(view)` same-value no-op;
- đổi thật clear graphData, traffic, start, goal, stops, trace, compare, multi,
  timeline, selected edge và overrides;
- graph→real ép view full;
- latest-request guard snapshot cả graph + view;
- verify response echo.

UI:

- selector labels 7/15/25/51;
- real chỉ hiện/disable full;
- nút full luôn có;
- map chỉ nhận graph response đã lọc.

### 9.5. Targeted verification

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\test_schema.py backend\tests\test_data.py backend\tests\test_scenario.py backend\tests\test_api.py -v
Set-Location frontend
npm test
npx tsc --noEmit
```

Sau targeted, chạy full backend suite + validator + frontend tests + tsc.

### EXIT 2

- 7/15/25/full đúng count và SCC;
- mọi API cùng view;
- không hidden node;
- default full backward-compatible;
- no data file rebuild;
- `git diff --check` pass.

## 10. Milestone 3 — ATSP optimization trace (đã hoàn thành)

### 10.1. Regression-first

Test đỏ cho:

- event union rejects wrong/missing fields;
- caps 2.000/2.000/1.500;
- `recorded_events == len(events)`;
- summary/reconstruction last and always present;
- Held–Karp n≤8 stores all updates;
- deterministic stride n>8;
- NN decision order/candidate cost;
- accepted local improvement decreases cost;
- SA seed boundary/new-best/periodic/final-best;
- trace true/false same order, legs, totals, savings, guarantee, optimizer stats;
- SA RNG/result exactly unchanged;
- recorder disabled không tạo event payload.

### 10.2. Backend models và recorder

Files:

- `backend/app/models.py`: discriminated event union, OptimizationTrace,
  SaOptimizerStats, response fields;
- optionally add `backend/app/optimization_trace.py` **chỉ** cho recorder và
  deterministic sampler; không chuyển solver logic sang đó;
- `backend/app/tsp.py`: instrumentation tại decision points;
- `backend/app/main.py`: pass `include_trace`.

Instrumentation rules:

- giữ nguyên iteration order, tie-break, comparison tolerance;
- không thêm random call;
- không reconstruct candidate lần hai nếu làm đổi cost/logic;
- event object lớn chỉ materialize khi sample được giữ;
- counter vẫn đếm mọi eligible event;
- không print debug.

### 10.3. Frontend

State:

- `includeOptimizationTrace: boolean = false`;
- route trace và ATSP trace dùng chung `stepIdx/playing/speed`, nhưng source là
  discriminated;
- chạy multiroute có trace: set step 0, paused;
- no trace: final legs hiện như hiện tại;
- scenario/view/input change clear optimizer trace.

Files:

- `frontend/lib/types.ts`: mirror exhaustive union;
- `frontend/lib/api.ts`: multiroute `include_trace`;
- `frontend/lib/store.ts`: playback source/invalidation/stale guard;
- modify `frontend/components/timeline.tsx` để đọc active timeline;
- add `frontend/lib/use-atsp-animation.ts` nếu logic method-specific không gọn
  trong component;
- add `frontend/components/atsp/atsp-trace.tsx` cho detail panel;
- update map/legend/ATSP result.

Map semantics:

- Held–Karp update: highlight subset và conceptual predecessor→endpoint;
- NN/local/SA: dashed conceptual order;
- không gọi conceptual line là đường xe chạy;
- final road legs chỉ nổi đầy đủ ở summary/final step;
- route trace behavior hiện tại không đổi.

Accessibility:

- Timeline label nói rõ “quá trình tối ưu thứ tự”;
- keyboard shortcut không chiếm input/control;
- reduced motion luôn paused, không autoplay/route-flow;
- step buttons/slider vẫn dùng.

### 10.4. Verification

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\test_schema.py backend\tests\test_tsp.py backend\tests\test_api.py -v
Set-Location frontend
npm test
npx tsc --noEmit
```

Full gates sau targeted. Browser QA đủ ba method ở 1366×768.

### EXIT 3

- trace không đổi optimizer result/RNG;
- cap không dừng solver;
- UI phân biệt optimizer và final legs;
- reduced-motion đúng;
- không regression route timeline.

## 11. Milestone 4 — Edge-override sandbox (đã hoàn thành)

### 11.1. Regression-first

Backend:

- non-finite float;
- duplicate edge;
- edge ngoài view;
- empty/no-op override;
- length dưới `ceil_dm(haversine)`;
- speed ngoài 1..200;
- congestion không phải integer 1..5;
- risk không phải 0/1;
- recomputed free time/weight/v_max;
- base graph/profile/cache byte-for-byte/model-dump unchanged;
- fingerprint order-independent và semantic;
- fingerprint đổi theo view/base/profile/effective field;
- scenario None/null/{} equality;
- reset/base result equality;
- route/compare/multi dùng scenario thật.

Frontend:

- override Record đảm bảo unique;
- sorted request serialization;
- preview formula parity;
- override/view/graph invalidation;
- slot change giữ override nhưng refresh effective preview;
- reset edge/all;
- refresh không persist;
- stale response includes scenario/view snapshot.

### 11.2. Backend

Files:

- `backend/app/models.py`: full override validators;
- `backend/app/costs.py`:
  - product-safe `ceil_dm`;
  - `edge_cost_breakdown`;
- `backend/app/scenario.py`:
  - canonicalize;
  - clone/apply;
  - fingerprint;
  - typed exceptions;
- `backend/app/explain.py`: optional applied scenario context;
- `backend/app/main.py`: handlers and request integration.

`edge_cost_breakdown` trả:

```text
length_m
free_speed_kmh
t_free_s
congestion
congestion_factor
penalty_flood_s
penalty_construction_s
penalty_narrow_alley_s
penalty_traffic_light_s
penalty_total_s
weight_distance_m
weight_time_s
weight_balanced_s
```

Không tạo endpoint mới chỉ để preview nếu frontend đã có base graph/traffic.
Python và TypeScript dùng shared golden fixtures để chứng minh formula parity.

### 11.3. Frontend state/API

State tối thiểu:

```text
edgeOverrides: Record<edge_id, EdgeOverride>
edgeEditMode: boolean
selectedEdgeId: string | null
drawerTab += "scenario"
```

Không localStorage/sessionStorage.

Helper:

```text
buildScenario(graphView, overrides)
  -> undefined nếu full + zero effective override
  -> sorted ScenarioConfig nếu khác base
```

Mọi route/compare/multiroute gửi cùng snapshot scenario. Response chỉ được nhận
nếu graph/view/slot/mode/journey/scenario snapshot vẫn current. Compare phải
kiểm fingerprint bằng trace chính; mismatch → bỏ response và báo contract error.

### 11.4. Edge editor UI

Khi bật edit mode:

- add wide invisible pick layer cho edge;
- phân biệt edge click với node click bằng layer/object tag;
- mở tab “Thử nghiệm” và focus control đầu;
- highlight selected/overridden edges;
- không làm route/result layer mất khả năng hiển thị.

Tab hiển thị:

- edge ID, direction u→v, name;
- original/current;
- length, speed;
- congestion bốn slot;
- bốn risk switch;
- t_free, factor, từng penalty, tổng penalty;
- distance/time/balanced weight cho slot hiện tại;
- override count;
- Reset edge, Reset all;
- copy: “chỉ có hiệu lực trong phiên hiện tại, không sửa dataset gốc”;
- provenance/fingerprint sau lần run gần nhất.

Validation:

- client feedback nhanh;
- backend vẫn là authority;
- invalid input không gửi;
- không clamp;
- mọi edit thực sự clear trace/compare/multi/timeline.

Effective traffic overlay = base traffic + override của slot hiện tại, chỉ ở
derived render state; không mutate `traffic`.

### 11.5. Verification

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\test_costs.py backend\tests\test_scenario.py backend\tests\test_scenario_overrides.py backend\tests\test_api.py backend\tests\test_search.py backend\tests\test_search_advanced.py backend\tests\test_tsp.py -v
Set-Location frontend
npm test
npx tsc --noEmit
```

Full gates sau targeted. Browser QA edit/reset/refresh ở demo full + teach view.

### EXIT 4

- base cache/JSON không đổi;
- reset cho deterministic result đúng base;
- route/compare/multi cùng fingerprint;
- mọi formula/unit đúng;
- edge ngoài view không áp được;
- không persistence/rò request.

## 12. Milestone 5 — Integration và runtime/browser QA

### 12.1. Full automated gates

Từ repo root:

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -v
.venv\Scripts\python.exe scripts\validate_data.py

Set-Location frontend
npm test
npx tsc --noEmit
```

Không chạy build/benchmark/gamma/generator.

### 12.2. Runtime

Kiểm tra port/process trước. Nếu phải start server, chỉ stop process do lượt này
start.

Backend:

- health;
- graph demo full = 51/298;
- graph demo teach = 7/24, 15/62, 25/114;
- graph real full = 2.118/4.699;
- real teach error;
- traffic edge set khớp view;
- route/multi fingerprint echo.

### 12.3. Browser 1366×768

Phải kiểm:

- dark/light;
- offline;
- keyboard/focus;
- reduced motion;
- selector 7/15/25/full và full reset;
- route đủ 10 algorithm trên ít nhất teach_7;
- không hidden node trong path;
- multiroute đủ 3 method;
- ATSP play/pause/step/slider/speed;
- optimizer trace khác final legs;
- edge pick/edit/formula/reset edge/reset all;
- invalid input feedback;
- refresh mất override;
- negative/zero/positive savings vẫn đúng;
- vertical/horizontal scroll;
- latest request không render stale view/scenario;
- fingerprint trong kết quả frontend/backend trùng nhau.

Nếu browser harness không có, ghi `UNVERIFIED`; không đoán PASS.

### 12.4. Documentation sync

Sau code:

- update SCHEMA examples/OpenAPI mapping;
- DESIGN current behavior;
- report chỉ prose/protocol, vẫn giữ `SỐ TẠM`;
- DATA current provenance;
- Role C trace terminology;
- generator source đọc preset/contract mới nhưng **không chạy**;
- generated output không đổi.

Không điền manual source URL hoặc deliverable của thành viên.

### EXIT 5 — Definition of Done

Chỉ hoàn tất khi:

- mọi targeted/full gate pass;
- validator pass với base data không đổi;
- all four views/API aligned;
- ATSP trace deterministic và bounded;
- sandbox request-scoped + immutable base;
- OpenAPI/Pydantic/TypeScript/frontend consumer đồng bộ;
- report không mâu thuẫn unit/source/guarantee;
- browser QA đạt hoặc limitation được ghi rõ;
- `git diff --check` pass;
- final diff không có generated output, results mới, dependency change,
  debug/temp/secret hoặc scope creep.

## 13. File-by-file responsibility map

| File | Trách nhiệm thay đổi |
|---|---|
| `docs/SCHEMA.md` | authority cho toàn contract mới |
| `docs/DESIGN.md` | UX/view/timeline/sandbox/reduced motion |
| `report/BaoCao-Khung.md` | graph/data/cost/13 methods/proof/protocol |
| `data/DATA.md` | provenance và current limitations |
| `docs/HEURISTIC-PROOF.md` | scenario invariants |
| `docs/ROLE-C-ADVANCED-ATSP-GIAI-THICH-DE-HIEU.md` | optimizer trace/local-global |
| `data/teaching_graph_presets.json` | exact nested preset config |
| `scripts/validate_data.py` | preset guards |
| `scripts/gen_teaching_doc.py` | consume shared teach_7 config; source only |
| `backend/app/models.py` | executable contract |
| `backend/app/scenario.py` | view/override/fingerprint boundary |
| `backend/app/costs.py` | physical floor và cost breakdown |
| `backend/app/graph_store.py` | immutable store construction |
| `backend/app/main.py` | endpoint/query/request/error integration |
| `backend/app/tsp.py` | solver instrumentation |
| `backend/app/optimization_trace.py` | optional recorder/sampler only |
| `backend/app/explain.py` | scenario-aware prose |
| `backend/tests/test_scenario.py` | GraphView, preset và base-scenario invariants |
| `backend/tests/test_scenario_overrides.py` | override contract, physical floor, fingerprint và immutability |
| existing backend tests | schema/API/search/TSP regression |
| `frontend/lib/types.ts` | exact TypeScript mirror |
| `frontend/lib/api.ts` | view/scenario/include_trace payload |
| `frontend/lib/store.ts` | state, invalidation, request snapshots |
| `frontend/lib/scenario.ts` | client normalization/preview formula |
| `frontend/lib/interaction-policy.ts` | pure view/scenario/timeline guards |
| `frontend/components/control-panel.tsx` | view selector/toggles |
| `frontend/components/map-view.tsx` | view render, ATSP conceptual layer, edge pick |
| `frontend/components/timeline.tsx` | route/ATSP discriminated playback |
| `frontend/lib/use-animation.ts` | route animation unchanged |
| `frontend/lib/use-atsp-animation.ts` | optimizer event-derived map state |
| `frontend/components/atsp/atsp-trace.tsx` | method-specific event detail |
| `frontend/components/drawer/drawer.tsx` | scenario tab/focus |
| `frontend/components/drawer/scenario-tab.tsx` | editor/breakdown/reset |
| `frontend/components/legend.tsx` | effective trace/conceptual/override legend |
| frontend tests | pure policy, request, formula, sampling display |

Không bắt buộc tạo mọi “optional new file” nếu current implementation giữ trách
nhiệm rõ hơn khi sửa file hiện có. Không được bỏ trách nhiệm hoặc test tương ứng.

## 14. Final review checklist

> Checklist này là template kiểm tra, không phải trạng thái resume. Checkpoint ở
> đầu file là nguồn chuẩn để agent nhận handoff biết M1–M5 đã hoàn thành.

### Contract

- [ ] `docs/SCHEMA.md` đi trước code
- [ ] Pydantic/OpenAPI/TypeScript cùng field/default/null
- [ ] old client → new backend giữ base behavior
- [ ] new frontend verify view echo
- [ ] backend-first rollout, frontend-first rollback

### Graph view

- [ ] canonical identifiers đúng
- [ ] G_real chỉ full
- [ ] 7/15/25 exact nested SCC
- [ ] induced edge only
- [ ] graph/traffic/route/compare/multi aligned
- [ ] no hidden node

### Trace

- [ ] route `Trace` không bị trộn ATSP event
- [ ] cap payload only
- [ ] total/recorded/truncated consistent
- [ ] summary/reconstruction kept
- [ ] SA RNG unchanged
- [ ] trace-on/off equality

### Sandbox

- [ ] finite/physical validation
- [ ] no raw weight
- [ ] base immutable
- [ ] no session/persistence
- [ ] all requests send scenario
- [ ] v_max/free time/weights recomputed
- [ ] reset restores base

### Documentation/data

- [ ] TomTom/fallback described honestly
- [ ] eight URL TODO preserved
- [ ] units and IDA* epsilon correct
- [ ] complexities implementation-faithful
- [ ] `SỐ TẠM` preserved
- [ ] generated output untouched

### Repository

- [ ] no dependency change
- [ ] no data rebuild/results rewrite
- [ ] no secret/debug/temp
- [ ] `git diff --check`
- [ ] status/diff reviewed
- [ ] no commit/push without explicit permission

## 15. Handoff format cho mỗi milestone

Trả theo thứ tự:

1. outcome;
2. files/symbols changed;
3. contract/behavior changed;
4. regression added;
5. exact commands + actual outcomes;
6. runtime/browser evidence;
7. diff/worktree boundary;
8. remaining limitation;
9. verdict milestone: `READY FOR NEXT MILESTONE` hoặc
   `NOT READY FOR NEXT MILESTONE`.

Không dùng “xong” nếu stop gate, full gate hoặc runtime evidence bắt buộc chưa
đạt.
