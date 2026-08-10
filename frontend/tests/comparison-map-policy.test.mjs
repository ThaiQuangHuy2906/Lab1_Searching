import assert from "node:assert/strict";
import test from "node:test";

import {
  comparisonGridShape,
} from "../lib/comparison-map-policy.ts";

test("two maps use equal columns while three and four use equal 2x2 cells", () => {
  assert.equal(comparisonGridShape(2), "two_columns");
  assert.equal(comparisonGridShape(3), "balanced_three");
  assert.equal(comparisonGridShape(4), "balanced_quad");
});
