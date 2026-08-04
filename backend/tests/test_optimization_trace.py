"""Regression contract for Milestone 3's ATSP optimization trace.

The tests intentionally compare observable solver semantics rather than runtime
or trace payload size: recording must never change the deterministic optimizer.
"""

from __future__ import annotations

import copy

import pytest
from pydantic import ValidationError

from app.graph_store import GraphStore
from app.models import OptimizationTrace
from app.optimization_trace import OptimizationTraceRecorder
from app.tsp import (
    HELD_KARP_TRACE_CAP,
    NN_LOCAL_TRACE_CAP,
    SA_TRACE_CAP,
    build_matrix,
    held_karp,
    nn_2opt,
    solve_multiroute,
)


POINTS_7 = ["n0021", "n0002", "n0043", "n0015", "n0030", "n0008", "n0047"]
POINTS_9 = [*POINTS_7, "n0005", "n0011"]


@pytest.fixture(scope="module")
def demo() -> GraphStore:
    return GraphStore.load("demo")


def _held_karp_update(ordinal: int) -> dict:
    return {
        "kind": "held_karp_update",
        "ordinal": ordinal,
        "mask": 3,
        "subset": ["n0001", "n0002"],
        "endpoint": "n0002",
        "predecessor": "n0001",
        "candidate_cost": 12.0,
        "previous_cost": None,
        "new_cost": 12.0,
    }


def _held_reconstruct(ordinal: int) -> dict:
    return {
        "kind": "held_karp_reconstruct",
        "ordinal": ordinal,
        "order": ["n0001", "n0002"],
        "total_cost": 12.0,
    }


def _summary(ordinal: int, method: str = "held_karp") -> dict:
    return {
        "kind": "optimization_summary",
        "ordinal": ordinal,
        "method": method,
        "final_order": ["n0001", "n0002"],
        "final_cost": 12.0,
    }


def test_optimization_event_union_is_strict_and_summary_is_last():
    payload = {
        "method": "held_karp",
        "total_events": 3,
        "recorded_events": 3,
        "sampling_policy": "all-or-stride-v1",
        "trace_truncated": False,
        "events": [_held_karp_update(0), _held_reconstruct(1), _summary(2)],
    }
    trace = OptimizationTrace.model_validate(payload)
    assert trace.recorded_events == len(trace.events)

    malformed = copy.deepcopy(payload)
    del malformed["events"][0]["predecessor"]
    with pytest.raises(ValidationError):
        OptimizationTrace.model_validate(malformed)

    non_finite = copy.deepcopy(payload)
    non_finite["events"][0]["candidate_cost"] = float("inf")
    with pytest.raises(ValidationError):
        OptimizationTrace.model_validate(non_finite)

    wrong_policy = copy.deepcopy(payload)
    wrong_policy["sampling_policy"] = "priority-periodic-20-v1"
    with pytest.raises(ValidationError):
        OptimizationTrace.model_validate(wrong_policy)

    summary_not_last = copy.deepcopy(payload)
    summary_not_last["events"] = [_summary(0), _held_karp_update(1), _held_reconstruct(2)]
    with pytest.raises(ValidationError):
        OptimizationTrace.model_validate(summary_not_last)


def test_disabled_recorder_never_materializes_an_event_payload():
    recorder = OptimizationTraceRecorder("nn_2opt", enabled=False, point_count=4)
    called = False

    def payload(_ordinal: int) -> dict:
        nonlocal called
        called = True
        return _summary(0, "nn_2opt")

    recorder.emit(payload)
    assert called is False
    assert recorder.total_events == 1
    assert recorder.events == []
    assert recorder.build() is None


def _semantic_response(response):
    return {
        "found": response.found,
        "order": response.order,
        "legs": [leg.model_dump() for leg in response.legs],
        "totals": response.totals.model_dump() if response.totals else None,
        "original_order_totals": (
            response.original_order_totals.model_dump()
            if response.original_order_totals else None
        ),
        "savings_pct": response.savings_pct,
        "optimal_guarantee": response.optimal_guarantee,
        "optimizer_stats": (
            response.optimizer_stats.model_dump() if response.optimizer_stats else None
        ),
    }


@pytest.mark.parametrize("method", ["held_karp", "nn_2opt", "sa"])
def test_trace_on_off_preserves_multiroute_semantics(demo: GraphStore, method: str):
    kwargs = dict(
        store=demo,
        start="n0021",
        stops=["n0002", "n0043", "n0015", "n0030"],
        method=method,
    )
    without_trace = solve_multiroute(include_trace=False, **kwargs)
    with_trace = solve_multiroute(include_trace=True, **kwargs)

    assert without_trace.optimization_trace is None
    assert _semantic_response(without_trace) == _semantic_response(with_trace)
    trace = with_trace.optimization_trace
    assert trace is not None
    assert trace.method == method
    assert trace.recorded_events == len(trace.events)
    assert trace.events[-1].kind == "optimization_summary"
    assert trace.events[-1].final_order == with_trace.order
    assert trace.events[-1].final_cost == pytest.approx(with_trace.totals.total_cost)
    if method == "held_karp":
        assert trace.events[-2].kind == "held_karp_reconstruct"
    if method == "sa":
        assert with_trace.optimizer_stats is not None
        assert [seed.seed for seed in with_trace.optimizer_stats.seeds] == [0, 1, 2, 3, 4]
    else:
        assert with_trace.optimizer_stats is None


def test_held_karp_keeps_every_update_through_eight_points(demo: GraphStore):
    cost, _ = build_matrix(demo, POINTS_7, "balanced", "07:30")
    recorder = OptimizationTraceRecorder("held_karp", enabled=True, point_count=len(POINTS_7))
    held_karp(cost, POINTS_7, False, recorder)
    trace = recorder.build()

    assert trace is not None
    assert trace.total_events == trace.recorded_events
    assert trace.trace_truncated is False
    assert trace.events[-2].kind == "held_karp_reconstruct"
    assert trace.events[-1].kind == "optimization_summary"


def test_held_karp_over_eight_points_uses_deterministic_capped_stride(demo: GraphStore):
    cost, _ = build_matrix(demo, POINTS_9, "balanced", "07:30")
    first_recorder = OptimizationTraceRecorder("held_karp", enabled=True, point_count=len(POINTS_9))
    second_recorder = OptimizationTraceRecorder("held_karp", enabled=True, point_count=len(POINTS_9))
    held_karp(cost, POINTS_9, False, first_recorder)
    held_karp(cost, POINTS_9, False, second_recorder)
    first = first_recorder.build()
    second = second_recorder.build()

    assert first is not None and second is not None
    assert first.recorded_events <= HELD_KARP_TRACE_CAP
    assert first.total_events > first.recorded_events
    assert first.trace_truncated is True
    assert [event.ordinal for event in first.events] == [event.ordinal for event in second.events]
    assert first.events[-2].kind == "held_karp_reconstruct"
    assert first.events[-1].kind == "optimization_summary"


def test_nn_events_preserve_candidate_order_and_accepted_improvements_decrease_cost():
    points = ["n0001", "n0002", "n0003", "n0004"]
    cost = {
        (a, b): 99.0
        for a in points for b in points if a != b
    }
    cost.update({
        ("n0001", "n0002"): 1.0,
        ("n0001", "n0003"): 1.5,
        ("n0001", "n0004"): 5.0,
        ("n0002", "n0003"): 1.0,
        ("n0002", "n0004"): 1.1,
        ("n0003", "n0004"): 1.0,
        ("n0003", "n0002"): 0.1,
    })
    recorder = OptimizationTraceRecorder("nn_2opt", enabled=True, point_count=len(points))
    nn_2opt(cost, points, False, recorder)
    trace = recorder.build()

    assert trace is not None
    decisions = [event for event in trace.events if event.kind == "nn_decision"]
    assert [event.current for event in decisions] == points[:-1]
    assert decisions[0].selected == "n0002"
    assert [(candidate.node, candidate.cost) for candidate in decisions[0].candidates] == [
        ("n0002", 1.0), ("n0003", 1.5), ("n0004", 5.0),
    ]
    improvements = [event for event in trace.events if event.kind == "local_improvement"]
    assert improvements
    assert all(event.after_cost < event.before_cost for event in improvements)
    assert trace.recorded_events <= NN_LOCAL_TRACE_CAP


def test_sa_trace_has_boundaries_periodic_events_and_final_best(demo: GraphStore):
    traced = solve_multiroute(
        demo, "n0021", ["n0002", "n0043", "n0015", "n0030"], "sa",
        include_trace=True,
    )
    trace = traced.optimization_trace

    assert trace is not None
    assert trace.recorded_events <= SA_TRACE_CAP
    boundaries = [event for event in trace.events if event.kind == "sa_seed_boundary"]
    assert {(event.seed, event.boundary) for event in boundaries} == {
        *( (seed, "start") for seed in range(5) ),
        *( (seed, "end") for seed in range(5) ),
    }
    iterations = [event for event in trace.events if event.kind == "sa_iteration"]
    assert any(event.sample_reason == "periodic" for event in iterations)
    assert any(event.sample_reason == "new_best" for event in iterations)
    assert trace.events[-2].kind == "sa_final_best"
    assert trace.events[-1].kind == "optimization_summary"
