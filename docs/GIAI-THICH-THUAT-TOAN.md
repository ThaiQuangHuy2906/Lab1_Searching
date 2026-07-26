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

7 địa danh thật · 16 cạnh thật · khung giờ **07:30** · chế độ **cân bằng** (giây):

| Viết tắt | Địa danh |
|---|---|
| **BT** | Chợ Bến Thành |
| **CV** | Công viên 23/9 |
| **ĐB** | Đền Bà Mariamman |
| **MT** | Bảo tàng Mỹ thuật TP.HCM |
| **HN** | Điểm trung chuyển Hàm Nghi |
| **BX** | Bitexco Financial Tower |
| **SC** | Saigon Centre (Takashimaya) |

**Bài toán xuyên suốt: đi từ `BT` (Chợ Bến Thành) đến `SC` (Saigon Centre).**
Điểm thú vị của cặp này: SC nằm ngay cạnh BT (~650 m chim bay) và có đường SC→BT,
nhưng chiều BT→SC **không có đường trực tiếp** (một chiều!) — shipper phải vòng,
và có **3 tuyến cạnh tranh** để các thuật toán "cãi nhau".

Trọng số cạnh = `t_free × f_cong + penalty` (SCHEMA §D, γ=1,5):

| Cạnh | Đường | dài (m) | ùn tắc | penalty | **w (s)** | 1 chiều |
|---|---|---|---|---|---|---|
| BT → CV | Nguyễn Thị Nghĩa | 899 | 4 | | **177** | ✔ |
| BT → HN | Hàm Nghi | 1094 | 4 | | **216** | ✔ |
| BX → HN | Hàm Nghi | 556 | 4 | | **109** |  |
| BX → SC | Hồ Tùng Mậu | 723 | 2 | 90·lô-cốt | **198** |  |
| CV → ĐB | Phạm Ngũ Lão | 178 | 3 | | **28** |  |
| HN → BX | Nguyễn Công Trứ | 751 | 3 | | **135** |  |
| HN → MT | Lê Công Kiều | 184 | 4 | | **47** |  |
| MT → BT | Lê Thị Hồng Gấm | 611 | 4 | | **127** | ✔ |
| MT → HN | Lê Công Kiều | 184 | 2 | | **30** |  |
| MT → SC | Lê Thị Hồng Gấm | 759 | 3 | 90·lô-cốt | **223** | ✔ |
| SC → BT | Công trường Quách Thị Trang | 649 | 5 | 90·lô-cốt | **232** | ✔ |
| SC → BX | Hàm Nghi | 747 | 5 | 90·lô-cốt | **257** |  |
| SC → HN | Nam Kỳ Khởi Nghĩa | 315 | 5 | 90·lô-cốt | **164** | ✔ |
| ĐB → BT | Trần Hưng Đạo | 547 | 5 | | **118** | ✔ |
| ĐB → CV | Phạm Ngũ Lão | 178 | 3 | | **28** |  |
| ĐB → MT | Trần Hưng Đạo | 535 | 5 | | **114** | ✔ |

Heuristic tới đích SC: `h(n) = haversine(n, SC) / v_max` (v_max = 60 km/h — admissible,
chứng minh trong `docs/HEURISTIC-PROOF.md`):

| Node | haversine → SC (m) | **h (s)** |
|---|---|---|
| BT — Chợ Bến Thành | 310 | 26 |
| BX — Bitexco Financial Tower | 412 | 35 |
| CV — Công viên 23/9 | 743 | 63 |
| HN — Điểm trung chuyển Hàm Nghi | 290 | 25 |
| MT — Bảo tàng Mỹ thuật TP.HCM | 296 | 25 |
| SC — Saigon Centre (Takashimaya) | 0 | 0 |
| ĐB — Đền Bà Mariamman | 570 | 49 |

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
| 1 | **BT** | {HN, CV} |
| 2 | **HN** | {MT, BX, CV} |
| 3 | **CV** | {MT, BX, ĐB} |
| 4 | **MT** | {BX, SC, ĐB} |
| 5 | **BX** | {SC, ĐB} |
| 6 | **ĐB** | {SC} |
| 7 | **SC** | ∅ |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 7 lần expand · frontier tối đa 3.
Trên cặp BT→SC này tuyến tối ưu TÌNH CỜ cũng ít cạnh nhất nên BFS trùng A* — vậy hãy
xem **phản ví dụ ngay trên cùng đồ thị: đi `BX → BT`**:

| Bước | Expand | Frontier sau bước (open list) |
|---|---|---|
| 1 | **BX** | {HN, SC} |
| 2 | **HN** | {MT, SC} |
| 3 | **SC** | {MT, BT} |
| 4 | **MT** | {BT} |
| 5 | **BT** | ∅ |

**Kết quả:** `BX → SC → BT` · chi phí **429 s** · 1.37 km · 5 lần expand · frontier tối đa 2.
**Nói trong video:** BFS chọn `BX → SC → BT` vì chỉ
2 cạnh — nhưng đoạn Quách Thị Trang lúc 07:30 kẹt mức 5/5; tuyến 3 cạnh
`BX → HN → MT → BT` chỉ tốn **283 s**.
BFS đắt hơn **+147 s
(+52%)**
— "ít cạnh nhất" không phải "rẻ nhất".

---

## 2. DFS — tìm theo chiều sâu

**Ý tưởng:** lao sâu hết mức theo một nhánh (stack LIFO), cụt đường mới quay lui.
Thứ tự láng giềng cố định theo id cạnh nên kết quả tái lập được. Complete ✔ nhờ có
visited (đồ thị hữu hạn). Tối ưu ✘ — trả về đường ĐẦU TIÊN chạm đích, có thể rất xấu.

| Bước | Expand | Frontier sau bước (open list) |
|---|---|---|
| 1 | **BT** | {HN, CV} |
| 2 | **HN** | {MT, BX, CV} |
| 3 | **MT** | {BX, SC, CV} |
| 4 | **SC** | {BX, CV} |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 4 lần expand · frontier tối đa 3.

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
| 3 | **HN** | 1 | {CV} |
| 4 | **CV** | 1 | ∅ |
| 5 | **BT** | 2 | ∅ |
| 6 | **HN** | 2 | {CV} |
| 7 | **MT** | 2 | {BX, CV} |
| 8 | **BX** | 2 | {CV} |
| 9 | **CV** | 2 | ∅ |
| 10 | **ĐB** | 2 | ∅ |
| 11 | **BT** | 3 | ∅ |
| 12 | **HN** | 3 | {CV} |
| 13 | **MT** | 3 | {BX, CV} |
| 14 | **SC** | 3 | {BX, CV} |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 14 lần expand · frontier tối đa 2.
**Nói trong video:** so số expand với BFS (14 so với
7) — cái giá của việc chạy lại; trên G_real chênh lệch
lên tới hàng trăm lần (xem benchmark exp3).

---

## 4. UCS — Uniform-Cost Search

**Ý tưởng:** luôn expand node có **g nhỏ nhất** (chi phí tích luỹ từ BT) bằng hàng đợi
ưu tiên — "vành" lan theo CHI PHÍ chứ không theo số cạnh. Dừng khi POP đích (lúc đó
g(đích) đã tối ưu). Complete ✔ · Tối ưu ✔ (mọi w > 0).

| Bước | Expand | Frontier sau bước (open list) | g |
|---|---|---|---|
| 1 | **BT** | {HN, CV} | CV=177, HN=216 |
| 2 | **CV** | {HN, ĐB} | HN=216, ĐB=205 |
| 3 | **ĐB** | {HN, MT} | HN=216, MT=319 |
| 4 | **HN** | {MT, BX} | BX=351, MT=262 |
| 5 | **MT** | {BX, SC} | BX=351, SC=486 |
| 6 | **BX** | {SC} | SC=486 |
| 7 | **SC** | ∅ | – |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 7 lần expand · frontier tối đa 2.

---

## 5. Dijkstra

**Ý tưởng:** cùng bộ máy với UCS (hàng đợi ưu tiên theo g, chứng minh tối ưu như nhau) —
khác GÓC NHÌN: Dijkstra gốc tính đường ngắn nhất từ nguồn đi **mọi nơi**, ở đây cài
bản early-exit dừng ngay khi pop đích nên hành vi trên một cặp OD trùng với UCS.
Trong báo cáo mục g sẽ bàn quan hệ này. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Frontier sau bước (open list) | g |
|---|---|---|---|
| 1 | **BT** | {HN, CV} | CV=177, HN=216 |
| 2 | **CV** | {HN, ĐB} | HN=216, ĐB=205 |
| 3 | **ĐB** | {HN, MT} | HN=216, MT=319 |
| 4 | **HN** | {MT, BX} | BX=351, MT=262 |
| 5 | **MT** | {BX, SC} | BX=351, SC=486 |
| 6 | **BX** | {SC} | SC=486 |
| 7 | **SC** | ∅ | – |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 7 lần expand · frontier tối đa 2.

---

## 6. A*

**Ý tưởng:** như UCS nhưng xếp hàng theo **f = g + h**, với h là "linh cảm có căn cứ"
(thời gian bay thẳng ở tốc độ tối đa — không bao giờ đoán QUÁ). h admissible +
consistent ⇒ vẫn tối ưu như UCS nhưng **định hướng về đích, expand ít hơn**.
Tie-break: f bằng nhau → h nhỏ hơn trước. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {HN, CV} | CV=177, HN=216 | CV=63, HN=25 | CV=240, HN=240 |
| 2 | **HN** | {MT, BX, CV} | BX=351, CV=177, MT=262 | BX=35, CV=63, MT=25 | BX=386, CV=240, MT=288 |
| 3 | **CV** | {MT, BX, ĐB} | BX=351, MT=262, ĐB=205 | BX=35, MT=25, ĐB=49 | BX=386, MT=288, ĐB=254 |
| 4 | **ĐB** | {MT, BX} | BX=351, MT=262 | BX=35, MT=25 | BX=386, MT=288 |
| 5 | **MT** | {BX, SC} | BX=351, SC=486 | BX=35, SC=0 | BX=386, SC=486 |
| 6 | **BX** | {SC} | SC=486 | SC=0 | SC=486 |
| 7 | **SC** | ∅ | – | – | – |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 7 lần expand · frontier tối đa 3.
**Nói trong video:** (1) chỉ vào **bước 1** — CV và HN cùng f = 240, A* chọn HN vì
h nhỏ hơn: đúng luật tie-break của nhóm; (2) đồ thị 7 node quá bé để thấy A* tiết
kiệm expand (7 so với 7 của UCS) —
trên G_real 200 cặp, A* expand trung bình **771** so với **1 226** của Dijkstra/UCS,
tức tiết kiệm ~37% nhờ heuristic định hướng (results/exp3_benchmark.csv).

---

## 7. Greedy Best-First

**Ý tưởng:** chỉ nhìn **h** — cứ node nào "cảm giác gần đích" là lao tới, quên sạch
chi phí đã đi. Nhanh, ít expand, nhưng dễ bị đường một chiều/kẹt xe lừa.
Complete ✔ (có visited) · Tối ưu ✘.

| Bước | Expand | Frontier sau bước (open list) | h |
|---|---|---|---|
| 1 | **BT** | {HN, CV} | CV=63, HN=25 |
| 2 | **HN** | {MT, BX, CV} | BX=35, CV=63, MT=25 |
| 3 | **MT** | {BX, SC, CV} | BX=35, CV=63, SC=0 |
| 4 | **SC** | {BX, CV} | BX=35, CV=63 |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 4 lần expand · frontier tối đa 3.
Trên BT→SC Greedy may mắn trùng tuyến tối ưu —
nhưng nhìn **phản ví dụ `BX → BT`** (cùng cặp đã dùng cho BFS):

| Bước | Expand | Frontier sau bước (open list) | h |
|---|---|---|---|
| 1 | **BX** | {HN, SC} | HN=36, SC=26 |
| 2 | **SC** | {HN, BT} | BT=0, HN=36 |
| 3 | **BT** | {HN} | HN=36 |

**Kết quả:** `BX → SC → BT` · chi phí **429 s** · 1.37 km · 3 lần expand · frontier tối đa 2.
**Nói trong video:** Greedy từ BX thấy SC có h nhỏ (SC nằm sát BT theo đường chim bay)
nên lao vào — dính đúng đoạn kẹt 5/5, đắt hơn tối ưu
**+147 s**. Cùng một cú
lừa với BFS nhưng LÝ DO SAI khác nhau: BFS đếm cạnh, Greedy tin "linh cảm" h mà quên g.

---

## 8. Dijkstra hai chiều

**Ý tưởng:** chạy ĐỒNG THỜI hai Dijkstra — xuôi từ BT và ngược từ SC (trên đồ thị đảo
chiều cạnh, vì đường một chiều!). Mỗi bước expand phía có chi phí đỉnh nhỏ hơn (cột
"Phía"). Khi hai vùng chạm nhau và `top_xuôi + top_ngược ≥ μ` (μ = chi phí gặp tốt
nhất đã thấy) thì dừng — tối ưu như Dijkstra nhưng hai "bong bóng" nhỏ thay vì một
bong bóng to. Node nằm trong cả 2 frontier hiển thị g nhỏ hơn. Complete ✔ · Tối ưu ✔.

| Bước | Expand | Phía | Frontier sau bước (open list) | g |
|---|---|---|---|---|
| 1 | **BT** | xuôi | {HN, SC, CV} | CV=177, HN=216, SC=0 |
| 2 | **SC** | ngược | {HN, MT, BX, CV} | BX=198, CV=177, HN=216, MT=223 |
| 3 | **CV** | xuôi | {HN, MT, BX, ĐB} | BX=198, HN=216, MT=223, ĐB=205 |
| 4 | **BX** | ngược | {HN, MT, ĐB} | HN=216, MT=223, ĐB=205 |
| 5 | **ĐB** | xuôi | {HN, MT} | HN=216, MT=223 |
| 6 | **HN** | xuôi | {HN, MT, BX} | BX=198, HN=216, MT=223 |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 6 lần expand · frontier tối đa 4.

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
| 3 | **HN** | {CV} | CV=177 | CV=63 | CV=240 |
| 4 | **BT** | ∅ | – | – | – |
| 5 | **HN** | {CV} | CV=177 | CV=63 | CV=240 |
| 6 | **CV** | ∅ | – | – | – |
| 7 | **BT** | ∅ | – | – | – |
| 8 | **HN** | {CV} | CV=177 | CV=63 | CV=240 |
| 9 | **CV** | ∅ | – | – | – |
| 10 | **ĐB** | ∅ | – | – | – |
| 11 | **BT** | ∅ | – | – | – |
| 12 | **HN** | {CV} | CV=177 | CV=63 | CV=240 |
| 13 | **MT** | {BX, CV} | BX=351, CV=177 | BX=35, CV=63 | BX=386, CV=240 |
| 14 | **CV** | ∅ | – | – | – |
| 15 | **ĐB** | ∅ | – | – | – |
| 16 | **BT** | ∅ | – | – | – |
| 17 | **HN** | {CV} | CV=177 | CV=63 | CV=240 |
| 18 | **MT** | {BX, CV} | BX=351, CV=177 | BX=35, CV=63 | BX=386, CV=240 |
| 19 | **BX** | {CV} | CV=177 | CV=63 | CV=240 |
| 20 | **CV** | ∅ | – | – | – |
| 21 | **ĐB** | ∅ | – | – | – |
| 22 | **BT** | ∅ | – | – | – |
| 23 | **HN** | {CV} | CV=177 | CV=63 | CV=240 |
| 24 | **MT** | {BX, CV} | BX=351, CV=177 | BX=35, CV=63 | BX=386, CV=240 |
| 25 | **SC** | {BX, CV} | BX=351, CV=177 | BX=35, CV=63 | BX=386, CV=240 |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 25 lần expand · frontier tối đa 3.

---

## 10. Beam Search

**Ý tưởng:** đi theo LỚP như BFS nhưng mỗi lớp chỉ GIỮ k ứng viên tốt nhất theo f —
tiết kiệm cực nhiều bộ nhớ, đổi lại có thể cắt nhầm nhánh chứa lời giải.
Complete ✘ · Tối ưu ✘.

**k = 2** — bị hẹp:

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {HN, CV} | CV=177, HN=216 | CV=63, HN=25 | CV=240, HN=240 |
| 2 | **HN** | {MT, BX, CV} | BX=351, CV=177, MT=262 | BX=35, CV=63, MT=25 | BX=386, CV=240, MT=288 |
| 3 | **CV** | {MT, BX, ĐB} | BX=351, MT=262, ĐB=205 | BX=35, MT=25, ĐB=49 | BX=386, MT=288, ĐB=254 |
| 4 | **ĐB** | {MT} | MT=262 | MT=25 | MT=288 |
| 5 | **MT** | {SC} | SC=486 | SC=0 | SC=486 |
| 6 | **SC** | ∅ | – | – | – |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 6 lần expand · frontier tối đa 2.

**k = 5 (mặc định G_demo):**

| Bước | Expand | Frontier sau bước (open list) | g | h | f |
|---|---|---|---|---|---|
| 1 | **BT** | {HN, CV} | CV=177, HN=216 | CV=63, HN=25 | CV=240, HN=240 |
| 2 | **HN** | {MT, BX, CV} | BX=351, CV=177, MT=262 | BX=35, CV=63, MT=25 | BX=386, CV=240, MT=288 |
| 3 | **CV** | {MT, BX, ĐB} | BX=351, MT=262, ĐB=205 | BX=35, MT=25, ĐB=49 | BX=386, MT=288, ĐB=254 |
| 4 | **ĐB** | {MT, BX} | BX=351, MT=262 | BX=35, MT=25 | BX=386, MT=288 |
| 5 | **MT** | {BX, SC} | BX=351, SC=486 | BX=35, SC=0 | BX=386, SC=486 |
| 6 | **BX** | {SC} | SC=486 | SC=0 | SC=486 |
| 7 | **SC** | ∅ | – | – | – |

**Kết quả:** `BT → HN → MT → SC` · chi phí **486 s** · 2.04 km · 7 lần expand · frontier tối đa 3.
**Nói trong video:** k=2 vẫn tìm được lần này nhưng không có bảo đảm — đây là minh hoạ sống động nhất của "incomplete".

---

## 11. TSP đa điểm — ví dụ 4 điểm chạy tay

Shipper xuất phát từ **BT**, giao tại **HN, MT, SC** (không quay về). Ma trận chi phí
**bất đối xứng** (đường một chiều!) — mỗi ô là Dijkstra giữa 2 điểm lúc 07:30:

| từ \ đến | BT | HN | MT | SC |
|---|---|---|---|---|
| **BT** | — | 216 | 262 | 486 |
| **HN** | 174 | — | 47 | 270 |
| **MT** | 127 | 30 | — | 223 |
| **SC** | 232 | 164 | 211 | — |

- Nhìn ma trận: `BT→SC = 486` nhưng `SC→BT = 232` — bất đối xứng thấy ngay.
- **Thứ tự nhập** BT → HN → MT → SC: `486 s`.
- **Nearest Neighbour** (tham lam từ BT): `BT → HN → MT → SC` = `486 s`.
- **Held-Karp** (QHĐ bitmask, tối ưu tuyệt đối): `BT → HN → MT → SC` = **`486 s`**
  — tiết kiệm 0% so thứ tự nhập.
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
