"""Five core search algorithms — BFS, DFS, IDDFS, UCS, A*.

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
from .models import (
    BidirectionalBoundEvidence, Explanation, Metrics, Mode, RouteTermination,
    TimeSlot, Trace, TraceStep,
)

MAX_TRACE_STEPS = 5_000
IDDFS_MAX_DEPTH = 100  # safety bound; practical only on G_demo (see report)

EMPTY_EXPLANATION = Explanation(summary_vi="", congested_segments=[], alternatives=[])

OPTIMAL_GUARANTEE = {  # SCHEMA §B.5 — theoretical, on THIS weighted graph
    "bfs": False, "dfs": False, "iddfs": False,
    "ucs": True, "astar": True,
}


class _Recorder:
    """Collects trace steps with the 5000-step cap; no-op when disabled."""

    def __init__(self, enabled: bool) -> None:
        self.enabled = enabled
        self.steps: list[TraceStep] = []
        self.truncated = False

    @property
    def active(self) -> bool:
        """True while steps can still be appended.

        Snapshot builders MUST gate on this, not on `enabled`: building a
        frontier snapshot (sort + g/h/f maps) for a record() that will
        no-op costs real CPU — on G_real an IDA* run kept paying it for
        ~3.5M expansions after the cap, turning a 4 s request into 40 s
        (audit finding L3-02). Marks `truncated` once the cap is hit so
        skipped snapshots still surface in metrics.trace_truncated.
        """
        if not self.enabled:
            return False
        if len(self.steps) >= MAX_TRACE_STEPS:
            self.truncated = True
            return False
        return True

    def record(self, expanded: str, frontier: list[str], *,
               g: dict[str, float] | None = None,
               h: dict[str, float] | None = None,
               f: dict[str, float] | None = None,
               depth_limit: int | None = None,
               side: str | None = None,
               decision: dict | None = None,
               bidirectional_frontiers: dict | None = None) -> None:
        if not self.enabled:
            return
        if len(self.steps) >= MAX_TRACE_STEPS:
            self.truncated = True
            return
        self.steps.append(TraceStep(
            step=len(self.steps) + 1, expanded=expanded, frontier=frontier,
            g=g, h=h, f=f, depth_limit=depth_limit, side=side,
            decision=decision,
            bidirectional_frontiers=bidirectional_frontiers))


def _round_map(values: dict[str, float]) -> dict[str, float]:
    return {k: round(v, 1) for k, v in values.items()}


def _score_payload(*, g=None, h=None, f=None, depth=None) -> dict:
    return {"g": g, "h": h, "f": f, "depth": depth}


def _candidate_payload(node: str, *, g=None, h=None, f=None, depth=None) -> dict:
    return {"node": node, **_score_payload(g=g, h=h, f=f, depth=depth)}


def _decision_payload(
    rule: str,
    *,
    selected_scores: dict | None,
    runner_up: dict | None,
    frontier_size_before: int,
    frontier_size_after: int,
    neighbors_scanned: int = 0,
    frontier_added: int = 0,
    frontier_updated: int = 0,
    pruned_count: int = 0,
    iteration: int | None = None,
    bound: float | None = None,
    layer: int | None = None,
    beam_width: int | None = None,
    top_forward: dict | None = None,
    top_backward: dict | None = None,
    mu_before: float | None = None,
) -> dict:
    """Build the complete §F.2 decision shape only for a recorded step."""
    return {
        "rule": rule,
        "selected_scores": selected_scores,
        "runner_up": runner_up,
        "frontier_size_before": frontier_size_before,
        "frontier_size_after": frontier_size_after,
        "neighbors_scanned": neighbors_scanned,
        "frontier_added": frontier_added,
        "frontier_updated": frontier_updated,
        "pruned_count": pruned_count,
        "iteration": iteration,
        "bound": bound,
        "layer": layer,
        "beam_width": beam_width,
        "top_forward": top_forward,
        "top_backward": top_backward,
        "mu_before": mu_before,
    }


def _check_endpoints(store: GraphStore, start: str, goal: str) -> None:
    for node in (start, goal):
        if not store.has_node(node):
            raise KeyError(f"node '{node}' not in graph '{store.level}'")


def _finish(algorithm: str, store: GraphStore, mode: Mode, slot: TimeSlot,
            found: bool, path: list[str], expanded: int, max_frontier: int,
            t0: float, rec: _Recorder, optimal: bool,
            termination_reason: str | None = None,
            bidirectional_bound: BidirectionalBoundEvidence | dict | None = None,
            ) -> Trace:
    runtime_ms = round((time.perf_counter() - t0) * 1000, 3)
    if found:
        # totals stay unrounded: correctness tests compare against the
        # NetworkX baseline at 1e-6 (display formatting is the UI's job).
        cost, dist, time_s = store.path_metrics(path, mode, slot)
        totals = dict(total_cost=cost, total_distance_m=dist, total_time_s=time_s)
    else:
        path = []
        totals = dict(total_cost=None, total_distance_m=None, total_time_s=None)
    if termination_reason is None:
        termination_reason = (
            "start_equals_goal" if found and len(path) == 1 else
            "goal_expanded" if found else "frontier_exhausted"
        )
    reachability = (
        "route_found" if found else
        "proven_unreachable" if termination_reason == "frontier_exhausted" else
        "inconclusive"
    )
    quality = (
        "not_applicable" if termination_reason == "start_equals_goal" or not found else
        "epsilon_bounded" if algorithm == "idastar" else
        "exact" if optimal else "feasible_unproven"
    )
    termination = RouteTermination(
        reason=termination_reason,
        reachability=reachability,
        solution_quality=quality,
        bidirectional_bound=bidirectional_bound,
    )
    return Trace(
        algorithm=algorithm, mode=mode, time_slot=slot, graph=store.level,
        found=found, path=path,
        metrics=Metrics(**totals, nodes_expanded=expanded,
                        max_frontier=max_frontier, runtime_ms=runtime_ms,
                        optimal_guarantee=optimal,
                        trace_truncated=rec.truncated),
        trace=rec.steps, explanation=EMPTY_EXPLANATION,
        termination=termination)


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
        record_step = rec.active
        frontier_size_before = len(open_set)
        runner_up = (
            _candidate_payload(queue[0]) if record_step and queue else None
        )
        open_set.discard(node)
        visited.add(node)
        expanded += 1
        if node == goal:
            if record_step:
                frontier = sorted(open_set)
                rec.record(
                    node, frontier,
                    decision=_decision_payload(
                        "fifo", selected_scores=None, runner_up=runner_up,
                        frontier_size_before=frontier_size_before,
                        frontier_size_after=len(frontier),
                    ),
                )
            return _finish("bfs", store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, False)
        added = 0
        for nbr, _eid in store.adj[node]:
            if nbr not in visited and nbr not in open_set:
                parent[nbr] = node
                queue.append(nbr)
                open_set.add(nbr)
                added += 1
        max_frontier = max(max_frontier, len(open_set))
        if record_step:
            frontier = sorted(open_set)
            rec.record(
                node, frontier,
                decision=_decision_payload(
                    "fifo", selected_scores=None, runner_up=runner_up,
                    frontier_size_before=frontier_size_before,
                    frontier_size_after=len(frontier),
                    neighbors_scanned=len(store.adj[node]),
                    frontier_added=added,
                ),
            )
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
        record_step = rec.active
        visited.add(node)
        before_frontier = frontier()
        frontier_size_before = len(before_frontier) + 1
        runner_node = next(
            (candidate for candidate, _ in reversed(stack) if candidate not in visited),
            None,
        ) if record_step else None
        runner_up = _candidate_payload(runner_node) if runner_node is not None else None
        if par is not None:
            parent[node] = par
        expanded += 1
        if node == goal:
            if record_step:
                fr = frontier()
                rec.record(
                    node, fr,
                    decision=_decision_payload(
                        "lifo", selected_scores=None, runner_up=runner_up,
                        frontier_size_before=frontier_size_before,
                        frontier_size_after=len(fr),
                    ),
                )
            return _finish("dfs", store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, False)
        # push reversed so the smallest edge id is expanded first (LIFO)
        known_open = set(before_frontier)
        added = 0
        for nbr, _eid in reversed(store.adj[node]):
            if nbr not in visited:
                stack.append((nbr, node))
                if record_step and nbr not in known_open:
                    known_open.add(nbr)
                    added += 1
        fr = frontier()
        max_frontier = max(max_frontier, len(fr))
        if record_step:
            rec.record(
                node, fr,
                decision=_decision_payload(
                    "lifo", selected_scores=None, runner_up=runner_up,
                    frontier_size_before=frontier_size_before,
                    frontier_size_after=len(fr),
                    neighbors_scanned=len(store.adj[node]),
                    frontier_added=added,
                ),
            )
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
    final_cutoff = False
    for limit in range(max_depth + 1):
        stack: list[tuple[str, int, str | None]] = [(start, 0, None)]
        best_depth: dict[str, int] = {}
        parent: dict[str, str] = {}
        round_cutoff = False
        while stack:
            node, depth, par = stack.pop()
            if node in best_depth and best_depth[node] <= depth:
                continue
            record_step = rec.active
            best_depth[node] = depth
            effective_before: dict[str, int] = {}
            for candidate, candidate_depth, _ in stack:
                if best_depth.get(candidate, candidate_depth + 1) > candidate_depth:
                    effective_before[candidate] = min(
                        candidate_depth,
                        effective_before.get(candidate, candidate_depth),
                    )
            runner_item = next(
                (
                    (candidate, candidate_depth)
                    for candidate, candidate_depth, _ in reversed(stack)
                    if best_depth.get(candidate, candidate_depth + 1) > candidate_depth
                ),
                None,
            )
            runner_up = (
                _candidate_payload(runner_item[0], depth=runner_item[1])
                if runner_item is not None else None
            )
            if par is not None:
                parent[node] = par
            expanded_total += 1
            added = updated = cutoff_count = 0
            neighbors_scanned = 0
            if node != goal:
                neighbors_scanned = len(store.adj[node])
                if depth < limit:
                    known_depth = dict(effective_before)
                    for nbr, _eid in reversed(store.adj[node]):
                        if nbr not in best_depth or best_depth[nbr] > depth + 1:
                            if record_step:
                                previous = known_depth.get(nbr)
                                if previous is None:
                                    added += 1
                                elif depth + 1 < previous:
                                    updated += 1
                                known_depth[nbr] = min(
                                    depth + 1, previous if previous is not None else depth + 1,
                                )
                            stack.append((nbr, depth + 1, node))
                else:
                    pending_depth = dict(effective_before)
                    for nbr, _eid in store.adj[node]:
                        known = min(
                            best_depth.get(nbr, max_depth + 2),
                            pending_depth.get(nbr, max_depth + 2),
                        )
                        if known > depth + 1:
                            round_cutoff = True
                            cutoff_count += 1
            fr_nodes = sorted({n for n, d, _ in stack
                               if best_depth.get(n, d + 1) > d})
            max_frontier = max(max_frontier, len(fr_nodes))
            if record_step:
                rec.record(
                    node, fr_nodes, depth_limit=limit,
                    decision=_decision_payload(
                        "depth_limited_lifo",
                        selected_scores=_score_payload(depth=depth),
                        runner_up=runner_up,
                        frontier_size_before=len(effective_before) + 1,
                        frontier_size_after=len(fr_nodes),
                        neighbors_scanned=neighbors_scanned,
                        frontier_added=added,
                        frontier_updated=updated,
                        pruned_count=cutoff_count,
                        iteration=limit + 1,
                        bound=float(limit),
                    ),
                )
            if node == goal:
                return _finish("iddfs", store, mode, time_slot, True,
                               _reconstruct(parent, goal), expanded_total,
                               max_frontier, t0, rec, False)
        final_cutoff = round_cutoff
    return _finish(
        "iddfs", store, mode, time_slot, False, [], expanded_total,
        max_frontier, t0, rec, False,
        termination_reason="depth_cap_reached" if final_cutoff else "frontier_exhausted",
    )


# -------------------------------------------------------------- UCS / A*


def _best_first(algorithm: str, store: GraphStore, start: str, goal: str,
                mode: Mode, time_slot: TimeSlot, include_trace: bool,
                use_h: bool) -> Trace:
    """Shared engine for UCS (h = 0) and A* (h = heuristic §D).

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
        record_step = rec.active
        frontier_size_before = len(open_set)
        closed.add(node)
        open_set.discard(node)
        expanded += 1

        runner_entry = min(
            (entry for entry in heap if entry[3] not in closed),
            default=None,
        ) if record_step else None
        runner_up = None
        if runner_entry is not None:
            runner_node = runner_entry[3]
            runner_up = _candidate_payload(
                runner_node,
                g=g_best[runner_node],
                h=h(runner_node) if use_h else None,
                f=g_best[runner_node] + h(runner_node) if use_h else None,
            )

        selected_scores = _score_payload(
            g=g_best[node],
            h=h(node) if use_h else None,
            f=g_best[node] + h(node) if use_h else None,
        )

        def snapshot(*, neighbors_scanned=0, added=0, updated=0) -> None:
            frontier = sorted(open_set)
            rec.record(node, frontier,
                       g=_round_map({n: g_best[n] for n in open_set}),
                       h=_round_map({n: h(n) for n in open_set}) if use_h else None,
                       f=_round_map({n: g_best[n] + h(n) for n in open_set})
                       if use_h else None,
                       decision=_decision_payload(
                           "lowest_f_then_h" if use_h else "lowest_g",
                           selected_scores=selected_scores,
                           runner_up=runner_up,
                           frontier_size_before=frontier_size_before,
                           frontier_size_after=len(frontier),
                           neighbors_scanned=neighbors_scanned,
                           frontier_added=added,
                           frontier_updated=updated,
                       ))

        if node == goal:
            if record_step:
                snapshot()
            return _finish(algorithm, store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, True)
        added = updated = 0
        for nbr, eid in store.adj[node]:
            if nbr in closed:
                continue
            ng = g_best[node] + w[eid]
            if ng < g_best.get(nbr, float("inf")):
                if nbr in g_best:
                    updated += 1
                else:
                    added += 1
                g_best[nbr] = ng
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (ng + h(nbr), h(nbr), tie, nbr))
                open_set.add(nbr)
        max_frontier = max(max_frontier, len(open_set))
        if record_step:
            snapshot(
                neighbors_scanned=len(store.adj[node]),
                added=added,
                updated=updated,
            )
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
    "ucs": ucs, "astar": astar,
}
