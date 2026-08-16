# g. So sánh các thuật toán tìm đường hai điểm

Phần này so sánh chín thuật toán tìm đường hai điểm theo hai lớp bằng chứng.
Lớp thứ nhất là phân tích lý thuyết về độ phức tạp, nhu cầu bộ nhớ, tính đầy đủ
(*completeness*) và tính tối ưu (*optimality*). Lớp thứ hai là thực nghiệm ghép
cặp trên cùng bộ dữ liệu giao thông, cùng tập truy vấn và cùng cấu hình chi phí.
Cách tiếp cận này tránh hai suy luận không hợp lệ: một cận độ phức tạp tốt không
tự động bảo đảm hiệu năng tốt trên dữ liệu cụ thể, và một kết quả thực nghiệm
tốt không thay thế chứng minh lý thuyết.

Các câu hỏi đánh giá chính gồm:

1. Thuật toán nào có bảo đảm tìm thấy và bảo đảm chất lượng lời giải?
2. Chất lượng tuyến thực tế chênh bao nhiêu so với nghiệm tối ưu?
3. Mỗi thuật toán phải mở rộng bao nhiêu đỉnh, giữ biên lớn đến đâu và cần bao
   nhiêu thời gian xử lý?
4. Khi hồ sơ ùn tắc thay đổi, tuyến tối ưu có thực sự thay đổi hay chỉ thay đổi
   giá trị chi phí?

## g.1. Ma trận so sánh lý thuyết

### g.1.1. Quy ước phân tích

Gọi \(|V|\) và \(|E|\) lần lượt là số đỉnh và số cạnh; \(b\) là hệ số phân
nhánh; \(d\) là độ sâu của nghiệm nông nhất; \(m\) là độ sâu tìm kiếm lớn nhất;
\(L\) là giới hạn độ sâu của IDDFS; \(k\) là độ rộng Beam; và \(Q\) là số trạng
thái chờ lớn nhất trong ngăn xếp tường minh. Với IDA*, \(R\) là số vòng ngưỡng
và không vượt quá 1.000 trong cấu hình hiện tại.

Không tồn tại một “độ phức tạp trung bình” duy nhất cho mọi đồ thị và mọi phân
phối truy vấn. Vì vậy, cột trung bình/điển hình trong Bảng g.1 chỉ đưa ra cận
tham khảo khi có giả định rõ ràng. Đối với các thuật toán phụ thuộc mạnh vào
heuristic hoặc phân bố trọng số, bảng ghi “phụ thuộc dữ liệu” thay vì áp đặt một
cận trung bình không có cơ sở xác suất. Trường hợp tốt nhất chung
\(\Theta(1)\) xảy ra khi điểm xuất phát trùng điểm đích và được phát hiện trước
khi bắt đầu mở rộng đồ thị.

### g.1.2. Bảng so sánh tổng hợp

**Bảng g.1. So sánh thời gian, bộ nhớ, tính đầy đủ và tính tối ưu**

| Thuật toán | Quy tắc quyết định | Tốt nhất | Trung bình/điển hình có điều kiện | Tệ nhất | Bộ nhớ của cách hiện thực | Đầy đủ | Tối ưu |
|---|---|---:|---|---|---|---|---|
| BFS | FIFO, theo lớp độ sâu | \(\Theta(1)\) | \(O(b^d)\) trên cây phân nhánh đều | \(O(\lvert V\rvert+\lvert E\rvert)\) | \(O(\lvert V\rvert)\) | Có trên đồ thị hữu hạn | Chỉ tối ưu số cạnh; không tối ưu chi phí có trọng số |
| DFS | LIFO, đi sâu trước | \(\Theta(1)\) | Phụ thuộc mạnh vào thứ tự kề; có thể tiến gần \(O(b^m)\) | \(O(\lvert V\rvert+\lvert E\rvert)\) | \(O(\lvert V\rvert+\lvert E\rvert)\) trong trường hợp xấu do ngăn xếp có ứng viên trùng | Có trên đồ thị hữu hạn khi có tập đã thăm | Không |
| IDDFS | DFS với giới hạn sâu tăng dần | \(\Theta(1)\) | \(O(b^d)\); mở rộng lặp các tầng gần gốc | \(O(b^L)\) nếu phải đi đến giới hạn \(L\) | \(O(\lvert V\rvert+Q)\) | Có nếu độ sâu nghiệm không vượt \(L=100\); chạm giới hạn có thể chưa kết luận | Tối ưu số cạnh trong giới hạn; không tối ưu chi phí có trọng số |
| UCS | Hàng đợi ưu tiên theo \(g\) | \(\Theta(1)\) | Phụ thuộc phân bố trọng số | \(O((\lvert V\rvert+\lvert E\rvert)\log\lvert V\rvert)\) | \(O(\lvert V\rvert+\lvert E\rvert)\) do có thể tồn tại bản ghi cũ trong hàng đợi ưu tiên | Có với chi phí bước dương | Có với trọng số không âm |
| Greedy Best-First | Min-heap theo \(h\) | \(\Theta(1)\) | Phụ thuộc chất lượng heuristic | \(O((\lvert V\rvert+\lvert E\rvert)\log\lvert V\rvert)\) | \(O(\lvert V\rvert)\) | Có trên đồ thị hữu hạn với tập đã thăm | Không; bỏ qua \(g\) |
| A* | Hàng đợi ưu tiên theo \(f=g+h\), phá hòa bằng \(h\) | \(\Theta(1)\) | Phụ thuộc độ chặt của heuristic; thường xét ít đỉnh hơn UCS khi \(h\) hữu ích | \(O((\lvert V\rvert+\lvert E\rvert)\log\lvert V\rvert)\) | \(O(\lvert V\rvert+\lvert E\rvert)\) do có thể tồn tại bản ghi cũ trong hàng đợi ưu tiên | Có với đồ thị hữu hạn và trọng số dương | Có khi \(h\) chấp nhận được và nhất quán |
| Bidirectional Dijkstra | Min-\(g\) từ hai phía, dừng theo \(\mu\) | \(\Theta(1)\) | Khoảng \(O(b^{d/2})\) chỉ trong mô hình cây cân bằng thuận lợi | \(O((\lvert V\rvert+\lvert E\rvert)\log\lvert V\rvert)\) | \(O(\lvert V\rvert+\lvert E\rvert)\) cho hai phía | Có với trọng số dương và danh sách kề đảo đúng | Có với trọng số không âm và luật dừng đúng |
| IDA* | DFS dưới ngưỡng \(f\), tăng ngưỡng theo \(\varepsilon\) | \(\Theta(1)\) | Thường mô tả bởi \(O(b^d)\), nhưng có thể tái mở rộng rất nhiều | \(O(Rb^m)\) theo mô hình cây, với \(R\le1.000\) | \(O(\lvert V\rvert+Q)\) cho các ánh xạ và ngăn xếp tường minh | Có nếu đủ số vòng; chạm giới hạn có thể chưa kết luận | Trong \(C^*+\varepsilon\) khi tìm thấy trước giới hạn; không tối ưu chính xác |
| Beam Search | Mỗi lớp chỉ giữ \(k\) ứng viên tốt nhất theo \(f\) | \(\Theta(1)\) | \(O(dkb\log(kb))\) | Cùng dạng theo số lớp đã duyệt, nhưng có thể kết thúc không tìm thấy | \(O(\lvert V\rvert+kb)\) | Không; cắt tỉa có thể loại mọi nhánh đến đích | Không |

Các cận trên theo phân tích tìm kiếm và thuật toán đồ thị chuẩn (Cormen et al.,
2022; Russell & Norvig, 2021), nhưng đã được điều chỉnh để phản ánh cấu trúc dữ
liệu thực tế của hệ thống. Chúng không bao gồm chi phí lưu, sắp xếp và
tuần tự hóa toàn bộ diễn tiến trực quan. “Biên lớn nhất” trong thực nghiệm là
một chỉ báo về cấu trúc tìm kiếm, không phải số byte RAM đo trực tiếp. Các kết
quả về UCS và Dijkstra dựa trên trọng số không âm (Dijkstra, 1959); bảo đảm của
A* dựa trên heuristic chấp nhận được và nhất quán (Hart et al., 1968; Dechter &
Pearl, 1985); còn IDA* trong hệ thống sử dụng biến thể ngưỡng có
\(\varepsilon\), vì vậy không được đồng nhất với IDA* tối ưu chính xác trong cấu hình lý
thuyết cổ điển (Korf, 1985).

### g.1.3. Nhận xét lý thuyết

Không có một thuật toán thống trị tất cả tiêu chí:

- **UCS, A* và Bidirectional Dijkstra** là nhóm có bảo đảm tối ưu chính xác.
  UCS đơn giản và phù hợp làm mốc chuẩn; A* có thể giảm vùng tìm nhờ heuristic;
  Bidirectional Dijkstra có thể giảm độ sâu tìm kiếm hiệu dụng nhưng phải quản
  lý hai phía và đồ thị đảo.
- **IDA*** cung cấp biên chất lượng cộng \(C^*+\varepsilon\) và giữ biên nhỏ,
  nhưng phải trả giá bằng tái mở rộng và giới hạn số vòng.
- **BFS và IDDFS** phù hợp khi mục tiêu là số cạnh, không phải chi phí giao
  thông. DFS ưu tiên độ sâu nên không tạo bảo đảm về chất lượng tuyến.
- **Greedy** ưu tiên tốc độ định hướng nhưng có thể chọn tuyến đắt vì bỏ qua chi
  phí đã đi. **Beam Search** kiểm soát kích thước biên bằng cách chấp nhận mất
  cả tính đầy đủ lẫn tối ưu.

Vì vậy, “tốt nhất” chỉ có nghĩa khi gắn với mục tiêu. Nếu yêu cầu bắt buộc là
chi phí tối ưu, chỉ ba thuật toán tối ưu chính xác đáp ứng. Nếu ưu tiên tuyệt đối thời gian
xử lý và chấp nhận tuyến xấp xỉ, Greedy có thể phù hợp hơn. Nếu tài nguyên biên
là ràng buộc chính, IDA* hoặc Beam tạo đánh đổi khác, nhưng cần công bố rõ giới
hạn chất lượng và khả năng thất bại.

## g.2. Thiết kế thực nghiệm trên bộ dữ liệu giao thông

### g.2.1. Bộ dữ liệu và cách lấy mẫu

Thực nghiệm sử dụng đồ thị đường bộ thực nghiệm gồm **2.118 đỉnh**, **4.699 cạnh
có hướng** và **1.433 cạnh một chiều**. Đồ thị đại diện cho mạng đường tại khu
vực nghiên cứu và duy trì đầy đủ chiều di chuyển, chiều dài, vận tốc thông
thoáng, thuộc tính đường và hồ sơ ùn tắc theo khung giờ.

Hai trăm cặp xuất phát–đích có thứ tự được lấy mẫu bằng hạt giống cố định 42.
Mỗi cặp có khoảng cách Haversine tối thiểu 1.000 m nhằm tránh để các truy vấn quá
ngắn chi phối kết quả. Cùng một tập 200 cặp được sử dụng cho cả chín thuật toán.
Mỗi cặp được chạy ở hai hồ sơ đại diện, 07:30 và 22:00, với chế độ chi phí
`balanced`. Tổng kích thước thí nghiệm là

\[
9\ \text{thuật toán}\times200\ \text{cặp}\times2\ \text{khung giờ}
=3.600\ \text{lượt}.
\]

### g.2.2. Điều kiện bảo đảm so sánh công bằng

**Bảng g.2. Các yếu tố được kiểm soát trong thực nghiệm**

| Yếu tố | Cấu hình chung | Ý nghĩa đối với tính công bằng |
|---|---|---|
| Đồ thị | Cùng một bản chụp đồ thị có hướng | Mọi thuật toán nhận cùng cấu trúc liên kết và thuộc tính cạnh |
| Cặp OD | Cùng 200 cặp có thứ tự | Cho phép so sánh ghép cặp trên đúng cùng truy vấn |
| Khung giờ | 07:30 và 22:00 | Mỗi thuật toán nhận đúng cùng hai bộ trọng số |
| Mục tiêu | `balanced` | Chi phí đều tính bằng giây, gồm thời gian ùn tắc và phạt rủi ro |
| Tham số ngẫu nhiên | Seed 42 | Tập cặp có thể tái lập; các thuật toán hai điểm trong thí nghiệm là xác định |
| Diễn tiến trực quan | Tắt khi đo hiệu năng | Tránh chi phí ghi diễn tiến làm sai lệch thời gian tìm kiếm |
| Thứ tự kề và phá hòa | Cố định | Đường đi và số đỉnh mở rộng tái lập trên cùng đầu vào |
| Mốc chất lượng | UCS trên từng cặp và khung giờ | Mọi độ chênh được đo so với cùng chi phí tối ưu \(C^*\) |

Sự công bằng ở đây có nghĩa các thuật toán giải đúng cùng một tập bài toán,
không có cơ chế thay thế âm thầm và không thay kết quả thất bại bằng kết quả từ
thuật toán khác. Tuy nhiên, “cùng đầu vào” không có nghĩa các thuật toán thực hiện
cùng loại công việc: BFS, DFS và IDDFS chủ đích không dùng trọng số để sắp biên;
Greedy chỉ dùng \(h\); còn UCS, A*, Bidirectional Dijkstra, IDA* và Beam sử
dụng trọng số theo các quy tắc riêng. Những khác biệt này chính là đối tượng
cần đánh giá.

### g.2.3. Mốc chuẩn và chỉ số đo

UCS được dùng để lấy chi phí tối ưu \(C^*\) cho từng truy vấn. Với một tuyến
tìm thấy \(P\), độ chênh chi phí tương đối được tính bằng

\[
\Delta(P)
=100\times\frac{C(P)-C^*}{C^*}\%.
\]

Độ đúng của UCS và A* còn được đối chiếu độc lập với một thư viện đồ thị chuẩn
trên 800 trường hợp, tương ứng
\(2\) thuật toán × \(200\) cặp × \(2\) khung giờ. Kết quả đạt 800/800, với sai
số tuyệt đối không vượt \(10^{-6}\). Đây là bằng chứng thực nghiệm trên tập
đánh giá; các bảo đảm tổng quát vẫn đến từ điều kiện lý thuyết.

| Chỉ số | Câu hỏi được trả lời | Giới hạn diễn giải |
|---|---|---|
| Tỷ lệ tìm thấy | Thuật toán trả đường hợp lệ trong bao nhiêu truy vấn? | Không phản ánh đường tốt hay xấu |
| Độ chênh chi phí | Tuyến cao hơn mốc tối ưu bao nhiêu phần trăm? | Chỉ tính trên các lượt tìm thấy |
| Số đỉnh mở rộng | Thuật toán thực sự xét bao nhiêu trạng thái? | Không đồng nhất với số lệnh CPU |
| Biên lớn nhất | Cấu trúc biên lớn nhất là bao nhiêu? | Không phải phép đo trực tiếp dung lượng RAM |
| Thời gian chạy | Truy vấn cần bao nhiêu mili giây trên môi trường đo? | Nhạy với phần cứng, môi trường thực thi, bộ nhớ đệm và tải nền |

Phân phối số đỉnh mở rộng và thời gian lệch phải mạnh, nên báo cáo sử dụng trung
vị để mô tả trường hợp điển hình và phân vị 95 (P95) để mô tả phần đuôi khó.
Đối với độ chênh, giá trị trung bình vẫn được giữ để phản ánh tác động của các tuyến
rất xấu; đồng thời báo cáo thêm trung vị, P95 và giá trị lớn nhất.

### g.2.4. Môi trường và khả năng tái lập

Các chỉ số xác định—trạng thái tìm thấy, chi phí, độ chênh, số đỉnh mở rộng và biên
lớn nhất—được tái kiểm trên cùng đồ thị, hồ sơ, mã thuật toán, hạt giống và cặp OD;
không phát hiện khác biệt trên 3.600 hàng. Các số liệu thời gian trong phần này
đến từ lượt đo kiểm soát ngày 15/08/2026 trên cấu hình:

| Thành phần | Cấu hình đo |
|---|---|
| Bộ xử lý | AMD Ryzen 7 7735HS, 8 nhân/16 luồng |
| Bộ nhớ | 15,25 GiB RAM |
| Hệ điều hành | Microsoft Windows 11 Home Single Language, build 26100 |
| Runtime | Python 3.14.7 |
| Điều kiện | Không chạy đồng thời máy chủ giao diện hoặc dịch vụ |
| Thời lượng toàn lượt | 609,118 giây |

Thời gian chạy là thời gian thực đo theo đồng hồ hệ thống, không phải đại lượng có thể tái lập từng
byte như đường đi hoặc số đỉnh mở rộng. Thuật toán được chạy theo một thứ tự cố
định; vì vậy không thể loại trừ hoàn toàn ảnh hưởng của giai đoạn khởi động, bộ nhớ đệm hoặc tải
nền. Các kết luận về mili giây chỉ áp dụng cho môi trường trên và nên được đọc
cùng số đỉnh mở rộng, thay vì được khái quát thành tốc độ tuyệt đối trên mọi
máy.

## g.3. Hiệu năng thực tế trên bộ dữ liệu đã chọn

### g.3.1. Chất lượng tuyến và tỷ lệ tìm thấy

**Bảng g.3. Tỷ lệ tìm thấy và độ chênh chi phí trên 400 lượt mỗi thuật toán**

| Thuật toán | Tìm thấy | Tỷ lệ | Độ chênh trung bình | Độ chênh trung vị | Độ chênh P95 | Độ chênh lớn nhất |
|---|---:|---:|---:|---:|---:|---:|
| BFS | 400/400 | 100,0% | 26,163% | 21,762% | 65,804% | 116,903% |
| DFS | 400/400 | 100,0% | 1.192,689% | 980,228% | 2.899,089% | 6.169,801% |
| IDDFS | 400/400 | 100,0% | 26,163% | 21,762% | 65,804% | 116,903% |
| UCS | 400/400 | 100,0% | 0,000% | 0,000% | 0,000% | 0,000% |
| Greedy Best-First | 400/400 | 100,0% | 33,678% | 28,981% | 79,546% | 157,447% |
| A* | 400/400 | 100,0% | 0,000% | 0,000% | 0,000% | 0,000% |
| Bidirectional Dijkstra | 400/400 | 100,0% | 0,000% | 0,000% | 0,000% | 0,000% |
| IDA* | 400/400 | 100,0% | 0,174% | 0,000% | 0,797% | 2,120% |
| Beam Search | 396/400 | 99,0% | 20,118% | 16,846% | 52,846% | 104,173% |

UCS, A* và Bidirectional Dijkstra đạt độ chênh bằng 0 trong toàn bộ 400 lượt, phù
hợp với bảo đảm tối ưu của ba thuật toán. IDA* đạt chất lượng gần tối ưu: độ chênh
trung bình 0,174%, trung vị 0% và lớn nhất 2,120%. Khi chuyển về đơn vị tuyệt
đối từ các giá trị đã làm tròn trong dữ liệu, sai lệch trung bình xấp xỉ
0,849 giây, P95 khoảng
3,750 giây và lớn nhất khoảng 4,845 giây; toàn bộ quan sát nằm trong biên cộng
5 giây của cấu hình thí nghiệm.

BFS và IDDFS có cùng thống kê độ chênh vì cả hai ưu tiên nghiệm nông theo số cạnh
trên tập truy vấn này. Điều đó không chứng minh chúng luôn trả cùng tuyến khi
có nhiều nghiệm đồng độ sâu. Greedy tìm thấy đủ 400 tuyến nhưng độ chênh trung bình
33,678%, cho thấy định hướng địa lý mạnh không bù được việc bỏ qua chi phí đã
đi. DFS có chất lượng thấp nhất: độ chênh trung vị 980,228% và cực đại 6.169,801%.
Beam Search có độ chênh trung bình thấp hơn BFS và Greedy trên các lượt thành công,
nhưng bỏ lỡ 4/400 truy vấn; vì vậy không thể đánh giá Beam chỉ dựa trên chất
lượng của 396 kết quả còn lại.

![Hình g.1. Gap chi phí trung bình và tỷ lệ tìm thấy của chín thuật toán.](../../results/figs/report_exp3_quality.png)

*Hình g.1. Chất lượng lời giải và tỷ lệ tìm thấy. Màu lam biểu diễn nhóm duyệt
không thông tin, màu tím biểu diễn nhóm tối ưu chính xác, và màu cam biểu diễn
nhóm heuristic hoặc có pruning/biên sai số.*

### g.3.2. Số đỉnh mở rộng, biên và thời gian xử lý

**Bảng g.4. Khối lượng tìm kiếm và thời gian chạy**

| Thuật toán | Đỉnh mở rộng trung vị | Đỉnh mở rộng P95 | Biên trung vị | Biên P95 | Thời gian trung vị (ms) | Thời gian P95 (ms) |
|---|---:|---:|---:|---:|---:|---:|
| BFS | 1.240,0 | 2.021,95 | 80,0 | 117,00 | 1,381 | 2,384 |
| DFS | 971,0 | 1.908,65 | 193,5 | 259,00 | 37,293 | 102,089 |
| IDDFS | 67.970,0 | 388.666,05 | 29,0 | 41,00 | 552,871 | 3.466,554 |
| UCS | 1.279,0 | 2.035,15 | 69,0 | 91,05 | 4,622 | 7,937 |
| Greedy Best-First | 55,0 | 122,15 | 37,0 | 60,00 | 0,295 | 0,753 |
| A* | 649,5 | 1.587,85 | 62,5 | 101,05 | 3,862 | 9,825 |
| Bidirectional Dijkstra | 698,5 | 1.387,00 | 78,0 | 108,10 | 3,906 | 9,224 |
| IDA* | 83.931,0 | 1.108.857,05 | 29,0 | 47,00 | 124,213 | 1.607,135 |
| Beam Search | 1.025,0 | 1.836,10 | 50,0 | 50,00 | 3,717 | 6,743 |

![Hình g.2. Trung vị và P95 số đỉnh mở rộng của chín thuật toán.](../../results/figs/report_exp3_expanded.png)

*Hình g.2. Số đỉnh mở rộng; trục tung sử dụng thang logarit để thể hiện đồng
thời Greedy với vài chục đỉnh và IDDFS/IDA* với hàng chục nghìn đến hơn một
triệu lượt mở rộng.*

![Hình g.3. Trung vị và P95 thời gian chạy của chín thuật toán.](../../results/figs/report_exp3_runtime.png)

*Hình g.3. Thời gian chạy; trục tung sử dụng thang logarit. Số liệu chỉ đại diện
cho môi trường đo đã mô tả.*

### g.3.3. Phân tích quan hệ giữa chất lượng, tìm kiếm và thời gian

**Greedy nhanh nhất nhưng đánh đổi chất lượng.** Greedy chỉ mở rộng trung vị 55
đỉnh và có thời gian trung vị 0,295 ms, tốt nhất trong chín thuật toán. Tuy
nhiên, độ chênh trung bình 33,678% và P95 79,546% khiến nó không phù hợp khi chi phí
tuyến là yêu cầu vận hành quan trọng. Kết quả này minh họa rằng số đỉnh mở rộng
thấp chỉ có ý nghĩa khi được đọc cùng chất lượng lời giải.

**A* tạo cân bằng tốt nhất trên bộ dữ liệu đã chọn.** So với UCS, A* giảm trung
vị số đỉnh mở rộng từ 1.279 xuống 649,5, tương đương **49,2%**, trong khi vẫn
giữ độ chênh bằng 0. Thời gian trung vị giảm từ 4,622 xuống 3,862 ms. Tuy nhiên, P95
của A* là 9,825 ms, cao hơn UCS 7,937 ms; ở các truy vấn khó, chi phí tính
heuristic và quản lý heap có thể bù mất lợi ích từ việc mở rộng ít đỉnh hơn.
Do đó, kết luận hợp lý là A* có cân bằng thực nghiệm tốt nhất, không phải A*
luôn nhanh hơn UCS trên mọi truy vấn.

**Bidirectional Dijkstra là phương án tối ưu chính xác có tính cạnh tranh.** Thuật toán mở rộng
trung vị 698,5 đỉnh, giảm **45,4%** so với UCS, và có thời gian trung vị 3,906
ms. Hiệu quả gần A* nhưng cần duy trì hai heap, hai bảng khoảng cách và điều kiện
dừng \(\mu\). Kết quả củng cố giá trị của tìm kiếm hai phía trên đồ thị có
hướng, nhưng không chứng minh lợi thế worst-case so với UCS.

**BFS có thao tác rẻ nhưng không tối ưu chi phí.** BFS mở rộng trung vị 1.240
đỉnh—gần UCS—nhưng thời gian chỉ 1,381 ms nhờ FIFO và không tính độ ưu tiên theo
trọng số. Đổi lại, độ chênh trung bình 26,163%. Vì vậy thời gian thấp của BFS không
nên được diễn giải là hiệu quả định tuyến tốt hơn.

**DFS cho tuyến kém nhất dù số đỉnh mở rộng không lớn nhất.** DFS mở rộng trung
vị 971 đỉnh, nhưng chi phí tuyến trung vị gần 10,8 lần chi phí tối ưu và thời gian trung vị
37,293 ms. Ngăn xếp có ứng viên trùng cùng thứ tự duyệt theo chiều sâu làm chi
phí thao tác cao hơn BFS, trong khi quy tắc lựa chọn không hỗ trợ chất lượng
tuyến.

**IDDFS và IDA* giữ biên nhỏ nhưng tái mở rộng rất lớn.** Cả hai có biên trung
vị 29 đỉnh. IDDFS mở rộng trung vị 67.970 đỉnh và IDA* 83.931 đỉnh; P95 của
IDA* vượt 1,1 triệu lượt. IDA* đạt chất lượng gần tối ưu, còn IDDFS vẫn chỉ tối
ưu số cạnh. Đuôi thời gian dài cho thấy hai thuật toán không phù hợp làm lựa
chọn mặc định trên đồ thị này, dù đặc tính biên nhỏ vẫn có giá trị khi nghiên
cứu sự đánh đổi bộ nhớ.

**Beam kiểm soát biên đúng cấu hình nhưng hy sinh độ tin cậy.** Biên P95 đúng
bằng 50, phản ánh trực tiếp độ rộng Beam trên đồ thị thực nghiệm. Thời gian
trung vị 3,717 ms tương đối thấp, nhưng tỷ lệ tìm thấy 99,0% và độ chênh trung bình
20,118% cho thấy lợi ích tài nguyên phải được đánh đổi bằng cả chất lượng lẫn
khả năng thất bại.

### g.3.4. Ma trận lựa chọn theo mục tiêu

| Mục tiêu sử dụng | Lựa chọn phù hợp nhất trên tập đánh giá | Lý do | Cảnh báo |
|---|---|---|---|
| Mốc chuẩn tối ưu, dễ kiểm chứng | UCS | Tối ưu chính xác, cơ chế đơn giản, độ chênh bằng 0 | Mở rộng nhiều đỉnh hơn A* và Bidirectional Dijkstra |
| Cân bằng giữa chất lượng và hiệu năng | A* | Tối ưu chính xác; giảm 49,2% số đỉnh mở rộng trung vị so với UCS | P95 thời gian chạy không luôn tốt hơn UCS |
| Exact search từ hai phía | Bidirectional Dijkstra | Gap 0; giảm 45,4% median expanded | Hai cấu trúc tìm kiếm; lợi ích phụ thuộc cặp OD |
| Ưu tiên độ trễ cực thấp, chấp nhận tuyến xấu | Greedy | Thời gian chạy và số đỉnh mở rộng trung vị thấp nhất | Độ chênh lớn; không có bảo đảm tối ưu |
| Chất lượng gần tối ưu với biên nhỏ | IDA* | Độ chênh trung bình 0,174%; biên trung vị 29 | Tái mở rộng và đuôi thời gian rất lớn; có giới hạn vòng |
| Giới hạn biên cứng | Beam Search | P95 frontier bằng 50 | Có thể không tìm thấy dù tồn tại đường |
| Minh họa chiến lược không trọng số | BFS, DFS, IDDFS | Làm rõ FIFO, LIFO và tìm kiếm sâu dần | Không thích hợp để tối ưu chi phí giao thông có trọng số |

## g.4. Ảnh hưởng của khung giờ đến hiệu năng

**Bảng g.5. Kết quả theo hồ sơ 07:30 và 22:00**

| Thuật toán | Khung giờ | Tìm thấy | Độ chênh trung bình | Đỉnh mở rộng trung vị | Thời gian trung vị (ms) |
|---|---:|---:|---:|---:|---:|
| BFS | 07:30 | 200/200 | 24,073% | 1.240,0 | 1,322 |
| BFS | 22:00 | 200/200 | 28,253% | 1.240,0 | 1,407 |
| DFS | 07:30 | 200/200 | 1.183,227% | 971,0 | 37,181 |
| DFS | 22:00 | 200/200 | 1.202,152% | 971,0 | 37,539 |
| IDDFS | 07:30 | 200/200 | 24,073% | 67.970,0 | 542,357 |
| IDDFS | 22:00 | 200/200 | 28,253% | 67.970,0 | 560,181 |
| UCS | 07:30 | 200/200 | 0,000% | 1.278,5 | 4,550 |
| UCS | 22:00 | 200/200 | 0,000% | 1.285,5 | 4,647 |
| Greedy Best-First | 07:30 | 200/200 | 31,949% | 55,0 | 0,298 |
| Greedy Best-First | 22:00 | 200/200 | 35,407% | 55,0 | 0,290 |
| A* | 07:30 | 200/200 | 0,000% | 761,0 | 4,535 |
| A* | 22:00 | 200/200 | 0,000% | 571,0 | 3,378 |
| Bidirectional Dijkstra | 07:30 | 200/200 | 0,000% | 713,5 | 3,923 |
| Bidirectional Dijkstra | 22:00 | 200/200 | 0,000% | 688,0 | 3,887 |
| IDA* | 07:30 | 200/200 | 0,124% | 138.948,5 | 191,381 |
| IDA* | 22:00 | 200/200 | 0,223% | 43.769,0 | 66,124 |
| Beam Search | 07:30 | 197/200 | 17,769% | 1.025,5 | 3,844 |
| Beam Search | 22:00 | 199/200 | 22,444% | 1.019,0 | 3,511 |

BFS, DFS, IDDFS và Greedy có cùng số đỉnh mở rộng trung vị ở hai khung giờ vì
trật tự tìm kiếm của chúng không phụ thuộc vào trọng số giao thông: ba thuật
toán đầu chỉ dùng cấu trúc kề/độ sâu, còn Greedy chỉ dùng heuristic địa lý.
Tuyến của chúng giữ nguyên trên cùng cặp OD, nhưng độ chênh thay đổi vì trọng số của
tuyến và mốc tối ưu thay đổi theo hồ sơ.

A* thể hiện thay đổi rõ nhất trong nhóm tối ưu chính xác: số đỉnh mở rộng trung vị giảm từ
761 ở 07:30 xuống 571 ở 22:00; thời gian trung vị giảm khoảng 25,5%. IDA* cũng
giảm mạnh số lượt mở rộng ở hồ sơ 22:00. Kết quả không có nghĩa mọi truy vấn ban
đêm đều dễ hơn; nó chỉ mô tả hai hồ sơ đại diện và tập 200 cặp đã chọn. Beam
Search thất bại ba lượt ở 07:30 và một lượt ở 22:00, cho thấy thay đổi trọng số
có thể làm thay đổi cả các nhánh được giữ lại sau pruning.

## g.5. Ùn tắc làm thay đổi tuyến được chọn

### g.5.1. Kiểm tra trên toàn bộ mẫu

Để tách ảnh hưởng của giao thông khỏi khác biệt giữa thuật toán, A* được chạy
trên cùng 200 cặp OD, cùng đồ thị và cùng chế độ `balanced`; yếu tố duy nhất được
thay đổi là hồ sơ từ 07:30 sang 22:00. Kết quả có **149/200 cặp thay đổi chuỗi
đỉnh**, tương đương **74,5%**.

Đây là bằng chứng trực tiếp rằng hồ sơ ùn tắc không chỉ thay đổi tổng thời gian
mà còn có khả năng thay đổi chính tuyến được chọn. Tuy vậy, tỷ lệ 74,5% chỉ áp
dụng cho mẫu và hai hồ sơ này; nó không phải xác suất đổi tuyến tổng quát cho
mọi ngày hoặc mọi khu vực.

### g.5.2. Phân tích trường hợp OD-000

Cặp minh họa đi từ `n0457` đến `n0103`. Tuyến được chọn ở 07:30 được ký hiệu
R07, tuyến được chọn ở 22:00 được ký hiệu R22. Hai tuyến sử dụng các tiền tố
khác nhau, nhập lại tại `n0490`, sau đó dùng chung hậu tố đến đích.

**Bảng g.6. Hai tuyến được chấm chéo dưới cả hai hồ sơ giao thông**

| Tuyến | Quãng đường (m) | Chi phí 07:30 (s) | Chi phí 22:00 (s) | Trễ do ùn tắc 07:30 / 22:00 (s) | Phạt rủi ro (s) |
|---|---:|---:|---:|---:|---:|
| R07 — được chọn ở 07:30 | 2.685,2 | **565,2** | 376,1 | 249,0 / 60,0 | 75,0 |
| R22 — được chọn ở 22:00 | 2.656,1 | 596,1 | **357,7** | 283,6 / 45,2 | 100,0 |

Tại 07:30, R07 rẻ hơn R22 khoảng 30,9 giây. Đến 22:00, thứ tự đảo lại và R22
rẻ hơn R07 khoảng 18,4 giây. Điều đáng chú ý là R07 dài hơn R22 29,1 m nhưng
vẫn được chọn vào buổi sáng; do đó, quyết định không thể được giải thích bằng
khoảng cách đơn thuần.

Phần tiền tố của R22 gồm 13 cạnh. Ở hồ sơ 07:30, toàn bộ các cạnh này có mức ùn
tắc 4 hoặc 5, làm chi phí tiền tố đạt 276,6 giây. Ở hồ sơ 22:00, chúng giảm
xuống mức 1 hoặc 2 và chi phí tiền tố còn 169,4 giây. Tiền tố của R07 có chi
phí lần lượt 245,7 và 187,8 giây. Vì vậy:

\[
\begin{aligned}
07{:}30:&\quad C(R07)=565{,}2<C(R22)=596{,}1,\\
22{:}00:&\quad C(R22)=357{,}7<C(R07)=376{,}1.
\end{aligned}
\]

**Bảng g.7. Một số cạnh thay đổi mạnh trên nhánh R22**

| Cạnh có hướng | Mức ùn tắc | Chi phí cạnh 07:30 (s) | Chi phí cạnh 22:00 (s) | Mức giảm |
|---|---|---:|---:|---:|
| `n0460→n0456` | 5→1 | 61,8 | 39,7 | 22,1 s |
| `n0990→n0080` | 5→2 | 36,0 | 19,8 | 16,2 s |
| `n1436→n0511` | 5→2 | 17,7 | 9,7 | 8,0 s |
| `n0511→n0460` | 5→2 | 38,1 | 20,9 | 17,2 s |

![Hình g.4. Hai tuyến A* của cặp OD-000 dưới hồ sơ 07:30 và 22:00.](../assets/traffic_route_change_pair_000.png)

*Hình g.4. Hai tuyến khác nhau ở phần tiền tố và nhập lại tại `n0490`; phần hậu
tố đến đích được dùng chung.*

### g.5.3. Ý nghĩa đối với bài toán định tuyến

Trường hợp OD-000 cho thấy mô hình phản ứng theo ba lớp thông tin. Khoảng cách
xác định chiều dài vật lý; hồ sơ ùn tắc thay đổi thành phần thời gian theo từng
cạnh; phần phạt rủi ro tiếp tục tạo khác biệt giữa các tuyến trong chế độ cân
bằng. Một tuyến ngắn hơn không mặc nhiên tốt hơn nếu các cạnh trên tuyến chịu
ùn tắc cao hoặc mức phạt lớn.

Kết quả cũng giải thích vì sao một thuật toán tối ưu chính xác vẫn có thể trả hai tuyến
khác nhau cho cùng một cặp OD: A* không thay đổi nguyên lý tối ưu, nhưng hàm
trọng số đầu vào đã thay đổi theo hồ sơ. Ở mỗi khung giờ, A* vẫn tối ưu đúng
hàm chi phí tương ứng. Sự thay đổi tuyến vì vậy là phản ứng hợp lý của mô hình,
không phải tính thiếu ổn định của thuật toán.

Các hồ sơ 07:30 và 22:00 là các bản chụp đại diện, không phải luồng giao thông trực
tiếp hoặc một chuỗi quan sát liên tục trong cùng ngày. Do đó, kết quả chỉ chứng
minh khả năng phản ứng của hệ thống đối với hai cấu hình đã mô hình hóa; nó
không xác nhận tình trạng hiện thời trên các đoạn đường ngoài thực địa.

## g.6. Giới hạn của phép so sánh

1. Hai trăm cặp OD là một mẫu tất định trên một khu vực nghiên cứu; kết quả
   không tự động khái quát cho mọi thành phố, mật độ đồ thị hoặc độ dài tuyến.
2. Hai khung giờ là hồ sơ đại diện. Tỷ lệ đổi tuyến 74,5% không phải tỷ lệ dự
   báo cho một ngày giao thông bất kỳ.
3. Thời gian chạy phụ thuộc phần cứng, phiên bản Python, bộ nhớ đệm và tải nền.
   Thứ tự chạy cố định cũng có thể tạo ảnh hưởng nhỏ do giai đoạn khởi động hoặc
   bộ nhớ đệm.
4. Kích thước biên là đại lượng thuật toán, không phải phép đo số byte RAM; một
   hàng đợi ưu tiên, tập hợp và bảng ánh xạ có phần chiếm dụng phụ khác nhau.
5. Gap của Beam được tính trên các lượt thành công. Bốn truy vấn thất bại phải
   được đọc cùng bảng chất lượng để tránh thiên lệch do chỉ quan sát kết quả có
   đường.
6. Heuristic Haversine phụ thuộc các bất biến đã chứng minh: chiều dài cạnh
   không nhỏ hơn khoảng cách địa lý, vận tốc không vượt \(v_{\max}\), hệ số ùn
   tắc không nhỏ hơn 1 và phần phạt không âm. Nếu mô hình chi phí thay đổi, bảo
   đảm của A* và IDA* phải được đánh giá lại.

## g.7. Kết luận

Kết quả lý thuyết và thực nghiệm cùng chỉ ra rằng không có một thuật toán thắng
trên mọi tiêu chí. UCS, A* và Bidirectional Dijkstra là ba lựa chọn tối ưu chính xác; trên
bộ dữ liệu đã chọn, **A*** đạt cân bằng tốt nhất giữa chất lượng và khối lượng
tìm kiếm, với độ chênh bằng 0 và số đỉnh mở rộng trung vị thấp hơn UCS 49,2%.
Bidirectional Dijkstra đạt hiệu quả gần tương đương và giảm 45,4% số đỉnh mở
rộng trung vị so với UCS.

Greedy là lựa chọn nhanh nhất nhưng tạo độ chênh trung bình 33,678%. DFS cho chất
lượng tuyến thấp nhất. IDDFS và IDA* giữ biên nhỏ nhưng chịu chi phí tái mở rộng
rất lớn; trong đó IDA* đổi lại chất lượng nằm trong biên cộng đã công bố. Beam
Search giới hạn biên rõ ràng nhưng không bảo đảm tìm thấy hoặc tối ưu.

Cuối cùng, 149/200 cặp OD đổi tuyến giữa hai hồ sơ cho thấy ùn tắc có ảnh hưởng
đến chính quyết định định tuyến, không chỉ đến con số thời gian. Trường hợp
OD-000 minh họa rõ cơ chế đảo thứ tự hai tuyến khi các cạnh trên nhánh R22 giảm
từ mức ùn tắc 4–5 xuống 1–2. Vì vậy, lựa chọn thuật toán cho giao thông đô thị
cần được đánh giá đồng thời theo bảo đảm lời giải, chất lượng tuyến, khối lượng
tìm kiếm, tài nguyên, thời gian xử lý và độ nhạy với hồ sơ giao thông.

## Tài liệu tham khảo

Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C. (2022).
*Introduction to algorithms* (4th ed.). MIT Press.

Dechter, R., & Pearl, J. (1985). Generalized best-first search strategies and
the optimality of A*. *Journal of the ACM, 32*(3), 505–536.
https://doi.org/10.1145/3828.3830

Dijkstra, E. W. (1959). A note on two problems in connexion with graphs.
*Numerische Mathematik, 1*, 269–271. https://doi.org/10.1007/BF01386390

Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). A formal basis for the
heuristic determination of minimum cost paths. *IEEE Transactions on Systems
Science and Cybernetics, 4*(2), 100–107.
https://doi.org/10.1109/TSSC.1968.300136

Korf, R. E. (1985). Depth-first iterative-deepening: An optimal admissible tree
search. *Artificial Intelligence, 27*(1), 97–109.
https://doi.org/10.1016/0004-3702(85)90084-0

Pohl, I. (1971). Bi-directional search. In B. Meltzer & D. Michie (Eds.),
*Machine intelligence 6* (pp. 127–140). Edinburgh University Press.

Russell, S. J., & Norvig, P. (2021). *Artificial intelligence: A modern
approach* (4th ed.). Pearson.
