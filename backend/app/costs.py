"""Cost function and heuristic — exact spec from PROMPT-MASTER §4 / SCHEMA §D.

The ONLY cost unit is SECONDS (mode "distance" is the deliberate
exception, in meters). Constants are locked by PROMPT-MASTER rule 4 —
changing them requires explicit approval. Admissibility/consistency of
the heuristic is proven in docs/HEURISTIC-PROOF.md and relies on:
  weight >= t_free >= length / v_max   and   penalty, gamma >= 0.
"""

from __future__ import annotations

import math

from .models import Edge, Mode

GAMMA = 1.5
PENALTY_S: dict[str, int] = {
    "flood": 60, "construction": 90, "narrow_alley": 30, "traffic_light": 25,
}


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters (WGS84 sphere, R = 6371 km)."""
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def congestion_factor(level: int, gamma: float = GAMMA) -> float:
    """f_cong = 1 + gamma * (level - 1) / 4, level in [1..5] -> [1 .. 1+gamma].

    gamma defaults to the locked project constant (rule 4); the override
    exists ONLY for the sensitivity experiment (benchmark exp 5)."""
    return 1.0 + gamma * (level - 1) / 4.0


def edge_penalty_s(edge: Edge) -> float:
    r = edge.risk
    return (PENALTY_S["flood"] * r.flood
            + PENALTY_S["construction"] * r.construction
            + PENALTY_S["narrow_alley"] * r.narrow_alley
            + PENALTY_S["traffic_light"] * r.traffic_light)


def edge_weight(edge: Edge, congestion: int, mode: Mode,
                gamma: float = GAMMA) -> float:
    """weight(e, h, mode) — SCHEMA §D. Meters for distance, seconds otherwise.

    t_free is recomputed EXACTLY as length_m / (free_speed_kmh / 3.6)
    instead of reading the stored free_travel_time_s: that field is
    rounded to 0.1 s for display, and a rounded-DOWN value would break
    the w >= length/v_max chain the admissibility proof rests on
    (HEURISTIC-PROOF.md §2, Bổ đề 3). `gamma` override is for benchmark
    experiment 5 only — the product always runs the locked default.
    """
    if mode == "distance":
        return edge.length_m
    t_free = edge.length_m / (edge.free_speed_kmh / 3.6)
    timed = t_free * congestion_factor(congestion, gamma)
    if mode == "time":
        return timed
    return timed + edge_penalty_s(edge)  # balanced (default)


def heuristic_m(lat: float, lon: float, goal_lat: float, goal_lon: float) -> float:
    """mode=distance: h(n) = haversine(n, goal) in meters."""
    return haversine_m(lat, lon, goal_lat, goal_lon)


def heuristic_s(lat: float, lon: float, goal_lat: float, goal_lon: float,
                v_max_ms: float) -> float:
    """mode=time|balanced: h(n) = haversine(n, goal) / v_max in seconds."""
    return haversine_m(lat, lon, goal_lat, goal_lon) / v_max_ms
