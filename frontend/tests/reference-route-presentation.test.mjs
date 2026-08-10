import assert from "node:assert/strict";
import test from "node:test";

import {
  referenceComparisonRows,
  referenceKindLabel,
  referenceTradeoffConclusion,
} from "../lib/reference-route-presentation.ts";

const breakdown = {
  distance_m: 2_000,
  free_flow_time_s: 240,
  congestion_adjusted_time_s: 360,
  congestion_delay_s: 120,
  penalty_flood_s: 30,
  penalty_construction_s: 0,
  penalty_narrow_alley_s: 0,
  penalty_traffic_light_s: 30,
  risk_penalty_total_s: 60,
  balanced_cost_s: 420,
};

function reference(overrides = {}) {
  return {
    id: "ref-1",
    kind: "distance_optimum",
    provenance: "posthoc_ucs",
    generated_for_mode: "distance",
    excluded_edge: null,
    path: ["n1", "n3", "n2"],
    metrics: { total_cost: 540, total_distance_m: 1_500, total_time_s: 540 },
    cost_breakdown: {
      ...breakdown,
      distance_m: 1_500,
      congestion_adjusted_time_s: 450,
      congestion_delay_s: 210,
      risk_penalty_total_s: 90,
      balanced_cost_s: 540,
    },
    reference_minus_selected_cost: 120,
    reference_minus_selected_pct: 28.57,
    reference_minus_selected_distance_m: -500,
    reference_minus_selected_balanced_cost_s: 120,
    relation_to_selected: "worse",
    ...overrides,
  };
}

test("comparison rows mark every fact that contributes to the active objective", () => {
  const rows = referenceComparisonRows("balanced", breakdown, reference().cost_breakdown);
  assert.equal(rows.length, 5);
  assert.deepEqual(rows.filter((row) => row.affectsObjective).map((row) => row.key), [
    "traffic_time", "congestion_delay", "risk", "balanced",
  ]);
  assert.equal(rows.find((row) => row.key === "distance").referenceValue, 1_500);
  assert.equal(rows.find((row) => row.key === "congestion_delay").referenceValue, 210);
});

test("balanced trade-off says shorter does not mean better for the active objective", () => {
  const text = referenceTradeoffConclusion("astar", "balanced", "exact", reference());
  assert.match(text, /ngắn hơn 0,50 km/);
  assert.match(text, /chi phí cân bằng cao hơn 2 phút/);
  assert.match(text, /đang tối ưu chi phí cân bằng/);
  assert.match(text, /A\* có bảo đảm tối ưu/);
});

test("a better posthoc route uses algorithm-specific non-optimal wording", () => {
  const text = referenceTradeoffConclusion("dfs", "balanced", "feasible_unproven", reference({
    reference_minus_selected_cost: -180,
    reference_minus_selected_pct: -30,
    reference_minus_selected_distance_m: -700,
    reference_minus_selected_balanced_cost_s: -180,
    relation_to_selected: "better",
  }));
  assert.match(text, /tuyến tham chiếu.*thấp hơn 3 phút/);
  assert.match(text, /DFS trả tuyến đầu tiên/);
  assert.doesNotMatch(text, /DFS.*bảo đảm tối ưu/);
});

test("reference kinds are localized instead of exposing schema enums", () => {
  assert.equal(referenceKindLabel("same_objective_optimum"), "Tuyến tối ưu cùng tiêu chí");
  assert.equal(referenceKindLabel("avoid_edge_counterfactual"), "Tuyến tránh một đoạn của tuyến hiện tại");
});
