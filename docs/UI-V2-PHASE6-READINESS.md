# UI & Explanation v2 — Phase 6 Readiness

> Checkpoint của route comparison Phase 6. Current-state tổng thể qua Phase 8
> xem `docs/UI-V2-PHASE8-READINESS.md`; count trong bảng Phase 6 là evidence tại
> thời điểm checkpoint.

Ngày kiểm chứng: 2026-08-10  
Repository: workspace local của `Lab1_Searching`
Branch/HEAD nền: `main` / `94eb7e3d77e01e2a44b7847d7af2b491981b415b`

## 1. Kết luận

**Verdict: READY — MANUAL BROWSER QA PASSED**

Phase 6 route comparison đã được nối end-to-end cho two-point và ordered
multi-point: chọn 2–4 thuật toán ở panel trái, chạy tuần tự trên cùng immutable
snapshot, hiển thị đúng N map final-only ở giữa và gom metrics N-way vào tab
`So sánh` ở drawer phải.

Người dùng đã kiểm trực tiếp trên browser và xác nhận luồng comparison đạt với
2/3/4 map, camera độc lập, thêm/bỏ thuật toán, compare mode read-only, bảng số
liệu và resize panel. Phiên agent không tự chạy controlled browser nên bằng
chứng này được ghi rõ là user-reported manual QA. Không có hạng mục ATSP
comparison Phase 7 nào được thêm vào UI trong chính phase này. Cảnh báo IDA* ε
ghi ở bản cũ đã được backend sửa sau đó và có regression; không còn là known
issue hiện hành.

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
- Chạy một hai điểm có route-reference explanation riêng: selector deterministic,
  bảng signed trade-off, câu theo mode/algorithm và dashed overlay trên primary
  map. Feature này không xuất hiện trong So sánh nhiều và không đổi backend schema.
- “Bước đang xem” được hạ xuống cuối explanation: câu phổ thông riêng cho chín
  thuật toán luôn hiện, còn g/h/f/frontier/μ/bound nằm trong disclosure kỹ thuật.
- Khi Explain tô đỏ `congested_segments`, panel ghi ngắn gọn rằng đây là các
  đoạn mức 4–5 trên tuyến kết quả cuối cùng, không phải đường thuật toán đang đi
  ở bước timeline hiện tại.

## 3. File chính

- `frontend/components/comparison/route-comparison-workspace.tsx`
- `frontend/components/route-map-canvas.tsx`
- `frontend/components/control-panel.tsx`
- `frontend/components/drawer/compare-tab.tsx`
- `frontend/components/drawer/drawer.tsx`
- `frontend/components/drawer/scenario-tab.tsx`
- `frontend/components/explanation/reference-route-comparison.tsx`
- `frontend/app/page.tsx`
- `frontend/lib/store.ts`
- `frontend/lib/comparison-map-policy.ts`
- `frontend/lib/drawer-resize-policy.ts`
- `frontend/lib/reference-route-presentation.ts`
- `frontend/lib/single-run-panel-policy.ts`
- `frontend/tests/comparison-map-policy.test.mjs`
- `frontend/tests/drawer-resize-policy.test.mjs`
- `frontend/tests/reference-route-presentation.test.mjs`
- `frontend/tests/single-run-panel-policy.test.mjs`

## 4. Evidence đã chạy

| Gate | Kết quả |
|---|---|
| `npm test` | PASS — 124/124 |
| `npx tsc --noEmit --incremental false` | PASS |
| Backend full suite bằng Python 3.14.5 isolated | PASS — 230/230, 1 warning |
| `scripts/validate_data.py` | PASS — `ALL DATA VALID` |
| Frontend `/` dev HTTP smoke | PASS — HTTP 200 |
| Backend `/api/health` smoke | PASS — HTTP 200 |
| `git diff --check` | PASS |
| `npm run build` | SKIPPED — Next dev server đang chạy |
| Manual browser QA | PASS — người dùng xác nhận các tương tác comparison chính hoạt động đúng |
| Controlled browser QA bằng agent | NOT RUN — không có browser runtime khả dụng trong phiên agent |

## 5. Browser gate đã đóng

- [x] N=2, N=3 và N=4 hiển thị các pane đều và đúng số thuật toán đã chọn.
- [x] Pan/zoom từng pane độc lập, không làm pane khác đổi camera.
- [x] Thêm và bỏ thuật toán comparison hoạt động đúng.
- [x] Compare maps là read-only, không cho chỉnh trọng số hoặc graph.
- [x] Bảng comparison canh cột đúng và cho cuộn khi cần.
- [x] Resize drawer phải hoạt động ổn để đọc bảng và map.
- [x] Route và số liệu gắn đúng với từng thuật toán.

Các viewport/kịch bản dùng để quay vẫn nên được pre-flight lại ngay trước buổi
demo; đây là kiểm tra vận hành trước trình chiếu, không còn là gate triển khai
Phase 6.

## 6. Known issue backend theo dõi riêng

- Với IDA* `solution_quality=epsilon_bounded`, exact UCS reference được phép tốt
  hơn selected route nếu `0 ≤ selected - exact ≤ epsilon_bound` trong tolerance.
- Validator hiện hành ở `backend/app/models.py` vẫn dùng
  `metrics.optimal_guarantee` như một cờ exact và bác mọi same-objective exact
  reference tốt hơn. Cặp `n0003 → n0018`, balanced, 07:30, ε mặc định 5 giây
  tái hiện HTTP 500 dù gap khoảng 3,27 giây vẫn nằm trong ε.
- Sửa contract-first theo `docs/SCHEMA.md` §F.3, thêm regression API/model rồi
  chạy lại full backend suite trước demo.

Implementation UI Phase 6 không thay backend/data/cost/algorithm và không triển
khai ATSP comparison 2–3 của Phase 7. Contract correction cho IDA* ε đã được ghi
ở SCHEMA trước; backend fix vẫn là known issue riêng cần hoàn tất.

### Addendum ngày 2026-08-11

Known issue IDA* phía trên đã được tái hiện, truy commit và sửa trong regression
audit Phase 1–2; đoạn lịch sử được giữ nguyên để không che việc lỗi từng tồn tại.
Live API→F2 và route comparison A*/UCS/IDA*/Beam hiện đều PASS. Xem
[UI-V2-PHASE1-2-REGRESSION-AUDIT.md](UI-V2-PHASE1-2-REGRESSION-AUDIT.md).
