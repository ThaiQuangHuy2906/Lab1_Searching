export const THEME_VALUES = [
  "default",
  "light",
  "dark",
  "pink",
  "lavender",
  "sage",
  "lemon",
] as const;

export type Theme = (typeof THEME_VALUES)[number];
export type ThemeAppearance = "light" | "dark";

export interface ThemeOption {
  value: Theme;
  label: string;
  description: string;
  appearance: ThemeAppearance;
  swatches: readonly [string, string, string];
}

export const DEFAULT_THEME: Theme = "default";
export const THEME_STORAGE_KEY = "traffic-theme-v2";

export const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    value: "default",
    label: "Mặc định",
    description: "Phòng điều khiển xanh lơ, tím và hổ phách",
    appearance: "dark",
    swatches: ["#09090b", "#22d3ee", "#a78bfa"],
  },
  {
    value: "light",
    label: "Trắng",
    description: "Sáng, sạch và trung tính",
    appearance: "light",
    swatches: ["#ffffff", "#0891b2", "#7c3aed"],
  },
  {
    value: "dark",
    label: "Đen",
    description: "Đen sâu với điểm nhấn xanh điện",
    appearance: "dark",
    swatches: ["#000000", "#38bdf8", "#818cf8"],
  },
  {
    value: "pink",
    label: "Hồng phấn",
    description: "Hồng phấn phối xanh da trời nhạt",
    appearance: "light",
    swatches: ["#f4a9cc", "#bddbf2", "#fff7fb"],
  },
  {
    value: "lavender",
    label: "Tím oải hương",
    description: "Tím oải hương phối hồng quả mọng",
    appearance: "light",
    swatches: ["#c9b8eb", "#e4b7dd", "#f9f6ff"],
  },
  {
    value: "sage",
    label: "Xanh xô thơm & kem",
    description: "Xanh xô thơm, kem và hồng điểm xuyết",
    appearance: "light",
    swatches: ["#b4caa9", "#fffdf7", "#edb1c1"],
  },
  {
    value: "lemon",
    label: "Vàng chanh",
    description: "Vàng chanh phối xanh lá nhạt",
    appearance: "light",
    swatches: ["#fde68a", "#dde7a0", "#fff4c2"],
  },
];

const THEME_SET = new Set<string>(THEME_VALUES);

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && THEME_SET.has(value);
}

export function resolveStoredTheme(value: unknown): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function themeAppearance(theme: Theme): ThemeAppearance {
  return theme === "default" || theme === "dark" ? "dark" : "light";
}

export function themeOption(theme: Theme): ThemeOption {
  return THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];
}
