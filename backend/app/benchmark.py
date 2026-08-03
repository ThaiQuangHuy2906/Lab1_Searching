"""Experiment suite — the 7 experiments of PROMPT-MASTER 6.6 (Phase 6).

Run from backend/:  python -m app.benchmark          (all experiments)
                    python -m app.benchmark 3 5      (a subset)

Everything is seeded (SEED=42) and fully reproducible; outputs go to
results/*.csv + results/figs/*.png with FIXED filenames the report and
/api/benchmark point to. NetworkX appears here ONLY as the correctness
baseline (PROMPT-MASTER rule 6). Figures use the light-theme semantic
colors from docs/DESIGN.md on white — print-friendly for the report.

Common sampling: 200 OD pairs on G_real, straight-line >= 1 km apart.
"""

from __future__ import annotations

import csv
import json
import random
import sys
import time
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import networkx as nx  # noqa: E402  (baseline only)

from .graph_store import GraphStore  # noqa: E402
from .search import ALGORITHMS, astar, bfs, dijkstra  # noqa: E402
from .search_advanced import ADVANCED_ALGORITHMS  # noqa: E402
from .tsp import build_matrix, held_karp, nn_2opt, simulated_annealing, tour_cost  # noqa: E402

SEED = 42
N_PAIRS = 200
MIN_PAIR_M = 1000.0
SLOTS_MAIN = ("07:30", "22:00")
ALL_ALGOS = {**ALGORITHMS, **ADVANCED_ALGORITHMS}

ROOT = Path(__file__).resolve().parents[2]
RESULTS = ROOT / "results"
FIGS = RESULTS / "figs"

# light-palette semantic colors (DESIGN.md 3) — print-friendly on white
C_FRONTIER = "#0891b2"
C_EXPANDED = "#7c3aed"
C_PATH = "#d97706"
C_GRID = "#e4e4e7"
C_INK = "#18181b"
C_DIM = "#71717a"


def _style(ax: plt.Axes) -> None:
    ax.grid(axis="y", color=C_GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    ax.tick_params(colors=C_DIM, labelsize=9)


def sample_pairs(store: GraphStore, n: int = N_PAIRS,
                 seed: int = SEED) -> list[tuple[str, str]]:
    rng = random.Random(seed)
    nodes = [nd.id for nd in store.graph.nodes]
    pairs: list[tuple[str, str]] = []
    while len(pairs) < n:
        a, b = rng.sample(nodes, 2)
        if store.straight_line_m(a, b) >= MIN_PAIR_M:
            pairs.append((a, b))
    return pairs


def write_csv(name: str, header: list[str], rows: list[list]) -> None:
    path = RESULTS / name
    with path.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)
    print(f"  wrote {path.relative_to(ROOT)} ({len(rows)} rows)")


def nx_digraph(store: GraphStore, mode: str, slot: str) -> "nx.DiGraph":
    g = nx.DiGraph()
    w = store.weights(mode, slot)
    for e in store.graph.edges:
        g.add_edge(e.u, e.v, w=w[e.id])
    return g


# ---------------------------------------------------------------- exp 1


def exp1(store: GraphStore, pairs: list[tuple[str, str]]) -> str:
    """Correctness: UCS/Dijkstra/A* vs NetworkX, balanced x 2 slots."""
    rows, passed, total = [], 0, 0
    for slot in SLOTS_MAIN:
        g = nx_digraph(store, "balanced", slot)
        for i, (src, dst) in enumerate(pairs):
            truth, _ = nx.bidirectional_dijkstra(g, src, dst, weight="w")
            for name in ("ucs", "dijkstra", "astar"):
                t = ALL_ALGOS[name](store, src, dst, mode="balanced",
                                    time_slot=slot, include_trace=False)
                ok = t.found and abs(t.metrics.total_cost - truth) <= 1e-6
                rows.append([i, slot, name, f"{t.metrics.total_cost:.6f}",
                             f"{truth:.6f}", "PASS" if ok else "FAIL"])
                passed += ok
                total += 1
    write_csv("exp1_correctness.csv",
              ["pair", "slot", "algorithm", "our_cost", "nx_cost", "verdict"], rows)
    return f"exp1: {passed}/{total} khớp NetworkX (sai số ≤ 1e-6)"


# ---------------------------------------------------------------- exp 2


def exp2(store: GraphStore) -> str:
    """Admissibility: reverse Dijkstra h* vs heuristic h, scatter + assert."""
    rng = random.Random(SEED)
    goals = rng.sample([n.id for n in store.graph.nodes], 10)
    w = store.weights("balanced", "07:30")

    import heapq

    def reverse_dijkstra(goal: str) -> dict[str, float]:
        dist = {goal: 0.0}
        heap = [(0.0, 0, goal)]
        done: set[str] = set()
        tie = 0
        while heap:
            d, _t, node = heapq.heappop(heap)
            if node in done:
                continue
            done.add(node)
            for prev, eid in store.radj[node]:
                nd = d + w[eid]
                if nd < dist.get(prev, float("inf")):
                    dist[prev] = nd
                    tie += 1
                    heapq.heappush(heap, (nd, tie, prev))
        return dist

    hs, hstars = [], []
    rows, violations = [], 0
    for goal in goals:
        h_star = reverse_dijkstra(goal)
        worst_ratio = 0.0
        for node, hs_val in h_star.items():
            if node == goal or hs_val <= 0:
                continue
            h_val = store.heuristic(node, goal, "balanced")
            hs.append(h_val)
            hstars.append(hs_val)
            worst_ratio = max(worst_ratio, h_val / hs_val)
            if h_val > hs_val + 1e-6:
                violations += 1
        rows.append([goal, len(h_star), f"{worst_ratio:.4f}", violations])
    assert violations == 0, f"admissibility violated {violations} times"
    write_csv("exp2_admissibility.csv",
              ["goal", "nodes_reached", "max_h_over_hstar", "violations"], rows)

    fig, ax = plt.subplots(figsize=(6.5, 6))
    ax.scatter(hstars, hs, s=2, alpha=0.25, color=C_FRONTIER, edgecolors="none")
    lim = max(hstars) * 1.02
    ax.plot([0, lim], [0, lim], color=C_PATH, linewidth=1.2, label="h = h*")
    ax.set_xlabel("h* — chi phí tối ưu thật tới đích (s)", color=C_INK)
    ax.set_ylabel("h — heuristic haversine/v_max (s)", color=C_INK)
    ax.set_title("Admissibility: h ≤ h* trên toàn bộ mẫu (10 đích × mọi node)",
                 color=C_INK, fontsize=11)
    ax.legend(frameon=False)
    _style(ax)
    fig.tight_layout()
    fig.savefig(FIGS / "admissibility_scatter.png", dpi=150)
    plt.close(fig)
    return (f"exp2: 0 vi phạm admissible trên {len(hs):,} điểm; "
            f"h/h* lớn nhất ≈ {max(h / s for h, s in zip(hs, hstars)):.3f}")


# ---------------------------------------------------------------- exp 3


def exp3(store: GraphStore, pairs: list[tuple[str, str]]) -> str:
    """All 10 algorithms x 200 pairs x 2 slots: cost, gap, expanded, runtime."""
    order = ["bfs", "dfs", "iddfs", "ucs", "dijkstra", "astar",
             "greedy", "bidijkstra", "idastar", "beam"]
    rows = []
    opt_cache: dict[tuple[str, str, str], float] = {}
    for slot in SLOTS_MAIN:
        for i, (src, dst) in enumerate(pairs):
            opt = dijkstra(store, src, dst, mode="balanced", time_slot=slot,
                           include_trace=False).metrics.total_cost
            opt_cache[(src, dst, slot)] = opt
            for name in order:
                t = ALL_ALGOS[name](store, src, dst, mode="balanced",
                                    time_slot=slot, include_trace=False)
                gap = (100 * (t.metrics.total_cost - opt) / opt
                       if t.found and opt else None)
                rows.append([
                    name, i, slot, int(t.found),
                    f"{t.metrics.total_cost:.3f}" if t.found else "",
                    f"{gap:.3f}" if gap is not None else "",
                    t.metrics.nodes_expanded, t.metrics.max_frontier,
                    f"{t.metrics.runtime_ms:.3f}",
                ])
        print(f"  slot {slot} xong")
    write_csv("exp3_benchmark.csv",
              ["algorithm", "pair", "slot", "found", "total_cost", "gap_pct",
               "nodes_expanded", "max_frontier", "runtime_ms"], rows)

    def agg(name: str, col: int) -> float:
        vals = [float(r[col]) for r in rows if r[0] == name and r[col] != ""]
        return sum(vals) / len(vals) if vals else 0.0

    def bar(fname: str, col: int, title: str, ylabel: str, color: str,
            log: bool = False) -> None:
        fig, ax = plt.subplots(figsize=(8, 4.2))
        vals = [agg(a, col) for a in order]
        ax.bar(order, vals, color=color, width=0.62)
        if log:
            ax.set_yscale("log")
        ax.set_title(title, color=C_INK, fontsize=11)
        ax.set_ylabel(ylabel, color=C_DIM, fontsize=9)
        _style(ax)
        for lbl in ax.get_xticklabels():
            lbl.set_rotation(20)
            lbl.set_color(C_INK)
        fig.tight_layout()
        fig.savefig(FIGS / fname, dpi=150)
        plt.close(fig)

    bar("exp3_expanded_bar.png", 6,
        "Số node expand trung bình (200 cặp × 2 khung giờ, thang log)",
        "nodes expanded (log)", C_FRONTIER, log=True)
    bar("exp3_runtime_bar.png", 8,
        "Thời gian chạy trung bình (200 cặp × 2 khung giờ, thang log)",
        "runtime (ms, log)", C_EXPANDED, log=True)

    fig, ax = plt.subplots(figsize=(8, 4.2))
    gaps = [agg(a, 5) for a in order]
    found_rate = [100 * agg(a, 3) for a in order]
    ax.bar(order, gaps, color=C_PATH, width=0.62)
    ax.set_title("Chênh lệch chi phí so với tuyến tối ưu (gap %, trung bình khi tìm thấy)",
                 color=C_INK, fontsize=11)
    ax.set_ylabel("gap %", color=C_DIM, fontsize=9)
    for x, (g, f) in enumerate(zip(gaps, found_rate)):
        ax.text(x, g, f"found\n{f:.0f}%", ha="center", va="bottom",
                fontsize=7, color=C_DIM)
    _style(ax)
    for lbl in ax.get_xticklabels():
        lbl.set_rotation(20)
        lbl.set_color(C_INK)
    fig.tight_layout()
    fig.savefig(FIGS / "exp3_gap.png", dpi=150)
    plt.close(fig)

    worst = max((agg(a, 5), a) for a in order if a not in ("ucs", "dijkstra", "astar"))
    return (f"exp3: 10 thuật toán × {len(pairs)} cặp × 2 khung giờ; "
            f"gap lớn nhất: {worst[1]} ≈ {worst[0]:.1f}%")


# ---------------------------------------------------------------- exp 4


def exp4(store: GraphStore, pairs: list[tuple[str, str]]) -> str:
    """Congestion impact: A* balanced, 07:30 vs 22:00 — % route changes."""
    rows, changed_pairs = [], []
    for i, (src, dst) in enumerate(pairs):
        t1 = astar(store, src, dst, mode="balanced", time_slot="07:30",
                   include_trace=False)
        t2 = astar(store, src, dst, mode="balanced", time_slot="22:00",
                   include_trace=False)
        changed = t1.path != t2.path
        if changed:
            changed_pairs.append((i, src, dst, t1, t2))
        rows.append([
            i, src, dst, int(changed),
            f"{t1.metrics.total_time_s:.1f}", f"{t2.metrics.total_time_s:.1f}",
            f"{t1.metrics.total_distance_m:.1f}", f"{t2.metrics.total_distance_m:.1f}",
        ])
    pct = 100 * len(changed_pairs) / len(pairs)
    write_csv("exp4_congestion.csv",
              ["pair", "start", "goal", "route_changed",
               "time_s_0730", "time_s_2200", "dist_m_0730", "dist_m_2200"], rows)

    ex_dir = RESULTS / "exp4_examples"
    ex_dir.mkdir(exist_ok=True)
    for i, src, dst, t1, t2 in changed_pairs[:3]:
        def line(t, slot):  # noqa: ANN001
            return {
                "type": "Feature",
                "properties": {"slot": slot, "time_s": round(t.metrics.total_time_s, 1),
                               "distance_m": round(t.metrics.total_distance_m, 1)},
                "geometry": {"type": "LineString", "coordinates": [
                    [store.coord[n][1], store.coord[n][0]] for n in t.path]},
            }
        geo = {"type": "FeatureCollection",
               "properties": {"start": src, "goal": dst},
               "features": [line(t1, "07:30"), line(t2, "22:00")]}
        (ex_dir / f"pair_{i:03d}.geojson").write_text(
            json.dumps(geo, ensure_ascii=False, indent=2), encoding="utf-8")
    return f"exp4: {len(changed_pairs)}/{len(pairs)} cặp đổi tuyến ({pct:.1f}%) giữa 07:30 và 22:00"


# ---------------------------------------------------------------- exp 5


def exp5(store: GraphStore, pairs: list[tuple[str, str]]) -> str:
    """Gamma sensitivity: route choice measured with the STANDARD clock."""
    gammas = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]
    rows = []
    for gamma in gammas:
        st = store.reweighted(gamma)
        total_t = total_d = 0.0
        for src, dst in pairs:
            t = astar(st, src, dst, mode="balanced", time_slot="07:30",
                      include_trace=False)
            # Measure the chosen route with the standard gamma=1.5 travel-time
            # clock. path_metrics' third value is the balanced total (including
            # risk penalties), so avg_time_s must use the mode cost returned
            # first when mode="time".
            time_s, dist, _balanced = store.path_metrics(
                t.path, "time", "07:30"
            )
            total_t += time_s
            total_d += dist
        rows.append([gamma, f"{total_t / len(pairs):.1f}",
                     f"{total_d / len(pairs):.1f}"])
        print(f"  gamma={gamma} xong")
    write_csv("exp5_gamma.csv", ["gamma", "avg_time_s", "avg_distance_m"], rows)

    fig, ax1 = plt.subplots(figsize=(7, 4.2))
    xs = [r[0] for r in rows]
    ax1.plot(xs, [float(r[1]) for r in rows], marker="o", color=C_PATH,
             label="Thời gian TB (s)")
    ax1.set_xlabel("γ — trọng số ùn tắc", color=C_INK)
    ax1.set_ylabel("thời gian TB của tuyến (s)", color=C_PATH)
    ax2 = ax1.twinx()
    ax2.plot(xs, [float(r[2]) / 1000 for r in rows], marker="s",
             color=C_EXPANDED, label="Quãng đường TB (km)")
    ax2.set_ylabel("quãng đường TB (km)", color=C_EXPANDED)
    ax2.spines["top"].set_visible(False)
    ax1.set_title("Độ nhạy γ: thời gian & quãng đường tuyến được chọn",
                  color=C_INK, fontsize=11)
    ax1.axvline(1.5, color=C_GRID, linewidth=1, linestyle="--")
    ax1.annotate("γ = 1,5 (mặc định)", (1.5, ax1.get_ylim()[0]),
                 textcoords="offset points", xytext=(6, 8),
                 fontsize=8, color=C_DIM)
    _style(ax1)
    fig.tight_layout()
    fig.savefig(FIGS / "exp5_gamma_curves.png", dpi=150)
    plt.close(fig)
    t0, tN = float(rows[0][1]), float(rows[-1][1])
    return f"exp5: γ 0→3 giảm thời gian TB {t0:.0f}s → {tN:.0f}s (đường cong trong exp5_gamma_curves.png)"


# ---------------------------------------------------------------- exp 6


EXP6_PAIRS = [
    ("Bưu điện Thành phố", "Chợ Bến Thành"),
    ("ĐH Khoa học Tự nhiên (Nguyễn Văn Cừ)", "Thảo Cầm Viên"),
    ("Cầu Kiệu", "Bảo tàng Hồ Chí Minh (Bến Nhà Rồng)"),
    ("Chợ Tân Định", "Bitexco Financial Tower"),
    ("BV Từ Dũ", "BV Nhi Đồng 2"),
]


def exp6() -> str:
    """5 named demo routes exported for qualitative Google Maps comparison."""
    demo = GraphStore.load("demo")
    by_name = {n.name: n for n in demo.graph.nodes}
    routes_dir = RESULTS / "exp6_routes"
    routes_dir.mkdir(exist_ok=True)
    manifest = []
    for idx, (a, b) in enumerate(EXP6_PAIRS, 1):
        na, nb = by_name[a], by_name[b]
        t = astar(demo, na.id, nb.id, mode="balanced", time_slot="07:30",
                  include_trace=False)
        coords = [[demo.coord[n][1], demo.coord[n][0]] for n in t.path]
        geo = {"type": "FeatureCollection", "features": [{
            "type": "Feature",
            "properties": {"from": a, "to": b,
                           "time_s": round(t.metrics.total_time_s, 1),
                           "distance_m": round(t.metrics.total_distance_m, 1)},
            "geometry": {"type": "LineString", "coordinates": coords},
        }]}
        (routes_dir / f"route_{idx}.geojson").write_text(
            json.dumps(geo, ensure_ascii=False, indent=2), encoding="utf-8")

        fig, ax = plt.subplots(figsize=(6, 6))
        for e in demo.graph.edges:
            (y1, x1), (y2, x2) = demo.coord[e.u], demo.coord[e.v]
            ax.plot([x1, x2], [y1, y2], color=C_GRID, linewidth=0.8, zorder=1)
        xs = [c[0] for c in coords]
        ys = [c[1] for c in coords]
        ax.plot(xs, ys, color=C_PATH, linewidth=3, zorder=2)
        ax.scatter([xs[0], xs[-1]], [ys[0], ys[-1]],
                   color=["#047857", "#dc2626"], s=60, zorder=3)
        ax.set_title(f"{a} → {b}\n{t.metrics.total_time_s / 60:.1f} phút · "
                     f"{t.metrics.total_distance_m / 1000:.2f} km (A*, 07:30)",
                     fontsize=10, color=C_INK)
        ax.set_aspect("equal")
        ax.axis("off")
        fig.tight_layout()
        fig.savefig(routes_dir / f"route_{idx}.png", dpi=150)
        plt.close(fig)

        manifest.append({
            "id": idx, "from": a, "to": b,
            "time_s": round(t.metrics.total_time_s, 1),
            "distance_m": round(t.metrics.total_distance_m, 1),
            "google_maps_url": (
                "https://www.google.com/maps/dir/"
                f"{na.lat},{na.lon}/{nb.lat},{nb.lon}/data=!4m2!4m1!3e0"),
            "geojson": f"results/exp6_routes/route_{idx}.geojson",
            "png": f"results/exp6_routes/route_{idx}.png",
            "note_vi": "Nhóm mở google_maps_url lúc ~07:30, chụp màn hình đặt cạnh PNG này trong báo cáo.",
        })
    (RESULTS / "exp6_pairs.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  wrote results/exp6_pairs.json (5 pairs)")
    return "exp6: 5 tuyến demo xuất PNG + GeoJSON + link Google Maps để nhóm đối chứng"


# ---------------------------------------------------------------- exp 7


EXP7_STOPS = [
    "Chợ Bến Thành", "Nhà thờ Đức Bà", "Bitexco Financial Tower",
    "Chợ Tân Định", "Thảo Cầm Viên", "BV Từ Dũ", "Phố đi bộ Bùi Viện",
    "Chùa Vĩnh Nghiêm", "Công viên Lê Văn Tám",
]


def exp7() -> str:
    """TSP scenario: depot + 9 real drops; original vs HK vs NN+2opt vs SA."""
    demo = GraphStore.load("demo")
    by_name = {n.name: n.id for n in demo.graph.nodes}
    start = by_name["Bưu điện Thành phố"]
    stops = [by_name[s] for s in EXP7_STOPS]
    points = [start, *stops]
    cost, path_map = build_matrix(demo, points, "balanced", "07:30")

    original = tour_cost(cost, points, False)
    rows = [["original_order", f"{original:.1f}", "0.0", "", "1"]]
    results: dict[str, tuple[list[str], float, float]] = {}

    t0 = time.perf_counter()
    hk_order, hk_cost = held_karp(cost, points, False)
    rows.append(["held_karp", f"{hk_cost:.1f}",
                 f"{100 * (original - hk_cost) / original:.1f}",
                 f"{(time.perf_counter() - t0) * 1000:.1f}", "1"])
    results["held_karp"] = (hk_order, hk_cost, 0)

    t0 = time.perf_counter()
    nn_order, nn_cost = nn_2opt(cost, points, False)
    rows.append(["nn_2opt", f"{nn_cost:.1f}",
                 f"{100 * (original - nn_cost) / original:.1f}",
                 f"{(time.perf_counter() - t0) * 1000:.1f}",
                 f"{hk_cost / nn_cost:.4f}"])

    t0 = time.perf_counter()
    sa_order, sa_cost, sa_stats = simulated_annealing(cost, points, False)
    rows.append(["sa_best_of_5_seeds", f"{sa_cost:.1f}",
                 f"{100 * (original - sa_cost) / original:.1f}",
                 f"{(time.perf_counter() - t0) * 1000:.1f}",
                 f"{hk_cost / sa_cost:.4f}"])
    rows.append(["sa_mean±std", f"{sa_stats['mean']:.1f}±{sa_stats['std']:.1f}",
                 "", "", ""])
    write_csv("exp7_tsp.csv",
              ["method", "total_cost_s", "savings_vs_original_pct",
               "runtime_ms", "ratio_optimal"], rows)

    # map: HK optimal tour over the faint demo graph
    fig, ax = plt.subplots(figsize=(7.5, 7.5))
    for e in demo.graph.edges:
        (y1, x1), (y2, x2) = demo.coord[e.u], demo.coord[e.v]
        ax.plot([x1, x2], [y1, y2], color=C_GRID, linewidth=0.7, zorder=1)
    for a, b in zip(hk_order, hk_order[1:]):
        seg = path_map[(a, b)]
        xs = [demo.coord[n][1] for n in seg]
        ys = [demo.coord[n][0] for n in seg]
        ax.plot(xs, ys, color=C_PATH, linewidth=2.6, zorder=2)
    for i, node in enumerate(hk_order):
        y, x = demo.coord[node]
        ax.scatter([x], [y], s=170, color="#047857" if i == 0 else C_PATH,
                   zorder=3, edgecolors="white", linewidths=1.2)
        ax.text(x, y, "Đi" if i == 0 else str(i), ha="center", va="center",
                fontsize=7, fontweight="bold",
                color="white" if i == 0 else C_INK, zorder=4)
    ax.set_title(
        f"Held-Karp tối ưu 9 điểm giao (07:30): {hk_cost / 60:.1f} phút — "
        f"tiết kiệm {100 * (original - hk_cost) / original:.1f}% so với thứ tự nhập",
        fontsize=10, color=C_INK)
    ax.set_aspect("equal")
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(FIGS / "exp7_tsp_map.png", dpi=150)
    plt.close(fig)
    return (f"exp7: Held-Karp {hk_cost / 60:.1f} phút, tiết kiệm "
            f"{100 * (original - hk_cost) / original:.1f}% so thứ tự nhập; "
            f"NN+2opt đạt {100 * hk_cost / nn_cost:.1f}% tối ưu; "
            f"SA best {100 * hk_cost / sa_cost:.1f}%")


# ------------------------------------------------------------------ main


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    wanted = [int(a) for a in sys.argv[1:]] or [1, 2, 3, 4, 5, 6, 7]
    RESULTS.mkdir(exist_ok=True)
    FIGS.mkdir(exist_ok=True)

    real = GraphStore.load("real")
    pairs = sample_pairs(real)
    print(f"sampling: {len(pairs)} cặp OD trên G_real (seed {SEED}, ≥ {MIN_PAIR_M:.0f} m)")

    summaries = []
    for exp_id in wanted:
        t0 = time.perf_counter()
        print(f"\n=== exp{exp_id} ===")
        fn = {1: lambda: exp1(real, pairs), 2: lambda: exp2(real),
              3: lambda: exp3(real, pairs), 4: lambda: exp4(real, pairs),
              5: lambda: exp5(real, pairs), 6: exp6, 7: exp7}[exp_id]
        summaries.append(fn() + f"  [{time.perf_counter() - t0:.0f}s]")

    print("\n===== TÓM TẮT =====")
    for s in summaries:
        print("•", s)


if __name__ == "__main__":
    main()
