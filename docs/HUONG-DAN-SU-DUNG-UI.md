# Hướng dẫn sử dụng giao diện

> Cập nhật: 2026-08-10 — UI & Explanation v2 qua Phase 6.
>
> Phạm vi hiện hành: chạy một route, route comparison 2–4, hành trình nhiều
> điểm theo thứ tự đã chọn và chạy một phương pháp ATSP. So sánh 2–3 phương pháp
> ATSP thuộc Phase 7 và chưa có trong UI.

## 1. Bố cục

Giao diện chính có ba vùng:

1. **Panel trái — Thiết lập:** graph, khung giờ, tiêu chí, loại bài toán, điểm
   Đi/Đến hoặc danh sách điểm giao, chế độ chạy và thuật toán.
2. **Ở giữa — Bản đồ:** graph, timeline và tuyến. Chạy một dùng một map lớn;
   So sánh nhiều dùng 2–4 map nhỏ bằng nhau.
3. **Drawer phải — Kết quả:** `Số liệu`, `Giải thích`, `So sánh`, `Thử nghiệm`.
   Trên desktop có thể kéo separator ở mép trái drawer để đổi độ rộng; nhấn đúp
   để về 400 px.

## 2. Chạy một thuật toán hai điểm

1. Chọn `G_demo` để xem timeline dạy học hoặc `G_real` để thử quy mô lớn.
2. Chọn khung giờ đại diện và tiêu chí:
   - `Cân bằng`: thời gian theo hồ sơ ùn tắc + phạt rủi ro.
   - `Nhanh nhất`: thời gian ước tính theo hồ sơ ùn tắc, không cộng risk.
   - `Ngắn nhất`: quãng đường, congestion/risk chỉ là bối cảnh.
3. Trong `Loại bài toán`, chọn `Hai điểm`.
4. Chọn điểm `Đi` và `Đến` từ danh sách hoặc bật chế độ chọn trên map.
5. Trong `Chế độ chạy`, chọn `Chạy một`.
6. Chọn một trong 9 thuật toán; nhập `k` cho Beam hoặc `ε` cho IDA* nếu muốn
   đổi mặc định.
7. Bấm nút `Chạy …: Đi → Đến`.

Sau khi chạy, map hiển thị tuyến cuối và drawer mở kết quả. Timeline chỉ mô tả
diễn biến search; metrics và tuyến cuối vẫn lấy từ toàn bộ lần chạy kể cả khi
trace bị giới hạn.

## 3. Đọc kết quả và timeline

- `Số liệu` tách **kết quả hành trình** khỏi **công sức tìm kiếm**.
- Objective thay đổi theo tiêu chí; quãng đường dùng km, time/balanced dùng phút,
  runtime thuật toán dùng ms.
- `Đảm bảo tối ưu`, `Có bảo đảm sai số ε` và `Không đảm bảo` là ba kết luận khác
  nhau. Một heuristic trùng kết quả exact trong một lần chạy không tự có bảo đảm.
- Nút timeline cho phép lùi/tiến, play/pause, kéo slider và đổi tốc độ. Node
  hiện tại, frontier và expanded trên map thay đổi theo bước đang xem.

## 4. Đọc tab Giải thích

Tab này giải thích đúng result đang được chọn:

1. `Kết luận`: route có được tìm thấy không, objective và mức bảo đảm.
2. `Vì sao chọn tuyến này?` — chỉ với Chạy một/Hai điểm: đối chiếu route kết quả
   với tối đa hai tuyến tham chiếu do UCS tính thêm sau lần chạy.
3. `Chi phí được chia như thế nào?`: quãng đường, thời gian thông thoáng, phần
   tăng do congestion, risk penalty và balanced cost.
4. `Vì sao tổng chi phí có giá trị này?`: yếu tố nào có tính vào objective và
   yếu tố nào chỉ là bối cảnh.
5. `Thuật toán đang làm gì?`: câu dễ hiểu theo đúng thuật toán; mở disclosure để
   xem g/h/f, frontier, bound, μ hoặc top-k.

### Tuyến và màu trên map

- Tuyến kết quả là đường liền theo màu route của theme.
- `Hiện trên bản đồ` trong khối tuyến tham chiếu vẽ một đường nét đứt, lệch nhẹ
  để không che tuyến kết quả. Bấm lại để ẩn.
- Đường đỏ khi vào Explain là các cạnh **trên tuyến kết quả cuối cùng** có mức
  ùn tắc 4–5 theo hồ sơ khung giờ. Nó không phải đường thuật toán đang đi tại
  bước timeline hiện tại và không phải dữ liệu giao thông trực tiếp.

## 5. So sánh 2–4 thuật toán

1. Giữ cùng input Đi/Đến hoặc cùng chuỗi điểm giao.
2. Trong `Chế độ chạy`, chọn `So sánh nhiều`.
3. Thêm từ 2 đến 4 thuật toán. Khi đủ 4, bỏ một thuật toán trước khi thêm cái mới.
4. Bấm `Chạy so sánh`.

Quy tắc đọc comparison:

- N thuật toán tạo đúng N pane/map. Mỗi map cho pan, zoom và Home riêng; thao
  tác một map không thay camera map khác.
- Map comparison là view-only: không chọn node/cạnh, xoá tuyến hoặc chỉnh trọng
  số. Muốn thử scenario, quay lại `Chạy một` và tab `Thử nghiệm`.
- Drawer `So sánh` chứa bảng N-way. Mọi giá trị thuật toán được canh giữa; cột
  `Chỉ số` đứng bên trái. `Đồng hạng n` nghĩa là bằng nhau trong tolerance.
- Một thuật toán lỗi không xoá các kết quả đã thành công. Có thể retry riêng item
  lỗi hoặc huỷ phần còn lại.
- `Xem giải thích` ở pane nào sẽ mở đúng result pane đó. Selector tuyến tham
  chiếu chỉ dành cho Chạy một nên không xuất hiện trong comparison.

## 6. Nhiều điểm

### Đi theo thứ tự đã chọn

Chọn `Nhiều điểm` → `Đi theo thứ tự đã chọn`, nhập điểm Đi và danh sách điểm
giao. App chạy cùng thuật toán search cho từng chặng theo đúng thứ tự đã khóa.
Có thể dùng `Chạy một` hoặc so sánh 2–4 thuật toán trên cùng chuỗi điểm.

### Tối ưu thứ tự ATSP

Chọn `Tối ưu thứ tự giao hàng`, sau đó chọn Held–Karp, NN + 2-opt/Or-opt hoặc
Simulated Annealing. UI hiện chạy một phương pháp và đối chiếu thứ tự nhập với
thứ tự sau tối ưu. Không gọi NN/SA là tối ưu toàn cục; comparison nhiều phương
pháp ATSP chưa thuộc runtime Phase 6.

## 7. Thử nghiệm trọng số

Tab `Thử nghiệm` chỉ chỉnh scenario của request hiện tại, không sửa graph/profile
gốc. Dùng `Chọn nhanh` hoặc `Chỉnh chi tiết`, chạy lại và đọc bảng Gốc/Đang thử.
Compare mode khóa editor để mọi thuật toán dùng cùng immutable snapshot.

## 8. Known issue và xử lý nhanh

- **IDA\* có thể trả HTTP 500 với ε mặc định ở một số cặp điểm.** Thuật toán đã
  tìm được nghiệm trong biên ε, nhưng validator hiện có thể nhầm kết quả này với
  exact và bác exact reference tốt hơn. Đây là known issue backend, không phải
  bằng chứng graph vô đường. Trước khi fix, có thể thử ε nhỏ hơn hoặc dùng A*/UCS;
  workaround không thay thế regression cần thiết.
- Backend không gọi được: chạy uvicorn ở cổng 8000 rồi restart frontend.
- Graph cũ: dừng process cũ, restart backend, hard-refresh và xác nhận G_demo
  hiện có 51 node/298 cạnh.
- Map nền trống: kiểm mạng hoặc bật Offline; thuật toán vẫn dùng snapshot local.

## 9. Checklist trước demo

1. Restart backend và frontend; hard-refresh.
2. Kiểm `/api/health` và `/api/graph?level=demo&view=full`.
3. Chạy một route A* và mở đủ Số liệu/Giải thích.
4. Chạy comparison N=2, N=3 và N=4; thử zoom riêng từng map.
5. Kiểm drawer resize, table scroll và không chỉnh được scenario trong compare.
6. Kiểm console không có React/deck.gl/WebGL error ở độ phân giải trình chiếu.

