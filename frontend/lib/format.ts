// Vietnamese number formatting (DESIGN.md §2): decimal comma + non-breaking
// space thousands groups — "2 000,5 s", "1 226" (the docs/teaching-doc style;
// vi-VN toLocaleString would use dots and clash with the decimal comma).

export function fmtVi(x: number, digits = 1): string {
  const fixed = x.toFixed(digits);
  const neg = fixed.startsWith("-");
  const [intPart, frac] = fixed.replace("-", "").split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const s = (neg ? "-" : "") + grouped + (frac ? "," + frac : "");
  return s.endsWith(",0") ? s.slice(0, -2) : s;
}

export const fmtSeconds = (s: number) => `${fmtVi(s, 1)} s`;
export const fmtMinutes = (s: number) => `${fmtVi(s / 60, 1)} phút`;
/**
 * Route distances are presented in kilometres throughout the UI. Very short
 * values keep a third decimal so an IDA* epsilon such as 5 m is still shown
 * truthfully as 0,005 km instead of being rounded to 0,01 km.
 */
export const fmtKm = (m: number) => `${fmtVi(m / 1000, Math.abs(m) > 0 && Math.abs(m) < 10 ? 3 : 2)} km`;
export const fmtMs = (ms: number) => `${fmtVi(ms, 1)} ms`;
export const fmtPct = (p: number) => `${fmtVi(p, 1)} %`;
export const fmtInt = (n: number) => fmtVi(n, 0);
