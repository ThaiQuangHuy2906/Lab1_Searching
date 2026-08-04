"""Validate built data files against docs/SCHEMA.md (Phase 1 gate).

Checks, per graph level (real, demo):
1.  graph_*.json parses through the Pydantic models (all §A constraints:
    counts, id patterns, bbox, formula, reverse-edge rule, no dup pairs).
2.  The graph is strongly connected (pure-Python BFS both directions).
3.  traffic_profiles_*.json parses (§A.4) and covers 100% of the edge ids
    in all 4 time slots — nothing missing, nothing extra.
4.  Edge sanity (KIEMTOAN batch, gap class A/B): length_m >= haversine(u,v)
    on EVERY edge (the admissibility proof rests on it) and free_speed_kmh
    matches the team table (real: exact per highway type; demo: contracted
    weighted averages must stay inside [25, 60]).
5.  Profile sanity (gap class C): on main-road classes the 07:30 mean must
    exceed the 22:00 mean; every slot uses >= 2 distinct levels; and while
    profiles are fully synthetic, 22:00 must stay within {1, 2}.
6.  Risk-flag sanity (gap class E): per-type flagged-edge counts must stay
    within ±20% of the recorded build (EXPECTED_RISK_EDGES — keep in sync
    with DATA.md §7); types expected > 0 must never drop to 0.
7.  meta.source honesty (gap class F): profiles claiming "tomtom+synthetic"
    require actual snapshots under data/raw/tomtom/; synthetic profiles
    with snapshots present only warn (rerun 03b before shipping).
8.  DEMO ONLY (permanent guard, extended by the KIEMTOAN batch): for EVERY
    ordered POI pair, demo shortest / real shortest must be
      <= 1.5 on free-flow time      AND >= 1.0 - FLOOR_EPS (gap class D)
      <= 1.8 on length              AND >= 1.0 - FLOOR_EPS
      <= 1.5 on the BALANCED weight (t_free*f_cong + penalty) at each of
              the 4 slots (fix L1-01 — balanced was previously unguarded;
              no floor here: a corridor crossing two same-type risk zones
              legitimately pays the penalty once while G_real pays twice).
    Plus a named regression pair (Cung Văn hoá Lao Động <-> Hồ Con Rùa)
    must stay <= 2.0x both directions on time and dist.
    The build FAILS on any violation.
9.  Teaching preset config: the tracked `teach_7`/`teach_15`/`teach_25`
    selections match this G_demo snapshot, are nested induced subgraphs, and
    are strongly connected in both directions.

Exit code 0 = everything valid. Run:  python scripts/validate_data.py
"""

from __future__ import annotations

import heapq
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from pipeline_common import (  # noqa: E402
    DEFAULT_SPEED_KMH, MAIN_CLASSES, SPEED_BY_HIGHWAY, haversine_m, load_json,
)
from app.costs import GAMMA, PENALTY_S  # noqa: E402
from app.graph_store import GraphStore  # noqa: E402
from app.models import GraphFile, TrafficProfiles  # noqa: E402
from app.scenario import validate_teaching_presets  # noqa: E402

# same limits as scripts/04_build_gdemo.py — keep in sync
INVARIANT_TIME_RATIO = 1.5
INVARIANT_DIST_RATIO = 1.8
INVARIANT_BAL_RATIO = 1.5
# Floor on time/dist ratios (gap class D: a demo edge physically shorter
# than reality would slip past a ceiling-only check). Slack covers the
# 0.1-km/h speed rounding of contracted edges.
FLOOR_EPS = 0.005
REGRESSION_PAIR = ("Cung Văn hoá Lao Động", "Hồ Con Rùa")
REGRESSION_MAX = 2.0

# Recorded flagged-edge counts of the current build (DATA.md §7). ±20%
# tolerates OSM-snapshot drift on rebuilds; a type recorded > 0 falling to
# 0 (gap class E: risk wiped out => balanced degenerates to time) FAILS.
EXPECTED_RISK_EDGES = {
    "real": {"flood": 54, "construction": 19, "narrow_alley": 8,
             "traffic_light": 185},
    "demo": {"flood": 24, "construction": 24, "narrow_alley": 0,
             "traffic_light": 131},
}


def _edge_penalty(e) -> float:
    r = e.risk
    return (PENALTY_S["flood"] * r.flood
            + PENALTY_S["construction"] * r.construction
            + PENALTY_S["narrow_alley"] * r.narrow_alley
            + PENALTY_S["traffic_light"] * r.traffic_light)


def _adj(graph: GraphFile, kind: str,
         cong: dict[str, int] | None = None) -> dict[str, list[tuple[str, float]]]:
    """Adjacency under exact free-flow time, length, or balanced weights."""
    adj: dict[str, list[tuple[str, float]]] = {n.id: [] for n in graph.nodes}
    for e in graph.edges:
        t_exact = e.length_m / (e.free_speed_kmh / 3.6)
        if kind == "dist":
            w = e.length_m
        elif kind == "time":
            w = t_exact
        else:  # balanced — same formula as backend/app/costs.edge_weight
            w = (t_exact * (1.0 + GAMMA * (cong[e.id] - 1) / 4.0)
                 + _edge_penalty(e))
        adj[e.u].append((e.v, w))
    return adj


def _sssp(adj: dict[str, list[tuple[str, float]]], src: str) -> dict[str, float]:
    dist = {src: 0.0}
    heap = [(0.0, 0, src)]
    done: set[str] = set()
    tie = 0
    while heap:
        d, _t, node = heapq.heappop(heap)
        if node in done:
            continue
        done.add(node)
        for nbr, w in adj[node]:
            nd = d + w
            if nd < dist.get(nbr, float("inf")):
                dist[nbr] = nd
                tie += 1
                heapq.heappush(heap, (nd, tie, nbr))
    return dist


def check_demo_invariant(demo: GraphFile, real: GraphFile,
                         demo_prof: TrafficProfiles,
                         real_prof: TrafficProfiles) -> dict:
    """Assert the six demo/real ratio invariants; return summary stats."""
    real_by_coord = {(n.lat, n.lon): n.id for n in real.nodes}
    d2r = {}
    for n in demo.nodes:
        rid = real_by_coord.get((n.lat, n.lon))
        assert rid is not None, f"demo node {n.id} ({n.name}) has no G_real twin"
        d2r[n.id] = rid

    kinds: list[tuple[str, float, bool, dict | None, dict | None]] = [
        # (label, upper limit, has floor, demo cong, real cong)
        ("time", INVARIANT_TIME_RATIO, True, None, None),
        ("dist", INVARIANT_DIST_RATIO, True, None, None),
    ]
    for slot in demo_prof.profiles:
        kinds.append((f"bal@{slot}", INVARIANT_BAL_RATIO, False,
                      demo_prof.profiles[slot], real_prof.profiles[slot]))

    stats: dict = {}
    for label, limit, has_floor, dcong, rcong in kinds:
        base = label.split("@")[0] if label.startswith("bal") else label
        demo_adj = _adj(demo, "bal" if dcong else base, dcong)
        real_adj = _adj(real, "bal" if rcong else base, rcong)
        demo_ap = {n.id: _sssp(demo_adj, n.id) for n in demo.nodes}
        real_ap = {n.id: _sssp(real_adj, d2r[n.id]) for n in demo.nodes}
        ratios = []
        for a in demo.nodes:
            for b in demo.nodes:
                if a.id == b.id:
                    continue
                d = demo_ap[a.id].get(b.id)
                assert d is not None, \
                    f"demo unreachable: {a.name} -> {b.name} ({label})"
                r = d / real_ap[a.id][d2r[b.id]]
                assert r <= limit + 1e-6, (
                    f"invariant vỡ ({label}): {a.name} -> {b.name} = {r:.2f}x "
                    f"(giới hạn {limit})")
                if has_floor:
                    assert r >= 1.0 - FLOOR_EPS, (
                        f"invariant sàn vỡ ({label}): {a.name} -> {b.name} = "
                        f"{r:.4f}x < 1.0 — demo nhanh/ngắn hơn mức vật lý cho phép")
                ratios.append(r)
        ratios.sort()
        stats[label] = {
            "median": statistics.median(ratios),
            "p90": ratios[int(0.9 * len(ratios))],
            "max": ratios[-1],
        }

    # named regression pair, both directions, both core weights, <= 2.0x
    by_name = {n.name: n.id for n in demo.nodes}
    a, b = (by_name[REGRESSION_PAIR[0]], by_name[REGRESSION_PAIR[1]])
    for kind in ("time", "dist"):
        demo_adj = _adj(demo, kind)
        real_adj = _adj(real, kind)
        for x, y in ((a, b), (b, a)):
            r = _sssp(demo_adj, x)[y] / _sssp(real_adj, d2r[x])[d2r[y]]
            assert r <= REGRESSION_MAX + 1e-6, (
                f"regression {REGRESSION_PAIR} ({kind}, {x}->{y}): {r:.2f}x > {REGRESSION_MAX}")
            stats.setdefault("regression", {})[f"{kind}:{x}->{y}"] = r
    return stats


def check_strongly_connected(graph: GraphFile) -> None:
    nodes = {n.id for n in graph.nodes}
    fwd: dict[str, list[str]] = {n: [] for n in nodes}
    bwd: dict[str, list[str]] = {n: [] for n in nodes}
    for e in graph.edges:
        fwd[e.u].append(e.v)
        bwd[e.v].append(e.u)

    def reach(adj: dict[str, list[str]], src: str) -> int:
        seen, stack = {src}, [src]
        while stack:
            for nxt in adj[stack.pop()]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
        return len(seen)

    src = graph.nodes[0].id
    n_fwd, n_bwd = reach(fwd, src), reach(bwd, src)
    if n_fwd != len(nodes) or n_bwd != len(nodes):
        raise AssertionError(
            f"{graph.meta.name} not strongly connected: "
            f"forward {n_fwd}/{len(nodes)}, backward {n_bwd}/{len(nodes)}"
        )


def check_edge_sanity(graph: GraphFile, level: str) -> None:
    """Gap classes A + B: physical geometry and sane speeds."""
    coord = {n.id: (n.lat, n.lon) for n in graph.nodes}
    for e in graph.edges:
        (ulat, ulon), (vlat, vlon) = coord[e.u], coord[e.v]
        hav = haversine_m(ulat, ulon, vlat, vlon)
        assert e.length_m >= hav - 1e-6, (
            f"{graph.meta.name} {e.id}: length {e.length_m} m < haversine "
            f"{hav:.1f} m — phá admissibility (Bổ đề 1)")
        if level == "real":
            expected = SPEED_BY_HIGHWAY.get(e.highway, DEFAULT_SPEED_KMH)
            assert e.free_speed_kmh == expected, (
                f"{graph.meta.name} {e.id}: free_speed {e.free_speed_kmh} != "
                f"{expected} (bảng DATA.md §3 cho '{e.highway}')")
        else:  # demo: weighted averages of the table => bounded by its range
            assert 25.0 <= e.free_speed_kmh <= 60.0, (
                f"{graph.meta.name} {e.id}: free_speed {e.free_speed_kmh} "
                f"ngoài [25, 60] km/h")


def check_profile_sanity(graph: GraphFile, profiles: TrafficProfiles) -> None:
    """Gap class C: peak must beat night on main roads; no flat profiles."""
    main_ids = {e.id for e in graph.edges if e.highway in MAIN_CLASSES}
    assert main_ids, f"{graph.meta.name}: không có cạnh trục chính nào?"
    peak = profiles.profiles["07:30"]
    night = profiles.profiles["22:00"]
    mean_peak = sum(peak[i] for i in main_ids) / len(main_ids)
    mean_night = sum(night[i] for i in main_ids) / len(main_ids)
    assert mean_peak > mean_night, (
        f"{graph.meta.name}: 07:30 (mean {mean_peak:.2f}) không kẹt hơn "
        f"22:00 (mean {mean_night:.2f}) trên trục chính — profile phản thực tế")
    for slot, cong in profiles.profiles.items():
        assert len(set(cong.values())) >= 2, (
            f"{graph.meta.name} slot {slot}: chỉ một mức congestion duy nhất")
    if profiles.meta.source == "synthetic":
        bad = {v for v in night.values()} - {1, 2}
        assert not bad, (
            f"{graph.meta.name}: 22:00 synthetic chứa mức {sorted(bad)} "
            f"ngoài {{1,2}} (luật DATA.md §5)")


def check_risk_counts(graph: GraphFile, level: str) -> None:
    """Gap class E: risk flags wiped out or drifting far from the build."""
    for kind, expected in EXPECTED_RISK_EDGES[level].items():
        actual = sum(getattr(e.risk, kind) for e in graph.edges)
        if expected == 0:
            continue  # e.g. narrow_alley on demo — nothing to guard
        assert actual > 0, (
            f"{graph.meta.name}: 0 cạnh {kind} (build ghi nhận {expected}) — "
            f"risk bị xoá sạch, balanced suy biến thành time")
        assert abs(actual - expected) <= 0.2 * expected, (
            f"{graph.meta.name}: {actual} cạnh {kind} lệch >20% so với "
            f"build đã ghi ({expected}) — cập nhật EXPECTED_RISK_EDGES + "
            f"DATA.md §7 nếu là chủ đích")


def check_source_consistency(profiles: TrafficProfiles, prof_name: str) -> None:
    """Gap class F: meta.source must match reality on disk."""
    snapshots = list((ROOT / "data" / "raw" / "tomtom").glob("*/flow_*.json"))
    if "tomtom" in profiles.meta.source:
        assert snapshots, (
            f"{prof_name}: meta.source='{profiles.meta.source}' nhưng "
            f"data/raw/tomtom/ không có snapshot nào — nguồn khai man")
    elif snapshots:
        print(f"  WARNING {prof_name}: có {len(snapshots)} snapshot TomTom "
              f"trong data/raw/ nhưng source vẫn 'synthetic' — chạy lại 03b "
              f"trước khi nộp")


def validate_level(level: str) -> str:
    graph_path = ROOT / "data" / f"graph_{level}.json"
    prof_path = ROOT / "data" / f"traffic_profiles_{level}.json"
    graph = GraphFile.model_validate(load_json(graph_path))
    profiles = TrafficProfiles.model_validate(load_json(prof_path))

    check_strongly_connected(graph)

    edge_ids = {e.id for e in graph.edges}
    for slot, cong in profiles.profiles.items():
        missing = edge_ids - cong.keys()
        extra = cong.keys() - edge_ids
        if missing or extra:
            raise AssertionError(
                f"{prof_path.name} slot {slot}: missing {len(missing)}, "
                f"extra {len(extra)} edge ids"
            )

    check_edge_sanity(graph, level)
    check_profile_sanity(graph, profiles)
    check_risk_counts(graph, level)
    check_source_consistency(profiles, prof_path.name)

    extra = ""
    if level == "demo":
        real = GraphFile.model_validate(load_json(ROOT / "data" / "graph_real.json"))
        real_prof = TrafficProfiles.model_validate(
            load_json(ROOT / "data" / "traffic_profiles_real.json"))
        st = check_demo_invariant(graph, real, profiles, real_prof)
        bal_max = max(st[k]["max"] for k in st if k.startswith("bal@"))
        extra = (f", invariant OK (time median {st['time']['median']:.2f} / "
                 f"p90 {st['time']['p90']:.2f} / max {st['time']['max']:.2f}; "
                 f"dist median {st['dist']['median']:.2f} / "
                 f"p90 {st['dist']['p90']:.2f} / max {st['dist']['max']:.2f}; "
                 f"balanced 4 slot max {bal_max:.2f})")

    oneway = sum(1 for e in graph.edges if e.oneway)
    risks = {k: sum(getattr(e.risk, k) for e in graph.edges)
             for k in ("flood", "construction", "narrow_alley", "traffic_light")}
    return (f"{graph.meta.name}: {graph.meta.node_count} nodes, "
            f"{graph.meta.edge_count} edges ({oneway} oneway), "
            f"strongly connected OK, profiles 4x100% OK{extra}, risk edges {risks}")


def main() -> None:
    for level in ("real", "demo"):
        print("OK -", validate_level(level))
    validate_teaching_presets(GraphStore.load("demo"))
    print("OK - teaching graph presets: 7/15/25 induced SCC views valid")
    print("ALL DATA VALID")


if __name__ == "__main__":
    main()
