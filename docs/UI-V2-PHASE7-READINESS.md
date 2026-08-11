# UI & Explanation v2 — Phase 7 Readiness

Ngày kiểm chứng: 2026-08-11  
Branch/HEAD nền: `main` / `821e77d38b41bb98e473be620b17c76e09a000d8`

## 1. Kết luận

**Verdict: READY — CHROME DESKTOP FULL-VIEW QA PASSED**

Phase 7 ATSP comparison 2–3 đã được nối end-to-end và qua automated gates.
Chrome 151 thật đã được clean restart + hard refresh và maximize trên màn hình
laptop vật lý 2560×1440, Windows scale 150% (viewport CSS 1707×825, DPR 1,5).
ATSP N=2/N=3, partial failure, retry, cancel/stale guard, camera độc lập, bảng và
console đều đạt. Mobile/tablet/narrow viewport nằm ngoài phạm vi audit này.

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
| `npm test` | PASS — 136/136 |
| `npx tsc --noEmit --incremental false` | PASS |
| `NEXT_TELEMETRY_DISABLED=1 npm run build` | PASS — 6/6 static pages |
| Full backend suite | PASS — 233/233, 1 dependency warning |
| `scripts/validate_data.py` | PASS — `ALL DATA VALID` |
| `git diff --check` | PASS |
| Chrome 151 maximized | PASS — physical 2560×1440; CSS 1707×825; DPR 1,5 |
| ATSP compare N=2/N=3 | PASS — 2/3 response 200, đúng 2/3 map, baseline 0 map |
| Clean browser console | PASS — 0 error, 0 warning |

Ba method N=3 phát theo thứ tự quan sát được
`request:held_karp → response:held_karp → request:nn_2opt → response:nn_2opt → request:sa → response:sa`.
Mọi response dùng cùng scenario fingerprint và `optimization_trace=null`.

## 4. Chrome Desktop gate

- [x] N=2 và N=3 có đúng N pane/map; baseline chỉ là mốc bảng, không có map giả.
- [x] Open và closed dùng cùng topology echo; single-result closed tour hiển thị
  rõ chặng quay về Đi, open tour kết thúc ở stop cuối.
- [x] Zoom pane Held-Karp làm ảnh pane Held-Karp đổi nhưng ảnh pane
  NN + 2-opt/Or-opt giữ nguyên từng byte; camera ATSP không bị dùng chung.
- [x] Một method HTTP 503 giữ hai partial success; retry phát đúng một request
  cho card lỗi và hoàn tất session.
- [x] Cancel khi request bị trì hoãn đánh dấu mọi method `Đã hủy`; response cũ
  tới sau không ghi đè session.
- [x] Exact gap/ranking, heuristic disclaimer, immutable fingerprint và
  `include_trace=false` đều được kiểm từ response/UI thật.
- [x] Table cuộn ngang trong drawer, page không tràn ngang; console sạch có 0
  error/warning ở lượt run không tiêm lỗi.
- [x] Contract/tests giữ directed-pair failure copy và không gợi ý đổi optimizer
  khi ma trận bất đối xứng không đầy đủ.

Không đưa Mobile/Tablet/Narrow QA vào verdict theo phạm vi final audit. Nếu máy
audit không phải máy demo cuối: **FINAL DEMO-MACHINE PREFLIGHT REQUIRED**.
