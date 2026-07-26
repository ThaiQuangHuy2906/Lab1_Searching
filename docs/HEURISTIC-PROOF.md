# Chứng minh heuristic Admissible và Consistent

> Tài liệu này chứng minh chặt chẽ hai tính chất của heuristic dùng cho A*, Greedy
> Best-First và IDA* trong đồ án. Nội dung đổ thẳng vào mục **e. Nguyên lý thuật
> toán** của báo cáo. Kiểm chứng thực nghiệm: thí nghiệm 2 (`results/exp2_*`, Phase 6)
> và test `test_costs.py::test_heuristic_consistent_on_every_edge` (chạy mỗi lần CI).

## 1. Ký hiệu và mô hình

Đồ thị có hướng $G=(V,E)$. Mỗi node $n$ có toạ độ $(lat_n, lon_n)$. Mỗi cạnh $e=(u,v)$ có:

| Ký hiệu | Ý nghĩa | Tính chất |
|---|---|---|
| $\ell(e)$ | chiều dài đường thực (m), từ OSM | $\ell(e) > 0$ |
| $v(e)$ | tốc độ free-flow (m/s), theo bảng loại đường | $0 < v(e) \le v_{\max}$ |
| $c(e,h) \in \{1..5\}$ | mức ùn tắc tại khung giờ $h$ | |
| $p(e) \ge 0$ | penalty rủi ro (giây): $60\cdot flood + 90\cdot constr + 30\cdot alley + 25\cdot light$ | |

$$t_{free}(e) = \frac{\ell(e)}{v(e)}, \qquad f(e,h) = 1 + \gamma\frac{c(e,h)-1}{4} \ \ (\gamma = 1.5)$$

Trọng số cạnh theo chế độ (SCHEMA §D):

$$w_{dist}(e) = \ell(e), \qquad w_{time}(e,h) = t_{free}(e)\,f(e,h), \qquad w_{bal}(e,h) = t_{free}(e)\,f(e,h) + p(e)$$

$hav(a,b)$ = khoảng cách **haversine** (đường tròn lớn) giữa hai toạ độ. Heuristic:

$$h_{dist}(n) = hav(n, goal) \ \text{(m)}, \qquad h_{time}(n) = h_{bal}(n) = \frac{hav(n, goal)}{v_{\max}} \ \text{(giây)}$$

với $v_{\max} = \max_{e \in E} v(e)$ tính trên CHÍNH đồ thị đang chạy — trong dữ liệu
hiện tại cả G_real lẫn G_demo đều có $v_{\max} = 45$ km/h $= 12{,}5$ m/s (với G_demo,
$v(e)$ của cạnh co là tốc độ trung bình dọc đường thật nên không vượt max của G_real).

**Định nghĩa.** Heuristic $h$ là *admissible* nếu $h(n) \le h^*(n)$ với mọi $n$, trong đó
$h^*(n)$ là chi phí tối ưu từ $n$ tới $goal$ (nếu không tới được, $h^*(n)=+\infty$ và bất
đẳng thức hiển nhiên đúng). $h$ là *consistent* nếu $h(goal)=0$ và với mọi cạnh $(u,v)$:
$h(u) \le w(u,v) + h(v)$.

## 2. Hai bổ đề nền

**Bổ đề 1 (đường thực dài hơn đường chim bay).** Với mọi cạnh $e=(u,v)$:
$\ell(e) \ge hav(u,v)$.

*Chứng minh.* $\ell(e)$ là chiều dài hình học của con đường thực — một đường cong trên
mặt cầu nối $u$ với $v$. Trong mọi đường nối hai điểm trên mặt cầu, cung trực giao
(geodesic) là ngắn nhất, và $hav(u,v)$ chính là chiều dài cung đó. Do vậy chiều dài của
bất kỳ con đường thực nào cũng $\ge hav(u,v)$. $\blacksquare$

*(Ghi chú mô hình: với cạnh co của G_demo, $\ell$ là tổng chiều dài các đoạn OSM của
tuyến — vẫn là chiều dài một đường nối $u$ với $v$ nên Bổ đề 1 giữ nguyên.)*

**Bổ đề 2 (bất đẳng thức tam giác của haversine).** Với mọi ba điểm $a, b, c$:
$hav(a,c) \le hav(a,b) + hav(b,c)$.

*Chứng minh.* Khoảng cách geodesic trên mặt cầu là một **metric** (khoảng cách góc tâm
thoả bất đẳng thức tam giác cầu — hệ quả trực tiếp của bất đẳng thức tam giác cho góc
giữa các vector đơn vị trong $\mathbb{R}^3$: $\angle(x,z) \le \angle(x,y) + \angle(y,z)$),
nhân bán kính $R$ giữ nguyên bất đẳng thức. $\blacksquare$

**Bổ đề 3 (chặn dưới của trọng số).** Với mọi cạnh $e$, khung giờ $h$:
$$w_{bal}(e,h) \ \ge\ w_{time}(e,h) \ \ge\ t_{free}(e) \ \ge\ \frac{\ell(e)}{v_{\max}} \ \ge\ \frac{hav(u,v)}{v_{\max}}.$$

*Chứng minh.* Lần lượt: $p(e) \ge 0$; $f(e,h) \ge 1$ (vì $\gamma \ge 0$, $c \ge 1$);
$v(e) \le v_{\max}$; Bổ đề 1. $\blacksquare$

## 3. Định lý consistent

**Định lý 1 (mode distance).** $h_{dist}$ consistent với trọng số $w_{dist}$.

*Chứng minh.* $h_{dist}(goal) = hav(goal,goal) = 0$. Với cạnh $(u,v)$ bất kỳ, áp dụng
Bổ đề 2 với bộ ba $(u, v, goal)$ rồi Bổ đề 1:
$$h_{dist}(u) = hav(u, goal) \le hav(u,v) + hav(v, goal) \le \ell(u,v) + h_{dist}(v) = w_{dist}(u,v) + h_{dist}(v). \ \blacksquare$$

**Định lý 2 (mode time và balanced).** $h_{time}$ consistent với cả $w_{time}$ lẫn $w_{bal}$, tại mọi khung giờ $h$.

*Chứng minh.* $h_{time}(goal) = 0$. Với cạnh $(u,v)$ và khung giờ $h$ bất kỳ:
$$h_{time}(u) = \frac{hav(u,goal)}{v_{\max}} \ \overset{\text{Bổ đề 2}}{\le}\ \frac{hav(u,v)}{v_{\max}} + \frac{hav(v,goal)}{v_{\max}} \ \overset{\text{Bổ đề 3}}{\le}\ w(u,v) + h_{time}(v),$$
trong đó $w$ là $w_{time}$ hoặc $w_{bal}$ (Bổ đề 3 chặn cả hai). $\blacksquare$

## 4. Consistent ⇒ Admissible

**Định lý 3.** Nếu $h$ consistent thì $h$ admissible (với mọi trọng số $w \ge 0$ tương ứng).

*Chứng minh.* Quy nạp theo số cạnh $k$ của đường đi tối ưu từ $n$ tới $goal$.
- $k=0$: $n = goal$, $h(goal) = 0 = h^*(goal)$.
- Giả sử đúng với mọi node có đường tối ưu $\le k-1$ cạnh. Xét $n$ có đường tối ưu
  $n \to n_1 \leadsto goal$ gồm $k$ cạnh, chi phí $h^*(n) = w(n,n_1) + h^*(n_1)$
  (tính tối ưu con của đường ngắn nhất). Theo consistent và giả thiết quy nạp:
  $$h(n) \le w(n,n_1) + h(n_1) \le w(n,n_1) + h^*(n_1) = h^*(n).$$
- Node không tới được $goal$: $h^*(n) = +\infty$, hiển nhiên. $\blacksquare$

**Hệ quả.** Trong đồ án: cả ba mode đều có heuristic **admissible và consistent**. Do đó:
1. **A\*** (graph-search, có closed set) trả về đường **tối ưu** theo trọng số của mode
   đang chạy — consistent bảo đảm mỗi node được expand đúng một lần với $g$ tối ưu,
   nên closed set an toàn.
2. **IDA\*** với ngưỡng theo $f$ cũng tối ưu; bản cài đặt nới ngưỡng $\varepsilon = 5$ s
   mỗi vòng nên nghiệm nằm trong biên $C^* + \varepsilon$ (ghi `epsilon_bound` — Phase 3).
3. Tie-break "f bằng nhau → h nhỏ hơn trước" không ảnh hưởng tính tối ưu (chỉ đổi thứ
   tự expand giữa các ứng viên cùng $f$).
4. **Greedy Best-First** dùng cùng $h$ nhưng bỏ $g$ → **không** có bảo đảm nào (mục 4
   không áp dụng) — điểm so sánh trong báo cáo.

## 5. Vì sao phải dùng $v_{\max}$ toàn cục (không dùng $v(e)$ cục bộ)

$h$ phải chặn dưới thời gian của **mọi** đường đi có thể, kể cả những đường toàn cạnh
nhanh nhất. Nếu thay $v_{\max}$ bằng tốc độ của một cạnh cụ thể (hoặc tốc độ trung
bình), tồn tại phản ví dụ: đoạn về đích toàn đường 45 km/h nhưng $h$ chia cho 30 km/h
sẽ **ước lượng quá** ($h > h^*$) → mất admissible → A* có thể trả đường sai. Đánh đổi:
$v_{\max}$ làm $h$ "lỏng" hơn (ước lượng thấp) → expand nhiều node hơn một chút nhưng
luôn đúng — số liệu cụ thể xem thí nghiệm 2 và 3.

## 6. Điều kiện giữ tính chất khi chỉnh tham số

Mọi chứng minh trên chỉ dựa vào: $\gamma \ge 0$; mọi penalty $\ge 0$; $c(e,h) \ge 1$;
$v(e) \le v_{\max}$. Nếu nhóm đổi hằng số (phải hỏi trước — PROMPT-MASTER luật 4) thì
chỉ cần giữ 4 điều kiện này, chứng minh giữ nguyên. Đặc biệt KHÔNG được: penalty âm
(thưởng), $f < 1$ (congestion "tăng tốc"), hay đặt $v_{\max}$ nhỏ hơn max thực tế.

## 6b. Xử lý làm tròn số (bài học thực nghiệm)

Khi hiện thực, test consistency **từng phát hiện vi phạm ~3 cm** trên một cạnh G_real:
nguyên nhân là $\ell(e)$ bị làm tròn **xuống** 0.1 m khi build dữ liệu, khiến
$\ell(e) < hav(u,v)$ — Bổ đề 1 sụp tại đúng biên làm tròn. Hai biện pháp đã áp dụng
(và là điều kiện để chứng minh đứng vững trên dữ liệu thật):

1. **`length_m` luôn làm tròn LÊN 0.1 m** trong pipeline (`ceil_dm`) — bảo toàn
   $\ell(e) \ge hav(u,v)$ tuyệt đối.
2. **`edge_weight` tính $t_{free} = \ell/v$ trực tiếp**, không dùng trường
   `free_travel_time_s` (trường này làm tròn 0.1 s chỉ để hiển thị; nếu dùng nó,
   làm tròn xuống có thể phá $w \ge \ell/v_{\max}$ ở cạnh có $v(e) = v_{\max}$).

Bài học cho báo cáo: một heuristic đúng trên giấy vẫn có thể mất admissible vì
**số học làm tròn của dữ liệu** — phải kiểm chứng bằng test trên toàn bộ cạnh.

## 7. Kiểm chứng thực nghiệm đi kèm

| Kiểm chứng | Ở đâu | Cách |
|---|---|---|
| Consistent trên **từng cạnh** | `backend/tests/test_costs.py` (chạy thường xuyên) | assert $h(u) \le w(u,v) + h(v)$ với **mọi** cạnh × 3 mode × 4 khung giờ, cả G_demo lẫn G_real |
| Admissible trên mẫu lớn | Thí nghiệm 2 (Phase 6) | Dijkstra **ngược** từ goal lấy $h^*(n)$ thật cho mọi $n$; scatter $h$ vs $h^*$ (`results/figs/admissibility_scatter.png`) + assert $h \le h^*$ toàn mẫu |
| A* = Dijkstra về chi phí | `backend/tests/test_search.py` | so khớp tổng chi phí (sai số $10^{-6}$) trên toàn bộ cặp G_demo + 50 cặp G_real |
