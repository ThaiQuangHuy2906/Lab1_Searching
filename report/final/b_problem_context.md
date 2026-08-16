# b. Problem Context (Bối cảnh bài toán)

## b.1. Kịch bản giao thông được lựa chọn

Đề tài lựa chọn kịch bản **hỗ trợ một shipper lập hành trình giao hàng qua nhiều địa điểm tại khu vực trung tâm Thành phố Hồ Chí Minh**. Trong mỗi chuyến đi, shipper xuất phát từ một điểm tập kết, cần ghé các địa điểm giao hàng và phải quyết định đồng thời tuyến đường cho từng chặng cũng như thứ tự phục vụ các điểm đến. Đây là một bài toán tiêu biểu của logistics chặng cuối (*last-mile delivery*), nơi chất lượng của quyết định định tuyến ảnh hưởng trực tiếp đến tổng quãng đường, thời gian di chuyển và khả năng duy trì tiến độ giao hàng.

Bối cảnh này có ý nghĩa thực tiễn rõ rệt tại Thành phố Hồ Chí Minh. Theo TomTom Traffic Index, trong năm 2025, mức ùn tắc trung bình của khu vực thành phố đạt **46,9%**; một hành trình 10 km mất trung bình **31 phút 55 giây**. Trong giờ cao điểm buổi tối, cùng quãng đường này mất trung bình **40 phút 32 giây**, với tốc độ trung bình chỉ **14,8 km/h**; tổng thời gian mất thêm do ùn tắc trong các giờ cao điểm được ước tính là **127 giờ trong năm** (TomTom, n.d.). Các số liệu này là chỉ báo ở quy mô thành phố, không phải số đo trực tiếp cho từng đoạn đường trong mô hình, nhưng cho thấy thời gian di chuyển có thể biến động đáng kể theo thời điểm.

Ở phạm vi rộng hơn, báo cáo *Viet Nam Rising: Pathways to a High-Income Future* nhận định ùn tắc tại Hà Nội và Thành phố Hồ Chí Minh đang làm suy giảm lợi ích kinh tế từ tập trung đô thị và hạn chế khả năng kết nối lao động trong vùng đô thị (Coppola Suriani et al., 2025). Đối với hoạt động giao hàng, tác động này được thể hiện ở quy mô nhỏ hơn nhưng diễn ra lặp lại hằng ngày: mỗi lần đi vòng, chọn nhầm tuyến trong giờ đông xe hoặc sắp xếp thứ tự giao hàng chưa hợp lý đều có thể cộng dồn thành thời gian chậm trễ đáng kể trong toàn bộ hành trình.

Nghiên cứu về logistics chặng cuối cũng chỉ ra rằng sự gia tăng nhu cầu giao nhận trong đô thị tạo thêm áp lực lên hạ tầng đường bộ, trong khi bài toán định tuyến phải xử lý đồng thời nhiều điều kiện vận hành như ùn tắc, thời gian phục vụ và sự biến động của môi trường giao hàng (Boysen et al., 2021; Jazemi et al., 2023). Vì vậy, kịch bản shipper tại Thành phố Hồ Chí Minh vừa phù hợp với yêu cầu của đề tài, vừa đại diện cho một nhu cầu ra quyết định có cơ sở thực tế.

## b.2. Vấn đề thực tế cần giải quyết

Trong mạng lưới đường đô thị, **tuyến ngắn nhất về khoảng cách không nhất thiết là tuyến có thời gian di chuyển thấp nhất hoặc phù hợp nhất**. Một tuyến ngắn có thể đi qua đoạn đường ùn tắc, giao lộ có độ trễ lớn, khu vực ngập hoặc thi công; trong khi một tuyến dài hơn đôi chút có thể giúp hành trình ổn định hơn. Đường một chiều còn làm cho chi phí di chuyển giữa hai địa điểm phụ thuộc vào hướng đi: tuyến từ A đến B có thể khác đáng kể so với tuyến từ B về A. Do đó, khoảng cách đường chim bay hoặc một thứ tự ghé dựa đơn thuần trên vị trí địa lý không đủ để đại diện cho chi phí vận hành thực tế.

Với một điểm đến, shipper cần lựa chọn một đường đi hợp lệ theo mục tiêu đang ưu tiên, chẳng hạn quãng đường, thời gian ước tính hoặc mức độ phù hợp tổng hợp có xét điều kiện bất lợi trên đường. Với nhiều điểm giao, bài toán xuất hiện thêm một tầng quyết định: **nên ghé các điểm theo thứ tự nào**. Một thứ tự không hợp lý có thể khiến shipper quay lại khu vực vừa đi qua hoặc thực hiện nhiều chặng có chi phí cao, ngay cả khi mỗi chặng riêng lẻ đã sử dụng một tuyến tốt.

Vì vậy, vấn đề được phân thành hai nhiệm vụ liên kết:

1. **Tối ưu tuyến giữa hai địa điểm:** tìm đường đi phù hợp trên mạng đường có hướng theo tiêu chí được lựa chọn.
2. **Tối ưu hành trình qua nhiều địa điểm:** xác định thứ tự ghé thăm và ghép các tuyến giữa từng cặp điểm thành một hành trình nhất quán.

Cách phân tách này giúp thể hiện đúng bản chất của quyết định giao hàng: tối ưu từng chặng không tự động bảo đảm tối ưu toàn bộ chuyến đi, còn một thứ tự ghé tốt chỉ có ý nghĩa khi chi phí giữa các điểm được tính từ các tuyến đường thực sự có thể di chuyển. Trong phạm vi đồ án, hệ thống tập trung vào một shipper và một hành trình tại một thời điểm; các ràng buộc của bài toán vận tải quy mô lớn như nhiều phương tiện, tải trọng hoặc khung giờ giao hàng chưa được đưa vào. Việc xác định rõ giới hạn này giúp kết quả được diễn giải đúng như một mô hình hỗ trợ học tập và ra quyết định, thay vì một hệ thống điều phối thương mại hoàn chỉnh.

## b.3. Ý nghĩa của việc tối ưu tuyến đường

Tối ưu tuyến đường mang lại ba nhóm giá trị chính trong kịch bản đã chọn.

Thứ nhất, về **hiệu quả hành trình**, hệ thống giúp hạn chế các chặng vòng không cần thiết, giảm chi phí di chuyển theo mục tiêu đã chọn và sắp xếp thứ tự giao hàng hợp lý hơn. Trong điều kiện ùn tắc thay đổi theo thời điểm, khả năng đánh giá nhiều phương án cho phép tránh việc mặc định rằng tuyến ngắn nhất luôn là lựa chọn tốt nhất.

Thứ hai, về **tính ổn định của quyết định**, việc xem xét đồng thời hướng đường, thời gian ước tính, mức độ ùn tắc và yếu tố rủi ro tạo ra một cơ sở lựa chọn sát với bối cảnh đô thị hơn so với tối ưu khoảng cách đơn thuần. Điều này không biến kết quả thành dự báo thời gian thực, nhưng giúp người dùng quan sát rõ vì sao cùng một cặp địa điểm có thể cần tuyến khác nhau khi mục tiêu hoặc điều kiện giao thông thay đổi.

Thứ ba, về **khả năng giải thích và so sánh**, hệ thống không chỉ trả về một đường đi. Mỗi phương án còn được trình bày cùng chi phí, quãng đường, thời gian ước tính, các yếu tố ảnh hưởng và mức bảo đảm của phương pháp tìm kiếm. Nhờ đó, người dùng có thể hiểu sự đánh đổi giữa các lựa chọn thay vì tiếp nhận một kết quả như một “hộp đen”. Đây cũng là cơ sở để đánh giá công bằng nhiều thuật toán trên cùng dữ liệu và cùng điều kiện giao thông.

Giá trị cốt lõi của đề tài vì thế nằm ở việc kết nối **ba lớp quyết định** trong một quy trình thống nhất: lựa chọn tuyến cho từng chặng, tối ưu thứ tự giao nhiều điểm và giải thích cơ sở của phương án được chọn. Sự kết hợp này tạo ra một mô hình có tính ứng dụng và giá trị minh họa cao hơn bài toán đường đi ngắn nhất thuần túy, nhưng vẫn giữ phạm vi phù hợp với mục tiêu nghiên cứu thuật toán tìm kiếm của môn học.

## b.4. Điểm nhấn của bài toán

Đề tài không đặt mục tiêu đề xuất một thuật toán hoàn toàn mới. Điểm nhấn nằm ở cách **đưa các thuật toán tìm kiếm và tối ưu vào một bối cảnh giao thông Việt Nam có nhiều yếu tố tương tác**, thay vì đánh giá chúng trên một đồ thị trừu tượng chỉ có một loại trọng số. Mạng đường có hướng làm nổi bật ảnh hưởng của đường một chiều; hồ sơ ùn tắc theo thời điểm cho phép quan sát sự thay đổi của tuyến; các yếu tố rủi ro tạo ra sự đánh đổi giữa “ngắn”, “nhanh” và “phù hợp”; còn bài toán nhiều điểm cho thấy khác biệt giữa tối ưu cục bộ từng chặng và tối ưu toàn bộ hành trình.

Nhờ đó, sản phẩm vừa giải quyết đúng hai yêu cầu tìm đường và giao hàng đa điểm, vừa tạo điều kiện để người học quan sát, so sánh và giải thích hành vi của các phương pháp khác nhau. Đây là đóng góp thực tiễn và sư phạm của bài toán trong phạm vi đồ án.

## Tài liệu tham khảo

Boysen, N., Fedtke, S., & Schwerdfeger, S. (2021). Last-mile delivery concepts: A survey from an operational research perspective. *OR Spectrum, 43*, 1–58. https://doi.org/10.1007/s00291-020-00607-8

Coppola Suriani, A., Wai-Poi, M., Dray, S. S. J., Sosa, M. E., Nguyen, T.-H. T., & Nguyen, H. T. T. (2025). *Viet Nam rising: Pathways to a high-income future*. World Bank. https://documents.worldbank.org/en/publication/documents-reports/documentdetail/099072225231030509

Jazemi, R., Alidadiani, E., Ahn, K., & Jang, J. (2023). A review of literature on vehicle routing problems of last-mile delivery in urban areas. *Applied Sciences, 13*(24), 13015. https://doi.org/10.3390/app132413015

TomTom. (n.d.). *Ho Chi Minh traffic report*. TomTom Traffic Index. Retrieved August 16, 2026, from https://www.tomtom.com/traffic-index/city/ho-chi-minh/
