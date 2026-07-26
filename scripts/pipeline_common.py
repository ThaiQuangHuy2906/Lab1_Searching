"""Shared helpers for the offline data pipeline (scripts/01-04).

NOT product code: the search algorithms shipped to users live in
backend/app/ and are hand-implemented there (PROMPT-MASTER rule 6).
NetworkX/OSMnx here are build tools only.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

# Windows consoles default to cp1252 which cannot print Vietnamese POI/street
# names — force UTF-8 once for every pipeline script that imports this module.
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8", "utf8"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"

BBOX = (106.680, 10.760, 106.720, 10.800)  # (left, bottom, right, top)

# Team-defined free-flow speeds by OSM highway type, km/h (NOT legal limits).
# Documented in data/DATA.md; starting values from PROMPT-MASTER 6.1.
SPEED_BY_HIGHWAY: dict[str, int] = {
    "motorway": 60, "motorway_link": 60,
    "trunk": 45, "trunk_link": 45,
    "primary": 45, "primary_link": 45,
    "secondary": 40, "secondary_link": 40,
    "tertiary": 35, "tertiary_link": 35,
    "unclassified": 30, "residential": 30, "road": 30,
    "living_street": 25, "service": 25, "alley": 25, "track": 25,
}
DEFAULT_SPEED_KMH = 30

# highway types that imply the narrow_alley risk flag (DATA.md rule).
NARROW_HIGHWAYS = {"living_street", "service", "alley", "track"}

TIME_SLOTS = ("07:30", "12:00", "17:30", "22:00")


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def first_of(value: Any) -> Any:
    """OSM attrs may be scalar or list (multi-tagged way); take the first."""
    return value[0] if isinstance(value, list) else value


def speed_for(highway: Any) -> int:
    return SPEED_BY_HIGHWAY.get(str(first_of(highway)), DEFAULT_SPEED_KMH)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(payload: dict, path: Path) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def risk_flags_for_nodes(
    node_coords: list[tuple[float, float]], risks: list[dict]
) -> dict[str, int]:
    """flood/construction flags: 1 if ANY given node lies inside a risk circle."""
    flags = {"flood": 0, "construction": 0}
    for lat, lon in node_coords:
        for r in risks:
            if flags[r["type"]] == 0 and \
                    haversine_m(lat, lon, r["lat"], r["lon"]) <= r["radius_m"]:
                flags[r["type"]] = 1
        if flags["flood"] and flags["construction"]:
            break
    return flags
