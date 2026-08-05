"use client";

// Palette hiện hành theo theme trong store — deck.gl, legend và chart đều
// lấy màu qua hook này, không hard-code (DESIGN.md §3).

import { paletteOf, type Palette } from "./colors";
import { useApp } from "./store";

export function usePalette(): Palette {
  const theme = useApp((s) => s.theme);
  return paletteOf(theme);
}
