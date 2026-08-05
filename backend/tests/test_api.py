"""Phase 4 DoD: TestClient smoke over all 6 endpoints + error envelope.

Also asserts the explanation quality gates: Vietnamese summary with real
numbers and at least one genuinely different alternative on G_demo.
"""

import logging
import re

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app
from app.models import GraphResponse, MultirouteResponse, Trace

client = TestClient(app, raise_server_exceptions=False)

DEMO_OD = {"start": "n0002", "goal": "n0047"}


def route_body(**over) -> dict:
    body = {**DEMO_OD, "algorithm": "astar", "mode": "balanced",
            "time_slot": "07:30", "graph": "demo"}
    body.update(over)
    return body


# ---------------------------------------------------------------- health


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and body["versions"]["python"].startswith("3.14")


# ----------------------------------------------------------------- graph


def test_graph_demo_and_real():
    for level, nodes in (("demo", 51), ("real", 2118)):
        r = client.get("/api/graph", params={"level": level})
        assert r.status_code == 200
        graph = GraphResponse.model_validate(r.json())
        assert graph.meta.node_count == nodes
        assert graph.view_meta.base_graph == level
        assert graph.view_meta.graph_view == "full"
        assert graph.view_meta.base_node_count == nodes


def test_graph_teach_view_is_a_real_induced_payload():
    r = client.get("/api/graph", params={"level": "demo", "view": "teach_7"})

    assert r.status_code == 200
    graph = GraphResponse.model_validate(r.json())
    assert graph.meta.name == "G_demo:teach_7"
    assert graph.meta.node_count == 7
    assert graph.meta.edge_count == 24
    assert graph.view_meta.model_dump() == {
        "base_graph": "demo", "graph_view": "teach_7", "base_node_count": 51,
    }


@pytest.mark.parametrize("node_count", [3, 4, 5, 10, 26, 50])
def test_graph_accepts_an_arbitrary_teaching_node_count(node_count: int):
    view = f"teach_{node_count}"
    r = client.get("/api/graph", params={"level": "demo", "view": view})

    assert r.status_code == 200
    graph = GraphResponse.model_validate(r.json())
    assert graph.meta.node_count == node_count
    assert graph.view_meta.graph_view == view


def test_real_graph_rejects_teaching_view_with_typed_error():
    r = client.get("/api/graph", params={"level": "real", "view": "teach_7"})

    assert r.status_code == 422
    assert r.json()["error"]["code"] == "GRAPH_VIEW_UNAVAILABLE"


@pytest.mark.parametrize("view", ["teach_2", "teach_51", "teach_99", "teach_3.5"])
def test_unknown_graph_view_gives_validation_envelope(view: str):
    r = client.get("/api/graph", params={"level": "demo", "view": view})

    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_graph_bad_level_gives_422_envelope():
    r = client.get("/api/graph", params={"level": "city"})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "VALIDATION_ERROR" and err["message_vi"]


def test_openapi_uses_runtime_success_and_error_contracts():
    schema = client.get("/openapi.json").json()
    graph_responses = schema["paths"]["/api/graph"]["get"]["responses"]
    assert graph_responses["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/GraphResponse"
    }

    error_statuses = {
        ("/api/graph", "get"): (422, 500),
        ("/api/traffic", "get"): (422, 500),
        ("/api/route", "post"): (404, 422, 500),
        ("/api/multiroute", "post"): (404, 422, 500),
        ("/api/benchmark", "post"): (404, 422, 500),
    }
    for (path, method), statuses in error_statuses.items():
        responses = schema["paths"][path][method]["responses"]
        for status in statuses:
            response_schema = responses[str(status)]["content"]["application/json"]["schema"]
            assert response_schema == {"$ref": "#/components/schemas/ErrorResponse"}


# --------------------------------------------------------------- traffic


def test_traffic_covers_all_edges():
    n_edges = client.get("/api/graph", params={"level": "demo"}).json()["meta"]["edge_count"]
    r = client.get("/api/traffic", params={"slot": "07:30", "level": "demo"})
    assert r.status_code == 200
    body = r.json()
    # coverage must track the CURRENT graph, never a hardcoded edge count
    assert body["slot"] == "07:30" and body["graph_view"] == "full"
    assert len(body["congestion"]) == n_edges
    assert set(body["congestion"].values()) <= {1, 2, 3, 4, 5}


def test_traffic_echoes_teaching_view_and_only_its_edges():
    graph = client.get("/api/graph", params={"level": "demo", "view": "teach_15"}).json()
    r = client.get("/api/traffic", params={
        "slot": "07:30", "level": "demo", "view": "teach_15",
    })

    assert r.status_code == 200
    body = r.json()
    assert body["graph"] == "demo"
    assert body["graph_view"] == "teach_15"
    assert set(body["congestion"]) == {edge["id"] for edge in graph["edges"]}


def test_traffic_bad_slot():
    assert client.get("/api/traffic", params={"slot": "09:00"}).status_code == 422


# ----------------------------------------------------------------- route


def test_route_astar_demo_full_contract():
    r = client.post("/api/route", json=route_body())
    assert r.status_code == 200
    t = Trace.model_validate(r.json())
    assert t.found and t.trace, "demo default include_trace=true"
    ex = t.explanation
    assert len(ex.summary_vi) > 80 and "Tuyến" in ex.summary_vi
    assert ex.alternatives, "at least one alternative required (DoD)"
    assert all(a.path != t.path for a in ex.alternatives)
    assert "tối ưu" in ex.summary_vi  # optimality statement present


def test_route_all_ten_algorithms():
    for algo in ("bfs", "dfs", "iddfs", "ucs", "dijkstra", "astar",
                 "greedy", "bidijkstra", "idastar", "beam"):
        r = client.post("/api/route", json=route_body(algorithm=algo))
        assert r.status_code == 200, algo
        t = Trace.model_validate(r.json())
        assert t.algorithm == algo
        assert t.explanation.summary_vi


def test_route_resolves_teaching_scenario_and_echoes_it():
    r = client.post("/api/route", json=route_body(
        start="n0018", goal="n0038", scenario={"graph_view": "teach_7"},
    ))

    assert r.status_code == 200
    trace = Trace.model_validate(r.json())
    assert trace.applied_scenario is not None
    assert trace.applied_scenario.graph_view == "teach_7"
    assert trace.applied_scenario.provenance == "graph_view"
    assert set(trace.path) <= {"n0018", "n0019", "n0020", "n0022", "n0028", "n0037", "n0038"}


def test_route_runs_inside_an_arbitrary_four_node_view():
    r = client.post("/api/route", json=route_body(
        start="n0018", goal="n0022", scenario={"graph_view": "teach_4"},
    ))

    assert r.status_code == 200
    trace = Trace.model_validate(r.json())
    assert trace.found is True
    assert trace.applied_scenario is not None
    assert trace.applied_scenario.graph_view == "teach_4"
    assert set(trace.path) <= {"n0018", "n0019", "n0020", "n0022"}


def test_route_without_scenario_echoes_base_applied_scenario():
    r = client.post("/api/route", json=route_body())

    assert r.status_code == 200
    applied = Trace.model_validate(r.json()).applied_scenario
    assert applied is not None
    assert applied.graph_view == "full"
    assert applied.provenance == "base"


def test_route_node_outside_resolved_teaching_view_is_not_found():
    r = client.post("/api/route", json=route_body(
        scenario={"graph_view": "teach_7"},
    ))

    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NODE_NOT_FOUND"


def test_route_real_defaults_to_no_trace():
    r = client.post("/api/route", json=route_body(
        graph="real", start="n0100", goal="n2000"))
    assert r.status_code == 200
    body = r.json()
    assert body["trace"] == [] and body["found"] is True
    assert body["explanation"]["summary_vi"]


def test_route_real_returns_steps_when_frontend_explicitly_requests_trace():
    r = client.post("/api/route", json=route_body(
        graph="real", start="n0100", goal="n2000", include_trace=True))
    assert r.status_code == 200
    body = r.json()
    assert body["found"] is True
    assert len(body["trace"]) > 0
    assert body["trace"][0]["step"] == 1


def test_route_params_beam_width():
    r = client.post("/api/route", json=route_body(
        algorithm="beam", params={"beam_width": 2}))
    assert r.status_code == 200
    assert r.json()["metrics"]["beam_width"] == 2


@pytest.mark.parametrize("raw_epsilon", ["1e309", "Infinity", "NaN"])
def test_route_rejects_non_finite_epsilon_with_error_envelope(raw_epsilon):
    raw_body = (
        '{"start":"n0001","goal":"n0002","algorithm":"idastar",'
        '"mode":"distance","time_slot":"07:30","graph":"demo",'
        f'"params":{{"epsilon":{raw_epsilon}}}}}'
    )

    r = client.post(
        "/api/route", content=raw_body,
        headers={"content-type": "application/json"},
    )

    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_route_unknown_node_404():
    r = client.post("/api/route", json=route_body(goal="n9999"))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NODE_NOT_FOUND"


def test_route_bad_algorithm_422():
    r = client.post("/api/route", json=route_body(algorithm="bellman"))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_internal_pydantic_validation_error_is_generic_500(monkeypatch, caplog):
    def raise_internal_validation(*_args, **_kwargs):
        Trace.model_validate({"algorithm": "bfs"})

    monkeypatch.setitem(
        main_module.ALL_ALGORITHMS, "astar", raise_internal_validation
    )
    with caplog.at_level(logging.ERROR, logger="app.main"):
        r = client.post("/api/route", json=route_body())

    assert r.status_code == 500
    err = r.json()["error"]
    assert err["code"] == "INTERNAL"
    assert "Trace" not in err["message_vi"]
    assert "Field required" not in err["message_vi"]
    assert "errors.pydantic.dev" not in err["message_vi"]
    record = next(
        record for record in caplog.records
        if record.message == "Internal Pydantic validation failed"
    )
    assert record.exc_info is not None
    assert isinstance(record.exc_info[1], main_module.PydanticValidationError)


# ------------------------------------------------------------ multiroute


def test_multiroute_nn2opt():
    r = client.post("/api/multiroute", json={
        "start": "n0021", "stops": ["n0002", "n0043", "n0015"],
        "method": "nn_2opt", "mode": "balanced", "time_slot": "07:30",
        "graph": "demo"})
    assert r.status_code == 200
    resp = MultirouteResponse.model_validate(r.json())
    assert resp.found and resp.order[0] == "n0021"
    assert resp.savings_pct is not None


@pytest.mark.parametrize("method", ["held_karp", "nn_2opt", "sa"])
def test_multiroute_optimization_trace_is_opt_in_and_typed(method):
    body = {
        "start": "n0021", "stops": ["n0002", "n0043", "n0015"],
        "method": method, "mode": "balanced", "time_slot": "07:30",
        "graph": "demo",
    }
    without_trace = client.post("/api/multiroute", json=body)
    with_trace = client.post("/api/multiroute", json={**body, "include_trace": True})

    assert without_trace.status_code == with_trace.status_code == 200
    plain = MultirouteResponse.model_validate(without_trace.json())
    traced = MultirouteResponse.model_validate(with_trace.json())
    assert plain.optimization_trace is None
    assert traced.optimization_trace is not None
    assert traced.optimization_trace.events[-1].kind == "optimization_summary"
    assert plain.order == traced.order
    assert plain.totals == traced.totals
    assert plain.optimizer_stats == traced.optimizer_stats


def test_multiroute_openapi_declares_optional_optimization_trace_contract():
    schemas = app.openapi()["components"]["schemas"]
    request = schemas["MultirouteRequest"]
    response = schemas["MultirouteResponse"]

    assert request["properties"]["include_trace"]["default"] is False
    assert response["properties"]["optimization_trace"]["anyOf"][0]["$ref"].endswith("/OptimizationTrace")
    assert response["properties"]["optimizer_stats"]["anyOf"][0]["$ref"].endswith("/SaOptimizerStats")


def test_multiroute_resolves_teaching_scenario_and_echoes_it():
    r = client.post("/api/multiroute", json={
        "start": "n0018", "stops": ["n0020", "n0038"],
        "method": "nn_2opt", "mode": "balanced", "time_slot": "07:30",
        "graph": "demo", "scenario": {"graph_view": "teach_7"},
    })

    assert r.status_code == 200
    response = MultirouteResponse.model_validate(r.json())
    assert response.applied_scenario is not None
    assert response.applied_scenario.graph_view == "teach_7"
    assert {node for leg in response.legs for node in leg.path} <= {
        "n0018", "n0019", "n0020", "n0022", "n0028", "n0037", "n0038",
    }


def test_multiroute_held_karp_16_points_gives_422_limit():
    stops = [f"n{i:04d}" for i in range(2, 17)]  # 15 stops -> 16 points
    r = client.post("/api/multiroute", json={
        "start": "n0001", "stops": stops, "method": "held_karp",
        "time_slot": "07:30", "graph": "demo"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "HELD_KARP_LIMIT"


def test_multiroute_duplicate_stops_422():
    r = client.post("/api/multiroute", json={
        "start": "n0001", "stops": ["n0002", "n0002"], "method": "sa",
        "time_slot": "07:30", "graph": "demo"})
    assert r.status_code == 422


# ------------------------------------------------------------- benchmark

from pathlib import Path

RESULTS_BUILT = (Path(__file__).resolve().parents[2]
                 / "results" / "exp3_benchmark.csv").exists()


def test_benchmark_endpoint():
    """404 RESULTS_NOT_FOUND before Phase 6 has run; real data afterwards."""
    r = client.post("/api/benchmark", json={})
    if RESULTS_BUILT:
        assert r.status_code == 200
        exps = r.json()["experiments"]
        assert {e["experiment_id"] for e in exps} >= {1, 2, 3, 4, 5, 7}
        exp3 = next(e for e in exps if e["experiment_id"] == 3)
        assert len(exp3["rows"]) == 4000
        assert {"algorithm", "nodes_expanded", "runtime_ms"} <= set(exp3["rows"][0])
    else:
        assert r.status_code == 404
        assert r.json()["error"]["code"] == "RESULTS_NOT_FOUND"


def test_benchmark_single_experiment():
    r = client.post("/api/benchmark", json={"experiment_id": 3})
    if RESULTS_BUILT:
        assert r.status_code == 200
        assert len(r.json()["experiments"]) == 1
    else:
        assert r.status_code == 404


def test_benchmark_experiment_6_parses_json_rows():
    r = client.post("/api/benchmark", json={"experiment_id": 6})

    assert r.status_code == 200
    experiment = r.json()["experiments"][0]
    assert experiment["experiment_id"] == 6
    assert len(experiment["rows"]) == 5
    assert all(isinstance(row, dict) for row in experiment["rows"])


def test_benchmark_bulk_is_partial_but_explicit_missing_is_404(tmp_path, monkeypatch):
    exp1_name = main_module.EXPERIMENT_FILES[1][0]
    (tmp_path / exp1_name).write_text("algorithm,runtime_ms\nastar,1.0\n", encoding="utf-8")
    monkeypatch.setattr(main_module, "RESULTS_DIR", tmp_path)

    bulk = client.post("/api/benchmark", json={})
    missing = client.post("/api/benchmark", json={"experiment_id": 6})

    assert bulk.status_code == 200
    assert [item["experiment_id"] for item in bulk.json()["experiments"]] == [1]
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "RESULTS_NOT_FOUND"


def test_benchmark_invalid_json_shape_is_safe_server_error(tmp_path, monkeypatch):
    exp6_name = main_module.EXPERIMENT_FILES[6][0]
    (tmp_path / exp6_name).write_text('{"rows": []}', encoding="utf-8")
    monkeypatch.setattr(main_module, "RESULTS_DIR", tmp_path)

    r = client.post("/api/benchmark", json={"experiment_id": 6})

    assert r.status_code == 500
    assert r.json()["error"]["code"] == "INTERNAL"
    assert r.json()["error"]["message_vi"]


# ------------------------------------------------- explanation deep-dive


@pytest.mark.parametrize("mode", ["balanced", "time", "distance"])
def test_explanation_numbers_are_consistent(mode):
    r = client.post("/api/route", json=route_body(mode=mode))
    t = Trace.model_validate(r.json())
    km = t.metrics.total_distance_m / 1000
    km_str = f"{km:.2f}".replace(".", ",")
    assert km_str in t.explanation.summary_vi, "real km figure must appear"
    for alt in t.explanation.alternatives:
        assert alt.why_not_vi and alt.total_time_s > 0


@pytest.mark.parametrize(
    ("mode", "unit"),
    [("distance", "m"), ("time", "s"), ("balanced", "s")],
)
def test_idastar_explanation_epsilon_uses_mode_unit(mode, unit):
    r = client.post("/api/route", json=route_body(
        start="n0001", goal="n0002", algorithm="idastar", mode=mode,
        params={"epsilon": 7.5},
    ))
    assert r.status_code == 200
    summary = r.json()["explanation"]["summary_vi"]
    assert f"ngưỡng ε = 7,5 {unit}." in summary


@pytest.mark.parametrize(
    ("mode", "unit"),
    [("distance", "m"), ("time", "s"), ("balanced", "s")],
)
def test_nonoptimal_explanation_cost_gap_uses_mode_unit(mode, unit):
    r = client.post("/api/route", json=route_body(
        start="n0001", goal="n0002", algorithm="greedy", mode=mode,
    ))
    assert r.status_code == 200
    summary = r.json()["explanation"]["summary_vi"]
    pattern = rf"đắt hơn tuyến tối ưu ~\d+ {unit} \(\+"
    assert re.search(pattern, summary), summary


# ------------------------------------------- KIEMTOAN batch regressions


def test_route_start_equals_goal_all_algorithms():
    """L3-01: start == goal must be a valid trivial route (SCHEMA §B.1),
    not a 500 from the explanation builder."""
    from app.main import ALL_ALGORITHMS

    for algo in ALL_ALGORITHMS:
        r = client.post("/api/route", json=route_body(
            goal=DEMO_OD["start"], algorithm=algo))
        assert r.status_code == 200, f"{algo}: {r.text[:200]}"
        t = Trace.model_validate(r.json())
        assert t.found and t.path == [DEMO_OD["start"]]
        assert t.metrics.total_cost == 0
        assert "trùng nhau" in t.explanation.summary_vi


@pytest.mark.parametrize(
    ("mode", "cost_unit", "wrong_unit"),
    [("distance", "m", "giây"), ("time", "giây", "m"), ("balanced", "giây", "m")],
)
def test_route_start_equals_goal_uses_mode_cost_unit(mode, cost_unit, wrong_unit):
    r = client.post("/api/route", json=route_body(
        goal=DEMO_OD["start"], mode=mode,
    ))

    assert r.status_code == 200
    summary = r.json()["explanation"]["summary_vi"]
    assert f"chi phí 0 {cost_unit}" in summary
    assert f"chi phí 0 {wrong_unit}" not in summary


def test_multiroute_unknown_method_is_validation_error():
    """L3-05: a bad enum must NOT be mislabeled HELD_KARP_LIMIT."""
    r = client.post("/api/multiroute", json={
        "start": "n0001", "stops": ["n0010", "n0020"], "method": "brute",
        "time_slot": "07:30", "graph": "demo"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_unknown_path_and_method_use_envelope():
    """L3-06: 404/405 must use the §C.7 envelope, not Starlette's shape."""
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.json()["error"]["message_vi"]
    r = client.get("/api/route")  # POST-only endpoint
    assert r.status_code == 405 and r.json()["error"]["message_vi"]
