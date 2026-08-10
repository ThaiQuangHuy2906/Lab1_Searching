# UI & Explanation v2 — Phase 6 Readiness

Ngày kiểm chứng: 2026-08-10  
Repository: `C:\HCMUS\AI\Lab1_Searching`  
Branch/HEAD nền: `main` / `94eb7e3d77e01e2a44b7847d7af2b491981b415b`

## 1. Kết luận

**Verdict: IMPLEMENTED — BROWSER GATE PENDING**

Phase 6 route comparison đã được nối end-to-end cho two-point và ordered
multi-point: chọn 2–4 thuật toán ở panel trái, chạy tuần tự trên cùng immutable
snapshot, hiển thị đúng N map final-only ở giữa và gom metrics N-way vào tab
`So sánh` ở drawer phải.

Chưa đánh dấu `READY` vì phiên agent không có browser runtime để kiểm visual,
WebGL context và interaction thật với 2/3/4 MapLibre/deck.gl surfaces. Không có
hạng mục ATSP comparison Phase 7 nào được thêm vào UI.

## 2. Hành vi đã triển khai

- `Chạy một / So sánh nhiều` tiếp tục là run-strategy control duy nhất ở panel
  trái.
- Selector route giữ 2–4 thuật toán, thứ tự chọn ổn định; đủ 4 thì khóa mục chưa
  chọn và yêu cầu bỏ một mục trước.
- CTA chạy comparison tuần tự; khi đang chạy CTA đổi thành `Hủy so sánh`.
- N selected luôn tạo N pane cho queued/running/success/no-path/error/cancelled.
- N=2 dùng hai cột bằng nhau; N=3 dùng ba frame cùng kích thước với pane cuối
  căn giữa hàng dưới; N=4 dùng 2×2. Mobile chuyển một cột cuộn nội bộ.
- Các map cho pan, zoom, Home và tooltip; không node/edge picking, không clear,
  editor, timeline, autoplay hoặc route-flow.
- Mỗi pane sở hữu camera riêng; pan/zoom/Home không thay đổi pane khác.
- Drawer phải trên desktop có separator kéo rộng từ 360 px đến giới hạn còn
  chỗ cho map (tối đa 720 px), keyboard Left/Right/Home/End và double-click
  reset 400 px.
- Mỗi map render final route riêng, endpoints/stops và cùng graph/traffic/
  scenario geometry đã memoize.
- Drawer phải có status, ranking, objective/outcome/effort, guarantee, integrity
  insight, retry từng item và mở explanation đúng result.
- Cancel giữ item đã hoàn tất và chuyển queued/running thành cancelled. Retry
  chỉ chạy lại item error/cancelled bằng snapshot cũ.
- Scenario editor bị khóa read-only trong compare mode; override đã có được áp
  dụng giống nhau cho mọi thuật toán.
- Scalar A/B selector/action và overlay hai tuyến trên primary map đã được bỏ.

## 3. File chính

- `frontend/components/comparison/route-comparison-workspace.tsx`
- `frontend/components/route-map-canvas.tsx`
- `frontend/components/control-panel.tsx`
- `frontend/components/drawer/compare-tab.tsx`
- `frontend/components/drawer/drawer.tsx`
- `frontend/components/drawer/scenario-tab.tsx`
- `frontend/app/page.tsx`
- `frontend/lib/store.ts`
- `frontend/lib/comparison-map-policy.ts`
- `frontend/lib/drawer-resize-policy.ts`
- `frontend/lib/single-run-panel-policy.ts`
- `frontend/tests/comparison-map-policy.test.mjs`
- `frontend/tests/drawer-resize-policy.test.mjs`
- `frontend/tests/single-run-panel-policy.test.mjs`

## 4. Evidence đã chạy

| Gate | Kết quả |
|---|---|
| `npm test` | PASS — 119/119 |
| `npx tsc --noEmit --incremental false` | PASS |
| Backend full suite bằng Python 3.14.5 isolated | PASS — 230/230, 1 warning |
| `scripts/validate_data.py` | PASS — `ALL DATA VALID` |
| Frontend `/` dev HTTP smoke | PASS — HTTP 200 |
| Backend `/api/health` smoke | PASS — HTTP 200 |
| `git diff --check` | PASS |
| `npm run build` | SKIPPED — Next dev server đang chạy |
| Controlled browser QA | NOT RUN — không có browser runtime khả dụng |

## 5. Browser gate còn mở

- Two-point với N=2, N=3 và N=4 ở 1366×768: số pane, kích thước, route và table
  phải khớp selection order.
- Pan/zoom/Home từng pane phải độc lập và không làm pane khác đổi camera.
- Kéo/keyboard resize drawer phải không làm page-level overflow; double-click
  đưa drawer về 400 px.
- Xác nhận không thể chọn node/cạnh, clear hoặc sửa scenario trên compare maps.
- Ordered multi-point N=2 và N=4: đủ số chặng/marker/final route.
- Cancel giữa item, partial failure và retry từng card.
- Drawer table, horizontal scroll và explanation subject đúng result.
- 1024×768, 390×844 và 320×568 không có page-level horizontal scroll.
- Console không có React/deck.gl error hoặc `WebGL context lost`.

Phase 6 không thay backend/schema/data/cost/algorithm và không triển khai ATSP
comparison 2–3 của Phase 7.
