import type { GraphLevel, GraphView, TimeSlot, Trace, TraceStep } from "./types";

export const MULTI_ROUTE_ACTIVE_MESSAGE =
  "Chạy thuật toán sẽ đi qua các điểm giao theo thứ tự đang nhập; Tối ưu thứ tự dùng ATSP.";

export interface SlotChangePatch {
  slot: TimeSlot;
  traffic: null;
  trace: null;
  compare: null;
  multi: null;
  sequentialRoute: null;
  stepIdx: 0;
  playing: false;
}

export interface GraphViewChangePatch {
  graphView: GraphView;
  graphData: null;
  traffic: null;
  trace: null;
  compare: null;
  multi: null;
  sequentialRoute: null;
  start: null;
  goal: null;
  stops: [];
  stepIdx: 0;
  playing: false;
  pickTarget: null;
}

export function graphViewChangePatch(
  current: GraphView,
  next: GraphView,
): GraphViewChangePatch | null {
  if (current === next) return null;
  return {
    graphView: next,
    graphData: null,
    traffic: null,
    trace: null,
    compare: null,
    multi: null,
    sequentialRoute: null,
    start: null,
    goal: null,
    stops: [],
    stepIdx: 0,
    playing: false,
    pickTarget: null,
  };
}

export function slotChangePatch(
  current: TimeSlot,
  next: TimeSlot,
): SlotChangePatch | null {
  if (current === next) return null;
  return {
    slot: next,
    traffic: null,
    trace: null,
    compare: null,
    multi: null,
    sequentialRoute: null,
    stepIdx: 0,
    playing: false,
  };
}

export function isGraphResponseCurrent(
  requestGraph: GraphLevel,
  requestView: GraphView,
  responseGraph: GraphLevel | undefined,
  responseView: GraphView | undefined,
  currentGraph: GraphLevel,
  currentView: GraphView,
  isLatestRequest: boolean,
) {
  return isLatestRequest
    && requestGraph === currentGraph
    && requestView === currentView
    && responseGraph === requestGraph
    && responseView === requestView;
}

export function isTrafficResponseCurrent(
  requestSlot: TimeSlot,
  requestGraph: GraphLevel,
  requestView: GraphView,
  responseGraph: GraphLevel | undefined,
  responseView: GraphView | undefined,
  currentSlot: TimeSlot,
  currentGraph: GraphLevel,
  currentView: GraphView,
  isLatestRequest: boolean,
) {
  return isLatestRequest
    && requestSlot === currentSlot
    && requestGraph === currentGraph
    && requestView === currentView
    && responseGraph === requestGraph
    && responseView === requestView;
}

export function routeRunBlockReason(
  start: string | null,
  goal: string | null,
  stops: readonly string[],
): string | null {
  if (!start) {
    return stops.length > 0
      ? "Hãy chọn điểm Đi trước khi chạy hành trình nhiều điểm."
      : "Hãy chọn cả điểm Đi và điểm Đến trước khi chạy.";
  }
  if (stops.length > 0) {
    const waypoints = [start, ...stops];
    if (new Set(waypoints).size !== waypoints.length)
      return "Các điểm trong hành trình đang bị trùng nhau.";
    return null;
  }
  if (!goal) {
    return "Hãy chọn cả điểm Đi và điểm Đến trước khi chạy.";
  }
  if (start === goal)
    return "Điểm Đi và điểm Đến đang trùng nhau — hãy chọn hai điểm khác nhau.";
  return null;
}

export function isEndpointOptionAllowed(
  kind: "start" | "goal",
  nodeId: string,
  otherEndpoint: string | null,
  stops: readonly string[],
) {
  return nodeId !== otherEndpoint && !stops.includes(nodeId);
}

export function isStopOptionAllowed(
  nodeId: string,
  start: string | null,
  goal: string | null,
  stops: readonly string[],
) {
  return nodeId !== start && nodeId !== goal && !stops.includes(nodeId);
}

/** Preserve the old destination as the first delivery point when the user
 * turns A→B into A→B→C by adding C. */
export function promoteGoalWhenAddingStop(
  goal: string | null,
  currentStops: readonly string[],
  nextStops: readonly string[],
): string[] {
  if (!goal || nextStops.length <= currentStops.length || nextStops.includes(goal))
    return [...nextStops];
  return [goal, ...nextStops];
}

export function effectiveTraceSteps(
  trace: Pick<Trace, "trace"> | null,
  _graph: GraphLevel,
  _traceOnReal: boolean,
): TraceStep[] {
  return trace?.trace ?? [];
}

/** A large invisible hit target makes dense G_real nodes selectable without
 * changing their visible radius. */
export function journeyNodePickRadius(graph: GraphLevel): number {
  return graph === "real" ? 12 : 14;
}

/** The interactive teaching screen always records route-search steps. */
export function routeTraceRequestFlag(_graph: GraphLevel): true {
  return true;
}
