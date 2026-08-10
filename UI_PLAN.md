# UI_PLAN.md — Kế hoạch cải thiện UI/UX cho Lab1_Searching

> **Loại tài liệu:** kế hoạch triển khai kèm checklist và bằng chứng thực thi.
> Kế hoạch gốc được lập trước khi code; đến 2026-08-08 toàn bộ phase, stop gate,
> acceptance criteria và Definition of Done đã hoàn tất theo evidence cuối file.
>
> **Phân biệt hệ phase:** “Phase 5/6” trong file này thuộc lượt **UI Clarity
> lịch sử** (ATSP trace/scenario editor), không phải Phase 5 map extraction và
> Phase 6 route comparison 2–4 của `UI_caithien.md`. Trạng thái UI & Explanation
> v2 hiện hành xem `docs/UI-V2-PHASE5-READINESS.md`,
> `docs/UI-V2-PHASE6-READINESS.md` và `docs/DESIGN.md` §13. Các mô tả compare
> A/B trong thân file được giữ làm bằng chứng lịch sử, không phải UX hiện hành.
>
> **Mốc lập kế hoạch:** 2026-08-07 (Asia/Saigon), sau checkpoint đã push
> `98a82b2` (`Audit documentation and refresh project handoff`) trên `main`.
>
> **Frontend hiện hành:** chỉ `frontend/`. Không dùng, khôi phục hoặc tạo lại
> `frontend1/`.
>
> **Route-catalog delta 2026-08-08:** các câu “10 thuật toán” trong thân plan mô
> tả catalog tại lúc thực hiện UI Clarity. Sản phẩm hiện còn 9 thuật toán route;
> Dijkstra một chiều đã bị loại, Bidirectional Dijkstra vẫn được giữ.
>
> **Định hướng đã chọn:** **UI Clarity Phase** — làm giao diện rõ chữ, rõ nghĩa,
> rõ thứ tự thao tác và rõ tuyến; không rebrand sản phẩm, không mở thêm feature
> backend và không thay data/benchmark.
>
> **Trạng thái checklist:** các mục đã đánh dấu chỉ dựa trên test/browser evidence.
> Polish sau freeze đã rút gọn tên thuật toán, chuẩn hoá km/phút, đồng nhất nhãn
> hành trình và đặt hai metric chính cạnh nhau trên desktop.

---

## 0. Lệnh giao việc cho coding agent

Coding agent nhận file này phải:

1. đọc toàn bộ `AGENTS.md` và `UI_PLAN.md` trước khi sửa;
2. đọc các nguồn bắt buộc ở mục 2.1;
3. chạy preflight và baseline ở mục 4;
4. triển khai lần lượt theo các phase, không nhảy thẳng sang polish;
5. giữ nguyên backend/API/schema/data/search semantics;
6. dùng browser thật để kiểm các claim về layout, focus, keyboard, map, theme,
   motion và responsive;
7. chỉ cập nhật ảnh README sau khi UI đã freeze và toàn bộ acceptance gate đạt;
8. không commit/push nếu người dùng chưa yêu cầu riêng ở lượt triển khai.

Nếu môi trường có skills phù hợp, dùng theo thứ tự:

1. `frontend-design` cho thay đổi visual/material UI đã được file này ủy quyền;
2. `web-design-guidelines` cho accessibility/responsive audit;
3. `nextjs-app-router-patterns` nếu thay đổi boundary App Router;
4. `playwright` cho runtime/browser QA.

Không cài một “design system generator” để tạo nguồn chuẩn cạnh tranh. Nếu dùng
`ui-ux-pro-max-skill`, chỉ dùng như công cụ tra cứu/ý tưởng cục bộ; quyết định chấp
nhận phải được ghi vào `docs/DESIGN.md`, không chạy chế độ `--persist` để sinh một
`design-system/MASTER.md` thứ hai.

---

## 1. Mục tiêu, người dùng và Definition of Success

### 1.1. Mục tiêu sản phẩm

Sau phase này, một người lần đầu mở app phải làm được bốn việc mà không cần đọc
README trước:

1. chọn bối cảnh, điểm Đi, điểm Đến, thuật toán và tiêu chí;
2. chạy tuyến và hiểu ngay tuyến nào được chọn, chi phí/đơn vị là gì;
3. phát từng bước để phân biệt node đang chờ xét, đã duyệt và tuyến cuối;
4. thêm nhiều điểm, tối ưu thứ tự ghé và hiểu kết quả là tối ưu tuyệt đối hay xấp
   xỉ.

Một thành viên quay video phải có thể chỉ vào màn hình và giải thích đúng các mục
rubric: start/goal, expansion order, frontier/open list, `g/h/f`, route, distance,
time, cost, runtime, congestion, guarantee, alternative và ATSP order.

### 1.2. Nhóm người dùng chính

| Người dùng | Nhu cầu | UI phải ưu tiên |
|---|---|---|
| Giảng viên/người chấm | Hiểu nhanh app làm gì và bằng chứng thuật toán ở đâu | Kết quả và guarantee nổi bật, trace dễ đọc, không cần giải mã jargon |
| Thành viên demo/video | Luồng thao tác ổn định, chữ đọc được trên máy chiếu | Bố cục 1366×768, nút rõ, timeline không che map, trạng thái không nhảy |
| Người mới học search | Hiểu `g/h/f`, frontier, expanded và optimality | Tiếng Việt trước, giải thích tại chỗ, raw detail ở lớp thứ hai |
| Người kiểm kỹ thuật | Xem được ID, event kind, fingerprint và provenance | `<details>` kỹ thuật có cấu trúc, copy được, không chiếm primary UI |

### 1.3. Success metrics bắt buộc

- [x] Hai luồng chính — route hai điểm và ATSP — hoàn tất được bằng chuột và chỉ
      bằng bàn phím.
- [x] Ở 1366×768, không cần zoom trình duyệt nhỏ hơn 100%; CTA chạy, map và phần
      tóm tắt kết quả vẫn nhìn thấy được.
- [x] Ở 1024×768, không có rail nào ép map thành một dải không dùng được; panel kết
      quả có thể mở/đóng mà không mất focus.
- [x] Ở 390×844, phần điều khiển và kết quả không tạo horizontal page scroll; bản
      đồ vẫn dùng được, còn nội dung ngoài map reflow theo một cột.
- [x] Ở 200% zoom trên viewport desktop hợp lý, không mất chức năng hoặc nội dung
      chính; map là vùng hai chiều được phép giữ layout riêng.
- [x] Không còn chữ hiển thị chính 9 px; chữ hướng dẫn/interactive không nhỏ hơn
      12 px. Ngoại lệ hẹp: attribution bản đồ và raw hash nằm trong chi tiết kỹ
      thuật, vẫn phải đọc được và không chứa hành động.
- [x] Không còn raw English làm nhãn chính, trừ tên thuật toán/ký hiệu chuẩn như
      A*, BFS, ATSP, Held–Karp, `g/h/f`, 2-opt, Or-opt và Simulated Annealing.
- [x] Mọi thuật ngữ còn lại có nhãn Việt trước; thuật ngữ kỹ thuật nằm trong ngoặc
      hoặc chi tiết mở rộng.
- [x] Kết quả route trả lời được trong vùng đầu: tìm thấy hay không, tuyến/điểm,
      tiêu chí, tổng chi phí đúng đơn vị, thời gian, quãng đường và guarantee.
- [x] Kết quả ATSP trả lời được: thứ tự nhập, thứ tự sau tối ưu, mức thay đổi chi
      phí, method và guarantee.
- [x] Không dựa riêng vào màu để phân biệt Đi/Đến, route A/B, success/warning hoặc
      trace states.
- [x] Cả bảy theme dùng cùng hierarchy, không theme nào làm ẩn chữ/focus/route.
- [x] `prefers-reduced-motion: reduce` dừng autoplay và loại motion không thiết
      yếu nhưng không làm mất tuyến/trạng thái.
- [x] Không thay đổi request/response, cost, graph, algorithm, ATSP, trace cap,
      scenario semantics hoặc số liệu data.
- [x] Không thêm production dependency nếu có thể hoàn thành bằng stack hiện có.

### 1.4. Câu chốt thiết kế

> **Rõ chữ — rõ nghĩa — rõ thứ tự — rõ tuyến.**

Mọi thay đổi không giúp ít nhất một trong bốn vế trên phải bị loại khỏi phase.

### 1.5. Phương án đã cân nhắc

| Phương án | Phạm vi | Quyết định |
|---|---|---|
| **Clarity-first refinement** | Giữ feature/brand/theme, sửa copy, typography, hierarchy, disclosure, responsive và accessibility | **Chọn** — tác động trực tiếp tới rubric và video, rủi ro contract thấp nhất |
| Full visual rebrand | Đổi nhận diện, layout, palette và component system | Không chọn — tốn QA bảy theme, dễ làm mất bằng chứng thuật toán, không tăng điểm tương xứng |
| Copy-only patch | Chỉ dịch English và tăng vài font size | Không chọn làm phương án cuối — không giải quyết ba cột hẹp, provenance density, ATSP trace hierarchy và map focus |

Giả định đã khóa: desktop/máy chiếu 1366×768 là mục tiêu chính; 1024×768 và
390×844 là quality floor; backend/data contract không đổi; seven-theme support
được giữ. Không còn product decision nào bắt buộc hỏi lại trước khi bắt đầu.
Lựa chọn kỹ thuật nhỏ như native modal sheet hay non-modal overlay được phép quyết
định bằng evidence browser, miễn đáp ứng semantics/focus/rollback trong kế hoạch và
không thêm dependency ngoài nhu cầu.

---

## 2. Nguồn chuẩn, bằng chứng và ranh giới

### 2.1. Bắt buộc đọc trước khi code

Theo đúng thứ tự:

1. `AGENTS.md`;
2. `docs/Lab 1 - Searching.pdf`, đặc biệt §4.7, §4.8, §4.10 và §5;
3. `docs/Lab1-ChotPhuongAn.md`;
4. `docs/SCHEMA.md`;
5. `docs/DESIGN.md`;
6. `README.md`;
7. `mustTODO.md`, nhất là quy tắc freeze UI và chuỗi việc sau UI;
8. `frontend/package.json`, `frontend/app/`, `frontend/components/`,
   `frontend/lib/store.ts`, `frontend/lib/types.ts` và `frontend/tests/`;
9. code backend/schema chỉ để bảo toàn contract khi cần xác minh, không để sửa.

### 2.2. Yêu cầu đề gốc mà UI phải phục vụ trực tiếp

Đề yêu cầu GUI:

- hiển thị graph/city map/road network;
- cho chọn start, destination, intermediate locations, algorithm và optimization
  criterion;
- trực quan từng bước visited/frontier/final route;
- hiển thị path, visiting order, explored nodes, distance, estimated time, route
  cost, processing time và congestion explanation;
- giải thích vì sao tuyến tối ưu/gần tối ưu, alternative và guarantee.

Hai hạng mục rubric liên quan trực tiếp chiếm 20 điểm:

- GUI + visualization of search process: 10 điểm;
- route explanation + comparison of alternatives: 10 điểm.

Video còn yêu cầu expansion order, frontier/open list, cost values, heuristic
values và cách tạo final route. Vì vậy kế hoạch ưu tiên khả năng **giảng được trên
màn hình**, không chỉ độ bóng bẩy của screenshot.

### 2.3. Current implementation phải giữ nguyên

- Next.js `15.5.22`, React `19.2.8`, TypeScript `5.9.3`, Tailwind `3.4.19`.
- Active app ở `frontend/`; route chính `/`, route đọc benchmark `/benchmark`.
- 10 thuật toán route và 3 ATSP method hiện hành.
- `G_demo` 51 node/298 directed edge/60 one-way; `G_real` 2.118/4.699.
- Graph view `full` hoặc `teach_3`…`teach_50`; UI nhập 3…51, 51 → `full`.
- Bốn slot 07:30/12:00/17:30/22:00; ba mode distance/time/balanced.
- Route trace và optimization trace là hai nguồn khác shape nhưng chia sẻ player.
- Scenario override chỉ sống trong memory, request-scoped, không sửa data gốc.
- `/benchmark` chỉ đọc artifact stale và phải giữ cảnh báo `SỐ TẠM`.
- Bảy theme và font Be Vietnam Pro/JetBrains Mono hiện có.

### 2.4. Ngoài phạm vi tuyệt đối

Không thực hiện trong UI phase:

- sửa backend search/TSP/cost/schema để tiện UI;
- đổi API, enum, trace contract, guarantee hoặc unit;
- crawl OSM/TomTom, rebuild graph/profile hoặc sửa `data/`;
- chạy benchmark, gamma calibration hoặc teaching generator;
- sửa `results/` hoặc gỡ bất kỳ banner `SỐ TẠM` nào;
- thêm thuật toán, method ATSP, theme, realtime traffic, auth, database hoặc map
  provider mới;
- thay branding, logo, tên project hoặc làm landing page marketing;
- tạo lại `frontend1/`;
- commit/push/branch nếu không có yêu cầu riêng.

Nếu một ý UI đòi backend/data contract mới, coding agent phải dừng phần đó, ghi
`BLOCKED BY CONTRACT` và báo người dùng; không tự mở rộng scope.

---

## 3. Audit UI hiện tại và vấn đề cần giải quyết

### 3.1. Điểm mạnh phải bảo toàn

- UI đã bao phủ rất đầy đủ rubric: route, trace, `g/h/f`, compare, explanation,
  ATSP, sandbox, benchmark, offline và seven-theme picker.
- Map là trung tâm; route có casing, mũi tên hướng và timeline.
- Drawer đã tách Số liệu/Giải thích/So sánh/Thử nghiệm.
- Có loading/empty/error states ở nhiều luồng.
- Radix primitives, accessible names, focus ring và reduced-motion baseline đã có.
- `fmtVi` giữ format số/đơn vị tiếng Việt nhất quán.
- Dữ liệu kỹ thuật phong phú, phù hợp bảo vệ đồ án.

Phase mới không được làm mất các điểm này để đổi lấy một UI “tối giản” nhưng thiếu
bằng chứng thuật toán.

### 3.2. Vấn đề P0 — phải xử lý trước polish

| Vấn đề | Evidence hiện tại | Ảnh hưởng |
|---|---|---|
| Chữ quá nhỏ và mật độ cao | 4 lần `text-[9px]`, 28 lần `text-[10px]`, 68 lần `text-[11px]` trong source frontend | Khó đọc ở 1366×768/máy chiếu; thông tin quan trọng bị xem như metadata |
| Primary UI trộn Việt/Anh/raw enum | `Frontier`, `Đã expand`, `Runtime`, `event`, `current`, `candidate`, `best-so-far`, `Original → current`, `Provenance`, `Fingerprint`, `Distance/Time/Balanced` | Người mới phải tự dịch trước khi hiểu thuật toán |
| ATSP trace phô payload kỹ thuật | `atsp-trace.tsx` hiển thị raw `event.kind`, node ID, seed, candidate và probability ngay lớp chính | Che mất câu chuyện “đang làm gì và vì sao tốt hơn” |
| Provenance/hash chiếm vùng đầu kết quả | metrics/ATSP/scenario in full fingerprint và raw provenance | Đẩy outcome chính xuống, gây nhiễu khi demo |
| Responsive chưa phải layout hẹp thật | shell luôn ba cột; mốc 900 px chỉ đổi rail 320/400 thành 280 | Ở tablet/mobile map bị bó hẹp và nội dung khó reflow |
| Hợp đồng visual mâu thuẫn implementation | `docs/DESIGN.md` cấm gradient nhưng `globals.css` dùng nhiều `radial-gradient`/`linear-gradient` và class `pastel-*` | Agent sau không biết contract hay code thắng; style khó duy trì |

### 3.3. Vấn đề P1 — ảnh hưởng khả năng hiểu luồng

- Tất cả section control mở mặc định; `Trọng số cạnh` và tuỳ chọn nâng cao tranh
  diện tích với hành trình chính.
- Bối cảnh, hành trình, thuật toán và ATSP cùng xuất hiện với visual weight gần
  nhau; CTA chính có thay label nhưng luồng quyết định chưa đủ rõ.
- Drawer cho thấy nhiều metrics cùng mức nhấn; outcome, effort và technical
  provenance chưa có ba tầng hierarchy dứt khoát.
- `g/h/f` có chú thích nhưng từ “node/frontier/expand” vẫn cần người dùng biết sẵn.
- Legend trộn ngôn ngữ và có metadata 9–10 px.
- Graph full 51 node/298 cạnh tạo hairball; khi có route, base graph vẫn hút mắt.
- Scenario có hai mức editor nhưng nhãn `Sandbox`, `Original/current`, `t_free`,
  `Factor` và ba tên cost chưa thân thiện.
- Timeline ATSP lộ raw method/event/ordinal trong vùng ngang vốn đã chật.
- Tooltip đang gánh một số giải thích quan trọng; nội dung bắt buộc để hoàn tất
  task phải luôn thấy, không được chỉ tồn tại khi hover.

### 3.4. Vấn đề P2 — polish sau khi clarity đạt

- Bảy theme tạo chi phí QA lớn; phải đồng nhất hierarchy thay vì thêm palette.
- Header decorative sparkle/heart và gradient không đóng góp cho task clarity.
- Border/radius/shadow lặp nhiều làm rail giống tập card ngang hàng.
- `/benchmark` tương đối ổn nhưng vẫn còn thuật ngữ `runtime/node expand` và cần
  reflow/chart/table QA trên viewport hẹp.

---

## 4. Phase 0 — Preflight, baseline và thiết kế trước code

### 4.1. Bảo toàn worktree

Chạy từ repo root:

```powershell
git status --short --branch
git rev-parse HEAD
git log -1 --oneline
git diff -- frontend docs/DESIGN.md README.md
```

Điều kiện:

- [x] Ghi nhận mọi thay đổi có sẵn của người dùng.
- [x] Không reset/revert/overwrite file đang đổi.
- [x] Nếu `UI_PLAN.md` hoặc `docs/DESIGN.md` đã được người dùng sửa thêm, đọc diff
      và hợp nhất ý định; không chép đè file.

### 4.2. Baseline kỹ thuật

Từ `frontend/`:

```powershell
npm test
npx tsc --noEmit
```

Chỉ chạy `npm run build` khi không có Next dev server ghi `.next`.

Baseline browser phải ghi rõ browser/viewport/theme và chụp vào thư mục ignored
`tmp/` hoặc `audit_tmp/`, không thay ảnh README:

- `/`, 1366×768, theme Đen, A* route result;
- `/`, 1366×768, theme Trắng, Held–Karp result + optimization trace;
- `/`, 1024×768, trạng thái ban đầu;
- `/`, 390×844, trạng thái ban đầu;
- `/benchmark`, 1366×768 và 390×844.

Không gọi baseline là pass responsive nếu chỉ có screenshot desktop.

### 4.3. Cập nhật contract trước visual implementation

`docs/DESIGN.md` là UI design intent. Trước khi sửa CSS/component, thêm một section
phiên bản mới, ví dụ `UI Clarity Phase 2026-08-07`, ghi các quyết định đã khóa trong
file này.

Quyết định bắt buộc về mâu thuẫn gradient:

- giữ bảy palette/theme;
- bỏ gradient trang trí, dấu `✦ ♡` và colored/decorative shadow;
- dùng solid semantic surfaces, border và neutral shadow;
- đổi class `pastel-*` sang tên semantic khi migrate, ví dụ `app-shell-surface`,
  `app-rail`, `app-header`, `app-card`, `map-frame`, `floating-chrome`;
- không bắt buộc rename một lần bằng search/replace mù quáng: migrate component
  theo phase và xóa class cũ khi không còn consumer.

Acceptance Phase 0:

- [x] Baseline command có kết quả thật.
- [x] Baseline visual có đủ viewport nêu trên.
- [x] `docs/DESIGN.md` không còn nói một kiểu trong khi code mới được lên kế hoạch
      theo kiểu khác.
- [x] Chưa sửa backend/data/results.

---

## 5. Hợp đồng UX mới

### 5.1. Ba lớp thông tin

Mọi màn hình kết quả hoặc control phức tạp phải chia:

1. **Lớp hành động/kết luận:** người dùng cần làm gì hoặc kết quả là gì.
2. **Lớp giải thích:** vì sao, trade-off, đơn vị và guarantee.
3. **Lớp kỹ thuật:** enum, ID, fingerprint, event kind, probability, raw state.

Lớp 1 luôn thấy. Lớp 2 thấy theo context hoặc tab. Lớp 3 nằm trong `<details>` có
summary rõ, không bị xoá vì vẫn cần cho bảo vệ kỹ thuật.

### 5.2. Chính sách ngôn ngữ

| Raw/current | Nhãn chính đề xuất | Cách giữ thuật ngữ kỹ thuật |
|---|---|---|
| `G_demo` | `Đồ thị minh hoạ (G_demo)` ở lần đầu; sau đó `G_demo` | Tooltip/chi tiết nói 51 POI và graph view |
| `G_real` | `Đồ thị quy mô thật (G_real)` ở lần đầu | Ghi rõ OSM-derived, không gọi ground truth real-time |
| `Graph view` | `Số điểm hiển thị` | ID `teach_N/full` trong chi tiết kỹ thuật |
| `Frontier` | `Đang chờ xét` | `(frontier)` ở chú thích/tooltip |
| `Expanded` | `Đã duyệt` | `(expanded)` ở chú thích |
| `Đang expand` | `Đang duyệt` | raw verb chỉ trong kỹ thuật |
| `Frontier max` | `Số điểm chờ lớn nhất` | Tooltip: maximum frontier size |
| `Runtime` | `Thời gian xử lý` | `runtime_ms` trong kỹ thuật |
| `Node` | `Điểm` hoặc `đỉnh` theo ngữ cảnh | `node ID` trong kỹ thuật |
| `Event` | `Sự kiện tối ưu` | raw ordinal/kind trong `<details>` |
| `current` | `Nghiệm hiện tại` | raw field trong kỹ thuật |
| `candidate` | `Nghiệm đang thử` | raw field trong kỹ thuật |
| `best-so-far` | `Nghiệm tốt nhất đến lúc này` | raw field trong kỹ thuật |
| `Original → current` | `Bản gốc → Sau chỉnh` | field names trong chi tiết |
| `t_free` | `Thời gian khi đường thoáng` | `t_free` trong ngoặc/tooltip |
| `Factor ùn tắc` | `Hệ số ùn tắc` | formula trong helper |
| `Distance` | `Chi phí quãng đường` | `weight_distance_m` trong kỹ thuật |
| `Time` | `Chi phí thời gian` | `weight_time_s` trong kỹ thuật |
| `Balanced` | `Chi phí cân bằng` | `weight_balanced_s` trong kỹ thuật |
| `Provenance` | `Nguồn kịch bản` | raw enum trong `<code>` |
| `Fingerprint` | `Mã xác thực kịch bản` | full hash trong `<details>` + copy |
| `Sandbox cạnh` | `Thử thay đổi một đoạn đường` | `scenario override` trong helper |
| `Reset` | `Khôi phục` | Không dùng tiếng Anh làm verb chính |

Không dịch tên thuật toán chuẩn thành tên khác gây khó tra cứu. Lần đầu xuất hiện
ATSP phải có câu: “Tối ưu thứ tự ghé nhiều điểm (ATSP)”.

### 5.3. Chính sách chữ và mật độ

Scale đề xuất:

| Vai trò | Kích thước tối thiểu | Ghi chú |
|---|---:|---|
| Page/panel title | 18–20 px | 700, không uppercase toàn dòng dài |
| Section title | 13–14 px | 700; tracking vừa phải |
| Body/control | 14 px | Mặc định cho label, select, helper quan trọng |
| Secondary/helper | 12 px | line-height tối thiểu 18 px |
| Dense metric/table | 12 px | số có thể 13–16 px, tabular |
| Attribution/raw hash | 10–11 px | Chỉ thông tin không tương tác/lớp kỹ thuật |

Quy tắc:

- [x] Xóa toàn bộ `text-[9px]` khỏi UI nhìn thấy.
- [x] Không dùng `text-[10px]`/`text-[11px]` cho hướng dẫn hành động, lỗi,
      guarantee, legend state hoặc nhãn control.
- [x] Truncate phải có cách xem đầy đủ bằng focus/tooltip/details; không dựa chỉ
      vào `title` cho nội dung quan trọng.
- [x] Không giảm font để chữa overflow; sửa layout, wrapping hoặc disclosure.

### 5.4. Component và interaction rules

- Target pointer tối thiểu theo WCAG 2.2 AA là 24×24 CSS px; project đặt mục tiêu
  thực dụng 36×36 px cho icon controls và 40–44 px cho CTA/control chính.
- Mọi focus ring phải thấy rõ và không bị timeline/header/sheet che.
- Tooltip phải mở bằng hover/focus, đóng bằng `Escape`, hover được và tồn tại đủ
  lâu; thông tin bắt buộc cho task phải là helper text, không phải tooltip.
- Disclosure mở/đóng bằng button với `aria-expanded`, hỗ trợ Enter/Space.
- Tabs tiếp tục dùng Radix; kiểm Arrow Left/Right, Home/End nếu primitive hỗ trợ.
- Status chạy/loading/error dùng `role=status`, `aria-live` hoặc `role=alert` đúng
  mức; không bắn toast lặp theo từng animation frame.
- Không tạo fake progress phần trăm cho API không cung cấp progress.
- Không auto-reset lựa chọn người dùng ngoài các invariant đã có trong store.

Nguồn chuẩn accessibility:

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WAI-ARIA Tooltip Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
- [WAI-ARIA Disclosure Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- [WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)

Không tuyên bố “WCAG 2.2 AA compliant” nếu chưa audit đầy đủ; chỉ được báo từng
criterion/check đã kiểm.

---

## 6. Kiến trúc thông tin và responsive shell

### 6.1. Desktop ≥1280 px — giữ ba vùng, đổi hierarchy

```text
┌──────────────────┬──────────────────────────────┬──────────────────────┐
│ THIẾT LẬP        │ BẢN ĐỒ / TRACE              │ KẾT QUẢ              │
│                  │                              │                      │
│ 1. Bài toán      │ Toolbar gọn                 │ Tóm tắt outcome      │
│ 2. Hành trình    │ Route nổi, graph nền dịu    │ Guarantee + unit     │
│ 3. Thuật toán    │ Legend theo context          │ Tabs chi tiết        │
│ 4. Nâng cao      │ Timeline không che control   │ Technical details    │
│                  │                              │                      │
│ [CHẠY — sticky]  │                              │                      │
└──────────────────┴──────────────────────────────┴──────────────────────┘
```

- Left rail target 304–320 px.
- Right rail target 384–400 px.
- Map nhận toàn bộ phần còn lại, target không nhỏ hơn khoảng 40% viewport ở
  1366×768.
- Rail dùng solid surface; card chỉ dùng khi thực sự nhóm một đơn vị, không bọc
  mọi thứ trong card lồng card.

### 6.2. Compact desktop/tablet 960–1279 px

- Left controls còn rail 288–304 px.
- Map là vùng chính.
- Right result chuyển thành overlay side panel mở bằng button “Kết quả”; width
  `min(400px, 44vw)` và có nút đóng rõ.
- Khi route hoàn tất, không cưỡng bức mở panel nếu sẽ che toàn map; hiển thị một
  result summary chip/button trên map để người dùng chủ động mở.
- Focus sau khi mở/đóng phải vào heading/panel và trả về trigger tương ứng.

### 6.3. Narrow <960 px

```text
┌────────────────────────────────────┐
│ App bar: [Thiết lập] [Kết quả] [⋯] │
├────────────────────────────────────┤
│                                    │
│               BẢN ĐỒ              │
│                                    │
│  legend gọn          map controls  │
│  timeline reflow/2 hàng khi cần    │
├────────────────────────────────────┤
│ summary kết quả hoặc hướng dẫn kế  │
└────────────────────────────────────┘

[Thiết lập] và [Kết quả] mở sheet/panel một cột, cuộn độc lập.
```

- Không giữ đồng thời hai rail 280 px.
- Có thể dùng native `<dialog>` cho sheet modal nếu kiểm được focus/Escape/return
  focus trên browser mục tiêu; không thêm dependency chỉ để có sheet.
- Nếu dùng non-modal overlay, không gắn `aria-modal=true`; đảm bảo thứ tự focus và
  close control vẫn rõ.
- Ở ≤640 px, control/result sheet gần full viewport; CTA sticky nằm trong sheet,
  không che input cuối.
- Page ngoài map không được horizontal scroll. Table thật sự rộng được cuộn trong
  wrapper có label, không làm cả trang cuộn ngang.

### 6.4. Timeline responsive

- Desktop: một hàng như hiện tại nhưng bỏ raw metadata khỏi primary row.
- 640–959 px: hai hàng — controls/slider ở hàng một, bước/tốc độ ở hàng hai.
- <640 px: ưu tiên back/play/next, slider và `Bước x/y`; tốc độ vào menu; tên trace
  nằm trong accessible label hoặc caption bên trên.
- Không dùng horizontal-scroll timeline làm giải pháp cuối vì keyboard focus dễ
  bị che và người dùng không biết còn control ngoài khung.

Acceptance shell:

- [x] 1366×768: ba vùng dùng được, không overlay ngoài ý muốn.
- [x] 1024×768: chỉ một rail cố định; result overlay không làm mất trigger đóng.
- [x] 390×844: không có hai rail cạnh nhau; page không horizontal scroll.
- [x] 320 CSS px equivalent: nội dung control/result reflow; map giữ ngoại lệ hai
      chiều nhưng có lựa chọn Đi/Đến tương đương bằng select.
- [x] Focus không bị sticky CTA/timeline/sheet che hoàn toàn.

Files chính:

- `frontend/app/page.tsx`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/components/control-panel.tsx`
- `frontend/components/drawer/drawer.tsx`
- `frontend/components/timeline.tsx`
- primitives trong `frontend/components/ui/` nếu cần mở rộng prop/class, không đổi
  public behavior vô cớ.

---

## 7. Phase 1 — Design tokens, surfaces và typography

### 7.1. Công việc

- [x] Đồng bộ `docs/DESIGN.md` với quyết định solid surface/no decorative gradient.
- [x] Xóa decorative radial/linear gradient và `pastel-header::after`.
- [x] Giữ neutral shadow cho floating map chrome; không shadow màu.
- [x] Đổi tên class visual từ `pastel-*` sang semantic class trong từng consumer.
- [x] Giữ toàn bộ CSS variables semantic hiện có; chỉ thêm token khi có vai trò cụ
      thể và ghi contract trước.
- [x] Chốt type scale mục 5.3 trong primitive và component.
- [x] Tăng line-height helper/error/trace copy.
- [x] Giảm số border lồng nhau; ưu tiên spacing/surface contrast.
- [x] Bảo toàn font loading/FOUC và seven-theme persistence.
- [x] Không thay màu semantic frontier/expanded/path/start/goal tùy hứng.

### 7.2. Acceptance

- [x] Không còn gradient trang trí trong main shell/card/header/floating chrome.
- [x] Không còn `✦ ♡` pseudo-content.
- [x] Không có hard-coded hex mới trong component; deck/map color vẫn đi qua
      palette/token.
- [x] Cả bảy theme render hierarchy giống nhau.
- [x] Primary text/body đọc được ở screenshot 1366×768 100% zoom.
- [x] `git diff` không chứa format churn ngoài file UI liên quan.

Files:

- `docs/DESIGN.md`
- `frontend/app/globals.css`
- `frontend/tailwind.config.ts`
- `frontend/components/ui/button.tsx`
- `frontend/components/ui/card.tsx`
- `frontend/components/ui/select.tsx`
- `frontend/components/ui/tabs.tsx`
- các consumer `pastel-*` được liệt kê bằng `rg -n "pastel-" frontend`.

---

## 8. Phase 2 — Control panel: luồng thao tác chính trước, nâng cao sau

### 8.1. Thứ tự mới

Left panel phải có thứ tự:

1. **Thiết lập bài toán** — graph, số điểm hiển thị, slot, tiêu chí;
2. **Hành trình** — Đi, Đến, stops;
3. **Thuật toán** — algorithm + guarantee summary + params chỉ khi liên quan;
4. **Tùy chọn hiển thị** — traffic layer, offline, G_real trace;
5. **Thử nghiệm nâng cao** — edge presets; mặc định đóng và chỉ nổi khi chọn cạnh;
6. sticky CTA chạy ở footer.

Không cần đổi state shape chỉ để đổi thứ tự render.

### 8.2. Thiết lập bài toán

- Đổi `Graph view` thành `Số điểm hiển thị`.
- Đổi option `G_demo — 51 địa danh thật` thành wording trung thực, ví dụ
  `G_demo — 51 POI minh hoạ`; không gọi toàn bộ POI/data là ground truth thật.
- `G_real — 2 118 nút OSM` → `G_real — 2 118 nút từ topology OSM` hoặc wording
  ngắn tương đương.
- Giữ slot segmented 4 mốc và mode segmented 3 tiêu chí vì đây là phần demo quan
  trọng.
- Helper mode phải nêu unit: distance = mét; time/balanced = giây; risk chỉ cộng
  vào balanced.
- Số node input có label Việt, error persistent, Enter apply; button `Hiện` có
  label cụ thể hơn như `Áp dụng` nếu context chưa rõ.

### 8.3. Hành trình

- Giữ ride-app visual role Đi/Đến nhưng tăng helper/body lên ≥12 px.
- Khi chưa có stops, ưu tiên route hai điểm; ATSP method block không xuất hiện.
- Khi có stops, hiển thị status rõ:
  - `Chạy tuyến theo thứ tự đã nhập` là CTA route thông thường;
  - `Tối ưu thứ tự ghé` là CTA ATSP riêng;
  - điểm Đến không tham gia như endpoint độc lập khi invariant hiện hành nói vậy.
- Empty ATSP chỉ cần 3 bước ngắn; không lặp giải thích ở nhiều card.
- Limit 15 và Held–Karp max 14 stops phải thấy trước khi bấm, không auto đổi method.
- Nút xoá stop/endpoint có target ≥36 px và accessible name chứa tên điểm.

### 8.4. Thuật toán

- Giữ grouping guarantee hiện có.
- Dưới select hiển thị một dòng tóm tắt theo algorithm:
  `Dùng trọng số / không dùng trọng số · dùng h / không dùng h · guarantee`.
- Chỉ hiện Beam width với Beam; chỉ hiện ε với IDA*.
- Từ `Trace từng bước được bật tự động...` phải sửa theo behavior thật trong store;
  không dùng doc/comment cũ nếu implementation khác.
- G_real guardrail vẫn giữ, nhưng copy ngắn và actionable.

### 8.5. Nâng cao và edge presets

- `Trọng số cạnh` không mở card trống lớn trên luồng chính.
- Mặc định là disclosure `Thử thay đổi một đoạn đường`.
- Khi chưa chọn edge: một CTA chọn cạnh + một câu “chỉ hiệu lực trong phiên”.
- Khi đã chọn: summary ba chỉ số dùng nhãn Việt; không có text 9 px.
- `distance`, `time + phạt`, `Reset` đổi theo glossary mục 5.2.
- Button `Chi tiết` mở đúng tab scenario và focus đúng control như behavior hiện có.

### 8.6. CTA footer

CTA phải trả lời rõ hành động sắp chạy:

- không stops: `Chạy A*` hoặc `Chạy thuật toán` với sublabel route Đi → Đến;
- có stops, route thường: `Chạy qua N điểm giao`;
- ATSP có CTA riêng trong block method: `Tối ưu thứ tự ghé`;
- loading: spinner + text trạng thái thật, giữ width ổn định;
- disabled phải có lý do persistent gần CTA, không chỉ disabled mơ hồ.

Acceptance Phase 2:

- [x] Người mới hoàn tất route hai điểm mà không mở section nâng cao.
- [x] Khi thêm stop, khác biệt “chạy theo thứ tự nhập” và “tối ưu thứ tự” rõ.
- [x] Không mất bất kỳ algorithm/param/switch/scenario behavior nào.
- [x] Left panel không cần giảm font để vừa 1366×768.
- [x] Section/disclosure chạy được Enter/Space và báo `aria-expanded`.

Files:

- `frontend/components/control-panel.tsx`
- `frontend/components/atsp/atsp-setup.tsx`
- `frontend/components/edge-weight-presets.tsx`
- `frontend/lib/algorithm-policy.ts`
- `frontend/lib/interaction-policy.ts` chỉ khi cần presentation helper thuần;
  không đổi invariant.

---

## 9. Phase 3 — Result drawer: outcome trước, metrics sau, technical cuối

### 9.1. Cấu trúc drawer

Giữ bốn tab và `drawerTab` values để tránh đổi state/API. Có thể đổi nhãn hiển thị
nếu browser QA chứng minh rõ hơn; mặc định an toàn là giữ:

- `Số liệu`
- `Giải thích`
- `So sánh`
- `Thử nghiệm`

Không đổi nhãn chỉ vì sở thích. Cải thiện hierarchy bên trong trước.

### 9.2. Route result summary

Vùng đầu tab Số liệu:

1. status `Đã tìm thấy tuyến` hoặc failure rõ;
2. algorithm · tiêu chí · slot · graph ở secondary line;
3. guarantee badge bằng ngôn ngữ đúng;
4. tổng chi phí đúng unit là metric chính;
5. thời gian đi và quãng đường là secondary metrics;
6. một câu “Chi phí này gồm gì?” theo mode.

Không để fingerprint/provenance nằm trước guarantee/outcome.

### 9.3. Search effort

Đổi primary labels:

- `Đã expand` → `Số điểm đã duyệt`;
- `Frontier max` → `Số điểm chờ lớn nhất`;
- `Runtime` → `Thời gian xử lý`.

Tooltip có thể giữ thuật ngữ kỹ thuật. Không diễn giải runtime là travel time.

### 9.4. `g/h/f`

- Heading: `Bảng chi phí tại bước đang xem`.
- Caption visible:
  - `g: chi phí đã đi`;
  - `h: ước lượng còn lại`;
  - `f = g + h: giá trị ưu tiên`.
- `Node` → `Điểm`; `đang expand` → `đang duyệt`.
- Cột chỉ hiện khi algorithm/event thực sự cung cấp.
- Table row keyboard behavior hiện có phải được giữ.
- Khi user nhảy step từ table, focus/scroll không bị sticky header che.

### 9.5. Provenance/scenario block

Tạo một component presentation dùng chung, ví dụ
`components/scenario/applied-scenario-details.tsx`:

- summary đóng: `Dữ liệu và kịch bản · G_demo đầy đủ · 0 chỉnh sửa`;
- body mở: graph view, override count, nguồn kịch bản, full fingerprint + copy;
- raw enum dùng `<code>` và label Việt;
- không tự tạo fingerprint frontend.

Route và ATSP dùng chung component để tránh wording lệch.

### 9.6. Error/empty

- Failure phải nói: điều gì xảy ra, người dùng sửa thế nào, dữ liệu cũ có còn
  không.
- Toast API tiếp tục dùng `message_vi`, nhưng panel phải có state persistent nếu
  task không thể tiếp tục.
- Không ghi `Xem tab Giải thích` nếu UI tự mở tab khác hoặc nội dung cần thiết
  không tồn tại.

Acceptance Phase 3:

- [x] Outcome chính thấy trước khi scroll ở 1366×768.
- [x] Không còn raw provenance/hash trong top-level result.
- [x] Ba effort metrics không dùng English làm label chính.
- [x] Unit của cost/epsilon đúng mode; distance không in suffix giây.
- [x] Failure/empty/loading route và ATSP không lẫn nhau.

Files:

- `frontend/components/drawer/drawer.tsx`
- `frontend/components/drawer/metrics-tab.tsx`
- `frontend/components/ghf-table.tsx`
- `frontend/components/atsp/atsp-result.tsx`
- component scenario detail dùng chung nếu tạo.

---

## 10. Phase 4 — Explanation và comparison phục vụ rubric

### 10.1. Giải thích route

`explain-tab.tsx` đã có nền tốt; không rewrite toàn bộ. Chuẩn hóa thứ tự:

1. câu kết luận “vì sao chọn tuyến này”;
2. tiêu chí, guarantee, time, distance;
3. đoạn ùn tắc trên tuyến;
4. tuyến thay thế và delta so với tuyến chính;
5. technical details nếu cần.

Wording phải phân biệt:

- shortest distance;
- fastest pure travel time;
- lowest balanced cost;
- guarantee tuyệt đối, biên ε hoặc không guarantee.

Không tuyên bố một tuyến “tối ưu” nếu algorithm/metrics không guarantee.

### 10.2. So sánh route

Giữ cấu trúc verdict → overlap → table hiện hành nhưng:

- primary sentence dùng tên thuật toán và kết luận cụ thể;
- label table Việt trước;
- màu route A/B chỉ giúp nhận diện, winner dùng typography + text;
- delta có sign/caption rõ “B so với A; càng thấp càng tốt”;
- found=false ở một/both side có state riêng;
- guarantee row không bị thu nhỏ dưới 12 px.

### 10.3. ATSP explanation/comparison

- `Giải thích` phải nói method làm gì, asymmetric matrix nghĩa gì, có guarantee
  hay không và vì sao order thay đổi.
- `So sánh` chỉ so “thứ tự nhập” với “sau tối ưu”; không giả lập hai method khi
  store chỉ có một `multi`.
- Savings âm phải nói “tăng chi phí”, không dùng màu success.
- Savings 0 nói “không đổi”.
- Held–Karp exact trong giới hạn; NN/local improvement và SA là approximate.

Acceptance Phase 4:

- [x] UI trả lời đủ năm yêu cầu giải thích của đề: why, criterion, congested
      segments, alternative difference, guarantee.
- [x] Không claim mạnh hơn backend metrics.
- [x] Comparison đọc được nếu bỏ màu.
- [x] ATSP compare không giả dữ liệu/method thứ hai.

Files:

- `frontend/components/drawer/explain-tab.tsx`
- `frontend/components/drawer/compare-tab.tsx`
- `frontend/components/atsp/atsp-explanation.tsx`
- `frontend/components/atsp/atsp-compare.tsx`
- `frontend/lib/atsp-savings.ts`
- `frontend/lib/algorithm-policy.ts`.

---

## 11. Phase 5 — ATSP trace: kể câu chuyện trước, payload sau

### 11.1. Presentation model

Không đổi `OptimizationEvent` API. Tạo presentation mapping thuần, có thể ở
`frontend/lib/atsp-event-copy.ts`:

```text
OptimizationEvent
  → tiêu đề Việt ngắn
  → câu diễn giải chính
  → trạng thái/order/set cần vẽ
  → danh sách metric kỹ thuật
  → raw kind/ordinal/details
```

Component không tự ghép raw string rải rác khó test.

### 11.2. Copy theo event

- `held_karp_update`: “Cập nhật trạng thái quy hoạch động”; nói endpoint, phương
  án đang thử, cost cũ/mới; raw `held_karp_update` ở details.
- `held_karp_reconstruct`: “Dựng lại thứ tự tối ưu”.
- `nn_decision`: “Chọn điểm gần nhất tiếp theo”; nêu số ứng viên.
- `local_improvement`: “Cải thiện thứ tự bằng 2-opt/Or-opt”; nêu giảm bao nhiêu.
- `sa_seed_boundary`: “Bắt đầu/Kết thúc một lần chạy SA”; seed/temperature ở
  technical row.
- `sa_iteration`: câu chính nói nghiệm đang thử được chấp nhận/từ chối và có tạo
  best mới không; `p`, `delta`, candidate/current/best ở details.
- `sa_final_best`: “Chọn nghiệm tốt nhất trong 5 lần chạy”.
- `optimization_summary`: “Hoàn tất tối ưu thứ tự ghé”.

### 11.3. Card hierarchy

Primary:

- title Việt;
- `Bước x/y`;
- một câu diễn giải;
- order/set dễ đọc bằng tên POI nếu có, fallback ID.

Secondary:

- sampled/truncated warning bằng tiếng Việt;
- câu “nét đứt là thứ tự khái niệm, không phải đường xe chạy”.

Technical `<details>`:

- raw event kind/ordinal;
- recorded/total events;
- sampling policy;
- IDs;
- seed, iteration, temperature, delta, probability, current/candidate/best.

### 11.4. Timeline ATSP

- Primary caption `Tối ưu thứ tự ghé · Held–Karp` bằng friendly method label.
- `Sự kiện x/y`; không in `event #`, raw method enum hoặc sampling ratio trên
  timeline chính.
- Sample/truncated có icon/badge riêng trong drawer, không nhồi vào thanh player.

Acceptance Phase 5:

- [x] Raw event kind không còn là badge chính.
- [x] Người xem video hiểu event mà không đọc English fields.
- [x] Kỹ thuật viên vẫn mở được toàn bộ raw detail.
- [x] Map conceptual/final-route semantics không đổi.
- [x] Trace sampling/truncation không bị che giấu.

Files:

- `frontend/components/atsp/atsp-trace.tsx`
- `frontend/components/timeline.tsx`
- `frontend/components/legend.tsx`
- `frontend/lib/atsp-trace-policy.ts`
- presentation helper/test mới nếu cần.

---

## 12. Phase 6 — Scenario/edge editor rõ ràng và an toàn

### 12.1. Luồng chính

Đổi framing từ developer sandbox sang thử nghiệm dạy học:

- heading `Thử thay đổi một đoạn đường`;
- helper `Chỉ có hiệu lực trong tab hiện tại; không sửa dataset gốc`;
- button `Bật chọn đoạn đường` / `Dừng chọn đoạn đường`;
- count `N đoạn đang được chỉnh`;
- `Khôi phục đoạn này` và `Khôi phục tất cả`.

Không cần confirm dialog cho restore in-memory nếu hành động rõ, nhưng phải khóa
khi request đang chạy và kết quả cũ phải clear theo invariant hiện hành.

### 12.2. Editor

Nhóm theo thứ tự:

1. đoạn đang chọn: tên, hướng `u → v`, ID secondary;
2. thông số cơ bản: chiều dài, tốc độ đường thoáng;
3. ùn tắc theo bốn slot;
4. điều kiện/rủi ro;
5. ảnh hưởng đến chi phí ở slot hiện tại;
6. technical scenario details.

`Bản gốc → Sau chỉnh` phải có column header thật, không chỉ ba cột số không nhãn.
Format số dùng `fmtVi`, không dùng `toFixed` trực tiếp cho UI tiếng Việt.

### 12.3. Cost breakdown

Nhãn chính:

- Thời gian khi đường thoáng (`t_free`);
- Hệ số ùn tắc;
- Phạt ngập/công trình/hẻm/đèn;
- Tổng phạt rủi ro;
- Chi phí quãng đường (m);
- Chi phí thời gian (s);
- Chi phí cân bằng (s).

Một helper ngắn giải thích balanced = travel time + risk penalties; không nói
risk tham gia distance/time.

Acceptance Phase 6:

- [x] Không còn `Sandbox`, `Original/current`, `Factor`, `Distance/Time/Balanced`,
      `Provenance/Fingerprint` làm nhãn primary.
- [x] Input có label, instruction và error suggestion.
- [x] Thay slot giữ override và refresh preview đúng behavior cũ.
- [x] Refresh tab vẫn mất override; UI nói rõ.
- [x] Base `traffic`/graph không mutate.

Files:

- `frontend/components/drawer/scenario-tab.tsx`
- `frontend/components/edge-weight-presets.tsx`
- `frontend/lib/scenario.ts` chỉ cho helper thuần/format, không đổi formula.

---

## 13. Phase 7 — Map, legend và visual focus

### 13.1. Giữ map là bằng chứng chính

Không đổi deck.gl/MapLibre architecture hoặc data source. Tập trung vào hierarchy:

- route/compare/multiroute tiếp tục trên base graph;
- khi có final route, giảm visual emphasis của base edges/nodes không liên quan
  bằng opacity/width có token, nhưng vẫn đủ context;
- start/goal/stops/current/route arrows vẫn ở top stack;
- không ẩn dữ liệu để tạo cảm giác tuyến rõ nếu legend/metrics còn nói lớp đó bật;
- layer traffic bật thì vẫn đọc được thang congestion.

### 13.2. Graph hairball

- Không tự đổi default graph view hoặc node count.
- Với G_demo full, giữ collision handling nhưng ưu tiên label của start, goal,
  stops và node trên route.
- Với result, route casing/contrast phải thắng base hairball ở cả theme sáng/tối.
- Nếu thêm control focus route, nó phải là hành động explicit và có control về
  toàn cảnh; không âm thầm thay camera nhiều lần.
- Không thêm animation mỗi frame bằng React state.

### 13.3. Legend

Đổi copy:

- `Frontier` → `Đang chờ xét`;
- `Đã expand` → `Đã duyệt`;
- `Đang expand` → `Đang duyệt`;
- `Tập DP đang xét` có helper ngắn nếu optimization trace;
- compare A/B giữ solid/dashed và label algorithm nếu đủ chỗ.

Legend chỉ hiện lớp active như hiện tại. Text primary ≥12 px; caption kỹ thuật có
thể nhỏ hơn nhưng không dưới ngưỡng đã chốt.

### 13.4. Timeline/map controls collision

- Ở mọi breakpoint, zoom/home/clear không bị timeline che.
- Toolbar app không che banner chọn điểm.
- Legend không che start/goal chip ở trạng thái camera mặc định nếu có thể; nếu
  collision phụ thuộc route, panel phải kéo/gọn được hoặc map padding phù hợp.
- Pointer target map control 40×40 mục tiêu.

### 13.5. Non-color cues

- Route chính: solid + arrow.
- Route B: dashed + offset render + label/caption.
- Start/goal: text chips `Đi`/`Đến`, không chỉ xanh/đỏ.
- Stops: ordinal number.
- Trace current: ring/size, không chỉ màu.
- Congestion: legend level 1–5 có text/position, không chỉ hue.

Acceptance Phase 7:

- [x] Route đọc rõ trên tất cả seven themes.
- [x] Khi route xuất hiện, base graph lùi thị giác nhưng không biến mất sai state.
- [x] Legend hoàn toàn Việt ở primary layer.
- [x] Timeline, toolbar, legend, map controls đều click/focus được ở 1366×768,
      1024×768 và 390×844.
- [x] Reduced motion giữ route tĩnh và tắt loop/autoplay không thiết yếu.

Files:

- `frontend/components/map-view.tsx`
- `frontend/components/legend.tsx`
- `frontend/components/timeline.tsx`
- `frontend/lib/colors.ts`
- `frontend/lib/route-flow-extension.ts` chỉ khi cần bảo toàn render, không đổi
  shader vô cớ.

---

## 14. Phase 8 — `/benchmark` nhất quán nhưng không biến số tạm thành số thật

### 14.1. Nguyên tắc

- Trang vẫn read-only.
- Giữ badge/cảnh báo `SỐ TẠM` nổi bật trước chart.
- Không chạy benchmark hoặc sửa API/results.
- Không gọi số hiện tại là official/current.

### 14.2. Copy và layout

- `Node expand trung bình` → `Số điểm duyệt trung bình`; thuật ngữ raw có thể ở
  subtitle.
- `Runtime trung bình` → `Thời gian xử lý trung bình`.
- Unit ms rõ ở title/axis/table.
- Chart title, description text và data table tương đương tiếp tục tồn tại.
- Ở mobile, chart/card một cột; table cuộn trong vùng riêng; header/back/theme
  controls không vỡ.
- Recharts motion tắt khi reduced motion.

Acceptance Phase 8:

- [x] `SỐ TẠM` không bị hạ emphasis.
- [x] Không có lời kêu gọi rerun benchmark trong UI.
- [x] Mỗi chart có accessible text/table alternative.
- [x] 390×844 không horizontal page scroll.
- [x] Empty/partial/error giữ slot riêng và retry không double-submit.

File:

- `frontend/app/benchmark/page.tsx`.

---

## 15. Phase 9 — Accessibility hardening

### 15.1. Keyboard matrix

Kiểm bằng runtime, không suy từ source:

- [x] Tab/Shift+Tab qua app bar, controls, CTA, map toolbar, timeline và drawer.
- [x] Enter/Space kích hoạt button/disclosure/switch đúng.
- [x] Radix Select mở/chọn/đóng bằng keyboard.
- [x] Tabs đổi bằng Arrow keys theo pattern.
- [x] `Escape` đóng tooltip, select và sheet/dialog phù hợp.
- [x] Mở/đóng control/result panel trả focus về trigger.
- [x] Timeline Space/Arrow không chiếm phím khi focus ở input/select/switch/slider.
- [x] Row `g/h/f` kích hoạt bằng Enter/Space.
- [x] Không có keyboard trap.

### 15.2. Semantics và announcements

- Main page có landmark hợp lý: `main`, hai `aside`, toolbar, headings.
- Icon-only button có accessible name diễn tả hành động.
- Status loading/complete/error được announce một lần hợp lý.
- Error input dùng `aria-invalid`, liên kết helper/error bằng `aria-describedby`.
- Tooltip trigger name ngắn; không nhét toàn bộ tooltip vào accessible name dài
  nếu gây lặp khi screen reader.
- Canvas/map có mô tả text và mọi core selection có alternative qua controls.

### 15.3. Contrast, target và zoom

- Text thường target ≥4.5:1; large text ≥3:1; informational graphics/control
  boundaries target ≥3:1 theo WCAG 2.2.
- Run `scripts/check_contrast.py`; nếu network Carto không có, ghi `NOT RUN`/lý do,
  không giả pass.
- Pointer target theo mục 5.4.
- Test 200% zoom, text spacing override và viewport 320 CSS px equivalent.
- Focus ring không bị cắt bởi `overflow-hidden`/rounded container.

### 15.4. Motion

- `prefers-reduced-motion` tắt route flow loop, chart animation và autoplay.
- Người dùng luôn có Pause/Play với animation dài.
- Không flash.
- Không dùng motion để truyền thông tin duy nhất.

Acceptance Phase 9:

- [x] Mỗi check có evidence browser/viewport/interaction.
- [x] Không ghi claim full WCAG compliance nếu chưa dùng audit đầy đủ.
- [x] Mọi defect P0/P1 được sửa hoặc ghi blocker cụ thể.

---

## 16. Test strategy — không chỉ nhìn screenshot

### 16.1. Unit/policy tests

Không thêm React test framework chỉ để snapshot className. Dùng test harness Node
hiện có cho logic thuần:

- mở rộng `frontend/tests/atsp-trace-policy.test.mjs` hoặc tạo
  `ui-copy.test.mjs` cho presentation mapping event;
- test mọi `OptimizationEvent.kind` có title/copy Việt và không rơi vào undefined;
- test labels/cost units route theo distance/time/balanced;
- test guarantee copy cho exact/ε/no-guarantee;
- test savings positive/zero/negative;
- test breakpoint/layout helper chỉ nếu có logic TypeScript thật; CSS vẫn phải
  browser-test;
- giữ test interaction/scenario/graph-view/theme hiện hành.

Không viết test “có đúng chuỗi class Tailwind” nếu không bảo vệ behavior có ý
nghĩa.

### 16.2. Frontend automated gates

Từ `frontend/`:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Điều kiện build:

- stop mọi Next dev process trước;
- dependencies đã tồn tại;
- không có process khác ghi `.next`;
- nếu Google font/network fail, báo đúng lỗi; không đổi font contract im lặng.

### 16.3. Backend/data safety gates

UI phase không cần thay backend/data, nhưng final regression nên chạy từ root:

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\ -v
.venv\Scripts\python.exe scripts\validate_data.py
```

Không chạy benchmark/generator.

### 16.4. Browser matrix bắt buộc

Browser chính: Chromium/Chrome. Ghi version nếu công cụ cung cấp.

| Viewport | Route | Theme/state | Mục tiêu |
|---|---|---|---|
| 1366×768 | `/` | Đen, A* result + route trace | Máy chiếu/laptop chuẩn, outcome không chìm |
| 1366×768 | `/` | Trắng, Held–Karp + optimization trace | ATSP copy, timeline, map conceptual/final |
| 1366×768 | `/` | Default, compare A*/Greedy | Route A/B, delta, overlap |
| 1366×768 | `/` | Scenario edge override | Editor, focus, provenance details |
| 1440×900 | `/` | G_real + trace | Dense graph guardrail/map clarity |
| 1024×768 | `/` | Route result | Result overlay, focus return, map width |
| 390×844 | `/` | Initial + route + ATSP setup | Narrow sheet, CTA, no page overflow |
| 320×568 hoặc 200% zoom equivalent | `/` | Initial/result | Reflow, no lost control |
| 1366×768 | `/benchmark` | ready/partial thật từ API | Stale warning/charts/tables |
| 390×844 | `/benchmark` | cùng data | One-column/reflow |

### 16.5. Runtime workflows

Ít nhất chạy thật:

1. G_demo full, A*, balanced, 07:30, route hai điểm.
2. Play/pause/step/slider/table jump; kiểm map/legend đồng bộ.
3. BFS hoặc DFS để kiểm algorithm không dùng `g/h/f` đầy đủ.
4. Bidirectional Dijkstra để kiểm hai phía.
5. IDA* để kiểm ε và unit.
6. Beam để kiểm `k` và no-guarantee.
7. Compare A* với Greedy/BFS.
8. Sequential route qua stops theo thứ tự nhập.
9. Held–Karp có optimization trace.
10. NN + 2-opt/Or-opt và SA ít nhất một lần mỗi method.
11. Edge override, đổi slot, chạy lại, khôi phục.
12. G_real chọn node qua map và guardrail trace.
13. Offline mode.
14. Bảy theme; tối thiểu full flow trên Default/Đen/Trắng, visual/contrast smoke
    trên bốn theme pastel còn lại.
15. `/benchmark` ready/partial/error nếu có thể tái tạo không sửa artifact.

Trong mỗi flow kiểm:

- API status;
- console error/warning;
- loading/disabled/empty/error state;
- keyboard focus;
- clipping/overlap/horizontal scroll;
- đúng copy/đơn vị/guarantee;
- no stale result sau thay context.

---

## 17. File-by-file implementation map

| File/nhóm | Thay đổi dự kiến | Không được làm |
|---|---|---|
| `docs/DESIGN.md` | Ghi contract UI Clarity, type scale, responsive, solid surfaces, progressive disclosure | Viết rằng browser/accessibility đã pass trước khi chạy |
| `frontend/app/globals.css` | Semantic surfaces, typography baseline, breakpoint support, reduced motion | Thêm gradient/decorative motion/hard-coded semantic color |
| `frontend/tailwind.config.ts` | Token mapping nếu thật sự cần | Thay toàn stack/theme tùy hứng |
| `frontend/app/page.tsx` | Responsive shell/app toolbar/panel triggers | Đổi API/data loading semantics |
| `frontend/app/layout.tsx` | Chỉ sửa nếu cần body/reflow/font/a11y | Phá FOUC/theme init |
| `control-panel.tsx` | Reorder IA, disclosure, copy, responsive | Đổi store invariants/request payload |
| `edge-weight-presets.tsx` | Việt hoá, type scale, progressive disclosure | Đổi cost formula |
| `drawer/drawer.tsx` | Responsive result panel/focus management | Mất tabs/state |
| `drawer/metrics-tab.tsx` | Outcome-first, Việt hoá metrics, technical details | Đổi unit/guarantee |
| `drawer/explain-tab.tsx` | Rubric-first narrative | Bịa alternative/claim optimal |
| `drawer/compare-tab.tsx` | Copy/hierarchy/non-color cues | Đổi meaning Δ hoặc path geometry |
| `drawer/scenario-tab.tsx` | Friendly editor/cost breakdown/details | Persist override/mutate base data |
| `atsp/atsp-setup.tsx` | Clear route-vs-optimize flow | Auto đổi method/xóa stop |
| `atsp/atsp-result.tsx` | Outcome-first + common scenario details | Bịa totals khi null |
| `atsp/atsp-trace.tsx` | Plain-language event presentation | Đổi raw event contract |
| `atsp/*explanation/compare*` | Guarantee/asymmetry/savings clarity | Giả compare hai method |
| `timeline.tsx` | Responsive player, friendly ATSP label | Trộn route/optimization semantics |
| `legend.tsx` | Việt hoá/context/non-color cues | Hiện layer không active |
| `ghf-table.tsx` | Việt hoá, readable caption | Hiện h/f giả khi event không có |
| `map-view.tsx` | Visual focus, collision/responsive overlays | Rebuild graph mỗi frame, đổi coordinates/metrics |
| `ui/info-tip.tsx` | Tooltip behavior/name/size nếu cần | Đặt required instructions chỉ trong tooltip |
| `app/benchmark/page.tsx` | Copy/reflow/a11y | Chạy benchmark/gỡ `SỐ TẠM` |
| `lib/*policy/copy*` | Pure presentation helpers có test | Nhét UI copy vào backend/schema |
| `frontend/tests/` | Semantic copy/policy regressions | Snapshot CSS brittle hoặc bỏ test cũ |

---

## 18. Thứ tự triển khai và stop gates

### Gate A — Contract và baseline

- [x] Worktree/baseline recorded.
- [x] `docs/DESIGN.md` updated before visual code.
- [x] Không conflict chưa giải quyết giữa plan/design/current behavior.

**Dừng** nếu baseline đang fail không liên quan và chưa xác định pre-existing.

### Gate B — Clarity desktop

Thực hiện Phase 1 → 5:

- [x] typography/surface;
- [x] control panel;
- [x] result hierarchy;
- [x] explanation/compare;
- [x] ATSP trace.

Chạy test + tsc + browser 1366×768 trước khi tiếp tục.

**Dừng** nếu phải đổi API/data hoặc route semantics.

### Gate C — Responsive và map

Thực hiện shell responsive, scenario, map/legend/timeline.

- [x] 1024×768 pass;
- [x] 390×844 pass;
- [x] focus return/panel close pass;
- [x] no horizontal page scroll.

### Gate D — Benchmark + accessibility

- [x] `/benchmark` copy/reflow;
- [x] keyboard matrix;
- [x] reduced motion;
- [x] contrast/zoom/target checks.

### Gate E — Freeze

- [x] Full frontend gates.
- [x] Backend/data safety gates.
- [x] Full runtime workflow.
- [x] Diff review.
- [x] Update DESIGN current-state evidence bằng kết quả thật.
- [x] UI freeze.

Chỉ sau Gate E mới sang ảnh README/report/video.

---

## 19. Documentation và screenshot sau UI freeze

### 19.1. Tài liệu bị ảnh hưởng

Sau khi implementation và QA đạt, audit tối thiểu:

- `docs/DESIGN.md`;
- `README.md`;
- `mustTODO.md` nếu trạng thái phase thay đổi;
- `report/BaoCao-Khung.md` phần GUI/instructions;
- `report/Slide-Outline.md` và `report/Video-KichBan.md` nếu tên tab/control/copy đổi.

Không sửa historical entries như thể UI mới đã tồn tại ở checkpoint cũ.

### 19.2. Ảnh README

Hai ảnh hiện tại là baseline trước UI phase:

- `artifacts/readme/dark-route-result.png`;
- `artifacts/readme/light-atsp-result.png`.

Chỉ chụp đè sau khi:

1. backend/frontend clean restart;
2. hard refresh;
3. API graph xác nhận G_demo 51/298;
4. route/ATSP request thành công;
5. console không error;
6. đúng viewport 1366×768;
7. text/cursor/toast không che nội dung;
8. ảnh đã được mở inspect ở độ phân giải gốc.

Ảnh README không thay thế chín screenshot GUI cuối trong `mustTODO.md`.

### 19.3. Không làm trong bước screenshot

- không rerun benchmark;
- không tạo số mới;
- không gỡ `SỐ TẠM`;
- không chụp UI đang dùng stale service/cache;
- không dùng DevTools/mobile emulation screenshot làm bằng chứng duy nhất nếu
  browser viewport thật có thể kiểm.

---

## 20. Final verification checklist cho coding agent

### 20.1. Scope và diff

- [x] `git diff --check` pass.
- [x] Inspect toàn bộ `git diff -- frontend docs/DESIGN.md README.md mustTODO.md report`.
- [x] Không có backend/data/results/generated numerical Markdown thay đổi.
- [x] Không có dependency/lockfile change nếu không được duyệt.
- [x] Không có debug log, temp screenshot, cache hoặc secret.
- [x] `git status --short` chỉ có file có chủ đích.

### 20.2. Copy/visual static pass

Chạy search có context, không replace mù:

```powershell
rg -n "text-\[(9|10|11)px\]|Frontier|expand|Runtime|event|current|candidate|best-so-far|Original|Provenance|Fingerprint|Sandbox|Graph view|Distance|Balanced|Reset" frontend
rg -n "gradient|pastel-" frontend docs/DESIGN.md
```

Mỗi occurrence còn lại phải thuộc một trong:

- source code identifier/comment;
- tên thuật toán/ký hiệu chuẩn;
- technical detail có nhãn Việt;
- ngoại lệ typography được ghi rõ.

### 20.3. Commands và báo cáo

Final response của coding agent phải liệt kê từng command thật:

- `PASS`;
- `FAIL`;
- `NOT RUN — lý do`.

Không dùng kết quả checkpoint 2026-08-07 làm bằng chứng cho UI mới nếu không chạy
lại.

### 20.4. Definition of Done

UI phase chỉ hoàn thành khi:

- [x] Hợp đồng `docs/DESIGN.md` và implementation không còn mâu thuẫn rõ.
- [x] Route, trace, compare, sequential route, ATSP, scenario, offline, themes và
      benchmark page đều còn hoạt động.
- [x] Primary UI dùng tiếng Việt rõ; technical raw detail vẫn truy cập được.
- [x] Typography và hierarchy đạt mục 5.
- [x] Responsive shell đạt 1366×768, 1024×768 và 390×844.
- [x] Keyboard/focus/reduced-motion/browser matrix có evidence thật.
- [x] Frontend tests, TypeScript và production build đạt.
- [x] Backend tests/data validator đạt hoặc được báo trung thực nếu không chạy.
- [x] Không sửa API/backend/data/results/benchmark ngoài scope.
- [x] README screenshot và docs liên quan chỉ được cập nhật sau freeze.
- [x] Không còn blocker UI P0/P1 chưa ghi nhận.

---

## 21. Mức ưu tiên nếu thời gian bị cắt

Nếu không đủ thời gian làm toàn bộ, dừng theo ranh giới sạch sau mỗi tier; không
làm nửa vời cả ba.

### Tier 1 — Bắt buộc, giá trị cao nhất

1. Microcopy Việt-first.
2. Tăng font/line-height, bỏ 9 px và primary 10–11 px.
3. Outcome-first result/provenance disclosure.
4. ATSP plain-language trace.
5. Progressive disclosure control panel.
6. 1366×768 browser QA.

### Tier 2 — Nên hoàn tất trước quay video

1. 1024 responsive result overlay.
2. Map visual focus/legend/timeline collision.
3. Scenario friendly editor.
4. Keyboard/focus/reduced-motion audit.
5. Seven-theme smoke + contrast.

### Tier 3 — Hoàn thiện tốt nhất

1. 390×844/mobile sheet polish.
2. `/benchmark` microcopy/reflow polish.
3. 200% zoom/text-spacing hardening.
4. Final screenshot/document synchronization.

Không ưu tiên decorative polish trước Tier 1/2.

---

## 22. Mẫu final handoff sau khi code xong

Coding agent dùng cấu trúc:

```markdown
## Kết quả

- UI Clarity Phase: COMPLETE / PARTIAL / BLOCKED
- Commit nền: 98a82b2
- File đã đổi: ...

## Thay đổi chính

1. Typography/copy: ...
2. Information hierarchy: ...
3. Responsive: ...
4. Map/trace/ATSP/scenario: ...
5. Accessibility: ...

## Verification

- PASS — `npm test`: ...
- PASS/FAIL — `npx tsc --noEmit`: ...
- PASS/NOT RUN — `npm run build`: ...
- PASS/NOT RUN — backend pytest: ...
- PASS/NOT RUN — data validator: ...
- Browser Chromium <version>:
  - 1366×768: ...
  - 1024×768: ...
  - 390×844: ...
  - keyboard/reduced motion/themes: ...

## Remaining issues

- ...

## Scope confirmation

- Không sửa backend/data/results/benchmark.
- Không commit/push nếu chưa được yêu cầu.
```

Khi còn `PARTIAL` hoặc `BLOCKED`, phải chỉ rõ phase/check nào chưa đạt và ảnh hưởng
đến report/video; không gọi UI đã freeze.

---

## 23. Bằng chứng thực thi — 2026-08-07

Các checkbox đã đánh dấu trong kế hoạch này dựa trên kiểm chứng thật sau đây:

- **Preflight/scope:** worktree ban đầu được ghi nhận trước khi sửa; `UI_PLAN.md`
  là file untracked của người dùng và được giữ lại, chỉ cập nhật checkbox/evidence
  theo yêu cầu. Không reset, revert, commit hay thay đổi `frontend1/`.
- **Browser Chromium:**
  - 1366×768: A* Chợ Bến Thành → Dinh Độc Lập thành công, kết quả/timeline/bảng
    g/h/f đúng hierarchy; Held–Karp ba điểm giao, trace tối ưu, so sánh trước/sau
    và timeline tối ưu thành công.
  - 1024×768: chỉ controls là rail cố định; result có trigger `Kết quả`, mở overlay,
    focus heading và trả focus khi đóng; map không horizontal scroll.
  - 390×844 và 320×568: sheet controls/results một cột, Escape/focus return đúng,
    không horizontal page scroll. 683×384 được dùng làm CSS-viewport equivalent
    cho reflow 200% zoom; không ghi là browser-zoom hotkey thật.
  - Keyboard: Tab/Shift+Tab, Enter/Space, Radix Select, Arrow tabs/slider,
    Escape tooltip/select/sheet, row g/h/f, play/pause và focus trap đều đã chạy.
    `prefers-reduced-motion: reduce` sau reload khóa player và giữ route tĩnh.
  - States: empty, loading, graph error + Retry, benchmark ready/error, offline,
    G_real guardrail, scenario override/restore, compare, sequential route,
    Bidirectional Dijkstra, IDA*, Beam, BFS, NN+2-opt/Or-opt và SA đều đã được
    kiểm bằng UI. Bảy theme đã smoke-test; Default/Đen/Trắng có full flow.
- **Clean restart trước ảnh README:** backend/frontend restart, hard refresh;
  `GET /api/graph?level=demo&view=full` xác nhận 51 node, 298 cạnh, 60 một chiều.
  Trong session mới: graph/traffic, `POST /api/route` và `POST /api/multiroute`
  đều 200; console có 0 errors. Hai ảnh 1366×768 đã inspect ở độ phân giải gốc
  rồi cập nhật `artifacts/readme/dark-route-result.png` và
  `artifacts/readme/light-atsp-result.png`.
- **Commands đã PASS trước final diff:** `npm test` (40/40),
  `npx tsc --noEmit`, `npm run build`, backend pytest (176/176),
  `scripts/validate_data.py` và `scripts/check_contrast.py` (đủ bảy theme).
  Cảnh báo duy nhất của pytest là Starlette/httpx deprecation từ dependency,
  không phải failure của worktree.
- **Tài liệu sau freeze:** `docs/DESIGN.md` giữ contract UI hiện hành;
  `README.md` phản ánh browser QA ba viewport và hai ảnh artifact mới;
  `mustTODO.md` ghi một addendum dated tách biệt checkpoint trước phase;
  `report/BaoCao-Khung.md` và `report/Slide-Outline.md` bỏ claim cũ rằng GUI
  chưa responsive mobile, không thay số benchmark hay marker `SỐ TẠM`.

---

## 24. Bằng chứng bổ sung sau freeze — 2026-08-08

- Panel trái chỉ còn launcher/trạng thái kịch bản; tab `Thử nghiệm` bên phải
  là editor duy nhất, có hai chế độ loại trừ nhau `Chọn nhanh` và `Chỉnh chi
  tiết`. Bảng kỹ thuật được kiểm qua UI thật với ba cột `Thông số`, `Gốc`,
  `Đang thử`; cột thay đổi có nhấn thị giác.
- Marker Đi/Đến có fill ngữ nghĩa, viền tương phản và chip chữ; tooltip
  phân biệt đúng nút (`n...`) và cạnh (`e...`, `u → v`). Browser QA lại tại
  1366×768, 1024×768 và 390×844 không có horizontal page scroll; keyboard
  open/close/focus return, reduced motion, empty/loading/error và validation error đều đạt.
- Fresh verification: `npm test` 40/40, `npx tsc --noEmit`, `npm run build`,
  backend pytest 176/176 và `scripts/validate_data.py` đều PASS. Clean runtime
  session trả graph 51/298/60 one-way, route/multiroute 200 và console 0 errors.
- Hai ảnh README 1366×768 được chụp lại sau khi UI ổn định và inspect
  ở độ phân giải gốc. Không sửa backend/API/schema/data/results; không chạy
  benchmark, gamma calibration, generator, crawl hay graph/profile rebuild.
- Polish cuối giữ tên thuật toán ở dạng ngắn (`BFS`, `DFS`, `IDDFS`, `UCS`…),
  đổi toàn bộ số liệu hành trình nhìn thấy sang km/phút và giữ runtime ở ms.
  Hai metric chính chia 50/50 trên desktop, tự xếp một cột dưới 640 px; nhãn
  `Điểm giao hàng` dùng cùng cấp chữ với nhãn Đi/Đến. Route thật ở 1366×768 và
  reflow 390×844 đã được inspect; console không có error/warning.
