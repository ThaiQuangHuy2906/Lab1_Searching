import assert from "node:assert/strict";
import test from "node:test";

import { createRunSnapshot } from "../lib/journey-mode-policy.ts";
import {
  createRunLifecycle,
  executeItemsSequentially,
  isFatalContractError,
  multirouteRequestFromSnapshot,
  routeRequestFromSnapshot,
} from "../lib/run-orchestrator.ts";

test("contract errors are fatal while ordinary item errors remain partial", () => {
  const contract = new Error("malformed v2");
  contract.code = "CONTRACT_ERROR";
  assert.equal(isFatalContractError(contract), true);
  assert.equal(isFatalContractError(new Error("HTTP 500")), false);
  assert.equal(isFatalContractError({ code: "CONTRACT_ERROR" }), false);
});

function routeSnapshot() {
  return createRunSnapshot({
    graph: "demo", graphView: "teach_7", slot: "17:30", mode: "distance",
    scenario: {
      graph_view: "teach_7",
      edge_overrides: [{ edge_id: "e00001", length_m: 10 }],
    },
    problemMode: "multi_point", multiStrategy: "ordered_search", runKind: "compare",
    drafts: {
      start: "A", twoPointGoal: "Z", multiStops: ["B", "C"], returnToStart: true,
    },
    algorithms: ["beam", "idastar"], methods: [],
    routeParamsByAlgorithm: { beam: { beam_width: 7 }, idastar: { epsilon: 3 } },
    includeRouteTrace: true, includeOptimizationTrace: true,
  });
}

test("comparison items execute sequentially and one ordinary error does not stop later items", async () => {
  const lifecycle = createRunLifecycle();
  const handle = lifecycle.begin();
  const calls = [];
  const updates = [];
  await executeItemsSequentially({
    ids: ["astar", "beam", "ucs"],
    handle,
    isCurrent: lifecycle.isCurrent,
    execute: async (id) => {
      calls.push(id);
      if (id === "beam") throw new Error("HTTP 500");
      return { found: id !== "ucs" };
    },
    classify: (value) => value.found ? "success" : "no_path",
    onUpdate: (update) => updates.push([update.id, update.status]),
  });
  assert.deepEqual(calls, ["astar", "beam", "ucs"]);
  assert.deepEqual(updates, [
    ["astar", "running"], ["astar", "success"],
    ["beam", "running"], ["beam", "error"],
    ["ucs", "running"], ["ucs", "no_path"],
  ]);
});

test("abort plus runId guard discards an old response and cancels remaining slots", async () => {
  const lifecycle = createRunLifecycle();
  const handle = lifecycle.begin();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const updates = [];
  const work = executeItemsSequentially({
    ids: ["astar", "ucs"],
    handle,
    isCurrent: lifecycle.isCurrent,
    execute: async () => pending,
    classify: () => "success",
    onUpdate: (update) => updates.push([update.id, update.status]),
  });
  lifecycle.invalidate();
  release({ found: true });
  await work;
  assert.deepEqual(updates, [
    ["astar", "running"], ["astar", "cancelled"], ["ucs", "cancelled"],
  ]);
  assert.equal(lifecycle.isCurrent(handle.runId), false);
});

test("route request is built only from immutable snapshot with comparison trace disabled", () => {
  const request = routeRequestFromSnapshot(routeSnapshot(), "beam", "B", "C");
  assert.deepEqual(request, {
    start: "B", goal: "C", algorithm: "beam", mode: "distance",
    time_slot: "17:30", graph: "demo", include_trace: false,
    params: { beam_width: 7 },
    scenario: {
      graph_view: "teach_7",
      edge_overrides: [{ edge_id: "e00001", length_m: 10 }],
    },
  });
});

test("ATSP request sends the exact immutable return flag and never infers topology from legs", () => {
  const snapshot = createRunSnapshot({
    graph: "demo", graphView: "full", slot: "12:00", mode: "time",
    problemMode: "multi_point", multiStrategy: "atsp", runKind: "single",
    drafts: {
      start: "A", twoPointGoal: null, multiStops: ["B", "C"], returnToStart: true,
    },
    algorithms: [], methods: ["sa"], includeRouteTrace: false,
    includeOptimizationTrace: true,
  });
  assert.deepEqual(multirouteRequestFromSnapshot(snapshot, "sa"), {
    start: "A", stops: ["B", "C"], method: "sa", mode: "time",
    time_slot: "12:00", graph: "demo", return_to_start: true,
    include_trace: true,
  });
});
