# UI & Explanation v2 — Phase 8 Readiness

Ngày rà soát: 2026-08-11

Repository: `ThaiQuangHuy2906/Lab1_Searching`

Branch/HEAD được đối chiếu: `main` / `b3218b5c7d4777c3c998d3bbc36b7b5e4d0e2ae3`

## 1. Kết luận

**Verdict: NOT READY — BLOCKED BY PHASE 7 VÀ FINAL QA CHƯA ĐỦ EVIDENCE**

Phạm vi Phase 8 em chọn là đúng: correctness hardening, resilience,
accessibility, responsive, performance và QA cuối. Thứ tự Phase 7 rồi Phase 8
cũng đúng với kế hoạch của nhóm vì final QA chỉ có ý nghĩa sau khi ATSP
comparison đã được nối end-to-end.

File cũ có một thông tin đã lỗi thời: blocker validator IDA* epsilon hiện đã
được sửa trên `main`. Tuy nhiên Phase 8 vẫn chưa thể READY vì Phase 7 chưa
reachable từ UI, ATSP closed-tour còn copy sai, accessibility chưa được nhóm
kiểm và chưa có evidence performance/final browser matrix gắn với commit hiện
tại.

## 2. Thay đổi quan trọng so với file cũ

### IDA* epsilon blocker đã đóng

`backend/app/models.py` hiện phân biệt `solution_quality="exact"` với
`solution_quality="epsilon_bounded"`:

- exact chỉ chấp nhận optimality gap bằng 0 trong tolerance;
- epsilon-bounded chấp nhận gap không vượt `epsilon_bound` trong tolerance;
- frontend contract guard có regression “accept within epsilon, reject bound
  violation”.

Do đó không còn đúng nếu tiếp tục ghi `P8-BLOCK-01` là blocker đang mở. Đây là
correction quan trọng nhất của Phase 8.

### Phase 7 vẫn là blocker

ATSP comparison session đã có trong store nhưng panel vẫn trả
`comparison_pending`; CTA, workspace N-pane, cross-method table và retry ATSP
chưa được nối. Phase 8 không thể ký final functional/a11y/performance gate cho
một flow người dùng chưa chạy được.

## 3. Hiện trạng hardening trên `main`

| Hạng mục | Hiện trạng |
|---|---|
| IDA* exact/epsilon contract | Đã sửa ở model/guard; có regression hiện hành. |
| Route comparison 2–4 | Phase 6 READY theo user-reported manual browser QA. |
| ATSP comparison 2–3 | Chưa triển khai UI end-to-end. |
| Stale response/cancel/integrity policy | Có pure/store tests; chưa có final browser evidence cho ATSP UI. |
| Open/closed ATSP | Snapshot/response guard có; `atsp-result.tsx` vẫn có câu copy chỉ đúng cho open tour. |
| Backend/basemap offline | Có các cơ chế nền; chưa có final evidence matrix Phase 8. |
| Keyboard/screen reader | Một số control cũ đã được test ở Phase 3; ATSP comparison và NVDA final smoke chưa có. |
| Reduced motion/contrast/reflow | Có baseline từ phase trước; chưa chạy lại cho UI Phase 7–8. |
| Performance/GPU/memory | Nhóm đã tự đánh dấu đã kiểm, nhưng file chưa ghi environment/trace/snapshot để tái kiểm. |

## 4. Gate correctness và resilience

Phase 8 phải giữ các quy tắc sau:

- dùng structured fields, không parse prose để tạo guarantee, ranking, gap hay
  runtime;
- so sánh bằng raw values, chỉ round ở bước hiển thị;
- distance dùng km, travel time dùng phút, computation runtime dùng ms;
- `found=false`, HTTP error, matrix incomplete và closing-leg no-path là các
  trạng thái khác nhau;
- partial failure giữ các kết quả đã hoàn tất;
- response cũ sau đổi input/cancel không được ghi vào session mới;
- fingerprint/capability mismatch dừng ranking và hủy các slot còn lại;
- backend offline không treo progress; basemap offline không làm mất graph,
  route hoặc bảng;
- retry dùng lại immutable snapshot và không reset identity guards.

## 5. Gate accessibility và responsive

Các gate này chưa được tick vì nhóm xác nhận chưa test trên điện thoại và chưa
kiểm cho người dùng khuyết tật:

- [ ] Tab/Shift+Tab toàn app không focus trap; Escape và focus return đúng.
- [ ] Checkbox/button/disclosure chạy bằng Space/Enter; radio hỗ trợ arrow keys.
- [ ] Progress `run 2/3`, success/no-path/error/cancelled được đọc bằng live region
  vừa đủ, không spam.
- [ ] NVDA + Chrome đọc được group, status, error, table caption và expanded state.
- [ ] `prefers-reduced-motion` tắt autoplay/chuyển động không cần thiết.
- [ ] Contrast, focus ring, selected/error state và target size đạt yêu cầu.
- [ ] 1366×768, 1024×768, 390×844, 320×568 và 200% zoom không mất chức năng.

Automated accessibility scan chỉ hỗ trợ; nó không thay keyboard và screen-reader
manual QA.

## 6. Gate performance

Môi trường đo phải ghi OS, CPU, RAM, GPU, browser version, build mode, viewport
và device scale factor. Kịch bản tối thiểu gồm route comparison 4 thuật toán,
ATSP comparison 3 method, ba vòng `run → clear → run`, pan/zoom, mở drawer và
resize.

| Chỉ số | Mục tiêu Phase 8 |
|---|---:|
| WebGL/context | 0 context loss, 0 console GPU error |
| Pan/zoom median | ≥ 30 FPS |
| UI interaction p95 | < 100 ms cho action không phụ thuộc network |
| Grid render | ≤ 1 s sau response cuối |
| Heap growth | Không tăng bền vững > 10% sau ba vòng và cơ hội GC |

Các dấu tick performance trong file nhóm gửi được ghi nhận ở mục 8, nhưng chưa
được nâng thành evidence cuối vì thiếu môi trường và trace đi kèm.

## 7. Evidence rà soát lần này

| Gate | Kết quả |
|---|---|
| `git rev-parse HEAD` | PASS — `b3218b5c7d4777c3c998d3bbc36b7b5e4d0e2ae3` |
| `npm test` trong `frontend/` | PASS — 128/128 |
| IDA* epsilon guard trong frontend test | PASS trong full `npm test` |
| `python3 scripts/validate_data.py` | PASS — `ALL DATA VALID`; G_real 2118/4699, G_demo 51/298 |
| `git diff --check` | PASS |
| Backend full pytest bằng Python 3.14 | NOT RUN trong phiên rà soát này |
| TypeScript check / production build | NOT RUN trong phiên rà soát này |
| Functional browser QA P8-F01..F18 | Chưa có evidence ledger gắn với HEAD hiện tại |
| Accessibility QA P8-A01..A12 | NOT RUN theo xác nhận của nhóm |
| Performance trace | Chưa có environment/trace để tái kiểm |

Không được đổi các dòng NOT RUN thành PASS chỉ từ baseline `128/128`, vì unit
test không đo browser layout, screen reader, FPS, WebGL context hoặc heap.

## 8. Checklist nhóm đã tự kiểm

Giữ nguyên tinh thần các dấu tick cuối file nhóm gửi. Đây là **user-reported
manual QA**, chưa phải final evidence của đúng commit:

### Correctness và functional

- ☑ Nhóm đã kiểm objective, unit, guarantee, savings, gap và runtime.
- ☑ Nhóm đã kiểm open/closed, no-path, partial failure, stale response và retry
  ở các lớp hiện có.
- ☑ Nhóm đã kiểm không parse prose để tạo fact định lượng.
- ☑ Nhóm đã kiểm backend pytest, validator, frontend tests/build trên máy nhóm.
- ☑ Nhóm đã kiểm không còn Critical/High issue trong phạm vi đã chạy.
- ☑ Nhóm đã kiểm repository hygiene và `git diff --check`.

### Performance do nhóm xác nhận đã chạy

- ☑ Không thấy WebGL context loss hoặc console GPU error.
- ☑ Pan/zoom đạt mức nhóm chấp nhận.
- ☑ Tương tác UI không phụ thuộc network đạt mức nhóm chấp nhận.
- ☑ Grid ổn định sau response cuối.
- ☑ Không thấy heap tăng bền vững qua protocol nhóm đã chạy.
- ☑ Renderer vẫn giữ đủ N pane trong kịch bản nhóm kiểm.

### Gate nhóm chưa kiểm

- [ ] Keyboard/focus matrix đầy đủ.
- [ ] NVDA/screen-reader smoke.
- [ ] Reduced motion, contrast và target size đầy đủ.
- [ ] Mobile 390×844, 320×568 và 200% zoom.
- [ ] Evidence ledger cho toàn bộ functional/accessibility/performance matrix.

## 9. Việc cần làm trước khi ký READY

1. Hoàn tất và ký READY Phase 7 trên đúng commit.
2. Sửa copy open/closed trong kết quả ATSP và thêm regression.
3. Chạy backend full suite bằng Python 3.14, typecheck và production build.
4. Chạy browser QA cho single route, route comparison, ATSP single và ATSP
   comparison; ghi expected/actual, viewport, request và console/network.
5. Chạy keyboard, NVDA, reduced-motion, contrast, mobile/reflow và 200% zoom.
6. Ghi environment + trace/snapshot cho các số performance nhóm đã kiểm.
7. Cập nhật `docs/SCHEMA.md` và `docs/CODEX-CODEBASE-MAP.md` nếu implementation
   Phase 7–8 làm đổi public contract hoặc thêm component/store/test mới.

## 10. Verdict

**PHASE 8: NOT READY.**

Luồng công việc của file cũ đúng, nhưng trạng thái IDA* đã lỗi thời và các dấu
tick performance/verification chưa được tách khỏi bằng chứng có thể tái kiểm.
Bản này sửa lại theo cùng form Phase 5–6, giữ rõ những gì nhóm đã test, những gì
audit hiện tại xác nhận và những gate accessibility/mobile còn mở.
