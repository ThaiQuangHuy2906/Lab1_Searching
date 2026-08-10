# UI & Explanation v2 — Phase 5 Readiness

Ngày kiểm chứng: 2026-08-10  
Repository: `C:\HCMUS\AI\Lab1_Searching`  
Branch/HEAD khi kiểm chứng: `main` / `94eb7e3d77e01e2a44b7847d7af2b491981b415b`

## 1. Kết luận

**Verdict: READY**

Phần code của Phase 5 đã hoàn tất: bản đồ single-run được tách thành wrapper
giữ state/tương tác và canvas dùng props; geometry có thể tính một lần rồi chia
sẻ cho nhiều canvas; final route có input riêng; comparison policy đã khóa chế
độ view-only. Chưa bật N-map workspace hoặc thay luồng comparison hiện hành.

User đã kiểm tra trực tiếp primary map sau refactor và xác nhận các hành vi còn
lại ổn định. Quyết định IA cho Phase 6 cũng được chốt lại: segmented control
`Chạy một / So sánh nhiều` nằm trong `Chế độ chạy` ở panel thiết lập bên trái;
tab `So sánh` trong drawer kết quả chỉ trình bày bảng đối chiếu sau khi chạy,
không kích hoạt comparison mode.

## 2. Kiến trúc sau khi tách

~~~text
MapView (single-run wrapper)
├── Zustand selectors
├── node/edge picking và toast
├── useAnimation/usePalette
├── Legend + Timeline
└── RouteMapCanvas (prop-driven)
    ├── graph/traffic/scenario/result model
    ├── shared RouteMapGeometry
    ├── optional finalRouteNodeIds
    ├── controlled hoặc internal viewState
    └── primary/comparison interaction policy
~~~

- `MapView` vẫn là entry point cũ nên page/layout không đổi.
- `RouteMapCanvas` không import Zustand, toast, `useAnimation` hoặc
  `usePalette`.
- `primary` giữ selection, edge edit, clear, trace animation và chrome cũ.
- `comparison` chỉ cho navigation/tooltip; không pick journey/edge, clear,
  autoplay/route-flow hoặc editor banner.
- Geometry chia sẻ gồm node coordinates, node-cloud bounds và edge endpoint
  coordinates. Các edge có endpoint không tồn tại bị loại thay vì vẽ về tọa độ
  giả.
- `finalRouteNodeIds` cho phép pane Phase 6 render final-only mà không phải tạo
  state computation/trace giả.

## 3. File chính

- `frontend/components/map-view.tsx`: wrapper single-run mỏng.
- `frontend/components/route-map-canvas.tsx`: canvas/layers/camera prop-driven.
- `frontend/lib/map-geometry.ts`: geometry dùng chung và route-arrow geometry.
- `frontend/lib/map-canvas-policy.ts`: capability primary/comparison thuần.
- `frontend/tests/map-geometry.test.mjs`: bounds/path/shared-edge/arrow tests.
- `frontend/tests/map-canvas-policy.test.mjs`: interaction isolation tests.

## 4. Evidence đã chạy

| Gate | Kết quả |
|---|---|
| `npm test` | PASS — 117/117 |
| `npx tsc --noEmit --incremental false` | PASS |
| Backend full suite bằng Python 3.14.5 isolated | PASS — 230/230, 1 warning |
| `.venv` Python 3.13.9 backend run | 229 pass, 1 environment-version assertion fail; không dùng làm verdict |
| `scripts/validate_data.py` | PASS — `ALL DATA VALID` |
| Frontend `/` dev HTTP smoke | PASS — HTTP 200 |
| Backend `/api/graph?level=demo` smoke | PASS — HTTP 200 |
| `git diff --check` | PASS |
| `npm run build` | SKIPPED — Next dev server đang chạy, theo safety rule không ghi đè `.next` |
| Controlled browser QA bằng agent | NOT RUN — không có browser runtime khả dụng trong phiên |
| Primary-map manual parity | PASS — user xác nhận các hành vi còn lại ổn định |

## 5. Ranh giới khi bắt đầu Phase 6

- Giữ segmented control `Chạy một / So sánh nhiều` ở panel trái làm nơi chuyển
  run strategy duy nhất.
- Drawer phải gom metrics vào tab/bảng `So sánh`; không đặt thêm CTA đổi chế độ
  hoặc selector thuật toán ở drawer.
- Single mode tiếp tục mount đúng một primary map đầy đủ tương tác.
- Compare mode mới được mount 2–4 `RouteMapCanvas` view-only và phải theo dõi
  browser console/WebGL khi nhiều canvas cùng hoạt động.

Phase 5 không thay backend/schema/data/cost/algorithm và không triển khai bất kỳ
hạng mục Phase 7 nào.
