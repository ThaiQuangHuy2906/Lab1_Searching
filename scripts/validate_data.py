"""Validate built data files against docs/SCHEMA.md (Phase 1 gate).

Checks, per graph level (real, demo):
1. graph_*.json parses through the Pydantic models (all §A constraints:
   counts, id patterns, bbox, formula, reverse-edge rule, no dup pairs).
2. The graph is strongly connected (pure-Python BFS both directions).
3. traffic_profiles_*.json parses (§A.4) and covers 100% of the edge ids
   in all 4 time slots — nothing missing, nothing extra.

Exit code 0 = everything valid. Run:  python scripts/validate_data.py
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from pipeline_common import load_json  # noqa: E402
from app.models import GraphFile, TrafficProfiles  # noqa: E402


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

    oneway = sum(1 for e in graph.edges if e.oneway)
    risks = {k: sum(getattr(e.risk, k) for e in graph.edges)
             for k in ("flood", "construction", "narrow_alley", "traffic_light")}
    return (f"{graph.meta.name}: {graph.meta.node_count} nodes, "
            f"{graph.meta.edge_count} edges ({oneway} oneway), "
            f"strongly connected OK, profiles 4x100% OK, risk edges {risks}")


def main() -> None:
    for level in ("real", "demo"):
        print("OK -", validate_level(level))
    print("ALL DATA VALID")


if __name__ == "__main__":
    main()
