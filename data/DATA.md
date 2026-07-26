# DATA.md — Nguồn dữ liệu, luật xây dựng và giả định

> Tài liệu này mô tả toàn bộ cách dữ liệu được tạo ra (Phase 1). Nội dung ở đây
> đổ thẳng vào mục **d. Dataset** của báo cáo. Schema chi tiết: `docs/SCHEMA.md`.

## 1. Tổng quan pipeline (chạy offline một lần, demo không gọi mạng)

```
01_download_osm.py   OSM (Overpass, OSMnx v2) → data/raw/graph_raw.graphml   [cần mạng, có cache]
02_build_graph.py    graphml → data/graph_real.json (SCHEMA §A)
03a_crawl_tomtom.py  (TUỲ CHỌN, cần TOMTOM_API_KEY trong .env) → data/raw/tomtom/<slot>/
03b_build_profiles.py real|demo → data/traffic_profiles_<level>.json (TomTom nếu có + synthetic fallback)
04_build_gdemo.py    graph_real + gdemo_pois.json → data/graph_demo.json + gdemo_preview.png
validate_data.py     kiểm tra toàn bộ ràng buộc SCHEMA + liên thông mạnh + phủ profile
```

Thứ tự chạy đầy đủ: `01 → 02 → 03b real → 04 → 03b demo → validate_data`.
**Không có API key TomTom vẫn build được 100%** (profiles rơi về synthetic — luật 7 PROMPT-MASTER).

## 2. Nguồn dữ liệu

| Nguồn | Dùng cho | Ghi chú |
|---|---|---|
| OpenStreetMap qua **OSMnx 2.1.1** (API v2) | Cấu trúc mạng đường: node, cạnh, length, highway type, tên đường | Query bằng **bbox tuple** `(106.680, 10.760, 106.720, 10.800)` — không dùng tên quận (bỏ cấp quận từ 01/7/2025). `network_type="drive"`, lấy **thành phần liên thông mạnh lớn nhất** |
| **TomTom Traffic Flow API** (tuỳ chọn) | Mức ùn tắc thật tại ~40 điểm mẫu trên trục chính, 4 khung giờ | `currentSpeed/freeFlowSpeed` → thang 1–5 (mục 5). Chạy 03a đúng 4 mốc 07:30/12:00/17:30/22:00 |
| Cổng giao thông TP.HCM `giaothong.hochiminhcity.gov.vn` | Đối chiếu **định tính** mức ùn tắc + nguồn cho manual_risks | Nhóm tự đối chiếu, dán link vào `manual_risks.json` |
| `data/manual_risks.json` (nhóm tự định nghĩa) | Điểm ngập (5) + lô cốt (3) khu trung tâm | Vị trí đặt theo các tuyến nổi tiếng (Nguyễn Hữu Cảnh, Đinh Tiên Hoàng đoạn cầu Bông, Cống Quỳnh, Calmette, Trần Hưng Đạo…). **`source_url` đang là placeholder — nhóm PHẢI dán link trước khi nộp** |
| `data/gdemo_pois.json` (nhóm tự chọn) | 51 POI địa danh thật cho G_demo | Toạ độ gần đúng ±100 m, được snap vào node lưới đường gần nhất. **Chờ nhóm/giảng viên review** |

## 3. Tốc độ free-flow theo loại đường (nhóm tự đặt — KHÔNG phải tốc độ pháp lý)

| highway (OSM) | v_free (km/h) | | highway | v_free |
|---|---|---|---|---|
| motorway, motorway_link | 60 | | tertiary, tertiary_link | 35 |
| trunk, trunk_link, primary, primary_link | 45 | | unclassified, residential, road | 30 |
| secondary, secondary_link | 40 | | living_street, service, alley, track | 25 |

Mặc định khi không nhận diện được: 30 km/h. Lý do: tốc độ **thực tế lưu thông** nội đô
TP.HCM thấp hơn nhiều tốc độ giới hạn pháp lý; bảng phản ánh trải nghiệm chạy xe máy
khi đường thoáng. `free_travel_time_s = length_m / (v_free/3.6)`, làm tròn 0.1 s (chỉ để hiển thị — trọng số tính lại chính xác từ length/speed).

**Chuẩn hoá tên đường:** mọi trường `name` được normalize **NFC** và thay ký tự Eth
của OSM (`Ð` U+00D0 / `ð` U+00F0) bằng chữ Đ/đ tiếng Việt chuẩn (U+0110/U+0111) —
tránh lỗi so khớp/tìm kiếm chuỗi dù hiển thị gần giống nhau.

**Làm tròn chiều dài:** `length_m` luôn làm tròn **LÊN** 0.1 m (`ceil_dm`) để bảo toàn
bất đẳng thức `length ≥ haversine(u,v)` mà chứng minh admissible cần (xem
`docs/HEURISTIC-PROOF.md` §6b — test consistency từng bắt được vi phạm ~3 cm khi làm tròn thường).

## 4. Luật gán risk flags (0/1 trên từng cạnh)

| Flag | Luật | Kết quả build hiện tại (G_real) |
|---|---|---|
| `traffic_light` | Cạnh **kết thúc** tại node OSM có tag `highway=traffic_signals` | 185 cạnh (77 node đèn) |
| `narrow_alley` | highway ∈ {living_street, service, alley, track} | 8 cạnh — ít vì `network_type="drive"` loại hầu hết hẻm (xem mục 8) |
| `flood` | Cạnh **ĐI VÀO** vùng ngập: đầu `u` NGOÀI và đầu `v` TRONG `radius_m` của một điểm **ngập** trong manual_risks | 54 cạnh |
| `construction` | Như trên với điểm **lô cốt** | 19 cạnh |

**Vì sao "cạnh đi vào" thay vì "đầu mút trong bán kính" (sửa 2026-07-27, audit
KIEMTOAN L1-01):** luật cũ flag MỌI đoạn OSM nhỏ bên trong vùng, nên một tuyến băng
qua một điểm ngập bị cộng penalty tới 13–17 lần (~780–1 020 s cho đúng một vùng).
Luật mới đặt flag đúng tại cạnh vượt biên vào vùng → mỗi LƯỢT băng qua trả penalty
đúng **một lần**, chi phí vẫn thuần edge-local (không phụ thuộc path). Giới hạn chấp
nhận: tuyến **xuất phát bên trong** vùng không có cạnh đi vào nên lượt đó không bị
tính (mục 8).

Với cạnh co của G_demo (mục 6): `flood/construction/traffic_light` = OR dọc các cạnh
thật của tuyến (hành lang có đi vào vùng ⇒ flag 1 lần); `narrow_alley` = 1 nếu các
đoạn hẹp chiếm > 30% chiều dài.

## 5. Luật sinh congestion (traffic_profiles_*.json)

**Ưu tiên TomTom** (nếu `data/raw/tomtom/<slot>/` có snapshot): cạnh thuộc nhóm đường chính
(motorway/trunk/primary/secondary) nhận mức từ điểm đo gần nhất trong bán kính 250 m.
Quy đổi `ratio = currentSpeed/freeFlowSpeed`: ≥0.85→1, ≥0.70→2, ≥0.55→3, ≥0.40→4, <0.40→5.

**Synthetic fallback** (seed 42, tái lập 100%) cho mọi cạnh còn lại:

| Khung giờ | motorway/trunk/primary | secondary | tertiary | còn lại |
|---|---|---|---|---|
| 07:30 & 17:30 (đỉnh) | 4–5 | 3–4 | 2–4 | 2–3 |
| 12:00 | = mức 07:30 − 1 (sàn 1) | | | |
| 22:00 | 1–2 (mọi loại đường) | | | |

Nhiễu sự cố: mỗi khung đỉnh có 10% số cạnh ngẫu nhiên +1 mức (trần 5) — mô phỏng va chạm/sự cố cục bộ.
Bản build hiện tại: `source = "synthetic"` (chưa có key TomTom). Có key → chạy 03a ở 4 mốc giờ rồi chạy lại 03b.

**G_demo KHÔNG quay ngẫu nhiên (sửa 2026-07-27):** mỗi cạnh co kế thừa mức congestion
= **trung bình trọng số** (theo thời gian free-flow) của các cạnh thật dọc hành lang
(`data/gdemo_corridors.json` do 04 sinh), làm tròn về nguyên 1–5
(`pipeline_common.corridor_mean_level`). Nhờ vậy: (1) hai tầng kể cùng một câu chuyện
chi phí ở mode balanced (bất biến ≤1,5× kiểm được, mục 6); (2) khi có TomTom, mức thật
trên G_real **tự lan sang G_demo** không cần luật riêng.

## 6. G_demo — 2 tầng đồ thị và cách co cạnh

- **Snap:** mỗi POI gắn vào node G_real gần nhất (haversine). Nếu node đó đã thuộc POI trước,
  thử **node trống gần kế tiếp trong bán kính 120 m** để giữ đủ tên địa danh; hết cách mới gộp
  vào POI trước. Bản build hiện tại (sau khi nhóm review toạ độ bằng Google Maps 2026-07-26):
  *Nhà thờ Tân Định* dùng node thứ 2 cách 72 m (node gần nhất thuộc *Chợ Tân Định*) —
  **không còn POI nào bị gộp, đủ 51 node**.
- **Chọn cặp kề:** mỗi POI nối k POI gần nhất (k tăng 3→5 đến khi liên thông mạnh ≥90% POI).
  MỖI HƯỚNG được xét ĐỘC LẬP: hướng được giữ ⟺ đường ngắn nhất trên G_real của hướng đó
  **không xuyên qua POI thứ ba**. KHÔNG còn luật so độ dài 2 chiều (audit 2026-07-26:
  luật 1.4× cũ xoá oan 30+ chiều ngược đi được thật) — cạnh mỗi chiều mang length/speed/risk
  contract theo đúng path CHIỀU ĐÓ (bất đối xứng là đúng, nuôi ATSP). `oneway=true` giờ chỉ
  phát sinh từ: xuyên POI thứ ba, hoặc không tới được.
- **Bất biến khoảng cách (thêm sau audit; MỞ RỘNG 2026-07-27 — 6 bất biến):** với MỌI cặp
  POI có thứ tự, đường ngắn nhất trên G_demo không được vượt **1.5×** G_real theo thời gian
  free-flow, **1.8×** theo quãng đường, và **1.5×** theo chi phí **balanced**
  (t_free·f_cong + penalty) ở **từng khung giờ trong 4 khung** (dùng congestion kế thừa
  hành lang, mục 5); thêm **SÀN ≥ 1,0−ε** cho time/dist (demo không được nhanh/ngắn hơn
  mức vật lý cho phép — vá lớp lỗi D của audit). Balanced không có sàn: hành lang cắt 2
  vùng risk cùng loại chỉ trả penalty 1 lần (OR) trong khi G_real trả theo từng lượt vào —
  demo rẻ hơn là hợp lệ. Bước *repair* tự thêm cạnh dọc shortest path thật cho cặp vi phạm
  (các POI liên tiếp trên path là kề nhau theo định nghĩa); riêng balanced còn được phép
  **thay hành lang** hiện có bằng path của khung giờ đó nếu time/dist toàn cục vẫn đứng.
  `validate_data.py` kiểm cả 6 bất biến VĨNH VIỄN (build fail nếu vỡ) + regression cố định
  cặp *Cung Văn hoá Lao Động ↔ Hồ Con Rùa* ≤ 2× cả 2 chiều.
- **Tỉa cạnh thừa (global-safe):** thử xoá từng cặp (cả 2 chiều cùng lúc), tính lại all-pairs
  trên đồ thị demo còn lại — chỉ giữ việc xoá nếu bất biến trên VẪN đúng cho mọi cặp; vi phạm
  thì hoàn tác. (Thay luật cũ chỉ kiểm 1.5× cục bộ tại thời điểm xoá — bị cộng dồn dây chuyền
  và không bảo vệ mode distance.)
- **Kế thừa thuộc tính thật:** length = tổng length các cạnh OSM; `free_speed_kmh` = tốc độ
  trung bình có trọng số của tuyến (làm tròn 0.1), `free_travel_time_s` suy lại từ tốc độ đã
  làm tròn để công thức SCHEMA khớp tuyệt đối; `highway` = loại chiếm tỉ trọng dài nhất.
- **Kho xuất phát kịch bản shipper:** node *Bưu điện Thành phố* mang `type="warehouse"`
  (bưu cục trung tâm có thật, đóng vai depot trong demo).

## 7. Số liệu bản build hiện tại (2026-07-27, OSM snapshot 2026-07-26)

| | G_real | G_demo |
|---|---|---|
| Node | **2 118** (raw 2 230, SCC 2 118) | **51** (đủ 51 POI sau review, không POI nào bị gộp) |
| Cạnh | **4 699** (raw 4 922; gộp 22 cạnh song song, bỏ self-loop) | **292** (kề 177 → vá 6 bất biến +1 076 & thay 453 hành lang → tỉa an-toàn-toàn-cục −961) |
| Một chiều | 1 433 | 56 (chỉ khi G_real thật sự không có chiều ngược) |
| Đèn tín hiệu | 185 cạnh / 77 node | 131 cạnh |
| Ngập / lô cốt / hẻm | 54 / 19 / 8 (flag tại cạnh ĐI VÀO vùng — mục 4) | 24 / 24 / 0 |
| Bất biến demo/real (mục 6) | — | time ≤1,5 (median 1,11 · max 1,50, sàn ≥1,0); dist ≤1,8 (median 1,08 · max 1,56, sàn ≥1,0); balanced ≤1,5 cả 4 khung giờ (max 1,49) |
| Yêu cầu đề (≥20 node, ≥30 cạnh) | vượt xa | vượt xa ✓ |

POI đã được nhóm review trên Google Maps (2026-07-26): đổi tên *Bảo tàng Lịch sử TP.HCM*
(tên chính thức), *Điểm trung chuyển Hàm Nghi* (khớp thực địa); sửa toạ độ *Trường Marie
Curie* (lệch ~900 m), *THPT Nguyễn Thị Minh Khai* (~445 m), *ĐH Mở TP.HCM* (tinh chỉnh).

## 8. Giả định & hạn chế đã biết

1. `network_type="drive"` **loại hầu hết hẻm xe máy** → flag `narrow_alley` hiếm (8 cạnh G_real,
   0 cạnh G_demo). Mô hình vẫn có đủ 4 loại risk; muốn dày hẻm cần `network_type="all"`
   (đồ thị phình to — ghi nhận ở Future Work).
2. Hai đường một chiều ngược nhau nối cùng cặp giao lộ bị mô hình coi như một đường 2 chiều
   (SCHEMA cấm 2 cạnh trùng cặp (u,v) — giữ cạnh nhanh hơn).
3. Congestion synthetic là mô phỏng có chủ đích theo phân bố giờ cao điểm thực tế, KHÔNG phải
   đo đạc; khi có TomTom thì các trục chính dùng số thật, phần còn lại vẫn synthetic.
4. Toạ độ POI nhập tay ±100 m rồi snap về node gần nhất → tên địa danh đại diện cho giao lộ
   gần nhất, không phải cổng chính của địa điểm.
5. Điểm ngập/lô cốt là **danh sách minh hoạ có chủ đích** đặt đúng các tuyến nổi tiếng;
   hiệu lực thực tế thay đổi theo mùa — nhóm cập nhật link nguồn trước khi nộp.
6. `meta.created` thay đổi theo ngày build; cấu trúc còn lại tái lập 100% với cùng OSM cache
   (raw graphml được cache trong `data/raw/`, gitignore).
7. Penalty vùng (ngập/lô cốt) tính **một lần mỗi lượt đi vào vùng** (mục 4). Hai giới hạn
   chấp nhận: (a) tuyến **xuất phát bên trong** vùng không bị tính lượt đầu (không có cạnh
   đi vào); (b) trên G_demo, hành lang co cắt **2 vùng cùng loại** vẫn chỉ trả 1 lần
   (flag OR 0/1) trong khi G_real trả đúng 2 — vì vậy bất biến balanced chỉ có cận trên,
   không có sàn (mục 6).
