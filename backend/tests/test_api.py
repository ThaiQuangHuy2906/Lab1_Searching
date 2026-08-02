"""Phase 4 DoD: TestClient smoke over all 6 endpoints + error envelope.

Also asserts the explanation quality gates: Vietnamese summary with real
numbers and at least one genuinely different alternative on G_demo.
"""

import logging
import re

import pytest
from fastapi.testclient import TestClient

import app.main as main_module
from app.graph_store import GraphStore
from app.main import app
from app.models import MultirouteResponse, OptimizeRouteResponse, Trace
from app.tsp import build_matrix

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
        assert r.json()["meta"]["node_count"] == nodes


def test_graph_bad_level_gives_422_envelope():
    r = client.get("/api/graph", params={"level": "city"})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "VALIDATION_ERROR" and err["message_vi"]


# --------------------------------------------------------------- traffic


def test_traffic_covers_all_edges():
    n_edges = client.get("/api/graph", params={"level": "demo"}).json()["meta"]["edge_count"]
    r = client.get("/api/traffic", params={"slot": "07:30", "level": "demo"})
    assert r.status_code == 200
    body = r.json()
    # coverage must track the CURRENT graph, never a hardcoded edge count
    assert body["slot"] == "07:30" and len(body["congestion"]) == n_edges
    assert set(body["congestion"].values()) <= {1, 2, 3, 4, 5}


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


def test_route_real_defaults_to_no_trace():
    r = client.post("/api/route", json=route_body(
        graph="real", start="n0100", goal="n2000"))
    assert r.status_code == 200
    body = r.json()
    assert body["trace"] == [] and body["found"] is True
    assert body["explanation"]["summary_vi"]


def test_route_params_beam_width():
    r = client.post("/api/route", json=route_body(
        algorithm="beam", params={"beam_width": 2}))
    assert r.status_code == 200
    assert r.json()["metrics"]["beam_width"] == 2


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


# ----------------------------------------------- coordinate route planning


def coordinate_body(destination_ids=("n0002", "n0043", "n0015"), **over) -> dict:
    nodes = {
        node["id"]: node
        for node in client.get("/api/graph", params={"level": "demo"}).json()["nodes"]
    }

    def location(node_id: str) -> dict:
        node = nodes[node_id]
        return {
            "id": f"place-{node_id}",
            "name": node["name"] or node_id,
            "latitude": node["lat"],
            "longitude": node["lon"],
        }

    body = {
        "start": location("n0021"),
        "destinations": [location(node_id) for node_id in destination_ids],
        "travelMode": "driving",
        "optimizationMetric": "duration",
        "returnToStart": False,
        "algorithm": "held_karp",
        "timeSlot": "07:30",
        "graph": "demo",
    }
    body.update(over)
    return body


def test_location_search_is_accent_insensitive():
    r = client.get("/api/locations/search", params={
        "q": "ben thanh", "level": "demo", "limit": 5,
    })
    assert r.status_code == 200
    names = [item["name"] for item in r.json()["locations"]]
    assert any("Bến Thành" in name for name in names)


def test_reverse_location_snaps_to_nearest_node():
    node = client.get("/api/graph", params={"level": "demo"}).json()["nodes"][0]
    r = client.post("/api/locations/reverse", json={
        "latitude": node["lat"], "longitude": node["lon"], "graph": "demo",
    })
    assert r.status_code == 200
    assert r.json()["location"]["nodeId"] == node["id"]
    assert r.json()["location"]["snapDistanceMeters"] == pytest.approx(0.0)


def test_optimize_route_coordinate_contract_and_totals():
    r = client.post("/api/routes/optimize", json=coordinate_body())
    assert r.status_code == 200, r.text
    response = OptimizeRouteResponse.model_validate(r.json())
    assert response.found and response.optimized_order[0].id == "place-n0021"
    assert len(response.optimized_order) == 4
    assert len({item.id for item in response.optimized_order}) == 4
    assert response.algorithm == "held-karp" and response.optimal_guarantee
    assert response.route_geometry
    assert all(leg.geometry and leg.path_node_ids for leg in response.legs)
    assert response.total_distance_meters == pytest.approx(
        sum(leg.distance_meters for leg in response.legs)
    )
    assert response.total_duration_seconds == pytest.approx(
        sum(leg.duration_seconds for leg in response.legs)
    )


@pytest.mark.parametrize(
    ("optimization_metric", "mode"),
    [("duration", "time"), ("distance", "distance"), ("custom", "balanced")],
)
@pytest.mark.parametrize("return_to_start", [False, True])
def test_optimize_route_duration_is_pure_time_for_every_metric(
    optimization_metric, mode, return_to_start,
):
    node_ids = ["n0021", "n0002", "n0043", "n0015"]
    r = client.post("/api/routes/optimize", json=coordinate_body(
        tuple(node_ids[1:]),
        optimizationMetric=optimization_metric,
        returnToStart=return_to_start,
    ))
    assert r.status_code == 200, r.text
    response = OptimizeRouteResponse.model_validate(r.json())
    store = GraphStore.load("demo")

    for leg in response.legs:
        pure_duration = store.path_metrics(
            leg.path_node_ids, "time", "07:30",
        )[0]
        selected_cost = store.path_metrics(
            leg.path_node_ids, mode, "07:30",
        )[0]
        assert leg.duration_seconds == pytest.approx(pure_duration)
        assert leg.optimization_cost == pytest.approx(selected_cost)

    assert response.total_duration_seconds == pytest.approx(
        sum(leg.duration_seconds for leg in response.legs)
    )
    assert response.total_optimization_cost == pytest.approx(
        sum(leg.optimization_cost for leg in response.legs)
    )
    if optimization_metric == "duration":
        assert response.total_optimization_cost == pytest.approx(
            response.total_duration_seconds
        )

    # Original-order duration must be measured on the original-order paths
    # selected by the request metric, not by running a separate fastest route.
    _cost, path_matrix = build_matrix(store, node_ids, mode, "07:30")
    original_pairs = list(zip(node_ids, node_ids[1:]))
    if return_to_start:
        original_pairs.append((node_ids[-1], node_ids[0]))
    expected_original_duration = sum(
        store.path_metrics(path_matrix[pair], "time", "07:30")[0]
        for pair in original_pairs
    )
    assert response.original_order_totals is not None
    assert response.original_order_totals.duration_seconds == pytest.approx(
        expected_original_duration
    )


def test_optimize_route_accepts_public_hcmc_coordinate_example():
    r = client.post("/api/routes/optimize", json={
        "start": {
            "id": "start", "name": "Điểm xuất phát",
            "latitude": 10.7769, "longitude": 106.7009,
        },
        "destinations": [
            {
                "id": "destination-a", "name": "Điểm A",
                "latitude": 10.8012, "longitude": 106.7101,
            },
            {
                "id": "destination-b", "name": "Điểm B",
                "latitude": 10.7626, "longitude": 106.6824,
            },
        ],
        "travelMode": "driving",
        "optimizationMetric": "duration",
        "returnToStart": False,
    })
    assert r.status_code == 200, r.text
    assert r.json()["optimizedOrder"][0]["id"] == "start"


def test_optimize_route_order_is_independent_of_destination_input_order():
    forward = client.post("/api/routes/optimize", json=coordinate_body()).json()
    reverse = client.post(
        "/api/routes/optimize",
        json=coordinate_body(("n0015", "n0043", "n0002")),
    ).json()
    assert [item["id"] for item in forward["optimizedOrder"]] == [
        item["id"] for item in reverse["optimizedOrder"]
    ]
    assert forward["totalOptimizationCost"] == pytest.approx(
        reverse["totalOptimizationCost"]
    )


def test_optimize_route_return_to_start_adds_closing_leg():
    r = client.post(
        "/api/routes/optimize",
        json=coordinate_body(("n0002",), returnToStart=True),
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["legs"]) == 2
    assert body["legs"][-1]["toId"] == "place-n0021"


def test_optimize_route_rejects_unsupported_travel_mode():
    r = client.post(
        "/api/routes/optimize",
        json=coordinate_body(("n0002",), travelMode="walking"),
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "TRAVEL_MODE_UNSUPPORTED"


def test_optimize_route_rejects_out_of_bounds_location():
    body = coordinate_body(("n0002",))
    body["start"]["latitude"] = 21.0
    body["start"]["longitude"] = 105.8
    r = client.post("/api/routes/optimize", json=body)
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "LOCATION_OUT_OF_BOUNDS"


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
