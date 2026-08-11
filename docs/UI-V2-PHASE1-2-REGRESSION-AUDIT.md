# UI v2 Phase 1–2 regression audit

Ngày audit: 2026-08-11 (Asia/Saigon)

## 1. Baseline, phạm vi và lịch sử commit

Audit bắt đầu tại repository `C:\Users\Admin\Desktop\Lab01_Searching` với
`git status --short --branch` trả `main...origin/main`, worktree sạch. Baseline:

- HEAD: `1b933de0428e6487e9b6e1a9c8273e2c6acc7bf8` — `add route comparison with a referenced route`.
- Phase 5–6: `2ac11e52db3f69e22db25e52fc467407e9105854` — `finish phase 5/6`.
- Phase 3–4: `94eb7e3d77e01e2a44b7847d7af2b491981b415b`.
- Phase 2: `97ec24fa7218e10bdbb1d17fd2c15f7c5fbd9994`.
- Phase 1: `11ca5721c4d3fdf79f7df51dcd8dea5b2bb5a211`.
- Phase 0: `66a6f97d5b9c8f9a31a1b1686c64c7302ad1b6c5`.

`git log`, `git show`, `git diff` và `git blame` được dùng để đối chiếu từng
commit. Không reset, revert, rollback, commit hay push. Không sửa thuật toán,
cost, heuristic, graph, dataset, benchmark, `results/` hoặc generated teaching
content. Các tính năng Phase 5–6 được giữ nguyên; thay đổi trong `store.ts` chỉ
bao quanh Phase-2 snapshot validation mà các flow hiện tại cùng sử dụng.

Nguồn sự thật đã đối chiếu: `AGENTS.md`, `UI_caithien.md`, `docs/SCHEMA.md` §F,
phần liên quan của `docs/DESIGN.md`, hai readiness Phase 1–2, code/model/producer
backend, frontend types/API guards/policies/store, fixtures và tests hiện hành.
Không cần sửa `SCHEMA.md` hoặc `DESIGN.md`: §F.3 đã mô tả đúng semantics IDA*.

## 2. Tái hiện lỗi IDA*

Request tối thiểu trên HEAD trước sửa:

```json
{
  "start": "n0003",
  "goal": "n0018",
  "algorithm": "idastar",
  "mode": "balanced",
  "time_slot": "07:30",
  "graph": "demo",
  "include_trace": true,
  "params": { "epsilon": 5.0 }
}
```

Kết quả qua FastAPI `TestClient` là HTTP 500 với body `INTERNAL`. Stack trace:

```text
backend/app/main.py:229 Trace.model_validate(payload)
Pydantic ValueError: guaranteed result conflicts with exact reference
```

Producer thô trước lần validate cuối tạo dữ liệu hợp lệ:

- selected cost: `671.3665834697217 s`;
- exact UCS reference: `668.0917196253282 s`;
- gap: `3.274863844393508 s`;
- epsilon: `5.0 s`;
- `solution_quality=epsilon_bounded`, `optimal_guarantee=true`;
- `0 < gap <= epsilon`.

Cùng JSON producer thô đưa trực tiếp qua `parseTraceResponse` cũng bị F2 từ
chối với `ApiContractError` cùng suy luận sai. Trước sửa, smoke 540 request
(5 OD × 3 mode × 4 slot × 9 algorithm) có 7 HTTP 500, đều là IDA* và cùng
validator error. Đây không phải lỗi search/cost/heuristic.

Root cause: validator Phase 1 và guard Phase 2 dùng
`metrics.optimal_guarantee=true` như cờ “exact”, trong khi IDA* dùng cờ này cho
đảm bảo `epsilon_bounded`. `git blame` xác định nhánh backend được đưa vào bởi
`11ca572`; nhánh frontend tương đương bởi `97ec24f`. Golden Phase 1 chỉ dùng một
case IDA* có gap bằng 0 nên không phát hiện. Phase 5–6 mở rộng cách dùng
comparison/explanation và làm case gap dương lộ rõ; hai commit Phase 5–6 không
đưa lỗi contract này vào.

## 3. Lỗi phát hiện và bản sửa

### 3.1. IDA* epsilon-bounded bị bác bỏ như exact — nghiêm trọng

Ảnh hưởng: một số request IDA* hợp lệ trả 500 ở API và bị F2 guard bác bỏ; route
single/comparison/explanation không nhận được kết quả.

Sửa tại `backend/app/models.py` và `frontend/lib/contract-guards.ts`:

- chỉ `solution_quality=exact` mới cấm exact reference tốt hơn;
- `epsilon_bounded` cho phép gap dương trong tolerance khi không vượt
  `metrics.epsilon_bound`;
- gap vượt epsilon vẫn là integrity error;
- B2 IDA* phải có `epsilon_bound` hữu hạn dương.

Không đổi IDA*, UCS, heuristic, trọng số hay cách tính reference.

### 3.2. F2 chấp nhận B2 có `applied_scenario=null` hoặc GraphView ngoài miền — cao

`appliedScenario(..., required=true)` trước đây vẫn trả `null`; regex
`teach_\d+` còn chấp nhận `teach_0`, `teach_51`, `teach_999`. Điều này trái complete
B2 API response và miền `teach_3…teach_50`, có thể làm mất fingerprint/view
authority.

Sửa guard để B2 route/multiroute bắt buộc `AppliedScenario` không null và giới
hạn đúng GraphView. `TraceV2`/`MultirouteV2` types được làm non-null. B1 vẫn
dual-read và normalize field vắng/null như trước. Backend Pydantic vẫn giữ field
nullable có chủ ý cho direct algorithm call/fixture cũ theo SCHEMA §E.3; public
API producer hiện luôn echo non-null và live matrix đã xác minh.

### 3.3. Frontend chấp nhận `epsilon=0` dù API yêu cầu `gt=0` — trung bình

Phase-2 snapshot policy dùng điều kiện `< 0`, nên `0` lọt qua rồi API trả 422.
Sửa thành `<= 0`, đồng bộ thông báo “hữu hạn dương”. Store bắt riêng lỗi khi tạo
snapshot và hiện toast trước khi bắt đầu lifecycle/request; không còn Promise
rejection ngoài `try` hoặc request sai miền. Catch chỉ bao quanh input/snapshot
validation, không nuốt backend contract error hay downgrade response.

### 3.4. Result envelope chưa đối chiếu response với immutable snapshot — cao

Trước sửa, envelope chỉ khóa fingerprint/capability; response sai algorithm,
method, graph, mode, slot, graph view hoặc B2 ATSP topology vẫn có thể gắn vào
session nếu fingerprint giống. Một số test còn dùng fixture `algorithm=astar`
cho slot mang ID `ucs`/`beam`, vô tình che lỗ này.

Sửa `frontend/lib/comparison-policy.ts` để route/ATSP envelope kiểm tra toàn bộ
request identity trước khi deep-freeze/attach. Tests được sửa thành payload đúng
algorithm và thêm negative cases cho từng nhóm identity. Đây là validation của
Phase-2 state authority, không sửa UI/map/comparison feature Phase 5–6.

## 4. Regression tests đã thêm/cập nhật

- `backend/tests/test_ui_v2_phase1_contract.py`:
  - API regression đúng request IDA* ở trên;
  - chứng minh exact reference tốt hơn nhưng gap nằm trong epsilon;
  - payload vượt bound bị Pydantic từ chối;
  - request epsilon 0 trả 422.
- `frontend/tests/contract-guards.test.mjs`:
  - IDA* B2 gap trong/vượt epsilon và zero bound;
  - B2 null `applied_scenario` route/ATSP;
  - GraphView ngoài miền.
- `frontend/tests/journey-mode-policy.test.mjs`:
  - epsilon 0, âm, NaN, Infinity bị từ chối; số dương nhỏ hợp lệ.
- `frontend/tests/comparison-policy.test.mjs`:
  - response/snapshot algorithm, slot/context, graph view, method và topology
    mismatch bị từ chối;
  - fixtures comparison cũ được sửa để phản ánh đúng runtime identity.

Không xóa, skip, nới assertion hoặc thay assertion hành vi bằng snapshot của chính
implementation.

## 5. Compatibility và non-regression

- B1/F1 và B2/F1: không xóa/đổi legacy JSON field; backend response shape chỉ
  được validate đúng semantics đã khóa.
- B1/F2: committed legacy mocks vẫn parse, `applied_scenario` vắng/null vẫn được
  normalize; không fabricate evidence hay fingerprint.
- B2/F2: live FastAPI JSON qua guard đạt 540/540 broad route requests, thêm 9/9
  trace-on và 9/9 trivial variants. Có 8 IDA* response với exact gap dương được
  guard chấp nhận đúng.
- Found/trivial/no-path/cap/pruning, trace on/off, ba cost modes, bốn time slots,
  beam/epsilon boundaries tiếp tục được full backend/frontend suites cover.
- In-memory disconnected fixtures cover no-path của cả chín thuật toán và typed
  ATSP matrix-incomplete; committed demo/real graph là SCC nên không fabricate
  một public no-path case.
- Live Phase-5 route comparison session với A*/UCS/IDA*/Beam kết thúc 4 `success`.
- Live Phase-6 ATSP comparison session với Held–Karp/NN+local-search/SA, closed
  topology, kết thúc 3 `success`.
- Production build giữ các route `/`, `/benchmark`, `/_not-found` và `/icon.svg`.

## 6. Lệnh kiểm chứng và kết quả thực tế

| Lệnh/gate | Kết quả |
|---|---|
| `git status --short --branch` trước sửa | PASS — `main...origin/main`, clean |
| `git log`, `git show`, `git diff`, `git blame` | PASS — lịch sử/commit gây lỗi như §1–2 |
| `.venv\Scripts\python.exe -m pytest backend\tests\test_ui_v2_phase1_contract.py -q -p no:cacheprovider` | PASS — 42 tests, 1 dependency warning |
| Targeted Node contract/journey/comparison tests | PASS — 31 tests |
| `.venv\Scripts\python.exe -m pytest backend\tests\ -q -p no:cacheprovider` | PASS — 231 tests, 1 warning, 38.73 s |
| `npm test` trong `frontend/` | PASS — 128/128 |
| `npx tsc --noEmit --incremental false` trong `frontend/` | PASS — exit 0, 41.4 s |
| `npm run build` trong `frontend/` | PASS — Next 15.5.22, compile/type/static 6/6, 172.6 s |
| `.venv\Scripts\python.exe scripts\validate_data.py` | PASS — `ALL DATA VALID` |
| Live Uvicorn `API → parseTraceResponse/parseMultirouteResponse → snapshot/envelope/session` | PASS — 540 broad + 9 traced + 9 trivial + 2 boundary; route 4/4 và ATSP 3/3 success |
| `git diff --check` | PASS |
| Static search hardcode/test-only/debug/skip/only | PASS — không có hit trong file Phase 1–2 đã sửa |

Hai lần chạy trung gian không được tính là gate pass: một full pytest bị wrapper
timeout sau 5 giây do đặt timeout thử quá ngắn và được chạy lại đầy đủ; một lần
Node inline đầu tiên lỗi quoting trước khi import guard, sau đó cùng matrix được
chạy lại qua stdin và pass. Audit server Uvicorn riêng đã được dừng sau matrix.

Không chạy benchmark, data/profile pipeline hoặc teaching generator.

## 7. Audit hardcode, fallback và test bypass

- Không có hardcode theo node ID trong runtime patch; cặp OD tái hiện chỉ nằm ở
  regression test/audit evidence.
- Không có branch theo test environment, fixture ID, `NODE_ENV` hoặc pytest.
- Không thêm silent downgrade, default fabricate, unsafe cast mới, debug output,
  skipped/only test hay assertion bị làm yếu.
- `createRunSnapshotSafely` chỉ chuyển validation error thành user-visible toast
  trước request; contract/API errors sau request vẫn đi theo fatal/partial policy
  hiện hành.
- So sánh epsilon dùng cùng absolute/relative raw tolerance đã khóa, không dùng
  số làm tròn UI.
- Response identity được xác minh từ immutable snapshot, không suy từ path/legs,
  label UI hoặc prose.

## 8. Blind spot và rủi ro còn lại

1. Không chạy controlled browser automation trong audit này. Bằng chứng Phase 5–6
   sau sửa là full frontend tests, typecheck, production build và live policy/session
   matrix; readiness Phase 5–6 vẫn giữ browser evidence lịch sử của teammate/user.
2. Không dựng deployment mixed-version thật. B1/F2 dùng committed legacy fixtures;
   B2/F2 dùng live local FastAPI.
3. `StarletteDeprecationWarning` của `fastapi.testclient`/`httpx` còn tồn tại; không
   phải contract failure.
4. Public no-path không tái hiện trên base snapshots vì cả hai graph là SCC; unit
   directed-disconnected cases vẫn cover variant này.
5. `results/` vẫn stale/`SỐ TẠM` theo `AGENTS.md` và không được dùng làm bằng chứng.

Không còn source-of-truth conflict hay abort condition mở trong phạm vi Phase 1–2.

## 9. Verdict

**READY**

Phase 1–2 đã được revalidate trên HEAD có Phase 5–6. Root cause IDA* và ba nhóm
lỗi contract/state độc lập đã được sửa trong phạm vi Phase 1–2; mọi gate bắt buộc
đã pass. Phase 5–6 tiếp tục hoạt động an toàn theo automated/runtime evidence ở
trên. Verdict này không thay thế browser pre-flight trước buổi demo.
