import type {
  Algorithm, EdgeOverride, GraphLevel, GraphView, JourneyDrafts, Mode,
  MultiStrategy, ProblemMode, RouteParamsByAlgorithm, RunKind, RunSnapshot,
  ScenarioConfig, TimeSlot, TspMethod,
} from "./types";

export interface JourneyModeState {
  problemMode: ProblemMode;
  multiStrategy: MultiStrategy;
  runKind: RunKind;
  drafts: JourneyDrafts;
}

export type JourneyTransition =
  | { type: "problem_mode"; value: ProblemMode }
  | { type: "multi_strategy"; value: MultiStrategy }
  | { type: "run_kind"; value: RunKind }
  | { type: "start"; value: string | null }
  | { type: "two_point_goal"; value: string | null }
  | { type: "multi_stops"; value: readonly string[] }
  | { type: "return_to_start"; value: boolean };

export interface JourneyTransitionResult {
  state: JourneyModeState;
  invalidateComputation: boolean;
  abortInFlight: boolean;
}

export const DEFAULT_JOURNEY_STATE: JourneyModeState = {
  problemMode: "two_point",
  multiStrategy: "ordered_search",
  runKind: "single",
  drafts: {
    start: null,
    twoPointGoal: null,
    multiStops: [],
    returnToStart: false,
  },
};

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

/**
 * Explicit journey state machine. Drafts are retained across mode/strategy
 * switches; only active computation becomes invalid. No Goal-to-stop promotion
 * or implicit run/default substitution is performed here.
 */
export function transitionJourneyMode(
  current: JourneyModeState,
  transition: JourneyTransition,
): JourneyTransitionResult {
  let state = current;
  let changed = false;
  let affectsActiveComputation = false;
  switch (transition.type) {
    case "problem_mode":
      changed = transition.value !== current.problemMode;
      affectsActiveComputation = changed;
      if (changed) state = { ...current, problemMode: transition.value };
      break;
    case "multi_strategy":
      changed = transition.value !== current.multiStrategy;
      affectsActiveComputation = changed && current.problemMode === "multi_point";
      if (changed) state = { ...current, multiStrategy: transition.value };
      break;
    case "run_kind":
      changed = transition.value !== current.runKind;
      affectsActiveComputation = changed;
      if (changed) state = { ...current, runKind: transition.value };
      break;
    case "start":
      changed = transition.value !== current.drafts.start;
      affectsActiveComputation = changed;
      if (changed) state = { ...current, drafts: { ...current.drafts, start: transition.value } };
      break;
    case "two_point_goal":
      changed = transition.value !== current.drafts.twoPointGoal;
      affectsActiveComputation = changed && current.problemMode === "two_point";
      if (changed) state = {
        ...current,
        drafts: { ...current.drafts, twoPointGoal: transition.value },
      };
      break;
    case "multi_stops": {
      const next = [...transition.value];
      changed = !sameIds(next, current.drafts.multiStops);
      affectsActiveComputation = changed && current.problemMode === "multi_point";
      if (changed) state = { ...current, drafts: { ...current.drafts, multiStops: next } };
      break;
    }
    case "return_to_start":
      changed = transition.value !== current.drafts.returnToStart;
      affectsActiveComputation = changed && current.problemMode === "multi_point";
      if (changed) state = {
        ...current,
        drafts: { ...current.drafts, returnToStart: transition.value },
      };
      break;
  }
  return {
    state,
    invalidateComputation: affectsActiveComputation,
    abortInFlight: affectsActiveComputation,
  };
}

export function activeJourneyInputs(state: JourneyModeState): {
  start: string | null;
  goal: string | null;
  stops: readonly string[];
  returnToStart: boolean;
} {
  if (state.problemMode === "two_point") {
    return {
      start: state.drafts.start,
      goal: state.drafts.twoPointGoal,
      stops: [],
      returnToStart: false,
    };
  }
  return {
    start: state.drafts.start,
    goal: null,
    stops: state.drafts.multiStops,
    returnToStart: state.drafts.returnToStart,
  };
}

export function orderedJourneyWaypoints(
  start: string,
  stops: readonly string[],
  returnToStart: boolean,
): string[] {
  const withoutClosingStart = stops.filter((node, index) => (
    node !== start || index !== stops.length - 1
  ));
  const waypoints = [start, ...withoutClosingStart];
  if (returnToStart && waypoints.length > 1) waypoints.push(start);
  return waypoints;
}

export function isAtspMethodEligible(method: TspMethod, stopCount: number): boolean {
  const pointCount = 1 + stopCount;
  return method === "held_karp" ? pointCount <= 15 : pointCount <= 16;
}

export function atspEligibilityReason(method: TspMethod, stopCount: number): string | null {
  if (isAtspMethodEligible(method, stopCount)) return null;
  const pointCount = 1 + stopCount;
  const limit = method === "held_karp" ? 15 : 16;
  return `${method} nhận ${pointCount} điểm, vượt giới hạn ${limit} điểm.`;
}

export function atspRunBlockReason(
  start: string | null,
  stops: readonly string[],
  methods: readonly TspMethod[],
): string | null {
  if (!start || stops.length === 0)
    return "Cần điểm Đi và ít nhất 1 điểm giao để tối ưu thứ tự.";
  if (stops.length > 15) return "ATSP hỗ trợ tối đa 15 điểm giao.";
  if (new Set([start, ...stops]).size !== stops.length + 1)
    return "Điểm Đi và các điểm giao ATSP phải unique.";
  for (const method of methods) {
    const reason = atspEligibilityReason(method, stops.length);
    if (reason) return reason;
  }
  return null;
}

function cloneOverride(override: EdgeOverride): EdgeOverride {
  const congestion = override.congestion
    ? Object.fromEntries(Object.entries(override.congestion).sort(([a], [b]) => a.localeCompare(b)))
    : undefined;
  const risk = override.risk
    ? Object.fromEntries(Object.entries(override.risk).sort(([a], [b]) => a.localeCompare(b)))
    : undefined;
  return {
    edge_id: override.edge_id,
    ...(override.length_m === undefined ? {} : { length_m: override.length_m }),
    ...(override.free_speed_kmh === undefined ? {} : { free_speed_kmh: override.free_speed_kmh }),
    ...(congestion && Object.keys(congestion).length ? { congestion } : {}),
    ...(risk && Object.keys(risk).length ? { risk } : {}),
  };
}

export function normalizeSnapshotScenario(
  graphView: GraphView,
  scenario: ScenarioConfig | null | undefined,
): RunSnapshot["scenario"] {
  if (scenario?.graph_view !== undefined && scenario.graph_view !== graphView)
    throw new Error("Scenario graph_view không khớp graph view đang chạy.");
  const edgeOverrides = [...(scenario?.edge_overrides ?? [])]
    .map(cloneOverride)
    .sort((left, right) => left.edge_id.localeCompare(right.edge_id));
  if (new Set(edgeOverrides.map((override) => override.edge_id)).size !== edgeOverrides.length)
    throw new Error("Scenario snapshot không chấp nhận edge override trùng ID.");
  const effectiveView = scenario?.graph_view ?? graphView;
  if (effectiveView === "full" && edgeOverrides.length === 0) return null;
  return { graph_view: effectiveView, edge_overrides: edgeOverrides };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}

export interface RunSnapshotInput {
  graph: GraphLevel;
  graphView: GraphView;
  slot: TimeSlot;
  mode: Mode;
  scenario?: ScenarioConfig | null;
  problemMode: ProblemMode;
  multiStrategy: MultiStrategy;
  runKind: RunKind;
  drafts: JourneyDrafts;
  algorithms: readonly Algorithm[];
  routeParamsByAlgorithm?: RouteParamsByAlgorithm;
  methods: readonly TspMethod[];
  includeRouteTrace: boolean;
  includeOptimizationTrace: boolean;
}

function effectiveParams(
  algorithm: Algorithm,
  graph: GraphLevel,
  params: RouteParamsByAlgorithm,
): Readonly<{ beam_width?: number; epsilon?: number }> {
  if (algorithm === "beam") {
    const candidate = params.beam?.beam_width ?? (graph === "demo" ? 5 : 50);
    if (!Number.isInteger(candidate) || candidate < 1)
      throw new Error("Beam width phải là số nguyên dương.");
    return { beam_width: candidate };
  }
  if (algorithm === "idastar") {
    const candidate = params.idastar?.epsilon ?? 5;
    if (!Number.isFinite(candidate) || candidate < 0)
      throw new Error("Epsilon phải là số hữu hạn không âm.");
    return { epsilon: candidate };
  }
  return {};
}

export function createRunSnapshot(input: RunSnapshotInput): RunSnapshot {
  const scenario = normalizeSnapshotScenario(input.graphView, input.scenario);
  const isRoute = input.problemMode === "two_point"
    || input.multiStrategy === "ordered_search";
  const algorithms = isRoute ? [...input.algorithms] : [];
  const methods = isRoute ? [] : [...input.methods];
  const params = Object.fromEntries(algorithms.map((algorithm) => [
    algorithm,
    effectiveParams(algorithm, input.graph, input.routeParamsByAlgorithm ?? {}),
  ])) as RouteParamsByAlgorithm;
  const snapshot: RunSnapshot = {
    graph: input.graph,
    graphView: input.graphView,
    slot: input.slot,
    mode: input.mode,
    scenario,
    scenarioKey: JSON.stringify(scenario),
    problemMode: input.problemMode,
    multiStrategy: input.problemMode === "two_point" ? null : input.multiStrategy,
    start: input.drafts.start,
    goal: input.problemMode === "two_point" ? input.drafts.twoPointGoal : null,
    stops: input.problemMode === "multi_point" ? [...input.drafts.multiStops] : [],
    returnToStart: input.problemMode === "multi_point" && input.drafts.returnToStart,
    algorithms,
    routeParamsByAlgorithm: params,
    methods,
    includeRouteTrace: isRoute && input.runKind === "single" && input.includeRouteTrace,
    includeOptimizationTrace: !isRoute && input.runKind === "single"
      && input.includeOptimizationTrace,
  };
  return deepFreeze(snapshot);
}

export function snapshotScenarioRequest(snapshot: RunSnapshot): ScenarioConfig | undefined {
  if (!snapshot.scenario) return undefined;
  return {
    ...(snapshot.scenario.graph_view === "full" ? {} : {
      graph_view: snapshot.scenario.graph_view,
    }),
    ...(snapshot.scenario.edge_overrides.length ? {
      edge_overrides: snapshot.scenario.edge_overrides.map(cloneOverride),
    } : {}),
  };
}
