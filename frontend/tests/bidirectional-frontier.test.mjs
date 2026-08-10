import assert from "node:assert/strict";
import test from "node:test";

import { formatBidirectionalCost, presentBidirectionalFrontiers } from "../lib/bidirectional-frontier-policy.ts";

test("v2 two-side presentation preserves overlap with two independent g values", () => {
  const step = {
    step: 3,
    expanded: "n0002",
    frontier: ["n0002", "n0003", "n0004"],
    g: { n0002: 2, n0003: 4, n0004: 3 },
    h: null,
    f: null,
    side: "forward",
    decision: {},
    bidirectional_frontiers: {
      forward: { nodes: ["n0002", "n0003"], g: { n0002: 2, n0003: 4 } },
      backward: { nodes: ["n0002", "n0004"], g: { n0002: 7, n0004: 3 } },
      best_path_cost: 9,
      meeting_node: "n0002",
    },
  };
  const view = presentBidirectionalFrontiers(step, "distance");
  assert.equal(view.capability, "two_side_v2");
  assert.deepEqual(view.forward.find((row) => row.node === "n0002"), {
    node: "n0002", g: 2, overlap: true,
  });
  assert.deepEqual(view.backward.find((row) => row.node === "n0002"), {
    node: "n0002", g: 7, overlap: true,
  });
  assert.equal(view.legacyUnion.find((row) => row.node === "n0002").g, 2);
  assert.equal(view.unit, "m");
  assert.equal(view.activeSide, "forward");
  assert.match(view.backwardLabel, /node→Goal/);
  assert.equal(formatBidirectionalCost(view.bestPathCost, "distance"), "0,009 km");
  assert.equal(formatBidirectionalCost(90, "balanced"), "1,5 phút quy đổi");
});

test("legacy union fallback stays one table and never fabricates sides or μ", () => {
  const view = presentBidirectionalFrontiers({
    step: 1, expanded: "n0001", frontier: ["n0002"],
    g: { n0002: 4 }, h: null, f: null, side: "forward",
  }, "balanced");
  assert.equal(view.capability, "legacy_union");
  assert.equal(view.forward, null);
  assert.equal(view.backward, null);
  assert.equal(view.bestPathCost, null);
  assert.equal(view.activeSide, null);
  assert.deepEqual(view.legacyUnion, [{ node: "n0002", g: 4, overlap: false }]);
  assert.equal(view.unit, "s");
  assert.match(view.compatibilityLabel, /union\/min-g/);
});
