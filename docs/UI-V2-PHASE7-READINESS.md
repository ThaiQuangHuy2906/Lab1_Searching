# UI & Explanation v2 — Phase 7 Readiness

Ngày rà soát: 2026-08-11

Repository: `ThaiQuangHuy2906/Lab1_Searching`

Branch/HEAD được đối chiếu: `main` / `b3218b5c7d4777c3c998d3bbc36b7b5e4d0e2ae3`

## 1. Kết luận

**Verdict: NOT READY — ATSP COMPARISON UI CHƯA ĐƯỢC NỐI END-TO-END**

Phạm vi em chọn cho Phase 7 là đúng và nối tiếp hợp lý sau Phase 6: so sánh
2–3 phương pháp ATSP trên cùng bài toán nhiều điểm, sau đó trình bày thứ tự ghé,
chất lượng nghiệm, mức tiết kiệm, thời gian tính toán và giải thích exact so với
heuristic.

Repo hiện đã có phần lớn contract, policy và state nền cho Phase 7. Tuy nhiên,
nhánh `main` vẫn chủ động chặn `multi_point + atsp + compare`; người dùng chưa
thể chọn nhiều phương pháp ATSP, CTA chưa gọi comparison và trang chính chưa có
workspace nhiều pane cho ATSP. Vì vậy chưa thể ghi Phase 7 là READY chỉ dựa vào
unit test hoặc các dấu tick manual.

## 2. Mức độ phù hợp với đề Lab 1

Phase 7 đáp ứng trực tiếp các yêu cầu của đề:

- tối ưu lộ trình nhiều địa điểm;
- so sánh thứ tự nhập ban đầu với thứ tự đã tối ưu;
- phân biệt nghiệm tối ưu của Held–Karp với nghiệm xấp xỉ của NN và SA;
- hiển thị visiting order, tổng quãng đường, thời gian di chuyển, tổng chi phí
  và processing time;
- giải thích vì sao một kết quả tốt hơn trong cùng graph, objective, khung giờ
  và scenario.

Ba phương pháp dự án đã chốt là Held–Karp, Nearest Neighbor + 2-opt/Or-opt và
Simulated Annealing. Đây là phạm vi mạnh hơn mức tối thiểu “ít nhất một phương
pháp” của đề nhưng vẫn đúng hướng đồ án.

## 3. Phần nền đã có trong repo

| Khối | Hiện trạng đã kiểm tra |
|---|---|
| Backend `/api/multiroute` | Có response v2 cho matrix, runtime, method stats, legs, totals, baseline, savings, guarantee và fingerprint. |
| `frontend/lib/types.ts` | Có `AtspResultEnvelope`, `CompareSession` và explanation subject `atsp_comparison`. |
| `frontend/lib/comparison-policy.ts` | Có giới hạn 2–3 phương pháp, stable order, eligibility và lifecycle queued/running/success/error/cancelled. |
| `frontend/lib/run-orchestrator.ts` | Tạo request từ immutable snapshot và tắt trace khi comparison. |
| `frontend/lib/store.ts` | Có `atspComparisonSession` và `runAtspComparison(methods)`; các request chạy tuần tự và giữ partial success. |
| Presenter/policy tests | Có kiểm tra savings/gap, raw tolerance, runtime, immutable snapshot, partial failure, cancel và integrity mismatch. |

Các phần trên là nền hợp lệ để tiếp tục Phase 7, nhưng chưa tự tạo thành một
tính năng người dùng có thể chạy trên giao diện.

## 4. Khoảng trống được xác nhận bằng mã nguồn

| ID | Bằng chứng trên `main` | Tác động |
|---|---|---|
| P7-01 | `activePanelControls(...)` trả `comparison_pending` cho ATSP compare. | Không có selector 2–3 phương pháp ATSP trên panel. |
| P7-02 | CTA chỉ có action `route`, `compare_route`, `atsp`; không có `compare_atsp`. | `runAtspComparison(...)` không được dispatch từ UI. |
| P7-03 | `control-panel.tsx` hiển thị thông báo so sánh nhiều chỉ áp dụng cho tìm đường. | Người dùng bị chặn ngay ở luồng chính. |
| P7-04 | `app/page.tsx` chỉ mount `RouteComparisonWorkspace`; ATSP compare vẫn rơi về `MapView`. | Không có N pane ATSP final-only. |
| P7-05 | `CompareTab` chỉ render route comparison session hoặc một kết quả ATSP đơn. | Không có bảng so sánh chéo Held–Karp/NN/SA. |
| P7-06 | `AtspCompare` ghi rõ ứng dụng chưa giữ đồng thời hai kết quả ATSP. | UI hiện chỉ so sánh “thứ tự nhập” với một method. |
| P7-07 | Store chỉ expose `retryRouteComparisonRun`; chưa có retry ATSP theo method. | Không thể retry riêng slot ATSP lỗi/cancelled. |
| P7-08 | `atsp-result.tsx` luôn ghi kết thúc ở điểm giao cuối. | Copy sai khi `return_to_start=true`. |

Các mục P7-01 đến P7-06 là blocker cốt lõi. Chúng cũng khớp với tài liệu nguồn
`docs/Lab1-ChotPhuongAn.md`, `docs/DESIGN.md` và `UI_caithien.md`, hiện đều ghi
Phase 7 chưa triển khai.

## 5. Contract hiển thị phải giữ khi triển khai

- Mọi method trong một session dùng đúng một immutable snapshot: graph/view,
  Start, stops, objective, profile, departure, return flag và scenario.
- Chọn tối thiểu 2, tối đa 3 method duy nhất; giữ nguyên thứ tự người dùng chọn.
- Held–Karp hợp lệ với tổng số điểm `k <= 15`; NN và SA hợp lệ với `k <= 16`.
- Chạy tuần tự, tắt trace, giữ slot khi loading/error/no-path/cancelled.
- Open tour không có closing leg; closed tour có đúng một closing leg về Start.
- Baseline savings và exact optimality gap là hai khái niệm khác nhau.
- Travel time dùng phút; matrix/optimizer/total runtime dùng mili-giây.
- Chỉ gọi Held–Karp là exact reference khi cùng fingerprint/capability và run
  thành công; nếu không, chỉ nói “tốt nhất trong các kết quả đang hiển thị”.
- Ranking dùng số thô và tolerance trước khi làm tròn để hiển thị.
- Comparison map là final-only và view-only; không chỉnh node, edge hay scenario.

## 6. File cần thay đổi để đóng Phase 7

- `frontend/lib/single-run-panel-policy.ts`
- `frontend/components/control-panel.tsx`
- `frontend/lib/store.ts`
- `frontend/app/page.tsx`
- `frontend/components/drawer/compare-tab.tsx`
- `frontend/components/atsp/atsp-compare.tsx`
- `frontend/components/atsp/atsp-result.tsx`
- một workspace ATSP comparison mới dưới `frontend/components/comparison/`
- test policy/store/presenter/component tương ứng trong `frontend/tests/`

## 7. Evidence rà soát lần này

| Gate | Kết quả |
|---|---|
| `git rev-parse HEAD` | PASS — `b3218b5c7d4777c3c998d3bbc36b7b5e4d0e2ae3` |
| `npm test` trong `frontend/` | PASS — 128/128 |
| `python3 scripts/validate_data.py` | PASS — `ALL DATA VALID`; G_real 2118/4699, G_demo 51/298 |
| `git diff --check` | PASS |
| Backend pytest bằng Python 3.14 | NOT RUN trong phiên rà soát này |
| TypeScript check / production build | NOT RUN trong phiên rà soát này |
| Controlled browser QA Phase 7 | NOT RUN — UI ATSP comparison chưa reachable trên `main` |

`npm test` chứng minh các helper/policy hiện có không regression; nó không chứng
minh control, CTA, N-pane và cross-method table đã được triển khai.

## 8. Checklist từ nhóm và cách hiểu đúng

Các dấu tick dưới đây được giữ theo xác nhận manual của nhóm trong file đã gửi.
Chúng là **user-reported QA**, không thay thế static evidence của đúng commit.
Nếu nhóm đã test trên một branch/local diff khác, cần ghi lại commit đó trước
khi dùng các tick này làm verdict cho `main`.

- ☑ Nhóm đã kiểm policy chọn 2–3 method, uniqueness và stable order.
- ☑ Nhóm đã kiểm giới hạn Held–Karp/NN/SA.
- ☑ Nhóm đã kiểm immutable snapshot và request tuần tự.
- ☑ Nhóm đã kiểm open/closed, partial failure, cancel và integrity policy.
- ☑ Nhóm đã kiểm outcome/runtime, savings/gap và exact-reference math.
- ☑ Nhóm đã kiểm final-only/view-only policy và các automated test hiện có.
- [ ] Layout desktop/mobile của ATSP comparison chưa có evidence gắn với `main`.
- [ ] Accessible name, keyboard activation và live progress chưa có evidence gắn với `main`.

Các mục sau vẫn phải hoàn thành trên nhánh được nộp:

- [ ] Selector ATSP 2–3 method được mount trong panel.
- [ ] CTA `compare_atsp` gọi đúng `runAtspComparison(...)`.
- [ ] N method tạo đúng N pane và bảng so sánh chéo.
- [ ] Retry ATSP theo từng method hoạt động từ UI.
- [ ] Copy open/closed của kết quả ATSP đúng topology.
- [ ] Browser QA được chạy lại trên đúng commit sau khi nối UI.

## 9. Verdict

**PHASE 7: NOT READY.**

Luồng và nội dung chuyên môn của file cũ đúng hướng, nhưng file đó quá dài so
với readiness Phase 5–6 và có mâu thuẫn giữa `NOT READY`, các bảng “Chưa chạy”
và checklist gần như đã tick hết. Bản này đã rút gọn theo cùng cấu trúc với các
phase trước, giữ phần nhóm tự kiểm nhưng tách khỏi kết luận dựa trên code.
