# b. Problem Context (Bối cảnh bài toán)

## b.1. Kịch bản giao hàng tại khu vực trung tâm Thành phố Hồ Chí Minh

Đề tài xây dựng bài toán tìm đường cho một shipper giao hàng tại khu vực trung
tâm Thành phố Hồ Chí Minh. Trong bối cảnh đô thị, tuyến ngắn nhất theo khoảng
cách không phải lúc nào cũng là tuyến phù hợp nhất. Thời gian di chuyển còn chịu
ảnh hưởng của mức độ ùn tắc theo thời điểm, hướng lưu thông, loại đường, đèn tín
hiệu và các yếu tố rủi ro như ngập nước, thi công hoặc đường hẹp. Đặc biệt, một
đoạn đường thuận lợi vào ban đêm có thể trở thành lựa chọn kém trong giờ cao
điểm; tương tự, hai địa điểm ở gần nhau về mặt địa lý vẫn có thể phải đi vòng do
mạng đường một chiều.

Đề tài giải quyết hai nhu cầu có liên quan. Thứ nhất, với một điểm xuất phát và
một điểm đến, hệ thống tìm một đường đi hợp lệ theo một trong ba mục tiêu:
khoảng cách, thời gian ước tính hoặc chi phí cân bằng có xét rủi ro. Thứ hai, khi
shipper phải ghé nhiều điểm, hệ thống tối ưu thứ tự ghé dựa trên chi phí đường
đi thực sự trong mạng đường có hướng, thay vì chỉ sắp xếp theo khoảng cách đường
chim bay. Hai nhu cầu này phù hợp với công việc giao hàng: shipper vừa cần chọn
đường cho từng chặng, vừa cần giảm tổng chi phí của cả hành trình.

## b.2. Ý nghĩa của tối ưu tuyến

Tối ưu tuyến giúp biểu diễn rõ sự đánh đổi giữa “ngắn”, “nhanh” và “phù hợp”.
Một tuyến ngắn có thể đi qua nhiều cạnh ùn tắc hoặc vùng rủi ro; một tuyến dài
hơn đôi chút có thể có thời gian mô hình thấp hơn. Việc tách ba mục tiêu cho
phép người dùng quan sát trực tiếp sự khác nhau này:

- chế độ khoảng cách ưu tiên tổng số mét nhỏ nhất;
- chế độ thời gian ưu tiên thời gian di chuyển sau khi điều chỉnh theo ùn tắc;
- chế độ cân bằng cộng thêm các độ trễ tương đương cho ngập, thi công, đường hẹp
  và đèn tín hiệu.

Kết quả vì thế không chỉ là một chuỗi địa điểm. Mỗi tuyến còn có thể được giải
thích bằng chiều dài, thời gian thông thoáng, phần trễ do ùn tắc và phần phạt do
rủi ro. Đây là cơ sở để so sánh các thuật toán trên cùng một bài toán giao thông
Việt Nam thay vì trên một mê cung hoặc lưới trừu tượng.

# c. Problem Modeling (Mô hình hóa bài toán)

## c.1. Mô hình đồ thị có hướng

Mạng giao thông được mô hình hóa bằng đồ thị có hướng:

\[
G=(V,E),
\]

trong đó \(V\) là tập nút và \(E\) là tập cạnh có hướng. Một nút biểu diễn
trạng thái vị trí hiện tại của shipper. Một cạnh \(e=(u,v)\) biểu diễn khả năng
đi trực tiếp từ nút \(u\) đến nút \(v\) theo cấu trúc liên kết đã xây dựng. Chi
phí nằm trên cạnh; nút không có trọng số riêng.

Đề tài sử dụng hai mức đồ thị có cùng cách biểu diễn nhưng phục vụ hai mục đích:

- \(G_{\text{real}}\) là đồ thị mạng đường đã xử lý từ dữ liệu OpenStreetMap trong
  một vùng trung tâm Thành phố Hồ Chí Minh. Đồ thị này giữ chi tiết mạng đường để
  chạy ở quy mô lớn.
- \(G_{\text{demo}}\) gồm 51 địa điểm có tên và các hành lang có hướng được co từ
  \(G_{\text{real}}\). Đồ thị này phù hợp để trình bày trực quan, giảng giải quá
  trình tìm kiếm và minh họa bài toán giao hàng.

\(G_{\text{demo}}\) không phải một đồ thị vẽ tay độc lập. Mỗi cạnh demo đại diện
cho một đường đi liên tục gồm từ 1 đến 33 cạnh của \(G_{\text{real}}\). Chiều
dài, thời gian thông thoáng, loại đường và cờ rủi ro của cạnh demo được tổng hợp
từ hành lang tương ứng.

## c.2. Nút, cạnh, hướng và tính liên thông

Trong \(G_{\text{real}}\), 2.118 nút mạng đường được mô hình hóa như các giao
lộ. Trong \(G_{\text{demo}}\), 51 nút mang vai trò địa điểm: 40 địa danh, 7
trường học, 3 bệnh viện và 1 điểm được quy ước làm kho. Mỗi nút có mã định danh,
tọa độ vĩ độ–kinh độ, tên hiển thị và loại địa điểm; tên của các nút mạng đường
trong \(G_{\text{real}}\) không được gán.

Hướng di chuyển được biểu diễn trực tiếp bằng cấu trúc đồ thị. Shipper đi trực
tiếp từ \(A\) đến \(B\) khi và chỉ khi đồ thị có cạnh \(A\rightarrow B\). Nếu
không có cạnh \(A\rightarrow C\), việc hai nút gần nhau hoặc nằm trên cùng một
tuyến đường không tự tạo ra một phép chuyển trực tiếp; muốn tới \(C\), thuật
toán phải tìm một chuỗi cạnh có hướng trung gian. Chiều \(B\rightarrow A\) chỉ
hợp lệ khi cạnh ngược đó cũng tồn tại.

Vì vậy, đường hai chiều được biểu diễn bằng hai cạnh đối hướng. Một cạnh được
đánh dấu một chiều khi cặp có thứ tự ngược không tồn tại trong đồ thị sau xử lý.
Đây là thuộc tính cấu trúc của bản dữ liệu, không phải bản sao trực tiếp của
thuộc tính một chiều hay bằng chứng biển báo ngoài thực địa. Với cạnh demo,
nhãn một chiều còn có thể phát sinh do hành lang ngược không được chọn trong quá
trình co đồ thị; không nên hiểu mỗi cạnh demo là đúng một đoạn đường vật lý có
biển một chiều.

Hai đồ thị nền đều liên thông mạnh. Điều đó có nghĩa là giữa mọi cặp nút có thứ
tự đều tồn tại ít nhất một đường đi có hướng, nhưng không có nghĩa mọi cặp nút
đều nối trực tiếp. Dữ liệu hiện tại có 1.433 cạnh một chiều trong
\(G_{\text{real}}\) và 60 cạnh một chiều trong \(G_{\text{demo}}\). Tính bất đối
xứng này cũng làm cho chi phí đi từ \(A\) đến \(B\) có thể khác chi phí đi từ
\(B\) về \(A\).

Đồ thị trung gian do OSMnx tạo là một đa đồ thị có hướng và có thể chứa nhiều
cạnh song song giữa cùng một cặp có thứ tự. Mô hình sử dụng khi tìm kiếm là đồ
thị có hướng đơn: cạnh tự nối bị loại và các cạnh song song cùng chiều được rút
còn một lựa chọn có thời gian thông thoáng mô hình nhỏ nhất. Cạnh ngược chiều
vẫn được xem là một cặp có thứ tự độc lập.

## c.3. Trạng thái, trạng thái đầu, đích và quy tắc chuyển

Đối với tìm đường hai điểm:

- **Không gian trạng thái:** tập các nút của đồ thị đang xét.
- **Trạng thái hiện tại:** nút mà shipper đang đứng.
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

Mặc định, hành trình là đường đi mở và kết thúc tại điểm giao cuối. Khi người
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
| Cạnh | Hướng/một chiều | Cho biết có hay không cạnh ngược trong bản dữ liệu |
| Cạnh | Tốc độ thông thoáng | Tốc độ mô hình theo loại đường, tính bằng km/h |
| Cạnh | Thời gian thông thoáng | Chiều dài chia cho tốc độ thông thoáng, tính bằng giây |
| Cạnh | Bốn cờ rủi ro | Ngập, thi công, đường hẹp và đèn tín hiệu; mỗi cờ nhận 0 hoặc 1 |
| Hồ sơ giao thông | Mức ùn tắc theo cạnh và khung giờ | Số nguyên từ 1 đến 5 tại 07:30, 12:00, 17:30 và 22:00 |

Hồ sơ giao thông được lưu tách khỏi đồ thị vì cấu trúc liên kết và thuộc tính
đường không đổi theo từng khung giờ, còn mức ùn tắc thay đổi theo thời điểm. Mỗi
cạnh của mỗi đồ thị có đúng một mức ùn tắc ở từng khung giờ. Trọng số cuối cùng
không được lưu cố định trong bộ dữ liệu mà được tính khi sử dụng đồ thị, từ
chiều dài, tốc độ, mức ùn tắc và các cờ rủi ro.

## c.5. Hàm chi phí

### c.5.1. Các thành phần

Với cạnh \(e\), gọi:

- \(l_e\) là chiều dài cạnh, đơn vị mét;
- \(v_e\) là tốc độ thông thoáng mô hình, đơn vị km/h;
- \(c_e(h)\in\{1,2,3,4,5\}\) là mức ùn tắc tại khung giờ \(h\);
- \(r_f,r_c,r_n,r_l\in\{0,1\}\) lần lượt là cờ ngập, thi công, đường hẹp và
  đèn tín hiệu.

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

Phần phạt rủi ro được quy đổi về giây:

\[
P_e=60r_f+90r_c+30r_n+25r_l\quad[\text{giây}].
\]

Trong đó, cạnh ngập cộng 60 giây, cạnh thi công cộng 90 giây, cạnh đường hẹp
cộng 30 giây và cạnh đi vào nút có đèn tín hiệu cộng 25 giây. Với ngập và thi
công, cờ được đặt trên cạnh đi từ ngoài vào vùng mô hình; nhờ vậy phần phạt mang
ý nghĩa phí đi vào vùng thay vì bị cộng trên mọi đoạn đường nằm bên trong.

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

Chế độ khoảng cách tạo một đường cơ sở ngắn nhất theo mét. Chế độ thời gian tối
ưu thời gian sau khi điều chỉnh theo ùn tắc nhưng chưa cộng rủi ro. Chế độ cân
bằng tối ưu thời gian và đồng thời tránh các cạnh có cờ rủi ro. Phần phạt được
cộng sau khi nhân hệ số ùn tắc; nó không bị nhân thêm bởi hệ số này.

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
lớn nhất, tiếp theo là ngập, đường hẹp và đèn tín hiệu. Các độ lớn đưa cờ rủi ro
vào cùng đơn vị với thời gian để chúng có thể ảnh hưởng đến lựa chọn tuyến,
nhưng chưa được suy ra từ số đo thực địa hoặc khảo sát hành vi shipper.

Một phân tích hậu nghiệm trên 160 bản ghi TomTom đã lưu cho
\(\hat{\gamma}=1{,}238\), chênh khoảng 17,5% so với giá trị thiết kế. Tuy nhiên,
mức ùn tắc trong phép tính này được rời rạc hóa từ chính tỷ lệ tốc độ của các
bản ghi đó. Vì vậy, kết quả chỉ cho biết mức độ nhất quán nội bộ giữa quy tắc
chia mức và hàm nhân thời gian; nó không phải hiệu chuẩn độc lập bằng thời gian
di chuyển đầu-cuối. Hệ thống vẫn sử dụng \(\gamma=1{,}5\), còn các mức phạt chưa
có dữ liệu hiệu chuẩn tương ứng.

### c.5.4. Ảnh hưởng của ùn tắc đến tuyến đường

Ùn tắc không tác động đến trọng số khoảng cách, nên với cùng cấu trúc đồ thị và
luật phá hòa, tuyến tối ưu theo khoảng cách không đổi giữa các khung giờ. Ngược
lại, trong chế độ thời gian và cân bằng, mỗi cạnh có hệ số phụ thuộc khung giờ.
Khi mức của các cạnh thay đổi không đồng đều, tương quan chi phí giữa các tuyến
cũng thay đổi; một hành lang dài hơn nhưng ít ùn tắc có thể được chọn thay cho
hành lang ngắn hơn đang ở mức cao. Trong chế độ cân bằng, quyết định này còn chịu
thêm phần phạt rủi ro. Cơ chế đó đáp ứng yêu cầu bài toán rằng giao thông theo
thời điểm phải có khả năng làm thay đổi tuyến cuối cùng.

## c.6. Dữ liệu phục vụ heuristic

Phần heuristic chi tiết được trình bày trong mục Algorithm Principles. Về mặt
mô hình dữ liệu, heuristic khoảng cách sử dụng khoảng cách Haversine từ nút
hiện tại đến đích. Với chế độ thời gian và cân bằng, khoảng cách này được chia
cho tốc độ lớn nhất của đồ thị đang xét; ở hai đồ thị nền hiện tại, tốc độ lớn
nhất là 45 km/h. Heuristic chỉ sử dụng tọa độ nút và cận tốc độ, không sử dụng
ùn tắc, rủi ro hoặc tên đường.

Heuristic này không vượt quá chi phí thật và có tính nhất quán dưới các điều
kiện mà bộ dữ liệu duy trì:
chiều dài mỗi cạnh không nhỏ hơn khoảng cách Haversine giữa hai đầu cạnh, tốc độ
cạnh không vượt quá tốc độ lớn nhất dùng trong heuristic, hệ số ùn tắc không
nhỏ hơn 1 và phần phạt không âm. Kết luận này áp dụng cho đồ thị thỏa các điều
kiện trên, không phải cho mọi đồ thị tùy ý.

# d. Dataset

## d.1. Phương pháp thiết kế và phạm vi dữ liệu

Đề tài sử dụng phương pháp **dữ liệu hỗn hợp (hybrid data)**, kết hợp dữ liệu
bản đồ thực đã đơn giản hóa với dữ liệu do nhóm tạo và dữ liệu ùn tắc dự phòng
mô phỏng. Cách tiếp cận này giữ được cấu trúc liên kết của mạng đường đô thị,
đồng thời tạo ra một bộ dữ liệu nhỏ hơn, có thể tái lập và phù hợp để minh họa
thuật toán.

Bộ dữ liệu gồm hai đồ thị và hai hồ sơ giao thông tương ứng. Thông tin chính
được tóm tắt trong bảng dưới đây.

| Thuộc tính | \(G_{\text{real}}\) | \(G_{\text{demo}}\) |
|---|---:|---:|
| Mục đích | Tìm kiếm quy mô lớn | Minh họa, giảng giải và giao hàng theo POI |
| Nút | 2.118 nút mạng đường, được mô hình hóa như giao lộ | 51 POI |
| Cạnh có hướng | 4.699 | 298 |
| Cạnh một chiều theo cấu trúc | 1.433 | 60 |
| Cạnh có cờ ngập | 54 | 24 |
| Cạnh có cờ thi công | 19 | 24 |
| Cạnh có cờ đường hẹp | 8 | 0 |
| Cạnh đi vào nút đèn tín hiệu | 185 | 130 |
| Khoảng chiều dài cạnh | 1,1–1.682,3 m | 23,0–2.775,6 m |
| Khoảng tốc độ có trong bản dữ liệu | 25–45 km/h | 30–45 km/h |
| Khoảng thời gian thông thoáng đã làm tròn | 0,1–134,6 s | 1,8–270,8 s |
| Số khung giờ | 4 | 4 |
| Tính liên thông | Liên thông mạnh | Liên thông mạnh |

Hai đồ thị dùng hệ tọa độ WGS 84 (EPSG:4326) và cùng giới hạn địa lý
\([106{,}68;10{,}76;106{,}72;10{,}80]\), theo thứ tự kinh độ trái, vĩ độ dưới,
kinh độ phải, vĩ độ trên. Phạm vi này bao phủ một phần khu vực trung tâm, không
đại diện cho toàn bộ Thành phố Hồ Chí Minh.

## d.2. Danh sách địa điểm của đồ thị demo

Các nút mạng đường trong \(G_{\text{real}}\) không có tên địa điểm, nên không thể
liệt kê như một danh mục POI. Danh sách địa điểm dùng để tương tác và minh họa là
51 POI của \(G_{\text{demo}}\), được chia như sau.

| Loại | Số lượng | Địa điểm |
|---|---:|---|
| Điểm được quy ước làm kho | 1 | Bưu điện Thành phố |
| Bệnh viện | 3 | BV Nhi Đồng 2; BV Mắt TP.HCM; BV Từ Dũ |
| Trường học | 7 | ĐH Kiến trúc TP.HCM; ĐH Kinh tế TP.HCM; THPT Lê Quý Đôn; Trường Marie Curie; THPT Nguyễn Thị Minh Khai; ĐH Mở TP.HCM; ĐH Khoa học Tự nhiên (Nguyễn Văn Cừ) |
| Địa danh | 40 | Chợ Bến Thành; Nhà thờ Đức Bà; Dinh Độc Lập; Hồ Con Rùa; Công viên Tao Đàn; Bitexco Financial Tower; Nhà hát Thành phố; UBND TP.HCM; Saigon Centre (Takashimaya); Công trường Mê Linh; Bến Bạch Đằng; Cầu Mống; Bảo tàng Hồ Chí Minh (Bến Nhà Rồng); Cầu Ba Son; Thảo Cầm Viên; Bảo tàng Lịch sử TP.HCM; Đài truyền hình HTV; Sân vận động Hoa Lư; Nhà văn hoá Thanh Niên; Chợ Đa Kao; Chùa Ngọc Hoàng; Công viên Lê Văn Tám; Chợ Tân Định; Nhà thờ Tân Định; Cầu Kiệu; Chùa Vĩnh Nghiêm; Chùa Xá Lợi; Bảo tàng Chứng tích Chiến tranh; Vòng xoay Dân Chủ; Cung Văn hoá Lao Động; Bảo tàng TP.HCM; Bảo tàng Mỹ thuật TP.HCM; Điểm trung chuyển Hàm Nghi; Công viên 23/9; Đền Bà Mariamman; Phố đi bộ Bùi Viện; Chợ Thái Bình; Cầu Ông Lãnh; Cầu Calmette; Chợ Nancy |

Tên, loại và tọa độ đầu vào của các POI do nhóm chọn lọc thủ công. Mỗi POI được
gắn vào một nút \(G_{\text{real}}\) khác nhau để trở thành vị trí định tuyến. Khoảng
cách từ tọa độ đầu vào đến nút được chọn có giá trị nhỏ nhất 2,70 m, trung vị
46,14 m và lớn nhất 185,74 m. Năm POI có khoảng cách gắn nút lớn hơn 100 m là Dinh
Độc Lập (185,74 m), Công viên Tao Đàn (154,2 m), Cầu Ba Son (139,9 m), Cung Văn
hoá Lao Động (116,7 m) và Bảo tàng Hồ Chí Minh – Bến Nhà Rồng (105,8 m). Nhà
thờ Tân Định là trường hợp duy nhất dùng nút gần thứ hai, cách 72,46 m, để tránh
trùng nút trong ngưỡng 120 m. Các khoảng cách này đánh giá phép gắn nút, không xác
nhận tọa độ POI đầu vào hoặc cổng ra vào là chính xác ngoài thực địa.

## d.3. Nguồn dữ liệu và xuất xứ dữ liệu

### d.3.1. Phân loại nguồn

| Nhóm dữ liệu | Nguồn/phương pháp | Bản chất sử dụng trong đề tài |
|---|---|---|
| Cấu trúc liên kết, tọa độ, chiều dài, loại và tên đường | OpenStreetMap qua OSMnx | Dữ liệu bản đồ thực được dẫn xuất và đơn giản hóa |
| Đèn tín hiệu | Thẻ nút của OpenStreetMap | Dữ liệu dẫn xuất; cờ cạnh được tạo khi cạnh đi vào nút tín hiệu |
| Ùn tắc tại các điểm mẫu | TomTom Flow Segment Data | Bốn bản trích xuất chỉ lưu trường đã chọn; dùng trên các cạnh được gán |
| Ùn tắc không được phủ | Quy tắc ngẫu nhiên có hạt giống (seed) 42 | Dữ liệu mô phỏng, tái lập được |
| 51 POI | Nhóm tự chọn và nhập tọa độ | Dữ liệu thủ công, sau đó gắn vào \(G_{\text{real}}\) |
| Vùng ngập và thi công | Tám vùng tròn do nhóm mô hình hóa | Dữ liệu thủ công; nguồn ngoài chỉ hỗ trợ bối cảnh lịch sử |
| Tốc độ theo loại đường, hệ số ùn tắc và mức phạt rủi ro | Nhóm thiết kế | Cấu hình mô hình, không phải số đo thực địa |
| Cạnh demo, cờ rủi ro và chi phí tuyến cuối | Phép biến đổi/tính toán | Dữ liệu dẫn xuất khi xây đồ thị hoặc giá trị tính từ bản dữ liệu khi định tuyến |

OpenStreetMap là dữ liệu mở theo giấy phép ODbL; báo cáo ghi nhận nguồn
[OpenStreetMap và các cộng tác viên](https://www.openstreetmap.org/copyright).
OSMnx 2.1.1 được dùng để tải và chuyển dữ liệu đường thành đồ thị mạng lưới; mô tả
thư viện có tại [tài liệu chính thức của OSMnx](https://osmnx.readthedocs.io/en/stable/).
Các trường tốc độ TomTom được hiểu theo
[tài liệu Flow Segment Data của TomTom](https://docs.tomtom.com/traffic-api/documentation/tomtom-maps/v1/traffic-flow/flow-segment-data).

### d.3.2. OpenStreetMap và quá trình xây dựng \(G_{\text{real}}\)

Nguồn gần dữ liệu OSM nguyên bản nhất được lưu là phản hồi Overpass có
mốc thời gian nền 2026-07-26T11:45:05Z, gồm 19.864 phần tử: 15.959 nút và 3.905
đường (way). Từ phản hồi này, OSMnx tạo mạng đường cho phương tiện cơ giới trong
vùng địa lý đã nêu, đơn giản hóa cấu trúc liên kết và giữ thành phần liên thông
mạnh có hướng lớn nhất.

Đồ thị trung gian sau bước OSMnx là một đa đồ thị có hướng gồm 2.118 nút và
4.721 cạnh. Nó đã qua đơn giản hóa và lọc thành phần liên thông nên không phải
dữ liệu OSM nguyên bản. Quá trình chuẩn hóa tiếp theo loại hai cạnh tự nối, gộp
các cạnh song song cùng cặp có thứ tự và gán mã ổn định, tạo \(G_{\text{real}}\)
có 4.699 cạnh. Tọa độ nút, chiều dài cạnh, loại đường, tên đường và thông tin
nút đèn tín hiệu có nguồn từ OSM. Ngược lại, tốc độ thông thoáng không lấy từ
trường giới hạn tốc độ của OSM; nó được gán theo bảng cấu hình của nhóm.

Quá trình rút gọn giúp đồ thị phù hợp với thuật toán tìm kiếm, nhưng làm mất một
số thông tin gốc như mã OSM, hình học đường, số làn, hạn chế tiếp cận, hạn chế rẽ
và các lựa chọn đường song song đã bị gộp. Vì vậy \(G_{\text{real}}\) nên được
mô tả là đồ thị có hướng đã xử lý từ OSM, không phải dữ liệu OSM nguyên bản.

### d.3.3. TomTom và hồ sơ giao thông hỗn hợp

Đề tài có bốn bản trích xuất TomTom chỉ lưu các trường đã chọn, mỗi bản gồm 40
bản ghi hợp lệ. Dữ liệu chỉ giữ tọa độ truy vấn, tốc độ hiện tại, tốc độ thông
thoáng, phân hạng chức năng của đường và thời điểm bắt đầu đợt thu thập; đây
không phải bản sao đầy đủ của phản hồi API.

Bốn mươi điểm truy vấn được chọn ngoại tuyến từ các cạnh đường chính của
\(G_{\text{real}}\): các cạnh được sắp giảm dần theo chiều dài, lấy tọa độ nút
đầu và loại trùng theo lưới tọa độ làm tròn ba chữ số. Vì vậy, tọa độ được lưu là
điểm gửi truy vấn, không phải tọa độ đoạn đường do TomTom trả về.

Bốn đợt được ghi nhận như sau:

| Khung giờ đại diện | Thời điểm bắt đầu đợt thu thập được lưu | Số bản ghi |
|---|---:|---:|
| 07:30 | 2026-07-27 07:40:03 | 40 |
| 12:00 | 2026-07-27 12:49:57 | 40 |
| 17:30 | 2026-08-03 17:30:01 | 40 |
| 22:00 | 2026-08-03 22:27:52 | 40 |

Hai bản trích xuất đầu và hai bản sau được lấy vào hai ngày thứ Hai cách nhau
bảy ngày. Chúng là các quan sát đại diện theo khung giờ, không phải chuỗi thời
gian trong cùng một ngày và không phải nguồn cấp thời gian thực. Mốc thời gian
được tạo một lần cho cả đợt và không lưu múi giờ, nên không được hiểu là thời
điểm riêng của từng truy vấn.

Tỷ lệ giữa tốc độ hiện tại và tốc độ thông thoáng được chuyển thành mức ùn tắc:

| Tỷ lệ tốc độ \(r\) | Mức ùn tắc |
|---:|---:|
| \(r\geq0{,}85\) | 1 |
| \(0{,}70\leq r<0{,}85\) | 2 |
| \(0{,}55\leq r<0{,}70\) | 3 |
| \(0{,}40\leq r<0{,}55\) | 4 |
| \(r<0{,}40\) | 5 |

Sau phép quy đổi, hồ sơ chỉ lưu mức 1–5 theo cạnh. Các tốc độ TomTom không thay
thế tốc độ thông thoáng cấu hình của từng cạnh khi hệ thống tính chi phí.

Mẫu TomTom chỉ được gán cho cạnh thuộc nhóm đường chính khi nút đầu cạnh cách
điểm truy vấn gần nhất không quá 250 m. Phép gán không đối sánh theo tên đường,
phân hạng chức năng của đường, hướng chạy hoặc hình học đoạn đường. Trường phân
hạng được lưu để mô tả nhưng không tham gia phép gán hoặc hàm chi phí. Với mỗi
khung giờ, 635/4.699 cạnh \(G_{\text{real}}\), tương đương khoảng 13,51%, nhận
mức ùn tắc từ mẫu TomTom; 4.064 cạnh còn lại, tương đương 86,49%, dùng dữ liệu
dự phòng mô phỏng.

Dữ liệu dự phòng sử dụng hạt giống 42 để có thể tái lập. Ở 07:30 và 17:30, đường
primary/trunk nhận mức cơ sở 4–5, secondary nhận 3–4, tertiary nhận 2–4 và
nhóm còn lại nhận 2–3; trên mỗi cạnh, mỗi giờ cao điểm độc lập có xác suất 10%
tăng thêm một mức, tối đa 5, để mô phỏng sự cố cục bộ. Trong phần dự phòng, mức
12:00 bằng mức dự phòng 07:30 trừ 1 với sàn 1, còn mức 22:00 được sinh trong
khoảng 1–2. Vì vậy hồ sơ giao thông là dữ liệu
**TomTom kết hợp dữ liệu dự phòng mô phỏng**, không phải dữ liệu giao thông 100% thực.

Mức ùn tắc của \(G_{\text{demo}}\) không được sinh ngẫu nhiên lần nữa. Với từng
cạnh demo và từng khung giờ, mức này là trung bình mức của các cạnh
\(G_{\text{real}}\) trong hành lang, có trọng số theo thời gian thông thoáng và
được làm tròn theo quy tắc 0,5 làm tròn lên về số nguyên 1–5. Nhờ đó hai tầng đồ
thị có dữ liệu giao thông nhất quán với nhau.

### d.3.4. Dữ liệu rủi ro

Mô hình có năm vùng ngập và ba vùng thi công. Tâm và bán kính trong bảng dưới
là hình học mô hình do nhóm đặt. Các nguồn công khai chỉ ghi nhận bối cảnh lịch
sử của tuyến hoặc khu vực; chúng không xác nhận chính xác tâm, bán kính, mức phạt
hay tình trạng hiện tại.

| Loại | Khu vực; tâm (vĩ độ; kinh độ); bán kính mô hình | Nguồn bối cảnh lịch sử |
|---|---|---|
| Ngập | Nguyễn Hữu Cảnh; (10,7925; 106,7190); 400 m | [Công báo TP.HCM, Quyết định 6261/QĐ-UBND](https://congbao.hochiminhcity.gov.vn/cong-bao/van-ban/quyet-dinh/so/6261-qd-ubnd/ngay/30-11-2016/tai-ve/42090) |
| Ngập | Đinh Tiên Hoàng gần Cầu Bông; (10,7955; 106,6985); 250 m | [Báo Nhân Dân](https://nhandan.vn/mua-to-trieu-cuong-gay-ngap-ung-tai-tp-ho-chi-minh-post410945.html) |
| Ngập | Cống Quỳnh gần BV Từ Dũ; (10,7680; 106,6870); 250 m | [TTXVN/Báo Tin tức, 27/05/2024](https://baotintuc.vn/xa-hoi/tp-ho-chi-minh-ngap-nang-nhieu-tuyen-duong-sau-con-mua-nhu-trut-nuoc-20240527215404154.htm) |
| Ngập | Calmette–Bến Chương Dương/Võ Văn Kiệt; (10,7648; 106,6975); 250 m | [TTXVN/Báo Tin tức, 05/11/2025](https://baotintuc.vn/anh/tp-ho-chi-minh-trieu-cuong-dang-cao-nhieu-tuyen-duong-ngap-sau-20251105181405682.htm) |
| Ngập | Trần Hưng Đạo, khu vực Bùi Viện; (10,7625; 106,6890); 300 m | [Báo Tiền Phong](https://tienphong.vn/pho-tay-bui-vien-ngap-sau-mua-lon-o-tphcm-post1793541.tpo) |
| Thi công | Lê Thánh Tôn trước chợ Bến Thành; (10,7730; 106,6990); 150 m | [VnExpress, chỉnh trang khu vực trước chợ Bến Thành](https://vnexpress.net/tp-hcm-chinh-trang-quang-truong-truoc-cho-ben-thanh-tu-thang-10-4758459.html) |
| Thi công | Hai Bà Trưng/Tân Định; (10,7890; 106,6905); 200 m | [Dân Trí, sự cố hố sụt và khắc phục](https://dantri.com.vn/thoi-su/tphcm-ho-tu-than-bat-ngo-xuat-hien-giua-duong-1380068305.htm) |
| Thi công | Võ Thị Sáu–Pasteur; (10,7860; 106,6890); 200 m | [SAWACO, thi công hạ tầng cấp nước](https://benthanh.sawaco.com.vn/tin-tuc/hoat-dong-san-xuat-kinh-doanh/thong-bao-ve-viec-gian-doan-cung-cap-nuoc-de-phuc-vu-cong-tac.-vi-tri-thi-cong-giao-lo-vo-thi-sau-pasteur-giao-lo-vo-van-tan-truong-dinh-va-198-tran-quoc-thao-thuoc-phuong-vo-thi-sau-va-phuong-9-quan-3..html) |

Trên \(G_{\text{real}}\), cờ ngập hoặc thi công được tạo khi một cạnh đi từ
ngoài vào trong vùng tròn. Nếu tuyến bắt đầu sẵn trong vùng, mô hình không cộng
phí vào vùng cho trạng thái ban đầu. Cờ đường hẹp không dùng số đo chiều rộng
thực tế mà được suy ra từ loại đường; cờ đèn tín hiệu được dẫn xuất từ nút OSM
có thẻ đèn tín hiệu. Trên \(G_{\text{demo}}\), cờ ngập, thi công hoặc đèn tín
hiệu bằng 1 nếu ít nhất một cạnh trong hành lang có cờ tương ứng; cờ đường hẹp
bằng 1 khi hơn 30% chiều dài hành lang đã được đánh dấu hẹp.

## d.4. Quy trình tạo dữ liệu

Quy trình dữ liệu được tổ chức thành bốn giai đoạn:

1. **Xây dựng \(G_{\text{real}}\).** Dữ liệu OpenStreetMap trong vùng địa lý
   được tải qua OSMnx, đơn giản hóa, giữ thành phần liên thông mạnh lớn nhất,
   loại cạnh tự nối, gộp cạnh song song, chuẩn hóa thuộc tính và bổ sung các cờ
   rủi ro.
2. **Tạo hồ sơ ùn tắc cho \(G_{\text{real}}\).** Tỷ lệ tốc độ từ bốn bản trích
   xuất TomTom được đổi thành mức ùn tắc rồi gán cho một phần cạnh đường chính.
   Những cạnh không được phủ nhận mức từ quy tắc dự phòng có hạt giống cố định.
3. **Tạo \(G_{\text{demo}}\).** 51 POI thủ công được gắn vào
   \(G_{\text{real}}\). Các đường đi có hướng giữa POI lân cận được co thành
   cạnh demo, đồng thời kế thừa chiều dài, tốc độ tương đương, loại đường chiếm
   ưu thế và cờ rủi ro.
4. **Tạo hồ sơ ùn tắc cho \(G_{\text{demo}}\) và sử dụng.** Mức ùn tắc của mỗi
   hành lang demo được tổng hợp từ hồ sơ \(G_{\text{real}}\). Khi định tuyến, hệ
   thống đọc đồ thị và hồ sơ đã lưu rồi tính trọng số cạnh cuối cùng; không gọi
   lại OpenStreetMap hoặc TomTom.

Quy trình tách bước thu thập dữ liệu khỏi bước chạy ứng dụng. Điều này giúp demo
có thể hoạt động với dữ liệu cố định và tái lập, nhưng cũng có nghĩa thông tin
giao thông không tự cập nhật theo thời gian thực.

## d.5. Khoảng cách, thời gian, ùn tắc, loại đường và rủi ro

### d.5.1. Loại đường và tốc độ mô hình

Loại đường bắt nguồn từ phân loại highway của OSM. Bảng tốc độ sau do nhóm cấu
hình để chuyển chiều dài thành thời gian thông thoáng.

| Nhóm loại đường | Tốc độ mô hình |
|---|---:|
| Motorway và motorway link | 60 km/h |
| Trunk, primary và các link tương ứng | 45 km/h |
| Secondary và secondary link | 40 km/h |
| Tertiary và tertiary link | 35 km/h |
| Unclassified, residential, road hoặc loại mặc định | 30 km/h |
| Living street, service, alley, track | 25 km/h |

Trên \(G_{\text{real}}\), tốc độ được gán trực tiếp theo bảng cấu hình. Trên
\(G_{\text{demo}}\), tốc độ tương đương được tính từ tổng chiều dài chia cho
tổng thời gian thông thoáng của hành lang; nó không được gán lại từ loại đường
chiếm ưu thế và được lưu sau khi làm tròn đến 0,1 km/h.

Dữ liệu hiện tại không có motorway nên tốc độ thực sự xuất hiện trong
\(G_{\text{real}}\) chỉ từ 25 đến 45 km/h. Phân bố cạnh theo loại đường được thể
hiện trong bảng dưới đây.

| Loại đường | \(G_{\text{real}}\) | \(G_{\text{demo}}\) |
|---|---:|---:|
| Residential | 2.220 | 27 |
| Tertiary và tertiary link | 975 | 84 |
| Primary và primary link | 985 | 121 |
| Secondary và secondary link | 478 | 66 |
| Trunk và trunk link | 33 | 0 |
| Living street | 8 | 0 |

Ở cạnh demo, loại đường là loại chiếm tổng chiều dài lớn nhất trong hành lang,
không nhất thiết mô tả từng đoạn đường con.

### d.5.2. Ý nghĩa các giá trị

- **Khoảng cách** là chiều dài đường hoặc tổng chiều dài hành lang, tính bằng mét;
  nó không phải khoảng cách thẳng giữa hai POI.
- **Thời gian thông thoáng** được suy ra từ chiều dài và tốc độ cấu hình. Giá
  trị lưu để mô tả được làm tròn 0,1 giây; phép tính chi phí sử dụng tỷ lệ chính
  xác từ chiều dài và tốc độ.
- **Ùn tắc** là mức rời rạc 1–5 theo bốn khung giờ, không phải tốc độ km/h hoặc
  xác suất. Nó làm thay đổi chi phí thời gian và cân bằng nhưng không thay đổi
  khoảng cách.
- **Loại đường** mô tả lớp đường đã chuẩn hóa. Nó được dùng để gán tốc độ và tạo
  dữ liệu dự phòng, nhưng không được cộng trực tiếp như một số hạng chi phí.
- **Rủi ro** gồm bốn cờ nhị phân. Chúng chỉ tác động đến chi phí cân bằng; không
  biểu diễn xác suất, mức độ nghiêm trọng hoặc tình trạng sự cố hiện hành.

## d.6. Đánh giá tính nhất quán nội bộ của bộ dữ liệu

Các kiểm tra cấu trúc trên bộ dữ liệu cuối cho kết quả:

- số lượng nút và cạnh khai báo khớp với dữ liệu; mã và cặp có thứ tự không trùng;
- cạnh không tự nối và mọi nút đầu–cuối đều tồn tại;
- cả hai đồ thị liên thông mạnh;
- mỗi hồ sơ phủ đúng 100% cạnh ở cả bốn khung giờ, không thiếu hoặc thừa cạnh;
- cả 298 cạnh demo có hành lang \(G_{\text{real}}\) liên tục, không rỗng;
- với mọi cặp POI, đường trên \(G_{\text{demo}}\) không vượt quá 1,8 lần khoảng
  cách của \(G_{\text{real}}\); tỷ lệ thời gian thông thoáng và chi phí cân bằng
  ở bốn khung giờ không vượt quá 1,5 lần;
- chiều dài cạnh không nhỏ hơn khoảng cách Haversine giữa hai đầu cạnh, là điều
  kiện cần cho cận dưới heuristic.

Các kiểm tra này xác nhận tính nhất quán nội bộ. Cùng với quy trình cố định và
hạt giống đã xác định, chúng hỗ trợ khả năng tái lập của bộ dữ liệu. Chúng không
chứng minh rằng mọi giá trị phản ánh chính xác trạng thái giao thông ngoài đời
tại thời điểm sử dụng.

## d.7. Các giả định mô hình hóa

Các giả định chính của nhóm được trình bày rõ để phân biệt với dữ liệu quan sát.

1. **Phạm vi địa lý:** vùng giới hạn ở trung tâm được xem là đủ để minh họa bài
   toán; các khu vực ngoài phạm vi không được mô hình hóa.
2. **Loại mạng đường:** mạng OSM dành cho xe cơ giới được dùng làm nền. Những
   hẻm nhỏ dành cho xe máy có thể không xuất hiện đầy đủ.
3. **Tính liên thông:** chỉ thành phần liên thông mạnh có hướng lớn nhất được giữ
   để mọi điểm trong bản dữ liệu đều có thể tiếp cận lẫn nhau.
4. **Trạng thái và phép chuyển:** trạng thái chỉ là nút hiện tại; mô hình không
   mang theo hướng đến, cạnh trước hoặc trạng thái rẽ.
5. **Tốc độ thông thoáng:** tốc độ theo loại đường là cấu hình đại diện, không
   phải giới hạn tốc độ pháp lý hoặc tốc độ đo riêng cho từng cạnh.
6. **Giao thông:** bốn khung giờ được xem là các bản dữ liệu đại diện và cố định
   trong một truy vấn. Cạnh không có mẫu được giả lập bằng quy tắc có hạt giống
   cố định.
7. **Đối sánh bản đồ:** một mẫu gần nút đầu cạnh trong bán kính 250 m trên nhóm
   đường chính được xem là đại diện cho cạnh.
8. **POI:** tên, loại và tọa độ đầu vào được chọn lọc thủ công; nút giao thông
   sau phép gắn được xem là đại diện cho địa điểm giao hàng.
9. **Rủi ro:** vùng ngập/thi công được mô hình bằng hình tròn và rủi ro là cờ nhị
   phân. Bốn mức phạt là độ trễ tương đương do nhóm quy ước và chưa được hiệu
   chuẩn.
10. **Đồ thị demo:** một hành lang ngắn nhất theo thời gian thông thoáng được
    xem là đủ đại diện cho kết nối giữa hai POI; tên và loại đường chiếm ưu thế
    được dùng để mô tả cả hành lang.
11. **Chi phí:** chi phí là tổng các chi phí cạnh và không thay đổi trong khi một
    truy vấn đang chạy. Không có tương tác dòng xe, hàng chờ lan ngược hoặc thời
    gian đến từng cạnh.
12. **Bài toán nhiều điểm:** chiều đi và chiều về được tính độc lập; điểm xuất
    phát cố định và hành trình mặc định không bắt buộc quay lại kho.

# j. Limitations and Future Work (Hạn chế và hướng phát triển)

## j.1. Thách thức mô hình hóa

Thách thức chính của phần dữ liệu là cân bằng ba yêu cầu: giữ được đặc trưng của
mạng đường đô thị có hướng, tạo một đồ thị đủ nhỏ để trình bày quá trình tìm kiếm,
và bảo đảm hai tầng đồ thị sử dụng cùng một cách diễn giải chi phí. Việc co một
hành lang nhiều cạnh thành một cạnh demo cần tổng hợp đúng hướng, chiều dài,
thời gian và rủi ro. Thách thức thứ hai là gắn các điểm giao thông rời rạc vào
đoạn đường khi bản dữ liệu được lưu không có hình học đoạn đường đầy đủ. Thách
thức thứ ba là chuyển các yếu tố định tính như ngập hoặc thi công thành chi phí
số mà không trình bày chúng như dữ liệu quan trắc hiện hành.

## j.2. Hạn chế của bộ dữ liệu, đồ thị và hàm chi phí

| Hạn chế hiện tại | Ảnh hưởng khoa học/kỹ thuật |
|---|---|
| Phạm vi chỉ là một vùng trung tâm và chỉ giữ thành phần liên thông mạnh lớn nhất | Bộ dữ liệu không đại diện toàn bộ mạng giao thông Thành phố Hồ Chí Minh; các thành phần bị tách khỏi thành phần này không được đánh giá |
| Chỉ có bốn đợt thu thập giao thông, mỗi đợt 40 điểm, trên hai ngày khác nhau | Không phản ánh biến thiên theo ngày, tuần, mùa, mưa hoặc sự kiện; không phải dữ liệu giao thông thời gian thực |
| 4.064/4.699 cạnh mỗi khung giờ dùng dữ liệu dự phòng mô phỏng | Kết quả thời gian/cân bằng phụ thuộc đáng kể vào quy tắc mô phỏng, đặc biệt trên đường không được TomTom phủ |
| Đối sánh giao thông chỉ dùng khoảng cách đến nút đầu cạnh trên nhóm đường chính | Có thể gán mẫu cho cạnh gần về tọa độ nhưng khác hướng hoặc khác đoạn đường |
| Các bản trích xuất TomTom chỉ lưu một số trường đã chọn, không lưu phản hồi API nguyên vẹn | Thiếu hình học, mã đoạn đường, độ tin cậy và siêu dữ liệu đầy đủ để đánh giá chất lượng từng phép gán hoặc kiểm chứng độc lập phản hồi nguồn |
| Cạnh song song bị gộp và đồ thị không giữ hạn chế rẽ | Mô hình có thể mất lựa chọn làn/nhánh song song và cho phép một chuỗi cạnh không phù hợp với luật rẽ ngoài thực tế |
| Đồ thị định tuyến không lưu hình học chi tiết của đường | Tuyến hiển thị nối hai đầu mút, không phản ánh đầy đủ độ cong và hình dạng thực tế |
| POI được nhập thủ công và gắn vào nút mạng đường | Nút đại diện có thể không trùng cổng giao/nhận hàng; năm POI hiện lệch hơn 100 m so với tọa độ đầu vào |
| Vùng ngập/thi công là hình tròn thủ công dựa trên nguồn lịch sử | Không thể xem cờ rủi ro là tình trạng hiện hành; mô hình không có mức độ nghiêm trọng, xác suất hay khoảng thời gian hiệu lực |
| Cờ đường hẹp là giá trị đại diện suy từ loại đường | Không phản ánh chiều rộng đo được; mạng đường cho phương tiện cơ giới có thể bỏ sót nhiều hẻm xe máy |
| Tốc độ, \(\gamma\) và mức phạt rủi ro là tham số cấu hình | Chi phí cân bằng có đơn vị giây tương đương nhưng chưa phải ETA đã được xác thực ngoài thực địa |
| Chi phí tĩnh và cộng theo cạnh | Không mô hình hóa ùn tắc thay đổi theo thời gian xe di chuyển, hàng chờ tại nút, độ trễ khi rẽ hoặc tương tác giữa các cạnh |
| \(G_{\text{demo}}\) co hành lang thành một cạnh với cờ nhị phân | Một tên/loại đường không mô tả mọi đoạn thành phần; nhiều lần đi vào vùng cùng loại có thể bị gộp thành một cờ |

## j.3. Hướng phát triển

Các hướng phát triển được đề xuất trực tiếp từ những hạn chế trên:

1. **Mở rộng và cập nhật dữ liệu giao thông.** Thu thập nhiều điểm hơn, cùng ngày
   và qua nhiều ngày/tuần; hỗ trợ cập nhật định kỳ hoặc thời gian thực; lưu độ
   bất định và thời gian hiệu lực cho từng quan sát.
2. **Cải thiện đối sánh bản đồ.** Giữ mã và đường hình học của đoạn TomTom/OSM,
   kết hợp khoảng cách, phương vị, hướng lưu thông, phân hạng chức năng và tên
   đường; lưu khoảng cách đối sánh cùng độ tin cậy cho từng cạnh/khung giờ.
3. **Tăng độ chi tiết của đồ thị.** Bảo toàn cạnh song song khi cần, giữ hình
   học đường và mã OSM, bổ sung hạn chế rẽ, độ trễ khi rẽ, hạn chế tiếp cận, số
   làn, thông tin đóng đường và thời gian tín hiệu.
4. **Hiệu chuẩn chi phí độc lập.** Thu thập thời gian di chuyển đầu-cuối và dữ
   liệu sự cố độc lập để ước lượng tốc độ, hệ số ùn tắc và mức phạt rủi ro; báo
   sai số hoặc khoảng tin cậy thay vì xem chi phí cân bằng là ETA.
5. **Nâng chất lượng dữ liệu rủi ro.** Thay vùng tròn thủ công bằng đa giác/đoạn
   đường có mức độ nghiêm trọng, nguồn, ngày bắt đầu–kết thúc và trạng thái hiệu
   lực; tích hợp nguồn cảnh báo ngập hoặc thi công có thẩm quyền khi khả dụng.
6. **Cải thiện POI.** Sử dụng nguồn mã hóa địa lý có thông tin xuất xứ, tọa độ
   cổng giao hàng và kiểm tra phép gắn có ghi nhận khoảng cách/độ tin cậy.
7. **Mô hình thời gian phụ thuộc hành trình.** Cập nhật chi phí theo thời điểm
   shipper dự kiến tới từng cạnh thay vì giữ một khung giờ cho toàn bộ tuyến; có
   thể bổ sung thời gian phục vụ và khung thời gian tại điểm giao.
8. **Mở rộng từ một shipper sang nhiều phương tiện.** Bổ sung sức chứa, nhiều
   kho, nhiều shipper và khung thời gian để chuyển từ bài toán thứ tự ghé hiện
   tại sang bài toán định tuyến phương tiện (VRP) hoặc VRP có khung thời gian
   (VRPTW).

Các mở rộng này giữ nguyên định hướng của đề tài: sử dụng đồ thị có hướng và
chi phí giải thích được, đồng thời tăng dần độ trung thực của dữ liệu thay vì
đánh đổi khả năng kiểm chứng và tái lập.
