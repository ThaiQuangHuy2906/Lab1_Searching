# ROLE C — 4 thuật toán tìm đường nâng cao + 3 thuật toán ATSP

> Tài liệu tự học cực dễ hiểu, nhưng vẫn bám đúng code và contract hiện hành.
>
> Mục tiêu: sau khi học xong, bạn không chỉ nhớ tên thuật toán mà còn có thể
> kể lại bằng lời của mình, chạy tay một ví dụ nhỏ, giải thích ưu/nhược điểm,
> đọc trace trên giao diện và trả lời câu hỏi khi bảo vệ.
>
> Đây là tài liệu viết tay dành riêng cho Role C, không phải file số liệu được
> sinh tự động. Không lấy các headline trong `results/` làm số chính thức vì
> chúng đang cũ hơn graph hiện hành.

---

## Mục lục

1. [Câu chuyện chung: bé Bắp giao bánh](#1-câu-chuyện-chung-bé-bắp-giao-bánh)
2. [Những từ phải hiểu trước](#2-những-từ-phải-hiểu-trước)
3. [Greedy Best-First Search](#3-greedy-best-first-search)
4. [Bidirectional Dijkstra](#4-bidirectional-dijkstra)
5. [IDA*](#5-ida)
6. [Beam Search](#6-beam-search)
7. [Từ tìm một đường đến giao nhiều điểm](#7-từ-tìm-một-đường-đến-giao-nhiều-điểm)
8. [Held–Karp](#8-heldkarp)
9. [Nearest Neighbor + 2-opt + Or-opt](#9-nearest-neighbor--2-opt--or-opt)
10. [Simulated Annealing](#10-simulated-annealing)
11. [Bảng so sánh tổng hợp](#11-bảng-so-sánh-tổng-hợp)
12. [Code của dự án ghép các phần như thế nào](#12-code-của-dự-án-ghép-các-phần-như-thế-nào)
13. [Câu nói ngắn khi bảo vệ](#13-câu-nói-ngắn-khi-bảo-vệ)
14. [Câu hỏi giám khảo dễ hỏi](#14-câu-hỏi-giám-khảo-dễ-hỏi)
15. [Bài tự kiểm tra](#15-bài-tự-kiểm-tra)

---

## 1. Câu chuyện chung: bé Bắp giao bánh

Hãy tưởng tượng bé Bắp có một chiếc xe đồ chơi chở bánh.

- Mỗi ngã tư là một **node**.
- Mỗi con đường nối hai ngã tư là một **edge**.
- Đi qua đường nào cũng phải trả một loại “giá”.
- Giá có thể là số mét, số giây hoặc số giây đã cộng thêm phạt rủi ro.
- Có đường một chiều: đi từ A sang B được, nhưng đi từ B về A có thể không được.

Ta vẽ một thành phố đồ chơi như sau:

```text
S = chỗ xuất phát                         G = nơi giao bánh

          2               2
    S ----------> A ----------> G
     \
      \ 1             1              10
       --------> B --------> C ----------> G
```

Có hai đường đáng chú ý:

- `S → A → G` có giá `2 + 2 = 4`.
- `S → B → C → G` có giá `1 + 1 + 10 = 12`.

Đường dưới nhìn có vẻ chạy gần đích rất nhanh, nhưng đoạn cuối lại cực đắt.
Đây sẽ là chiếc bẫy để ta hiểu Greedy.

---

## 2. Những từ phải hiểu trước

### 2.1 `g`, `h` và `f` là gì?

Hãy tưởng tượng Bắp đang đứng ở một ngã tư.

| Ký hiệu | Cách hiểu như trẻ 5 tuổi | Nghĩa kỹ thuật |
|---|---|---|
| `g(n)` | “Con đã tốn bao nhiêu để đi tới đây?” | Chi phí thật từ start tới node `n` |
| `h(n)` | “Con đoán từ đây tới đích còn bao xa?” | Heuristic ước lượng từ `n` tới goal |
| `f(n)` | “Đã tốn + còn đoán” | `f(n) = g(n) + h(n)` |

Ví dụ:

- Bắp đã tốn 3 giây để tới A: `g(A)=3`.
- Bắp đoán từ A tới đích còn 5 giây: `h(A)=5`.
- Tổng điểm dự đoán: `f(A)=3+5=8`.

### 2.2 Frontier là gì?

**Frontier** là rổ các nơi Bắp đã biết tới nhưng chưa lấy ra xem xét xong.

Ví dụ, từ S nhìn thấy A và B:

```text
Đã mở S.
Rổ frontier hiện có: [A, B].
```

### 2.3 Expanded là gì?

Một node được **expanded** khi Bắp lấy node đó ra khỏi frontier, nhìn tất cả
đường đi tiếp từ nó và cập nhật frontier.

Trong project, một bước trace được chụp **sau khi expand xong**. Vì vậy frontier
ở bước đó phải chứa các ứng viên vừa được sinh ra, nếu chúng chưa bị loại.

### 2.4 Complete và optimal khác nhau thế nào?

- **Complete**: nếu thật sự có đường, thuật toán có chắc cuối cùng sẽ tìm thấy không?
- **Optimal**: đường tìm thấy có chắc là đường rẻ nhất không?

Một thuật toán có thể:

- tìm được đường nhưng đường không tốt nhất;
- chạy nhanh nhưng đôi khi bỏ mất đường;
- hoặc luôn tìm được đường tốt nhất nhưng phải làm nhiều việc.

Không có phép màu miễn phí.

### 2.5 Ba kiểu “giá” trong project

| Mode | Giá của cạnh | Đơn vị |
|---|---|---|
| `distance` | chiều dài đường | mét |
| `time` | thời gian đi có ùn tắc | giây |
| `balanced` | thời gian + phạt ngập/lô cốt/hẻm/đèn | giây |

Điểm rất dễ nói sai:

> IDA* dùng epsilon bằng 5 **đơn vị cost**: 5 mét ở `distance`, nhưng 5 giây ở
> `time` và `balanced`.

---

# PHẦN I — BỐN THUẬT TOÁN TÌM ĐƯỜNG NÂNG CAO

## 3. Greedy Best-First Search

### 3.1 Một câu dễ nhớ

> Greedy chỉ hỏi: “Chỗ nào trông gần đích nhất?” rồi chạy tới đó.

Greedy chọn node có `h` nhỏ nhất. Nó không dùng `g` để quyết định.

### 3.2 Ví dụ “miếng bánh nhìn gần”

Với thành phố đồ chơi ở đầu bài, giả sử:

| Node | `h` — nhìn còn cách đích |
|---|---:|
| A | 2 |
| B | 1 |
| C | 0,5 |
| G | 0 |

Chạy từng bước:

1. Expand S, frontier là A và B.
2. So `h(A)=2` với `h(B)=1`, Greedy chọn B.
3. Expand B, thêm C. Frontier là A và C.
4. So `h(A)=2` với `h(C)=0,5`, Greedy chọn C.
5. Expand C, thêm G với `h(G)=0`.
6. Greedy chọn G và dừng.

Đường Greedy tìm được:

```text
S → B → C → G
cost = 1 + 1 + 10 = 12
```

Nhưng đường tốt hơn là:

```text
S → A → G
cost = 2 + 2 = 4
```

Greedy bị lừa vì nó chỉ nhìn “còn gần đích không”, không nhớ “mình đã tốn bao
nhiêu” và “đoạn đường thật tiếp theo đắt thế nào”.

### 3.3 Giả mã bằng lời rất đơn giản

```text
Bỏ start vào frontier.

Khi frontier chưa rỗng:
    Lấy node có h nhỏ nhất.
    Nếu node là goal:
        Trả về đường đi.
    Nếu chưa:
        Thêm các hàng xóm chưa thăm vào frontier.

Nếu frontier rỗng:
    Báo không tìm thấy.
```

### 3.4 Greedy khác A* ở đâu?

| Thuật toán | Dùng gì để chọn node? |
|---|---|
| Greedy | chỉ `h` |
| A* | `f = g + h` |

Trong ví dụ trên, sau khi Greedy lao tới C, nó thấy G có `h=0` và chạy ngay
vào đoạn đắt. A* còn nhìn `g`, nên có thể nhận ra đường qua G lúc đó đã tốn quá
nhiều và quay sang xét A.

### 3.5 Bảo đảm và điểm yếu

- Không bảo đảm tối ưu.
- Với graph hữu hạn và cách đánh dấu đã thăm của project, nó có thể tìm đường
  trong các trường hợp thông thường của dữ liệu hiện tại.
- Có thể expand ít node vì rất “quyết đoán”.
- Chính sự quyết đoán đó cũng khiến nó dễ chọn đường xấu.

### 3.6 Trace của Greedy trong project

Trace của Greedy:

- có `h`;
- không xuất `g`;
- không xuất `f`.

Code vẫn tính chi phí thật bên trong để dựng path và metrics, nhưng quyết định
chọn node chỉ dựa vào `h`.

### 3.7 Câu trả lời bảo vệ

> Greedy Best-First ưu tiên node có heuristic nhỏ nhất. Nó thường hướng nhanh
> về phía đích nhưng bỏ qua chi phí đã đi `g`, nên không có bảo đảm tối ưu.

---

## 4. Bidirectional Dijkstra

### 4.1 Một câu dễ nhớ

> Một bạn đi từ start, một bạn đi từ goal; hai bạn cùng tìm và gặp nhau ở giữa.

Dijkstra thường đi từ một đầu. Bidirectional Dijkstra chạy hai cuộc tìm kiếm:

- phía **forward** đi từ start trên cạnh thật;
- phía **backward** đi từ goal trên đồ thị đảo cạnh.

### 4.2 Vì sao phải dùng đồ thị đảo cạnh?

Giả sử có đường một chiều:

```text
B ─────> G
```

Từ B có thể đi tới G. Khi tìm ngược từ G, ta cần phát hiện rằng B là nơi có thể
đi vào G.

Ta tạo cạnh đảo chỉ để **tìm kiếm bằng toán**:

```text
G ─────> B     (trong reverse adjacency)
```

Điều này không có nghĩa xe thật chạy ngược chiều. Khi dựng kết quả cuối, đường
thật vẫn là `B → G`.

### 4.3 Hai chiếc rổ và biến `mu`

Thuật toán giữ:

- frontier phía trước;
- frontier phía sau;
- khoảng cách tốt nhất phía trước `g_f`;
- khoảng cách tốt nhất phía sau `g_b`;
- `mu`: giá của đường hoàn chỉnh tốt nhất đã nối được hai phía.

Lúc đầu:

```text
mu = vô cùng
```

Khi hai phía cùng biết một node `x`:

```text
ứng viên = g_f(x) + g_b(x)
mu = min(mu, ứng viên)
```

### 4.4 Ví dụ chạy tay

```text
S --2--> A --2--> B --2--> G
 \                         ^
  \--1--> C ------10-------/
```

Phía sau từ G dùng cạnh đảo, nên thấy:

- B cách G 2.
- C cách G 10.

Một diễn tiến rút gọn:

1. Forward expand S, thấy A giá 2 và C giá 1.
2. Backward expand G, thấy B giá 2 và C giá 10.
3. Forward expand C, hai phía nối được qua C với giá `1+10=11`, nên `mu=11`.
4. Forward expand A, thấy B với giá từ S là 4.
5. B đã được phía sau biết với giá 2, nên có đường giá `4+2=6`; cập nhật `mu=6`.
6. Hai đầu frontier tốt nhất không còn khả năng tạo đường dưới 6, thuật toán dừng.

Kết quả:

```text
S → A → B → G
cost = 6
```

### 4.5 Luật dừng quan trọng

Gọi:

- `top_f` là giá nhỏ nhất đang chờ ở frontier forward;
- `top_b` là giá nhỏ nhất đang chờ ở frontier backward.

Ta dừng khi:

```text
top_f + top_b >= mu
```

Vì mọi đường mới chưa xét phải tốn ít nhất `top_f + top_b`. Nếu con số đó đã
không nhỏ hơn đường tốt nhất `mu`, tìm tiếp cũng không thể thắng `mu`.

### 4.6 Giả mã bằng lời

```text
Tạo một Dijkstra từ start.
Tạo một Dijkstra từ goal trên graph đảo cạnh.
mu = vô cùng.

Lặp:
    Nhìn giá nhỏ nhất của hai frontier.
    Nếu top_forward + top_backward >= mu:
        Dừng.
    Expand phía có top nhỏ hơn.
    Relax các cạnh của phía đó.
    Nếu một node đã được cả hai phía biết:
        Cập nhật mu và điểm gặp.

Ghép nửa đường start → điểm gặp
với nửa đường điểm gặp → goal.
```

### 4.7 Bảo đảm và điểm yếu

- Tối ưu khi trọng số không âm và dùng đúng luật dừng.
- Trên đồ thị có hướng, bắt buộc tìm phía sau bằng reverse adjacency.
- Trong trường hợp tốt, hai phía chỉ phải lan một phần nhỏ hơn không gian.
- Trường hợp xấu vẫn có thể tốn gần như Dijkstra một chiều.
- Code và việc ghép path phức tạp hơn Dijkstra thường.

### 4.8 Trace của Bidirectional Dijkstra

Mỗi bước có:

- `side="forward"` hoặc `side="backward"`;
- `g`;
- frontier là hợp của hai frontier.

Giao diện dùng `side` để tô hai màu, giúp người xem thấy hai làn sóng đang lan
từ hai đầu.

### 4.9 Câu trả lời bảo vệ

> Bidirectional Dijkstra chạy Dijkstra từ start và từ goal. Vì graph có hướng,
> phía goal phải chạy trên reverse adjacency. Thuật toán giữ đường nối tốt nhất
> `mu` và dừng khi `top_f + top_b ≥ mu`, nên vẫn bảo đảm tối ưu với trọng số
> không âm.

---

## 5. IDA*

### 5.1 Một câu dễ nhớ

> IDA* giống một bé chỉ mang chiếc ba lô nhỏ: bé đi sâu theo DFS, nhưng đặt một
> “cổng điểm” `f`; quá cổng thì quay lại và mở cổng rộng hơn ở vòng sau.

IDA* là viết tắt của **Iterative Deepening A\***.

- “A*” vì nó dùng `f=g+h`.
- “Iterative Deepening” vì nó chạy nhiều vòng với ngưỡng tăng dần.

### 5.2 Ngưỡng `threshold` là gì?

Một node chỉ được đi sâu tiếp nếu:

```text
f(node) = g(node) + h(node) <= threshold
```

Nếu `f` lớn hơn threshold, node đó bị hoãn sang vòng sau.

### 5.3 Ví dụ chạy ba vòng

Dùng ví dụ nhỏ:

```text
S --2--> A --3--> G

h(S)=3
h(A)=2
h(G)=0
```

Để dễ nhìn, ví dụ đồ chơi dùng `epsilon=1`. Project thật mặc định dùng 5 đơn vị
cost.

#### Vòng 1: threshold = 3

- S: `g=0, h=3, f=3` → được đi.
- A: `g=2, h=2, f=4` → vượt ngưỡng 3, tạm dừng nhánh.
- Giá vượt nhỏ nhất là 4.

Ngưỡng vòng sau thành 4.

#### Vòng 2: threshold = 4

- S có `f=3` → được đi.
- A có `f=4` → được đi.
- G có `g=5, h=0, f=5` → vượt ngưỡng.

Ngưỡng vòng sau thành 5.

#### Vòng 3: threshold = 5

- S được đi.
- A được đi.
- G có `f=5` → được đi và tìm thấy đích.

Điểm cần thấy: S và A có thể bị expand lại ở nhiều vòng. IDA* tiết kiệm bộ nhớ
nhưng thường trả giá bằng việc làm lại công việc.

### 5.4 Epsilon trong project

Project cập nhật ngưỡng theo ý tưởng:

```text
threshold_mới =
    max(
        f nhỏ nhất đã vượt ngưỡng,
        threshold_cũ + epsilon
    )
```

Mặc định:

```text
epsilon = 5.0
```

Ý nghĩa:

- mode `distance`: epsilon là 5 mét;
- mode `time` hoặc `balanced`: epsilon là 5 giây.

Epsilon giúp ngưỡng mở nhanh hơn. Đổi lại, nghiệm được bảo đảm trong biên
`C* + epsilon` thay vì luôn khẳng định đúng bằng `C*`.

`C*` là chi phí tối ưu thật.

### 5.5 Giả mã bằng lời

```text
threshold = h(start)

Lặp qua các vòng:
    Dùng DFS từ start.
    Với mỗi node:
        Tính f = g + h.
        Nếu f vượt threshold:
            Ghi nhớ f vượt nhỏ nhất.
            Không đi sâu nhánh này.
        Nếu node là goal:
            Trả về đường đi.
        Nếu chưa:
            Đi sâu tới các hàng xóm.

    Nếu không còn node nào bị chặn:
        Kết luận không tới được goal.

    threshold =
        max(f vượt nhỏ nhất, threshold + epsilon)
```

### 5.6 Bảo đảm và safety cap

Trong project:

- nếu tìm thấy nghiệm bình thường, chi phí nằm trong `C* + epsilon`;
- nếu duyệt cạn và chứng minh không có đường, kết luận đó có cơ sở;
- nếu dừng vì chạm giới hạn an toàn `max_rounds=1000`, không được tuyên bố bảo
  đảm tối ưu cho lần chạy đó.

Đây là chỗ dễ nói sai: “IDA* luôn optimal” là câu quá mạnh đối với phiên bản
epsilon-relaxed và safety cap của project.

### 5.7 Bảo đảm và điểm yếu

- Dùng ít bộ nhớ hơn kiểu giữ một frontier lớn của A*.
- Có hướng tìm tốt nhờ `h`.
- Có thể expand lại rất nhiều node qua nhiều vòng.
- Epsilon lớn giúp bớt vòng nhưng nới biên chất lượng nghiệm.

### 5.8 Trace của IDA*

Mỗi bước có:

- `g`;
- `h`;
- `f`;
- frontier sau khi expand;
- `epsilon_bound` nằm trong metrics.

`nodes_expanded` được cộng dồn qua tất cả các vòng, kể cả node bị expand lại.

### 5.9 Câu trả lời bảo vệ

> IDA* chạy DFS nhiều vòng với ngưỡng `f=g+h`. Node vượt ngưỡng được hoãn, rồi
> ngưỡng tăng ở vòng sau. Cách này tiết kiệm bộ nhớ nhưng có thể expand lại rất
> nhiều. Bản project dùng epsilon 5 đơn vị cost nên nghiệm có biên
> `C* + epsilon` khi tìm thấy trước safety cap.

---

## 6. Beam Search

### 6.1 Một câu dễ nhớ

> Có rất nhiều bạn muốn đi tiếp, nhưng xe buýt chỉ có `k` ghế; chỉ `k` bạn có
> điểm `f` tốt nhất được lên xe.

Beam Search đi theo từng lớp. Sau khi tạo các ứng viên của lớp kế tiếp, nó chỉ
giữ lại tối đa `k` ứng viên tốt nhất theo `f=g+h`.

### 6.2 Ví dụ Beam bỏ mất đường

```text
             A   (ngõ cụt)   f=2
            /
S -------- B     (ngõ cụt)   f=3
            \
             C ---------- G  f(C)=4, nhưng C là đường duy nhất tới G
```

Giả sử `beam_width = k = 2`.

Sau khi expand S, có ba ứng viên:

| Ứng viên | `f` | Xếp hạng |
|---|---:|---:|
| A | 2 | 1 |
| B | 3 | 2 |
| C | 4 | 3 |

Xe chỉ có hai ghế nên giữ A và B, loại C.

Nhưng A và B đều là ngõ cụt. C mới là đường tới G. Vì C đã bị cắt, Beam trả:

```text
found = false
```

Nếu `k=3`, C được giữ và thuật toán có thể tìm thấy G.

### 6.3 Giả mã bằng lời

```text
Lớp hiện tại bắt đầu bằng [start].

Khi lớp hiện tại chưa rỗng:
    Expand từng node trong lớp.
    Gom các hàng xóm thành pool ứng viên.
    Nếu gặp goal:
        Trả về đường đi.
    Sắp pool theo f = g + h.
    Chỉ giữ k ứng viên tốt nhất làm lớp tiếp theo.

Nếu không còn lớp nào:
    Báo found=false.
```

### 6.4 `k` nhỏ và `k` lớn

- `k` nhỏ: ít bộ nhớ, thường nhanh, nhưng dễ cắt nhầm đường tốt.
- `k` lớn: giữ nhiều lựa chọn hơn, nhưng tốn bộ nhớ và thời gian hơn.
- Dù `k` lớn, thuật toán vẫn không có chứng minh tối ưu tổng quát.

Mặc định trong project:

| Graph | Beam width mặc định |
|---|---:|
| `demo` | 5 |
| `real` | 50 |

Người dùng có thể truyền `beam_width` khác qua params.

### 6.5 Bảo đảm và điểm yếu

- Không complete: có đường nhưng vẫn có thể trả `found=false`.
- Không optimal: tìm thấy đường cũng chưa chắc rẻ nhất.
- Kiểm soát được kích thước frontier nhờ `k`.
- Hữu ích khi không đủ tài nguyên để giữ quá nhiều ứng viên.

### 6.6 Trace của Beam

Trace chỉ hiển thị **top-k ứng viên đã được chọn** cho lớp kế tiếp:

- có `g`, `h` và `f`;
- độ dài frontier không vượt `beam_width`;
- không đưa toàn bộ raw candidate pool chưa cắt vào trace.

### 6.7 Câu trả lời bảo vệ

> Beam Search tìm theo lớp nhưng chỉ giữ top-`k` node theo `f=g+h` ở mỗi lớp.
> Nó giới hạn bộ nhớ tốt, đổi lại có thể cắt mất đường duy nhất tới đích nên
> không complete và không bảo đảm tối ưu.

---

# PHẦN II — BA THUẬT TOÁN ATSP

## 7. Từ tìm một đường đến giao nhiều điểm

### 7.1 Bài toán mới

Trước đây Bắp chỉ hỏi:

> “Từ nhà kho tới một điểm giao đi đường nào?”

Bây giờ Bắp có nhiều điểm giao A, B, C:

> “Nên ghé A, B, C theo thứ tự nào để tổng chuyến đi rẻ nhất?”

Đây là bài toán tối ưu thứ tự.

### 7.2 Vì sao là ATSP chứ không phải TSP đối xứng?

ATSP là **Asymmetric Traveling Salesperson Problem**.

“Asymmetric” nghĩa là không đối xứng:

```text
cost(A, B) có thể khác cost(B, A)
```

Nguyên nhân trong thành phố:

- đường một chiều;
- chiều đi và chiều về phải đi qua các tuyến khác nhau;
- các cạnh trên hai chiều có thể có congestion hoặc risk khác nhau.

### 7.3 Trước khi tối ưu thứ tự, phải dựng ma trận

Các thuật toán ATSP không trực tiếp đi từng cạnh đường phố. Project làm ba bước:

```text
Các điểm K, A, B, C
        |
        v
Chạy Dijkstra cho từng cặp có thứ tự
        |
        v
Ma trận cost(K,A), cost(A,K), ...
        |
        v
Tối ưu thứ tự ghé
        |
        v
Lấy lại path đã cache cho từng leg
```

“Có thứ tự” nghĩa là phải tính cả `A→B` và `B→A`.

### 7.4 Ma trận đồ chơi dùng cho cả ba thuật toán

K là kho xuất phát; A, B, C là ba điểm giao. Mỗi ô là chi phí đi từ hàng tới cột.

| Từ \ Đến | K | A | B | C |
|---|---:|---:|---:|---:|
| **K** | — | 1 | 4 | 5 |
| **A** | 8 | — | 10 | 10 |
| **B** | 4 | 1 | — | 2 |
| **C** | 3 | 1 | 2 | — |

Nhìn hai ô:

```text
K → A = 1
A → K = 8
```

Đó là bất đối xứng.

### 7.5 Có quay về kho hay không?

Project mặc định:

```text
return_to_start = false
```

Bắp xuất phát ở K, giao hết hàng rồi dừng ở điểm cuối.

Nếu `return_to_start=true`, phải cộng thêm chặng từ điểm cuối về K. Thứ tự tốt
nhất có thể thay đổi vì chi phí quay về cũng bất đối xứng.

### 7.6 Giới hạn điểm

- Tổng số điểm `k = 1 + số stops` không vượt 16.
- Riêng Held–Karp chỉ nhận tối đa 15 điểm.
- Từ 13 điểm, Held–Karp đã đáng cảnh báo vì số trạng thái tăng rất nhanh.

---

## 8. Held–Karp

### 8.1 Một câu dễ nhớ

> Held–Karp là bé cực kỳ cẩn thận: bé ghi lại lời giải tốt nhất cho từng “túi
> điểm đã ghé”, rồi ghép các túi nhỏ thành túi lớn.

Held–Karp là dynamic programming bằng bitmask. Nó cho nghiệm tối ưu tuyệt đối.

### 8.2 Trạng thái `dp[T][i]`

Ta định nghĩa:

```text
dp[T][i] =
    chi phí rẻ nhất để:
    - xuất phát từ K,
    - đã ghé đúng tập điểm T,
    - và đang đứng ở i.
```

Ví dụ:

```text
dp[{K, B, C}][C] = 6
```

Nghĩa là cách rẻ nhất xuất phát K, ghé B và C, rồi đứng ở C có giá 6.
Trong ma trận đồ chơi, đó là:

```text
K → B → C = 4 + 2 = 6
```

### 8.3 Vì sao phải nhớ cả “tập đã ghé” và “điểm đang đứng”?

Chỉ biết “đã ghé A, B” chưa đủ. Nếu đang đứng ở A thì bước tới C có giá
`A→C`; nếu đang đứng ở B thì bước tới C có giá `B→C`. Hai giá này có thể khác
nhau.

Vì vậy trạng thái phải giữ cả:

- tập điểm đã ghé;
- điểm cuối hiện tại.

### 8.4 Công thức chuyển

Muốn tính cách tốt nhất để kết thúc ở `j`:

```text
dp[T][j] =
    min qua mọi i đứng trước j:
        dp[T bỏ j][i] + cost(i, j)
```

Nói kiểu 5 tuổi:

> “Trước khi tới j, con đã đứng ở đâu? Thử tất cả chỗ có thể đứng, rồi lấy cách
> rẻ nhất.”

### 8.5 Chạy tay với ma trận đồ chơi

Điểm bắt đầu:

```text
dp[{K}][K] = 0
```

Ghé đúng một điểm:

```text
dp[{K,A}][A] = 1
dp[{K,B}][B] = 4
dp[{K,C}][C] = 5
```

Xét tập `{K,B,C}`:

```text
dp[{K,B,C}][C] = K→B→C = 4+2 = 6
dp[{K,B,C}][B] = K→C→B = 5+2 = 7
```

Bây giờ muốn ghé đủ K, A, B, C và kết thúc ở A:

```text
Cách 1: ... → B → A = 7 + 1 = 8
Cách 2: ... → C → A = 6 + 1 = 7

Chọn 7.
```

Kết quả tốt nhất khi không cần quay về kho:

```text
K → B → C → A
cost = 4 + 2 + 1 = 7
```

Nếu phải quay về K:

```text
K → B → C → A → K
cost = 4 + 2 + 1 + 8 = 15
```

### 8.6 Bitmask là gì?

Máy tính biểu diễn “tập điểm đã ghé” bằng một dãy bit.

Ví dụ với K, A, B, C:

| Bitmask | Ý nghĩa |
|---|---|
| `0001` | chỉ có K |
| `0011` | K và A |
| `0101` | K và B |
| `1101` | K, B và C |
| `1111` | đã có cả bốn điểm |

Bitmask giúp kiểm tra nhanh:

- điểm nào đã ghé;
- thêm điểm mới;
- bỏ điểm cuối để nhìn trạng thái trước đó.

### 8.7 Độ phức tạp

Held–Karp có:

```text
Thời gian: O(n² × 2ⁿ)
Bộ nhớ:    O(n × 2ⁿ)
```

`2ⁿ` tăng rất nhanh. Vì vậy Held–Karp là “chính xác nhưng đắt”.

Project giới hạn tối đa 15 điểm cho Held–Karp để tránh bùng nổ trạng thái.

### 8.8 Bảo đảm và vai trò

- Cho nghiệm tối ưu tuyệt đối trong giới hạn cho phép.
- Dùng làm ground truth để kiểm tra heuristic.
- Chậm hơn mạnh khi số điểm tăng.
- Không dùng NetworkX trong product runtime; implementation dùng cấu trúc Python.

### 8.9 Câu trả lời bảo vệ

> Held–Karp dùng dynamic programming bitmask. Trạng thái `dp[T][i]` là chi phí
> nhỏ nhất xuất phát từ start, ghé đúng tập T và kết thúc ở i. Thuật toán thử
> mọi điểm đứng trước i nên cho nghiệm tối ưu, nhưng tốn
> `O(n²·2ⁿ)` và project giới hạn 15 điểm.

---

## 9. Nearest Neighbor + 2-opt + Or-opt

Đây là một dây chuyền ba bước:

```text
Nearest Neighbor
        |
        v
      2-opt
        |
        v
      Or-opt
```

Nó nhanh hơn Held–Karp nhưng không bảo đảm tối ưu.

### 9.1 Bước 1 — Nearest Neighbor

Một câu dễ nhớ:

> Đang đứng đâu thì đi tới điểm chưa giao có giá rẻ nhất từ chỗ đó.

Với ma trận đồ chơi:

1. Từ K, gần nhất là A với giá 1.
2. Từ A, còn B và C đều giá 10; giả sử chọn B.
3. Từ B, đi C giá 2.

Tour ban đầu:

```text
K → A → B → C
cost = 1 + 10 + 2 = 13
```

Nhưng Held–Karp đã tìm được tour giá 7. Nearest Neighbor mắc bẫy:

- bước đầu K→A rất rẻ;
- sau đó rời A lại cực đắt.

Đây chính là kiểu “tham cái rẻ trước mắt”.

### 9.2 Bước 2 — 2-opt

2-opt thử chọn một đoạn trong tour rồi đảo ngược đoạn đó.

Ví dụ:

```text
K → A → B → C

Đảo đoạn A, B, C:

K → C → B → A
```

Chi phí mới:

```text
K→C + C→B + B→A
= 5 + 2 + 1
= 8
```

Tour đã tốt hơn từ 13 xuống 8.

### 9.3 Cảnh báo quan trọng: 2-opt phải an toàn cho bất đối xứng

Trong TSP đối xứng, người ta thường dùng công thức delta nhanh vì:

```text
cost(A,B) = cost(B,A)
```

Nhưng ATSP không có điều đó. Khi đảo một đoạn, mọi cạnh bên trong đoạn cũng đổi
chiều.

Ví dụ:

```text
A→B = 10
B→A = 1
```

Hai cạnh này không thể thay thế cho nhau.

Vì vậy code project làm cách an toàn:

> Tạo cả tour ứng viên rồi tính lại đúng toàn bộ chi phí theo chiều mới.

Số điểm nhỏ nên cách này chậm hơn một chút nhưng đúng.

### 9.4 Bước 3 — Or-opt

Or-opt không đảo chiều một đoạn. Nó nhấc một đoạn dài 1–3 điểm rồi đặt sang vị
trí khác, vẫn giữ nguyên thứ tự bên trong đoạn.

Từ tour ban đầu:

```text
K → A → B → C
```

Nhấc A và đặt xuống cuối:

```text
K → B → C → A
cost = 4 + 2 + 1 = 7
```

Ta đã chạm đúng nghiệm Held–Karp trong ví dụ đồ chơi.

### 9.5 Vì sao vẫn không được nói “tối ưu”?

2-opt và Or-opt chỉ chấp nhận các thay đổi cục bộ làm tour tốt lên. Có thể tồn
tại một tour tốt hơn nhưng muốn tới đó phải:

- tạm thời đi qua một tour xấu hơn;
- hoặc thay đổi nhiều điểm cùng lúc;
- hoặc dùng một kiểu nước đi mà 2-opt/Or-opt không thử.

Khi không còn nước sửa nhỏ nào tốt hơn, thuật toán có thể mắc ở **local optimum**
— tốt trong hàng xóm gần, nhưng chưa tốt nhất toàn bộ.

### 9.6 Giả mã bằng lời

```text
Tạo tour ban đầu bằng Nearest Neighbor.

Lặp khi còn cải thiện:
    Thử mọi phép đảo đoạn 2-opt.
    Tính lại đầy đủ chi phí từng tour ứng viên.
    Giữ tour tốt hơn.

    Thử dời đoạn dài 1, 2 hoặc 3 điểm bằng Or-opt.
    Tính lại đầy đủ chi phí từng tour ứng viên.
    Giữ tour tốt hơn.

Trả tour tốt nhất đã thấy.
```

### 9.7 Bảo đảm và điểm yếu

- Nhanh và dễ hiểu.
- Thường cải thiện rõ so với thứ tự nhập hoặc Nearest Neighbor thuần.
- Xử lý đúng ATSP nếu tính lại chi phí theo chiều mới.
- Không bảo đảm tối ưu tuyệt đối.
- Kết quả phụ thuộc tour khởi đầu và các nước đi cục bộ.

### 9.8 Câu trả lời bảo vệ

> Phương pháp `nn_2opt` tạo tour bằng Nearest Neighbor, rồi cải thiện bằng
> 2-opt và Or-opt. Vì ma trận bất đối xứng, khi đảo đoạn chúng em không dùng
> delta của TSP đối xứng mà tính lại đầy đủ chi phí tour ứng viên. Đây vẫn là
> heuristic nên không có bảo đảm tối ưu.

---

## 10. Simulated Annealing

### 10.1 Một câu dễ nhớ

> Lúc “nóng”, bé Bắp dám thử cả một bước hơi xấu để thoát khỏi ngõ cụt; lúc
> “nguội”, bé trở nên khó tính và chỉ thích bước tốt.

Simulated Annealing, viết tắt SA, mô phỏng quá trình kim loại nóng nguội dần.

### 10.2 Vì sao đôi lúc phải chấp nhận bước xấu?

Hãy tưởng tượng Bắp đang ở một thung lũng nhỏ:

```text
       đồi
      /   \        thung lũng tốt nhất
 ___ /     \____________
  ^
  đang mắc ở thung lũng nhỏ
```

Muốn tới thung lũng tốt hơn, đôi khi phải leo lên một đoạn đồi, tức là tạm
chấp nhận tour đắt hơn.

Local search chỉ nhận bước tốt sẽ không chịu leo. SA lúc còn nóng có thể nhận
bước xấu với một xác suất, nhờ vậy có cơ hội thoát local optimum.

### 10.3 Hai kiểu nước đi trong project

SA tạo tour hàng xóm bằng:

1. **Swap**: đổi chỗ hai điểm giao.
2. **Insert**: lấy một điểm ra rồi chèn vào vị trí khác.

Start luôn được giữ cố định ở đầu.

Ví dụ swap:

```text
K → A → B → C
        swap A và C
K → C → B → A
```

Ví dụ insert:

```text
K → A → B → C
        lấy A đặt sau C
K → B → C → A
```

### 10.4 Luật nhận tour mới

Gọi:

```text
delta = cost_mới - cost_hiện_tại
```

Nếu `delta <= 0`:

- tour mới tốt hơn hoặc bằng;
- luôn nhận.

Nếu `delta > 0`:

- tour mới xấu hơn;
- vẫn có thể nhận với xác suất:

```text
P = exp(-delta / T)
```

Trong đó `T` là nhiệt độ.

### 10.5 Hiểu xác suất như trẻ 5 tuổi

- `T` cao: Bắp đang tò mò, tour xấu hơn một chút vẫn có cơ hội được thử.
- `T` thấp: Bắp gần chốt bài, tour xấu gần như bị từ chối.
- `delta` càng lớn: bước càng xấu, xác suất nhận càng nhỏ.

### 10.6 Lịch nguội trong project

Mỗi seed bắt đầu với:

```text
T0 = 0,2 × chi phí tour ban đầu
```

Sau mỗi vòng:

```text
T = T × 0,995
```

Mỗi seed chạy:

```text
2.000 vòng
```

Project chạy năm seed:

```text
0, 1, 2, 3, 4
```

### 10.7 Seed là gì?

Seed giống như số thứ tự của một bộ bài đã được xáo sẵn.

- Cùng seed + cùng dữ liệu → cùng chuỗi “ngẫu nhiên”.
- Nhờ vậy thí nghiệm có thể chạy lại và đối chứng.
- Năm seed cho ta thấy thuật toán ổn định hay dao động nhiều.

### 10.8 Best, mean và std

Sau năm seed:

- **best**: chi phí tốt nhất trong năm lần;
- **mean**: chi phí trung bình;
- **std**: mức dao động giữa các lần.

Nếu std nhỏ, các seed thường cho kết quả gần nhau. Nếu std lớn, kết quả phụ
thuộc ngẫu nhiên mạnh hơn.

Response API trả tour tốt nhất. Phần benchmark dùng thêm best/mean/std để đánh
giá.

### 10.9 Giả mã bằng lời

```text
Tạo tour ban đầu bằng Nearest Neighbor.

Với mỗi seed 0..4:
    Đặt random theo seed.
    cur = tour ban đầu.
    best = cur.
    T = 0,2 × cost(cur).

    Lặp 2.000 lần:
        Tạo tour hàng xóm bằng swap hoặc insert.
        delta = cost(mới) - cost(cur).

        Nếu delta <= 0:
            Nhận tour mới.
        Nếu delta > 0:
            Có thể vẫn nhận với xác suất exp(-delta/T).

        Nếu cur tốt hơn best:
            Cập nhật best.

        T = T × 0,995.

Trả tour tốt nhất trong năm seed
và thống kê best/mean/std.
```

### 10.10 Bảo đảm và điểm yếu

- Có khả năng thoát local optimum tốt hơn local search chỉ đi xuống.
- Có thể tìm nghiệm rất tốt trong thời gian hữu hạn.
- Kết quả tái lập được nhờ seed cố định.
- Không bảo đảm tìm thấy nghiệm tối ưu.
- Chất lượng phụ thuộc nước đi, nhiệt độ, lịch nguội và số vòng.

### 10.11 Câu trả lời bảo vệ

> Simulated Annealing dùng swap và insert để tạo tour hàng xóm. Bước tốt luôn
> được nhận; bước xấu có thể được nhận theo `exp(-delta/T)` khi nhiệt độ còn
> cao, giúp thoát local optimum. Project chạy 2.000 vòng cho mỗi seed 0–4 và
> trả nghiệm tốt nhất, nhưng không tuyên bố tối ưu.

---

## 11. Bảng so sánh tổng hợp

### 11.1 Bốn thuật toán tìm đường

| Thuật toán | Chọn node theo | Complete? | Optimal? | Ý tưởng đổi chác |
|---|---|---|---|---|
| Greedy | `h` | Có trên graph hữu hạn với cách visited hiện tại | Không | Nhanh, nhưng dễ bị “nhìn gần” đánh lừa |
| Bidirectional Dijkstra | `g` từ hai phía | Có với trọng số không âm | Có | Code phức tạp hơn, thường giảm vùng tìm |
| IDA* | DFS trong ngưỡng `f` | Phụ thuộc việc không chạm safety cap | Trong `C*+epsilon` khi tìm thấy đúng điều kiện | Ít frontier lớn, nhưng expand lặp nhiều |
| Beam | top-`k` theo `f` mỗi lớp | Không | Không | Khống chế bộ nhớ bằng cách cắt lựa chọn |

### 11.2 Ba thuật toán ATSP

| Thuật toán | Loại | Optimal? | Điểm mạnh | Điểm yếu |
|---|---|---|---|---|
| Held–Karp | Dynamic programming exact | Có | Ground truth | `O(n²·2ⁿ)`, tối đa 15 điểm |
| NN + 2-opt + Or-opt | Heuristic cục bộ | Không | Nhanh, dễ giải thích | Có thể mắc local optimum |
| Simulated Annealing | Metaheuristic ngẫu nhiên có seed | Không | Có thể thoát local optimum | Phụ thuộc tham số và số vòng |

### 11.3 Câu thần chú chống nói nhầm

```text
Greedy: chỉ h.
BiDijkstra: hai phía + graph đảo + mu.
IDA*: DFS + ngưỡng f + epsilon.
Beam: chỉ giữ top-k.

Held-Karp: exact nhưng exponential.
NN-2opt-Or-opt: sửa tour cục bộ, phải an toàn bất đối xứng.
SA: nóng dám đi xấu, nguội dần, không bảo đảm tối ưu.
```

---

## 12. Code của dự án ghép các phần như thế nào

### 12.1 Route hai điểm

Bốn thuật toán nâng cao nằm trong
[`backend/app/search_advanced.py`](../backend/app/search_advanced.py):

- `greedy`;
- `bidijkstra`;
- `idastar`;
- `beam`.

Tất cả dùng chung contract `Trace` trong
[`docs/SCHEMA.md`](SCHEMA.md), giống các thuật toán lõi.

### 12.2 Multiroute

Ba phương pháp ATSP nằm trong [`backend/app/tsp.py`](../backend/app/tsp.py).

Luồng xử lý:

```text
start + stops
    |
    v
Kiểm tra node, trùng điểm và giới hạn số lượng
    |
    v
build_matrix bằng Dijkstra cho từng cặp có thứ tự
    |
    v
held_karp hoặc nn_2opt hoặc sa
    |
    v
order tối ưu/tốt nhất đã tìm thấy
    |
    v
Ghép path cache thành các legs
    |
    v
totals + original_order_totals + savings_pct
```

### 12.3 Response multiroute cần đọc được

- `order`: thứ tự ghé sau tối ưu.
- `legs`: từng chặng giữa hai điểm liên tiếp.
- `totals`: tổng của thứ tự mới.
- `original_order_totals`: tổng nếu đi theo đúng thứ tự nhập.
- `savings_pct`: phần trăm tiết kiệm.
- `optimal_guarantee`:
  - true với Held–Karp;
  - false với `nn_2opt` và `sa`.

Với ví dụ đồ chơi, giả sử người dùng nhập stops theo thứ tự `A, B, C`. Khi đó
thứ tự nhập ban đầu tình cờ cũng là tour Nearest Neighbor:

```text
Thứ tự nhập K→A→B→C: cost 13
Thứ tự Held-Karp:     cost 7

savings_pct = (13 - 7) / 13 × 100
            ≈ 46,2%
```

### 12.4 Test quan trọng của Role C

Đọc hai file:

- [`backend/tests/test_search_advanced.py`](../backend/tests/test_search_advanced.py)
- [`backend/tests/test_tsp.py`](../backend/tests/test_tsp.py)

Chúng kiểm tra các ý chính:

- Bidirectional Dijkstra khớp Dijkstra.
- IDA* không vượt nghiệm tối ưu quá epsilon.
- Greedy không nhận vơ bảo đảm tối ưu.
- Beam hẹp có thể thất bại nhưng response vẫn hợp lệ.
- Trace có đúng `g/h/f/side`.
- Ma trận thật sự bất đối xứng.
- Held–Karp khớp brute force trên bài nhỏ.
- NN+2-opt và SA không thể có cost thấp hơn nghiệm exact Held–Karp.
- SA lặp lại được với seed cố định.

Lệnh chạy riêng phần Role C từ repository root:

```powershell
.venv\Scripts\python.exe -m pytest backend\tests\test_search_advanced.py backend\tests\test_tsp.py -v
```

---

## 13. Câu nói ngắn khi bảo vệ

### 13.1 Greedy — khoảng 15 giây

> Greedy chỉ ưu tiên heuristic `h`, tức node nhìn gần đích nhất. Vì bỏ qua chi
> phí đã đi `g`, nó có thể expand ít nhưng chọn tuyến rất đắt, nên không bảo đảm
> tối ưu.

### 13.2 Bidirectional Dijkstra — khoảng 20 giây

> Thuật toán chạy Dijkstra từ hai phía. Chiều goal dùng reverse adjacency vì
> đường có hướng. Khi đã có đường nối tốt nhất `mu`, nó dừng lúc tổng hai khóa
> frontier nhỏ nhất không còn dưới `mu`; nhờ đó vẫn tối ưu.

### 13.3 IDA* — khoảng 20 giây

> IDA* chạy DFS lặp lại với ngưỡng `f=g+h`. Node vượt ngưỡng bị hoãn sang vòng
> sau. Nó tiết kiệm bộ nhớ nhưng expand lặp nhiều. Project tăng ngưỡng với
> epsilon 5 đơn vị mode và báo biên `C*+epsilon` khi tìm thấy trước cap.

### 13.4 Beam — khoảng 15 giây

> Beam đi theo lớp nhưng chỉ giữ top-`k` ứng viên theo `f`. Việc cắt frontier
> giúp giới hạn tài nguyên nhưng có thể cắt mất đường duy nhất, nên thuật toán
> không complete và không optimal.

### 13.5 ATSP — khoảng 20 giây

> Đây là ATSP vì ma trận chi phí bất đối xứng do đường một chiều:
> `cost(A,B)` có thể khác `cost(B,A)`. Project dựng ma trận bằng Dijkstra cho
> từng cặp có thứ tự rồi mới tối ưu thứ tự giao.

### 13.6 Held–Karp — khoảng 20 giây

> Held–Karp dùng DP bitmask `dp[T][i]` và thử mọi điểm có thể đứng trước i. Nó
> cho ground truth tối ưu, nhưng có độ phức tạp `O(n²·2ⁿ)` nên bị giới hạn 15
> điểm.

### 13.7 NN + 2-opt + Or-opt — khoảng 20 giây

> Thuật toán bắt đầu bằng điểm gần nhất rồi cải thiện tour bằng đảo và di
> chuyển đoạn. Vì ATSP bất đối xứng, mỗi tour ứng viên phải được tính lại đúng
> theo chiều mới. Đây là heuristic nên không có chứng minh tối ưu.

### 13.8 Simulated Annealing — khoảng 20 giây

> SA luôn nhận bước tốt và đôi khi nhận bước xấu khi còn nóng để thoát local
> optimum. Project dùng swap/insert, lịch nguội hình học, 2.000 vòng và năm
> seed 0–4. Nó có thể tìm nghiệm tốt nhưng không bảo đảm tối ưu.

---

## 14. Câu hỏi giám khảo dễ hỏi

### Câu 1: Greedy và A* đều dùng heuristic, sao A* tốt hơn?

A* xét cả chi phí đã đi `g` và ước lượng còn lại `h`. Greedy chỉ nhìn `h` nên
có thể chạy về phía trông gần đích nhưng đã tốn hoặc sắp tốn chi phí rất lớn.

### Câu 2: Tìm backward có phải cho xe chạy ngược đường một chiều không?

Không. Reverse adjacency chỉ là cấu trúc toán học để từ goal tìm những node có
thể đi vào goal. Path cuối vẫn dùng đúng chiều cạnh gốc.

### Câu 3: Tại sao không dừng Bidirectional Dijkstra ngay lần đầu hai phía gặp?

Điểm gặp đầu tiên chưa chắc cho đường tốt nhất. Phải giữ `mu` và chỉ dừng khi
`top_f + top_b ≥ mu`.

### Câu 4: IDA* có luôn tối ưu không?

Không nên nói như vậy cho cấu hình project. Khi tìm thấy trước cap, project bảo
đảm trong `C*+epsilon`. Nếu chạm safety cap mà chưa tìm thấy, lần chạy đó không
có bảo đảm.

### Câu 5: Epsilon bằng 5 giây đúng không?

Chỉ đúng với `time` và `balanced`. Với `distance`, epsilon là 5 mét.

### Câu 6: Beam `found=false` có phải code lỗi không?

Không nhất thiết. Beam không complete; nó có thể cắt mất đường tới goal. API
phải trả một kết quả `found=false` hợp lệ thay vì crash.

### Câu 7: Vì sao TSP của project là asymmetric?

Graph đường phố có hướng. Đường đi A→B và B→A có thể dùng các cạnh khác nhau,
nên chi phí hai chiều không bằng nhau.

### Câu 8: Vì sao 2-opt đối xứng dùng sai cho bài này?

Đảo một đoạn làm tất cả cạnh trong đoạn đổi chiều. Trong ATSP,
`cost(A,B) != cost(B,A)`, nên không thể dùng shortcut giả định hai chiều bằng
nhau; phải tính lại tour theo chiều mới.

### Câu 9: NN+2-opt hoặc SA bằng Held–Karp thì có được gọi là tối ưu không?

Chỉ được nói chúng **chạm nghiệm tối ưu trên instance đó**, vì Held–Karp làm
đối chứng. Không được suy ra chúng luôn tối ưu trên mọi instance.

### Câu 10: Vì sao Held–Karp dừng ở 15 điểm?

Vì số trạng thái tăng theo `2ⁿ`. Thêm một điểm gần như làm số tập con tăng gấp
đôi, nên thời gian và bộ nhớ tăng rất nhanh.

### Câu 11: Tại sao SA cần năm seed?

SA có bước ngẫu nhiên. Năm seed cố định vừa giúp quan sát độ dao động, vừa giúp
người khác chạy lại đúng thí nghiệm.

### Câu 12: `return_to_start=false` có nghĩa gì?

Shipper xuất phát từ start, giao hết các stop và kết thúc ở stop cuối; không
bắt buộc quay về kho. Nếu true, response có thêm leg cuối quay về start.

---

## 15. Bài tự kiểm tra

### Bài 1

Thuật toán nào chỉ dùng `h` để chọn node?

<details>
<summary>Đáp án</summary>

Greedy Best-First Search.

</details>

### Bài 2

Tại sao Bidirectional Dijkstra phải dùng graph đảo ở phía goal?

<details>
<summary>Đáp án</summary>

Để từ goal lần ngược tới những node có cạnh thật dẫn vào goal, trong khi vẫn
giữ path kết quả đúng chiều trên graph gốc.

</details>

### Bài 3

IDA* đang chạy mode `distance` với epsilon mặc định. Biên epsilon có đơn vị gì?

<details>
<summary>Đáp án</summary>

5 mét.

</details>

### Bài 4

Beam width bằng 2, nhưng đường duy nhất tới goal đứng hạng 3 trong lớp kế tiếp.
Điều gì xảy ra?

<details>
<summary>Đáp án</summary>

Ứng viên đó bị cắt. Beam có thể không tìm thấy đường và trả `found=false`.

</details>

### Bài 5

Trong ma trận đồ chơi, tính:

```text
K → B → C → A
```

<details>
<summary>Đáp án</summary>

`K→B = 4`, `B→C = 2`, `C→A = 1` nên tổng bằng 7.

</details>

### Bài 6

Vì sao Held–Karp dùng được làm ground truth?

<details>
<summary>Đáp án</summary>

Vì nó xét đầy đủ các trạng thái tập con và điểm kết thúc bằng dynamic
programming, nên tìm được chi phí tối ưu trong giới hạn số điểm hỗ trợ.

</details>

### Bài 7

SA gặp một tour mới đắt hơn tour hiện tại. Nó có luôn từ chối không?

<details>
<summary>Đáp án</summary>

Không. Khi nhiệt độ còn cao, nó có thể nhận tour xấu hơn với xác suất
`exp(-delta/T)` để thoát local optimum.

</details>

### Bài 8

NN+2-opt cho đúng cost Held–Karp trên một test. Ta được kết luận gì?

<details>
<summary>Đáp án</summary>

Chỉ kết luận heuristic đã chạm nghiệm tối ưu trên test đó. Không được kết luận
nó luôn tối ưu.

</details>

---

## 16. Checklist “tôi đã sẵn sàng”

Bạn sẵn sàng cho Role C khi có thể tự làm, không nhìn tài liệu:

- [ ] Giải thích `g`, `h`, `f` và frontier.
- [ ] Chạy tay ví dụ Greedy bị bẫy.
- [ ] Vẽ hai phía của Bidirectional Dijkstra và nói đúng luật dừng.
- [ ] Chạy ba vòng threshold của IDA*.
- [ ] Tạo ví dụ Beam cắt mất đường.
- [ ] Giải thích vì sao ma trận ATSP bất đối xứng.
- [ ] Viết được ý nghĩa `dp[T][i]` của Held–Karp.
- [ ] Phân biệt 2-opt và Or-opt.
- [ ] Giải thích vì sao 2-opt phải tính lại cost trong ATSP.
- [ ] Giải thích nhiệt độ, delta, seed, best/mean/std của SA.
- [ ] Nói đúng giới hạn 16 điểm tổng và 15 điểm cho Held–Karp.
- [ ] Không gọi Greedy, Beam, NN+2-opt hoặc SA là “luôn tối ưu”.
- [ ] Không đọc số benchmark cũ như số chính thức hiện hành.

---

## 17. Nguồn chuẩn để học tiếp

Theo thứ tự:

1. [`docs/SCHEMA.md`](SCHEMA.md) — contract trace và multiroute.
2. [`backend/app/search_advanced.py`](../backend/app/search_advanced.py) — code bốn thuật toán tìm đường.
3. [`backend/app/tsp.py`](../backend/app/tsp.py) — code ba phương pháp ATSP.
4. [`backend/tests/test_search_advanced.py`](../backend/tests/test_search_advanced.py) — bằng chứng hành vi thuật toán nâng cao.
5. [`backend/tests/test_tsp.py`](../backend/tests/test_tsp.py) — bằng chứng Held–Karp/heuristic/SA.
6. [`docs/GIAI-THICH-THUAT-TOAN.md`](GIAI-THICH-THUAT-TOAN.md) — ví dụ gắn với graph demo.

Nếu một câu trong tài liệu này mâu thuẫn với contract hiện hành, ưu tiên
`SCHEMA.md` và code/test hiện tại, rồi cập nhật lại tài liệu này.

---

## 18. Ghi chú contract đã khóa cho lượt mở rộng 2026-08-04

Phần này là chuẩn thuật ngữ cho GraphView, sandbox và ATSP trace trong
`docs/SCHEMA.md §E`. Chỉ được nói một tính năng “đã có trên GUI” sau khi backend,
frontend và regression của tính năng đó thực sự được triển khai.

### 18.1. Hai loại trace, hai câu chuyện khác nhau

- `Trace.trace` là các bước expand của **một route search**: frontier, g/h/f,
  Bidirectional side… Nó tiếp tục là contract duy nhất của mười thuật toán tìm đường.
- `OptimizationTrace` là quá trình **chọn thứ tự ghé**: DP update của Held–Karp,
  NN decision, local improvement, hay SA seed/iteration. Nó không phải frontier
  trên graph đường phố và không được trộn vào `Trace.trace`.
- Đường nét đứt của order/subset trong player chỉ là ý tưởng tối ưu; chặng xe chạy
  thật vẫn là `legs` được Dijkstra cache. Câu nói an toàn khi bảo vệ:
  “Trace này cho thấy thuật toán đổi thứ tự giao, còn các leg cuối mới là đường đi
  trên mạng đường.”

### 18.2. Cap chỉ giới hạn payload

Held–Karp và NN/local có cap 2 000 event; SA có cap 1 500 event và periodic sample
mỗi 20 iteration. `total_events` là số event eligible trước sampling,
`recorded_events` là số event gửi về; final reconstruction/summary luôn được giữ.
Cap không dừng optimizer, không đổi seed/RNG/result và không được dùng làm lý do để
nói thuật toán đã chạy ít iteration hơn. Nếu bị sampling, ordinal có thể nhảy số.

### 18.3. Không nói sai về local/global và độ phức tạp

- Held–Karp là tối ưu **toàn cục trên ma trận ATSP đã mô hình hóa**, trong giới hạn
  `n≤15` tổng điểm, với `O(n²·2ⁿ)` time và `O(n·2ⁿ)` memory.
- NN + 2-opt/Or-opt chỉ dừng ở **local optimum theo neighbourhood hiện thực**;
  nó không thành global optimum chỉ vì một test trùng cost Held–Karp. NN hiện tại
  là `O(n² log n)` vì sort candidate mỗi vòng; local search là `O(Pn³)` vì
  Θ(n²) candidate/pass × Θ(n) full re-cost.
- SA có thể thoát local optimum nhờ nhận bước xấu lúc nóng, nhưng vẫn không có
  bảo đảm global. Hiện thực chạy 5 seed × 2 000 iteration, nên mô tả cost ở mức
  `O(S·I·n)` là trung thực.
- Bidirectional Dijkstra không được quảng cáo tốt hơn Dijkstra vô điều kiện:
  worst-case cùng bậc, lợi ích thực tế phụ thuộc cấu trúc graph/điểm gặp.
- IDA* không dùng bound textbook recursive `O(bd)` cho implementation này. Nó
  giữ `best_g`, `parent`, `h_of` và explicit stack pending, nên mô tả phù hợp là
  `O(V+Q)`; guarantee `C*+ε` chỉ nói khi tìm được trước cap 1 000 round.
