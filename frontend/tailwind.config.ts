// Design tokens — the single source of truth is docs/DESIGN.md.
// Colors resolve through CSS variables (app/globals.css) so the whole UI
// switches the selected palette by flipping [data-theme] on <html>.
import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: v("surface"),
          map: v("surface-map"),
          rail: v("surface-rail"),
          panel: v("surface-panel"),
          control: v("surface-control"),
          raised: v("surface-raised"),
          border: v("surface-border"),
          strong: v("surface-border-strong"),
        },
        ink: { DEFAULT: v("ink"), dim: v("ink-dim"), faint: v("ink-faint") },
        hl: v("hl"),
        algo: {
          node: v("algo-node"),
          frontier: v("algo-frontier"),
          expanded: v("algo-expanded"),
          current: v("algo-current"),
          path: v("algo-path"),
        },
        bidi: { forward: v("bidi-forward"), backward: v("bidi-backward") },
        start: v("start"),
        goal: v("goal"),
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      borderRadius: { lg: "8px", xl: "12px", "2xl": "16px" },
      boxShadow: { float: "var(--shadow-float)" },
    },
  },
  plugins: [],
};
export default config;
