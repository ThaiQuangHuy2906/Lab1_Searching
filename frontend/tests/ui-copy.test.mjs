import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { routeGuaranteeLabel } from "../lib/algorithm-policy.ts";
import {
  describeOptimizationEvent,
  optimizationSamplingLabel,
} from "../lib/atsp-event-copy.ts";
import {
  formatOutcomeMetricValue,
  isDistanceOutcomeMetric,
  outcomeMetricsForMode,
  presentationEpsilonToRaw,
  presentRouteNarrative,
  primaryOutcomeMetric,
  rawEpsilonToPresentation,
} from "../lib/metric-presentation.ts";
import { MODE_PRESENTATION } from "../lib/ui-copy.ts";

test("timeline slider exposes its accessible name on the focusable thumb", () => {
  const source = readFileSync(
    new URL("../components/ui/slider.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /"aria-label": ariaLabel/);
  assert.match(source, /<SliderPrimitive\.Thumb[\s\S]*aria-label=\{ariaLabel\}/);
});

test("mode presentation keeps all visible cost units in km or minutes", () => {
  assert.equal(MODE_PRESENTATION.distance.unit, "km");
  assert.equal(MODE_PRESENTATION.time.unit, "phút");
  assert.equal(MODE_PRESENTATION.balanced.unit, "phút");
  assert.equal(routeGuaranteeLabel("astar", true, null, "giây"), "Đảm bảo tối ưu");
  assert.equal(routeGuaranteeLabel("idastar", true, 2.5, "mét"), "Tối ưu trong ε = 2,5 mét");
  assert.equal(routeGuaranteeLabel("beam", false, null, "giây"), "Không đảm bảo tối ưu");
});

test("outcome metrics stay mode-aware and never duplicate balanced path weight", () => {
  assert.deepEqual(
    outcomeMetricsForMode("balanced").map(({ key, label }) => [key, label]),
    [["total_cost", "Chi phí cân bằng"], ["total_distance_m", "Quãng đường"]],
  );
  assert.deepEqual(
    outcomeMetricsForMode("time").map(({ key, label }) => [key, label]),
    [["total_cost", "Thời gian ước tính theo ùn tắc"], ["total_distance_m", "Quãng đường"]],
  );
  assert.deepEqual(
    outcomeMetricsForMode("distance").map(({ key, label }) => [key, label]),
    [["total_cost", "Quãng đường"]],
  );
  for (const mode of ["distance", "time", "balanced"]) {
    assert.equal(outcomeMetricsForMode(mode).some(({ key }) => key === "total_time_s"), false);
  }

  const distancePrimary = primaryOutcomeMetric("distance");
  assert.equal(distancePrimary.key, "total_cost");
  assert.equal(isDistanceOutcomeMetric(distancePrimary), true);
  assert.equal(isDistanceOutcomeMetric(primaryOutcomeMetric("time")), false);
});

test("route outcomes and backend narrative use only km and minutes on screen", () => {
  assert.equal(formatOutcomeMetricValue(primaryOutcomeMetric("distance"), 1330), "1,33 km");
  assert.equal(formatOutcomeMetricValue(primaryOutcomeMetric("time"), 254), "4,2 phút");
  assert.equal(rawEpsilonToPresentation("distance", 5), 0.005);
  assert.equal(rawEpsilonToPresentation("time", 6), 0.1);
  assert.equal(presentationEpsilonToRaw("distance", 0.005), 5);
  assert.equal(presentationEpsilonToRaw("time", 0.1), 6);
  assert.equal(
    presentRouteNarrative("BFS (tìm theo bề rộng) có 254 s ≈ 4,2 phút; chậm hơn ~90 s, chi phí 0 giây và lệch 5 m."),
    "BFS có 4,2 phút; chậm hơn ~1,5 phút, chi phí 0 phút và lệch 0,005 km.",
  );
});

test("Explain UI identifies post-run references without forbidden claims", () => {
  const source = readFileSync(
    new URL("../components/explanation/route-explanation.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /Tuyến tham chiếu được hệ thống tính thêm sau khi chạy/);
  assert.doesNotMatch(source, /Tuyến thay thế đã xét/);
  assert.doesNotMatch(source, /vì sao bị loại/);
  assert.match(source, /Hậu kiểm bằng UCS/);
  assert.match(source, /relation_to_selected/);
  assert.match(source, /Đường đỏ trên bản đồ.*ùn tắc mức 4–5.*không phải đường thuật toán/);
});

test("ATSP result presents open and closed tours from the echoed topology", () => {
  const source = readFileSync(
    new URL("../components/atsp/atsp-result.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /multi\.contract_version === 2 && multi\.return_to_start/);
  assert.match(source, /\[\.\.\.multi\.order, multi\.order\[0\]\]/);
  assert.match(source, /Vòng kín: bắt đầu tại điểm Đi và quay về điểm Đi/);
  assert.match(source, /Hành trình mở: bắt đầu tại điểm Đi và kết thúc ở điểm giao cuối/);
  assert.match(source, /Quay về điểm Đi/);
});

test("benchmark page presents the validated official artifact provenance", () => {
  const source = readFileSync(
    new URL("../app/benchmark/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /KẾT QUẢ CHÍNH THỨC/);
  assert.match(source, /results\/README\.md/);
  assert.doesNotMatch(source, /SỐ TẠM/);
  assert.doesNotMatch(source, /artifact lịch sử/);
});

test("every optimization event has a Vietnamese presentation separate from raw fields", () => {
  const events = [
    { kind: "held_karp_update", ordinal: 1, subset: ["a", "b"], endpoint: "b", predecessor: "a", candidate_cost: 4, previous_cost: null, new_cost: 4 },
    { kind: "held_karp_reconstruct", ordinal: 2, order: ["a", "b"], total_cost: 4 },
    { kind: "nn_decision", ordinal: 3, current: "a", candidates: [{ node: "b", cost: 4 }], selected: "b", order: ["a", "b"] },
    { kind: "local_improvement", ordinal: 4, move_type: "2_opt", i: 1, j: 2, segment_length: 2, before_order: ["a", "c", "b"], before_cost: 8, after_order: ["a", "b", "c"], after_cost: 6, rejected_candidates_since_previous: 0 },
    { kind: "sa_seed_boundary", ordinal: 5, boundary: "start", seed: 0, iteration: 0, temperature: 10, current_order: ["a", "b"], current_cost: 4, best_order: ["a", "b"], best_cost: 4 },
    { kind: "sa_iteration", ordinal: 6, sample_reason: "periodic", seed: 0, iteration: 20, temperature: 4, current_order: ["a", "b"], current_cost: 4, candidate_order: ["a", "c"], candidate_cost: 5, delta: 1, accepted: false, resulting_order: ["a", "b"], resulting_cost: 4, best_order: ["a", "b"], best_cost: 4 },
    { kind: "sa_final_best", ordinal: 7, final_order: ["a", "b"], final_cost: 4, optimizer_stats: { seeds: [], best_seed: 0, best_cost: 4, mean_best_cost: 4, stddev_best_cost: 0 } },
    { kind: "optimization_summary", ordinal: 8, method: "sa", final_order: ["a", "b"], final_cost: 4 },
  ];
  const nameOf = (nodeId) => ({ a: "Điểm A", b: "Điểm B", c: "Điểm C" })[nodeId] ?? nodeId;

  for (const event of events) {
    const presentation = describeOptimizationEvent(event, nameOf);
    assert.ok(presentation.title.length > 0, event.kind);
    assert.ok(presentation.description.length > 0, event.kind);
    assert.notEqual(presentation.title, event.kind, event.kind);
    assert.ok(["order", "set"].includes(presentation.notation), event.kind);
  }

  const heldKarp = describeOptimizationEvent(events[0], nameOf);
  assert.deepEqual(heldKarp.sequence, ["Điểm A", "Điểm B"]);
  assert.equal(heldKarp.notation, "set");
  const sa = describeOptimizationEvent(events[5], nameOf);
  assert.match(sa.description, /bị từ chối/);
  assert.match(describeOptimizationEvent(events[3], nameOf, "time").description, /0,1 phút/);
  assert.match(describeOptimizationEvent(events[6], nameOf, "distance").description, /0,004 km/);
});

test("sampling policies are explained without exposing implementation identifiers", () => {
  assert.match(optimizationSamplingLabel("all-or-stride-v1"), /lấy mẫu/);
  assert.match(optimizationSamplingLabel("chronological-prefix-final-v1"), /mốc cuối/);
  assert.match(optimizationSamplingLabel("priority-periodic-20-v1"), /20 vòng/);
});
