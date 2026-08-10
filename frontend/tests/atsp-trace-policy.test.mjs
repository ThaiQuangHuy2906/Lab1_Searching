import assert from "node:assert/strict";
import test from "node:test";

import {
  activeTimelineLength,
  atspInputsChanged,
  classifySaMove,
  conceptualOptimizationOrder,
  deliveryMarkerOrder,
  heldKarpHighlightIds,
  isOptimizationFinalEvent,
  mapControlsBottomClass,
  optimizationTraceChangePatch,
  saAcceptanceProbability,
} from "../lib/atsp-trace-policy.ts";
import {
  ATSP_METHOD_EXPLANATION,
  ATSP_METHOD_LABEL,
} from "../components/atsp/atsp-copy.ts";

const routeTrace = { trace: [{ step: 1 }, { step: 2 }] };
const optimizationTrace = { events: [{ ordinal: 0 }, { ordinal: 3 }, { ordinal: 7 }] };

test("closing Start is never exposed as a delivery marker", () => {
  assert.deepEqual(deliveryMarkerOrder(["s", "a", "b"], "s", false), ["a", "b"]);
  assert.deepEqual(deliveryMarkerOrder(["s", "a", "b", "s"], "s", true), ["a", "b"]);
});

test("route timeline stays visible on G_real and ATSP keeps its own source", () => {
  assert.equal(activeTimelineLength("route", routeTrace, optimizationTrace, "real", false), 2);
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
    returnToStart: false,
    includeOptimizationTrace: false,
  };

  assert.equal(atspInputsChanged(current, { tspMethod: "nn_2opt" }), true);
  assert.equal(atspInputsChanged(current, { tspMethod: "held_karp" }), false);
  assert.equal(atspInputsChanged(current, { returnToStart: true }), true);
  assert.equal(atspInputsChanged(current, { includeOptimizationTrace: true }), true);
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

test("conceptual optimizer paths distinguish SA current state from best-so-far", () => {
  assert.deepEqual(conceptualOptimizationOrder({
    kind: "held_karp_update",
    predecessor: "depot",
    endpoint: "b",
  }), ["depot", "b"]);
  assert.deepEqual(conceptualOptimizationOrder({
    kind: "sa_seed_boundary",
    current_order: ["depot", "current"],
    best_order: ["depot", "best"],
  }), ["depot", "current"]);
  assert.deepEqual(conceptualOptimizationOrder({
    kind: "sa_iteration",
    resulting_order: ["depot", "accepted-state"],
    best_order: ["depot", "best"],
  }), ["depot", "accepted-state"]);
});

test("SA presentation uses the implementation's exact Metropolis semantics", () => {
  assert.equal(classifySaMove(-1, true), "accepted_non_worse");
  assert.equal(classifySaMove(3, true), "accepted_worse");
  assert.equal(classifySaMove(3, false), "rejected_worse");
  assert.equal(saAcceptanceProbability(-1, 5.2), 1);
  assert.ok(Math.abs(saAcceptanceProbability(3, 5.2) - Math.exp(-3 / 5.2)) < 1e-12);
});

test("NN method copy names both local-improvement neighborhoods", () => {
  assert.equal(ATSP_METHOD_LABEL.nn_2opt, "NN + 2-opt/Or-opt");
  assert.match(ATSP_METHOD_EXPLANATION.nn_2opt, /2-opt/);
  assert.match(ATSP_METHOD_EXPLANATION.nn_2opt, /Or-opt/);
});

test("map controls move above a visible timeline instead of sharing its bottom band", () => {
  assert.equal(mapControlsBottomClass(false), "bottom-10");
  assert.equal(mapControlsBottomClass(true), "bottom-[5.5rem]");
});
