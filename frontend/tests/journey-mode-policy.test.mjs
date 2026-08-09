import assert from "node:assert/strict";
import test from "node:test";

import {
  activeJourneyInputs,
  atspEligibilityReason,
  atspRunBlockReason,
  createRunSnapshot,
  DEFAULT_JOURNEY_STATE,
  isAtspMethodEligible,
  orderedJourneyWaypoints,
  snapshotScenarioRequest,
  transitionJourneyMode,
} from "../lib/journey-mode-policy.ts";

function state() {
  return structuredClone(DEFAULT_JOURNEY_STATE);
}

test("default state is explicit two-point/single and keeps separate drafts", () => {
  assert.deepEqual(state(), {
    problemMode: "two_point",
    multiStrategy: "ordered_search",
    runKind: "single",
    drafts: { start: null, twoPointGoal: null, multiStops: [], returnToStart: false },
  });
});

test("every mode/strategy/run transition has explicit invalidation semantics", () => {
  const original = {
    ...state(),
    drafts: { start: "A", twoPointGoal: "B", multiStops: ["C", "D"], returnToStart: true },
  };
  const toMulti = transitionJourneyMode(original, { type: "problem_mode", value: "multi_point" });
  assert.equal(toMulti.invalidateComputation, true);
  assert.equal(toMulti.abortInFlight, true);
  assert.deepEqual(toMulti.state.drafts, original.drafts);
  assert.deepEqual(activeJourneyInputs(toMulti.state), {
    start: "A", goal: null, stops: ["C", "D"], returnToStart: true,
  });

  const strategy = transitionJourneyMode(toMulti.state, { type: "multi_strategy", value: "atsp" });
  assert.equal(strategy.invalidateComputation, true);
  assert.deepEqual(strategy.state.drafts, original.drafts);

  const compare = transitionJourneyMode(strategy.state, { type: "run_kind", value: "compare" });
  assert.equal(compare.invalidateComputation, true);
  const noOp = transitionJourneyMode(compare.state, { type: "run_kind", value: "compare" });
  assert.equal(noOp.invalidateComputation, false);
  assert.equal(noOp.state, compare.state);
});

test("inactive draft edits are retained without invalidating the active problem", () => {
  let current = state();
  const hiddenStops = transitionJourneyMode(current, { type: "multi_stops", value: ["C"] });
  assert.equal(hiddenStops.invalidateComputation, false);
  assert.deepEqual(hiddenStops.state.drafts.multiStops, ["C"]);
  assert.equal(hiddenStops.state.drafts.twoPointGoal, null);

  current = hiddenStops.state;
  const goal = transitionJourneyMode(current, { type: "two_point_goal", value: "B" });
  assert.equal(goal.invalidateComputation, true);
  assert.deepEqual(goal.state.drafts.multiStops, ["C"]);
  assert.deepEqual(activeJourneyInputs(goal.state), {
    start: null, goal: "B", stops: [], returnToStart: false,
  });
});

test("Goal is never promoted into stops and Start remains shared", () => {
  let current = state();
  current = transitionJourneyMode(current, { type: "start", value: "A" }).state;
  current = transitionJourneyMode(current, { type: "two_point_goal", value: "B" }).state;
  current = transitionJourneyMode(current, { type: "multi_stops", value: ["C"] }).state;
  current = transitionJourneyMode(current, { type: "problem_mode", value: "multi_point" }).state;
  assert.deepEqual(current.drafts, {
    start: "A", twoPointGoal: "B", multiStops: ["C"], returnToStart: false,
  });
});

test("ordered return policy creates one closing leg and never double-appends Start", () => {
  assert.deepEqual(orderedJourneyWaypoints("A", ["B", "C"], false), ["A", "B", "C"]);
  assert.deepEqual(orderedJourneyWaypoints("A", ["B", "C"], true), ["A", "B", "C", "A"]);
  assert.deepEqual(orderedJourneyWaypoints("A", ["B", "C", "A"], true), ["A", "B", "C", "A"]);
});

test("Held-Karp eligibility counts Start while NN/SA allow all 16 points", () => {
  assert.equal(isAtspMethodEligible("held_karp", 14), true);
  assert.equal(isAtspMethodEligible("held_karp", 15), false);
  assert.equal(isAtspMethodEligible("nn_2opt", 15), true);
  assert.equal(isAtspMethodEligible("sa", 16), false);
  assert.match(atspEligibilityReason("held_karp", 15), /16 điểm/);
  assert.match(atspRunBlockReason("A", ["B", "A"], ["sa"]), /unique/);
  assert.match(
    atspRunBlockReason(
      "A", Array.from({ length: 15 }, (_, index) => `S${index}`), ["held_karp"],
    ),
    /16 điểm/,
  );
  assert.equal(atspRunBlockReason("A", ["B", "C"], ["held_karp", "sa"]), null);
});

test("run snapshot deep-copies normalized scenario and hides inactive inputs", () => {
  const scenario = {
    graph_view: "teach_7",
    edge_overrides: [
      { edge_id: "e00002", risk: { flood: 1 }, congestion: { "17:30": 4, "07:30": 2 } },
      { edge_id: "e00001", length_m: 50 },
    ],
  };
  const snapshot = createRunSnapshot({
    graph: "demo", graphView: "teach_7", slot: "07:30", mode: "balanced",
    scenario, problemMode: "two_point", multiStrategy: "atsp", runKind: "compare",
    drafts: { start: "A", twoPointGoal: "B", multiStops: ["C"], returnToStart: true },
    algorithms: ["astar", "beam", "idastar"],
    routeParamsByAlgorithm: { beam: { beam_width: 7 }, idastar: { epsilon: 2 } },
    methods: ["held_karp"], includeRouteTrace: true, includeOptimizationTrace: true,
  });
  scenario.edge_overrides[0].risk.flood = 0;
  scenario.edge_overrides.reverse();

  assert.equal(snapshot.problemMode, "two_point");
  assert.equal(snapshot.multiStrategy, null);
  assert.equal(snapshot.goal, "B");
  assert.deepEqual(snapshot.stops, []);
  assert.equal(snapshot.returnToStart, false);
  assert.deepEqual(snapshot.methods, []);
  assert.equal(snapshot.includeRouteTrace, false);
  assert.equal(snapshot.includeOptimizationTrace, false);
  assert.deepEqual(snapshot.scenario.edge_overrides.map((item) => item.edge_id), ["e00001", "e00002"]);
  assert.equal(snapshot.scenario.edge_overrides[1].risk.flood, 1);
  assert.deepEqual(snapshot.routeParamsByAlgorithm, {
    astar: {}, beam: { beam_width: 7 }, idastar: { epsilon: 2 },
  });
  assert.throws(() => snapshot.stops.push("X"), TypeError);
  assert.deepEqual(snapshotScenarioRequest(snapshot), {
    graph_view: "teach_7",
    edge_overrides: snapshot.scenario.edge_overrides,
  });
});

test("ATSP snapshot uses return flag from draft and comparison disables event trace", () => {
  const snapshot = createRunSnapshot({
    graph: "demo", graphView: "full", slot: "12:00", mode: "time",
    problemMode: "multi_point", multiStrategy: "atsp", runKind: "compare",
    drafts: { start: "A", twoPointGoal: "B", multiStops: ["C", "D"], returnToStart: true },
    algorithms: ["astar"], methods: ["held_karp", "sa"],
    includeRouteTrace: true, includeOptimizationTrace: true,
  });
  assert.equal(snapshot.goal, null);
  assert.deepEqual(snapshot.stops, ["C", "D"]);
  assert.deepEqual(snapshot.algorithms, []);
  assert.deepEqual(snapshot.methods, ["held_karp", "sa"]);
  assert.equal(snapshot.returnToStart, true);
  assert.equal(snapshot.includeOptimizationTrace, false);
  assert.equal(snapshot.scenario, null);
  assert.equal(snapshot.scenarioKey, "null");
});

test("snapshot rejects graph-view drift and duplicate override IDs before any request", () => {
  const base = {
    graph: "demo", graphView: "teach_7", slot: "12:00", mode: "time",
    problemMode: "two_point", multiStrategy: "ordered_search", runKind: "single",
    drafts: { start: "A", twoPointGoal: "B", multiStops: [], returnToStart: false },
    algorithms: ["astar"], methods: [], includeRouteTrace: true,
    includeOptimizationTrace: false,
  };
  assert.throws(() => createRunSnapshot({
    ...base, scenario: { graph_view: "teach_15" },
  }), /graph_view/);
  assert.throws(() => createRunSnapshot({
    ...base,
    scenario: {
      graph_view: "teach_7",
      edge_overrides: [{ edge_id: "e00001" }, { edge_id: "e00001", length_m: 10 }],
    },
  }), /trùng ID/);
});
