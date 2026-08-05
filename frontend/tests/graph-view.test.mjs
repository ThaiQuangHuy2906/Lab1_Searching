import assert from "node:assert/strict";
import test from "node:test";

import {
  graphViewForNodeCount,
  nodeCountForGraphView,
  parseDemoNodeCount,
} from "../lib/graph-view.ts";

test("every integer from 3 to 51 maps to a deterministic graph view", () => {
  for (let count = 3; count <= 51; count += 1) {
    const view = graphViewForNodeCount(count);
    assert.equal(nodeCountForGraphView(view), count);
    assert.equal(view, count === 51 ? "full" : `teach_${count}`);
  }
});

test("node-count input rejects decimals and values outside 3..51", () => {
  assert.equal(parseDemoNodeCount("3"), 3);
  assert.equal(parseDemoNodeCount("51"), 51);
  for (const value of ["", "2", "3.5", "52", "abc"])
    assert.equal(parseDemoNodeCount(value), null);
  assert.throws(() => graphViewForNodeCount(2), RangeError);
  assert.throws(() => graphViewForNodeCount(52), RangeError);
});
