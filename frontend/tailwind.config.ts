// Design tokens — the single source of truth is docs/DESIGN.md.
// Every color used anywhere in the UI must resolve to a token below.
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#09090b", // zinc-950 — page & offline-map background
          panel: "#18181b", //   zinc-900 — panels, drawer, cards, timeline
          border: "#27272a", //  zinc-800 — borders
        },
        ink: {
          DEFAULT: "#f4f4f5", // zinc-100 — primary text
          dim: "#a1a1aa", //     zinc-400 — secondary text
        },
        algo: {
          node: "#52525b", //     zinc-600  — plain node
          frontier: "#22d3ee", // cyan-400  — frontier node
          expanded: "#a78bfa", // violet-400 — expanded node
          current: "#ffffff", //  white     — node being expanded (with pulse ring)
          path: "#fbbf24", //     amber-400 — final route
        },
        bidi: {
          forward: "#22d3ee", //  cyan-400
          backward: "#fb7185", // rose-400
        },
        cong: {
          1: "#10b981", // emerald-500
          2: "#a3e635", // lime-400
          3: "#facc15", // yellow-400
          4: "#f97316", // orange-500
          5: "#ef4444", // red-500
        },
        start: "#10b981", // emerald-500 — "Đi" chip
        goal: "#ef4444", //  red-500     — "Đến" chip
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: { lg: "8px" },
    },
  },
  plugins: [],
};
export default config;
