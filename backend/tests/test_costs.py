"""Unit tests for costs.py + empirical consistency of the heuristic.

The consistency test is the executable side of docs/HEURISTIC-PROOF.md:
h(u) <= w(u,v) + h(v) must hold on EVERY edge, all modes, all slots.
"""

import pytest

from app.costs import (
    GAMMA, congestion_factor, edge_penalty_s, edge_weight, haversine_m,
)
from app.graph_store import MODES, GraphStore
from app.models import TIME_SLOTS, Edge, RiskFlags

EPS = 1e-6


def make_edge(**over) -> Edge:
    base = dict(id="e00001", u="n0001", v="n0002", name="Test", length_m=360.0,
                highway="secondary", oneway=True, free_speed_kmh=36.0,
                free_travel_time_s=36.0,
                risk=RiskFlags(flood=0, construction=0, narrow_alley=0, traffic_light=0))
    base.update(over)
    return Edge(**base)


@pytest.fixture(scope="module")
def stores() -> list[GraphStore]:
    return [GraphStore.load("demo"), GraphStore.load("real")]


def test_congestion_factor_bounds():
    assert congestion_factor(1) == 1.0
    assert congestion_factor(5) == 1.0 + GAMMA  # 2.5 with gamma=1.5
    assert congestion_factor(3) == pytest.approx(1.75)


def test_edge_weight_hand_computed():
    e = make_edge(risk=RiskFlags(flood=1, traffic_light=1))
    # 360 m at 36 km/h -> t_free = 36 s; level 5 -> f = 2.5 -> 90 s
    assert edge_weight(e, 5, "distance") == 360.0
    assert edge_weight(e, 5, "time") == pytest.approx(90.0)
    # penalty = 60 (flood) + 25 (light) = 85 -> balanced = 175
    assert edge_penalty_s(e) == 85
    assert edge_weight(e, 5, "balanced") == pytest.approx(175.0)
    assert edge_weight(e, 1, "balanced") == pytest.approx(36.0 + 85.0)


def test_haversine_known_distance():
    # Ben Thanh Market -> Notre-Dame Cathedral is roughly 800-830 m
    d = haversine_m(10.7725, 106.6980, 10.7798, 106.6990)
    assert 750 < d < 900


def test_heuristic_zero_at_goal(stores):
    for store in stores:
        some = store.graph.nodes[0].id
        for mode in MODES:
            assert store.heuristic(some, some, mode) == 0.0


def test_weight_lower_bound_lemma3(stores):
    """w >= t_free_exact >= length/v_max — the load-bearing chain of the
    proof. t_free is the EXACT length/speed value used by edge_weight;
    the stored free_travel_time_s field is display-rounded and only has
    to stay within the SCHEMA tolerance."""
    for store in stores:
        for e in store.graph.edges:
            t_exact = e.length_m / (e.free_speed_kmh / 3.6)
            assert t_exact >= e.length_m / store.v_max_ms - EPS
            assert abs(e.free_travel_time_s - t_exact) <= 0.06  # SCHEMA §A.3
        for slot in TIME_SLOTS:
            for mode in ("time", "balanced"):
                w = store.weights(mode, slot)
                for e in store.graph.edges:
                    t_exact = e.length_m / (e.free_speed_kmh / 3.6)
                    assert w[e.id] >= t_exact - EPS


def test_heuristic_consistent_on_every_edge(stores):
    """h(u) <= w(u,v) + h(v) for every edge x 3 modes x 4 slots x 3 goals."""
    for store in stores:
        nodes = store.graph.nodes
        goals = [nodes[0].id, nodes[len(nodes) // 2].id, nodes[-1].id]
        for goal in goals:
            for mode in MODES:
                h = {n.id: store.heuristic(n.id, goal, mode) for n in nodes}
                for slot in TIME_SLOTS:
                    w = store.weights(mode, slot)
                    for e in store.graph.edges:
                        assert h[e.u] <= w[e.id] + h[e.v] + EPS, (
                            f"consistency violated on {e.id} "
                            f"({store.level}, {mode}, {slot}, goal={goal})"
                        )
