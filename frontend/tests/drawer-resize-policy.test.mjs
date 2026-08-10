import assert from "node:assert/strict";
import test from "node:test";

import {
  availableDrawerWidth,
  clampDrawerWidth,
  DEFAULT_DRAWER_WIDTH,
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
} from "../lib/drawer-resize-policy.ts";

test("drawer resizing preserves map room and clamps to the desktop contract", () => {
  assert.equal(availableDrawerWidth(1280), 600);
  assert.equal(availableDrawerWidth(1366), 686);
  assert.equal(availableDrawerWidth(1920), MAX_DRAWER_WIDTH);
  assert.equal(availableDrawerWidth(1024), DEFAULT_DRAWER_WIDTH);
  assert.equal(clampDrawerWidth(100, 600), MIN_DRAWER_WIDTH);
  assert.equal(clampDrawerWidth(800, 600), 600);
  assert.equal(clampDrawerWidth(512, 600), 512);
});
