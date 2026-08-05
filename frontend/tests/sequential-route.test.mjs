import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeSequentialRouteTraces,
  sequentialWaypoints,
} from "../lib/sequential-route.ts";

function makeTrace({
  start, goal, cost, distance, time, expanded, frontier, steps = 1,
  found = true, fingerprint = "scenario-1",
}) {
  return {
    algorithm: "astar",
    mode: "time",
    time_slot: "07:30",
    graph: "demo",
    applied_scenario: {
      graph_view: "full",
      override_count: 0,
      fingerprint,
      provenance: "base",
    },
    found,
    path: found ? [start, `${start}-${goal}`, goal] : [],
    metrics: {
      total_cost: found ? cost : null,
      total_distance_m: found ? distance : null,
      total_time_s: found ? time : null,
      nodes_expanded: expanded,
      max_frontier: frontier,
      runtime_ms: expanded / 10,
      optimal_guarantee: true,
      trace_truncated: false,
    },
    trace: Array.from({ length: steps }, (_, index) => ({
      step: index + 1,
      expanded: index === steps - 1 ? goal : start,
      frontier: [],
      g: null,
      h: null,
      f: null,
    })),
    explanation: {
      summary_vi: found ? "Đã tìm thấy." : "Không tìm thấy.",
      congested_segments: found
        ? [{ edge: `${start}-${goal}`, name: null, level: 3 }]
        : [],
      alternatives: [],
    },
  };
}

test("waypoints use start + goal for two points and start + ordered stops for multi-point", () => {
  assert.deepEqual(sequentialWaypoints("A", "B", []), ["A", "B"]);
  assert.deepEqual(sequentialWaypoints("A", null, ["B", "C", "D"]), ["A", "B", "C", "D"]);
});

test("multi-point traces become one continuous path, timeline, and total", () => {
  const traces = [
    makeTrace({ start: "A", goal: "B", cost: 10, distance: 100, time: 20,
      expanded: 4, frontier: 3, steps: 2 }),
    makeTrace({ start: "B", goal: "C", cost: 15, distance: 120, time: 25,
      expanded: 6, frontier: 5, steps: 3 }),
    makeTrace({ start: "C", goal: "D", cost: 8, distance: 80, time: 12,
      expanded: 3, frontier: 2, steps: 1 }),
  ];

  const result = mergeSequentialRouteTraces(
    ["A", "B", "C", "D"], traces, (id) => `Điểm ${id}`, "A*",
  );

  assert.equal(result.trace.found, true);
  assert.deepEqual(result.trace.path, [
    "A", "A-B", "B", "B-C", "C", "C-D", "D",
  ]);
  assert.deepEqual(result.trace.trace.map((step) => step.step), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(result.trace.metrics, {
    total_cost: 33,
    total_distance_m: 300,
    total_time_s: 57,
    nodes_expanded: 13,
    max_frontier: 5,
    runtime_ms: 1.3,
    optimal_guarantee: true,
    epsilon_bound: undefined,
    beam_width: undefined,
    trace_truncated: false,
  });
  assert.deepEqual(result.run.legs.map((leg) => [leg.trace_start, leg.trace_end]), [
    [0, 1], [2, 4], [5, 5],
  ]);
  assert.match(result.trace.explanation.summary_vi, /3 chặng/);
  assert.match(result.trace.explanation.summary_vi, /Điểm A → Điểm B → Điểm C → Điểm D/);
});

test("a failed leg stops the combined route and keeps its search effort", () => {
  const result = mergeSequentialRouteTraces(["A", "B", "C"], [
    makeTrace({ start: "A", goal: "B", cost: 10, distance: 100, time: 20,
      expanded: 4, frontier: 3 }),
    makeTrace({ start: "B", goal: "C", cost: 0, distance: 0, time: 0,
      expanded: 9, frontier: 6, found: false }),
  ], (id) => id, "A*");

  assert.equal(result.trace.found, false);
  assert.deepEqual(result.trace.path, []);
  assert.equal(result.trace.metrics.total_cost, null);
  assert.equal(result.trace.metrics.nodes_expanded, 13);
  assert.match(result.trace.explanation.summary_vi, /chặng 2: B → C/);
});

test("traces from different scenarios cannot be merged", () => {
  assert.throws(() => mergeSequentialRouteTraces(["A", "B", "C"], [
    makeTrace({ start: "A", goal: "B", cost: 1, distance: 1, time: 1,
      expanded: 1, frontier: 1, fingerprint: "one" }),
    makeTrace({ start: "B", goal: "C", cost: 1, distance: 1, time: 1,
      expanded: 1, frontier: 1, fingerprint: "two" }),
  ]), /graph scenario/);
});
