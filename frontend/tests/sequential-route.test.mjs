import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeSequentialRouteTraces,
  sampleSequentialTrace,
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
  assert.deepEqual(sequentialWaypoints("two_point", "A", "B", []), ["A", "B"]);
  assert.deepEqual(sequentialWaypoints("multi_point", "A", null, ["B", "C", "D"]), ["A", "B", "C", "D"]);
  assert.deepEqual(sequentialWaypoints("multi_point", "A", null, ["B", "C"], true), ["A", "B", "C", "A"]);
  assert.deepEqual(sequentialWaypoints("multi_point", "A", null, ["B", "C", "A"], true), ["A", "B", "C", "A"]);
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

test("closed ordered route has exactly one labelled closing leg and merges its totals", () => {
  const waypoints = sequentialWaypoints("multi_point", "A", null, ["B", "C"], true);
  const result = mergeSequentialRouteTraces(waypoints, [
    makeTrace({ start: "A", goal: "B", cost: 10, distance: 100, time: 20,
      expanded: 1, frontier: 1 }),
    makeTrace({ start: "B", goal: "C", cost: 20, distance: 200, time: 30,
      expanded: 1, frontier: 1 }),
    makeTrace({ start: "C", goal: "A", cost: 30, distance: 300, time: 40,
      expanded: 1, frontier: 1 }),
  ]);
  assert.equal(result.run.returnToStart, true);
  assert.deepEqual(result.run.legs.map((leg) => leg.closing_leg), [false, false, true]);
  assert.match(result.run.legs[2].label, /về Đi/);
  assert.equal(result.trace.metrics.total_cost, 60);
  assert.equal(result.trace.metrics.total_distance_m, 600);
  assert.equal(result.trace.metrics.total_time_s, 90);
});

test("failed closing leg is identified specifically and keeps per-leg evidence", () => {
  const result = mergeSequentialRouteTraces(["A", "B", "A"], [
    makeTrace({ start: "A", goal: "B", cost: 10, distance: 100, time: 20,
      expanded: 1, frontier: 1 }),
    makeTrace({ start: "B", goal: "A", cost: 0, distance: 0, time: 0,
      expanded: 2, frontier: 1, found: false }),
  ]);
  assert.equal(result.run.legs[1].closing_leg, true);
  assert.equal(result.run.legs[1].explanation.summary_vi, "Không tìm thấy.");
  assert.match(result.trace.explanation.summary_vi, /chặng cuối về Đi/);
});

test("presentation sampler reserves boundaries and uses proportional largest remainders", () => {
  const traces = [
    makeTrace({ start: "A", goal: "B", cost: 1, distance: 1, time: 1,
      expanded: 1, frontier: 1, steps: 8 }),
    makeTrace({ start: "B", goal: "C", cost: 1, distance: 1, time: 1,
      expanded: 1, frontier: 1, steps: 5 }),
    makeTrace({ start: "C", goal: "D", cost: 1, distance: 1, time: 1,
      expanded: 1, frontier: 1, steps: 3 }),
  ];
  const sampled = sampleSequentialTrace(traces, 10);
  assert.equal(sampled.meta.sourceRecordedSteps, 16);
  assert.equal(sampled.meta.presentedSteps, 10);
  assert.equal(sampled.meta.presentationSampled, true);
  assert.deepEqual(
    sampled.steps.map(({ source }) => [source.legIndex, source.sourceStepIndex]),
    [
      [0, 0], [0, 1], [0, 3], [0, 5], [0, 7],
      [1, 0], [1, 2], [1, 4],
      [2, 0], [2, 2],
    ],
  );
});

test("source truncation and presentation sampling remain independent metadata", () => {
  const first = makeTrace({ start: "A", goal: "B", cost: 1, distance: 1, time: 1,
    expanded: 1, frontier: 1, steps: 3 });
  first.metrics.trace_truncated = true;
  const second = makeTrace({ start: "B", goal: "C", cost: 1, distance: 1, time: 1,
    expanded: 1, frontier: 1, steps: 2 });
  const unsampled = sampleSequentialTrace([first, second], 5);
  assert.equal(unsampled.meta.presentationSampled, false);
  assert.equal(unsampled.meta.sourceTraceTruncated, true);
  assert.deepEqual(unsampled.meta.sourceTruncatedLegIndexes, [0]);
  const sampled = sampleSequentialTrace([first, second], 4);
  assert.equal(sampled.meta.presentationSampled, true);
  assert.equal(sampled.meta.sourceTraceTruncated, true);
});

test("15 stops support 15 open legs or 16 closed legs without changing full metrics", () => {
  const stops = Array.from({ length: 15 }, (_, index) => `S${index + 1}`);
  const open = sequentialWaypoints("multi_point", "A", null, stops, false);
  const closed = sequentialWaypoints("multi_point", "A", null, stops, true);
  assert.equal(open.length - 1, 15);
  assert.equal(closed.length - 1, 16);
  assert.equal(closed.filter((node) => node === "A").length, 2);
});
