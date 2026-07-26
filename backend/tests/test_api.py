"""Phase 4 DoD: TestClient smoke over all 6 endpoints + error envelope.

Also asserts the explanation quality gates: Vietnamese summary with real
numbers and at least one genuinely different alternative on G_demo.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import MultirouteResponse, Trace

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
    r = client.get("/api/traffic", params={"slot": "07:30", "level": "demo"})
    assert r.status_code == 200
    body = r.json()
    assert body["slot"] == "07:30" and len(body["congestion"]) == 141
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
