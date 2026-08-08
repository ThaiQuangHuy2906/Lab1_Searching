# MUST DO — Nguồn cho 8 vùng rủi ro thủ công (đã tích hợp)

> **Đóng đầu việc kỹ thuật ngày 2026-08-08:** `data/manual_risks.json` hiện có
> 8/8 URL HTTPS và 0 placeholder `TODO`. Chi tiết nguồn, ngày đăng, nội dung đối
> chiếu và giới hạn nằm trong `manual_risks_sources_review.md` và
> `data/DATA.md` §2.1.

## Kết luận review

| ID | Kết luận dùng nguồn |
|---|---|
| `r01` | Khớp mạnh với đoạn Nguyễn Hữu Cảnh gần cầu Sài Gòn trong hồ sơ giảm ngập 2016 |
| `r02` | Dùng được cho sự kiện lịch sử trên đoạn Cầu Bông–Phan Đăng Lưu; phải nêu đoạn đã đổi tên Lê Văn Duyệt và tâm mô hình lệch sát ngoài bán kính |
| `r03` | Xác nhận Cống Quỳnh từng ngập; không xác nhận riêng đoạn Bệnh viện Từ Dũ |
| `r04` | Khớp mạnh với Võ Văn Kiệt gần cầu Calmette bị ngập do triều cường năm 2025 |
| `r05` | Xác nhận Trần Hưng Đạo/Cống Quỳnh từng được ghi nhận ngập; đã sửa nhãn lệch Nguyễn Cư Trinh thành khu vực Trần Đình Xu–Cống Quỳnh, nhưng nguồn không xác nhận chính xác đoạn |
| `r06` | Xác nhận rào chắn/cải tạo khu Lê Thánh Tôn–chợ Bến Thành trong giai đoạn 2024–2025; không còn hiệu lực hiện tại |
| `r07` | Chỉ đủ cho vùng cản trở do hố sụt, rào chắn và khắc phục khẩn cấp năm 2013; không được gọi là dự án thi công cống |
| `r08` | Xác nhận thi công hạ tầng cấp nước tại Võ Thị Sáu–Pasteur năm 2021; không phải nâng cấp mặt đường hay công trình hiện tại |

Tất cả tám circle vẫn là **dữ liệu minh họa do nhóm mô hình hóa**. Nguồn ngoài
chỉ chứng minh tuyến/khu vực từng có sự kiện tại thời điểm bài đăng; chúng không
xác nhận chính xác `lat`, `lon`, `radius_m`, severity, penalty hoặc trạng thái
real-time.

## Thay đổi đã tích hợp

- Điền đúng 8 trường `source_url`.
- Sửa `meta.description_vi` để phân biệt nguồn lịch sử với dữ liệu real-time.
- Hạ wording `r07` về khắc phục hố sụt/rào chắn và sửa `r08` thành thi công hạ
  tầng cấp nước.
- Đồng bộ Data Description, khung báo cáo và các tài liệu current-state.
- Không đổi `type`, tọa độ, bán kính, graph, profile, cost, benchmark hoặc
  numerical artifact.

## Kiểm chứng

- 7 nguồn tải/đọc được qua web không có phiên đăng nhập; nguồn Cấp nước Bến
  Thành `r08` trả HTTP 200 và có đúng tiêu đề, ngày, vị trí, thời gian thi công.
- JSON parse được đúng 8 record, 8 URL HTTPS, 0 `TODO`.
- `.venv\Scripts\python.exe scripts\validate_data.py`: `ALL DATA VALID`.
- Risk counts không đổi: G_real `54 flood / 19 construction`; G_demo
  `24 flood / 24 construction`.

## QA thủ công trước khi nộp

- [ ] Mở lại cả 8 URL bằng tab ẩn danh trên đúng máy/mạng dùng để đóng gói.
  Browser automation chưa chạy được do lỗi tương thích `playwright-cli 0.1.18`
  với Node `v24.14.1`; không vì vậy mà tuyên bố bước tab ẩn danh đã hoàn tất.
- [ ] Trong PDF/slide/video, dùng wording “manual illustrative data supported by
  historical external sources”; không dùng “dữ liệu thực tế đã xác minh” hay
  “tình trạng hiện tại”.
- [ ] Nếu giảng viên bắt buộc `r07` phải là một dự án thi công cống theo nghĩa
  chặt, thay cả record bằng một dự án có thông báo phù hợp; không nâng mức tuyên
  bố của nguồn Dân trí hiện tại.
