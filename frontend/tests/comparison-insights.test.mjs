import assert from "node:assert/strict";
import test from "node:test";

import {
  atspComparisonInsights,
  routeComparisonInsights,
} from "../lib/comparison-insights.ts";

const FINGERPRINT = `scenario-v1:${"e".repeat(64)}`;
const snapshot = { returnToStart: false };

function route(id, cost, { quality = "exact", path = ["A", "B"], fingerprint = FINGERPRINT } = {}) {
  return {
    kind: "route", id, runId: 1, snapshot, capability: "v2",
    scenarioFingerprint: fingerprint,
    response: {
      contract_version: 2,
      found: true,
      path,
      metrics: { total_cost: cost },
      termination: { solution_quality: quality },
    },
  };
}

function atsp(id, cost, guaranteed, fingerprint = FINGERPRINT) {
  return {
    kind: "atsp", id, runId: 1, snapshot, capability: "v2",
    scenarioFingerprint: fingerprint,
    response: {
      contract_version: 2, found: true, totals: { total_cost: cost },
      optimal_guarantee: guaranteed,
    },
  };
}

test("two exact route results agree only within raw tolerance", () => {
  const agreed = routeComparisonInsights([
    route("ucs", 10), route("astar", 10 + 5e-7),
  ]);
  assert.equal(agreed[0].kind, "exact_agreement");

  const disagreed = routeComparisonInsights([
    route("ucs", 10), route("astar", 10.01),
  ]);
  assert.equal(disagreed[0].kind, "exact_disagreement");
  assert.equal(disagreed[0].severity, "error");
});

test("same objective with different path is stated without upgrading a heuristic guarantee", () => {
  const insights = routeComparisonInsights([
    route("ucs", 10),
    route("greedy", 10, { quality: "feasible_unproven", path: ["A", "C", "B"] }),
  ]);
  assert.ok(insights.some((insight) => insight.kind === "same_cost_different_path"));
  assert.equal(insights.some((insight) => (
    insight.message.includes("greedy") && insight.message.includes("exact")
  )), false);
});

test("without exact evidence the presenter says best-displayed, not global optimum", () => {
  const insights = routeComparisonInsights([
    route("beam", 12, { quality: "feasible_unproven" }),
    route("greedy", 10, { quality: "feasible_unproven" }),
  ]);
  const best = insights.find((insight) => insight.kind === "best_displayed");
  assert.deepEqual(best.resultIds, ["greedy"]);
  assert.match(best.message, /không phải global optimality gap/);
});

test("ordered aggregate uses immutable per-leg quality instead of its local legacy shape", () => {
  const ordered = (id, cost) => {
    const result = route(id, cost);
    const leg = result.response;
    return {
      ...result,
      response: { found: true, path: ["A", "B", "C"], metrics: { total_cost: cost } },
      sourceResponses: [leg, structuredClone(leg)],
    };
  };
  const insights = routeComparisonInsights([ordered("ucs", 20), ordered("astar", 20)]);
  assert.equal(insights[0].kind, "exact_agreement");
});

test("fingerprint mismatch blocks insights before ranking", () => {
  const insights = routeComparisonInsights([
    route("ucs", 10),
    route("astar", 10, { fingerprint: `scenario-v1:${"f".repeat(64)}` }),
  ]);
  assert.equal(insights[0].kind, "contract_integrity");
  assert.equal(insights[0].severity, "error");
});

test("ATSP exact agreement and savings/gap vocabulary stay distinct", () => {
  assert.equal(atspComparisonInsights([
    atsp("held_karp", 10, true), atsp("exact-2", 10 + 5e-7, true),
  ])[0].kind, "exact_agreement");
  const withReference = atspComparisonInsights([
    atsp("held_karp", 10, true), atsp("sa", 12, false),
  ])[0];
  assert.equal(withReference.kind, "best_displayed");
  assert.match(withReference.message, /savings.*không phải optimality gap/i);
});

test("ATSP stops ranking when a heuristic undercuts the exact reference", () => {
  const insight = atspComparisonInsights([
    atsp("held_karp", 10, true), atsp("sa", 9, false),
  ])[0];
  assert.equal(insight.kind, "contract_integrity");
  assert.equal(insight.severity, "error");
  assert.match(insight.message, /dừng xếp hạng.*exact gap/i);
});
