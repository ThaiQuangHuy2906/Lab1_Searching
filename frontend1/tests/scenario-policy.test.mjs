import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyEdgeOverridePatch,
  buildScenario,
  edgeCostBreakdown,
  effectiveCongestion,
} from "../lib/scenario.ts";

const golden = JSON.parse(readFileSync(
  new URL("../../data/mock/scenario_cost_golden.json", import.meta.url),
  "utf8",
));

const edge = {
  id: "e00001", u: "n0001", v: "n0002", name: "Test", length_m: 100,
  highway: "residential", oneway: true, free_speed_kmh: 36,
  free_travel_time_s: 10,
  risk: { flood: 0, construction: 0, narrow_alley: 0, traffic_light: 1 },
};
const traffic = { e00001: 2 };

test("scenario serialization is sorted, optional, and preserves a teaching view", () => {
  assert.equal(buildScenario("full", {}), undefined);
  assert.deepEqual(buildScenario("teach_7", {}), { graph_view: "teach_7" });
  assert.deepEqual(buildScenario("full", {
    e00002: { edge_id: "e00002", free_speed_kmh: 30 },
    e00001: { edge_id: "e00001", congestion: { "17:30": 5, "07:30": 2 } },
  }), {
    edge_overrides: [
      { edge_id: "e00001", congestion: { "07:30": 2, "17:30": 5 } },
      { edge_id: "e00002", free_speed_kmh: 30 },
    ],
  });
});

test("editing stores only effective fields and reset removes the override", () => {
  const initial = applyEdgeOverridePatch(edge, traffic, undefined, {
    free_speed_kmh: 20,
    risk: { flood: 1 },
  });
  const resetSpeed = applyEdgeOverridePatch(edge, traffic, initial, {
    free_speed_kmh: edge.free_speed_kmh,
  });
  const resetAll = applyEdgeOverridePatch(edge, traffic, resetSpeed, {
    risk: { flood: edge.risk.flood },
  });

  assert.deepEqual(initial, {
    edge_id: "e00001", free_speed_kmh: 20, risk: { flood: 1 },
  });
  assert.deepEqual(resetSpeed, { edge_id: "e00001", risk: { flood: 1 } });
  assert.equal(resetAll, undefined);
  assert.deepEqual(edge.risk, { flood: 0, construction: 0, narrow_alley: 0, traffic_light: 1 });
});

test("traffic overlay and cost preview use the same locked formula as the backend", () => {
  const override = {
    edge_id: "e00001", length_m: 120, free_speed_kmh: 36,
    congestion: { "07:30": 5 }, risk: { flood: 1 },
  };
  const preview = edgeCostBreakdown(edge, traffic, "07:30", override);

  assert.equal(effectiveCongestion("e00001", traffic, "07:30", override), 5);
  assert.equal(preview.t_free_s, 12);
  assert.equal(preview.congestion_factor, 2.5);
  assert.equal(preview.weight_distance_m, 120);
  assert.equal(preview.weight_time_s, 30);
  assert.equal(preview.penalty_total_s, 85);
  assert.equal(preview.weight_balanced_s, 115);
});

test("speed, distance, congestion, and risk presets change edge time predictably", () => {
  const slow = edgeCostBreakdown(edge, traffic, "07:30", {
    edge_id: edge.id, free_speed_kmh: 20,
  });
  const fast = edgeCostBreakdown(edge, traffic, "07:30", {
    edge_id: edge.id, free_speed_kmh: 50,
  });
  const longer = edgeCostBreakdown(edge, traffic, "07:30", {
    edge_id: edge.id, length_m: 150,
  });
  const congestedAndRisky = edgeCostBreakdown(edge, traffic, "07:30", {
    edge_id: edge.id,
    congestion: { "07:30": 5 },
    risk: { construction: 1 },
  });

  assert.ok(fast.t_free_s < slow.t_free_s, "higher speed must reduce free-flow time");
  assert.ok(longer.t_free_s > edge.free_travel_time_s, "longer distance must take more time");
  assert.equal(longer.weight_distance_m, 150);
  assert.ok(congestedAndRisky.weight_balanced_s > slow.weight_balanced_s);
  assert.equal(congestedAndRisky.penalty_construction_s, 90);
});

test("scenario cost golden fixture matches the backend product formula", () => {
  const preview = edgeCostBreakdown(golden.edge, {}, "07:30", {
    edge_id: golden.edge.id,
    congestion: { "07:30": golden.congestion },
  });

  for (const [field, expected] of Object.entries(golden.expected)) {
    assert.equal(preview[field], expected);
  }
});
