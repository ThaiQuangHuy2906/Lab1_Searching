# UI & Explanation v2 — Phase 8 Readiness

Ngày kiểm chứng: 2026-08-11  
Branch/HEAD nền: `main` / `821e77d38b41bb98e473be620b17c76e09a000d8`

## 1. Kết luận

**Verdict: READY WITH KNOWN ISSUES — CHROME DESKTOP QA PASSED**

Phase 8 hardening, accessibility và performance đã được audit và vá trên nền
Phase 7. Automated gates và Chrome 151 maximized trên màn hình laptop vật lý
2560×1440, scale 150% (viewport CSS 1707×825, DPR 1,5) đều đạt trong phạm vi
Desktop-only của final audit. Known issues còn lại là chưa chạy NVDA và chưa đo
FPS/interaction-p95/heap bằng profiler; chúng không được suy là đã pass.

**Artifact closeout sau readiness:** ngày 2026-08-11, chuỗi benchmark exp1–exp7,
gamma calibration và teaching generator đã hoàn tất trên graph/profile hiện hành;
trang `/benchmark` chuyển từ provenance tạm sang kết quả chính thức. Đây là sync
artifact/copy, không thay đổi verdict hành vi Phase 8 ở trên. Closeout gate đạt
backend 235/235, frontend 137/137, validator/TypeScript/build; Chrome 151 native
full-view cũng xác nhận trang hiện đủ ba chart, keyboard/reduced-motion, không
overflow ngang và console 0 error/warning.

## 2. Hardening đã hoàn tất bằng code/test

- [x] `found=false` tiếp tục là typed result, không bị biến thành HTTP error.
- [x] Ordered N-point open/closed và comparison giữ regression coverage.
- [x] Comparison giữ partial success, cancel, retry riêng, stale run guard và
  write-once scenario fingerprint/capability.
- [x] Single route/ATSP backend error trở thành alert bền trong drawer và có nút
  `Chạy lại`; toast chỉ còn là thông báo bổ sung.
- [x] Đổi input/mode/slot/graph/scenario xóa result/error phụ thuộc và hủy run cũ.
- [x] Backend offline có copy rõ; graph load failure có trạng thái retry; basemap
  failure hướng dẫn bật chế độ offline.
- [x] Không còn `comparison_pending`, scalar A/B source-of-truth, `console.log`,
  `console.debug` hoặc `debugger` trong frontend source.

## 3. Accessibility đã hoàn tất bằng code/audit

- [x] Disclosure panel có heading thật, `aria-expanded`, `aria-controls` và vùng
  nội dung có ID ổn định.
- [x] Mobile sheet giữ focus, đóng bằng Escape và trả focus về trigger.
- [x] Progress/error comparison dùng `status`/`alert`, `aria-live` và `aria-busy`.
- [x] Bảng comparison/baseline/reference nằm trong named focusable scroll region.
- [x] Stop reorder có nút Lên/Xuống, focus return và polite announcement.
- [x] Reduced motion dừng autoplay, spinner/skeleton animation, button scale và
  camera fly/zoom transition; nội dung tĩnh vẫn đầy đủ.
- [x] Control chính có accessible name; timeline slider, drawer separator và map
  controls hỗ trợ keyboard.
- [ ] NVDA + Chrome smoke — chưa chạy, giữ là known issue.
- [ ] 200% zoom và audit đủ bảy palette — chưa chạy trong final Desktop audit.
- Mobile/tablet/narrow viewport chủ động không test theo phạm vi người dùng chốt.

## 4. Performance đã hoàn tất bằng code/audit

- [x] Comparison chỉ render final route, không tải/đồng bộ trace.
- [x] Route và ATSP comparison dùng shared graph geometry.
- [x] Mỗi map giữ camera riêng; collapse chỉ phát resize, không tự refit.
- [x] Comparison pane được `React.memo`; pane không đổi không render lại theo mỗi
  progress update của phương pháp khác.
- [x] Route-flow animation bị tắt trong comparison và reduced-motion.
- [x] Production build hoàn tất; trang chính 58,7 kB, first-load JS 242 kB.
- [x] Clean session chạy route N=1/2/3/4, ordered multi-point và ATSP N=1/2/3
  không có console error/warning hay page horizontal overflow.
- [ ] FPS, interaction p95 và heap ba vòng — chưa instrument; giữ là known issue.

## 5. Evidence đã chạy

| Gate | Kết quả |
|---|---|
| `npm test` | PASS — 136/136 |
| `npx tsc --noEmit --incremental false` | PASS |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS — 6/6 static pages |
| Full backend suite | PASS — 233/233, 1 dependency warning |
| `scripts/validate_data.py` | PASS — `ALL DATA VALID` |
| `git diff --check` | PASS |
| Chrome 151 maximized | PASS — physical 2560×1440; CSS 1707×825; DPR 1,5 |
| Clean runtime flows | PASS — route 1/2/3/4, ordered multi, ATSP 1/2/3; all API 200 |
| Clean console | PASS — 0 error, 0 warning |
| NVDA / FPS / p95 / heap | NOT RUN — known issues, không claim PASS |

Runtime failure injection được chạy riêng: route/ATSP HTTP 503 giữ alert/partial
success và retry đúng item; backend offline phục hồi qua retry; graph 503 hiện
alert + `Thử lại`; basemap failure hướng bật offline. Console sạch được đo ở
profile mới không tiêm lỗi, nên các 503 chủ động không bị lẫn vào verdict console.

## 6. Desktop runtime evidence và việc còn mở

- [x] Route single/compare 2/3/4; ordered multi; ATSP single/compare 2/3.
- [x] Drawer separator keyboard 400→424→400→720→360→400 px; close/open trả focus
  về trigger/heading; control panel close trả focus về trigger.
- [x] Reduced motion: loader có computed `animation-name: none`, kết quả và
  timeline vẫn hiện đầy đủ.
- [x] Backend offline: alert bền + `Chạy lại`; restart rồi retry nhận HTTP 200.
- [x] Graph 503: vùng map thành `role=alert`, có `Thử lại`, tải lại đúng 51/298/60.
- [x] Basemap failure: warning hướng bật offline; offline giữ DeckGL canvas và bỏ
  phụ thuộc/attribution basemap; bật online lại khôi phục MapLibre.
- [x] Cancel/retry/stale response và invalidation khi đổi slot/objective/đích,
  problem/run mode, graph, open/closed và scenario đều đạt.
- [x] Clean Chrome profile: 0 console error/warning, mọi request demo trả 200,
  document width bằng viewport width.
- [ ] NVDA và profiler FPS/p95/heap chưa chạy; không claim PASS.

Không test Mobile/Tablet/Narrow theo yêu cầu final audit. Nếu máy audit không
phải máy demo cuối: **FINAL DEMO-MACHINE PREFLIGHT REQUIRED**.
