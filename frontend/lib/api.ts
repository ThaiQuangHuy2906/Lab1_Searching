// API client — talks to the FastAPI backend (SCHEMA §C, port 8000).
// Every error is normalized to the {code, message_vi} envelope + a hint.

import type {
  Algorithm, ApiError, ExperimentResult, GraphLevel, GraphResponse, GraphView, Mode,
  MultirouteResponse, ScenarioConfig, TimeSlot, Trace, TrafficResponse, TspMethod,
} from "./types";
import {
  ApiContractError, parseMultirouteResponse, parseTraceResponse,
} from "./contract-guards";

// By default, the browser talks to Next.js on the same origin. Next proxies
// /api/* to FastAPI, so the UI also works when opened through a LAN address.
// NEXT_PUBLIC_API_BASE remains available for deployments that call FastAPI
// directly from the browser.
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class BackendError extends Error {
  code: string;
  constructor(code: string, messageVi: string) {
    super(messageVi);
    this.code = code;
  }
}

export class RequestAbortedError extends Error {
  readonly code = "ABORTED";

  constructor() {
    super("Request đã bị huỷ vì cấu hình hoặc phiên chạy thay đổi.");
    this.name = "RequestAbortedError";
  }
}

type ResponseParser<T> = (payload: unknown) => T;

function isAbort(error: unknown): boolean {
  return error instanceof RequestAbortedError
    || (typeof error === "object" && error !== null && "name" in error
      && (error as { name?: unknown }).name === "AbortError");
}

async function call<T>(
  path: string,
  init?: RequestInit,
  parse?: ResponseParser<T>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (isAbort(error)) throw new RequestAbortedError();
    throw new BackendError(
      "OFFLINE",
      "Không gọi được backend — hãy chạy uvicorn rồi thử lại.",
    );
  }
  if (!res.ok) {
    let payload: ApiError | null = null;
    try {
      payload = (await res.json()) as ApiError;
    } catch (error) {
      if (isAbort(error)) throw new RequestAbortedError();
      /* non-JSON error body */
    }
    throw new BackendError(
      payload?.error?.code ?? `HTTP_${res.status}`,
      payload?.error?.message_vi ?? `Lỗi HTTP ${res.status} từ backend.`,
    );
  }
  let payload: unknown;
  try {
    payload = await res.json();
  } catch (error) {
    if (isAbort(error)) throw new RequestAbortedError();
    throw new ApiContractError("Response thành công không chứa JSON hợp lệ");
  }
  try {
    return parse ? parse(payload) : payload as T;
  } catch (error) {
    if (error instanceof ApiContractError) throw error;
    throw new ApiContractError("Không parse được response JSON theo contract đã khóa");
  }
}

export const api = {
  graph: (level: GraphLevel, view: GraphView) =>
    call<GraphResponse>(`/api/graph?level=${level}&view=${view}`),

  traffic: (slot: TimeSlot, level: GraphLevel, view: GraphView) =>
    call<TrafficResponse>(
      `/api/traffic?slot=${encodeURIComponent(slot)}&level=${level}&view=${view}`,
    ),

  route: (body: {
    start: string; goal: string; algorithm: Algorithm; mode: Mode;
    time_slot: TimeSlot; graph: GraphLevel; include_trace: boolean | null;
    params?: { beam_width?: number; epsilon?: number };
    scenario?: ScenarioConfig;
  }, options?: { signal?: AbortSignal }) => call<Trace>("/api/route", {
    method: "POST", body: JSON.stringify(body), signal: options?.signal,
  }, parseTraceResponse),

  multiroute: (body: {
    start: string; stops: string[]; method: TspMethod; mode: Mode;
    time_slot: TimeSlot; graph: GraphLevel; return_to_start: boolean;
    include_trace: boolean;
    scenario?: ScenarioConfig;
  }, options?: { signal?: AbortSignal }) => call<MultirouteResponse>("/api/multiroute", {
    method: "POST", body: JSON.stringify(body), signal: options?.signal,
  }, parseMultirouteResponse),

  benchmark: (experimentId?: number) =>
    call<{ experiments: ExperimentResult[] }>("/api/benchmark", {
      method: "POST",
      body: JSON.stringify(experimentId ? { experiment_id: experimentId } : {}),
    }),
};
