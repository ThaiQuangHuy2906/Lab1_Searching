"""Validate built data files against docs/SCHEMA.md (Phase 1 gate).

Checks, per graph level (real, demo):
1. graph_*.json parses through the Pydantic models (all §A constraints:
   counts, id patterns, bbox, formula, reverse-edge rule, no dup pairs).
2. The graph is strongly connected (pure-Python BFS both directions).
3. traffic_profiles_*.json parses (§A.4) and covers 100% of the edge ids
   in all 4 time slots — nothing missing, nothing extra.
4. DEMO ONLY (permanent guard added after the 2026-07-26 external audit
   found demo distances up to 20.7x the real ones): for EVERY ordered
   POI pair, demo shortest / real shortest must be <= 1.5 on free-flow
   time AND <= 1.8 on length; plus a named regression pair
   (Cung Văn hoá Lao Động <-> Hồ Con Rùa) must stay <= 2.0x both
   directions. The build FAILS on any violation.

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

from pipeline_common import load_json  # noqa: E402
from app.models import GraphFile, TrafficProfiles  # noqa: E402

# same limits as scripts/04_build_gdemo.py — keep in sync
INVARIANT_TIME_RATIO = 1.5
INVARIANT_DIST_RATIO = 1.8
REGRESSION_PAIR = ("Cung Văn hoá Lao Động", "Hồ Con Rùa")
REGRESSION_MAX = 2.0


def _adj(graph: GraphFile, kind: str) -> dict[str, list[tuple[str, float]]]:
    """Adjacency with exact free-flow time or length weights."""
    adj: dict[str, list[tuple[str, float]]] = {n.id: [] for n in graph.nodes}
    for e in graph.edges:
        w = e.length_m if kind == "dist" else e.length_m / (e.free_speed_kmh / 3.6)
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


def check_demo_invariant(demo: GraphFile, real: GraphFile) -> dict:
    """Assert the demo/real ratio invariant; return summary stats."""
    real_by_coord = {(n.lat, n.lon): n.id for n in real.nodes}
    d2r = {}
    for n in demo.nodes:
        rid = real_by_coord.get((n.lat, n.lon))
        assert rid is not None, f"demo node {n.id} ({n.name}) has no G_real twin"
        d2r[n.id] = rid

    stats: dict = {}
    for kind, limit in (("time", INVARIANT_TIME_RATIO), ("dist", INVARIANT_DIST_RATIO)):
        demo_adj = _adj(demo, kind)
        real_adj = _adj(real, kind)
        demo_ap = {n.id: _sssp(demo_adj, n.id) for n in demo.nodes}
        real_ap = {n.id: _sssp(real_adj, d2r[n.id]) for n in demo.nodes}
        ratios = []
        for a in demo.nodes:
            for b in demo.nodes:
                if a.id == b.id:
                    continue
                d = demo_ap[a.id].get(b.id)
                assert d is not None, \
                    f"demo unreachable: {a.name} -> {b.name} ({kind})"
                r = d / real_ap[a.id][d2r[b.id]]
                assert r <= limit + 1e-6, (
                    f"invariant vỡ ({kind}): {a.name} -> {b.name} = {r:.2f}x "
                    f"(giới hạn {limit})")
                ratios.append(r)
        ratios.sort()
        stats[kind] = {
            "median": statistics.median(ratios),
            "p90": ratios[int(0.9 * len(ratios))],
            "max": ratios[-1],
        }

    # named regression pair, both directions, both weights, <= 2.0x
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

    extra = ""
    if level == "demo":
        real = GraphFile.model_validate(load_json(ROOT / "data" / "graph_real.json"))
        st = check_demo_invariant(graph, real)
        extra = (f", invariant OK (time median {st['time']['median']:.2f} / "
                 f"p90 {st['time']['p90']:.2f} / max {st['time']['max']:.2f}; "
                 f"dist median {st['dist']['median']:.2f} / "
                 f"p90 {st['dist']['p90']:.2f} / max {st['dist']['max']:.2f})")

    oneway = sum(1 for e in graph.edges if e.oneway)
    risks = {k: sum(getattr(e.risk, k) for e in graph.edges)
             for k in ("flood", "construction", "narrow_alley", "traffic_light")}
    return (f"{graph.meta.name}: {graph.meta.node_count} nodes, "
            f"{graph.meta.edge_count} edges ({oneway} oneway), "
            f"strongly connected OK, profiles 4x100% OK{extra}, risk edges {risks}")


def main() -> None:
    for level in ("real", "demo"):
        print("OK -", validate_level(level))
    print("ALL DATA VALID")


if __name__ == "__main__":
    main()
