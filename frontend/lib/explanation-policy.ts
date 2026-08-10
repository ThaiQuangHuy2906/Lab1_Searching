import type {
  AppResultEnvelope, AtspResultEnvelope, CompareSession, ExplanationOverlay,
  ExplanationSubject, Mode, RouteResultEnvelope, Trace,
} from "./types";

export interface ExplanationLifecycleState {
  subject: ExplanationSubject;
  overlay: ExplanationOverlay;
  overlayVisible: boolean;
}

export const EMPTY_EXPLANATION_LIFECYCLE: ExplanationLifecycleState = {
  subject: null,
  overlay: null,
  overlayVisible: false,
};

function sameSubject(left: ExplanationSubject, right: ExplanationSubject): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function selectExplanationSubject(
  state: ExplanationLifecycleState,
  subject: ExplanationSubject,
): ExplanationLifecycleState {
  if (sameSubject(state.subject, subject)) return state;
  return { subject, overlay: null, overlayVisible: false };
}

export function selectExplanationOverlay(
  state: ExplanationLifecycleState,
  overlay: ExplanationOverlay,
): ExplanationLifecycleState {
  if (!state.subject && overlay) throw new Error("Không thể chọn overlay khi chưa có subject.");
  return { ...state, overlay, overlayVisible: overlay !== null };
}

export function leaveExplanationTab(
  state: ExplanationLifecycleState,
): ExplanationLifecycleState {
  return { ...state, overlayVisible: false };
}

export function returnToExplanationTab(
  state: ExplanationLifecycleState,
): ExplanationLifecycleState {
  return { ...state, overlayVisible: state.overlay !== null };
}

function subjectOwnedBy(
  subject: ExplanationSubject,
  owner: { runId?: string; sessionId?: string; resultId?: string },
): boolean {
  if (!subject) return false;
  if ("runId" in subject && owner.runId === subject.runId) return true;
  if ("sessionId" in subject && owner.sessionId === subject.sessionId) {
    return owner.resultId === undefined || owner.resultId === subject.resultId;
  }
  return false;
}

export function invalidateExplanationOwner(
  state: ExplanationLifecycleState,
  owner: { runId?: string; sessionId?: string; resultId?: string },
): ExplanationLifecycleState {
  return subjectOwnedBy(state.subject, owner) ? EMPTY_EXPLANATION_LIFECYCLE : state;
}

export interface ExplanationRegistry {
  singleRoutes: Readonly<Record<string, RouteResultEnvelope>>;
  singleAtsp: Readonly<Record<string, AtspResultEnvelope>>;
  routeComparisons: Readonly<Record<string, CompareSession<RouteResultEnvelope>>>;
  atspComparisons: Readonly<Record<string, CompareSession<AtspResultEnvelope>>>;
}

export function resolveExplanationSubject(
  subject: ExplanationSubject,
  registry: ExplanationRegistry,
): AppResultEnvelope | null {
  if (!subject) return null;
  if (subject.kind === "single_route") return registry.singleRoutes[subject.runId] ?? null;
  if (subject.kind === "single_atsp") return registry.singleAtsp[subject.runId] ?? null;
  const session = subject.kind === "route_comparison"
    ? registry.routeComparisons[subject.sessionId]
    : registry.atspComparisons[subject.sessionId];
  return session?.runs.find((run) => run.id === subject.resultId)?.result ?? null;
}

export function isExplanationOverlayValid(
  envelope: AppResultEnvelope,
  overlay: Exclude<ExplanationOverlay, null>,
): boolean {
  if (overlay.resultId !== envelope.id) return false;
  if (overlay.kind === "leg") {
    const legCount = envelope.kind === "atsp"
      ? envelope.response.legs.length
      : envelope.sourceResponses.length;
    return overlay.legIndex >= 0 && overlay.legIndex < legCount;
  }
  if (overlay.kind === "unreachable_pair") {
    return envelope.kind === "atsp"
      && envelope.response.contract_version === 2
      && !envelope.response.found
      && envelope.response.failure.from_node === overlay.from
      && envelope.response.failure.to_node === overlay.to;
  }
  if (envelope.kind !== "route" || envelope.response.contract_version !== 2) return false;
  const evidence = envelope.response.explanation.evidence;
  if (overlay.kind === "factor") {
    const factor = evidence.factors.find((item) => item.id === overlay.factorId);
    return Boolean(factor)
      && JSON.stringify(factor?.edge_ids ?? []) === JSON.stringify(overlay.edgeIds);
  }
  return evidence.reference_routes.some((reference) => reference.id === overlay.referenceId);
}

export function resolveSingleRouteReferenceOverlay(
  envelope: RouteResultEnvelope | null,
  overlay: ExplanationOverlay,
  overlayVisible: boolean,
  singleMode: boolean,
) {
  if (!singleMode || !overlayVisible || overlay?.kind !== "reference_route"
      || !envelope || overlay.resultId !== envelope.id
      || envelope.snapshot.problemMode !== "two_point"
      || envelope.response.contract_version !== 2) return null;
  return envelope.response.explanation.evidence.reference_routes.find(
    (reference) => reference.id === overlay.referenceId,
  ) ?? null;
}

export type ExplanationAvailability = "structured_v2" | "legacy_fallback" | "contract_error";
export type ExplanationOutcome = "found" | "trivial" | "not_found";

export interface RouteExplanationViewModel {
  kind: "route";
  availability: ExplanationAvailability;
  outcome: ExplanationOutcome;
  headline: string;
  limitation: string | null;
  objectiveMode: Mode;
  objectiveValue: number | null;
  exactGap: number | null;
  canExplainDecision: boolean;
  factorsAvailable: boolean;
  referencesAvailable: boolean;
}

const TERMINATION_HEADLINE = {
  start_equals_goal: "Không cần tìm đường vì Đi trùng Đến.",
  goal_expanded: "Đã mở rộng Goal và hoàn tất lần tìm đường.",
  bidirectional_bound_met: "Hai phía đã đạt điều kiện dừng theo μ.",
  frontier_exhausted: "Không có đường có hướng trong cấu hình này.",
  depth_cap_reached: "Chưa tìm thấy trước giới hạn độ sâu.",
  round_cap_reached: "Chưa tìm thấy trước giới hạn số vòng.",
  beam_exhausted_after_pruning: "Beam chưa tìm thấy; kết quả không chứng minh graph vô đường.",
} as const;

const QUALITY_LIMITATION = {
  exact: "Có bảo đảm tối ưu trong đúng snapshot và điều kiện thuật toán này.",
  epsilon_bounded: "Có bảo đảm sai số cộng không quá ε trong cấu hình này.",
  feasible_unproven: "Tìm được tuyến nhưng không có bảo đảm weighted optimum.",
  not_applicable: null,
} as const;

export function routeExplanationViewModel(trace: Trace): RouteExplanationViewModel {
  if (trace.contract_version !== 2) {
    return {
      kind: "route",
      availability: "legacy_fallback",
      outcome: trace.found ? "found" : "not_found",
      headline: trace.found
        ? "Lần chạy này tìm được một tuyến."
        : "Lần chạy này chưa tìm thấy tuyến.",
      limitation: "Backend hiện tại chưa cung cấp termination/evidence có cấu trúc; không suy luận thêm từ prose legacy.",
      objectiveMode: trace.mode,
      objectiveValue: trace.metrics.total_cost,
      exactGap: null,
      canExplainDecision: false,
      factorsAvailable: false,
      referencesAvailable: false,
    };
  }
  const termination = trace.termination;
  const evidence = trace.explanation.evidence;
  return {
    kind: "route",
    availability: "structured_v2",
    outcome: termination.reason === "start_equals_goal"
      ? "trivial" : trace.found ? "found" : "not_found",
    headline: TERMINATION_HEADLINE[termination.reason],
    limitation: QUALITY_LIMITATION[termination.solution_quality],
    objectiveMode: evidence.objective.mode,
    objectiveValue: evidence.objective.selected_value,
    exactGap: evidence.objective.optimality_gap,
    canExplainDecision: trace.trace.length > 0,
    factorsAvailable: evidence.factors.length > 0,
    referencesAvailable: evidence.reference_routes.length > 0,
  };
}

export interface AtspExplanationViewModel {
  kind: "atsp";
  availability: ExplanationAvailability;
  headline: string;
  topology: "open" | "closed";
  methodStatsAvailable: boolean;
  computationMetricsAvailable: boolean;
  baselineBreakdownAvailable: boolean;
  failurePair: { from: string; to: string } | null;
}

export function atspExplanationViewModel(
  envelope: AtspResultEnvelope,
): AtspExplanationViewModel {
  const response = envelope.response;
  const topology = envelope.snapshot.returnToStart ? "closed" : "open";
  if (response.contract_version !== 2) {
    return {
      kind: "atsp",
      availability: "legacy_fallback",
      topology,
      headline: response.found
        ? "Lần chạy ATSP đã trả một thứ tự ghé."
        : "Lần chạy ATSP chưa tìm được kết quả.",
      methodStatsAvailable: false,
      computationMetricsAvailable: false,
      baselineBreakdownAvailable: false,
      failurePair: null,
    };
  }
  if (response.return_to_start !== envelope.snapshot.returnToStart) {
    return {
      kind: "atsp",
      availability: "contract_error",
      topology,
      headline: "Response open/closed không khớp immutable request snapshot.",
      methodStatsAvailable: false,
      computationMetricsAvailable: false,
      baselineBreakdownAvailable: false,
      failurePair: null,
    };
  }
  return {
    kind: "atsp",
    availability: "structured_v2",
    topology,
    headline: response.found
      ? `Đã tối ưu thứ tự ghé theo hành trình ${topology === "closed" ? "khép kín" : "mở"}.`
      : "Không dựng được ma trận chi phí có hướng đầy đủ; optimizer chưa bắt đầu.",
    methodStatsAvailable: response.found,
    computationMetricsAvailable: true,
    baselineBreakdownAvailable: response.found,
    failurePair: response.found ? null : {
      from: response.failure.from_node,
      to: response.failure.to_node,
    },
  };
}
