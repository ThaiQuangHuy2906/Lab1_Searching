# UI & Explanation v2 — Phase 4 Readiness

> Checkpoint lịch sử của Phase 4. Current-state và gate còn mở xem
> `docs/UI-V2-PHASE8-READINESS.md`.

Ngày kiểm chứng: 2026-08-10  
Repository: `<repository-root>`
Branch/HEAD khi handoff: `main` / `97ec24fa7218e10bdbb1d17fd2c15f7c5fbd9994`

## 1. Kết luận nhanh

**Verdict: READY**

Phase 4 đã hoàn tất implementation và controlled browser QA. Hai frontier,
overlap, active side, `g` từng phía, current-step evidence, termination bound,
units và responsive/keyboard behavior đều được đối chiếu với response v2 thật.
Toàn bộ automated gate cũng pass lại sau browser-driven fix của Phase 3.

Người tiếp quản phải tiếp tục giữ nguyên contract/presenter hiện tại: không suy
hai frontier từ legacy union và không thay đổi backend stopping rule để phục vụ
UI.

## 2. Hai frontier Bidirectional Dijkstra

- Component riêng `bidirectional-frontier-tables.tsx` dùng
  `presentBidirectionalFrontiers()`.
- Với response v2:
  - render `Phía xuôi — từ Đi` và `Phía ngược — từ Đến`;
  - giữ node overlap trong cả hai bảng với hai giá trị `g` độc lập;
  - card của `step.side` có badge `Đang mở rộng`;
  - giải thích backward `g` là chi phí điểm→Đến (`node→Goal`) trên đồ thị gốc;
  - hiển thị μ và meeting node khi field thực sự có giá trị;
  - `distance` dùng km, `time` dùng phút và `balanced` dùng phút quy đổi.
- Với response v1:
  - chỉ render một hàng chờ union/min-g;
  - có nhãn compatibility rõ ràng;
  - không dựng giả forward/backward, active side, μ hoặc meeting node.
- `ghf-table.tsx` chọn two-side component cho Bidirectional Dijkstra v2 nên không
  hiển thị đồng thời bảng union gây hiểu nhầm.
- Vùng cuộn của từng bảng là named keyboard-focusable region.

## 3. Map và legend

- `use-animation.ts` derive riêng:
  - forward frontier set;
  - backward frontier set;
  - overlap set;
  - side của các node đã/current expanded.
- Map dùng màu riêng cho forward/backward và viền phía ngược trên fill phía xuôi
  cho overlap.
- Current node vẫn có fill trung tính và vòng ngoài theo đúng `step.side`; không
  bị hiểu nhầm là phía xuôi ở backward step.
- Legend có text và shape cue:
  - phía xuôi;
  - phía ngược;
  - overlap với viền kép;
  - current với ring;
  - final route và hướng di chuyển không đổi semantics.
- Không thay map click, edge editor, route reconstruction, final path hoặc
  timeline ownership.

## 4. Giải thích bước hiện tại và termination

- Presenter dùng typed decision facts v2, không parse prose:
  - side vừa expand;
  - selected `g`;
  - effective top forward/backward trước expansion;
  - `mu_before`;
  - số điểm hai frontier sau expansion;
  - `best_path_cost`/meeting sau expansion.
- Dữ liệu trước và sau bước được đặt ở hai field/section riêng. Audit cuối đã sửa
  lỗi trước đó khi μ sau và frontier sau bước còn nằm dưới nhãn
  `Bằng chứng trước bước`.
- Root termination chỉ được trình bày từ typed
  `termination.reason=bidirectional_bound_met` và
  `termination.bidirectional_bound`:
  `top_forward + top_backward >= μ`.
- Top của frontier rỗng được trình bày là effective `+∞ (frontier rỗng)`, không
  ghi mơ hồ `chưa có` và không dùng giá trị đã round để quyết định stopping rule.
- `trace_truncated` chỉ thêm caveat payload timeline bị rút gọn; metrics và
  termination vẫn được mô tả là full run.

## 5. File chính

- `frontend/components/bidirectional-frontier-tables.tsx`: two-side/legacy UI.
- `frontend/components/ghf-table.tsx`: integration, không double-render union.
- `frontend/lib/bidirectional-frontier-policy.ts`: B2/B1 presenter và units.
- `frontend/lib/search-step-explanation.ts`: pre/post/root narrative.
- `frontend/components/explanation/search-step.tsx`: current-step rendering.
- `frontend/lib/use-animation.ts`: side/frontier/overlap derived state.
- `frontend/components/map-view.tsx`: side colors, overlap outline, current ring.
- `frontend/components/legend.tsx`: text/shape/non-color cues.
- `frontend/tests/bidirectional-frontier.test.mjs`: two g, active side, units và
  legacy union fallback.
- `frontend/tests/search-step-explanation.test.mjs`: pre/post μ, termination,
  empty-frontier effective infinity và trace caveat.

Các file này đang nằm trong worktree chưa commit ở thời điểm handoff.

## 6. Automated evidence

| Lệnh/test | Kết quả thực tế |
|---|---|
| `npm test` trong `frontend/` | PASS — 112/112 tests |
| `frontend/tests/bidirectional-frontier.test.mjs` trong full run | PASS — B2 two sides/overlap two-g/active side/units và B1 union fallback |
| `frontend/tests/search-step-explanation.test.mjs` trong full run | PASS — nine algorithms, Bidi pre/post μ, root bound, empty frontier và legacy fallback |
| `npx tsc --noEmit --incremental false` | PASS — exit 0 |
| Backend full suite bằng Python 3.14.7 temp venv | PASS — 230/230, 1 Starlette deprecation warning, 16,57 s |
| Data validator | PASS — `ALL DATA VALID` |
| `npm run build` | PASS — Next.js 15.5.22 compile/type/static generation 6/6, 28,8 s |
| Controlled Playwright/Chrome QA | PASS — 113/113 runtime assertions; Bidi 16/16 steps đối chiếu payload |
| Live Bidi/ATSP HTTP smoke | PASS — Bidi v2 có two-side và `bidirectional_bound_met`; ATSP open 3 legs, closed 4 legs |
| `git diff --check` | PASS |

Legacy Bidirectional fallback hiện được chứng minh bằng committed/pure fixture,
không phải runtime B1 deployment test.

## 7. Browser evidence và giới hạn

- Browser plugin không có runtime trong VS Code; sau khi người dùng cấp quyền,
  QA được chạy bằng Playwright độc lập với Chrome hệ thống và dependency tạm ngoài
  repository.
- Pair kiểm chứng: `Chùa Xá Lợi → Dinh Độc Lập`, G_demo/full, 07:30. Bidi v2 có
  16 bước và dừng bằng `bidirectional_bound_met`; overlap đầu tiên ở bước 3.
- Cả 16/16 bước được đối chiếu DOM với payload thật: active side, số/order node
  từng frontier, tên node, `g` đã format và số overlap ở cả hai bảng đều khớp.
- Bước overlap xác nhận hai named keyboard-focusable regions, đúng một badge
  `Đang mở rộng`, hai nhãn `cả hai`, μ và meeting node.
- Explain xác nhận selected `g`, top F/B, μ trước, frontier F/B và μ/meeting sau
  bước; root hiển thị `top F + top B >= μ` từ termination typed.
- Unit browser QA: distance dùng km, time dùng phút và balanced dùng
  `phút quy đổi`.
- Visual QA ở 1366×768 xác nhận màu forward/backward, overlap viền kép, current
  ring, legend và final route không va chạm; responsive/keyboard/reduced-motion/
  console/network dùng chung gate Phase 3 đều pass.
- B1 legacy fallback vẫn là fixture/guard evidence, không có deployment B1 riêng.
- Phase 5 explanation map overlay chưa được triển khai đúng theo ranh giới phase.

## 8. Checklist READY đã hoàn tất

- [x] Browser gate Phase 3 hoàn tất.
- [x] Bidi forward/backward/overlap/termination trên G_demo.
- [x] Đối chiếu toàn bộ 16 bước với response payload thật.
- [x] Hai `g`, active side, named regions, map fill/outline và current ring.
- [x] Root bound typed, không trình bày thành `goal_expanded`.
- [x] Distance/time/balanced units đúng.
- [x] Bốn viewport, keyboard, reduced motion, console và network pass.
- [x] Build, frontend tests, TypeScript, backend Python 3.14, validator và
  `git diff --check` pass sau sửa.

## 9. Ranh giới cho phase tiếp theo

- Phase 5 có thể bắt đầu từ cấu trúc Explain/subject/typed evidence đã được browser
  QA của Phase 3–4 xác nhận.
- Phase 5 không được thay two-side presenter bằng dữ liệu suy từ union hoặc prose.
- Phase 6/7 không được dùng state single hiện tại để giả lập comparison workspace;
  phải tiếp tục dùng immutable sessions/envelopes Phase 2.
- Phase 8 chỉ được cleanup sau khi Phase 3–7 có readiness evidence riêng.
- Không thay backend/schema/data/benchmark/generator để né các gate còn mở.
