// Semantic palettes per theme — MUST mirror docs/DESIGN.md §3 and the CSS
// variables in app/globals.css. deck.gl needs concrete RGBA; charts and
// inline-styled swatches need hex. Do not invent colors elsewhere.

import type { Theme } from "./store";

export type RGBA = [number, number, number, number];

export interface Palette {
  deck: {
    node: RGBA; nodeReal: RGBA; frontier: RGBA; expanded: RGBA; current: RGBA; path: RGBA;
    routeFlowCore: RGBA; routeFlowHalo: RGBA; routeFlowStatic: RGBA;
    bidiForward: RGBA; bidiBackward: RGBA; edgeDim: RGBA; edgeReal: RGBA;
    compareB: RGBA;
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
    node: [226, 208, 235, 170],
    nodeReal: [226, 208, 235, 125],
    frontier: [255, 133, 187, 255],
    expanded: [192, 163, 245, 255],
    current: [255, 255, 255, 255],
    path: [255, 195, 105, 255],
    routeFlowCore: [255, 255, 255, 245],
    routeFlowHalo: [255, 195, 105, 92],
    routeFlowStatic: [255, 255, 255, 118],
    bidiForward: [255, 133, 187, 255],
    bidiBackward: [192, 163, 245, 255],
    edgeDim: [181, 161, 192, 125],
    edgeReal: [181, 161, 192, 85],
    compareB: [255, 133, 187, 255],
    start: [99, 214, 174, 255],
    goal: [255, 121, 151, 255],
    stop: [255, 195, 105, 255],
    stopText: [36, 26, 44, 255],
    chipStart: [22, 134, 107, 255],
    chipGoal: [202, 72, 110, 255],
    chipText: [255, 255, 255, 255],
    pulse: [255, 255, 255, 180],
    label: [253, 246, 255, 255],
    labelOutline: [36, 26, 44, 235],
  },
  congestion: {
    1: [16, 185, 129, 220], 2: [163, 230, 53, 220], 3: [250, 204, 21, 220],
    4: [249, 115, 22, 230], 5: [239, 68, 68, 240],
  },
  congestionHex: { 1: "#10b981", 2: "#a3e635", 3: "#facc15", 4: "#f97316", 5: "#ef4444" },
  hex: {
    frontier: "#ff85bb", expanded: "#c0a3f5", current: "#ffffff", path: "#ffc369",
    bidiForward: "#ff85bb", bidiBackward: "#c0a3f5", node: "#e2d0eb",
    inkDim: "#d3bedc", grid: "#60496d", panel: "#34263e",
  },
  basemap: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
};

const LIGHT: Palette = {
  deck: {
    node: [92, 72, 104, 165],
    nodeReal: [92, 72, 104, 135],
    frontier: [196, 65, 133, 255],
    expanded: [121, 82, 179, 255],
    current: [74, 55, 84, 255],
    path: [185, 94, 28, 255],
    routeFlowCore: [255, 255, 255, 255],
    routeFlowHalo: [185, 94, 28, 82],
    routeFlowStatic: [255, 255, 255, 155],
    bidiForward: [196, 65, 133, 255],
    bidiBackward: [121, 82, 179, 255],
    edgeDim: [92, 72, 104, 125],
    edgeReal: [92, 72, 104, 95],
    compareB: [196, 65, 133, 255],
    start: [22, 134, 107, 255],
    goal: [201, 63, 98, 255],
    stop: [185, 119, 22, 255],
    stopText: [36, 26, 44, 255],
    chipStart: [22, 134, 107, 255],
    chipGoal: [202, 72, 110, 255],
    chipText: [255, 255, 255, 255],
    pulse: [74, 55, 84, 170],
    label: [74, 55, 84, 255],
    labelOutline: [255, 255, 255, 240],
  },
  congestion: {
    1: [5, 150, 105, 220], 2: [77, 124, 15, 220], 3: [161, 98, 7, 225],
    4: [234, 88, 12, 235], 5: [220, 38, 38, 245],
  },
  congestionHex: { 1: "#059669", 2: "#4d7c0f", 3: "#a16207", 4: "#ea580c", 5: "#dc2626" },
  hex: {
    frontier: "#c44185", expanded: "#7952b3", current: "#4a3754", path: "#b95e1c",
    bidiForward: "#c44185", bidiBackward: "#7952b3", node: "#5c4868",
    inkDim: "#705b7c", grid: "#eadbf0", panel: "#fffcff",
  },
  basemap: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

export const PALETTES: Record<Theme, Palette> = { dark: DARK, light: LIGHT };

export function paletteOf(theme: Theme): Palette {
  return PALETTES[theme];
}
