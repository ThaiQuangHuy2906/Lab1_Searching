# GIẢI THÍCH THUẬT TOÁN — tài liệu ôn tập & quay video

> **Cách dùng:** đây là kịch bản để MỖI THÀNH VIÊN tự giảng lại thuật toán trong video
> (yêu cầu đề 4.10a — ví dụ TỰ THIẾT KẾ, cấm chép tutorial). Ví dụ dưới đây chạy trên
> **dữ liệu thật của nhóm**, mọi bảng từng-bước được SINH TỰ ĐỘNG từ chính code
> (`python scripts/gen_teaching_doc.py`) nên khớp 100% với những gì GUI chiếu.
> **Đừng đọc nguyên văn** — hiểu bảng, tự nói bằng lời của mình.
> ⚠️ Các số BENCHMARK được trích (expand trung bình, exp7…) thuộc lượt synthetic
> 2026-07-26 — sẽ cập nhật sau lượt chạy TomTom cuối; bảng chạy tay bên dưới KHÔNG
> phụ thuộc benchmark (sinh trực tiếp từ đồ thị + thuật toán).

## 0. Đồ thị ví dụ dùng xuyên suốt (trích từ G_demo, khu Chợ Bến Thành)

7 địa danh thật · 23 cạnh thật · khung giờ **07:30** · chế độ **cân bằng** (giây):

| Viết tắt | Địa danh |
|---|---|
| **BT** | Chợ Bến Thành |
| **CV** | Công viên 23/9 |
| **ĐB** | Đền Bà Mariamman |
| **MT** | Bảo tàng Mỹ thuật TP.HCM |
| **HN** | Điểm trung chuyển Hàm Nghi |
| **BX** | Bitexco Financial Tower |
| **SC** | Saigon Centre (Takashimaya) |

**Bài toán xuyên suốt: đi từ `BT` (Chợ Bến Thành) đến `BX` (Bitexco).**
Điểm thú vị của cặp này: có đường trực tiếp BX→BT nhưng đó là đường **MỘT CHIỀU** —
chiều đi BT→BX không được phép, shipper phải vòng; và trên các tuyến vòng đó,
tuyến ÍT CẠNH NHẤT lại dính đoạn kẹt nặng — cả BFS lẫn Greedy đều sập bẫy,
chỉ nhóm thuật toán xét chi phí (UCS/Dijkstra/A*…) đi đúng.

Trọng số cạnh = `t_free × f_cong + penalty` (SCHEMA §D, γ=1,5):

| Cạnh | Đường | dài (m) | ùn tắc | penalty | **w (s)** | 1 chiều |
|---|---|---|---|---|---|---|
| BT → MT | Lê Lai | 858 | 4 | | **176** |  |
| BT → SC | Lê Lợi | 1018 | 3 | 90·lô-cốt | **266** |  |
| BT → ĐB | Lê Lai | 978 | 5 | | **229** |  |
| BX → BT | Công trường Quách Thị Trang | 889 | 4 | | **166** | ✔ |
| BX → HN | Hàm Nghi | 556 | 5 | | **128** |  |
| BX → SC | Hồ Tùng Mậu | 723 | 3 | 90·lô-cốt | **227** |  |
| BX → ĐB | Công trường Quách Thị Trang | 1073 | 4 | | **195** |  |
| CV → ĐB | Phạm Ngũ Lão | 178 | 4 | | **34** |  |
| HN → BX | Nguyễn Công Trứ | 751 | 3 | | **135** |  |
| HN → MT | Lê Công Kiều | 184 | 3 | | **39** |  |
| MT → BT | Lê Thị Hồng Gấm | 611 | 4 | | **127** |  |
| MT → HN | Lê Công Kiều | 184 | 2 | | **30** |  |
| MT → SC | Lê Thị Hồng Gấm | 759 | 3 | 90·lô-cốt | **223** | ✔ |
| MT → ĐB | Trần Hưng Đạo | 795 | 4 | | **155** |  |
| SC → BT | Công trường Quách Thị Trang | 649 | 5 | 90·lô-cốt | **232** |  |
| SC → BX | Hàm Nghi | 747 | 4 | 90·lô-cốt | **232** |  |
| SC → HN | Nam Kỳ Khởi Nghĩa | 315 | 3 | 90·lô-cốt | **142** | ✔ |
| SC → ĐB | Công trường Quách Thị Trang | 832 | 5 | 90·lô-cốt | **265** |  |
| ĐB → BT | Trần Hưng Đạo | 547 | 5 | | **118** |  |
| ĐB → BX | Hàm Nghi | 1227 | 4 | | **220** |  |
| ĐB → CV | Phạm Ngũ Lão | 178 | 5 | | **40** |  |
| ĐB → MT | Trần Hưng Đạo | 535 | 5 | | **114** |  |
| ĐB → SC | Trần Hưng Đạo | 695 | 5 | 90·lô-cốt | **249** |  |

*(Mọi số giây trong tài liệu đã làm tròn về nguyên cho dễ đọc — cộng tay có thể
lệch ±1 s so với tổng chính xác; app và test tính bằng số lẻ đầy đủ.)*

Heuristic tới đích BX: `h(n) = haversine(n, BX) / v_max`, với
v_max = **45 km/h** — tốc độ lớn nhất có thật trong G_demo
(không đoán quá ⇒ admissible, chứng minh trong `docs/HEURISTIC-PROOF.md`):

| Node | haversine → BX (m) | **h (s)** |
|---|---|---|
| BT — Chợ Bến Thành | 695 | 56 |
| BX — Bitexco Financial Tower | 0 | 0 |
| CV — Công viên 23/9 | 1054 | 84 |
| HN — Điểm trung chuyển Hàm Nghi | 358 | 29 |
| MT — Bảo tàng Mỹ thuật TP.HCM | 527 | 42 |
| SC — Saigon Centre (Takashimaya) | 412 | 33 |
| ĐB — Đền Bà Mariamman | 877 | 70 |

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
| 2 | **MT** | {HN, SC, ĐB} |
| 3 | **SC** | {HN, BX, ĐB} |
| 4 | **ĐB** | {HN, BX, CV} |
| 5 | **HN** | {BX, CV} |
| 6 | **BX** | {CV} |

**Kết quả:** `BT → SC → BX` · chi phí **498 s** · 1.76 km · 6 lần expand · frontier tối đa 3.
**Nói trong video:** BFS chọn `BT → SC → BX` vì ít cạnh
nhất — nhưng tuyến tối ưu là `BT → MT → HN → BX`
(**341 s**). BFS đắt hơn
**+157 s
(+46%)**
— "ít cạnh nhất" không phải "rẻ nhất".

---

## 2. DFS — tìm theo chiều sâu

**Ý tưởng:** lao sâu hết mức theo một nhánh (stack LIFO), cụt đường mới quay lui.
Thứ tự láng giềng cố định theo id cạnh nên kết quả tái lập được. Complete ✔ nhờ có
visited (đồ thị hữu hạn). Tối ưu ✘ — trả về đường ĐẦU TIÊN chạm đích, có thể rất xấu.

| Bước | Expand | Frontier sau bước (open list) |
|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} |
| 2 | **MT** | {HN, SC, ĐB} |
| 3 | **HN** | {BX, SC, ĐB} |
| 4 | **BX** | {SC, ĐB} |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 4 lần expand · frontier tối đa 3.

---

## 3. IDDFS — đào sâu dần

**Ý tưởng:** chạy DFS có giới hạn độ sâu d = 0, 1, 2, … tăng dần tới khi chạm đích —
được độ nông của BFS với bộ nhớ của DFS, đổi lại phải chạy lại từ đầu mỗi vòng
(cột "Giới hạn d" trong bảng; số expand CỘNG DỒN qua các vòng). Complete ✔.
Tối ưu ✘ trên đồ thị trọng số (nông nhất theo SỐ CẠNH, như BFS).

| Bước | Expand | Giới hạn d | Frontier sau bước (open list) |
|---|---|---|---|
| 1 | **BT** | 0 | ∅ |
| 2 | **BT** | 1 | ∅ |
| 3 | **MT** | 1 | {SC, ĐB} |
| 4 | **SC** | 1 | {ĐB} |
| 5 | **ĐB** | 1 | ∅ |
| 6 | **BT** | 2 | ∅ |
| 7 | **MT** | 2 | {SC, ĐB} |
| 8 | **HN** | 2 | {SC, ĐB} |
| 9 | **SC** | 2 | {SC, ĐB} |
| 10 | **ĐB** | 2 | {SC, ĐB} |
| 11 | **SC** | 2 | {ĐB} |
| 12 | **BX** | 2 | {ĐB} |

**Kết quả:** `BT → SC → BX` · chi phí **498 s** · 1.76 km · 12 lần expand · frontier tối đa 2.
**Nói trong video:** so số expand với BFS (12 so với
6) — cái giá của việc chạy lại; trên G_real chênh lệch
lên tới hàng trăm lần (xem benchmark exp3).

---

## 4. UCS — Uniform-Cost Search

**Ý tưởng:** luôn expand node có **g nhỏ nhất** (chi phí tích luỹ từ BT) bằng hàng đợi
ưu tiên — "vành" lan theo CHI PHÍ chứ không theo số cạnh. Dừng khi POP đích (lúc đó
g(đích) đã tối ưu). Complete ✔ · Tối ưu ✔ (mọi w > 0).

| Bước | Expand | Frontier sau bước (open list) | g |
|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=266, ĐB=229 |
| 2 | **MT** | {HN, SC, ĐB} | HN=206, SC=266, ĐB=229 |
| 3 | **HN** | {BX, SC, ĐB} | BX=342, SC=266, ĐB=229 |
| 4 | **ĐB** | {BX, SC, CV} | BX=342, CV=269, SC=266 |
| 5 | **SC** | {BX, CV} | BX=342, CV=269 |
| 6 | **CV** | {BX} | BX=342 |
| 7 | **BX** | ∅ | – |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 7 lần expand · frontier tối đa 3.

---

## 5. Dijkstra

**Ý tưởng:** cùng bộ máy với UCS (hàng đợi ưu tiên theo g, chứng minh tối ưu như nhau) —
khác GÓC NHÌN: Dijkstra gốc tính đường ngắn nhất từ nguồn đi **mọi nơi**, ở đây cài
bản early-exit dừng ngay khi pop đích nên hành vi trên một cặp OD trùng với UCS.
Trong báo cáo mục g sẽ bàn quan hệ này. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Frontier sau bước (open list) | g |
|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=266, ĐB=229 |
| 2 | **MT** | {HN, SC, ĐB} | HN=206, SC=266, ĐB=229 |
| 3 | **HN** | {BX, SC, ĐB} | BX=342, SC=266, ĐB=229 |
| 4 | **ĐB** | {BX, SC, CV} | BX=342, CV=269, SC=266 |
| 5 | **SC** | {BX, CV} | BX=342, CV=269 |
| 6 | **CV** | {BX} | BX=342 |
| 7 | **BX** | ∅ | – |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 7 lần expand · frontier tối đa 3.

---

## 6. A*

**Ý tưởng:** như UCS nhưng xếp hàng theo **f = g + h**, với h là "linh cảm có căn cứ"
(thời gian bay thẳng ở tốc độ tối đa — không bao giờ đoán QUÁ). h admissible +
consistent ⇒ vẫn tối ưu như UCS nhưng **định hướng về đích, expand ít hơn**.
Tie-break: f bằng nhau → h nhỏ hơn trước. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=266, ĐB=229 | MT=42, SC=33, ĐB=70 | MT=218, SC=299, ĐB=300 |
| 2 | **MT** | {HN, SC, ĐB} | HN=206, SC=266, ĐB=229 | HN=29, SC=33, ĐB=70 | HN=235, SC=299, ĐB=300 |
| 3 | **HN** | {BX, SC, ĐB} | BX=342, SC=266, ĐB=229 | BX=0, SC=33, ĐB=70 | BX=342, SC=299, ĐB=300 |
| 4 | **SC** | {BX, ĐB} | BX=342, ĐB=229 | BX=0, ĐB=70 | BX=342, ĐB=300 |
| 5 | **ĐB** | {BX, CV} | BX=342, CV=269 | BX=0, CV=84 | BX=342, CV=354 |
| 6 | **BX** | {CV} | CV=269 | CV=84 | CV=354 |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 6 lần expand · frontier tối đa 3.
**Nói trong video:** (1) chỉ vào cột f — node hướng về BX có f nhỏ nên được ưu tiên;
khi hai node cùng f, A* chọn node có h nhỏ hơn (luật tie-break của nhóm); (2) đồ thị
7 node quá bé để thấy A* tiết kiệm expand (6 so với
7 của UCS) — trên G_real 200 cặp, A* expand trung bình
**771** so với **1 226** của Dijkstra/UCS, tức tiết kiệm ~37% nhờ heuristic định hướng
(results/exp3_benchmark.csv — số của lượt synthetic, sẽ cập nhật theo lượt TomTom).

---

## 7. Greedy Best-First

**Ý tưởng:** chỉ nhìn **h** — cứ node nào "cảm giác gần đích" là lao tới, quên sạch
chi phí đã đi. Nhanh, ít expand, nhưng dễ bị đường một chiều/kẹt xe lừa.
Complete ✔ (có visited) · Tối ưu ✘.

| Bước | Expand | Frontier sau bước (open list) | h |
|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=42, SC=33, ĐB=70 |
| 2 | **SC** | {HN, MT, BX, ĐB} | BX=0, HN=29, MT=42, ĐB=70 |
| 3 | **BX** | {HN, MT, ĐB} | HN=29, MT=42, ĐB=70 |

**Kết quả:** `BT → SC → BX` · chi phí **498 s** · 1.76 km · 3 lần expand · frontier tối đa 4.
**Nói trong video:** Greedy đắt hơn tối ưu **+157 s (+46%)**
trên cùng cặp BT→BX. Cùng sập bẫy với BFS nhưng LÝ DO SAI khác nhau: BFS đếm cạnh,
Greedy tin "linh cảm" h (node nào nhìn gần BX là lao tới) mà quên sạch g đã trả.
A* cũng dùng h nhưng CÓ g nên không bị.

---

## 8. Dijkstra hai chiều

**Ý tưởng:** chạy ĐỒNG THỜI hai Dijkstra — xuôi từ BT và ngược từ BX (trên đồ thị đảo
chiều cạnh, vì đường một chiều!). Mỗi bước expand phía có chi phí đỉnh nhỏ hơn (cột
"Phía"). Khi hai vùng chạm nhau và `top_xuôi + top_ngược ≥ μ` (μ = chi phí gặp tốt
nhất đã thấy) thì dừng — tối ưu như Dijkstra nhưng hai "bong bóng" nhỏ thay vì một
bong bóng to. Node nằm trong cả 2 frontier hiển thị g nhỏ hơn. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Phía | Frontier sau bước (open list) | g |
|---|---|---|---|---|
| 1 | **BT** | xuôi | {MT, BX, SC, ĐB} | BX=0, MT=176, SC=266, ĐB=229 |
| 2 | **BX** | ngược | {HN, MT, SC, ĐB} | HN=135, MT=176, SC=232, ĐB=220 |
| 3 | **HN** | ngược | {MT, SC, ĐB} | MT=166, SC=232, ĐB=220 |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 3 lần expand · frontier tối đa 4.

---

## 9. IDA*

**Ý tưởng:** phiên bản tiết kiệm bộ nhớ của A*: duyệt sâu nhưng CẮT mọi nhánh có
f = g + h vượt ngưỡng; hết vòng thì nới ngưỡng lên `max(f nhỏ nhất bị cắt, ngưỡng + ε)`
với **ε = 5 s** rồi chạy lại. Nghiệm nằm trong `C* + ε` (ghi `epsilon_bound`).
Complete ✔ · Tối ưu ✔ trong ngưỡng ε.

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | ∅ | – | – | – |
| 2 | **BT** | ∅ | – | – | – |
| 3 | **MT** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 4 | **BT** | ∅ | – | – | – |
| 5 | **MT** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 6 | **HN** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 7 | **BT** | ∅ | – | – | – |
| 8 | **MT** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 9 | **HN** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 10 | **SC** | {ĐB} | ĐB=229 | ĐB=70 | ĐB=300 |
| 11 | **BT** | ∅ | – | – | – |
| 12 | **MT** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 13 | **HN** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 14 | **SC** | {ĐB} | ĐB=229 | ĐB=70 | ĐB=300 |
| 15 | **ĐB** | ∅ | – | – | – |
| 16 | **BT** | ∅ | – | – | – |
| 17 | **MT** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 18 | **HN** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |
| 19 | **BX** | {SC, ĐB} | SC=266, ĐB=229 | SC=33, ĐB=70 | SC=299, ĐB=300 |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 19 lần expand · frontier tối đa 5.

---

## 10. Beam Search

**Ý tưởng:** đi theo LỚP như BFS nhưng mỗi lớp chỉ GIỮ k ứng viên tốt nhất theo f —
tiết kiệm cực nhiều bộ nhớ, đổi lại có thể cắt nhầm nhánh chứa lời giải.
Complete ✘ · Tối ưu ✘.

**k = 2:**

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=266, ĐB=229 | MT=42, SC=33, ĐB=70 | MT=218, SC=299, ĐB=300 |
| 2 | **MT** | {HN, SC, ĐB} | HN=206, SC=266, ĐB=332 | HN=29, SC=33, ĐB=70 | HN=235, SC=299, ĐB=402 |
| 3 | **SC** | {HN, BX, ĐB} | BX=498, HN=206, ĐB=332 | BX=0, HN=29, ĐB=70 | BX=498, HN=235, ĐB=402 |
| 4 | **HN** | {BX, ĐB} | BX=342, ĐB=332 | BX=0, ĐB=70 | BX=342, ĐB=402 |
| 5 | **ĐB** | {BX, CV} | BX=342, CV=372 | BX=0, CV=84 | BX=342, CV=456 |
| 6 | **BX** | {CV} | CV=372 | CV=84 | CV=456 |

**Kết quả:** `BT → MT → HN → BX` · chi phí **341 s** · 1.79 km · 6 lần expand · frontier tối đa 2.

**k = 5 (mặc định G_demo):**

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {MT, SC, ĐB} | MT=176, SC=266, ĐB=229 | MT=42, SC=33, ĐB=70 | MT=218, SC=299, ĐB=300 |
| 2 | **MT** | {HN, SC, ĐB} | HN=206, SC=266, ĐB=229 | HN=29, SC=33, ĐB=70 | HN=235, SC=299, ĐB=300 |
| 3 | **SC** | {HN, BX, ĐB} | BX=498, HN=206, ĐB=229 | BX=0, HN=29, ĐB=70 | BX=498, HN=235, ĐB=300 |
| 4 | **ĐB** | {HN, BX, CV} | BX=449, CV=269, HN=206 | BX=0, CV=84, HN=29 | BX=449, CV=354, HN=235 |
| 5 | **HN** | {BX, CV} | BX=449, CV=269 | BX=0, CV=84 | BX=449, CV=354 |
| 6 | **CV** | {BX} | BX=449 | BX=0 | BX=449 |
| 7 | **BX** | ∅ | – | – | – |

**Kết quả:** `BT → ĐB → BX` · chi phí **449 s** · 2.21 km · 7 lần expand · frontier tối đa 3.
**Nghịch lý đáng giảng:** k=5 (449 s) TỆ HƠN k=2
(341 s)! Lý do nằm ở luật "đã vào beam là chốt":
k rộng đưa BX vào beam SỚM qua đường xấu rồi không bao giờ xét lại đường
rẻ hơn; k hẹp CẮT BX khỏi beam, vòng sau nó vào lại bằng đường tốt hơn.
Beam KHÔNG đơn điệu theo k — tăng k không hứa hẹn kết quả tốt hơn.
**Nói trong video:** k=2 vẫn tìm được lần này nhưng không có bảo đảm — đây là minh hoạ sống động nhất của "incomplete" (và ô kết quả 2 mức k ở trên cho thấy thêm: kết quả không đơn điệu theo k).

---

## 11. TSP đa điểm — ví dụ 4 điểm chạy tay

Shipper xuất phát từ **BT**, giao tại **HN, MT, SC** (không quay về). Ma trận chi phí
**bất đối xứng** (đường một chiều!) — mỗi ô là Dijkstra giữa 2 điểm lúc 07:30:

| từ \ đến | BT | HN | MT | SC |
|---|---|---|---|---|
| **BT** | — | 206 | 176 | 266 |
| **HN** | 166 | — | 39 | 262 |
| **MT** | 127 | 30 | — | 223 |
| **SC** | 232 | 142 | 181 | — |

- Nhìn ma trận: `BT→SC = 266` nhưng `SC→BT = 232` — bất đối xứng thấy ngay.
- **Thứ tự nhập** BT → HN → MT → SC: `468 s`.
- **Nearest Neighbour** (tham lam từ BT): `BT → MT → HN → SC` = `468 s`.
- **Held-Karp** (QHĐ bitmask, tối ưu tuyệt đối): `BT → SC → HN → MT` = **`447 s`**
  — tiết kiệm 5% so thứ tự nhập.
- Trên kịch bản 10 điểm thật (benchmark exp7): tiết kiệm 53,6%, NN+2-opt và SA
  đều đạt đúng nghiệm Held-Karp; SA trung bình 5 seed = 3 564,6 ± 9,7 s.

**Held-Karp nói ngắn gọn trong video:** dp[S][i] = chi phí rẻ nhất xuất phát BT, thăm
đúng tập S, đứng ở i. Điền dần theo kích thước S (2^n trạng thái) — với n=4 chỉ có
8 tập chứa BT, vẽ bảng lên bảng trắng được; n=10 máy tính lo, vẫn tối ưu tuyệt đối.

---

## Phụ lục: chốt nhanh Complete / Optimal (điền vào mục g báo cáo)

| Thuật toán | Complete | Optimal | Vì sao (1 câu) |
|---|---|---|---|
| BFS | ✔ | ✘ | tối ưu SỐ CẠNH, không phải chi phí |
| DFS | ✔ (visited, hữu hạn) | ✘ | trả đường đầu tiên chạm đích |
| IDDFS | ✔ | ✘ | như BFS về độ nông |
| UCS | ✔ | ✔ | expand theo g, w > 0 |
| Dijkstra | ✔ | ✔ | như UCS |
| A* | ✔ | ✔ | h admissible + consistent (proof) |
| Greedy | ✔ (visited) | ✘ | bỏ qua g |
| Hai chiều | ✔ | ✔ | luật dừng top_f + top_b ≥ μ |
| IDA* | ✔ | ✔ trong C*+ε | ngưỡng nới ε = 5 s |
| Beam | ✘ | ✘ | cắt frontier còn k |
| Held-Karp | — | ✔ | duyệt đủ 2^n trạng thái |
| NN + 2-opt / SA | — | ✘ (xấp xỉ) | heuristic cục bộ / ngẫu nhiên |
