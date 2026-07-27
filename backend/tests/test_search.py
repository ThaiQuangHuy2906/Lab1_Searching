"""Correctness of the six core algorithms (Phase 2 DoD).

NetworkX is used HERE ONLY as the reference baseline (PROMPT-MASTER
rule 6): UCS/Dijkstra/A* must match nx Dijkstra costs to 1e-6 on ALL
G_demo pairs and on 50 sampled G_real pairs, across 3 modes x 4 slots.
"""

import itertools
import random

import networkx as nx
import pytest

from app.graph_store import MODES, GraphStore
from app.models import TIME_SLOTS, GraphFile, TrafficProfiles, Trace
from app.search import ALGORITHMS, astar, bfs, dfs, dijkstra, iddfs, ucs

TOL = 1e-6
COMBOS = list(itertools.product(MODES, TIME_SLOTS))  # 12 (mode, slot) pairs
OPTIMAL_ALGOS = (ucs, dijkstra, astar)


@pytest.fixture(scope="module")
def demo() -> GraphStore:
    return GraphStore.load("demo")


@pytest.fixture(scope="module")
def real() -> GraphStore:
    return GraphStore.load("real")


def nx_digraph(store: GraphStore, mode: str, slot: str) -> "nx.DiGraph":
    g = nx.DiGraph()
    w = store.weights(mode, slot)
    for e in store.graph.edges:
        g.add_edge(e.u, e.v, w=w[e.id])
    return g


# ------------------------------------------------------------ optimality


def test_optimal_algos_match_networkx_on_all_demo_pairs(demo: GraphStore):
    """DoD: UCS/Dijkstra/A* == nx cost (1e-6) on ALL demo pairs x 12 combos."""
    nodes = [n.id for n in demo.graph.nodes]
    checked = 0
    for mode, slot in COMBOS:
        truth_graph = nx_digraph(demo, mode, slot)
        for src in nodes:
            truth = nx.single_source_dijkstra_path_length(truth_graph, src, weight="w")
            for dst in nodes:
                if dst == src:
                    continue
                for algo in OPTIMAL_ALGOS:
                    t = algo(demo, src, dst, mode=mode, time_slot=slot,
                             include_trace=False)
                    assert t.found, f"{algo.__name__} lost {src}->{dst}"
                    assert t.metrics.total_cost == pytest.approx(truth[dst], abs=TOL), (
                        f"{algo.__name__} {src}->{dst} ({mode},{slot}): "
                        f"{t.metrics.total_cost} != {truth[dst]}"
                    )
                    checked += 1
    # 51 nodes -> 2550 ordered pairs x 12 combos x 3 algorithms
    assert checked == 2550 * 12 * 3


def test_optimal_algos_match_networkx_on_real_samples(real: GraphStore):
    """DoD: 50 sampled G_real pairs, cycling through all 12 (mode, slot)."""
    rng = random.Random(42)
    nodes = [n.id for n in real.graph.nodes]
    pairs = []
    while len(pairs) < 50:
        a, b = rng.sample(nodes, 2)
        if real.straight_line_m(a, b) >= 1000:  # skip trivial neighbors
            pairs.append((a, b))
    for i, (src, dst) in enumerate(pairs):
        mode, slot = COMBOS[i % len(COMBOS)]
        truth = nx.shortest_path_length(
            nx_digraph(real, mode, slot), src, dst, weight="w")
        for algo in OPTIMAL_ALGOS:
            t = algo(real, src, dst, mode=mode, time_slot=slot, include_trace=False)
            assert t.found
            assert t.metrics.total_cost == pytest.approx(truth, abs=TOL), (
                f"{algo.__name__} {src}->{dst} ({mode},{slot})"
            )


def test_path_cost_equals_reported_cost(demo: GraphStore):
    """metrics.total_cost must equal the recomputed sum along metrics path."""
    rng = random.Random(7)
    nodes = [n.id for n in demo.graph.nodes]
    for _ in range(20):
        src, dst = rng.sample(nodes, 2)
        for mode, slot in ((("balanced"), ("07:30")), (("distance"), ("22:00"))):
            t = astar(demo, src, dst, mode=mode, time_slot=slot, include_trace=False)
            cost, dist, time_s = demo.path_metrics(t.path, mode, slot)
            assert t.metrics.total_cost == pytest.approx(cost, abs=TOL)
            assert t.metrics.total_distance_m == pytest.approx(dist, abs=TOL)
            assert t.metrics.total_time_s == pytest.approx(time_s, abs=TOL)


# ------------------------------------------------- uninformed algorithms


def test_bfs_finds_fewest_edges(demo: GraphStore):
    unweighted = nx.DiGraph()
    for e in demo.graph.edges:
        unweighted.add_edge(e.u, e.v)
    rng = random.Random(42)
    nodes = [n.id for n in demo.graph.nodes]
    for _ in range(100):
        src, dst = rng.sample(nodes, 2)
        t = bfs(demo, src, dst, include_trace=False)
        assert t.found and not t.metrics.optimal_guarantee
        assert len(t.path) - 1 == nx.shortest_path_length(unweighted, src, dst)
        assert t.metrics.total_cost is not None  # costs still reported


def test_dfs_returns_valid_path(demo: GraphStore):
    edge_pairs = set(demo.edge_by_uv)
    rng = random.Random(1)
    nodes = [n.id for n in demo.graph.nodes]
    for _ in range(30):
        src, dst = rng.sample(nodes, 2)
        t = dfs(demo, src, dst, include_trace=False)
        assert t.found and not t.metrics.optimal_guarantee
        assert t.path[0] == src and t.path[-1] == dst
        for a, b in zip(t.path, t.path[1:]):
            assert (a, b) in edge_pairs


def test_iddfs_depth_equals_bfs_depth(demo: GraphStore):
    rng = random.Random(3)
    nodes = [n.id for n in demo.graph.nodes]
    for _ in range(10):
        src, dst = rng.sample(nodes, 2)
        t_iddfs = iddfs(demo, src, dst, include_trace=False)
        t_bfs = bfs(demo, src, dst, include_trace=False)
        assert t_iddfs.found
        assert len(t_iddfs.path) == len(t_bfs.path), (
            f"IDDFS depth {len(t_iddfs.path) - 1} != BFS depth "
            f"{len(t_bfs.path) - 1} for {src}->{dst}"
        )
        assert t_iddfs.metrics.nodes_expanded >= t_bfs.metrics.nodes_expanded


def test_iddfs_trace_carries_increasing_depth_limit(demo: GraphStore):
    t = iddfs(demo, "n0001", "n0030", include_trace=True)
    limits = [st.depth_limit for st in t.trace]
    assert all(l is not None for l in limits)
    assert limits == sorted(limits) or t.metrics.trace_truncated


def test_iddfs_trace_frontier_is_after_expansion(demo: GraphStore):
    """SCHEMA §B.3: successors appear immediately after their parent expands."""
    t = iddfs(demo, "n0001", "n0030", include_trace=True)
    root_step = next(
        st for st in t.trace
        if st.expanded == "n0001" and st.depth_limit == 1
    )
    expected = sorted({nbr for nbr, _eid in demo.adj["n0001"]})
    assert root_step.frontier == expected


# ------------------------------------------------------- trace contract


def test_traces_validate_and_are_coherent(demo: GraphStore):
    for name, algo in ALGORITHMS.items():
        t = algo(demo, "n0002", "n0047", include_trace=True)
        assert isinstance(t, Trace)  # pydantic re-validates g/h/f per B.3
        Trace.model_validate(t.model_dump())
        assert t.found
        if not t.metrics.trace_truncated:
            assert t.metrics.nodes_expanded == len(t.trace)
        assert [st.step for st in t.trace] == list(range(1, len(t.trace) + 1))
        seen = set()
        for st in t.trace:
            seen.add(st.expanded)
            seen.update(st.frontier)
        for node in t.path:
            assert node in seen, f"{name}: path node {node} never seen in trace"
        if name in ("bfs", "ucs", "dijkstra", "astar"):
            expanded = [st.expanded for st in t.trace]
            assert len(expanded) == len(set(expanded)), f"{name} re-expanded a node"


def test_include_trace_false_gives_empty_trace(demo: GraphStore):
    t = astar(demo, "n0001", "n0020", include_trace=False)
    assert t.trace == [] and not t.metrics.trace_truncated
    assert t.found and t.metrics.nodes_expanded > 0


def test_start_equals_goal(demo: GraphStore):
    for algo in ALGORITHMS.values():
        t = algo(demo, "n0005", "n0005")
        assert t.found and t.path == ["n0005"]
        assert t.metrics.total_cost == 0 and t.metrics.nodes_expanded == 0


def test_unknown_node_raises(demo: GraphStore):
    with pytest.raises(KeyError):
        astar(demo, "n0001", "n9999")


def test_unreachable_goal_returns_found_false():
    """Two nodes, one one-way edge a->b: searching b->a must fail cleanly."""
    graph = GraphFile.model_validate({
        "meta": {"name": "G_mock", "bbox": [106.0, 10.0, 107.0, 11.0],
                 "directed": True, "created": "2026-07-26", "crs": "EPSG:4326",
                 "node_count": 2, "edge_count": 1},
        "nodes": [
            {"id": "n0001", "name": "A", "lat": 10.5, "lon": 106.5, "type": "landmark"},
            {"id": "n0002", "name": "B", "lat": 10.6, "lon": 106.6, "type": "landmark"},
        ],
        "edges": [
            {"id": "e00001", "u": "n0001", "v": "n0002", "name": None,
             "length_m": 100.0, "highway": "primary", "oneway": True,
             "free_speed_kmh": 45, "free_travel_time_s": 8.0,
             "risk": {"flood": 0, "construction": 0, "narrow_alley": 0,
                      "traffic_light": 0}},
        ],
    })
    profiles = TrafficProfiles.model_validate({
        "meta": {"graph": "G_mock", "created": "2026-07-26", "source": "synthetic"},
        "profiles": {s: {"e00001": 1} for s in TIME_SLOTS},
    })
    store = GraphStore(graph, profiles, "demo")
    for name, algo in ALGORITHMS.items():
        t = algo(store, "n0002", "n0001")
        assert not t.found and t.path == [], name
        assert t.metrics.total_cost is None
        Trace.model_validate(t.model_dump())
