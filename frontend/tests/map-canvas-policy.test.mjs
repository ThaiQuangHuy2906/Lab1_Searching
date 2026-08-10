import assert from "node:assert/strict";
import test from "node:test";

import { mapCanvasCapabilities } from "../lib/map-canvas-policy.ts";

test("primary canvas keeps the complete single-run interaction contract", () => {
  assert.deepEqual(mapCanvasCapabilities("primary"), {
    allowJourneyPicking: true,
    allowEdgeEditing: true,
    allowClear: true,
    allowSearchAnimation: true,
    showPrimaryChrome: true,
    allowNavigation: true,
  });
});

test("comparison canvas is navigation-only and cannot mutate application data", () => {
  assert.deepEqual(mapCanvasCapabilities("comparison"), {
    allowJourneyPicking: false,
    allowEdgeEditing: false,
    allowClear: false,
    allowSearchAnimation: false,
    showPrimaryChrome: false,
    allowNavigation: true,
  });
});
