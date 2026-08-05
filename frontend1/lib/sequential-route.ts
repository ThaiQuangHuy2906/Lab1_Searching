import type { Metrics, Trace } from "./types";

export interface SequentialRouteLeg {
  index: number;
  from_node: string;
  to_node: string;
  found: boolean;
  path: string[];
  metrics: Metrics;
  trace_start: number | null;
  trace_end: number | null;
}

export interface SequentialRouteRun {
  waypoints: string[];
  legs: SequentialRouteLeg[];
}

export interface SequentialRouteResult {
  trace: Trace;
  run: SequentialRouteRun;
}

export function sequentialWaypoints(
  start: string,
  goal: string | null,
  stops: readonly string[],
): string[] {
  return stops.length > 0 ? [start, ...stops] : goal ? [start, goal] : [start];
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

  const mergedSteps = [] as Trace["trace"];
  const legs: SequentialRouteLeg[] = traces.map((trace, index) => {
    const traceStart = trace.trace.length > 0 ? mergedSteps.length : null;
    for (const step of trace.trace) {
      mergedSteps.push({ ...step, step: mergedSteps.length + 1 });
    }
    return {
      index,
      from_node: waypoints[index],
      to_node: waypoints[index + 1],
      found: trace.found,
      path: trace.path,
      metrics: trace.metrics,
      trace_start: traceStart,
      trace_end: traceStart === null ? null : mergedSteps.length - 1,
    };
  });

  const complete = traces.length === waypoints.length - 1 && traces.every((trace) => trace.found);
  const failedIndex = traces.findIndex((trace) => !trace.found);
  const algorithm = algorithmLabel ?? first.algorithm.toUpperCase();
  const order = waypoints.map(nameOf).join(" → ");
  const summary = complete
    ? `${algorithm} đã tìm đường qua ${legs.length} chặng theo đúng thứ tự đã nhập: ${order}. Số liệu bên dưới là tổng của toàn bộ hành trình.`
    : failedIndex >= 0
      ? `${algorithm} không tìm thấy đường ở chặng ${failedIndex + 1}: ${nameOf(waypoints[failedIndex])} → ${nameOf(waypoints[failedIndex + 1])}. Hành trình đa điểm dừng tại chặng này.`
      : `${algorithm} chưa chạy đủ toàn bộ hành trình đa điểm.`;

  const congested = new Map<string, Trace["explanation"]["congested_segments"][number]>();
  for (const trace of traces) {
    for (const segment of trace.explanation.congested_segments)
      congested.set(`${segment.edge}\u0000${segment.level}`, segment);
  }

  return {
    trace: {
      ...first,
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
    },
    run: { waypoints: [...waypoints], legs },
  };
}
