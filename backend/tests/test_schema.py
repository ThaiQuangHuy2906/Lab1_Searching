"""Phase 0: validate mock data against the contracts in docs/SCHEMA.md.

The Pydantic models in app/models.py carry most structural constraints;
these tests add cross-file checks (graph <-> profiles <-> trace) plus a
few negative cases proving the validators actually bite.
"""

import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.models import GraphFile, MultirouteResponse, Trace, TrafficProfiles

MOCK_DIR = Path(__file__).resolve().parents[2] / "data" / "mock"

GAMMA = 1.5
PENALTY_S = {"flood": 60, "construction": 90, "narrow_alley": 30, "traffic_light": 25}


def load(name: str) -> dict:
    return json.loads((MOCK_DIR / name).read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def graph_raw() -> dict:
    return load("graph_mock.json")


@pytest.fixture(scope="module")
def graph(graph_raw) -> GraphFile:
    return GraphFile.model_validate(graph_raw)


@pytest.fixture(scope="module")
def profiles(graph) -> TrafficProfiles:
    return TrafficProfiles.model_validate(load("traffic_profiles_mock.json"))


@pytest.fixture(scope="module")
def trace(graph) -> Trace:
    return Trace.model_validate(load("trace_mock.json"))


@pytest.fixture(scope="module")
def multiroute(graph) -> MultirouteResponse:
    return MultirouteResponse.model_validate(load("multiroute_mock.json"))


def balanced_weight(edge, congestion: int) -> float:
    f_cong = 1 + GAMMA * (congestion - 1) / 4
    risk = edge.risk.model_dump()
    penalty = sum(PENALTY_S[k] * v for k, v in risk.items())
    return edge.free_travel_time_s * f_cong + penalty


# --------------------------------------------------------------------------
# graph_mock.json (SCHEMA §A)
# --------------------------------------------------------------------------


def test_graph_mock_matches_schema(graph: GraphFile):
    assert graph.meta.name == "G_mock"
    assert graph.meta.node_count == len(graph.nodes) == 8
    assert graph.meta.edge_count == len(graph.edges) == 16


def test_graph_meets_phase0_dod(graph: GraphFile):
    # Phase 0 DoD: an 8-node mock; must exercise oneway + all 4 risk flags.
    assert any(e.oneway for e in graph.edges)
    assert any(not e.oneway for e in graph.edges)
    for flag in ("flood", "construction", "narrow_alley", "traffic_light"):
        assert any(getattr(e.risk, flag) == 1 for e in graph.edges), f"no edge with {flag}=1"


def test_graph_strongly_connected(graph: GraphFile):
    nodes = {n.id for n in graph.nodes}
    fwd: dict[str, set[str]] = {n: set() for n in nodes}
    bwd: dict[str, set[str]] = {n: set() for n in nodes}
    for e in graph.edges:
        fwd[e.u].add(e.v)
        bwd[e.v].add(e.u)

    def reachable(adj: dict[str, set[str]], src: str) -> set[str]:
        seen, stack = {src}, [src]
        while stack:
            for nxt in adj[stack.pop()]:
                if nxt not in seen:
                    seen.add(nxt)
                    stack.append(nxt)
        return seen

    src = next(iter(nodes))
    assert reachable(fwd, src) == nodes, "not all nodes reachable (forward)"
    assert reachable(bwd, src) == nodes, "not all nodes reach the source (backward)"


# --------------------------------------------------------------------------
# traffic_profiles_mock.json (SCHEMA §A.4)
# --------------------------------------------------------------------------


def test_profiles_cover_every_edge_every_slot(graph: GraphFile, profiles: TrafficProfiles):
    edge_ids = {e.id for e in graph.edges}
    assert set(profiles.profiles.keys()) == {"07:30", "12:00", "17:30", "22:00"}
    for slot, cong in profiles.profiles.items():
        assert set(cong.keys()) == edge_ids, f"slot {slot} does not cover edges exactly"


# --------------------------------------------------------------------------
# trace_mock.json (SCHEMA §B)
# --------------------------------------------------------------------------


def test_trace_nodes_and_path_exist_in_graph(graph: GraphFile, trace: Trace):
    node_ids = {n.id for n in graph.nodes}
    edge_pairs = {(e.u, e.v) for e in graph.edges}
    assert set(trace.path) <= node_ids
    for a, b in zip(trace.path, trace.path[1:]):
        assert (a, b) in edge_pairs, f"path hop {a}->{b} is not a real edge"
    for st in trace.trace:
        assert st.expanded in node_ids
        assert set(st.frontier) <= node_ids
        for mapping in (st.g, st.h, st.f):
            assert mapping is not None  # astar: enforced by model too
            assert set(mapping.keys()) == set(st.frontier)


def test_trace_metrics_consistent(graph: GraphFile, profiles: TrafficProfiles, trace: Trace):
    assert trace.algorithm == "astar" and trace.found
    assert not trace.metrics.trace_truncated
    assert trace.metrics.nodes_expanded == len(trace.trace)
    assert trace.metrics.max_frontier == max(len(s.frontier) for s in trace.trace)
    # Recompute balanced cost along the path from graph + profiles.
    lookup = {(e.u, e.v): e for e in graph.edges}
    cong = profiles.profiles[trace.time_slot]
    cost = dist = 0.0
    for a, b in zip(trace.path, trace.path[1:]):
        e = lookup[(a, b)]
        cost += balanced_weight(e, cong[e.id])
        dist += e.length_m
    assert trace.metrics.total_cost == pytest.approx(cost, abs=0.11)
    assert trace.metrics.total_distance_m == pytest.approx(dist, abs=0.11)
    assert trace.metrics.total_time_s == trace.metrics.total_cost  # balanced mode


def test_trace_explanation_filled(trace: Trace):
    assert trace.explanation.summary_vi
    assert trace.explanation.alternatives, "mock must ship >=1 alternative for the frontend"
    alt = trace.explanation.alternatives[0]
    assert alt.path != trace.path, "alternative must actually differ from the chosen route"


# --------------------------------------------------------------------------
# multiroute_mock.json (SCHEMA §C.5)
# --------------------------------------------------------------------------


def test_multiroute_consistent(graph: GraphFile, multiroute: MultirouteResponse):
    node_ids = {n.id for n in graph.nodes}
    edge_pairs = {(e.u, e.v) for e in graph.edges}
    assert multiroute.found
    assert multiroute.order[0] == "n0001"
    assert len(multiroute.legs) == len(multiroute.order) - 1
    for leg in multiroute.legs:
        assert leg.path[0] == leg.from_node and leg.path[-1] == leg.to_node
        assert set(leg.path) <= node_ids
        for a, b in zip(leg.path, leg.path[1:]):
            assert (a, b) in edge_pairs
    total = sum(leg.metrics.total_cost for leg in multiroute.legs)
    assert multiroute.totals.total_cost == pytest.approx(total, abs=0.5)
    expected_savings = (
        (multiroute.original_order_totals.total_cost - multiroute.totals.total_cost)
        / multiroute.original_order_totals.total_cost * 100
    )
    assert multiroute.savings_pct == pytest.approx(expected_savings, abs=0.06)
    assert multiroute.optimal_guarantee is False  # nn_2opt is approximate


# --------------------------------------------------------------------------
# Negative cases — the validators must actually reject bad data
# --------------------------------------------------------------------------


def test_rejects_twoway_edge_without_reverse(graph_raw: dict):
    bad = copy.deepcopy(graph_raw)
    victim = next(e for e in bad["edges"] if e["oneway"] is False)
    bad["edges"] = [e for e in bad["edges"]
                    if not (e["u"] == victim["v"] and e["v"] == victim["u"])]
    bad["meta"]["edge_count"] = len(bad["edges"])
    with pytest.raises(ValidationError, match="reverse edge"):
        GraphFile.model_validate(bad)


def test_rejects_wrong_travel_time_formula(graph_raw: dict):
    bad = copy.deepcopy(graph_raw)
    bad["edges"][0]["free_travel_time_s"] += 5.0
    with pytest.raises(ValidationError, match="deviates"):
        GraphFile.model_validate(bad)


def test_rejects_astar_trace_missing_h():
    raw = load("trace_mock.json")
    bad = copy.deepcopy(raw)
    bad["trace"][0]["h"] = None
    with pytest.raises(ValidationError, match="requires 'h'"):
        Trace.model_validate(bad)


def test_rejects_bfs_trace_carrying_g():
    raw = copy.deepcopy(load("trace_mock.json"))
    raw["algorithm"] = "bfs"
    raw["metrics"]["optimal_guarantee"] = False
    with pytest.raises(ValidationError, match="must keep 'g' null"):
        Trace.model_validate(raw)


def test_rejects_found_false_with_path():
    raw = copy.deepcopy(load("trace_mock.json"))
    raw["found"] = False
    with pytest.raises(ValidationError, match="path"):
        Trace.model_validate(raw)
