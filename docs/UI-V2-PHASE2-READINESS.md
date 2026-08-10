# UI v2 — Phase 2 Readiness

> Checkpoint lịch sử của Phase 2. Current-state và gate còn mở xem
> `docs/UI-V2-PHASE6-READINESS.md`; số test phía dưới là evidence tại thời điểm
> Phase 2.

Ngày kiểm chứng: 2026-08-10
Repository: `C:\Users\Admin\Desktop\Lab01_Searching`

## 1. Baseline và phạm vi

- Baseline là commit Phase 1 `11ca5721c4d3fdf79f7df51dcd8dea5b2bb5a211`
  trên `main...origin/main`; worktree sạch trước khi bắt đầu.
- `docs/UI-V2-PHASE1-READINESS.md` có verdict `READY`; backend B2 đã phát
  contract version 2 đầy đủ và giữ các field B1.
- Phase này chỉ triển khai frontend types, API boundary/dual-read, pure policies,
  immutable snapshot/session state, lifecycle/orchestration, transitional adapter
  và test. Không triển khai panel, comparison workspace, map overlay hay component
  Explain hoàn chỉnh của Phase 3–8.
- Không thay backend contract/algorithm, dataset, benchmark, `results/`, generated
  teaching content hoặc report artifact. Không commit hoặc push.

## 2. Contract, types và API boundary

- `frontend/lib/types.ts`: thêm discriminated union B1/B2 cho route/multiroute;
  mirror termination, decision, bidi two-side, Explanation evidence, breakdown,
  reference route, ATSP failure/matrix/computation/method stats; thêm explicit
  mode/strategy/run, normalized scenario, immutable `RunSnapshot`, envelope và
  generic comparison session. Route envelope giữ immutable `sourceResponses`
  từng chặng để aggregate ordered-search không làm mất B2 evidence.
- `frontend/lib/contract-guards.ts`: dual-read B1/B2; normalize nullable B1;
  validate fingerprint, trace-field matrix, decision/termination/bidi, breakdown,
  objective/reference/factor identities, raw tolerance, ATSP topology, matrix,
  runtime accounting, aggregate leg totals, savings và method/SA counters.
  Malformed B2 trả `ApiContractError`, không downgrade im lặng.
- `frontend/lib/api.ts`: route/multiroute success payload đi qua runtime parser;
  request nhận `AbortSignal`; abort, offline, HTTP và contract error là các nhánh
  riêng; `found=false` tiếp tục là response hợp lệ.

## 3. Policies, presenters và state

- `frontend/lib/journey-mode-policy.ts`: explicit state machine; giữ riêng Goal
  và Stops, Start dùng chung, không promote Goal; return tạo đúng một closing leg;
  validate ATSP limits/uniqueness; deep-copy/sort/freeze scenario và từ chối
  graph-view drift hoặc duplicate override.
- `frontend/lib/comparison-policy.ts` và `frontend/lib/run-orchestrator.ts`:
  route chọn 2–4, ATSP chọn 2–3; N selection tạo N ordered slots; lifecycle
  `queued → running → success|no_path|error|cancelled`; request tuần tự; partial
  HTTP/offline failure không chặn item sau; monotonic run ID, abort và stale guard;
  fingerprint/capability write-once; mismatch/mixed B1-B2/malformed contract hủy
  outstanding slots nhưng giữ result hoàn tất; session/envelope deep-freeze và
  không cho attach bỏ qua/ghi đè lifecycle.
- `frontend/lib/sequential-route.ts`: ordered open/closed, closing-leg label/failure,
  per-leg source explanation/termination/quality/reachability; aggregate full
  metrics/path; sampler đúng `per-leg-boundary-proportional-v1`; 15 stops cho 15
  open legs hoặc 16 closed legs.
- `frontend/lib/explanation-policy.ts`, `search-step-explanation.ts`,
  `bidirectional-frontier-policy.ts`, `comparison-insights.ts` và
  `metric-presentation.ts`: subject/overlay bind exact run/session/result; không
  fallback B sang A; structured view-model; deterministic presenter cho chín
  algorithm; B1 fallback bảo thủ; bidi B2 two-side/B1 union label; raw-tolerance
  insights; units/vocabulary đúng contract.
- `frontend/lib/store.ts`: thêm explicit mode/strategy/run, drafts, return, run ID,
  snapshot, sessions, envelopes, progress và explanation lifecycle; input active
  thay đổi thì abort/increment/clear atomically, inactive draft edit được giữ;
  single/compare route và ATSP gửi từ immutable snapshot; ordered comparison kiểm
  fingerprint/capability từng leg. Scalar result `compare` cũ đã xóa; UI cũ derive
  result B từ session, còn `compareAlgo` chỉ là draft selection.
- Transitional wiring compile-only được cập nhật tại `control-panel.tsx`,
  `atsp-setup.tsx`, `map-view.tsx`, `legend.tsx`, `metrics-tab.tsx` và
  `compare-tab.tsx`. Đây chưa phải component/UI Phase 3–8.

## 4. Tests đã thêm/cập nhật

Test mới:

- `frontend/tests/contract-guards.test.mjs`
- `frontend/tests/journey-mode-policy.test.mjs`
- `frontend/tests/comparison-policy.test.mjs`
- `frontend/tests/run-orchestrator.test.mjs`
- `frontend/tests/explanation-policy.test.mjs`
- `frontend/tests/search-step-explanation.test.mjs`
- `frontend/tests/bidirectional-frontier.test.mjs`
- `frontend/tests/comparison-insights.test.mjs`
- `frontend/tests/metric-presentation.test.mjs`

Test cập nhật: `sequential-route.test.mjs`, `interaction-policy.test.mjs` và
`atsp-trace-policy.test.mjs`.

Bộ test cover mọi transition/no-op, draft retention, return/limits, immutable
snapshot, lifecycle, partial failure, cancellation/stale response, fingerprint,
capability mismatch, ranking, per-leg evidence, B1 fallback, B2 presenters và
contract-negative cases.

## 5. Compatibility và non-regression

| Matrix | Bằng chứng |
|---|---|
| B1/F1 | Legacy projection giữ path/metrics/shape cũ. |
| B2/F1 | F1-shaped reader bỏ additive fields; legacy path/metrics/ATSP fields của B2 không đổi. |
| B1/F2 | F2 parse committed `trace_mock.json`/`multiroute_mock.json`; thiếu structured facts dùng fallback/ẩn, không fabricate. |
| B2/F2 | Strict parser đọc runtime đủ 9 route và 3 ATSP × open/closed; malformed/cross-field drift bị từ chối. |

- Full backend suite vẫn pass 230/230, gồm Phase 1 golden/parity tests cho 9 route,
  3 ATSP methods, trace on/off và open/closed.
- Validator vẫn báo `ALL DATA VALID` với G_real 2.118/4.699 và G_demo 51/298;
  không có data file thay đổi.
- Frontend baseline trước Phase 2 là 42/42; sau Phase 2 là 100/100.
- TypeScript và Next production build pass; transitional UI compile.
- `git diff --name-only -- backend data results scripts report` không có output.

## 6. Lệnh kiểm chứng và kết quả thực tế

| Lệnh | Kết quả |
|---|---|
| `git status --short --branch` trước sửa | PASS — `main...origin/main`, clean |
| `git rev-parse HEAD` | PASS — `11ca5721c4d3fdf79f7df51dcd8dea5b2bb5a211` |
| `npm test` trong `frontend/` trước sửa | PASS — 42/42 |
| `npx tsc --noEmit --incremental false` trước sửa | PASS — exit 0 |
| Targeted policy/orchestration/presenter suites | PASS — vòng cuối 45/45; contract guard riêng 7/7 |
| Runtime `FastAPI TestClient → F2 guards` | PASS — `B2_RUNTIME_TO_F2_GUARDS_PASS 9 6` |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -v -p no:cacheprovider` | PASS — 230/230, 1 Starlette TestClient deprecation warning, 89,63 s |
| `.venv\Scripts\python.exe scripts\validate_data.py` | PASS — `ALL DATA VALID` |
| `npm test` trong `frontend/` sau diff cuối | PASS — 100/100 |
| `npx tsc --noEmit --incremental false` sau diff cuối | PASS — exit 0 |
| `npm run build` trong `frontend/` | PASS — Next 15.5.22 production compile/type validation, 6/6 static pages; 533,6 s |
| `git diff --check` | PASS — không có whitespace error |
| Static audit prose/debug/mode inference | PASS — F2 không parse prose; không debug/TODO; `stops.length` chỉ còn count/limit/render/validation, không chọn problem mode |

Các lần chạy trung gian không được tính là pass:

- một backend pytest bị wrapper cắt sau khoảng 5 giây do timeout quá ngắn; cùng
  lệnh được chạy lại đầy đủ và pass 230/230;
- một targeted frontend run phát hiện B1 mock thiếu nullable non-applicable fields;
  guard được sửa đúng dual-read rồi contract suite pass 7/7;
- các lần dựng runtime pipeline inline ban đầu lỗi PowerShell quoting/encoding/
  import path trước khi parser chạy; lệnh cuối không dùng file tạm và pass 9 + 6.

Không chạy benchmark, data/profile pipeline hoặc teaching generator.

## 7. Blind spot, rủi ro và phần còn lại

- Chưa browser QA, keyboard/a11y/responsive/performance hoặc live UI interaction;
  đây là gate Phase 3–8, không được suy từ typecheck/build.
- Chưa diễn tập B1/B2 bằng deployment/staging thật. Matrix hiện dựa trên committed
  B1 fixtures, F1 projections và local B2 FastAPI runtime.
- AbortController chỉ hủy browser wait; backend synchronous có thể vẫn dùng CPU.
  Stale run-ID guard vẫn là authority để discard response cũ.
- Store/component integration chưa có browser-mounted test harness; pure policies
  và DI orchestrator đã test, runtime component flows thuộc Phase 3.
- `presentRouteNarrative` regex vẫn tồn tại cho UI F1 legacy. Structured F2
  view-model/presenter không gọi nó và không dùng prose làm hierarchy/numeric truth;
  thay component Explain cũ nằm ở Phase 3/8.
- Chưa có panel IA, return switch, N-pane comparison UI, bidi two-side UI, map
  overlay, carousel, responsive layout hay cleanup đầy đủ của Phase 3–8.

Không phát hiện source-of-truth conflict hoặc abort condition còn mở trong phạm
vi Phase 2.

## 8. Verdict

**READY**

Mọi gate Phase 2 tại `UI_caithien.md` đã đạt: typecheck/build pass, policy tests
cover transitions, transitional UI compile, problem mode không suy từ
`stops.length`, F2 không parse `summary_vi` để quyết định hierarchy/numeric truth,
và bốn ô compatibility matrix có automated evidence.

**Phase 3 được phép bắt đầu.** Verdict này không tuyên bố Phase 3–8, browser QA
hoặc Definition of Done toàn UI v2 đã hoàn tất.
