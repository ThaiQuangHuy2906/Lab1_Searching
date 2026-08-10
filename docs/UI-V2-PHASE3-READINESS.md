# UI & Explanation v2 — Phase 3 Readiness

> Checkpoint lịch sử của Phase 3. Current-state và gate còn mở xem
> `docs/UI-V2-PHASE6-READINESS.md`; các câu về N-pane chưa triển khai chỉ mô tả
> ranh giới tại thời điểm Phase 3.

Ngày kiểm chứng: 2026-08-10  
Repository: `C:\Python\CSTTNT\Lab1_Searching`  
Branch/HEAD khi handoff: `main` / `97ec24fa7218e10bdbb1d17fd2c15f7c5fbd9994`

## 1. Kết luận nhanh

**Verdict: READY**

Phase 3 đã hoàn tất implementation và toàn bộ gate bắt buộc: controlled browser
QA, frontend tests, TypeScript, production build, backend Python 3.14 suite, data
validator và live API smoke đều pass trên diff hiện tại. Phase 5 có thể bắt đầu
chính thức từ baseline này.

Browser QA phát hiện một lỗi accessibility thật ở timeline: accessible name từng
nằm trên Radix Slider root thay vì focusable thumb. Lỗi đã được sửa trong
`frontend/components/ui/slider.tsx`, có regression test và đã được kiểm chứng lại
bằng keyboard/browser sau sửa.

## 2. Phạm vi đã triển khai

### Panel IA và ba single-run flow

- Panel trái được sắp theo đúng thứ tự:
  `Thiết lập dữ liệu → Loại bài toán → Hành trình → Cách xử lý → Chế độ chạy →
  Thuật toán/phương pháp → Hiển thị → Kịch bản thử nghiệm → CTA`.
- `problemMode`, `multiStrategy` và `runKind` quyết định control đang active;
  không suy loại bài toán từ `stops.length`.
- Goal hai điểm và Stops nhiều điểm là hai draft độc lập; chuyển mode không biến
  Goal thành stop. Start vẫn dùng chung.
- Ba CTA single-run được tách rõ:
  - `Chạy A*: Đi → Đến`;
  - `Chạy A* theo thứ tự đã chọn`;
  - `Tối ưu bằng Held–Karp`.
- Lý do bị chặn được hiển thị bền vững cạnh CTA: thiếu Đi/Đến/stops, trùng điểm,
  giới hạn ATSP/Held–Karp và chế độ compare chưa thuộc scope single-run.
- Nhánh `So sánh nhiều` không thể vô tình dispatch action single. N-pane
  comparison vẫn thuộc Phase 6.

### Hành trình nhiều điểm và open/closed

- Danh sách stop có nút Lên/Xuống/Xóa với accessible name chứa tên/vị trí.
- Nút reorder disabled đúng ở biên; sau reorder focus quay về item vừa chuyển và
  live region polite thông báo một lần.
- Switch `Quay về điểm Đi sau điểm giao cuối` dùng chung cho Ordered Search và
  ATSP; mặc định false.
- Closing Start không trở thành delivery stop/marker mới. Closing leg dùng nhãn
  `Chặng quay về Đi`.
- Request vẫn đi từ immutable snapshot Phase 2; thay đổi active mode/strategy/
  return invalidates result/session không còn tương thích và không tự chạy lại.

### Collapse desktop và mobile sheet

- `controlsOpen` là page-local state, mặc định true, không persist và độc lập với
  mobile sheet.
- Desktop từ 960 px có rail nhỏ để mở lại; nội dung panel bị unmount khi đóng nên
  không còn trong tab order.
- Đóng/mở chuyển focus giữa heading và trigger; không thay đổi computation state,
  result, timeline hoặc camera.
- Sau thay đổi chiều rộng chỉ dispatch resize cho DeckGL/MapLibre; không tự
  fit/fly camera.
- Desktop disclosure không xuất hiện bên trong mobile sheet.

### Explain single result

- `ExplainTab` là thin router theo exact `explanationSubject`, không tự ưu tiên
  object cũ còn trong store.
- Route và ATSP dùng immutable result envelope, structured evidence v2 và
  presenter Phase 2; v1 dùng fallback bảo thủ.
- First section trình bày algorithm/method, problem kind, mode, representative
  slot, graph/view, scenario provenance/override count, topology và verdict.
- Các phần kết quả gồm context, verdict/quality limitation, current step, cost
  breakdown, factors, tuyến tham chiếu hậu kiểm, ordered per-leg explanation và
  ATSP success/failure.
- Copy bắt buộc được giữ:
  - `Tuyến tham chiếu được hệ thống tính thêm sau khi chạy`;
  - `Theo hồ sơ khung giờ đại diện…, không phải giao thông trực tiếp`;
  - `Trong graph/view/mode/slot/scenario hiện tại`;
  - balanced cost dùng `phút quy đổi`, không gọi là ETA.
- Các nhãn backend khó hiểu như `cost_breakdown`, `reference_comparison` và
  `ảnh hưởng objective` đã được thay bằng diễn giải tiếng Việt; nguồn kỹ thuật
  nằm dưới disclosure.
- v1 không suy rule, không nâng no-path thành proven unreachable, không tạo
  breakdown/reference giả và không biến null thành 0.

## 3. File chính

- `frontend/app/page.tsx`: page-local desktop collapse và resize không refit.
- `frontend/components/control-panel.tsx`: IA, active controls, CTA và focus.
- `frontend/components/atsp/atsp-setup.tsx`: stop list, reorder a11y và return.
- `frontend/components/drawer/drawer.tsx`: integration/focus cho result sheet.
- `frontend/components/drawer/explain-tab.tsx`: exact subject router.
- `frontend/components/explanation/route-explanation.tsx`: route/ordered Explain.
- `frontend/components/explanation/atsp-explanation.tsx`: ATSP Explain.
- `frontend/components/explanation/result-context-strip.tsx`: immutable context.
- `frontend/components/explanation/cost-breakdown.tsx`: mode-aware breakdown.
- `frontend/components/explanation/search-step.tsx`: current-step section.
- `frontend/lib/single-run-panel-policy.ts`: active-control, CTA và reorder policy.
- `frontend/lib/factor-presentation.ts`: copy/unit cho factors.
- `frontend/lib/interaction-policy.ts`: inactive Goal marker và interaction policy.
- `frontend/lib/atsp-trace-policy.ts`: closing marker/timeline integration.
- `frontend/components/ui/slider.tsx`: đưa accessible name lên focusable timeline
  thumb.
- `frontend/tests/single-run-panel-policy.test.mjs` và
  `frontend/tests/factor-presentation.test.mjs`: regression tests mới.

Các file trên đang nằm trong worktree chưa commit ở thời điểm handoff. Bảo toàn
toàn bộ thay đổi này trước khi tiếp tục.

## 4. Automated evidence

Các lệnh được chạy trên diff hiện tại:

| Lệnh | Kết quả thực tế |
|---|---|
| `npm test` trong `frontend/` | PASS — 112/112 tests |
| `npx tsc --noEmit --incremental false` trong `frontend/` | PASS — exit 0 |
| `.venv\Scripts\python.exe scripts\validate_data.py` | PASS — `ALL DATA VALID`; G_real 2118/4699, G_demo 51/298 |
| Python 3.14 temp venv: `python.exe -m pytest backend\tests\ -q -p no:cacheprovider --basetemp ...` | PASS — 230/230, 1 Starlette deprecation warning, 16,57 s |
| `npm run build` trong `frontend/` | PASS — Next.js 15.5.22 compile/type/static generation 6/6, 28,8 s |
| Controlled Playwright/Chrome QA | PASS — 113/113 runtime assertions, 0 console error, 0 pageerror, 0 failed internal request, 0 HTTP ≥ 400 |
| Live HTTP smoke trên backend/frontend dev | PASS — proxy health HTTP 200 và G_demo 51/298 qua `192.168.137.1:3000`; A* found; Bidi v2 found; ATSP open 3 legs và closed 4 legs |
| `git diff --check` | PASS — không có whitespace error |
| `git diff --name-only -- backend data results scripts report` | PASS phạm vi — không có output |

Frontend test count 112 là số fresh hiện tại, không phải baseline lịch sử 100.
Máy đã được cài Python 3.14.7 ở phạm vi user để kiểm chứng; suite chạy trong một
virtualenv tạm tách biệt và không thay `.venv` Python 3.13 hiện hữu của repository.

## 5. Browser evidence

Browser plugin không có runtime trong surface VS Code hiện tại. Sau khi người
dùng cấp quyền rõ ràng, QA được chạy bằng Playwright độc lập với Chrome hệ thống,
dependency nằm trong thư mục tạm ngoài repository.

- URL kiểm chứng: `http://192.168.137.1:3000` qua Next same-origin `/api/*` proxy.
- Viewport: 1366×768, 1024×768, 390×844 và 320×844.
- 1366×768: A* hai điểm có 12 bước; Ordered Search open/closed có 3/4 chặng;
  Held–Karp open/closed có 3/4 legs; topology, closing leg và stale-result
  invalidation đều khớp response thật.
- 1024×768: control rail collapse/reopen, result overlay, Escape, focus return và
  map resize đều pass.
- 390/320 px: mobile setup/result sheet, CTA trong viewport, focus trap, nested
  Escape, ArrowLeft/ArrowRight radio và không horizontal page scroll đều pass.
- `prefers-reduced-motion: reduce`: autoplay disabled, Space không tự chạy
  timeline và transition bị triệt tiêu.
- Theme `Trắng` cập nhật `data-theme=light`; các ảnh desktop/mobile đã được kiểm
  tra trực quan, không thấy collision hoặc clipping chặn thao tác.
- Runtime cuối: 113/113 assertions pass; console/pageerror/network/API gate sạch.

## 6. Compatibility và giới hạn phạm vi

- B1/F2 được cover bằng pure fixture/guard tests; không có runtime B1 deployment
  exercise.
- Không parse `summary_vi` để lấy numeric truth/hierarchy cho v2.
- Không triển khai map reference overlay của Phase 5.
- Không triển khai N-map route comparison của Phase 6 hoặc ATSP comparison của
  Phase 7.
- Không sửa backend/schema, graph, cost, heuristic, tie-break, stopping rule,
  reconstruction, seed, data, benchmark, `results/` hoặc generated teaching docs.
- Không commit, push hoặc tạo branch.

## 7. Rủi ro/ghi chú còn lại

1. B1/F2 compatibility vẫn được chứng minh bằng fixture/guard tests, không phải
   runtime deployment riêng; đây không phải blocker Phase 3.
2. Readiness doc Phase 1–2 ghi repository cũ dưới
   `C:\Users\Admin\Desktop\Lab01_Searching`; tài liệu này ghi đúng workspace hiện
   tại. Không dùng đường dẫn cũ làm runtime evidence.

## 8. Checklist READY đã hoàn tất

- [x] G_demo hiện tại là 51 nodes/298 directed edges.
- [x] A*, Ordered Search open/closed và ATSP open/closed ở 1366×768.
- [x] Panel/result overlay/collapse/focus/map ở 1024×768.
- [x] Mobile sheets, CTA và horizontal scroll ở 390×844 và 320×844.
- [x] Keyboard radio, reorder, focus trap/return và nested Escape.
- [x] Reduced motion, console, API/network và stale-result transition.
- [x] Browser-driven slider fix được kiểm chứng lại.
- [x] Frontend tests, TypeScript, build, validator, backend Python 3.14 suite và
  `git diff --check` pass sau sửa.
