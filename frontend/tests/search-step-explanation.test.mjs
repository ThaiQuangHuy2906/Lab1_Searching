import assert from "node:assert/strict";
import test from "node:test";

import { presentBidirectionalTermination, presentSearchStep } from "../lib/search-step-explanation.ts";

const RULES = {
  bfs: "fifo",
  dfs: "lifo",
  iddfs: "depth_limited_lifo",
  ucs: "lowest_g",
  astar: "lowest_f_then_h",
  greedy: "lowest_h",
  bidijkstra: "bidirectional_min_key",
  idastar: "f_bound_dfs",
  beam: "top_k_f",
};

function decision(algorithm) {
  const rule = RULES[algorithm];
  return {
    rule,
    selected_scores: ["bfs", "dfs"].includes(algorithm)
      ? null : { g: 3, h: 2, f: 5, depth: 1 },
    runner_up: ["bfs", "dfs"].includes(algorithm)
      ? null : { node: "n0003", g: 4, h: 3, f: 7, depth: 2 },
    frontier_size_before: 2,
    frontier_size_after: 1,
    neighbors_scanned: 3,
    frontier_added: 1,
    frontier_updated: 1,
    pruned_count: algorithm === "beam" ? 2 : 0,
    iteration: ["iddfs", "idastar"].includes(algorithm) ? 2 : null,
    bound: ["iddfs", "idastar"].includes(algorithm) ? 10 : null,
    layer: algorithm === "beam" ? 3 : null,
    beam_width: algorithm === "beam" ? 5 : null,
    top_forward: algorithm === "bidijkstra" ? { node: "n0002", g: 3 } : null,
    top_backward: algorithm === "bidijkstra" ? { node: "n0004", g: 4 } : null,
    mu_before: algorithm === "bidijkstra" ? 9 : null,
  };
}

function trace(algorithm) {
  return {
    contract_version: 2,
    algorithm,
    mode: "balanced",
    time_slot: "07:30",
    graph: "demo",
    applied_scenario: null,
    found: true,
    path: ["n0001", "n0002"],
    metrics: {
      total_cost: 5, total_distance_m: 20, total_time_s: 5,
      nodes_expanded: 1, max_frontier: 2, runtime_ms: 1,
      optimal_guarantee: ["ucs", "astar", "bidijkstra", "idastar"].includes(algorithm),
      trace_truncated: false,
    },
    trace: [{
      step: 1,
      expanded: "n0002",
      frontier: ["n0003"],
      g: ["bfs", "dfs", "iddfs", "greedy"].includes(algorithm) ? null : { n0003: 4 },
      h: ["astar", "greedy", "idastar", "beam"].includes(algorithm) ? { n0003: 3 } : null,
      f: ["astar", "idastar", "beam"].includes(algorithm) ? { n0003: 7 } : null,
      depth_limit: algorithm === "iddfs" ? 10 : null,
      side: algorithm === "bidijkstra" ? "forward" : null,
      decision: decision(algorithm),
      bidirectional_frontiers: algorithm === "bidijkstra" ? {
        forward: { nodes: ["n0003"], g: { n0003: 4 } },
        backward: { nodes: [], g: {} },
        best_path_cost: 8,
        meeting_node: "n0002",
      } : null,
    }],
    explanation: {
      summary_vi: "", congested_segments: [], alternatives: [],
      evidence: {
        selection_rule: RULES[algorithm],
        objective: {
          mode: "balanced", selected_value: 5, exact_reference_value: null,
          optimality_gap: null, optimality_gap_pct: null,
        },
        cost_breakdown: null, factors: [], reference_routes: [],
      },
    },
    termination: {
      reason: algorithm === "bidijkstra" ? "bidirectional_bound_met" : "goal_expanded",
      reachability: "route_found",
      solution_quality: ["ucs", "astar", "bidijkstra"].includes(algorithm)
        ? "exact" : algorithm === "idastar" ? "epsilon_bounded" : "feasible_unproven",
      bidirectional_bound: algorithm === "bidijkstra" ? {
        top_forward: { node: "n0003", g: 4 },
        top_backward: { node: "n0004", g: 4 },
        mu: 8,
        meeting_node: "n0002",
      } : null,
    },
  };
}

test("all nine algorithms have deterministic structured action/rule/evidence/effect copy", () => {
  for (const algorithm of Object.keys(RULES)) {
    const view = presentSearchStep(trace(algorithm), 0);
    assert.equal(view.availability, "structured_v2", algorithm);
    assert.match(view.title, /Bước 1\/1/, algorithm);
    assert.match(view.action, /n0002/, algorithm);
    assert.ok(view.rule.length > 10, algorithm);
    assert.ok(view.evidence.length > 10, algorithm);
    assert.match(view.effect, /quét 3 cạnh/, algorithm);
    assert.doesNotMatch(JSON.stringify(view), /đã xét|bị loại|tuyến thay thế/i, algorithm);
  }
});

test("algorithm-specific presenter uses typed scores, iteration/layer and bidi μ", () => {
  assert.match(presentSearchStep(trace("ucs"), 0).evidence, /g=0,1 phút quy đổi/);
  assert.match(presentSearchStep(trace("astar"), 0).evidence, /g=0,1 phút quy đổi.*h=0 phút quy đổi.*f=0,1 phút quy đổi/);
  assert.match(presentSearchStep(trace("greedy"), 0).rule, /không dùng g/);
  assert.match(presentSearchStep(trace("iddfs"), 0).evidence, /Vòng 2/);
  assert.match(presentSearchStep(trace("idastar"), 0).evidence, /bound=0,2 phút quy đổi/);
  assert.match(presentSearchStep(trace("beam"), 0).evidence, /Lớp 3.*k=5.*cắt 2/);
  const bidi = presentSearchStep(trace("bidijkstra"), 0);
  assert.match(bidi.evidence, /g=.*top F=0,1 phút quy đổi.*top B=0,1 phút quy đổi.*μ trước=0,1 phút quy đổi/);
  assert.doesNotMatch(bidi.evidence, /μ sau/);
  assert.match(bidi.effect, /phía Đi\/Đến.*μ sau=0,1 phút quy đổi.*điểm gặp=n0002/);
  assert.match(presentBidirectionalTermination(trace("bidijkstra")), /top F.*\+ top B.*≥ μ.*n0002/);
  assert.equal(presentBidirectionalTermination(trace("astar")), null);
});

test("legacy step fallback never claims a minimum selected score", () => {
  const legacy = trace("astar");
  delete legacy.contract_version;
  delete legacy.termination;
  delete legacy.explanation.evidence;
  delete legacy.trace[0].decision;
  delete legacy.trace[0].bidirectional_frontiers;
  const view = presentSearchStep(legacy, 0);
  assert.equal(view.availability, "legacy_fallback");
  assert.match(view.rule, /chưa có decision evidence/);
  assert.doesNotMatch(JSON.stringify(view), /nhỏ nhất|minimum|runner-up/i);
});

test("trace-off and source-truncated states remain explicit", () => {
  const quiet = trace("astar");
  quiet.trace = [];
  assert.equal(presentSearchStep(quiet, 0).availability, "trace_off");
  const truncated = trace("astar");
  truncated.metrics.trace_truncated = true;
  assert.match(presentSearchStep(truncated, 0).caveat, /payload rút gọn/);
});

test("an empty bidirectional frontier is presented as an effective infinite top", () => {
  const bidi = trace("bidijkstra");
  bidi.termination.bidirectional_bound.top_backward = null;
  const text = presentBidirectionalTermination(bidi);
  assert.match(text, /top B \(\+∞ \(frontier rỗng\)\)/);
  assert.doesNotMatch(text, /top B \(chưa có\)/);
});
