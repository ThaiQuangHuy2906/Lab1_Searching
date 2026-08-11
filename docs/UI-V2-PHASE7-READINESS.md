# UI & Explanation v2 — Phase 7 Readiness

Ngày kiểm chứng: 2026-08-11  
Branch/HEAD nền: `main` / `b3218b5c7d47`

## 1. Kết luận

**Verdict: IMPLEMENTED — MANUAL BROWSER QA REQUIRED**

Phase 7 ATSP comparison 2–3 đã được nối end-to-end và qua automated gates.
Chưa ghi READY vì controlled browser của phiên này chặn `127.0.0.1` với
`ERR_BLOCKED_BY_CLIENT`; các viewport và tương tác thực tế vẫn phải được người
dùng kiểm trên trình duyệt đang chạy dự án.

## 2. Hành vi đã triển khai

- Panel trái cho chọn 2–3 phương pháp unique; giữ selection hiện hữu và chặn CTA
  khi Held–Karp vượt 15 điểm tính cả Đi.
- Mỗi phương pháp chạy tuần tự qua `/api/multiroute` với cùng immutable snapshot,
  cùng stops/order/return/mode/slot/scenario và `include_trace=false`.
- Progress hiển thị phương pháp hiện tại; cancel giữ result đã xong và đánh dấu
  queued/running là cancelled; lỗi thường không làm mất partial success.
- Retry chỉ chạy lại card error/cancelled bằng snapshot cũ; response stale,
  fingerprint/capability mismatch và topology echo sai đều bị loại.
- N phương pháp tạo đúng N pane final-only. N=2 dùng hai cột; N=3 dùng layout cân
  bằng; mobile reflow một cột. Baseline không tạo map giả.
- Mỗi pane có method, status, guarantee, open/closed, objective, savings và route
  cuối. Map comparison không cho picking/edit/clear/timeline/autoplay.
- Bảng chung có status, rank, visiting order, outcome theo mode, matrix effort,
  optimizer/backend runtime, savings, guarantee và method stats; SA có best,
  mean, sample standard deviation, seed và move count.
- Baseline thứ tự nhập xuất hiện đúng một lần, có objective và disclosure bảng
  từng chặng; savings luôn ghi là so với baseline.
- Exact gap chỉ xuất hiện khi Held–Karp cùng snapshot thành công. Heuristic thấp
  hơn exact ngoài raw tolerance tạo integrity error và dừng rank/gap.
- Matrix incomplete nêu đúng directed pair và hướng người dùng đổi tập điểm hoặc
  scenario, không khuyên đổi optimizer.
- Nút `Giải thích` của từng card bind đúng ATSP result trong session; failure B
  không fallback sang explanation của A.

## 3. Evidence đã chạy

| Gate | Kết quả |
|---|---|
| `npm test` | PASS — 130/130 |
| `npx tsc --noEmit --incremental false` | PASS |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS — 6/6 static pages |
| Targeted backend API/contract/scenario tests | PASS — 115, 1 health test deselected |
| `git diff --check` | PASS |
| Controlled browser QA | BLOCKED — cloud browser không truy cập được localhost |
| Manual browser QA | PENDING |

Backend targeted suite dùng Python 3.12 của môi trường tạm; test health yêu cầu
runtime Python 3.14 nên được deselect. Không có backend/schema/data/algorithm nào
được sửa trong Phase 7 này.

## 4. Manual browser gate còn mở

- [ ] 1366×768: chạy ATSP N=2 và N=3, đủ pane, không che toolbar/drawer.
- [ ] 1024×768: panel/drawer mở đóng, bảng cuộn được, map vẫn có vùng tương tác.
- [ ] 390×844 và 320 px: một cột, không có page-level horizontal scroll.
- [ ] Open và closed: mọi pane/bảng/giải thích cùng semantics quay về Đi.
- [ ] Pan/zoom/Home của một pane không thay đổi camera pane khác.
- [ ] Partial failure giữ result thành công; retry card lỗi dùng đúng snapshot.
- [ ] Cancel không khởi chạy method queued tiếp theo; result cũ/stale không nhập session.
- [ ] Matrix incomplete ghi đúng `A → B` và không gợi ý đổi optimizer.
- [ ] Keyboard/focus/live region/reduced motion hoạt động; console không có error.

Chỉ đổi verdict thành READY sau khi các mục trên được kiểm trên browser thật và
ghi lại viewport/kịch bản đã dùng.
