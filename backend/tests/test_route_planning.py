"""Unit tests for the coordinate route-planning adapter."""

from app.models import OptimizeRouteRequest
from app.route_planning import choose_method, encode_polyline, metric_to_mode


def request_with_destinations(count: int) -> OptimizeRouteRequest:
    return OptimizeRouteRequest.model_validate({
        "start": {
            "id": "start", "name": "Start",
            "latitude": 10.77, "longitude": 106.69,
        },
        "destinations": [
            {
                "id": f"d-{index}", "name": f"Destination {index}",
                "latitude": 10.771 + index * 0.0001,
                "longitude": 106.691 + index * 0.0001,
            }
            for index in range(count)
        ],
        "algorithm": "auto",
    })


def test_encode_polyline_matches_public_precision_five_example():
    assert encode_polyline([
        (38.5, -120.2),
        (40.7, -120.95),
        (43.252, -126.453),
    ]) == "_p~iF~ps|U_ulLnnqC_mqNvxq`@"


def test_automatic_algorithm_switches_after_exact_threshold():
    assert choose_method(request_with_destinations(10)) == "held_karp"
    assert choose_method(request_with_destinations(11)) == "nn_2opt"


def test_optimization_metric_maps_to_existing_cost_modes():
    assert metric_to_mode("duration") == "time"
    assert metric_to_mode("distance") == "distance"
    assert metric_to_mode("custom") == "balanced"
