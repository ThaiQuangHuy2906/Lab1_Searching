"""Step 03a (OPTIONAL) — sample real congestion from TomTom Flow Segment Data.

Needs TOMTOM_API_KEY in a .env file at the repo root (never committed —
PROMPT-MASTER rule 7). Without a key this step is SKIPPED and 03b falls
back to fully synthetic profiles; the whole pipeline still builds.

USAGE: run this 4 times, at the 4 snapshot times 07:30 / 12:00 / 17:30 /
22:00 (local HCMC time), passing the slot:  python 03a_crawl_tomtom.py 07:30
Raw responses are stored under data/raw/tomtom/<slot>/ with timestamps;
03b aggregates whatever slots exist.

Sample points: intersections of the biggest arterials in G_real (top
~40 by connected primary/trunk length), spread over the bbox.
"""

from __future__ import annotations

import datetime
import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

from pipeline_common import DATA_DIR, RAW_DIR, TIME_SLOTS, load_json

FLOW_URL = ("https://api.tomtom.com/traffic/services/4/flowSegmentData"
            "/absolute/10/json")
N_POINTS = 40


def pick_sample_points() -> list[tuple[float, float]]:
    """Spread sample points over main-road edges of graph_real.json."""
    graph = load_json(DATA_DIR / "graph_real.json")
    coord = {n["id"]: (n["lat"], n["lon"]) for n in graph["nodes"]}
    main = [e for e in graph["edges"]
            if e["highway"] in ("motorway", "trunk", "primary", "secondary")]
    main.sort(key=lambda e: -e["length_m"])
    pts, seen = [], set()
    for e in main:
        lat, lon = coord[e["u"]]
        cell = (round(lat, 3), round(lon, 3))  # ~110 m grid de-dup
        if cell in seen:
            continue
        seen.add(cell)
        pts.append((lat, lon))
        if len(pts) >= N_POINTS:
            break
    return pts


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in TIME_SLOTS:
        raise SystemExit(f"usage: python 03a_crawl_tomtom.py <slot>  (one of {TIME_SLOTS})")
    slot = sys.argv[1]

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    key = os.getenv("TOMTOM_API_KEY")
    if not key:
        raise SystemExit("TOMTOM_API_KEY missing in .env — skip 03a; 03b will "
                         "build fully synthetic profiles instead.")

    out_dir = RAW_DIR / "tomtom" / slot.replace(":", "")
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%dT%H%M%S")

    pts = pick_sample_points()
    print(f"querying {len(pts)} points for slot {slot} ...")
    records = []
    for i, (lat, lon) in enumerate(pts, 1):
        resp = requests.get(FLOW_URL, params={"key": key, "point": f"{lat},{lon}"},
                            timeout=15)
        resp.raise_for_status()
        seg = resp.json().get("flowSegmentData", {})
        records.append({"lat": lat, "lon": lon,
                        "currentSpeed": seg.get("currentSpeed"),
                        "freeFlowSpeed": seg.get("freeFlowSpeed"),
                        "frc": seg.get("frc"), "queried_at": stamp})
        print(f"  {i}/{len(pts)}: current={seg.get('currentSpeed')} "
              f"free={seg.get('freeFlowSpeed')}")
        time.sleep(0.25)  # stay well under the free-tier rate limit

    out = out_dir / f"flow_{stamp}.json"
    out.write_text(json.dumps({"slot": slot, "records": records}, indent=2),
                   encoding="utf-8")
    print(f"saved {out}")


if __name__ == "__main__":
    main()
