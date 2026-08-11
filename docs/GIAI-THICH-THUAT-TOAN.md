# GIẢI THÍCH THUẬT TOÁN — tài liệu ôn tập & quay video

> **Cách dùng:** đây là kịch bản để MỖI THÀNH VIÊN tự giảng lại thuật toán trong video
> (yêu cầu đề 4.10a — ví dụ TỰ THIẾT KẾ, cấm chép tutorial). Ví dụ dưới đây chạy trên
> **dữ liệu thật của nhóm**, mọi bảng từng-bước được SINH TỰ ĐỘNG từ chính code
> (`python scripts/gen_teaching_doc.py`) trên graph induced 7 node. Không được
> tuyên bố GUI khớp bước/path khi GUI đang ở full G_demo hoặc một view khác. Chỉ
> xác nhận GUI parity khi GUI chọn đúng backend view `teach_7` đã được test và
> cùng cấu hình request.
> **Đừng đọc nguyên văn** — hiểu bảng, tự nói bằng lời của mình.
> ✅ **KẾT QUẢ THÍ NGHIỆM CHÍNH THỨC (2026-08-11):** tài liệu này được tái sinh
> sau chuỗi đã duyệt `validate → benchmark exp1–exp7 → calibrate γ → generator`,
> dùng graph/profile hiện hành (`tomtom+synthetic`) và seed benchmark 42. Các bảng
> chạy tay lấy trực tiếp từ view `teach_7`; số tổng hợp G_real/ATSP đọc tự động từ
> `results/exp3_benchmark.csv` và `results/exp7_tsp.csv` của cùng lượt chạy. Không
> hand-edit phần số; provenance và checksum input/output nằm trong
> `results/README.md`. Nếu graph, profile hoặc implementation thay đổi, phải chạy
> lại trọn chuỗi và cập nhật ngày/provenance trước khi tiếp tục gọi là chính thức.

## 0. Đồ thị ví dụ dùng xuyên suốt (trích từ G_demo, khu Chợ Bến Thành)

7 địa danh thật · 24 cạnh thật · khung giờ **07:30** · chế độ **cân bằng** (giây):

| Viết tắt | Địa danh |
|---|---|
| **HN** | Điểm trung chuyển Hàm Nghi |
| **MT** | Bảo tàng Mỹ thuật TP.HCM |
| **BT** | Chợ Bến Thành |
| **BX** | Bitexco Financial Tower |
| **SC** | Saigon Centre (Takashimaya) |
| **CV** | Công viên 23/9 |
| **ĐB** | Đền Bà Mariamman |

**Bài toán xuyên suốt: đi từ `BT` (Chợ Bến Thành) đến `BX` (Bitexco).**
Điểm thú vị của cặp này: có đường trực tiếp BX→BT nhưng đó là đường **MỘT CHIỀU** —
chiều đi BT→BX không được phép, shipper phải vòng. Trên profile hiện tại, BFS tình cờ trùng tuyến tối ưu của UCS/A*, còn Greedy bị heuristic h dẫn vào tuyến đắt hơn. Cặp này minh họa rằng cùng một kết quả đúng ở một instance không biến BFS thành thuật toán tối ưu trên đồ thị có trọng số.

Trọng số cạnh = `t_free × f_cong + penalty` (SCHEMA §D, γ=1,5):

| Cạnh | Đường | dài (m) | ùn tắc | penalty | **w (s)** | 1 chiều |
|---|---|---|---|---|---|---|
| BT → MT | Lê Lai | 858 | 4 | | **176** |  |
| BT → SC | Lê Lợi | 1018 | 4 | 90·lô-cốt | **304** |  |
| BT → ĐB | Lê Lai | 978 | 4 | | **195** |  |
| BX → BT | Công trường Quách Thị Trang | 889 | 3 | | **137** | ✔ |
| BX → HN | Hàm Nghi | 556 | 3 | | **90** |  |
| BX → SC | Hồ Tùng Mậu | 723 | 3 | 90·lô-cốt | **227** |  |
| BX → ĐB | Công trường Quách Thị Trang | 1073 | 3 | | **161** |  |
| CV → ĐB | Phạm Ngũ Lão | 178 | 4 | | **34** |  |
| HN → BX | Nguyễn Công Trứ | 751 | 3 | | **135** |  |
| HN → MT | Lê Công Kiều | 184 | 2 | | **30** |  |
| MT → BT | Lê Thị Hồng Gấm | 611 | 3 | | **105** |  |
| MT → BX | Hàm Nghi | 809 | 3 | | **124** | ✔ |
| MT → HN | Lê Công Kiều | 184 | 2 | | **30** |  |
| MT → SC | Lê Thị Hồng Gấm | 759 | 3 | 90·lô-cốt | **223** | ✔ |
| MT → ĐB | Trần Hưng Đạo | 795 | 4 | | **155** |  |
| SC → BT | Công trường Quách Thị Trang | 649 | 3 | | **99** |  |
| SC → BX | Huỳnh Thúc Kháng | 620 | 3 | | **123** |  |
| SC → HN | Nam Kỳ Khởi Nghĩa | 315 | 3 | | **52** | ✔ |
| SC → ĐB | Công trường Quách Thị Trang | 832 | 3 | | **123** |  |
| ĐB → BT | Trần Hưng Đạo | 547 | 4 | | **100** |  |
| ĐB → BX | Hàm Nghi | 1227 | 3 | | **181** |  |
| ĐB → CV | Phạm Ngũ Lão | 178 | 3 | | **28** |  |
| ĐB → MT | Lê Thị Hồng Gấm | 540 | 3 | | **92** |  |
| ĐB → SC | Trần Hưng Đạo | 716 | 4 | 90·lô-cốt | **230** |  |

*(Mọi số giây trong tài liệu đã làm tròn về nguyên cho dễ đọc — cộng tay có thể
lệch ±1 s so với tổng chính xác; app và test tính bằng số lẻ đầy đủ.)*

Heuristic tới đích BX: `h(n) = haversine(n, BX) / v_max`, với
v_max = **43 km/h** — tốc độ lớn nhất có thật trong view `teach_7`
(không đoán quá ⇒ admissible, chứng minh trong `docs/HEURISTIC-PROOF.md`):

| Node | haversine → BX (m) | **h (s)** |
|---|---|---|
| BT — Chợ Bến Thành | 695 | 59 |
| BX — Bitexco Financial Tower | 0 | 0 |
| CV — Công viên 23/9 | 1054 | 89 |
| HN — Điểm trung chuyển Hàm Nghi | 358 | 30 |
| MT — Bảo tàng Mỹ thuật TP.HCM | 527 | 44 |
| SC — Saigon Centre (Takashimaya) | 412 | 35 |
| ĐB — Đền Bà Mariamman | 877 | 74 |

---

## 1. BFS — tìm theo bề rộng

**Ý tưởng (5 dòng):** loang từng "vành" từ điểm xuất phát: thăm mọi node cách 1 cạnh,
rồi 2 cạnh, rồi 3 cạnh… bằng hàng đợi FIFO. Tìm ra đường **ít cạnh nhất**. KHÔNG nhìn
trọng số — với đồ thị giao thông (cạnh nặng nhẹ khác nhau) nên "ít đoạn" ≠ "nhanh".
Complete ✔ (đồ thị hữu hạn). Tối ưu ✘ trên đồ thị có trọng số (chỉ tối ưu khi mọi cạnh
bằng nhau).

```text
BFS(start, goal):
  queue ← [start]; visited ← {start}
  lặp: node ← queue.popleft()            # expand
       nếu node = goal: dừng, lần vết parent
       với mỗi láng giềng chưa visited: đánh dấu, parent, đẩy vào CUỐI queue
```

| Bước | Expand | Frontier sau bước (open list) |
|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} |
| 2 | **MT** | {HN, BX, SC, ĐB} |
| 3 | **SC** | {HN, BX, ĐB} |
| 4 | **ĐB** | {HN, BX, CV} |
| 5 | **HN** | {BX, CV} |
| 6 | **BX** | {CV} |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 6 lần expand · frontier tối đa 4.
**Nói trong video:** BFS chọn `BT → MT → BX` vì ít cạnh nhất và trên instance hiện tại **tình cờ trùng** tuyến tối ưu của UCS (**300 s**). Không được suy rộng thành guarantee: BFS vẫn chỉ tối ưu số cạnh và không đọc trọng số.

---

## 2. DFS — tìm theo chiều sâu

**Ý tưởng:** lao sâu hết mức theo một nhánh (stack LIFO), cụt đường mới quay lui.
Thứ tự láng giềng cố định theo id cạnh nên kết quả tái lập được. Complete ✔ nhờ có
visited (đồ thị hữu hạn). Tối ưu ✘ — trả về đường ĐẦU TIÊN chạm đích, có thể rất xấu.

| Bước | Expand | Frontier sau bước (open list) |
|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} |
| 2 | **MT** | {HN, BX, SC, ĐB} |
| 3 | **HN** | {BX, SC, ĐB} |
| 4 | **BX** | {SC, ĐB} |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 4 lần expand · frontier tối đa 4.

---

## 3. IDDFS — đào sâu dần

**Ý tưởng:** chạy DFS có giới hạn độ sâu d = 0, 1, 2, … tăng dần tới khi chạm đích —
được độ nông của BFS với bộ nhớ của DFS, đổi lại phải chạy lại từ đầu mỗi vòng
(cột "Giới hạn d" trong bảng; số expand CỘNG DỒN qua các vòng). Implementation
chỉ complete khi lời giải có độ sâu không vượt cap 100; chạm cap mà chưa thấy
lời giải thì không được tuyên bố complete.
Tối ưu ✘ trên đồ thị trọng số (nông nhất theo SỐ CẠNH, như BFS).

| Bước | Expand | Giới hạn d | Frontier sau bước (open list) |
|---|---|---|---|
| 1 | **BT** | 0 | ∅ |
| 2 | **BT** | 1 | {MT, SC, ĐB} |
| 3 | **MT** | 1 | {SC, ĐB} |
| 4 | **SC** | 1 | {ĐB} |
| 5 | **ĐB** | 1 | ∅ |
| 6 | **BT** | 2 | {MT, SC, ĐB} |
| 7 | **MT** | 2 | {HN, BX, SC, ĐB} |
| 8 | **HN** | 2 | {BX, SC, ĐB} |
| 9 | **BX** | 2 | {SC, ĐB} |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 9 lần expand · frontier tối đa 4.
**Nói trong video:** so số expand với BFS (9 so với
6) — cái giá của việc chạy lại; trên G_real chênh lệch
lên tới hàng trăm lần (xem benchmark exp3).

---

## 4. UCS — Uniform-Cost Search

**Ý tưởng:** luôn expand node có **g nhỏ nhất** (chi phí tích luỹ từ BT) bằng hàng đợi
ưu tiên — "vành" lan theo CHI PHÍ chứ không theo số cạnh. Dừng khi POP đích (lúc đó
g(đích) đã tối ưu). Complete ✔ · Tối ưu ✔ (mọi w > 0).

| Bước | Expand | Frontier sau bước (open list) | g |
|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 |
| 2 | **MT** | {HN, BX, SC, ĐB} | BX=300, HN=206, SC=304, ĐB=195 |
| 3 | **ĐB** | {HN, BX, SC, CV} | BX=300, CV=223, HN=206, SC=304 |
| 4 | **HN** | {BX, SC, CV} | BX=300, CV=223, SC=304 |
| 5 | **CV** | {BX, SC} | BX=300, SC=304 |
| 6 | **BX** | {SC} | SC=304 |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 6 lần expand · frontier tối đa 4.

---

## 5. A*

**Ý tưởng:** như UCS nhưng xếp hàng theo **f = g + h**, với h là "linh cảm có căn cứ"
(thời gian bay thẳng ở tốc độ tối đa — không bao giờ đoán QUÁ). h admissible +
consistent ⇒ vẫn tối ưu như UCS nhưng **định hướng về đích, expand ít hơn**.
Tie-break: f bằng nhau → h nhỏ hơn trước. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 2 | **MT** | {HN, BX, SC, ĐB} | BX=300, HN=206, SC=304, ĐB=195 | BX=0, HN=30, SC=35, ĐB=74 | BX=300, HN=236, SC=339, ĐB=269 |
| 3 | **HN** | {BX, SC, ĐB} | BX=300, SC=304, ĐB=195 | BX=0, SC=35, ĐB=74 | BX=300, SC=339, ĐB=269 |
| 4 | **ĐB** | {BX, SC, CV} | BX=300, CV=223, SC=304 | BX=0, CV=89, SC=35 | BX=300, CV=312, SC=339 |
| 5 | **BX** | {SC, CV} | CV=223, SC=304 | CV=89, SC=35 | CV=312, SC=339 |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 5 lần expand · frontier tối đa 4.
**Nói trong video:** (1) chỉ vào cột f — node hướng về BX có f nhỏ nên được ưu tiên;
khi hai node cùng f, A* chọn node có h nhỏ hơn (luật tie-break của nhóm); (2) đồ thị
7 node quá bé để thấy A* tiết kiệm expand (5 so với
6 của UCS) — trên G_real 200 cặp, A* expand trung bình
**721** so với **1 227** của UCS, tức tiết kiệm
~41% nhờ heuristic định hướng (số đọc tự động từ
results/exp3_benchmark.csv mỗi lần tái sinh tài liệu này).

---

## 6. Greedy Best-First

**Ý tưởng:** chỉ nhìn **h** — cứ node nào "cảm giác gần đích" là lao tới, quên sạch
chi phí đã đi. Nhanh, ít expand, nhưng dễ bị đường một chiều/kẹt xe lừa.
Complete ✔ (có visited) · Tối ưu ✘.

| Bước | Expand | Frontier sau bước (open list) | h |
|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=44, SC=35, ĐB=74 |
| 2 | **SC** | {HN, MT, BX, ĐB} | BX=0, HN=30, MT=44, ĐB=74 |
| 3 | **BX** | {HN, MT, ĐB} | HN=30, MT=44, ĐB=74 |

**Kết quả:** `BT → SC → BX` · chi phí **427 s** · 1.64 km · 3 lần expand · frontier tối đa 4.
**Nói trong video:** Greedy đắt hơn tối ưu **+127 s (+42%)**
trên cùng cặp BT→BX. Khác BFS (lần này tình cờ trùng tối ưu), Greedy chỉ tin h và quên g đã trả.
A* cũng dùng h nhưng CÓ g nên không bị.

---

## 7. Dijkstra hai chiều

**Ý tưởng:** chạy ĐỒNG THỜI hai tìm kiếm theo chi phí g — xuôi từ BT và ngược từ BX (trên đồ thị đảo
chiều cạnh, vì đường một chiều!). Mỗi bước expand phía có chi phí đỉnh nhỏ hơn (cột
"Phía"). Khi hai vùng chạm nhau và `top_xuôi + top_ngược ≥ μ` (μ = chi phí gặp tốt
nhất đã thấy) thì dừng — tối ưu như UCS. Hai phía có thể xét ít node hơn trên
instance thuận lợi, nhưng worst-case không tốt hơn UCS vô điều kiện. Node nằm
trong cả 2 frontier hiển thị g nhỏ hơn. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Phía | Frontier sau bước (open list) | g |
|---|---|---|---|---|
| 1 | **BT** | xuôi | {MT, BX, SC, ĐB} | BX=0, MT=176, SC=304, ĐB=195 |
| 2 | **BX** | ngược | {HN, MT, SC, ĐB} | HN=135, MT=124, SC=123, ĐB=181 |
| 3 | **SC** | ngược | {HN, MT, BT, SC, ĐB} | BT=427, HN=135, MT=124, SC=304, ĐB=181 |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 3 lần expand · frontier tối đa 5.

---

## 8. IDA*

**Ý tưởng:** phiên bản tiết kiệm bộ nhớ của A*: duyệt sâu nhưng CẮT mọi nhánh có
f = g + h vượt ngưỡng; hết vòng thì nới ngưỡng lên `max(f nhỏ nhất bị cắt, ngưỡng + ε)`.
Mặc định **ε = 5 m** ở mode distance và **5 s** ở time/balanced. Nếu tìm thấy trước
cap 1.000 vòng, nghiệm nằm trong `C* + ε` (ghi `epsilon_bound`); nếu chạm cap thì
không được tuyên bố complete hay guarantee đó. Implementation dùng explicit stack
đang chờ `Q` cùng các map `best_g`, `parent`, `h_of`, nên space được mô tả theo code
là `O(V + Q)`, không phải bound đệ quy textbook `O(bd)`.

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 2 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 3 | **MT** | {HN, BX, SC, ĐB} | BX=300, HN=206, SC=304, ĐB=195 | BX=0, HN=30, SC=35, ĐB=74 | BX=300, HN=236, SC=339, ĐB=269 |
| 4 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 5 | **MT** | {HN, BX, SC, ĐB} | BX=300, HN=206, SC=304, ĐB=195 | BX=0, HN=30, SC=35, ĐB=74 | BX=300, HN=236, SC=339, ĐB=269 |
| 6 | **HN** | {BX, SC, ĐB} | BX=300, SC=304, ĐB=195 | BX=0, SC=35, ĐB=74 | BX=300, SC=339, ĐB=269 |
| 7 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 8 | **MT** | {HN, BX, SC, ĐB} | BX=300, HN=206, SC=304, ĐB=195 | BX=0, HN=30, SC=35, ĐB=74 | BX=300, HN=236, SC=339, ĐB=269 |
| 9 | **HN** | {BX, SC, ĐB} | BX=300, SC=304, ĐB=195 | BX=0, SC=35, ĐB=74 | BX=300, SC=339, ĐB=269 |
| 10 | **ĐB** | {BX, SC, CV} | BX=376, CV=223, SC=425 | BX=0, CV=89, SC=35 | BX=376, CV=312, SC=460 |
| 11 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 12 | **MT** | {HN, BX, SC, ĐB} | BX=300, HN=206, SC=304, ĐB=195 | BX=0, HN=30, SC=35, ĐB=74 | BX=300, HN=236, SC=339, ĐB=269 |
| 13 | **HN** | {BX, SC, ĐB} | BX=300, SC=304, ĐB=195 | BX=0, SC=35, ĐB=74 | BX=300, SC=339, ĐB=269 |
| 14 | **BX** | {SC, ĐB} | SC=304, ĐB=195 | SC=35, ĐB=74 | SC=339, ĐB=269 |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 14 lần expand · frontier tối đa 6.

---

## 9. Beam Search

**Ý tưởng:** đi theo LỚP như BFS nhưng mỗi lớp chỉ GIỮ k ứng viên tốt nhất theo f —
tiết kiệm cực nhiều bộ nhớ, đổi lại có thể cắt nhầm nhánh chứa lời giải.
Complete ✘ · Tối ưu ✘.

**k = 2:**

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, ĐB} | MT=176, ĐB=195 | MT=44, ĐB=74 | MT=220, ĐB=269 |
| 2 | **MT** | {HN, BX} | BX=300, HN=206 | BX=0, HN=30 | BX=300, HN=236 |
| 3 | **ĐB** | {HN, BX} | BX=300, HN=206 | BX=0, HN=30 | BX=300, HN=236 |
| 4 | **HN** | ∅ | – | – | – |
| 5 | **BX** | ∅ | – | – | – |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 5 lần expand · frontier tối đa 2.

**k = 5 (mặc định G_demo):**

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=304, ĐB=195 | MT=44, SC=35, ĐB=74 | MT=220, SC=339, ĐB=269 |
| 2 | **MT** | {HN, BX} | BX=300, HN=206 | BX=0, HN=30 | BX=300, HN=236 |
| 3 | **ĐB** | {HN, BX, CV} | BX=300, CV=223, HN=206 | BX=0, CV=89, HN=30 | BX=300, CV=312, HN=236 |
| 4 | **SC** | {HN, BX, CV} | BX=300, CV=223, HN=206 | BX=0, CV=89, HN=30 | BX=300, CV=312, HN=236 |
| 5 | **HN** | ∅ | – | – | – |
| 6 | **BX** | ∅ | – | – | – |

**Kết quả:** `BT → MT → BX` · chi phí **300 s** · 1.67 km · 6 lần expand · frontier tối đa 3.

**Nói trong video:** k=2 vẫn tìm được lần này nhưng không có bảo đảm — đây là minh hoạ sống động nhất của "incomplete".

---

## 10. TSP đa điểm — ví dụ 4 điểm chạy tay

Shipper xuất phát từ **BT**, giao tại **HN, MT, SC** (không quay về). Ma trận chi phí
**bất đối xứng** (đường một chiều!) — mỗi ô là UCS giữa 2 điểm lúc 07:30:

| từ \ đến | BT | HN | MT | SC |
|---|---|---|---|---|
| **BT** | — | 206 | 176 | 304 |
| **HN** | 135 | — | 30 | 254 |
| **MT** | 105 | 30 | — | 223 |
| **SC** | 99 | 52 | 82 | — |

- Nhìn ma trận: `BT→SC = 304` nhưng `SC→BT = 99` — bất đối xứng thấy ngay.
- **Thứ tự nhập** BT → HN → MT → SC: `460 s`.
- **Nearest Neighbour** (tham lam từ BT): `BT → MT → HN → SC` = `460 s`.
- **Held-Karp** (QHĐ bitmask, tối ưu tuyệt đối): `BT → SC → HN → MT` = **`386 s`**
  — tiết kiệm 16% so thứ tự nhập.
- Trên kịch bản 10 điểm thật (benchmark exp7, số đọc tự động từ results/exp7_tsp.csv):
  tiết kiệm 42,2%, NN+2-opt cách nghiệm Held-Karp +1,6%, SA đạt đúng nghiệm Held-Karp;
  SA trung bình 5 seed = 2 584,6 ± 66,0 s.
  **Caveat bắt buộc khi nói:** việc heuristic chạm nghiệm Held-Karp (nếu xảy ra) là
  kết quả trên INSTANCE 10 điểm này (không gian nhỏ), KHÔNG phải bảo đảm tổng quát —
  NN+2-opt/SA vẫn là xấp xỉ, không có chứng minh tối ưu.

**Complexity đúng theo implementation:** Nearest Neighbour là `O(n² log n)` vì
mỗi vòng gọi `sorted(left)` trước khi chọn min. Mỗi pass 2-opt/Or-opt xét
`Θ(n²)` candidate và full re-cost mỗi candidate tốn `Θ(n)`, nên local search là
`O(Pn³)` với `P` pass, không phải bound delta-cost của một implementation khác.

**Held-Karp nói ngắn gọn trong video:** dp[S][i] = chi phí rẻ nhất xuất phát BT, thăm
đúng tập S, đứng ở i. Điền dần theo kích thước S (2^n trạng thái) — với n=4 chỉ có
8 tập chứa BT, vẽ bảng lên bảng trắng được; n=10 máy tính lo, vẫn tối ưu tuyệt đối.

---

## Phụ lục: chốt nhanh Complete / Optimal (điền vào mục g báo cáo)

| Thuật toán | Complete | Optimal | Vì sao (1 câu) |
|---|---|---|---|
| BFS | ✔ | ✘ | tối ưu SỐ CẠNH, không phải chi phí |
| DFS | ✔ (visited, hữu hạn) | ✘ | trả đường đầu tiên chạm đích |
| IDDFS | Có điều kiện | ✘ | chỉ complete nếu độ sâu lời giải ≤ cap 100 |
| UCS | ✔ | ✔ | expand theo g, w > 0 |
| A* | ✔ | ✔ | h admissible + consistent (proof) |
| Greedy | ✔ (visited) | ✘ | bỏ qua g |
| Hai chiều | ✔ | ✔ | luật dừng top_f + top_b ≥ μ |
| IDA* | Có điều kiện | ✔ trong C*+ε nếu chưa chạm cap | ε = 5 m (distance), 5 s (time/balanced); cap 1.000 vòng |
| Beam | ✘ | ✘ | cắt frontier còn k |
| Held-Karp | — | ✔ | duyệt đủ 2^n trạng thái |
| NN + 2-opt / SA | — | ✘ (xấp xỉ) | heuristic cục bộ / ngẫu nhiên |
