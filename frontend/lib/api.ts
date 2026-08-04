// API client — talks to the FastAPI backend (SCHEMA §C, port 8000).
// Every error is normalized to the {code, message_vi} envelope + a hint.

import type {
  Algorithm, ApiError, ExperimentResult, GraphLevel, GraphResponse, GraphView, Mode,
  MultirouteResponse, ScenarioConfig, TimeSlot, Trace, TrafficResponse, TspMethod,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export class BackendError extends Error {
  code: string;
  constructor(code: string, messageVi: string) {
    super(messageVi);
    this.code = code;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new BackendError(
      "OFFLINE",
      "Không gọi được backend (localhost:8000) — hãy chạy uvicorn rồi thử lại.",
    );
  }
  if (!res.ok) {
    let payload: ApiError | null = null;
    try {
      payload = (await res.json()) as ApiError;
    } catch {
      /* non-JSON error body */
    }
    throw new BackendError(
      payload?.error?.code ?? `HTTP_${res.status}`,
      payload?.error?.message_vi ?? `Lỗi HTTP ${res.status} từ backend.`,
    );
  }
  return (await res.json()) as T;
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
  }) => call<Trace>("/api/route", { method: "POST", body: JSON.stringify(body) }),

  multiroute: (body: {
    start: string; stops: string[]; method: TspMethod; mode: Mode;
    time_slot: TimeSlot; graph: GraphLevel; return_to_start: boolean;
    include_trace: boolean;
    scenario?: ScenarioConfig;
  }) => call<MultirouteResponse>("/api/multiroute", {
    method: "POST", body: JSON.stringify(body),
  }),

  benchmark: (experimentId?: number) =>
    call<{ experiments: ExperimentResult[] }>("/api/benchmark", {
      method: "POST",
      body: JSON.stringify(experimentId ? { experiment_id: experimentId } : {}),
    }),
};
