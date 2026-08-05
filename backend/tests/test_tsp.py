"""Phase 3 DoD for tsp.py:
- Held-Karp matches brute force for n <= 8 (both open path and cycle);
- NN+2-opt and SA never beat Held-Karp (ATSP sanity);
- the matrix is genuinely asymmetric on this one-way-street graph;
- solve_multiroute responses satisfy SCHEMA §C.5.
"""

import itertools
import math
import random
import statistics

import networkx as nx
import pytest

from app.graph_store import GraphStore
from app.models import MultirouteResponse
from app.tsp import (
    MAX_POINTS, build_matrix, held_karp, nearest_neighbour, nn_2opt,
    simulated_annealing, solve_multiroute, tour_cost,
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


def local_search_neighbours(order: list[str]):
    """Independently enumerate the documented 2-opt and Or-opt moves."""
    n = len(order)
    for i in range(1, n - 1):
        for j in range(i + 1, n):
            yield order[:i] + order[i:j + 1][::-1] + order[j + 1:]
    for segment_length in (1, 2, 3):
        for i in range(1, n - segment_length + 1):
            segment = order[i:i + segment_length]
            rest = order[:i] + order[i + segment_length:]
            for j in range(1, len(rest) + 1):
                if j != i:
                    yield rest[:j] + segment + rest[j:]


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


def test_held_karp_matches_brute_force_on_seeded_asymmetric_matrices():
    rng = random.Random(20260806)
    for n in range(2, 9):
        points = [f"p{i}" for i in range(n)]
        for _ in range(3):
            cost = {
                (a, b): rng.randint(1, 10_000) / 100
                for a in points for b in points if a != b
            }
            for return_to_start in (False, True):
                order, actual = held_karp(cost, points, return_to_start)
                _, expected = brute_force(cost, points, return_to_start)
                assert order[0] == points[0]
                assert sorted(order) == sorted(points)
                assert actual == pytest.approx(expected, abs=TOL)
                assert tour_cost(cost, order, return_to_start) == pytest.approx(
                    expected, abs=TOL,
                )


def test_build_matrix_matches_networkx_for_every_mode_and_slot(demo):
    for mode in ("distance", "time", "balanced"):
        for slot in ("07:30", "12:00", "17:30", "22:00"):
            cost, paths = build_matrix(demo, POINTS_7, mode, slot)
            graph = nx.DiGraph()
            graph.add_nodes_from(demo.nodes)
            weights = demo.weights(mode, slot)
            for edge in demo.graph.edges:
                previous = graph.get_edge_data(edge.u, edge.v)
                if previous is None or weights[edge.id] < previous["weight"]:
                    graph.add_edge(edge.u, edge.v, weight=weights[edge.id])

            for source in POINTS_7:
                expected = nx.single_source_dijkstra_path_length(
                    graph, source, weight="weight",
                )
                for target in POINTS_7:
                    if source == target:
                        continue
                    path = paths[(source, target)]
                    path_cost, _, _ = demo.path_metrics(path, mode, slot)
                    assert path[0] == source and path[-1] == target
                    assert cost[(source, target)] == pytest.approx(
                        expected[target], abs=TOL,
                    )
                    assert path_cost == pytest.approx(expected[target], abs=TOL)


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


def test_nn_2opt_reaches_local_optimum_on_seeded_asymmetric_matrices():
    rng = random.Random(20260806)
    for n in range(2, 10):
        points = [f"p{i}" for i in range(n)]
        for _ in range(5):
            cost = {
                (a, b): rng.randint(1, 10_000) / 100
                for a in points for b in points if a != b
            }
            for return_to_start in (False, True):
                initial = tour_cost(
                    cost, nearest_neighbour(cost, points), return_to_start,
                )
                order, actual = nn_2opt(cost, points, return_to_start)
                assert order[0] == points[0]
                assert sorted(order) == sorted(points)
                assert actual <= initial + TOL
                assert actual == pytest.approx(
                    tour_cost(cost, order, return_to_start), abs=TOL,
                )
                assert all(
                    tour_cost(cost, candidate, return_to_start) >= actual - TOL
                    for candidate in local_search_neighbours(order)
                )


def test_sa_is_deterministic(matrix7):
    cost, _ = matrix7
    r1 = simulated_annealing(cost, POINTS_7, False)
    r2 = simulated_annealing(cost, POINTS_7, False)
    assert r1[1] == r2[1] and r1[2]["costs"] == r2[2]["costs"]


@pytest.mark.parametrize("point_count", [2, 3, 9])
@pytest.mark.parametrize("return_to_start", [False, True])
def test_sa_preserves_tour_and_reports_consistent_best_so_far(
    point_count, return_to_start,
):
    rng = random.Random(20260806 + point_count)
    points = [f"p{i}" for i in range(point_count)]
    cost = {
        (a, b): rng.randint(1, 10_000) / 100
        for a in points for b in points if a != b
    }
    initial = tour_cost(cost, nearest_neighbour(cost, points), return_to_start)

    order, actual, stats = simulated_annealing(
        cost, points, return_to_start, seeds=range(3),
    )

    assert order[0] == points[0]
    assert sorted(order) == sorted(points)
    assert actual <= initial + TOL
    assert actual == pytest.approx(tour_cost(cost, order, return_to_start), abs=TOL)
    assert actual == min(stats["costs"])
    assert stats["mean"] == pytest.approx(statistics.mean(stats["costs"]), abs=TOL)
    assert stats["std"] == pytest.approx(statistics.stdev(stats["costs"]), abs=TOL)
    optimizer = stats["optimizer_stats"]
    assert optimizer["best_cost"] == actual
    assert optimizer["mean_best_cost"] == pytest.approx(stats["mean"], abs=TOL)
    assert optimizer["stddev_best_cost"] == pytest.approx(stats["std"], abs=TOL)
    for seed in optimizer["seeds"]:
        assert seed["best_cost"] <= seed["final_cost"] + TOL
        assert math.isclose(
            seed["best_cost"],
            tour_cost(cost, seed["best_order"], return_to_start),
            abs_tol=TOL,
        )


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
