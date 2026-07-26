"""Step 02 — convert the raw OSM graph to data/graph_real.json (SCHEMA §A).

Rules applied (documented in data/DATA.md):
- free_speed_kmh: team table by highway type (pipeline_common.SPEED_BY_HIGHWAY).
- Parallel edges between the same (u, v): keep the one with the smallest
  free_travel_time_s (SCHEMA §A constraint 2). Self-loops dropped.
- oneway is DERIVED from the final structure: an edge is oneway=false iff
  the reverse edge (v, u) also exists. This keeps the SCHEMA invariant
  airtight regardless of OSM tagging quirks.
- traffic_light: edge ENDS at a node tagged highway=traffic_signals.
- narrow_alley: highway type in NARROW_HIGHWAYS.
- flood/construction: endpoint within radius of a data/manual_risks.json entry.
- Stable ids: nodes sorted by osmid -> n0001...; edges sorted by (u, v)
  -> e00001... (SCHEMA §A rule 7).
"""

from __future__ import annotations

import datetime

import osmnx as ox

from pipeline_common import (
    BBOX, DATA_DIR, RAW_DIR, NARROW_HIGHWAYS,
    dump_json, first_of, load_json, risk_flags_for_nodes, speed_for,
)

IN_GRAPHML = RAW_DIR / "graph_raw.graphml"
OUT_JSON = DATA_DIR / "graph_real.json"


def main() -> None:
    g = ox.load_graphml(IN_GRAPHML)
    risks = load_json(DATA_DIR / "manual_risks.json")["risks"]

    # --- nodes: stable ids by ascending osmid ---------------------------------
    osmids = sorted(g.nodes)
    if len(osmids) > 9999:
        raise SystemExit(
            f"{len(osmids)} nodes exceed the n\\d{{4}} id space (max 9999). "
            "Shrink the bbox or widen the id pattern in SCHEMA.md first."
        )
    nid = {osm: f"n{i + 1:04d}" for i, osm in enumerate(osmids)}
    nodes = [
        {"id": nid[osm], "name": None,
         "lat": round(float(g.nodes[osm]["y"]), 7),
         "lon": round(float(g.nodes[osm]["x"]), 7),
         "type": "intersection"}
        for osm in osmids
    ]
    signal_nodes = {
        osm for osm in osmids
        if str(first_of(g.nodes[osm].get("highway", ""))) == "traffic_signals"
    }

    # --- edges: dedup parallel, min free time wins ----------------------------
    best: dict[tuple[str, str], dict] = {}
    for u, v, data in g.edges(data=True):
        if u == v:
            continue  # self-loop (SCHEMA forbids)
        highway = str(first_of(data.get("highway", "unclassified")))
        speed = speed_for(highway)
        length = round(float(data["length"]), 1)
        travel = round(length / (speed / 3.6), 1)
        key = (nid[u], nid[v])
        if key in best and best[key]["free_travel_time_s"] <= travel:
            continue
        name = data.get("name")
        risk = risk_flags_for_nodes(
            [(g.nodes[u]["y"], g.nodes[u]["x"]), (g.nodes[v]["y"], g.nodes[v]["x"])],
            risks,
        )
        best[key] = {
            "u": key[0], "v": key[1],
            "name": str(first_of(name)) if name else None,
            "length_m": length,
            "highway": highway,
            "oneway": True,  # provisional; fixed below from structure
            "free_speed_kmh": speed,
            "free_travel_time_s": travel,
            "risk": {**risk,
                     "narrow_alley": 1 if highway in NARROW_HIGHWAYS else 0,
                     "traffic_light": 1 if v in signal_nodes else 0},
        }

    for (u, v), e in best.items():
        e["oneway"] = (v, u) not in best

    edges = [dict(id=f"e{i + 1:05d}", **e)
             for i, (_, e) in enumerate(sorted(best.items()))]

    payload = {
        "meta": {"name": "G_real", "bbox": list(BBOX), "directed": True,
                 "created": datetime.date.today().isoformat(),
                 "crs": "EPSG:4326",
                 "node_count": len(nodes), "edge_count": len(edges)},
        "nodes": nodes,
        "edges": edges,
    }
    dump_json(payload, OUT_JSON)
    oneway_cnt = sum(1 for e in edges if e["oneway"])
    print(f"graph_real.json: {len(nodes)} nodes, {len(edges)} edges "
          f"({oneway_cnt} oneway), signals at {len(signal_nodes)} nodes")


if __name__ == "__main__":
    main()
