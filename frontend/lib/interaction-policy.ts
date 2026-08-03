import type { GraphLevel, TimeSlot, Trace, TraceStep } from "./types";

export const MULTI_ROUTE_ACTIVE_MESSAGE =
  "Chế độ nhiều điểm — dùng nút Tối ưu thứ tự; xoá hết điểm giao để chạy tuyến 2 điểm.";

export interface SlotChangePatch {
  slot: TimeSlot;
  traffic: null;
  trace: null;
  compare: null;
  multi: null;
  stepIdx: 0;
  playing: false;
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
    stepIdx: 0,
    playing: false,
  };
}

export function isTrafficResponseCurrent(
  requestSlot: TimeSlot,
  requestGraph: GraphLevel,
  currentSlot: TimeSlot,
  currentGraph: GraphLevel,
  isLatestRequest: boolean,
) {
  return isLatestRequest
    && requestSlot === currentSlot
    && requestGraph === currentGraph;
}

export function routeRunBlockReason(
  start: string | null,
  goal: string | null,
  stops: readonly string[],
): string | null {
  if (stops.length > 0) return MULTI_ROUTE_ACTIVE_MESSAGE;
  if (!start || !goal) {
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

export function effectiveTraceSteps(
  trace: Pick<Trace, "trace"> | null,
  graph: GraphLevel,
  traceOnReal: boolean,
): TraceStep[] {
  if (graph === "real" && !traceOnReal) return [];
  return trace?.trace ?? [];
}
