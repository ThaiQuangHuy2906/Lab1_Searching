# MUST DO — Bổ sung nguồn cho 8 vùng rủi ro thủ công

> **Kiểm trực tiếp 2026-08-08:** nhiệm vụ này vẫn còn mở. Cả 8/8 giá trị
> `source_url` trong `data/manual_risks.json` hiện vẫn bắt đầu bằng `TODO:`.
> Chỉ đóng đầu việc khi từng record có nguồn phù hợp hoặc được mô tả trung thực
> là giả định minh hoạ chưa được nguồn ngoài xác minh.

## Làm ngay khi nhận file này

1. Chạy `git pull origin main` để lấy checklist và code mới nhất.
2. Trưởng nhóm điền tên người nhận cho tám dòng trong bảng phân công bên dưới.
3. Người tìm nguồn **không cùng lúc sửa JSON**; gửi bằng chứng theo đúng mẫu cho
   người tích hợp.
4. Chỉ một người tích hợp tám kết quả đã review, chạy data validator rồi báo lại
   commit/diff để cả nhóm kiểm tra.

UI Clarity và ảnh README đã hoàn tất, đã được đẩy lên `origin/main`. Đây là đầu
việc dữ liệu/provenance ưu tiên kế tiếp; không mở thêm feature UI và không chạy
benchmark, gamma calibration hay generator trong nhiệm vụ này.

## Tin nhắn gửi nhóm Messenger

Nhóm mình còn **1 đầu việc về provenance dữ liệu** trước khi chốt Data ZIP và
báo cáo: xử lý tám trường `source_url` đang mang placeholder `TODO: ...` trong
`data/manual_risks.json`.

`source_url` dùng để chứng minh nhóm dựa vào nguồn nào khi đặt vùng ngập hoặc
vùng thi công. Trường này **không tham gia thuật toán tìm đường và không làm thay
đổi cost**. Nếu chỉ điền URL thì không cần rebuild graph/profile. Tuy nhiên,
không được gọi các vùng này là “dữ liệu thực tế đã xác minh” khi chưa có nguồn.

### Phân công đề nghị — trưởng nhóm điền tên trước khi gửi

- **Bạn phụ trách Data / Role A:** tìm nguồn cho 5 điểm ngập `r01`–`r05`.
- **Bạn phụ trách Report / Role E:** tìm nguồn cho 3 điểm thi công `r06`–`r08`,
  sau đó review chéo cả 8 nguồn để dùng trong báo cáo và Data Description.
- **Một người duy nhất phụ trách tích hợp:** cập nhật đúng tám trường
  `source_url` sau khi tất cả nguồn được duyệt, để tránh conflict; không sửa các
  trường còn lại.

Nếu vai trò A/E chưa gắn với tên thành viên, trưởng nhóm điền người nhận vào
bảng dưới đây trước khi gửi.

| ID | Loại | Vị trí đang mô hình hóa | Người nhận | Trạng thái |
|---|---|---|---|---|
| `r01` | Ngập | Nguyễn Hữu Cảnh, đoạn gần cầu Sài Gòn | [GIAO TÊN] | ⬜ |
| `r02` | Ngập | Đinh Tiên Hoàng, đoạn gần cầu Bông/Đa Kao | [GIAO TÊN] | ⬜ |
| `r03` | Ngập | Cống Quỳnh, gần Bệnh viện Từ Dũ | [GIAO TÊN] | ⬜ |
| `r04` | Ngập | Calmette – Bến Chương Dương, phía Võ Văn Kiệt | [GIAO TÊN] | ⬜ |
| `r05` | Ngập | Trần Hưng Đạo, đoạn Nguyễn Cư Trinh | [GIAO TÊN] | ⬜ |
| `r06` | Thi công | Lê Thánh Tôn, đoạn trước chợ Bến Thành | [GIAO TÊN] | ⬜ |
| `r07` | Thi công | Hai Bà Trưng, đoạn Tân Định | [GIAO TÊN] | ⬜ |
| `r08` | Thi công | Võ Thị Sáu, Quận 3 | [GIAO TÊN] | ⬜ |

### Mỗi người phải gửi lại

Với mỗi ID được giao, gửi theo mẫu:

```text
ID: r0x
URL bài gốc: https://...
Tên bài/thông báo: ...
Cơ quan hoặc báo đăng: ...
Ngày đăng/cập nhật: ...
Nội dung nguồn chứng minh: nguồn nhắc đến tuyến/đoạn đường nào và loại rủi ro gì
Giới hạn: nguồn có/không chứng minh đúng thời điểm, tọa độ hoặc bán kính
```

Không chỉ gửi URL; phần giải thích ngắn giúp người review phát hiện link không
đúng địa điểm hoặc không đúng loại rủi ro.

### Nguồn được chấp nhận

Ưu tiên theo thứ tự:

1. Cổng/thông báo chính thức của cơ quan TP.HCM hoặc đơn vị quản lý giao thông.
2. Báo chí uy tín dẫn thông báo hoặc ghi nhận đúng tuyến đường.
3. Nguồn có tên đơn vị phát hành và ngày đăng rõ ràng.

Một nguồn đạt khi:

- mở được bằng tab ẩn danh, không cần tài khoản;
- nhắc đúng tuyến hoặc đoạn đường đủ gần với record;
- đúng loại `flood` hoặc `construction`;
- có ngày đăng/cập nhật; đặc biệt quan trọng với dữ liệu thi công;
- URL dẫn thẳng tới bài/thông báo gốc, không phải trang kết quả tìm kiếm.

### Không được làm

- Không bịa URL hoặc chọn đại một bài chỉ nhắc chung “TP.HCM hay ngập”.
- Không dùng URL kết quả tìm kiếm Google làm nguồn.
- Không tự ý sửa `type`, `lat`, `lon`, `radius_m`, graph, profile hay benchmark
  trong đầu việc này.
- Không khẳng định nguồn chứng minh chính xác tọa độ/bán kính nếu bài chỉ nhắc
  tên đường. Tọa độ và bán kính vẫn là **quy ước mô hình hóa của nhóm**.
- Không dùng một thông báo thi công đã hết hiệu lực để tuyên bố đó là tình trạng
  hiện tại mà không ghi rõ ngày và giới hạn.
- Không cố tìm một link cho đủ nếu nguồn không thực sự phù hợp; hãy báo
  **KHÔNG TÌM THẤY NGUỒN ĐỦ TỐT** để nhóm quyết định cách mô tả trung thực.

### Điều kiện đóng đầu việc

- [ ] Cả 8 ID đã có nguồn hoặc được đánh dấu rõ là giả định minh họa chưa được
      nguồn ngoài xác minh.
- [ ] Role E/người phụ trách báo cáo đã review nội dung của cả 8 nguồn.
- [ ] Link đã được thử ở tab ẩn danh.
- [ ] Chỉ người tích hợp sửa 8 trường `source_url` trong
      `data/manual_risks.json`; không thay đổi trường khác.
- [ ] `data/DATA.md`, báo cáo và Data Description dùng wording thống nhất:
      nguồn ngoài chứng minh địa điểm/rủi ro đến mức nào, còn tọa độ và bán kính
      là giả định mô hình hóa của nhóm.
- [ ] Từ repo root, chạy đúng
      `.venv\Scripts\python.exe scripts\validate_data.py` và ghi nhận kết quả
      thật trước khi đóng gói Data ZIP.
- [ ] Review diff xác nhận chỉ các URL/wording provenance đã được duyệt thay đổi;
      không có graph/profile/results hoặc numerical artifact bị ghi lại.

## Ghi chú cho trưởng nhóm

Đây là **một đầu việc provenance gồm 8 record**, không phải 8 blocker độc lập.
Khuyến nghị không chia cho quá nhiều người: một người tìm nhóm ngập, một người
tìm nhóm thi công/review, và một người tích hợp JSON là đủ. Nếu không tìm được
nguồn tốt cho một record, nhóm nên giữ cách mô tả “manual illustrative
assumption” thay vì tuyên bố đó là rủi ro thực tế đã được xác minh.

Sau khi đầu việc này đóng, trưởng nhóm mới xin/chốt ủy quyền cho chuỗi ghi dữ
liệu cuối: validation → benchmark exp1–exp7 → gamma calibration → teaching
generator. Không thành viên nào tự chạy riêng một mắt xích của chuỗi đó.
