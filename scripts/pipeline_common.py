"""Shared helpers for the offline data pipeline (scripts/01-04).

NOT product code: the search algorithms shipped to users live in
backend/app/ and are hand-implemented there (PROMPT-MASTER rule 6).
NetworkX/OSMnx here are build tools only.
"""

from __future__ import annotations

import json
import math
import sys
import unicodedata
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

# Road classes treated as "main" (TomTom sample points sit on these; the
# profile sanity checks in validate_data.py compare peak-vs-night on them).
MAIN_CLASSES = {"motorway", "trunk", "primary", "secondary",
                "motorway_link", "trunk_link", "primary_link", "secondary_link"}

TIME_SLOTS = ("07:30", "12:00", "17:30", "22:00")


def ratio_to_level(ratio: float) -> int:
    """TomTom currentSpeed/freeFlowSpeed ratio -> congestion level 1-5.
    Shared by 03b (assigns levels) and 05 (calibrates gamma against the
    SAME level assignment) — the two MUST agree, so the mapping lives here."""
    for threshold, level in ((0.85, 1), (0.70, 2), (0.55, 3), (0.40, 4)):
        if ratio >= threshold:
            return level
    return 5


def corridor_mean_level(
    eids: list[str], slot_levels: dict[str, int], t_free_by_eid: dict[str, float]
) -> int:
    """Congestion of a contracted G_demo edge: free-flow-time-weighted mean
    of the real levels under its corridor, half-up rounded to an int 1-5.
    Shared by 03b (writes profiles) and 04 (checks the balanced invariant
    at build time) — the two MUST agree, so the formula lives here."""
    weights = [t_free_by_eid[i] for i in eids]
    mean = sum(slot_levels[i] * w for i, w in zip(eids, weights)) / sum(weights)
    return min(5, max(1, math.floor(mean + 0.5)))


def ceil_dm(x: float) -> float:
    """Round a length UP to 0.1 m (guarding float noise first).

    Lengths must never round BELOW the true value: the admissibility
    proof needs length_m >= haversine(u, v) on every edge
    (docs/HEURISTIC-PROOF.md, Bổ đề 1).
    """
    return math.ceil(round(x * 10, 6)) / 10


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def first_of(value: Any) -> Any:
    """OSM attrs may be scalar or list (multi-tagged way); take the first."""
    return value[0] if isinstance(value, list) else value


# OSM street names sometimes use Latin Eth (U+00D0/U+00F0) instead of the
# Vietnamese D-with-stroke (U+0110/U+0111) — visually near-identical but a
# different codepoint, which breaks string matching/search.
_ETH_TO_DSTROKE = str.maketrans({"Ð": "Đ", "ð": "đ"})


def clean_name(name: str | None) -> str | None:
    """NFC-normalize a display name and fix Eth -> D-with-stroke."""
    if not name:
        return name
    return unicodedata.normalize("NFC", name).translate(_ETH_TO_DSTROKE)


def speed_for(highway: Any) -> int:
    return SPEED_BY_HIGHWAY.get(str(first_of(highway)), DEFAULT_SPEED_KMH)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(payload: dict, path: Path) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8")


def risk_entry_flags(
    u_coord: tuple[float, float], v_coord: tuple[float, float],
    risks: list[dict],
) -> dict[str, int]:
    """flood/construction flags: 1 iff the edge ENTERS a risk circle
    (u outside, v inside), for any zone of that type.

    Zone-based risks are paid ONCE PER CROSSING this way: a route that
    traverses a zone pays the penalty exactly on the entering edge, no
    matter how many micro-segments OSM splits the street into (fix for
    audit finding L1-01 — the old any-endpoint-in-radius rule charged a
    single flood point up to 17 times on one route). Cost stays strictly
    edge-local. Known accepted limit (DATA.md §4/§8): a route STARTING
    inside a zone has no entering edge for it, so that first zone is not
    charged.
    """
    flags = {"flood": 0, "construction": 0}
    (ulat, ulon), (vlat, vlon) = u_coord, v_coord
    for r in risks:
        if flags[r["type"]]:
            continue
        u_in = haversine_m(ulat, ulon, r["lat"], r["lon"]) <= r["radius_m"]
        v_in = haversine_m(vlat, vlon, r["lat"], r["lon"]) <= r["radius_m"]
        if v_in and not u_in:
            flags[r["type"]] = 1
    return flags
