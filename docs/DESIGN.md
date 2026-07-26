# DESIGN.md — Hợp đồng thiết kế giao diện (Phase 5)

> **Luật:** mọi màu/font/hiệu ứng trên UI phải tra được về token trong file này và
> `frontend/tailwind.config.ts`. Không tự thêm hiệu ứng ngoài đặc tả. Nếu cần token
> mới → thêm vào đây trước, code sau.

## 1. Định hướng

Cảm hứng: **phòng điều khiển giao thông + app gọi xe Việt Nam**. Có **2 chế độ**
(cập nhật theo yêu cầu duyệt vòng 1, 2026-07-26):
- **Tối (mặc định)** — lý do chức năng: nền tối làm lớp phủ thuật toán và thang màu
  ùn tắc nổi rõ nhất. **Quy ước: video demo + screenshot báo cáo dùng chế độ Tối**
  để mọi hình nhất quán (nhóm có thể đổi quy ước này, nhưng phải chọn MỘT).
- **Sáng** — cùng hệ token, giá trị đổi qua CSS variables; basemap đổi sang Carto
  positron. Toggle ở góc phải-trên, lưu lựa chọn vào localStorage.

**Cấm:** gradient, glassmorphism, shadow MÀU, animation trang trí. Hiệu ứng được phép:
vòng pulse ở node đang expand (§3), transition ẩn/hiện drawer, và các **micro-feedback
chức năng** (duyệt v6): hover/active state 150 ms trên phần tử tương tác, nút nhấn
`scale(0.98)` khi active — phản hồi thao tác, không phải trang trí.

**Phân lớp v6:** phần tử NỔI TRÊN BẢN ĐỒ (timeline, legend, cụm nút góc, banner chọn
điểm) dùng nền ĐẶC `surface-panel` + **bóng trung tính** `shadow-float`
(`0 4px 16px rgb(0 0 0/0.45)` tối · `0 4px 16px rgb(0 0 0/0.14)` sáng) — chiều sâu
2 lớp rõ ràng: bản đồ ↔ điều khiển. Bóng đen trung tính, không phải shadow màu.

## 2. Token nền tảng (Dark | Light)

Mọi token là CSS variable trên `:root[data-theme]`; tailwind trỏ vào biến — component
chỉ dùng tên token, KHÔNG dùng mã màu trực tiếp.

| Token | Tối | Sáng | Dùng cho |
|---|---|---|---|
| `surface` | zinc-950 `#09090b` | zinc-50 `#fafafa` | nền trang, nền map offline |
| `surface-panel` | zinc-900 `#18181b` | white `#ffffff` | panel trái, drawer, card, timeline |
| `surface-border` | zinc-800 `#27272a` | zinc-200 `#e4e4e7` | viền panel/card/input |
| `ink` | zinc-100 `#f4f4f5` | zinc-900 `#18181b` | chữ chính |
| `ink-dim` | zinc-400 `#a1a1aa` | zinc-500 `#71717a` | nhãn phụ, chú thích |
| `hl` (row highlight) | white @10% | zinc-950 @8% | hàng đang expand trong bảng g/h/f |
| Bo góc | **8px** (`rounded-lg`) — cả 2 chế độ | | thống nhất mọi panel/card/nút/input |
| Focus ring | 2px `algo-frontier`, offset 2px | | mọi phần tử focus bằng bàn phím |

**Font:** `Be Vietnam Pro` (400/500/700) toàn UI — đủ dấu Việt đẹp. `JetBrains Mono`
cho **mọi con số** (metrics, g/h/f, bước, toạ độ) với `tabular-nums`.
**Số kiểu VN:** dấu phẩy thập phân — `812,4 s` · `3,12 km` · `41,0 %` (helper `fmtVi`).

## 3. Bảng màu ngữ nghĩa — CỐ ĐỊNH theo chế độ (map + legend + bảng + chart dùng chung)

Nguyên tắc chuyển Sáng: giữ NGUYÊN sắc (hue), tăng đậm 1–2 nấc để đạt tương phản
trên nền trắng; node đang expand đảo trắng→đen.

| Token | Tối | Sáng | Ý nghĩa |
|---|---|---|---|
| `algo-node` | zinc-300 `#d4d4d8` | zinc-400 `#a1a1aa` | node thường (duyệt v4 nâng 1 nấc; duyệt v8: dark nâng tiếp zinc-500→300 — user vẫn thấy chìm) |
| `algo-frontier` | cyan-400 `#22d3ee` | cyan-600 `#0891b2` | node trong frontier |
| `algo-expanded` | violet-400 `#a78bfa` | violet-600 `#7c3aed` | node đã expand |
| `algo-current` | white `#ffffff` + pulse trắng | zinc-900 `#18181b` + pulse đen | node đang expand |
| `algo-path` | amber-400 `#fbbf24` | amber-600 `#d97706` | tuyến kết quả, nét dày 4px |
| `bidi-forward` | cyan-400 `#22d3ee` | cyan-600 `#0891b2` | phía xuôi (side=forward) |
| `bidi-backward` | rose-400 `#fb7185` | rose-600 `#e11d48` | phía ngược (side=backward) |
| `edge-dim` | zinc-400/85% `#a1a1aa` | zinc-300 `#d4d4d8` | cạnh thường (duyệt v8: dark zinc-600→400 nhạt alpha — nổi hẳn nhưng vẫn dưới mọi màu thuật toán) |
| `cong-1..5` | `#10b981 #a3e635 #facc15 #f97316 #ef4444` | `#059669 #4d7c0f #a16207 #ea580c #dc2626` (lime-700/yellow-700 — đo WCAG trên nền positron) | thang ùn tắc 1→5 |
| Start | chip **"Đi"**: nền emerald-700 `#047857`, chữ trắng — CỐ ĐỊNH 2 chế độ (chữ 5,48) | | điểm xuất phát; token `start` (marker/badge) vẫn emerald-500/600 theo chế độ |
| Goal | chip **"Đến"**: nền red-600 `#dc2626`, chữ trắng — CỐ ĐỊNH 2 chế độ (đồ hoạ ≥3,5 / chữ 4,83) | | điểm đích; token `goal` vẫn red-500/600 theo chế độ |
| Stops | số trên nền amber theo chế độ, chữ **zinc-950** cả 2 (đo: trắng trên amber-600 chỉ 3,19) | | điểm giao multiroute |
| So sánh | A `algo-path` liền · B `algo-frontier` nét đứt (cả 2 chế độ) | | 2 tuyến chồng lớp |
| Nhãn POI trên map | zinc-200 viền nền tối (v8 — luôn hiện nên phải đọc được mọi zoom) | zinc-700 viền trắng | TextLayer G_demo |
| Basemap | Carto **dark-matter** | Carto **positron** | không cần key |

**Legend:** cố định góc **dưới-trái**, tiêu đề nhỏ "CHÚ GIẢI" (10px uppercase, v6),
luôn hiển thị; nội dung theo ngữ cảnh
(chạy 1 thuật toán → 5 mục thuật toán; bidijkstra → thêm 2 phía; bật lớp ùn tắc →
thang 1–5; so sánh → 2 tuyến). Nền `surface-panel/95`, chữ 12px.

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

**Drawer phải — 3 tab:** `Số liệu` | `Giải thích` | `So sánh`
- Đầu tab Số liệu có **dòng nguồn kết quả**: "A* · Cân bằng · 07:30 · G_demo" —
  kết quả đang xem thuộc cấu hình nào (tránh nhầm khi user đã đổi lựa chọn ở panel).
- Số liệu: card metrics (cost/time/km/expanded/max frontier/runtime + badge
  "Đảm bảo tối ưu"/"Không đảm bảo") + **bảng g/h/f** của frontier tại bước hiện tại.
- Giải thích: `summary_vi`, danh sách đoạn ùn tắc (màu theo mức), card alternatives
  (label + số liệu + why_not). Khi tab mở → tô các cạnh `congested_segments` trên map.
- So sánh: chọn thuật toán B → chạy cùng OD → bảng 2 cột chỉ số + 2 tuyến trên map.

## 5. SIGNATURE — Timeline trình phát

Thanh nổi giữa-đáy bản đồ, nền `surface-panel/95`, viền `surface-border`:
`[⏮ step-back] [▶/⏸] [⏭ step-forward] [━━━●━━ slider] [Bước 37/143] [tốc độ ▾]`

- Tốc độ: 0.5× / 1× / 2× / 4× / 8× (base 500 ms/bước).
- **Đồng bộ hai chiều với bảng g/h/f:** kéo slider → bản đồ + bảng cùng nhảy tới
  bước đó; hàng node đang expand **sáng lên** (nền white/10, chữ trắng) và tự cuộn
  vào tầm nhìn; click một hàng trong bảng → nhảy tới bước node đó được expand.
- Phím tắt: `Space` play/pause · `←`/`→` lùi/tiến 1 bước.
- Đây là trải nghiệm xuất hiện xuyên suốt video giảng thuật toán — mọi thay đổi
  phải mượt ở 8× trên G_demo.

## 6. Bản đồ

- Basemap: MapLibre style **Carto dark-matter** (không cần key):
  `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
- Chế độ **Offline**: tắt basemap, vẽ thuần đồ thị bằng deck.gl trên nền `surface`
  — bảo hiểm wifi phòng bảo vệ; mọi lớp thuật toán giữ nguyên.
- G_demo: node LUÔN có nhãn tên POI ở mọi mức zoom (duyệt v8 — bỏ ngưỡng zoom 12.8; **collision filter** vẫn tự nhường khi label đè nhau); G_real: không nhãn.
- **Hover node** → tooltip tên POI (G_demo) / id nút (G_real) — nền `surface-panel`.
- **Mũi tên hướng TUYẾN** (duyệt v5c — thay bản mũi-tên-mọi-cạnh v5/v5b vì rối):
  ▶ CHỈ xuất hiện dọc tuyến kết quả sau khi chạy thuật toán — tuyến chính, các chặng
  multiroute, và tuyến B khi So sánh. Đặt tại trung điểm các đoạn, cách nhau ≥ ~220 m,
  xoay theo hướng di chuyển; màu **tối (zinc-950) cả 2 chế độ** + viền SDF MÀU TUYẾN
  (amber cho tuyến chính, cyan cho tuyến B) — đọc như mũi tên khắc trong dải tuyến,
  nổi cả khi tràn ra ngoài mép dải. Không còn mũi tên trên cạnh thường.
- **Tuyến kết quả có viền (casing)**: lớp nền màu `surface` rộng 7px dưới lớp màu
  6px — tuyến nổi trên mọi nền bản đồ (kỹ thuật casing bản đồ chuẩn); áp dụng cho
  route chính, multiroute và tuyến so sánh.
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

Đọc `POST /api/benchmark`. Chưa có kết quả → empty state hướng dẫn chạy Phase 6.
Có kết quả → recharts trên nền tối đúng token: bar `nodes_expanded` và `runtime_ms`
theo thuật toán (màu `algo-frontier`, lưới `surface-border`, chữ `ink-dim`),
line độ nhạy γ 2 đường (`algo-path` + `algo-expanded`).

## 10. Kiểm định tương phản (tự động)

`python scripts/check_contrast.py` — parse palette thật từ `lib/colors.ts` + CSS vars,
đọc màu nền basemap **thật** từ style JSON của Carto, tính contrast WCAG:
đồ hoạ thông tin ≥ 3,0 (so cả nền panel lẫn nền basemap), chữ ≥ 4,5. Trạng thái:
**PASS toàn bộ cả 2 chế độ** (2026-07-26). Ngoại lệ CÓ CHỦ ĐÍCH, không tính ngưỡng:
`algo-node` và `edge-dim` — node/cạnh "chưa thăm" nhận diện bằng SỰ VẮNG màu,
cố ý chìm để lớp thuật toán nổi; nếu nâng đạt 3,0 thì toàn bản đồ sáng rực và
frontier/expanded mất độ nổi. Cần mắt người xác nhận khi duyệt.
