"""Step 04 — build G_demo from real POIs snapped onto G_real (SCHEMA §A).

Semi-automatic recipe (PROMPT-MASTER 6.1), all rules in data/DATA.md:
1. Load ~50 real landmarks from data/gdemo_pois.json (team-reviewed list).
2. Snap each POI to the nearest G_real node (brute-force haversine);
   POIs snapping to the same node are dropped with a warning.
3. Adjacency: each POI connects to its K nearest POIs (K grows 3->5 until
   the result is one big SCC). For each candidate pair, run a shortest
   path on G_real (weight = free_travel_time_s, via networkx as a BUILD
   TOOL only — product algorithms are hand-written in backend/app/).
   A direction is kept only if its path does not pass through a third
   POI. If both directions survive but the reverse is > ONEWAY_RATIO x
   longer, only the short direction is kept (models real one-way loops).
4. Each kept direction becomes one contracted demo edge inheriting real
   geometry: total length, weighted-average speed (travel time re-derived
   from the rounded speed so the SCHEMA formula holds exactly), dominant
   highway type, OR of traffic_light/flood/construction flags along the
   path, narrow_alley if narrow types cover > NARROW_SHARE of the length.
5. Keep the largest SCC, renumber ids (nodes by snapped osmid), write
   data/graph_demo.json + a matplotlib preview data/gdemo_preview.png.
"""

from __future__ import annotations

import datetime
from collections import defaultdict

import networkx as nx

from pipeline_common import (
    BBOX, DATA_DIR, NARROW_HIGHWAYS, ceil_dm, dump_json, haversine_m, load_json,
)

OUT_JSON = DATA_DIR / "graph_demo.json"
OUT_PNG = DATA_DIR / "gdemo_preview.png"
ONEWAY_RATIO = 1.4
NARROW_SHARE = 0.30
PRUNE_RATIO = 1.5  # drop a pair if a detour is at most 50% slower


def prune_redundant(demo_edges: dict[tuple[str, str], dict]) -> None:
    """Thin the demo network toward the ~120-edge target (PROMPT-MASTER 6.1).

    An undirected pair {u, v} is redundant if, for EVERY kept direction,
    the fastest alternative route (without that direct edge) is at most
    PRUNE_RATIO x the direct free travel time. Removing such a pair keeps
    the graph strongly connected because the alternative keeps existing.
    Longest pairs are tried first (they are the visually confusing ones).
    """
    def alt_ok(u: str, v: str) -> bool:
        g = nx.DiGraph()
        for (a, b), e in demo_edges.items():
            if (a, b) != (u, v):
                g.add_edge(a, b, w=e["free_travel_time_s"])
        try:
            alt = nx.shortest_path_length(g, u, v, weight="w")
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return False
        return alt <= PRUNE_RATIO * demo_edges[(u, v)]["free_travel_time_s"]

    pairs: dict[frozenset, list[tuple[str, str]]] = defaultdict(list)
    for u, v in demo_edges:
        pairs[frozenset((u, v))].append((u, v))
    order = sorted(pairs, key=lambda p: -max(
        demo_edges[d]["length_m"] for d in pairs[p]))
    removed = 0
    for pair in order:
        directions = [d for d in pairs[pair] if d in demo_edges]
        if directions and all(alt_ok(u, v) for u, v in directions):
            for d in directions:
                del demo_edges[d]
                removed += 1
    print(f"  pruned {removed} redundant edges (detour <= {PRUNE_RATIO}x)")


SECOND_SNAP_M = 120  # if the nearest node is taken, try the next ones within this radius


def snap_pois(pois: list[dict], nodes: list[dict]) -> dict[str, dict]:
    """POI name -> {node, osmid_order, poi}.

    Each POI snaps to its nearest G_real node. If that node is already
    taken by an earlier POI, the next-nearest FREE node within
    SECOND_SNAP_M is used instead (keeps both landmark names on the map).
    Only when no free node exists inside that radius is the POI merged
    into the earlier one (documented in DATA.md, e.g. Nhà thờ Tân Định).
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


def contract(path: list[str], real_edges: dict, coord: dict) -> dict:
    """Merge a G_real node path into one demo edge's attributes."""
    length = t_free = 0.0
    by_highway: dict[str, float] = defaultdict(float)
    narrow_len = 0.0
    flags = {"flood": 0, "construction": 0, "narrow_alley": 0, "traffic_light": 0}
    for a, b in zip(path, path[1:]):
        e = real_edges[(a, b)]
        length += e["length_m"]
        # exact per-edge free time (stored free_travel_time_s is display-rounded)
        t_free += e["length_m"] / (e["free_speed_kmh"] / 3.6)
        by_highway[e["highway"]] += e["length_m"]
        if e["highway"] in NARROW_HIGHWAYS:
            narrow_len += e["length_m"]
        for k in ("flood", "construction", "traffic_light"):
            flags[k] |= e["risk"][k]
    flags["narrow_alley"] = 1 if narrow_len / length > NARROW_SHARE else 0
    length = ceil_dm(length)  # round UP: keep length >= haversine (proof, Bổ đề 1)
    speed = round(length / t_free * 3.6, 1)  # weighted average, km/h
    return {
        "length_m": length,
        "highway": max(by_highway.items(), key=lambda kv: kv[1])[0],
        "free_speed_kmh": speed,
        # re-derived from the ROUNDED speed so SCHEMA's formula check is exact
        "free_travel_time_s": round(length / (speed / 3.6), 1),
        "risk": flags,
    }


def main() -> None:
    real = load_json(DATA_DIR / "graph_real.json")
    pois = load_json(DATA_DIR / "gdemo_pois.json")["pois"]
    print(f"snapping {len(pois)} POIs onto {len(real['nodes'])} G_real nodes ...")
    snapped = snap_pois(pois, real["nodes"])

    coord = {n["id"]: (n["lat"], n["lon"]) for n in real["nodes"]}
    real_edges = {(e["u"], e["v"]): e for e in real["edges"]}
    g_real = nx.DiGraph()
    for (u, v), e in real_edges.items():
        g_real.add_edge(u, v, w=e["free_travel_time_s"])

    names = list(snapped)
    node_of = {nm: snapped[nm]["node"]["id"] for nm in names}
    poi_nodes = set(node_of.values())

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
            legs = {}
            for u, v in ((na, nb), (nb, na)):
                try:
                    path = nx.shortest_path(g_real, u, v, weight="w")
                except nx.NetworkXNoPath:
                    continue
                if any(p in poi_nodes for p in path[1:-1]):
                    continue  # passes through a third POI -> not adjacent
                legs[(u, v)] = path
            if not legs:
                continue
            if len(legs) == 2:
                l1 = sum(real_edges[(x, y)]["length_m"]
                         for x, y in zip(legs[(na, nb)], legs[(na, nb)][1:]))
                l2 = sum(real_edges[(x, y)]["length_m"]
                         for x, y in zip(legs[(nb, na)], legs[(nb, na)][1:]))
                if l2 > ONEWAY_RATIO * l1:
                    del legs[(nb, na)]
                elif l1 > ONEWAY_RATIO * l2:
                    del legs[(na, nb)]
            for (u, v), path in legs.items():
                demo_edges[(u, v)] = contract(path, real_edges, coord)

        g_demo = nx.DiGraph(list(demo_edges))
        if g_demo.number_of_nodes():
            scc = max(nx.strongly_connected_components(g_demo), key=len)
        else:
            scc = set()
        if len(scc) >= 0.9 * len(names):
            break
        print(f"  k={k}: SCC only {len(scc)}/{len(names)} POIs — retrying with k+1")

    prune_redundant(demo_edges)
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
    for i, ((u, v), e) in enumerate(sorted(
            ((nid[u], nid[v]), e) for (u, v), e in demo_edges.items())):
        edges.append({"id": f"e{i + 1:05d}", "u": u, "v": v, "name": None,
                      "oneway": (v, u) not in {(nid[x], nid[y]) for x, y in demo_edges},
                      **e})

    payload = {
        "meta": {"name": "G_demo", "bbox": list(BBOX), "directed": True,
                 "created": datetime.date.today().isoformat(), "crs": "EPSG:4326",
                 "node_count": len(nodes), "edge_count": len(edges)},
        "nodes": nodes, "edges": edges,
    }
    dump_json(payload, OUT_JSON)
    oneway = sum(1 for e in edges if e["oneway"])
    print(f"graph_demo.json: {len(nodes)} nodes, {len(edges)} edges ({oneway} oneway)")

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
