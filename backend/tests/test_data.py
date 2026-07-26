"""Phase 1: validate the REAL built data (graph_real/demo + profiles).

Skipped gracefully when the pipeline outputs are absent (fresh clone
before running scripts/01-04); scripts/validate_data.py is the CLI gate.
"""

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from validate_data import validate_level  # noqa: E402

DATA = ROOT / "data"


@pytest.mark.parametrize("level", ["real", "demo"])
def test_built_data_valid(level: str):
    if not (DATA / f"graph_{level}.json").exists():
        pytest.skip(f"graph_{level}.json not built yet (run scripts/01-04)")
    summary = validate_level(level)
    assert "strongly connected OK" in summary


def test_regression_cvhld_ho_con_rua():
    """Named guard from the 2026-07-26 audit: this pair once measured
    10 159.8 m on demo vs 1 584.2 m on G_real (6.4x). Must stay <= 2x
    in BOTH directions on BOTH weights, forever. Since the KIEMTOAN
    batch the same call also asserts the six global invariants (time,
    dist, balanced x 4 slots) internally."""
    if not (DATA / "graph_demo.json").exists():
        pytest.skip("graph_demo.json not built yet")
    import json
    from validate_data import check_demo_invariant
    from app.models import GraphFile, TrafficProfiles

    def load(name, model):
        return model.model_validate(
            json.loads((DATA / name).read_text(encoding="utf-8")))

    stats = check_demo_invariant(  # asserts internally
        load("graph_demo.json", GraphFile),
        load("graph_real.json", GraphFile),
        load("traffic_profiles_demo.json", TrafficProfiles),
        load("traffic_profiles_real.json", TrafficProfiles),
    )
    assert all(r <= 2.0 + 1e-6 for r in stats["regression"].values())


def test_gdemo_size_targets():
    path = DATA / "graph_demo.json"
    if not path.exists():
        pytest.skip("graph_demo.json not built yet")
    import json

    g = json.loads(path.read_text(encoding="utf-8"))
    assert 40 <= g["meta"]["node_count"] <= 60, "G_demo must have 40-60 nodes"
    assert any(e["oneway"] for e in g["edges"]), "G_demo must model one-way streets"
    types = {n["type"] for n in g["nodes"]}
    assert "warehouse" in types, "shipper scenario needs the depot node"
