import assert from "node:assert/strict";
import test from "node:test";

import {
  atspExplanationViewModel,
  EMPTY_EXPLANATION_LIFECYCLE,
  invalidateExplanationOwner,
  isExplanationOverlayValid,
  leaveExplanationTab,
  resolveExplanationSubject,
  returnToExplanationTab,
  routeExplanationViewModel,
  selectExplanationOverlay,
  selectExplanationSubject,
} from "../lib/explanation-policy.ts";
import { createRunSnapshot } from "../lib/journey-mode-policy.ts";

const FINGERPRINT = `scenario-v1:${"d".repeat(64)}`;

function snapshot({ atsp = false, closed = false } = {}) {
  return createRunSnapshot({
    graph: "demo", graphView: "full", slot: "07:30", mode: "balanced",
    problemMode: atsp ? "multi_point" : "two_point",
    multiStrategy: atsp ? "atsp" : "ordered_search", runKind: "single",
    drafts: {
      start: "n0001", twoPointGoal: "n0002", multiStops: ["n0002"],
      returnToStart: closed,
    },
    algorithms: atsp ? [] : ["astar"], methods: atsp ? ["held_karp"] : [],
    includeRouteTrace: true, includeOptimizationTrace: false,
  });
}

function legacyTrace({ found = true } = {}) {
  return {
    algorithm: "astar", mode: "balanced", time_slot: "07:30", graph: "demo",
    applied_scenario: {
      graph_view: "full", override_count: 0, fingerprint: FINGERPRINT, provenance: "base",
    },
    found,
    path: found ? ["n0001", "n0002"] : [],
    metrics: {
      total_cost: found ? 12 : null, total_distance_m: found ? 100 : null,
      total_time_s: found ? 12 : null, nodes_expanded: 2, max_frontier: 1,
      runtime_ms: 1, optimal_guarantee: true, trace_truncated: false,
    },
    trace: [],
    explanation: {
      summary_vi: "Tối ưu tuyệt đối vì prose nói vậy 999 s.",
      congested_segments: [], alternatives: [],
    },
  };
}

function v2Trace({ reason = "goal_expanded", quality = "exact", found = true } = {}) {
  const trace = legacyTrace({ found });
  return {
    ...trace,
    contract_version: 2,
    termination: {
      reason,
      reachability: found ? "route_found" : reason === "frontier_exhausted"
        ? "proven_unreachable" : "inconclusive",
      solution_quality: found ? quality : "not_applicable",
      bidirectional_bound: null,
    },
    explanation: {
      ...trace.explanation,
      evidence: {
        selection_rule: "lowest_f_then_h",
        objective: {
          mode: "balanced", selected_value: found ? 12 : null,
          exact_reference_value: found ? 10 : null,
          optimality_gap: found ? 2 : null,
          optimality_gap_pct: found ? 20 : null,
        },
        cost_breakdown: found ? {
          distance_m: 100, free_flow_time_s: 10, congestion_adjusted_time_s: 12,
          congestion_delay_s: 2, penalty_flood_s: 0, penalty_construction_s: 0,
          penalty_narrow_alley_s: 0, penalty_traffic_light_s: 0,
          risk_penalty_total_s: 0, balanced_cost_s: 12,
        } : null,
        factors: [{
          id: "factor-1", kind: "congestion", affects_objective: true,
          source: "cost_breakdown", edge_ids: ["e00001"], node_ids: [],
          contribution_raw: 2, contribution_unit: "s", timeline_step: null,
        }],
        reference_routes: [{
          id: "ref-1", kind: "same_objective_optimum", provenance: "posthoc_ucs",
          generated_for_mode: "balanced", excluded_edge: null,
          path: ["n0001", "n0002"],
          metrics: { total_cost: 10, total_distance_m: 100, total_time_s: 10 },
          cost_breakdown: {
            distance_m: 100, free_flow_time_s: 10, congestion_adjusted_time_s: 10,
            congestion_delay_s: 0, penalty_flood_s: 0, penalty_construction_s: 0,
            penalty_narrow_alley_s: 0, penalty_traffic_light_s: 0,
            risk_penalty_total_s: 0, balanced_cost_s: 10,
          },
          reference_minus_selected_cost: -2,
          reference_minus_selected_pct: -16.666,
          reference_minus_selected_distance_m: 0,
          reference_minus_selected_balanced_cost_s: -2,
          relation_to_selected: "better",
        }],
      },
    },
  };
}

function routeEnvelope(id = "astar", response = v2Trace()) {
  return {
    kind: "route", id, runId: 1, snapshot: snapshot(), capability: "v2",
    scenarioFingerprint: FINGERPRINT, response, sourceResponses: [response],
  };
}

test("legacy route fallback never parses prose into guarantee, gap, or numeric truth", () => {
  const view = routeExplanationViewModel(legacyTrace());
  assert.equal(view.availability, "legacy_fallback");
  assert.equal(view.objectiveValue, 12);
  assert.equal(view.exactGap, null);
  assert.equal(view.factorsAvailable, false);
  assert.equal(view.referencesAvailable, false);
  assert.doesNotMatch(view.headline, /999|tối ưu tuyệt đối/i);

  const noPath = routeExplanationViewModel(legacyTrace({ found: false }));
  assert.match(noPath.headline, /chưa tìm thấy/);
  assert.doesNotMatch(noPath.headline, /không có đường/);
});

test("structured verdict maps exact, epsilon, feasible, proven and inconclusive facts", () => {
  assert.match(routeExplanationViewModel(v2Trace()).limitation, /bảo đảm tối ưu/);
  assert.match(
    routeExplanationViewModel(v2Trace({ quality: "epsilon_bounded" })).limitation,
    /sai số cộng/,
  );
  assert.match(
    routeExplanationViewModel(v2Trace({ quality: "feasible_unproven" })).limitation,
    /không có bảo đảm/,
  );
  assert.match(
    routeExplanationViewModel(v2Trace({ reason: "frontier_exhausted", found: false })).headline,
    /Không có đường có hướng/,
  );
  assert.match(
    routeExplanationViewModel(v2Trace({ reason: "round_cap_reached", found: false })).headline,
    /giới hạn số vòng/,
  );
});

test("subject resolution is exact and a failed comparison B never falls back to A", () => {
  const a = routeEnvelope("astar");
  const session = {
    id: "compare-1", kind: "route", snapshot: snapshot(),
    authoritativeScenarioFingerprint: FINGERPRINT, capability: "v2",
    selectedIds: ["astar", "beam"],
    runs: [
      { id: "astar", status: "success", result: a, error: null },
      { id: "beam", status: "error", result: null, error: "offline" },
    ],
    focusedId: "beam", startedAt: 1, completedAt: 2,
  };
  const registry = {
    singleRoutes: {}, singleAtsp: {}, routeComparisons: { "compare-1": session },
    atspComparisons: {},
  };
  assert.equal(resolveExplanationSubject({
    kind: "route_comparison", sessionId: "compare-1", resultId: "beam",
  }, registry), null);
  assert.equal(resolveExplanationSubject({
    kind: "route_comparison", sessionId: "compare-1", resultId: "astar",
  }, registry), a);
});

test("subject/overlay lifecycle is view-only, clears on subject change and owner invalidation", () => {
  let state = selectExplanationSubject(EMPTY_EXPLANATION_LIFECYCLE, {
    kind: "single_route", runId: "run-1",
  });
  state = selectExplanationOverlay(state, {
    kind: "factor", resultId: "astar", factorId: "factor-1", edgeIds: ["e00001"],
  });
  assert.equal(state.overlayVisible, true);
  const hidden = leaveExplanationTab(state);
  assert.equal(hidden.overlayVisible, false);
  assert.equal(hidden.overlay.factorId, "factor-1");
  assert.equal(returnToExplanationTab(hidden).overlayVisible, true);

  const changed = selectExplanationSubject(state, { kind: "single_atsp", runId: "run-2" });
  assert.equal(changed.overlay, null);
  assert.deepEqual(invalidateExplanationOwner(changed, { runId: "run-1" }), changed);
  assert.deepEqual(
    invalidateExplanationOwner(changed, { runId: "run-2" }),
    EMPTY_EXPLANATION_LIFECYCLE,
  );
});

test("overlay IDs must exist in structured evidence of the same result", () => {
  const envelope = routeEnvelope();
  assert.equal(isExplanationOverlayValid(envelope, {
    kind: "factor", resultId: "astar", factorId: "factor-1", edgeIds: ["e00001"],
  }), true);
  assert.equal(isExplanationOverlayValid(envelope, {
    kind: "factor", resultId: "astar", factorId: "missing", edgeIds: [],
  }), false);
  assert.equal(isExplanationOverlayValid(envelope, {
    kind: "reference_route", resultId: "other", referenceId: "ref-1",
  }), false);
  assert.equal(isExplanationOverlayValid(envelope, {
    kind: "leg", resultId: "astar", legIndex: 0,
  }), true);
  assert.equal(isExplanationOverlayValid(envelope, {
    kind: "leg", resultId: "astar", legIndex: 1,
  }), false);
});

test("ATSP open/closed comes from immutable snapshot for v1 and must match echo for v2", () => {
  const legacy = {
    method: "held_karp", mode: "balanced", time_slot: "07:30", graph: "demo",
    applied_scenario: { graph_view: "full", override_count: 0, fingerprint: FINGERPRINT, provenance: "base" },
    found: true, order: ["n0001", "n0002"], legs: [],
    totals: { total_cost: 1, total_distance_m: 1, total_time_s: 1 },
    original_order_totals: { total_cost: 1, total_distance_m: 1, total_time_s: 1 },
    savings_pct: 0, optimal_guarantee: true, optimization_trace: null, optimizer_stats: null,
  };
  const legacyEnvelope = {
    kind: "atsp", id: "held_karp", runId: 1, snapshot: snapshot({ atsp: true, closed: true }),
    capability: "v1", scenarioFingerprint: FINGERPRINT, response: legacy,
  };
  assert.equal(atspExplanationViewModel(legacyEnvelope).topology, "closed");
  assert.equal(atspExplanationViewModel(legacyEnvelope).methodStatsAvailable, false);

  const v2Failure = {
    ...legacy,
    contract_version: 2,
    found: false, order: [], legs: [], totals: null, original_order_totals: null,
    savings_pct: null, return_to_start: false,
    original_order: ["n0001", "n0002"], original_order_legs: [],
    totals_breakdown: null, original_order_breakdown: null,
    matrix_evidence: {
      point_count: 2, directed_pair_count: 2, reachable_directed_pair_count: 0,
      asymmetric_unordered_pair_count: 0, asymmetry_example: null,
    },
    computation_metrics: {
      matrix_search_runs: 1, matrix_nodes_expanded: 1,
      matrix_runtime_ms: 1, optimizer_runtime_ms: 0, total_runtime_ms: 1,
    },
    failure: { kind: "matrix_incomplete", from_node: "n0001", to_node: "n0002" },
    method_stats: null,
  };
  const mismatch = {
    ...legacyEnvelope, capability: "v2", response: v2Failure,
  };
  assert.equal(atspExplanationViewModel(mismatch).availability, "contract_error");
});
