"""Generate docs/GIAI-THICH-THUAT-TOAN.md from REAL data (Phase 7).

The assignment (4.10a) requires the team to explain every algorithm on a
SELF-DESIGNED example (no textbook copies). We fix ONE 7-node subgraph of
G_demo around Chợ Bến Thành — real landmarks, real costs, real one-way
streets — and run every actual implementation on it with full traces.
The step tables below are therefore generated, not hand-typed, so they track
the search code on this induced graph. They must not be claimed to match a
full-graph GUI; parity is meaningful only when the GUI selects the same
verified `teach_7` view and request settings.

After any data rebuild, re-run the full validated benchmark/calibration chain
before regenerating this document:  python scripts/gen_teaching_doc.py
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from app.graph_store import GraphStore  # noqa: E402
from app.scenario import resolve_view_store  # noqa: E402
from app.search import ALGORITHMS  # noqa: E402
from app.search_advanced import ADVANCED_ALGORITHMS  # noqa: E402
from app.tsp import build_matrix, held_karp, nearest_neighbour, tour_cost  # noqa: E402

OUT = ROOT / "docs" / "GIAI-THICH-THUAT-TOAN.md"

# short labels used in every table (declared up front in the doc)
SHORT = {
    "Chợ Bến Thành": "BT", "Công viên 23/9": "CV", "Đền Bà Mariamman": "ĐB",
    "Bảo tàng Mỹ thuật TP.HCM": "MT", "Điểm trung chuyển Hàm Nghi": "HN",
    "Bitexco Financial Tower": "BX", "Saigon Centre (Takashimaya)": "SC",
}
SLOT = "07:30"
MODE = "balanced"


def build_substore(demo: GraphStore) -> tuple[GraphStore, dict[str, str]]:
    sub = resolve_view_store(demo, "teach_7")
    label = {node.id: SHORT[node.name] for node in sub.graph.nodes}
    return sub, label


def _vi_thousands(x: float, digits: int = 0) -> str:
    """1226 -> '1 226'; 3564.6 -> '3 564,6' (space groups, comma decimal)."""
    return f"{x:,.{digits}f}".replace(",", " ").replace(".", ",")


def load_benchmark_numbers() -> dict[str, str]:
    """Benchmark figures quoted in the doc, read from results/*.csv at
    GENERATE time (audit fix L6-01/L4-05: these were hardcoded literals, so
    a TomTom re-run + regenerate silently kept the stale synthetic numbers;
    now the single re-run workflow — rebuild, benchmark, regenerate — also
    refreshes them)."""
    n: dict[str, str] = {}
    with (ROOT / "results" / "exp3_benchmark.csv").open(encoding="utf-8",
                                                        newline="") as fh:
        rows = list(csv.DictReader(fh))

    def mean_expanded(algo: str) -> float:
        vals = [float(r["nodes_expanded"]) for r in rows if r["algorithm"] == algo]
        return sum(vals) / len(vals)

    astar, ucs = mean_expanded("astar"), mean_expanded("ucs")
    n["astar_expand"] = _vi_thousands(round(astar))
    n["ucs_expand"] = _vi_thousands(round(ucs))
    n["astar_saving_pct"] = f"{100 * (1 - astar / ucs):.0f}"

    with (ROOT / "results" / "exp7_tsp.csv").open(encoding="utf-8",
                                                  newline="") as fh:
        t = {r["method"]: r for r in csv.DictReader(fh)}
    n["tsp_saving"] = _vi_thousands(
        float(t["held_karp"]["savings_vs_original_pct"]), 1)

    def hit(method: str) -> bool:
        return abs(float(t[method]["ratio_optimal"]) - 1.0) < 1e-9

    def gap_txt(method: str) -> str:
        ratio = float(t[method]["ratio_optimal"])
        if ratio <= 0:
            raise ValueError(f"ratio_optimal must be positive for {method}")
        # exp7 stores optimal/candidate. Convert that ratio back to the
        # candidate's positive relative gap above the Held-Karp optimum.
        gap_pct = (1 / ratio - 1) * 100
        return f"+{_vi_thousands(gap_pct, 1)}%"

    if hit("nn_2opt") and hit("sa_best_of_5_seeds"):
        n["tsp_claim"] = "NN+2-opt và SA đều đạt đúng nghiệm Held-Karp"
    else:
        parts = []
        for label, method in (("NN+2-opt", "nn_2opt"), ("SA", "sa_best_of_5_seeds")):
            parts.append(f"{label} " + ("đạt đúng nghiệm Held-Karp" if hit(method)
                                        else f"cách nghiệm Held-Karp {gap_txt(method)}"))
        n["tsp_claim"] = ", ".join(parts)

    mean_s, std_s = t["sa_mean±std"]["total_cost_s"].split("±")
    n["sa_mean_std"] = f"{_vi_thousands(float(mean_s), 1)} ± {_vi_thousands(float(std_s), 1)}"
    return n


def fmt_map(m: dict[str, float] | None, lab: dict[str, str]) -> str:
    if not m:
        return "–"
    return ", ".join(f"{lab[k]}={v:.0f}" for k, v in sorted(m.items(), key=lambda kv: lab[kv[0]]))


def trace_table(t, lab: dict[str, str], with_depth=False, with_side=False) -> str:
    cur = t.trace[0]
    use_g = cur.g is not None
    use_h = cur.h is not None
    use_f = cur.f is not None
    head = ["Bước", "Expand"]
    if with_side:
        head.append("Phía")
    if with_depth:
        head.append("Giới hạn d")
    head.append("Frontier sau bước (open list)")
    if use_g:
        head.append("g")
    if use_h:
        head.append("h")
    if use_f:
        head.append("f")
    lines = ["| " + " | ".join(head) + " |",
             "|" + "|".join(["---"] * len(head)) + "|"]
    for st in t.trace:
        row = [str(st.step), f"**{lab[st.expanded]}**"]
        if with_side:
            row.append("xuôi" if st.side == "forward" else "ngược")
        if with_depth:
            row.append(str(st.depth_limit))
        row.append("{" + ", ".join(lab[n] for n in st.frontier) + "}" if st.frontier else "∅")
        if use_g:
            row.append(fmt_map(st.g, lab))
        if use_h:
            row.append(fmt_map(st.h, lab))
        if use_f:
            row.append(fmt_map(st.f, lab))
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def result_line(t, lab: dict[str, str]) -> str:
    if not t.found:
        return (f"**Kết quả:** KHÔNG tìm thấy đường (found=false) — "
                f"{t.metrics.nodes_expanded} lần expand.")
    path = " → ".join(lab[n] for n in t.path)
    return (f"**Kết quả:** `{path}` · chi phí **{t.metrics.total_cost:.0f} s** · "
            f"{t.metrics.total_distance_m / 1000:.2f} km · "
            f"{t.metrics.nodes_expanded} lần expand · frontier tối đa {t.metrics.max_frontier}.")


def main() -> None:
    demo = GraphStore.load("demo")
    store, lab = build_substore(demo)
    ids_by_short = {v: k for k, v in lab.items()}
    start, goal = ids_by_short["BT"], ids_by_short["BX"]

    # ---- run everything once ------------------------------------------------
    runs = {}
    for name, fn in {**ALGORITHMS, **ADVANCED_ALGORITHMS}.items():
        runs[name] = fn(store, start, goal, mode=MODE, time_slot=SLOT, include_trace=True)
    runs["beam_k2"] = ADVANCED_ALGORITHMS["beam"](
        store, start, goal, mode=MODE, time_slot=SLOT, include_trace=True, beam_width=2)

    # heuristic table
    h_rows = "\n".join(
        f"| {lab[n.id]} — {n.name} | {store.straight_line_m(n.id, goal):.0f} | "
        f"{store.heuristic(n.id, goal, MODE):.0f} |"
        for n in sorted(store.graph.nodes, key=lambda x: lab[x.id]))

    # edge table
    e_rows = "\n".join(
        f"| {lab[e.u]} → {lab[e.v]} | {e.name} | {e.length_m:.0f} | "
        f"{store.congestion(e.id, SLOT)} | "
        f"{'60·ngập ' if e.risk.flood else ''}{'25·đèn ' if e.risk.traffic_light else ''}"
        f"{'90·lô-cốt ' if e.risk.construction else ''}"
        f"| **{store.weight(e.id, MODE, SLOT):.0f}** | {'✔' if e.oneway else ''} |"
        for e in sorted(store.graph.edges, key=lambda e: (lab[e.u], lab[e.v])))

    # ---- TSP mini instance --------------------------------------------------
    pts = [ids_by_short[s] for s in ("BT", "HN", "MT", "SC")]
    cost, _paths = build_matrix(store, pts, MODE, SLOT)
    mat_rows = "\n".join(
        "| **" + lab[a] + "** | " + " | ".join(
            ("—" if a == b else f"{cost[(a, b)]:.0f}") for b in pts) + " |"
        for a in pts)
    hk_order, hk_cost = held_karp(cost, pts, False)
    nn_order = nearest_neighbour(cost, pts)
    nn_cost = tour_cost(cost, nn_order, False)
    orig_cost = tour_cost(cost, pts, False)

    def tour(o):
        return " → ".join(lab[x] for x in o)

    d = runs  # alias
    N = load_benchmark_numbers()

    bfs_gap = d["bfs"].metrics.total_cost - d["ucs"].metrics.total_cost
    bfs_matches_optimal = abs(bfs_gap) <= 0.5
    greedy_gap = d["greedy"].metrics.total_cost - d["astar"].metrics.total_cost
    greedy_matches_optimal = abs(greedy_gap) <= 0.5

    if bfs_matches_optimal and greedy_matches_optimal:
        pair_story = (
            "Trên profile hiện tại, BFS và Greedy đều tình cờ trùng tuyến tối ưu của "
            "UCS/A*. Đây chỉ là kết quả của instance này, không thay đổi guarantee: "
            "BFS bỏ qua trọng số còn Greedy bỏ qua chi phí đã đi g."
        )
    elif bfs_matches_optimal:
        pair_story = (
            "Trên profile hiện tại, BFS tình cờ trùng tuyến tối ưu của UCS/A*, còn "
            "Greedy bị heuristic h dẫn vào tuyến đắt hơn. Cặp này minh họa rằng cùng "
            "một kết quả đúng ở một instance không biến BFS thành thuật toán tối ưu "
            "trên đồ thị có trọng số."
        )
    elif greedy_matches_optimal:
        pair_story = (
            "Trên profile hiện tại, Greedy tình cờ trùng tuyến tối ưu của UCS/A*, còn "
            "BFS chọn tuyến ít cạnh nhưng đắt hơn. Kết quả theo instance không thay "
            "đổi guarantee của hai thuật toán."
        )
    else:
        pair_story = (
            "Trên profile hiện tại, tuyến ít cạnh của BFS và lựa chọn chỉ theo h của "
            "Greedy đều đắt hơn tuyến UCS/A*. Hai thuật toán sai vì hai lý do khác "
            "nhau: BFS bỏ qua trọng số, Greedy bỏ qua chi phí đã đi g."
        )

    if bfs_matches_optimal:
        bfs_video = (
            f"**Nói trong video:** BFS chọn `{tour(d['bfs'].path)}` vì ít cạnh nhất "
            f"và trên instance hiện tại **tình cờ trùng** tuyến tối ưu của UCS "
            f"(**{d['ucs'].metrics.total_cost:.0f} s**). Không được suy rộng thành "
            "guarantee: BFS vẫn chỉ tối ưu số cạnh và không đọc trọng số."
        )
    else:
        bfs_video = (
            f"**Nói trong video:** BFS chọn `{tour(d['bfs'].path)}` vì ít cạnh nhất, "
            f"nhưng tuyến tối ưu là `{tour(d['ucs'].path)}` "
            f"(**{d['ucs'].metrics.total_cost:.0f} s**). BFS đắt hơn "
            f"**+{bfs_gap:.0f} s (+{100 * bfs_gap / d['ucs'].metrics.total_cost:.0f}%)** "
            "— ít cạnh nhất không phải rẻ nhất."
        )

    if bfs_matches_optimal:
        greedy_relation = (
            "Khác BFS (lần này tình cờ trùng tối ưu), Greedy chỉ tin h và quên g đã trả."
        )
    else:
        greedy_relation = (
            "Cùng cho kết quả đắt hơn BFS nhưng với lý do khác: BFS đếm cạnh, "
            "Greedy chỉ tin h và quên g đã trả."
        )

    doc = f"""# GIẢI THÍCH THUẬT TOÁN — tài liệu ôn tập & quay video

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

7 địa danh thật · {len(store.graph.edges)} cạnh thật · khung giờ **{SLOT}** · chế độ **cân bằng** (giây):

| Viết tắt | Địa danh |
|---|---|
""" + "\n".join(
        f"| **{lab[node.id]}** | {node.name} |" for node in store.graph.nodes
) + f"""

**Bài toán xuyên suốt: đi từ `BT` (Chợ Bến Thành) đến `BX` (Bitexco).**
Điểm thú vị của cặp này: có đường trực tiếp BX→BT nhưng đó là đường **MỘT CHIỀU** —
chiều đi BT→BX không được phép, shipper phải vòng. {pair_story}

Trọng số cạnh = `t_free × f_cong + penalty` (SCHEMA §D, γ=1,5):

| Cạnh | Đường | dài (m) | ùn tắc | penalty | **w (s)** | 1 chiều |
|---|---|---|---|---|---|---|
{e_rows}

*(Mọi số giây trong tài liệu đã làm tròn về nguyên cho dễ đọc — cộng tay có thể
lệch ±1 s so với tổng chính xác; app và test tính bằng số lẻ đầy đủ.)*

Heuristic tới đích {lab[goal]}: `h(n) = haversine(n, {lab[goal]}) / v_max`, với
v_max = **{store.v_max_ms * 3.6:.0f} km/h** — tốc độ lớn nhất có thật trong view `teach_7`
(không đoán quá ⇒ admissible, chứng minh trong `docs/HEURISTIC-PROOF.md`):

| Node | haversine → {lab[goal]} (m) | **h (s)** |
|---|---|---|
{h_rows}

---

## 1. BFS — tìm theo bề rộng

**Ý tưởng (5 dòng):** loang từng "vành" từ điểm xuất phát: thăm mọi node cách 1 cạnh,
rồi 2 cạnh, rồi 3 cạnh… bằng hàng đợi FIFO. Tìm ra đường **ít cạnh nhất**. KHÔNG nhìn
trọng số — với đồ thị giao thông (cạnh nặng nhẹ khác nhau) nên "ít đoạn" ≠ "nhanh".
Complete ✔ (đồ thị hữu hạn). Tối ưu ✘ trên đồ thị có trọng số (chỉ tối ưu khi mọi cạnh
bằng nhau).

```text
BFS(start, goal):
  queue ← [start]; visited ← {{start}}
  lặp: node ← queue.popleft()            # expand
       nếu node = goal: dừng, lần vết parent
       với mỗi láng giềng chưa visited: đánh dấu, parent, đẩy vào CUỐI queue
```

{trace_table(d['bfs'], lab)}

{result_line(d['bfs'], lab)}
{bfs_video}

---

## 2. DFS — tìm theo chiều sâu

**Ý tưởng:** lao sâu hết mức theo một nhánh (stack LIFO), cụt đường mới quay lui.
Thứ tự láng giềng cố định theo id cạnh nên kết quả tái lập được. Complete ✔ nhờ có
visited (đồ thị hữu hạn). Tối ưu ✘ — trả về đường ĐẦU TIÊN chạm đích, có thể rất xấu.

{trace_table(d['dfs'], lab)}

{result_line(d['dfs'], lab)}

---

## 3. IDDFS — đào sâu dần

**Ý tưởng:** chạy DFS có giới hạn độ sâu d = 0, 1, 2, … tăng dần tới khi chạm đích —
được độ nông của BFS với bộ nhớ của DFS, đổi lại phải chạy lại từ đầu mỗi vòng
(cột "Giới hạn d" trong bảng; số expand CỘNG DỒN qua các vòng). Implementation
chỉ complete khi lời giải có độ sâu không vượt cap 100; chạm cap mà chưa thấy
lời giải thì không được tuyên bố complete.
Tối ưu ✘ trên đồ thị trọng số (nông nhất theo SỐ CẠNH, như BFS).

{trace_table(d['iddfs'], lab, with_depth=True)}

{result_line(d['iddfs'], lab)}
**Nói trong video:** so số expand với BFS ({d['iddfs'].metrics.nodes_expanded} so với
{d['bfs'].metrics.nodes_expanded}) — cái giá của việc chạy lại; trên G_real chênh lệch
lên tới hàng trăm lần (xem benchmark exp3).

---

## 4. UCS — Uniform-Cost Search

**Ý tưởng:** luôn expand node có **g nhỏ nhất** (chi phí tích luỹ từ BT) bằng hàng đợi
ưu tiên — "vành" lan theo CHI PHÍ chứ không theo số cạnh. Dừng khi POP đích (lúc đó
g(đích) đã tối ưu). Complete ✔ · Tối ưu ✔ (mọi w > 0).

{trace_table(d['ucs'], lab)}

{result_line(d['ucs'], lab)}

---

## 5. A*

**Ý tưởng:** như UCS nhưng xếp hàng theo **f = g + h**, với h là "linh cảm có căn cứ"
(thời gian bay thẳng ở tốc độ tối đa — không bao giờ đoán QUÁ). h admissible +
consistent ⇒ vẫn tối ưu như UCS nhưng **định hướng về đích, expand ít hơn**.
Tie-break: f bằng nhau → h nhỏ hơn trước. Complete ✔ · Tối ưu ✔.

{trace_table(d['astar'], lab)}

{result_line(d['astar'], lab)}
**Nói trong video:** (1) chỉ vào cột f — node hướng về BX có f nhỏ nên được ưu tiên;
khi hai node cùng f, A* chọn node có h nhỏ hơn (luật tie-break của nhóm); (2) đồ thị
7 node quá bé để thấy A* tiết kiệm expand ({d['astar'].metrics.nodes_expanded} so với
{d['ucs'].metrics.nodes_expanded} của UCS) — trên G_real 200 cặp, A* expand trung bình
**{N['astar_expand']}** so với **{N['ucs_expand']}** của UCS, tức tiết kiệm
~{N['astar_saving_pct']}% nhờ heuristic định hướng (số đọc tự động từ
results/exp3_benchmark.csv mỗi lần tái sinh tài liệu này).

---

## 6. Greedy Best-First

**Ý tưởng:** chỉ nhìn **h** — cứ node nào "cảm giác gần đích" là lao tới, quên sạch
chi phí đã đi. Nhanh, ít expand, nhưng dễ bị đường một chiều/kẹt xe lừa.
Complete ✔ (có visited) · Tối ưu ✘.

{trace_table(d['greedy'], lab)}

{result_line(d['greedy'], lab)}
**Nói trong video:** Greedy {"đắt hơn tối ưu **+" + format(d['greedy'].metrics.total_cost - d['astar'].metrics.total_cost, '.0f') + " s (+" + format(100 * (d['greedy'].metrics.total_cost - d['astar'].metrics.total_cost) / d['astar'].metrics.total_cost, '.0f') + "%)**" if d['greedy'].metrics.total_cost > d['astar'].metrics.total_cost + 0.5 else "lần này may mắn trùng tuyến tối ưu"}
trên cùng cặp BT→BX. {greedy_relation}
A* cũng dùng h nhưng CÓ g nên không bị.

---

## 7. Dijkstra hai chiều

**Ý tưởng:** chạy ĐỒNG THỜI hai tìm kiếm theo chi phí g — xuôi từ BT và ngược từ {lab[goal]} (trên đồ thị đảo
chiều cạnh, vì đường một chiều!). Mỗi bước expand phía có chi phí đỉnh nhỏ hơn (cột
"Phía"). Khi hai vùng chạm nhau và `top_xuôi + top_ngược ≥ μ` (μ = chi phí gặp tốt
nhất đã thấy) thì dừng — tối ưu như UCS. Hai phía có thể xét ít node hơn trên
instance thuận lợi, nhưng worst-case không tốt hơn UCS vô điều kiện. Node nằm
trong cả 2 frontier hiển thị g nhỏ hơn. Complete ✔ · Tối ưu ✔.

{trace_table(d['bidijkstra'], lab, with_side=True)}

{result_line(d['bidijkstra'], lab)}

---

## 8. IDA*

**Ý tưởng:** phiên bản tiết kiệm bộ nhớ của A*: duyệt sâu nhưng CẮT mọi nhánh có
f = g + h vượt ngưỡng; hết vòng thì nới ngưỡng lên `max(f nhỏ nhất bị cắt, ngưỡng + ε)`.
Mặc định **ε = 5 m** ở mode distance và **5 s** ở time/balanced. Nếu tìm thấy trước
cap 1.000 vòng, nghiệm nằm trong `C* + ε` (ghi `epsilon_bound`); nếu chạm cap thì
không được tuyên bố complete hay guarantee đó. Implementation dùng explicit stack
đang chờ `Q` cùng các map `best_g`, `parent`, `h_of`, nên space được mô tả theo code
là `O(V + Q)`, không phải bound đệ quy textbook `O(bd)`.

{trace_table(d['idastar'], lab)}

{result_line(d['idastar'], lab)}

---

## 9. Beam Search

**Ý tưởng:** đi theo LỚP như BFS nhưng mỗi lớp chỉ GIỮ k ứng viên tốt nhất theo f —
tiết kiệm cực nhiều bộ nhớ, đổi lại có thể cắt nhầm nhánh chứa lời giải.
Complete ✘ · Tối ưu ✘.

**k = 2:**

{trace_table(d['beam_k2'], lab)}

{result_line(d['beam_k2'], lab)}

**k = 5 (mặc định G_demo):**

{trace_table(d['beam'], lab)}

{result_line(d['beam'], lab)}
{f'''**Nghịch lý đáng giảng:** k=5 ({d['beam'].metrics.total_cost:.0f} s) TỆ HƠN k=2
({d['beam_k2'].metrics.total_cost:.0f} s)! Lý do nằm ở luật "đã vào beam là chốt":
k rộng đưa {lab[goal]} vào beam SỚM qua đường xấu rồi không bao giờ xét lại đường
rẻ hơn; k hẹp CẮT {lab[goal]} khỏi beam, vòng sau nó vào lại bằng đường tốt hơn.
Beam KHÔNG đơn điệu theo k — tăng k không hứa hẹn kết quả tốt hơn.''' if d['beam_k2'].found and d['beam'].found and d['beam'].metrics.total_cost > d['beam_k2'].metrics.total_cost + 0.5 else ""}
**Nói trong video:** {"k=2 vẫn tìm được lần này nhưng không có bảo đảm — " if d['beam_k2'].found else "k=2 CẮT MẤT lời giải (found=false) — "}đây là minh hoạ sống động nhất của "incomplete"{" (và ô kết quả 2 mức k ở trên cho thấy thêm: kết quả không đơn điệu theo k)" if d['beam_k2'].found and d['beam'].found and abs(d['beam'].metrics.total_cost - d['beam_k2'].metrics.total_cost) > 0.5 else ""}.

---

## 10. TSP đa điểm — ví dụ 4 điểm chạy tay

Shipper xuất phát từ **BT**, giao tại **HN, MT, SC** (không quay về). Ma trận chi phí
**bất đối xứng** (đường một chiều!) — mỗi ô là UCS giữa 2 điểm lúc {SLOT}:

| từ \\ đến | {" | ".join(lab[p] for p in pts)} |
|---|---|---|---|---|
{mat_rows}

- Nhìn ma trận: `BT→SC = {cost[(pts[0], pts[3])]:.0f}` nhưng `SC→BT = {cost[(pts[3], pts[0])]:.0f}` — bất đối xứng thấy ngay.
- **Thứ tự nhập** BT → HN → MT → SC: `{orig_cost:.0f} s`.
- **Nearest Neighbour** (tham lam từ BT): `{tour(nn_order)}` = `{nn_cost:.0f} s`.
- **Held-Karp** (QHĐ bitmask, tối ưu tuyệt đối): `{tour(hk_order)}` = **`{hk_cost:.0f} s`**
  — tiết kiệm {100 * (orig_cost - hk_cost) / orig_cost:.0f}% so thứ tự nhập.
- Trên kịch bản 10 điểm thật (benchmark exp7, số đọc tự động từ results/exp7_tsp.csv):
  tiết kiệm {N['tsp_saving']}%, {N['tsp_claim']};
  SA trung bình 5 seed = {N['sa_mean_std']} s.
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
"""
    # Avoid Windows newline translation so the generated artifact remains
    # byte-identical before and after Git applies the repository's eol=lf rule.
    with OUT.open("w", encoding="utf-8", newline="\n") as fh:
        fh.write(doc)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(doc.splitlines())} lines)")
    print(f"subgraph: {len(store.graph.nodes)} nodes / {len(store.graph.edges)} edges; "
          f"BT->BX astar={d['astar'].metrics.total_cost:.0f}s "
          f"bfs={d['bfs'].metrics.total_cost:.0f}s beam_k2_found={d['beam_k2'].found}")


if __name__ == "__main__":
    main()
