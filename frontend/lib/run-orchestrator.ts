import type {
  Algorithm, RunSnapshot, ScenarioConfig, TspMethod,
} from "./types";

export interface RunHandle {
  readonly runId: number;
  readonly signal: AbortSignal;
}

export interface RunLifecycle {
  begin: () => RunHandle;
  invalidate: () => number;
  cancel: () => number;
  isCurrent: (runId: number) => boolean;
  currentRunId: () => number;
}

export function isFatalContractError(
  error: unknown,
): error is Error & { readonly code: "CONTRACT_ERROR" } {
  return error instanceof Error && "code" in error
    && (error as { code?: unknown }).code === "CONTRACT_ERROR";
}

/** One browser-side authority for abort plus monotonic stale-response guards. */
export function createRunLifecycle(): RunLifecycle {
  let runId = 0;
  let controller: AbortController | null = null;
  const invalidate = () => {
    controller?.abort();
    controller = null;
    runId += 1;
    return runId;
  };
  return {
    begin: () => {
      invalidate();
      controller = new AbortController();
      return { runId, signal: controller.signal };
    },
    invalidate,
    cancel: invalidate,
    isCurrent: (candidate) => candidate === runId,
    currentRunId: () => runId,
  };
}

export type OrchestratedItemStatus =
  | "queued" | "running" | "success" | "no_path" | "error" | "cancelled";

export interface SequentialExecutionUpdate<T> {
  id: string;
  status: OrchestratedItemStatus;
  value: T | null;
  error: unknown | null;
}

export interface SequentialExecutionOptions<T> {
  ids: readonly string[];
  handle: RunHandle;
  isCurrent: (runId: number) => boolean;
  execute: (id: string, signal: AbortSignal) => Promise<T>;
  classify: (value: T) => "success" | "no_path";
  onUpdate: (update: SequentialExecutionUpdate<T>) => void;
}

function aborted(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error
    && (error as { name?: unknown }).name === "AbortError";
}

/**
 * Execute comparison items sequentially. An ordinary item error is isolated;
 * abort/stale state cancels remaining items and never publishes the old value.
 */
export async function executeItemsSequentially<T>(
  options: SequentialExecutionOptions<T>,
): Promise<void> {
  for (let index = 0; index < options.ids.length; index += 1) {
    const id = options.ids[index];
    if (options.handle.signal.aborted || !options.isCurrent(options.handle.runId)) {
      for (const remaining of options.ids.slice(index)) {
        options.onUpdate({ id: remaining, status: "cancelled", value: null, error: null });
      }
      return;
    }
    options.onUpdate({ id, status: "running", value: null, error: null });
    try {
      const value = await options.execute(id, options.handle.signal);
      if (options.handle.signal.aborted || !options.isCurrent(options.handle.runId)) {
        options.onUpdate({ id, status: "cancelled", value: null, error: null });
        for (const remaining of options.ids.slice(index + 1)) {
          options.onUpdate({ id: remaining, status: "cancelled", value: null, error: null });
        }
        return;
      }
      options.onUpdate({ id, status: options.classify(value), value, error: null });
    } catch (error) {
      if (options.handle.signal.aborted || aborted(error)
          || !options.isCurrent(options.handle.runId)) {
        options.onUpdate({ id, status: "cancelled", value: null, error: null });
        for (const remaining of options.ids.slice(index + 1)) {
          options.onUpdate({ id: remaining, status: "cancelled", value: null, error: null });
        }
        return;
      }
      options.onUpdate({ id, status: "error", value: null, error });
    }
  }
}

function scenarioRequest(snapshot: RunSnapshot): ScenarioConfig | undefined {
  if (!snapshot.scenario) return undefined;
  return {
    ...(snapshot.scenario.graph_view === "full" ? {} : {
      graph_view: snapshot.scenario.graph_view,
    }),
    ...(snapshot.scenario.edge_overrides.length ? {
      edge_overrides: snapshot.scenario.edge_overrides.map((override) => ({
        ...override,
        ...(override.congestion ? { congestion: { ...override.congestion } } : {}),
        ...(override.risk ? { risk: { ...override.risk } } : {}),
      })),
    } : {}),
  };
}

export function routeRequestFromSnapshot(
  snapshot: RunSnapshot,
  algorithm: Algorithm,
  start: string,
  goal: string,
) {
  const params = snapshot.routeParamsByAlgorithm[algorithm];
  return {
    start,
    goal,
    algorithm,
    mode: snapshot.mode,
    time_slot: snapshot.slot,
    graph: snapshot.graph,
    include_trace: snapshot.includeRouteTrace,
    ...(params && Object.keys(params).length ? { params: { ...params } } : {}),
    ...(snapshot.scenario ? { scenario: scenarioRequest(snapshot) } : {}),
  };
}

export function multirouteRequestFromSnapshot(
  snapshot: RunSnapshot,
  method: TspMethod,
) {
  if (!snapshot.start) throw new Error("ATSP snapshot thiếu Start.");
  return {
    start: snapshot.start,
    stops: [...snapshot.stops],
    method,
    mode: snapshot.mode,
    time_slot: snapshot.slot,
    graph: snapshot.graph,
    return_to_start: snapshot.returnToStart,
    include_trace: snapshot.includeOptimizationTrace,
    ...(snapshot.scenario ? { scenario: scenarioRequest(snapshot) } : {}),
  };
}
