# j. Limitations and Future Work (Hạn chế và hướng phát triển)

Phần này phân biệt ba lớp nội dung: khó khăn phát sinh trong quá trình phát
triển, các giới hạn ảnh hưởng đến phạm vi diễn giải kết quả hiện tại và những
hướng mở rộng có thể kiểm chứng trong tương lai. Sự phân biệt này giúp tránh
đồng nhất một quyết định thiết kế có chủ đích với lỗi hệ thống, đồng thời giữ
các đề xuất phát triển gắn với đúng giới hạn mà chúng cần khắc phục.

## j.1. Khó khăn và thách thức trong quá trình phát triển

Thách thức đầu tiên là xây dựng một bộ dữ liệu vừa giữ được cấu trúc có hướng của
mạng đường đô thị, vừa đủ ổn định để tái lập thí nghiệm. Dữ liệu bản đồ, mẫu giao
thông, địa điểm giao hàng và thông tin rủi ro có nguồn gốc và độ phân giải khác
nhau; vì vậy, nhóm phải chuẩn hóa chúng về cùng hệ tọa độ, cấu trúc cạnh và bốn
khung giờ trước khi tính chi phí.

Thách thức thứ hai là cân bằng giữa quy mô đánh giá và khả năng trực quan hóa.
Đồ thị \(G_{\text{real}}\) giữ mạng đường chi tiết để đánh giá ở quy mô lớn,
trong khi \(G_{\text{demo}}\) co các hành lang nhiều cạnh thành 51 địa điểm có
tên để quan sát quá trình tìm kiếm. Việc co hành lang phải bảo toàn hướng đi và
tổng hợp nhất quán chiều dài, thời gian, loại đường, ùn tắc và cờ rủi ro; nếu
không, hai tầng đồ thị sẽ biểu diễn hai bài toán khác nhau.

Thách thức thứ ba là đưa chín thuật toán tìm đường về cùng một mô hình đầu vào
và cùng nhóm chỉ số so sánh, mặc dù cơ chế mở rộng nút, cấu trúc tập biên
(*frontier*), điều kiện dừng và bảo đảm lý thuyết của chúng khác nhau. Với bài
toán nhiều địa điểm, đường một chiều làm ma trận chi phí bất đối xứng, nên chiều đi và chiều về phải
được tính độc lập; không thể áp dụng các phép cải thiện thứ tự vốn chỉ đúng cho
chi phí đối xứng.

Cuối cùng, các lớp dữ liệu, thuật toán, dịch vụ và giao diện phải sử dụng nhất
quán cùng đồ thị, khung giờ, mục tiêu chi phí và tham số. Đây là điều kiện quan
trọng để kết quả đơn tuyến, so sánh nhiều thuật toán, hành trình nhiều điểm và
phần giải thích đều mô tả đúng một phiên thí nghiệm.

## j.2. Giới hạn của dữ liệu, hàm chi phí, thuật toán và hệ thống

Sản phẩm hiện tại là một nguyên mẫu học thuật phục vụ mô hình hóa và so sánh
thuật toán; chưa phải hệ thống điều hướng hoặc điều phối giao hàng thương mại.
Các hạn chế dưới đây xác định phạm vi mà kết quả có thể được diễn giải.

### j.2.1. Dữ liệu giao thông và xuất xứ dữ liệu

| Hạn chế | Ảnh hưởng |
|---|---|
| Phạm vi chỉ bao phủ một vùng trung tâm Thành phố Hồ Chí Minh và chỉ giữ thành phần liên thông mạnh có hướng lớn nhất | Kết quả không đại diện cho toàn thành phố hoặc các vùng mạng đã bị loại khi lọc liên thông |
| Chỉ có bốn đợt thu thập giao thông, mỗi đợt 40 điểm, trên hai ngày thứ Hai cách nhau bảy ngày | Không phản ánh đầy đủ biến thiên theo ngày, tuần, mùa, mưa hoặc sự kiện; bốn khung giờ chỉ là các quan sát đại diện |
| Mỗi khung giờ có 4.064/4.699 cạnh \(G_{\text{real}}\) dùng dữ liệu dự phòng mô phỏng | Chi phí thời gian và cân bằng phụ thuộc đáng kể vào quy tắc mô phỏng trên phần mạng không được mẫu TomTom phủ |
| Phép gán mẫu giao thông chủ yếu dựa vào khoảng cách từ điểm truy vấn đến nút đầu của cạnh đường chính | Một mẫu có thể được gán cho cạnh gần về tọa độ nhưng khác hướng hoặc khác đoạn đường thực |
| Bản trích xuất TomTom chỉ giữ một số trường đã chọn | Thiếu hình học đoạn đường, mã đoạn, độ tin cậy và siêu dữ liệu đầy đủ để kiểm chứng độc lập từng phép gán |
| Năm vùng ngập và ba vùng thi công là vùng tròn do nhóm mô hình hóa từ nguồn bối cảnh lịch sử | Cờ rủi ro không xác nhận sự cố hiện hành, tâm/bán kính thực tế, mức độ nghiêm trọng hay thời hạn hiệu lực |

### j.2.2. Mô hình đồ thị và địa điểm

| Hạn chế | Ảnh hưởng |
|---|---|
| Cạnh song song cùng chiều bị gộp và mô hình không giữ hạn chế rẽ | Có thể mất lựa chọn nhánh/làn và cho phép một chuỗi cạnh không phù hợp với luật rẽ ngoài thực địa |
| Đồ thị định tuyến không lưu hình học đường chi tiết | Đường nối hiển thị giữa hai đầu mút không tái hiện đầy đủ độ cong của tuyến thực |
| Các địa điểm quan tâm (POI) được nhập thủ công và gắn vào nút mạng đường | Nút đại diện có thể không trùng cổng giao nhận; năm POI hiện cách tọa độ đầu vào hơn 100 m |
| Cờ đường hẹp được suy ra từ loại đường thay vì chiều rộng đo được | Mô hình có thể phân loại chưa đúng điều kiện lưu thông của xe máy; mạng nền cho xe cơ giới cũng có thể bỏ sót hẻm nhỏ |
| \(G_{\text{demo}}\) biểu diễn cả hành lang bằng một cạnh và các cờ rủi ro nhị phân | Một tên hoặc loại đường không mô tả mọi đoạn thành phần; mức độ và số lần gặp cùng một loại rủi ro có thể bị giản lược |

### j.2.3. Hàm chi phí và mô hình thời gian

| Hạn chế | Ảnh hưởng |
|---|---|
| Tốc độ theo loại đường, \(\gamma=1{,}5\) và các mức phạt 60/90/30/25 giây là tham số do nhóm thiết kế | Chi phí có thể dùng để so sánh trong mô hình nhưng chưa phải thời gian đến dự kiến (ETA) đã được hiệu chuẩn bằng hành trình thực tế |
| Mức ùn tắc được rời rạc hóa thành năm cấp | Một phần thông tin liên tục của tỷ lệ tốc độ bị mất và các quan sát gần ngưỡng có thể rơi vào hai cấp khác nhau |
| Chi phí được giữ cố định trong một truy vấn và cộng theo cạnh | Chưa mô hình hóa thay đổi giao thông theo thời điểm xe đến từng cạnh, hàng chờ lan truyền, độ trễ khi rẽ hoặc tương tác giữa các đoạn đường |
| Rủi ro là cờ nhị phân với độ trễ cố định | Chưa biểu diễn xác suất, mức độ nghiêm trọng, hướng ảnh hưởng hoặc quan hệ giữa rủi ro và điều kiện thời tiết |

### j.2.4. Thuật toán và phạm vi tối ưu hóa

#### j.2.4.1. Tìm đường giữa hai địa điểm

| Hạn chế | Ảnh hưởng |
|---|---|
| BFS, DFS, Greedy và Beam Search không bảo đảm chi phí tối ưu trên đồ thị có trọng số | Một tuyến được tìm thấy không mặc nhiên là tuyến có chi phí nhỏ nhất; kết quả phải được diễn giải cùng loại bảo đảm của thuật toán thay vì chỉ dựa vào trạng thái tìm thấy |
| IDDFS dừng ở độ sâu tối đa 100; IDA* dùng bước ngưỡng mặc định 5 đơn vị chi phí và giới hạn 1.000 vòng; Beam Search chỉ giữ 50 ứng viên mỗi lớp trên đồ thị thực nghiệm | IDDFS và IDA* có thể kết thúc ở trạng thái chưa đủ cơ sở kết luận khi chạm giới hạn, còn Beam Search có thể loại nhánh duy nhất dẫn đến đích; các tham số này tạo sự đánh đổi giữa tài nguyên, độ trễ, tính đầy đủ và chất lượng nghiệm |
| Heuristic Haversine của A*, Greedy và IDA* chỉ sử dụng cận dưới địa lý; đối với mục tiêu thời gian và cân bằng, cận này không đưa ùn tắc hoặc mức phạt rủi ro vào giá trị ước lượng | Cách thiết kế bảo toàn tính chấp nhận được và nhất quán cho A*/IDA* dưới các bất biến hiện tại, nhưng heuristic có thể còn lỏng và không làm giảm mạnh không gian tìm kiếm trên mọi truy vấn |
| Bảo đảm của A* và IDA* phụ thuộc vào chiều dài cạnh không nhỏ hơn khoảng cách Haversine, vận tốc không vượt \(v_{\max}\), hệ số ùn tắc không nhỏ hơn 1 và mọi mức phạt không âm | Nếu quy trình dữ liệu, phép làm tròn hoặc hàm chi phí vi phạm một bất biến, chứng minh heuristic không còn tự động áp dụng và chất lượng kết quả phải được kiểm chứng lại |
| Đánh giá chính sử dụng 200 cặp xuất phát–đích, hai hồ sơ 07:30 và 22:00, cùng chế độ `balanced`; thời gian được đo theo một thứ tự chạy cố định trên một môi trường | Các kết luận thực nghiệm—bao gồm lợi thế trung vị của A*, tỷ lệ đổi tuyến 74,5% và thứ hạng thời gian—không tự động khái quát sang mọi chế độ chi phí, bốn khung giờ, phần cứng hoặc mạng đường khác |
| Đồ thị đánh giá được giới hạn ở một thành phần liên thông mạnh có hướng | Mọi cặp mẫu đều có đường về mặt cấu trúc; thí nghiệm đánh giá chưa đại diện đầy đủ cho trường hợp không có đường do mạng bị chia cắt, trong khi bốn thất bại của Beam Search xuất phát từ cắt tỉa chứ không phải mất liên thông |
| Kích thước biên được ghi theo số trạng thái, không phải dung lượng bộ nhớ thực tế | Không thể suy trực tiếp số byte RAM hoặc chi phí quản lý của hàng đợi, heap, tập đã thăm và ánh xạ cha chỉ từ chỉ số biên lớn nhất |

Các giới hạn trên giải thích vì sao không có một thuật toán hai điểm thắng trên
mọi tiêu chí. UCS, A* và Dijkstra hai chiều cung cấp mốc tối ưu chính xác dưới
các điều kiện đã nêu; tuy nhiên, lợi thế thực thi còn phụ thuộc đặc điểm truy
vấn. IDA* và IDDFS giảm kích thước biên nhưng phải tái mở rộng nhiều trạng thái,
trong khi Greedy và Beam Search đạt tốc độ hoặc giới hạn biên bằng cách chấp
nhận rủi ro về chất lượng hay khả năng tìm thấy đường.

#### j.2.4.2. Tối ưu nhiều địa điểm và phạm vi vận hành

| Hạn chế | Ảnh hưởng |
|---|---|
| Held–Karp có thời gian $O(n^2 2^n)$ và bộ nhớ $O(n2^n)$; phiên bản hiện hành giới hạn 15 điểm, trong khi hai heuristic hỗ trợ tối đa 16 điểm | Chuẩn tối ưu chính xác chỉ áp dụng cho tập điểm nhỏ; hệ thống chưa cung cấp bộ giải hoặc cơ chế thực thi được kiểm chứng cho trường hợp lớn hơn 16 điểm |
| NN + 2-opt/Or-opt chỉ đạt cực tiểu cục bộ theo hai lân cận đã cài đặt; Simulated Annealing dùng lịch làm nguội hữu hạn | Cả hai phương pháp đều không có tỷ lệ xấp xỉ hoặc chứng chỉ tối ưu; nghiệm tốt trên một trường hợp không tạo ra cận chất lượng tổng quát |
| Simulated Annealing dùng cố định năm hạt giống và 2.000 vòng lặp cho mỗi hạt giống | Chất lượng phụ thuộc ngân sách, nhiệt độ, tốc độ làm nguội, cấu trúc lân cận và hạt giống; chưa có phân tích độ nhạy để xác định cấu hình phù hợp theo quy mô |
| Thí nghiệm chính chỉ khảo sát một tập gồm một điểm xuất phát và chín điểm giao, tại 07:30, với chế độ cân bằng (`balanced`) và hành trình hở | Mức tiết kiệm 42,2%, độ lệch 1,58% của NN và việc nghiệm SA tốt nhất trùng Held–Karp chỉ mô tả kịch bản này; chưa khái quát cho kích thước, khung giờ, chế độ chi phí hoặc hành trình khép kín khác |
| Thời gian Thí nghiệm 7 chỉ đo một lần cho riêng bộ giải sau khi ma trận đã được dựng | Chưa đánh giá đầy đủ độ trễ đầu–cuối, chi phí của các lượt UCS dựng ma trận, ảnh hưởng khởi động, phân vị thời gian hoặc bộ nhớ đỉnh |
| Ma trận chi phí yêu cầu đường đi cho mọi cặp có thứ tự trong tập điểm | Một cặp không tới được làm ma trận không đầy đủ và toàn truy vấn thất bại; thiết kế hiện chưa tìm kiếm riêng một thứ tự khả thi trên ma trận chỉ liên thông một phần |
| Mỗi hành trình dùng một hồ sơ chi phí cố định cho toàn bộ các chặng | Chưa phản ánh việc thời điểm khởi hành của từng chặng thay đổi trong chuyến đi hoặc hỗ trợ tái tối ưu thứ tự khi giao thông cập nhật |
| Bài toán hiện chỉ xét một nhân viên giao hàng, một hành trình và điểm xuất phát cố định | Chưa mô hình hóa nhiều phương tiện, tải trọng, nhiều kho, thời gian phục vụ, cửa sổ giao hàng hoặc quan hệ lấy–giao hàng |

Trong phạm vi đã đánh giá, Held–Karp cung cấp chứng chỉ tối ưu trên ma trận hiện
hành; NN + 2-opt/Or-opt trả nghiệm cao hơn chuẩn 1,58%; nghiệm tốt nhất của SA
trùng chuẩn nhưng chi phí tốt nhất trung bình giữa năm hạt giống là
$2.584{,}6\pm66{,}0$ giây quy đổi. Sự khác biệt này cho thấy cần tách rõ
**bảo đảm của phương pháp** khỏi **chất lượng của một nghiệm quan sát**: một
heuristic có thể tìm đúng nghiệm tối ưu trong một lần thử mà vẫn không trở thành
thuật toán chính xác.

### j.2.5. Ứng dụng và đánh giá thực nghiệm

| Hạn chế | Ảnh hưởng |
|---|---|
| Ứng dụng hiện là nguyên mẫu trình diễn trên môi trường web cục bộ, chưa tích hợp GPS, chỉ dẫn từng chặng hoặc đồng bộ đơn hàng | Chưa thể sử dụng như một công cụ điều hướng và điều phối giao hàng thực tế |
| Đánh giá hiện dựa trên bộ kiểm thử, bộ kiểm tra dữ liệu và thí nghiệm của dự án | Chưa có nghiên cứu người dùng hoặc thử nghiệm giao hàng nhiều ngày để đo sai số thời gian, chất lượng tuyến và khả năng sử dụng ngoài thực địa |
| Kết quả thí nghiệm gắn với bản chụp dữ liệu và cấu hình hiện tại | Khi dữ liệu, chi phí hoặc thuật toán thay đổi, kết quả phải được tạo lại theo cùng quy trình trước khi tiếp tục dùng làm bằng chứng |

## j.3. Đề xuất mở rộng trong tương lai

### j.3.1. Dữ liệu giao thông thời gian thực và nâng chất lượng dữ liệu

Thu thập mẫu giao thông dày hơn theo không gian và thời gian, ưu tiên các đợt
cùng ngày và nhiều ngày liên tiếp; lưu thời gian hiệu lực và độ bất định của
quan sát. Một lớp tích hợp dữ liệu có thể tiếp nhận giao thông, ngập, tai nạn và
đóng đường được cập nhật định kỳ hoặc theo thời gian thực. Mỗi bản cập nhật cần
đi kèm thời điểm hiệu lực, nguồn, độ tin cậy và quy tắc làm mất hiệu lực dữ liệu
cũ trước khi được đưa vào hàm chi phí.

Phép đối sánh bản đồ nên sử dụng hình học đoạn đường, mã đoạn, khoảng cách,
phương vị, chiều lưu thông, phân hạng chức năng và tên đường thay vì chỉ dùng
khoảng cách đến nút. Mỗi phép gán cũng nên lưu điểm tin cậy để hỗ trợ kiểm toán
dữ liệu.

### j.3.2. Hoàn thiện đồ thị và địa điểm giao hàng

Mô hình tương lai có thể bảo toàn cạnh song song khi cần, giữ hình học và mã
nguồn, đồng thời bổ sung hạn chế rẽ, độ trễ khi rẽ, số làn, hạn chế tiếp cận và
trạng thái đóng đường. POI nên được lấy từ nguồn mã hóa địa lý có xuất xứ rõ
ràng và gắn vào cổng giao nhận thay vì chỉ dùng một tọa độ đại diện. Dữ liệu
hẻm phù hợp với xe máy cũng cần được khảo sát riêng trước khi mở rộng phạm vi.

### j.3.3. Hiệu chuẩn chi phí và định tuyến phụ thuộc thời gian

Thời gian di chuyển đầu–cuối đo được trên nhiều hành trình có thể dùng để hiệu
chuẩn tốc độ, hệ số ùn tắc và mức phạt rủi ro; kết quả nên báo cáo sai số và
khoảng bất định thay vì xem chi phí cân bằng là ETA. Sau đó, mô hình có thể cập
nhật chi phí theo thời điểm dự kiến đến từng cạnh và hỗ trợ tái định tuyến khi
hồ sơ giao thông thay đổi.

### j.3.4. Mở rộng thuật toán và khả năng mở rộng

#### j.3.4.1. Tìm đường giữa hai địa điểm

Đối với tìm đường hai điểm, đánh giá tiếp theo nên mở rộng có kiểm soát sang cả
ba mục tiêu chi phí, bốn khung giờ và các nhóm truy vấn được phân tầng theo độ
dài, mật độ mạng và tỷ lệ đường một chiều. Thời gian nên được đo qua nhiều lượt
chạy xen kẽ hoặc ngẫu nhiên hóa thứ tự, kèm khoảng biến thiên; bộ nhớ cần được
đo trực tiếp theo byte thay vì chỉ suy từ kích thước biên. Một tập kiểm chứng
riêng trên đồ thị bị chia cắt hoặc có cạnh bị vô hiệu hóa cũng cần thiết để
phân biệt đúng ba trường hợp: thực sự không có đường, thất bại do cắt tỉa và
chưa kết luận do chạm giới hạn.

Cần thực hiện phân tích độ nhạy cho giới hạn sâu của IDDFS, bước ngưỡng và số
vòng của IDA*, cũng như độ rộng của Beam Search. Kết quả nên được trình bày dưới
dạng đường biên đánh đổi giữa chất lượng tuyến, tỷ lệ tìm thấy, số đỉnh mở rộng,
bộ nhớ và thời gian thay vì lựa chọn một tham số từ một lần chạy. Với nhóm tìm
kiếm tối ưu, có thể nghiên cứu các cận dưới địa lý chặt hơn, tìm kiếm A* hai
chiều hoặc kỹ thuật tiền xử lý mạng đường. Tuy nhiên, mọi heuristic hoặc dữ liệu
tiền xử lý mới phải được kiểm chứng lại về tính chấp nhận được, tính nhất quán
và khả năng áp dụng khi đồ thị hay hồ sơ chi phí thay đổi; không được đánh
đổi bảo đảm đúng đắn chỉ để giảm thời gian thực thi.

#### j.3.4.2. Tối ưu thứ tự ghé nhiều địa điểm

Ưu tiên đầu tiên là mở rộng thiết kế thực nghiệm theo nhiều tập điểm và các kích
thước 5, 8, 10, 12, 15 và 16; chạy đủ ba chế độ chi phí, bốn khung giờ và cả
hành trình hở lẫn khép kín. Phép đo cần lặp lại, báo trung vị và phân vị 95,
đồng thời tách thời gian dựng ma trận, thời gian bộ giải, độ trễ đầu–cuối và bộ
nhớ đỉnh. Khi Held–Karp còn chạy được, chất lượng heuristic phải được báo bằng
độ lệch so với chuẩn; với SA cần công bố cả phân bố giữa các hạt giống thay vì
chỉ chọn nghiệm tốt nhất.

Đối với tập địa điểm lớn hơn, Held–Karp nên tiếp tục được giữ làm chuẩn chính
xác ở bài nhỏ. Nhánh–cận hoặc quy hoạch tuyến tính nguyên hỗn hợp có thể cung
cấp cận dưới hay chứng chỉ trong một ngân sách thời gian; các heuristic và
metaheuristic mới cần tính lại chi phí đúng chiều và được đánh giá bằng đường
cong chất lượng theo thời gian. Mọi kết quả không có chứng chỉ phải được ghi là
nghiệm tốt nhất đã biết hoặc nghiệm gần đúng, không được suy thành tối ưu.

Ma trận và các đường đi có thể được lưu đệm theo dấu vân tay của đồ thị, hồ sơ
giao thông, kịch bản, chế độ chi phí, khung giờ và tập điểm; thay đổi bất kỳ
thành phần nào phải làm mất hiệu lực dữ liệu cũ. Ở bước tiếp theo, ATSP phụ thuộc
thời gian cần cập nhật chi phí theo thời điểm dự kiến rời từng điểm thay vì dùng
một hồ sơ cố định cho toàn chuyến. Một hướng bổ sung là tối ưu bền vững trên nhiều
kịch bản ùn tắc và rủi ro, báo đồng thời chi phí kỳ vọng, trường hợp xấu nhất,
độ hối tiếc và độ ổn định của thứ tự ghé.

### j.3.5. Mở rộng sang bài toán định tuyến nhiều phương tiện

Bước mở rộng tự nhiên là Vehicle Routing Problem và Vehicle Routing Problem
with Time Windows, bổ sung nhiều nhân viên giao hàng hoặc phương tiện, sức chứa,
nhiều kho, thời gian phục vụ và khung giờ giao hàng. Đây là nhóm bài toán phù hợp với bối cảnh giao hàng chặng
cuối nhưng phức tạp hơn đáng kể so với việc tối ưu thứ tự ghé của một phương
tiện hiện tại (Jazemi et al., 2023).

Khi mở rộng, hàm mục tiêu chi phí cần được tách rõ khỏi các ràng buộc khả thi.
Bộ kiểm chứng tối thiểu phải xác nhận mỗi đơn được phục vụ đúng một lần, không
vượt tải trọng hoặc cửa sổ thời gian và xử lý đúng quy tắc xuất phát–quay về.
Các trường hợp nhỏ nên được đối chiếu với nghiệm chính xác trước khi đánh giá
heuristic trên quy mô lớn.

### j.3.6. Tích hợp API bản đồ, triển khai và kiểm chứng ngoài thực địa

Một lớp tích hợp API bản đồ có thể cung cấp mã hóa địa lý, hình học đường, đối
sánh vị trí, sự kiện giao thông và chỉ dẫn từng chặng. Dữ liệu từ nhà cung cấp
không nên thay thế trực tiếp mô hình hiện tại như một kết quả hộp đen; chúng cần
được chuẩn hóa về đồ thị có hướng, gắn nguồn và phiên bản, rồi kiểm tra lại tính
liên thông, đơn vị và hàm chi phí trước khi định tuyến. Thiết kế triển khai cũng
cần xử lý hạn mức truy cập, điều khoản sử dụng dữ liệu, chính sách lưu đệm, khả
năng hoạt động khi dịch vụ ngoài gián đoạn và bảo vệ khóa truy cập ở phía máy
chủ.

Một phiên bản triển khai có thể tích hợp GPS, chỉ dẫn từng chặng và quản lý đơn
hàng, sau đó được thử nghiệm theo nhiều khung giờ với người giao hàng. Đánh giá
nên đo đồng thời chất lượng tuyến, sai số thời gian, độ ổn định khi dữ liệu thay
đổi, khả năng sử dụng, khả năng tiếp cận và hiệu năng trên thiết bị mục tiêu. Chỉ
sau bước kiểm chứng này mới có cơ sở đánh giá mức độ phù hợp của mô hình cho ứng
dụng thực tế.

## j.4. Thứ tự ưu tiên đề xuất

| Giai đoạn | Công việc ưu tiên | Kết quả mong đợi |
|---|---|---|
| Ngắn hạn | Mở rộng ca kiểm thử dữ liệu và tình huống không có đường; phân tích độ nhạy tham số của IDDFS, IDA* và Beam Search; mở rộng thí nghiệm ATSP theo kích thước, chế độ, khung giờ và dạng hành trình; lưu độ tin cậy của phép gán | Phân biệt đúng trạng thái thất bại, lượng hóa đánh đổi thuật toán và tạo phân bố chất lượng đa điểm thay vì dựa vào một trường hợp |
| Trung hạn | Đo bộ nhớ và độ trễ đầu–cuối; đánh giá bộ giải ATSP có cận/chứng chỉ; lưu đệm ma trận có kiểm soát; tích hợp API bản đồ ở mức thử nghiệm; tăng độ phủ giao thông, cải thiện đối sánh bản đồ và hiệu chuẩn chi phí | Mở rộng quy mô trong khi giữ khả năng kiểm chứng, đồng thời làm tuyến và chi phí mô hình gần điều kiện thực hơn |
| Dài hạn | Định tuyến và ATSP phụ thuộc thời gian; tối ưu bền vững; VRP/VRPTW; tích hợp GPS, đơn hàng và thử nghiệm thực địa | Chuyển từ nguyên mẫu tối ưu một hành trình sang hệ thống hỗ trợ điều phối nhiều phương tiện có bằng chứng sử dụng |

Các hướng phát triển trên ưu tiên nâng chất lượng dữ liệu và kiểm chứng mô hình
trước khi mở rộng số lượng thuật toán. Cách tiếp cận này duy trì khả năng giải
thích và tái lập, đồng thời xử lý trực tiếp các giới hạn hiện tại.

## Tài liệu tham khảo

Jazemi, R., Alidadiani, E., Ahn, K., & Jang, J. (2023). A review of literature on vehicle routing problems of last-mile delivery in urban areas. *Applied Sciences, 13*(24), 13015. https://doi.org/10.3390/app132413015
