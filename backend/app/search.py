"""Six core search algorithms — BFS, DFS, IDDFS, UCS, Dijkstra, A*.

Hand-implemented with plain Python dict/list/heapq only (PROMPT-MASTER
rule 6 — NetworkX is allowed solely as a test/benchmark baseline).

EVERY function has the same signature and returns the SAME Trace
structure (SCHEMA §B — the team's golden rule):

    run(store, start, goal, mode="balanced", time_slot=..., include_trace=True,
        **params) -> Trace

Shared conventions:
- The goal test happens when a node is EXPANDED (popped), uniformly
  across algorithms, so per-step traces read the same way in the video.
- `frontier` in a trace step is the set of discovered-but-not-expanded
  nodes right AFTER the step's expansion, sorted by node id.
- `nodes_expanded` counts actual expansions (IDDFS: summed over rounds);
  `max_frontier` tracks the largest frontier ever seen.
- Traces are capped at MAX_TRACE_STEPS steps -> metrics.trace_truncated.
- start == goal returns the trivial found-path [start] with zero metrics.
"""

from __future__ import annotations

import heapq
import time
from collections import deque

from .graph_store import GraphStore
from .models import Explanation, Metrics, Mode, TimeSlot, Trace, TraceStep

MAX_TRACE_STEPS = 5_000
IDDFS_MAX_DEPTH = 100  # safety bound; practical only on G_demo (see report)

EMPTY_EXPLANATION = Explanation(summary_vi="", congested_segments=[], alternatives=[])

OPTIMAL_GUARANTEE = {  # SCHEMA §B.5 — theoretical, on THIS weighted graph
    "bfs": False, "dfs": False, "iddfs": False,
    "ucs": True, "dijkstra": True, "astar": True,
}


class _Recorder:
    """Collects trace steps with the 5000-step cap; no-op when disabled."""

    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled
        self.steps: list[TraceStep] = []
        self.truncated = False

    def record(self, expanded: str, frontier: list[str], *,
               g: dict[str, float] | None = None,
               h: dict[str, float] | None = None,
               f: dict[str, float] | None = None,
               depth_limit: int | None = None,
               side: str | None = None) -> None:
        if not self.enabled:
            return
        if len(self.steps) >= MAX_TRACE_STEPS:
            self.truncated = True
            return
        self.steps.append(TraceStep(
            step=len(self.steps) + 1, expanded=expanded, frontier=frontier,
            g=g, h=h, f=f, depth_limit=depth_limit, side=side))


def _round_map(values: dict[str, float]) -> dict[str, float]:
    return {k: round(v, 1) for k, v in values.items()}


def _check_endpoints(store: GraphStore, start: str, goal: str) -> None:
    for node in (start, goal):
        if not store.has_node(node):
            raise KeyError(f"node '{node}' not in graph '{store.level}'")


def _finish(algorithm: str, store: GraphStore, mode: Mode, slot: TimeSlot,
            found: bool, path: list[str], expanded: int, max_frontier: int,
            t0: float, rec: _Recorder, optimal: bool) -> Trace:
    runtime_ms = round((time.perf_counter() - t0) * 1000, 3)
    if found:
        # totals stay unrounded: correctness tests compare against the
        # NetworkX baseline at 1e-6 (display formatting is the UI's job).
        cost, dist, time_s = store.path_metrics(path, mode, slot)
        totals = dict(total_cost=cost, total_distance_m=dist, total_time_s=time_s)
    else:
        path = []
        totals = dict(total_cost=None, total_distance_m=None, total_time_s=None)
    return Trace(
        algorithm=algorithm, mode=mode, time_slot=slot, graph=store.level,
        found=found, path=path,
        metrics=Metrics(**totals, nodes_expanded=expanded,
                        max_frontier=max_frontier, runtime_ms=runtime_ms,
                        optimal_guarantee=optimal,
                        trace_truncated=rec.truncated),
        trace=rec.steps, explanation=EMPTY_EXPLANATION)


def _trivial(algorithm: str, store: GraphStore, mode: Mode, slot: TimeSlot,
             start: str, rec: _Recorder, optimal: bool, t0: float) -> Trace:
    return _finish(algorithm, store, mode, slot, True, [start], 0, 0, t0, rec, optimal)


def _reconstruct(parent: dict[str, str], goal: str) -> list[str]:
    path = [goal]
    while path[-1] in parent:
        path.append(parent[path[-1]])
    path.reverse()
    return path


# --------------------------------------------------------------------- BFS


def bfs(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
        time_slot: TimeSlot = "07:30", include_trace: bool = True,
        **params) -> Trace:
    """Breadth-first search: fewest edges, ignores weights entirely.

    optimal_guarantee=false here because this graph is NOT uniformly
    weighted — the found path's cost/time are still reported for
    comparison (PROMPT-MASTER 6.2).
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    if start == goal:
        return _trivial("bfs", store, mode, time_slot, start, rec, False, t0)

    queue: deque[str] = deque([start])
    open_set = {start}
    visited: set[str] = set()
    parent: dict[str, str] = {}
    expanded = 0
    max_frontier = 1
    while queue:
        node = queue.popleft()
        open_set.discard(node)
        visited.add(node)
        expanded += 1
        if node == goal:
            rec.record(node, sorted(open_set))
            return _finish("bfs", store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, False)
        for nbr, _eid in store.adj[node]:
            if nbr not in visited and nbr not in open_set:
                parent[nbr] = node
                queue.append(nbr)
                open_set.add(nbr)
        max_frontier = max(max_frontier, len(open_set))
        if rec.enabled:
            rec.record(node, sorted(open_set))
    return _finish("bfs", store, mode, time_slot, False, [], expanded,
                   max_frontier, t0, rec, False)


# --------------------------------------------------------------------- DFS


def dfs(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
        time_slot: TimeSlot = "07:30", include_trace: bool = True,
        **params) -> Trace:
    """Depth-first search with a visited set; neighbor order is stable
    (adjacency sorted by edge id), so runs are fully reproducible."""
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    if start == goal:
        return _trivial("dfs", store, mode, time_slot, start, rec, False, t0)

    stack: list[tuple[str, str | None]] = [(start, None)]
    visited: set[str] = set()
    parent: dict[str, str] = {}
    expanded = 0
    max_frontier = 1

    def frontier() -> list[str]:
        return sorted({n for n, _ in stack if n not in visited})

    while stack:
        node, par = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        if par is not None:
            parent[node] = par
        expanded += 1
        if node == goal:
            rec.record(node, frontier())
            return _finish("dfs", store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, False)
        # push reversed so the smallest edge id is expanded first (LIFO)
        for nbr, _eid in reversed(store.adj[node]):
            if nbr not in visited:
                stack.append((nbr, node))
        fr = frontier()
        max_frontier = max(max_frontier, len(fr))
        if rec.enabled:
            rec.record(node, fr)
    return _finish("dfs", store, mode, time_slot, False, [], expanded,
                   max_frontier, t0, rec, False)


# ------------------------------------------------------------------- IDDFS


def iddfs(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
          time_slot: TimeSlot = "07:30", include_trace: bool = True,
          **params) -> Trace:
    """Iterative deepening DFS. Depth-limited rounds d = 0, 1, 2, ...;
    nodes_expanded accumulates over ALL rounds; every trace step carries
    the round's depth_limit (SCHEMA §B.3).

    Re-visits inside one round are allowed when a node is reached at a
    SHALLOWER depth (best_depth check) — the standard graph-search DLS
    that keeps completeness. Practical only on G_demo; the exponential
    blow-up on G_real is exactly the textbook comparison point.
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    if start == goal:
        return _trivial("iddfs", store, mode, time_slot, start, rec, False, t0)

    max_depth = int(params.get("iddfs_max_depth", IDDFS_MAX_DEPTH))
    expanded_total = 0
    max_frontier = 1
    for limit in range(max_depth + 1):
        stack: list[tuple[str, int, str | None]] = [(start, 0, None)]
        best_depth: dict[str, int] = {}
        parent: dict[str, str] = {}
        while stack:
            node, depth, par = stack.pop()
            if node in best_depth and best_depth[node] <= depth:
                continue
            best_depth[node] = depth
            if par is not None:
                parent[node] = par
            expanded_total += 1
            fr_nodes = sorted({n for n, d, _ in stack
                               if best_depth.get(n, d + 1) > d})
            max_frontier = max(max_frontier, len(fr_nodes))
            if rec.enabled:
                rec.record(node, fr_nodes, depth_limit=limit)
            if node == goal:
                return _finish("iddfs", store, mode, time_slot, True,
                               _reconstruct(parent, goal), expanded_total,
                               max_frontier, t0, rec, False)
            if depth < limit:
                for nbr, _eid in reversed(store.adj[node]):
                    if nbr not in best_depth or best_depth[nbr] > depth + 1:
                        stack.append((nbr, depth + 1, node))
    return _finish("iddfs", store, mode, time_slot, False, [], expanded_total,
                   max_frontier, t0, rec, False)


# ----------------------------------------------------- UCS / Dijkstra / A*


def _best_first(algorithm: str, store: GraphStore, start: str, goal: str,
                mode: Mode, time_slot: TimeSlot, include_trace: bool,
                use_h: bool) -> Trace:
    """Shared engine for UCS/Dijkstra (h = 0) and A* (h = heuristic §D).

    heapq with lazy deletion: stale entries are skipped on pop. Priority
    is (f, h, tie counter) — A* tie-breaks equal f on smaller h
    (PROMPT-MASTER 6.2). With a consistent heuristic the closed set is
    safe: a node is expanded at its optimal g.
    """
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    if start == goal:
        return _trivial(algorithm, store, mode, time_slot, start, rec, True, t0)

    w = store.weights(mode, time_slot)
    h_of: dict[str, float] = {}

    def h(n: str) -> float:
        if not use_h:
            return 0.0
        if n not in h_of:
            h_of[n] = store.heuristic(n, goal, mode)
        return h_of[n]

    g_best: dict[str, float] = {start: 0.0}
    parent: dict[str, str] = {}
    tie = 0
    heap: list[tuple[float, float, int, str]] = [(h(start), h(start), tie, start)]
    open_set = {start}
    closed: set[str] = set()
    expanded = 0
    max_frontier = 1

    while heap:
        _f, _h, _t, node = heapq.heappop(heap)
        if node in closed:
            continue  # stale entry (lazy deletion)
        closed.add(node)
        open_set.discard(node)
        expanded += 1

        def snapshot() -> None:
            rec.record(node, sorted(open_set),
                       g=_round_map({n: g_best[n] for n in open_set}),
                       h=_round_map({n: h(n) for n in open_set}) if use_h else None,
                       f=_round_map({n: g_best[n] + h(n) for n in open_set})
                       if use_h else None)

        if node == goal:
            if rec.enabled:
                snapshot()
            return _finish(algorithm, store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, True)
        for nbr, eid in store.adj[node]:
            if nbr in closed:
                continue
            ng = g_best[node] + w[eid]
            if ng < g_best.get(nbr, float("inf")):
                g_best[nbr] = ng
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (ng + h(nbr), h(nbr), tie, nbr))
                open_set.add(nbr)
        max_frontier = max(max_frontier, len(open_set))
        if rec.enabled:
            snapshot()
    return _finish(algorithm, store, mode, time_slot, False, [], expanded,
                   max_frontier, t0, rec, True)


def ucs(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
        time_slot: TimeSlot = "07:30", include_trace: bool = True,
        **params) -> Trace:
    """Uniform-Cost Search: best-first on g = weight(mode); goal test at
    expansion — the AI-search framing of least-cost pathfinding."""
    _check_endpoints(store, start, goal)
    return _best_first("ucs", store, start, goal, mode, time_slot,
                       include_trace, use_h=False)


def dijkstra(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
             time_slot: TimeSlot = "07:30", include_trace: bool = True,
             **params) -> Trace:
    """Dijkstra's algorithm with early exit at the goal.

    Mechanically identical to UCS here (the report discusses the
    UCS <-> Dijkstra relationship: single-pair AI search vs one-to-all
    graph algorithm cut short at the goal). Kept as a separate top-level
    algorithm because the assignment asks for both.
    """
    _check_endpoints(store, start, goal)
    return _best_first("dijkstra", store, start, goal, mode, time_slot,
                       include_trace, use_h=False)


def astar(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
          time_slot: TimeSlot = "07:30", include_trace: bool = True,
          **params) -> Trace:
    """A*: f = g + h with the §D heuristic (admissible + consistent,
    proof in docs/HEURISTIC-PROOF.md); ties on f broken by smaller h."""
    _check_endpoints(store, start, goal)
    return _best_first("astar", store, start, goal, mode, time_slot,
                       include_trace, use_h=True)


ALGORITHMS = {
    "bfs": bfs, "dfs": dfs, "iddfs": iddfs,
    "ucs": ucs, "dijkstra": dijkstra, "astar": astar,
}
