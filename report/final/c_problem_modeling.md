# c. Problem Modeling (Mô hình hóa bài toán)

## c.1. Mô hình đồ thị có hướng

Theo cách biểu diễn bài toán tìm kiếm trên không gian trạng thái (Russell &
Norvig, 2021), mạng giao thông được mô hình hóa bằng đồ thị có hướng:

\[
G=(V,E),
\]

trong đó \(V\) là tập nút và \(E\) là tập cạnh có hướng. Một nút biểu diễn
trạng thái vị trí hiện tại của người giao hàng. Một cạnh \(e=(u,v)\) biểu diễn
khả năng đi trực tiếp từ nút \(u\) đến nút \(v\) theo cấu trúc liên kết đã
xây dựng. Chi phí nằm trên cạnh; nút không có trọng số riêng.

Đề tài sử dụng hai mức đồ thị có cùng cách biểu diễn nhưng phục vụ hai mục đích:

- \(G_{\text{real}}\) là **đồ thị mạng đường chi tiết**, được xử lý từ dữ liệu
  OpenStreetMap trong một vùng trung tâm Thành phố Hồ Chí Minh. Đồ thị này giữ
  cấu trúc mạng đường để đánh giá thuật toán ở quy mô lớn.
- \(G_{\text{demo}}\) là **đồ thị POI**, gồm 51 địa điểm có tên và các hành
  lang có hướng được co từ \(G_{\text{real}}\). Đồ thị này phục vụ trực quan
  hóa, giải thích quá trình tìm kiếm và minh họa bài toán giao hàng.

\(G_{\text{demo}}\) không phải một đồ thị vẽ tay độc lập. Mỗi cạnh trên đồ thị
POI đại diện cho một đường đi liên tục gồm từ 1 đến 33 cạnh của
\(G_{\text{real}}\). Chiều dài, thời gian thông thoáng, loại đường và biến chỉ
báo rủi ro của cạnh này được tổng hợp từ hành lang tương ứng.

### c.1.1. Lý do lựa chọn mô hình hai độ phân giải

Điểm đáng chú ý của thiết kế là **một ngữ nghĩa đồ thị có hướng được duy trì ở
hai độ phân giải**. Đồ thị mạng đường chi tiết hỗ trợ đánh giá hiệu năng trên
không gian trạng thái lớn, trong khi đồ thị POI giúp quan sát và giải thích từng
bước tìm kiếm. Do mỗi cạnh POI vẫn truy vết được về một hành lang liên tục trên
\(G_{\text{real}}\), hai đồ thị sử dụng cùng cách diễn giải về hướng đi, chiều
dài, thời gian, ùn tắc và rủi ro thay vì hình thành hai mô hình tách biệt.

Thiết kế này tạo ra sự cân bằng giữa **độ trung thực cấu trúc**, **khả năng đánh
giá thực nghiệm** và **khả năng giải thích**. Giá trị của mô hình không nằm ở việc thay
thế bản đồ điều hướng thương mại, mà ở khả năng kiểm chứng thuật toán trên một
mạng được dẫn xuất từ dữ liệu bản đồ mở và trình bày kết quả trên một đồ thị đủ
gọn để người đọc theo dõi.

## c.2. Nút, cạnh, hướng và tính liên thông

Trong \(G_{\text{real}}\), 2.118 nút biểu diễn các đỉnh mạng đường, chủ yếu
tương ứng với giao lộ hoặc đầu mút của đoạn đường sau quá trình đơn giản hóa.
Trong \(G_{\text{demo}}\), 51 nút mang vai trò địa điểm: 40 địa danh, 7
trường học, 3 bệnh viện và 1 điểm được quy ước làm kho. Mỗi nút có mã định danh,
tọa độ vĩ độ–kinh độ, tên hiển thị và loại địa điểm; tên của các nút mạng đường
trong \(G_{\text{real}}\) không được gán.

Hướng di chuyển được biểu diễn trực tiếp bằng cấu trúc đồ thị. Người giao hàng
đi trực tiếp từ \(A\) đến \(B\) khi và chỉ khi đồ thị có cạnh
\(A\rightarrow B\). Nếu
không có cạnh \(A\rightarrow C\), việc hai nút gần nhau hoặc nằm trên cùng một
tuyến đường không tự tạo ra một phép chuyển trực tiếp; muốn tới \(C\), thuật
toán phải tìm một chuỗi cạnh có hướng trung gian. Chiều \(B\rightarrow A\) chỉ
hợp lệ khi cạnh ngược đó cũng tồn tại.

Vì vậy, đường hai chiều được biểu diễn bằng hai cạnh đối hướng. Một cạnh được
đánh dấu một chiều khi cặp có thứ tự ngược không tồn tại trong đồ thị sau xử lý.
Đây là thuộc tính cấu trúc của bản dữ liệu, không phải bản sao trực tiếp của
thuộc tính một chiều hay bằng chứng biển báo ngoài thực địa. Với cạnh trên
\(G_{\text{demo}}\), nhãn một chiều còn có thể phát sinh do hành lang ngược
không được chọn trong quá trình co đồ thị; không nên hiểu mỗi cạnh POI là đúng
một đoạn đường vật lý có biển một chiều.

Hai đồ thị nền đều liên thông mạnh. Điều đó có nghĩa là giữa mọi cặp nút có thứ
tự đều tồn tại ít nhất một đường đi có hướng, nhưng không có nghĩa mọi cặp nút
đều nối trực tiếp. Dữ liệu hiện tại có 1.433 cạnh một chiều trong
\(G_{\text{real}}\) và 60 cạnh một chiều trong \(G_{\text{demo}}\). Tính bất đối
xứng này cũng làm cho chi phí đi từ \(A\) đến \(B\) có thể khác chi phí đi từ
\(B\) về \(A\).

Mô hình tìm kiếm cuối cùng là đồ thị có hướng đơn: mỗi cặp nút có thứ tự có tối
đa một cạnh, còn hai chiều di chuyển được xem là hai quan hệ chuyển trạng thái
độc lập. Quy trình chuyển từ đa đồ thị nguồn sang đồ thị này được trình bày tại
phần Dataset.

### c.2.1. Sơ đồ trừu tượng hóa bài toán

Sơ đồ dưới đây minh họa cách mạng đường vật lý được chuyển thành hai mức đồ thị,
sau đó kết hợp với thuộc tính cạnh và bối cảnh thời gian để hình thành bài toán
tìm kiếm có trọng số.

![Trừu tượng hóa mạng đường thành đồ thị có hướng hai mức](../assets/problem_graph_modeling_vi.svg)

*Hình c.1. Trừu tượng hóa mạng đường thành đồ thị có hướng hai mức và cơ chế
gán trọng số theo mục tiêu. Mỗi cạnh trên \(G_{\text{demo}}\) đại diện cho một
hành lang liên tục trên \(G_{\text{real}}\); chiều đi và chiều về được đánh
giá độc lập. Nguồn: nhóm thực hiện.*

## c.3. Trạng thái, trạng thái đầu, đích và quy tắc chuyển

Đối với tìm đường hai điểm:

- **Không gian trạng thái:** tập các nút của đồ thị đang xét.
- **Trạng thái hiện tại:** nút mà người giao hàng đang đứng.
- **Trạng thái đầu:** nút xuất phát do người dùng chọn.
- **Trạng thái đích:** nút đích do người dùng chọn.
- **Quy tắc chuyển:** từ \(u\), có thể chuyển sang \(v\) nếu tồn tại cạnh có hướng
  \(u\rightarrow v\).
- **Chi phí bước:** trọng số của cạnh \(u\rightarrow v\) theo mục tiêu và khung
  giờ đã chọn.
- **Lời giải:** một dãy nút
  \(P=(v_0,v_1,\ldots,v_k)\), với \(v_0\) là trạng thái đầu, \(v_k\) là đích và
  \((v_i,v_{i+1})\in E\) cho mọi \(i\).

Chi phí của một đường đi là tổng các chi phí bước:

\[
\operatorname{Cost}(P)=\sum_{i=0}^{k-1}w(v_i,v_{i+1}).
\]

Đối với bài toán nhiều địa điểm, điểm xuất phát vẫn được cố định. Với mỗi cặp có
thứ tự trong tập gồm điểm xuất phát và các điểm cần ghé, hệ thống tính chi phí
đường đi ngắn nhất theo cùng đồ thị, khung giờ và mục tiêu. Các giá trị này tạo
thành ma trận chi phí có hướng:

\[
C(a,b)=\min_{P:a\leadsto b}\sum_{e\in P}w(e).
\]

Do đồ thị có hướng, \(C(a,b)\) không được giả định bằng \(C(b,a)\). Các phương
pháp tối ưu đa điểm sử dụng ma trận này để tối thiểu hóa tổng chi phí của thứ tự
ghé; phần nguyên lý và bảo đảm tối ưu của từng phương pháp được trình bày riêng
trong mục Multi-location Optimization của báo cáo.

Với thứ tự ghé \((p_0,p_1,\ldots,p_k)\), trong đó \(p_0\) là điểm xuất phát, đặt
\(\rho=1\) nếu hành trình phải quay về điểm đầu và \(\rho=0\) nếu không. Mục tiêu
được tối thiểu hóa là:

\[
J=\sum_{i=0}^{k-1}C(p_i,p_{i+1})
  +\rho C(p_k,p_0).
\]

Mặc định, hành trình là đường đi mở và kết thúc tại địa điểm cuối cùng. Khi người
dùng yêu cầu quay lại điểm xuất phát, số hạng cuối được cộng vào mục tiêu.

## c.4. Thuộc tính của nút, cạnh và hồ sơ giao thông

Các thuộc tính phục vụ mô hình được tóm tắt trong bảng dưới đây.

| Thành phần | Thuộc tính | Ý nghĩa và đơn vị |
|---|---|---|
| Nút | Mã, tên, loại, vĩ độ, kinh độ | Xác định trạng thái và vị trí địa lý; tọa độ dùng cho hiển thị và hàm heuristic |
| Cạnh | Mã cạnh | Định danh duy nhất một cạnh trong bản dữ liệu |
| Cạnh | Nút đầu và nút cuối | Xác định phép chuyển có hướng |
| Cạnh | Tên đường và loại đường | Mô tả tuyến; loại đường còn được dùng để gán tốc độ mô hình và tạo dữ liệu ùn tắc dự phòng |
| Cạnh | Chiều dài | Độ dài đoạn đường hoặc hành lang, tính bằng mét |
| Cạnh | Quan hệ đối hướng | Cho biết cạnh ngược có tồn tại trong bản dữ liệu hay không |
| Cạnh | Tốc độ thông thoáng | Tốc độ mô hình theo loại đường, tính bằng km/h |
| Cạnh | Thời gian thông thoáng | Chiều dài chia cho tốc độ thông thoáng, tính bằng giây |
| Cạnh | Bốn biến chỉ báo rủi ro | Ngập, thi công, đường hẹp và đèn tín hiệu; mỗi biến nhận 0 hoặc 1 |
| Hồ sơ giao thông | Mức ùn tắc theo cạnh và khung giờ | Số nguyên từ 1 đến 5 tại 07:30, 12:00, 17:30 và 22:00 |

Hồ sơ giao thông được lưu tách khỏi đồ thị vì cấu trúc liên kết và thuộc tính
đường không đổi theo từng khung giờ, còn mức ùn tắc thay đổi theo thời điểm. Mỗi
cạnh của mỗi đồ thị có đúng một mức ùn tắc ở từng khung giờ. Trọng số hiệu dụng
không được lưu cố định trong bộ dữ liệu mà được tính tại thời điểm định tuyến từ
chiều dài, tốc độ, mức ùn tắc và các biến chỉ báo rủi ro.

## c.5. Hàm chi phí

### c.5.1. Các thành phần

Với cạnh \(e\), gọi:

- \(l_e\) là chiều dài cạnh, đơn vị mét;
- \(v_e\) là tốc độ thông thoáng mô hình, đơn vị km/h;
- \(c_e(h)\in\{1,2,3,4,5\}\) là mức ùn tắc tại khung giờ \(h\);
- \(r_f,r_c,r_n,r_l\in\{0,1\}\) lần lượt là các biến chỉ báo nhị phân cho
  ngập, thi công, đường hẹp và đèn tín hiệu.

Thời gian thông thoáng của cạnh là:

\[
t_e^0=\frac{l_e}{v_e/3.6}\quad[\text{giây}].
\]

Mức ùn tắc được chuyển thành hệ số nhân thời gian:

\[
f_e(h)=1+\gamma\frac{c_e(h)-1}{4},\qquad \gamma=1{,}5.
\]

Do đó, năm mức ùn tắc tương ứng với các hệ số \(1\), \(1{,}375\),
\(1{,}75\), \(2{,}125\) và \(2{,}5\). Mức 1 biểu diễn trạng thái gần thông
thoáng; ở mức 5, phần thời gian di chuyển của cạnh bằng 2,5 lần thời gian thông
thoáng.

Chi phí phạt rủi ro được quy đổi về giây:

\[
P_e=60r_f+90r_c+30r_n+25r_l\quad[\text{giây}].
\]

Trong đó, cạnh có chỉ báo ngập cộng 60 giây, cạnh có chỉ báo thi công cộng 90
giây, cạnh có chỉ báo đường hẹp cộng 30 giây và cạnh đi vào nút có đèn tín hiệu
cộng 25 giây. Với ngập và thi công, chỉ báo được đặt trên cạnh đi từ ngoài vào
vùng mô hình; nhờ vậy chi phí được tính một lần khi đi vào vùng thay vì bị cộng
trên mọi đoạn đường nằm bên trong.

### c.5.2. Ba mục tiêu tối ưu

Đề tài không dùng khoảng cách làm tiêu chí duy nhất. Ba trọng số cạnh được định
nghĩa như sau:

\[
w_{\text{distance}}(e)=l_e\quad[\text{mét}],
\]

\[
w_{\text{time}}(e,h)=t_e^0 f_e(h)\quad[\text{giây}],
\]

\[
w_{\text{balanced}}(e,h)=t_e^0 f_e(h)+P_e\quad[\text{giây}].
\]

Chế độ khoảng cách tạo một tuyến tham chiếu ngắn nhất theo mét. Chế độ thời gian
tối ưu thời gian sau khi điều chỉnh theo ùn tắc nhưng chưa cộng rủi ro. Chế độ cân
bằng bổ sung chi phí phạt để ưu tiên những tuyến có tổng thời gian và chi phí
rủi ro thấp hơn. Chi phí phạt được cộng sau khi nhân hệ số ùn tắc; nó
không bị nhân thêm bởi hệ số này.

Cách thiết kế này tránh cộng trực tiếp những đại lượng khác đơn vị. Ở chế độ
cân bằng, thời gian di chuyển và phần phạt rủi ro đều được biểu diễn bằng giây
tương đương nên tổng chi phí có cách diễn giải nhất quán. Tuy nhiên, đây vẫn là
chi phí mô hình, không phải thời gian đến dự kiến (ETA) đã được hiệu chuẩn ngoài
thực địa.

### c.5.3. Nguồn và ý nghĩa của các trọng số

Tốc độ thông thoáng, \(\gamma=1{,}5\) và bốn mức phạt 60/90/30/25 giây là các
tham số do nhóm thiết kế, không phải tốc độ pháp lý hay hệ số đã học từ một bộ
dữ liệu kiểm chứng độc lập. Với cấu hình \(\gamma=1{,}5\), mô hình tạo một thang
tuyến tính dễ giải thích: mức ùn tắc cao nhất làm thời gian gấp 2,5 lần mức thông
thoáng. Không có dữ liệu độc lập chứng minh đây là giá trị tối ưu.

Thứ tự các mức phạt thể hiện ưu tiên mô hình của nhóm: thi công được gán độ trễ
lớn nhất, tiếp theo là ngập, đường hẹp và đèn tín hiệu. Các độ lớn đưa biến chỉ
báo rủi ro vào cùng đơn vị với thời gian để chúng có thể ảnh hưởng đến lựa chọn
tuyến, nhưng chưa được suy ra từ số đo thực địa hoặc khảo sát hành vi người giao
hàng.

Một phân tích hậu nghiệm trên 160 bản ghi TomTom đã lưu cho
\(\hat{\gamma}=1{,}238\), chênh khoảng 17,5% so với giá trị thiết kế. Tuy nhiên,
mức ùn tắc trong phép tính này được rời rạc hóa từ chính tỷ lệ tốc độ của các
bản ghi đó. Vì vậy, kết quả chỉ cho biết mức độ nhất quán nội bộ giữa quy tắc
chia mức và hàm nhân thời gian; nó không phải hiệu chuẩn độc lập bằng thời gian
di chuyển đầu-cuối. Hệ thống vẫn sử dụng \(\gamma=1{,}5\), còn các mức phạt chưa
có dữ liệu hiệu chuẩn tương ứng.

### c.5.4. Ảnh hưởng của ùn tắc đến tuyến đường

Ùn tắc không tác động đến trọng số khoảng cách, nên với cùng cấu trúc đồ thị và
quy tắc phân xử giữa các trạng thái đồng hạng, tuyến tối ưu theo khoảng cách
không đổi giữa các khung giờ. Ngược lại, trong chế độ thời gian và cân bằng, mỗi
cạnh có hệ số phụ thuộc khung giờ.
Khi mức của các cạnh thay đổi không đồng đều, tương quan chi phí giữa các tuyến
cũng thay đổi; một hành lang dài hơn nhưng ít ùn tắc có thể được chọn thay cho
hành lang ngắn hơn đang ở mức cao. Trong chế độ cân bằng, quyết định này còn
chịu thêm chi phí phạt rủi ro. Cơ chế đó đáp ứng yêu cầu bài toán rằng giao thông theo
thời điểm phải có khả năng làm thay đổi tuyến cuối cùng.

## c.6. Hàm heuristic và điều kiện hợp lệ

Phần chứng minh chi tiết được trình bày trong mục Algorithm Principles. Việc sử
dụng một cận dưới không vượt quá chi phí tối ưu còn lại phù hợp với cơ sở lý
thuyết của tìm kiếm heuristic tối ưu (Hart et al., 1968).

Trong mô hình hiện tại, heuristic khoảng cách sử dụng khoảng cách Haversine từ
nút hiện tại đến đích. Với chế độ thời gian và cân bằng, khoảng cách này được
chia cho tốc độ lớn nhất của đồ thị đang xét; ở hai đồ thị nền hiện tại, tốc độ lớn
nhất là 45 km/h. Heuristic chỉ sử dụng tọa độ nút và cận tốc độ, không sử dụng
ùn tắc, rủi ro hoặc tên đường.

Heuristic này không vượt quá chi phí tối ưu còn lại và có tính nhất quán dưới
các điều kiện mà bộ dữ liệu duy trì: chiều dài mỗi cạnh không nhỏ hơn khoảng
cách Haversine giữa hai đầu cạnh, tốc độ cạnh không vượt quá tốc độ lớn nhất
dùng trong heuristic, hệ số ùn tắc không
nhỏ hơn 1 và phần phạt không âm. Kết luận này áp dụng cho đồ thị thỏa các điều
kiện trên, không phải cho mọi đồ thị tùy ý.

## Tài liệu tham khảo

Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). A formal basis for the heuristic determination of minimum cost paths. *IEEE Transactions on Systems Science and Cybernetics, 4*(2), 100–107. https://doi.org/10.1109/TSSC.1968.300136

Russell, S. J., & Norvig, P. (2021). *Artificial intelligence: A modern approach* (4th ed.). Pearson. https://www.pearson.com/en-us/subject-catalog/p/artificial-intelligence-a-modernapproach/P200000003500/9780137505135
