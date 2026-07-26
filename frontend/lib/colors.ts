// Semantic palettes per theme — MUST mirror docs/DESIGN.md §3 and the CSS
// variables in app/globals.css. deck.gl needs concrete RGBA; charts and
// inline-styled swatches need hex. Do not invent colors elsewhere.

import type { Theme } from "./store";

export type RGBA = [number, number, number, number];

export interface Palette {
  deck: {
    node: RGBA; frontier: RGBA; expanded: RGBA; current: RGBA; path: RGBA;
    bidiForward: RGBA; bidiBackward: RGBA; edgeDim: RGBA; compareB: RGBA;
    start: RGBA; goal: RGBA; stop: RGBA; stopText: RGBA;
    chipStart: RGBA; chipGoal: RGBA; chipText: RGBA;
    pulse: RGBA; label: RGBA; labelOutline: RGBA;
  };
  congestion: Record<number, RGBA>;
  congestionHex: Record<number, string>;
  hex: {
    frontier: string; expanded: string; current: string; path: string;
    bidiForward: string; bidiBackward: string; node: string;
    inkDim: string; grid: string; panel: string;
  };
  basemap: string;
}

const DARK: Palette = {
  deck: {
    node: [212, 212, 216, 245], //       zinc-300 (v8: v4's zinc-500 still sank into the basemap)
    frontier: [34, 211, 238, 255], //    cyan-400
    expanded: [167, 139, 250, 255], //   violet-400
    current: [255, 255, 255, 255],
    path: [251, 191, 36, 255], //        amber-400
    bidiForward: [34, 211, 238, 255],
    bidiBackward: [251, 113, 133, 255], // rose-400
    edgeDim: [161, 161, 170, 215], //    zinc-400 (v8: raised again, still below algo colors)
    compareB: [34, 211, 238, 255],
    start: [16, 185, 129, 255], //       emerald-500
    goal: [239, 68, 68, 255], //         red-500
    stop: [251, 191, 36, 255],
    stopText: [9, 9, 11, 255], //        zinc-950 on bright amber (>= 4.5)
    chipStart: [4, 120, 87, 255], //     emerald-700 — white text >= 4.5 both themes
    chipGoal: [220, 38, 38, 255], //     red-600 — graphics >= 3.0 & white text >= 4.5 both themes
    chipText: [255, 255, 255, 255],
    pulse: [255, 255, 255, 180],
    label: [250, 250, 250, 255], //      zinc-50 (v8d: full white — zinc-200 still read as dim)
    labelOutline: [9, 9, 11, 235],
  },
  congestion: {
    1: [16, 185, 129, 220], 2: [163, 230, 53, 220], 3: [250, 204, 21, 220],
    4: [249, 115, 22, 230], 5: [239, 68, 68, 240],
  },
  congestionHex: { 1: "#10b981", 2: "#a3e635", 3: "#facc15", 4: "#f97316", 5: "#ef4444" },
  hex: {
    frontier: "#22d3ee", expanded: "#a78bfa", current: "#ffffff", path: "#fbbf24",
    bidiForward: "#22d3ee", bidiBackward: "#fb7185", node: "#d4d4d8",
    inkDim: "#a1a1aa", grid: "#27272a", panel: "#18181b",
  },
  basemap: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const LIGHT: Palette = {
  deck: {
    node: [161, 161, 170, 210], //       zinc-400
    frontier: [8, 145, 178, 255], //     cyan-600
    expanded: [124, 58, 237, 255], //    violet-600
    current: [24, 24, 27, 255], //       zinc-900 (per review round 2)
    path: [217, 119, 6, 255], //         amber-600
    bidiForward: [8, 145, 178, 255],
    bidiBackward: [225, 29, 72, 255], // rose-600
    edgeDim: [212, 212, 216, 190], //    zinc-300
    compareB: [8, 145, 178, 255],
    start: [5, 150, 105, 255], //        emerald-600
    goal: [220, 38, 38, 255], //         red-600
    stop: [217, 119, 6, 255], //         amber-600
    stopText: [9, 9, 11, 255], //        zinc-950 on amber-600 (white measured 3.19 < 4.5)
    chipStart: [4, 120, 87, 255], //     emerald-700
    chipGoal: [220, 38, 38, 255], //     red-600 (measured: see check_contrast)
    chipText: [255, 255, 255, 255],
    pulse: [24, 24, 27, 170],
    label: [63, 63, 70, 235], //         zinc-700
    labelOutline: [255, 255, 255, 230],
  },
  congestion: {
    1: [5, 150, 105, 220], 2: [77, 124, 15, 220], 3: [161, 98, 7, 225],
    4: [234, 88, 12, 235], 5: [220, 38, 38, 245],
  },
  congestionHex: { 1: "#059669", 2: "#4d7c0f", 3: "#a16207", 4: "#ea580c", 5: "#dc2626" },
  hex: {
    frontier: "#0891b2", expanded: "#7c3aed", current: "#18181b", path: "#d97706",
    bidiForward: "#0891b2", bidiBackward: "#e11d48", node: "#a1a1aa",
    inkDim: "#71717a", grid: "#e4e4e7", panel: "#ffffff",
  },
  basemap: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

export const PALETTES: Record<Theme, Palette> = { dark: DARK, light: LIGHT };

export function paletteOf(theme: Theme): Palette {
  return PALETTES[theme];
}
