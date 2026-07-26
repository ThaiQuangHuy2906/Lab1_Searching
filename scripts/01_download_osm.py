"""Step 01 — download the HCMC drive network from OpenStreetMap.

OSMnx v2 API only (PROMPT-MASTER rule 5): bbox is a single tuple
(left, bottom, right, top); district/ward names are forbidden as queries.

Network call happens HERE ONLY (one-off build step, cached). The demo
itself never touches the network (rule 7).

Output: data/raw/graph_raw.graphml (gitignored intermediate).
"""

from __future__ import annotations

from pathlib import Path

import networkx as nx
import osmnx as ox

BBOX = (106.680, 10.760, 106.720, 10.800)  # (left, bottom, right, top)

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
OUT_GRAPHML = RAW_DIR / "graph_raw.graphml"


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ox.settings.use_cache = True
    ox.settings.cache_folder = str(RAW_DIR / "osmnx_cache")
    ox.settings.log_console = False

    print(f"downloading OSM drive network for bbox={BBOX} ...")
    g = ox.graph_from_bbox(BBOX, network_type="drive")
    print(f"raw graph: {g.number_of_nodes()} nodes, {g.number_of_edges()} edges")

    # Keep the largest strongly connected component (directed graph).
    scc = max(nx.strongly_connected_components(g), key=len)
    g = g.subgraph(scc).copy()
    print(f"largest SCC: {g.number_of_nodes()} nodes, {g.number_of_edges()} edges")

    ox.save_graphml(g, OUT_GRAPHML)
    print(f"saved {OUT_GRAPHML.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
