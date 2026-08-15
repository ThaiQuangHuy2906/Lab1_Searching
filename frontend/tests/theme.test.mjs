import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_THEME,
  THEME_OPTIONS,
  THEME_VALUES,
  isTheme,
  resolveStoredTheme,
  themeAppearance,
  themeOption,
} from "../lib/theme.ts";

test("theme catalog exposes every requested option exactly once", () => {
  assert.equal(new Set(THEME_VALUES).size, THEME_VALUES.length);
  assert.deepEqual(THEME_OPTIONS.map((option) => option.value), [...THEME_VALUES]);
  assert.equal(DEFAULT_THEME, "default");
});

test("stored theme validation falls back safely", () => {
  for (const theme of THEME_VALUES) {
    assert.equal(isTheme(theme), true);
    assert.equal(resolveStoredTheme(theme), theme);
  }
  assert.equal(isTheme("blue"), false);
  assert.equal(resolveStoredTheme("blue"), DEFAULT_THEME);
  assert.equal(resolveStoredTheme(null), DEFAULT_THEME);
});

test("appearance and labels stay aligned with the selected palette", () => {
  assert.equal(themeAppearance("default"), "dark");
  assert.equal(themeAppearance("dark"), "dark");
  for (const theme of ["light", "pink", "lavender", "sage", "lemon"]) {
    assert.equal(themeAppearance(theme), "light");
  }
  assert.equal(themeOption("pink").label, "Hồng phấn");
  assert.equal(themeOption("lemon").swatches.length, 3);
});
