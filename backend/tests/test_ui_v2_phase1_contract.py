"""Executable gates for UI & Explanation v2 Phase 1 (SCHEMA §F)."""

from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import app.search as search_module
from app.graph_store import GraphStore
from app.main import app
from app.models import (
    ExplanationObjective, GraphFile, MultirouteResponse, PathCostBreakdown,
    SELECTION_RULE_BY_ALGORITHM, TIME_SLOTS, Trace, TrafficProfiles,
)
from app.search import ALGORITHMS
from app.search_advanced import ADVANCED_ALGORITHMS
from app.tsp import build_matrix, solve_multiroute


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "ui_v2_phase1_golden.json"
PHASE0_PATH = Path(__file__).parent / "fixtures" / "ui_v2_phase0_cases.json"
ALL = {**ALGORITHMS, **ADVANCED_ALGORITHMS}


@pytest.fixture(scope="module")
def golden() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def demo() -> GraphStore:
    return GraphStore.load("demo")


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def _store(
    node_ids: list[str],
    edge_specs: list[tuple[str, str, float]],
    coordinates: dict[str, tuple[float, float]] | None = None,
) -> GraphStore:
    coordinates = coordinates or {}
    nodes = []
    for index, node_id in enumerate(node_ids):
        lat, lon = coordinates.get(node_id, (10.5, 106.5 + index * 0.00001))
        nodes.append({
            "id": node_id,
            "name": node_id,
            "lat": lat,
            "lon": lon,
            "type": "landmark",
        })
    edges = []
    for index, (source, target, length) in enumerate(edge_specs, 1):
        edges.append({
            "id": f"e{index:05d}",
            "u": source,
            "v": target,
            "name": None,
            "length_m": length,
            "highway": "primary",
            "oneway": True,
            "free_speed_kmh": 36.0,
            "free_travel_time_s": round(length / 10.0, 1),
            "risk": {
                "flood": 0,
                "construction": 0,
                "narrow_alley": 0,
                "traffic_light": 0,
            },
        })
    graph = GraphFile.model_validate({
        "meta": {
            "name": "G_ui_v2_phase1_fixture",
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


def _legacy_route_projection(payload: dict) -> dict:
    keys = {
        "algorithm", "mode", "time_slot", "graph", "applied_scenario",
        "found", "path", "metrics", "trace", "explanation",
    }
    projected = {key: copy.deepcopy(payload[key]) for key in keys}
    for step in projected["trace"]:
        step.pop("decision", None)
        step.pop("bidirectional_frontiers", None)
    projected["explanation"].pop("evidence", None)
    return projected


def _deterministic_multiroute(response: MultirouteResponse) -> dict:
    payload = response.model_dump()
    payload.pop("optimization_trace", None)
    payload.pop("computation_metrics", None)
    return payload


@pytest.mark.parametrize("algorithm", list(ALL))
def test_route_golden_and_trace_instrumentation_are_non_regressive(
    demo: GraphStore, golden: dict, algorithm: str,
):
    request = golden["route_request"]
    expected = golden["routes"][algorithm]
    without_trace = ALL[algorithm](demo, include_trace=False, **request)
    with_trace = ALL[algorithm](demo, include_trace=True, **request)

    for result in (without_trace, with_trace):
        assert result.found is True
        assert result.path == expected["path"]
        assert result.metrics.total_cost == expected["total_cost"]
        assert result.metrics.total_distance_m == expected["total_distance_m"]
        assert result.metrics.total_time_s == expected["total_time_s"]
        assert result.metrics.nodes_expanded == expected["nodes_expanded"]
        assert result.metrics.max_frontier == expected["max_frontier"]
        assert result.metrics.optimal_guarantee is expected["optimal_guarantee"]
        assert result.metrics.epsilon_bound == expected.get("epsilon_bound")
        assert result.metrics.beam_width == expected.get("beam_width")

    assert without_trace.trace == []
    assert without_trace.termination == with_trace.termination
    assert with_trace.trace
    assert all(
        step.decision is not None
        and step.decision.rule == SELECTION_RULE_BY_ALGORITHM[algorithm]
        for step in with_trace.trace
    )
    assert all(
        step.decision.frontier_size_after == len(step.frontier)
        for step in with_trace.trace
        if step.decision is not None
    )


def test_route_api_only_emits_complete_v2_variants(client: TestClient):
    for algorithm in ALL:
        base = {
            "start": "n0002",
            "goal": "n0047",
            "algorithm": algorithm,
            "mode": "balanced",
            "time_slot": "07:30",
            "graph": "demo",
        }
        traced_response = client.post(
            "/api/route", json={**base, "include_trace": True},
        )
        assert traced_response.status_code == 200
        traced = Trace.model_validate(traced_response.json())
        assert traced.contract_version == 2
        assert traced.termination is not None
        assert traced.explanation.evidence is not None
        assert traced.trace and all(step.decision is not None for step in traced.trace)

        quiet = Trace.model_validate(client.post(
            "/api/route", json={**base, "include_trace": False},
        ).json())
        assert quiet.contract_version == 2
        assert quiet.trace == []
        assert quiet.termination == traced.termination
        assert quiet.path == traced.path
        assert quiet.metrics.model_dump(exclude={"runtime_ms"}) \
            == traced.metrics.model_dump(exclude={"runtime_ms"})
        assert quiet.explanation.evidence is not None


@pytest.mark.parametrize("algorithm", list(ALL))
def test_all_algorithms_distinguish_trivial_and_proven_unreachable(algorithm: str):
    disconnected = _store(
        ["n0001", "n0002"], [("n0002", "n0001", 1.0)],
    )
    trivial = ALL[algorithm](
        disconnected, "n0001", "n0001", mode="distance", include_trace=True,
    )
    assert trivial.found and trivial.path == ["n0001"]
    assert trivial.termination.reason == "start_equals_goal"
    assert trivial.termination.solution_quality == "not_applicable"

    unreachable = ALL[algorithm](
        disconnected, "n0001", "n0002", mode="distance", include_trace=True,
    )
    assert unreachable.found is False
    assert unreachable.path == []
    assert unreachable.termination.reason == "frontier_exhausted"
    assert unreachable.termination.reachability == "proven_unreachable"


def test_iddfs_idastar_and_beam_report_real_cap_or_pruning(monkeypatch):
    deep = _store(
        ["n0001", "n0002", "n0003"],
        [("n0001", "n0002", 1.0), ("n0002", "n0003", 1.0)],
    )
    monkeypatch.setattr(search_module, "IDDFS_MAX_DEPTH", 1)
    iddfs_result = search_module.iddfs(
        deep, "n0001", "n0003", mode="distance", include_trace=True,
    )
    assert iddfs_result.termination.reason == "depth_cap_reached"
    assert iddfs_result.termination.reachability == "inconclusive"

    ida = _store(
        ["n0001", "n0002"],
        [("n0001", "n0002", 200.0)],
        {"n0001": (10.5, 106.5), "n0002": (10.5, 106.501)},
    )
    ida_capped = ADVANCED_ALGORITHMS["idastar"](
        ida, "n0001", "n0002", mode="distance", include_trace=True,
        max_rounds=1,
    )
    assert ida_capped.termination.reason == "round_cap_reached"
    assert ida_capped.termination.reachability == "inconclusive"
    assert ida_capped.trace[0].decision.iteration == 1
    assert ida_capped.trace[0].decision.bound is not None

    beam_store = _store(
        ["n0001", "n0002", "n0003", "n0004"],
        [
            ("n0001", "n0002", 1.0),
            ("n0001", "n0003", 1.0),
            ("n0003", "n0004", 1.0),
        ],
        {
            "n0001": (10.5, 106.49),
            "n0002": (10.5, 106.500001),
            "n0003": (10.5, 106.51),
            "n0004": (10.5, 106.5),
        },
    )
    beam_result = ADVANCED_ALGORITHMS["beam"](
        beam_store, "n0001", "n0004", mode="distance", include_trace=True,
        beam_width=1,
    )
    assert beam_result.found is False
    assert beam_result.termination.reason == "beam_exhausted_after_pruning"
    assert any(step.decision.pruned_count > 0 for step in beam_result.trace)


def test_bidijkstra_two_side_and_stop_bound_match_legacy_phase0_fixture():
    case = json.loads(PHASE0_PATH.read_text(encoding="utf-8"))["bidirectional_overlap"]
    store = _store(
        case["nodes"],
        [(edge["u"], edge["v"], edge["cost"]) for edge in case["edges"]],
    )
    result = ADVANCED_ALGORITHMS["bidijkstra"](
        store, case["start"], case["goal"], mode="distance", include_trace=True,
    )
    overlap = next(
        step for step in result.trace
        if case["overlap_node"] in step.bidirectional_frontiers.forward.nodes
        and case["overlap_node"] in step.bidirectional_frontiers.backward.nodes
    )
    sides = overlap.bidirectional_frontiers
    assert sides.forward.g[case["overlap_node"]] == case["expected_overlap_forward_g"]
    assert sides.backward.g[case["overlap_node"]] == case["expected_overlap_backward_g"]
    assert overlap.frontier == sorted(set(sides.forward.nodes) | set(sides.backward.nodes))
    assert overlap.g[case["overlap_node"]] == min(
        sides.forward.g[case["overlap_node"]],
        sides.backward.g[case["overlap_node"]],
    )
    bound = result.termination.bidirectional_bound
    expected = case["expected_stop"]
    assert result.termination.reason == "bidirectional_bound_met"
    assert bound.model_dump() == expected
    top_forward = bound.top_forward.g if bound.top_forward else float("inf")
    top_backward = bound.top_backward.g if bound.top_backward else float("inf")
    assert top_forward + top_backward >= bound.mu


@pytest.mark.parametrize("mode", ["distance", "time", "balanced"])
def test_explanation_breakdown_objective_and_factor_units(
    client: TestClient, mode: str,
):
    payload = client.post("/api/route", json={
        "start": "n0002",
        "goal": "n0047",
        "algorithm": "bfs",
        "mode": mode,
        "time_slot": "07:30",
        "graph": "demo",
        "include_trace": False,
    }).json()
    trace = Trace.model_validate(payload)
    evidence = trace.explanation.evidence
    breakdown = evidence.cost_breakdown
    assert breakdown.congestion_delay_s == pytest.approx(
        breakdown.congestion_adjusted_time_s - breakdown.free_flow_time_s,
    )
    assert breakdown.risk_penalty_total_s == pytest.approx(
        breakdown.penalty_flood_s + breakdown.penalty_construction_s
        + breakdown.penalty_narrow_alley_s + breakdown.penalty_traffic_light_s,
    )
    assert breakdown.balanced_cost_s == pytest.approx(
        breakdown.congestion_adjusted_time_s + breakdown.risk_penalty_total_s,
    )
    assert trace.metrics.total_cost == pytest.approx(breakdown.objective_value(mode))
    assert trace.metrics.total_time_s == pytest.approx(breakdown.balanced_cost_s)
    expected_unit = "m" if mode == "distance" else "s"
    assert all(
        factor.contribution_unit == expected_unit
        for factor in evidence.factors if factor.contribution_raw is not None
    )
    for factor in evidence.factors:
        if factor.kind in {"flood", "construction", "narrow_alley", "traffic_light"}:
            assert factor.affects_objective is (mode == "balanced")
        if factor.kind == "congestion":
            assert factor.affects_objective is (mode != "distance")


def test_time_reference_relation_uses_total_cost_not_balanced_total_time(
    client: TestClient,
):
    payload = client.post("/api/route", json={
        "start": "n0002",
        "goal": "n0047",
        "algorithm": "bfs",
        "mode": "time",
        "time_slot": "07:30",
        "graph": "demo",
        "include_trace": False,
    }).json()
    trace = Trace.model_validate(payload)
    assert trace.metrics.total_cost != trace.metrics.total_time_s
    reference = trace.explanation.evidence.reference_routes[0]
    expected = reference.metrics.total_cost - trace.metrics.total_cost
    wrong_balanced_delta = reference.metrics.total_time_s - trace.metrics.total_time_s
    assert reference.reference_minus_selected_cost == pytest.approx(expected)
    assert reference.reference_minus_selected_cost != pytest.approx(wrong_balanced_delta)
    assert reference.relation_to_selected == (
        "better" if expected < 0 else "worse" if expected > 0 else "equivalent"
    )
    assert reference.provenance == "posthoc_ucs"

    exact_payload = client.post("/api/route", json={
        "start": "n0002",
        "goal": "n0047",
        "algorithm": "ucs",
        "mode": "time",
        "time_slot": "07:30",
        "graph": "demo",
        "include_trace": False,
    }).json()
    exact = Trace.model_validate(exact_payload)
    worse = exact.explanation.evidence.reference_routes[0]
    assert worse.relation_to_selected == "worse"
    assert worse.reference_minus_selected_cost > 0


@pytest.mark.parametrize("method", ["held_karp", "nn_2opt", "sa"])
@pytest.mark.parametrize("return_to_start", [False, True])
def test_multiroute_v2_open_closed_golden_and_aggregates(
    demo: GraphStore, golden: dict, method: str, return_to_start: bool,
):
    request = golden["multiroute_request"]
    expected = golden["multiroute"]["closed" if return_to_start else "open"]
    response = solve_multiroute(
        demo, method=method, return_to_start=return_to_start,
        include_trace=False, **request,
    )
    MultirouteResponse.model_validate(response.model_dump())
    assert response.contract_version == 2
    assert response.return_to_start is return_to_start
    assert response.original_order == [request["start"], *request["stops"]]
    assert response.order == golden["multiroute"]["order"]
    assert [leg.path for leg in response.legs] == expected["leg_paths"]
    assert response.totals.model_dump() == expected["totals"]
    assert response.original_order_totals.model_dump() == expected["original_order_totals"]
    assert response.savings_pct == expected["savings_pct"]
    assert len(response.legs) == len(response.order) - (0 if return_to_start else 1)
    assert len(response.original_order_legs) == len(response.original_order) - (
        0 if return_to_start else 1
    )
    assert response.failure is None
    assert response.method_stats is not None
    assert response.matrix_evidence.reachable_directed_pair_count \
        == response.matrix_evidence.directed_pair_count
    assert response.computation_metrics.matrix_search_runs == len(response.original_order)
    assert response.computation_metrics.matrix_nodes_expanded > 0
    assert response.computation_metrics.total_runtime_ms + 0.002 >= (
        response.computation_metrics.matrix_runtime_ms
        + response.computation_metrics.optimizer_runtime_ms
    )
    for legs, totals, breakdown in (
        (response.legs, response.totals, response.totals_breakdown),
        (
            response.original_order_legs,
            response.original_order_totals,
            response.original_order_breakdown,
        ),
    ):
        assert totals.total_cost == pytest.approx(sum(
            leg.metrics.total_cost for leg in legs
        ))
        for field_name in PathCostBreakdown.model_fields:
            assert getattr(breakdown, field_name) == pytest.approx(sum(
                getattr(leg.cost_breakdown, field_name) for leg in legs
            ))


@pytest.mark.parametrize("mode", ["distance", "time", "balanced"])
def test_atsp_breakdown_uses_active_mode_and_matrix_evidence_is_deterministic(
    demo: GraphStore, mode: str,
):
    points = ["n0021", "n0002", "n0043", "n0015"]
    response = solve_multiroute(
        demo,
        points[0],
        points[1:],
        "nn_2opt",
        mode=mode,
        time_slot="07:30",
    )
    for leg in [*response.legs, *response.original_order_legs]:
        assert leg.metrics.total_cost == pytest.approx(
            leg.cost_breakdown.objective_value(mode),
        )
        assert leg.metrics.total_time_s == pytest.approx(
            leg.cost_breakdown.balanced_cost_s,
        )
    cost, _ = build_matrix(demo, points, mode, "07:30")
    asymmetric = []
    for left_index, left in enumerate(sorted(points)):
        for right in sorted(points)[left_index + 1:]:
            delta = abs(cost[(left, right)] - cost[(right, left)])
            if delta > max(
                1e-6,
                1e-9 * max(abs(cost[(left, right)]), abs(cost[(right, left)])),
            ):
                asymmetric.append((delta, left, right))
    asymmetric.sort(key=lambda item: (-item[0], item[1], item[2]))
    evidence = response.matrix_evidence
    assert evidence.asymmetric_unordered_pair_count == len(asymmetric)
    assert evidence.asymmetry_example.absolute_delta == pytest.approx(asymmetric[0][0])
    assert (
        evidence.asymmetry_example.from_node,
        evidence.asymmetry_example.to_node,
    ) == asymmetric[0][1:]


@pytest.mark.parametrize("method", ["held_karp", "nn_2opt", "sa"])
def test_atsp_stats_and_results_are_trace_independent(demo: GraphStore, method: str):
    kwargs = dict(
        store=demo,
        start="n0021",
        stops=["n0002", "n0043", "n0015"],
        method=method,
        return_to_start=True,
    )
    quiet = solve_multiroute(include_trace=False, **kwargs)
    traced = solve_multiroute(include_trace=True, **kwargs)
    assert quiet.optimization_trace is None
    assert traced.optimization_trace is not None
    assert _deterministic_multiroute(quiet) == _deterministic_multiroute(traced)
    if method == "held_karp":
        assert quiet.method_stats.dp_states_solved >= 1
        assert quiet.method_stats.transitions_evaluated > 0
    elif method == "nn_2opt":
        assert quiet.method_stats.nn_candidates_evaluated > 0
        assert quiet.method_stats.final_cost <= quiet.method_stats.nn_initial_cost
    else:
        stats = quiet.method_stats
        assert [seed.seed for seed in stats.seeds] == [0, 1, 2, 3, 4]
        assert stats.attempted_moves == 10_000
        assert stats.accepted_improving_moves > 0
        assert stats.accepted_equal_moves > 0
        assert stats.accepted_worse_moves > 0
        assert stats.rejected_moves > 0
        assert stats.attempted_moves == (
            stats.accepted_improving_moves + stats.accepted_equal_moves
            + stats.accepted_worse_moves + stats.rejected_moves
        )


def test_multiroute_api_serializes_all_methods_and_topologies(client: TestClient):
    for method in ("held_karp", "nn_2opt", "sa"):
        for return_to_start in (False, True):
            response = client.post("/api/multiroute", json={
                "start": "n0021",
                "stops": ["n0002", "n0043", "n0015"],
                "method": method,
                "mode": "balanced",
                "time_slot": "07:30",
                "graph": "demo",
                "return_to_start": return_to_start,
                "include_trace": False,
            })
            assert response.status_code == 200
            parsed = MultirouteResponse.model_validate(response.json())
            assert parsed.contract_version == 2
            assert parsed.return_to_start is return_to_start
            assert parsed.applied_scenario is not None


def test_fifteen_stop_topology_has_fifteen_open_or_sixteen_closed_legs(
    demo: GraphStore,
):
    points = [node.id for node in demo.graph.nodes[:16]]
    for return_to_start, expected_legs in ((False, 15), (True, 16)):
        result = solve_multiroute(
            demo,
            points[0],
            points[1:],
            "nn_2opt",
            return_to_start=return_to_start,
        )
        assert len(result.original_order) == 16
        assert len(result.legs) == expected_legs
        assert len(result.original_order_legs) == expected_legs
        if return_to_start:
            assert result.legs[-1].to_node == points[0]


def test_matrix_incomplete_is_typed_and_optimizer_does_not_start():
    disconnected = _store(
        ["n0001", "n0002"], [("n0002", "n0001", 1.0)],
    )
    result = solve_multiroute(
        disconnected, "n0001", ["n0002"], "sa", include_trace=True,
    )
    assert result.contract_version == 2
    assert result.found is False
    assert result.return_to_start is False
    assert result.original_order == ["n0001", "n0002"]
    assert result.order == [] and result.legs == [] and result.original_order_legs == []
    assert result.failure.model_dump() == {
        "kind": "matrix_incomplete", "from_node": "n0001", "to_node": "n0002",
    }
    assert result.method_stats is None
    assert result.optimizer_stats is None
    assert result.optimization_trace is None
    assert result.computation_metrics.optimizer_runtime_ms == 0.0
    assert result.computation_metrics.matrix_search_runs == 1
    assert result.matrix_evidence.reachable_directed_pair_count == 0


def test_v2_rejects_partial_or_nonfinite_payload_and_v1_stays_parseable(
    client: TestClient,
):
    valid = client.post("/api/route", json={
        "start": "n0002",
        "goal": "n0047",
        "algorithm": "astar",
        "mode": "balanced",
        "time_slot": "07:30",
        "graph": "demo",
        "include_trace": True,
    }).json()
    partial = copy.deepcopy(valid)
    del partial["termination"]
    with pytest.raises(ValidationError):
        Trace.model_validate(partial)

    malformed = copy.deepcopy(valid)
    malformed["explanation"]["evidence"]["cost_breakdown"]["distance_m"] = float("nan")
    with pytest.raises(ValidationError):
        Trace.model_validate(malformed)

    exact_conflict = copy.deepcopy(valid)
    objective = exact_conflict["explanation"]["evidence"]["objective"]
    objective["exact_reference_value"] = objective["selected_value"] - 1.0
    objective["optimality_gap"] = 1.0
    objective["optimality_gap_pct"] = 1.0 / objective["exact_reference_value"] * 100.0
    with pytest.raises(ValidationError, match="exact result conflicts"):
        Trace.model_validate(exact_conflict)

    zero = ExplanationObjective(
        mode="distance",
        selected_value=0.0,
        exact_reference_value=0.0,
        optimality_gap=0.0,
        optimality_gap_pct=0.0,
    )
    assert zero.optimality_gap_pct == 0.0
    zero_denominator = ExplanationObjective(
        mode="distance",
        selected_value=1.0,
        exact_reference_value=0.0,
        optimality_gap=1.0,
        optimality_gap_pct=None,
    )
    assert zero_denominator.optimality_gap_pct is None

    legacy_trace = json.loads(
        (Path(__file__).parents[2] / "data/mock/trace_mock.json").read_text(encoding="utf-8")
    )
    legacy_multi = json.loads(
        (Path(__file__).parents[2] / "data/mock/multiroute_mock.json").read_text(
            encoding="utf-8",
        )
    )
    assert Trace.model_validate(legacy_trace).contract_version is None
    assert MultirouteResponse.model_validate(legacy_multi).contract_version is None

    f1 = _legacy_route_projection(valid)
    assert "contract_version" not in f1
    assert "termination" not in f1
    assert "evidence" not in f1["explanation"]
    assert f1["path"] == valid["path"]
    assert f1["metrics"] == valid["metrics"]
