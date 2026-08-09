import type {
  Explanation, Metrics, ProblemMode, ReachabilityConclusion, SolutionQuality,
  TerminationReason, Trace, TraceStep, TraceStepV1, TraceV1,
} from "./types";

export const SEQUENTIAL_TIMELINE_CAP = 5_000;

export interface SequentialTimelineMeta {
  policy: "per-leg-boundary-proportional-v1";
  sourceRecordedSteps: number;
  presentedSteps: number;
  presentationSampled: boolean;
  sourceTraceTruncated: boolean;
  sourceTruncatedLegIndexes: number[];
}

export interface PresentedStepSource {
  legIndex: number;
  sourceStepIndex: number;
}

export interface SequentialRouteLeg {
  index: number;
  from_node: string;
  to_node: string;
  found: boolean;
  path: string[];
  metrics: Metrics;
  closing_leg: boolean;
  label: string;
  explanation: Explanation;
  terminationReason: TerminationReason | null;
  solutionQuality: SolutionQuality | null;
  reachability: ReachabilityConclusion | null;
  sourceTrace: Trace;
  trace_start: number | null;
  trace_end: number | null;
}

export interface SequentialRouteRun {
  waypoints: string[];
  legs: SequentialRouteLeg[];
  timeline: SequentialTimelineMeta;
  presentedStepSources: PresentedStepSource[];
  returnToStart: boolean;
}

export interface SequentialRouteResult {
  trace: Trace;
  run: SequentialRouteRun;
}

export function sequentialWaypoints(
  problemMode: ProblemMode,
  start: string,
  goal: string | null,
  stops: readonly string[],
  returnToStart = false,
): string[] {
  if (problemMode === "two_point") return goal ? [start, goal] : [start];
  const withoutExistingClosingStart = stops.at(-1) === start ? stops.slice(0, -1) : stops;
  const waypoints = [start, ...withoutExistingClosingStart];
  if (returnToStart && waypoints.length > 1) waypoints.push(start);
  return waypoints;
}

export interface SampledSequentialTrace {
  steps: Array<{ step: TraceStep; source: PresentedStepSource }>;
  ranges: Array<{ start: number | null; end: number | null }>;
  meta: SequentialTimelineMeta;
}

function sampledInteriorIndexes(interiorCount: number, quota: number): number[] {
  return Array.from({ length: quota }, (_, index) => (
    Math.floor((index + 1) * (interiorCount + 1) / (quota + 1))
  ));
}

/** Exact `per-leg-boundary-proportional-v1` presentation sampler from §9.5. */
export function sampleSequentialTrace(
  traces: readonly Trace[],
  cap = SEQUENTIAL_TIMELINE_CAP,
): SampledSequentialTrace {
  const counts = traces.map((trace) => trace.trace.length);
  const sourceRecordedSteps = counts.reduce((total, count) => total + count, 0);
  const boundaryCounts = counts.map((count) => Math.min(2, count));
  if (!Number.isInteger(cap)
      || cap < boundaryCounts.reduce((total, count) => total + count, 0))
    throw new Error("Timeline cap không đủ để reserve boundary của mọi chặng.");
  const interiors = counts.map((count) => Math.max(count - 2, 0));
  const totalInterior = interiors.reduce((total, count) => total + count, 0);
  const remaining = Math.max(0, cap - boundaryCounts.reduce((total, count) => total + count, 0));
  const quotas = interiors.map((count) => sourceRecordedSteps <= cap
    ? count
    : totalInterior === 0 ? 0 : Math.floor(remaining * count / totalInterior));
  if (sourceRecordedSteps > cap && totalInterior > 0) {
    let unassigned = Math.min(remaining, totalInterior)
      - quotas.reduce((total, quota) => total + quota, 0);
    const remainderOrder = interiors.map((count, index) => ({
      index,
      // Integer numerator avoids floating-point drift changing a mathematical
      // tie; policy requires ties to resolve by ascending leg index.
      remainder: (remaining * count) % totalInterior,
    })).sort((left, right) => right.remainder - left.remainder || left.index - right.index);
    for (const candidate of remainderOrder) {
      if (unassigned === 0) break;
      if (quotas[candidate.index] < interiors[candidate.index]) {
        quotas[candidate.index] += 1;
        unassigned -= 1;
      }
    }
  }

  const steps: SampledSequentialTrace["steps"] = [];
  const ranges: SampledSequentialTrace["ranges"] = [];
  traces.forEach((trace, legIndex) => {
    const count = trace.trace.length;
    const selected = sourceRecordedSteps <= cap
      ? Array.from({ length: count }, (_, index) => index)
      : count === 0 ? []
        : count === 1 ? [0]
          : [0, ...sampledInteriorIndexes(interiors[legIndex], quotas[legIndex]), count - 1];
    const start = selected.length ? steps.length : null;
    for (const sourceStepIndex of selected) {
      steps.push({ step: trace.trace[sourceStepIndex], source: { legIndex, sourceStepIndex } });
    }
    ranges.push({ start, end: start === null ? null : steps.length - 1 });
  });
  const sourceTruncatedLegIndexes = traces.flatMap((trace, index) => (
    trace.metrics.trace_truncated ? [index] : []
  ));
  return {
    steps,
    ranges,
    meta: {
      policy: "per-leg-boundary-proportional-v1",
      sourceRecordedSteps,
      presentedSteps: steps.length,
      presentationSampled: steps.length < sourceRecordedSteps,
      sourceTraceTruncated: sourceTruncatedLegIndexes.length > 0,
      sourceTruncatedLegIndexes,
    },
  };
}

function sumMetric(
  traces: readonly Trace[],
  key: "total_cost" | "total_distance_m" | "total_time_s",
  complete: boolean,
): number | null {
  if (!complete || traces.some((trace) => trace.metrics[key] === null)) return null;
  return traces.reduce((total, trace) => total + (trace.metrics[key] ?? 0), 0);
}

function sumOptionalMetric(
  traces: readonly Trace[],
  key: "epsilon_bound",
): number | null | undefined {
  if (traces[0].metrics[key] === undefined) return undefined;
  if (traces.some((trace) => trace.metrics[key] == null)) return null;
  return traces.reduce((total, trace) => total + (trace.metrics[key] ?? 0), 0);
}

function mergePath(traces: readonly Trace[]): string[] {
  const path: string[] = [];
  for (const trace of traces) {
    if (!trace.found) return [];
    path.push(...(path.length > 0 ? trace.path.slice(1) : trace.path));
  }
  return path;
}

/**
 * Merge the existing point-to-point API responses into one client-side route.
 * The backend contract remains unchanged: each leg still runs the selected
 * search algorithm independently, while the UI gets one path and timeline.
 */
export function mergeSequentialRouteTraces(
  waypoints: readonly string[],
  traces: readonly Trace[],
  nameOf: (nodeId: string) => string = (nodeId) => nodeId,
  algorithmLabel?: string,
): SequentialRouteResult {
  if (waypoints.length < 2)
    throw new Error("Hành trình cần ít nhất hai điểm.");
  if (traces.length === 0 || traces.length > waypoints.length - 1)
    throw new Error("Số kết quả chặng không khớp hành trình.");

  const first = traces[0];
  const fingerprint = first.applied_scenario?.fingerprint ?? null;
  for (const [index, trace] of traces.entries()) {
    if (trace.algorithm !== first.algorithm || trace.mode !== first.mode ||
        trace.time_slot !== first.time_slot || trace.graph !== first.graph)
      throw new Error("Các chặng không dùng cùng một cấu hình thuật toán.");
    if ((trace.applied_scenario?.fingerprint ?? null) !== fingerprint)
      throw new Error("Các chặng không dùng cùng một graph scenario.");
    if (trace.found && (trace.path[0] !== waypoints[index] ||
        trace.path[trace.path.length - 1] !== waypoints[index + 1]))
      throw new Error("Đường trả về không khớp hai đầu của chặng.");
  }

  const sampled = sampleSequentialTrace(traces);
  const mergedSteps: TraceStepV1[] = [];
  for (const { step } of sampled.steps) {
      const { decision: _decision, bidirectional_frontiers: _frontiers, ...legacyStep } = step;
      mergedSteps.push({ ...legacyStep, step: mergedSteps.length + 1 });
  }
  const returnToStart = waypoints.length > 2 && waypoints.at(-1) === waypoints[0];
  const legs: SequentialRouteLeg[] = traces.map((trace, index) => {
    const range = sampled.ranges[index];
    const closingLeg = returnToStart && index === waypoints.length - 2;
    return {
      index,
      from_node: waypoints[index],
      to_node: waypoints[index + 1],
      found: trace.found,
      path: trace.path,
      metrics: trace.metrics,
      closing_leg: closingLeg,
      label: closingLeg ? `Chặng về Đi ${index + 1}` : `Chặng ${index + 1}`,
      explanation: trace.explanation,
      terminationReason: trace.contract_version === 2 ? trace.termination.reason : null,
      solutionQuality: trace.contract_version === 2 ? trace.termination.solution_quality : null,
      reachability: trace.contract_version === 2 ? trace.termination.reachability : null,
      sourceTrace: trace,
      trace_start: range.start,
      trace_end: range.end,
    };
  });

  const complete = traces.length === waypoints.length - 1 && traces.every((trace) => trace.found);
  const failedIndex = traces.findIndex((trace) => !trace.found);
  const algorithm = algorithmLabel ?? first.algorithm.toUpperCase();
  const order = waypoints.map(nameOf).join(" → ");
  const summary = complete
    ? `${algorithm} đã tìm đường qua ${legs.length} chặng theo đúng thứ tự đã nhập: ${order}. Số liệu bên dưới là tổng của toàn bộ hành trình.`
    : failedIndex >= 0
      ? `${algorithm} không tìm thấy đường ở ${legs[failedIndex].closing_leg ? "chặng cuối về Đi" : `chặng ${failedIndex + 1}`}: ${nameOf(waypoints[failedIndex])} → ${nameOf(waypoints[failedIndex + 1])}. Hành trình đa điểm dừng tại chặng này.`
      : `${algorithm} chưa chạy đủ toàn bộ hành trình đa điểm.`;

  const congested = new Map<string, Trace["explanation"]["congested_segments"][number]>();
  for (const trace of traces) {
    for (const segment of trace.explanation.congested_segments)
      congested.set(`${segment.edge}\u0000${segment.level}`, segment);
  }

  return {
    trace: {
      algorithm: first.algorithm,
      mode: first.mode,
      time_slot: first.time_slot,
      graph: first.graph,
      applied_scenario: first.applied_scenario,
      found: complete,
      path: complete ? mergePath(traces) : [],
      metrics: {
        total_cost: sumMetric(traces, "total_cost", complete),
        total_distance_m: sumMetric(traces, "total_distance_m", complete),
        total_time_s: sumMetric(traces, "total_time_s", complete),
        nodes_expanded: traces.reduce(
          (total, trace) => total + trace.metrics.nodes_expanded, 0,
        ),
        max_frontier: Math.max(...traces.map((trace) => trace.metrics.max_frontier)),
        runtime_ms: traces.reduce((total, trace) => total + trace.metrics.runtime_ms, 0),
        optimal_guarantee: complete && traces.every(
          (trace) => trace.metrics.optimal_guarantee,
        ),
        // Mỗi chặng IDA* có biên ε riêng; biên của tổng hành trình là tổng
        // các ε, không phải ε của riêng chặng đầu.
        epsilon_bound: sumOptionalMetric(traces, "epsilon_bound"),
        beam_width: first.metrics.beam_width,
        trace_truncated: traces.some((trace) => trace.metrics.trace_truncated),
      },
      trace: mergedSteps,
      explanation: {
        summary_vi: summary,
        congested_segments: [...congested.values()],
        alternatives: [],
      },
    } satisfies TraceV1,
    run: {
      waypoints: [...waypoints],
      legs,
      timeline: sampled.meta,
      presentedStepSources: sampled.steps.map((item) => item.source),
      returnToStart,
    },
  };
}
