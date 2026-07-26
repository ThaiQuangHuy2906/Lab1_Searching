"""Step 03b — build per-slot congestion profiles (SCHEMA §A.4).

One profiles file PER GRAPH (edge id spaces overlap between graphs):
  data/traffic_profiles_real.json   (for graph_real.json)
  data/traffic_profiles_demo.json   (built by 04 after G_demo exists)

Priority per edge:
1. TomTom (if data/raw/tomtom/<slot>/ has snapshots): congestion level from
   currentSpeed/freeFlowSpeed ratio at the nearest sample point within
   ASSIGN_RADIUS_M on the same road class ("main" vs "local").
   Ratio -> level: >=0.85 -> 1, >=0.70 -> 2, >=0.55 -> 3, >=0.40 -> 4, else 5.
2. Synthetic rules otherwise (seed 42, documented in DATA.md):
   - peaks 07:30 & 17:30: motorway/trunk/primary 4-5, secondary 3-4,
     tertiary 2-4, everything else 2-3; plus a random 10% of peak edges
     bumped +1 (capped at 5) to model local incidents;
   - 12:00 = morning peak level - 1 (floor 1);
   - 22:00 = 1-2.
"""

from __future__ import annotations

import datetime
import random
import sys

from pipeline_common import (
    DATA_DIR, RAW_DIR, TIME_SLOTS, dump_json, haversine_m, load_json,
)

SEED = 42
ASSIGN_RADIUS_M = 250
MAIN_CLASSES = {"motorway", "trunk", "primary", "secondary",
                "motorway_link", "trunk_link", "primary_link", "secondary_link"}
PEAK_RANGES = {
    "motorway": (4, 5), "trunk": (4, 5), "primary": (4, 5),
    "motorway_link": (4, 5), "trunk_link": (4, 5), "primary_link": (4, 5),
    "secondary": (3, 4), "secondary_link": (3, 4),
    "tertiary": (2, 4), "tertiary_link": (2, 4),
}
DEFAULT_PEAK = (2, 3)
INCIDENT_SHARE = 0.10


def ratio_to_level(ratio: float) -> int:
    for threshold, level in ((0.85, 1), (0.70, 2), (0.55, 3), (0.40, 4)):
        if ratio >= threshold:
            return level
    return 5


def load_tomtom_levels(slot: str) -> list[tuple[float, float, int]]:
    """(lat, lon, level) for every valid record of every snapshot of a slot."""
    slot_dir = RAW_DIR / "tomtom" / slot.replace(":", "")
    points = []
    if not slot_dir.is_dir():
        return points
    for f in sorted(slot_dir.glob("flow_*.json")):
        for rec in load_json(f)["records"]:
            cur, free = rec.get("currentSpeed"), rec.get("freeFlowSpeed")
            if cur and free:
                points.append((rec["lat"], rec["lon"], ratio_to_level(cur / free)))
    return points


def build_for_graph(graph_path, out_path) -> None:
    graph = load_json(graph_path)
    coord = {n["id"]: (n["lat"], n["lon"]) for n in graph["nodes"]}
    edges = graph["edges"]  # id-sorted -> deterministic rng consumption
    rng = random.Random(SEED)

    tomtom = {slot: load_tomtom_levels(slot) for slot in TIME_SLOTS}
    n_tomtom = sum(len(v) for v in tomtom.values())

    profiles: dict[str, dict[str, int]] = {s: {} for s in TIME_SLOTS}
    assigned_tomtom = 0
    for e in edges:
        lat, lon = coord[e["u"]]
        is_main = e["highway"] in MAIN_CLASSES
        lo, hi = PEAK_RANGES.get(e["highway"], DEFAULT_PEAK)
        morning = rng.randint(lo, hi)
        evening = rng.randint(lo, hi)
        if rng.random() < INCIDENT_SHARE:
            morning = min(5, morning + 1)
        if rng.random() < INCIDENT_SHARE:
            evening = min(5, evening + 1)
        base = {"07:30": morning, "17:30": evening,
                "12:00": max(1, morning - 1), "22:00": rng.randint(1, 2)}
        for slot in TIME_SLOTS:
            level = None
            best_d = ASSIGN_RADIUS_M
            for plat, plon, plevel in tomtom[slot]:
                d = haversine_m(lat, lon, plat, plon)
                if d <= best_d and is_main:  # sample points sit on main roads
                    best_d, level = d, plevel
            if level is not None:
                assigned_tomtom += 1
            profiles[slot][e["id"]] = level if level is not None else base[slot]

    source = "tomtom+synthetic" if n_tomtom else "synthetic"
    dump_json({"meta": {"graph": graph["meta"]["name"],
                        "created": datetime.date.today().isoformat(),
                        "source": source},
               "profiles": profiles}, out_path)
    print(f"{out_path.name}: {len(edges)} edges x {len(TIME_SLOTS)} slots, "
          f"source={source}"
          + (f", tomtom-assigned={assigned_tomtom}" if n_tomtom else ""))


def main() -> None:
    targets = sys.argv[1:] or ["real"]
    for level in targets:
        build_for_graph(DATA_DIR / f"graph_{level}.json",
                        DATA_DIR / f"traffic_profiles_{level}.json")


if __name__ == "__main__":
    main()
