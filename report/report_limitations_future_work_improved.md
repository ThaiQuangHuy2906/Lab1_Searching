# 10. Hạn chế và hướng phát triển

## 10.1. Khó khăn trong quá trình thực hiện

Một khó khăn lớn của dự án là kết hợp dữ liệu mạng đường với các thông tin giao thông dùng cho thí nghiệm. Mạng đường cần giữ được các đặc trưng quan trọng như hướng đi, khoảng cách và khả năng kết nối, trong khi dữ liệu giao thông có thể đến từ nhiều nguồn hoặc được mô phỏng ở các thời điểm khác nhau. Vì vậy, nhóm phải chuẩn hóa dữ liệu để các thuật toán có thể sử dụng cùng một đầu vào và kết quả có thể được so sánh công bằng.

Khó khăn tiếp theo là cân bằng giữa **độ thực tế của bản đồ** và **khả năng trực quan hóa thuật toán**. Đồ thị đường thực tế có số lượng nút và cạnh lớn, phù hợp để đánh giá hiệu năng nhưng khó quan sát từng bước tìm kiếm. Do đó, nhóm sử dụng thêm đồ thị demo gồm 51 địa điểm để minh họa quá trình chạy thuật toán, đồng thời vẫn phải bảo đảm các thông tin quan trọng như chiều đường, khoảng cách, thời gian và tính liên thông.

Dự án cũng triển khai nhiều thuật toán tìm kiếm có cách mở rộng nút, quản lý frontier và điều kiện dừng khác nhau. Việc đưa kết quả của các thuật toán về cùng một cấu trúc để giao diện có thể hiển thị đường đi, số nút đã xét, chi phí và các bước tìm kiếm là một thách thức đáng kể.

Đối với bài toán nhiều địa điểm, chi phí giữa hai điểm có thể không đối xứng do đường một chiều và điều kiện giao thông. Vì vậy, nhóm không chỉ phải tìm tuyến giữa từng cặp địa điểm mà còn phải đánh giá thứ tự ghé thăm. Held–Karp bảo đảm nghiệm tối ưu cho các trường hợp nhỏ trong giới hạn triển khai của dự án. Nearest Neighbor ưu tiên khả năng phản hồi nhanh, còn Simulated Annealing mở rộng phạm vi tìm kiếm; tuy nhiên, cả hai chỉ trả về nghiệm heuristic, không bảo đảm tối ưu và không có cận sai số tổng quát.

Cuối cùng, backend, frontend và phần giải thích kết quả phải sử dụng nhất quán cùng dữ liệu và tham số đầu vào. Điều này đặc biệt quan trọng khi người dùng chạy nhiều thuật toán, so sánh kết quả hoặc chuyển sang chế độ tối ưu nhiều địa điểm.

## 10.2. Hạn chế của hệ thống hiện tại

Sản phẩm hiện tại là **một nguyên mẫu học thuật phục vụ mô phỏng và so sánh thuật toán**, chưa phải hệ thống điều hướng thương mại. Các hạn chế chính gồm:

| Nhóm hạn chế | Hiện trạng và ảnh hưởng |
|---|---|
| **Dataset** | Phạm vi dữ liệu mới tập trung vào một phần Thành phố Hồ Chí Minh. Một phần điều kiện giao thông được lấy theo snapshot hoặc mô phỏng nên chưa phản ánh liên tục các thay đổi ngoài thực tế. |
| **Dữ liệu giao thông** | Hệ thống chưa nhận dữ liệu thời gian thực về tai nạn, mưa/ngập, cấm đường hoặc ùn tắc mới phát sinh, vì vậy chưa thể tự tái định tuyến khi điều kiện giao thông thay đổi. |
| **Hàm chi phí** | Khoảng cách, thời gian, ùn tắc và rủi ro được kết hợp bằng các tham số do nhóm thiết kế. Các tham số này chưa được hiệu chuẩn bằng dữ liệu giao hàng thực tế nên thời gian ước tính chưa thể xem là ETA thương mại. |
| **Mô hình mạng đường** | Mạng đường đã được đơn giản hóa để phục vụ bài toán tìm kiếm; chưa mô hình hóa đầy đủ hẻm xe máy, cấm rẽ, số làn, chu kỳ đèn tín hiệu, thời tiết và một số ràng buộc phương tiện. |
| **Thuật toán tìm đường** | Một số thuật toán như BFS, DFS, Greedy hoặc Beam Search không bảo đảm tìm được tuyến có chi phí tối ưu trên đồ thị có trọng số. Các thuật toán heuristic cũng phụ thuộc vào cách thiết kế heuristic và tham số. |
| **Tối ưu nhiều địa điểm** | Phương pháp chính xác như Held–Karp chỉ phù hợp với số lượng điểm nhỏ do chi phí tính toán tăng nhanh. Các phương pháp heuristic nhanh hơn nhưng không bảo đảm nghiệm tối ưu. |
| **Phạm vi bài toán giao hàng** | Hệ thống hiện tập trung vào một shipper và một hành trình. Chưa xét đồng thời nhiều shipper, tải trọng, thời gian phục vụ tại điểm giao hoặc khung giờ giao hàng. |
| **Ứng dụng và giao diện** | Hệ thống chủ yếu phục vụ demo trên môi trường cục bộ; chưa tích hợp GPS, chỉ dẫn từng chặng, đồng bộ đơn hàng hoặc triển khai như một ứng dụng điều hướng thực tế. |
| **Đánh giá thực nghiệm** | Việc đánh giá hiện chủ yếu dựa trên các test case và benchmark của dự án. Chưa có thử nghiệm giao hàng ngoài thực tế trong nhiều ngày để đối chiếu tuyến đề xuất và thời gian dự kiến. |

Những hạn chế trên không làm mất giá trị của dự án trong phạm vi môn học. Hệ thống vẫn đáp ứng mục tiêu chính là mô hình hóa bài toán giao thông bằng đồ thị, chạy và so sánh các thuật toán tìm kiếm, tối ưu hành trình nhiều địa điểm và giải thích kết quả. Tuy nhiên, chúng cho thấy khoảng cách giữa một mô hình học thuật và một hệ thống điều hướng có thể sử dụng trong thực tế.

## 10.3. Hướng phát triển

### 1. Tích hợp dữ liệu giao thông thời gian thực

Hệ thống có thể tích hợp **Map API và Traffic API** để cập nhật tốc độ, ùn tắc, sự cố, cấm đường, mưa hoặc ngập theo thời gian thực. Khi chi phí của các đoạn đường thay đổi, hệ thống có thể tính lại tuyến và hỗ trợ tái định tuyến thay vì chỉ sử dụng dữ liệu đã chuẩn bị trước.

### 2. Mở rộng và hoàn thiện mô hình mạng đường

Dữ liệu bản đồ có thể được mở rộng ra phạm vi lớn hơn của Thành phố Hồ Chí Minh và giữ nhiều thông tin đường đi hơn. Trong tương lai, mô hình nên bổ sung cấm rẽ, loại phương tiện, hẻm phù hợp với xe máy, số làn, tín hiệu giao thông và các khu vực hạn chế theo thời gian.

### 3. Hiệu chuẩn hàm chi phí bằng dữ liệu thực tế

Các trọng số cho khoảng cách, thời gian, ùn tắc và rủi ro có thể được hiệu chỉnh dựa trên dữ liệu hành trình thực tế. Việc so sánh thời gian dự kiến với thời gian di chuyển đo được sẽ giúp hàm chi phí phản ánh tốt hơn nhu cầu của shipper thay vì chỉ dựa trên giả định thiết kế.

### 4. Phát triển bài toán nhiều điểm thành bài toán nhiều phương tiện

Bài toán hiện tại có thể được mở rộng từ tối ưu thứ tự giao hàng cho một shipper sang **Vehicle Routing Problem (VRP)**. Phiên bản này có thể hỗ trợ nhiều shipper, giới hạn tải trọng, khung giờ giao hàng và thời gian phục vụ tại từng điểm. Các thuật toán chính xác có thể tiếp tục dùng làm chuẩn cho bài toán nhỏ, trong khi heuristic hoặc metaheuristic được dùng cho dữ liệu lớn hơn.

### 5. Cải thiện hiệu năng và khả năng sử dụng

Hệ thống có thể tối ưu việc tính toán ma trận chi phí, cache kết quả phù hợp và giới hạn thời gian chạy đối với các thuật toán có thể mở rộng nhiều nút. Giao diện nên tiếp tục được cải thiện theo hướng mobile-friendly, dễ sử dụng và hỗ trợ tốt hơn cho accessibility.

### 6. Triển khai và kiểm chứng ngoài thực tế

Một hướng phát triển quan trọng là triển khai hệ thống trên cloud hoặc dưới dạng ứng dụng web/PWA có GPS. Nhóm có thể thực hiện các hành trình thử nghiệm trong nhiều khung giờ, so sánh tuyến đề xuất với dữ liệu di chuyển thực tế và thu thập phản hồi của người giao hàng. Đây là bước cần thiết để đánh giá liệu mô hình có còn hiệu quả khi áp dụng ngoài môi trường mô phỏng hay không.

## 10.4. Thứ tự ưu tiên phát triển

| Giai đoạn | Hướng ưu tiên |
|---|---|
| **Ngắn hạn** | Mở rộng test case; hoàn thiện mobile/accessibility; cải thiện xử lý timeout và hiệu năng. |
| **Trung hạn** | Tích hợp dữ liệu giao thông thời gian thực và Map API; cải thiện mô hình mạng đường; hiệu chuẩn hàm chi phí. |
| **Dài hạn** | Phát triển VRP nhiều shipper; tích hợp GPS và quản lý đơn hàng; triển khai cloud và thử nghiệm thực địa. |

Tóm lại, hướng phát triển của dự án không chỉ là bổ sung thêm thuật toán. Giá trị lớn hơn nằm ở việc **nâng chất lượng dữ liệu, mô hình hóa chính xác hơn các ràng buộc giao thông, mở rộng bài toán giao hàng và kiểm chứng kết quả bằng dữ liệu thực tế**. Đây là các bước cần thiết để đưa hệ thống từ một mô hình học thuật tiến gần hơn đến một công cụ hỗ trợ định tuyến có khả năng ứng dụng thực tế.
