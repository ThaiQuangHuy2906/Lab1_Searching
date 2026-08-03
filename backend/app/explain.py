"""Vietnamese route explanations (assignment requirement 4.8, spec 6.4).

Builds `explanation` for a finished Trace: a natural-language summary
with REAL numbers, the congested segments on the route, and at least
one genuinely different alternative route with a reason it lost.

Template-with-logic, not canned strings: sentences appear only when
their condition holds (congestion present, alternative shorter by
distance, algorithm optimal or not, ...). All numbers use Vietnamese
decimal commas.
"""

from __future__ import annotations

import heapq

from .graph_store import GraphStore
from .models import (
    Alternative, CongestedSegment, Explanation, Mode, TimeSlot, Trace,
)

ALGO_VI = {
    "bfs": "BFS (tìm theo bề rộng)", "dfs": "DFS (tìm theo chiều sâu)",
    "iddfs": "IDDFS (đào sâu dần)", "ucs": "UCS (chi phí đồng nhất)",
    "dijkstra": "Dijkstra", "astar": "A*", "greedy": "Greedy Best-First",
    "bidijkstra": "Dijkstra hai chiều", "idastar": "IDA*", "beam": "Beam Search",
}
MODE_VI = {
    "balanced": "tổng chi phí cân bằng (thời gian + phạt rủi ro) thấp nhất",
    "time": "thời gian di chuyển ước tính thấp nhất",
    "distance": "quãng đường ngắn nhất",
}
#: what a NON-optimal algorithm actually optimizes — the opening sentence
#: must state the real criterion, not pretend the route is cost-minimal.
ALGO_CRITERION_VI = {
    "bfs": "đi qua ít đoạn đường nhất, không xét trọng số",
    "dfs": "là tuyến đầu tiên tìm thấy khi ưu tiên chiều sâu, không xét trọng số",
    "iddfs": "nông nhất theo số đoạn nhờ đào sâu dần, không xét trọng số",
    "greedy": "luôn tiến về phía đích theo ước lượng heuristic, bỏ qua chi phí đã đi",
    "beam": "tốt nhất trong chùm k tuyến được giữ lại ở mỗi lớp",
}
CONGESTION_THRESHOLD = 4
MAX_NAMED_STOPS = 6


def vi_num(x: float, nd: int = 1) -> str:
    """Vietnamese decimal comma; trims a trailing ',0'."""
    s = f"{x:.{nd}f}".replace(".", ",")
    return s[:-2] if s.endswith(",0") else s


def _cost_unit(mode: Mode) -> str:
    """Unit of total_cost and epsilon for the selected optimization mode."""
    return "m" if mode == "distance" else "s"


def _fmt_route_totals(cost: float, time_s: float, dist_m: float, mode: Mode) -> str:
    core = f"{time_s:.0f} s ≈ {vi_num(time_s / 60)} phút; {vi_num(dist_m / 1000, 2)} km"
    if mode == "distance":
        return core
    return f"{cost:.0f} s — {core}" if abs(cost - time_s) > 0.5 else core


def _path_label(store: GraphStore, path: list[str]) -> str:
    names = [store.nodes[n].name for n in path]
    if all(names):
        if len(names) <= MAX_NAMED_STOPS:
            return " → ".join(names)
        return f"{names[0]} → … → {names[-1]} (qua {len(names) - 2} điểm trung gian)"
    return f"nút {path[0]} → nút {path[-1]} ({len(path) - 2} nút trung gian)"


def _edge_label(store: GraphStore, edge_id: str) -> str:
    """Street name; else 'A → B' from node names; else the raw edge id."""
    e = store.edges[edge_id]
    if e.name:
        return e.name
    nu, nv = store.nodes[e.u].name, store.nodes[e.v].name
    return f"đoạn {nu} → {nv}" if nu and nv else f"đoạn {edge_id}"


def _street_names(store: GraphStore, path: list[str], only_edges: set[str] | None = None,
                  limit: int = 3) -> list[str]:
    seen: list[str] = []
    for a, b in zip(path, path[1:]):
        e = store.edge_by_uv[(a, b)]
        if only_edges is not None and e.id not in only_edges:
            continue
        label = _edge_label(store, e.id)
        if label not in seen:
            seen.append(label)
        if len(seen) >= limit:
            break
    return seen


def _congested_on_path(store: GraphStore, path: list[str], slot: TimeSlot
                       ) -> list[CongestedSegment]:
    out = []
    for a, b in zip(path, path[1:]):
        e = store.edge_by_uv[(a, b)]
        level = store.congestion(e.id, slot)
        if level >= CONGESTION_THRESHOLD:
            out.append(CongestedSegment(edge=e.id, name=e.name, level=level))
    return out


def _risk_counts(store: GraphStore, path: list[str]) -> dict[str, int]:
    c = {"flood": 0, "construction": 0, "traffic_light": 0, "narrow_alley": 0}
    for a, b in zip(path, path[1:]):
        r = store.edge_by_uv[(a, b)].risk
        for k in c:
            c[k] += getattr(r, k)
    return c


def _dijkstra_path(store: GraphStore, start: str, goal: str, mode: Mode,
                   slot: TimeSlot, banned_edge: str | None = None) -> list[str] | None:
    """Plain internal Dijkstra used only to derive comparison routes."""
    w = store.weights(mode, slot)
    dist = {start: 0.0}
    parent: dict[str, str] = {}
    heap: list[tuple[float, int, str]] = [(0.0, 0, start)]
    done: set[str] = set()
    tie = 0
    while heap:
        d, _t, node = heapq.heappop(heap)
        if node in done:
            continue
        done.add(node)
        if node == goal:
            path = [goal]
            while path[-1] != start:
                path.append(parent[path[-1]])
            path.reverse()
            return path
        for nbr, eid in store.adj[node]:
            if nbr in done or eid == banned_edge:
                continue
            nd = d + w[eid]
            if nd < dist.get(nbr, float("inf")):
                dist[nbr] = nd
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (nd, tie, nbr))
    return None


def _why_not(store: GraphStore, alt_path: list[str], slot: TimeSlot,
             main_time: float, main_dist: float,
             alt_time: float, alt_dist: float, main_optimal: bool = True) -> str:
    reasons: list[str] = []
    congested = _congested_on_path(store, alt_path, slot)
    if congested:
        worst = max(congested, key=lambda cseg: cseg.level)
        reasons.append(
            f"dính {_edge_label(store, worst.edge)} ùn tắc mức {worst.level}/5 lúc {slot}")
    risks = _risk_counts(store, alt_path)
    if risks["flood"]:
        reasons.append(f"đi qua {risks['flood']} đoạn có nguy cơ ngập")
    if risks["construction"]:
        reasons.append(f"vướng {risks['construction']} đoạn có lô cốt thi công")
    if risks["traffic_light"] >= 2:
        reasons.append(f"chờ {risks['traffic_light']} đèn tín hiệu")

    dd = alt_dist - main_dist
    dt = alt_time - main_time
    head = (f"Ngắn hơn {vi_num(abs(dd) / 1000, 2)} km" if dd < -10 else
            f"Dài hơn {vi_num(dd / 1000, 2)} km" if dd > 10 else
            "Quãng đường tương đương")
    tail = (f"nhưng chậm hơn ~{dt:.0f} s" if dt > 0.5 else
            f"và nhanh hơn ~{abs(dt):.0f} s theo thời gian thuần" if dt < -0.5 else
            "và thời gian tương đương")
    why = f"{head} {tail}"
    if reasons:
        why += " do " + ", ".join(reasons)
    if dt < -0.5 and not main_optimal:
        return why + " — thuật toán đang chạy không tối ưu theo chi phí nên bỏ lỡ tuyến này."
    return why + ", nên không được chọn theo tiêu chí hiện tại."


def build_explanation(store: GraphStore, trace: Trace) -> Explanation:
    """Fill Trace.explanation (SCHEMA §B.4) from the finished run."""
    start_goal = (trace.path[0], trace.path[-1]) if trace.path else None
    if not trace.found or start_goal is None:
        return Explanation(
            summary_vi=("Không tìm thấy tuyến đường với thuật toán "
                        f"{ALGO_VI[trace.algorithm]} ở cấu hình hiện tại "
                        "(thuật toán không complete hoặc điểm đến không tới được)."),
            congested_segments=[], alternatives=[])
    start, goal = start_goal
    mode, slot = trace.mode, trace.time_slot
    if len(trace.path) < 2:
        # start == goal: a valid trivial route (SCHEMA §B.1, path=[start]).
        # Without this guard the first_edge lookup below indexed path[1]
        # and turned the whole request into a 500 (audit finding L3-01).
        where = store.nodes[start].name or start
        cost_unit_vi = "m" if mode == "distance" else "giây"
        return Explanation(
            summary_vi=(f"Điểm đi và điểm đến trùng nhau ({where}) — quãng đường "
                        f"0 m, chi phí 0 {cost_unit_vi}, không có đoạn đường nào để phân tích. "
                        "Hãy chọn hai điểm khác nhau để so sánh tuyến."),
            congested_segments=[], alternatives=[])
    main_cost = trace.metrics.total_cost
    main_dist = trace.metrics.total_distance_m
    main_time = trace.metrics.total_time_s

    congested = _congested_on_path(store, trace.path, slot)
    risks = _risk_counts(store, trace.path)

    # ---- alternatives: distance-shortest (or balanced when mode=distance),
    # then greedy, then a first-edge-banned fallback so >=1 truly differs.
    specs: list[tuple[str, Mode, str | None]] = []
    if mode == "distance":
        specs.append(("Tuyến chi phí cân bằng thấp nhất", "balanced", None))
    else:
        specs.append(("Tuyến ngắn nhất theo quãng đường", "distance", None))
    first_edge = store.edge_by_uv[(trace.path[0], trace.path[1])]
    specs.append((f"Tuyến không đi qua {first_edge.name or 'đoạn xuất phát hiện tại'}",
                  mode, first_edge.id))

    alternatives: list[Alternative] = []
    shorter_alt_note: str | None = None
    dominated_note: str | None = None
    distance_alt_differs = False
    for label, alt_mode, banned in specs:
        if len(alternatives) >= 2:
            break
        alt_path = _dijkstra_path(store, start, goal, alt_mode, slot, banned)
        if not alt_path or alt_path == trace.path or \
                any(a.path == alt_path for a in alternatives):
            continue
        if alt_mode == "distance" and banned is None:
            distance_alt_differs = True
        _c, alt_dist, alt_time = store.path_metrics(alt_path, mode, slot)
        why = _why_not(store, alt_path, slot, main_time, main_dist, alt_time,
                       alt_dist, main_optimal=trace.metrics.optimal_guarantee)
        alternatives.append(Alternative(
            label=label, path=alt_path, total_distance_m=alt_dist,
            total_time_s=alt_time, why_not_vi=why))
        if alt_dist < main_dist - 10 and alt_time > main_time + 0.5:
            names = _street_names(store, alt_path,
                                  {c.edge for c in _congested_on_path(store, alt_path, slot)})
            cause = f" (dính {', '.join(names)})" if names else ""
            shorter_alt_note = (
                f"Tuyến ngắn hơn {vi_num((main_dist - alt_dist) / 1000, 2)} km về quãng "
                f"đường bị loại vì chậm hơn ~{alt_time - main_time:.0f} s{cause}.")
        elif alt_dist < main_dist - 10 and alt_time < main_time - 0.5 and \
                not trace.metrics.optimal_guarantee:
            dominated_note = (
                f"Đáng chú ý: phương án \"{label}\" vừa ngắn hơn "
                f"{vi_num((main_dist - alt_dist) / 1000, 2)} km vừa nhanh hơn "
                f"~{main_time - alt_time:.0f} s — hệ quả của việc "
                f"{ALGO_VI[trace.algorithm]} không tối ưu theo chi phí.")

    # ---- summary assembly -------------------------------------------------
    totals_str = _fmt_route_totals(main_cost, main_time, main_dist, mode)
    if trace.metrics.optimal_guarantee:
        opening = (f"Tuyến {_path_label(store, trace.path)} được chọn vì {MODE_VI[mode]} "
                   f"({totals_str}) theo thuật toán {ALGO_VI[trace.algorithm]} lúc {slot}.")
    else:
        opening = (f"Tuyến {_path_label(store, trace.path)} là kết quả của "
                   f"{ALGO_VI[trace.algorithm]} — tuyến {ALGO_CRITERION_VI[trace.algorithm]} — "
                   f"với tổng {totals_str}, xét lúc {slot}.")
    parts: list[str] = [opening]
    if congested:
        top = sorted(congested, key=lambda cseg: -cseg.level)[:3]
        seen_labels: list[str] = []
        for cseg in top:
            label = f"{_edge_label(store, cseg.edge)} (mức {cseg.level}/5)"
            if label not in seen_labels:
                seen_labels.append(label)
        parts.append("Trên tuyến vẫn còn đoạn ùn tắc: " + ", ".join(seen_labels) + ".")
    else:
        parts.append(f"Tuyến tránh được mọi đoạn ùn tắc nặng (mức ≥ {CONGESTION_THRESHOLD}/5) lúc {slot}.")
    risk_bits = []
    if risks["flood"]:
        risk_bits.append(f"{risks['flood']} đoạn nguy cơ ngập")
    if risks["construction"]:
        risk_bits.append(f"{risks['construction']} đoạn có lô cốt")
    if risks["traffic_light"]:
        risk_bits.append(f"{risks['traffic_light']} đèn tín hiệu")
    if risk_bits and mode == "balanced":
        parts.append("Chi phí đã tính phạt cho " + ", ".join(risk_bits) + " dọc tuyến.")
    if shorter_alt_note:
        parts.append(shorter_alt_note)
    elif dominated_note:
        parts.append(dominated_note)
    elif mode != "distance" and not distance_alt_differs:
        parts.append("Tuyến được chọn đồng thời ngắn nhất theo quãng đường "
                     "trong các phương án so sánh.")

    if trace.metrics.optimal_guarantee:
        if trace.algorithm == "idastar":
            parts.append(f"IDA* bảo đảm tối ưu trong ngưỡng ε = "
                         f"{vi_num(trace.metrics.epsilon_bound or 5.0)} "
                         f"{_cost_unit(mode)}.")
        else:
            parts.append(f"{ALGO_VI[trace.algorithm]} bảo đảm đây là tuyến tối ưu "
                         "theo tiêu chí đã chọn.")
    else:
        opt_path = _dijkstra_path(store, start, goal, mode, slot)
        if opt_path:
            opt_cost, _d, _t = store.path_metrics(opt_path, mode, slot)
            gap = main_cost - opt_cost
            if gap <= 0.5:
                parts.append(f"{ALGO_VI[trace.algorithm]} không bảo đảm tối ưu, "
                             "nhưng lần chạy này trùng chi phí với tuyến tối ưu.")
            else:
                parts.append(
                    f"{ALGO_VI[trace.algorithm]} không bảo đảm tối ưu: tuyến này "
                    f"đắt hơn tuyến tối ưu ~{gap:.0f} {_cost_unit(mode)} "
                    f"(+{vi_num(gap / opt_cost * 100)} %).")

    return Explanation(summary_vi=" ".join(parts),
                       congested_segments=congested, alternatives=alternatives)
