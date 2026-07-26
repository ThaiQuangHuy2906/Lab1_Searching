// Semantic colors as deck.gl RGBA arrays — MUST match tailwind.config.ts
// and docs/DESIGN.md §3. Do not invent colors elsewhere.

export type RGBA = [number, number, number, number];

export const C = {
  node: [82, 82, 91, 200] as RGBA, //        zinc-600
  frontier: [34, 211, 238, 255] as RGBA, //  cyan-400
  expanded: [167, 139, 250, 255] as RGBA, // violet-400
  current: [255, 255, 255, 255] as RGBA, //  white
  path: [251, 191, 36, 255] as RGBA, //      amber-400
  bidiForward: [34, 211, 238, 255] as RGBA, //  cyan-400
  bidiBackward: [251, 113, 133, 255] as RGBA, // rose-400
  edgeDim: [63, 63, 70, 160] as RGBA, //     zinc-700 — plain edges
  compareB: [34, 211, 238, 255] as RGBA, //  cyan-400 — algorithm B route
  start: [16, 185, 129, 255] as RGBA, //     emerald-500
  goal: [239, 68, 68, 255] as RGBA, //       red-500
  stop: [251, 191, 36, 255] as RGBA, //      amber-400
} as const;

export const CONGESTION: Record<number, RGBA> = {
  1: [16, 185, 129, 220], //  emerald-500
  2: [163, 230, 53, 220], //  lime-400
  3: [250, 204, 21, 220], //  yellow-400
  4: [249, 115, 22, 230], //  orange-500
  5: [239, 68, 68, 240], //   red-500
};

export const CONGESTION_HEX: Record<number, string> = {
  1: "#10b981", 2: "#a3e635", 3: "#facc15", 4: "#f97316", 5: "#ef4444",
};
