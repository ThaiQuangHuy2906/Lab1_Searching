# DESIGN.md — Hợp đồng thiết kế giao diện (Phase 5)

> **Trạng thái 2026-08-05:** đây là nguồn chuẩn về ý đồ, token và hành vi UI.
> M1–M5 đã có implementation; `npm test` (19 test) và `npx tsc --noEmit` đạt.
> Browser QA vẫn là bằng chứng riêng: các khẳng định về cuộn, bàn phím, map, theme,
> offline, responsive và accessibility vẫn phải được kiểm tra trên trình
> duyệt/độ phân giải dùng để quay hoặc bảo vệ.
>
> **Luật:** mọi màu/font/hiệu ứng trên UI phải tra được về token trong file này và
> `frontend/tailwind.config.ts`. Không tự thêm hiệu ứng ngoài đặc tả. Nếu cần token
> mới → thêm vào đây trước, code sau.

## 1. Định hướng

Cảm hứng: **phòng điều khiển giao thông + app gọi xe Việt Nam**. Bộ chọn giao diện
ở góc phải-trên cung cấp bảy theme và lưu lựa chọn vào `localStorage`:

- **Mặc định** — control room tối, cyan/violet/amber; đây là theme khởi tạo và là
  quy ước dùng cho video demo + screenshot báo cáo để mọi hình nhất quán.
- **Trắng** — nền sáng trung tính, basemap Carto positron.
- **Đen** — nền gần đen, điểm nhấn xanh điện; basemap Carto dark-matter.
- **Hồng baby** — hồng phấn + xanh baby theo ảnh tham khảo người dùng.
- **Lavender** — tím lavender + hồng berry.
- **Sage & kem** — xanh sage + kem + hồng chỉ.
- **Lemon** — vàng chanh + xanh lá nhạt.

Đổi theme chỉ thay token màu/basemap; bố cục, dữ liệu, trạng thái hành trình,
semantic của thuật toán và khả năng tương tác không đổi. Mọi theme sáng dùng
`color-scheme: light`; `default` và `dark` dùng `color-scheme: dark`.

**Cấm:** gradient, glassmorphism, shadow MÀU, animation trang trí. Hiệu ứng được phép:
vòng pulse ở node đang expand (§3), transition ẩn/hiện drawer, và các **micro-feedback
chức năng** (duyệt v6): hover/active state 150 ms trên phần tử tương tác, nút nhấn
`scale(0.98)` khi active — phản hồi thao tác, không phải trang trí.

**Phân lớp v6/UI-01:** phần tử NỔI TRÊN BẢN ĐỒ (timeline, legend, cụm nút góc,
banner chọn điểm) dùng nền ĐẶC `surface-raised` + viền `surface-border-strong` +
**bóng trung tính** `shadow-float`
(`0 4px 16px rgb(0 0 0/0.45)` tối · `0 4px 16px rgb(0 0 0/0.14)` sáng) — chiều sâu
2 lớp rõ ràng: bản đồ ↔ điều khiển. Bóng đen trung tính, không phải shadow màu.

**UI-01 — Operational Control Room Refinement:** giữ nguyên kiến trúc ba cột và
mọi hành vi hiện có, nhưng chuẩn hóa thành năm vai trò surface: nền map/offline,
rail, panel/card, control chìm và chrome nổi. Map là vùng có visual weight lớn
nhất; rail/panel dùng tương phản nền và khoảng cách thay cho viền lồng nhau.
Header hai rail, toolbar map, timeline, legend và banner chọn điểm cùng dùng một
nhịp cao 36–52 px, bán kính 8 px và chrome nổi trung tính. Light mode có giá trị
surface/border riêng, không suy ra bằng cách đảo màu dark mode.

## 2. Token nền tảng

Mọi token là CSS variable trên `:root[data-theme]`; tailwind trỏ vào biến — component
chỉ dùng tên token, KHÔNG dùng mã màu trực tiếp. Bảng Dark | Light bên dưới tiếp tục
là cặp chuẩn để kiểm tra semantic; năm palette còn lại ánh xạ cùng bộ token.

| Token | Tối | Sáng | Dùng cho |
|---|---|---|---|
| `surface` | `#09090b` | `#f5f7fa` | nền trang mặc định |
| `surface-map` | `#070a0e` | `#f2f5f8` | nền map/offline |
| `surface-rail` | `#0d0e11` | `#f8f9fb` | panel trái và drawer phải |
| `surface-panel` | `#16171b` | `#ffffff` | card/section trong rail |
| `surface-control` | `#090a0d` | `#f6f7f9` | input, segmented control, vùng sunken |
| `surface-raised` | `#1c1d22` | `#ffffff` | toolbar, timeline, legend, banner/popover |
| `surface-border` | `#2a2b30` | `#dadee3` | viền tinh tế |
| `surface-border-strong` | `#3f4148` | `#bec3cc` | viền chrome nổi/focus-adjacent |
| `ink` | zinc-100 `#f4f4f5` | zinc-900 `#18181b` | chữ chính |
| `ink-dim` | `#a6a6b0` | zinc-600 `#52525b` | nhãn phụ, chú thích |
| `ink-faint` | `#767680` | zinc-500 `#71717a` | metadata rất thứ cấp, không dùng cho body nhỏ |
| `hl` (row highlight) | white @10% | zinc-950 @8% | hàng đang expand trong bảng g/h/f |
| Bo góc | **8px** (`rounded-lg`) — cả 2 chế độ | | thống nhất mọi panel/card/nút/input |
| Focus ring | 2px `algo-frontier`, offset 2px | | mọi phần tử focus bằng bàn phím |

### 2.1. Palette theme mở rộng

Các giá trị trong bảng là mã màu chuẩn; CSS dùng RGB triplet tương đương. `surface`
là nền trang, `panel` là card, `ink` là chữ chính; ba cột cuối là màu semantic
frontier / expanded / path nên không được dùng như màu trang trí tùy ý.

| Theme ID | Surface | Panel | Ink | Frontier | Expanded | Path | Bộ trang trí |
|---|---|---|---|---|---|---|---|
| `default` | `#09090b` | `#16171b` | `#f4f4f5` | `#22d3ee` | `#a78bfa` | `#fbbf24` | cyan · violet · amber |
| `light` | `#f5f7fa` | `#ffffff` | `#18181b` | `#0891b2` | `#7c3aed` | `#d97706` | sky · lavender · amber |
| `dark` | `#000000` | `#0c0f14` | `#f8fafc` | `#38bdf8` | `#818cf8` | `#facc15` | blue · indigo · yellow |
| `pink` | `#fff7fb` | `#fffcfe` | `#582e43` | `#d64b87` | `#478cbf` | `#c56f13` | `#f4a9cc` · `#bddbf2` · `#ffe1eb` |
| `lavender` | `#f9f6ff` | `#fdfbff` | `#41315c` | `#704eb8` | `#be4682` | `#b45e0e` | `#e4b7dd` · `#c9b8eb` · `#d8e4fb` |
| `sage` | `#f7f9f2` | `#fffdf7` | `#374432` | `#37765a` | `#b5536e` | `#b06e14` | `#edb1c1` · `#b4caa9` · `#d6e4cc` |
| `lemon` | `#fffcf2` | `#fffef8` | `#484326` | `#00768b` | `#6a5bad` | `#ae7000` | `#fde68a` · `#dde7a0` · `#fff4c2` |

Theme picker hiển thị nhãn tiếng Việt và ba swatch xem nhanh; danh sách dùng
Radix Select, điều khiển được bằng bàn phím, có accessible label “Chọn giao diện”.

**Font:** `Be Vietnam Pro` (400/500/700) toàn UI — đủ dấu Việt đẹp. `JetBrains Mono`
cho **mọi con số** (metrics, g/h/f, bước, toạ độ) với `tabular-nums`.
**Số kiểu VN:** dấu phẩy thập phân + NHÓM NGHÌN bằng non-breaking space (v11) —
`2 000,5 s` · `3,12 km` · `1 226` · `41 %` (helper `fmtVi`; tự cắt đuôi `,0`;
`fmtInt` quy về `fmtVi(n, 0)` — KHÔNG dùng `toLocaleString("vi-VN")` vì dấu chấm
nghìn của nó đá dấu phẩy thập phân).

## 3. Bảng màu ngữ nghĩa — CỐ ĐỊNH theo chế độ (map + legend + bảng + chart dùng chung)

Nguyên tắc chuyển Sáng: giữ NGUYÊN sắc (hue), tăng đậm 1–2 nấc để đạt tương phản
trên nền trắng; node đang expand đảo trắng→đen.

| Token | Tối | Sáng | Ý nghĩa |
|---|---|---|---|
| `algo-node` | zinc-300 `#d4d4d8` @67% | zinc-800 `#27272a` @65% | node nền G_demo; tăng tương phản với nền map theo từng chế độ; trace state dùng màu + kích thước lớn hơn để nổi bật |
| `algo-node-real` | zinc-300 @49% | zinc-800 @53% | node nền G_real; picking radius vẫn giữ riêng ở 8px |
| `algo-frontier` | cyan-400 `#22d3ee` | cyan-600 `#0891b2` | node trong frontier |
| `algo-expanded` | violet-400 `#a78bfa` | violet-600 `#7c3aed` | node đã expand |
| `algo-current` | white `#ffffff` + pulse trắng | zinc-900 `#18181b` + pulse đen | node đang expand |
| `algo-path` | amber-400 `#fbbf24` | amber-600 `#d97706` | tuyến kết quả, nét dày 6px |
| `bidi-forward` | cyan-400 `#22d3ee` | cyan-600 `#0891b2` | phía xuôi (side=forward) |
| `bidi-backward` | rose-400 `#fb7185` | rose-600 `#e11d48` | phía ngược (side=backward) |
| `edge-dim` | zinc-400 @49% | zinc-700 `#3f3f46` @49% | cạnh nền G_demo; sáng hơn trên dark và đậm hơn trên light, nhưng vẫn lùi sau route/trace |
| `edge-real` | zinc-400 @33% | zinc-700 @37% | cạnh nền G_real; tăng độ nhận biết mà không tạo “white hairball” |
| `cong-1..5` | `#10b981 #a3e635 #facc15 #f97316 #ef4444` | `#059669 #4d7c0f #a16207 #ea580c #dc2626` (lime-700/yellow-700 — đo WCAG trên nền positron) | thang ùn tắc 1→5 |
| Start | chip **"Đi"**: nền emerald-700 `#047857`, chữ trắng — CỐ ĐỊNH 2 chế độ (chữ 5,48) | | điểm xuất phát; token `start` (marker/badge) vẫn emerald-500/600 theo chế độ |
| Goal | chip **"Đến"**: nền red-600 `#dc2626`, chữ trắng — CỐ ĐỊNH 2 chế độ (đồ hoạ ≥3,5 / chữ 4,83) | | điểm đích; token `goal` vẫn red-500/600 theo chế độ |
| Stops | số trên nền amber theo từng theme; chữ sáng/tối được ghép theo palette để đạt tương phản chữ ≥4,5 | | điểm giao multiroute |
| So sánh | A `algo-path` liền 6px · B `algo-frontier` nét đứt DÀY 5px [10,5] trên CASING liền, dịch ngang **4 px chỉ ở tầng hiển thị** để lộ các cạnh trùng (tọa độ/metrics không đổi) | | 2 tuyến dễ đối chiếu |
| Nhãn POI trên map | zinc-50 TRẮNG HẲN, 12,5px đậm 600, halo tối 3px (v8d — kèm fix stale updateTriggers khi đổi theme) | zinc-800 ĐẬM HẲN viền trắng (v8e) | TextLayer G_demo |
| Basemap | Carto **dark-matter** | Carto **positron** | không cần key |

**Legend:** cố định góc **dưới-trái**, tiêu đề nhỏ "CHÚ GIẢI" (10px uppercase, v6),
luôn hiển thị; nội dung theo ngữ cảnh
(chạy 1 thuật toán → 5 mục thuật toán; bidijkstra → thêm 2 phía; bật lớp ùn tắc →
thang 1–5; so sánh → 2 tuyến). Nền `surface-raised`, chữ 12px; bản thân legend
không nhận pointer để không chặn thao tác map.

## 4. Bố cục

```
┌──────────────┬──────────────────────────────────┬───────────────┐
│ Panel trái   │            Bản đồ                │ Drawer phải   │
│ 320px cố định│  (Legend góc dưới-trái)          │ 400px, thu    │
│              │  (Timeline nổi giữa-đáy)         │ gọn được      │
└──────────────┴──────────────────────────────────┴───────────────┘
```

**Panel trái — thứ tự nhóm cố định:**
1. **Bối cảnh:** Đồ thị (G_demo/G_real) · Khung giờ (4 mốc) · Chế độ (3 mode)
2. **Thuật toán:** select 10 thuật toán + tham số phụ hiện theo ngữ cảnh
   (beam_width khi beam; epsilon khi idastar)
3. **Hành trình:** Đi · Đến (dropdown tên với G_demo, click bản đồ với G_real)
   · danh sách Stops (multiroute) + nút "Tối ưu thứ tự"
   · khi Đi/Đến đã có giá trị → hiện nút ✕ nhỏ bên phải để xoá chọn
   (cùng kiểu ✕ của hàng Stops: `text-ink-dim`, hover đỏ `goal`; duyệt v8)
4. Nút **"Chạy thuật toán"** lớn, full-width, cao 44px — **GHIM cố định đáy panel** (header + footer đứng yên, chỉ vùng giữa cuộn; duyệt v4: CTA từng bị đẩy khỏi màn hình)
+ Công tắc "Chế độ offline" (vẽ thuần deck.gl trên nền `surface`) và "Lớp ùn tắc".

*(Drawer nới 360→400 px ở duyệt v5d: cột f của bảng g/h/f từng bị cắt mép.)*

**UI-03 — accessibility/responsive audit:** ở layout chuẩn 1180–1600 px, panel
trái vẫn 320 px và drawer vẫn 400 px. Chỉ khi CSS viewport dưới 900 px (trường
hợp audit browser zoom 200%) hai rail co còn 280 px để map không sụp về 0; không
auto-collapse, không overlay và không đổi state/interaction. Toolbar giữ nguyên
chức năng nhưng ẩn nhãn chữ trực quan ở ngưỡng này (accessible name vẫn đầy đủ),
timeline cuộn ngang nội bộ nếu cần. Segmented control công bố `aria-pressed`,
toolbar/map/error có semantic name/status, và drawer chuyển focus sang nút toggle
thay thế sau khi mở/đóng. Khi timeline hiển thị, legend luôn nâng lên một tầng,
không phụ thuộc drawer mở hay đóng, để hai map chrome không chồng nhau.

**LUẬT VÔ HIỆU KẾT QUẢ CŨ — duyệt v10f (user bắt bug multiroute; rà thêm
thấy tuyến 2 điểm cùng bệnh):** mọi kết quả trên bản đồ là HÀM CỦA HÀNH TRÌNH —
đổi bất kỳ input hành trình nào (Đi / Đến / danh sách điểm giao, kể cả ⇅ và ✕)
thì kết quả liên quan VÔ HIỆU NGAY LẬP TỨC: tuyến 2 điểm + so sánh + tối ưu
thứ tự biến mất cùng animation (bản đồ không bao giờ hiển thị kết quả lệch
với panel). Chặn TẬP TRUNG một chỗ trong `store.set` — mọi đường mutate
(dropdown, click bản đồ, ✕, ⇅) đều đi qua. Đổi thuật toán/tiêu chí KHÔNG xoá
kết quả (dòng nguồn kết quả trong drawer ghi rõ cấu hình đã chạy).
Kèm yêu cầu user (v10f): khối "Phương pháp tối ưu thứ tự" LUÔN HIỆN thay vì ẩn —
chưa có điểm giao thì select + nút MỜ (disabled).
→ **v11 SỬA LẠI điểm này (đã được duyệt và kiểm tra trong M5):** label khối đổi thành
"Tối ưu thứ tự ghé (ATSP)" và VẪN luôn hiện (giữ discoverability đúng tinh thần
v10f), nhưng 2 control disabled được thay bằng MỘT dòng hint viền đứt "Thêm ít
nhất 1 điểm giao ở trên để mở phần tối ưu thứ tự ghé (bài toán ATSP)" — hết
control chết, panel ngắn bớt ~70px. Có điểm giao → select + nút hiện như cũ.

**v11 đợt 2 (user duyệt "làm full"):** (a) **Legend tự ẩn** khi không có gì đáng
giải mã (không kết quả, không so sánh, không lớp ùn tắc) — bỏ hẳn dòng "Nút giao"
đơn độc; (b) **marker G_real co giãn theo zoom** (node 2→3 px, cạnh 1,1→1,6 px,
lượng tử hoá nửa-mức-zoom để layer không rebuild mỗi frame) — MÀU giữ nguyên v8,
zoom sát trả lại đúng cỡ cũ; (c) **chuỗi chọn nối tiếp trên bản đồ**: chọn Đi xong
tự chờ chọn Đến (banner báo trước "xong sẽ chọn tiếp…"), chế độ thêm điểm giao
GIỮ NGUYÊN sau mỗi click (đếm n/15 trên banner, nút "Xong" để thoát, tự thoát khi
chạm 15) — phục vụ cảnh thêm 9 điểm của video; (d) **empty state drawer theo ngữ
cảnh đồ thị** (G_real: nhắc nút "Chọn trên bản đồ" + bật trace nếu muốn timeline)
+ khối "MẸO DEMO" 3 dòng (không nhúng số benchmark để khỏi lệch sau TomTom);
(e) **Section panel thu gọn được** (chevron xoay, aria-expanded, mặc định mở,
không persist; state control sống trong store — `tspMethod` được nâng lên store
để không reset khi section unmount).

**v11 đợt 3 (fix theo góp ý user trực tiếp + hội đồng review 3 lăng kính):**
(f) **Luật tour-mode (user yêu cầu):** THÊM điểm giao ⇒ tự BỎ điểm Đến (xử lý tập
trung trong `store.set`, kèm toast giải thích) — tour ATSP chỉ cần Đi + điểm giao;
XOÁ điểm giao không đụng Đến; chiều ngược (chọn lại Đến khi đang có điểm giao)
CHO PHÉP CÓ CHỦ ĐÍCH — không auto-xoá nhiều điểm giao vì một misclick. Hint CTA có
2 chuỗi tour-mode riêng; toast của nút Chạy cũng tour-aware ("dùng Tối ưu thứ tự,
hoặc xoá các điểm giao…"); chuỗi chọn nối tiếp không auto-chuyển sang Đến khi đang
có điểm giao. (g) **Label nhóm dropdown thuật toán** 10→11px + màu ngữ nghĩa
(`start`/`algo-path` như Badge ok/warn) + chấm tròn `bg-current`. (h) **ui/select
sửa bug cắt cụt im lặng:** cuộn chuyển về Viewport + ScrollUp/DownButton chevron
tự hiện khi tràn, `max-h min(20rem, available-height)` — chữa luôn dropdown 51 địa
danh. (i) **Legend né timeline (đã sửa lại 2026-08-04):** tự nâng
`bottom-[5.5rem]` khi effective trace thực sự làm timeline hiện, không phụ thuộc
drawer mở/đóng; transition 200ms. (j) **Fix theo review:**
So sánh chạy B bằng ĐÚNG mode/slot/graph của tuyến A (đổi Tiêu chí sau khi chạy
không còn làm B lệch đơn vị); hàng "Thời gian đi" một đơn vị cho cả hàng, balanced
LUÔN phút; bảng g/h/f bỏ thập phân khi ≥1 000 + cột h w-14 (mode Ngắn nhất h là
mét 4 chữ số); bảng So sánh overflow-x-auto + map tên ngắn thật (BiDijkstra,
Greedy…); `pickingRadius` 8px cho node G_real 2px; toast khi click thêm điểm giao
bị nuốt (trùng/trùng-Đi); khu hint CTA min-h cố định hết nhảy layout; footer g/h/f
hết mâu thuẫn với hướng dẫn bật trace; kicker alternatives font-bold đồng hệ.
(k) **Camera fit theo KHỐI NODE THẬT** thay vì meta.bbox (bbox phủ cả sông + bờ đông
trống nên G_demo bị lệch trái khung, drawer mở càng rõ — user bắt); đo đúng kích
thước khung bản đồ tại thời điểm fit, nút ⌂ re-fit theo bề rộng hiện tại (drawer
mở/đóng khác nhau).

**Panel trái v11 (redesign sau góp ý UI):** Tiêu chí tối ưu đổi dropdown →
**segmented 3 nút** cùng pattern Khung giờ (thấy đủ 3 mode một lúc, đỡ 1 click
khi demo); dropdown Thuật toán nhóm 3 nhóm `SelectGroup/SelectLabel` theo bảng
SCHEMA §B.5 ("Đảm bảo tối ưu" / "Bảo đảm trong biên ε" cho IDA* /
"Không đảm bảo — đánh đổi"); dưới CTA thêm dòng
trạng thái khi thiếu input ("Còn thiếu điểm Đi." / "…Đến."); nút chọn-trên-bản-đồ
hiện id node bằng font-mono; Section p-3 + vùng cuộn gap-2 p-2.5 (nén ~40px);
toàn bộ control hành trình + 3 nút chạy khoá chéo khi đang có request bay
(fix L3-04, batch KIEMTOAN B).

**Công tắc "Trace trên G_real" phản hồi TỨC THÌ — duyệt v10c (user bắt được
độ trễ):** công tắc điều khiển cả HIỂN THỊ hiện tại, không chỉ request lần sau:
OFF → timeline + lớp bước (frontier/expanded/current) biến mất NGAY (tuyến kết
quả + chip Đi/Đến giữ nguyên); ON → nếu kết quả đang có sẵn dữ liệu bước thì
timeline hiện lại ngay, nếu kết quả được chạy lúc OFF (không có bước) thì toast
nhắc "bấm Chạy thuật toán lại để xem từng bước".

**CARD HOÁ panel — duyệt v10, chuẩn hoá UI-01:** panel trái và drawer phải dùng
nền `surface-rail`; mỗi NHÓM nội dung là một **card** `surface-panel` bo
`rounded-lg` + viền — ba tầng rõ: rail `surface-rail` → card `surface-panel` →
control nhập `surface-control` (chìm trong card). Header app + footer CTA giữ
nền `surface-rail` làm khối trên/dưới. Khung giờ đổi thành **segmented control**:
khối `surface-control` p-0.5 viền, nút active variant default
(cyan), nút thường ghost — một khối liền thay 4 nút rời. Switch track OFF đổi
`surface-border` → `ink-dim/35` (track cũ tàng hình trên nền trắng). Nút ⇅
thành nút TRÒN viền nền `surface` chồng nhẹ giữa 2 ô, CĂN GIỮA ngang
(v10b — user chỉnh từ lệch phải; kiểu app gọi xe).

**Nút Xoá bản đồ — duyệt v9e:** cụm nút góc bản đồ (+/−/⌂) thêm vạch ngăn +
nút **thùng rác** (ghost, hover đỏ `goal`): xoá MỌI THỨ trên bản đồ một chạm —
kết quả (trace/so sánh/multiroute), lựa chọn Đi/Đến/điểm giao, animation;
disabled khi không có gì để xoá; toast xác nhận. KHÔNG đụng cấu hình
(đồ thị/khung giờ/tiêu chí/thuật toán giữ nguyên).

**Khối Đi/Đến — duyệt v9d (kiểu app gọi xe, §1):** chấm vai trò nằm TRONG ô
(trái, 10px): RỖNG (viền 2px màu vai trò) khi chưa chọn → ĐẦY khi đã chọn; viền ô
nhuốm màu vai trò khi có giá trị (emerald-700 Đi · red-600 Đến — đúng cặp màu chip
cố định §3); giữa 2 ô có nút **⇅ đảo chiều** (ghost, disabled khi cả 2 trống) —
điểm demo bất đối xứng: đồ thị có đường một chiều nên đảo chiều đổi chi phí.
Nhãn 2 field bỏ chấm (đã chuyển vào ô). Nút ✕ xoá giữ nguyên.

**Tooltip (icon ?) — duyệt v9c (bị chê nhỏ + chìm):** ĐẢO MÀU bằng token sẵn có:
nền `ink`, chữ `surface-panel` (tối: nền sáng chữ tối · sáng: nền tối chữ trắng —
tương phản ~17:1, tự đúng cả 2 chế độ, không thêm màu mới), chữ **13px/20px
font-medium**, đệm 14×10, `max-w-72`, mũi tên cùng màu nền, `shadow-float`,
không viền. Icon ? nâng size-3.5 → size-4.

**Panel nổi khỏi bản đồ — duyệt v9b:** panel trái VÀ drawer phải mang
`shadow-float` + `z-10` (bóng trung tính đổ lên bản đồ — cùng triết lý phân lớp
v6: bản đồ ↔ điều khiển; trước đó 2 khối này chỉ có viền 1px, phẳng).
Tiêu đề nhóm trong panel ("BỐI CẢNH"…) thêm THANH ACCENT dọc `algo-frontier`
2×12px + chữ nâng `ink-dim` → `ink` — mắt bắt nhóm nhanh hơn, không thêm màu mới.

**Điều khiển dạng form — duyệt v9, chuẩn hoá UI-01:** mọi control NHẬP
(SelectTrigger, input số, nút secondary) dùng nền **`surface-control`** — "khoét
sâu" một nấc so với panel ở CẢ 2 chế độ, hết cảnh input trắng-trên-trắng.
Popup/dropdown (SelectContent) dùng `surface-raised` + `shadow-float` (lớp NỔI).
Focus ring 2px `algo-frontier` (đã quy định §2) từ v9 áp THẬT vào code
Button/SelectTrigger/Switch/input. Switch: thumb TRẮNG cố định + viền
`ring-black/15` + bóng nhỏ (thumb đen cũ nhìn nặng ở chế độ sáng); track giữ
`surface-border` (off) / `algo-frontier` (on). Placeholder Đi/Đến phân biệt:
"Chọn điểm xuất phát…" / "Chọn điểm đến…".

**Drawer phải — 3 tab:** `Số liệu` | `Giải thích` | `So sánh`
- Đầu tab Số liệu có **dòng nguồn kết quả**: "A* · Cân bằng · 07:30 · G_demo" —
  kết quả đang xem thuộc cấu hình nào (tránh nhầm khi user đã đổi lựa chọn ở panel).
- Số liệu: card metrics (cost/time/km/expanded/max frontier/runtime + badge
  "Đảm bảo tối ưu"/"Tối ưu trong ε"/"Không đảm bảo") + **bảng g/h/f** của frontier
  tại bước hiện tại.
  (v11 — redesign sau góp ý UI): stat card chia 2 TẦNG có kicker — "TUYẾN TÌM ĐƯỢC"
  (card Tổng chi phí bản rộng col-span-2 + Thời gian đi + Quãng đường) và "CÔNG SỨC
  TÌM KIẾM" (Đã expand · Frontier max · Runtime, lưới 3 cột gọn); card chi phí mang
  sub-line theo mode nói thẳng vì sao có thể trùng số card khác ("= thời gian đi +
  phạt rủi ro…", "= quãng đường, tính bằng mét") — hết cảnh 2 card cùng "2 000,5"
  không lời giải thích. `fmtVi` toàn cục thêm PHÂN NHÓM NGHÌN bằng space ("2 000,5 s",
  "1 226" — khớp phong cách docs/GIAI-THICH; fmtInt quy về fmtVi, bỏ toLocaleString
  vi-VN vì dấu chấm nghìn đá dấu phẩy thập phân). Bảng g/h/f: `table-fixed` + cột số
  bề rộng cố định (g/f w-16, h w-12) — tên node dài hết đẩy cột f tràn khỏi drawer
  (bug cắt cụt v10), tên tự truncate kèm title tooltip; "mức x/5" ở card ùn tắc tô
  congestionHex (chỉ xuất hiện mức ≥4 nên tương phản cao, cần mắt người xác nhận).
- Giải thích: `summary_vi`, danh sách đoạn ùn tắc (màu theo mức), card alternatives
  (label + số liệu + why_not). Khi tab mở → tô các cạnh `congested_segments` trên map.
  (v11 — redesign sau góp ý UI, KHÔNG đổi text backend): tên Đi/Đến WRAP thay vì
  truncate ("Chùa X…" hết cắt cụt); summary tách câu đầu làm LEAD in đậm `ink`, phần
  còn lại `ink-dim` (tách tại ". " — an toàn vì số liệu tiếng Việt dùng dấu phẩy thập
  phân); hàng chips thêm Badge ok/warn theo đúng contract (IDA* ghi biên ε thay vì
  "Đảm bảo tối ưu") đồng bộ 2 tab kia; thời gian
  <90 s đọc bằng giây thay vì "0,x phút"; card ùn tắc: badge đếm tổng đoạn + caption
  "gộp theo tên đường, lấy mức cao nhất" + chữ "mức x/5" tô đúng `congestionHex` của
  mức; nhóm alternatives có kicker "Tuyến thay thế đã xét — và vì sao bị loại", mỗi
  card thêm **Δ so tuyến chính** (thời gian + km, `start` nhanh/ngắn hơn · `goal`
  chậm/dài hơn — cùng ngữ nghĩa màu với cột Δ tab So sánh).
- So sánh (v11 — redesign sau góp ý UI): **câu kết luận** đứng trước bảng ("Tuyến của
  Greedy đắt hơn A* 337,4 s (+17 %)… Về công sức, Greedy expand ít hơn" — Δ ≥ 10 %
  in 0 chữ số lẻ, < 10 % in 1 chữ số), tự phân
  nhánh: cùng chi phí / một bên found=false. Bảng 4 cột `Chỉ số · A · B · Δ B/A`:
  (a) dòng theo mode — không bao giờ có 2 dòng trùng số (balanced bỏ dòng thời gian
  giây thô, thay bằng "Thời gian đi" đọc theo PHÚT khi ≥90 s; distance bỏ dòng quãng
  đường trùng); (b) **màu tuyến chỉ nằm ở header** (kèm vạch swatch liền vàng / đứt
  lam trùng chú giải bản đồ) — bên THẮNG in đậm `ink`, bên thua `ink-dim`, không dùng
  màu tuyến tô giá trị (hết lẫn "màu của ai" với "ai tốt hơn"); (c) cột Δ = % B so A,
  `start` khi B tốt hơn / `goal` khi kém (mọi chỉ số càng thấp càng tốt), caption ghi
  chú quy ước; (d) hàng "Bảo đảm kết quả" dùng Badge ok/warn như tab Số liệu và ghi
  rõ biên ε khi một tuyến dùng IDA*.
  Khi hai thuật toán dùng chung cạnh, tuyến B và mũi tên B được `PathStyleExtension`
  dịch sang phải 4 px ở tầng render; casing và thân dùng hệ số khác nhau để cùng đạt
  đúng 4 px. Legend/caption nói rõ đây chỉ là lệch hiển thị. Một card "Độ trùng tuyến"
  báo số cạnh có hướng chung, chỉ A, chỉ B và tỷ lệ Jaccard `chung / hợp`, nên trường
  hợp cùng chi phí nhưng khác đường hoặc cùng đường nhưng khác công sức vẫn đọc được.

**UI-02 — ATSP control flow refinement:** phần Hành trình giữ nguyên NodePicker,
store và `runMulti`, nhưng trình bày ATSP theo chuỗi Đi → thứ tự điểm giao → phương
pháp → tối ưu → kết quả. Khi chưa có stop, một empty subpanel hướng dẫn ba bước và
không bày method/action bị vô hiệu. Khi có stop, status strip “Chế độ nhiều điểm”
ghi rõ điểm Đi, số điểm giao và việc điểm Đến không tham gia; danh sách giữ đúng
thứ tự `stops`, mỗi hàng có badge amber chữ zinc-950 và nút xoá 36 px. Control thêm
điểm nằm sau danh sách, khoá và hiện caption khi đạt 15 stop. Method block phân biệt
“Tối ưu tuyệt đối” với “Nghiệm xấp xỉ”; Held-Karp chỉ cho tối đa 14 stop + điểm Đi,
không tự đổi method hoặc xoá stop khi vượt giới hạn. Khi chạy, panel hiển thị spinner
và drawer ưu tiên skeleton ATSP hơn result cũ, không có phần trăm giả.

Kết quả ATSP trong tab Số liệu dùng metadata strip (method · mode · slot · graph),
guarantee badge theo `optimal_guarantee`, card thay đổi chi phí diễn giải
`savings_pct` theo dấu (dương: “tiết kiệm”/success; âm: “tăng chi phí”/warning;
0: “không đổi”/neutral), cặp card “Theo thứ tự nhập”/“Sau tối ưu” và itinerary đánh số theo
`multi.order`. Tên method luôn là nhãn thân thiện, không in raw enum; `found=false`
có state riêng, không rơi về empty state của route hai điểm. Toàn bộ dùng token và
năm vai trò surface của UI-01; không thêm màu, dependency hay interaction mới.

Hai tab còn lại cũng nhận biết ATSP mà không đổi API/state: **Giải thích** diễn giải
phương pháp, guarantee, tiêu chí, tính bất đối xứng và tác động thời gian/quãng đường
từ chính `MultirouteResponse`; **So sánh** đối chiếu "Thứ tự nhập" với "Sau tối ưu"
cho cost/time/distance. Đây không phải so sánh đồng thời hai phương pháp ATSP vì store
chỉ giữ một `multi`; UI phải nói rõ giới hạn đó thay vì giả lập thêm kết quả.

## 5. SIGNATURE — Timeline trình phát

Thanh nổi giữa-đáy bản đồ, nền `surface-raised`, viền `surface-border-strong`:
`[⏮ step-back] [▶/⏸] [⏭ step-forward] [━━━●━━ slider] [Bước 37/143] [tốc độ ▾]`

- Tốc độ: 0.5× / 1× / 2× / 4× / 8× / 16× (base 500 ms/bước; 16× thêm ở v10e — 8× vẫn chậm với trace G_real hàng nghìn bước).
- **Đồng bộ hai chiều với bảng g/h/f:** kéo slider → bản đồ + bảng cùng nhảy tới
  bước đó; hàng node đang expand **sáng lên** (nền white/10, chữ trắng) và tự cuộn
  vào tầm nhìn; click một hàng trong bảng → nhảy tới bước node đó được expand.
- Phím tắt: `Space` play/pause · `←`/`→` lùi/tiến 1 bước.
- Đây là trải nghiệm xuất hiện xuyên suốt video giảng thuật toán — mọi thay đổi
  phải mượt ở 16× trên G_demo.

## 6. Bản đồ

- Basemap: MapLibre style **Carto dark-matter** (không cần key):
  `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
- Chế độ **Offline**: tắt basemap, vẽ thuần đồ thị bằng deck.gl trên nền `surface-map`
  — bảo hiểm wifi phòng bảo vệ; mọi lớp thuật toán giữ nguyên.
- G_demo: node LUÔN có nhãn tên POI ở mọi mức zoom (duyệt v8 — bỏ ngưỡng zoom 12.8; **collision filter** vẫn tự nhường khi label đè nhau); G_real: không nhãn.
- **Hover node** → tooltip tên POI (G_demo) / id nút (G_real) — nền `surface-raised`.
- **Mũi tên hướng TUYẾN** (duyệt v5c — thay bản mũi-tên-mọi-cạnh v5/v5b vì rối):
  ▶ CHỈ xuất hiện dọc tuyến kết quả sau khi chạy thuật toán — tuyến chính, các chặng
  multiroute, và tuyến B khi So sánh. Đặt tại trung điểm các đoạn, cách nhau ≥ ~220 m,
  xoay theo hướng di chuyển; màu **tối (zinc-950) cả 2 chế độ** + viền SDF MÀU TUYẾN
  (amber cho tuyến chính, cyan cho tuyến B) — đọc như mũi tên khắc trong dải tuyến,
  nổi cả khi tràn ra ngoài mép dải. Mũi tên B nhận cùng offset 4 px với thân tuyến B;
  không còn mũi tên trên cạnh thường.
- **Tuyến kết quả có viền (casing)**: lớp nền màu `surface` rộng 8,5px dưới lớp màu
  6px — tuyến nổi trên mọi nền bản đồ (kỹ thuật casing bản đồ chuẩn); áp dụng cho
  route chính, multiroute và tuyến so sánh. Toàn bộ stack tuyến kết quả nằm **trên**
  node nền, frontier và expanded để đám node G_real không cắt vụn tuyến khi zoom xa;
  current ring/pulse, nhãn POI, chip Đi/Đến/stop và mũi tên hướng vẫn nằm trên tuyến.
- **Luồng sáng tuyến kết quả (UI-XX):** khi route hai điểm đã có kết quả và timeline
  đang ở bước cuối, hoặc khi ATSP đã có multiroute hợp lệ, giữ nguyên casing + thân
  amber rồi chèn thêm một đoạn nhấn ngắn chạy theo chiều hành trình trong 3,2 giây
  và lặp liên tục. Với ATSP, các `legs` được nối thành một polyline liên tục, bỏ nút
  giao bị lặp ở ranh giới chặng, để luồng sáng chạy tuần tự từ Đi qua toàn bộ thứ tự
  giao thay vì khởi động đồng thời trên từng chặng. Hai `PathLayer`
  không pickable (halo amber 10px + lõi sáng 2,5px) dùng chung một deck.gl
  `LayerExtension`: tiến độ tuyến được tạo một lần thành vertex attribute, còn
  cửa sổ sáng chuyển động bằng shader uniform trong vòng redraw `_animate` của
  deck.gl. React không tick state và base graph G_real không rebuild theo frame.
  Hai lớp nằm trên frontier/expanded nhưng dưới mũi tên, current ring, nhãn và
  marker; chúng không pickable nên không che tương tác chọn node. Tuyến B và
  trace giữa chặng không chạy hiệu ứng. `prefers-reduced-motion:
  reduce` thay loop bằng lõi sáng tĩnh 2px; thân route gốc luôn còn nguyên nên
  nhận diện không phụ thuộc animation. Màu deck-only `routeFlowHalo`,
  `routeFlowCore`, `routeFlowStatic` có giá trị dark/light riêng trong
  `lib/colors.ts`; không tạo CSS animation, DOM overlay hoặc dependency mới.
- **Attribution** "© CARTO · © OpenStreetMap contributors" chữ 10px góc dưới-phải
  khi dùng basemap (bắt buộc theo license; ẩn ở chế độ Offline).
- Lớp ùn tắc: tô cạnh theo `cong-1..5` của khung giờ đang chọn.
- **Cụm điều khiển bản đồ** (v6, góc phải-dưới): 3 nút dọc `+` / `−` / `⌂ về toàn cảnh`
  — zoom có transition 250 ms, nút ⌂ bay về khung nhìn fitBounds ban đầu (FlyTo 500 ms).
  Cứu cảnh quay video khi lỡ pan/zoom lạc.

## 7. Copy & lỗi

- 100% tiếng Việt. Nút là **động từ**: "Chạy thuật toán", "Tối ưu thứ tự",
  "So sánh", "Dừng". Toast khớp tên hành động: "Đã chạy A* — 143 bước".
- Lỗi: toast đỏ hiện `message_vi` từ API **kèm cách sửa** ("Không tìm thấy node —
  hãy chọn lại điểm từ danh sách."). Mất kết nối backend: "Không gọi được backend
  (localhost:8000) — hãy chạy uvicorn rồi thử lại."

## 8. Sàn chất lượng

- Mọi vùng dữ liệu đủ 3 trạng thái: **loading** (skeleton xám nhấp nháy nhẹ) /
  **empty** (icon + 1 câu hướng dẫn hành động kế) / **error** (toast đỏ, vùng giữ nguyên).
- Component từ **shadcn/ui**: Button, Select, Tabs, Slider, Tooltip, Card, Switch,
  Badge, Skeleton — không tự chế primitive.
- Tooltip thuật ngữ (1 câu): icon **?** (CircleHelp 14px, `ink-dim`, hover/focus mới
  hiện) đặt NGAY SAU label — KHÔNG gạch chấm dưới label (duyệt vòng 2: gạch chấm
  gây rối). Icon phải focus được bằng bàn phím.
- Hàng công tắc (SwitchRow): label + icon ? bên trái, switch bên phải, thẳng hàng
  giữa theo trục dọc; không dùng label rỗng để căn.
- Không lặp label: heading nhóm đã nói rõ thì control đầu nhóm không cần label
  trùng tên (vd nhóm "Thuật toán" → select đứng trực tiếp).
- Stat card (drawer Số liệu): icon lucide 14px `ink-dim` cạnh label, giá trị
  `font-mono` 15px đậm, đơn vị/chú thích 10px `ink-dim`.
- Bảng g/h/f có chú thích cột cố định dưới bảng: "g: chi phí đã đi · h: ước lượng
  còn lại · f = g + h".
- **G_real guardrails:** ẩn bảng g/h/f, `include_trace` mặc định tắt, cảnh báo khi
  bật trace ("Trace trên G_real có thể rất lớn — bật khi thật cần").

## 9. Trang /benchmark

Trang là bề mặt **chỉ đọc** cho `POST /api/benchmark`; không chạy lại benchmark,
không ghi `results/` và không đưa lệnh rebuild/rerun vào UI. Thứ tự thông tin:
header gọn → tiêu đề/ngữ cảnh → provenance → các chart card → bảng dữ liệu chi tiết.

- Ready/partial hiện provenance với badge **SỐ TẠM**. Copy phải nói rõ artifact trong
  `results/` cũ hơn graph hiện hành, chỉ dùng minh họa giao diện hoặc tham khảo lịch sử
  và không phải kết quả benchmark chính thức của dữ liệu đang dùng. Loading dùng
  skeleton; empty/error chỉ giữ ghi chú nguồn gọn để không giả trạng thái ready.
- Ready có ba slot ổn định: node expand (exp3), runtime (exp3), độ nhạy γ (exp5).
  Thiếu nguồn nào thì slot đó hiện placeholder riêng; không làm phần còn lại biến mất.
- Loading dùng skeleton theo đúng cấu trúc ba card. Empty/error có hành động Thử lại,
  giữ layout và không hướng dẫn người dùng tự chạy benchmark. Trong khi retry, nút giữ
  nguyên bề rộng, khóa double-submit và thông báo trạng thái bằng `aria-live`.
- Chart dùng `surface-panel`, lưới `surface-border`, chữ `ink-dim`; series lần lượt dùng
  `algo-frontier`, `algo-expanded`, `algo-path`. Tooltip và mọi số hiển thị dùng format
  tiếng Việt cùng đơn vị rõ ràng.
- Mỗi chart có tên/mô tả văn bản và một `<details>` chứa bảng dữ liệu tương đương, với
  caption, header có `scope="col"`, keyboard focus và vùng cuộn ngang chỉ bên trong bảng.
- Recharts nằm trong `ResponsiveContainer`; lưới chuyển thành một cột khi bề rộng không
  đủ. Chuyển động chart phải tắt khi `prefers-reduced-motion: reduce`.
- XAxis bar chart dùng `interval={0}` (không auto-skip), nhãn nghiêng −30°, cỡ 10 và
  đủ chiều cao. YAxis hai bar chart dùng thang log, tick 1k/10k/100k; giá trị chart
  phải > 0 (expand chặn dưới 1, runtime chặn dưới 0,01 ms) vì log không nhận 0.

## 10. Kiểm định tương phản (tự động)

`python scripts/check_contrast.py` — parse palette thật từ `lib/colors.ts` + CSS vars,
đọc màu nền basemap **thật** từ style JSON của Carto, tính contrast WCAG:
đồ hoạ thông tin ≥ 3,0 (so cả nền panel lẫn nền basemap), chữ ≥ 4,5. Trạng thái:
**PASS toàn bộ cả 2 chế độ** (2026-07-26). Ngoại lệ CÓ CHỦ ĐÍCH, không tính ngưỡng:
`algo-node`, `algo-node-real`, `edge-dim` và `edge-real` — node/cạnh "chưa thăm"
nhận diện bằng SỰ VẮNG màu,
cố ý chìm để lớp thuật toán nổi; nếu nâng đạt 3,0 thì toàn bản đồ sáng rực và
frontier/expanded mất độ nổi. Cần mắt người xác nhận khi duyệt.

## 11. Mở rộng đã duyệt 2026-08-04 — view, ATSP trace và sandbox

Phần này khóa UX cho contract §E của `docs/SCHEMA.md`. Đây không cho phép UI
tự dựng graph, tự hash scenario, hoặc giả kết quả chưa có backend; backend là
authority của view, scenario và fingerprint.

### 11.1. GraphView dạy học

- Control `Graph view` chỉ có bốn identifier canonical: `full`, `teach_7`,
  `teach_15`, `teach_25`. Label được phép là “Toàn bộ G_demo — 51 node”, “Dạy học
  — 7 node”, “Dạy học — 15 node”, “Dạy học — 25 node”; không lộ identifier cũ
  hoặc tự tạo tên khác.
- Mặc định là `full`. Khi chọn `G_real`, UI chỉ cho `full`; nếu đang ở teach view
  rồi đổi graph sang real thì ép về `full` trước request graph/traffic tiếp theo.
- Chọn lại đúng view là no-op. Đổi view thật phải clear graph data, traffic, Đi,
  Đến, stops, route, compare, multiroute, trace/timeline, selected edge và
  overrides; UI không giữ kết quả thuộc node set khác.
- Graph/traffic request mang cùng snapshot `graph + graphView`; response phải echo
  `view_meta.graph_view`/`graph_view` khớp. Echo thiếu hoặc lệch là contract error
  có copy Việt, clear dữ liệu pending và không fallback im lặng sang `full`.
- Map chỉ render node/edge server trả về. Không dùng CSS/visibility chỉ để “ẩn” node
  của base graph vì như vậy route/traffic/ATSP vẫn có thể đi qua node không nhìn thấy.

### 11.2. ATSP optimization trace

- Trong khối ATSP có switch “Hiện quá trình tối ưu”, mặc định tắt. Bật switch chỉ
  đặt `include_trace=true` cho lần chạy mới; không bịa trace cho result cũ.
- Timeline hiện có tái dùng play/pause/step/slider/speed nhưng phải mang source
  discriminated `route` hoặc `optimization`. Run ATSP có trace bắt đầu ở step 0 và
  paused; `prefers-reduced-motion: reduce` luôn paused và không route-flow autoplay.
- Caption bắt buộc nói “Quá trình tối ưu thứ tự ghé”, không gọi event ATSP là bước
  mở rộng graph search. Event conceptual (subset/đề xuất thứ tự) dùng nét đứt và
  legend riêng; không gọi nó là đường xe chạy. Road leg thật chỉ được nhấn đầy đủ ở
  reconstruction/summary/final state.
- Với `held_karp_update`, map highlight toàn bộ `subset` theo màu frontier, làm
  nổi `endpoint` theo màu current, và vẫn vẽ nét đứt `predecessor → endpoint`.
  Đây là trạng thái DP khái niệm, không phải tuyến xe chạy.
- Khi timeline hiển thị, cụm zoom/home/clear của map phải nâng lên trên vùng
  timeline; tại 1366×768 mọi control vẫn nhận được click và focus, không bị thanh
  timeline che phủ.
- Player nêu method, event ordinal, policy sampling, `recorded_events/total_events`
  và dấu hiệu truncated. Các event không liên tiếp sau sampling là bình thường.
- Scenario/view/input đổi thật phải clear optimization trace cùng route trace;
  kết quả không trace vẫn hiển thị legs/final order như hiện tại.

### 11.3. Edge-override sandbox

- State sandbox chỉ sống trong memory của frontend. Không localStorage,
  sessionStorage, URL query, backend session hay persistence. Refresh tab mất
  override là hành vi bắt buộc và phải nói rõ trong UI.
- Chỉ khi bật “Chỉnh cạnh thử nghiệm” map mới có pick layer cho edge. Pick layer
  rộng, không che node picker; node/route result layer giữ semantics cũ. Chọn edge
  mở tab drawer “Thử nghiệm” và chuyển focus vào control đầu tiên.
- Tab hiển thị edge ID, chiều `u → v`, tên, original/current length + speed,
  congestion bốn slot, bốn risk switch, `t_free`, factor, từng penalty, total
  penalty, distance/time/balanced weight theo slot hiện tại, override count và
  provenance/fingerprint của lần run gần nhất. Không có ô nhập raw weight.
- Control có `Reset edge` và `Reset all`, không tự âm thầm xóa dữ liệu khi user
  chuyển mục. Mọi edit effective phải clear route/compare/multi/timeline ngay;
  đổi slot giữ override nhưng refresh preview derived cho slot mới.
- Effective traffic overlay = base traffic + override của slot hiện tại trong
  render-derived state; tuyệt đối không mutate `traffic` base. Highlight edge
  selected/overridden dùng semantic role `scenario-selected`/`scenario-override`
  ánh xạ qua token hiện có (`algo-frontier`/`algo-path`), không hard-code hex.
- Client có feedback sớm cho input nhưng backend là authority. Không clamp;
  mismatch/error response được toast theo error envelope. Request route/compare/
  multiroute giữ snapshot graph/view/slot/mode/journey/scenario; response chỉ được
  nhận khi snapshot còn current. Compare còn phải khớp fingerprint của route chính.

### 11.4. Trình bày provenance và accessibility

- Result route/multiroute hiển thị `AppliedScenario`: view, số override effective,
  provenance và fingerprint server echo (font mono, có copy button nếu primitive
  sẵn có). Không tự phát minh fingerprint frontend.
- Copy giải thích no-override là “Dữ liệu gốc” (`base`) hoặc “Graph dạy học”
  (`graph_view`); chỉ dùng “Kịch bản thử nghiệm” khi provenance là
  `sandbox_override`.
- Legend chỉ xuất hiện cho lớp thực sự active. Route result legend vẫn giữ khi
  `found=true`; optimizer conceptual legend không thay thế route legend.
- Control mới dùng label Việt, focus ring §2, status/error `aria-live`, thứ tự
  keyboard hợp lý và không chiếm Space/Arrow của input, select, switch hay slider.
