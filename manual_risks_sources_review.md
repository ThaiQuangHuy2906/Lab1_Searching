# Đối chiếu nguồn cho `data/manual_risks.json`

Ngày rà soát: **08/08/2026**
Repository: <https://github.com/ThaiQuangHuy2906/Lab1_Searching>

> **Kết quả kiểm độc lập và tích hợp 08/08/2026:** cả 8 URL là link trực tiếp,
> có nội dung/ngày đăng khớp với phần mô tả giới hạn bên dưới và đã được điền vào
> `data/manual_risks.json`. Bảy trang tải được qua web không có phiên đăng nhập;
> trang Cấp nước Bến Thành của `r08` trả HTTP 200 khi gọi trực tiếp. Nhãn `r05`
> đã sửa từ đoạn Nguyễn Cư Trinh sang khu vực Trần Đình Xu–Cống Quỳnh để khớp
> tâm graph; mô tả `r07` đã được hạ từ “thi công cống” thành vùng cản trở do
> khắc phục hố sụt; `r08` đã được sửa từ “nâng cấp mặt đường” thành thi công hạ
> tầng cấp nước.

## Kết luận ngắn

Tám vùng rủi ro trong `data/manual_risks.json` là **dữ liệu minh họa có căn cứ thực tế**, không phải dữ liệu rủi ro thời gian thực. Các nguồn bên ngoài dưới đây chứng minh rằng tuyến/khu vực tương ứng **đã từng** xảy ra ngập hoặc có công trình/rào chắn. Chúng **không chứng minh** chính xác tâm `lat/lon`, toàn bộ `radius_m`, mức penalty, hoặc tình trạng vẫn còn hiệu lực ngày 08/08/2026.

Vì vậy, cách diễn đạt an toàn cho báo cáo là:

> Các vùng rủi ro thủ công được đặt gần những tuyến/khu vực từng được cơ quan nhà nước hoặc báo chí ghi nhận có ngập hay thi công. Nguồn ngoài chỉ xác nhận sự kiện ở cấp tuyến/khu vực và thời điểm bài đăng; tọa độ tâm, bán kính ảnh hưởng và penalty là giả định mô hình hóa của nhóm, không phải dữ liệu quan trắc thời gian thực.

## 8 nguồn đã đối chiếu

### r01 — Ngập: Nguyễn Hữu Cảnh, đoạn gần cầu Sài Gòn

- **URL bài gốc:** <https://congbao.hochiminhcity.gov.vn/cong-bao/van-ban/quyet-dinh/so/6261-qd-ubnd/ngay/30-11-2016/tai-ve/42090>
- **Tên văn bản:** Quyết định số 6261/QĐ-UBND — Ban hành Kế hoạch thực hiện Nghị quyết Đại hội Đảng bộ thành phố lần thứ X về Chương trình Giảm ngập nước giai đoạn 2016–2020
- **Cơ quan đăng:** UBND Thành phố Hồ Chí Minh, Công báo TP.HCM
- **Ngày ban hành:** 30/11/2016
- **Nội dung nguồn chứng minh:** Phụ lục 1 ghi điểm ngập đường Nguyễn Hữu Cảnh, phạm vi từ ngã tư Ngô Tất Tố về phía cầu Sài Gòn khoảng 500 m; văn bản nêu các nguyên nhân thoát nước/lún và giải pháp chống ngập.
- **Mức khớp:** **Rất mạnh** — đúng tuyến, đúng đoạn, đúng loại rủi ro.
- **Giới hạn:** Là hồ sơ lịch sử của giai đoạn 2016–2020; không chứng minh tuyến đang ngập tại thời điểm hiện tại và không xác nhận tâm `10.7925, 106.7190` hay bán kính 400 m.

### r02 — Ngập: Đinh Tiên Hoàng, đoạn gần cầu Bông/Đa Kao

- **URL bài gốc:** <https://nhandan.vn/mua-to-trieu-cuong-gay-ngap-ung-tai-tp-ho-chi-minh-post410945.html>
- **Tên bài:** Mưa to, triều cường gây ngập úng tại TP Hồ Chí Minh
- **Cơ quan đăng:** Báo Nhân Dân
- **Ngày đăng:** 19/08/2005
- **Nội dung nguồn chứng minh:** Bài ghi nhận đường Đinh Tiên Hoàng, phạm vi từ cầu Bông đến Phan Đăng Lưu, bị ngập do mưa kết hợp triều cường.
- **Mức khớp:** **Mạnh về tuyến/sự kiện, cần lưu ý về không gian**.
- **Giới hạn:** Sự kiện đã cũ. Đoạn từ cầu Bông đến Phan Đăng Lưu đã đổi tên thành **Lê Văn Duyệt** từ năm 2020. Trong graph hiện tại, tâm `r02` nằm về phía Nguyễn Văn Giai/Bùi Hữu Nghĩa; cạnh chính mang tên Lê Văn Duyệt gần nhất ở khoảng ranh bán kính 250 m. Không được nói nguồn xác nhận chính xác tọa độ tâm.

### r03 — Ngập: Cống Quỳnh, gần Bệnh viện Từ Dũ

- **URL bài gốc:** <https://baotintuc.vn/xa-hoi/tp-ho-chi-minh-ngap-nang-nhieu-tuyen-duong-sau-con-mua-nhu-trut-nuoc-20240527215404154.htm>
- **Tên bài:** TP Hồ Chí Minh: Ngập nặng nhiều tuyến đường sau cơn mưa như trút nước
- **Cơ quan đăng:** Báo Tin tức/TTXVN
- **Ngày đăng:** 27/05/2024
- **Nội dung nguồn chứng minh:** Bài và chú thích ảnh ghi nhận một đoạn đường Cống Quỳnh, Quận 1 bị ngập trong cơn mưa.
- **Mức khớp:** **Trung bình** — đúng đường và đúng loại rủi ro.
- **Giới hạn:** Bài không xác định đoạn ngay trước Bệnh viện Từ Dũ, không cho tọa độ và không xác nhận bán kính 250 m. Cụm “gần BV Từ Dũ” chỉ là nhãn định vị của nhóm.

### r04 — Ngập: Calmette – Bến Chương Dương, phía Võ Văn Kiệt

- **URL bài gốc:** <https://baotintuc.vn/anh/tp-ho-chi-minh-trieu-cuong-dang-cao-nhieu-tuyen-duong-ngap-sau-20251105181405682.htm>
- **Tên bài:** TP Hồ Chí Minh: Triều cường dâng cao, nhiều tuyến đường ngập sâu
- **Cơ quan đăng:** Báo Tin tức và Dân tộc/TTXVN
- **Ngày đăng:** 05/11/2025
- **Nội dung nguồn chứng minh:** Chú thích ảnh ghi rõ nước kênh Tàu Hủ – Bến Nghé dâng cao làm ngập đoạn đường Võ Văn Kiệt gần cầu Calmette.
- **Mức khớp:** **Rất mạnh** — đúng khu vực, đúng loại rủi ro và đúng cơ chế triều cường.
- **Giới hạn:** Nguồn ghi nhận một sự kiện cụ thể, không xác nhận vùng tròn tâm `10.7648, 106.6975` bán kính 250 m và không phải feed thời gian thực.

### r05 — Ngập: Trần Hưng Đạo, khu vực Trần Đình Xu – Cống Quỳnh

- **URL bài gốc:** <https://tienphong.vn/pho-tay-bui-vien-ngap-sau-mua-lon-o-tphcm-post1793541.tpo>
- **Tên bài:** Phố Tây Bùi Viện ngập sau mưa lớn ở TP.HCM
- **Cơ quan đăng:** Báo Tiền Phong, nội dung nguồn Znews
- **Ngày đăng:** 05/11/2025
- **Nội dung nguồn chứng minh:** Bài ghi nhận trong cùng trận mưa, các tuyến trung tâm gồm Trần Hưng Đạo, Nguyễn Cư Trinh và Cống Quỳnh bị ngập sâu.
- **Mức khớp:** **Trung bình** — xác nhận Trần Hưng Đạo và Cống Quỳnh trong cùng sự kiện ngập; nhãn khu vực khớp graph hơn nhãn cũ.
- **Giới hạn:** Bài không nói rõ đoạn Trần Đình Xu – Cống Quỳnh, không cho tọa độ hoặc phạm vi 300 m.

### r06 — Thi công: Lê Thánh Tôn, đoạn trước chợ Bến Thành

- **URL bài gốc:** <https://vnexpress.net/tp-hcm-chinh-trang-quang-truong-truoc-cho-ben-thanh-tu-thang-10-4758459.html>
- **Tên bài:** TP HCM chỉnh trang quảng trường trước chợ Bến Thành từ tháng 10
- **Cơ quan đăng:** VnExpress
- **Ngày đăng:** 15/06/2024
- **Nội dung nguồn chứng minh:** Bài nêu kế hoạch rào chắn, tháo dỡ và cải tạo; toàn bộ vỉa hè/lòng đường Lê Thánh Tôn cùng các đường quanh chợ Bến Thành được lát lại.
- **Mức khớp:** **Mạnh** — đúng tuyến, đúng khu vực và đúng loại công trình cải tạo đường/vỉa hè.
- **Giới hạn:** Bài mô tả kế hoạch thi công 2024–2025, không chứng minh công trình còn tồn tại ngày 08/08/2026 và không xác nhận bán kính 150 m.

### r07 — Thi công/rào chắn: Hai Bà Trưng, đoạn Tân Định

- **URL bài gốc:** <https://dantri.com.vn/thoi-su/tphcm-ho-tu-than-bat-ngo-xuat-hien-giua-duong-1380068305.htm>
- **Tên bài:** TPHCM: “Hố tử thần” bất ngờ xuất hiện giữa đường
- **Cơ quan đăng:** Báo Dân trí
- **Ngày đăng:** 19/09/2013
- **Nội dung nguồn chứng minh:** Bài xác định hố sụt trước số 296 Hai Bà Trưng, phường Tân Định; đơn vị thoát nước và thanh tra giao thông đến xử lý, một hàng rào chắn được dựng và các đơn vị dự kiến khai quật để tìm nguyên nhân.
- **Mức khớp:** **Đủ cho vùng cản trở giao thông minh họa** — rất gần vị trí mô hình và có rào chắn/khắc phục khẩn cấp; **không đủ để gọi là dự án thi công cống**.
- **Giới hạn:** Đây là sự cố năm 2013, không phải bằng chứng về một dự án thi công cống hay công trình đang hoạt động hiện nay. Nguồn cũng không chứng minh bán kính 200 m. `note_vi` đã được sửa để phản ánh đúng giới hạn này; nếu giảng viên bắt buộc một dự án thi công theo nghĩa chặt, cần thay cả record bằng công trình có thông báo phù hợp.

### r08 — Thi công: Võ Thị Sáu, Quận 3

- **URL bài gốc:** <https://benthanh.sawaco.com.vn/tin-tuc/hoat-dong-san-xuat-kinh-doanh/thong-bao-ve-viec-gian-doan-cung-cap-nuoc-de-phuc-vu-cong-tac.-vi-tri-thi-cong-giao-lo-vo-thi-sau-pasteur-giao-lo-vo-van-tan-truong-dinh-va-198-tran-quoc-thao-thuoc-phuong-vo-thi-sau-va-phuong-9-quan-3..html>
- **Tên thông báo:** Thông báo gián đoạn cung cấp nước để phục vụ công tác tại giao lộ Võ Thị Sáu – Pasteur và các vị trí thuộc Quận 3
- **Cơ quan đăng:** Công ty Cổ phần Cấp nước Bến Thành (đơn vị thuộc hệ thống SAWACO)
- **Ngày đăng:** 04/06/2021
- **Nội dung nguồn chứng minh:** Thông báo chính thức ghi công tác mở nắp hầm, bít hủy tạm đồng hồ tổng tại giao lộ Võ Thị Sáu – Pasteur, Quận 3, vào hai khung đêm 07–08/06 và 08–09/06/2021.
- **Mức khớp:** **Mạnh cho thi công hạ tầng cấp nước** — nguồn chính thức, đúng giao lộ rất gần tâm mô hình; không phải bằng chứng về nâng cấp mặt đường.
- **Giới hạn:** Công việc chỉ diễn ra trong các khung giờ nêu trên của năm 2021; không thể dùng để tuyên bố có công trình hiện tại và không xác nhận bán kính 200 m. `note_vi` đã được sửa theo đúng loại công tác mà nguồn mô tả.

## Các URL đã duyệt và tích hợp vào `source_url`

```json
{
  "r01": "https://congbao.hochiminhcity.gov.vn/cong-bao/van-ban/quyet-dinh/so/6261-qd-ubnd/ngay/30-11-2016/tai-ve/42090",
  "r02": "https://nhandan.vn/mua-to-trieu-cuong-gay-ngap-ung-tai-tp-ho-chi-minh-post410945.html",
  "r03": "https://baotintuc.vn/xa-hoi/tp-ho-chi-minh-ngap-nang-nhieu-tuyen-duong-sau-con-mua-nhu-trut-nuoc-20240527215404154.htm",
  "r04": "https://baotintuc.vn/anh/tp-ho-chi-minh-trieu-cuong-dang-cao-nhieu-tuyen-duong-ngap-sau-20251105181405682.htm",
  "r05": "https://tienphong.vn/pho-tay-bui-vien-ngap-sau-mua-lon-o-tphcm-post1793541.tpo",
  "r06": "https://vnexpress.net/tp-hcm-chinh-trang-quang-truong-truoc-cho-ben-thanh-tu-thang-10-4758459.html",
  "r07": "https://dantri.com.vn/thoi-su/tphcm-ho-tu-than-bat-ngo-xuat-hien-giua-duong-1380068305.htm",
  "r08": "https://benthanh.sawaco.com.vn/tin-tuc/hoat-dong-san-xuat-kinh-doanh/thong-bao-ve-viec-gian-doan-cung-cap-nuoc-de-phuc-vu-cong-tac.-vi-tri-thi-cong-giao-lo-vo-thi-sau-pasteur-giao-lo-vo-van-tan-truong-dinh-va-198-tran-quoc-thao-thuoc-phuong-vo-thi-sau-va-phuong-9-quan-3..html"
}
```

## Chứng minh dữ liệu giả lập phù hợp thực tế đến mức nào

### 1. Kiểm tra nguồn ngoài

- `r01`, `r02`, `r04`: nguồn mô tả đúng đoạn/khu vực ngập khá cụ thể.
- `r03`, `r05`: nguồn xác nhận đúng tuyến đường có ngập, nhưng chưa xác nhận chính xác tâm và bán kính.
- `r06`: nguồn xác nhận cải tạo/rào chắn tại đúng tuyến/khu vực, nhưng hiệu lực đã hết.
- `r07`: nguồn xác nhận sự cố, rào chắn và công tác khắc phục tại đúng đoạn Hai Bà Trưng – Tân Định; record chỉ được dùng như vùng cản trở giao thông minh họa, không gọi là dự án thi công cống.
- `r08`: nguồn chính thức xác nhận thi công hạ tầng cấp nước đúng giao lộ, nhưng không phải nâng cấp mặt đường và hiệu lực đã hết.

### 2. Kiểm tra không gian trong graph của nhóm

Đối chiếu tâm mỗi vùng với cạnh có đúng tên đường trong `data/graph_real.json` cho thấy khoảng cách gần nhất (ước lượng bằng node đầu/cuối cạnh) như sau:

| ID | Tuyến đối chiếu | Khoảng cách gần nhất | `radius_m` | Nhận xét |
|---|---|---:|---:|---|
| r01 | Nguyễn Hữu Cảnh | ~103 m | 400 m | Nằm trong vùng |
| r02 | Lê Văn Duyệt/Đinh Tiên Hoàng cũ | ~253 m | 250 m | Sát ranh; cần ghi chú lệch vị trí/đổi tên |
| r03 | Cống Quỳnh | ~77 m | 250 m | Nằm trong vùng |
| r04 | Võ Văn Kiệt | ~95 m | 250 m | Nằm trong vùng |
| r05 | Trần Hưng Đạo | ~118 m | 300 m | Nằm trong vùng |
| r06 | Lê Thánh Tôn | ~109 m | 150 m | Nằm trong vùng |
| r07 | Hai Bà Trưng | ~35 m | 200 m | Nằm trong vùng |
| r08 | Võ Thị Sáu | ~85 m | 200 m | Nằm trong vùng |

Đây là kiểm tra nhất quán nội bộ với snapshot OSM của project, **không phải phép đo pháp lý hoặc khảo sát hiện trường**. Sai số `r02` khoảng 3 m so với bán kính có thể do dùng khoảng cách tới node đầu/cuối thay vì hình học đầy đủ của đoạn đường; tuy nhiên tâm vùng rõ ràng nằm lệch khỏi trục đường chính nên phải công khai giới hạn này. Kiểm thêm giao lộ cụ thể cho thấy node Võ Thị Sáu–Pasteur của `r08` cách tâm khoảng 109 m, nằm trong bán kính 200 m. Với `r05`, node giao Trần Hưng Đạo–Trần Đình Xu cách tâm khoảng 118 m và node giao Trần Hưng Đạo–Cống Quỳnh khoảng 213 m, đều trong bán kính 300 m; nhãn cũ “đoạn Nguyễn Cư Trinh” đã được sửa vì node giao Nguyễn Cư Trinh cách khoảng 465 m. Nguồn vẫn chỉ support ở cấp tuyến/sự kiện, không xác nhận chính tâm circle.

### 3. Kiểm tra vùng thật sự tác động tới cạnh nào

Theo đúng luật “đánh dấu cạnh đi từ ngoài vào trong vùng”, 8 record tạo ra:

| ID | Số cạnh đi vào vùng | Một số tên cạnh được gắn |
|---|---:|---|
| r01 | 8 | Nguyễn Hữu Cảnh, Hầm chui Nguyễn Hữu Cảnh, D7–D9 |
| r02 | 11 | Trường Sa, Nguyễn Văn Giai, các hẻm Lê Văn Duyệt, Bùi Hữu Nghĩa |
| r03 | 11 | Cống Quỳnh, Nguyễn Trãi, Bùi Thị Xuân, Nguyễn Thị Minh Khai |
| r04 | 12 | Võ Văn Kiệt, Nguyễn Công Trứ, Nguyễn Thái Học, Cầu Ông Lãnh |
| r05 | 12 | Trần Hưng Đạo, Nguyễn Cư Trinh, Trần Đình Xu, Nguyễn Trãi |
| r06 | 7 | Lê Thánh Tôn, Lê Lợi, Công trường Quách Thị Trang |
| r07 | 5 | Hai Bà Trưng, Nguyễn Hữu Cầu, Đinh Công Tráng |
| r08 | 7 | Võ Thị Sáu, Pasteur, Nam Kỳ Khởi Nghĩa, Trần Quốc Toản |

Tổng cộng đúng **54 cạnh flood** và **19 cạnh construction** trong `G_real`, khớp `DATA.md`.

### 4. Kết quả kiểm định project

Lệnh đã chạy trên worktree hiện tại, base commit
`8a78a22ad755fd5be02bea490d1f8c2c127958a9`:

```text
.venv\Scripts\python.exe scripts\validate_data.py
```

Kết quả ngày 08/08/2026:

```text
OK - G_real: 2118 nodes, 4699 edges, strongly connected, profiles 4x100% OK
OK - G_demo: 51 nodes, 298 edges, strongly connected, invariants OK
OK - teaching graph presets: 7/15/25 induced SCC views valid
ALL DATA VALID
```

`validate_data.py` chứng minh cấu trúc/schema/profile/risk flags của dữ liệu **nhất quán với code**, nhưng không tự chứng minh các sự kiện ngoài đời. Phần đó phải dựa vào 8 nguồn và wording giới hạn ở trên.

## Wording đề nghị cho `DATA.md`/báo cáo

> `manual_risks.json` chứa 8 vùng rủi ro do nhóm đặt thủ công cho mục đích minh họa thuật toán. Nguồn ngoài cho thấy các tuyến/khu vực tương ứng đã từng được ghi nhận có ngập, công trình hoặc rào chắn tại thời điểm cụ thể. Các nguồn không phải dữ liệu real-time và không xác nhận chính xác tâm tọa độ hay bán kính. Tọa độ, `radius_m` và penalty là tham số mô hình hóa của nhóm; `r02`, `r03`, `r05`, `r07` và `r08` có giới hạn đối chiếu không gian/ngữ nghĩa được công khai trong Data Description.

## Kết quả tích hợp và QA còn lại

1. ✅ Đã đối chiếu nội dung, ngày đăng và URL trực tiếp của cả 8 nguồn; không có URL kết quả tìm kiếm hoặc URL cần tài khoản.
2. ✅ Đã thay 8 giá trị `source_url` và sửa wording provenance/`note_vi`; không đổi `type`, `lat`, `lon`, `radius_m`, graph, profile hoặc benchmark.
3. ✅ Đã chạy `.venv\Scripts\python.exe scripts\validate_data.py`: `ALL DATA VALID`; số risk edge không đổi.
4. ✅ Tài liệu hiện dùng “manual illustrative data supported by historical external sources”, không dùng “dữ liệu thực tế đã xác minh” hoặc “tình trạng hiện tại”.
5. ⬜ Trước khi nộp, nhóm vẫn nên mở lại cả 8 URL bằng tab ẩn danh trên đúng máy/mạng dùng để đóng gói. Phiên browser tự động chưa chạy được do lỗi tương thích `playwright-cli 0.1.18`/Node `v24.14.1`; đây là QA khả năng truy cập cuối, không phải thiếu bằng chứng nội dung.
6. Nếu giảng viên yêu cầu nguồn chứng minh đúng một dự án thi công cống, `r07` hiện không đạt nghĩa chặt và phải được thay cả record; không được nâng mức tuyên bố của nguồn hiện tại.
