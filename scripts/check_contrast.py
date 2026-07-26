"""WCAG contrast audit for the frontend's semantic palettes (both themes).

Reads the SOURCE OF TRUTH directly so nothing can drift:
- palettes parsed from frontend/lib/colors.ts (DARK + LIGHT blocks);
- panel/ink colors parsed from the CSS variables in app/globals.css;
- basemap background fetched LIVE from each theme's Carto style JSON
  (the actual `type: "background"` layer paint — not guessed).

Checks (contrast ratio = (L1+0.05)/(L2+0.05), WCAG relative luminance):
- INFO graphics (frontier/expanded/current/path/bidi/cong1-5/chips/stop)
  >= 3.0 against BOTH the panel background and the basemap background;
- TEXT >= 4.5: ink & ink-dim on panel, chipText on chip fills,
  stopText on the stop fill;
- BACKDROP colors (plain node, edgeDim) are reported but exempt: they
  deliberately sit low — "unvisited" is encoded by absence of color
  (decision recorded in docs/DESIGN.md; flagged for the human review).

Exit 1 if any thresholded pair fails. Run:
  python scripts/check_contrast.py
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
COLORS_TS = ROOT / "frontend" / "lib" / "colors.ts"
GLOBALS_CSS = ROOT / "frontend" / "app" / "globals.css"

GRAPHIC_MIN = 3.0
TEXT_MIN = 4.5

INFO_KEYS = ["frontier", "expanded", "current", "path", "bidiForward",
             "bidiBackward", "chipStart", "chipGoal", "stop", "start", "goal"]
BACKDROP_KEYS = ["node", "edgeDim"]


def lum(rgb: tuple[int, int, int]) -> float:
    def chan(c: int) -> float:
        v = c / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def parse_css_color(value: str) -> tuple[int, int, int]:
    value = value.strip()
    if value.startswith("#"):
        h = value.lstrip("#")
        if len(h) == 3:
            h = "".join(ch * 2 for ch in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    m = re.match(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", value)
    if m:
        return tuple(int(x) for x in m.groups())  # type: ignore[return-value]
    m = re.match(r"hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%", value)
    if m:
        import colorsys
        h, s, li = float(m[1]) / 360, float(m[2]) / 100, float(m[3]) / 100
        r, g, b = colorsys.hls_to_rgb(h, li, s)
        return (round(r * 255), round(g * 255), round(b * 255))
    raise ValueError(f"unsupported color format: {value!r}")


def parse_palettes() -> dict[str, dict]:
    src = COLORS_TS.read_text(encoding="utf-8")
    blocks = {}
    for name in ("DARK", "LIGHT"):
        m = re.search(rf"const {name}: Palette = \{{(.*?)\n\}};", src, re.S)
        if not m:
            raise SystemExit(f"cannot find {name} palette in colors.ts")
        body = m.group(1)
        rgba = {k: tuple(int(x) for x in re.split(r",\s*", v)[:3])
                for k, v in re.findall(r"(\w+): \[([\d, ]+)\]", body)}
        cong = {}
        mc = re.search(r"congestion: \{(.*?)\}", body, re.S)
        if mc:
            for k, v in re.findall(r"(\d): \[([\d, ]+)\]", mc.group(1)):
                cong[int(k)] = tuple(int(x) for x in re.split(r",\s*", v)[:3])
        basemap = re.search(r'basemap: "([^"]+)"', body).group(1)
        blocks[name.lower()] = {"deck": rgba, "congestion": cong, "basemap": basemap}
    return blocks


def parse_css_vars() -> dict[str, dict[str, tuple[int, int, int]]]:
    css = GLOBALS_CSS.read_text(encoding="utf-8")
    out = {}
    for theme, sel in (("dark", r':root\[data-theme="dark"\] \{(.*?)\}'),
                       ("light", r':root\[data-theme="light"\] \{(.*?)\}')):
        m = re.search(sel, css, re.S)
        body = m.group(1)
        out[theme] = {k: tuple(int(x) for x in v.split()[:3])
                      for k, v in re.findall(r"--([\w-]+):\s*([\d ]+);", body)}
    return out


def basemap_background(style_url: str) -> tuple[int, int, int]:
    with urllib.request.urlopen(style_url, timeout=30) as r:
        style = json.load(r)
    for layer in style["layers"]:
        if layer.get("type") == "background":
            return parse_css_color(str(layer["paint"]["background-color"]))
    raise SystemExit(f"no background layer in {style_url}")


def main() -> None:
    palettes = parse_palettes()
    css = parse_css_vars()
    failures: list[str] = []

    for theme in ("dark", "light"):
        deck = palettes[theme]["deck"]
        cong = palettes[theme]["congestion"]
        panel = css[theme]["surface-panel"]
        ink, ink_dim = css[theme]["ink"], css[theme]["ink-dim"]
        bmap = basemap_background(palettes[theme]["basemap"])

        print(f"\n=== THEME {theme.upper()} — panel rgb{panel}, "
              f"basemap rgb{bmap} (đọc từ style JSON) ===")
        print(f"{'màu':<14}{'rgb':<16}{'vs panel':>9}{'vs basemap':>11}  ngưỡng  kq")

        def row(name: str, rgb, min_ratio: float | None, note: str = "") -> None:
            cp, cb = contrast(rgb, panel), contrast(rgb, bmap)
            if min_ratio is None:
                verdict = f"backdrop{note}"
            else:
                ok = cp >= min_ratio and cb >= min_ratio
                verdict = "PASS" if ok else "FAIL"
                if not ok:
                    failures.append(f"{theme}:{name} panel={cp:.2f} basemap={cb:.2f}")
            print(f"{name:<14}{str(rgb):<16}{cp:>9.2f}{cb:>11.2f}"
                  f"  {'—' if min_ratio is None else min_ratio:>5}  {verdict}")

        for key in INFO_KEYS:
            row(key, deck[key], GRAPHIC_MIN)
        for level, rgb in sorted(cong.items()):
            row(f"cong-{level}", rgb, GRAPHIC_MIN)
        for key in BACKDROP_KEYS:
            row(key, deck[key], None, " (cố ý chìm)")

        print("--- chữ (>= 4.5) ---")
        for name, fg, bg in (
            ("ink/panel", ink, panel),
            ("ink-dim/panel", ink_dim, panel),
            ("chipText/Đi", deck["chipText"], deck["chipStart"]),
            ("chipText/Đến", deck["chipText"], deck["chipGoal"]),
            ("stopText/stop", deck["stopText"], deck["stop"]),
        ):
            c = contrast(fg, bg)
            ok = c >= TEXT_MIN
            if not ok:
                failures.append(f"{theme}:{name} = {c:.2f}")
            print(f"{name:<20}{c:>6.2f}  {'PASS' if ok else 'FAIL'}")

    print()
    if failures:
        print("FAILURES:")
        for f in failures:
            print(" -", f)
        sys.exit(1)
    print("ALL CONTRAST CHECKS PASS")


if __name__ == "__main__":
    main()
