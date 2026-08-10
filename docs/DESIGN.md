# DESIGN.md — Hợp đồng thiết kế giao diện

> **Trạng thái kiểm lại 2026-08-10:** đây là nguồn chuẩn về ý đồ, token và hành
> vi UI. UI & Explanation v2 đã triển khai qua Phase 6: Phase 5 map extraction
> và Phase 6 route comparison 2–4 đều READY. Evidence gần nhất là backend 230
> test, frontend 124 test, `ALL DATA VALID`, TypeScript pass và manual browser QA
> Phase 6 do người dùng xác nhận. Validator IDA* vẫn có known issue backend riêng.
> Trước khi quay vẫn phải pre-flight trên đúng trình duyệt/độ phân giải sử dụng.
> Phase 7 ATSP comparison và Phase 8 hardening chưa triển khai.
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
`33,3 phút` · `3,12 km` · `1 226` · `41 %` (helper `fmtVi`; tự cắt đuôi `,0`;
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
2. **Thuật toán:** select 9 thuật toán + tham số phụ hiện theo ngữ cảnh
   (beam_width khi beam; epsilon khi idastar)
3. **Hành trình:** Đi · Đến (dropdown tên với G_demo, click bản đồ với G_real)
   · danh sách Stops (multiroute) + nút "Tối ưu thứ tự"
   · khi Đi/Đến đã có giá trị → hiện nút ✕ nhỏ bên phải để xoá chọn
   (cùng kiểu ✕ của hàng Stops: `text-ink-dim`, hover đỏ `goal`; duyệt v8)
4. Nút **"Chạy thuật toán"** lớn, full-width, cao 44px — **GHIM cố định đáy panel** (header + footer đứng yên, chỉ vùng giữa cuộn; duyệt v4: CTA từng bị đẩy khỏi màn hình)
+ Công tắc "Chế độ offline" (vẽ thuần deck.gl trên nền `surface`) và "Lớp ùn tắc".

*(Drawer nới 360→400 px ở duyệt v5d: cột f của bảng g/h/f từng bị cắt mép.
Từ UI v2 Phase 6, desktop `>=1280px` có separator kéo ở mép trái để đổi rộng
360–720 px; double-click trả về 400 px và keyboard Left/Right đổi từng 24 px.)*

**UI-03 — accessibility/responsive audit:** ở layout chuẩn 1180–1600 px, panel
trái vẫn 320 px và drawer mặc định 400 px; từ 1280 px drawer có thể kéo rộng
theo contract phía trên. Chỉ khi CSS viewport dưới 900 px (trường
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
không còn làm B lệch đơn vị); hàng balanced-cost (tên lịch sử “Thời gian đi”,
không dùng lại ở UI mới) một đơn vị cho cả hàng và LUÔN phút; bảng g/h/f bỏ thập phân khi ≥1 000 + cột h w-14 (mode Ngắn nhất h là
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

**Drawer phải — 4 tab:** `Số liệu` | `Giải thích` | `So sánh` | `Thử nghiệm`
- Đầu tab Số liệu có **dòng nguồn kết quả**: "A* · Cân bằng · 07:30 · G_demo" —
  kết quả đang xem thuộc cấu hình nào (tránh nhầm khi user đã đổi lựa chọn ở panel).
- Số liệu: card objective/quãng đường/expanded/max frontier/runtime + badge
  "Đảm bảo tối ưu"/"Tối ưu trong ε"/"Không đảm bảo" và **bảng g/h/f** của frontier
  tại bước hiện tại. Objective theo mode lấy từ `total_cost`: Quãng đường ở mode
  distance; Thời gian ước tính theo ùn tắc ở mode time; Chi phí cân bằng ở mode balanced.
  (v12 — current): mode time/balanced đặt objective và quãng đường thành hai card
  50/50 cùng hàng trên desktop; dưới 640 px tự xếp một cột. Mode distance chỉ có
  một card toàn hàng để không lặp cùng metric. Mọi distance/travel-cost nhìn thấy
  dùng km/phút; sub-line chỉ giải thích có/không gồm phạt rủi ro. "CÔNG SỨC TÌM
  KIẾM" giữ ba card Đã expand · Frontier max · Runtime, trong đó runtime dùng ms.
  `fmtVi` toàn cục phân nhóm nghìn bằng non-breaking space. Bảng g/h/f: `table-fixed` + cột số
  bề rộng cố định (g/f w-16, h w-12) — tên node dài hết đẩy cột f tràn khỏi drawer
  (bug cắt cụt v10), tên tự truncate kèm title tooltip; "mức x/5" ở card ùn tắc tô
  congestionHex (chỉ xuất hiện mức ≥4 nên tương phản cao, cần mắt người xác nhận).
- Giải thích dùng evidence typed, không parse `summary_vi`. Với route hai điểm ở
  **Chạy một**, ngay sau verdict là khối “Vì sao chọn tuyến này?”: selector tối đa
  hai tuyến hậu kiểm, path có tên điểm, bảng route kết quả/reference/Δ cho quãng
  đường, thời gian theo ùn tắc, delay, penalty và balanced cost, cùng kết luận
  trade-off theo đúng mode và guarantee của từng thuật toán. Nút view-only vẽ
  reference nét đứt lệch 4 px trên primary map; legend phân biệt hai tuyến. Flow
  này cấm ở **So sánh nhiều**. “Thuật toán đang làm gì?” chuyển xuống cuối,
  câu phổ thông theo từng algorithm luôn hiện còn g/h/f/frontier/μ/bound nằm trong
  disclosure kỹ thuật. Không gọi route hậu kiểm là route thuật toán đã xét/bị loại.
  Khi response có `congested_segments`, map tô đỏ các cạnh mức 4–5 của **tuyến kết
  quả cuối cùng** và panel ghi rõ đây không phải đường thuật toán đang đi ở bước
  timeline hiện tại.
- So sánh route Phase 6 dùng **small multiples 2–4**: selector nằm trong `Chế độ
  chạy` ở panel trái; đúng N thuật toán tạo N pane/map final-only có cùng kích
  thước và camera độc lập. Map comparison chỉ cho pan/zoom/Home/tooltip, không
  chọn node/cạnh, clear, sửa scenario, timeline hoặc autoplay. Drawer phải gom
  status, objective, outcome, effort, guarantee và xếp hạng vào một bảng N-way có
  các cột thuật toán canh giữa; cột `Chỉ số` sticky khi cuộn ngang. Rank dùng
  `Hạng n`/`Đồng hạng n`, không dùng ký hiệu mơ hồ như `#1=`. Scenario và request
  snapshot phải giống nhau; exact methods bất đồng ngoài tolerance tạo integrity
  warning thay vì xếp hạng bình thường. Mỗi result mở đúng explanation subject;
  reference-route selector riêng của Chạy một không xuất hiện trong compare mode.

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
- Copy legacy của tab Giải thích phải trung thực ngay trước UI v2: route UCS
  tính hậu kiểm được gọi là **tuyến tham chiếu**, không phải tuyến thuật
  toán chính “đã xét/bị loại”. `total_time_s` chỉ được ghi là **chi
  phí cân bằng**, không phải thời gian thuần/ETA. Khung giờ là hồ sơ đại
  diện, không phải giao thông trực tiếp.

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
- Stat card (drawer Số liệu): icon lucide 14px `ink-dim` cạnh label; objective dùng
  `font-mono` 20px đậm, metric phụ 16px và công sức 15px. Label/chú thích giữ độ
  tương phản theo token; card objective có viền `algo-frontier` nhẹ.
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

- Control `Graph view` là ô nhập số node nguyên từ 3 đến 51. Số 3…50 ánh xạ
  chính xác tới identifier backend `teach_3`…`teach_50`; số 51 ánh xạ tới
  `full`. UI hiển thị số node thân thiện, không buộc người dùng nhập identifier.
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

## 12. UI Clarity Phase 2026-08-07 — hợp đồng hiện hành

> Phần này được thêm trước khi triển khai UI Clarity Phase. Nó làm rõ và, khi có
> mâu thuẫn, được ưu tiên hơn các mô tả visual lịch sử ở §1–§11. Mọi claim runtime
> trong phần này chỉ được ghi là đã kiểm chứng sau browser QA của phase.

### 12.1. Mục tiêu và thứ tự thông tin

Đối tượng chính là giảng viên/người chấm, thành viên quay demo và người mới học
search. Màn hình phải ưu tiên theo thứ tự: **hành động hoặc kết luận → giải thích
theo ngữ cảnh → chi tiết kỹ thuật**. Kết quả route luôn cho thấy trạng thái tìm
thấy, thuật toán/tiêu chí/slot/graph, bảo đảm và metric chính đúng đơn vị trước khi
lộ fingerprint, enum hoặc raw event: `distance` là **Quãng đường**,
`time` là **Thời gian ước tính theo ùn tắc**, còn `balanced` là **Chi phí cân
bằng**. Ba metric này
đều lấy từ `total_cost` theo mode hiện hành. `total_time_s` là balanced path weight
theo contract `docs/SCHEMA.md`, không được gọi mơ hồ là “Thời gian đi”; ở mode
`balanced` nó trùng `total_cost` nên không xuất hiện thành card/hàng so sánh thứ hai.
Quãng đường chỉ là metric phụ khi nó không trùng objective. Kết quả ATSP theo cùng
quy tắc mode-aware, đồng thời cho thấy thứ tự nhập, thứ tự sau tối ưu, mức thay đổi
chi phí, phương pháp và bảo đảm trước payload kỹ thuật.

Phần kỹ thuật vẫn là một phần của sản phẩm để bảo vệ đồ án, nhưng nằm trong
`<details>` có summary tiếng Việt: view, số override, nguồn kịch bản, fingerprint,
raw event kind/ordinal, sampling, ID, seed, nhiệt độ, delta và probability. UI
không tự tạo fingerprint hoặc diễn giải khác contract `docs/SCHEMA.md`.

### 12.1a. Quy ước hiển thị rút gọn — 2026-08-08

- Menu/chip/copy tên thuật toán dùng nhãn ngắn: `BFS`, `DFS`, `IDDFS`, `UCS`,
  `A*`, `Greedy Best-First`, `Dijkstra hai chiều`, `IDA*`, `Beam
  Search`. Không lặp các diễn giải “tìm theo bề rộng”, “tìm theo chiều sâu”,
  “đào sâu dần” hoặc “chi phí đồng nhất” trong nhãn tên; phần giải thích chỉ
  xuất hiện khi người dùng chủ động mở tab **Giải thích**.
- Contract API/store vẫn giữ `total_distance_m` theo mét và cost/epsilon theo
  giây. Mọi số liệu hành trình nhìn thấy trong **Số liệu**, **Giải thích**,
  **So sánh**, kết quả ATSP và summary/thông số của đoạn thử nghiệm hiển thị
  theo **km** và **phút**. Không hiển thị chuỗi kép dạng `254 s ≈ 4,2 phút`.
  `Thời gian xử lý` vẫn dùng `ms` vì đó là thời gian tính toán, không phải thời
  lượng hành trình.
- Trình chỉnh chi tiết nhận chiều dài theo km; UI đổi sang mét ngay trước khi
  ghi override. Ô ε của IDA* nhận/hiển thị km cho mode `distance` và phút cho
  mode `time`/`balanced`, rồi đổi về raw mét/giây trước khi gửi request. Đây là
  chuyển đổi presentation-only, không đổi schema, API hay dữ liệu.
- `summary_vi` và `why_not_vi` từ backend là dữ liệu nguyên gốc. Frontend chỉ
  áp adapter render để rút gọn bốn tên thuật toán nêu trên và đổi số thô
  `m`/`s` sang km/phút; không sửa response, dữ liệu hay logic tạo giải thích.
- Ba nhãn `Đi — điểm xuất phát`, `Đến — điểm đích` và `Điểm giao hàng` dùng cùng
  role `text-sm`; không hạ riêng nhãn điểm giao xuống caption.
- Khi có metric phụ, objective và quãng đường chia hai cột bằng nhau ở desktop;
  dưới 640 px chuyển về một cột. Mode distance không dựng card phụ trùng nghĩa.

### 12.2. Ngôn ngữ, chữ và thao tác

- Primary UI là tiếng Việt. Thuật ngữ chuẩn như A*, BFS, ATSP, Held–Karp, `g/h/f`,
  2-opt, Or-opt và Simulated Annealing được giữ nguyên, nhưng có ngữ cảnh Việt
  trước khi cần thiết.
- Dùng các nhãn chính: `Số điểm hiển thị`, `Đang chờ xét (frontier)`, `Đã duyệt
  (expanded)`, `Đang duyệt`, `Số điểm chờ lớn nhất`, `Thời gian xử lý`, `Sự kiện
  tối ưu`, `Nghiệm hiện tại`, `Nghiệm đang thử`, `Nghiệm tốt nhất đến lúc này`,
  `Nguồn kịch bản`, `Mã xác thực kịch bản`, và `Khôi phục`.
- Page/panel title là 18–20 px; section title 13–14 px; body/control 14 px;
  helper/actionable text tối thiểu 12 px với line-height tối thiểu 18 px. Chỉ
  attribution bản đồ và raw hash trong chi tiết kỹ thuật có thể là 10–11 px.
- Nút/icon thao tác đạt ít nhất 36 px; CTA và control chính hướng đến 40–44 px.
  Focus ring 2 px vẫn dùng token `algo-frontier` và không được bị che/cắt.
- Tooltip chỉ bổ sung định nghĩa ngắn; hướng dẫn cần thiết để hoàn tất task phải
  thấy trực tiếp. Tooltip, disclosure và tab giữ pattern keyboard/Radix hiện có.

### 12.3. Surface và hierarchy

Giữ bảy theme, token semantic, font và map palette hiện hữu. Bỏ toàn bộ gradient
trang trí, pseudo-content `✦`/`♡`, shadow màu và decorative sparkle. Các surface
đổi sang nền đặc theo vai trò: `app-shell-surface`, `app-rail`, `app-header`,
`app-card`, `map-frame` và `floating-chrome`. `shadow-float` chỉ là bóng trung
tính dùng cho chrome nổi trên bản đồ; không được mang màu theme.

Rail là surface liên tục. Card chỉ dùng để gom một đơn vị thông tin; không bọc mọi
khối nhỏ bằng card lồng nhau. Map giữ visual weight lớn nhất. Khi đã có route,
cạnh/node nền giảm emphasis bằng opacity/width token nhưng vẫn còn context, còn
casing, arrow, chip `Đi`/`Đến`, stop ordinal, current ring, final route, reference
route nét đứt và chú giải không-màu giữ nguyên semantics đã khóa. Điểm Đi và Đến có marker tròn
đặc riêng theo token `start`/`goal`, viền tương phản và chip chữ tương ứng; không
chỉ dựa vào màu. Tooltip phải gọi đúng “Nút” cho node và “Đoạn” cho edge, không
được cast edge thành node chỉ vì cả hai cùng có `id`.

### 12.4. Responsive shell và disclosure

- Từ 1280 px: giữ ba vùng (controls 304–320 px, map nhận phần còn lại, result
  mặc định 400 px và kéo được 360–720 px theo available viewport) với CTA sticky
  trong panel trái. Resize handle có semantics separator, keyboard Left/Right,
  Home/End và double-click reset; không persist qua reload.
- Từ 960 đến 1279 px: chỉ controls là rail cố định; kết quả là side panel overlay
  mở bằng trigger `Kết quả`, rộng `min(400px, 44vw)`. Mở panel đưa focus vào panel;
  nút đóng hoặc `Escape` (sau khi đóng tooltip/select lồng nếu có) phải đóng panel và
  trả focus về trigger.
- Dưới 960 px: controls và kết quả là sheet/panel một cột mở từ app bar; không giữ
  hai rail cạnh nhau. Dưới 640 px sheet gần toàn viewport, cuộn độc lập, CTA sticky
  nằm trong sheet và không che input cuối. Nội dung ngoài map không tạo horizontal
  page scroll; bảng rộng chỉ cuộn trong wrapper có nhãn.
- Timeline reflow theo ba mức: một hàng ở desktop; hai hàng ở 640–959 px; dưới
  640 px ưu tiên back/play/next, slider và `Bước x/y`, còn tốc độ đi vào menu.

Panel controls theo thứ tự: **Thiết lập bài toán → Hành trình → Thuật toán → Tùy
chọn hiển thị → Kịch bản thử nghiệm → CTA**. `Kịch bản thử nghiệm` mặc định đóng và
chỉ chứa launcher cùng trạng thái số đoạn đang chỉnh; không chứa một editor thứ
hai. Bật launcher tự mở panel phải ở tab `Thử nghiệm`, nơi duy nhất chứa editor.
Editor có hai cách nhập loại trừ nhau: `Chọn nhanh` dùng preset, `Chỉnh chi tiết`
dùng số chính xác và đủ bốn khung giờ. Reset một đoạn/tất cả, công thức và bảng ba
cột `Thông số / Gốc / Đang thử` chỉ nằm ở editor phải. Khi tab này active, header
panel phải là `Thử nghiệm`, không gọi vùng nhập liệu là `Kết quả`. Store, request và
cost formula giữ nguyên.

Chọn một đoạn đường trên map là thao tác **một lần**: sau khi chọn đúng edge, pick
layer và banner chọn phải tắt nhưng edge đang chọn vẫn được giữ để chỉnh; hành động
`Chọn đoạn khác` mới bật lại pick mode. Preset luôn biểu diễn đủ mức ùn tắc 1–5 và
không lặp một preset trùng tốc độ gốc. Trong `Chỉnh chi tiết`, Enter áp dụng draft,
Escape trả draft chưa áp dụng về giá trị effective hiện tại, và lỗi input phải liên
kết bằng `aria-describedby`.

Tab bốn mục vẫn giữ nhãn `Số liệu`, `Giải thích`, `So sánh`, `Thử nghiệm`; tablist
có accessible label. Khi cuộn, nền sticky của vùng tab phải đặc để nội dung không
xuyên qua. Mọi bảng có thể cuộn ngang phải nằm trong vùng có nhãn và focus được bằng
bàn phím. Đổi `Thuật toán B` là một context change: kết quả B cũ và lớp map B phải
biến mất ngay, rồi UI nêu rõ thuật toán B đang chờ chạy; không được hiển thị dropdown
mới cùng số liệu của thuật toán cũ.

### 12.5. Motion, states và evidence

`prefers-reduced-motion: reduce` dừng autoplay, route-flow loop và chart motion,
nhưng giữ route/static ring/state. Không có motion truyền thông tin duy nhất.
Loading, empty và error giữ vùng riêng, dùng status/alert hợp lý và không bịa phần
trăm tiến độ. `/benchmark` vẫn read-only, giữ `SỐ TẠM` trước chart và không kêu gọi
người dùng chạy benchmark.

Evidence bắt buộc của phase là browser Chromium ở 1366×768, 1024×768, 390×844 và
320 px hoặc 200% zoom equivalent; cần kiểm mouse/keyboard/focus, reduced motion,
theme, map controls/timeline, loading/error/empty, console/network và luồng route
hai điểm lẫn ATSP trước khi UI được freeze.

### 12.6. Bằng chứng kiểm chứng UI Clarity — 2026-08-07

Các claim runtime trong §12 đã được kiểm chứng lại trên worktree hiện hành, không
dựa vào số benchmark hay artifact sinh mới:

- **1366×768:** A* chạy thật từ Chợ Bến Thành đến Dinh Độc Lập trên G_demo, hiển thị
  kết quả, đơn vị, đảm bảo, bảng g/h/f và timeline; Held–Karp với ba điểm giao và
  `include_trace` hiển thị kết quả ATSP, so sánh trước/sau và diễn biến tối ưu. Hai
  API `POST /api/route` và `POST /api/multiroute` đều trả 200 trong session clean.
- **1024×768:** controls là rail cố định; result bắt đầu đóng, có trigger chữ
  `Kết quả`, mở thành overlay `min(400px, 44vw)`, focus vào heading và đóng trả về
  trigger. Map không có horizontal page scroll khi result đóng hoặc mở.
- **390×844 và 320×568:** app bar mở controls/results dưới dạng sheet một cột;
  Escape đóng sheet và trả focus đúng trigger, không có horizontal page scroll.
  Viewport 683×384 được kiểm như tương đương CSS viewport khi zoom 200%; đây là
  kiểm reflow tương đương, không phải claim đã đổi browser zoom thật.
- **Keyboard và motion:** đã kiểm Tab/Shift+Tab, Enter/Space, Radix Select,
  Arrow cho tabs/slider, Escape cho tooltip/select/sheet, row g/h/f và focus return.
  Với `prefers-reduced-motion: reduce` sau reload, player `Phát` bị khóa và route
  giữ tĩnh. Không tuyên bố full WCAG conformance.
- **States:** empty ban đầu, loading, lỗi graph có Retry, benchmark ready/error và
  offline đều đã được mở bằng UI thật. `/benchmark` reflow tại 390 px, giữ banner
  `SỐ TẠM` và bảng thay thế dữ liệu biểu đồ.
- **Console/network và data snapshot:** sau clean restart + hard refresh, Chromium
  báo 0 console errors; graph/traffic trả 200. `GET /api/graph?level=demo&view=full`
  xác nhận 51 node, 298 cạnh, 60 một chiều.
- **Tương phản:** `scripts/check_contrast.py` đã được cập nhật để đọc tất cả bảy
  `makePalette(...)` hiện hành và chạy PASS: graphic cần kiểm tra ≥ 3:1, text cần
  kiểm tra ≥ 4.5:1 trên panel và Carto basemap thật. Backdrop node/cạnh không thăm
  vẫn là ngoại lệ thị giác đã ghi rõ ở §10.

Sau các kiểm chứng trên, ảnh README tại `artifacts/readme/dark-route-result.png`
và `artifacts/readme/light-atsp-result.png` được chụp lại ở 1366×768, inspect ở độ
phân giải gốc và chỉ cập nhật sau clean restart, hard refresh, API graph 51/298,
route/ATSP 200 và console 0 errors.

Bổ sung ngày 2026-08-08, hai ảnh này được chụp lại sau khi contract
`Thử nghiệm` và marker Đi/Đến ở §12.3–§12.4 ổn định; session runtime clean xác
nhận graph/traffic/route/multiroute 200, console 0 errors và không tràn ngang.

## 13. UI & Explanation v2 — thiết kế và trạng thái triển khai

> **Trạng thái 2026-08-10:** contract/runtime v2 đã triển khai qua Phase 6.
> Phase 5 map extraction và Phase 6 route comparison 2–4 đều READY; Phase 6 đã
> qua test/typecheck và manual browser QA do người dùng xác nhận. Phase 7 ATSP
> comparison và Phase 8 hardening chưa triển khai. Evidence
> hiện hành nằm ở `docs/UI-V2-PHASE5-READINESS.md` và
> `docs/UI-V2-PHASE6-READINESS.md`; contract nằm ở `docs/SCHEMA.md` §F.

Thiết kế mới tách rõ ba lớp: **Hai điểm/Nhiều điểm**; với Nhiều điểm là **Đi theo
thứ tự đã chọn/Tối ưu thứ tự ATSP**; sau cùng là **Chạy một/So sánh nhiều**.
Route comparison hỗ trợ 2–4 thuật toán, ATSP comparison 2–3 phương pháp, và mỗi
kết quả có một pane/map riêng. Tính năng đi tuần tự qua N điểm hiện có phải được
giữ nguyên. Tùy chọn `Quay về Đi` mặc định tắt và dùng nhất quán cho ordered route
lẫn ATSP. Panel trái có disclosure riêng trên desktop; đóng panel chỉ đổi layout,
không xóa input, result, timeline, camera hoặc request state.

Mọi comparison dùng một request snapshot bất biến. Scenario phải được copy ở
dạng typed normalized data; fingerprint do response server đầu tiên thiết lập
write-once cho session, các response sau phải khớp. Không xếp hạng response stale,
thiếu fingerprint bắt buộc hoặc sai snapshot. UI không suy Dijkstra hai chiều từ
frontier hợp: khi backend v2 có payload thì hiển thị hai phía, khi thiếu thì dùng
fallback union có nhãn tương thích.

Phần `Giải thích` trở thành workspace gắn với **một result cụ thể**: context,
verdict và giới hạn luôn ở đầu; single two-point tiếp theo bằng so sánh route với
tuyến tham chiếu hậu kiểm, rồi cost breakdown/factor có provenance; bước/mốc đang
xem nằm cuối dưới disclosure kỹ thuật. Không gọi
tuyến hậu kiểm là tuyến thuật toán “đã xét/bị loại”; không dùng prose/regex làm
nguồn số liệu; không kết luận unreachable nếu termination chỉ là cap/pruning.
Ordered multi giữ explanation từng chặng; comparison mở đúng result được bấm.
Thành công của Dijkstra hai chiều dùng termination reason
`bidirectional_bound_met` khi `top_forward + top_backward >= μ`, không gọi
sai là `goal_expanded`; chi tiết producer/validator nằm ở `SCHEMA.md` §F.2.

Quy ước số liệu không thay đổi: `total_cost` theo mode; `total_time_s` luôn là
**chi phí cân bằng**, không phải ETA; thời gian ước tính theo ùn tắc dùng
`congestion_adjusted_time_s`; runtime dùng ms. Savings, signed trade-off và
optimality gap là ba khái niệm riêng, dùng tolerance raw đã khóa ở schema.

Responsive/a11y là điều kiện hoàn tất, không phải polish sau cùng. Reorder stop
luôn có nút `Lên`/`Xuống` dùng bàn phím bên cạnh drag tùy chọn. Carousel mobile
luôn có nút `Trước`/`Sau` và chỉ báo vị trí, không phụ thuộc swipe. Target tương
tác đạt ít nhất 24×24 CSS px hoặc có khoảng cách ngoại lệ đúng WCAG 2.2; mục tiêu
thiết kế của control chính là 40–44 px. Không có page-level horizontal scroll ở
320 CSS px; async status, focus return, reduced motion và cue không phụ thuộc màu
phải qua browser QA trước khi ghi nhận phase hoàn tất.
