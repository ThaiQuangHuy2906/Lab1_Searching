"""Generate mock data conforming to docs/SCHEMA.md (Phase 0).

Outputs (data/mock/): graph_mock.json, traffic_profiles_mock.json,
trace_mock.json, multiroute_mock.json.

Purpose: let the frontend start against realistic payloads and let
tests/test_schema.py validate the contracts BEFORE the real pipeline
(Phase 1) and the real algorithms (Phase 2+) exist.

MOCK-ONLY notes:
- 8 real District-1 landmarks, 16 directed edges with real street names,
  but one-way directions are SIMPLIFIED — not a ground-truth street map.
  The real G_demo (Phase 1) takes `oneway` from OSM.
- The tiny A*/UCS helpers below exist ONLY to make mock numbers
  self-consistent. The product implementations live in backend/app/
  (Phase 2) — do not import from here.
- Everything is deterministic (seed 42, fixed `created` date, fixed
  runtime_ms): re-running must reproduce byte-identical files.
- Node ids are numbered in declaration order (real pipeline sorts by
  osmid, SCHEMA §A rule 7); edge ids follow SCHEMA rule 7: sort by (u, v).
"""

from __future__ import annotations

import heapq
import json
import math
import random
from pathlib import Path

SEED = 42
CREATED = "2026-07-26"
GAMMA = 1.5
PENALTY_S = {"flood": 60, "construction": 90, "narrow_alley": 30, "traffic_light": 25}
# Team-defined free-flow speeds by highway type (starting table, PROMPT-MASTER 6.1).
SPEED_BY_HIGHWAY = {"trunk": 45, "primary": 45, "secondary": 40, "tertiary": 35,
                    "residential": 30, "alley": 25, "service": 25}
TIME_SLOTS = ("07:30", "12:00", "17:30", "22:00")
BBOX = (106.680, 10.760, 106.720, 10.800)  # (left, bottom, right, top)

OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "mock"

# (name, lat, lon, type) — real central HCMC landmarks inside BBOX.
NODES = [
    ("Chợ Bến Thành",          10.7725, 106.6980, "landmark"),
    ("Nhà thờ Đức Bà",         10.7798, 106.6990, "landmark"),
    ("Bưu điện Thành phố",     10.7797, 106.6999, "landmark"),
    ("Dinh Độc Lập",           10.7770, 106.6953, "landmark"),
    ("Hồ Con Rùa",             10.7826, 106.6959, "landmark"),
    ("Công viên Tao Đàn",      10.7736, 106.6923, "landmark"),
    ("Bitexco Financial Tower", 10.7717, 106.7043, "landmark"),
    ("Nhà hát Thành phố",      10.7766, 106.7032, "landmark"),
]

# (u_idx, v_idx, street name, highway, oneway, risk overrides)
# Two-way streets appear as two mirrored entries (SCHEMA §A rule 1).
EDGE_DEFS = [
    (0, 7, "Lê Lợi", "primary", False, {"traffic_light": 1}),
    (7, 0, "Lê Lợi", "primary", False, {"traffic_light": 1}),
    (7, 6, "Hải Triều", "tertiary", True, {"construction": 1}),
    (6, 0, "Hàm Nghi", "primary", False, {"traffic_light": 1}),
    (0, 6, "Hàm Nghi", "primary", False, {"traffic_light": 1}),
    (0, 5, "Trương Định", "residential", False, {"flood": 1}),
    (5, 0, "Trương Định", "residential", False, {"flood": 1}),
    (5, 3, "Huyền Trân Công Chúa", "residential", True, {"narrow_alley": 1}),
    (3, 1, "Lê Duẩn", "primary", False, {"traffic_light": 1}),
    (1, 3, "Lê Duẩn", "primary", False, {"traffic_light": 1}),
    (1, 2, "Công xã Paris", "tertiary", False, {}),
    (2, 1, "Công xã Paris", "tertiary", False, {}),
    (4, 1, "Phạm Ngọc Thạch", "secondary", True, {"traffic_light": 1}),
    (2, 4, "Hai Bà Trưng", "secondary", True, {"traffic_light": 1}),
    (3, 4, "Pasteur", "secondary", True, {}),
    (1, 7, "Đồng Khởi", "secondary", True, {"traffic_light": 1}),
]


def vi_num(x: float, nd: int = 1) -> str:
    """Vietnamese decimal comma, e.g. 6.6 -> '6,6'."""
    return f"{x:.{nd}f}".replace(".", ",")


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def build_graph() -> dict:
    rng = random.Random(SEED)
    nodes = [
        {"id": f"n{i + 1:04d}", "name": name, "lat": lat, "lon": lon, "type": typ}
        for i, (name, lat, lon, typ) in enumerate(NODES)
    ]
    # Winding factor per physical street segment: both directions of a
    # two-way street must share the same length.
    winding: dict[tuple, float] = {}
    for u_i, v_i, name, *_ in EDGE_DEFS:
        key = (min(u_i, v_i), max(u_i, v_i), name)
        if key not in winding:
            winding[key] = rng.uniform(1.10, 1.35)

    raw_edges = []
    for u_i, v_i, name, highway, oneway, risk_over in EDGE_DEFS:
        (_, ulat, ulon, _), (_, vlat, vlon, _) = NODES[u_i], NODES[v_i]
        length = round(haversine_m(ulat, ulon, vlat, vlon)
                       * winding[(min(u_i, v_i), max(u_i, v_i), name)], 1)
        speed = SPEED_BY_HIGHWAY[highway]
        risk = {"flood": 0, "construction": 0, "narrow_alley": 0, "traffic_light": 0}
        risk.update(risk_over)
        raw_edges.append({
            "u": f"n{u_i + 1:04d}", "v": f"n{v_i + 1:04d}", "name": name,
            "length_m": length, "highway": highway, "oneway": oneway,
            "free_speed_kmh": speed,
            "free_travel_time_s": round(length / (speed / 3.6), 1),
            "risk": risk,
        })
    raw_edges.sort(key=lambda e: (e["u"], e["v"]))  # SCHEMA §A rule 7
    edges = [{"id": f"e{i + 1:05d}", **e} for i, e in enumerate(raw_edges)]

    return {
        "meta": {"name": "G_mock", "bbox": list(BBOX), "directed": True,
                 "created": CREATED, "crs": "EPSG:4326",
                 "node_count": len(nodes), "edge_count": len(edges)},
        "nodes": nodes,
        "edges": edges,
    }


def build_profiles(graph: dict) -> dict:
    """Rough synthetic congestion rules (full ruleset lands in DATA.md, Phase 1):
    peaks (07:30, 17:30): primary 4-5, secondary 3-4, others 2-3;
    12:00 = morning peak minus 1 (floor 1); 22:00: 1-2. Seeded noise."""
    rng = random.Random(SEED)
    peak_ranges = {"primary": (4, 5), "trunk": (4, 5), "secondary": (3, 4)}
    profiles: dict[str, dict[str, int]] = {s: {} for s in TIME_SLOTS}
    for e in graph["edges"]:  # already id-sorted -> deterministic rng order
        lo, hi = peak_ranges.get(e["highway"], (2, 3))
        morning = rng.randint(lo, hi)
        evening = rng.randint(lo, hi)
        profiles["07:30"][e["id"]] = morning
        profiles["17:30"][e["id"]] = evening
        profiles["12:00"][e["id"]] = max(1, morning - 1)
        profiles["22:00"][e["id"]] = rng.randint(1, 2)
    return {"meta": {"graph": "G_mock", "created": CREATED, "source": "synthetic"},
            "profiles": profiles}


# --- tiny mock-only search helpers (real ones: backend/app, Phase 2) -------

def edge_weight_balanced(e: dict, congestion: int) -> float:
    f_cong = 1 + GAMMA * (congestion - 1) / 4
    penalty = sum(PENALTY_S[k] * v for k, v in e["risk"].items())
    return e["free_travel_time_s"] * f_cong + penalty


def make_adj(graph: dict, prof: dict, slot: str) -> dict[str, list[tuple[str, float, dict]]]:
    adj: dict[str, list] = {n["id"]: [] for n in graph["nodes"]}
    for e in graph["edges"]:
        adj[e["u"]].append((e["v"], edge_weight_balanced(e, prof["profiles"][slot][e["id"]]), e))
    return adj


def mock_ucs(adj: dict, start: str, goal: str,
             banned_edge: str | None = None) -> tuple[list[str], float, float, float]:
    """Returns (path, cost, distance_m, time_s); cost==time_s (balanced)."""
    g = {start: 0.0}
    parent: dict[str, tuple[str, dict]] = {}
    pq = [(0.0, start)]
    done: set[str] = set()
    while pq:
        d, node = heapq.heappop(pq)
        if node in done:
            continue
        done.add(node)
        if node == goal:
            break
        for v, w, e in adj[node]:
            if e["id"] == banned_edge or v in done:
                continue
            nd = d + w
            if nd < g.get(v, math.inf):
                g[v] = nd
                parent[v] = (node, e)
                heapq.heappush(pq, (nd, v))
    if goal not in done:
        raise RuntimeError(f"mock graph must be strongly connected: {start}->{goal}")
    path, dist = [goal], 0.0
    while path[-1] != start:
        prev, e = parent[path[-1]]
        dist += e["length_m"]
        path.append(prev)
    path.reverse()
    return path, round(g[goal], 1), round(dist, 1), round(g[goal], 1)


def build_trace(graph: dict, prof: dict) -> dict:
    """Hand-checkable A* run: Công viên Tao Đàn -> Nhà hát Thành phố, 07:30 balanced."""
    slot, start, goal = "07:30", "n0006", "n0008"
    adj = make_adj(graph, prof, slot)
    coord = {n["id"]: (n["lat"], n["lon"]) for n in graph["nodes"]}
    v_max_ms = max(SPEED_BY_HIGHWAY.values()) / 3.6

    def h(nid: str) -> float:
        return haversine_m(*coord[nid], *coord[goal]) / v_max_ms

    g = {start: 0.0}
    parent: dict[str, tuple[str, dict]] = {}
    pq = [(h(start), h(start), start)]  # (f, h tie-break, node)
    closed: set[str] = set()
    steps, max_frontier = [], 0
    while pq:
        _, _, node = heapq.heappop(pq)
        if node in closed:
            continue
        closed.add(node)
        if node != goal:
            for v, w, e in adj[node]:
                if v in closed:
                    continue
                ng = g[node] + w
                if ng < g.get(v, math.inf):
                    g[v] = ng
                    parent[v] = (node, e)
                    heapq.heappush(pq, (ng + h(v), h(v), v))
        frontier = sorted({n for _, _, n in pq if n not in closed})
        max_frontier = max(max_frontier, len(frontier))
        steps.append({
            "step": len(steps) + 1, "expanded": node, "frontier": frontier,
            "g": {n: round(g[n], 1) for n in frontier},
            "h": {n: round(h(n), 1) for n in frontier},
            "f": {n: round(g[n] + h(n), 1) for n in frontier},
        })
        if node == goal:
            break

    path, dist = [goal], 0.0
    while path[-1] != start:
        prev, e = parent[path[-1]]
        dist += e["length_m"]
        path.append(prev)
    path.reverse()
    total_cost = round(g[goal], 1)
    dist = round(dist, 1)

    path_edges = []
    lookup = {(e["u"], e["v"]): e for e in graph["edges"]}
    for a, b in zip(path, path[1:]):
        path_edges.append(lookup[(a, b)])
    congested = [
        {"edge": e["id"], "name": e["name"], "level": prof["profiles"][slot][e["id"]]}
        for e in path_edges if prof["profiles"][slot][e["id"]] >= 4
    ]

    # Alternative that provably differs: ban the chosen route's first edge.
    alt_path, alt_cost, alt_dist, alt_time = mock_ucs(
        adj, start, goal, banned_edge=path_edges[0]["id"])
    names = {n["id"]: n["name"] for n in graph["nodes"]}
    via = lookup[(alt_path[0], alt_path[1])]["name"]
    summary = (
        f"Tuyến {' → '.join(names[n] for n in path)} được chọn vì tổng chi phí thấp nhất "
        f"({total_cost:.0f} s ≈ {vi_num(total_cost / 60)} phút; {vi_num(dist / 1000, 2)} km) theo chế độ cân bằng lúc {slot}. "
        + (f"Trên tuyến có đoạn ùn tắc: {', '.join(f'{c['name']} (mức {c['level']}/5)' for c in congested)}. "
           if congested else "Tuyến không đi qua đoạn ùn tắc nặng nào (mức ≥ 4/5). ")
        + f"Tuyến thay thế qua {via} bị loại vì tổng chi phí cao hơn {alt_cost - total_cost:.0f} s "
        f"({alt_cost:.0f} s so với {total_cost:.0f} s). A* với heuristic admissible đảm bảo tuyến tối ưu."
    )
    return {
        "algorithm": "astar", "mode": "balanced", "time_slot": slot, "graph": "demo",
        "found": True, "path": path,
        "metrics": {
            "total_cost": total_cost, "total_distance_m": dist, "total_time_s": total_cost,
            "nodes_expanded": len(steps), "max_frontier": max_frontier,
            "runtime_ms": 1.2,  # fixed mock value; real measurement in Phase 2
            "optimal_guarantee": True, "epsilon_bound": None, "beam_width": None,
            "trace_truncated": False,
        },
        "trace": steps,
        "explanation": {
            "summary_vi": summary,
            "congested_segments": congested,
            "alternatives": [{
                "label": f"Tuyến thay thế qua {via}", "path": alt_path,
                "total_distance_m": alt_dist, "total_time_s": alt_time,
                "why_not_vi": (
                    f"Tổng chi phí cao hơn ~{alt_cost - total_cost:.0f} s so với tuyến được chọn "
                    f"tại khung giờ {slot}, nên bị loại dù vẫn tới đích."),
            }],
        },
    }


def build_bidijkstra_trace(graph: dict, prof: dict) -> dict:
    """Bidirectional Dijkstra sample: Bitexco -> Hồ Con Rùa, 07:30 balanced.

    Ships a per-step `side` so the frontend can two-tone the animation
    (SCHEMA §B.3). Frontier is the union of both open lists; a node in
    both shows the smaller of its two g values.
    """
    slot, start, goal = "07:30", "n0007", "n0005"
    adj = make_adj(graph, prof, slot)
    radj: dict[str, list[tuple[str, float, dict]]] = {n["id"]: [] for n in graph["nodes"]}
    for u, lst in adj.items():
        for v, w, e in lst:
            radj[v].append((u, w, e))

    g_f, g_b = {start: 0.0}, {goal: 0.0}
    par_f: dict[str, tuple[str, dict]] = {}
    par_b: dict[str, tuple[str, dict]] = {}
    pq_f, pq_b = [(0.0, start)], [(0.0, goal)]
    done_f: set[str] = set()
    done_b: set[str] = set()
    mu, meet = math.inf, None
    steps, max_frontier = [], 0

    def peek(pq: list, done: set) -> float:
        while pq and pq[0][1] in done:
            heapq.heappop(pq)
        return pq[0][0] if pq else math.inf

    while True:
        top_f, top_b = peek(pq_f, done_f), peek(pq_b, done_b)
        if top_f + top_b >= mu or (top_f == math.inf and top_b == math.inf):
            break  # standard stopping rule: best possible meeting >= best seen
        side = "forward" if top_f <= top_b else "backward"
        pq, done, g_this, g_other, par, edges_of = (
            (pq_f, done_f, g_f, g_b, par_f, adj) if side == "forward"
            else (pq_b, done_b, g_b, g_f, par_b, radj))
        _, node = heapq.heappop(pq)
        done.add(node)
        if node in g_other and g_f.get(node, math.inf) + g_b.get(node, math.inf) < mu:
            mu, meet = g_f[node] + g_b[node], node
        for v, w, e in edges_of[node]:
            if v in done:
                continue
            ng = g_this[node] + w
            if ng < g_this.get(v, math.inf):
                g_this[v] = ng
                par[v] = (node, e)
                heapq.heappush(pq, (ng, v))
                if v in g_other and g_f.get(v, math.inf) + g_b.get(v, math.inf) < mu:
                    mu, meet = g_f[v] + g_b[v], v
        front_f = {n for _, n in pq_f if n not in done_f}
        front_b = {n for _, n in pq_b if n not in done_b}
        frontier = sorted(front_f | front_b)
        max_frontier = max(max_frontier, len(frontier))
        steps.append({
            "step": len(steps) + 1, "expanded": node, "frontier": frontier,
            "g": {n: round(min(g_f.get(n, math.inf), g_b.get(n, math.inf)), 1)
                  for n in frontier},
            "h": None, "f": None, "side": side,
        })

    assert meet is not None, "mock graph must connect start and goal"
    left, dist = [meet], 0.0
    while left[-1] != start:
        prev, e = par_f[left[-1]]
        dist += e["length_m"]
        left.append(prev)
    left.reverse()
    right = []
    cur = meet
    while cur != goal:
        nxt, e = par_b[cur]
        dist += e["length_m"]
        right.append(nxt)
        cur = nxt
    path = left + right
    return {
        "algorithm": "bidijkstra", "mode": "balanced", "time_slot": slot, "graph": "demo",
        "found": True, "path": path,
        "metrics": {
            "total_cost": round(mu, 1), "total_distance_m": round(dist, 1),
            "total_time_s": round(mu, 1),
            "nodes_expanded": len(steps), "max_frontier": max_frontier,
            "runtime_ms": 1.5,  # fixed mock value; real measurement in Phase 3
            "optimal_guarantee": True, "epsilon_bound": None, "beam_width": None,
            "trace_truncated": False,
        },
        "trace": steps,
        "explanation": {"summary_vi": "", "congested_segments": [], "alternatives": []},
    }


def build_multiroute(graph: dict, prof: dict) -> dict:
    """NN + improvement mock: Bến Thành -> {Hồ Con Rùa, Bitexco, Nhà thờ Đức Bà}."""
    slot, start = "07:30", "n0001"
    stops = ["n0005", "n0007", "n0002"]
    adj = make_adj(graph, prof, slot)
    pts = [start] + stops
    legs_cache = {(a, b): mock_ucs(adj, a, b) for a in pts for b in pts if a != b}
    cost = {k: v[1] for k, v in legs_cache.items()}

    def tour_cost(order: list[str]) -> float:
        return round(sum(cost[(a, b)] for a, b in zip(order, order[1:])), 1)

    # Nearest-neighbour start...
    order, left = [start], set(stops)
    while left:
        nxt = min(sorted(left), key=lambda s: cost[(order[-1], s)])
        order.append(nxt)
        left.remove(nxt)
    # ...then exhaustive swap improvement (asymmetric-safe full recompute).
    improved = True
    while improved:
        improved = False
        for i in range(1, len(order)):
            for j in range(i + 1, len(order)):
                cand = order[:i] + [order[j]] + order[i + 1:j] + [order[i]] + order[j + 1:]
                if tour_cost(cand) < tour_cost(order):
                    order, improved = cand, True

    def totals(o: list[str]) -> dict:
        c = tour_cost(o)
        d = round(sum(legs_cache[(a, b)][2] for a, b in zip(o, o[1:])), 1)
        return {"total_cost": c, "total_distance_m": d, "total_time_s": c}

    opt, orig = totals(order), totals(pts)
    legs = [
        {"from_node": a, "to_node": b, "path": legs_cache[(a, b)][0],
         "metrics": {"total_cost": cost[(a, b)],
                     "total_distance_m": legs_cache[(a, b)][2],
                     "total_time_s": legs_cache[(a, b)][3]}}
        for a, b in zip(order, order[1:])
    ]
    return {
        "method": "nn_2opt", "mode": "balanced", "time_slot": slot, "graph": "demo",
        "found": True, "order": order, "legs": legs,
        "totals": opt, "original_order_totals": orig,
        "savings_pct": round((orig["total_cost"] - opt["total_cost"]) / orig["total_cost"] * 100, 1),
        "optimal_guarantee": False,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    graph = build_graph()
    prof = build_profiles(graph)
    files = {
        "graph_mock.json": graph,
        "traffic_profiles_mock.json": prof,
        "trace_mock.json": build_trace(graph, prof),
        "trace_bidijkstra_mock.json": build_bidijkstra_trace(graph, prof),
        "multiroute_mock.json": build_multiroute(graph, prof),
    }
    for fname, payload in files.items():
        out = OUT_DIR / fname
        out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                       encoding="utf-8")
        print(f"wrote {out.relative_to(OUT_DIR.parents[1])}")
    print(f"nodes={graph['meta']['node_count']} edges={graph['meta']['edge_count']} "
          f"trace_steps={len(files['trace_mock.json']['trace'])} "
          f"bidi_steps={len(files['trace_bidijkstra_mock.json']['trace'])} "
          f"tsp_savings={files['multiroute_mock.json']['savings_pct']}%")


if __name__ == "__main__":
    main()
