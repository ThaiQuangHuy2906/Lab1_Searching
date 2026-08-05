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

/** The dashed map path follows the optimizer's active order, not its best-so-far. */
export function conceptualOptimizationOrder(event: OptimizationEvent | null): string[] {
  if (!event) return [];
  switch (event.kind) {
    case "held_karp_update": return [event.predecessor, event.endpoint];
    case "held_karp_reconstruct": return event.order;
    case "nn_decision": return event.order;
    case "local_improvement": return event.after_order;
    case "sa_seed_boundary": return event.current_order;
    case "sa_iteration": return event.resulting_order;
    case "sa_final_best": return event.final_order;
    case "optimization_summary": return event.final_order;
  }
}

export type SaMoveOutcome = "accepted_non_worse" | "accepted_worse" | "rejected_worse";

/** Classify the exact Metropolis decision represented by one SA iteration event. */
export function classifySaMove(delta: number, accepted: boolean): SaMoveOutcome {
  if (!accepted) return "rejected_worse";
  return delta > 0 ? "accepted_worse" : "accepted_non_worse";
}

/** Metropolis acceptance probability before the RNG draw. */
export function saAcceptanceProbability(delta: number, temperature: number): number {
  if (delta <= 0) return 1;
  return temperature > 0 ? Math.exp(-delta / temperature) : 0;
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
