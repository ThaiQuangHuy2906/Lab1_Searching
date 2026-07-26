// Vietnamese number formatting (DESIGN.md §2): decimal comma, "812,4 s".

export function fmtVi(x: number, digits = 1): string {
  const s = x.toFixed(digits).replace(".", ",");
  return s.endsWith(",0") ? s.slice(0, -2) : s;
}

export const fmtSeconds = (s: number) => `${fmtVi(s, 1)} s`;
export const fmtMinutes = (s: number) => `${fmtVi(s / 60, 1)} phút`;
export const fmtKm = (m: number) => `${fmtVi(m / 1000, 2)} km`;
export const fmtMs = (ms: number) => `${fmtVi(ms, 1)} ms`;
export const fmtPct = (p: number) => `${fmtVi(p, 1)} %`;
export const fmtInt = (n: number) => n.toLocaleString("vi-VN");
