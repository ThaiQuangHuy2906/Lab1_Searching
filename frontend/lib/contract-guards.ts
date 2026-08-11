import type {
  Algorithm, AppliedScenario, AtspMethodStats, ContractCapability,
  ExplanationEvidence, Leg, LegMetrics, Metrics, MultirouteResponse, MultirouteV2,
  OptimizationTrace, PathCostBreakdown, RouteTermination, Trace, TraceDecision,
  TraceStepV2,
} from "./types";

const ALGORITHMS = new Set([
  "bfs", "dfs", "iddfs", "ucs", "astar",
  "greedy", "bidijkstra", "idastar", "beam",
]);
const MODES = new Set(["distance", "time", "balanced"]);
const SLOTS = new Set(["07:30", "12:00", "17:30", "22:00"]);
const GRAPHS = new Set(["demo", "real"]);
const METHODS = new Set(["held_karp", "nn_2opt", "sa"]);
const RULE_BY_ALGORITHM: Record<Algorithm, string> = {
  bfs: "fifo", dfs: "lifo", iddfs: "depth_limited_lifo", ucs: "lowest_g",
  astar: "lowest_f_then_h", greedy: "lowest_h",
  bidijkstra: "bidirectional_min_key", idastar: "f_bound_dfs", beam: "top_k_f",
};
const ABS_TOLERANCE = 1e-6;
const REL_TOLERANCE = 1e-9;
const BREAKDOWN_KEYS = [
  "distance_m", "free_flow_time_s", "congestion_adjusted_time_s",
  "congestion_delay_s", "penalty_flood_s", "penalty_construction_s",
  "penalty_narrow_alley_s", "penalty_traffic_light_s", "risk_penalty_total_s",
  "balanced_cost_s",
] as const;
const TRACE_FIELDS: Record<Algorithm, readonly [boolean, boolean, boolean]> = {
  bfs: [false, false, false],
  dfs: [false, false, false],
  iddfs: [false, false, false],
  ucs: [true, false, false],
  astar: [true, true, true],
  greedy: [false, true, false],
  bidijkstra: [true, false, false],
  idastar: [true, true, true],
  beam: [true, true, true],
};

export class ApiContractError extends Error {
  readonly code = "CONTRACT_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ApiContractError";
  }
}

function fail(path: string, expectation: string): never {
  throw new ApiContractError(`Payload backend không hợp lệ tại ${path}: ${expectation}.`);
}

function equivalent(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(
    ABS_TOLERANCE,
    REL_TOLERANCE * Math.max(Math.abs(left), Math.abs(right)),
  );
}

function requireEquivalent(
  actual: number,
  expected: number,
  path: string,
  expectation: string,
): void {
  if (!equivalent(actual, expected)) fail(path, expectation);
}

function unique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) fail(path, "các giá trị phải unique");
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    fail(path, "phải là object");
  return value as Record<string, unknown>;
}

function finite(value: unknown, path: string, nullable = false): number | null {
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "phải là số hữu hạn");
  return value;
}

function nonnegative(value: unknown, path: string, nullable = false): number | null {
  const parsed = finite(value, path, nullable);
  if (parsed !== null && parsed < 0) fail(path, "không được âm");
  return parsed;
}

function integer(value: unknown, path: string, minimum = 0): number {
  if (!Number.isInteger(value) || (value as number) < minimum)
    fail(path, `phải là số nguyên >= ${minimum}`);
  return value as number;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "phải là chuỗi");
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "phải là boolean");
  return value;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(path, "phải là mảng");
  return value;
}

function strings(value: unknown, path: string): string[] {
  return array(value, path).map((item, index) => string(item, `${path}[${index}]`));
}

function enumValue(value: unknown, allowed: Set<string>, path: string): string {
  const parsed = string(value, path);
  if (!allowed.has(parsed)) fail(path, `giá trị enum không được hỗ trợ: ${parsed}`);
  return parsed;
}

function nullableObject(value: unknown, path: string): Record<string, unknown> | null {
  return value === null ? null : record(value, path);
}

function numberMap(value: unknown, path: string, nullable: boolean): void {
  if (nullable && value === null) return;
  const map = record(value, path);
  for (const [key, item] of Object.entries(map)) nonnegative(item, `${path}.${key}`);
}

function appliedScenario(value: unknown, path: string, required: boolean): AppliedScenario | null {
  if (value === undefined && !required) return null;
  if (value === undefined || value === null) {
    if (required) fail(path, "bắt buộc cho contract v2");
    return null;
  }
  const item = record(value, path);
  const view = string(item.graph_view, `${path}.graph_view`);
  if (view !== "full" && !/^teach_(?:[3-9]|[1-4]\d|50)$/.test(view))
    fail(`${path}.graph_view`, "graph view không hợp lệ");
  integer(item.override_count, `${path}.override_count`);
  const fingerprint = string(item.fingerprint, `${path}.fingerprint`);
  if (!/^scenario-v1:[0-9a-f]{64}$/.test(fingerprint))
    fail(`${path}.fingerprint`, "fingerprint server không đúng định dạng");
  enumValue(item.provenance, new Set(["base", "graph_view", "sandbox_override"]), `${path}.provenance`);
  return item as unknown as AppliedScenario;
}

function metrics(value: unknown, path: string): Metrics {
  const item = record(value, path);
  nonnegative(item.total_cost, `${path}.total_cost`, true);
  nonnegative(item.total_distance_m, `${path}.total_distance_m`, true);
  nonnegative(item.total_time_s, `${path}.total_time_s`, true);
  integer(item.nodes_expanded, `${path}.nodes_expanded`);
  integer(item.max_frontier, `${path}.max_frontier`);
  nonnegative(item.runtime_ms, `${path}.runtime_ms`);
  boolean(item.optimal_guarantee, `${path}.optimal_guarantee`);
  if (item.epsilon_bound !== undefined) nonnegative(item.epsilon_bound, `${path}.epsilon_bound`, true);
  if (item.beam_width !== undefined && item.beam_width !== null)
    integer(item.beam_width, `${path}.beam_width`, 1);
  boolean(item.trace_truncated, `${path}.trace_truncated`);
  return item as unknown as Metrics;
}

function breakdown(value: unknown, path: string): PathCostBreakdown {
  const item = record(value, path);
  for (const key of BREAKDOWN_KEYS) nonnegative(item[key], `${path}.${key}`);
  const parsed = item as unknown as PathCostBreakdown;
  requireEquivalent(
    parsed.congestion_delay_s,
    parsed.congestion_adjusted_time_s - parsed.free_flow_time_s,
    `${path}.congestion_delay_s`,
    "phải bằng congestion_adjusted_time_s - free_flow_time_s",
  );
  requireEquivalent(
    parsed.risk_penalty_total_s,
    parsed.penalty_flood_s + parsed.penalty_construction_s
      + parsed.penalty_narrow_alley_s + parsed.penalty_traffic_light_s,
    `${path}.risk_penalty_total_s`,
    "phải bằng tổng bốn penalty",
  );
  requireEquivalent(
    parsed.balanced_cost_s,
    parsed.congestion_adjusted_time_s + parsed.risk_penalty_total_s,
    `${path}.balanced_cost_s`,
    "phải bằng congestion-adjusted time + risk penalties",
  );
  return parsed;
}

function objectiveFromBreakdown(value: PathCostBreakdown, mode: unknown): number {
  if (mode === "distance") return value.distance_m;
  if (mode === "time") return value.congestion_adjusted_time_s;
  return value.balanced_cost_s;
}

function decision(value: unknown, path: string, algorithm: Algorithm): TraceDecision {
  const item = record(value, path);
  const rule = string(item.rule, `${path}.rule`);
  if (rule !== RULE_BY_ALGORITHM[algorithm]) fail(`${path}.rule`, `không khớp ${algorithm}`);
  const scores = nullableObject(item.selected_scores, `${path}.selected_scores`);
  const runner = nullableObject(item.runner_up, `${path}.runner_up`);
  for (const [target, targetPath] of [[scores, `${path}.selected_scores`], [runner, `${path}.runner_up`]] as const) {
    if (!target) continue;
    if (target === runner) string(target.node, `${targetPath}.node`);
    for (const key of ["g", "h", "f"])
      nonnegative(target[key], `${targetPath}.${key}`, true);
    if (target.depth !== null) integer(target.depth, `${targetPath}.depth`);
  }
  const requiredScore = {
    depth_limited_lifo: "depth",
    lowest_g: "g",
    lowest_h: "h",
    lowest_f_then_h: "f",
    bidirectional_min_key: "g",
    f_bound_dfs: "f",
    top_k_f: "f",
  }[rule];
  if (requiredScore) {
    if (!scores || scores[requiredScore] === null)
      fail(`${path}.selected_scores`, `${rule} cần selected ${requiredScore}`);
    if (runner && runner[requiredScore] === null)
      fail(`${path}.runner_up`, `${rule} cần runner-up ${requiredScore}`);
  } else if (scores !== null) {
    fail(`${path}.selected_scores`, `${rule} cần selected_scores=null`);
  }
  for (const key of [
    "frontier_size_before", "frontier_size_after", "neighbors_scanned",
    "frontier_added", "frontier_updated", "pruned_count",
  ]) integer(item[key], `${path}.${key}`);
  for (const key of ["iteration", "layer", "beam_width"])
    if (item[key] !== null) integer(item[key], `${path}.${key}`, 1);
  nonnegative(item.bound, `${path}.bound`, true);
  nonnegative(item.mu_before, `${path}.mu_before`, true);
  for (const key of ["top_forward", "top_backward"]) {
    const top = nullableObject(item[key], `${path}.${key}`);
    if (top) {
      string(top.node, `${path}.${key}.node`);
      nonnegative(top.g, `${path}.${key}.g`);
    }
  }
  const iterative = rule === "depth_limited_lifo" || rule === "f_bound_dfs";
  if (iterative !== (item.iteration !== null) || iterative !== (item.bound !== null))
    fail(path, "iteration/bound chỉ bắt buộc cho IDDFS hoặc IDA*");
  const beam = rule === "top_k_f";
  if (beam !== (item.layer !== null && item.beam_width !== null)
      || (!beam && (item.layer !== null || item.beam_width !== null)))
    fail(path, "layer/beam_width chỉ bắt buộc cho Beam");
  const bidi = rule === "bidirectional_min_key";
  if (!bidi && (item.top_forward !== null || item.top_backward !== null || item.mu_before !== null))
    fail(path, "top keys và mu_before chỉ dành cho Bidirectional Dijkstra");
  return item as unknown as TraceDecision;
}

function bidiFrontiers(value: unknown, path: string) {
  const item = record(value, path);
  for (const side of ["forward", "backward"]) {
    const payload = record(item[side], `${path}.${side}`);
    const nodes = strings(payload.nodes, `${path}.${side}.nodes`);
    numberMap(payload.g, `${path}.${side}.g`, false);
    if (nodes.length !== new Set(nodes).size || nodes.some((node, index) => node !== [...nodes].sort()[index]))
      fail(`${path}.${side}.nodes`, "phải sorted và unique");
    if (Object.keys(payload.g as object).sort().join("\0") !== [...nodes].sort().join("\0"))
      fail(`${path}.${side}.g`, "keys phải khớp nodes");
  }
  nonnegative(item.best_path_cost, `${path}.best_path_cost`, true);
  if (item.meeting_node !== null) string(item.meeting_node, `${path}.meeting_node`);
  if ((item.best_path_cost === null) !== (item.meeting_node === null))
    fail(path, "best_path_cost và meeting_node phải cùng null/non-null");
  return item;
}

function traceStepCommon(
  value: unknown,
  path: string,
  algorithm: Algorithm,
): Record<string, unknown> {
  const item = record(value, path);
  integer(item.step, `${path}.step`, 1);
  string(item.expanded, `${path}.expanded`);
  strings(item.frontier, `${path}.frontier`);
  const fields = ["g", "h", "f"] as const;
  TRACE_FIELDS[algorithm].forEach((required, index) => {
    const field = fields[index];
    if (required) numberMap(item[field], `${path}.${field}`, false);
    else if (item[field] != null) fail(`${path}.${field}`, `không áp dụng cho ${algorithm}`);
  });
  if (algorithm === "iddfs") integer(item.depth_limit, `${path}.depth_limit`);
  else if (item.depth_limit != null) fail(`${path}.depth_limit`, "chỉ dành cho IDDFS");
  if (algorithm === "bidijkstra")
    enumValue(item.side, new Set(["forward", "backward"]), `${path}.side`);
  else if (item.side != null) fail(`${path}.side`, "chỉ dành cho Bidirectional Dijkstra");
  return item;
}

function traceStepV2(value: unknown, path: string, algorithm: Algorithm): TraceStepV2 {
  const item = traceStepCommon(value, path, algorithm);
  const frontier = strings(item.frontier, `${path}.frontier`);
  const parsedDecision = decision(item.decision, `${path}.decision`, algorithm);
  if (parsedDecision.frontier_size_after !== frontier.length)
    fail(`${path}.decision.frontier_size_after`, "phải bằng legacy frontier length");
  if (algorithm === "bidijkstra") {
    const sides = bidiFrontiers(item.bidirectional_frontiers, `${path}.bidirectional_frontiers`);
    const forward = record(sides.forward, `${path}.bidirectional_frontiers.forward`);
    const backward = record(sides.backward, `${path}.bidirectional_frontiers.backward`);
    const forwardNodes = strings(forward.nodes, `${path}.bidirectional_frontiers.forward.nodes`);
    const backwardNodes = strings(backward.nodes, `${path}.bidirectional_frontiers.backward.nodes`);
    const union = [...new Set([...forwardNodes, ...backwardNodes])].sort();
    if (JSON.stringify(frontier) !== JSON.stringify(union))
      fail(`${path}.frontier`, "legacy frontier phải là union sorted của hai phía");
    const legacyG = record(item.g, `${path}.g`);
    const forwardG = record(forward.g, `${path}.bidirectional_frontiers.forward.g`);
    const backwardG = record(backward.g, `${path}.bidirectional_frontiers.backward.g`);
    for (const node of union) {
      const expected = Math.min(
        node in forwardG ? forwardG[node] as number : Number.POSITIVE_INFINITY,
        node in backwardG ? backwardG[node] as number : Number.POSITIVE_INFINITY,
      );
      if (legacyG[node] !== expected)
        fail(`${path}.g.${node}`, "legacy g phải là min của hai phía");
    }
  } else if (item.bidirectional_frontiers !== null) {
    fail(`${path}.bidirectional_frontiers`, "chỉ Bidirectional Dijkstra được mang field này");
  }
  return item as unknown as TraceStepV2;
}

function termination(value: unknown, path: string): RouteTermination {
  const item = record(value, path);
  enumValue(item.reason, new Set([
    "start_equals_goal", "goal_expanded", "bidirectional_bound_met",
    "frontier_exhausted", "depth_cap_reached", "round_cap_reached",
    "beam_exhausted_after_pruning",
  ]), `${path}.reason`);
  enumValue(item.reachability, new Set(["route_found", "proven_unreachable", "inconclusive"]), `${path}.reachability`);
  enumValue(item.solution_quality, new Set(["exact", "epsilon_bounded", "feasible_unproven", "not_applicable"]), `${path}.solution_quality`);
  const bound = nullableObject(item.bidirectional_bound, `${path}.bidirectional_bound`);
  if (bound) {
    for (const key of ["top_forward", "top_backward"]) {
      const top = nullableObject(bound[key], `${path}.bidirectional_bound.${key}`);
      if (top) {
        string(top.node, `${path}.bidirectional_bound.${key}.node`);
        nonnegative(top.g, `${path}.bidirectional_bound.${key}.g`);
      }
    }
    nonnegative(bound.mu, `${path}.bidirectional_bound.mu`);
    string(bound.meeting_node, `${path}.bidirectional_bound.meeting_node`);
  }
  if (item.reachability !== "route_found" && item.solution_quality !== "not_applicable")
    fail(`${path}.solution_quality`, "not-found phải là not_applicable");
  if (item.reason === "start_equals_goal" && item.solution_quality !== "not_applicable")
    fail(`${path}.solution_quality`, "start_equals_goal phải là not_applicable");
  return item as unknown as RouteTermination;
}

function evidence(value: unknown, path: string): ExplanationEvidence {
  const item = record(value, path);
  enumValue(item.selection_rule, new Set(Object.values(RULE_BY_ALGORITHM)), `${path}.selection_rule`);
  const objective = record(item.objective, `${path}.objective`);
  enumValue(objective.mode, MODES, `${path}.objective.mode`);
  for (const key of ["selected_value", "exact_reference_value", "optimality_gap", "optimality_gap_pct"])
    nonnegative(objective[key], `${path}.objective.${key}`, true);
  if (objective.selected_value === null) {
    if (objective.exact_reference_value !== null || objective.optimality_gap !== null
        || objective.optimality_gap_pct !== null)
      fail(`${path}.objective`, "selected=null cần exact/gap/pct cùng null");
  } else if (objective.exact_reference_value === null) {
    if (objective.optimality_gap !== null || objective.optimality_gap_pct !== null)
      fail(`${path}.objective`, "gap cần exact reference");
  } else {
    const selected = objective.selected_value as number;
    const exact = objective.exact_reference_value as number;
    const rawGap = selected - exact;
    if (rawGap < 0 && !equivalent(selected, exact))
      fail(`${path}.objective.selected_value`, "không được tốt hơn exact reference");
    const expectedGap = equivalent(selected, exact) ? 0 : rawGap;
    if (objective.optimality_gap === null)
      fail(`${path}.objective.optimality_gap`, "không được null khi có exact reference");
    requireEquivalent(
      objective.optimality_gap as number,
      expectedGap,
      `${path}.objective.optimality_gap`,
      "phải bằng selected - exact",
    );
    const expectedPct = equivalent(exact, 0)
      ? equivalent(selected, 0) ? 0 : null
      : expectedGap / exact * 100;
    if (expectedPct === null) {
      if (objective.optimality_gap_pct !== null)
        fail(`${path}.objective.optimality_gap_pct`, "mẫu số 0 cần null");
    } else {
      if (objective.optimality_gap_pct === null)
        fail(`${path}.objective.optimality_gap_pct`, "thiếu phần trăm gap");
      requireEquivalent(
        objective.optimality_gap_pct as number,
        expectedPct,
        `${path}.objective.optimality_gap_pct`,
        "không khớp gap/exact",
      );
    }
  }
  if (item.cost_breakdown !== null) breakdown(item.cost_breakdown, `${path}.cost_breakdown`);
  const factors = array(item.factors, `${path}.factors`);
  const factorIds: string[] = [];
  for (const [index, rawFactor] of factors.entries()) {
    const factor = record(rawFactor, `${path}.factors[${index}]`);
    const factorPath = `${path}.factors[${index}]`;
    const id = string(factor.id, `${factorPath}.id`);
    if (!id) fail(`${factorPath}.id`, "không được rỗng");
    factorIds.push(id);
    enumValue(factor.kind, new Set([
      "objective_truth", "optimality_gap", "congestion", "flood", "construction",
      "narrow_alley", "traffic_light", "algorithm_limit", "scenario_effect",
    ]), `${factorPath}.kind`);
    boolean(factor.affects_objective, `${path}.factors[${index}].affects_objective`);
    enumValue(factor.source, new Set([
      "cost_breakdown", "reference_comparison", "trace", "scenario",
    ]), `${factorPath}.source`);
    const edgeIds = strings(factor.edge_ids, `${factorPath}.edge_ids`);
    const nodeIds = strings(factor.node_ids, `${factorPath}.node_ids`);
    unique(edgeIds, `${factorPath}.edge_ids`);
    unique(nodeIds, `${factorPath}.node_ids`);
    finite(factor.contribution_raw, `${path}.factors[${index}].contribution_raw`, true);
    if (factor.contribution_unit !== null)
      enumValue(factor.contribution_unit, new Set(["m", "s"]), `${path}.factors[${index}].contribution_unit`);
    if (factor.timeline_step !== null) integer(factor.timeline_step, `${path}.factors[${index}].timeline_step`, 1);
    if ((factor.contribution_raw === null) !== (factor.contribution_unit === null))
      fail(factorPath, "contribution_raw và contribution_unit phải cùng null/non-null");
    if (!factor.affects_objective && factor.contribution_raw !== null)
      fail(factorPath, "context-only factor không được claim objective contribution");
  }
  unique(factorIds, `${path}.factors[].id`);
  const references = array(item.reference_routes, `${path}.reference_routes`);
  if (references.length > 2) fail(`${path}.reference_routes`, "tối đa hai tuyến tham chiếu");
  const referenceIds: string[] = [];
  for (const [index, rawReference] of references.entries()) {
    const refPath = `${path}.reference_routes[${index}]`;
    const reference = record(rawReference, refPath);
    const id = string(reference.id, `${refPath}.id`);
    if (!id) fail(`${refPath}.id`, "không được rỗng");
    referenceIds.push(id);
    const kind = enumValue(reference.kind, new Set([
      "same_objective_optimum", "distance_optimum", "balanced_optimum",
      "avoid_edge_counterfactual",
    ]), `${refPath}.kind`);
    if (reference.provenance !== "posthoc_ucs") fail(`${refPath}.provenance`, "phải là posthoc_ucs");
    enumValue(reference.generated_for_mode, MODES, `${refPath}.generated_for_mode`);
    if (reference.excluded_edge !== null) string(reference.excluded_edge, `${refPath}.excluded_edge`);
    const referencePath = strings(reference.path, `${refPath}.path`);
    if (referencePath.length < 2) fail(`${refPath}.path`, "cần ít nhất hai node");
    legMetrics(reference.metrics, `${refPath}.metrics`);
    const parsedBreakdown = breakdown(reference.cost_breakdown, `${refPath}.cost_breakdown`);
    const parsedMetrics = reference.metrics as { total_distance_m: number; total_time_s: number };
    requireEquivalent(
      parsedMetrics.total_distance_m, parsedBreakdown.distance_m,
      `${refPath}.metrics.total_distance_m`, "không khớp breakdown distance",
    );
    requireEquivalent(
      parsedMetrics.total_time_s, parsedBreakdown.balanced_cost_s,
      `${refPath}.metrics.total_time_s`, "không khớp breakdown balanced",
    );
    if ((kind === "avoid_edge_counterfactual") !== (reference.excluded_edge !== null))
      fail(`${refPath}.excluded_edge`, "chỉ counterfactual được/luôn phải có excluded_edge");
    for (const key of [
      "reference_minus_selected_cost", "reference_minus_selected_distance_m",
      "reference_minus_selected_balanced_cost_s",
    ]) finite(reference[key], `${refPath}.${key}`);
    finite(reference.reference_minus_selected_pct, `${refPath}.reference_minus_selected_pct`, true);
    enumValue(reference.relation_to_selected, new Set(["better", "equivalent", "worse"]), `${refPath}.relation_to_selected`);
  }
  unique(referenceIds, `${path}.reference_routes[].id`);
  return item as unknown as ExplanationEvidence;
}

function explanation(
  value: unknown,
  path: string,
  v2: boolean,
): ExplanationEvidence | null {
  const item = record(value, path);
  string(item.summary_vi, `${path}.summary_vi`);
  array(item.congested_segments, `${path}.congested_segments`);
  array(item.alternatives, `${path}.alternatives`);
  return v2 ? evidence(item.evidence, `${path}.evidence`) : null;
}

export function parseTraceResponse(value: unknown): Trace {
  const item = record(value, "route");
  if (item.contract_version !== undefined && item.contract_version !== 2)
    fail("route.contract_version", "chỉ hỗ trợ version 2 hoặc field vắng mặt (v1)");
  const v2 = item.contract_version === 2;
  const algorithm = enumValue(item.algorithm, ALGORITHMS, "route.algorithm") as Algorithm;
  const mode = enumValue(item.mode, MODES, "route.mode");
  enumValue(item.time_slot, SLOTS, "route.time_slot");
  enumValue(item.graph, GRAPHS, "route.graph");
  appliedScenario(item.applied_scenario, "route.applied_scenario", v2);
  const found = boolean(item.found, "route.found");
  const path = strings(item.path, "route.path");
  const parsedMetrics = metrics(item.metrics, "route.metrics");
  if (parsedMetrics.epsilon_bound != null && algorithm !== "idastar")
    fail("route.metrics.epsilon_bound", "chỉ dành cho IDA*");
  if (v2 && algorithm === "idastar"
      && (parsedMetrics.epsilon_bound == null || parsedMetrics.epsilon_bound <= 0))
    fail("route.metrics.epsilon_bound", "v2 IDA* cần epsilon dương");
  if (parsedMetrics.beam_width != null && algorithm !== "beam")
    fail("route.metrics.beam_width", "chỉ dành cho Beam");
  if (found && path.length === 0) fail("route.path", "found=true cần path khác rỗng");
  if (!found && (path.length > 0 || parsedMetrics.total_cost !== null
    || parsedMetrics.total_distance_m !== null || parsedMetrics.total_time_s !== null))
    fail("route", "found=false cần path rỗng và outcome totals null");
  const steps = array(item.trace, "route.trace");
  for (const [index, step] of steps.entries()) {
    if (v2) traceStepV2(step, `route.trace[${index}]`, algorithm);
    else traceStepCommon(step, `route.trace[${index}]`, algorithm);
  }
  const parsedEvidence = explanation(item.explanation, "route.explanation", v2);
  if (v2) {
    const parsedTermination = termination(item.termination, "route.termination");
    const expectedReachability = {
      start_equals_goal: "route_found",
      goal_expanded: "route_found",
      bidirectional_bound_met: "route_found",
      frontier_exhausted: "proven_unreachable",
      depth_cap_reached: "inconclusive",
      round_cap_reached: "inconclusive",
      beam_exhausted_after_pruning: "inconclusive",
    }[parsedTermination.reason];
    if (parsedTermination.reachability !== expectedReachability)
      fail("route.termination.reachability", "không khớp termination reason");
    if (found !== (parsedTermination.reachability === "route_found"))
      fail("route.found", "không khớp termination reachability");
    if (parsedTermination.reason === "bidirectional_bound_met"
        && (algorithm !== "bidijkstra" || parsedTermination.bidirectional_bound === null))
      fail("route.termination", "bidirectional bound chỉ hợp lệ cho Bidirectional Dijkstra");
    if (parsedTermination.reason !== "bidirectional_bound_met"
        && parsedTermination.bidirectional_bound !== null)
      fail("route.termination.bidirectional_bound", "chỉ có khi reason=bidirectional_bound_met");
    if (parsedTermination.reason === "start_equals_goal" && path.length !== 1)
      fail("route.path", "start_equals_goal cần path đúng một node");
    if (found && parsedTermination.reason !== "start_equals_goal"
        && parsedTermination.reason !== "goal_expanded"
        && parsedTermination.reason !== "bidirectional_bound_met")
      fail("route.termination.reason", "found route có termination không hợp lệ");
    if (found && parsedTermination.reason !== "start_equals_goal") {
      if ((parsedTermination.solution_quality === "exact"
          || parsedTermination.solution_quality === "epsilon_bounded")
          && !parsedMetrics.optimal_guarantee)
        fail("route.metrics.optimal_guarantee", "quality exact/epsilon cần guarantee=true");
      if (parsedTermination.solution_quality === "feasible_unproven"
          && parsedMetrics.optimal_guarantee)
        fail("route.metrics.optimal_guarantee", "feasible_unproven cần guarantee=false");
    }
    if (parsedTermination.reason === "bidirectional_bound_met") {
      const bound = parsedTermination.bidirectional_bound;
      if (!bound || !path.includes(bound.meeting_node))
        fail("route.termination.bidirectional_bound.meeting_node", "phải nằm trên result path");
      if (parsedMetrics.total_cost === null)
        fail("route.metrics.total_cost", "bidirectional success cần total_cost");
      requireEquivalent(
        bound.mu, parsedMetrics.total_cost as number,
        "route.termination.bidirectional_bound.mu", "phải bằng metrics.total_cost",
      );
      const topForward = bound.top_forward?.g ?? Number.POSITIVE_INFINITY;
      const topBackward = bound.top_backward?.g ?? Number.POSITIVE_INFINITY;
      if (topForward + topBackward < bound.mu
          && !equivalent(topForward + topBackward, bound.mu))
        fail("route.termination.bidirectional_bound", "chưa đạt stop bound");
    }
    if (!parsedEvidence) fail("route.explanation.evidence", "bắt buộc cho v2");
    if (parsedEvidence.selection_rule !== RULE_BY_ALGORITHM[algorithm])
      fail("route.explanation.evidence.selection_rule", "không khớp algorithm");
    const objective = parsedEvidence.objective;
    if (objective.mode !== mode)
      fail("route.explanation.evidence.objective.mode", "không khớp active mode");
    const expectedUnit = mode === "distance" ? "m" : "s";
    for (const [index, factor] of parsedEvidence.factors.entries()) {
      if (factor.contribution_raw !== null && factor.contribution_unit !== expectedUnit)
        fail(`route.explanation.evidence.factors[${index}].contribution_unit`, "không khớp objective mode");
    }
    if (found) {
      if (!parsedEvidence.cost_breakdown)
        fail("route.explanation.evidence.cost_breakdown", "found route cần breakdown");
      if (parsedMetrics.total_cost === null || parsedMetrics.total_distance_m === null
          || parsedMetrics.total_time_s === null)
        fail("route.metrics", "found route cần đủ totals");
      if (objective.selected_value === null)
        fail("route.explanation.evidence.objective.selected_value", "found route cần selected value");
      requireEquivalent(
        objective.selected_value as number, parsedMetrics.total_cost as number,
        "route.explanation.evidence.objective.selected_value", "không khớp total_cost",
      );
      const routeBreakdown = parsedEvidence.cost_breakdown as PathCostBreakdown;
      requireEquivalent(
        objectiveFromBreakdown(routeBreakdown, mode), parsedMetrics.total_cost as number,
        "route.explanation.evidence.cost_breakdown", "objective breakdown không khớp total_cost",
      );
      requireEquivalent(
        routeBreakdown.distance_m, parsedMetrics.total_distance_m as number,
        "route.explanation.evidence.cost_breakdown.distance_m", "không khớp distance metrics",
      );
      requireEquivalent(
        routeBreakdown.balanced_cost_s, parsedMetrics.total_time_s as number,
        "route.explanation.evidence.cost_breakdown.balanced_cost_s", "không khớp total_time_s",
      );
      if (parsedTermination.solution_quality === "exact"
          && objective.optimality_gap !== null
          && !equivalent(objective.optimality_gap, 0))
        fail("route.explanation.evidence.objective.optimality_gap", "exact result cần gap 0");
      if (parsedTermination.solution_quality === "epsilon_bounded"
          && objective.optimality_gap !== null) {
        const epsilon = parsedMetrics.epsilon_bound;
        if (epsilon === undefined || epsilon === null || epsilon <= 0)
          fail("route.metrics.epsilon_bound", "epsilon-bounded result cần epsilon dương");
        if (objective.optimality_gap > epsilon && !equivalent(objective.optimality_gap, epsilon))
          fail(
            "route.explanation.evidence.objective.optimality_gap",
            "epsilon-bounded result vượt epsilon_bound",
          );
      }
      for (const [index, reference] of parsedEvidence.reference_routes.entries()) {
        const refPath = `route.explanation.evidence.reference_routes[${index}]`;
        const expectedGeneratedMode = {
          same_objective_optimum: mode,
          distance_optimum: "distance",
          balanced_optimum: "balanced",
          avoid_edge_counterfactual: null,
        }[reference.kind];
        if (expectedGeneratedMode && reference.generated_for_mode !== expectedGeneratedMode)
          fail(`${refPath}.generated_for_mode`, "không khớp reference kind");
        if (reference.path[0] !== path[0] || reference.path.at(-1) !== path.at(-1))
          fail(`${refPath}.path`, "phải dùng cùng route endpoints");
        requireEquivalent(
          reference.metrics.total_cost,
          objectiveFromBreakdown(reference.cost_breakdown, mode),
          `${refPath}.metrics.total_cost`, "không dùng active objective mode",
        );
        const signed = reference.metrics.total_cost - (parsedMetrics.total_cost as number);
        requireEquivalent(
          reference.reference_minus_selected_cost, signed,
          `${refPath}.reference_minus_selected_cost`, "signed trade-off sai",
        );
        requireEquivalent(
          reference.reference_minus_selected_distance_m,
          reference.metrics.total_distance_m - (parsedMetrics.total_distance_m as number),
          `${refPath}.reference_minus_selected_distance_m`, "distance trade-off sai",
        );
        requireEquivalent(
          reference.reference_minus_selected_balanced_cost_s,
          reference.metrics.total_time_s - (parsedMetrics.total_time_s as number),
          `${refPath}.reference_minus_selected_balanced_cost_s`, "balanced trade-off sai",
        );
        const expectedPct = equivalent(parsedMetrics.total_cost as number, 0)
          ? equivalent(reference.metrics.total_cost, 0) ? 0 : null
          : signed / (parsedMetrics.total_cost as number) * 100;
        if (expectedPct === null) {
          if (reference.reference_minus_selected_pct !== null)
            fail(`${refPath}.reference_minus_selected_pct`, "mẫu số 0 cần null");
        } else if (reference.reference_minus_selected_pct === null
            || !equivalent(reference.reference_minus_selected_pct, expectedPct)) {
          fail(`${refPath}.reference_minus_selected_pct`, "không khớp signed trade-off");
        }
        const expectedRelation = equivalent(reference.metrics.total_cost, parsedMetrics.total_cost as number)
          ? "equivalent" : signed < 0 ? "better" : "worse";
        if (reference.relation_to_selected !== expectedRelation)
          fail(`${refPath}.relation_to_selected`, "không khớp raw tolerance");
        if (parsedTermination.solution_quality === "exact"
            && reference.kind === "same_objective_optimum" && expectedRelation === "better")
          fail(refPath, "exact result mâu thuẫn exact reference");
      }
    } else if (objective.selected_value !== null || parsedEvidence.cost_breakdown !== null
        || parsedEvidence.reference_routes.length > 0) {
      fail("route.explanation.evidence", "not-found không được mang route objective facts");
    }
  }
  if (!v2) {
    return {
      ...item,
      applied_scenario: item.applied_scenario ?? null,
    } as unknown as Trace;
  }
  return item as unknown as Trace;
}

function legMetrics(value: unknown, path: string): LegMetrics {
  const item = record(value, path);
  nonnegative(item.total_cost, `${path}.total_cost`);
  nonnegative(item.total_distance_m, `${path}.total_distance_m`);
  nonnegative(item.total_time_s, `${path}.total_time_s`);
  return item as unknown as LegMetrics;
}

function leg(value: unknown, path: string, requireBreakdown: boolean): Leg {
  const item = record(value, path);
  string(item.from_node, `${path}.from_node`);
  string(item.to_node, `${path}.to_node`);
  const nodes = strings(item.path, `${path}.path`);
  legMetrics(item.metrics, `${path}.metrics`);
  if (requireBreakdown) {
    if (nodes.length === 0) fail(`${path}.path`, "v2 reachable leg cần path");
    breakdown(item.cost_breakdown, `${path}.cost_breakdown`);
  }
  else if (item.cost_breakdown !== undefined && item.cost_breakdown !== null)
    breakdown(item.cost_breakdown, `${path}.cost_breakdown`);
  if (nodes.length > 0 && (nodes[0] !== item.from_node || nodes.at(-1) !== item.to_node))
    fail(`${path}.path`, "endpoints không khớp from_node/to_node");
  return item as unknown as Leg;
}

function optimizationTrace(value: unknown, path: string): OptimizationTrace | null {
  if (value === null || value === undefined) return null;
  const item = record(value, path);
  const method = enumValue(item.method, METHODS, `${path}.method`) as
    "held_karp" | "nn_2opt" | "sa";
  const total = integer(item.total_events, `${path}.total_events`);
  const recorded = integer(item.recorded_events, `${path}.recorded_events`);
  const expectedPolicy = {
    held_karp: "all-or-stride-v1",
    nn_2opt: "chronological-prefix-final-v1",
    sa: "priority-periodic-20-v1",
  }[method];
  if (string(item.sampling_policy, `${path}.sampling_policy`) !== expectedPolicy)
    fail(`${path}.sampling_policy`, "không khớp method");
  const truncated = boolean(item.trace_truncated, `${path}.trace_truncated`);
  const events = array(item.events, `${path}.events`);
  if (recorded !== events.length)
    fail(`${path}.recorded_events`, "phải bằng events.length");
  if (total < recorded) fail(`${path}.total_events`, "không được nhỏ hơn recorded_events");
  if (truncated !== (total > recorded))
    fail(`${path}.trace_truncated`, "phải phản ánh total_events > recorded_events");
  const allowed = {
    held_karp: new Set(["held_karp_update", "held_karp_reconstruct"]),
    nn_2opt: new Set(["nn_decision", "local_improvement"]),
    sa: new Set(["sa_seed_boundary", "sa_iteration", "sa_final_best"]),
  }[method];
  let previousOrdinal = -1;
  events.forEach((rawEvent, index) => {
    const event = record(rawEvent, `${path}.events[${index}]`);
    const kind = string(event.kind, `${path}.events[${index}].kind`);
    const ordinal = integer(event.ordinal, `${path}.events[${index}].ordinal`);
    if (ordinal <= previousOrdinal)
      fail(`${path}.events[${index}].ordinal`, "phải tăng nghiêm ngặt");
    previousOrdinal = ordinal;
    const final = index === events.length - 1;
    if (final) {
      if (kind !== "optimization_summary" || event.method !== method)
        fail(`${path}.events[${index}]`, "event cuối phải là summary cùng method");
    } else if (!allowed.has(kind)) {
      fail(`${path}.events[${index}].kind`, "không khớp method");
    }
  });
  if (events.length === 0) fail(`${path}.events`, "không được rỗng");
  const penultimate = events.length >= 2
    ? record(events[events.length - 2], `${path}.events[${events.length - 2}]`).kind
    : null;
  if (method === "held_karp" && penultimate !== "held_karp_reconstruct")
    fail(`${path}.events`, "Held-Karp reconstruct phải đứng trước summary");
  if (method === "sa" && penultimate !== "sa_final_best")
    fail(`${path}.events`, "SA final-best phải đứng trước summary");
  return item as unknown as OptimizationTrace;
}

function legacyOptimizerStats(value: unknown, path: string): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  const item = record(value, path);
  const seeds = array(item.seeds, `${path}.seeds`);
  const seedIds: number[] = [];
  const bestCosts: number[] = [];
  for (const [index, rawSeed] of seeds.entries()) {
    const seed = record(rawSeed, `${path}.seeds[${index}]`);
    seedIds.push(integer(seed.seed, `${path}.seeds[${index}].seed`));
    integer(seed.iterations, `${path}.seeds[${index}].iterations`);
    const finalCost = finite(seed.final_cost, `${path}.seeds[${index}].final_cost`) as number;
    const bestCost = finite(seed.best_cost, `${path}.seeds[${index}].best_cost`) as number;
    if (bestCost > finalCost && !equivalent(bestCost, finalCost))
      fail(`${path}.seeds[${index}].best_cost`, "không được lớn hơn final_cost");
    bestCosts.push(bestCost);
    strings(seed.best_order, `${path}.seeds[${index}].best_order`);
  }
  if (JSON.stringify(seedIds) !== JSON.stringify([0, 1, 2, 3, 4]))
    fail(`${path}.seeds`, "phải là seeds 0..4 theo thứ tự");
  const bestSeed = integer(item.best_seed, `${path}.best_seed`);
  const bestCost = finite(item.best_cost, `${path}.best_cost`) as number;
  nonnegative(item.mean_best_cost, `${path}.mean_best_cost`);
  nonnegative(item.stddev_best_cost, `${path}.stddev_best_cost`);
  if (!seedIds.includes(bestSeed)) fail(`${path}.best_seed`, "không thuộc seeds");
  requireEquivalent(bestCost, Math.min(...bestCosts), `${path}.best_cost`, "không phải minimum per-seed");
  return item;
}

function validateMoveCounts(item: Record<string, unknown>, path: string): void {
  const attempted = integer(item.attempted_moves, `${path}.attempted_moves`);
  const acceptedImproving = integer(
    item.accepted_improving_moves, `${path}.accepted_improving_moves`,
  );
  const acceptedEqual = integer(item.accepted_equal_moves, `${path}.accepted_equal_moves`);
  const acceptedWorse = integer(item.accepted_worse_moves, `${path}.accepted_worse_moves`);
  const rejected = integer(item.rejected_moves, `${path}.rejected_moves`);
  if (attempted !== acceptedImproving + acceptedEqual + acceptedWorse + rejected)
    fail(`${path}.attempted_moves`, "không bằng tổng bốn phân loại move");
}

function methodStats(value: unknown, path: string): AtspMethodStats {
  const item = record(value, path);
  const kind = enumValue(item.kind, new Set([
    "held_karp", "nn_local_search", "simulated_annealing",
  ]), `${path}.kind`);
  if (kind === "held_karp") {
    integer(item.dp_states_solved, `${path}.dp_states_solved`, 1);
    integer(item.transitions_evaluated, `${path}.transitions_evaluated`);
  } else if (kind === "nn_local_search") {
    for (const key of ["nn_initial_cost", "final_cost", "improvement_after_nn"])
      nonnegative(item[key], `${path}.${key}`);
    for (const key of [
      "nn_candidates_evaluated", "two_opt_candidates_evaluated",
      "or_opt_candidates_evaluated", "accepted_2opt_moves", "accepted_oropt_moves",
    ]) integer(item[key], `${path}.${key}`);
    const initial = item.nn_initial_cost as number;
    const final = item.final_cost as number;
    if (final > initial && !equivalent(final, initial))
      fail(`${path}.final_cost`, "không được lớn hơn NN initial cost");
    requireEquivalent(
      item.improvement_after_nn as number, initial - final,
      `${path}.improvement_after_nn`, "phải bằng initial - final",
    );
  } else {
    const seedCount = integer(item.seed_count, `${path}.seed_count`, 1);
    const bestSeed = integer(item.best_seed, `${path}.best_seed`);
    for (const key of ["best_cost", "mean_best_cost", "stddev_best_cost"])
      nonnegative(item[key], `${path}.${key}`);
    validateMoveCounts(item, path);
    const seeds = array(item.seeds, `${path}.seeds`);
    if (seedCount !== seeds.length) fail(`${path}.seed_count`, "phải bằng seeds.length");
    const parsedSeeds = seeds.map((rawSeed, index) => {
      const seedPath = `${path}.seeds[${index}]`;
      const seed = record(rawSeed, seedPath);
      const seedId = integer(seed.seed, `${seedPath}.seed`);
      const iterations = integer(seed.iterations, `${seedPath}.iterations`);
      const finalCost = nonnegative(seed.final_cost, `${seedPath}.final_cost`) as number;
      const bestCost = nonnegative(seed.best_cost, `${seedPath}.best_cost`) as number;
      const bestOrder = strings(seed.best_order, `${seedPath}.best_order`);
      validateMoveCounts(seed, seedPath);
      if (iterations !== seed.attempted_moves)
        fail(`${seedPath}.iterations`, "phải bằng attempted_moves");
      if (bestCost > finalCost && !equivalent(bestCost, finalCost))
        fail(`${seedPath}.best_cost`, "không được lớn hơn final_cost");
      return { seedId, bestCost, bestOrder, raw: seed };
    });
    if (JSON.stringify(parsedSeeds.map((seed) => seed.seedId))
        !== JSON.stringify([0, 1, 2, 3, 4]))
      fail(`${path}.seeds`, "phải là seeds 0..4 theo thứ tự");
    const bestIndex = parsedSeeds.reduce((best, seed, index) => (
      seed.bestCost < parsedSeeds[best].bestCost ? index : best
    ), 0);
    if (bestSeed !== parsedSeeds[bestIndex].seedId)
      fail(`${path}.best_seed`, "không khớp best-cost tie theo seed order");
    requireEquivalent(
      item.best_cost as number, parsedSeeds[bestIndex].bestCost,
      `${path}.best_cost`, "không khớp best seed cost",
    );
    const costs = parsedSeeds.map((seed) => seed.bestCost);
    const mean = costs.reduce((total, cost) => total + cost, 0) / costs.length;
    const stddev = costs.length === 1 ? 0 : Math.sqrt(
      costs.reduce((total, cost) => total + (cost - mean) ** 2, 0) / (costs.length - 1),
    );
    requireEquivalent(item.mean_best_cost as number, mean, `${path}.mean_best_cost`, "mean sai");
    requireEquivalent(
      item.stddev_best_cost as number, stddev,
      `${path}.stddev_best_cost`, "sample standard deviation sai",
    );
    for (const key of [
      "attempted_moves", "accepted_improving_moves", "accepted_equal_moves",
      "accepted_worse_moves", "rejected_moves",
    ]) {
      const expected = parsedSeeds.reduce((total, seed) => total + (seed.raw[key] as number), 0);
      if (item[key] !== expected) fail(`${path}.${key}`, "không bằng tổng per-seed");
    }
  }
  return item as unknown as AtspMethodStats;
}

function matrixEvidence(value: unknown, path: string): Record<string, unknown> {
  const item = record(value, path);
  const points = integer(item.point_count, `${path}.point_count`, 2);
  const directed = integer(item.directed_pair_count, `${path}.directed_pair_count`, 2);
  const reachable = integer(item.reachable_directed_pair_count, `${path}.reachable_directed_pair_count`);
  const asymmetric = integer(item.asymmetric_unordered_pair_count, `${path}.asymmetric_unordered_pair_count`);
  if (directed !== points * (points - 1))
    fail(`${path}.directed_pair_count`, "phải bằng k*(k-1)");
  if (reachable > directed)
    fail(`${path}.reachable_directed_pair_count`, "không được vượt directed_pair_count");
  if (asymmetric > directed / 2)
    fail(`${path}.asymmetric_unordered_pair_count`, "không được vượt số unordered pairs");
  const example = nullableObject(item.asymmetry_example, `${path}.asymmetry_example`);
  if ((asymmetric === 0) !== (example === null))
    fail(`${path}.asymmetry_example`, "phải non-null iff có asymmetric pair");
  if (example) {
    const from = string(example.from_node, `${path}.asymmetry_example.from_node`);
    const to = string(example.to_node, `${path}.asymmetry_example.to_node`);
    if (from >= to) fail(`${path}.asymmetry_example`, "orientation cần from_node < to_node");
    const forward = nonnegative(
      example.forward_cost, `${path}.asymmetry_example.forward_cost`,
    ) as number;
    const reverse = nonnegative(
      example.reverse_cost, `${path}.asymmetry_example.reverse_cost`,
    ) as number;
    const delta = finite(example.absolute_delta, `${path}.asymmetry_example.absolute_delta`) as number;
    if (delta <= 0) fail(`${path}.asymmetry_example.absolute_delta`, "phải > 0");
    requireEquivalent(
      delta, Math.abs(forward - reverse),
      `${path}.asymmetry_example.absolute_delta`, "không khớp hai directed costs",
    );
    if (equivalent(forward, reverse))
      fail(`${path}.asymmetry_example`, "hai cost equivalent không phải asymmetry");
  }
  return item;
}

function computationMetrics(value: unknown, path: string): void {
  const item = record(value, path);
  integer(item.matrix_search_runs, `${path}.matrix_search_runs`);
  integer(item.matrix_nodes_expanded, `${path}.matrix_nodes_expanded`);
  const matrixRuntime = nonnegative(item.matrix_runtime_ms, `${path}.matrix_runtime_ms`) as number;
  const optimizerRuntime = nonnegative(item.optimizer_runtime_ms, `${path}.optimizer_runtime_ms`) as number;
  const totalRuntime = nonnegative(item.total_runtime_ms, `${path}.total_runtime_ms`) as number;
  if (totalRuntime + 0.002 < matrixRuntime + optimizerRuntime)
    fail(`${path}.total_runtime_ms`, "nhỏ hơn matrix + optimizer runtime quá tolerance");
}

function validateLegAggregate(
  legs: readonly Leg[],
  totals: LegMetrics,
  aggregate: PathCostBreakdown,
  mode: unknown,
  path: string,
): void {
  const expectedMetrics = {
    total_cost: legs.reduce((sum, item) => sum + item.metrics.total_cost, 0),
    total_distance_m: legs.reduce((sum, item) => sum + item.metrics.total_distance_m, 0),
    total_time_s: legs.reduce((sum, item) => sum + item.metrics.total_time_s, 0),
  };
  for (const key of ["total_cost", "total_distance_m", "total_time_s"] as const) {
    requireEquivalent(totals[key], expectedMetrics[key], `${path}.totals.${key}`, "không bằng tổng legs");
  }
  for (const key of BREAKDOWN_KEYS) {
    const expected = legs.reduce((sum, item) => (
      sum + ((item.cost_breakdown as PathCostBreakdown)[key])
    ), 0);
    requireEquivalent(aggregate[key], expected, `${path}.breakdown.${key}`, "không bằng tổng leg breakdowns");
  }
  requireEquivalent(
    totals.total_cost, objectiveFromBreakdown(aggregate, mode),
    `${path}.totals.total_cost`, "không khớp active objective breakdown",
  );
  requireEquivalent(
    totals.total_distance_m, aggregate.distance_m,
    `${path}.totals.total_distance_m`, "không khớp aggregate distance",
  );
  requireEquivalent(
    totals.total_time_s, aggregate.balanced_cost_s,
    `${path}.totals.total_time_s`, "không khớp aggregate balanced cost",
  );
}

function parseMultirouteV2(item: Record<string, unknown>): MultirouteV2 {
  appliedScenario(item.applied_scenario, "multiroute.applied_scenario", true);
  const returnToStart = boolean(item.return_to_start, "multiroute.return_to_start");
  const method = item.method as "held_karp" | "nn_2opt" | "sa";
  const mode = item.mode;
  const originalOrder = strings(item.original_order, "multiroute.original_order");
  if (originalOrder.length < 2 || new Set(originalOrder).size !== originalOrder.length)
    fail("multiroute.original_order", "cần Start + stop unique, không lặp Start cuối");
  const found = boolean(item.found, "multiroute.found");
  const legs = array(item.legs, "multiroute.legs").map(
    (value, index) => leg(value, `multiroute.legs[${index}]`, found),
  );
  const originalLegs = array(item.original_order_legs, "multiroute.original_order_legs").map(
    (value, index) => leg(value, `multiroute.original_order_legs[${index}]`, found),
  );
  const matrix = matrixEvidence(item.matrix_evidence, "multiroute.matrix_evidence");
  if (matrix.point_count !== originalOrder.length)
    fail("multiroute.matrix_evidence.point_count", "phải bằng original_order.length");
  computationMetrics(item.computation_metrics, "multiroute.computation_metrics");
  const trace = optimizationTrace(item.optimization_trace, "multiroute.optimization_trace");
  if (trace && trace.method !== method)
    fail("multiroute.optimization_trace.method", "không khớp response method");
  const legacyStats = legacyOptimizerStats(item.optimizer_stats, "multiroute.optimizer_stats");
  if (found) {
    if (matrix.reachable_directed_pair_count !== matrix.directed_pair_count)
      fail("multiroute.matrix_evidence.reachable_directed_pair_count", "reachable result cần complete matrix");
    const totals = legMetrics(item.totals, "multiroute.totals");
    const originalTotals = legMetrics(item.original_order_totals, "multiroute.original_order_totals");
    const savings = finite(item.savings_pct, "multiroute.savings_pct") as number;
    const totalsBreakdown = breakdown(item.totals_breakdown, "multiroute.totals_breakdown");
    const originalBreakdown = breakdown(
      item.original_order_breakdown, "multiroute.original_order_breakdown",
    );
    if (item.failure !== null) fail("multiroute.failure", "found=true cần failure=null");
    const stats = methodStats(item.method_stats, "multiroute.method_stats");
    const expectedStatsKind = {
      held_karp: "held_karp",
      nn_2opt: "nn_local_search",
      sa: "simulated_annealing",
    }[method];
    if (stats.kind !== expectedStatsKind)
      fail("multiroute.method_stats.kind", "không khớp method");
    const order = strings(item.order, "multiroute.order");
    if (order[0] !== originalOrder[0]
        || JSON.stringify([...order].sort()) !== JSON.stringify([...originalOrder].sort()))
      fail("multiroute.order", "phải là permutation cùng Start của original_order");
    const expectedPairs = (candidateOrder: string[]) => {
      const pairs = candidateOrder.slice(0, -1).map((from, index) => [from, candidateOrder[index + 1]]);
      if (returnToStart) pairs.push([candidateOrder.at(-1) as string, candidateOrder[0]]);
      return pairs;
    };
    for (const [label, candidateOrder, candidateLegs] of [
      ["legs", order, legs],
      ["original_order_legs", originalOrder, originalLegs],
    ] as const) {
      const actualPairs = candidateLegs.map((rawLeg, index) => {
        const parsedLeg = record(rawLeg, `multiroute.${label}[${index}]`);
        return [parsedLeg.from_node, parsedLeg.to_node];
      });
      if (JSON.stringify(actualPairs) !== JSON.stringify(expectedPairs([...candidateOrder])))
        fail(`multiroute.${label}`, "không khớp open/closed topology đã echo");
    }
    validateLegAggregate(legs, totals, totalsBreakdown, mode, "multiroute.optimized");
    validateLegAggregate(
      originalLegs, originalTotals, originalBreakdown, mode, "multiroute.original",
    );
    if (method === "sa") {
      if (!legacyStats) fail("multiroute.optimizer_stats", "reachable SA cần legacy stats");
      const saStats = stats as Extract<AtspMethodStats, { kind: "simulated_annealing" }>;
      for (const [index, seed] of saStats.seeds.entries()) {
        if (!seed.best_order.length || seed.best_order[0] !== originalOrder[0]
            || JSON.stringify([...seed.best_order].sort()) !== JSON.stringify([...originalOrder].sort()))
          fail(`multiroute.method_stats.seeds[${index}].best_order`, "không phải permutation cùng Start");
      }
      for (const key of ["best_seed", "best_cost", "mean_best_cost", "stddev_best_cost"] as const) {
        const legacyValue = legacyStats[key];
        const currentValue = saStats[key];
        if (typeof currentValue === "number" && typeof legacyValue === "number") {
          requireEquivalent(legacyValue, currentValue, `multiroute.optimizer_stats.${key}`, "drift với method_stats");
        } else if (legacyValue !== currentValue) {
          fail(`multiroute.optimizer_stats.${key}`, "drift với method_stats");
        }
      }
    } else if (legacyStats !== null) {
      fail("multiroute.optimizer_stats", "chỉ dành cho SA");
    }
    const originalCost = originalTotals.total_cost;
    const optimizedCost = totals.total_cost;
    const rawSavings = equivalent(originalCost, 0)
      ? equivalent(optimizedCost, 0) ? 0 : null
      : (originalCost - optimizedCost) / originalCost * 100;
    if (rawSavings === null)
      fail("multiroute.savings_pct", "không thể finite khi baseline 0 nhưng optimized khác 0");
    // Legacy field is intentionally rounded to one decimal by B2.
    if (Math.abs(savings - rawSavings) > 0.0500001
        || !equivalent(savings * 10, Math.round(savings * 10)))
      fail("multiroute.savings_pct", "không phải raw savings làm tròn một chữ số");
  } else {
    if (strings(item.order, "multiroute.order").length || legs.length || originalLegs.length)
      fail("multiroute", "found=false cần order/legs/original_order_legs rỗng");
    for (const key of [
      "totals", "original_order_totals", "savings_pct", "totals_breakdown",
      "original_order_breakdown", "method_stats", "optimizer_stats", "optimization_trace",
    ]) if (item[key] !== null) fail(`multiroute.${key}`, "matrix failure cần null");
    const failure = record(item.failure, "multiroute.failure");
    if (failure.kind !== "matrix_incomplete") fail("multiroute.failure.kind", "phải là matrix_incomplete");
    string(failure.from_node, "multiroute.failure.from_node");
    string(failure.to_node, "multiroute.failure.to_node");
    if (legacyStats !== null) fail("multiroute.optimizer_stats", "matrix failure cần null");
  }
  return item as unknown as MultirouteV2;
}

export function parseMultirouteResponse(value: unknown): MultirouteResponse {
  const item = record(value, "multiroute");
  if (item.contract_version !== undefined && item.contract_version !== 2)
    fail("multiroute.contract_version", "chỉ hỗ trợ version 2 hoặc field vắng mặt (v1)");
  const method = enumValue(item.method, METHODS, "multiroute.method");
  enumValue(item.mode, MODES, "multiroute.mode");
  enumValue(item.time_slot, SLOTS, "multiroute.time_slot");
  enumValue(item.graph, GRAPHS, "multiroute.graph");
  const found = boolean(item.found, "multiroute.found");
  const order = strings(item.order, "multiroute.order");
  const legs = array(item.legs, "multiroute.legs");
  for (const [index, value] of legs.entries()) leg(value, `multiroute.legs[${index}]`, false);
  if (found) {
    if (order.length === 0 || legs.length === 0)
      fail("multiroute", "found=true cần order và legs khác rỗng");
    legMetrics(item.totals, "multiroute.totals");
    legMetrics(item.original_order_totals, "multiroute.original_order_totals");
    finite(item.savings_pct, "multiroute.savings_pct");
    for (let index = 1; index < legs.length; index += 1) {
      const previous = record(legs[index - 1], `multiroute.legs[${index - 1}]`);
      const current = record(legs[index], `multiroute.legs[${index}]`);
      if (previous.to_node !== current.from_node)
        fail(`multiroute.legs[${index}]`, "không chain với leg trước");
    }
    if (record(legs[0], "multiroute.legs[0]").from_node !== order[0])
      fail("multiroute.legs[0].from_node", "phải bắt đầu tại order[0]");
  } else {
    if (order.length || legs.length) fail("multiroute", "found=false cần order/legs rỗng");
    for (const key of ["totals", "original_order_totals", "savings_pct"])
      if (item[key] !== null) fail(`multiroute.${key}`, "found=false cần null");
  }
  boolean(item.optimal_guarantee, "multiroute.optimal_guarantee");
  if (item.contract_version === 2) return parseMultirouteV2(item);
  appliedScenario(item.applied_scenario, "multiroute.applied_scenario", false);
  const trace = optimizationTrace(item.optimization_trace, "multiroute.optimization_trace");
  if (trace && trace.method !== method)
    fail("multiroute.optimization_trace.method", "không khớp response method");
  const legacyStats = legacyOptimizerStats(item.optimizer_stats, "multiroute.optimizer_stats");
  if (!found && (trace !== null || legacyStats !== null))
    fail("multiroute", "found=false cần optimization trace/stats null");
  if (method === "sa" && found && legacyStats === null)
    fail("multiroute.optimizer_stats", "reachable SA cần stats");
  if (method !== "sa" && legacyStats !== null)
    fail("multiroute.optimizer_stats", "chỉ dành cho SA");
  return {
    ...item,
    applied_scenario: item.applied_scenario ?? null,
    optimization_trace: item.optimization_trace ?? null,
    optimizer_stats: item.optimizer_stats ?? null,
  } as unknown as MultirouteResponse;
}

export function responseCapability(value: Trace | MultirouteResponse): ContractCapability {
  return value.contract_version === 2 ? "v2" : "v1";
}

export function serverScenarioFingerprint(
  value: Trace | MultirouteResponse,
): string | null {
  return value.applied_scenario?.fingerprint ?? null;
}

export function isTraceV2(value: Trace): value is Extract<Trace, { contract_version: 2 }> {
  return value.contract_version === 2;
}

export function isMultirouteV2(
  value: MultirouteResponse,
): value is MultirouteV2 {
  return value.contract_version === 2;
}
