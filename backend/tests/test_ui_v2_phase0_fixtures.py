"""Golden fixtures locked by UI & Explanation v2 Phase 0.

These tests deliberately exercise only the current v1 producers. Phase 1 must
reuse the same cases when it adds two-sided Bidijkstra facts and ATSP v2 stats,
so instrumentation cannot silently change legacy path/cost/order semantics.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.graph_store import GraphStore
from app.models import GraphFile, TIME_SLOTS, TrafficProfiles
from app.search import ucs
from app.search_advanced import bidijkstra
from app.tsp import held_karp, nn_2opt, simulated_annealing, tour_cost


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "ui_v2_phase0_cases.json"


@pytest.fixture(scope="module")
def phase0_cases() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _bidirectional_store(case: dict) -> GraphStore:
    nodes = [
        {
            "id": node_id,
            "name": f"N{index}",
            "lat": 10.5,
            "lon": 106.5 + index * 0.00001,
            "type": "landmark",
        }
        for index, node_id in enumerate(case["nodes"], 1)
    ]
    edges = [
        {
            "id": f"e{index:05d}",
            "u": spec["u"],
            "v": spec["v"],
            "name": None,
            "length_m": spec["cost"],
            "highway": "primary",
            "oneway": True,
            "free_speed_kmh": 36.0,
            "free_travel_time_s": round(spec["cost"] / 10.0, 1),
            "risk": {
                "flood": 0,
                "construction": 0,
                "narrow_alley": 0,
                "traffic_light": 0,
            },
        }
        for index, spec in enumerate(case["edges"], 1)
    ]
    graph = GraphFile.model_validate({
        "meta": {
            "name": "G_ui_v2_bidi_fixture",
            "bbox": [106.0, 10.0, 107.0, 11.0],
            "directed": True,
            "created": "2026-08-09",
            "crs": "EPSG:4326",
            "node_count": len(nodes),
            "edge_count": len(edges),
        },
        "nodes": nodes,
        "edges": edges,
    })
    profiles = TrafficProfiles.model_validate({
        "meta": {
            "graph": graph.meta.name,
            "created": "2026-08-09",
            "source": "synthetic",
        },
        "profiles": {
            slot: {edge["id"]: 1 for edge in edges}
            for slot in TIME_SLOTS
        },
    })
    return GraphStore(graph, profiles, "demo")


def _tour_costs(case: dict) -> dict[tuple[str, str], float]:
    return {
        tuple(key.split("->", 1)): value
        for key, value in case["costs"].items()
    }


def test_bidirectional_overlap_fixture_locks_legacy_union_and_min_g(phase0_cases):
    case = phase0_cases["bidirectional_overlap"]
    store = _bidirectional_store(case)

    result = bidijkstra(
        store,
        case["start"],
        case["goal"],
        mode="distance",
        include_trace=True,
    )
    baseline = ucs(
        store,
        case["start"],
        case["goal"],
        mode="distance",
        include_trace=False,
    )

    assert result.path == case["expected_path"]
    assert result.metrics.total_cost == pytest.approx(case["expected_total_cost"])
    assert result.metrics.total_cost == pytest.approx(baseline.metrics.total_cost)

    overlap_step = next(
        step for step in result.trace
        if step.expanded == case["goal"] and step.side == "backward"
    )
    assert overlap_step.frontier == case["expected_legacy_frontier"]
    assert overlap_step.g[case["overlap_node"]] == case["expected_legacy_overlap_g"]
    assert case["forward_only_node"] in overlap_step.frontier
    assert case["backward_only_node"] in overlap_step.frontier
    assert case["expected_overlap_forward_g"] != case["expected_overlap_backward_g"]
    assert case["expected_legacy_overlap_g"] == min(
        case["expected_overlap_forward_g"],
        case["expected_overlap_backward_g"],
    )

    # The last v1 display snapshot is enough to lock the values that Phase 1
    # must expose as raw root termination evidence without changing the run.
    expected_stop = case["expected_stop"]
    last_step = result.trace[-1]
    assert last_step.g[expected_stop["top_forward"]["node"]] \
        == expected_stop["top_forward"]["g"]
    assert last_step.g[expected_stop["top_backward"]["node"]] \
        == expected_stop["top_backward"]["g"]
    assert expected_stop["top_forward"]["g"] \
        + expected_stop["top_backward"]["g"] >= expected_stop["mu"]
    assert expected_stop["mu"] == pytest.approx(result.metrics.total_cost)
    assert expected_stop["meeting_node"] == case["overlap_node"]


@pytest.mark.parametrize("method", ["held_karp", "nn_2opt", "sa"])
@pytest.mark.parametrize("return_to_start", [False, True])
def test_closed_tour_fixture_locks_all_three_method_results(
    phase0_cases,
    method,
    return_to_start,
):
    case = phase0_cases["closed_tour"]
    points = case["points"]
    costs = _tour_costs(case)
    topology = "closed" if return_to_start else "open"
    expected = case["expected"][method][topology]

    if method == "held_karp":
        order, actual = held_karp(costs, points, return_to_start)
    elif method == "nn_2opt":
        order, actual = nn_2opt(costs, points, return_to_start)
    else:
        order, actual, stats = simulated_annealing(
            costs, points, return_to_start,
        )
        optimizer = stats["optimizer_stats"]
        assert optimizer["best_seed"] == case["expected"]["sa"]["best_seed"]
        seed_key = "closed_seed_costs" if return_to_start else "open_seed_costs"
        assert stats["costs"] == case["expected"]["sa"][seed_key]

    assert order == expected["order"]
    assert actual == pytest.approx(expected["cost"])
    assert order[0] == points[0]
    assert points[0] not in order[1:]
    assert sorted(order) == sorted(points)
    assert tour_cost(costs, order, return_to_start) == pytest.approx(actual)


def test_closed_tour_fixture_is_asymmetric_and_changes_the_best_order(phase0_cases):
    case = phase0_cases["closed_tour"]
    costs = _tour_costs(case)
    expected = case["expected"]["held_karp"]

    assert any(
        costs[(a, b)] != costs[(b, a)]
        for a in case["points"]
        for b in case["points"]
        if a < b
    )
    assert expected["open"]["order"] != expected["closed"]["order"]
    assert expected["closed"]["order"][-1] != case["points"][0]
