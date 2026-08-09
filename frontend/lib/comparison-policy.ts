import type {
  Algorithm, AppResultEnvelope, AtspResultEnvelope, CompareRun, CompareRunStatus,
  CompareSession, ContractCapability, MultirouteResponse, RouteResultEnvelope,
  RunSnapshot, Trace, TspMethod,
} from "./types";

export const COMPARISON_LIMITS = {
  route: { minimum: 2, maximum: 4 },
  atsp: { minimum: 2, maximum: 3 },
} as const;

export const COMPARISON_ABS_TOLERANCE = 1e-6;
export const COMPARISON_REL_TOLERANCE = 1e-9;

export class ComparisonContractError extends Error {
  readonly code = "CONTRACT_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "ComparisonContractError";
  }
}

export function comparisonEquivalent(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(
    COMPARISON_ABS_TOLERANCE,
    COMPARISON_REL_TOLERANCE * Math.max(Math.abs(left), Math.abs(right)),
  );
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
  return value;
}

export function validateComparisonSelection(
  kind: "route" | "atsp",
  selectedIds: readonly string[],
): string | null {
  const limits = COMPARISON_LIMITS[kind];
  if (selectedIds.length < limits.minimum)
    return `Cần chọn ít nhất ${limits.minimum} mục để so sánh.`;
  if (selectedIds.length > limits.maximum)
    return `Chỉ được chọn tối đa ${limits.maximum} mục để so sánh.`;
  if (new Set(selectedIds).size !== selectedIds.length)
    return "Các mục so sánh phải unique; thứ tự đã chọn được giữ nguyên.";
  return null;
}

export function comparisonSelectionEligibility(
  kind: "route" | "atsp",
  selectedIds: readonly string[],
  snapshot: RunSnapshot,
): string | null {
  const selectionError = validateComparisonSelection(kind, selectedIds);
  if (selectionError) return selectionError;
  if (kind === "route") {
    const supported = new Set<Algorithm>([
      "bfs", "dfs", "iddfs", "ucs", "astar", "greedy", "bidijkstra", "idastar", "beam",
    ]);
    if (selectedIds.some((id) => !supported.has(id as Algorithm)))
      return "Có thuật toán route không được hỗ trợ.";
  } else {
    const supported = new Set<TspMethod>(["held_karp", "nn_2opt", "sa"]);
    if (selectedIds.some((id) => !supported.has(id as TspMethod)))
      return "Có phương pháp ATSP không được hỗ trợ.";
    if (selectedIds.includes("held_karp") && 1 + snapshot.stops.length > 15)
      return `Held–Karp không nhận ${1 + snapshot.stops.length} điểm; giới hạn là 15.`;
    if (1 + snapshot.stops.length > 16)
      return `ATSP không nhận quá 16 điểm tính cả điểm Đi.`;
  }
  return null;
}

export function snapshotsEqual(left: RunSnapshot, right: RunSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createCompareSession(
  kind: "route" | "atsp",
  snapshot: RunSnapshot,
  selectedIds: readonly string[],
  options: { id: string; startedAt: number },
): CompareSession {
  const error = comparisonSelectionEligibility(kind, selectedIds, snapshot);
  if (error) throw new Error(error);
  return deepFreeze({
    id: options.id,
    kind,
    snapshot,
    authoritativeScenarioFingerprint: null,
    capability: null,
    selectedIds: [...selectedIds],
    runs: selectedIds.map((id) => ({
      id, status: "queued" as const, result: null, error: null,
    })),
    focusedId: selectedIds[0] ?? null,
    startedAt: options.startedAt,
    completedAt: null,
  });
}

function mapRun<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  resultId: string,
  update: (run: CompareRun<T>) => CompareRun<T>,
): CompareSession<T> {
  if (!session.runs.some((run) => run.id === resultId))
    throw new Error(`Result ID ${resultId} không thuộc comparison session.`);
  return deepFreeze({
    ...session,
    runs: session.runs.map((run) => run.id === resultId ? update(run) : run),
  });
}

export function markComparisonRunRunning<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  resultId: string,
): CompareSession<T> {
  return mapRun(session, resultId, (run) => {
    if (run.status !== "queued") throw new Error(`Run ${resultId} không còn queued.`);
    return { ...run, status: "running", error: null };
  });
}

function capability(response: Trace | MultirouteResponse): ContractCapability {
  return response.contract_version === 2 ? "v2" : "v1";
}

function fingerprint(response: Trace | MultirouteResponse): string {
  const value = response.applied_scenario?.fingerprint;
  if (!value) throw new ComparisonContractError("Response thiếu server scenario fingerprint.");
  return value;
}

export function createRouteResultEnvelope(
  id: string,
  runId: number,
  snapshot: RunSnapshot,
  response: Trace,
  sourceResponses: readonly Trace[] = [response],
): RouteResultEnvelope {
  if (sourceResponses.length === 0)
    throw new ComparisonContractError("Route envelope thiếu source response từ backend.");
  const authoritativeFingerprint = fingerprint(sourceResponses[0]);
  const authoritativeCapability = capability(sourceResponses[0]);
  for (const source of sourceResponses) {
    if (fingerprint(source) !== authoritativeFingerprint)
      throw new ComparisonContractError("Fingerprint đổi giữa các source leg của route envelope.");
    if (capability(source) !== authoritativeCapability)
      throw new ComparisonContractError("Capability đổi giữa các source leg của route envelope.");
  }
  return deepFreeze({
    kind: "route",
    id,
    runId,
    snapshot,
    capability: authoritativeCapability,
    scenarioFingerprint: authoritativeFingerprint,
    response,
    sourceResponses: [...sourceResponses],
  });
}

export function createAtspResultEnvelope(
  id: string,
  runId: number,
  snapshot: RunSnapshot,
  response: MultirouteResponse,
): AtspResultEnvelope {
  return deepFreeze({
    kind: "atsp",
    id,
    runId,
    snapshot,
    capability: capability(response),
    scenarioFingerprint: fingerprint(response),
    response,
  });
}

function cancelOutstanding<T extends AppResultEnvelope>(
  runs: readonly CompareRun<T>[],
  failingId: string,
  message: string,
): CompareRun<T>[] {
  return runs.map((run) => {
    if (run.id === failingId) return { ...run, status: "error", result: null, error: message };
    if (run.status === "queued" || run.status === "running")
      return { ...run, status: "cancelled", error: null };
    return run;
  });
}

export interface AttachComparisonResult<T extends AppResultEnvelope> {
  session: CompareSession<T>;
  accepted: boolean;
  contractError: string | null;
}

export function attachComparisonResult<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  envelope: T,
  completedAt: number,
): AttachComparisonResult<T> {
  if (!session.selectedIds.includes(envelope.id))
    throw new Error(`Result ID ${envelope.id} không thuộc session.`);
  if (session.runs.find((run) => run.id === envelope.id)?.status !== "running")
    throw new Error(`Run ${envelope.id} phải ở trạng thái running trước khi attach.`);
  if (!snapshotsEqual(session.snapshot, envelope.snapshot)) {
    const message = "Response không dùng immutable snapshot của comparison session.";
    return {
      accepted: false,
      contractError: message,
      session: deepFreeze({
        ...session, runs: cancelOutstanding(session.runs, envelope.id, message), completedAt,
      }),
    };
  }
  const fingerprintMismatch = session.authoritativeScenarioFingerprint !== null
    && session.authoritativeScenarioFingerprint !== envelope.scenarioFingerprint;
  const capabilityMismatch = session.capability !== null
    && session.capability !== envelope.capability;
  if (fingerprintMismatch || capabilityMismatch) {
    const message = fingerprintMismatch
      ? "Server scenario fingerprint đổi giữa comparison session."
      : "Backend capability đổi giữa comparison session; không được trộn B1/B2.";
    return {
      accepted: false,
      contractError: message,
      session: deepFreeze({
        ...session, runs: cancelOutstanding(session.runs, envelope.id, message), completedAt,
      }),
    };
  }
  const status: CompareRunStatus = envelope.response.found ? "success" : "no_path";
  const next = mapRun(session, envelope.id, (run) => ({
    ...run, status, result: envelope, error: null,
  }));
  const allTerminal = next.runs.every((run) => !["queued", "running"].includes(run.status));
  return {
    accepted: true,
    contractError: null,
    session: deepFreeze({
      ...next,
      authoritativeScenarioFingerprint:
        next.authoritativeScenarioFingerprint ?? envelope.scenarioFingerprint,
      capability: next.capability ?? envelope.capability,
      completedAt: allTerminal ? completedAt : null,
    }),
  };
}

export function failComparisonRun<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  resultId: string,
  error: string,
  completedAt: number,
): CompareSession<T> {
  const next = mapRun(session, resultId, (run) => {
    if (run.status !== "running")
      throw new Error(`Run ${resultId} phải ở trạng thái running trước khi fail.`);
    return { ...run, status: "error", result: null, error };
  });
  return deepFreeze({
    ...next,
    completedAt: next.runs.every((run) => !["queued", "running"].includes(run.status))
      ? completedAt : null,
  });
}

export function cancelComparisonSession<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  completedAt: number,
): CompareSession<T> {
  return deepFreeze({
    ...session,
    runs: session.runs.map((run) => (
      run.status === "queued" || run.status === "running"
        ? { ...run, status: "cancelled" as const, error: null }
        : run
    )),
    completedAt,
  });
}

export function retryComparisonRuns<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  resultIds?: readonly string[],
): CompareSession<T> {
  const selected = new Set(resultIds ?? session.runs
    .filter((run) => run.status === "error" || run.status === "cancelled")
    .map((run) => run.id));
  return deepFreeze({
    ...session,
    runs: session.runs.map((run) => (
      selected.has(run.id) && (run.status === "error" || run.status === "cancelled")
        ? { ...run, status: "queued" as const, result: null, error: null }
        : run
    )),
    completedAt: null,
  });
}

export function comparisonProgress(session: CompareSession): {
  completed: number;
  total: number;
  runningId: string | null;
} {
  return {
    completed: session.runs.filter((run) => !["queued", "running"].includes(run.status)).length,
    total: session.runs.length,
    runningId: session.runs.find((run) => run.status === "running")?.id ?? null,
  };
}

export interface RankedComparisonItem {
  id: string;
  value: number;
  rank: number;
  tied: boolean;
}

export function rankComparisonResults<T extends AppResultEnvelope>(
  session: CompareSession<T>,
  selectValue: (result: T) => number | null,
): RankedComparisonItem[] {
  const values = session.runs.flatMap((run) => {
    if (run.status !== "success" || !run.result) return [];
    const value = selectValue(run.result);
    return value === null || !Number.isFinite(value) ? [] : [{ id: run.id, value }];
  }).sort((left, right) => left.value - right.value
    || session.selectedIds.indexOf(left.id) - session.selectedIds.indexOf(right.id));
  return values.map((item, index) => {
    const firstEquivalent = values.findIndex((candidate) => comparisonEquivalent(
      candidate.value, item.value,
    ));
    const tied = values.some((candidate, candidateIndex) => candidateIndex !== index
      && comparisonEquivalent(candidate.value, item.value));
    return { ...item, rank: firstEquivalent + 1, tied };
  });
}

export function isStaleRun(expectedRunId: number, currentRunId: number): boolean {
  return expectedRunId !== currentRunId;
}
