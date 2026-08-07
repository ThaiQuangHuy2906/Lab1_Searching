// Semantic palettes per theme — MUST mirror docs/DESIGN.md §2–3 and the CSS
// variables in app/globals.css. deck.gl needs concrete RGBA; charts and
// inline-styled swatches need hex. Do not invent colors elsewhere.

import type { Theme } from "./theme";

export type RGBA = [number, number, number, number];
type RGB = [number, number, number];

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

interface PaletteSpec {
  dark: boolean;
  node: RGB;
  frontier: RGB;
  expanded: RGB;
  current: RGB;
  path: RGB;
  bidiBackward: RGB;
  edge: RGB;
  start: RGB;
  goal: RGB;
  stop: RGB;
  stopText: RGB;
  label: RGB;
  labelOutline: RGB;
  inkDim: RGB;
  grid: RGB;
  panel: RGB;
}

const CARTO_DARK = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const CARTO_LIGHT = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const DARK_CONGESTION: Record<number, RGBA> = {
  1: [16, 185, 129, 220], 2: [163, 230, 53, 220], 3: [250, 204, 21, 220],
  4: [249, 115, 22, 230], 5: [239, 68, 68, 240],
};
const LIGHT_CONGESTION: Record<number, RGBA> = {
  1: [5, 150, 105, 220], 2: [77, 124, 15, 220], 3: [161, 98, 7, 225],
  4: [234, 88, 12, 235], 5: [220, 38, 38, 245],
};
const DARK_CONGESTION_HEX = {
  1: "#10b981", 2: "#a3e635", 3: "#facc15", 4: "#f97316", 5: "#ef4444",
};
const LIGHT_CONGESTION_HEX = {
  1: "#059669", 2: "#4d7c0f", 3: "#a16207", 4: "#ea580c", 5: "#dc2626",
};

function rgba(rgb: RGB, alpha = 255): RGBA {
  return [rgb[0], rgb[1], rgb[2], alpha];
}

function hex(rgb: RGB): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function makePalette(spec: PaletteSpec): Palette {
  return {
    deck: {
      node: rgba(spec.node, 170),
      nodeReal: rgba(spec.node, spec.dark ? 125 : 135),
      frontier: rgba(spec.frontier),
      expanded: rgba(spec.expanded),
      current: rgba(spec.current),
      path: rgba(spec.path),
      routeFlowCore: [255, 255, 255, spec.dark ? 245 : 255],
      routeFlowHalo: rgba(spec.path, spec.dark ? 92 : 82),
      routeFlowStatic: [255, 255, 255, spec.dark ? 118 : 155],
      bidiForward: rgba(spec.frontier),
      bidiBackward: rgba(spec.bidiBackward),
      edgeDim: rgba(spec.edge, 125),
      edgeReal: rgba(spec.edge, spec.dark ? 85 : 95),
      compareB: rgba(spec.frontier),
      start: rgba(spec.start),
      goal: rgba(spec.goal),
      stop: rgba(spec.stop),
      stopText: rgba(spec.stopText),
      chipStart: [4, 120, 87, 255],
      chipGoal: [190, 46, 93, 255],
      chipText: [255, 255, 255, 255],
      pulse: rgba(spec.current, spec.dark ? 180 : 170),
      label: rgba(spec.label),
      labelOutline: rgba(spec.labelOutline, 240),
    },
    congestion: spec.dark ? DARK_CONGESTION : LIGHT_CONGESTION,
    congestionHex: spec.dark ? DARK_CONGESTION_HEX : LIGHT_CONGESTION_HEX,
    hex: {
      frontier: hex(spec.frontier),
      expanded: hex(spec.expanded),
      current: hex(spec.current),
      path: hex(spec.path),
      bidiForward: hex(spec.frontier),
      bidiBackward: hex(spec.bidiBackward),
      node: hex(spec.node),
      inkDim: hex(spec.inkDim),
      grid: hex(spec.grid),
      panel: hex(spec.panel),
    },
    basemap: spec.dark ? CARTO_DARK : CARTO_LIGHT,
  };
}

const DEFAULT = makePalette({
  dark: true,
  node: [212, 212, 216], frontier: [34, 211, 238], expanded: [167, 139, 250],
  current: [255, 255, 255], path: [251, 191, 36], bidiBackward: [251, 113, 133],
  edge: [161, 161, 170], start: [16, 185, 129], goal: [239, 68, 68],
  stop: [251, 191, 36], stopText: [9, 9, 11], label: [250, 250, 250],
  labelOutline: [9, 9, 11], inkDim: [166, 166, 176], grid: [42, 43, 48], panel: [22, 23, 27],
});

const LIGHT = makePalette({
  dark: false,
  node: [39, 39, 42], frontier: [8, 145, 178], expanded: [124, 58, 237],
  current: [24, 24, 27], path: [217, 119, 6], bidiBackward: [225, 29, 72],
  edge: [63, 63, 70], start: [5, 150, 105], goal: [220, 38, 38],
  stop: [217, 119, 6], stopText: [24, 24, 27], label: [39, 39, 42],
  labelOutline: [255, 255, 255], inkDim: [82, 82, 91], grid: [218, 222, 227], panel: [255, 255, 255],
});

const DARK = makePalette({
  dark: true,
  node: [203, 213, 225], frontier: [56, 189, 248], expanded: [129, 140, 248],
  current: [255, 255, 255], path: [250, 204, 21], bidiBackward: [244, 114, 182],
  edge: [148, 163, 184], start: [52, 211, 153], goal: [251, 113, 133],
  stop: [250, 204, 21], stopText: [0, 0, 0], label: [248, 250, 252],
  labelOutline: [0, 0, 0], inkDim: [174, 183, 194], grid: [36, 44, 55], panel: [12, 15, 20],
});

const PINK = makePalette({
  dark: false,
  node: [121, 78, 100], frontier: [214, 75, 135], expanded: [71, 140, 191],
  current: [88, 46, 67], path: [197, 111, 19], bidiBackward: [55, 122, 173],
  edge: [137, 102, 120], start: [22, 134, 107], goal: [190, 46, 93],
  stop: [142, 70, 7], stopText: [255, 255, 255], label: [88, 46, 67],
  labelOutline: [255, 255, 255], inkDim: [126, 76, 100], grid: [244, 203, 223], panel: [255, 252, 254],
});

const LAVENDER = makePalette({
  dark: false,
  node: [92, 76, 119], frontier: [112, 78, 184], expanded: [190, 70, 130],
  current: [65, 49, 92], path: [180, 94, 14], bidiBackward: [190, 70, 130],
  edge: [112, 100, 135], start: [34, 132, 103], goal: [190, 52, 94],
  stop: [139, 67, 7], stopText: [255, 255, 255], label: [65, 49, 92],
  labelOutline: [255, 255, 255], inkDim: [94, 76, 125], grid: [218, 206, 239], panel: [253, 251, 255],
});

const SAGE = makePalette({
  dark: false,
  node: [73, 91, 65], frontier: [55, 118, 90], expanded: [181, 83, 110],
  current: [55, 68, 50], path: [176, 110, 20], bidiBackward: [181, 83, 110],
  edge: [94, 111, 86], start: [36, 120, 91], goal: [190, 62, 88],
  stop: [135, 72, 7], stopText: [255, 255, 255], label: [55, 68, 50],
  labelOutline: [255, 255, 255], inkDim: [82, 99, 73], grid: [203, 214, 193], panel: [255, 253, 247],
});

const LEMON = makePalette({
  dark: false,
  node: [91, 84, 48], frontier: [0, 118, 139], expanded: [106, 91, 173],
  current: [72, 67, 38], path: [174, 112, 0], bidiBackward: [190, 65, 105],
  edge: [112, 106, 70], start: [57, 124, 64], goal: [188, 53, 72],
  stop: [134, 75, 0], stopText: [255, 255, 255], label: [72, 67, 38],
  labelOutline: [255, 255, 255], inkDim: [106, 98, 57], grid: [237, 220, 153], panel: [255, 254, 248],
});

export const PALETTES: Record<Theme, Palette> = {
  default: DEFAULT,
  light: LIGHT,
  dark: DARK,
  pink: PINK,
  lavender: LAVENDER,
  sage: SAGE,
  lemon: LEMON,
};

export function paletteOf(theme: Theme): Palette {
  return PALETTES[theme];
}
