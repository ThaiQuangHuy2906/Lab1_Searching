"""Phase 3 DoD for tsp.py:
- Held-Karp matches brute force for n <= 8 (both open path and cycle);
- NN+2-opt and SA never beat Held-Karp (ATSP sanity);
- the matrix is genuinely asymmetric on this one-way-street graph;
- solve_multiroute responses satisfy SCHEMA §C.5.
"""

import itertools

import pytest

from app.graph_store import GraphStore
from app.models import MultirouteResponse
from app.tsp import (
    MAX_POINTS, build_matrix, held_karp, nn_2opt, simulated_annealing,
    solve_multiroute, solve_multiroute_with_paths, tour_cost,
)

TOL = 1e-9

POINTS_7 = ["n0021", "n0002", "n0043", "n0015", "n0030", "n0008", "n0047"]
POINTS_8 = ["n0021", "n0005", "n0011", "n0036", "n0026", "n0049", "n0018", "n0040"]


@pytest.fixture(scope="module")
def demo() -> GraphStore:
    return GraphStore.load("demo")


@pytest.fixture(scope="module")
def matrix7(demo):
    return build_matrix(demo, POINTS_7, "balanced", "07:30")


def brute_force(cost: dict, points: list[str], return_to_start: bool):
    best_order, best_cost = None, float("inf")
    for perm in itertools.permutations(points[1:]):
        order = [points[0], *perm]
        c = tour_cost(cost, order, return_to_start)
        if c < best_cost:
            best_order, best_cost = order, c
    return best_order, best_cost


def test_matrix_is_asymmetric(matrix7):
    cost, _ = matrix7
    asym = [(a, b) for (a, b) in cost
            if (b, a) in cost and abs(cost[(a, b)] - cost[(b, a)]) > 1.0]
    assert asym, "one-way streets must make the matrix asymmetric"


def test_held_karp_matches_brute_force(matrix7):
    cost, _ = matrix7
    for rts in (False, True):
        hk_order, hk_cost = held_karp(cost, POINTS_7, rts)
        bf_order, bf_cost = brute_force(cost, POINTS_7, rts)
        assert hk_cost == pytest.approx(bf_cost, abs=TOL), f"rts={rts}"
        assert tour_cost(cost, hk_order, rts) == pytest.approx(bf_cost, abs=TOL)
        assert hk_order[0] == POINTS_7[0]


def test_heuristics_never_beat_held_karp(demo):
    for points in (POINTS_7, POINTS_8):
        for slot in ("07:30", "22:00"):
            cost, _ = build_matrix(demo, points, "balanced", slot)
            for rts in (False, True):
                _, hk = held_karp(cost, points, rts)
                _, nn = nn_2opt(cost, points, rts)
                _, sa, stats = simulated_annealing(cost, points, rts)
                assert nn >= hk - TOL
                assert sa >= hk - TOL
                assert min(stats["costs"]) >= hk - TOL


def test_sa_is_deterministic(matrix7):
    cost, _ = matrix7
    r1 = simulated_annealing(cost, POINTS_7, False)
    r2 = simulated_annealing(cost, POINTS_7, False)
    assert r1[1] == r2[1] and r1[2]["costs"] == r2[2]["costs"]


def test_solve_multiroute_schema_and_consistency(demo):
    resp = solve_multiroute(demo, "n0021", ["n0002", "n0043", "n0015", "n0030"],
                            method="held_karp")
    MultirouteResponse.model_validate(resp.model_dump())
    assert resp.found and resp.order[0] == "n0021"
    assert len(resp.legs) == len(resp.order) - 1
    total = sum(l.metrics.total_cost for l in resp.legs)
    assert resp.totals.total_cost == pytest.approx(total, abs=1e-6)
    # held_karp is optimal -> the input order can never be cheaper
    assert resp.original_order_totals.total_cost >= resp.totals.total_cost - TOL
    expected = round((resp.original_order_totals.total_cost - resp.totals.total_cost)
                     / resp.original_order_totals.total_cost * 100, 1)
    assert resp.savings_pct == expected
    assert resp.optimal_guarantee is True


def test_solve_multiroute_return_to_start(demo):
    resp = solve_multiroute(demo, "n0021", ["n0002", "n0043"],
                            method="nn_2opt", return_to_start=True)
    assert resp.found
    assert len(resp.legs) == len(resp.order)  # closing leg included
    assert resp.legs[-1].to_node == "n0021"
    assert resp.optimal_guarantee is False


def test_internal_facade_reuses_the_built_path_matrix(demo):
    args = (demo, "n0021", ["n0002", "n0043", "n0015"], "held_karp")
    response, paths = solve_multiroute_with_paths(*args, mode="balanced")
    legacy = solve_multiroute(*args, mode="balanced")
    assert response.model_dump() == legacy.model_dump()
    points = ["n0021", "n0002", "n0043", "n0015"]
    assert set(paths) == {(a, b) for a in points for b in points if a != b}
    assert all(path[0] == pair[0] and path[-1] == pair[1]
               for pair, path in paths.items())


def test_size_limits(demo):
    nodes = [n.id for n in demo.graph.nodes]
    start, stops16 = nodes[0], nodes[1:17]  # 17 points total
    with pytest.raises(ValueError, match="16 points"):
        solve_multiroute(demo, start, stops16, method="nn_2opt")
    stops15 = nodes[1:16]  # 16 points total: fine for nn_2opt, not held_karp
    with pytest.raises(ValueError, match="held_karp"):
        cost, _ = build_matrix(demo, [start, *stops15], "balanced", "07:30")
        held_karp(cost, [start, *stops15], False)


def test_unknown_node_raises(demo):
    with pytest.raises(KeyError):
        solve_multiroute(demo, "n0001", ["n9999"], method="nn_2opt")
