import assert from "node:assert/strict";
import test from "node:test";

import {
  atspComputationRows,
  atspMethodStatsLabels,
  costBreakdownRows,
  exactOptimalityGap,
  rawEquivalent,
} from "../lib/metric-presentation.ts";

const breakdown = {
  distance_m: 100,
  free_flow_time_s: 10,
  congestion_adjusted_time_s: 15,
  congestion_delay_s: 5,
  penalty_flood_s: 60,
  penalty_construction_s: 0,
  penalty_narrow_alley_s: 0,
  penalty_traffic_light_s: 0,
  risk_penalty_total_s: 60,
  balanced_cost_s: 75,
};

test("distance/time/balanced rows mark only facts that affect the active objective", () => {
  const distance = costBreakdownRows("distance", breakdown);
  assert.deepEqual(distance.filter((row) => row.affectsObjective).map((row) => row.key), ["distance_m"]);
  const time = costBreakdownRows("time", breakdown);
  assert.deepEqual(time.filter((row) => row.affectsObjective).map((row) => row.key), [
    "congestion_adjusted_time_s", "congestion_delay_s",
  ]);
  const balanced = costBreakdownRows("balanced", breakdown);
  assert.deepEqual(balanced.filter((row) => row.affectsObjective).map((row) => row.key), [
    "congestion_adjusted_time_s", "congestion_delay_s", "risk_penalty_total_s", "balanced_cost_s",
  ]);
  assert.equal(balanced.find((row) => row.key === "balanced_cost_s").label, "Chi phí cân bằng");
  assert.doesNotMatch(balanced.find((row) => row.key === "balanced_cost_s").label, /ETA|di chuyển/i);
});

test("ATSP computation effort stays in milliseconds and never masquerades as travel time", () => {
  const rows = atspComputationRows({
    matrix_search_runs: 4, matrix_nodes_expanded: 100,
    matrix_runtime_ms: 4, optimizer_runtime_ms: 2, total_runtime_ms: 7,
  });
  assert.deepEqual(rows.filter((row) => row.unit === "ms").map((row) => row.key), [
    "matrix_runtime_ms", "optimizer_runtime_ms", "total_runtime_ms",
  ]);
  assert.equal(rows.some((row) => /ETA|ùn tắc/.test(row.label)), false);
});

test("method stats include SA equal moves and sample-standard-deviation terminology", () => {
  const labels = atspMethodStatsLabels({ kind: "simulated_annealing" });
  assert.ok(labels.some((label) => /bằng nhau/.test(label)));
  assert.ok(labels.some((label) => /lệch chuẩn mẫu/.test(label)));
});

test("exact gap uses raw tolerance and handles zero denominator without fabricating zero", () => {
  assert.equal(rawEquivalent(10, 10 + 5e-7), true);
  assert.deepEqual(exactOptimalityGap(10 + 5e-7, 10), { raw: 0, pct: 0 });
  assert.deepEqual(exactOptimalityGap(0, 0), { raw: 0, pct: 0 });
  assert.deepEqual(exactOptimalityGap(1, 0), { raw: 1, pct: null });
  assert.equal(exactOptimalityGap(null, 0), null);
  assert.equal(exactOptimalityGap(9, 10), null);
});
