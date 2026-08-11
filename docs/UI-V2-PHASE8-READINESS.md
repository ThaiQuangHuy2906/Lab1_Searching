# UI & Explanation v2 — Phase 8 Readiness

Ngày kiểm chứng: 2026-08-11  
Branch/HEAD nền: `main` / `b3218b5c7d47`

## 1. Kết luận

**Verdict: IMPLEMENTED — RUNTIME QA REQUIRED**

Phase 8 hardening, accessibility và performance đã được audit và vá trên nền
Phase 7. Automated gates đều đạt trong phạm vi dependency sẵn có. Chưa ghi READY
vì browser matrix, NVDA smoke và đo FPS/heap phải thực hiện trên máy Windows và
GPU dùng để demo; controlled browser của phiên này không truy cập được localhost.

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
- [ ] NVDA + Chrome smoke trên Windows — cần runtime thực.
- [ ] 320 px, 200% zoom và các palette — cần browser inspection thực.

## 4. Performance đã hoàn tất bằng code/audit

- [x] Comparison chỉ render final route, không tải/đồng bộ trace.
- [x] Route và ATSP comparison dùng shared graph geometry.
- [x] Mỗi map giữ camera riêng; collapse chỉ phát resize, không tự refit.
- [x] Comparison pane được `React.memo`; pane không đổi không render lại theo mỗi
  progress update của phương pháp khác.
- [x] Route-flow animation bị tắt trong comparison và reduced-motion.
- [x] Production build hoàn tất; trang chính 58,6 kB, first-load JS 242 kB.
- [ ] FPS, interaction p95, WebGL context và heap ba vòng — phải đo trên GPU máy demo.

## 5. Evidence đã chạy

| Gate | Kết quả |
|---|---|
| `npm test` | PASS — 135/135 |
| `npx tsc --noEmit --incremental false` | PASS |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS — 6/6 static pages |
| Backend core suite | PASS — 228, 1 health test deselected |
| `scripts/validate_data.py` | PASS — `ALL DATA VALID` |
| `git diff --check` | PASS |
| Controlled browser | BLOCKED — localhost bị chặn |
| Manual browser/NVDA/GPU | PENDING |

Backend suite dùng Python 3.12 tạm và bỏ test health yêu cầu đúng Python 3.14.
`test_artifact_generation.py` chưa collect được vì môi trường thiếu `matplotlib`;
network cài dependency bị chặn. Phase 8 không sửa backend/schema/data/algorithm.

## 6. QA cuối em cần chạy trên máy thật

- [ ] 1366×768: route comparison 2/3/4 và ATSP comparison 2/3.
- [ ] 1024×768: panel/drawer, focus return và grid reflow.
- [ ] 390×844, 320×568 và zoom 200%: không page-level horizontal scroll.
- [ ] Keyboard: Tab/Shift+Tab, radio arrow, Enter/Space, Escape sheets.
- [ ] Bật Windows `Reduce motion`: timeline không autoplay, camera không bay.
- [ ] Tắt backend: alert bền + Chạy lại; bật lại backend rồi retry thành công.
- [ ] Bật offline map: graph/tuyến vẫn đọc được, không phụ thuộc basemap.
- [ ] Cancel/retry comparison và đổi input lúc request đang chạy không nhận result cũ.
- [ ] NVDA đọc tên group, progress, per-card error, caption bảng và expanded state.
- [ ] G_demo 4 route maps, G_real 2 maps, ATSP 3 maps; ba vòng run → clear → run,
  không console error hoặc WebGL context loss.

Chỉ đổi verdict thành READY sau khi hoàn tất các mục runtime trên và ghi lại bằng
chứng viewport/browser/GPU đã dùng. Dùng `[x]` để đánh dấu, không gạch nội dung.
