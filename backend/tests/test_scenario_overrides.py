"""Semantic regression coverage for Milestone 4 edge-override scenarios."""

from __future__ import annotations

import copy

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.costs import ceil_dm, edge_cost_breakdown, haversine_m
from app.graph_store import GraphStore
from app.main import app
from app.models import EdgeOverride, ScenarioConfig
from app.scenario import EdgeNotFound, InvalidEdgeOverride, resolve_scenario, resolve_view_store


client = TestClient(app, raise_server_exceptions=False)


def _minimum_length(base: GraphStore, edge_id: str) -> float:
    edge = base.edges[edge_id]
    u, v = base.nodes[edge.u], base.nodes[edge.v]
    return ceil_dm(haversine_m(u.lat, u.lon, v.lat, v.lon))


def test_override_model_rejects_empty_duplicate_non_finite_and_boolean_values():
    with pytest.raises(ValidationError):
        EdgeOverride(edge_id="e00001")
    with pytest.raises(ValidationError):
        ScenarioConfig(edge_overrides=[
            {"edge_id": "e00001", "length_m": 100},
            {"edge_id": "e00001", "free_speed_kmh": 30},
        ])
    with pytest.raises(ValidationError):
        EdgeOverride(edge_id="e00001", length_m=float("inf"))
    with pytest.raises(ValidationError):
        EdgeOverride(edge_id="e00001", length_m="100")
    with pytest.raises(ValidationError):
        EdgeOverride(edge_id="e00001", free_speed_kmh="30")
    with pytest.raises(ValidationError):
        EdgeOverride(edge_id="e00001", congestion={"07:30": True})
    with pytest.raises(ValidationError):
        EdgeOverride(edge_id="e00001", risk={"flood": True})


def test_openapi_exposes_only_the_additive_scenario_override_contract():
    schemas = client.get("/openapi.json").json()["components"]["schemas"]
    scenario = schemas["ScenarioConfig"]
    override = schemas["EdgeOverride"]

    assert scenario["properties"]["graph_view"]["default"] == "full"
    assert scenario["properties"]["edge_overrides"]["items"] == {
        "$ref": "#/components/schemas/EdgeOverride",
    }
    assert override["required"] == ["edge_id"]
    assert set(override["properties"]) == {
        "edge_id", "length_m", "free_speed_kmh", "congestion", "risk",
    }
    assert override["additionalProperties"] is False
    for request in ("RouteRequest", "MultirouteRequest"):
        assert {"$ref": "#/components/schemas/ScenarioConfig"} in \
            schemas[request]["properties"]["scenario"]["anyOf"]


def test_resolver_applies_partial_override_recomputes_weights_and_preserves_base():
    base = GraphStore.load("demo")
    edge_id = "e00001"
    before_graph = copy.deepcopy(base.graph.model_dump(mode="json"))
    before_profiles = copy.deepcopy(base.profiles.model_dump(mode="json"))
    original = base.edges[edge_id]
    new_length = max(original.length_m + 17.3, _minimum_length(base, edge_id))

    resolved = resolve_scenario(base, ScenarioConfig(edge_overrides=[{
        "edge_id": edge_id,
        "length_m": new_length,
        "free_speed_kmh": 200,
        "congestion": {"07:30": 5},
        "risk": {"flood": 1, "construction": 0},
    }]))

    changed = resolved.store.edges[edge_id]
    expected_free = round(new_length / (200 / 3.6), 1)
    expected_time = (new_length / (200 / 3.6)) * 2.5
    expected_balanced = expected_time + 60 * 1 + 90 * 0 \
        + 30 * original.risk.narrow_alley + 25 * original.risk.traffic_light
    breakdown = edge_cost_breakdown(changed, 5)

    assert resolved.store is not base
    assert resolved.applied_scenario.override_count == 1
    assert resolved.applied_scenario.provenance == "sandbox_override"
    assert changed.length_m == new_length
    assert changed.free_speed_kmh == 200
    assert changed.free_travel_time_s == expected_free
    assert resolved.store.congestion(edge_id, "07:30") == 5
    assert resolved.store.v_max_ms == 200 / 3.6
    assert breakdown["weight_distance_m"] == new_length
    assert breakdown["weight_time_s"] == pytest.approx(expected_time)
    assert breakdown["weight_balanced_s"] == pytest.approx(expected_balanced)
    assert base.graph.model_dump(mode="json") == before_graph
    assert base.profiles.model_dump(mode="json") == before_profiles


def test_resolver_rejects_below_haversine_and_edge_outside_resolved_view():
    base = GraphStore.load("demo")
    edge_id = "e00001"
    with pytest.raises(InvalidEdgeOverride):
        resolve_scenario(base, ScenarioConfig(edge_overrides=[{
            "edge_id": edge_id,
            "length_m": _minimum_length(base, edge_id) - 0.1,
        }]))

    teach = resolve_view_store(base, "teach_7")
    hidden_edge = next(edge_id for edge_id in base.edges if edge_id not in teach.edges)
    with pytest.raises(EdgeNotFound):
        resolve_scenario(base, ScenarioConfig(
            graph_view="teach_7",
            edge_overrides=[{"edge_id": hidden_edge, "free_speed_kmh": 30}],
        ))


def test_fingerprint_is_order_independent_and_noop_override_canonicalizes_to_base():
    base = GraphStore.load("demo")
    first, second = base.graph.edges[:2]
    first_change = {"edge_id": first.id, "free_speed_kmh": first.free_speed_kmh - 1}
    second_change = {"edge_id": second.id, "risk": {"traffic_light": 1 - second.risk.traffic_light}}

    forward = resolve_scenario(base, ScenarioConfig(edge_overrides=[first_change, second_change]))
    reverse = resolve_scenario(base, ScenarioConfig(edge_overrides=[second_change, first_change]))
    noop = resolve_scenario(base, ScenarioConfig(edge_overrides=[{
        "edge_id": first.id,
        "length_m": first.length_m,
        "free_speed_kmh": first.free_speed_kmh,
        "congestion": {"07:30": base.congestion(first.id, "07:30")},
        "risk": {"flood": first.risk.flood},
    }]))
    plain = resolve_scenario(base, None)
    empty = resolve_scenario(base, ScenarioConfig.model_validate({}))

    assert forward.applied_scenario.fingerprint == reverse.applied_scenario.fingerprint
    assert forward.applied_scenario.override_count == reverse.applied_scenario.override_count == 2
    assert noop.store is base
    assert noop.applied_scenario == plain.applied_scenario
    assert empty.store is base
    assert empty.applied_scenario == plain.applied_scenario


def test_route_and_multiroute_echo_same_effective_sandbox_fingerprint():
    scenario = {"edge_overrides": [{"edge_id": "e00001", "free_speed_kmh": 20}]}
    route = client.post("/api/route", json={
        "start": "n0002", "goal": "n0047", "algorithm": "astar",
        "mode": "balanced", "time_slot": "07:30", "graph": "demo",
        "scenario": scenario,
    })
    multi = client.post("/api/multiroute", json={
        "start": "n0021", "stops": ["n0002", "n0043"], "method": "nn_2opt",
        "mode": "balanced", "time_slot": "07:30", "graph": "demo",
        "scenario": scenario,
    })

    assert route.status_code == multi.status_code == 200
    assert route.json()["applied_scenario"]["provenance"] == "sandbox_override"
    assert route.json()["applied_scenario"]["fingerprint"] == \
        multi.json()["applied_scenario"]["fingerprint"]


def test_api_returns_typed_errors_for_invalid_and_hidden_overrides():
    invalid = client.post("/api/route", json={
        "start": "n0002", "goal": "n0047", "algorithm": "astar",
        "time_slot": "07:30", "graph": "demo",
        "scenario": {"edge_overrides": [{"edge_id": "e00001", "free_speed_kmh": 201}]},
    })
    hidden = client.post("/api/route", json={
        "start": "n0018", "goal": "n0038", "algorithm": "astar",
        "time_slot": "07:30", "graph": "demo",
        "scenario": {
            "graph_view": "teach_7",
            "edge_overrides": [{"edge_id": "e00001", "free_speed_kmh": 30}],
        },
    })
    string_number = client.post("/api/route", json={
        "start": "n0002", "goal": "n0047", "algorithm": "astar",
        "time_slot": "07:30", "graph": "demo",
        "scenario": {"edge_overrides": [{"edge_id": "e00001", "length_m": "100"}]},
    })

    assert invalid.status_code == 422
    assert invalid.json()["error"]["code"] == "INVALID_EDGE_OVERRIDE"
    assert hidden.status_code == 404
    assert hidden.json()["error"]["code"] == "EDGE_NOT_FOUND"
    assert string_number.status_code == 422
    assert string_number.json()["error"]["code"] == "INVALID_EDGE_OVERRIDE"
