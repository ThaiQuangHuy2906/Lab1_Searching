"""Step 05 (OPTIONAL, run AFTER 03a has crawled TomTom) — estimate gamma
empirically from the crawled snapshots (audit fix L4-02: gives the report a
non-circular answer to "where does gamma = 1.5 come from?").

Model (SCHEMA §D): f_cong = 1 + gamma * (c - 1) / 4, with c the level 1-5.
For every TomTom sample point we observe the ACTUAL slowdown
    f_obs = freeFlowSpeed / currentSpeed        (>= 1 when congested)
and the level c the pipeline itself assigns to that measurement
(pipeline_common.ratio_to_level — the same mapping 03b uses). Least
squares over all points with c > 1 (c = 1 pins f = 1 by construction):

    gamma_hat = sum((f_obs - 1) * x) / sum(x^2),   x = (c - 1) / 4

Outputs
- results/gamma_calibration.csv: one row per level (n, mean ratio, mean
  inflation, per-level implied gamma) + a final "all" row with gamma_hat.
- Console: the same table plus how gamma_hat compares to the locked 1.5.

Needs no API key (reads cached snapshots only). Exits 1 with a clear
message when data/raw/tomtom/ has no snapshots yet.
"""

from __future__ import annotations

import csv
import statistics
import sys
from pathlib import Path

from pipeline_common import RAW_DIR, ROOT, TIME_SLOTS, load_json, ratio_to_level

OUT_CSV = ROOT / "results" / "gamma_calibration.csv"
MAX_INFLATION = 10.0  # discard broken records (division artifacts, jams-on-zero)
GAMMA_LOCKED = 1.5    # PROMPT-MASTER rule 4 — for the comparison printout only


def load_points() -> list[tuple[str, float, int]]:
    """(slot, f_obs, level) for every valid record of every snapshot."""
    points: list[tuple[str, float, int]] = []
    for slot in TIME_SLOTS:
        slot_dir = RAW_DIR / "tomtom" / slot.replace(":", "")
        if not slot_dir.is_dir():
            continue
        for f in sorted(slot_dir.glob("flow_*.json")):
            for rec in load_json(f)["records"]:
                cur, free = rec.get("currentSpeed"), rec.get("freeFlowSpeed")
                if not cur or not free or cur <= 0 or free <= 0:
                    continue
                f_obs = free / cur
                if not (1.0 / MAX_INFLATION) <= f_obs <= MAX_INFLATION:
                    continue
                points.append((slot, f_obs, ratio_to_level(cur / free)))
    return points


def main() -> None:
    points = load_points()
    if not points:
        print("Chưa có snapshot TomTom trong data/raw/tomtom/<slot>/ — chạy "
              "scripts/03a_crawl_tomtom.py ở đủ 4 mốc giờ trước, rồi chạy lại "
              "script này (không cần API key cho bước calibrate).")
        raise SystemExit(1)

    # per-level table
    by_level: dict[int, list[float]] = {}
    for _slot, f_obs, level in points:
        by_level.setdefault(level, []).append(f_obs)

    # least squares through the model's fixed point (c=1 -> f=1)
    num = sum((f - 1.0) * (c - 1) / 4.0 for _s, f, c in points if c > 1)
    den = sum(((c - 1) / 4.0) ** 2 for _s, _f, c in points if c > 1)
    if den == 0:
        print(f"{len(points)} điểm đo nhưng TẤT CẢ ở mức 1 (không kẹt) — "
              "không đủ tín hiệu để ước lượng gamma; crawl thêm ở khung giờ đỉnh.")
        raise SystemExit(1)
    gamma_hat = num / den

    OUT_CSV.parent.mkdir(exist_ok=True)
    with OUT_CSV.open("w", encoding="utf-8", newline="") as fh:
        # Match the repository-wide ``eol=lf`` rule on every platform.
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(["level", "n_points", "mean_speed_ratio", "mean_inflation",
                    "implied_gamma"])
        print(f"{'level':>5} {'n':>6} {'ratio':>7} {'f_obs':>7} {'gamma':>7}")
        for level in sorted(by_level):
            fs = by_level[level]
            mean_f = statistics.fmean(fs)
            implied = ((mean_f - 1.0) * 4.0 / (level - 1)) if level > 1 else ""
            w.writerow([level, len(fs), f"{statistics.fmean(1 / f for f in fs):.3f}",
                        f"{mean_f:.3f}",
                        f"{implied:.3f}" if implied != "" else ""])
            print(f"{level:>5} {len(fs):>6} {statistics.fmean(1 / f for f in fs):>7.3f} "
                  f"{mean_f:>7.3f} {implied if implied == '' else f'{implied:>7.3f}'}")
        w.writerow(["all", len(points), "", "", f"{gamma_hat:.3f}"])

    slots = sorted({s for s, _f, _c in points})
    print(f"\ngamma_hat (least squares, {len(points)} điểm đo, "
          f"{len(slots)} khung giờ {slots}): {gamma_hat:.3f}")
    print(f"hằng số dự án gamma = {GAMMA_LOCKED} -> lệch "
          f"{abs(gamma_hat - GAMMA_LOCKED):.3f} "
          f"({abs(gamma_hat - GAMMA_LOCKED) / GAMMA_LOCKED * 100:.1f}%)")
    print(f"đã ghi {OUT_CSV.relative_to(ROOT)} — trích vào BaoCao mục c "
          "(dòng 'γ̂ ước lượng độc lập từ TomTom').")


if __name__ == "__main__":
    main()
