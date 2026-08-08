"""WCAG contrast audit for the frontend's semantic palettes (all themes).

Reads the SOURCE OF TRUTH directly so nothing can drift:
- palettes parsed from each makePalette(...) specification in
  frontend/lib/colors.ts;
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
THEME_BY_CONST = {
    "DEFAULT": "default",
    "LIGHT": "light",
    "DARK": "dark",
    "PINK": "pink",
    "LAVENDER": "lavender",
    "SAGE": "sage",
    "LEMON": "lemon",
}
THEMES = tuple(THEME_BY_CONST.values())


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
    congestion = {}
    for mode in ("DARK", "LIGHT"):
        m = re.search(rf"const {mode}_CONGESTION[^=]*= \{{(.*?)\n\}};", src, re.S)
        if not m:
            raise SystemExit(f"cannot find {mode}_CONGESTION in colors.ts")
        body = m.group(1)
        congestion[mode.lower()] = {
            int(key): tuple(int(x) for x in re.split(r",\s*", value)[:3])
            for key, value in re.findall(r"(\d): \[([\d, ]+)\]", body)
        }

    def source_string(name: str) -> str:
        m = re.search(rf'const {name} = "([^"]+)";', src)
        if not m:
            raise SystemExit(f"cannot find {name} URL in colors.ts")
        return m.group(1)

    carto_dark = source_string("CARTO_DARK")
    carto_light = source_string("CARTO_LIGHT")
    palettes = {}
    for constant, theme in THEME_BY_CONST.items():
        m = re.search(rf"const {constant} = makePalette\(\{{(.*?)\n\}}\);", src, re.S)
        if not m:
            raise SystemExit(f"cannot find {constant} makePalette specification in colors.ts")
        body = m.group(1)
        fields = {
            key: tuple(int(x) for x in re.split(r",\s*", value))
            for key, value in re.findall(r"(\w+): \[([\d, ]+)\]", body)
        }
        required = {
            "node", "frontier", "expanded", "current", "path", "bidiBackward",
            "edge", "start", "goal", "stop", "stopText",
        }
        if missing := required - fields.keys():
            raise SystemExit(f"{constant} is missing palette fields: {sorted(missing)}")
        is_dark = re.search(r"dark:\s*true", body) is not None
        palettes[theme] = {
            "deck": {
                "node": fields["node"],
                "frontier": fields["frontier"],
                "expanded": fields["expanded"],
                "current": fields["current"],
                "path": fields["path"],
                "bidiForward": fields["frontier"],
                "bidiBackward": fields["bidiBackward"],
                "edgeDim": fields["edge"],
                "start": fields["start"],
                "goal": fields["goal"],
                "stop": fields["stop"],
                "stopText": fields["stopText"],
                "chipStart": (4, 120, 87),
                "chipGoal": (190, 46, 93),
                "chipText": (255, 255, 255),
            },
            "congestion": congestion["dark" if is_dark else "light"],
            "basemap": carto_dark if is_dark else carto_light,
        }
    return palettes


def parse_css_vars() -> dict[str, dict[str, tuple[int, int, int]]]:
    css = GLOBALS_CSS.read_text(encoding="utf-8")
    out = {}
    for theme in THEMES:
        m = re.search(rf':root\[data-theme="{theme}"\]\s*\{{(.*?)\}}', css, re.S)
        if not m:
            raise SystemExit(f"cannot find CSS variables for {theme} theme")
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

    basemaps: dict[str, tuple[int, int, int]] = {}
    for theme in THEMES:
        deck = palettes[theme]["deck"]
        cong = palettes[theme]["congestion"]
        panel = css[theme]["surface-panel"]
        ink, ink_dim = css[theme]["ink"], css[theme]["ink-dim"]
        style_url = palettes[theme]["basemap"]
        bmap = basemaps.setdefault(style_url, basemap_background(style_url))

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
