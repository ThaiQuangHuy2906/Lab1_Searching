# DESIGN.md — Hợp đồng thiết kế giao diện (Phase 5)

> **Luật:** mọi màu/font/hiệu ứng trên UI phải tra được về token trong file này và
> `frontend/tailwind.config.ts`. Không tự thêm hiệu ứng ngoài đặc tả. Nếu cần token
> mới → thêm vào đây trước, code sau.

## 1. Định hướng

Cảm hứng: **phòng điều khiển giao thông + app gọi xe Việt Nam**. Theme **TỐI** — lý do
chức năng: nền tối làm lớp phủ thuật toán (cyan/violet/amber) và thang màu ùn tắc nổi
rõ nhất, tối ưu cho quay video demo.

**Cấm:** gradient, glassmorphism, shadow màu, animation trang trí. Hiệu ứng duy nhất
được phép: vòng pulse ở node đang expand (đặc tả §3) và transition ẩn/hiện drawer.

## 2. Token nền tảng

| Token | Giá trị | Dùng cho |
|---|---|---|
| `surface` | zinc-950 `#09090b` | nền trang, nền map offline |
| `surface-panel` | zinc-900 `#18181b` | panel trái, drawer, card, timeline |
| `surface-border` | zinc-800 `#27272a` | viền panel/card/input |
| `surface-hover` | zinc-800/60 | hover row, hover item |
| `ink` | zinc-100 `#f4f4f5` | chữ chính |
| `ink-dim` | zinc-400 `#a1a1aa` | nhãn phụ, chú thích |
| Bo góc | **8px** (`rounded-lg`) | thống nhất mọi panel/card/nút/input |
| Focus ring | 2px cyan-400, offset 2px nền tối | mọi phần tử focus bằng bàn phím |

**Font:** `Be Vietnam Pro` (400/500/700) toàn UI — đủ dấu Việt đẹp. `JetBrains Mono`
cho **mọi con số** (metrics, g/h/f, bước, toạ độ) với `tabular-nums`.
**Số kiểu VN:** dấu phẩy thập phân — `812,4 s` · `3,12 km` · `41,0 %` (helper `fmtVi`).

## 3. Bảng màu ngữ nghĩa — CỐ ĐỊNH (map + legend + bảng + chart dùng chung)

| Token | Giá trị | Ý nghĩa |
|---|---|---|
| `algo-node` | zinc-600 `#52525b` | node thường |
| `algo-frontier` | cyan-400 `#22d3ee` | node trong frontier |
| `algo-expanded` | violet-400 `#a78bfa` | node đã expand |
| `algo-current` | white `#ffffff` + **vòng pulse** trắng 2px | node đang expand ở bước hiện tại |
| `algo-path` | amber-400 `#fbbf24`, nét dày 4px | tuyến kết quả |
| `bidi-forward` | cyan-400 `#22d3ee` | phía xuôi (side=forward) |
| `bidi-backward` | rose-400 `#fb7185` | phía ngược (side=backward) |
| `cong-1..5` | emerald-500 `#10b981` / lime-400 `#a3e635` / yellow-400 `#facc15` / orange-500 `#f97316` / red-500 `#ef4444` | thang ùn tắc 1→5 |
| Start | chip nền emerald-500, chữ trắng, nhãn **"Đi"** | điểm xuất phát |
| Goal | chip nền red-500, chữ trắng, nhãn **"Đến"** | điểm đích |
| Stops | số thứ tự trong hình tròn amber-400 chữ đen | điểm giao multiroute |
| So sánh | thuật toán A amber-400 liền, thuật toán B cyan-400 nét đứt | 2 tuyến chồng lớp |

**Legend:** cố định góc **dưới-trái** bản đồ, luôn hiển thị; nội dung theo ngữ cảnh
(chạy 1 thuật toán → 5 mục thuật toán; bidijkstra → thêm 2 phía; bật lớp ùn tắc →
thang 1–5; so sánh → 2 tuyến). Nền `surface-panel/95`, chữ 12px.

## 4. Bố cục

```
┌──────────────┬──────────────────────────────────┬───────────────┐
│ Panel trái   │            Bản đồ                │ Drawer phải   │
│ 320px cố định│  (Legend góc dưới-trái)          │ 360px, thu    │
│              │  (Timeline nổi giữa-đáy)         │ gọn được      │
└──────────────┴──────────────────────────────────┴───────────────┘
```

**Panel trái — thứ tự nhóm cố định:**
1. **Bối cảnh:** Đồ thị (G_demo/G_real) · Khung giờ (4 mốc) · Chế độ (3 mode)
2. **Thuật toán:** select 10 thuật toán + tham số phụ hiện theo ngữ cảnh
   (beam_width khi beam; epsilon khi idastar)
3. **Hành trình:** Đi · Đến (dropdown tên với G_demo, click bản đồ với G_real)
   · danh sách Stops (multiroute) + nút "Tối ưu thứ tự"
4. Nút **"Chạy thuật toán"** lớn, full-width, cao 44px
+ Công tắc "Chế độ offline" (vẽ thuần deck.gl trên nền `surface`) và "Lớp ùn tắc".

**Drawer phải — 3 tab:** `Số liệu` | `Giải thích` | `So sánh`
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
- G_demo: node có nhãn tên POI (ẩn dần khi zoom xa); G_real: không nhãn.
- Lớp ùn tắc: tô cạnh theo `cong-1..5` của khung giờ đang chọn.

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
- Tooltip thuật ngữ (1 câu, hover các từ): UCS, heuristic, frontier, expanded,
  admissible, beam width, ε (IDA*), ATSP, 2-opt.
- **G_real guardrails:** ẩn bảng g/h/f, `include_trace` mặc định tắt, cảnh báo khi
  bật trace ("Trace trên G_real có thể rất lớn — bật khi thật cần").

## 9. Trang /benchmark

Đọc `POST /api/benchmark`. Chưa có kết quả → empty state hướng dẫn chạy Phase 6.
Có kết quả → recharts trên nền tối đúng token: bar `nodes_expanded` và `runtime_ms`
theo thuật toán (màu `algo-frontier`, lưới `surface-border`, chữ `ink-dim`),
line độ nhạy γ 2 đường (`algo-path` + `algo-expanded`).
