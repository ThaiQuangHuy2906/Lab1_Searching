import assert from "node:assert/strict";
import test from "node:test";

import {
  criterionExplanation,
  objectiveTotalLabel,
  presentFactor,
} from "../lib/factor-presentation.ts";

const factor = (kind, affects, raw, unit, source = "cost_breakdown") => ({
  id: kind,
  kind,
  affects_objective: affects,
  source,
  edge_ids: [],
  node_ids: [],
  contribution_raw: raw,
  contribution_unit: unit,
  timeline_step: null,
});

test("factor copy explains the active criterion without backend jargon", () => {
  assert.match(criterionExplanation("balanced"), /phút quy đổi, không phải ETA/);
  assert.match(criterionExplanation("distance"), /tổng số km/);
  assert.equal(objectiveTotalLabel("time"), "Tổng thời gian ước tính");

  const total = presentFactor(factor("objective_truth", true, 120, "s"), "balanced");
  assert.equal(total.status, "Có tính vào tiêu chí");
  assert.equal(total.valueText, "Tổng theo tiêu chí: 2 phút quy đổi");
  assert.doesNotMatch(JSON.stringify(total), /cost_breakdown|objective/i);
});

test("zero exact gap and contextual factors are described plainly", () => {
  const gap = presentFactor(
    factor("optimality_gap", true, 0, "s", "reference_comparison"),
    "balanced",
  );
  assert.equal(gap.valueText, "Bằng tuyến tối ưu tham chiếu");
  assert.match(gap.sourceText, /Đối chiếu hậu kiểm/);

  const flood = presentFactor(factor("flood", false, null, null), "distance");
  assert.equal(flood.status, "Chỉ để tham khảo");
  assert.equal(flood.valueText, null);
});
