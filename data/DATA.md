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
| `flood` | Một trong 2 đầu mút nằm trong `radius_m` của một điểm **ngập** trong manual_risks | 402 cạnh |
| `construction` | Như trên với điểm **lô cốt** | 107 cạnh |

Với cạnh co của G_demo (mục 6): `flood/construction/traffic_light` = OR dọc các cạnh
thật của tuyến; `narrow_alley` = 1 nếu các đoạn hẹp chiếm > 30% chiều dài.

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

## 6. G_demo — 2 tầng đồ thị và cách co cạnh

- **Snap:** mỗi POI gắn vào node G_real gần nhất (haversine). Nếu node đó đã thuộc POI trước,
  thử **node trống gần kế tiếp trong bán kính 120 m** để giữ đủ tên địa danh; hết cách mới gộp
  vào POI trước. Bản build hiện tại (sau khi nhóm review toạ độ bằng Google Maps 2026-07-26):
  *Nhà thờ Tân Định* dùng node thứ 2 cách 72 m (node gần nhất thuộc *Chợ Tân Định*) —
  **không còn POI nào bị gộp, đủ 51 node**.
- **Chọn cặp kề:** mỗi POI nối k POI gần nhất (k tăng 3→5 đến khi liên thông mạnh ≥90% POI;
  bản build này dừng ở k=4). Một hướng chỉ được giữ nếu đường ngắn nhất trên G_real
  (theo `free_travel_time_s`) **không xuyên qua POI thứ ba**.
- **Một chiều:** nếu cả 2 hướng hợp lệ nhưng chiều ngược dài hơn **1.4×** chiều xuôi
  → coi là đường một chiều, chỉ giữ chiều ngắn. Cuối cùng `oneway` được suy từ cấu trúc:
  cạnh không có cạnh ngược ⟺ `oneway=true`.
- **Tỉa cạnh thừa:** cặp cạnh bị bỏ nếu tuyến thay thế nhanh hơn **1.5×** thời gian cạnh
  trực tiếp (giảm rối hình; vẫn giữ liên thông mạnh và các tuyến thay thế cho explanation).
- **Kế thừa thuộc tính thật:** length = tổng length các cạnh OSM; `free_speed_kmh` = tốc độ
  trung bình có trọng số của tuyến (làm tròn 0.1), `free_travel_time_s` suy lại từ tốc độ đã
  làm tròn để công thức SCHEMA khớp tuyệt đối; `highway` = loại chiếm tỉ trọng dài nhất.
- **Kho xuất phát kịch bản shipper:** node *Bưu điện Thành phố* mang `type="warehouse"`
  (bưu cục trung tâm có thật, đóng vai depot trong demo).

## 7. Số liệu bản build hiện tại (2026-07-26, OSM snapshot cùng ngày)

| | G_real | G_demo |
|---|---|---|
| Node | **2 118** (raw 2 230, SCC 2 118) | **51** (đủ 51 POI sau review, không POI nào bị gộp) |
| Cạnh | **4 699** (raw 4 922; gộp 22 cạnh song song, bỏ self-loop) | **141** (185 trước khi tỉa) |
| Một chiều | 1 433 | 55 |
| Đèn tín hiệu | 185 cạnh / 77 node | 53 cạnh |
| Ngập / lô cốt / hẻm | 402 / 107 / 8 | 19 / 16 / 0 |
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
