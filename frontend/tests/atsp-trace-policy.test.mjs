import assert from "node:assert/strict";
import test from "node:test";

import {
  activeTimelineLength,
  atspInputsChanged,
  heldKarpHighlightIds,
  isOptimizationFinalEvent,
  mapControlsBottomClass,
  optimizationTraceChangePatch,
} from "../lib/atsp-trace-policy.ts";

const routeTrace = { trace: [{ step: 1 }, { step: 2 }] };
const optimizationTrace = { events: [{ ordinal: 0 }, { ordinal: 3 }, { ordinal: 7 }] };

test("ATSP trace owns the shared timeline independently of route-trace visibility", () => {
  assert.equal(activeTimelineLength("route", routeTrace, optimizationTrace, "real", false), 0);
  assert.equal(activeTimelineLength("route", routeTrace, optimizationTrace, "real", true), 2);
  assert.equal(activeTimelineLength("optimization", routeTrace, optimizationTrace, "real", false), 3);
  assert.equal(activeTimelineLength(null, routeTrace, optimizationTrace, "demo", true), 0);
});

test("only a real optimization-trace change resets its player state", () => {
  assert.equal(optimizationTraceChangePatch(null, null), null);
  assert.equal(optimizationTraceChangePatch(optimizationTrace, optimizationTrace), null);
  assert.deepEqual(optimizationTraceChangePatch(null, optimizationTrace), {
    optimizationTrace,
    timelineSource: "optimization",
    stepIdx: 0,
    playing: false,
  });
  assert.deepEqual(optimizationTraceChangePatch(optimizationTrace, null), {
    optimizationTrace: null,
    timelineSource: null,
    stepIdx: 0,
    playing: false,
  });
});

test("changing the selected ATSP method invalidates the existing optimization result", () => {
  const current = {
    start: "n0001",
    stops: ["n0002", "n0003"],
    mode: "balanced",
    slot: "07:30",
    graph: "demo",
    graphView: "full",
    tspMethod: "held_karp",
  };

  assert.equal(atspInputsChanged(current, { tspMethod: "nn_2opt" }), true);
  assert.equal(atspInputsChanged(current, { tspMethod: "held_karp" }), false);
});

test("only optimizer final states replace the conceptual order with real road legs", () => {
  assert.equal(isOptimizationFinalEvent("held_karp_update"), false);
  assert.equal(isOptimizationFinalEvent("nn_decision"), false);
  assert.equal(isOptimizationFinalEvent("held_karp_reconstruct"), true);
  assert.equal(isOptimizationFinalEvent("sa_final_best"), true);
  assert.equal(isOptimizationFinalEvent("optimization_summary"), true);
});

test("a Held–Karp DP update highlights every node in its active subset", () => {
  const event = {
    kind: "held_karp_update",
    subset: ["n0001", "n0005", "n0008"],
    predecessor: "n0001",
    endpoint: "n0008",
  };

  assert.deepEqual(heldKarpHighlightIds(event), ["n0001", "n0005", "n0008"]);
  assert.deepEqual(heldKarpHighlightIds({ kind: "nn_decision" }), []);
  assert.deepEqual(heldKarpHighlightIds(null), []);
});

test("map controls move above a visible timeline instead of sharing its bottom band", () => {
  assert.equal(mapControlsBottomClass(false), "bottom-10");
  assert.equal(mapControlsBottomClass(true), "bottom-[5.5rem]");
});
