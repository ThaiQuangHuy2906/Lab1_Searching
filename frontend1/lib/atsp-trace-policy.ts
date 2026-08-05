import type {
  GraphLevel, GraphView, Mode, OptimizationEvent, TimeSlot, TspMethod,
} from "./types";

export type TimelineSource = "route" | "optimization" | null;

type RouteTraceLike = { trace: readonly unknown[] } | null;
type OptimizationTraceLike = { events: readonly unknown[] } | null;

type AtspInputSnapshot = {
  start: string | null;
  stops: readonly string[];
  mode: Mode;
  slot: TimeSlot;
  graph: GraphLevel;
  graphView: GraphView;
  tspMethod: TspMethod;
};

const FINAL_OPTIMIZATION_EVENT_KINDS = new Set([
  "held_karp_reconstruct",
  "sa_final_best",
  "optimization_summary",
]);

/** Number of steps owned by the selected timeline source. */
export function activeTimelineLength(
  source: TimelineSource,
  routeTrace: RouteTraceLike,
  optimizationTrace: OptimizationTraceLike,
  _graph: GraphLevel,
  _traceOnReal: boolean,
): number {
  if (source === "optimization") return optimizationTrace?.events.length ?? 0;
  if (source !== "route") return 0;
  return routeTrace?.trace.length ?? 0;
}

/** ATSP output is only valid for the exact request configuration that produced it. */
export function atspInputsChanged(
  current: AtspInputSnapshot,
  patch: Partial<AtspInputSnapshot>,
): boolean {
  const stopsChanged = "stops" in patch && (
    !Array.isArray(patch.stops)
    || patch.stops.length !== current.stops.length
    || patch.stops.some((id, index) => id !== current.stops[index])
  );
  return (
    ("start" in patch && patch.start !== current.start)
    || stopsChanged
    || ("mode" in patch && patch.mode !== current.mode)
    || ("slot" in patch && patch.slot !== current.slot)
    || ("graph" in patch && patch.graph !== current.graph)
    || ("graphView" in patch && patch.graphView !== current.graphView)
    || ("tspMethod" in patch && patch.tspMethod !== current.tspMethod)
  );
}

/** Only these terminal events correspond to the concrete routed delivery legs. */
export function isOptimizationFinalEvent(kind: string | null | undefined): boolean {
  return kind !== undefined && kind !== null && FINAL_OPTIMIZATION_EVENT_KINDS.has(kind);
}

/** The active Held–Karp subset is a node-state cue, separate from its DP arrow. */
export function heldKarpHighlightIds(event: OptimizationEvent | null): string[] {
  return event?.kind === "held_karp_update" ? event.subset : [];
}

/** Keep map controls above the timeline's fixed bottom band when it is visible. */
export function mapControlsBottomClass(timelineVisible: boolean): string {
  return timelineVisible ? "bottom-[5.5rem]" : "bottom-10";
}

/** Same trace reference means no semantic player reset. */
export function optimizationTraceChangePatch<T>(current: T | null, next: T | null) {
  if (current === next) return null;
  return {
    optimizationTrace: next,
    timelineSource: next === null ? null : "optimization" as const,
    stepIdx: 0,
    playing: false,
  };
}
