# Kế hoạch triển khai cải thiện UI tìm đường và đa điểm

> Trạng thái audit 2026-08-11: **Phase 0–6 đã hoàn tất; Phase 7 ATSP comparison
> 2–3 READY; Phase 8 READY WITH KNOWN ISSUES trong phạm vi Desktop. Automated
> gates và Chrome 151 Desktop maximized full-view đều đạt.**
>
> Ngày khảo sát: **2026-08-09**
>
> Phạm vi: frontend, contract/API bổ sung tối thiểu, backend trace/số liệu liên quan, test và tài liệu thiết kế.
>
> Mục tiêu sử dụng: một lập trình viên hoặc một phiên Codex khác có thể triển khai tuần tự mà không phải tự suy đoán lại yêu cầu.

---

## 0. Cách dùng tài liệu này

Tài liệu này là kế hoạch triển khai, không thay thế các nguồn sự thật hiện có của dự án:

1. Yêu cầu môn học vẫn lấy từ `docs/Lab 1 - Searching.pdf`.
2. Quyết định thuật toán và nghiệp vụ đã chốt vẫn lấy từ `docs/Lab1-ChotPhuongAn.md`.
3. Mọi thay đổi public contract phải được ghi vào `docs/SCHEMA.md` **trước** khi sửa model/backend/frontend.
4. Mọi thay đổi UX chính thức phải được cập nhật vào `docs/DESIGN.md` trước hoặc cùng phase triển khai giao diện.
5. Hành vi thực tế phải được xác nhận từ code và test mới chạy; không dùng các log lịch sử trong `docs/TIENDO.md`, `docs/KIEMTOAN.md` hoặc kết quả cũ trong `results/` làm bằng chứng hiện tại.

Người triển khai phải làm theo thứ tự phase trong tài liệu. Không bắt đầu bằng việc sửa component trực quan vì hai hạng mục — frontier Dijkstra hai chiều và số liệu ATSP — cần contract rõ ràng trước.

Các từ khóa:

- **BẮT BUỘC**: điều kiện không được bỏ qua.
- **KHUYẾN NGHỊ**: phương án mặc định đã cân nhắc trade-off; chỉ đổi khi có bằng chứng kỹ thuật cụ thể.
- **TÙY CHỌN SAU**: không thuộc phạm vi hoàn thành tối thiểu.

### 0.1. Quyền triển khai và trạng thái bằng chứng

Quyết định ngày 2026-08-09 cho phép phase **UI & Explanation v2** mở rộng public
response/trace contract theo hướng additive. Quyền này đã được ghi đồng bộ trong
`docs/Lab1-ChotPhuongAn.md`, contract đích ở `docs/SCHEMA.md` §F và thiết kế đích
ở `docs/DESIGN.md` §13. Nó không cho phép đổi graph, cost, heuristic, tie-break,
stopping rule tạo nghiệm, path reconstruction, seed, data hoặc benchmark.

Tài liệu dùng ba nhãn bằng chứng:

- **Hiện hành**: đã xác minh từ code/test/runtime hiện tại.
- **Đích đã duyệt**: bắt buộc phải triển khai, nhưng chưa được nói là đang chạy.
- **Đã kiểm chứng**: chỉ dùng sau khi phase tương ứng qua test/gate/browser QA.

Contract/type/payload của Phase 1–8 dưới đây hiện đã có trong runtime. Mỗi claim
current phải trỏ tới readiness tương ứng và kết quả test/runtime mới chạy; automated
gate không tự thay thế Chrome Desktop QA.

### 0.2. Một nguồn quy định cho mỗi khái niệm trong file

Để tránh hai phần trong cùng tài liệu tự định nghĩa khác nhau, các mục sau là
normative duy nhất; mục khác chỉ được tham chiếu hoặc bổ sung test case:

| Khái niệm | Mục normative |
|---|---|
| Mode/draft/request snapshot/fingerprint | §4 |
| Cost label, tolerance, signed trade-off/gap/savings | §14 và contract chi tiết `SCHEMA.md` §F.1 |
| Bidi two-frontier | §7 |
| Multiroute metrics/breakdown | §8 |
| Ordered timeline sampling | §9.5 |
| Termination/reachability | §30.8 |
| Explanation evidence/reference/step | §30.9–§30.24 |
| ATSP method stats | §30.20 |
| Phase và gate | §19; không có hệ phase E0–E6 độc lập |
| Backend test plan | §20; §30 chỉ bổ sung fixture chuyên biệt |
| Frontend test plan | §21; §30 chỉ bổ sung fixture chuyên biệt |
| Acceptance criteria | §24 |
| Definition of Done | §25 |
| Rollback tổng thể | §26 và compatibility matrix §16.7 |

Nếu checklist phụ mâu thuẫn bảng này, mục normative thắng và checklist phụ phải
được sửa; không triển khai theo “phương án tiện hơn”.

### 0.3. Mười điểm rà soát đã được khóa

| # | Điểm đã sửa | Nguồn quy định |
|---:|---|---|
| 1 | Phase additive được ủy quyền, phân biệt target với runtime hiện hành | §0.1; `Lab1-ChotPhuongAn.md`; `SCHEMA.md` §F.0; `DESIGN.md` §13 |
| 2 | `total_time_s` chỉ là balanced cost; multiroute có breakdown leg/totals/baseline cụ thể | §8; §14; `SCHEMA.md` §F.1/§F.4 |
| 3 | Snapshot chứa typed normalized scenario; server fingerprint write-once | §4.4–§4.5 |
| 4 | Tolerance, signed trade-off, exact gap, savings và mẫu số 0 | §14.4; `SCHEMA.md` §F.1 |
| 5 | IDDFS/IDA*/Beam termination proven/inconclusive không overclaim | §30.8; `SCHEMA.md` §F.2 |
| 6 | Closed route tối đa 16 legs; sampler global có công thức deterministic | §9.3/§9.5 |
| 7 | Held–Karp/NN/SA stats có count semantics; SA equal/stddev được khóa | §30.20; `SCHEMA.md` §F.4 |
| 8 | Matrix B1/B2 × F1/F2, backend-first rollout và rollback | §16.7; `SCHEMA.md` §F.5 |
| 9 | Reorder/carousel không phụ thuộc drag/swipe; target 24×24 rule | §5.1; §11.2; §15 |
| 10 | Một phase/test/acceptance/DoD normative; phần 30 chỉ bổ sung | §0.2; §19–§25; §30.32–§30.38 |

Mười dòng này là index đóng review, không lặp lại semantics chi tiết.

### 0.4. Trạng thái phase hiện hành

- **Phase 0–5: hoàn tất.** Readiness theo từng phase nằm trong
  `docs/UI-V2-PHASE0-READINESS.md` … `docs/UI-V2-PHASE5-READINESS.md`.
- **Phase 6: READY.** Route comparison 2–4 đã nối end-to-end và manual browser
  QA do người dùng xác nhận đã đạt; evidence và phạm vi kiểm tra nằm ở
  `docs/UI-V2-PHASE6-READINESS.md`.
- **Phase 7: READY.** ATSP comparison 2–3 đã nối end-to-end và pass Chrome
  Desktop N=2/N=3; evidence tại `docs/UI-V2-PHASE7-READINESS.md`.
- **Phase 8: READY WITH KNOWN ISSUES — DESKTOP QA PASSED.** Hardening,
  persistent retry, a11y semantics, reduced motion và comparison performance
  policy đã pass code/test/runtime; NVDA/FPS/heap và preflight trên máy demo cuối
  (nếu khác máy audit) vẫn được ghi riêng tại `docs/UI-V2-PHASE8-READINESS.md`.
- Known issue IDA* nêu trong bản cũ đã được sửa: validator cho phép exact reference
  tốt hơn trong `0 ≤ gap ≤ ε`, và có regression API tương ứng.

---

## 1. Kết luận điều hành

Sáu ý tưởng sau buổi họp đều hợp lý. Tuy nhiên, để giao diện dễ hiểu và dữ liệu so sánh chính xác, chúng nên được chuẩn hóa thành một mô hình thống nhất thay vì vá thêm từng control vào UI hiện tại.

### 1.1. Sáu quyết định chính

| Ý tưởng | Kết luận | Quyết định triển khai |
|---|---|---|
| Tách frontier Dijkstra hai chiều | Nên làm | Hiển thị hai bảng “phía xuôi” và “phía ngược”, nhưng phải mở rộng trace contract ở backend trước; frontend không được tự suy đoán |
| Chỉnh số liệu thuật toán đa điểm | Nên làm và cần làm sâu hơn | Tách rõ “kết quả hành trình” với “công sức tính toán”; bổ sung bảng từng chặng, baseline đầy đủ và runtime tách matrix/optimizer |
| Quay về điểm ban đầu | Backend đã hỗ trợ, UI chưa có | Thêm tùy chọn, mặc định tắt; áp dụng nhất quán cho cả đi theo thứ tự đã chọn và tối ưu ATSP |
| So sánh thuật toán đa điểm như search | Hiện chưa có | Cho chọn 2–3 phương pháp ATSP, mỗi phương pháp có một result pane/map riêng, cùng một input snapshot |
| Tách option hai điểm và nhiều điểm | Cần thiết | Dùng state loại bài toán rõ ràng; trong nhiều điểm tách tiếp “theo thứ tự đã chọn” và “tối ưu thứ tự ATSP” |
| N thuật toán = N map; thu gọn panel trái | Nên làm với guardrail | Route compare chọn 2–4 thuật toán; đúng N lựa chọn tạo N pane/map. Panel trái có disclosure riêng trên desktop |
| Nâng cấp tab Giải thích | Cần chỉnh cả semantics lẫn UX, không chỉ polish | Chuyển từ prose hậu nghiệm sang explanation workspace có subject rõ ràng, verdict, bước timeline, evidence có provenance, cost breakdown và giới hạn kết luận; xem mục 30 |

### 1.2. Kiến trúc UX được chốt

UI có ba lớp lựa chọn:

1. **Loại bài toán**
   - Hai điểm.
   - Nhiều điểm.
2. **Cách xử lý** — chỉ xuất hiện trong bài toán nhiều điểm
   - Đi theo thứ tự đã chọn.
   - Tối ưu thứ tự ATSP.
3. **Chế độ chạy**
   - Chạy một.
   - So sánh nhiều.

Các tổ hợp hợp lệ:

| Loại bài toán | Cách xử lý | Chạy một | So sánh |
|---|---|---:|---:|
| Hai điểm | Search | Có | 2–4 thuật toán tìm đường |
| Nhiều điểm | Đi theo thứ tự đã chọn | Có | 2–4 thuật toán tìm đường, cùng thứ tự điểm |
| Nhiều điểm | Tối ưu ATSP | Có | 2–3 phương pháp ATSP |

Không có tổ hợp “Hai điểm + ATSP”. Không gọi chức năng đi tuần tự qua N điểm là ATSP.

### 1.3. Guardrail quan trọng

- Không hiển thị đồng thời cả 9 bản đồ. Bốn map là giới hạn mặc định cho search comparison; cả 9 thuật toán có thể xem bằng bảng benchmark/tổng hợp.
- Comparison mặc định chỉ hiển thị final route; không tải và animate N trace cùng lúc.
- Một lỗi riêng lẻ không làm mất các kết quả thành công còn lại.
- Mọi kết quả trong một comparison session phải dùng cùng một immutable input snapshot.
- Không thêm batch endpoint hoặc global cost-matrix cache ở phase đầu. Chỉ làm nếu profiling trên máy demo chứng minh cần thiết.
- Không đổi graph, cost semantics, thuật toán, data pipeline hoặc benchmark trong kế hoạch UI này.

---

## 2. Hiện trạng đã xác minh từ code

> **Mốc lịch sử:** mục 2 ghi lại baseline khảo sát ngày 2026-08-09 trước khi
> Phase 1–6 được triển khai. Các câu “hiện”, “chưa có” và finding trong mục này
> giải thích lý do thiết kế, không phải current-state ngày 2026-08-10. Trạng thái
> hiện hành xem §0.4 và readiness của từng phase.

### 2.1. Tính năng “đi qua N điểm theo thứ tự đã chọn” đã tồn tại

`frontend/lib/store.ts` hiện gọi `/api/route` lần lượt qua các waypoint. `frontend/lib/sequential-route.ts` ghép path, timeline và metrics của các chặng thành một kết quả liên tục. `frontend/tests/sequential-route.test.mjs` đã có test cho hành trình nhiều chặng và chặng thất bại.

Vì vậy:

- Không xây lại backend mới cho chức năng này.
- Không xóa hoặc làm mất hành vi này khi tách UI hai điểm/nhiều điểm.
- Đặt tên rõ là **“Đi theo thứ tự đã chọn”**.
- Khi so sánh search trên N điểm, mọi thuật toán phải chạy trên đúng cùng chuỗi waypoint.

### 2.2. UI hiện suy luận loại bài toán từ dữ liệu

`frontend/components/control-panel.tsx` đang đặt Start, Goal và phần ATSP trong cùng khu vực. Khi thêm stop, `frontend/lib/store.ts` có thể chuyển Goal cũ thành stop đầu rồi xóa Goal. CTA đổi nghĩa dựa vào `stops.length`.

Hành vi này giữ dữ liệu khá tốt nhưng khó dự đoán: người dùng không chủ động chọn đổi bài toán. Thiết kế mới phải có `problemMode` rõ ràng và không dùng `stops.length` làm nguồn chân lý.

### 2.3. Return-to-start đã có ở backend nhưng bị hard-code tắt ở frontend

- `docs/SCHEMA.md` và `backend/app/models.py` đã có request field `return_to_start`, mặc định `false`.
- `backend/app/tsp.py` đã tạo closing leg và cộng totals khi flag là `true`.
- `backend/tests/test_tsp.py` đã có kiểm tra hành vi quay về Start.
- `frontend/lib/api.ts` đã khai báo request field.
- `frontend/lib/store.ts` hiện luôn gửi `return_to_start: false`.
- UI result/explanation hiện hard-code nội dung “kết thúc ở điểm giao cuối”.

Đây là hạng mục có thể triển khai mà không đổi thuật toán ATSP, nhưng response nên echo flag để kết quả tự mô tả và tránh UI suy luận.

### 2.4. Baseline trước Phase 6: so sánh route chỉ là A/B trên một map

Store chỉ giữ một `compareAlgo` và một trace `compare`. `frontend/components/drawer/compare-tab.tsx` cho chọn đúng một thuật toán B; `frontend/components/map-view.tsx` vẽ A và B chồng lên cùng map.

Phase 6 đã thay scalar A/B bằng comparison session 2–4 và N map final-only. Danh
sách dưới đây là yêu cầu migration lịch sử đã dẫn tới implementation hiện hành:

- Store dạng collection/session, không phải scalar A/B.
- Comparison workspace riêng.
- Map renderer nhận dữ liệu qua props; không nhân nguyên `MapView` vốn đang phụ thuộc nhiều vào Zustand toàn cục.

### 2.5. So sánh ATSP hiện chỉ là “trước và sau” của một phương pháp

Store chỉ giữ một `multi`. `frontend/components/atsp/atsp-compare.tsx` so `original_order_totals` với `totals` của đúng một phương pháp. UI và `docs/DESIGN.md` hiện còn nói rõ chưa hỗ trợ cross-method.

Do đó, so sánh 2–3 ATSP methods là một tính năng mới thực sự. Khi triển khai phải cập nhật `docs/DESIGN.md` để bỏ giới hạn lịch sử này.

### 2.6. Trace hiện không đủ để tách frontier Bidirectional Dijkstra

Trace hiện chỉ mang:

- `frontier`: hợp của frontier xuôi và ngược.
- `g`: nếu một node có ở hai phía thì chỉ giữ min của hai giá trị.
- `side`: phía vừa expand ở step hiện tại.

Sau phép union/min, membership và g-value riêng của từng phía đã mất. Frontend không thể tái dựng chính xác bằng lịch sử expand. Phải bổ sung payload backend; field cũ vẫn giữ để tương thích.

### 2.7. Panel trái chưa thu gọn được trên desktop

`frontend/app/page.tsx` luôn render `ControlPanel` ở desktop. Nút đóng hiện tại chỉ dành cho mobile sheet. Drawer phải đã có pattern disclosure/focus return có thể dùng làm tham chiếu, nhưng state desktop-left phải độc lập với mobile.

### 2.8. Giới hạn dữ liệu đang có

- Tổng và legs ATSP đã có cho kết quả tối ưu.
- Baseline hiện chỉ có `original_order_totals`, chưa có baseline order/legs/path đầy đủ để vẽ hoặc xem từng chặng.
- Response chưa có runtime riêng cho bước dựng cost matrix và optimizer.
- `optimizer_stats` có ý nghĩa chủ yếu cho SA và hiện chưa được trình bày đầy đủ.
- Số optimization events không có cùng ý nghĩa giữa Held–Karp, NN + local search và SA; không được gắn nhãn chung là “nodes expanded” hoặc dùng như một thước đo công bằng.

### 2.9. Baseline trước Explanation v2: phần “Giải thích” có vấn đề bản chất

Static audit ngày 2026-08-09 xác nhận cảm giác phần này “hơi bị gì” là có cơ sở.
Phase 1–6 đã xử lý structured evidence, đúng subject, step presenter và tuyến
tham chiếu; các bullet dưới đây được giữ làm problem statement lịch sử:

- Tiêu đề “Vì sao chọn tuyến này?” hứa giải thích quyết định, nhưng phần lớn nội dung là report hậu nghiệm sau khi search đã hoàn tất.
- Cụm “Tuyến thay thế đã xét — và vì sao bị loại” không đúng provenance. `backend/app/explain.py` chạy thêm UCS để tạo các tuyến đối chiếu; thuật toán chính không nhất thiết từng xét hoặc loại các full route đó.
- `Alternative` không có `total_cost`. UI đang dùng `total_time_s` như thời gian thuần, trong khi contract quy định field này luôn là balanced path weight. Lý do so sánh có thể sai objective, đặc biệt ở mode `time`.
- Ordered multi trong `frontend/lib/sequential-route.ts` bỏ explanation/alternatives của từng leg và thay bằng summary thủ tục, nhưng Explain UI vẫn hỏi vì sao toàn tuyến được chọn.
- Tab Explain không đọc `stepIdx`; kéo timeline search không làm lời giải thích thay đổi. Ngược lại, ATSP event narrative giàu tính sư phạm lại đang nằm trong khu vực kết quả/số liệu.
- Compare có thể dẫn người dùng sang Giải thích khi result B thất bại, nhưng Explain hiện chỉ đọc trace chính A.
- No-path copy không phân biệt “đã chứng minh unreachable” với “chưa kết luận do depth/round cap hoặc Beam pruning”.
- Alternative path đã có trong payload nhưng chưa có thao tác xem tuyến đối chiếu trên map.
- Hierarchy hiện phụ thuộc vào việc tách câu `summary_vi` bằng regex và parse prose để đổi đơn vị; caveat quan trọng có thể bị giấu trong `<details>`.

Quyết định thiết kế và contract chi tiết nằm ở mục 30. Đây là workstream bắt buộc, không phải nâng cấp trang trí tùy chọn.

---

## 3. Mục tiêu, phạm vi và phi mục tiêu

### 3.1. Mục tiêu sản phẩm

1. Người mới nhìn vào panel hiểu ngay mình đang giải bài toán hai điểm hay nhiều điểm.
2. Người dùng không nhầm “đi qua N điểm theo thứ tự nhập” với “tối ưu lại thứ tự ATSP”.
3. Open tour và closed tour được cấu hình, gửi request, hiển thị và so sánh nhất quán.
4. Dijkstra hai chiều cho thấy đúng dữ liệu frontier của hai hướng.
5. Có thể so sánh nhiều thuật toán/phương pháp trên cùng dữ liệu, mỗi kết quả có không gian bản đồ riêng.
6. Số liệu phân biệt đúng:
   - chi phí hành trình;
   - quãng đường;
   - thời gian ước tính theo ùn tắc;
   - chi phí cân bằng quy đổi;
   - runtime thuật toán;
   - effort của search hoặc optimizer.
7. Giao diện hoạt động tốt ở độ phân giải máy chiếu 1366×768, tablet và mobile.
8. Mọi trạng thái async, partial failure, stale response và input invalidation đều có hành vi xác định.
9. Phần Giải thích luôn đúng subject, objective, provenance và mức bảo đảm; có thể nối kết luận với đúng bước trace, chặng hoặc optimization event thay vì suy diễn từ prose.

### 3.2. Phạm vi kỹ thuật

- Mở rộng additive trace contract cho Bidirectional Dijkstra.
- Mở rộng additive multiroute response cho return echo, baseline legs và computation metrics.
- Tái cấu trúc state/policy/frontend orchestration.
- Cải tổ control panel theo information architecture mới.
- Xây comparison workspace, map panes và tables.
- Bổ sung số liệu ATSP, collapse panel trái, responsive/a11y.
- Mở rộng additive Explanation/termination/decision facts; thiết kế lại Explain UI cho route, ordered multi, ATSP và comparison.
- Unit, backend, browser QA và tài liệu liên quan.

### 3.3. Phi mục tiêu

- Không thêm thuật toán search hoặc ATSP mới.
- Không đổi định nghĩa cost, `total_time_s`, heuristic, guarantee hay giới hạn trace 5.000 step của backend.
- Không đổi graph snapshots, traffic profiles, scenario semantics hoặc edge override.
- Không rebuild `data/`.
- Không rerun benchmark hoặc thay số trong `results/`.
- Không chạy `scripts/gen_teaching_doc.py` chỉ vì thay UI; generated teaching content chỉ xử lý nếu có một yêu cầu riêng và theo đúng source generator.
- Không thêm authentication, persistence server-side hoặc multi-user collaboration.
- Không deploy, commit, push hoặc thay dependency sản phẩm nếu chưa có nhu cầu cụ thể.
- Không coi runtime trong UI là benchmark khoa học; đó là số đo từng lần chạy để giải thích, không thay thế benchmark có kiểm soát.

---

## 4. Thuật ngữ và mô hình trạng thái

### 4.1. Thuật ngữ chuẩn

| Thuật ngữ UI | Ý nghĩa kỹ thuật |
|---|---|
| Hai điểm | Một Start và một Goal, chạy một search algorithm |
| Nhiều điểm | Một Start và danh sách delivery stops |
| Đi theo thứ tự đã chọn | Chạy cùng search algorithm tuần tự qua `[start, ...stops]` |
| Tối ưu thứ tự ATSP | Dùng một ATSP method để sắp thứ tự stops |
| Hành trình mở | Kết thúc tại stop cuối, `returnToStart=false` |
| Vòng kín | Có closing leg từ stop cuối về Start, `returnToStart=true` |
| Chi phí mục tiêu | `total_cost` theo `mode` hiện tại |
| Thời gian ước tính theo ùn tắc | `congestion_adjusted_time_s`; bằng `total_cost` khi mode=`time` |
| Chi phí cân bằng | `total_time_s` legacy = `balanced_cost_s` ở mọi mode; không phải ETA |
| Runtime tính toán | Wall-clock runtime của search/matrix/optimizer, đơn vị ms |
| Comparison session | Một tập kết quả được tạo từ cùng immutable input snapshot |

### 4.2. Types frontend bắt buộc

Tên có thể điều chỉnh theo convention repo, nhưng semantics không được đổi:

~~~ts
type ProblemMode = "two_point" | "multi_point";
type MultiStrategy = "ordered_search" | "atsp";
type RunKind = "single" | "compare";

interface NormalizedScenarioConfig {
  graph_view: GraphView;
  edge_overrides: EdgeOverride[];
}

type CompareRunStatus =
  | "queued"
  | "running"
  | "success"
  | "no_path"
  | "error"
  | "cancelled";
~~~

Các tổ hợp state không hợp lệ phải bị chặn bằng policy, không để component tự xử lý rải rác.

### 4.3. Draft input

Giữ draft riêng theo mode:

~~~ts
interface JourneyDrafts {
  start: string | null;
  twoPointGoal: string | null;
  multiStops: string[];
  returnToStart: boolean;
}
~~~

Quy tắc:

- `start` dùng chung.
- `twoPointGoal` không bị xóa khi chuyển sang nhiều điểm.
- `multiStops` và `returnToStart` không bị xóa khi chuyển về hai điểm.
- Chuyển mode chỉ thay phần input đang active và clear kết quả không còn tương thích.
- Bỏ logic tự động biến Goal thành stop. Nếu cần migration mềm lần đầu, chỉ được prefill stop sau một thao tác chuyển mode rõ ràng và phải thông báo; phương án mặc định là giữ hai draft độc lập.
- Không persist vào `localStorage`. Layout collapse có thể tồn tại trong session component/store; theme tiếp tục theo policy hiện tại.

### 4.4. Immutable input snapshot

Mỗi single/comparison run phải chụp đầy đủ:

~~~ts
interface RunSnapshot {
  graph: GraphLevel;
  graphView: GraphView;
  slot: TimeSlot;
  mode: CostMode;
  scenario: NormalizedScenarioConfig | null;
  scenarioKey: string;

  problemMode: ProblemMode;
  multiStrategy: MultiStrategy | null;
  start: string;
  goal: string | null;
  stops: string[];
  returnToStart: boolean;

  algorithms: Algorithm[];
  routeParamsByAlgorithm: Partial<Record<Algorithm, RouteAlgorithmParams>>;
  methods: TspMethod[];
  includeRouteTrace: boolean;
  includeOptimizationTrace: boolean;
}
~~~

`scenario` là object typed đã normalize trước khi snapshot: `null`/vắng/`{}` với
`graphView=full` thành `null`; scenario khác có `graph_view === snapshot.graphView`
và `edge_overrides` array (có thể rỗng). Override dùng parsed/validated numeric
value, copy sâu, sort theo `edge_id`; congestion keys theo thứ tự bốn `TimeSlot`,
risk keys theo schema. Frontend không tự quyết định raw override có phải server
no-op semantic hay không. Không giữ draft string, mutable reference hoặc tự sinh
fingerprint. `scenarioKey` chỉ là identity UI cục bộ, không thay server fingerprint.

Snapshot phải copy sâu array/object. Với bài toán hai điểm, normalize
`multiStrategy=null`, `stops=[]`, `returnToStart=false` và
`includeOptimizationTrace=false`; không để draft ẩn ảnh hưởng request identity.
`routeParamsByAlgorithm` chứa effective params đã validate của từng thuật toán,
không đọc lại live controls trong lúc session đang chạy. Comparison khóa cả hai
trace flag `false`; thao tác “Xem chi tiết” tạo single run mới có trace, không sửa
runtime/result của comparison.

Response chỉ được ghi nếu `runId` còn hiện hành và request identity đúng snapshot.
Server fingerprint không nằm trong immutable request snapshot vì chưa biết trước;
nó được thiết lập write-once ở session/result envelope theo quy tắc dưới đây.

### 4.5. Comparison session

~~~ts
interface CompareRun<T> {
  status: CompareRunStatus;
  result: T | null;
  error: { code?: string; message: string } | null;
}

interface CompareSession<T> {
  id: string;
  kind: "route" | "atsp";
  snapshot: RunSnapshot;
  authoritativeScenarioFingerprint: string | null;
  selectedIds: string[];
  runs: Record<string, CompareRun<T>>;
  focusedId: string | null;
  startedAt: number;
  completedAt: number | null;
}
~~~

Các invariant:

- `selectedIds` giữ đúng thứ tự người dùng chọn.
- Mỗi ID là duy nhất.
- Route: 2–4 IDs.
- ATSP: 2–3 IDs.
- `runs` luôn có đúng một entry cho mỗi selected ID, kể cả queued/error/no-path.
- Comparison result không ghi đè single-run result.
- `authoritativeScenarioFingerprint` khởi tạo `null`. Response hợp lệ đầu tiên —
  kể cả `found=false` — phải có `applied_scenario.fingerprint` và thiết lập field
  này đúng một lần. Mọi response/retry sau phải khớp; không được ghi đè/reset.
- Fingerprint thiếu hoặc khác làm riêng run đó thành contract error, bị loại khỏi
  ranking. Nếu mismatch cho thấy backend capability/scenario đã đổi giữa session,
  cancel phần queued/running và yêu cầu tạo session mới; không trộn hai snapshot.
- Với ordered multi, **mọi leg response** của mọi algorithm, kể cả failed/closing
  leg, tham gia cùng quy tắc establishment/check; không chỉ kiểm merged result cuối.
- Single run dùng cùng quy tắc trong immutable result envelope của chính run đó.
- Retry dùng nguyên typed scenario/request snapshot và fingerprint đã khóa; không
  canonicalize lại từ live editor.
- Không giữ đồng thời scalar A/B cũ như một nguồn chân lý thứ hai sau khi migration hoàn tất.

---

## 5. Information architecture của panel trái

Thứ tự section đề xuất:

1. **Thiết lập dữ liệu**
   - Graph level.
   - Mức số điểm hiển thị/graph view.
   - Khung giờ.
   - Tiêu chí chi phí.
2. **Loại bài toán**
   - Hai điểm.
   - Nhiều điểm.
3. **Hành trình**
   - Hai điểm: Đi, Đến, đổi chiều.
   - Nhiều điểm: Đi, danh sách stops, thêm/xóa/sắp thứ tự, return-to-start.
4. **Cách xử lý** — chỉ trong nhiều điểm
   - Đi theo thứ tự đã chọn.
   - Tối ưu thứ tự ATSP.
5. **Chế độ chạy**
   - Chạy một.
   - So sánh nhiều.
6. **Thuật toán/phương pháp**
   - Search algorithms nếu hai điểm hoặc ordered search.
   - ATSP methods nếu tối ưu thứ tự.
7. **Tùy chỉnh thuật toán**
   - Chỉ render tham số của thuật toán/phương pháp active.
8. **Hiển thị và thử nghiệm**
   - Giữ các control hiện có, không trộn vào lựa chọn bài toán.
9. **CTA sticky**
   - Tên hành động phản ánh đầy đủ mode.

### 5.1. Control semantics

- “Loại bài toán” là radio group hoặc segmented radio, không dùng tab nếu tab khiến người dùng nghĩ đây chỉ là đổi nội dung xem.
- “Cách xử lý” cũng là radio group.
- “Chạy một / So sánh nhiều” là segmented radio.
- Danh sách thuật toán compare là checkbox group có số lượng hiện tại, min/max và lý do khi không thể chọn thêm.
- Không chỉ dùng toast để giải thích CTA disabled. Lý do phải hiển thị bền vững gần control/CTA.
- Mỗi stop có nút `Lên` và `Xuống` luôn khả dụng bằng bàn phím; drag handle chỉ
  là tăng cường cho pointer, không phải con đường duy nhất. Nút biên bị disabled
  đúng trạng thái, focus ở lại item vừa di chuyển, và một live region polite báo
  “Đã chuyển [tên] lên vị trí 2/5”. Không announce trong lúc pointer đang kéo.
- Xóa và reorder là hai action riêng có accessible name chứa tên/vị trí stop;
  không đặt toàn row thành một gesture mơ hồ.

### 5.2. CTA copy

Ví dụ:

- `Chạy A*: Đi → Đến`.
- `Chạy A* theo thứ tự đã chọn`.
- `Tối ưu bằng Held–Karp`.
- `So sánh 3 thuật toán tìm đường`.
- `So sánh 3 phương pháp ATSP`.

Không dùng một nhãn mơ hồ như “Chạy thuật toán” cho mọi flow.

### 5.3. Quy tắc đổi mode/strategy/run kind

Khi người dùng thay `problemMode`, `multiStrategy` hoặc `runKind`:

- Giữ draft input.
- Clear trace/result/session không còn phù hợp.
- Reset timeline/playback.
- Abort browser requests nếu có.
- Tăng `runId` để response cũ luôn bị bỏ qua.
- Không tự chạy lại.
- Không tự thay algorithm/method nếu lựa chọn cũ không hợp lệ; giữ lựa chọn và hiển thị lý do, hoặc chọn default chỉ ở lần khởi tạo đầu tiên.

### 5.4. State-transition matrix

| Thao tác | Giữ lại | Clear/invalidate | Không được làm |
|---|---|---|---|
| Hai điểm → Nhiều điểm | Start, Goal draft, Stops draft, return draft | Single result, trace, timeline, mọi compare session | Tự biến Goal thành stop hoặc tự chạy |
| Nhiều điểm → Hai điểm | Start, cả hai draft | Single result, trace, timeline, mọi compare session | Xóa stops hoặc return draft |
| Ordered → ATSP | Start/stops/return | Ordered result/compare/trace | Đổi thứ tự stops |
| ATSP → Ordered | Start/stops/return | ATSP result/compare/trace | Dùng ATSP order cũ làm input mới |
| Single → Compare | Draft và single result có thể giữ để quay lại | Active comparison session cũ không cùng snapshot | Dùng runtime single có trace trong bảng compare |
| Compare → Single | Draft; comparison session có thể giữ read-only tới khi input đổi | Single trace nếu algorithm/method khác | Tự promote một compare result thành single trace |
| Đổi graph/slot/mode/scenario | Draft node chỉ giữ nếu còn hợp lệ sau graph load | Tất cả result/session/trace | Render result cũ trên graph mới |
| Đổi return flag | Start/stops | Mọi multi result/session/trace | Giữ map/totals cũ |
| Collapse panel | Toàn bộ data/result/camera | Không gì | Gọi invalidation hoặc auto-refit |

### 5.5. Wireframe định hướng

Desktop, single run:

~~~text
┌──────────────────────┬──────────────────────────────────┬──────────────────────┐
│ Panel thiết lập      │ Bản đồ chính + timeline          │ Drawer kết quả       │
│                      │                                  │ Metrics/Trace/...    │
│ Loại bài toán        │                                  │                      │
│ Hành trình           │                                  │                      │
│ Cách xử lý           │                                  │                      │
│ Chạy một / So sánh   │                                  │                      │
│ Thuật toán           │                                  │                      │
│ [ CTA sticky ]       │                                  │                      │
└──────────────────────┴──────────────────────────────────┴──────────────────────┘
~~~

Desktop, comparison:

~~~text
┌──────────────────────┬─────────────────────────────────────────────────────────┐
│ Panel thiết lập      │ Header: snapshot · progress · cancel · sync camera      │
│                      ├──────────────────────────┬──────────────────────────────┤
│ 2–4 algorithms       │ Pane 1: title/status/map │ Pane 2: title/status/map    │
│ hoặc 2–3 methods     ├──────────────────────────┼──────────────────────────────┤
│                      │ Pane 3                  │ Pane 4                       │
│ [ Chạy so sánh ]     ├──────────────────────────┴──────────────────────────────┤
│ [ Thu gọn ]          │ Bảng số liệu chung / detail của pane đang focus         │
└──────────────────────┴─────────────────────────────────────────────────────────┘
~~~

Khi panel trái thu gọn, một rail/trigger vẫn còn. Ở màn hình hẹp, panel và result dùng sheet; các comparison panes chuyển thành một cột hoặc carousel có nhãn rõ.

---

## 6. Tùy chọn quay về điểm Đi

### 6.1. UI

Chỉ hiển thị trong `problemMode="multi_point"`:

> **Quay về điểm Đi sau điểm giao cuối**
>
> Tắt: kết thúc tại điểm giao cuối. Bật: thêm một chặng từ điểm cuối quay về Đi.

Mặc định: `false`, đúng quyết định hiện hành của dự án.

### 6.2. Semantics cho ordered search

- Open: waypoints là `[start, ...stops]`.
- Closed: waypoints là `[start, ...stops, start]`.
- Start vẫn bị cấm xuất hiện trong `stops`; việc lặp Start đúng một lần ở cuối là do policy tạo, không phải một delivery stop.
- Mỗi cặp waypoint tiếp tục dùng `/api/route`.
- Chặng khép vòng thất bại phải báo cụ thể “Không tìm thấy chặng từ [stop cuối] về điểm Đi”.
- Totals và metrics là tổng của mọi chặng, bao gồm closing leg khi bật.
- `max_frontier` của hành trình tuần tự tiếp tục là max giữa các chặng, không phải tổng.

### 6.3. Semantics cho ATSP

- Gửi đúng `return_to_start` vào `/api/multiroute`.
- `order` không lặp Start ở cuối; closing leg chỉ thể hiện trong `legs`.
- `return_to_start=true` thì số legs bằng số stops + 1.
- `return_to_start=false` thì số legs bằng số stops.
- Baseline và optimized totals đều phải cùng open/closed semantics.
- Savings phải so hai hành trình có cùng flag.

### 6.4. Presentation

- Open: badge `Hành trình mở`; copy “Kết thúc tại điểm giao cuối”.
- Closed: badge `Vòng kín`; copy “Khép vòng và quay về điểm Đi”.
- Marker Start chỉ có một.
- Closing leg được vẽ như route line bình thường nhưng có thể có icon/label “Về Đi”.
- Danh sách itinerary không đánh Start cuối thành stop giao hàng mới.
- Response phải echo `return_to_start`; UI không suy luận bằng cách đếm legs.

### 6.5. Invalidation

Thay đổi flag phải clear:

- ordered route result;
- ATSP single result;
- route comparison session trong multi/ordered;
- ATSP comparison session;
- trace/timeline;
- mọi detail result đang focus.

Không clear Start hoặc stops.

---

## 7. Dijkstra hai chiều: contract và UI

### 7.1. Contract additive bắt buộc

Thêm model tương đương sau vào `docs/SCHEMA.md` và `backend/app/models.py`:

~~~ts
interface BidirectionalFrontierSide {
  nodes: string[];
  g: Record<string, number>;
}

interface BidirectionalFrontiers {
  forward: BidirectionalFrontierSide;
  backward: BidirectionalFrontierSide;
  best_path_cost: number | null;
  meeting_node: string | null;
}

interface TraceStep {
  // Các field cũ giữ nguyên.
  frontier: string[];
  g: Record<string, number> | null;
  side?: "forward" | "backward" | null;

  // Field mới, tên JSON snake_case.
  bidirectional_frontiers?: BidirectionalFrontiers | null;
}
~~~

Tên field cuối cùng phải được ghi một lần trong schema và mirror đúng ở
Python/TypeScript. API types giữ nguyên snake_case; chỉ state/view-model nội bộ
mới được map có chủ ý sang camelCase. Không tạo đồng thời hai biến thể
`bidirectional` và `bidirectional_frontiers`.

### 7.2. Invariant backend

Với mỗi recorded step của `bidijkstra`:

1. `forward.nodes = sorted(open_f)`.
2. `backward.nodes = sorted(open_b)`.
3. Keys của `forward.g` bằng chính xác tập `forward.nodes`.
4. Keys của `backward.g` bằng chính xác tập `backward.nodes`.
5. `forward.g[n]` là chi phí từ Start đến `n` trên graph gốc.
6. `backward.g[n]` là chi phí từ `n` đến Goal trên graph gốc, dù search chạy trên reverse adjacency.
7. Node có ở cả hai frontier xuất hiện ở cả hai list và giữ hai g-value độc lập.
8. `set(frontier) = set(forward.nodes) ∪ set(backward.nodes)`.
9. Field `g` cũ giữ semantics hiện tại:
   - chỉ ở forward → forward g;
   - chỉ ở backward → backward g;
   - ở cả hai → min của hai g.
10. `side` tiếp tục là phía vừa expand.
11. `best_path_cost` là `null` khi chưa có finite μ, ngược lại là best meeting cost hiện tại.
12. `meeting_node` là node tương ứng với μ hoặc `null`.
13. Producer backend mới **bắt buộc** populate field này cho mọi recorded step của Bidirectional Dijkstra; thuật toán khác phải có `null`/omitted.
14. JSON field có default `null` để reader/model vẫn đọc được trace legacy trong giai đoạn rollout. Việc thiếu field ở một bidi trace legacy kích hoạt UI compatibility fallback, không làm frontend crash.
15. Không tạo snapshot/map khi trace recorder không active; `include_trace=false` không được chịu chi phí payload mới.
16. `max_frontier` giữ nguyên nghĩa hiện tại là max kích thước union frontier. Không âm thầm đổi thành tổng hai phía.
17. Trace cap 5.000 chỉ cắt payload, không cắt search hoặc full-run metrics.
18. Nested frontier/`best_path_cost` là snapshot **sau** expansion; decision
    `top_forward`, `top_backward`, selected score và `mu_before` là state effective
    **trước** expansion, sau khi loại stale heap entry.
19. Nested `g` dùng cùng trace-display rounding với legacy `g`; selected score,
    runner-up, top keys, bound và μ dùng raw finite algorithm values. UI format
    các giá trị raw, không dùng số đã round để giải thích tie/stop rule.

### 7.3. UI hai bảng

Trong drawer hẹp, xếp dọc hai card:

1. **Phía xuôi — từ Đi**
   - màu semantic forward hiện có;
   - số node;
   - bảng cột Điểm và g.
2. **Phía ngược — từ Đến**
   - màu semantic backward hiện có;
   - số node;
   - bảng cột Điểm và g.

Quy tắc:

- Card của `side` hiện tại có badge “Đang mở rộng”.
- Node overlap xuất hiện ở cả hai bảng, không merge.
- Có chú thích rõ g ngược là “chi phí từ node này đến Đến”.
- Hiển thị meeting node và μ nếu đã có; format μ theo cost mode, không gắn giây trong distance mode.
- Nếu backend cũ chưa có field mới, render bảng union hiện hành kèm nhãn “Dữ liệu tương thích: chưa tách được hai phía”. Tuyệt đối không suy đoán.

### 7.4. Map và legend

- Frontier forward và backward có màu/shape riêng.
- Expanded node tiếp tục theo side.
- Node nằm trong cả hai frontier phải có non-color cue, ví dụ fill forward + outline backward hoặc hai vòng đồng tâm.
- Legend có nhãn văn bản; không dùng màu là dấu hiệu duy nhất.
- Không thay đổi semantics path/result.

---

## 8. Số liệu ATSP được thiết kế lại

### 8.1. Nhóm 1 — Kết quả hành trình

Hiển thị theo thứ tự ưu tiên:

1. Method và guarantee:
   - Held–Karp: exact trong phạm vi hợp lệ.
   - NN + cải thiện và SA: heuristic; không ghi “tối ưu” như một guarantee.
2. Cấu hình:
   - graph, slot, mode, scenario;
   - hành trình mở/vòng kín.
3. Objective sau tối ưu.
4. Baseline trước tối ưu.
5. Savings có dấu.
6. Tổng quãng đường.
7. Thời gian ước tính theo ùn tắc và chi phí cân bằng — hai số riêng, không dùng
   `total_time_s` làm ETA.
8. Số stop và số leg.
9. Visiting order.
10. Bảng từng chặng.

Bảng từng chặng:

| Cột | Nội dung |
|---|---|
| # | Thứ tự leg |
| Từ → Đến | Tên/ID hai đầu |
| Chi phí mục tiêu | Theo mode hiện tại |
| Quãng đường | m hoặc km theo presentation policy |
| Thời gian ước tính theo ùn tắc | `cost_breakdown.congestion_adjusted_time_s`; s/phút, không phải runtime |
| Chi phí cân bằng | `metrics.total_time_s = cost_breakdown.balanced_cost_s`; phút quy đổi, không phải ETA |

Cho phép đổi giữa tab/toggle “Thứ tự ban đầu” và “Sau tối ưu”. Muốn làm vậy phải có baseline order/legs từ response.

### 8.2. Nhóm 2 — Công sức tính toán

Hiển thị:

- Số lượt search dựng ma trận.
- Tổng nodes expanded khi dựng ma trận.
- Thời gian dựng matrix.
- Thời gian optimizer.
- Tổng runtime backend của multiroute facade.
- Số optimization events đã ghi và trạng thái truncated/sampled nếu trace được yêu cầu.
- Với SA: best seed, best cost, mean, standard deviation và bảng 5 seed trong `<details>`.

Không:

- gọi optimization event count là expanded nodes;
- so raw event count giữa các method như một metric công bằng;
- nhầm `total_time_s` với runtime;
- dùng trace on/off để kết luận method nào nhanh hơn.

### 8.3. Contract response đề xuất

Giữ toàn bộ field cũ và thêm:

~~~json
{
  "contract_version": 2,
  "return_to_start": false,
  "original_order": ["S", "A", "B"],
  "original_order_legs": [
    {
      "from_node": "S",
      "to_node": "A",
      "path": ["S", "...", "A"],
      "metrics": {
        "total_cost": 0,
        "total_distance_m": 0,
        "total_time_s": 0
      },
      "cost_breakdown": {
        "distance_m": 0,
        "free_flow_time_s": 0,
        "congestion_adjusted_time_s": 0,
        "congestion_delay_s": 0,
        "penalty_flood_s": 0,
        "penalty_construction_s": 0,
        "penalty_narrow_alley_s": 0,
        "penalty_traffic_light_s": 0,
        "risk_penalty_total_s": 0,
        "balanced_cost_s": 0
      }
    }
  ],
  "totals_breakdown": {
    "distance_m": 0,
    "free_flow_time_s": 0,
    "congestion_adjusted_time_s": 0,
    "congestion_delay_s": 0,
    "penalty_flood_s": 0,
    "penalty_construction_s": 0,
    "penalty_narrow_alley_s": 0,
    "penalty_traffic_light_s": 0,
    "risk_penalty_total_s": 0,
    "balanced_cost_s": 0
  },
  "original_order_breakdown": {
    "distance_m": 0,
    "free_flow_time_s": 0,
    "congestion_adjusted_time_s": 0,
    "congestion_delay_s": 0,
    "penalty_flood_s": 0,
    "penalty_construction_s": 0,
    "penalty_narrow_alley_s": 0,
    "penalty_traffic_light_s": 0,
    "risk_penalty_total_s": 0,
    "balanced_cost_s": 0
  },
  "matrix_evidence": {
    "point_count": 3,
    "directed_pair_count": 6,
    "reachable_directed_pair_count": 6,
    "asymmetric_unordered_pair_count": 2,
    "asymmetry_example": {
      "from_node": "A",
      "to_node": "B",
      "forward_cost": 120.0,
      "reverse_cost": 150.0,
      "absolute_delta": 30.0
    }
  },
  "computation_metrics": {
    "matrix_search_runs": 3,
    "matrix_nodes_expanded": 0,
    "matrix_runtime_ms": 0,
    "optimizer_runtime_ms": 0,
    "total_runtime_ms": 0
  },
  "failure": null,
  "method_stats": {
    "kind": "nn_local_search",
    "nn_initial_cost": 0,
    "nn_candidates_evaluated": 0,
    "two_opt_candidates_evaluated": 0,
    "or_opt_candidates_evaluated": 0,
    "accepted_2opt_moves": 0,
    "accepted_oropt_moves": 0,
    "final_cost": 0,
    "improvement_after_nn": 0
  }
}
~~~

Đây là ví dụ shape, không phải số liệu fixture.

### 8.4. Semantics của field mới

- `return_to_start`: echo đúng request sau validation.
- `original_order`: luôn là `[start, ...stops]`; không lặp Start cuối.
- `original_order_legs`: legs theo input order; có closing leg khi flag true.
- Mỗi optimized/baseline leg có `cost_breakdown` tính từ cùng backend helper như
  route metrics; không tái tính ở frontend.
- `totals_breakdown` và `original_order_breakdown` là tổng field-by-field của đúng
  các legs tương ứng, cùng open/closed topology. Các identity và tolerance lấy duy
  nhất từ `docs/SCHEMA.md` §F.1.
- `matrix_evidence` luôn có khi facade đã bắt đầu: tổng directed pairs, số pair
  đã dựng được, số unordered pair asymmetric và một ví dụ deterministic theo
  đúng active-mode raw cost. Shape/selection rule lấy duy nhất từ
  `docs/SCHEMA.md` §F.4.
- `metrics.total_time_s` luôn bằng `cost_breakdown.balanced_cost_s`; time-mode ETA
  dùng `metrics.total_cost`/`congestion_adjusted_time_s`, không dùng field legacy.
- `matrix_search_runs`: số lần multi-target UCS; với implementation hiện tại bằng số điểm `k`.
- `matrix_nodes_expanded`: tổng node pop/settle hợp lệ của các lượt dựng matrix.
- `matrix_runtime_ms`: thời gian dựng đầy đủ cost/path matrix.
- `optimizer_runtime_ms`: chỉ thời gian chạy Held–Karp, NN + local search hoặc SA trên matrix đã có.
- `total_runtime_ms`: wall clock trong `solve_multiroute` từ sau validation đầu vào đến khi hoàn tất result assembly; không gồm network/browser và serialization ngoài facade.
- `failure` và `method_stats` dùng đúng union/semantics ở mục 30.19–30.20 và
  `docs/SCHEMA.md` §F.4; stats full-run, không suy từ sampled trace.
- Mọi runtime hữu hạn và không âm.
- Raw `total_runtime_ms >= matrix_runtime_ms + optimizer_runtime_ms`; phần chênh
  là assembly/overhead. Validate raw trước, rồi round cả ba 3 chữ số thập phân;
  test serialized cho phép tối đa 0,002 ms do rounding.

### 8.5. found=false

Khóa contract rõ trong `docs/SCHEMA.md`:

- `found=false` là kết quả nghiệp vụ hợp lệ, không phải HTTP error.
- `return_to_start` vẫn echo.
- `order=[]`, `legs=[]`, `totals=null`, `totals_breakdown=null`, `savings_pct=null`.
- `original_order` vẫn echo input để chẩn đoán.
- `original_order_legs=[]` vì chưa có đủ đường nối.
- `original_order_totals=null`.
- `original_order_breakdown=null`.
- `matrix_evidence` vẫn có số đã thu thập tới directed pair lỗi.
- `computation_metrics` vẫn có số đã thu thập tới lúc phát hiện unreachable, nếu implementation đo được; nếu schema chọn nullable thì phải nhất quán và UI có nhãn “không có dữ liệu”, không hiển thị 0 giả.

Khuyến nghị tốt nhất: luôn trả `computation_metrics` khi facade đã bắt đầu xử lý.

### 8.6. Savings và guarantee

- Công thức, tolerance, zero denominator và dấu lấy duy nhất từ
  `docs/SCHEMA.md` §F.1; frontend không tính từ số đã round.
- Savings dương: “Giảm X%”.
- Savings bằng 0: “Không thay đổi”.
- Savings âm: “Tăng X%”; không tô như cải thiện.
- Nếu comparison có Held–Karp thành công, dùng kết quả đó làm exact reference và có thể tính gap cho heuristic.
- Nếu không có Held–Karp, chỉ ghi “Tốt nhất trong các phương pháp đang hiển thị”; không ghi optimality gap.
- Signed trade-off, savings và optimality gap là ba field/khái niệm khác nhau;
  không dùng chung tên `delta` mơ hồ.

---

## 9. So sánh nhiều thuật toán tìm đường

### 9.1. Selection

- Chọn ít nhất 2, nhiều nhất 4 thuật toán.
- Không trùng ID.
- Mặc định đề xuất: A* và UCS.
- Khi đã chọn 4, các lựa chọn khác disabled với helper “Tối đa 4 bản đồ để bảo đảm khả năng đọc và hiệu năng”.
- Beam Search/IDA* vẫn có tham số riêng theo thuật toán. Snapshot phải lưu effective params cho từng ID; không dùng một object param chung gây rò sang thuật toán khác.
- Không tự bỏ lựa chọn cũ khi người dùng chạm giới hạn.

### 9.2. Input fairness

Mọi thuật toán dùng cùng:

- graph level/view;
- slot;
- cost mode;
- scenario snapshot/fingerprint;
- Start/Goal;
- hoặc cùng chuỗi ordered waypoints và return flag;
- cùng policy include-trace.

Comparison request phải chạy với `include_trace=false` để runtime/payload công bằng hơn. Nếu người dùng bấm “Xem chi tiết”, chạy lại đúng một thuật toán với trace và mở single-result detail; không sử dụng lần chạy có trace để thay số runtime trong bảng compare.

### 9.3. Orchestration

Khuyến nghị chạy tuần tự, một thuật toán tại một thời điểm:

1. Tạo đủ N card với trạng thái queued.
2. Chuyển card kế tiếp sang running.
3. Gọi request.
4. Ghi success/no-path/error nếu `runId` và snapshot còn hợp lệ.
5. Tiếp tục card sau dù card trước lỗi.

Lý do: tránh tranh CPU và làm runtime giữa các thuật toán khó diễn giải. Không dùng `Promise.all` cho so sánh runtime trên cùng backend process.

Đối với ordered multi:

- Mỗi algorithm chạy tuần tự qua từng leg.
- Tổng request là `N algorithms × number of legs`.
- Với tối đa 15 stops: open có 15 legs, closed có 16 legs; 4 algorithms tương
  ứng tối đa 60 hoặc **64** `/api/route` calls, không phải 15 legs cho cả hai mode.
- Sau mỗi leg phải kiểm tra stale/cancel, không chỉ sau khi merge cuối.
- Progress có hai tầng, ví dụ “Thuật toán 2/4 · Chặng 3/6”.
- Chặng đầu tiên no-path dừng riêng algorithm đó; không dừng algorithms còn lại.

### 9.4. Kết quả và bảng tổng hợp

Mỗi algorithm là một row/card:

- trạng thái;
- objective;
- total distance;
- congestion-adjusted time và balanced cost ở hai cột riêng;
- nodes expanded;
- max frontier;
- runtime;
- guarantee/điều kiện;
- số leg nếu ordered multi;
- nút xem chi tiết/thử lại.

Highlight min/best phải có icon/text, không chỉ màu. Không xếp hạng:

- no-path;
- error;
- cancelled;
- metric null.

Runtime của ordered multi là tổng runtime các leg. Nodes expanded là tổng. Max frontier là max các leg.

### 9.5. Trace nhiều chặng

Single ordered run hiện ghép recorded trace của nhiều leg. Backend vẫn chạy đủ
mỗi leg và metrics luôn là full run; frontend áp global **presentation cap 5.000**
theo policy duy nhất `per-leg-boundary-proportional-v1`:

1. Gọi `n_i` là số step thực sự nhận được của leg `i`; `L <= 16`. Nếu
   `sum(n_i) <= 5.000`, giữ nguyên tất cả.
2. Với mỗi leg, reserve `b_i = min(2, n_i)`: step recorded đầu và cuối; nếu chỉ
   một step thì giữ đúng một. Đây là **last recorded step**, không được gọi là
   final search event nếu source leg có `metrics.trace_truncated=true`.
3. Interior count `m_i = max(n_i - 2, 0)`. Budget còn lại
   `R = 5.000 - sum(b_i)`. Nếu `R < sum(m_i)`, cấp ban đầu
   `q_i = floor(R * m_i / sum(m_i))`; phần dư phân lần lượt theo fractional
   remainder giảm dần, tie theo leg index tăng dần, không cấp quá `m_i`.
4. Trong `m_i` interior steps, nếu cần giữ `q_i`, với `j=0..q_i-1` chọn local
   interior index `floor((j+1)*(m_i+1)/(q_i+1))`. Công thức tạo index 1..`m_i`,
   tăng nghiêm ngặt và không trùng; cộng offset về step local thật.
5. Ghép theo leg order rồi local order, renumber presentation step 1-based. Không
   thay `expanded`, score, leg attribution hoặc source metrics.

Metadata derived phía frontend:

~~~ts
interface SequentialTimelineMeta {
  policy: "per-leg-boundary-proportional-v1";
  sourceRecordedSteps: number;
  presentedSteps: number;
  presentationSampled: boolean;
  sourceTraceTruncated: boolean;
  sourceTruncatedLegIndexes: number[];
}
~~~

`presentationSampled` và `sourceTraceTruncated` là hai sự kiện khác nhau; không
ghi đè cờ backend của từng leg. Copy:

- sampled-only: “Timeline đã lấy mẫu; kết quả và metrics vẫn là toàn bộ lần chạy.”
- source truncated: “Ít nhất một chặng chỉ ghi 5.000 bước đầu; không có diễn biến
  cuối đầy đủ, nhưng kết quả và metrics vẫn là toàn bộ lần chạy.”

Comparison luôn trace off. Global sampler là gate bắt buộc của single ordered
trace, không được hoãn rồi vẫn tuyên bố hỗ trợ an toàn 15 stops/closed 16 legs.

---

## 10. So sánh nhiều phương pháp ATSP

### 10.1. Selection và eligibility

- Chọn 2 hoặc cả 3 method.
- Các method: Held–Karp, Nearest Neighbor + cải thiện asymmetric-safe, Simulated Annealing.
- `k = 1 + stops.length`.
- Held–Karp hợp lệ khi `k <= 15`.
- NN/SA hợp lệ khi `k <= 16`.
- Nếu input làm Held–Karp không hợp lệ, giữ checkbox/selection hiện hữu nhưng đánh dấu invalid và chặn CTA cho tới khi giảm stops hoặc bỏ method. Không tự chuyển method.
- Lý do phải ghi rõ số hiện tại và giới hạn.

### 10.2. Input fairness

Mọi method phải dùng cùng:

- thứ tự input stops;
- Start;
- graph/slot/mode/scenario;
- return flag;
- trace policy;
- request timestamp/session snapshot.

Comparison gửi `include_trace=false`. Không đồng bộ optimization timeline giữa các method vì event semantics khác nhau.

### 10.3. Orchestration phase đầu

Tái sử dụng `/api/multiroute`, gọi một lần cho mỗi method, chạy tuần tự:

- Không tạo batch endpoint ngay.
- Giữ partial success.
- Có progress “Phương pháp 2/3”.
- Cho phép retry riêng card lỗi với đúng snapshot cũ nếu snapshot vẫn còn current.
- Cancel ngăn không khởi chạy method queued tiếp theo; request sync backend đang chạy có thể vẫn tiếp tục phía server.

AbortController chỉ hủy browser wait; không được tuyên bố đã dừng CPU backend nếu endpoint vẫn synchronous. Vì vậy stale `runId` guard là bắt buộc ngay cả khi đã abort.

### 10.4. Result workspace

- Có đúng một pane/map cho mỗi method được chọn.
- Baseline “thứ tự nhập” xuất hiện một lần trong bảng summary và có thể là dashed muted overlay trong từng pane; baseline không tạo một map riêng vì không phải một method.
- Mỗi pane có title, guarantee, open/closed badge, objective, savings và final route.
- Bảng chung có:
  - objective;
  - total distance;
  - congestion-adjusted time và balanced cost ở hai cột riêng;
  - savings;
  - optimizer runtime;
  - total runtime;
  - guarantee;
  - route order.
- Nếu Held–Karp thành công, thêm gap của heuristic so với exact.
- Nếu Held–Karp lỗi/no-path thì không dùng nó làm reference.
- Gap serialize `heuristic.total_cost - held_karp.total_cost`, clamp 0 trong raw
  tolerance §14.4; gap âm ngoài tolerance là integrity error và dừng ranking.
- `gap_pct` dùng exact cost làm mẫu số theo zero-denominator policy §14.4. Không
  tái dùng `savings_pct` hoặc signed reference trade-off để hiển thị gap.

### 10.5. Batch endpoint chỉ là phương án dự phòng

Chỉ thiết kế batch endpoint nếu profiling trên máy demo cho thấy việc dựng cùng cost matrix ba lần là bottleneck đáng kể. Ngưỡng đề xuất để mở quyết định kiến trúc:

- cùng input G_demo, k=10, chạy cả ba method mất hơn 5 giây; **hoặc**
- tổng matrix runtime lặp lại chiếm hơn 40% aggregate backend runtime; **hoặc**
- trải nghiệm máy chiếu không đạt progress/interaction budget đã chốt.

Đây là ngưỡng kỹ thuật đề xuất, không phải yêu cầu môn học. Nếu không chạm ngưỡng, giữ endpoint hiện tại để giảm blast radius.

Nếu cần batch:

- thêm endpoint additive, không phá `/api/multiroute`;
- resolve scenario và build matrix đúng một lần;
- chạy methods trên một immutable matrix;
- trả per-method result/error;
- có test parity với gọi endpoint đơn;
- không thêm global mutable matrix cache. Global cache dễ sai theo graph/slot/mode/scenario fingerprint và làm tăng rủi ro memory/stale data.

---

## 11. Comparison workspace và kiến trúc bản đồ

### 11.1. Nguyên tắc N lựa chọn = N pane

Nếu chọn N algorithm/method:

- DOM/result model có đúng N pane.
- Pane không biến mất khi queued, error, no-path hoặc cancelled.
- Thứ tự pane ổn định theo selection order.
- Mỗi pane có accessible heading duy nhất.
- Mỗi pane chứa bản đồ final route riêng khi có result; trạng thái không có route có placeholder giải thích.

### 11.2. Layout

Desktop:

- N=2: 2 cột.
- N=3: 2×2 với pane thứ ba chiếm vị trí hợp lý; chỉ dùng 3 cột nếu chiều rộng thực tế sau panel đủ để mỗi pane đạt min-width.
- N=4: 2×2.

Tablet:

- 1 hoặc 2 cột theo container query/available width, không theo viewport cứng duy nhất.

Mobile:

- Một cột hoặc horizontal snap carousel có nhãn vị trí “2/4”.
- Carousel luôn có nút `Bản đồ trước`/`Bản đồ sau`, hỗ trợ Left/Right khi focus ở
  vùng điều hướng và có status “Bản đồ 2/4 · A*”. Swipe/snap chỉ là tăng cường;
  không phải cách duy nhất để tới pane khác.
- Tất cả N pane vẫn tồn tại và truy cập được.
- Không thu nhỏ bốn map cạnh nhau.
- Không có page-level horizontal scroll.

Mỗi map pane phải có chiều cao tối thiểu được chốt trong `docs/DESIGN.md` sau browser QA; không hard-code con số trước khi kiểm tra toolbar/timeline ở 1366×768.

### 11.3. Camera độc lập theo pane

- Mỗi map sở hữu camera riêng ngay từ đầu.
- Pan/zoom/Home trên một map không thay đổi map khác.
- Không có toggle đồng bộ camera trong comparison workspace.
- Mục tiêu là cho phép phóng to từng tuyến để kiểm tra chi tiết độc lập.
- Khi collapse panel, resize map nhưng không auto fly/refit; camera người dùng được giữ. Nút Home hiện có vẫn là thao tác refit chủ động.

### 11.4. Không nhân bản `MapView` hiện tại

`MapView` đang đọc nhiều global Zustand state và chứa selection/editing/timeline/animation. Render N bản sao sẽ tạo coupling, rerender và WebGL load không cần thiết.

Tách theo hướng:

~~~text
MapView (single-run wrapper)
└── RouteMapCanvas / MapCanvas (prop-driven)
    ├── graph + graph view
    ├── traffic/scenario presentation data
    ├── final path hoặc một trace
    ├── controlled viewState
    └── interaction flags

ComparisonWorkspace
├── ComparisonSummaryTable
└── ComparisonMapGrid
    └── N × ComparisonMapPane
        └── RouteMapCanvas (final-only)
~~~

`RouteMapCanvas` không đọc toàn bộ app store. Input chính phải qua props. `MapView` hiện hành trở thành wrapper giữ:

- chọn node/edge;
- editor/override;
- primary trace animation;
- timeline;
- route flow;
- main-map toolbar.

`ComparisonMapPane`:

- không cho chọn node/edge;
- không có edit banner/trash;
- không chạy route-flow;
- không có autoplay;
- chỉ render base graph tối giản, endpoints/stops và final path;
- reuse memoized node coordinates/edge geometry;
- dùng chung graph data đã load.

### 11.5. WebGL/performance guardrail

- Route cap 4; ATSP cap 3.
- Comparison workspace unmount hoặc ẩn hoàn toàn primary interactive map để không tạo thêm một context vô ích.
- Không giữ N primary maps phía sau drawer.
- Không bật N animation loops.
- Kiểm tra context loss, memory và pan/zoom trên GPU thật của máy demo.
- Nếu basemap nhiều context không ổn định, fallback được phép là comparison renderer nhẹ/deck-only hoặc basemap tắt có nhãn rõ. Không được âm thầm bỏ pane hoặc ghép các route trở lại một map.

### 11.6. Vì sao không chọn các phương án khác

| Phương án | Quyết định | Lý do |
|---|---|---|
| Chồng 4–9 route trên một map | Loại | Khó đọc, phụ thuộc nhiều màu/offset, không đúng yêu cầu small multiples |
| Render cả 9 map | Loại mặc định | Không đọc được trên máy chiếu và có rủi ro WebGL/GPU |
| Nhân nguyên `MapView` N lần | Loại | Store coupling và layer/interaction thừa |
| Animate trace của tất cả pane | Loại mặc định | Payload, GPU và semantics tiến độ khó so sánh |
| Một map đổi route bằng dropdown | Không đáp ứng yêu cầu chính | Không cho so sánh trực quan đồng thời |

---

## 12. Thu gọn panel trái

### 12.1. Behavior

Thêm layout state `controlsOpen`:

- mặc định `true`;
- không persist dài hạn;
- không làm clear input/result/session;
- độc lập với mobile sheet;
- không tự đóng sau khi run.

Desktop `>=960px`:

- Header panel có nút “Thu gọn bảng thiết lập”.
- Khi đóng, giữ rail/trigger khoảng 48–56 px hoặc floating trigger cố định bên trái.
- Trigger có nhãn “Mở bảng thiết lập”.
- Workspace/map/grid dùng thêm phần chiều rộng vừa giải phóng.

Mobile:

- Giữ sheet/dialog hiện tại.
- Không tạo thêm một disclosure desktop nằm trong modal sheet.

### 12.2. Accessibility và focus

Nút có:

~~~tsx
<button
  aria-expanded={controlsOpen}
  aria-controls="control-panel"
  aria-label={controlsOpen
    ? "Thu gọn bảng thiết lập"
    : "Mở bảng thiết lập"}
/>
~~~

Quy tắc:

- Khi đóng trong lúc focus ở bên trong panel, chuyển focus tới trigger mở.
- Khi mở bằng trigger, focus vào heading panel hoặc control đầu tiên hợp lý.
- Nội dung hidden không còn trong tab order.
- Enter/Space kích hoạt.
- Reduced motion rút ngắn/bỏ transition.
- Sau width transition, gọi resize đúng cách cho map; không auto refit/fly camera.
- Scroll position panel được giữ nếu thực tế không gây lỗi; không bắt buộc nếu component unmount.

### 12.3. Tùy chọn sau

“Tập trung so sánh” đóng cả panel trái và drawer phải có thể thêm sau. Không đưa vào Definition of Done ban đầu để tránh thêm layout state phức tạp.

---

## 13. Async, lỗi và invalidation

### 13.1. Một nguồn chân lý cho request lifecycle

Mỗi run có:

- unique `runId`;
- AbortController phía frontend;
- immutable snapshot;
- per-item status;
- stale response guard.

Trình tự khi input đổi:

1. Tăng `runId`.
2. Abort request đang chờ phía browser.
3. Đánh dấu session cũ cancelled hoặc clear theo UX đã chốt.
4. Reset timeline/detail.
5. Bỏ qua mọi response có `runId` cũ.

Không dựa riêng vào AbortController vì backend synchronous có thể vẫn chạy.

### 13.2. Error matrix

| Tình huống | Hành vi bắt buộc |
|---|---|
| Chưa chọn Start | CTA disabled; helper “Chọn điểm Đi” |
| Hai điểm thiếu Goal | CTA disabled; không xóa draft |
| Nhiều điểm chưa có stop | CTA disabled; hướng dẫn thêm điểm |
| Stop trùng Start/stop khác | Chặn ngay; nêu đúng node trùng |
| Compare chỉ chọn 1 ID | Không chạy; “Chọn ít nhất 2” |
| Chọn vượt max | Disable lựa chọn tiếp theo; không tự bỏ cái cũ |
| Held–Karp k>15 | Invalid rõ lý do; không tự đổi method |
| `found=false` | V2 dùng typed termination: proven unreachable khác inconclusive do cap/pruning; legacy chỉ nói “lần chạy này chưa tìm thấy”, không gọi là network error hoặc tự chứng minh vô đường |
| Một item HTTP error | Giữ item thành công; card lỗi có Retry |
| Backend offline/toàn bộ lỗi | Alert bền vững cấp workspace và Retry |
| Input đổi khi running | Abort/discard; không để result cũ xuất hiện |
| Fingerprint mismatch | Contract error; không render |
| Closing leg no-path | Nêu rõ leg cuối về Đi thất bại |
| Backend cũ thiếu bidi field | Bảng union compatibility; không suy đoán |
| Trace truncated | Ghi rõ payload rút gọn, metrics full run |
| Basemap lỗi | Một cảnh báo cấp workspace; không tạo N toast |
| WebGL context loss | Cảnh báo và fallback rõ; giữ N pane |
| User cancel comparison | Giữ completed cards, queued/running thành cancelled; cho phép chạy lại phần chưa xong nếu snapshot còn hợp lệ |

### 13.3. Retry

- Retry riêng item sử dụng snapshot của session, không dùng input live đã khác.
- Nếu snapshot không còn current, disable Retry và yêu cầu tạo run mới.
- Retry không xóa các success cards.
- Sau retry thành công, update đúng slot ID và giữ ordering.

---

## 14. Presentation và đơn vị

### 14.1. Quy tắc không được vi phạm

- `distance` cost là mét; presentation có thể đổi sang km nhưng phải ghi đơn vị.
- `time` và `balanced` cost là giây; presentation có thể đổi sang phút.
- `total_time_s` luôn là balanced path weight theo contract, kể cả khi objective mode là distance/time.
- ETA/“Thời gian ước tính theo ùn tắc” chỉ lấy từ
  `cost_breakdown.congestion_adjusted_time_s` hoặc `total_cost` khi mode=`time`.
- Runtime luôn là ms.
- Không gắn “s” vào distance cost hoặc epsilon distance.
- Không hiển thị cùng một số như vừa “thời gian ước tính/chi phí cân bằng” vừa “runtime”.
- Mọi compare row dùng cùng presentation precision.

### 14.2. Label đề xuất

| Dữ liệu | Nhãn |
|---|---|
| `total_cost` | “Chi phí mục tiêu” + mode badge |
| `total_distance_m` | “Quãng đường” |
| `cost_breakdown.congestion_adjusted_time_s` | “Thời gian ước tính theo ùn tắc” |
| `total_time_s` | “Chi phí cân bằng” hoặc “Chi phí cân bằng quy đổi”; không dùng chữ ETA/di chuyển |
| route `runtime_ms` | “Runtime tìm đường” |
| `matrix_runtime_ms` | “Dựng ma trận” |
| `optimizer_runtime_ms` | “Tối ưu thứ tự” |
| `total_runtime_ms` | “Tổng xử lý backend” |
| `nodes_expanded` | “Node đã mở rộng” |
| `max_frontier` | “Frontier lớn nhất (union)” |

### 14.3. Ranking

- Rank objective theo min.
- Distance/time chỉ rank phụ nếu không phải objective; UI phải ghi rõ.
- Runtime rank có thể highlight nhưng không kết luận algorithm tốt hơn tổng thể.
- Tie dùng raw value và tolerance §14.4, không dùng số đã format.
- Không rank null/error/no-path.

### 14.4. Tolerance, signed trade-off, optimality gap và savings

Implementation lấy **duy nhất** constant/formula/zero-denominator policy từ
`docs/SCHEMA.md` §F.1:

~~~text
absTolerance = 1e-6       // m hoặc s theo active mode
relTolerance = 1e-9
equivalent(a,b) = abs(a-b) <= max(absTolerance,
                                  relTolerance*max(abs(a),abs(b)))
~~~

- `reference_minus_selected_cost = reference - selected`: signed trade-off;
  âm = reference tốt hơn, dương = reference kém hơn.
- `optimality_gap = selected - exact`: chỉ có exact reference cùng snapshot,
  mode và open/closed topology; không âm ngoài tolerance.
- `savings_pct = (original - optimized)/original*100`: baseline trước/sau của
  cùng method/input topology, không phải optimality gap.
- Mẫu số equivalent 0 xử lý đúng §F.1; không chia 0, không biến `null` thành 0.
- Relation/rank dùng raw cost; rounding chỉ presentation. Tolerance này không
  thay `TOLERANCE=1e-12` trong local-search algorithm.

---

## 15. Responsive, keyboard và accessibility

### 15.1. Breakpoint contract

Giữ định hướng hiện có:

- `>=1280`: panel trái + workspace + drawer phải.
- `960–1279`: panel trái cố định, result drawer dạng overlay.
- `<960`: mobile app bar và sheets.

Comparison workspace phải dùng available container width, đặc biệt khi panel trái đóng/mở và drawer phải overlay.

### 15.2. Reflow

Kiểm tra:

- 1366×768.
- 1024×768.
- 390×844.
- 320×568 hoặc 320 CSS px.
- 200% zoom.

Yêu cầu:

- Không có horizontal scroll ở page.
- Map/table có thể có scroll region riêng được đặt tên.
- Text/control reflow.
- Sticky CTA/header/timeline không che focused element.
- Card error dài không làm hỏng grid.
- N=2, 3, 4 đều hợp lệ.

### 15.3. Keyboard

- Radio group dùng Arrow keys/Space đúng semantics.
- Checkbox compare dùng Space.
- Tab/Shift+Tab đi theo thứ tự trực quan.
- Escape đóng sheet/overlay đúng scope.
- Disclosure panel trả focus đúng.
- Nút “Xem chi tiết”, “Retry”, “Cancel” có accessible name kèm algorithm/method.
- Stop reorder dùng các button `Lên`/`Xuống`; carousel dùng `Trước`/`Sau`;
  keyboard không phải mô phỏng drag hoặc swipe.
- Không tự chuyển focus khi một card hoàn tất; status được announce qua live region mức polite.

### 15.4. Màu và motion

- Không dùng màu là dấu hiệu duy nhất.
- Forward/backward, winner/error và active side đều có text/icon/shape.
- Tôn trọng `prefers-reduced-motion`:
  - tắt route-flow;
  - không autoplay timeline;
  - collapse gần như tức thời;
  - final path vẫn đọc được.

### 15.5. Touch target và screen reader

- Mọi pointer target đạt ít nhất **24×24 CSS px** hoặc thỏa đúng spacing exception
  của WCAG 2.2 SC 2.5.8; target chính trên mobile hướng tới 40–44 px. Không dùng
  icon 16 px đứng một mình làm hit area 16 px.
- Caption/header của hai bảng bidi đầy đủ.
- Comparison progress và per-card error được announce nhưng không spam.
- Reorder chỉ announce sau thao tác button/keyboard đã hoàn tất; carousel announce
  pane mới một lần. Async completion không cướp focus.
- Mobile sheet giữ focus trap hiện hành.

---

## 16. Kế hoạch thay đổi contract/backend

### 16.1. `docs/SCHEMA.md` — sửa đầu tiên

Ghi:

- Nested `TraceStep.bidirectional_frontiers` và toàn bộ invariant ở mục 7.
- Compatibility với `frontier`/`g`/`side` cũ.
- `MultirouteResponse.return_to_start`.
- `original_order` và `original_order_legs`.
- `computation_metrics` và units/semantics.
- `PathCostBreakdown` cho route, optimized/baseline legs và totals; label
  `total_time_s` legacy là balanced cost.
- Raw comparison tolerance, signed reference trade-off, exact gap, savings và
  zero-denominator policy duy nhất.
- found=false shape.
- Order không lặp Start cuối; closing leg nằm trong legs.
- Trace on/off không thay result semantics.
- Explanation v2 additive:
  - verdict tách outcome, solution quality, reachability và termination reason;
  - objective/cost breakdown đúng ba mode;
  - factors có edge/node provenance;
  - post-hoc reference routes có `total_cost` và provenance;
  - ordered multi giữ explanation từng leg;
  - ATSP failure/method/matrix evidence.
- `TraceStep.decision` cho cả chín search algorithms; field chuyên biệt cho IDDFS, IDA*, Beam và Bidirectional Dijkstra.
- IDDFS `failure/cutoff`, Beam `ever_pruned`, IDA* exhaustive/round-cap mapping;
  iteration/layer 1-based và Bidi μ before/after.
- Full-run `AtspMethodStats`, gồm SA equal moves, sample standard deviation và
  identities count.
- `contract_version`, mixed-version matrix và backend-first rollback contract.
- Quy tắc compatibility: producer mới sinh facts có cấu trúc; prose/field cũ chỉ là fallback/export trong giai đoạn chuyển tiếp.

Gate: chưa review schema thì không sửa model/code.

### 16.2. `backend/app/models.py`

- Thêm Pydantic models cho two-side frontier.
- Cross-field validation:
  - nếu payload có mặt, key sets khớp node lists;
  - finite/nonnegative g và runtime;
  - union field khớp;
  - thuật toán khác không được mang payload bidi.
- Mở rộng `MultirouteResponse` additive.
- Thêm strict models/enums cho Explanation v2, cost breakdown, factors, reference routes, termination, trace decision, ATSP failure và method stats.
- Validator kiểm objective-unit mapping, signed trade-off/gap/savings/relation,
  zero denominator, finite values, breakdown identities, stats count identities
  và các field bắt buộc theo decision/termination rule.
- Không đổi request defaults hay field cũ.

Nếu model không biết algorithm ở level step để validate “bidi-only”, đặt validator ở Trace model nơi có algorithm; không tạo validator giả thiếu context. Trong rollout additive này, model cho phép một bidi trace legacy thiếu field mới, nhưng test producer bắt buộc `search_advanced.py` luôn sinh field cho trace mới. Có thể siết thành required ở một schema version sau, không làm trong phạm vi hiện tại.

### 16.3. `backend/app/search.py` và `backend/app/search_advanced.py`

- Khi recorder active, snapshot `open_f`, `open_b`, `g_f`, `g_b` sau expansion.
- Sort deterministic.
- Round theo helper hiện có.
- Serialize finite μ hoặc null.
- Giữ union/min legacy.
- Ghi `TraceStep.decision` từ state thật tại thời điểm chọn/expand, không tái dựng hậu nghiệm.
- Ghi selected score trước relaxation, effective frontier sizes, generated/updated/pruned counts và bound/round/layer khi thuật toán có khái niệm đó.
- Ghi typed termination để phân biệt proven unreachable với inconclusive do cap/pruning.
- Chỉ thu thập step payload khi recorder active; full-run metrics và kết quả không phụ thuộc trace cap.
- Không đổi choice side, stop rule, path reconstruction, tie-break hoặc metrics.

### 16.4. `backend/app/tsp.py`

- Đo matrix runtime quanh `build_matrix`.
- Cho `_ucs_to_targets`/`build_matrix` trả hoặc accumulate nodes expanded mà không đổi path/cost semantics.
- Đo optimizer runtime chỉ quanh method solver.
- Đo total facade runtime.
- Dựng baseline legs từ path matrix đã có; không chạy search lần nữa.
- Echo return flag.
- Giữ directed pair trong `UnreachableStopError` và serialize typed `matrix_incomplete` failure; optimizer không được chạy nếu matrix chưa đủ.
- Ghi method-specific full-run stats cho Held–Karp, NN + local search và SA; không suy từ sampled events.
- Ghi matrix summary/asymmetry evidence deterministic để Explain chứng minh directed cost.
- Aggregate ATSP path/leg cost breakdown từ cùng helper backend, không duplicate công thức.
- Không đổi seed SA: 0–4.
- Không dùng NetworkX.
- Không thêm cache toàn cục.

### 16.5. `backend/app/main.py`

Endpoint không cần đổi route nếu response model tự serialize field mới. Chỉ sửa nếu facade mapping hiện bỏ field hoặc chưa truyền đủ immutable request/data context cho Explanation v2. Giữ status/error behavior hiện tại; response mới phải tự mô tả graph/view/mode/slot/scenario/open-closed cần thiết cho subject strip.

### 16.6. Fixtures/generated artifacts

Các file `data/mock/trace_bidijkstra_mock.json` và `data/mock/multiroute_mock.json` có thể chịu ảnh hưởng. Xác định nguồn sinh trong `scripts/00_generate_mock.py`:

- Sửa generator/source trước.
- Không hand-edit generated fixture nếu generator là nguồn thật.
- Chỉ chạy generator mock nếu nó không đụng graph/result/benchmark ngoài phạm vi; kiểm tra diff chính xác sau chạy.
- Không chạy data pipeline, benchmark hoặc teaching generator.

### 16.7. Mixed-version compatibility, rollout và rollback

Tên phiên bản trong bảng: `B1/F1` là backend/frontend hiện hành trước phase;
`B2/F2` là producer/reader theo `docs/SCHEMA.md` §F. `contract_version` vắng mặt
nghĩa là response v1; version 2 chỉ hợp lệ khi đủ field bắt buộc cho variant.

| Frontend | Backend | Hành vi bắt buộc |
|---|---|---|
| F1 | B1 | Không đổi hành vi hiện hành |
| F1 | B2 | Hoạt động nguyên trạng; bỏ qua additive fields; legacy field/path/cost không đổi |
| F2 | B1 | Dual-read: bidi union có compatibility label; Explain dùng legacy conservative fallback; ẩn baseline breakdown/computation/method stats thiếu; open/closed đọc immutable request snapshot, không suy từ legs |
| F2 | B2 | Full v2; vẫn validate nested capability, fingerprint và cross-field invariant |

Hard rules:

- Response thiếu/mismatch server scenario fingerprint không được xếp hạng hoặc
  gắn vào session. Compatibility không cho phép frontend tự hash để “cứu” result.
- Field thiếu hiển thị “Backend hiện tại chưa cung cấp”, không `0`, empty array
  hay claim suy đoán. Legacy bidi không tách hai bảng giả; legacy termination
  không được nâng no-path thành proven unreachable.
- F2 không gửi một request-only field mới mà B1 không hiểu trong rollout này;
  các thay đổi §F chủ yếu additive response/trace. Capability check theo field
  bắt buộc của feature, không chỉ tin global version nếu payload malformed.
- Không trộn B1 và B2 results trong cùng comparison session. Nếu capability hoặc
  fingerprint đổi giữa run, cancel phần còn lại và tạo session mới.

Rollout backend-first:

1. Schema/models/producer/backend tests; phát B2 nhưng giữ toàn bộ legacy fields.
2. Contract test `F1-shaped reader ← B2 response`, parity path/cost/seed/trace-off.
3. Deploy F2 dual-read; browser QA cả B1 fixtures lẫn B2 runtime.
4. Chỉ xóa fallback/scalar A-B trong decision/version riêng sau phase, không trong
   PR producer đầu tiên.

Rollback:

- F2 → F1: an toàn vì B2 giữ fields cũ.
- B2 → B1 khi F2 đang chạy: chỉ các fallback trong matrix được giữ; feature v2
  degrade/ẩn, không fabricate. Clear in-memory sessions tạo từ B2.
- Không có persistent DB/schema, migration hoặc backfill; không rollback/rebuild
  graph, data hay benchmark.

Gate deploy: cả bốn ô matrix có automated fixture/contract test; rollback được
diễn tập ở local/staging bằng đổi producer fixture, không cần deploy thật.

---

## 17. Kế hoạch thay đổi frontend core

### 17.1. `frontend/lib/types.ts`

- Mirror contract mới.
- Thêm problem/strategy/run types.
- Thêm comparison session/result types.
- Phân biệt route result và ATSP result bằng discriminated union.
- Mirror Explanation v2, termination/decision, ATSP failure/method/matrix evidence và legacy fallback bằng discriminated unions.
- Mirror `contract_version: 2`, `PathCostBreakdown`, signed/gap fields và
  `AtspMethodStats`; v1/v2 là union rõ, không biến mọi v2 field thành optional.
- Thêm `NormalizedScenarioConfig`, `RunSnapshot` và timeline metadata đúng §4/§9.5.
- Không dùng optional field quá rộng để che thiếu dữ liệu của backend mới.

### 17.2. `frontend/lib/api.ts`

- Parse response field mới.
- Cho call nhận `AbortSignal`.
- Không swallow abort và HTTP errors vào cùng một message.
- Preserve `found=false` như response hợp lệ.
- Có type guards cho v1/v2/result variants; `contract_version=2` thiếu required
  nested field trả contract error, không silently downgrade thành v1.

### 17.3. `frontend/lib/store.ts`

Refactor có kiểm soát:

- Thêm explicit `problemMode`, `multiStrategy`, `runKind`.
- Thêm draft state và `returnToStart`.
- Thêm route/ATSP comparison sessions.
- Thêm view-only `explanationSubject` và `explanationOverlay`, bind bằng immutable run/session/result ID.
- Thêm `controlsOpen` nếu layout state tiếp tục ở store; nếu chỉ page-local thì không đưa vào data invalidation.
- Tách helper “run one route journey” có thể dùng cho single và compare.
- Tách helper “run one ATSP method”.
- Thêm run ID, abort, stale guard và progress.
- Thiết lập/check server fingerprint write-once ở từng response/leg; retry không
  đọc lại live scenario hoặc reset fingerprint.
- Xóa logic promote Goal thành stop sau khi UI mới đã chuyển hoàn toàn.
- Migrate khỏi scalar `compareAlgo`/`compare`; không giữ hai nguồn chân lý lâu dài.
- Clear explanation subject/overlay atomically khi owning run bị invalidate; không fallback im lặng từ result B sang A.

Store không nên chứa JSX/copy. Validation/ranking/snapshot equality đặt trong pure policy modules.

### 17.4. `frontend/lib/sequential-route.ts`

- Hàm waypoint nhận `returnToStart`.
- Cho phép Start lặp đúng một lần ở cuối policy-created sequence.
- Merge closing leg đúng path/totals.
- Ghi leg index/label để báo lỗi cụ thể.
- Giữ explanation, termination, solution quality và reachability của từng leg; không thay tất cả bằng một summary thủ tục.
- Thêm đúng sampler `per-leg-boundary-proportional-v1` và metadata tách source
  truncation/presentation sampling; không tự chọn stride khác.
- Giữ scenario consistency check.

### 17.5. Policy modules

Giữ hoặc mở rộng:

- `frontend/lib/interaction-policy.ts`: action hợp lệ theo active mode.
- `frontend/lib/algorithm-policy.ts`: params/eligibility theo algorithm.
- `frontend/lib/atsp-trace-policy.ts`: return flag là input invalidating trace.
- `frontend/lib/metric-presentation.ts`: units/labels.
- `frontend/lib/explanation-policy.ts`: structured facts → verdict/factors/references/copy; exhaustive enum mapping và legacy fallback.
- `frontend/lib/search-step-explanation.ts`: typed decision/event → narrative từng bước; thiếu field thì dùng fallback bảo thủ, không đoán.
- `frontend/lib/comparison-insights.ts`: insight chỉ khi fingerprint đồng nhất; exact-disagreement thành integrity warning.

Đề xuất mới:

- `frontend/lib/journey-mode-policy.ts`:
  - transition mode;
  - active inputs;
  - draft retention;
  - waypoint construction.
- `frontend/lib/comparison-policy.ts`:
  - min/max/unique;
  - immutable snapshot/equality;
  - item status aggregation;
  - ranking/ties;
  - card ordering;
  - eligibility.
- `frontend/lib/trace-animation.ts`:
  - pure derive animation state từ trace + step;
  - cho primary map và bidi layers dùng chung mà không đọc store.

Không thêm abstraction nếu code hiện có đã có helper tương đương; tên file cuối cùng có thể theo convention nhưng trách nhiệm phải tách rõ và test được.

---

## 18. Kế hoạch thay đổi component

### 18.1. Panel và page layout

| File | Thay đổi |
|---|---|
| `frontend/components/control-panel.tsx` | IA mới, mode/strategy/run controls, compare selection, desktop collapse |
| `frontend/components/atsp/atsp-setup.tsx` | Chỉ render trong multi/ATSP, return control, single/compare methods, eligibility |
| `frontend/app/page.tsx` | Bố cục open/collapsed, primary map hoặc comparison workspace, focus refs |
| `frontend/components/drawer/drawer.tsx` | Điều phối detail của focused result; không sở hữu setup compare |

Khuyến nghị: lựa chọn algorithms/methods và CTA nằm ở panel trái; drawer phải là kết quả/chi tiết, tránh việc setup bị chia hai nơi.

### 18.2. ATSP result

| File | Thay đổi |
|---|---|
| `frontend/components/atsp/atsp-result.tsx` | Open/closed copy, outcome/effort sections, per-leg table, SA details |
| `frontend/components/explanation/atsp-explanation.tsx` | Copy return-aware theo immutable run snapshot, không hard-code kết thúc ở stop cuối |
| `frontend/components/atsp/atsp-compare.tsx` | Giữ vai trò baseline-vs-one-method trong single result; không giả làm cross-method compare |
| Mới: `frontend/components/atsp/atsp-method-compare.tsx` | Bảng/panes so sánh 2–3 methods |

### 18.3. Search trace/metrics

| File | Thay đổi |
|---|---|
| `frontend/components/ghf-table.tsx` | Branch chính xác sang two-side table khi có bidi payload |
| Mới: `frontend/components/bidirectional-frontier-tables.tsx` | Hai card/bảng, overlap, μ/meeting, compatibility fallback |
| `frontend/components/drawer/metrics-tab.tsx` | Nhãn max frontier union, result kind aware |
| `frontend/components/legend.tsx` | Frontier forward/backward và non-color cue |
| `frontend/lib/use-animation.ts` | Wrapper quanh pure trace derivation |

### 18.4. Comparison

Đề xuất:

- `frontend/components/comparison/comparison-workspace.tsx`
- `frontend/components/comparison/comparison-map-grid.tsx`
- `frontend/components/comparison/comparison-map-pane.tsx`
- `frontend/components/comparison/route-comparison-table.tsx`
- `frontend/components/comparison/comparison-status.tsx` nếu status UI lặp lại đủ nhiều.

`frontend/components/drawer/compare-tab.tsx`:

- bỏ setup scalar “Thuật toán B” sau migration;
- có thể trở thành detail/summary view của comparison session;
- không gọi request từ cả drawer lẫn panel.

### 18.5. Map

`frontend/components/map-view.tsx` nên được refactor theo hai bước:

1. Extract pure layer/geometry builders và prop-driven canvas nhưng giữ primary behavior parity.
2. Sau khi parity test/browser pass, dùng canvas đó trong comparison panes.

Không vừa thay interaction chính vừa đưa vào N-map grid trong một patch duy nhất. Điều này làm blast radius quá lớn và khó phân biệt regression.

### 18.6. Giải thích

`frontend/components/drawer/explain-tab.tsx` trở thành router mỏng theo `ExplanationSubject`. Tách các section theo trách nhiệm:

- result context + verdict;
- bước/mốc đang xem;
- cost breakdown + factor list;
- route references;
- algorithm/method guide;
- ordered multi per-leg explanation;
- loading/error/no-path/trivial states.

`frontend/components/explanation/atsp-explanation.tsx` phải dùng facts của lần chạy, open/closed và method stats; narrative optimization event được tái dùng trong “Bước đang xem”. `frontend/components/map-view.tsx` nhận overlay tham chiếu/factor/leg qua props với pattern/legend/textual equivalent. Chi tiết file và contract nằm ở mục 30.

---

## 19. Lộ trình triển khai theo phase và gate

### Phase 0 — Preflight và khóa thiết kế

Trạng thái: **HOÀN TẤT 2026-08-09**. Bằng chứng và readiness verdict:
`docs/UI-V2-PHASE0-READINESS.md`. Trạng thái này chỉ mở gate cho Phase 1,
không tuyên bố runtime v2 đã có.

Việc làm:

- `git status --short`; ghi nhận và bảo vệ mọi thay đổi người dùng.
- Đọc lại file bắt buộc theo `AGENTS.md`.
- Cập nhật `docs/SCHEMA.md` và `docs/DESIGN.md`.
- Chốt naming chính xác của field/state.
- Chốt route cap=4, ATSP cap=3, comparison final-only.
- Lập test fixtures directed nhỏ cho bidi overlap và closed tour.
- Thực hiện truthfulness corrections tối thiểu cho Explain và khóa
  vocabulary/IA/Explanation v2 trong `docs/SCHEMA.md` + `docs/DESIGN.md`.
- Khóa numeric tolerance/signed trade-off/gap/savings, termination detection, timeline
  sampler, method-stat counters và mixed-version matrix trước khi code.

Gate hoàn tất:

- Schema review xong.
- Design states/responsive/error matrix được ghi.
- Không còn copy “đã xét/bị loại”, live traffic hoặc `total_time_s` như ETA/thời gian lái xe.
- Không còn hai tên cạnh tranh cho cùng field.

### Phase 1 — Backend contract và số liệu

Việc làm:

- Models mới.
- Bidi recorder payload.
- Return echo.
- Baseline order/legs.
- Computation metrics.
- Explanation v2 facts, path breakdown, typed reference provenance và termination.
- Trace decision foundations cho chín algorithms.
- Typed ATSP matrix failure, method stats và matrix/asymmetry evidence.
- Backend unit/API tests.
- Mock generator/fixtures nếu bị ảnh hưởng.

Gate hoàn tất:

- Legacy union/min tests vẫn pass.
- Bidi two-side invariant pass.
- Open/closed ATSP tests cho cả 3 methods pass.
- Schema/model/API serialize đồng nhất.
- Time-mode reference relation dùng `total_cost` đúng mode; fixture chứng minh không dựa vào `total_time_s`.
- Trace off không tạo decision payload nhưng vẫn giữ verdict/full-run stats.
- Không thay route/ATSP cost/path so với trước khi trace off.

### Phase 2 — Frontend types, policies và state

Việc làm:

- Types mới.
- Explicit state machine.
- Draft retention.
- Return policy cho ordered/ATSP.
- Generic comparison model.
- Run ID/abort/stale guard.
- Typed normalized scenario trong immutable request snapshot và server fingerprint
  write-once ở session/result envelope.
- Explanation subject/overlay lifecycle và pure structured view-model.
- Deterministic step/event presenters, comparison insights và legacy-safe fallback.
- Pure tests trước component.

Gate hoàn tất:

- Typecheck pass.
- Policy tests cover mọi transition.
- UI cũ hoặc transitional adapter vẫn compile.
- Không còn chỗ business-critical suy luận mode từ `stops.length`.
- Không còn parse `summary_vi`/regex làm nguồn hierarchy hoặc numeric truth của UI mới.

### Phase 3 — Panel IA, single run và collapse

Việc làm:

- Mode/strategy/run controls.
- Active draft rendering.
- Return switch.
- CTA copy/disabled reasons.
- Desktop collapse/focus/resize.
- Single two-point, ordered multi và ATSP flow.
- Explain single flow: context, verdict, step, breakdown, factors, references và per-leg/ATSP basic states.

Gate hoàn tất:

- Ba single-run flow hoạt động.
- Switch mode giữ draft nhưng clear result.
- Open/closed đúng request/result/map.
- Collapse không invalidation.
- Browser QA desktop/tablet/mobile cơ bản pass.
- First viewport của Explain cho biết đúng subject, objective và guarantee/limitation.

### Phase 4 — Bidirectional presentation

Việc làm:

- Hai bảng.
- Map layers/legend.
- μ/meeting.
- Backend-old compatibility fallback.
- Bidi current-step explanation dùng đúng two-side/top-key/side/μ evidence.

Gate hoàn tất:

- Overlap node xuất hiện hai bảng với hai g.
- Active side đúng từng step.
- Units đúng.
- Bidi trace cap không làm metrics sai.

### Phase 5 — Map extraction parity

Trạng thái: **HOÀN TẤT / READY 2026-08-10**. Evidence:
`docs/UI-V2-PHASE5-READINESS.md`.

Việc làm:

- Extract geometry/layers/canvas.
- Giữ primary wrapper.
- Memoization.
- Prop-driven final route.
- Browser visual/interaction parity.

Gate hoàn tất:

- Primary selection/edit/timeline không regression.
- Console không lỗi.
- Camera/route layers như trước.
- Geometry API sẵn sàng cho view-only reference/factor/leg overlays mà không thay computation state.
- Chưa bật N maps nếu parity chưa pass.

### Phase 6 — Route comparison 2–4

Trạng thái: **READY 2026-08-10**. Evidence:
`docs/UI-V2-PHASE6-READINESS.md`. Code/test/typecheck đã đạt; người dùng xác nhận
manual browser QA cho 2/3/4 pane, camera độc lập, thêm/bỏ thuật toán, compare
read-only, bảng so sánh và resize panel đã pass. Known issue IDA* ε cũ đã được
sửa ở backend và có regression; không còn là cảnh báo hiện hành của Phase 6.

Việc làm:

- Selector.
- Sequential orchestrator.
- Per-card status/error/retry/cancel.
- Summary table.
- N map panes.
- Camera độc lập cho từng pane.
- Ordered multi comparison.
- Mỗi result pane mở đúng explanation subject; route cross-result insights có integrity guard.

Gate hoàn tất:

- N selected = N panes trong mọi status.
- Same snapshot/fingerprint.
- Partial failure.
- Stale response bị discard.
- Failure B không bao giờ hiển thị explanation của A.
- 2/3/4 pane responsive pass.

### Phase 7 — ATSP metrics và comparison 2–3

Trạng thái: **READY (2026-08-11)**. Code/tests/automated gates và Chrome Desktop
QA đã đạt cho N=2/N=3, camera độc lập, partial/cancel/retry/stale guard; evidence
nằm tại `docs/UI-V2-PHASE7-READINESS.md`.

Việc làm:

- Outcome/effort redesign.
- Baseline legs.
- SA detail.
- Cross-method orchestrator/table/maps.
- Exact gap policy.
- Held–Karp eligibility.
- ATSP run-specific explanation: matrix → optimizer → legs, method stats, changed arcs, event milestone và return-aware copy.
- Per-result ATSP explanation + cross-method insights; savings không bị gọi là optimality gap.

Gate hoàn tất:

- 2/3 methods cùng snapshot.
- Return semantics đồng nhất.
- Baseline không thành map giả.
- Không so event count sai nghĩa.
- Matrix incomplete chỉ rõ directed pair và không khuyên đổi optimizer.
- Partial failure và retry pass.

### Phase 8 — Hardening

Trạng thái: **READY WITH KNOWN ISSUES — DESKTOP QA PASSED (2026-08-11)**.
Evidence code/test/runtime nằm tại `docs/UI-V2-PHASE8-READINESS.md`; lượt audit
cuối chỉ chấm Chrome Desktop maximized, không dùng mobile/tablet/narrow viewport
làm gate. NVDA/FPS/heap và preflight máy demo cuối được giữ thành caveat riêng.

Việc làm:

- Full automated checks.
- Browser matrix.
- Keyboard/screen reader/reduced motion.
- GPU/memory/performance.
- Explanation overlay, semantic headings, reflow 320px, status/live-region policy, NVDA smoke và autoplay/reduced-motion QA.
- Offline/basemap/backend errors.
- Remove scalar A/B dead path.
- Update final docs/codebase map nếu cần.
- Review final diff.

Gate hoàn tất:

- Definition of Done ở mục 25 đạt toàn bộ.
- Không có debug output/TODO-only behavior.
- Không có source-of-truth compare cũ còn hoạt động song song.
- Toàn bộ acceptance §24 và Definition of Done §25 đạt; test case chuyên biệt ở
  mục 30 không tạo một bộ tiêu chí cạnh tranh.

---

## 20. Test plan backend

### 20.1. Bidirectional Dijkstra

Tạo directed graph nhỏ có:

- node chỉ trong frontier forward;
- node chỉ trong frontier backward;
- node nằm cả hai;
- g forward và g backward khác nhau;
- tie determinism.

Assert:

- lists và g maps mỗi phía;
- sort order deterministic;
- overlap giữ hai giá trị;
- legacy union đúng;
- legacy min-g đúng;
- `side` đúng;
- μ/meeting null rồi finite;
- field mới chỉ có cho bidi;
- trace cap 5.000 không đổi found/path/full metrics;
- `include_trace=false` không có step payload.
- Decision top/μ before và nested frontier/μ after không bị lệch một bước.

### 20.2. Multiroute

Với cả Held–Karp, NN + cải thiện và SA:

- return false;
- return true;
- exact number/order of legs;
- closing leg đúng một lần;
- optimized totals bằng tổng legs;
- original totals bằng tổng baseline legs;
- savings dùng cùng topology open/closed;
- directed/asymmetric path được tôn trọng;
- order không lặp Start;
- return echo;
- runtime finite/nonnegative;
- matrix search run count;
- nodes expanded aggregation;
- trace on/off không đổi order/legs/totals/SA deterministic stats.
- 15 stops: open đúng 15 legs, closed đúng 16 legs; ordered route comparison cap
  tương ứng 60/64 route calls.
- cost breakdown từng leg/totals/baseline đúng identity cả ba mode.
- method stats counter definitions/identities; SA có improving/equal/worse/rejected,
  sample standard deviation và best-seed tie-break.

### 20.3. found=false và validation

- unknown node;
- duplicate Start/stop;
- duplicate stops;
- k vượt giới hạn;
- unreachable ordered pair;
- found=false response shape;
- computation metrics behavior;
- request default false và explicit true/false;
- API/OpenAPI serialization.

### 20.4. Explanation, termination và decision facts

- Cả chín route algorithms: found, trivial, proven unreachable và mọi inconclusive cap/pruning liên quan.
- IDDFS: final `failure` khác `cutoff` trên unreachable nông, goal sâu hơn cap và
  graph có cycle. Beam: exhausted chưa prune khác exhausted sau pool>k pruning.
  IDA*: exhaustive/no-next-threshold khác round cap hữu hạn.
- `TraceStep.decision` đúng selection rule, selected score trước relaxation, bound/round/layer/side và counters.
- Ba cost modes: breakdown identity, factor inclusion, signed reference trade-off,
  exact gap và savings; bắt buộc có fixture `time` với
  `total_cost != total_time_s`.
- Reference route có directed path hợp lệ, stable ID, post-hoc provenance và relation đúng raw tolerance; cover positive/negative/equivalent và zero denominator.
- Guaranteed result không được có exact same-objective reference tốt hơn trong tolerance.
- Ordered multi giữ explanation từng leg và attribution leg index.
- ATSP matrix failure giữ đúng directed pair, optimizer chưa chạy; method stats không phụ thuộc trace on/off.
- Producer mới serialize Explanation v2; legacy payload vẫn parse được.
- Compatibility fixtures đủ B1/F1, B2/F1, B1/F2, B2/F2; version 2 thiếu field
  bắt buộc phải fail validation, không silently fallback như payload v1 hợp lệ.

Các case trên là master test plan; mục 30.33 chỉ phân rã thêm fixture trình bày,
không được thay đổi expected semantics.

### 20.5. Non-regression của thuật toán

Trước khi instrument producer, tạo golden tests trên directed fixtures nhỏ, không
dùng `results/` cũ. Sau thay đổi, với cùng request/seed và `include_trace=false`,
assert từng field deterministic không đổi:

- chín route algorithms: `found`, exact `path`, `total_cost`, distance, balanced
  cost, nodes expanded, max frontier, guarantee/epsilon/beam width;
- ba ATSP methods, open/closed: order, paths từng leg, totals, savings, guarantee;
- SA: per-seed order/best/final costs và best seed.

Loại khỏi equality: runtime, new additive facts/counters và trace payload. Chạy
trace on/off parity để chứng minh recorder/stats không đổi result; method-stat
instrumentation không được thêm/reorder RNG call. Exact UCS/A*/Bidijkstra success
trên cùng snapshot phải equivalent theo §14.4; khác ngoài tolerance là test failure,
không “sửa” bằng UI rounding. Không đưa NetworkX vào product execution.

### 20.6. Files test dự kiến

- `backend/tests/test_schema.py`
- `backend/tests/test_search.py`
- `backend/tests/test_search_advanced.py`
- `backend/tests/test_tsp.py`
- `backend/tests/test_api.py`
- `backend/tests/test_optimization_trace.py` nếu trace model thay đổi ảnh hưởng recorder.

---

## 21. Test plan frontend

### 21.1. Pure policy tests

Giữ Node test runner hiện tại nếu đủ; ưu tiên đưa logic vào pure modules.

Mode/draft:

- default two-point.
- chuyển mode giữ Goal/Stops draft.
- active input đúng.
- không auto-promote Goal.
- đổi mode/strategy clear result nhưng không clear draft.

Return:

- default false.
- open waypoints `[A,B,C]`.
- closed waypoints `[A,B,C,A]`.
- không double-append Start.
- Start cuối không thành stop.
- ATSP request flag đúng.
- invalidation đúng.

Comparison:

- route min 2/max 4/unique/stable order.
- ATSP min 2/max 3/unique.
- Held–Karp eligibility theo k.
- N selected tạo N run slots.
- snapshot deep copy/equality.
- partial failure aggregation.
- retry failed-only.
- cancelled status.
- stale run ID rejection.
- fingerprint mismatch.
- first valid response thiết lập fingerprint write-once; retry không reset; missing
  fingerprint/capability change cancel phần session còn lại.
- ranking/tie/null/error/no-path.

Bidi presentation:

- split sets.
- overlap ở cả hai.
- fallback union khi thiếu payload.
- g backward label/format.
- μ mode-specific units.

Metrics:

- distance/time/balanced units.
- congestion-adjusted time và balanced cost đều khác runtime.
- savings âm/0/dương.
- exact gap chỉ khi có exact reference.
- SA stats labels.

Sequential trace:

- closing leg merge.
- failed closing leg copy.
- global cap deterministic.
- boundary/final step preservation.
- proportional quota, largest-remainder tie theo leg index và interior-index formula.
- phân biệt last-recorded với final event khi source leg trace truncated.
- max 16 closed legs; metadata sampled/source-truncated độc lập.
- full metrics không đổi.

Explanation:

- subject/verdict theo result kind;
- exact/epsilon/feasible/proven-unreachable/inconclusive mapping;
- cả ba mode và factor context-only;
- reference provenance, signed trade-off/relation, exact gap và legacy fallback;
- signed reference trade-off khác exact gap/savings; raw tolerance và zero denominator;
- current-step presenter cho chín algorithms;
- per-leg ordered multi;
- ATSP open/closed, method stats, event milestones và savings khác gap;
- forbidden copy không xuất hiện.

### 21.2. Store/orchestrator tests

Store hiện là singleton; để test tốt, khuyến nghị:

- factory `createAppStore({ api, notify })`; hoặc
- tách orchestrator nhận dependency injection.

Test:

- request body chính xác.
- algorithms/methods chạy tuần tự.
- status queued → running → terminal.
- progress algorithm/leg.
- một lỗi không dừng item khác.
- abort/discard khi input đổi.
- response cũ không ghi đè.
- retry dùng session snapshot.
- cancel giữ completed items.
- collapse không invalidation.
- single result không bị comparison overwrite.
- subject luôn bind đúng run/session/result.
- failure B không fallback sang A.
- đổi subject/new run/invalidation clear overlay đúng policy.
- overlay là view-only, không rerun hoặc thay computation snapshot.

### 21.3. Component/E2E strategy

Repository hiện chủ yếu có pure Node tests. Không thêm dev dependency chỉ vì quen dùng một stack khác.

Lựa chọn:

1. Nếu cho phép thêm test stack, dùng Vitest + React Testing Library + user-event cho component semantics và Playwright cho E2E.
2. Nếu không thêm dependency, giữ pure tests và thực hiện Playwright/browser manual qua tooling sẵn có; ghi rõ component-level automation còn thiếu.

Không snapshot pixel DeckGL/canvas. Test component ở mức props, number of panes, status và fallback; visual correctness kiểm bằng browser.

Component cases:

- radio/keyboard;
- stop reorder bằng Lên/Xuống, disabled boundary, focus retention và một announcement;
- active control visibility;
- draft restore;
- return switch/copy;
- compare checkbox limits;
- disabled reason;
- collapse/focus;
- two bidi tables;
- N queued/success/error panes;
- carousel Trước/Sau/Arrow/status hoạt động không cần swipe;
- live status;
- Explain semantic headings/list/dl/table;
- timeline manual/autoplay announcement policy;
- reference/factor/leg overlay có accessible toggle và non-color cue;
- 320px/long Vietnamese copy không clip.
- target 24×24 hoặc spacing exception; controls chính mobile đạt 40–44 px theo design.

### 21.4. Files test dự kiến

Giữ/mở rộng:

- `frontend/tests/algorithm-policy.test.mjs`
- `frontend/tests/atsp-trace-policy.test.mjs`
- `frontend/tests/interaction-policy.test.mjs`
- `frontend/tests/sequential-route.test.mjs`
- `frontend/tests/ui-copy.test.mjs`

Thêm:

- `frontend/tests/journey-mode-policy.test.mjs`
- `frontend/tests/comparison-policy.test.mjs`
- `frontend/tests/bidirectional-frontier.test.mjs`
- `frontend/tests/metric-presentation.test.mjs`
- `frontend/tests/explanation-policy.test.mjs`
- `frontend/tests/search-step-explanation.test.mjs`
- `frontend/tests/comparison-insights.test.mjs`
- orchestrator/component/E2E files theo stack được duyệt.

---

## 22. Browser QA matrix

### 22.1. Viewport/layout

| Viewport | Cases bắt buộc |
|---|---|
| 1366×768 | Panel trái mở/đóng; drawer mở/đóng; route N=2/3/4; ATSP N=2/3 |
| 1024×768 | Panel trái; result overlay; grid 1/2 cột; focus return |
| 390×844 | Mobile sheets; N panes một cột/carousel; sticky CTA |
| 320×568 | Reflow, label dài, bảng scroll vùng riêng |
| 200% zoom | Không page horizontal scroll; focus không bị che |

### 22.2. Functional

- Two-point single với các class thuật toán khác nhau.
- Ordered multi open.
- Ordered multi closed.
- Ordered multi comparison 2 và 4 algorithms.
- ATSP single mỗi method.
- ATSP open/closed.
- ATSP comparison 2 và 3 methods.
- Bidi trace nhiều step có overlap.
- found=false.
- closing leg no-path.
- partial HTTP error.
- backend offline.
- basemap offline.
- input đổi khi request đang chạy.
- scenario fingerprint mismatch.
- cancel/retry.

### 22.3. Keyboard/a11y

- Tab/Shift+Tab.
- Arrow keys cho radio.
- Space/Enter.
- Escape sheet/overlay.
- Focus return disclosure.
- NVDA + Chrome smoke test trên Windows:
  - tên group;
  - progress/status;
  - per-card error;
  - table captions;
  - panel expanded state.
- Reduced motion.
- Light/dark và các palette hiện có smoke.

### 22.4. Performance

Trên hardware máy trình chiếu:

- G_demo với 4 route maps.
- G_real với ít nhất 2 maps, sau đó 4 nếu use case cho phép.
- ATSP 3 maps.
- Ba vòng run → clear → run lại.

Mục tiêu đề xuất:

- không WebGL context loss;
- không console error;
- median pan/zoom >=30 FPS;
- interaction p95 <100 ms;
- grid render trong 1 giây sau response cuối;
- không có tăng heap bền vững >10% sau cơ hội GC ở ba vòng tương đương.

Nếu không đạt, ưu tiên renderer nhẹ/final-only/basemap-off có nhãn; không âm thầm giảm số pane so với selection.

---

## 23. Commands kiểm chứng

Chạy từ repository root, trừ khi ghi khác.

Backend:

~~~powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -v
.venv\Scripts\python.exe scripts\validate_data.py
~~~

Frontend:

~~~powershell
Set-Location frontend
npm test
npx tsc --noEmit
~~~

Build chỉ chạy khi:

- mọi Next dev process đã dừng;
- `.next` không đang bị ghi;
- dependencies đã có;
- điều kiện network/font thỏa.

~~~powershell
Set-Location frontend
npm run build
~~~

Không chạy theo mặc định:

- benchmark;
- data rebuild;
- traffic/profile scripts;
- teaching generator.

Sau mỗi phase:

~~~powershell
git diff --check
git status --short
git diff
~~~

Phải phân biệt rõ passed/failed/skipped/not run. Không dùng kết quả test lịch sử như kết quả của implementation mới.

---

## 24. Acceptance criteria chi tiết

### 24.1. Loại bài toán và draft

- [ ] `problemMode` explicit, không suy luận từ stops.
- [ ] Chỉ controls active được render/sent.
- [ ] Chuyển mode giữ inactive draft.
- [ ] Chuyển mode clear result/trace/session.
- [ ] Goal không tự biến thành stop.
- [ ] Start dùng chung và không bị xóa ngoài thao tác người dùng.
- [ ] Request snapshot copy sâu typed normalized scenario và effective params/trace
  flags; không giữ mutable reference hoặc client-generated fingerprint.

### 24.2. Ordered multi

- [ ] Giữ đúng thứ tự stops.
- [ ] Path liên tục qua tất cả legs.
- [ ] Open kết thúc tại stop cuối.
- [ ] Closed có đúng một closing leg.
- [ ] Start cuối không thành delivery marker.
- [ ] Totals/nodes/runtime/max frontier merge đúng semantics.
- [ ] Closing leg failure có message cụ thể.
- [ ] Global timeline cap không đổi full metrics.
- [ ] 15 stops tạo 15 open/16 closed legs; comparison 4 algorithms có đúng
  60/64 calls khi tất cả legs chạy.
- [ ] Sampler đúng quota/largest-remainder/index formula; phân biệt source
  truncation với presentation sampling và không gọi last-recorded là final event.

### 24.3. ATSP single

- [ ] Request gửi đúng method/config/return.
- [ ] Eligibility chặn trước request.
- [ ] Open/closed copy dựa vào response echo.
- [ ] Optimized và baseline legs/totals đúng.
- [ ] Breakdown từng leg/totals/baseline khớp backend identity cả ba mode.
- [ ] Outcome/effort tách rõ.
- [ ] SA stats chỉ hiện phù hợp.
- [ ] Held–Karp/NN/SA method counters đúng định nghĩa full-run; SA equal moves,
  count identity, best-seed tie và sample standard deviation đúng.
- [ ] Savings âm không bị trình bày như cải thiện.

### 24.4. Bidi

- [ ] Backend trả two-side snapshot.
- [ ] Legacy union/min giữ nguyên.
- [ ] Hai bảng khớp payload.
- [ ] Overlap có hai g.
- [ ] g backward được giải thích đúng.
- [ ] Active side, μ, meeting đúng step.
- [ ] Old-backend fallback không suy đoán.
- [ ] Map/legend có non-color cue.

### 24.5. Route comparison

- [ ] Chọn 2–4 unique.
- [ ] N lựa chọn = N panes ở mọi status.
- [ ] Cùng snapshot/fingerprint.
- [ ] Response đầu thiết lập fingerprint write-once; missing/mismatch/capability
  change không vào ranking và không trộn session.
- [ ] include_trace=false.
- [ ] Chạy tuần tự.
- [ ] Partial failure giữ success.
- [ ] found=false không thành HTTP error.
- [ ] Ordered N-point comparison hoạt động.
- [ ] Retry/cancel/stale guard đúng.
- [ ] Pan/zoom/Home của một pane không thay đổi camera pane khác.

### 24.6. ATSP comparison

- [ ] Chọn 2–3 unique.
- [ ] Cùng stops/order/return/scenario.
- [ ] Mỗi method một pane.
- [ ] Baseline không tạo map giả.
- [ ] Held–Karp giới hạn theo k.
- [ ] Exact gap chỉ khi exact success.
- [ ] Không đồng bộ event trace sai semantics.
- [ ] Partial failure/retry/cancel đúng.

### 24.7. Panel collapse

- [ ] Default open desktop.
- [ ] Layout-only, không invalidation.
- [ ] Map/grid resize.
- [ ] Camera giữ nguyên.
- [ ] `aria-expanded`/`aria-controls`/name đúng.
- [ ] Focus return đúng.
- [ ] Mobile sheet không regression.
- [ ] Reduced motion.

### 24.8. Responsive/a11y

- [ ] 1366×768, 1024×768, 390×844, 320px, 200% zoom.
- [ ] Không horizontal page scroll.
- [ ] Keyboard hoàn tất toàn bộ core flows.
- [ ] Focus không bị sticky UI che.
- [ ] Async status được announce.
- [ ] Màu không phải cue duy nhất.
- [ ] Không console error.
- [ ] Không context loss ở cấu hình được hỗ trợ.
- [ ] Stop reorder có Lên/Xuống + focus/status; carousel có Trước/Sau + keyboard,
  không phụ thuộc drag/swipe.
- [ ] Pointer target tối thiểu 24×24 CSS px hoặc spacing exception đúng; control
  chính mobile đạt mục tiêu 40–44 px.

### 24.9. Units/contracts

- [ ] Distance cost không có suffix giây.
- [ ] Runtime là ms.
- [ ] Congestion-adjusted time không bị gọi là runtime; balanced cost không bị gọi
  là ETA/thời gian lái xe.
- [ ] `total_time_s` giữ contract balanced.
- [ ] Trace cap không cắt full-run metrics.
- [ ] Directed/asymmetric semantics giữ nguyên.
- [ ] Raw tolerance, signed trade-off, exact gap, savings và zero denominator đúng
  §14.4; không rank từ display rounding.
- [ ] B1/F1, B2/F1, B1/F2, B2/F2 compatibility fixtures và rollback behavior đạt.

### 24.10. Giải thích

- [ ] Explain header luôn chỉ rõ đúng run/session/result, algorithm/method và immutable data context.
- [ ] First viewport thấy verdict, objective, guarantee/limitation; caveat quan trọng không bị giấu sau prose split.
- [ ] Mọi số liệu/lý do đến từ typed fact đúng mode; `total_time_s` không bị gọi là pure time/ETA.
- [ ] “Tuyến tham chiếu” có post-hoc provenance; không tuyên bố thuật toán đã xét/loại full route nếu trace không chứng minh.
- [ ] Timeline route và ATSP cập nhật đúng “Bước/mốc đang xem”; legacy thiếu decision dùng fallback bảo thủ.
- [ ] Ordered multi giữ explanation từng leg và nói rõ thứ tự điểm đã khóa.
- [ ] No-path tách proven unreachable khỏi inconclusive cap/pruning.
- [ ] IDDFS failure/cutoff, Beam never-pruned/ever-pruned và IDA* exhaustive/cap
  tạo đúng typed termination; không suy từ trace length.
- [ ] ATSP giải thích matrix → optimizer → cached legs, typed directed failure và open/closed đúng response.
- [ ] Comparison mở đúng explanation của pane được bấm; exact disagreement thành integrity warning.
- [ ] Map overlay tham chiếu/factor/leg đúng result, có pattern/label/textual equivalent và không để stale state.
- [ ] Semantic headings/status, keyboard/focus, reduced motion, 320px reflow và screen-reader policy đạt browser QA.
- [ ] Không có claim live traffic; scope graph/view/mode/slot/scenario được nói rõ.

---

## 25. Definition of Done

Chỉ tuyên bố hoàn tất khi:

1. `docs/SCHEMA.md` và `docs/DESIGN.md` khớp implementation.
2. Backend/frontend models không lệch schema.
3. Cả ba single flow và hai comparison flow hoạt động.
4. Tính năng ordered N-point cũ không regression.
5. Return-to-start hoạt động cho ordered và ATSP.
6. Bidi frontier thực sự tách từ backend payload.
7. N selection luôn có N result panes.
8. Partial failure, cancellation, stale response và fingerprint mismatch được xử lý.
9. Full backend tests, data validator, frontend tests, TypeScript check pass; build pass nếu đủ điều kiện chạy.
10. Browser matrix cốt lõi đã kiểm tra bằng runtime thực, không chỉ static audit.
11. Final diff không có debug code, TODO placeholder, format churn, secret hoặc unrelated changes.
12. Scalar compare A/B cũ đã được migrate/xóa, không còn hai nguồn chân lý.
13. Không có benchmark/data/generated teaching artifacts bị viết ngoài phạm vi.
14. Structured Explanation v2 là nguồn chính; prose legacy chỉ còn fallback/export và không quyết định hierarchy hoặc numeric claim.
15. Route, ordered multi, ATSP và comparison đều giải thích đúng subject, objective, provenance, step/event và mức bảo đảm.
16. Tất cả mục §24 đạt, gồm structured Explanation v2, numeric semantics,
    compatibility, reorder/carousel/target size; browser/a11y chỉ được đánh dấu
    pass sau runtime QA thực.
17. Backend-first rollout giữ F1 chạy với B2; F2 dual-read B1/B2; rollback không
    fabricate field hoặc trộn session và không cần data migration/backfill.
18. Golden parity §20.5 chứng minh instrumentation/UI contract không đổi path,
    cost, expanded/frontier metrics, ATSP order/legs hoặc SA deterministic result;
    chỉ runtime/trace/additive facts được phép khác.

---

## 26. Rủi ro, mitigation và rollback

| Rủi ro | Mức | Mitigation | Rollback/fallback |
|---|---:|---|---|
| Tách bidi sai do frontend suy đoán | Cao | Schema/backend additive + invariant tests | Fallback bảng union có nhãn |
| N map làm mất context WebGL | Cao | Cap 4/3, final-only, unmount primary, shared geometry, GPU QA | Renderer nhẹ/basemap-off, vẫn giữ N panes |
| Stale response trộn cấu hình | Cao | Immutable snapshot + runId + abort + fingerprint | Discard response, yêu cầu rerun |
| Repeated ATSP matrix chậm | Trung bình | Sequential progress + runtime split + profiling | Batch additive chỉ sau gate |
| Compare runtime không công bằng do concurrency | Trung bình | Chạy tuần tự, trace off | Không xếp hạng runtime nếu môi trường bất ổn |
| Mode migration làm mất Goal/Stops | Trung bình | Draft riêng, pure transition tests | Transitional adapter; không xóa user input |
| Return flag hiển thị sai | Cao | Response echo + snapshot + contract tests | Không infer từ leg count |
| Global merged trace quá lớn | Trung bình | Presentation cap deterministic | Final-only hoặc trace theo leg |
| Component map refactor gây regression | Cao | Extract theo phase, primary parity gate | Giữ wrapper cũ cho single |
| Hai compare state cùng tồn tại | Trung bình | Migrate trong cùng phase, xóa scalar path | Feature branch/local rollback patch |
| Explanation nói sai objective do dùng `total_time_s` | Cao | Typed objective/breakdown/signed trade-off + exact gap + mode fixtures | Truthfulness correction ẩn claim thiếu dữ liệu; legacy summary chỉ fallback |
| “Tuyến thay thế” bị hiểu là search đã xét | Cao | Post-hoc provenance bắt buộc + forbidden-copy tests | Đổi về caption trung tính, không đưa causal claim |
| Explain hiển thị nhầm result trong comparison | Cao | Subject bằng session/result ID + lifecycle tests | Persistent contract alert; không fallback sang A |
| Step explanation làm trace/payload quá lớn | Trung bình | Compact numeric decision, recorder-active only, profile payload | Generic safe step fallback |
| Auto timeline spam screen reader | Trung bình | Pause on open, manual-only/debounced announcements | Không live-announce từng step |

Mọi schema change ở đây là additive để client cũ tiếp tục đọc được field cũ. Không xóa field legacy trong phạm vi này.

---

## 27. Thứ tự pull request/patch khuyến nghị

Nếu chia nhỏ để review:

1. **Explanation truthfulness hotfix**
   - sửa provenance/time/guarantee/open-closed/no-path copy sai; không chờ schema mới để ngăn overclaim.
2. **Contract + backend tests**
   - schema, models, bidi payload, multiroute metrics/baseline, Explanation v2, termination/decision facts.
3. **Frontend policies/state**
   - types, drafts, return, generic sessions, unit tests.
4. **Panel IA + single flows + collapse**
   - chưa bật compare grid.
5. **Bidi tables/map + step explanation**
   - dùng contract mới, có fallback.
6. **Structured Explain single/ordered**
   - context/verdict/step/breakdown/factors/references; per-leg evidence.
7. **Map extraction**
   - behavior parity, không thay product flow.
8. **Route N-way comparison**
   - table trước, maps sau trong cùng PR hoặc hai PR có gate.
9. **ATSP redesign + N-way comparison**
   - method/matrix/event explanation và per-result subject.
10. **Explanation overlays + a11y/performance/docs cleanup**

Mỗi patch phải compile/test độc lập. Không để một commit trung gian làm request contract mới nhưng UI cũ crash khi field có/không có.

---

## 28. Chỉ dẫn ngắn cho Codex triển khai

Khi giao tài liệu này cho một phiên Codex khác, dùng yêu cầu:

> Triển khai `UI_caithien.md` theo Phase 0–8 ở §19; coi mục 30 là workstream bắt buộc và dùng bảng 30.32 để tìm phần Explain tương ứng, không tạo phase E0–E6 riêng. Trước mỗi phase, đọc source-of-truth và code liên quan, kiểm tra `git status`, cập nhật plan, rồi thực hiện patch nhỏ nhất có thể. Không tự đổi các quyết định đã đánh dấu BẮT BUỘC. Sau mỗi phase chạy targeted tests, sau cùng chạy full backend tests, validator, frontend tests và typecheck; browser QA ở các viewport trong tài liệu. Không chạy benchmark, data rebuild hoặc teaching generator. Dừng và báo rõ nếu schema/code hiện tại mâu thuẫn hoặc nếu cần mở rộng phạm vi.

Codex triển khai không được:

- bắt đầu bằng N bản sao `MapView`;
- tách bidi bằng phỏng đoán client-side;
- gọi fixed-order N-point route là ATSP;
- tự đổi Held–Karp sang method khác;
- chạy comparison song song rồi xếp hạng runtime như công bằng;
- ẩn card lỗi để giảm số pane;
- suy luận return mode từ legs;
- giữ scalar A/B và generic session như hai nguồn chân lý;
- parse prose/regex để dựng hierarchy hoặc numeric truth cho Explain v2;
- gọi post-hoc route là tuyến thuật toán đã xét/bị loại;
- dùng `total_time_s` như ETA/thời gian lái xe hoặc giải thích result B bằng trace A;
- tuyên bố browser/performance pass nếu chưa chạy thực tế.

---

## 29. Tóm tắt quyết định cuối cùng

Thiết kế tốt nhất cho dự án là:

- Tách rõ **Hai điểm** và **Nhiều điểm**.
- Trong nhiều điểm, giữ cả **Đi theo thứ tự đã chọn** và **Tối ưu thứ tự ATSP**.
- Thêm **Quay về điểm Đi**, mặc định tắt và áp dụng cho cả hai cách xử lý.
- Tách đúng frontier Bidirectional Dijkstra bằng contract backend additive.
- Nâng ATSP metrics thành outcome + effort + per-leg/baseline.
- So sánh route 2–4 thuật toán và ATSP 2–3 phương pháp.
- Mỗi lựa chọn có một result pane/map riêng; final-only, camera độc lập, partial failure.
- Cho thu gọn panel trái trên desktop mà không làm mất state.
- Thiết kế lại Giải thích thành structured workspace: đúng result, verdict, step/event, objective breakdown, post-hoc provenance, guarantee/limitation và map-linked evidence.
- Triển khai theo schema → policy/state → single UI → map extraction → comparison → hardening.

Đây là phương án cân bằng tốt nhất giữa tính trực quan khi demo, độ chính xác học thuật, khả năng triển khai an toàn và giới hạn hiệu năng của ứng dụng bản đồ nhiều WebGL surface.

---

## 30. Thiết kế lại phần “Giải thích”

> Phần này được bổ sung sau static audit ngày 2026-08-09. Nó là một workstream bắt buộc và phải được tích hợp vào các phase contract, state, UI, comparison và hardening ở trên.
>
> Phạm vi kiểm tra hiện tại là source/schema/design tĩnh. Chưa chạy browser trong lượt lập kế hoạch này; focus, scroll, clipping, contrast render, screen-reader announcement và map overlay vẫn phải được runtime-QA sau implementation.

### 30.1. Kết luận thiết kế

Giữ nhãn tab **“Giải thích”** để khớp rubric của bài tập, nhưng định nghĩa lại vai trò:

> Giải thích một kết quả cụ thể bằng bằng chứng từ đúng immutable input snapshot; cho biết thuật toán vừa làm gì, điều gì thực sự ảnh hưởng objective, kết luận được bảo đảm tới đâu và các tuyến dùng để đối chiếu đến từ đâu.

Tab này **không** được tiếp tục là:

- bản sao nhiều chữ của tab Số liệu;
- một đoạn giáo khoa tĩnh giống nhau cho mọi lần chạy;
- một chuỗi prose mà frontend phải parse ngược để tìm fact;
- một lời kể nhân hóa như thể thuật toán đã “nghĩ”, “xét” và “loại” các full route không có trong trace;
- nơi dùng balanced weight như thời gian thuần;
- nơi giải thích global result A khi người dùng vừa bấm xem result B.

Mô hình được chọn là **structured, deterministic explanation**:

- Backend sở hữu fact, provenance, termination và cost breakdown.
- Trace sở hữu decision evidence của bước thật.
- Frontend dùng pure typed presenters để dựng tiếng Việt.
- Legacy prose tiếp tục tồn tại một chu kỳ làm fallback/export.
- Không dùng LLM, chatbot, network generation hoặc free-form text generation.

### 30.2. Vì sao phần hiện tại tạo cảm giác “kỳ”

| Mức | Vấn đề đã xác minh | Tác động | Quyết định |
|---|---|---|---|
| Cao | `total_time_s` luôn là balanced weight nhưng `explain.py` gọi delta là “thời gian thuần” | Có thể giải thích sai objective ở mode time | Alternative phải có `total_cost` đúng mode và structured breakdown |
| Cao | “Tuyến thay thế đã xét — và vì sao bị loại” trong khi tuyến do UCS sinh hậu xử lý | Người học hiểu sai internal behavior của BFS/A*/Greedy/... | Đổi thành “Tuyến tham chiếu được tính sau khi chạy”, thêm provenance |
| Cao | Ordered multi bỏ explanation từng leg rồi UI vẫn hỏi “Vì sao chọn tuyến này?” | Heading không được nội dung trả lời | Giữ per-leg evidence; aggregate chỉ nói fixed order và tổng |
| Cao | Timeline search đổi nhưng Explain không đọc step; ATSP event narrative nằm ở Số liệu | Mất mối nối map ↔ step ↔ lời giải | Thêm “Bước đang xem” đồng bộ timeline cho cả route/ATSP |
| Cao | Compare dẫn sang Explain nhưng Explain chỉ đọc primary trace | Có thể giải thích sai result | Bind bằng `explanationSubject` chứa session/result ID |
| Cao | found=false trộn unreachable proof với cap/pruning | CTA và kết luận có thể sai | Thêm typed termination/reachability conclusion |
| Trung bình | Tách câu đầu bằng regex rồi giấu phần còn lại | Caveat/gap quan trọng bị ẩn, hierarchy dễ vỡ | Render từ facts; prose chỉ legacy fallback |
| Trung bình | Alternative có path nhưng không xem được trên map | Đối chiếu khó hiểu | Thêm view-only dashed reference overlay |
| Trung bình | Congestion group theo tên đường toàn cục và lấy max | Mất vị trí/edge evidence | Group contiguous runs, giữ ordered edge IDs |
| Trung bình | ATSP Explain chủ yếu là method copy tĩnh | Không giải thích lần chạy cụ thể | Dùng optimization event, method stats, legs và baseline |
| Trung bình | Dynamic/loading/error semantics chưa nhất quán | Empty sai hoặc screen reader không biết trạng thái | Explicit request states, status/alert có kiểm soát |

Hai finding đầu là correctness defects về diễn giải, không phải sở thích copy.

### 30.3. Các phương án đã cân nhắc

| Phương án | Lợi ích | Hạn chế | Quyết định |
|---|---|---|---|
| Chỉ sửa wording/card | Nhanh, ít contract | Không giải quyết step evidence, objective correctness, per-result identity | Chỉ là truthfulness correction trong Phase 0, không phải trạng thái cuối |
| Structured facts + deterministic presenter + decision trace | Chính xác, test được, đồng bộ timeline, chống hallucination | Cần schema/backend/frontend theo phase | **Chọn** |
| Sinh lời giải bằng LLM | Có vẻ tự nhiên | Nondeterministic, có thể bịa, cần network, khó chấm/test, sai offline invariant | Loại |
| Hai nested tabs “Kết quả/Bước” | Giảm chiều dài | Thêm state/navigation lồng trong outer tab; dễ giấu evidence | Không chọn mặc định |
| Một flow dọc có progressive disclosure | Verdict và step luôn gần đầu; ít navigation | Có thể dài nếu mở hết | **Chọn**, details chỉ cho lecture/raw |

Nếu browser user test chứng minh flow dọc quá dài, có thể xem lại nested tabs. Bằng chứng cần là time-to-find và error rate trên viewport mục tiêu, không chỉ preference thẩm mỹ.

### 30.4. Năm câu hỏi tab phải trả lời

Trong thứ tự này:

1. **Đang giải thích kết quả nào?**
2. **Kết luận chính là gì?**
3. **Ở bước đang xem, thuật toán vừa làm gì và dựa trên quy tắc nào?**
4. **Yếu tố nào thật sự ảnh hưởng objective; yếu tố nào chỉ là bối cảnh?**
5. **Kết luận được bảo đảm đến đâu; tuyến tham chiếu/proof đến từ đâu?**

Trong 5–10 giây đầu, người xem phải thấy được subject, verdict, objective và guarantee/limitation. Không bắt buộc cuộn hoặc mở disclosure để biết result là exact, ε-bounded, feasible-unproven hay inconclusive.

### 30.5. Information architecture được chốt

~~~text
GIẢI THÍCH

[ResultContextStrip]
Algorithm/method · problem kind · mode · slot profile · graph/view
scenario · open/closed · result đang focus

[KẾT LUẬN — luôn mở]
Headline ngắn
Objective + guarantee/reachability
2–4 evidence bullets

[BƯỚC ĐANG XEM — nếu có trace]
Bước/mốc k/N · action vừa xảy ra
quy tắc chọn · selected score/context
frontier sau bước · thay đổi chính

[ĐIỀU TẠO NÊN CHI PHÍ]
free-flow · congestion delay · risk penalty · balanced
chip “Ảnh hưởng objective” hoặc “Chỉ là bối cảnh”

[TRÊN HÀNH TRÌNH]
contiguous congestion/risk groups
button “Hiện trên bản đồ”

[TUYẾN THAM CHIẾU ĐỂ ĐỐI CHIẾU]
caption provenance hậu kiểm
signed reference trade-off đúng mode; exact gap ở field riêng
button dashed overlay

<details>Cách thuật toán hoạt động và điều kiện bảo đảm</details>
<details>Nguồn dữ liệu, scenario và chi tiết kỹ thuật</details>
<details>Dữ liệu gốc dành cho debug</details>
~~~

Không bọc mỗi dòng nhỏ trong một card. Dùng section, heading, list và description list đúng quan hệ. Card chỉ gom một đơn vị thông tin thực sự.

### 30.6. Result identity và state

Thêm view-only state, tách khỏi computation:

~~~ts
type ExplanationSubject =
  | { kind: "single_route"; runId: string }
  | { kind: "route_comparison"; sessionId: string; resultId: string }
  | { kind: "single_atsp"; runId: string }
  | { kind: "atsp_comparison"; sessionId: string; resultId: string }
  | null;

type ExplanationOverlay =
  | { kind: "factor"; resultId: string; factorId: string; edgeIds: string[] }
  | { kind: "reference_route"; resultId: string; referenceId: string }
  | { kind: "leg"; resultId: string; legIndex: number }
  | { kind: "unreachable_pair"; resultId: string; from: string; to: string }
  | null;
~~~

Invariant:

- Subject luôn tham chiếu immutable run/session hiện hữu.
- Header phải ghi tên algorithm/method đang được giải thích.
- “Xem giải thích” từ một comparison pane set đúng subject rồi mở drawer/tab.
- Không fallback im lặng từ B sang A.
- Subject/overlay không làm rerun hoặc invalidation.
- Invalidating owning result/session clear subject và overlay atomically.
- Đổi subject clear overlay cũ.
- Rời tab ẩn overlay; có thể giữ selection trong cùng run để quay lại. New run luôn clear.
- Overlay ID phải tồn tại trong structured evidence của đúng result; ID stale bị bỏ an toàn.

`ExplainTab` trở thành router mỏng theo request/result state và subject, không tự chọn ưu tiên `multi` chỉ vì object đó còn trong store.

### 30.7. Result context strip

Luôn hiển thị:

- Algorithm hoặc ATSP method.
- Hai điểm / Nhiều điểm theo thứ tự / ATSP.
- Objective mode.
- Representative time slot.
- Graph và graph view.
- Scenario provenance; override count nếu có.
- Open/closed với multi.
- Result ID hoặc label trong comparison.

Fingerprint/hash nằm trong technical details, không chen trước verdict.

Traffic copy:

> Theo hồ sơ khung giờ đại diện 07:30; không phải dữ liệu giao thông trực tiếp.

Risk copy:

> Đoạn đường được gắn cờ nguy cơ trong dữ liệu dự án; đây không phải xác nhận sự cố hiện tại.

Không dùng “lúc 07:30” theo cách dễ khiến người dùng hiểu là live traffic.

### 30.8. Verdict model: tách chất lượng nghiệm khỏi reachability

Không cố nhồi mọi nghĩa vào `optimal_guarantee: boolean`. Structured explanation tách:

~~~ts
type ExplanationOutcome = "found" | "trivial" | "not_found";

type SolutionQuality =
  | "exact"
  | "epsilon_bounded"
  | "feasible_unproven"
  | "not_applicable";

type ReachabilityConclusion =
  | "route_found"
  | "proven_unreachable"
  | "inconclusive";

type TerminationReason =
  | "start_equals_goal"
  | "goal_expanded"
  | "bidirectional_bound_met"
  | "frontier_exhausted"
  | "depth_cap_reached"
  | "round_cap_reached"
  | "beam_exhausted_after_pruning";

interface BidirectionalBoundEvidence {
  top_forward: { node: string; g: number } | null;
  top_backward: { node: string; g: number } | null;
  mu: number;
  meeting_node: string;
}

interface RouteTermination {
  reason: TerminationReason;
  reachability: ReachabilityConclusion;
  solution_quality: SolutionQuality;
  bidirectional_bound: BidirectionalBoundEvidence | null;
}
~~~

`ExplanationOutcome` là frontend view-model derive từ root `found` và
`termination.reason`; payload v2 không serialize một outcome cạnh tranh. Các field
`reason/reachability/solution_quality/bidirectional_bound` dùng đúng root `Trace.termination` ở
`docs/SCHEMA.md` §F.2.

Mapping:

| Trường hợp | Solution quality | Reachability | Headline |
|---|---|---|---|
| Start=Goal | not_applicable | route_found | “Không cần tìm đường vì Đi trùng Đến”; không dùng quality để đổi `optimal_guarantee` legacy |
| UCS/A* found (`goal_expanded`) | exact | route_found | “Có bảo đảm tối ưu trong cấu hình này” |
| Bidi found (`bidirectional_bound_met`) | exact | route_found | “Hai phía đã đạt điều kiện dừng theo μ; tuyến có bảo đảm tối ưu” |
| IDA* found | epsilon_bounded | route_found | “Sai số cộng không quá ε trong cấu hình này” |
| BFS/DFS/IDDFS/Greedy/Beam found | feasible_unproven | route_found | “Tìm được tuyến; không có bảo đảm weighted optimum” |
| Complete exploration exhausted | not_applicable | proven_unreachable | “Không có đường có hướng trong cấu hình này” |
| IDDFS depth cap | not_applicable | inconclusive | “Chưa tìm thấy trước giới hạn độ sâu” |
| IDA* round cap | not_applicable | inconclusive | “Chưa tìm thấy trước giới hạn số vòng” |
| Beam exhausted after pruning | not_applicable | inconclusive | “Beam chưa tìm thấy; không chứng minh graph vô đường” |

Các dòng exact/epsilon ở trên chỉ áp dụng khi precondition guarantee của algorithm trong `docs/SCHEMA.md` được thỏa và được snapshot/result attested. Nếu heuristic, edge weight hoặc cấu hình làm precondition không còn đúng, hạ về `feasible_unproven`; frontend không suy guarantee chỉ từ tên thuật toán.

`optimal_guarantee` legacy vẫn giữ. Validator/test phải đảm bảo khi found:

- `solution_quality=exact|epsilon_bounded` → `optimal_guarantee=true`.
- `solution_quality=feasible_unproven` → `optimal_guarantee=false`.

Reachability conclusion độc lập, vì một algorithm không tối ưu cost vẫn có thể exhaust toàn bộ finite reachable graph và chứng minh Goal unreachable.

Quy tắc producer bắt buộc để mapping không overclaim:

- IDDFS inner depth-limited round trả typed outcome `found | failure | cutoff`.
  `cutoff` chỉ khi có effective successor state bị bỏ chỉ vì depth limit, sau cùng
  duplicate/best-depth policy; final round cutoff mới là `depth_cap_reached`.
  Nếu final round kết thúc `failure` không còn state sâu hơn cần thử, dùng
  `frontier_exhausted`/proven, dù configured max depth vừa đạt.
- Beam giữ full-run `everPruned`. Chỉ set khi pool unique sau khi quét xong layer
  lớn hơn k và có node bị loại bởi top-k; visited/duplicate skip không tính.
  Not-found sau pruning là `beam_exhausted_after_pruning`; not-found chưa từng
  pruning là `frontier_exhausted` và có thể chứng minh reachability.
- IDA* chỉ dùng `round_cap_reached` khi hết `max_rounds` nhưng probe còn trả next
  finite f-threshold; exhaustive/no next threshold dùng `frontier_exhausted`.
- Bidirectional Dijkstra found chỉ dùng `bidirectional_bound_met` khi finite
  μ/meeting path đã có và effective `top_forward + top_backward >= μ`.
  Không dùng `goal_expanded`, vì phía forward không cần expand Goal trước
  khi stop rule hai chiều chứng minh tối ưu.
- `termination.bidirectional_bound` bắt buộc non-null đúng khi reason là
  `bidirectional_bound_met`, kể cả `include_trace=false`. Top null nghĩa là
  effective frontier tương ứng rỗng và được thuật toán xem như key `+∞`; JSON
  không serialize Infinity. Các g/μ là raw finite values tại chính stop check;
  meeting node nằm trên result path và μ equivalent `metrics.total_cost`.
- Test bắt buộc có IDDFS unreachable nông hơn cap, goal sâu hơn cap và graph có
  cycle; Beam có `pool<=k` unreachable và `pool>k` cắt nhánh chứa Goal. Không suy
  termination từ `trace.length`, vì trace có thể tắt hoặc bị cap.

### 30.9. Correctness của objective và cost breakdown

Mục này áp dụng contract số học normative ở §14 và `docs/SCHEMA.md` §F.1 vào
Explanation; không tạo công thức/tolerance thứ hai. Bảng diễn giải:

| Mode | Objective | Congestion tham gia? | Risk penalty tham gia? |
|---|---|---:|---:|
| `distance` | tổng `length_m` | Không | Không |
| `time` | `t_free × f_cong` | Có | Không |
| `balanced` | `t_free × f_cong + penalty` | Có | Có |

Structured path breakdown:

~~~ts
interface PathCostBreakdown {
  distance_m: number;
  free_flow_time_s: number;
  congestion_adjusted_time_s: number;
  congestion_delay_s: number;
  penalty_flood_s: number;
  penalty_construction_s: number;
  penalty_narrow_alley_s: number;
  penalty_traffic_light_s: number;
  risk_penalty_total_s: number;
  balanced_cost_s: number;
}
~~~

Invariant:

~~~text
congestion_delay_s
  = congestion_adjusted_time_s - free_flow_time_s

risk_penalty_total_s
  = flood + construction + narrow_alley + traffic_light penalties

balanced_cost_s
  = congestion_adjusted_time_s + risk_penalty_total_s
~~~

Nguồn tính duy nhất là `backend/app/costs.py::edge_cost_breakdown`; aggregate theo edges trên path. Không copy lại công thức trong frontend.

UI:

- Distance: “Ùn tắc/rủi ro là bối cảnh, không tham gia tiêu chí Ngắn nhất”.
- Time: “Congestion tham gia; risk penalties không tham gia objective”.
- Balanced: “Cả congestion-adjusted time và risk penalties tham gia”.
- `total_time_s` legacy chỉ được label **“Chi phí cân bằng”**, không “ETA”, “thời gian thuần” hoặc “thời gian lái xe”.
- Objective time dùng `total_cost`/`congestion_adjusted_time_s`.
- Runtime dùng “Thời gian xử lý”, ms.

Presentation breakdown ví dụ:

~~~text
Chi phí cân bằng: 8,4 phút quy đổi
├─ Thời gian không ùn tắc: 4,9 phút
├─ Phần tăng theo hồ sơ ùn tắc: +2,0 phút
└─ Phạt rủi ro: +1,5 phút
~~~

“Phút quy đổi” không được trình bày như ETA thực tế.

### 30.10. Structured route explanation contract

Giữ các field legacy:

- `summary_vi`;
- `congested_segments`;
- `alternatives`.

Thêm:

~~~json
{
  "contract_version": 2,
  "termination": {
    "reason": "goal_expanded",
    "reachability": "route_found",
    "solution_quality": "exact",
    "bidirectional_bound": null
  },
  "explanation": {
    "summary_vi": "legacy fallback/export",
    "congested_segments": [],
    "alternatives": [],

    "evidence": {
      "selection_rule": "lowest_f_then_h",
      "objective": {
        "mode": "balanced",
        "selected_value": 807.4,
        "exact_reference_value": 807.4,
        "optimality_gap": 0.0,
        "optimality_gap_pct": 0.0
      },
      "cost_breakdown": {
        "distance_m": 3120.0,
        "free_flow_time_s": 430.0,
        "congestion_adjusted_time_s": 632.4,
        "congestion_delay_s": 202.4,
        "penalty_flood_s": 60.0,
        "penalty_construction_s": 90.0,
        "penalty_narrow_alley_s": 0.0,
        "penalty_traffic_light_s": 25.0,
        "risk_penalty_total_s": 175.0,
        "balanced_cost_s": 807.4
      },
      "factors": [],
      "reference_routes": []
    }
  }
}
~~~

Field v2 optional ở reader để đọc legacy response. Producer chỉ phát
`contract_version=2` khi populate đúng required variant, kể cả no-path/trivial;
không gắn version 2 rồi dùng null/[] để che field bắt buộc bị thiếu. UI verdict
derive từ root `found` + `termination`, không duy trì một verdict enum thứ hai.
Found có finite objective/non-null breakdown; trivial dùng 0/zero breakdown;
not-found dùng objective/breakdown null và reference rỗng theo `SCHEMA.md` §F.3.
Object `objective` luôn có đủ năm key
`mode/selected_value/exact_reference_value/optimality_gap/optimality_gap_pct`.
Ba field exact/gap là `null` khi không có exact same-snapshot reference;
not-found còn có `selected_value=null`. Không dùng missing key và `null` như hai
trạng thái cạnh tranh trong payload B2.

### 30.11. Decision factors và congestion grouping

Factor:

~~~ts
interface ExplanationFactor {
  id: string;
  kind:
    | "objective_truth"
    | "optimality_gap"
    | "congestion"
    | "flood"
    | "construction"
    | "narrow_alley"
    | "traffic_light"
    | "algorithm_limit"
    | "scenario_effect";
  affects_objective: boolean;
  source: "cost_breakdown" | "reference_comparison" | "trace" | "scenario";
  edge_ids: string[];
  node_ids: string[];
  contribution_raw: number | null;
  contribution_unit: "m" | "s" | null;
  timeline_step: number | null;
}
~~~

`contribution_raw` và `contribution_unit` cùng null hoặc cùng non-null. Giá trị
raw có thể signed. Factor `affects_objective=false` bắt buộc cả hai null; số giây
bối cảnh lấy từ breakdown, không giả là contribution của distance objective.
Khi non-null, unit là `m` cho distance và `s` cho time/balanced. Level/count của
nhóm đường là view-model derive từ directed edges/profile, không phải một shape
factor cạnh tranh trong API.

Frontend map `kind` + facts thành title/detail; không cần backend nhúng prose cho từng factor.

Ordering:

1. Objective/guarantee truth.
2. Optimality gap hoặc trade-off lớn nhất.
3. Yếu tố objective contribution lớn.
4. Context-only congestion/risk.
5. Scenario/data caveat.

Factor `affects_objective=false` luôn có chip:

> Bối cảnh — không ảnh hưởng tiêu chí hiện tại

Congestion/risk groups không group toàn cục chỉ bằng street name. Group contiguous path runs:

~~~ts
interface RouteFactorGroup {
  id: string;
  kind: "congestion" | "risk";
  edge_ids: string[];
  from_node: string;
  to_node: string;
  name: string | null;
  edge_count: number;
  length_m: number;
  max_congestion_level: number | null;
  congestion_delay_s: number;
  risk_penalty_s: number;
  affects_objective: boolean;
}
~~~

Hai đoạn rời nhau trên cùng tên đường là hai group. Tên đường wrap, không dựa vào `title` hover hoặc truncate để cung cấp full evidence.

Khi không có congestion ≥4:

> Không có đoạn mức 4–5 trên tuyến theo hồ sơ khung giờ này.

Positive empty state không được biến mất hoàn toàn nếu nó là bằng chứng hữu ích.

### 30.12. Tuyến tham chiếu: provenance và objective đúng

Đổi tên:

> **Các tuyến tham chiếu để đối chiếu**
>
> Hệ thống tính thêm các tuyến này sau khi thuật toán chính kết thúc. Chúng không nhất thiết là những full route mà thuật toán đã trực tiếp xét.

Contract:

~~~ts
type ReferenceKind =
  | "same_objective_optimum"
  | "distance_optimum"
  | "balanced_optimum"
  | "avoid_edge_counterfactual";

interface ReferenceRoute {
  id: string;
  kind: ReferenceKind;
  provenance: "posthoc_ucs";
  generated_for_mode: Mode;
  excluded_edge: string | null;
  path: string[];
  metrics: LegMetrics;
  cost_breakdown: PathCostBreakdown;
  reference_minus_selected_cost: number;
  reference_minus_selected_pct: number | null;
  reference_minus_selected_distance_m: number;
  reference_minus_selected_balanced_cost_s: number;
  relation_to_selected: "better" | "equivalent" | "worse";
}
~~~

Invariant:

- Cùng Start/Goal và scenario.
- Path hợp lệ theo directed edges.
- `metrics.total_cost` dùng **cùng request mode** với selected route.
- `reference_minus_selected_cost = ref.total_cost - selected.total_cost`; âm ngoài
  tolerance = reference tốt hơn, dương = reference kém hơn, equivalent = 0 về
  mặt relation. Không gọi signed field này là optimality gap.
- `reference_minus_selected_pct = signed_cost / selected.total_cost * 100` khi
  selected lớn hơn tolerance; cả hai equivalent 0 → 0; selected equivalent 0
  nhưng reference khác 0 → `null`. Không chia 0.
- Hai field distance/balanced cũng dùng dấu `reference - selected`; không đảo dấu
  theo câu copy hoặc theo việc reference tốt/xấu.
- Relation dùng đúng raw tolerance §14.4; display rounding không đổi relation.
- `generated_for_mode` nói mode dùng để sinh reference, khác với mode dùng để đánh giá nếu có.
- Stable ID; không key bằng localized label.
- Max 2 reference routes.
- Nếu non-guaranteed algorithm, ưu tiên một `same_objective_optimum`; gap riêng
  được tính `selected - exact` trong objective evidence, không tái dùng signed
  reference field.
- Nếu quality `exact` có exact same-objective reference tốt hơn tolerance:
  contract integrity error; UI dừng ranking/claim và hiện warning. Nếu quality
  `epsilon_bounded`, reference được phép tốt hơn trong `epsilon_bound`; chỉ gap
  âm hoặc vượt ε mới là integrity error. Không suy exact chỉ từ
  `optimal_guarantee=true`.
- Nếu route/reference giống nhau, có thể nói “lần chạy này trùng reference exact”; không gọi non-guaranteed algorithm thành exact.
- Edge-counterfactual chỉ nói “đường nếu tránh cạnh X”, không “bị thuật toán loại”.

Legacy `Alternative` giữ shape hiện hành cho F1 và được sinh từ cùng facts trong
rollout. Không thêm field cạnh tranh tên `origin`; provenance typed duy nhất là
`ReferenceRoute.provenance`. UI v2 dùng `reference_routes`.

### 30.13. Map ↔ explanation

Mỗi factor/reference/leg có button:

- “Hiện đoạn này trên bản đồ”.
- “Hiện tuyến tham chiếu trên bản đồ”.
- “Xem chặng này”.

Interaction:

- Click/Enter/Space set `explanationOverlay` và pause playback.
- Không auto-pan khi hover/focus.
- Chỉ fit bounds khi user kích hoạt button.
- Primary route: solid.
- Reference: dashed + offset + label/index.
- Factor: halo/pattern render sau base/final route đủ thấy.
- Legend có text/pattern/index; không color-only.
- Button dùng `aria-pressed` và accessible name chứa subject.
- Một reference active tại một thời điểm.
- Text tự đầy đủ; map không phải alternative duy nhất cho screen reader.

Mobile:

1. User bấm “Hiện trên bản đồ”.
2. Sheet đóng có chủ đích.
3. Focus vào map region/banner.
4. Banner: “Đang xem tuyến tham chiếu 1 · Quay lại Giải thích”.
5. Nút quay lại mở sheet, restore subject, scroll và focus.

Không dùng auto camera animation với reduced motion.

### 30.14. Bước đang xem: UI pattern

Khi trace có dữ liệu, ngay sau verdict:

~~~text
BƯỚC 12/48
Đang mở rộng: Chợ Bến Thành

Vì sao được chọn
A* ưu tiên f = g + h. Node này có g=..., h=..., f=...;
ứng viên kế tiếp có f=....

Sau bước này
Đã quét 4 cạnh · thêm 2 node · cải thiện 1 node
Frontier sau khi mở rộng: 7 node

[bảng frontier hiện tại]
~~~

Bốn dòng logic nhất quán:

1. **Action** — mở rộng/chọn/cập nhật gì.
2. **Rule** — quy tắc thật của algorithm.
3. **Evidence** — score/bound/side/candidate từ trace.
4. **Effect** — frontier/candidate state sau action.

Không nói score nhỏ nhất nếu response legacy không có decision evidence.

Fallback legacy:

> Bước 12 vừa mở rộng X; frontier sau bước có 7 node. Response này chưa chứa dữ liệu đủ để chứng minh thứ tự ưu tiên tại thời điểm chọn.

Trace off:

> Lần chạy này không ghi diễn biến từng bước. Kết quả và guarantee vẫn dùng full run; chạy G_demo với trace để xem quyết định theo timeline.

Trace truncated:

> Timeline có thể chỉ chứa prefix do backend cap hoặc các mốc được sampler giữ;
> metadata bên dưới cho biết trường hợp nào. Metrics và kết quả vẫn là toàn bộ lần chạy.

### 30.15. Trace decision contract

Current `TraceStep` là snapshot **sau** expansion và frontier bị sort theo ID; không đủ để giải thích FIFO/LIFO/tie-break hoặc selected score. Producer
`contract_version=2` bắt buộc nested `decision` ở mọi recorded step; reader legacy
cho phép thiếu:

~~~json
{
  "decision": {
    "rule": "lowest_f_then_h",
    "selected_scores": {
      "g": 120.0,
      "h": 40.0,
      "f": 160.0,
      "depth": null
    },
    "runner_up": {
      "node": "n0008",
      "g": 125.0,
      "h": 42.0,
      "f": 167.0,
      "depth": null
    },
    "frontier_size_before": 8,
    "frontier_size_after": 7,
    "neighbors_scanned": 4,
    "frontier_added": 2,
    "frontier_updated": 1,
    "pruned_count": 0,
    "iteration": null,
    "bound": null,
    "layer": null,
    "beam_width": null,
    "top_forward": null,
    "top_backward": null,
    "mu_before": null
  }
}
~~~

`rule` enum:

~~~text
fifo
lifo
depth_limited_lifo
lowest_g
lowest_h
lowest_f_then_h
bidirectional_min_key
f_bound_dfs
top_k_f
~~~

Semantics:

- Scores của expanded node tại lúc được chọn, trước relaxation.
- Runner-up là effective next selectable item theo cùng ordering tại thời điểm pop; không chứa stale heap entry.
- `frontier_size_before` đo effective frontier trước pop.
- `frontier_size_after` phải bằng current legacy frontier semantics.
- `neighbors_scanned` là số adjacency entries thực sự iterated trong expansion.
- `frontier_added` là new discovery.
- `frontier_updated` là best-known score thật sự được cải thiện.
- `pruned_count` chỉ explicit algorithm pruning/bound; duplicate/closed skip không được gọi pruning.
- `iteration` (IDDFS/IDA*) và `layer` (Beam) serialize 1-based. ATSP event
  `ordinal` vẫn 0-based; UI không cộng/trừ ngầm ngoài presenter tương ứng.
- Với Bidijkstra, `top_forward`, `top_backward` và `mu_before` là effective state
  trước expand; `bidirectional_frontiers.best_path_cost` là μ sau expand. Tách hai
  thời điểm để không giải thích stop rule bằng dữ liệu tương lai.
- Producer B2 serialize đủ keys của `decision`; field không áp dụng mang `null`.
  `selected_scores=null` hợp lệ cho BFS/DFS; score object của algorithm có score
  và object `runner_up` chứa đủ `g/h/f/depth` với subfield không áp dụng là
  `null`. Reader B1 vẫn cho phép thiếu toàn bộ `decision`.
- Tạo snapshot chỉ khi recorder active.
- Không đổi path, tie-break, work, metrics hoặc trace cap.
- Legacy response thiếu decision vẫn parse.

Payload/performance gate:

- đo serialized response trước/sau trên representative G_demo;
- explanation fields không làm trace-on runtime tăng quá 10% trên test machine nếu không có lý do được review;
- trace-off không có overhead snapshot;
- nếu payload vượt budget, bỏ runner-up/counters phụ trước, không bỏ selected score/bound cần cho truthfulness.

### 30.16. Decision matrix cho chín search algorithms

| Algorithm | Rule | Evidence bắt buộc | Copy/caveat |
|---|---|---|---|
| BFS | fifo | effective queue head, counts | Tối ưu số cạnh/lớp, không tối ưu weighted objective |
| DFS | lifo | effective stack top, counts | Path đầu theo stable adjacency order; không tối ưu cost |
| IDDFS | depth_limited_lifo | depth, depth limit, iteration | Chạy lại theo giới hạn sâu; cap làm no-path inconclusive |
| UCS | lowest_g | selected g, runner-up g | Exact với weight không âm |
| A* | lowest_f_then_h | selected g/h/f, runner-up, tie-break | Exact với admissible+consistent heuristic hiện hành |
| Greedy | lowest_h | selected h, runner-up h | Không dùng g để chọn; không optimal guarantee |
| Bidijkstra | bidirectional_min_key | side, g, top F/B, μ/meeting, two frontiers | Backward g là node→Goal trên graph gốc |
| IDA* | f_bound_dfs | g/h/f, round, f-bound, ε | C*+ε nếu hoàn tất trước cap; cap không chứng minh |
| Beam | top_k_f | layer, k, pool/kept/pruned, scores | Pruning làm incomplete và no guarantee |

Heuristic explanation:

- Distance: straight-line distance.
- Time/balanced: straight-line distance / max graph speed.
- Bỏ congestion/risk để giữ lower bound.
- Guarantee chỉ trong graph/cost/scenario snapshot và các điều kiện heuristic, không phải cam kết giao thông ngoài đời.

IDA* label khuyến nghị:

> Bảo đảm sai số cộng không quá ε

Rõ hơn “Tối ưu trong ε”.

### 30.17. Ordered multi explanation

Mở rộng leg snapshot:

~~~ts
interface SequentialRouteLeg {
  // fields hiện tại
  explanation: Explanation;
  terminationReason: TerminationReason;
  solutionQuality: SolutionQuality;
  reachability: ReachabilityConclusion;
}
~~~

Overview bắt buộc:

> Thứ tự A → B → C được giữ cố định theo input. Thuật toán tìm đường riêng cho từng chặng; nó không tối ưu lại thứ tự giao hàng.

Nếu mọi leg exact:

> Mỗi chặng có bảo đảm tối ưu theo tiêu chí trong thứ tự đã khóa. Đây không phải bảo đảm rằng thứ tự A → B → C là thứ tự giao hàng tối ưu.

UI:

- Global objective/totals.
- Leg đóng góp objective lớn nhất.
- Leg congestion/risk lớn nhất.
- Leg strip/accordion có status và metric.
- Active leg theo timeline tự được highlight, không bắt buộc auto-scroll liên tục.
- Nếu failure, mở mặc định failed leg.
- Alternatives chỉ nằm trong leg tương ứng.
- Không tạo fake whole-tour alternative.
- Closing leg label “Chặng quay về Đi”.
- Aggregate factors giữ attribution `legIndex`.
- Per-leg explanation snapshot immutable; không đọc live selections.

### 30.18. No-path và trivial states

Route headings:

- Proven unreachable: “Vì sao không thể nối hai điểm trong cấu hình này?”
- Inconclusive: “Vì sao thuật toán chưa tìm thấy tuyến?”
- Trivial: “Không cần tìm đường”.

CTA theo reason:

| Reason | Copy/CTA |
|---|---|
| Proven unreachable | Đổi điểm/hướng/scenario; đổi algorithm không thay reachability |
| Beam pruning | Tăng k hoặc dùng UCS/A*; không nói graph vô đường |
| IDDFS depth cap | Tăng explicit max depth nếu được phép hoặc dùng complete method |
| IDA* round cap | Tăng cap/rerun hoặc dùng A*/UCS; không claim proof |
| Start=Goal | Chọn hai điểm khác nếu muốn xem search |

Không dùng một câu chung “algorithm không complete hoặc destination unreachable”.

### 30.19. ATSP failure semantics

`UnreachableStopError` phải giữ typed directed pair:

~~~ts
interface MultirouteFailure {
  kind: "matrix_incomplete";
  from_node: string;
  to_node: string;
}
~~~

Response found=false:

~~~json
{
  "found": false,
  "failure": {
    "kind": "matrix_incomplete",
    "from_node": "A",
    "to_node": "B"
  }
}
~~~

Copy:

> Không dựng được ma trận ATSP đầy đủ vì không tìm thấy đường A → B trong graph có hướng hiện tại. Optimizer chưa bắt đầu.

Không khẳng định “không tồn tại bất kỳ open tour nào”, vì matrix implementation hiện yêu cầu mọi ordered pair reachable, mạnh hơn điều kiện một open order cụ thể có thể cần.

Đổi Held–Karp/NN/SA không khắc phục matrix incomplete; CTA phải hướng tới điểm, hướng, graph/scenario.

### 30.20. ATSP explanation

ATSP phải giải thích kiến trúc ba tầng:

~~~text
Selected points
→ UCS dựng directed cost/path matrix
→ Held–Karp / NN+local search / SA chọn visiting order
→ cached UCS paths ghép thành road route
~~~

Không để người học hiểu Held–Karp trực tiếp expand toàn road graph.

Matrix evidence là typed fact, không phải câu lý thuyết chung:

~~~ts
interface AtspMatrixEvidence {
  point_count: number;
  directed_pair_count: number; // k * (k - 1)
  reachable_directed_pair_count: number;
  asymmetric_unordered_pair_count: number;
  asymmetry_example: {
    from_node: string;
    to_node: string;
    forward_cost: number;
    reverse_cost: number;
    absolute_delta: number;
  } | null;
}
~~~

- Cost dùng active mode và đúng raw unit.
- `asymmetry_example` chọn deterministic trong các unordered pair có hai hướng chênh quá tolerance; ưu tiên absolute delta lớn nhất rồi tie-break node ID.
- Khóa orientation bằng `from_node < to_node`; `forward_cost` là cost
  `from_node→to_node`, không tự đảo chiều để delta dương.
- Nếu không có pair khác biệt trong tolerance, để null và nói snapshot này không cung cấp ví dụ số; không tuyên bố matrix luôn symmetric.
- Khi matrix incomplete, `reachable_directed_pair_count` có thể nhỏ hơn tổng và `failure` ở mục 30.19 là kết luận chính; không đưa optimizer narrative.

#### Held–Karp

- DP theo subset + endpoint.
- Exact cho selected points, directed matrix, mode, slot, scenario và open/closed topology hiện tại.
- Không gọi “tối ưu tuyệt đối ngoài đời”.
- Copy: “Tối ưu chính xác trong cấu hình này”.
- Hiển thị DP states/transitions nếu backend cung cấp full-run method stats.

#### NN + 2-opt/Or-opt

- “Gần nhất” nghĩa là **directed transition cost thấp nhất theo mode**, không phải khoảng cách địa lý.
- NN tạo seed order.
- 2-opt/Or-opt recost candidate theo asymmetric matrix.
- Hiển thị NN initial cost, accepted moves và improvement after NN nếu có full-run stats.
- Không gọi “gần tối ưu” nếu không có exact reference/lower bound.

#### Simulated Annealing

- Candidate tốt hơn được nhận.
- Candidate kém hơn có thể nhận theo `exp(-Δ/T)` để thoát local optimum.
- T giảm dần.
- Seeds 0–4; trả best seed.
- Hiển thị best/mean/std và best seed từ full-run stats.
- Temperature không phải thời gian giao thông.
- Không có global optimum guarantee.

Method stats phải đo full run, không derive từ sampled optimization trace:

~~~ts
type AtspMethodStats =
  | {
      kind: "held_karp";
      dp_states_solved: number;
      transitions_evaluated: number;
    }
  | {
      kind: "nn_local_search";
      nn_initial_cost: number;
      nn_candidates_evaluated: number;
      two_opt_candidates_evaluated: number;
      or_opt_candidates_evaluated: number;
      accepted_2opt_moves: number;
      accepted_oropt_moves: number;
      final_cost: number;
      improvement_after_nn: number;
    }
  | {
      kind: "simulated_annealing";
      seed_count: number;
      best_seed: number;
      best_cost: number;
      mean_best_cost: number;
      stddev_best_cost: number;
      attempted_moves: number;
      accepted_improving_moves: number;
      accepted_equal_moves: number;
      accepted_worse_moves: number;
      rejected_moves: number;
      seeds: Array<{
        seed: number;
        iterations: number;
        final_cost: number;
        best_cost: number;
        best_order: string[];
        attempted_moves: number;
        accepted_improving_moves: number;
        accepted_equal_moves: number;
        accepted_worse_moves: number;
        rejected_moves: number;
      }>;
    };
~~~

Semantics duy nhất, mirror `docs/SCHEMA.md` §F.4:

- Held–Karp state là mỗi entry `(mask, endpoint)` materialized, gồm base state.
  Transition tăng cho mỗi candidate recurrence đã tính, kể cả không cải thiện;
  không gồm final endpoint scan, reconstruction hoặc recorded event.
- NN candidate count là tổng candidate set ở từng greedy choice. 2-opt/Or-opt
  candidate count tăng sau mỗi full tour recost thật; no-op bị skip không tính.
  Accepted count dùng đúng internal improvement rule `cc < best - 1e-12` hiện
  hành. `improvement_after_nn = nn_initial_cost - final_cost` raw active-mode unit.
- SA dùng `delta = candidate_cost - current_cost`; classification phản ánh đúng
  acceptance code, không dùng display tolerance:
  `delta < 0` improving, `delta == 0` equal, `delta > 0` worse. Equal move luôn
  được nhận theo nhánh `delta <= 0` và phải có counter riêng.
- Identity ở aggregate và từng seed:
  `attempted = accepted_improving + accepted_equal + accepted_worse + rejected`.
- Best seed là min per-seed best cost, tie theo seed input order. Mean là arithmetic
  mean; `stddev_best_cost` là **sample standard deviation** (`n-1`, Python
  `statistics.stdev`), bằng 0 nếu chỉ có một seed.
- Counter collection không gọi RNG, không thay loop/acceptance/order/cost. Trace
  on/off không đổi method stats, optimizer stats legacy hoặc result.

### 30.21. ATSP “Bước đang xem”

Chuyển/adapt narrative của `AtspTrace` sang Explain. Metrics giữ outcome/effort; có link “Giải thích mốc đang xem”.

| Event | Evidence mặc định |
|---|---|
| `held_karp_update` | subset, predecessor→endpoint, candidate vs previous/new cost |
| `held_karp_reconstruct` | reconstructed order và objective |
| `nn_decision` | current, selected directed cost, runner-up gap, candidate count |
| `local_improvement` | move type, before/after order, `after_cost - before_cost` có dấu, rejected count |
| `sa_seed_boundary` | seed, iteration, current vs best |
| `sa_iteration` | Δ, T, p, accepted/rejected, resulting vs best-so-far |
| `sa_final_best` | best seed, best/mean/std, final order |
| `optimization_summary` | final order/objective, open/closed |

Sampling:

- Gọi “Mốc hiển thị k/N”, không “bước liên tiếp”.
- Hiển thị original `ordinal`.
- Nói rõ có thể có events không được gửi giữa hai mốc.
- Không so `recorded_events`/`total_events` như generic effort giữa methods.
- Raw JSON chuyển thành disclosure cấp hai; trước đó có semantic field table với nhãn/đơn vị.

### 30.22. Giải thích vì sao ATSP order thay đổi

Dùng planned `original_order_legs` và optimized `legs` để derive:

- directed arcs bị bỏ;
- directed arcs được thêm;
- baseline leg có objective lớn nhất;
- optimized leg có objective lớn nhất;
- top 1–3 arc changes theo signed `new_arc_cost - old_arc_cost`.

Copy:

> Thứ tự mới bỏ leg B → C và thêm B → D, D → C. Đây là mô tả chênh lệch giữa hai thứ tự, không phải lời kể rằng optimizer “suy nghĩ bằng lời” như vậy.

Phân biệt:

~~~text
Savings = so với đúng input order
Optimality gap = so với exact solution/lower bound hợp lệ
~~~

NN/SA giảm 20% so với input **không** có nghĩa gap 20%.

Không có Held–Karp:

> Tốt nhất trong các phương pháp đang hiển thị; chưa có nghiệm exact để đo global gap.

### 30.23. Giải thích comparison

#### Per-result

- Mỗi pane có “Xem giải thích”.
- Subject = session ID + result ID.
- Explain header cho phép đổi focused result bằng list/combobox, giữ card order.
- Error B không hiển thị prose A.
- Một result failure không xóa explanation success khác.

#### Cross-result insights

Pure function `buildRouteComparisonInsights(session)` / `buildAtspComparisonInsights(session)` chỉ chạy nếu snapshot/fingerprint đồng nhất.

Route insights:

- Objective ranking.
- Path overlap/first divergence.
- Exact gap nếu có exact reference.
- Search effort difference.
- Guarantee difference.
- Same cost/different path → có nhiều route đồng objective; không nói unique.
- Non-optimal algorithm trùng exact trong run này vẫn giữ “không có guarantee”.
- Runtime phrase “trong lần chạy này”; không causal-infer runtime chỉ từ expanded count.

Integrity guard:

- UCS/A*/Bidi exact success trên cùng snapshot phải đồng cost trong tolerance.
- Nếu disagree: hiện contract-integrity warning, tắt winner/causal explanation, không coi như ordinary rank.
- IDA* ε-bounded không làm exact reference trừ khi contract riêng xác nhận ε=0 và điều kiện exact.

ATSP insights:

- Held–Karp success là exact reference.
- Không Held–Karp → “best displayed”.
- Baseline order không phải method/exact proof.
- Không so raw event count.
- Runtime chỉ so khi execution policy/snapshot giống nhau.

### 30.24. Copy contract và forbidden claims

#### Câu bắt buộc

- “Tuyến tham chiếu được hệ thống tính thêm sau khi chạy”.
- “Theo hồ sơ khung giờ đại diện…, không phải giao thông trực tiếp”.
- “Trong graph/view/mode/slot/scenario hiện tại”.
- “Chi phí cân bằng … phút quy đổi”.
- “Không bảo đảm lý thuyết; trong lần chạy này…”.
- “Chưa tìm thấy” khi inconclusive.

#### Câu cấm nếu không có evidence

- “Thuật toán đã xét/bị loại tuyến này”.
- “Thời gian thuần” trỏ vào `total_time_s`.
- “Tối ưu tuyệt đối”.
- “Gần tối ưu” không có exact/lower bound.
- “Savings X% nghĩa là còn cách optimum X%”.
- “Không tồn tại đường” khi termination inconclusive.
- “Congestion/risk khiến chọn tuyến” ở mode không dùng factor đó.
- “Giao thông hiện tại/realtime”.
- “Path tối ưu duy nhất”.
- “Runtime nhanh hơn vì expand ít hơn” nếu chỉ quan sát correlation.
- “Toàn bộ diễn biến” khi trace sampled/truncated.

Mọi dynamic claim phải truy được tới:

- typed field;
- algorithm invariant đã ghi trong schema;
- hoặc deterministic relation được pure test.

### 30.25. Copy examples

A* balanced:

> A* tìm được tuyến có chi phí cân bằng thấp nhất trong cấu hình này. Chi phí cân bằng gồm thời gian theo hồ sơ ùn tắc và phạt rủi ro; đây không phải ETA giao thông trực tiếp.

Greedy:

> Greedy tìm được một tuyến hợp lệ bằng cách ưu tiên heuristic nhỏ nhất. Thuật toán không bảo đảm tối ưu; tuyến exact reference được tính sau thấp hơn 8,2% trong lần chạy này.

Distance:

> Tuyến được chọn theo quãng đường. Các đoạn ùn tắc bên dưới chỉ là bối cảnh và không ảnh hưởng objective Ngắn nhất.

Time:

> Tuyến được chọn theo thời gian di chuyển ước tính từ tốc độ và hồ sơ ùn tắc. Risk penalties không được cộng vào objective Nhanh nhất.

Beam no-path:

> Beam Search với k=5 chưa tìm thấy tuyến. Vì các ứng viên ngoài beam đã bị cắt, kết quả này không chứng minh graph không có đường.

Ordered multi:

> A* tìm đường riêng cho 4 chặng theo thứ tự đã khóa. Mỗi chặng có bảo đảm tối ưu, nhưng thứ tự giao hàng chưa được tối ưu.

Held–Karp:

> Held–Karp tìm visiting order có objective nhỏ nhất trên directed cost matrix của 8 điểm trong snapshot này. Đây là open tour nên không cộng chặng quay về Đi.

NN/SA:

> Giảm 12,4% so với thứ tự nhập. Đây là nghiệm heuristic; chưa có exact reference để kết luận khoảng cách tới global optimum.

ATSP matrix failure:

> Không dựng được ma trận chi phí đầy đủ vì A → B không reachable trong graph có hướng hiện tại. Optimizer chưa bắt đầu.

### 30.26. Loading, error và dynamic states

Explanation router phải nhận explicit request status:

~~~text
idle
queued
running
success
no_path
error
cancelled
stale
~~~

Behavior:

- Route running: “Đang tìm đường…” + immutable config; không hiện “Chưa có giải thích”.
- ATSP running: “Đang dựng ma trận và tối ưu…”; không bịa percentage.
- Error: persistent alert + Retry; toast chỉ phụ.
- Cancelled/stale: không flash narrative cũ.
- Contract incomplete: persistent contract alert; không render null thành 0.
- Success updates content không cướp focus.
- No-path có verdict typed.

### 30.27. Timeline, motion và live regions

Opening Explain:

- Pause autoplay có chủ đích để nội dung đứng yên và đọc được.
- Giữ `stepIdx`.
- Hiển thị status ngắn “Đã tạm dừng để đọc giải thích”.
- Không tự refit camera.
- User có thể bấm Play lại.

Không đặt `aria-live` quanh toàn bộ current-step narrative. Khi autoplay chạy, điều đó sẽ spam screen reader.

Policy:

- Manual Previous/Next: có thể announce polite, atomic: “Bước 12, mở rộng X”.
- Autoplay: không announce mỗi frame.
- Loading/completion/error có status/alert riêng.
- Không move focus theo step.
- Reduced motion giữ autoplay disabled, static state đầy đủ.

### 30.28. Semantic HTML và accessibility

Heading tree:

- h2: Drawer “Kết quả”.
- h3: “Giải thích kết quả”, “Kết luận”, “Bước đang xem”, “Điều tạo nên chi phí”, “Tuyến tham chiếu”.
- h4: individual reference/detail khi cần.

Component rules:

- `<section aria-labelledby>` cho section.
- `<dl>` cho term/value breakdown.
- `<ul>/<ol>` cho factor/reference/legs.
- Native `<table>` cho frontier/candidates.
- `CardTitle` không được chỉ là styled div nếu nó biểu diễn heading; dùng heading thật hoặc `asChild` có kiểm soát.
- Native `<details>` được giữ; summary target >=40 px và focus visible.
- Full names wrap.
- Không horizontal scroll cho prose.
- Bảng hai chiều nằm trong named focusable scroll region.

Primary references:

- Structure/relationships: [WCAG 2.2 — Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html).
- Descriptive headings: [WCAG 2.2 — Headings and Labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html).
- Reflow: [WCAG 2.2 — Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Non-color cues: [WCAG 2.2 — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).
- Dynamic status: [WCAG 2.2 — Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
- Auto-updating/motion: [WCAG 2.2 — Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- Disclosure semantics: [WAI-ARIA APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) và [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).

Không tuyên bố WCAG/browser pass chỉ từ source.

### 30.29. Responsive

1366×768:

- Subject + verdict + limitation thấy trong first viewport của drawer.
- Step card không bị sticky tabs che.
- Overlay legend không che timeline.

1024×768:

- Drawer overlay.
- Explanation scroll riêng.
- Map action có đường quay lại.

390×844 và 320px:

- Một cột.
- Before→after/delta stack thành nhiều dòng.
- Không `whitespace-nowrap` cho số dài.
- Street/landmark wrap.
- Core body >=14px/line-height khoảng 1,5; metadata có thể 12px.
- Không horizontal panel/page scroll.
- Sticky header không che focus.

Comparison:

- Chỉ explanation của focused pane trong drawer.
- Không dựng N narrative columns nhỏ cạnh N maps.

### 30.30. Backend implementation map

| File | Thay đổi |
|---|---|
| `docs/SCHEMA.md` | Explanation v2, verdict/termination, breakdown, factors, references, TraceStep decision, ATSP matrix/failure/method stats |
| `backend/app/models.py` | Strict additive models và cross-field validators |
| `backend/app/costs.py` | Giữ công thức nguồn; không duplicate |
| `backend/app/graph_store.py` | Helper aggregate path breakdown |
| `backend/app/explain.py` | Dựng facts; sửa time semantics/provenance; legacy prose từ cùng facts |
| `backend/app/search.py` | Termination + decision facts BFS/DFS/IDDFS/UCS/A* |
| `backend/app/search_advanced.py` | Decision facts Greedy/Bidi/IDA*/Beam |
| `backend/app/tsp.py` | Typed unreachable pair, method stats, matrix/asymmetry evidence |
| `backend/app/main.py` | Truyền endpoints/context và serialize v2 |
| `scripts/00_generate_mock.py` | Update source fixtures, không hand-edit generated mock |

Pydantic validation:

- all floats finite;
- nonnegative breakdown/counters;
- identities trong tolerance;
- edge IDs/path membership;
- objective mapping by mode;
- reference signed trade-off/relation và exact gap;
- guaranteed result không có better exact reference;
- decision required fields theo rule nếu present;
- new producer emits v2; legacy parse vẫn allowed.

### 30.31. Frontend implementation map

Core:

- `frontend/lib/types.ts`.
- `frontend/lib/store.ts`.
- `frontend/lib/sequential-route.ts`.
- `frontend/lib/metric-presentation.ts`.
- `frontend/lib/algorithm-policy.ts`.
- `frontend/lib/atsp-event-copy.ts`.
- Mới: `frontend/lib/explanation-policy.ts`.
- Mới: `frontend/lib/search-step-explanation.ts`.
- Mới: `frontend/lib/comparison-insights.ts`.

Components:

- `frontend/components/drawer/explain-tab.tsx` → thin router.
- `frontend/components/drawer/metrics-tab.tsx` → outcome/effort; link step explanation.
- `frontend/components/ghf-table.tsx` → reusable inside step section.
- `frontend/components/explanation/atsp-explanation.tsx` → run-specific.
- `frontend/components/atsp/atsp-trace.tsx` → reusable step presenter, raw JSON secondary.
- `frontend/components/drawer/compare-tab.tsx` → không link mơ hồ.
- `frontend/components/map-view.tsx` → overlay/factor layers.
- `frontend/components/legend.tsx` → reference/factor patterns.
- `frontend/components/ui/card.tsx` → optional semantic heading support, không đổi global tag bừa.

Đề xuất components mới:

~~~text
frontend/components/explanation/
├── explanation-router.tsx
├── result-context-strip.tsx
├── verdict.tsx
├── search-step.tsx
├── cost-breakdown.tsx
├── factor-list.tsx
├── reference-routes.tsx
├── algorithm-guide.tsx
├── sequential-explanation.tsx
├── explanation-loading.tsx
└── explanation-error.tsx
~~~

Không bắt buộc đúng tên, nhưng trách nhiệm phải tách để `ExplainTab` không thành một component khổng lồ mới.

### 30.32. Ánh xạ workstream Giải thích vào phase chính

§19 là lộ trình/gate **duy nhất**. Không tạo hệ phase E0–E6 song song. Bảng này chỉ
giúp tìm phần Explain trong mỗi phase, không được thay đổi thứ tự hoặc gate §19:

| Phase §19 | Phần Giải thích đi kèm | Gate liên quan |
|---|---|---|
| 0 | Sửa copy sai đã biết; khóa vocabulary/IA/schema/design | Không claim dựa sai legacy field |
| 1 | Breakdown, reference provenance, termination/decision, ATSP facts | Ba mode và producer validators pass |
| 2 | Subject/overlay/view-model/presenter/fallback | Không parse prose hoặc suy selected score |
| 3 | Single/ordered/ATSP explanation states | First viewport đúng subject/objective/limitation |
| 4–5 | Bidi evidence và prop-driven map overlays | ID/textual equivalent/keyboard path đúng |
| 6–7 | Per-result route/ATSP comparison insights | Savings/gap tách biệt; result B không đọc A |
| 8 | Browser/a11y/performance/legacy cleanup | Toàn bộ §24 và §25 đạt |

Truthfulness correction sớm chỉ ngăn copy sai trong rollout; structured v2 vẫn là
đích hoàn tất bắt buộc.

### 30.33. Fixture backend chuyên biệt cho Giải thích

Đây là phần phân rã của master test plan §20, không phải bộ expected semantics thứ
hai. Nếu cách gọi dưới đây khác §20/`SCHEMA.md` §F, nguồn master thắng.

Cost correctness:

- Breakdown identities.
- Distance/time/balanced objective mapping.
- Time fixture có `total_cost != total_time_s`.
- Risk excluded khỏi time objective.
- Congestion/risk excluded khỏi distance.
- Scenario override phản ánh breakdown.
- Narrow alley không bị bỏ.

References:

- Same OD/directed path valid.
- Totals và breakdown khớp path.
- Posthoc provenance.
- Signed reference trade-off/relation và exact gap đúng tolerance/zero denominator.
- Không fabricate nếu chỉ một path.
- Exact guaranteed conflict thành failure.
- Deterministic IDs/order.

Termination:

- 9 algorithms found.
- Start=Goal.
- Frontier exhausted proven.
- IDDFS depth cap.
- IDA* exhaustive vs round cap.
- Beam pruning inconclusive.
- Bidi unreachable proof.

Decision:

- Required fields per rule.
- Expanded scores trước relaxation.
- Effective runner-up, no stale heap.
- Counts nonnegative.
- IDDFS depth/limit.
- IDA round/bound.
- Beam layer/k/pruned.
- Bidi side/top/μ and frontier invariant.
- Trace cap/full metrics unchanged.
- Trace off no decision overhead.

ATSP:

- Directed unreachable pair.
- Optimizer not started on matrix incomplete.
- Three methods open/closed.
- Method stats full-run and trace-independent.
- SA deterministic seeds.
- Matrix evidence counts/asymmetry example deterministic và đúng active-mode unit.

Legacy:

- Old Explanation parses.
- Legacy fields generated from same v2 facts.
- Mock generator output validates.

### 30.34. Fixture frontend chuyên biệt cho Giải thích

Đây là phần phân rã của master test plan §21; không định nghĩa policy khác §21.

Pure presenters:

- All nine algorithm verdicts.
- All termination outcomes.
- All selection rules.
- Missing decision fallback.
- Null never becomes 0.
- Distance/time/balanced factor inclusion.
- `total_time_s` never labelled pure time.
- Reference caption/provenance.
- Forbidden phrases absent.
- Exact/epsilon/feasible/inconclusive labels.
- Sampling/truncation wording.

State:

- Subject binding.
- Overlay lifecycle.
- Wrong/missing result ID.
- New run clears.
- Tab leave hides.
- Compare failure B still explains B.
- Retry/stale/cancel.

Sequential:

- Per-leg explanation preserved.
- Fixed-order guarantee.
- Failed leg default.
- Closing leg label.
- Aggregate factor attribution.

ATSP:

- Three methods.
- Open/closed.
- Positive/zero/negative savings.
- Savings ≠ gap.
- SA stats.
- All event kinds.
- Ordinal gaps called sampled milestones.
- Matrix failure pair.

Comparison:

- Same snapshot guard.
- Exact methods agree.
- Integrity warning on disagreement.
- Same cost/different path.
- Nonoptimal matches exact without upgraded guarantee.
- Best-displayed without Held–Karp.

### 30.35. Browser stories chuyên biệt cho Giải thích

Các story này bổ sung browser matrix §22; pass/fail và viewport chuẩn vẫn lấy từ
§22/§24, không từ một checklist độc lập.

Stories:

1. A* balanced: verdict, breakdown, f-step, exact scope.
2. Greedy same OD: feasible, exact reference gap.
3. Beam no-path inconclusive.
4. IDA* ε found.
5. IDA* round cap.
6. Bidi two-frontier step.
7. Distance with congestion level 5 marked context-only.
8. Time with risk marked excluded.
9. Ordered multi success/per-leg.
10. Ordered multi middle failure.
11. Ordered return leg.
12. Held–Karp open/closed.
13. NN savings without near-optimal claim.
14. SA sampled event/best seed.
15. ATSP matrix incomplete.
16. Route compare 2–4, explanation each pane.
17. ATSP compare with/without exact reference.
18. Trace truncated.
19. Legacy fallback.
20. Loading/error/retry/stale.

Viewports:

- 1366×768.
- 1024×768.
- 390×844.
- 320 CSS px.
- 200% và, nếu feasible, 400% zoom equivalent.

Interactions:

- keyboard only;
- map handoff/back;
- focus restore;
- manual/autoplay timeline;
- reduced motion;
- NVDA + Chromium;
- long Vietnamese names;
- 0/1/2 references;
- 0/many factors;
- all themes;
- console/network clean.

### 30.36. Đối chiếu acceptance

Không có acceptance checklist riêng ở mục 30. Toàn bộ điều kiện Giải thích đã
được hợp nhất vào §24.10, còn numeric/compatibility/a11y dùng §24.8–§24.9. Các
browser stories §30.35 chỉ là cách thu evidence cho checklist normative đó.

### 30.37. Rủi ro riêng của Giải thích

Các dòng này bổ sung risk register/rollback tổng thể §26 và §16.7; chúng không
được nới compatibility matrix hoặc Definition of Done.

| Rủi ro | Mitigation | Fallback |
|---|---|---|
| Explanation v2 quá lớn | Facts/codes, omit nulls, max 2 refs, payload profiling | Legacy summary + verdict subset |
| Decision trace làm chậm | Recorder-active gate, numeric compact fields | Generic safe step fallback |
| Backend/frontend copy drift | Typed enum exhaustive mapping + schema tests | Contract error, không guess |
| Reference contradict exact result | Integrity validator/warning | Ẩn reference claim, giữ raw metrics |
| Map overlay che route | Pattern/halo/layer order QA | Text-only evidence, không sai semantics |
| Auto-updating text gây distraction | Pause on Explain, no live autoplay | Manual step only |
| Legacy/new dual truth kéo dài | V2 primary, legacy generated cùng facts, removal milestone | Roll back UI v2 qua capability check |
| Scope quá lớn | Vertical slices nằm trong Phase 0–8 và gate §19 | Ship truthfulness correction trước, không claim complete |

### 30.38. Điểm kết thúc

Không có Definition of Done bổ sung. §25 là DoD duy nhất và đã chứa đầy đủ điều
kiện structured evidence, per-step facts, ordered multi, ATSP, comparison,
provenance, map/text accessibility, automated tests và browser QA.
