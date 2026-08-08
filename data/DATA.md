# DATA.md — Nguồn dữ liệu, luật xây dựng và giả định

> **Trạng thái kiểm lại 2026-08-08:** `G_real` được build ngày 2026-07-27 từ
> GraphML OSMnx có `created_date=2026-07-26 18:47:01`; raw TomTom đã
> đủ bốn slot 07:30, 12:00, 17:30 và 22:00. Chuỗi `03b real → 04 → 03b demo →
> validate_data` đã hoàn tất; hai profile hiện là `tomtom+synthetic` và `G_demo`
> đã rebuild theo profile cuối. Benchmark/hiệu chuẩn γ/generator vẫn chưa chạy
> lại. `data/raw/graph_raw.graphml`, bốn TomTom JSON và OSMnx cache hiện diện
> trong workspace và đều được Git track. Schema chi tiết: `docs/SCHEMA.md`.
> Lượt provenance 2026-08-08 chỉ cập nhật `source_url`, mô tả và ghi chú của
> `manual_risks.json`; không crawl, rebuild hoặc sửa graph/profile/risk flags.

## 1. Tổng quan pipeline (chạy offline một lần, demo không gọi mạng)

```
01_download_osm.py   OSM (Overpass, OSMnx v2) → data/raw/graph_raw.graphml   [cần mạng, có cache]
02_build_graph.py    graphml → data/graph_real.json (SCHEMA §A)
03a_crawl_tomtom.py  (TUỲ CHỌN, cần TOMTOM_API_KEY trong .env) → data/raw/tomtom/<slot>/
03b_build_profiles.py real|demo → data/traffic_profiles_<level>.json (TomTom nếu có + synthetic fallback)
04_build_gdemo.py    graph_real + gdemo_pois.json → data/graph_demo.json + gdemo_corridors.json + gdemo_preview.png
05_calibrate_gamma.py (TUỲ CHỌN, chạy SAU 03a) → results/gamma_calibration.csv (γ̂ thực nghiệm từ TomTom)
validate_data.py     kiểm tra toàn bộ ràng buộc SCHEMA + liên thông mạnh + phủ profile + 6 bất biến demo/real
```

Thứ tự chạy đầy đủ: `01 → 02 → 03b real → 04 → 03b demo → validate_data`.
**Không có API key TomTom vẫn build được 100%** (profiles rơi về synthetic — luật 7 PROMPT-MASTER).

## 2. Nguồn dữ liệu

| Nguồn | Dùng cho | Ghi chú |
|---|---|---|
| OpenStreetMap qua **OSMnx 2.1.1** (API v2) | Cấu trúc mạng đường: node, cạnh, length, highway type, tên đường | Query bằng **bbox tuple** `(106.680, 10.760, 106.720, 10.800)` — không dùng tên quận (bỏ cấp quận từ 01/7/2025). `network_type="drive"`, lấy **thành phần liên thông mạnh lớn nhất** |
| **TomTom Traffic Flow API** (tuỳ chọn) | Payload `currentSpeed`/`freeFlowSpeed` tại 40 điểm mẫu trên trục chính, 4 khung giờ | Raw local đủ bốn slot 07:30/12:00/17:30/22:00 và đã qua kiểm tra cấu trúc/derivation; audit hiện tại không gọi lại TomTom nên không xem đây là ground truth độc lập hay dữ liệu real-time |
| Công báo TP.HCM, báo chí và thông báo SAWACO | Đối chiếu định tính cho 8 `manual_risks` | 8/8 `source_url` là link trực tiếp đã kiểm nội dung ngày 2026-08-08; các nguồn chỉ ghi nhận sự kiện lịch sử tại tuyến/khu vực, không phải feed real-time và không xác nhận tọa độ/bán kính/penalty |
| `data/manual_risks.json` (nhóm tự định nghĩa) | Điểm ngập (5) + vùng cản trở thi công (3) khu trung tâm | Tâm, `radius_m`, loại flag và penalty là tham số mô hình hóa của nhóm. `meta.description_vi` mô tả đúng luật cạnh đi vào vùng và giới hạn route bắt đầu trong vùng; `r02`, `r03`, `r05`, `r07`, `r08` có giới hạn không gian/ngữ nghĩa nêu ở §2.1 |
| `data/gdemo_pois.json` (nhóm tự chọn) | 51 POI mang tên địa danh hiện hữu cho G_demo | Toạ độ gần đúng ±100 m, được snap vào node lưới đường gần nhất. Nhóm đã ghi nhận lượt review thủ công ngày 2026-07-26; đây vẫn là dữ liệu POI do nhóm quản lý, không phải feed địa danh bên ngoài. |

Bốn snapshot TomTom được query thực tế lúc `07:40:03` và `12:49:57` ngày
2026-07-27, `17:30:01` và `22:27:52` ngày 2026-08-03. Các nhãn
07:30/12:00/17:30/22:00 là tên slot đại diện, không phải cam kết timestamp chính
xác đến từng phút. Hai ngày đều là thứ Hai, cách nhau bảy ngày; nhóm chấp nhận
đây là bộ snapshot đại diện theo slot, **không** mô tả thành chuỗi đo cùng ngày.
Bốn raw JSON, `graph_raw.graphml` và OSMnx cache hiện đều nằm dưới `data/raw/`
và được Git track. Chúng đồng thời phải có trong Data ZIP cuối để giữ bằng chứng
provenance và khả năng dựng lại profile; không được mô tả chúng là local-only
hoặc Git-ignore ở snapshot repository hiện tại.

### 2.1. Provenance của 8 vùng rủi ro thủ công

| ID | Nguồn và ngày | Nguồn ngoài thực sự chứng minh | Giới hạn phải công bố |
|---|---|---|---|
| `r01` | [Quyết định 6261/QĐ-UBND — Công báo TP.HCM](https://congbao.hochiminhcity.gov.vn/cong-bao/van-ban/quyet-dinh/so/6261-qd-ubnd/ngay/30-11-2016/tai-ve/42090), 30/11/2016 | Phụ lục 1 ghi Nguyễn Hữu Cảnh, từ Ngô Tất Tố về phía cầu Sài Gòn khoảng 500 m | Hồ sơ lịch sử 2016–2020; không xác nhận tâm 400 m hay tình trạng hiện tại |
| `r02` | [Báo Nhân Dân](https://nhandan.vn/mua-to-trieu-cuong-gay-ngap-ung-tai-tp-ho-chi-minh-post410945.html), 19/08/2005 | Đoạn Đinh Tiên Hoàng từ Cầu Bông đến Phan Đăng Lưu từng ngập khi mưa trùng triều cường | Đoạn này đổi tên thành Lê Văn Duyệt năm 2020; tâm mô hình cách node gần nhất trên cạnh chính khoảng 253 m, sát ngoài `radius_m=250` |
| `r03` | [Báo Tin tức/TTXVN](https://baotintuc.vn/xa-hoi/tp-ho-chi-minh-ngap-nang-nhieu-tuyen-duong-sau-con-mua-nhu-trut-nuoc-20240527215404154.htm), 27/05/2024 | Một đoạn Cống Quỳnh, Quận 1 bị ngập trong cơn mưa | Không xác định riêng đoạn trước Bệnh viện Từ Dũ hay bán kính 250 m |
| `r04` | [Báo Tin tức và Dân tộc/TTXVN](https://baotintuc.vn/anh/tp-ho-chi-minh-trieu-cuong-dang-cao-nhieu-tuyen-duong-ngap-sau-20251105181405682.htm), 05/11/2025 | Võ Văn Kiệt gần cầu Calmette bị ngập khi nước kênh Tàu Hủ – Bến Nghé dâng | Một sự kiện lịch sử; không xác nhận vùng tròn 250 m |
| `r05` | [Báo Tiền Phong, nguồn nội dung Znews](https://tienphong.vn/pho-tay-bui-vien-ngap-sau-mua-lon-o-tphcm-post1793541.tpo), 05/11/2025 | Trần Hưng Đạo, Nguyễn Cư Trinh và Cống Quỳnh cùng được ghi nhận ngập trong một trận mưa | Nguồn không xác định đoạn cụ thể. Nhãn cũ “đoạn Nguyễn Cư Trinh” đã sửa thành “Trần Đình Xu – Cống Quỳnh” vì hai nút giao này cách tâm khoảng 118 m/213 m, còn nút giao Nguyễn Cư Trinh cách khoảng 465 m |
| `r06` | [VnExpress](https://vnexpress.net/tp-hcm-chinh-trang-quang-truong-truoc-cho-ben-thanh-tu-thang-10-4758459.html), 15/06/2024 | Kế hoạch rào chắn, cải tạo đường/vỉa hè Lê Thánh Tôn và khu vực chợ Bến Thành | Công trình 2024–2025, không phải trạng thái hiện tại và không xác nhận bán kính 150 m |
| `r07` | [Báo Dân trí](https://dantri.com.vn/thoi-su/tphcm-ho-tu-than-bat-ngo-xuat-hien-giua-duong-1380068305.htm), 19/09/2013 | Hố sụt trước số 296 Hai Bà Trưng dẫn đến khắc phục khẩn cấp, rào chắn và ùn tắc | Chỉ hỗ trợ mô hình *vùng cản trở giao thông*; không chứng minh một dự án thi công cống hay tình trạng hiện tại |
| `r08` | [Cấp nước Bến Thành/SAWACO](https://benthanh.sawaco.com.vn/tin-tuc/hoat-dong-san-xuat-kinh-doanh/thong-bao-ve-viec-gian-doan-cung-cap-nuoc-de-phuc-vu-cong-tac.-vi-tri-thi-cong-giao-lo-vo-thi-sau-pasteur-giao-lo-vo-van-tan-truong-dinh-va-198-tran-quoc-thao-thuoc-phuong-vo-thi-sau-va-phuong-9-quan-3..html), 04/06/2021 | Thi công hạ tầng cấp nước tại giao lộ Võ Thị Sáu – Pasteur trong các đêm 07–09/06/2021 | Không phải dự án nâng cấp mặt đường, không còn hiệu lực và không xác nhận bán kính 200 m |

Chi tiết phép đối chiếu, số cạnh bị tác động và mức độ khớp nằm trong
[`manual_risks_sources_review.md`](../manual_risks_sources_review.md). Tám URL
trên chứng minh **bối cảnh lịch sử ở cấp tuyến/khu vực**, không biến các circle
thủ công thành dữ liệu incident đã quan trắc. Không dùng các flag này để tuyên
bố tình trạng giao thông hiện tại.

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

**Ưu tiên TomTom** (nếu `data/raw/tomtom/<slot>/` có snapshot): chỉ cạnh thuộc
`MAIN_CLASSES` (motorway/trunk/primary/secondary và các lớp `_link`) được xét;
pipeline lấy điểm đo gần nhất với **node nguồn `u` của cạnh** trong bán kính
250 m. Implementation hiện không so tên đường, `frc`, segment geometry hay yêu
cầu sample và edge cùng subclass ngoài điều kiện edge thuộc `MAIN_CLASSES`.
Quy đổi `ratio = currentSpeed/freeFlowSpeed`: ≥0.85→1, ≥0.70→2, ≥0.55→3, ≥0.40→4, <0.40→5.

**Synthetic fallback** (seed 42, tái lập 100%) cho mọi cạnh còn lại:

| Khung giờ | motorway/trunk/primary | secondary | tertiary | còn lại |
|---|---|---|---|---|
| 07:30 & 17:30 (đỉnh) | 4–5 | 3–4 | 2–4 | 2–3 |
| 12:00 | = mức 07:30 − 1 (sàn 1) | | | |
| 22:00 | 1–2 (mọi loại đường) | | | |

Nhiễu sự cố: mỗi khung đỉnh có 10% số cạnh ngẫu nhiên +1 mức (trần 5) — mô phỏng va chạm/sự cố cục bộ.
Bản build hiện tại: `source = "tomtom+synthetic"`. Mỗi slot có 40 điểm TomTom;
635/4 699 cạnh `G_real` gần điểm mẫu trên trục chính nhận mức TomTom ở từng slot,
các cạnh còn lại dùng synthetic fallback seed 42. Vì vậy không được mô tả profile
là “100% dữ liệu thật”. `G_demo` kế thừa profile hỗn hợp này qua corridor weighted mean.

**G_demo KHÔNG quay ngẫu nhiên (sửa 2026-07-27):** mỗi cạnh co kế thừa mức congestion
= **trung bình trọng số** (theo thời gian free-flow) của các cạnh G_real dọc hành lang
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

## 7. Số liệu bản build hiện tại (refresh 2026-08-03, OSM snapshot 2026-07-26)

| | G_real | G_demo |
|---|---|---|
| Node | **2 118**. Log tải ban đầu ghi 2 230 node trước SCC; file GraphML được lưu **sau** SCC và hiện có 2 118 node | **51** (đủ 51 POI sau review, không POI nào bị gộp) |
| Cạnh | **4 699**. Log tải ban đầu ghi 4 922 cạnh trước SCC; GraphML được track có 4 721 cạnh, rồi bước 02 bỏ 2 self-loop và 20 bản song song dư để còn 4 699 ordered pair | **298** (kề 177 → vá 6 bất biến +1 094 & thay 429 hành lang → tỉa an-toàn-toàn-cục −973) |
| Một chiều | 1 433 (`oneway` suy từ việc ordered pair ngược có tồn tại sau dedup, không copy trực tiếp OSM tag) | 60 (suy từ cấu trúc directed cuối; một hướng có thể bị loại vì xuyên POI thứ ba hoặc không có path, rồi còn chịu repair/prune toàn cục) |
| Đèn tín hiệu | 185 cạnh / 77 node | 130 cạnh |
| Ngập / lô cốt / hẻm | 54 / 19 / 8 (flag tại cạnh ĐI VÀO vùng — mục 4) | 24 / 24 / 0 |
| Bất biến demo/real (mục 6) | — | time ≤1,5 (median 1,11 · p90 1,30 · max 1,50, sàn ≥1,0); dist ≤1,8 (median 1,07 · p90 1,26 · max 1,57, sàn ≥1,0); balanced ≤1,5 cả 4 khung giờ (max 1,50) |
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
3. Congestion hiện là hỗn hợp: các cạnh trục chính trong bán kính gán dùng mẫu
   TomTom, phần còn lại là synthetic fallback có seed. Đây không phải đo đạc phủ
   toàn bộ 4 699 cạnh và cũng không phải dữ liệu real-time.
4. Toạ độ POI nhập tay ±100 m rồi snap về node gần nhất → tên địa danh đại diện cho giao lộ
   gần nhất, không phải cổng chính của địa điểm.
5. Điểm ngập/lô cốt là **danh sách minh hoạ có chủ đích** đặt đúng các tuyến nổi tiếng;
   hiệu lực thực tế thay đổi theo mùa — nhóm cập nhật link nguồn trước khi nộp.
6. `meta.created` thay đổi theo ngày build; cấu trúc còn lại tái lập với cùng
   GraphML/config/code. Raw GraphML và cache hiện được Git track dưới `data/raw/`;
   việc gọi lại nguồn OSM ở thời điểm khác có thể cho snapshot khác.
7. Penalty vùng (ngập/lô cốt) tính **một lần mỗi lượt đi vào vùng** (mục 4). Hai giới hạn
   chấp nhận: (a) tuyến **xuất phát bên trong** vùng không bị tính lượt đầu (không có cạnh
   đi vào); (b) trên G_demo, hành lang co cắt **2 vùng cùng loại** vẫn chỉ trả 1 lần
   (flag OR 0/1) trong khi G_real trả đúng 2 — vì vậy bất biến balanced chỉ có cận trên,
   không có sàn (mục 6).

## 9. GraphView và scenario — ranh giới dữ liệu bất biến

Mở rộng đã được duyệt trong `docs/SCHEMA.md §E` **không phải** một data rebuild.
`data/teaching_graph_presets.json` version 2 chứa thứ tự canonical đủ 51 node;
mọi prefix từ 3 đến 51 node tạo một induced graph liên thông mạnh. File đó chỉ
thứ tự đó là config tracked xác định các tập node nested của G_demo
(`teach_3`…`teach_50`); các mốc 7/15/25 còn giữ count edge hồi quy đã kỳ vọng.
Nó không thay `graph_demo.json`,
`traffic_profiles_demo.json`, `gdemo_corridors.json` hay bất kỳ raw artifact nào.

Một GraphView được dựng trong memory bằng lọc induced node/edge và profile tương
ứng; `full` vẫn là snapshot base. Edge override sandbox cũng chỉ clone/apply trong
phạm vi request, tính lại field derived/weight/v_max rồi bỏ đi sau response. Vì vậy:

- không chạy scripts 01–04/03b, crawler, benchmark, gamma calibration hay generator
  để tạo view/scenario;
- không ghi view/override vào base JSON, raw TomTom hoặc results;
- fingerprint response ghi nhận base graph/profile/view/override **effective** để
  benchmark/report sau này phân biệt đúng provenance;
- raw GraphML/TomTom/cache hiện được Git track và vẫn phải đi trong Data ZIP
  cuối; tám URL risk vẫn là manual task trước final submission.
