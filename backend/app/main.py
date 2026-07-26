"""FastAPI backend — the 6 endpoints of SCHEMA §C on port 8000.

Run from backend/:  ../.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000

Every error uses the unified envelope {error: {code, message_vi}}
(SCHEMA §C.7). CORS is open for the Next.js dev server only.
"""

from __future__ import annotations

import csv
import platform
import sys
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .explain import build_explanation
from .graph_store import GraphStore
from .models import (
    BenchmarkRequest, BenchmarkResponse, ExperimentResult, GraphLevel,
    HealthResponse, MultirouteRequest, MultirouteResponse, RouteRequest,
    TimeSlot, Trace, TrafficResponse,
)
from .search import ALGORITHMS
from .search_advanced import ADVANCED_ALGORITHMS
from .tsp import solve_multiroute

APP_VERSION = "0.1.0"
RESULTS_DIR = Path(__file__).resolve().parents[2] / "results"

ALL_ALGORITHMS = {**ALGORITHMS, **ADVANCED_ALGORITHMS}

#: experiment id -> (csv file, figure files) — names fixed by PROMPT-MASTER 6.6
EXPERIMENT_FILES: dict[int, tuple[str, list[str]]] = {
    1: ("exp1_correctness.csv", []),
    2: ("exp2_admissibility.csv", ["figs/admissibility_scatter.png"]),
    3: ("exp3_benchmark.csv",
        ["figs/exp3_expanded_bar.png", "figs/exp3_runtime_bar.png", "figs/exp3_gap.png"]),
    4: ("exp4_congestion.csv", []),
    5: ("exp5_gamma.csv", ["figs/exp5_gamma_curves.png"]),
    6: ("exp6_pairs.json", []),
    7: ("exp7_tsp.csv", ["figs/exp7_tsp_map.png"]),
}

app = FastAPI(title="Vietnamese Traffic Route Optimizer", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"], allow_headers=["*"],
)


def error_json(status: int, code: str, message_vi: str) -> JSONResponse:
    return JSONResponse(status_code=status,
                        content={"error": {"code": code, "message_vi": message_vi}})


@app.exception_handler(RequestValidationError)
async def on_validation_error(_req: Request, exc: RequestValidationError):
    detail = "; ".join(
        f"{'.'.join(str(p) for p in e.get('loc', []))}: {e.get('msg', '')}"
        for e in exc.errors()[:3])
    # Only the size-limit validator message counts: a plain enum error for
    # method="brute" also contains the substring "held_karp" and used to
    # get mislabeled HELD_KARP_LIMIT here (audit finding L3-05).
    if "held_karp supports at most" in detail:
        return error_json(422, "HELD_KARP_LIMIT",
                          "held_karp nhận tối đa 15 điểm (kể cả điểm xuất phát); "
                          "hãy dùng nn_2opt hoặc sa cho 16 điểm.")
    return error_json(422, "VALIDATION_ERROR", f"Tham số không hợp lệ: {detail}")


@app.exception_handler(KeyError)
async def on_key_error(_req: Request, exc: KeyError):
    # search/tsp raise KeyError("node 'x' not in graph 'demo'") for bad ids;
    # any other KeyError is a genuine bug -> INTERNAL, not a fake 404.
    msg = exc.args[0] if exc.args else ""
    if isinstance(msg, str) and msg.startswith("node "):
        return error_json(404, "NODE_NOT_FOUND", f"Không tìm thấy node: {msg}")
    return error_json(500, "INTERNAL",
                      "Lỗi không lường trước phía server; xem log để biết chi tiết.")


@app.exception_handler(ValueError)
async def on_value_error(_req: Request, exc: ValueError):
    msg = str(exc)
    code = "HELD_KARP_LIMIT" if "held_karp" in msg else "VALIDATION_ERROR"
    return error_json(422, code, f"Yêu cầu không hợp lệ: {msg}")


@app.exception_handler(StarletteHTTPException)
async def on_http_error(_req: Request, exc: StarletteHTTPException):
    # Unknown paths / wrong methods used to leak Starlette's English
    # {"detail": ...} shape (audit finding L3-06). SCHEMA §C says EVERY
    # error uses the §C.7 envelope; VALIDATION_ERROR is the closest of
    # its five codes for a mis-addressed request.
    vi = {404: "Đường dẫn API không tồn tại — xem danh sách endpoint trong docs/SCHEMA.md §C.",
          405: "Phương thức HTTP không được hỗ trợ cho đường dẫn này."}
    return error_json(exc.status_code, "VALIDATION_ERROR",
                      vi.get(exc.status_code, str(exc.detail)))


@app.exception_handler(Exception)
async def on_internal(_req: Request, exc: Exception):
    return error_json(500, "INTERNAL",
                      "Lỗi không lường trước phía server; xem log để biết chi tiết.")


@lru_cache(maxsize=2)
def graph_payload(level: GraphLevel) -> dict:
    return GraphStore.load(level).graph.model_dump(mode="json")


# --------------------------------------------------------------- endpoints


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", versions={
        "python": platform.python_version(), "app": APP_VERSION})


@app.get("/api/graph")
def get_graph(level: GraphLevel = "demo") -> dict:
    return graph_payload(level)


@app.get("/api/traffic", response_model=TrafficResponse)
def get_traffic(slot: TimeSlot, level: GraphLevel = "demo") -> TrafficResponse:
    store = GraphStore.load(level)
    return TrafficResponse(slot=slot, graph=level,
                           congestion=store.profiles.profiles[slot])


@app.post("/api/route", response_model=Trace, response_model_exclude_none=False)
def post_route(req: RouteRequest) -> Trace:
    store = GraphStore.load(req.graph)
    include_trace = req.include_trace
    if include_trace is None:
        include_trace = req.graph == "demo"  # SCHEMA §B.3 default
    params = req.params.model_dump(exclude_none=True) if req.params else {}
    trace = ALL_ALGORITHMS[req.algorithm](
        store, req.start, req.goal, mode=req.mode, time_slot=req.time_slot,
        include_trace=include_trace, **params)
    trace.explanation = build_explanation(store, trace)
    return trace


@app.post("/api/multiroute", response_model=MultirouteResponse)
def post_multiroute(req: MultirouteRequest) -> MultirouteResponse:
    store = GraphStore.load(req.graph)
    return solve_multiroute(store, req.start, req.stops, req.method,
                            mode=req.mode, time_slot=req.time_slot,
                            return_to_start=req.return_to_start)


@app.post("/api/benchmark", response_model=BenchmarkResponse)
def post_benchmark(req: BenchmarkRequest) -> BenchmarkResponse:
    """Serve cached experiment results from results/ (built in Phase 6)."""
    wanted = [req.experiment_id] if req.experiment_id else sorted(EXPERIMENT_FILES)
    out: list[ExperimentResult] = []
    for exp_id in wanted:
        csv_name, figs = EXPERIMENT_FILES[exp_id]
        csv_path = RESULTS_DIR / csv_name
        if not csv_path.exists():
            if req.experiment_id:
                raise BenchmarkMissing(exp_id)
            continue
        rows: list[dict] = []
        if csv_path.suffix == ".csv":
            with csv_path.open(encoding="utf-8", newline="") as fh:
                rows = list(csv.DictReader(fh))
        out.append(ExperimentResult(
            experiment_id=exp_id, csv_path=f"results/{csv_name}",
            fig_paths=[f"results/{f}" for f in figs
                       if (RESULTS_DIR / f).exists()],
            rows=rows))
    if not out:
        raise BenchmarkMissing(None)
    return BenchmarkResponse(experiments=out)


class BenchmarkMissing(Exception):
    def __init__(self, exp_id: int | None) -> None:
        self.exp_id = exp_id


@app.exception_handler(BenchmarkMissing)
async def on_benchmark_missing(_req: Request, exc: BenchmarkMissing):
    which = f"thí nghiệm {exc.exp_id}" if exc.exp_id else "các thí nghiệm"
    return error_json(404, "RESULTS_NOT_FOUND",
                      f"Chưa có kết quả cho {which} trong results/ — hãy chạy "
                      "backend/app/benchmark.py (Phase 6) trước.")
