# UI & Explanation v2 — Biên bản readiness Phase 0

> Checkpoint lịch sử của Phase 0. Current-state đã qua Phase 6; các câu “Phase
> 1–8 chưa triển khai” phía dưới chỉ đúng tại ngày kiểm chứng của file. Xem
> `docs/UI-V2-PHASE6-READINESS.md`.

> Ngày chốt: **2026-08-09**
> Phạm vi: contract, thiết kế, compatibility, fixture và truthfulness hotfix
> Readiness verdict: **READY**

`READY` trong tài liệu này chỉ có nghĩa là repository đã đủ cơ sở để bắt đầu
**Phase 1 — Backend contract và số liệu** của `UI_caithien.md`. Verdict này
không có nghĩa payload v2, UI so sánh nhiều thuật toán, hai bảng frontier,
return-to-start trên frontend hoặc Explanation workspace v2 đã chạy ở runtime.

---

## 1. Kết luận điều hành

Phase 0 đạt gate với các điều kiện sau:

1. Contract đích được khóa tại `docs/SCHEMA.md` §F và vẫn là mở rộng additive;
   §A–§E tiếp tục mô tả contract hiện hành.
2. Thiết kế đích, trạng thái lỗi, responsive, accessibility và vocabulary được
   khóa tại `docs/DESIGN.md` §13 và `UI_caithien.md`.
3. Đã sửa một lỗi contract có thể làm giải thích sai Bidirectional Dijkstra:
   nghiệm thành công phải dùng `bidirectional_bound_met`, không giả rằng phía
   forward luôn kết thúc bằng `goal_expanded`.
4. Đã có fixture nhỏ, có hướng, tái lập cho frontier overlap của Bidirectional
   Dijkstra và open/closed ATSP của cả ba phương pháp.
5. Copy hiện hành của tab Giải thích đã được sửa tối thiểu để không gọi tuyến
   UCS hậu kiểm là tuyến thuật toán chính “đã xét/bị loại”, không gọi
   `total_time_s` là thời gian thuần/ETA và không mô tả traffic profile như dữ
   liệu giao thông trực tiếp.
6. Contract v2 không được phép đổi graph, cost formula, heuristic, traversal,
   tie-break, stopping rule tạo nghiệm, path reconstruction, seed, dữ liệu hoặc
   benchmark đã chốt.
7. Toàn bộ gate kiểm thử hiện hành được ghi ở §10 đã qua. Không có lỗi đã biết
   chặn Phase 1; một deprecation warning của dependency test vẫn tồn tại và
   không liên quan thay đổi Phase 0.

Điều kiện giữ verdict `READY`: Phase 1 phải triển khai **backend-first**, giữ
toàn bộ field legacy và chứng minh parity trước khi phát `contract_version=2`.
Nếu bất kỳ abort condition ở §9 xảy ra, verdict cho rollout v2 tự động trở thành
`NOT READY` cho đến khi được sửa và kiểm lại.

---

## 2. Nguồn sự thật và phạm vi review

### 2.1. Nguồn sự thật đã đối chiếu

Thứ tự ưu tiên dùng trong review:

1. `docs/Lab 1 - Searching.pdf` — yêu cầu bài tập và rubric.
2. `docs/Lab1-ChotPhuongAn.md` — lựa chọn dự án đã chốt.
3. `PROMPT-MASTER.md` — lịch sử xây dựng và invariants hiện hành.
4. `docs/SCHEMA.md` — contract dự kiến.
5. `backend/app/models.py` — schema executable hiện hành.
6. Code backend/frontend và kiểm thử hiện hành — hành vi đang chạy.
7. `docs/DESIGN.md` — design intent; claim tương tác vẫn cần browser QA.

PDF bài tập đã được render và kiểm tra trực quan đủ 10 trang trong Phase 0.
Các yêu cầu liên quan trực tiếp gồm trực quan từng bước/frontier, số liệu tìm
kiếm, lý do chọn tuyến, tiêu chí, ùn tắc, tuyến thay thế/tham chiếu và mức bảo
đảm tối ưu. Thiết kế v2 giữ các yêu cầu này nhưng sửa provenance để không diễn
giải quá dữ liệu mà thuật toán thực sự cung cấp.

### 2.2. Trong phạm vi Phase 0

- Khóa tên field, enum, null/default và cross-field invariants của contract v2.
- Khóa tolerance, dấu của trade-off/gap/savings và đơn vị.
- Khóa termination semantics cho 9 route algorithms.
- Khóa semantics hai frontier của Bidirectional Dijkstra.
- Khóa breakdown, baseline, failure và method stats cho ATSP.
- Khóa compatibility matrix `B1/F1`, `B2/F1`, `B1/F2`, `B2/F2`.
- Khóa vocabulary/IA của phần Giải thích và sửa các claim sai ở UI hiện hành.
- Thêm golden fixture bảo vệ hành vi thuật toán trước instrumentation Phase 1.
- Chạy kiểm thử và validator hiện hành.

### 2.3. Ngoài phạm vi Phase 0

- Chưa thêm model/producer `contract_version=2` vào runtime.
- Chưa thêm `termination`, `decision`, `bidirectional_frontiers`, breakdown,
  method stats hoặc typed explanation evidence vào response thực tế.
- Chưa bật return-to-start ở frontend.
- Chưa triển khai control panel mới, collapse desktop, N-map comparison,
  explanation overlay hoặc per-result explanation.
- Chưa deploy, benchmark, rebuild graph/data, regenerate tài liệu giảng dạy hay
  thay số liệu trong `results/`.
- Chưa có browser QA cho UI v2 vì UI đó chưa được triển khai.

---

## 3. Contract hiện hành B1 và contract đích B2

### 3.1. Quy tắc version

| Trường hợp | Cách hiểu bắt buộc |
|---|---|
| Root không có `contract_version` | Payload B1 hiện hành |
| Root có `contract_version: 2` | Payload B2, phải đủ field bắt buộc cho đúng endpoint và result variant |
| Root có version 2 nhưng thiếu nested field bắt buộc | Contract error; không fallback im lặng như B1 |
| Field v2 xuất hiện trong payload B1 | Reader không được suy payload đã hoàn chỉnh chỉ từ một field rời rạc |

Backend chỉ được phát version 2 sau khi model, producer và contract tests của
toàn bộ variant tương ứng đã hoàn tất. Không có trạng thái hợp lệ “nửa v1/nửa
v2” mang nhãn version 2.

### 3.2. Route `Trace`

| Khái niệm | B1 hiện hành | B2 đích |
|---|---|---|
| Version | Không có | Root `contract_version: 2` |
| Kết thúc | Suy từ `found`, algorithm và config; không đủ phân biệt cap/pruning | Root `termination` typed, kể cả trace-off/not-found/trivial; Bidi có bound evidence tại stop check |
| Decision từng bước | Frontier sau expand; thiếu lý do chọn node | `decision` với rule, score trước pop, runner-up, counters, iteration/bound/layer |
| Bidirectional frontier | Một union và `g=min` ở node overlap; chỉ có `side` vừa expand | Hai membership/g-map độc lập, μ/meeting, đồng thời giữ union legacy |
| Explanation | Prose + congested segments + legacy alternatives | Giữ legacy fields; thêm typed `evidence`, breakdown, factors, reference routes |
| No-path | Không biết proven hay inconclusive | `proven_unreachable` khác cap/pruning `inconclusive` |

Invariants bắt buộc:

- `total_cost` theo mode; `total_time_s` luôn là balanced path weight.
- Trace cap 5.000 chỉ cắt payload, không cắt work hay full-run metrics.
- `include_trace=false` vẫn phải có root `termination` ở B2.
- Mỗi B2 recorded step phải có `decision`.
- `bidirectional_frontiers` bắt buộc cho recorded Bidirectional Dijkstra step,
  cấm ở algorithm khác.
- Nested frontier `g` giữ presentation rounding tương thích legacy; score dùng
  để giải thích tie/stop là raw finite algorithm value.
- `bidirectional_bound_met` chỉ hợp lệ khi đã có finite μ/meeting path và
  effective `top_forward + top_backward >= μ`.
- `termination.bidirectional_bound` non-null đúng riêng reason trên; top null
  nghĩa là frontier rỗng/key hiệu dụng `+∞`, còn JSON chỉ chứa số finite.
- Instrumentation on/off không được đổi path, cost, work, seed hoặc deterministic
  result; runtime được phép khác và không dùng làm benchmark khoa học.

### 3.3. Explanation

Legacy `alternatives` tiếp tục tồn tại trong rollout. Semantics đã khóa:

- Đây là route do UCS chạy **sau** route chính để đối chiếu.
- `provenance` đích là `posthoc_ucs`.
- UI gọi là “tuyến tham chiếu được tính thêm sau khi chạy”.
- Chỉ dùng “đã xét” hoặc “bị loại” nếu về sau có evidence thật của thuật toán;
  payload hiện hành không có evidence đó.
- Relation theo objective phải tính từ `total_cost` đúng `mode`.
- `Alternative.total_time_s` legacy là balanced path weight.
- B2 `ReferenceRoute.metrics` và `cost_breakdown` là nguồn số; localized prose
  chỉ là presentation/fallback, không phải nguồn để parse lại số liệu.
- B2 objective luôn có đủ key; exact/gap dùng null khi thiếu exact reference,
  không trộn missing với null. `ExplanationFactor` dùng một shape duy nhất với
  `contribution_raw` đi kèm `contribution_unit`; level/count là view-model derive.
- Legacy `Alternative` không thêm field cạnh tranh `origin`; provenance typed
  duy nhất nằm ở `ReferenceRoute.provenance`.
- Traffic slot là hồ sơ đại diện, không phải current/live traffic.

### 3.4. `MultirouteResponse`

| Khái niệm | B1 hiện hành | B2 đích |
|---|---|---|
| Return flag | Request đã nhận nhưng response không echo; frontend đang hard-code `false` | `return_to_start` bắt buộc echo request đã validate |
| Baseline | Chỉ `original_order_totals` | `original_order`, `original_order_legs`, totals và breakdown đầy đủ |
| Optimized breakdown | Chỉ `LegMetrics`/totals | Breakdown mỗi leg và tổng |
| Computation | Route legs/optimizer data rời rạc | Matrix/optimizer/total runtime, work counters và typed matrix evidence |
| Failure | `found=false` chung | `failure={kind: matrix_incomplete, from_node, to_node}` cho directed pair thiếu |
| Method stats | Chỉ SA có `optimizer_stats` legacy | Discriminated `method_stats` cho Held–Karp, NN+local search và SA |

Null/default rules bắt buộc:

- Reachable B2: `failure=null`, `totals`, breakdown, baseline legs/totals,
  computation metrics và `method_stats` đều có.
- `matrix_incomplete`: optimizer không chạy; `method_stats=null`; order/legs rỗng;
  totals/breakdown/savings null; `original_order` vẫn echo input; typed pair lỗi
  và partial `matrix_evidence` có.
- `original_order=[start, ...stops]` và optimized `order` không lặp Start cuối.
- Closed tour biểu diễn cạnh quay về bằng closing `Leg`; tối đa 16 legs với 15
  stops. Open tour tối đa 15 legs.
- ATSP matrix và route luôn có hướng/asymmetric; không suy `A→B` từ `B→A`.
- SA vẫn dùng seed 0–4; stats không được thêm RNG call hoặc đổi acceptance.

---

## 4. Số học và tính đúng đã khóa

Nguồn tính breakdown duy nhất là aggregate của
`backend/app/costs.py::edge_cost_breakdown` trên đúng directed path. Các identity
và tolerance normative nằm tại `docs/SCHEMA.md` §F.1.

| Đại lượng | Dấu/semantics |
|---|---|
| `reference_minus_selected_cost` | reference − selected; âm là reference tốt hơn |
| `optimality_gap` | selected − exact reference; âm ngoài tolerance là integrity error |
| `savings_pct` | (original − optimized) / original × 100; âm là tăng chi phí |
| `total_time_s` | balanced cost ở mọi mode; không phải ETA |
| `mode=time total_cost` | congestion-adjusted estimated time |
| Comparison equivalent | abs `1e-6`, relative `1e-9`, dùng raw active-mode value |

Không dùng số localized/rounded để tie, rank, relation hoặc integrity check.
Mẫu số tương đương 0 phải dùng null/typed integrity semantics đã ghi ở schema,
không chia 0 và không đổi null thành 0.

---

## 5. Producer/writer inventory

### 5.1. Writer hiện hành B1

| Writer | Vai trò | Ràng buộc Phase 1 |
|---|---|---|
| `backend/app/search.py` | BFS/DFS/IDDFS/UCS/A* route traces | Thêm facts nhưng giữ traversal/tie/path/cost/work |
| `backend/app/search_advanced.py` | Greedy/Bidirectional Dijkstra/IDA*/Beam | Ghi termination/decision/frontier hai phía từ state thật; không tái dựng hậu kỳ |
| `backend/app/explain.py` | Legacy explanation/reference UCS | Sinh legacy prose và typed facts từ cùng số nguồn |
| `backend/app/tsp.py` | Matrix, ATSP solver, legs/totals/trace | Thêm counters/breakdown/failure mà không đổi order/seed/acceptance |
| `backend/app/main.py` | FastAPI facade/response model | Chỉ phát v2 khi variant hoàn chỉnh và validation qua |
| `frontend/lib/sequential-route.ts` | Ghép N route legs theo thứ tự nhập | Giữ explanation/termination từng leg; không dựng whole-tour alternative giả |
| `scripts/00_generate_mock.py` | Nguồn sinh mock được track | Chỉ cập nhật/regenerate ở phase cần thiết và rà exact diff |

### 5.2. Writer mới dự kiến trong Phase 1

- Pydantic models/validators cho breakdown, termination/bound evidence, decision,
  frontier hai phía, reference evidence, ATSP matrix/failure và method stats.
- Một aggregator breakdown dùng lại cost formula hiện hành.
- Full-run counters đặt đúng vòng lặp producer; không suy từ sampled trace.
- Server-generated stable IDs/provenance cho typed reference route.

Không có database, message queue, persistent event log hoặc historical response
store cần migrate. Payload API là in-memory response; graph/profiles/results không
được rewrite trong rollout này.

---

## 6. Consumer/reader inventory

| Reader | Hành vi hiện hành/đích cần bảo vệ |
|---|---|
| `backend/app/models.py` | Executable validation; Phase 1 phải khớp `SCHEMA.md` trước khi phát v2 |
| FastAPI response models trong `backend/app/main.py` | Không được drop field v2 hoặc làm đổi legacy serialization |
| `frontend/lib/types.ts` | F1 shape hiện hành; Phase 2 thêm discriminated dual-read types |
| `frontend/lib/api.ts` | Request/response boundary; F2 phải validate variant/capability |
| `frontend/lib/store.ts` | Single run/ATSP state; về sau giữ immutable snapshot/session identity |
| `frontend/lib/sequential-route.ts` | Consumer đồng thời là client-side aggregator của route legs |
| `frontend/components/drawer/explain-tab.tsx` | Hiện dùng legacy prose; F2/F3 chuyển sang typed view-model với fallback bảo thủ |
| Metrics/compare/map/timeline components | Không suy facts thiếu; feature v2 thiếu thì ẩn/degrade có nhãn |
| Backend/frontend tests và mock fixtures | Contract consumer dùng để khóa parity và mixed-version behavior |

Reader v1 phải tiếp tục hoạt động khi backend v2 thêm field vì JSON consumer
frontend bỏ qua field dư. Tuy nhiên backend Pydantic dùng `extra="forbid"`, nên
fixture/request model nội bộ phải được cập nhật đúng thứ tự; không thể coi khả
năng bỏ field dư của frontend là thay thế cho model compatibility test.

---

## 7. Compatibility matrix bắt buộc

Ký hiệu: `B1/B2` là backend producer; `F1/F2` là frontend reader.

| Frontend | Backend | Hành vi bắt buộc | Gate tự động cần có trước cutover |
|---|---|---|---|
| F1 | B1 | Hành vi hiện hành | Full regression hiện hành |
| F1 | B2 | Legacy field/path/cost không đổi; F1 bỏ field additive | B2 response qua F1-shaped fixture/reader tests |
| F2 | B1 | Dual-read; union bidi có nhãn fallback; no-path copy bảo thủ; ẩn số liệu thiếu | B1 fixtures qua F2 guards/view-model tests |
| F2 | B2 | Full §F; validate từng result variant và cross-field invariant | Contract + component/browser tests |

Hard rules:

- Không trộn result B1/B2 trong cùng comparison session.
- Missing/mismatch server scenario fingerprint là contract error và không được
  xếp hạng; frontend không tự hash để “cứu” payload.
- F2 không dựng hai bảng Bidi từ union legacy.
- F2 không biến missing breakdown/stats thành 0 hoặc empty data giả.
- Open/closed của B1 fallback đọc từ immutable request snapshot, không suy từ
  số legs.
- Capability/fingerprint đổi giữa session thì cancel phần còn lại, clear session
  và chạy lại trên snapshot mới.

---

## 8. Trình tự rollout, cutover và rollback

### 8.1. Rollout backend-first

1. Phase 1 cập nhật `docs/SCHEMA.md` nếu phát hiện contract cần đổi; sau đó cập
   nhật models, producers và validators cùng test.
2. Chứng minh B1/B2 parity cho path, objective cost, distance, balanced cost,
   nodes expanded, deterministic order, seed và trace-off result.
3. Chứng minh B2 response vẫn được F1 consumer dùng được.
4. Chỉ sau khi tất cả variant hoàn chỉnh mới phát `contract_version=2`.
5. Phase 2 thêm F2 dual-read, type guards và immutable comparison state.
6. Chạy cả bốn ô compatibility matrix trước UI feature cutover.
7. Không xóa fallback hoặc legacy field trong 8 phase hiện tại.

### 8.2. Physical execution và downtime

- Không có DDL, DB migration, partition, backfill hoặc history rewrite.
- Không chạm graph snapshots, traffic profiles, raw provenance, benchmark hay
  generated teaching numbers.
- Không dự kiến downtime dữ liệu. Deploy backend/frontend vẫn cần restart app
  theo workflow bình thường và clear in-memory session khi capability thay đổi.
- Không có bước irreversible trong Phase 0 hoặc rollout additive dự kiến.

### 8.3. Rollback

- F2 → F1: an toàn khi B2 giữ toàn bộ legacy field.
- B2 → B1 trong lúc F2 chạy: chỉ an toàn trong phạm vi fallback ở §7; feature v2
  degrade/ẩn, không fabricate; clear session B2 hiện có.
- Nếu producer v2 sai: ngừng phát `contract_version=2`/rollback backend artifact,
  không cần rollback data.
- Không được “rollback” bằng cách sửa graph, benchmark, seed hoặc nới assertion.

Rollback complexity: **thấp về dữ liệu**, **trung bình về phối hợp version**.
Rủi ro chính không phải mất dữ liệu mà là trộn result khác capability trong cùng
comparison session; guard session/fingerprint là điều kiện cutover bắt buộc.

---

## 9. Gate Phase 1 và abort conditions

### 9.1. Acceptance gate định lượng

Phase 1 chỉ hoàn tất khi đồng thời đạt:

- 0 schema/model mismatch cho mọi B2 response variant.
- 0 payload mang `contract_version=2` nhưng thiếu field bắt buộc.
- 0 regression path/cost/order/seed ngoài tolerance so B1.
- 9/9 route algorithms qua found, trivial và relevant no-path/cap/pruning cases.
- Bidirectional Dijkstra qua overlap, directed edge, μ stop và trace-on/off parity.
- 3/3 ATSP methods qua open và closed fixtures; order không lặp Start; closing
  leg/path/totals đúng.
- Breakdown identity và aggregate leg/totals đúng trong tolerance.
- Full-run method-stat identities đúng; SA không đổi RNG sequence.
- `matrix_incomplete` giữ đúng directed pair/partial matrix evidence và không
  chạy optimizer.
- Cả bốn ô compatibility matrix có automated evidence trước cutover F2.
- Full backend suite, data validator, frontend tests/typecheck liên quan đều pass.

### 9.2. Abort conditions

Dừng rollout B2 và không phát version 2 nếu có bất kỳ điều nào:

- Path, order, cost, seed, acceptance hoặc nodes-expanded thay đổi chỉ vì bật
  instrumentation.
- Bidirectional result được gắn `goal_expanded` thay vì evidence μ hợp lệ.
- IDDFS/IDA*/Beam overclaim `proven_unreachable` khi thực chất hết cap/pruning.
- B2 thiếu field, dùng null trái variant hoặc field finite nhận NaN/Infinity.
- `total_time_s` bị đổi semantics hoặc hiển thị như pure/live ETA.
- Exact reference tốt hơn selected ngoài tolerance mà vẫn tiếp tục claim/rank.
- Baseline/optimized so khác open/closed topology.
- F1 không đọc được B2 hoặc F2 fabricate dữ liệu khi đọc B1.
- Scenario fingerprint thiếu/mismatch nhưng result vẫn vào ranking.
- Bất kỳ test parity/contract/invariant nào thất bại.

Abort threshold cho các mục trên là **một trường hợp**; không có tỷ lệ lỗi chấp
nhận được vì đây là invariants correctness, không phải telemetry xu hướng.

---

## 10. Bằng chứng kiểm chứng Phase 0

### 10.1. Golden fixtures

| Artifact | Mục đích |
|---|---|
| `backend/tests/fixtures/ui_v2_phase0_cases.json` | Graph nhỏ có Bidi overlap/μ stop và asymmetric ATSP matrix open/closed |
| `backend/tests/test_ui_v2_phase0_fixtures.py` | Khóa union/min-g/stop values, UCS parity và kết quả 3 methods × 2 topologies |
| `backend/tests/test_api.py` | Khóa provenance/copy, active objective relation và balanced semantics |
| `frontend/tests/ui-copy.test.mjs` | Cấm UI quay lại claim “đã xét/bị loại”; khóa nhãn delta/metric |

Fixture là hand-authored test input mới, không phải generated graph/data artifact.
Nó không làm thay đổi `data/`, `results/` hoặc benchmark.

### 10.2. Commands và kết quả thực tế

Chạy từ repository root ngày 2026-08-09, trừ khi ghi `frontend/`:

| Command | Kết quả |
|---|---|
| `.venv\Scripts\python.exe -m pytest backend\tests\test_ui_v2_phase0_fixtures.py backend\tests\test_api.py -q` | PASS — 75 tests |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -q` | PASS — 189 tests; 1 Starlette deprecation warning hiện hữu |
| `.venv\Scripts\python.exe scripts\validate_data.py` | PASS — G_real, G_demo, 4 profiles và teaching presets đều hợp lệ |
| `npm test` trong `frontend/` | PASS — 42 tests |
| `npx tsc --noEmit` trong `frontend/` | PASS — không có TypeScript error |
| `npm run build` trong `frontend/` | PASS — Next.js 15.5.22 compile thành công, 6/6 static pages |
| Python compile check cho `backend/app/explain.py` | PASS |

Deprecation warning xuất phát từ `fastapi/testclient.py` về Starlette/httpx và
không phải assertion failure hay warning mới do contract Phase 0. Không thay
dependency trong task này vì không cần thiết cho scope.

### 10.3. Evidence ledger

| Status | Bằng chứng | Ý nghĩa |
|---|---|---|
| `OBSERVED` | Render/kiểm tra đủ 10 trang `docs/Lab 1 - Searching.pdf` | Requirements/rubric liên quan UI và explanation đã đối chiếu |
| `OBSERVED` | Code/models/tests hiện hành được đọc trực tiếp | B1 writer/reader inventory và data gaps không dựa audit cũ |
| `STATIC` | `docs/SCHEMA.md` §F | Contract B2 normative đã khóa |
| `STATIC` | `docs/DESIGN.md` §13, `UI_caithien.md` | Design, phases, error/a11y/rollout plan đã khóa |
| `OBSERVED` | Full commands ở §10.2 | Current regression/data/type gates pass |
| `OBSERVED` | Golden fixture tests | Current Bidi/ATSP algorithm outputs đã khóa trước instrumentation |
| `USER-STATED` | Người dùng duyệt kế hoạch và yêu cầu thực hiện Phase 0 | Có quyền sửa, commit và push Phase 0 |
| `INFERRED` | Không có DB/persistent response schema trong writer inventory | Không cần DDL/backfill; inference dựa code hiện hành |
| `UNVERIFIED` | Runtime B2/F2 và browser UI v2 | Chưa tồn tại trong Phase 0; phải kiểm ở Phase 1–8 |
| `UNVERIFIED` | Deploy/staging mixed-version exercise | Chưa deploy trong Phase 0; automated matrix là gate trước cutover |

Không dùng `docs/TIENDO.md`, `docs/KIEMTOAN.md` hoặc `results/` làm bằng chứng
current behavior.

---

## 11. Blind spots và rủi ro còn lại

1. Executable B2 models/producers chưa tồn tại; mọi claim về payload v2 runtime
   hiện vẫn là target contract.
2. F2 dual-read chưa tồn tại, nên bốn ô compatibility chưa thể được coi là đã
   chạy end-to-end; Phase 1/2 phải thêm fixture tests tương ứng.
3. Browser reflow, keyboard, focus, screen reader, WebGL context và projector
   layout chỉ có design/acceptance matrix, chưa có runtime evidence.
4. Timing/counters dễ vô tình đổi state hoặc RNG nếu đặt instrumentation sai;
   trace-on/off parity và SA seed tests là bắt buộc.
5. Legacy `Alternative` chưa có `total_cost`, nên hotfix Phase 0 phải recompute
   objective relation ở backend. B2 `ReferenceRoute.metrics` mới là giải pháp
   contract hoàn chỉnh.
6. Legacy no-path payload chưa typed; copy hiện chỉ có thể bảo thủ, không thể tự
   chứng minh reachability.
7. `method_stats` target là union mới, khác `optimizer_stats` SA legacy. Hai field
   phải sinh từ cùng nguồn để tránh drift.
8. Representative traffic profiles không phải live traffic; UI v2 phải tiếp tục
   hiển thị provenance/caveat này.

Các blind spot trên không chặn bắt đầu Phase 1 vì chính Phase 1–8 là nơi triển
khai và đóng chúng. Chúng chặn mọi claim rằng UI v2 đã hoàn tất hoặc sẵn sàng
deploy ngay sau Phase 0.

---

## 12. Checklist đóng Phase 0

- [x] Đọc nguồn bắt buộc theo `AGENTS.md`.
- [x] Đối chiếu assignment PDF và rubric.
- [x] Cập nhật contract normative trước runtime contract.
- [x] Khóa field names, enum, unit, tolerance, null/default và invariants.
- [x] Khóa route comparison cap 4, ATSP comparison cap 3 và final-only compare.
- [x] Khóa mixed-version matrix và backend-first rollout/rollback.
- [x] Sửa termination đúng của Bidirectional Dijkstra.
- [x] Thêm directed Bidi overlap fixture.
- [x] Thêm asymmetric open/closed ATSP fixture cho cả ba methods.
- [x] Sửa truthfulness copy hiện hành mà không đổi response shape.
- [x] Chạy full backend tests, data validator, frontend tests và typecheck.
- [x] Không chạm data pipeline, benchmark, generated teaching numbers hoặc raw data.
- [x] Ghi rõ Phase 1–8 chưa triển khai runtime.

**Readiness verdict cuối cùng: READY.**

Phase tiếp theo được phép bắt đầu là **Phase 1 — Backend contract và số liệu**,
theo đúng gate/abort conditions của tài liệu này và `UI_caithien.md`.
