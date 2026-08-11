import assert from "node:assert/strict";
import test from "node:test";

import {
  attachComparisonResult,
  cancelComparisonSession,
  comparisonProgress,
  comparisonRankLabel,
  comparisonSelectionEligibility,
  createAtspResultEnvelope,
  createCompareSession,
  createRouteResultEnvelope,
  failComparisonRun,
  isStaleRun,
  markComparisonRunRunning,
  rankComparisonResults,
  retryComparisonRuns,
  snapshotsEqual,
  validateComparisonSelection,
} from "../lib/comparison-policy.ts";
import { createRunSnapshot } from "../lib/journey-mode-policy.ts";

const FINGERPRINT = `scenario-v1:${"b".repeat(64)}`;

function snapshot({ kind = "route", selected = ["astar", "ucs"] } = {}) {
  return createRunSnapshot({
    graph: "demo", graphView: "full", slot: "07:30", mode: "balanced",
    problemMode: kind === "route" ? "two_point" : "multi_point",
    multiStrategy: kind === "route" ? "ordered_search" : "atsp",
    runKind: "compare",
    drafts: {
      start: "n0001", twoPointGoal: "n0002",
      multiStops: ["n0002", "n0003"], returnToStart: false,
    },
    algorithms: kind === "route" ? selected : [],
    methods: kind === "atsp" ? selected : [],
    includeRouteTrace: true,
    includeOptimizationTrace: true,
  });
}

function route(cost, {
  found = true, fingerprint = FINGERPRINT, version, algorithm = "astar",
} = {}) {
  return {
    ...(version ? { contract_version: version } : {}),
    algorithm, mode: "balanced", time_slot: "07:30", graph: "demo",
    applied_scenario: {
      graph_view: "full", override_count: 0, fingerprint, provenance: "base",
    },
    found,
    path: found ? ["n0001", "n0002"] : [],
    metrics: {
      total_cost: found ? cost : null,
      total_distance_m: found ? 100 : null,
      total_time_s: found ? cost : null,
      nodes_expanded: 2, max_frontier: 1, runtime_ms: 1,
      optimal_guarantee: true, trace_truncated: false,
    },
    trace: [],
    explanation: { summary_vi: "", congested_segments: [], alternatives: [] },
  };
}

function multiroute({
  method = "held_karp", version, returnToStart = false,
  mode = "balanced", graphView = "full",
} = {}) {
  return {
    ...(version ? { contract_version: version, return_to_start: returnToStart } : {}),
    method, mode, time_slot: "07:30", graph: "demo",
    applied_scenario: {
      graph_view: graphView, override_count: 0, fingerprint: FINGERPRINT, provenance: "base",
    },
    found: true,
    order: ["n0001", "n0002", "n0003"],
    legs: [], totals: {}, original_order_totals: {}, savings_pct: 0,
    optimal_guarantee: method === "held_karp",
    optimization_trace: null, optimizer_stats: null,
  };
}

test("route/ATSP selection limits are unique and preserve stable order", () => {
  assert.match(validateComparisonSelection("route", ["astar"]), /ít nhất 2/);
  assert.equal(validateComparisonSelection("route", ["beam", "astar", "ucs", "bfs"]), null);
  assert.match(validateComparisonSelection("route", ["a", "b", "c", "d", "e"]), /tối đa 4/);
  assert.match(validateComparisonSelection("atsp", ["sa", "sa"]), /unique/);
  assert.equal(validateComparisonSelection("atsp", ["sa", "held_karp", "nn_2opt"]), null);
});

test("eligibility rejects Held-Karp above 15 total points without changing selection", () => {
  const tooMany = createRunSnapshot({
    graph: "demo", graphView: "full", slot: "07:30", mode: "balanced",
    problemMode: "multi_point", multiStrategy: "atsp", runKind: "compare",
    drafts: {
      start: "A", twoPointGoal: null,
      multiStops: Array.from({ length: 15 }, (_, index) => `S${index}`),
      returnToStart: false,
    },
    algorithms: [], methods: ["held_karp", "sa"],
    includeRouteTrace: false, includeOptimizationTrace: false,
  });
  assert.match(
    comparisonSelectionEligibility("atsp", ["held_karp", "sa"], tooMany),
    /16 điểm/,
  );
});

test("N selections create N ordered queued slots and snapshot equality is structural", () => {
  const source = snapshot({ selected: ["beam", "astar", "ucs"] });
  const session = createCompareSession("route", source, ["beam", "astar", "ucs"], {
    id: "session-1", startedAt: 100,
  });
  assert.deepEqual(session.runs.map(({ id, status }) => [id, status]), [
    ["beam", "queued"], ["astar", "queued"], ["ucs", "queued"],
  ]);
  assert.throws(() => session.selectedIds.push("bfs"), TypeError);
  assert.throws(() => { session.runs[0].status = "success"; }, TypeError);
  assert.equal(snapshotsEqual(source, structuredClone(source)), true);
  const different = { ...structuredClone(source), slot: "12:00" };
  assert.equal(snapshotsEqual(source, different), false);
});

test("status lifecycle keeps partial success and lets later items continue after an error", () => {
  const source = snapshot({ selected: ["astar", "ucs", "beam"] });
  let session = createCompareSession("route", source, ["astar", "ucs", "beam"], {
    id: "session-2", startedAt: 100,
  });
  session = markComparisonRunRunning(session, "astar");
  const first = createRouteResultEnvelope("astar", 7, source, route(10));
  const attached = attachComparisonResult(session, first, 110);
  assert.equal(attached.accepted, true);
  session = attached.session;
  session = markComparisonRunRunning(session, "ucs");
  session = failComparisonRun(session, "ucs", "HTTP 500", 120);
  session = markComparisonRunRunning(session, "beam");
  const noPath = createRouteResultEnvelope(
    "beam", 7, source, route(0, { found: false, algorithm: "beam" }),
  );
  session = attachComparisonResult(session, noPath, 130).session;
  assert.deepEqual(session.runs.map(({ status }) => status), ["success", "error", "no_path"]);
  assert.deepEqual(comparisonProgress(session), { completed: 3, total: 3, runningId: null });
  assert.equal(session.completedAt, 130);
});

test("result attachment cannot skip running state or overwrite a completed slot", () => {
  const source = snapshot();
  let session = createCompareSession("route", source, ["astar", "ucs"], {
    id: "session-state-guard", startedAt: 100,
  });
  const envelope = createRouteResultEnvelope("astar", 7, source, route(10));
  assert.throws(() => attachComparisonResult(session, envelope, 110), /running/);
  session = attachComparisonResult(
    markComparisonRunRunning(session, "astar"), envelope, 110,
  ).session;
  assert.throws(() => attachComparisonResult(session, envelope, 120), /running/);
});

test("first response writes fingerprint/capability once and retry never resets them", () => {
  const source = snapshot();
  let session = createCompareSession("route", source, ["astar", "ucs"], {
    id: "session-3", startedAt: 100,
  });
  session = markComparisonRunRunning(session, "astar");
  session = attachComparisonResult(
    session, createRouteResultEnvelope("astar", 8, source, route(10)), 110,
  ).session;
  assert.equal(session.authoritativeScenarioFingerprint, FINGERPRINT);
  assert.equal(session.capability, "v1");
  session = failComparisonRun(markComparisonRunRunning(session, "ucs"), "ucs", "offline", 120);
  const retried = retryComparisonRuns(session, ["ucs"]);
  assert.equal(retried.runs[0].status, "success");
  assert.equal(retried.runs[1].status, "queued");
  assert.equal(retried.authoritativeScenarioFingerprint, FINGERPRINT);
  assert.equal(retried.capability, "v1");
  assert.equal(retried.snapshot, source);
});

test("fingerprint/capability mismatch rejects the result and cancels all outstanding slots", () => {
  const source = snapshot({ selected: ["astar", "ucs", "beam"] });
  let session = createCompareSession("route", source, ["astar", "ucs", "beam"], {
    id: "session-4", startedAt: 100,
  });
  session = attachComparisonResult(
    markComparisonRunRunning(session, "astar"),
    createRouteResultEnvelope("astar", 9, source, route(10)),
    110,
  ).session;
  session = markComparisonRunRunning(session, "ucs");
  const mismatch = attachComparisonResult(
    session,
    createRouteResultEnvelope(
      "ucs", 9, source, route(10, {
        fingerprint: `scenario-v1:${"c".repeat(64)}`, algorithm: "ucs",
      }),
    ),
    120,
  );
  assert.equal(mismatch.accepted, false);
  assert.match(mismatch.contractError, /fingerprint/);
  assert.deepEqual(mismatch.session.runs.map(({ status }) => status), [
    "success", "error", "cancelled",
  ]);

  let capabilitySession = createCompareSession("route", source, ["astar", "ucs"], {
    id: "session-5", startedAt: 100,
  });
  capabilitySession = attachComparisonResult(
    markComparisonRunRunning(capabilitySession, "astar"),
    createRouteResultEnvelope("astar", 10, source, route(10)),
    110,
  ).session;
  const v2 = route(10, { version: 2, algorithm: "ucs" });
  const changed = attachComparisonResult(
    markComparisonRunRunning(capabilitySession, "ucs"),
    createRouteResultEnvelope("ucs", 10, source, v2),
    120,
  );
  assert.equal(changed.accepted, false);
  assert.match(changed.contractError, /capability/);
});

test("missing server fingerprint cannot create an envelope or enter ranking", () => {
  const source = snapshot();
  const response = route(10);
  response.applied_scenario = null;
  assert.throws(
    () => createRouteResultEnvelope("astar", 1, source, response),
    /fingerprint/,
  );
});

test("result envelopes reject response identity drift from the immutable snapshot", () => {
  const routeSnapshot = snapshot();
  assert.throws(
    () => createRouteResultEnvelope(
      "astar", 1, routeSnapshot, route(10, { algorithm: "ucs" }),
    ),
    /algorithm/,
  );
  const wrongSlot = route(10);
  wrongSlot.time_slot = "12:00";
  assert.throws(
    () => createRouteResultEnvelope("astar", 1, routeSnapshot, wrongSlot),
    /context/,
  );
  const wrongView = route(10);
  wrongView.applied_scenario.graph_view = "teach_7";
  assert.throws(
    () => createRouteResultEnvelope("astar", 1, routeSnapshot, wrongView),
    /graph view/,
  );

  const atspSnapshot = snapshot({ kind: "atsp", selected: ["held_karp", "sa"] });
  assert.throws(
    () => createAtspResultEnvelope("held_karp", 1, atspSnapshot, multiroute({ method: "sa" })),
    /method/,
  );
  assert.throws(
    () => createAtspResultEnvelope(
      "held_karp", 1, atspSnapshot,
      multiroute({ version: 2, returnToStart: true }),
    ),
    /topology/,
  );
});

test("ordered route envelope keeps immutable per-leg sources and their backend capability", () => {
  const source = snapshot();
  const aggregate = route(20);
  const firstLeg = route(9, { version: 2 });
  const secondLeg = route(11, { version: 2 });
  const envelope = createRouteResultEnvelope(
    "astar", 1, source, aggregate, [firstLeg, secondLeg],
  );
  assert.equal(envelope.capability, "v2");
  assert.equal(envelope.response.contract_version, undefined);
  assert.equal(envelope.sourceResponses.length, 2);
  assert.throws(() => envelope.sourceResponses.push(route(1)), TypeError);
  assert.throws(() => { envelope.sourceResponses[0].metrics.total_cost = 99; }, TypeError);

  assert.throws(
    () => createRouteResultEnvelope(
      "astar", 1, source, aggregate, [firstLeg, route(11)],
    ),
    /Capability đổi/,
  );
});

test("cancel keeps completed cards and marks only queued/running items cancelled", () => {
  const source = snapshot({ selected: ["astar", "ucs", "beam"] });
  let session = createCompareSession("route", source, ["astar", "ucs", "beam"], {
    id: "session-6", startedAt: 100,
  });
  session = attachComparisonResult(
    markComparisonRunRunning(session, "astar"),
    createRouteResultEnvelope("astar", 1, source, route(10)), 110,
  ).session;
  session = markComparisonRunRunning(session, "ucs");
  session = cancelComparisonSession(session, 120);
  assert.deepEqual(session.runs.map(({ status }) => status), [
    "success", "cancelled", "cancelled",
  ]);
});

test("ranking excludes null/error/no-path and applies raw tolerance ties", () => {
  const source = snapshot({ selected: ["astar", "ucs", "beam", "bfs"] });
  let session = createCompareSession("route", source, ["astar", "ucs", "beam", "bfs"], {
    id: "session-7", startedAt: 100,
  });
  for (const [id, cost] of [["astar", 10], ["ucs", 10 + 5e-7]]) {
    session = attachComparisonResult(
      markComparisonRunRunning(session, id),
      createRouteResultEnvelope(id, 1, source, route(cost, { algorithm: id })), 110,
    ).session;
  }
  session = failComparisonRun(markComparisonRunRunning(session, "beam"), "beam", "offline", 120);
  session = attachComparisonResult(
    markComparisonRunRunning(session, "bfs"),
    createRouteResultEnvelope(
      "bfs", 1, source, route(0, { found: false, algorithm: "bfs" }),
    ), 130,
  ).session;
  assert.deepEqual(rankComparisonResults(session, (result) => result.response.metrics.total_cost), [
    { id: "astar", value: 10, rank: 1, tied: true },
    { id: "ucs", value: 10 + 5e-7, rank: 1, tied: true },
  ]);
  assert.equal(comparisonRankLabel({ rank: 1, tied: true }), "Đồng hạng 1");
  assert.equal(comparisonRankLabel({ rank: 2, tied: false }), "Hạng 2");
  assert.equal(comparisonRankLabel(null), "—");
  assert.equal(isStaleRun(4, 5), true);
  assert.equal(isStaleRun(5, 5), false);
});
