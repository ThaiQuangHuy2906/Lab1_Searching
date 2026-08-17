# 2. Bối cảnh bài toán

## 2.1. Kịch bản giao thông được lựa chọn

Nhóm lựa chọn kịch bản **tối ưu tuyến đường giao hàng qua nhiều địa điểm tại Thành phố Hồ Chí Minh**, hướng đến đối tượng người giao hàng (shipper) của các nền tảng giao hàng công nghệ. Đây là một tình huống gần gũi với giao thông đô thị Việt Nam, nơi người giao hàng thường phải di chuyển liên tục giữa nhiều địa điểm trong cùng một hành trình.

Trong điều kiện lý tưởng, lựa chọn tuyến đường có thể chỉ đơn giản là tìm con đường ngắn nhất từ điểm xuất phát đến điểm giao hàng. Tuy nhiên, trong môi trường giao thông thực tế tại Thành phố Hồ Chí Minh, **khoảng cách ngắn nhất không đồng nghĩa với hành trình hiệu quả nhất**. Một tuyến đường có thể ngắn về mặt địa lý nhưng lại đi qua khu vực đông xe, đường một chiều, giao lộ phức tạp, đoạn đường đang thi công, khu vực ngập nước hoặc những tuyến đường có điều kiện di chuyển không thuận lợi.

Thách thức trở nên rõ rệt hơn khi shipper phải giao hàng tại **nhiều địa điểm trong cùng một chuyến đi**. Khi đó, bài toán không chỉ là “đi đường nào”, mà còn là **“nên giao địa điểm nào trước, địa điểm nào sau và nên di chuyển giữa các địa điểm đó bằng tuyến nào”**. Một thứ tự giao hàng không hợp lý có thể khiến shipper phải quay lại khu vực đã đi qua, di chuyển vòng hoặc tạo ra tổng hành trình dài hơn cần thiết.

Vì vậy, nhóm lựa chọn kịch bản này nhằm mô phỏng một quyết định thường gặp trong giao thông đô thị: **tìm một hành trình hợp lý trong khi đồng thời phải cân nhắc khoảng cách, thời gian và các điều kiện giao thông trên đường**.

## 2.2. Vấn đề thực tế cần giải quyết

Vấn đề cốt lõi của bài toán là việc người giao hàng phải đưa ra quyết định tuyến đường trong một mạng lưới giao thông có nhiều phương án khác nhau và nhiều yếu tố ảnh hưởng đến chất lượng của từng phương án.

Đối với trường hợp **một điểm đến**, nếu chỉ lựa chọn tuyến có khoảng cách nhỏ nhất, shipper có thể đi vào một đoạn đường đang ùn tắc hoặc có điều kiện di chuyển bất lợi. Kết quả là quãng đường tuy ngắn nhưng thời gian di chuyển ước tính có thể cao hơn so với một tuyến khác dài hơn đôi chút.

Đối với trường hợp **nhiều điểm giao hàng**, độ phức tạp còn tăng lên vì chất lượng của toàn bộ hành trình phụ thuộc vào cả **thứ tự ghé thăm các địa điểm**. Ví dụ, nếu các điểm giao được sắp xếp không phù hợp, shipper có thể phải di chuyển qua lại giữa các khu vực thay vì hoàn thành các điểm gần nhau theo một trình tự hợp lý. Vì vậy, tối ưu riêng từng đoạn đường chưa chắc tạo ra một hành trình tổng thể tốt.

Từ đó, bài toán của nhóm tập trung giải quyết hai nhu cầu liên quan:

- **Tìm tuyến đường giữa hai địa điểm:** xác định một tuyến phù hợp từ vị trí bắt đầu đến điểm đến.
- **Tối ưu hành trình qua nhiều địa điểm:** xác định thứ tự ghé thăm hiệu quả và tuyến di chuyển tương ứng giữa các địa điểm.

Điểm quan trọng là hệ thống **không xem khoảng cách là tiêu chí duy nhất**. Một tuyến đường cần được đánh giá trong mối quan hệ với thời gian di chuyển ước tính, mức độ ùn tắc và các yếu tố bất lợi của đường đi. Điều này giúp bài toán phản ánh tốt hơn cách một quyết định định tuyến được đưa ra trong môi trường giao thông đô thị thực tế.

## 2.3. Ý nghĩa của việc tối ưu tuyến đường

Tối ưu tuyến đường có ý nghĩa trong kịch bản này vì mục tiêu của shipper không đơn thuần là tìm một con đường có thể đi từ A đến B, mà là **lựa chọn phương án di chuyển phù hợp nhất trong số nhiều phương án có thể tồn tại**.

Một hệ thống tối ưu tuyến hiệu quả có thể giúp:

- hạn chế những quãng đường di chuyển không cần thiết;
- giảm thời gian dự kiến của hành trình;
- tránh hoặc giảm ảnh hưởng của các khu vực có điều kiện giao thông bất lợi;
- hỗ trợ lựa chọn thứ tự giao hàng hợp lý khi có nhiều địa điểm;
- cung cấp cơ sở rõ ràng để người dùng hiểu vì sao một tuyến được ưu tiên hơn tuyến khác.

Ví dụ, giữa hai phương án, **Route A** có thể ngắn hơn về khoảng cách nhưng đi qua khu vực ùn tắc, trong khi **Route B** dài hơn một chút nhưng có thời gian di chuyển dự kiến thấp hơn và điều kiện giao thông thuận lợi hơn. Trong trường hợp đó, lựa chọn Route B có thể hợp lý hơn đối với một shipper cần hoàn thành nhiều đơn hàng liên tiếp.

Đây cũng chính là điểm khiến bài toán phù hợp với các phương pháp tìm kiếm trong Trí tuệ nhân tạo. Thay vì chỉ trả về một đường đi, hệ thống cần **tìm kiếm, đánh giá và so sánh nhiều phương án**, sau đó xác định tuyến phù hợp theo tiêu chí được lựa chọn. Đối với nhiều điểm giao hàng, hệ thống còn cần xem xét các thứ tự ghé thăm khác nhau để xây dựng một hành trình tổng thể hiệu quả hơn.

Qua đó, ứng dụng đóng vai trò như một **công cụ hỗ trợ ra quyết định**: giúp người dùng biết nên đi tuyến nào, nên ghé các địa điểm theo thứ tự nào và quan trọng hơn là **giải thích được vì sao phương án đó được lựa chọn**. Điều này giúp đề tài vừa gắn với một vấn đề giao thông quen thuộc tại Việt Nam, vừa thể hiện rõ giá trị của việc áp dụng các thuật toán tìm kiếm và tối ưu vào một bài toán thực tế.
