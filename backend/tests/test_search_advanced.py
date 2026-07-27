"""Phase 3 DoD for search_advanced.py:
- Bidirectional Dijkstra matches Dijkstra costs (1e-6);
- IDA* stays within its epsilon bound (and is exact for tiny epsilon);
- Greedy/Beam behave and report their non-guarantees correctly.
"""

import itertools
import random

import pytest

from app.graph_store import MODES, GraphStore
from app.models import GraphFile, TIME_SLOTS, Trace, TrafficProfiles
from app.search import dijkstra
from app.search_advanced import ADVANCED_ALGORITHMS, beam, bidijkstra, greedy, idastar

TOL = 1e-6
COMBOS = list(itertools.product(MODES, TIME_SLOTS))


@pytest.fixture(scope="module")
def demo() -> GraphStore:
    return GraphStore.load("demo")


@pytest.fixture(scope="module")
def real() -> GraphStore:
    return GraphStore.load("real")


def sample_pairs(store: GraphStore, n: int, seed: int, min_m: float = 0.0):
    rng = random.Random(seed)
    nodes = [nd.id for nd in store.graph.nodes]
    pairs = []
    while len(pairs) < n:
        a, b = rng.sample(nodes, 2)
        if store.straight_line_m(a, b) >= min_m:
            pairs.append((a, b))
    return pairs


def tiny_store(edge_specs: list[tuple[str, str, float]], node_count: int = 4) -> GraphStore:
    """Small deterministic directed graph for semantic trace/termination tests."""
    nodes = [
        {
            "id": f"n{i:04d}", "name": f"N{i}",
            "lat": 10.5, "lon": 106.5 + i * 0.0001, "type": "landmark",
        }
        for i in range(1, node_count + 1)
    ]
    edges = [
        {
            "id": f"e{i:05d}", "u": u, "v": v, "name": None,
            "length_m": length, "highway": "primary", "oneway": True,
            "free_speed_kmh": 36.0, "free_travel_time_s": length / 10.0,
            "risk": {
                "flood": 0, "construction": 0,
                "narrow_alley": 0, "traffic_light": 0,
            },
        }
        for i, (u, v, length) in enumerate(edge_specs, 1)
    ]
    graph = GraphFile.model_validate({
        "meta": {
            "name": "G_tiny", "bbox": [106.0, 10.0, 107.0, 11.0],
            "directed": True, "created": "2026-07-27", "crs": "EPSG:4326",
            "node_count": len(nodes), "edge_count": len(edges),
        },
        "nodes": nodes,
        "edges": edges,
    })
    profiles = TrafficProfiles.model_validate({
        "meta": {
            "graph": "G_tiny", "created": "2026-07-27",
            "source": "synthetic",
        },
        "profiles": {
            slot: {edge["id"]: 1 for edge in edges}
            for slot in TIME_SLOTS
        },
    })
    return GraphStore(graph, profiles, "demo")


# ---------------------------------------------------- bidirectional


def test_bidijkstra_matches_dijkstra_demo(demo: GraphStore):
    for i, (src, dst) in enumerate(sample_pairs(demo, 150, seed=42)):
        mode, slot = COMBOS[i % len(COMBOS)]
        d = dijkstra(demo, src, dst, mode=mode, time_slot=slot, include_trace=False)
        b = bidijkstra(demo, src, dst, mode=mode, time_slot=slot, include_trace=False)
        assert b.found and b.metrics.optimal_guarantee
        assert b.metrics.total_cost == pytest.approx(d.metrics.total_cost, abs=TOL)


def test_bidijkstra_matches_dijkstra_real(real: GraphStore):
    for i, (src, dst) in enumerate(sample_pairs(real, 20, seed=7, min_m=1500)):
        mode, slot = COMBOS[i % len(COMBOS)]
        d = dijkstra(real, src, dst, mode=mode, time_slot=slot, include_trace=False)
        b = bidijkstra(real, src, dst, mode=mode, time_slot=slot, include_trace=False)
        assert b.metrics.total_cost == pytest.approx(d.metrics.total_cost, abs=TOL)


def test_bidijkstra_trace_has_both_sides(demo: GraphStore):
    src, dst = "n0043", "n0015"  # far corners -> both directions must work
    t = bidijkstra(demo, src, dst, include_trace=True)
    Trace.model_validate(t.model_dump())
    sides = {st.side for st in t.trace}
    assert sides == {"forward", "backward"}
    for st in t.trace:
        assert st.g is not None and set(st.g) == set(st.frontier)
        assert st.h is None and st.f is None


def test_bidijkstra_trace_g_comes_from_active_frontier_side(demo: GraphStore):
    """A closed-side distance must not replace an active-side frontier value."""
    t = bidijkstra(demo, "n0001", "n0008", include_trace=True)
    backward_step = next(
        st for st in t.trace
        if st.expanded == "n0008" and st.side == "backward"
    )
    edge = demo.edge_by_uv[("n0001", "n0008")]
    active_cost = round(demo.weight(edge.id, "balanced", "07:30"), 1)

    # After the backward expansion, n0001 is active only backward and n0008
    # only forward. Both therefore expose the active edge cost, not the 0.0
    # distance retained for the endpoint already closed on the other side.
    assert {"n0001", "n0008"} <= set(backward_step.frontier)
    assert backward_step.g["n0001"] == active_cost
    assert backward_step.g["n0008"] == active_cost


# ----------------------------------------------------------- ida*


def test_idastar_within_epsilon_demo(demo: GraphStore):
    for i, (src, dst) in enumerate(sample_pairs(demo, 30, seed=5)):
        mode, slot = COMBOS[i % len(COMBOS)]
        d = dijkstra(demo, src, dst, mode=mode, time_slot=slot, include_trace=False)
        t = idastar(demo, src, dst, mode=mode, time_slot=slot, include_trace=False)
        assert t.found and t.metrics.epsilon_bound == 5.0
        assert t.metrics.total_cost <= d.metrics.total_cost + 5.0 + TOL
        # never better than optimal
        assert t.metrics.total_cost >= d.metrics.total_cost - TOL


def test_idastar_exact_with_tiny_epsilon(demo: GraphStore):
    for src, dst in sample_pairs(demo, 5, seed=11):
        d = dijkstra(demo, src, dst, include_trace=False)
        t = idastar(demo, src, dst, include_trace=False, epsilon=1e-4)
        assert t.metrics.total_cost == pytest.approx(d.metrics.total_cost, abs=1e-3)


def test_idastar_small_real_pair(real: GraphStore):
    src, dst = sample_pairs(real, 1, seed=3, min_m=800)[0]
    d = dijkstra(real, src, dst, include_trace=False)
    t = idastar(real, src, dst, include_trace=False)
    assert t.found
    assert t.metrics.total_cost <= d.metrics.total_cost + 5.0 + TOL


def test_idastar_trace_frontier_is_after_expansion(demo: GraphStore):
    """SCHEMA §B.3: the first snapshot includes successors just generated."""
    t = idastar(
        demo, "n0001", "n0030", include_trace=True, max_rounds=1
    )
    first = t.trace[0]
    expected = sorted({nbr for nbr, _eid in demo.adj["n0001"]})

    assert first.expanded == "n0001"
    assert first.frontier == expected
    assert set(first.g) == set(first.h) == set(first.f) == set(expected)


def test_idastar_round_cap_does_not_claim_guarantee():
    store = tiny_store([
        ("n0001", "n0002", 1000.0),
        ("n0002", "n0003", 1000.0),
    ], node_count=3)
    assert dijkstra(
        store, "n0001", "n0003", mode="distance", include_trace=False
    ).found

    t = idastar(
        store, "n0001", "n0003", mode="distance",
        include_trace=False, max_rounds=1,
    )
    assert not t.found
    assert t.metrics.epsilon_bound == 5.0
    assert not t.metrics.optimal_guarantee


def test_idastar_exhaustive_unreachable_keeps_theoretical_guarantee():
    store = tiny_store([("n0001", "n0002", 100.0)], node_count=2)
    t = idastar(
        store, "n0002", "n0001", mode="distance", include_trace=False
    )
    assert not t.found
    assert t.metrics.optimal_guarantee


# --------------------------------------------------------- greedy


def test_greedy_finds_paths_but_never_claims_optimality(demo: GraphStore):
    worse = 0
    for src, dst in sample_pairs(demo, 40, seed=9):
        g = greedy(demo, src, dst, include_trace=False)
        d = dijkstra(demo, src, dst, include_trace=False)
        assert g.found and not g.metrics.optimal_guarantee
        assert g.metrics.total_cost >= d.metrics.total_cost - TOL
        if g.metrics.total_cost > d.metrics.total_cost + TOL:
            worse += 1
    assert worse > 0, "greedy should be suboptimal somewhere on 40 pairs"


def test_greedy_trace_is_h_only(demo: GraphStore):
    t = greedy(demo, "n0001", "n0030", include_trace=True)
    Trace.model_validate(t.model_dump())
    for st in t.trace:
        assert st.h is not None and st.g is None and st.f is None


# ----------------------------------------------------------- beam


def test_beam_wide_enough_behaves_like_search(demo: GraphStore):
    for src, dst in sample_pairs(demo, 20, seed=13):
        d = dijkstra(demo, src, dst, include_trace=False)
        t = beam(demo, src, dst, include_trace=False, beam_width=60)
        assert t.found and t.metrics.beam_width == 60
        assert not t.metrics.optimal_guarantee
        assert t.metrics.total_cost >= d.metrics.total_cost - TOL


def test_beam_narrow_may_fail_cleanly(demo: GraphStore):
    outcomes = set()
    for src, dst in sample_pairs(demo, 30, seed=17):
        t = beam(demo, src, dst, include_trace=False, beam_width=1)
        outcomes.add(t.found)
        Trace.model_validate(t.model_dump())
        if not t.found:
            assert t.path == [] and t.metrics.total_cost is None
    assert False in outcomes, "beam_width=1 should fail on some of 30 pairs"


def test_beam_default_width_by_level(demo: GraphStore, real: GraphStore):
    assert beam(demo, "n0001", "n0010", include_trace=False).metrics.beam_width == 5
    src, dst = sample_pairs(real, 1, seed=1)[0]
    assert beam(real, src, dst, include_trace=False).metrics.beam_width == 50


def test_beam_trace_and_metric_use_only_selected_width():
    store = tiny_store([
        ("n0001", "n0002", 100.0),
        ("n0001", "n0003", 200.0),
    ])
    t = beam(
        store, "n0001", "n0004",
        mode="distance", include_trace=True, beam_width=1,
    )
    Trace.model_validate(t.model_dump())

    assert not t.found
    assert t.trace[0].expanded == "n0001"
    assert len(t.trace[0].frontier) == 1
    assert all(len(step.frontier) <= 1 for step in t.trace)
    assert t.metrics.max_frontier == max(
        1, *(len(step.frontier) for step in t.trace)
    )


# ------------------------------------------------------ contract


def test_advanced_traces_validate(demo: GraphStore):
    for name, algo in ADVANCED_ALGORITHMS.items():
        t = algo(demo, "n0002", "n0047", include_trace=True)
        Trace.model_validate(t.model_dump())
        assert t.algorithm == name
        assert [st.step for st in t.trace] == list(range(1, len(t.trace) + 1))
        if t.found:
            seen = set()
            for st in t.trace:
                seen.add(st.expanded)
                seen.update(st.frontier)
            assert set(t.path) <= seen


def test_advanced_start_equals_goal(demo: GraphStore):
    for algo in ADVANCED_ALGORITHMS.values():
        t = algo(demo, "n0009", "n0009")
        assert t.found and t.path == ["n0009"] and t.metrics.total_cost == 0
