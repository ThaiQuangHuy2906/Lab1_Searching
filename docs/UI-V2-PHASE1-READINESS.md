# UI & Explanation v2 — Phase 1 Readiness

Ngày kiểm chứng: 2026-08-09  
Repository: `C:\Users\Admin\Desktop\Lab01_Searching`  
Baseline bắt đầu: `main...origin/main`, HEAD
`66a6f97d5b9c8f9a31a1b1686c64c7302ad1b6c5`, worktree sạch.

## 1. Phạm vi và nguồn sự thật

Phase này triển khai đúng **Phase 1 — Backend contract và số liệu** của
`UI_caithien.md`, dựa trên contract đã duyệt tại `docs/SCHEMA.md` §F và trạng thái
thiết kế tại `docs/DESIGN.md` §13. `docs/SCHEMA.md` không cần sửa trong lượt này vì
§F đã khóa đầy đủ field, enum, tolerance, compatibility và null/default rules từ
Phase 0; implementation mới tuân theo contract đó.

Phạm vi đã thực hiện:

- executable Pydantic models/validators cho route trace, explanation và ATSP v2;
- producer instrumentation cho chín thuật toán route;
- path/leg/tour cost breakdown từ một nguồn công thức duy nhất;
- typed Explanation evidence và post-hoc reference provenance;
- ATSP baseline, matrix evidence/failure, computation metrics và method stats;
- facade FastAPI chỉ phát `contract_version=2` sau khi payload đầy đủ được
  revalidate;
- fixture golden và backend unit/API/compatibility/non-regression tests.

Không triển khai Phase 2–8. Không thay đổi frontend types/state/components, dataset,
data pipeline, benchmark, `results/`, generated teaching content hoặc mock legacy.
Không chạy benchmark, data rebuild, traffic/profile scripts hay teaching generator.

## 2. File và contract đã thay đổi

### Runtime backend

- `backend/app/models.py`
  - thêm tolerance dùng chung và toàn bộ strict model §F;
  - thêm cross-field validator cho v2-completeness, numeric identities, units,
    termination/quality, Bidi union/min/two-side, signed reference, exact gap,
    ATSP topology/aggregate/failure/stats;
  - giữ mọi field §A–§E và cho phép payload v1 thiếu `contract_version`/field v2.
- `backend/app/graph_store.py`
  - thêm `GraphStore.path_cost_breakdown()` aggregate trực tiếp
    `costs.py::edge_cost_breakdown` trên đúng directed path và gamma của store.
- `backend/app/search.py`
  - thêm root termination và decision instrumentation cho BFS, DFS, IDDFS, UCS,
    A*;
  - IDDFS phân biệt final cutoff với failure theo effective successor policy.
- `backend/app/search_advanced.py`
  - thêm decision instrumentation cho Greedy, Bidirectional Dijkstra, IDA* và
    Beam;
  - Bidi giữ riêng forward/backward frontier, raw top/μ và root stop-bound;
  - IDA* phân biệt exhaustive với round cap; Beam theo dõi full-run `ever_pruned`.
- `backend/app/explain.py`
  - sinh `ExplanationEvidence`, objective/gap/breakdown/factors và tối đa hai
    typed `ReferenceRoute` có `provenance=posthoc_ucs`;
  - legacy summary/segments/alternatives vẫn được giữ và dùng cùng số nguồn;
  - no-path copy dùng typed termination thay vì tuyên bố bảo thủ chung.
- `backend/app/tsp.py`
  - thêm return echo, original order/legs, per-leg/aggregate breakdown;
  - thêm matrix run/expanded counters, timing, asymmetry evidence và typed
    directed-pair failure;
  - thêm full-run stats đúng vòng lặp cho Held–Karp, NN + 2-opt/Or-opt và SA;
  - SA stats không thêm RNG call; `optimizer_stats` legacy được dựng từ cùng
    `method_stats`.
- `backend/app/main.py`
  - `/api/route` và `/api/multiroute` revalidate complete variant trước khi phát
    `contract_version=2` và giữ server-authoritative scenario echo.

### Tests và fixture

- `backend/tests/fixtures/ui_v2_phase1_golden.json`
  - khóa output trace-off deterministic của cả chín route algorithms;
  - khóa order, directed leg paths, totals/baseline/savings open và closed cho
    ATSP demo case trước/sau instrumentation.
- `backend/tests/test_ui_v2_phase1_contract.py`
  - 41 Phase 1 contract/golden cases, ngoài toàn bộ regression suite hiện hữu.
- `docs/UI-V2-PHASE1-READINESS.md`
  - tài liệu readiness hiện tại.

Không sửa `docs/SCHEMA.md`: public contract §F không thay đổi trong implementation.

## 3. Model, producer và test đã triển khai

### Route trace và Explanation

- Mọi response `/api/route` v2 có `termination`, kể cả trace off và Start=Goal.
- Mọi recorded step v2 có complete `decision`; trace off không tạo step/decision.
- Bidi step có hai frontier và vẫn duy trì chính xác legacy union/min-g; successful
  run dùng `bidirectional_bound_met` với effective raw top keys, μ và meeting node.
- IDDFS/IDA*/Beam có termination reason dựa trên state full-run, không suy từ
  payload trace đã cap.
- Found/trivial/not-found evidence có shape đúng variant. Objective active mode,
  exact UCS reference, optimality gap và signed reference trade-off dùng raw
  tolerance §F.1.
- `total_time_s` vẫn luôn là balanced path weight. Time reference relation dùng
  `ReferenceRoute.metrics.total_cost`, không dùng `total_time_s`.
- Breakdown/factor unit đã test đủ `distance`, `time`, `balanced`; risk chỉ ảnh
  hưởng objective balanced, congestion không ảnh hưởng distance objective.

### Multiroute/ATSP

- Response reachable v2 có return echo, optimized/original directed legs,
  breakdown, complete matrix evidence, computation metrics và method stats.
- Open/closed topology đã test cho Held–Karp, NN + local search và SA.
- Case 15 stops đã test đúng 15 open legs và 16 closed legs, không lặp Start trong
  `order`.
- Matrix incomplete trả HTTP-compatible typed result shape, giữ pair có hướng,
  partial evidence/counters và không chạy optimizer.
- Held–Karp đếm materialized DP states/transitions; NN/local search đếm full-recost
  candidates/accepted moves; SA đếm đủ improving/equal/worse/rejected trên seeds
  0–4 và sample standard deviation.

## 4. Compatibility và non-regression

- F1/B1 legacy keys, types, defaults và semantics không bị đổi hoặc xóa; field v2
  chỉ additive.
- Legacy trace/multiroute mocks vẫn parse với `contract_version=None`.
- Incomplete payload tự nhận version 2 bị strict validation từ chối, không silently
  fallback thành v1.
- F1-shaped projection của response B2 giữ nguyên legacy path/metrics và bỏ qua
  field additive như expected của reader hiện hành.
- Golden route asserts exact deterministic fields cho cả chín algorithms:
  found/path/cost/distance/balanced cost/nodes expanded/max frontier/guarantee và
  epsilon/beam width khi áp dụng.
- Golden ATSP asserts cả ba methods, open/closed: order, từng directed leg path,
  totals, original totals và savings.
- Trace-on/off parity bỏ qua runtime/trace payload nhưng so toàn bộ deterministic
  result và full-run method stats; SA seed results không đổi.
- Existing Phase 0 Bidi union/min và asymmetric open/closed fixtures vẫn pass.
- UCS/A*/Bidirectional Dijkstra tiếp tục equivalent trên cùng snapshot trong full
  regression suite.

## 5. Lệnh kiểm chứng và kết quả thực tế

Các lệnh dưới đây chạy trên working tree Phase 1, không dùng kết quả lịch sử:

| Lệnh | Kết quả |
|---|---|
| `.venv\Scripts\python.exe -m pytest backend\tests\test_search.py backend\tests\test_search_advanced.py backend\tests\test_schema.py -q -p no:cacheprovider` | PASS — 52 tests |
| `.venv\Scripts\python.exe -m pytest backend\tests\test_api.py backend\tests\test_schema.py -q -p no:cacheprovider` | PASS — 87 tests, 1 dependency deprecation warning |
| `.venv\Scripts\python.exe -m pytest backend\tests\test_tsp.py backend\tests\test_optimization_trace.py backend\tests\test_ui_v2_phase0_fixtures.py -q -p no:cacheprovider` | PASS — 34 tests |
| `.venv\Scripts\python.exe -m pytest backend\tests\test_ui_v2_phase1_contract.py -q -p no:cacheprovider` | PASS — 41 tests, 1 dependency deprecation warning |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -v -p no:cacheprovider` | PASS — 230 tests, 1 dependency deprecation warning, 242.47 s |
| `.venv\Scripts\python.exe scripts\validate_data.py` | PASS — G_real 2118/4699, G_demo 51/298, profiles/invariants/presets valid; `ALL DATA VALID` |
| `npm test` trong `frontend/` | PASS — 42/42 |
| `npx tsc --noEmit --incremental false` trong `frontend/` | PASS — exit 0 |
| `git diff --check` | PASS — không có whitespace error |
| `git status --short --branch` | PASS phạm vi — `main...origin/main`; đúng 7 runtime file modified và 3 Phase 1 test/doc file untracked; không có file ngoài phạm vi |

`npm run build` **NOT RUN**: đây là gate conditional, không phải default Phase 1;
không có frontend runtime change và không xác nhận các điều kiện Next dev/.next/font
network để chạy build an toàn. Benchmark, data rebuild và generator đều **NOT RUN**
đúng phạm vi khóa.

## 6. Blind spot và rủi ro còn lại

1. Phase 2 frontend dual-read/types/policies chưa tồn tại. Vì vậy B1/F2 và B2/F2
   end-to-end chưa thể chạy; đây là phạm vi Phase 2, không phải payload backend bị
   thiếu.
2. Chưa deploy/staging mixed-version exercise. B2/F1 hiện được chứng minh bằng
   additive JSON shape, F1-shaped projection, frontend regression và typecheck.
3. Demo/real committed graphs đều strongly connected; public `matrix_incomplete`
   không thể kích hoạt trên base snapshot hiện tại. Variant này được test trực tiếp
   bằng directed disconnected GraphStore in-memory.
4. Browser, responsive, keyboard, screen reader, WebGL, projector và visual QA là
   Phase 3–8; không được suy là pass từ backend readiness.
5. Runtime fields là monotonic per-request instrumentation, không phải benchmark
   khoa học và không deterministic. Tests chỉ kiểm finite/nonnegative/accounting.
6. Full suite còn một `StarletteDeprecationWarning` từ dependency
   `fastapi.testclient`/`httpx`; không phải assertion failure hay Phase 1 contract
   drift.
7. `results/` vẫn stale/SỐ TẠM theo `AGENTS.md` và hoàn toàn không được dùng làm
   bằng chứng hoặc thay đổi trong Phase 1.

Không có source-of-truth conflict hoặc abort condition còn mở cho rollout backend
Phase 1.

## 7. Verdict

**READY**

Tất cả gate riêng của Phase 1 trong `UI_caithien.md` đã đạt: legacy union/min,
Bidi two-side invariant, ba ATSP methods open/closed, model/API serialization,
time-mode reference correctness, trace-off verdict/full-run stats và route/ATSP
non-regression.

**Phase 2 — Frontend types, policies và state được phép bắt đầu.** Điều này không
có nghĩa toàn bộ UI v2 hoặc Definition of Done Phase 8 đã hoàn tất; các blind spot
Phase 2–8 ở trên vẫn là gate bắt buộc của các phase tương ứng.
