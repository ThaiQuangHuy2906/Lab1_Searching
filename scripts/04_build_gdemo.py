"""Step 04 — build G_demo from real POIs snapped onto G_real (SCHEMA §A).

REWRITTEN after the external audit (2026-07-26) found G_demo distorted
distances (median demo/real = 1.69, worst 20.7x): the old ONEWAY_RATIO
rule deleted 30+ legitimate reverse directions, and the old pruning only
checked a local 1.5x detour at deletion time, compounding across
deletions and never protecting distance mode.

Recipe now:
1. Load real landmarks from data/gdemo_pois.json; snap to nearest free
   G_real node (2nd-nearest within 120 m on conflict).
2. Adjacency: k nearest POIs (k grows 3->5 until one big SCC). Each
   DIRECTION is kept independently iff its shortest real path does not
   pass through a third POI. NO length-ratio deletion: both directions
   of an adjacent pair get their own contracted edge with that
   direction's true path attributes (asymmetry is CORRECT and feeds
   ATSP). One-way demo edges now only arise from the third-POI rule or
   unreachability.
3. REPAIR: enforce the global invariants — for EVERY ordered POI pair,
   demo/real <= INVARIANT_TIME_RATIO on free-flow time, <=
   INVARIANT_DIST_RATIO on length, AND (KIEMTOAN batch 2026-07-27) <=
   INVARIANT_TIME_RATIO on the BALANCED weight at each of the 4 slots
   (demo congestion = corridor weighted mean of the real levels; needs
   traffic_profiles_real.json, hence the 03b-real-before-04 order). A
   violating pair is fixed by adding the missing edges along its real
   shortest path (consecutive POIs on that path are adjacent by
   construction); for balanced kinds an EXISTING but
   expensive-at-that-slot corridor may be swapped for the slot's real
   path, kept only if time/dist still hold globally. Iterate to a fixed
   point; abort loudly if it will not converge.
4. PRUNE (global-safe): try removing an undirected pair (all its
   directions); recompute demo all-pairs (all six weights) and keep the
   removal ONLY if every ordered pair still satisfies every invariant;
   otherwise revert. Longest pairs are tried first.
5. Keep the largest SCC, renumber ids, write data/graph_demo.json +
   data/gdemo_corridors.json (corridor -> real edge ids, consumed by 03b
   demo) + preview PNG. scripts/validate_data.py re-checks the same
   invariants forever (build fails on violation).

NetworkX here is a BUILD TOOL only (PROMPT-MASTER rule 6).
"""

from __future__ import annotations

import datetime
import sys
from collections import defaultdict

import networkx as nx

from pipeline_common import (
    BBOX, DATA_DIR, NARROW_HIGHWAYS, ROOT, TIME_SLOTS, ceil_dm,
    corridor_mean_level, dump_json, haversine_m, load_json,
)

sys.path.insert(0, str(ROOT / "backend"))
from app.costs import GAMMA, PENALTY_S  # noqa: E402 — locked constants (rule 4)

OUT_JSON = DATA_DIR / "graph_demo.json"
OUT_PNG = DATA_DIR / "gdemo_preview.png"
OUT_CORRIDORS = DATA_DIR / "gdemo_corridors.json"
NARROW_SHARE = 0.30
SECOND_SNAP_M = 120  # if the nearest node is taken, try the next ones within this radius

# Global invariant, enforced at build time AND by validate_data.py:
# demo shortest / real shortest <= these, for every ordered POI pair.
INVARIANT_TIME_RATIO = 1.5   # on free-flow travel time
INVARIANT_DIST_RATIO = 1.8   # on length (distance mode)
REPAIR_MAX_ROUNDS = 20


def snap_pois(pois: list[dict], nodes: list[dict]) -> dict[str, dict]:
    """POI name -> {node, osmid_order, poi}.

    Each POI snaps to its nearest G_real node. If that node is already
    taken by an earlier POI, the next-nearest FREE node within
    SECOND_SNAP_M is used instead (keeps both landmark names on the map).
    Only when no free node exists inside that radius is the POI merged
    into the earlier one (documented in DATA.md).
    """
    snapped: dict[str, dict] = {}
    used: dict[str, str] = {}
    for poi in pois:
        ranked = sorted(
            range(len(nodes)),
            key=lambda i: haversine_m(poi["lat"], poi["lon"],
                                      nodes[i]["lat"], nodes[i]["lon"]),
        )
        chosen = None
        for rank, i in enumerate(ranked):
            d = haversine_m(poi["lat"], poi["lon"], nodes[i]["lat"], nodes[i]["lon"])
            if rank > 0 and d > SECOND_SNAP_M:
                break
            if nodes[i]["id"] not in used:
                chosen = (i, nodes[i], d, rank)
                break
        if chosen is None:
            near = ranked[0]
            print(f"  WARN: '{poi['name']}' merged into "
                  f"'{used[nodes[near]['id']]}' ({nodes[near]['id']}) — no free "
                  f"node within {SECOND_SNAP_M} m")
            continue
        idx, node, d, rank = chosen
        if rank > 0:
            print(f"  note: '{poi['name']}' -> node thứ {rank + 1} ({node['id']}, {d:.0f} m) "
                  f"vì node gần nhất đã thuộc '{used[nodes[ranked[0]]['id']]}'")
        if d > 500:
            print(f"  WARN: '{poi['name']}' snapped {d:.0f} m away — check coords")
        used[node["id"]] = poi["name"]
        snapped[poi["name"]] = {"node": node, "order": idx, "poi": poi}
    return snapped


def contract(path: list[str], real_edges: dict) -> dict:
    """Merge a G_real node path into one demo edge's attributes."""
    length = t_free = 0.0
    by_highway: dict[str, float] = defaultdict(float)
    by_name: dict[str, float] = defaultdict(float)
    narrow_len = 0.0
    flags = {"flood": 0, "construction": 0, "narrow_alley": 0, "traffic_light": 0}
    for a, b in zip(path, path[1:]):
        e = real_edges[(a, b)]
        length += e["length_m"]
        # exact per-edge free time (stored free_travel_time_s is display-rounded)
        t_free += e["length_m"] / (e["free_speed_kmh"] / 3.6)
        by_highway[e["highway"]] += e["length_m"]
        if e["name"]:
            by_name[e["name"]] += e["length_m"]
        if e["highway"] in NARROW_HIGHWAYS:
            narrow_len += e["length_m"]
        for k in ("flood", "construction", "traffic_light"):
            flags[k] |= e["risk"][k]
    flags["narrow_alley"] = 1 if narrow_len / length > NARROW_SHARE else 0
    length = ceil_dm(length)  # round UP: keep length >= haversine (proof, Bổ đề 1)
    speed = round(length / t_free * 3.6, 1)  # weighted average, km/h
    return {
        "length_m": length,
        # a contracted edge is named after its dominant real street (by length)
        "name": max(by_name.items(), key=lambda kv: kv[1])[0] if by_name else None,
        "highway": max(by_highway.items(), key=lambda kv: kv[1])[0],
        "free_speed_kmh": speed,
        # re-derived from the ROUNDED speed so SCHEMA's formula check is exact
        "free_travel_time_s": round(length / (speed / 3.6), 1),
        "risk": flags,
        # internal (stripped before writing graph_demo.json): the real edges
        # under this corridor — written to data/gdemo_corridors.json so 03b
        # derives demo congestion from the REAL profile underneath instead of
        # rolling independent random levels (KIEMTOAN batch: makes the
        # balanced <= 1.5x demo/real invariant hold and lets future TomTom
        # levels propagate to G_demo automatically).
        "_real_eids": [real_edges[(a, b)]["id"] for a, b in zip(path, path[1:])],
    }


# --------------------------------------------------------- invariant tools
#
# SIX invariants over every ordered POI pair (validate_data.py re-checks
# the same six forever; KIEMTOAN batch extended the original two):
#   time       demo/real <= 1.5  on free-flow travel time
#   dist       demo/real <= 1.8  on length
#   bal@<slot> demo/real <= 1.5  on balanced weight (t_free*f_cong + penalty)
#              for each of the 4 slots — demo congestion is the corridor
#              weighted mean (pipeline_common.corridor_mean_level), so the
#              two tiers tell the same cost story in the DEFAULT mode too
#              (fixes the 0.64x balanced distortion of finding L1-01).


def _edge_penalty(e: dict) -> float:
    return sum(PENALTY_S[k] * e["risk"][k] for k in PENALTY_S)


def _bal_slot(kind: str) -> str | None:
    return kind.split("@", 1)[1] if kind.startswith("bal@") else None


class InvariantCtx:
    """Weighs demo edges under all six kinds (real side is prebuilt)."""

    def __init__(self, real_edges: dict, real_levels: dict):
        self.real_levels = real_levels
        self.real_t_free = {e["id"]: e["length_m"] / (e["free_speed_kmh"] / 3.6)
                            for e in real_edges.values()}

    def demo_weight(self, e: dict, kind: str) -> float:
        slot = _bal_slot(kind)
        if slot is None:
            return e["free_travel_time_s"] if kind == "time" else e["length_m"]
        lvl = corridor_mean_level(e["_real_eids"], self.real_levels[slot],
                                  self.real_t_free)
        t = e["length_m"] / (e["free_speed_kmh"] / 3.6)
        return t * (1.0 + GAMMA * (lvl - 1) / 4.0) + _edge_penalty(e)


def demo_digraph(demo_edges: dict[tuple[str, str], dict], kind: str,
                 ctx: InvariantCtx) -> "nx.DiGraph":
    g = nx.DiGraph()
    for (u, v), e in demo_edges.items():
        g.add_edge(u, v, w=ctx.demo_weight(e, kind))
    return g


def all_pairs(g: "nx.DiGraph", sources: set[str]) -> dict[str, dict[str, float]]:
    out = {}
    for s in sources:
        if s in g:
            out[s] = nx.single_source_dijkstra_path_length(g, s, weight="w")
        else:
            out[s] = {}
    return out


def invariant_violations(
    demo_edges: dict, poi_nodes: set[str],
    refs: dict[str, tuple[dict, float]], ctx: InvariantCtx,
    kinds: tuple[str, ...] | None = None,
) -> list[tuple[str, str, str, float]]:
    """[(u, v, kind, ratio)] for every ordered pair breaking an invariant;
    unreachable pairs are reported with ratio = inf.
    refs: kind -> (real all-pairs from POI sources, ratio limit)."""
    bad = []
    for kind in (kinds if kinds is not None else refs):
        real_ap, limit = refs[kind]
        demo_ap = all_pairs(demo_digraph(demo_edges, kind, ctx), poi_nodes)
        for a in poi_nodes:
            for b in poi_nodes:
                if a == b:
                    continue
                d = demo_ap.get(a, {}).get(b)
                r = real_ap[a][b]
                if d is None:
                    bad.append((a, b, kind, float("inf")))
                elif d > limit * r + 1e-6:
                    bad.append((a, b, kind, d / r))
    return bad


def repair_invariant(
    demo_edges: dict, poi_nodes: set[str], g_real: dict[str, "nx.DiGraph"],
    refs: dict[str, tuple[dict, float]], ctx: InvariantCtx, real_edges: dict,
) -> None:
    """Add (and for balanced kinds, carefully swap) corridor edges along
    real shortest paths until all six invariants hold.

    For a violating ordered pair, walk its real shortest path under the
    violated weight; consecutive POIs along that path are adjacent by
    construction (no third POI strictly between them). A missing
    consecutive pair becomes a new contracted demo edge. If the pair
    already exists but its corridor is expensive at a balanced slot
    (e.g. it crosses a risk zone the real optimum detours around), the
    corridor is REPLACED by this slot's path — kept only when the
    time/dist invariants still hold globally afterwards, else reverted.
    """
    core = ("time", "dist")
    for round_no in range(1, REPAIR_MAX_ROUNDS + 1):
        bad = invariant_violations(demo_edges, poi_nodes, refs, ctx)
        if not bad:
            if round_no > 1:
                print(f"  repair: invariant OK sau {round_no - 1} vòng")
            return
        added = replaced = 0
        for a, b, kind, _r in bad:
            path = nx.shortest_path(g_real[kind], a, b, weight="w")
            waypoints = [n for n in path if n in poi_nodes]
            for x, y in zip(waypoints, waypoints[1:]):
                seg = path[path.index(x):path.index(y) + 1]
                if (x, y) not in demo_edges:
                    demo_edges[(x, y)] = contract(seg, real_edges)
                    added += 1
                elif _bal_slot(kind):
                    cand = contract(seg, real_edges)
                    old = demo_edges[(x, y)]
                    if ctx.demo_weight(cand, kind) < ctx.demo_weight(old, kind) - 1e-9:
                        demo_edges[(x, y)] = cand
                        if invariant_violations(demo_edges, poi_nodes, refs,
                                                ctx, kinds=core):
                            demo_edges[(x, y)] = old  # revert — would break time/dist
                        else:
                            replaced += 1
        print(f"  repair vòng {round_no}: {len(bad)} vi phạm -> "
              f"thêm {added} cạnh, thay {replaced} hành lang")
        if added == 0 and replaced == 0:
            raise SystemExit(
                "repair_invariant: còn vi phạm nhưng không thêm/thay được cạnh — "
                "kiểm tra lại ngưỡng INVARIANT_*")
    raise SystemExit("repair_invariant: không hội tụ sau REPAIR_MAX_ROUNDS vòng")


def prune_redundant(
    demo_edges: dict, poi_nodes: set[str],
    refs: dict[str, tuple[dict, float]], ctx: InvariantCtx,
) -> None:
    """Global-safe pruning (audit fix).

    Try removing an undirected pair (all of its directions at once);
    KEEP the removal only if ALL SIX invariants still hold for every
    ordered pair afterwards (checked with fresh all-pairs runs on the
    reduced graph — no compounding local approximations). Longest pairs
    are tried first.
    """
    pairs: dict[frozenset, list[tuple[str, str]]] = defaultdict(list)
    for u, v in demo_edges:
        pairs[frozenset((u, v))].append((u, v))
    order = sorted(pairs, key=lambda p: -max(
        demo_edges[d]["length_m"] for d in pairs[p]))
    removed = 0
    for pair in order:
        directions = [d for d in pairs[pair] if d in demo_edges]
        if not directions:
            continue
        backup = {d: demo_edges.pop(d) for d in directions}
        if invariant_violations(demo_edges, poi_nodes, refs, ctx):
            demo_edges.update(backup)  # revert — an invariant would break
        else:
            removed += len(backup)
    print(f"  pruned {removed} cạnh (global-safe: mọi cặp vẫn ≤ "
          f"{INVARIANT_TIME_RATIO}x time / {INVARIANT_DIST_RATIO}x dist "
          f"/ {INVARIANT_TIME_RATIO}x balanced cả 4 khung giờ)")


def main() -> None:
    real = load_json(DATA_DIR / "graph_real.json")
    pois = load_json(DATA_DIR / "gdemo_pois.json")["pois"]
    print(f"snapping {len(pois)} POIs onto {len(real['nodes'])} G_real nodes ...")
    snapped = snap_pois(pois, real["nodes"])

    coord = {n["id"]: (n["lat"], n["lon"]) for n in real["nodes"]}
    real_edges = {(e["u"], e["v"]): e for e in real["edges"]}
    g_real_time = nx.DiGraph()
    g_real_dist = nx.DiGraph()
    for (u, v), e in real_edges.items():
        t_exact = e["length_m"] / (e["free_speed_kmh"] / 3.6)
        g_real_time.add_edge(u, v, w=t_exact)
        g_real_dist.add_edge(u, v, w=e["length_m"])

    names = list(snapped)
    node_of = {nm: snapped[nm]["node"]["id"] for nm in names}
    poi_nodes = set(node_of.values())

    # real references for all six invariants (time, dist, balanced x 4 slots)
    prof_path = DATA_DIR / "traffic_profiles_real.json"
    if not prof_path.exists():
        raise SystemExit(
            "04 needs data/traffic_profiles_real.json for the balanced "
            "invariant — run '03b_build_profiles.py real' first (DATA.md §1)")
    real_levels = load_json(prof_path)["profiles"]
    ctx = InvariantCtx(real_edges, real_levels)

    real_time = all_pairs(g_real_time, poi_nodes)
    real_dist = all_pairs(g_real_dist, poi_nodes)
    g_real: dict[str, "nx.DiGraph"] = {"time": g_real_time, "dist": g_real_dist}
    refs: dict[str, tuple[dict, float]] = {
        "time": (real_time, INVARIANT_TIME_RATIO),
        "dist": (real_dist, INVARIANT_DIST_RATIO),
    }
    for slot in TIME_SLOTS:
        g_bal = nx.DiGraph()
        for (u, v), e in real_edges.items():
            t = e["length_m"] / (e["free_speed_kmh"] / 3.6)
            lvl = real_levels[slot][e["id"]]
            g_bal.add_edge(u, v, w=t * (1.0 + GAMMA * (lvl - 1) / 4.0)
                           + _edge_penalty(e))
        kind = f"bal@{slot}"
        g_real[kind] = g_bal
        refs[kind] = (all_pairs(g_bal, poi_nodes), INVARIANT_TIME_RATIO)

    def poi_dist(a: str, b: str) -> float:
        (la, lo), (lb, lo2) = coord[node_of[a]], coord[node_of[b]]
        return haversine_m(la, lo, lb, lo2)

    demo_edges: dict[tuple[str, str], dict] = {}
    for k in (3, 4, 5):
        demo_edges.clear()
        pairs = set()
        for a in names:
            for b in sorted((x for x in names if x != a), key=lambda x: poi_dist(a, x))[:k]:
                pairs.add(tuple(sorted((a, b))))
        for a, b in sorted(pairs):
            na, nb = node_of[a], node_of[b]
            # each DIRECTION independently: keep iff no third POI en route
            for u, v in ((na, nb), (nb, na)):
                try:
                    path = nx.shortest_path(g_real_time, u, v, weight="w")
                except nx.NetworkXNoPath:
                    continue
                if any(p in poi_nodes for p in path[1:-1]):
                    continue  # passes through a third POI -> not adjacent
                demo_edges[(u, v)] = contract(path, real_edges)

        g_demo = nx.DiGraph(list(demo_edges))
        if g_demo.number_of_nodes():
            scc = max(nx.strongly_connected_components(g_demo), key=len)
        else:
            scc = set()
        if len(scc) >= 0.9 * len(names):
            break
        print(f"  k={k}: SCC only {len(scc)}/{len(names)} POIs — retrying with k+1")

    print(f"  adjacency: {len(demo_edges)} cạnh trước repair/prune")
    repair_invariant(demo_edges, poi_nodes, g_real, refs, ctx, real_edges)
    prune_redundant(demo_edges, poi_nodes, refs, ctx)

    g_demo = nx.DiGraph(list(demo_edges))
    scc = max(nx.strongly_connected_components(g_demo), key=len)
    dropped = poi_nodes - scc
    for nm in [n for n in names if node_of[n] in dropped]:
        print(f"  WARN: '{nm}' outside the largest SCC — dropped")
    kept = [nm for nm in names if node_of[nm] in scc]
    demo_edges = {(u, v): e for (u, v), e in demo_edges.items()
                  if u in scc and v in scc}

    # stable ids: nodes ordered by snapped G_real id (itself osmid-ordered)
    kept.sort(key=lambda nm: node_of[nm])
    nid = {node_of[nm]: f"n{i + 1:04d}" for i, nm in enumerate(kept)}
    nodes = [{"id": nid[node_of[nm]], "name": nm,
              "lat": coord[node_of[nm]][0], "lon": coord[node_of[nm]][1],
              "type": snapped[nm]["poi"]["type"]} for nm in kept]
    edges = []
    corridors: dict[str, list[str]] = {}
    for i, ((u, v), e) in enumerate(sorted(
            ((nid[u], nid[v]), e) for (u, v), e in demo_edges.items())):
        eid = f"e{i + 1:05d}"
        corridors[eid] = e["_real_eids"]
        public = {k: val for k, val in e.items() if not k.startswith("_")}
        edges.append({"id": eid, "u": u, "v": v,
                      "oneway": (v, u) not in {(nid[x], nid[y]) for x, y in demo_edges},
                      **public})

    payload = {
        "meta": {"name": "G_demo", "bbox": list(BBOX), "directed": True,
                 "created": datetime.date.today().isoformat(), "crs": "EPSG:4326",
                 "node_count": len(nodes), "edge_count": len(edges)},
        "nodes": nodes, "edges": edges,
    }
    dump_json(payload, OUT_JSON)
    dump_json({"meta": {"graph": "G_demo",
                        "note": "demo edge id -> real edge ids under the corridor; "
                                "consumed by 03b to derive demo congestion from "
                                "traffic_profiles_real.json"},
               "corridors": corridors}, OUT_CORRIDORS)
    oneway = sum(1 for e in edges if e["oneway"])
    print(f"graph_demo.json: {len(nodes)} nodes, {len(edges)} edges ({oneway} oneway)")
    print(f"gdemo_corridors.json: {len(corridors)} corridors")

    # --- visual sanity-check preview -----------------------------------------
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    pos = {n["id"]: (n["lon"], n["lat"]) for n in nodes}
    fig, ax = plt.subplots(figsize=(14, 14))
    for e in edges:
        (x1, y1), (x2, y2) = pos[e["u"]], pos[e["v"]]
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(
            arrowstyle="-|>" if e["oneway"] else "-",
            color="crimson" if e["oneway"] else "steelblue",
            lw=1.0, alpha=0.7, shrinkA=4, shrinkB=4))
    for n in nodes:
        x, y = pos[n["id"]]
        ax.plot(x, y, "o", ms=4, color="black")
        ax.annotate(f"{n['id'][1:]}:{n['name']}", (x, y), fontsize=5,
                    xytext=(2, 2), textcoords="offset points")
    ax.set_title("G_demo preview — đỏ có mũi tên = một chiều, xanh = hai chiều")
    ax.set_aspect("equal")
    fig.tight_layout()
    fig.savefig(OUT_PNG, dpi=150)
    print(f"preview saved: {OUT_PNG.name}")


if __name__ == "__main__":
    main()
