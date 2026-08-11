import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ApiContractError,
  isMultirouteV2,
  isTraceV2,
  parseMultirouteResponse,
  parseTraceResponse,
  responseCapability,
} from "../lib/contract-guards.ts";

const FINGERPRINT = `scenario-v1:${"a".repeat(64)}`;

function legacyRoute() {
  return {
    algorithm: "astar",
    mode: "balanced",
    time_slot: "07:30",
    graph: "demo",
    applied_scenario: {
      graph_view: "full", override_count: 0, fingerprint: FINGERPRINT, provenance: "base",
    },
    found: true,
    path: ["n0001", "n0002"],
    metrics: {
      total_cost: 12, total_distance_m: 100, total_time_s: 12,
      nodes_expanded: 2, max_frontier: 1, runtime_ms: 0.2,
      optimal_guarantee: true, trace_truncated: false,
    },
    trace: [{
      step: 1, expanded: "n0002", frontier: [],
      g: {}, h: {}, f: {}, depth_limit: null, side: null,
    }],
    explanation: { summary_vi: "Legacy.", congested_segments: [], alternatives: [] },
  };
}

function v2Route() {
  const payload = legacyRoute();
  return {
    ...payload,
    contract_version: 2,
    trace: [{
      ...payload.trace[0],
      decision: {
        rule: "lowest_f_then_h",
        selected_scores: { g: 12, h: 0, f: 12, depth: null },
        runner_up: null,
        frontier_size_before: 1,
        frontier_size_after: 0,
        neighbors_scanned: 0,
        frontier_added: 0,
        frontier_updated: 0,
        pruned_count: 0,
        iteration: null,
        bound: null,
        layer: null,
        beam_width: null,
        top_forward: null,
        top_backward: null,
        mu_before: null,
      },
      bidirectional_frontiers: null,
    }],
    termination: {
      reason: "goal_expanded", reachability: "route_found",
      solution_quality: "exact", bidirectional_bound: null,
    },
    explanation: {
      ...payload.explanation,
      evidence: {
        selection_rule: "lowest_f_then_h",
        objective: {
          mode: "balanced", selected_value: 12, exact_reference_value: 12,
          optimality_gap: 0, optimality_gap_pct: 0,
        },
        cost_breakdown: {
          distance_m: 100, free_flow_time_s: 10, congestion_adjusted_time_s: 12,
          congestion_delay_s: 2, penalty_flood_s: 0, penalty_construction_s: 0,
          penalty_narrow_alley_s: 0, penalty_traffic_light_s: 0,
          risk_penalty_total_s: 0, balanced_cost_s: 12,
        },
        factors: [],
        reference_routes: [],
      },
    },
  };
}

function v2IdastarRoute() {
  const payload = v2Route();
  const referenceBreakdown = {
    distance_m: 90, free_flow_time_s: 8, congestion_adjusted_time_s: 10,
    congestion_delay_s: 2, penalty_flood_s: 0, penalty_construction_s: 0,
    penalty_narrow_alley_s: 0, penalty_traffic_light_s: 0,
    risk_penalty_total_s: 0, balanced_cost_s: 10,
  };
  payload.algorithm = "idastar";
  payload.metrics.epsilon_bound = 5;
  payload.trace[0].decision.rule = "f_bound_dfs";
  payload.trace[0].decision.iteration = 1;
  payload.trace[0].decision.bound = 12;
  payload.termination.solution_quality = "epsilon_bounded";
  payload.explanation.evidence.selection_rule = "f_bound_dfs";
  payload.explanation.evidence.objective = {
    mode: "balanced", selected_value: 12, exact_reference_value: 10,
    optimality_gap: 2, optimality_gap_pct: 20,
  };
  payload.explanation.evidence.reference_routes = [{
    id: "same-objective-ucs",
    kind: "same_objective_optimum",
    provenance: "posthoc_ucs",
    generated_for_mode: "balanced",
    excluded_edge: null,
    path: ["n0001", "n0002"],
    metrics: { total_cost: 10, total_distance_m: 90, total_time_s: 10 },
    cost_breakdown: referenceBreakdown,
    reference_minus_selected_cost: -2,
    reference_minus_selected_pct: -2 / 12 * 100,
    reference_minus_selected_distance_m: -10,
    reference_minus_selected_balanced_cost_s: -2,
    relation_to_selected: "better",
  }];
  return payload;
}

function legacyMultiroute() {
  return {
    method: "held_karp", mode: "balanced", time_slot: "07:30", graph: "demo",
    applied_scenario: {
      graph_view: "full", override_count: 0, fingerprint: FINGERPRINT, provenance: "base",
    },
    found: true,
    order: ["n0001", "n0002"],
    legs: [{
      from_node: "n0001", to_node: "n0002", path: ["n0001", "n0002"],
      metrics: { total_cost: 12, total_distance_m: 100, total_time_s: 12 },
    }],
    totals: { total_cost: 12, total_distance_m: 100, total_time_s: 12 },
    original_order_totals: { total_cost: 12, total_distance_m: 100, total_time_s: 12 },
    savings_pct: 0,
    optimal_guarantee: true,
    optimization_trace: null,
    optimizer_stats: null,
  };
}

function v2Multiroute() {
  const payload = legacyMultiroute();
  const cost_breakdown = {
    distance_m: 100, free_flow_time_s: 10, congestion_adjusted_time_s: 12,
    congestion_delay_s: 2, penalty_flood_s: 0, penalty_construction_s: 0,
    penalty_narrow_alley_s: 0, penalty_traffic_light_s: 0,
    risk_penalty_total_s: 0, balanced_cost_s: 12,
  };
  const leg = { ...payload.legs[0], cost_breakdown };
  return {
    ...payload,
    contract_version: 2,
    legs: [leg],
    return_to_start: false,
    original_order: ["n0001", "n0002"],
    original_order_legs: [leg],
    totals_breakdown: cost_breakdown,
    original_order_breakdown: cost_breakdown,
    matrix_evidence: {
      point_count: 2, directed_pair_count: 2, reachable_directed_pair_count: 2,
      asymmetric_unordered_pair_count: 0, asymmetry_example: null,
    },
    computation_metrics: {
      matrix_search_runs: 2, matrix_nodes_expanded: 4,
      matrix_runtime_ms: 1, optimizer_runtime_ms: 1, total_runtime_ms: 2,
    },
    failure: null,
    method_stats: { kind: "held_karp", dp_states_solved: 2, transitions_evaluated: 1 },
  };
}

function f1RouteProjection(payload) {
  const { contract_version: _version, termination: _termination, ...legacy } = payload;
  const { evidence: _evidence, ...explanation } = legacy.explanation;
  return { ...legacy, explanation };
}

function f1MultirouteProjection(payload) {
  const legacyKeys = [
    "method", "mode", "time_slot", "graph", "applied_scenario", "found",
    "order", "legs", "totals", "original_order_totals", "savings_pct",
    "optimal_guarantee", "optimization_trace", "optimizer_stats",
  ];
  const projected = Object.fromEntries(legacyKeys.map((key) => [key, payload[key]]));
  projected.legs = projected.legs.map(({ cost_breakdown: _breakdown, ...leg }) => leg);
  return projected;
}

test("the four B1/B2 and F1/F2 compatibility cells preserve legacy outcomes", () => {
  const b1 = legacyRoute();
  const b2 = v2Route();

  assert.deepEqual(f1RouteProjection(b1).path, b1.path); // B1/F1
  assert.deepEqual(f1RouteProjection(b2).metrics, b1.metrics); // B2/F1

  const b1f2 = parseTraceResponse(b1); // B1/F2
  const b2f2 = parseTraceResponse(b2); // B2/F2
  assert.equal(isTraceV2(b1f2), false);
  assert.equal(isTraceV2(b2f2), true);
  assert.equal(responseCapability(b1f2), "v1");
  assert.equal(responseCapability(b2f2), "v2");
  assert.deepEqual(b1f2.path, b2f2.path);
  assert.deepEqual(b1f2.metrics, b2f2.metrics);
});

test("legacy committed mocks remain readable and missing nullable adapter fields are normalized", () => {
  const route = JSON.parse(readFileSync(new URL("../../data/mock/trace_mock.json", import.meta.url)));
  const multi = JSON.parse(readFileSync(new URL("../../data/mock/multiroute_mock.json", import.meta.url)));
  const parsedRoute = parseTraceResponse(route);
  const parsedMulti = parseMultirouteResponse(multi);
  assert.equal(parsedRoute.contract_version, undefined);
  assert.equal(parsedRoute.applied_scenario, null);
  assert.equal(parsedMulti.contract_version, undefined);
  assert.equal(parsedMulti.applied_scenario, null);
  assert.equal(parsedMulti.optimization_trace, null);
  assert.equal(parsedMulti.optimizer_stats, null);
});

test("complete v2 multiroute is accepted while a partial self-declared v2 is rejected", () => {
  const b1 = legacyMultiroute();
  const b2 = v2Multiroute();
  const parsed = parseMultirouteResponse(b2);
  assert.equal(isMultirouteV2(parsed), true);
  assert.equal(parsed.return_to_start, false);
  assert.deepEqual(f1MultirouteProjection(b2), f1MultirouteProjection(b1));
  assert.equal(parseMultirouteResponse(b1).contract_version, undefined);

  const partial = structuredClone(b2);
  delete partial.computation_metrics;
  assert.throws(() => parseMultirouteResponse(partial), ApiContractError);
});

test("a malformed nested v2 route never silently downgrades to legacy", () => {
  const missingTermination = structuredClone(v2Route());
  delete missingTermination.termination;
  assert.throws(() => parseTraceResponse(missingTermination), /route\.termination/);

  const missingDecision = structuredClone(v2Route());
  delete missingDecision.trace[0].decision;
  assert.throws(() => parseTraceResponse(missingDecision), /decision/);

  const missingEvidence = structuredClone(v2Route());
  delete missingEvidence.explanation.evidence;
  assert.throws(() => parseTraceResponse(missingEvidence), /evidence/);
});

test("v2 route guard rejects semantic drift inside structured evidence and decisions", () => {
  const brokenBreakdown = structuredClone(v2Route());
  brokenBreakdown.explanation.evidence.cost_breakdown.balanced_cost_s = 13;
  assert.throws(() => parseTraceResponse(brokenBreakdown), /balanced_cost_s/);

  const brokenObjective = structuredClone(v2Route());
  brokenObjective.explanation.evidence.objective.selected_value = 11;
  assert.throws(() => parseTraceResponse(brokenObjective), /objective/);

  const missingSelectedScore = structuredClone(v2Route());
  missingSelectedScore.trace[0].decision.selected_scores.f = null;
  assert.throws(() => parseTraceResponse(missingSelectedScore), /selected_scores/);

  const falseGuarantee = structuredClone(v2Route());
  falseGuarantee.metrics.optimal_guarantee = false;
  assert.throws(() => parseTraceResponse(falseGuarantee), /optimal_guarantee/);
});

test("IDA* v2 accepts an exact reference within epsilon and rejects a bound violation", () => {
  const valid = v2IdastarRoute();
  const parsed = parseTraceResponse(valid);
  assert.equal(parsed.algorithm, "idastar");
  assert.equal(parsed.termination.solution_quality, "epsilon_bounded");
  assert.equal(parsed.explanation.evidence.reference_routes[0].relation_to_selected, "better");

  const beyondBound = structuredClone(valid);
  beyondBound.metrics.epsilon_bound = 1;
  assert.throws(() => parseTraceResponse(beyondBound), /vượt epsilon_bound/);

  const zeroBound = structuredClone(valid);
  zeroBound.metrics.epsilon_bound = 0;
  assert.throws(() => parseTraceResponse(zeroBound), /epsilon dương/);
});

test("complete v2 responses require a valid applied scenario and bounded graph view", () => {
  const missingRouteScenario = structuredClone(v2Route());
  missingRouteScenario.applied_scenario = null;
  assert.throws(() => parseTraceResponse(missingRouteScenario), /applied_scenario/);

  const missingAtspScenario = structuredClone(v2Multiroute());
  missingAtspScenario.applied_scenario = null;
  assert.throws(() => parseMultirouteResponse(missingAtspScenario), /applied_scenario/);

  const invalidView = structuredClone(v2Route());
  invalidView.applied_scenario.graph_view = "teach_51";
  assert.throws(() => parseTraceResponse(invalidView), /graph_view/);
});

test("v2 multiroute guard rejects matrix, runtime and aggregate identity drift", () => {
  const incomplete = structuredClone(v2Multiroute());
  incomplete.matrix_evidence.reachable_directed_pair_count = 1;
  assert.throws(() => parseMultirouteResponse(incomplete), /complete matrix/);

  const impossibleRuntime = structuredClone(v2Multiroute());
  impossibleRuntime.computation_metrics.total_runtime_ms = 1;
  assert.throws(() => parseMultirouteResponse(impossibleRuntime), /total_runtime_ms/);

  const brokenTotal = structuredClone(v2Multiroute());
  brokenTotal.totals.total_cost = 13;
  assert.throws(() => parseMultirouteResponse(brokenTotal), /totals\.total_cost/);

  const wrongMethodStats = structuredClone(v2Multiroute());
  wrongMethodStats.method_stats.kind = "nn_local_search";
  assert.throws(() => parseMultirouteResponse(wrongMethodStats), ApiContractError);
});

test("found=false is a valid typed response rather than an HTTP-style failure", () => {
  const noPath = legacyRoute();
  noPath.found = false;
  noPath.path = [];
  noPath.metrics.total_cost = null;
  noPath.metrics.total_distance_m = null;
  noPath.metrics.total_time_s = null;
  const parsed = parseTraceResponse(noPath);
  assert.equal(parsed.found, false);
});
