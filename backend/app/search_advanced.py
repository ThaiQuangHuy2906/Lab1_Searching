"""Four additional algorithms — Greedy Best-First, Bidirectional Dijkstra,
IDA* (epsilon-relaxed thresholds), Beam Search.

Same contract as search.py (SCHEMA §B): plain Python + heapq only, one
signature, one Trace. Notes per PROMPT-MASTER 6.3:

- greedy      orders by h alone -> no optimality guarantee.
- bidijkstra  backward search runs on the REVERSED adjacency (the graph
              is directed); stop rule top_f + top_b >= mu; per-step
              `side` for the two-tone GUI; a node in both frontiers
              shows the smaller g (SCHEMA §B.3).
- idastar     f-bounded DFS rounds; next threshold =
              max(min_f_over_threshold, threshold + epsilon), epsilon =
              5 s by default -> solution cost <= C* + epsilon, reported
              as metrics.epsilon_bound with optimal_guarantee=true.
- beam        keeps the best k per layer by f; incomplete by design —
              found=false is a legal, well-formed outcome.
"""

from __future__ import annotations

import heapq
import time

from .graph_store import GraphStore
from .models import Mode, TimeSlot, Trace, TraceStep
from .search import _Recorder, _check_endpoints, _finish, _reconstruct, _round_map, _trivial

DEFAULT_EPSILON_S = 5.0
DEFAULT_BEAM_WIDTH = {"demo": 5, "real": 50}
IDASTAR_MAX_ROUNDS = 1_000


# ------------------------------------------------------------ Greedy BFS


def greedy(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
           time_slot: TimeSlot = "07:30", include_trace: bool = True,
           **params) -> Trace:
    """Greedy Best-First: expand the open node with the smallest h only.

    g is tracked internally purely to reconstruct/report path metrics —
    per SCHEMA §B.3 the trace exposes h alone (g and f stay null).
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    if start == goal:
        return _trivial("greedy", store, mode, time_slot, start, rec, False, t0)

    h_of: dict[str, float] = {}

    def h(n: str) -> float:
        if n not in h_of:
            h_of[n] = store.heuristic(n, goal, mode)
        return h_of[n]

    tie = 0
    heap: list[tuple[float, int, str]] = [(h(start), tie, start)]
    open_set = {start}
    closed: set[str] = set()
    parent: dict[str, str] = {}
    expanded = 0
    max_frontier = 1
    while heap:
        _h, _t, node = heapq.heappop(heap)
        if node in closed:
            continue
        closed.add(node)
        open_set.discard(node)
        expanded += 1
        if node == goal:
            if rec.active:
                rec.record(node, sorted(open_set),
                           h=_round_map({n: h(n) for n in open_set}))
            return _finish("greedy", store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, False)
        for nbr, _eid in store.adj[node]:
            if nbr not in closed and nbr not in open_set:
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (h(nbr), tie, nbr))
                open_set.add(nbr)
        max_frontier = max(max_frontier, len(open_set))
        if rec.active:
            rec.record(node, sorted(open_set),
                       h=_round_map({n: h(n) for n in open_set}))
    return _finish("greedy", store, mode, time_slot, False, [], expanded,
                   max_frontier, t0, rec, False)


# ------------------------------------------------- Bidirectional Dijkstra


def bidijkstra(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
               time_slot: TimeSlot = "07:30", include_trace: bool = True,
               **params) -> Trace:
    """Bidirectional Dijkstra on a directed graph.

    Forward runs on store.adj from start; backward on store.radj from
    goal (so dist_b[n] = cost of n -> goal along ORIGINAL edges). The
    side with the smaller heap top expands next. Standard stop rule:
    finish when top_f + top_b >= mu, where mu is the best meeting cost
    seen so far; the answer is provably optimal (matches Dijkstra).
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    if start == goal:
        return _trivial("bidijkstra", store, mode, time_slot, start, rec, True, t0)

    w = store.weights(mode, time_slot)
    g_f: dict[str, float] = {start: 0.0}
    g_b: dict[str, float] = {goal: 0.0}
    par_f: dict[str, str] = {}
    nxt_b: dict[str, str] = {}  # node -> its successor toward goal
    heap_f: list[tuple[float, int, str]] = [(0.0, 0, start)]
    heap_b: list[tuple[float, int, str]] = [(0.0, 0, goal)]
    open_f, open_b = {start}, {goal}
    closed_f: set[str] = set()
    closed_b: set[str] = set()
    tie = 0
    mu = float("inf")
    meet: str | None = None
    expanded = 0
    max_frontier = 1

    def try_meet(n: str) -> None:
        nonlocal mu, meet
        if n in g_f and n in g_b and g_f[n] + g_b[n] < mu:
            mu, meet = g_f[n] + g_b[n], n

    def peek(heap: list, closed: set[str]) -> float:
        while heap and heap[0][2] in closed:
            heapq.heappop(heap)
        return heap[0][0] if heap else float("inf")

    while True:
        top_f, top_b = peek(heap_f, closed_f), peek(heap_b, closed_b)
        if top_f + top_b >= mu:
            break
        if top_f == float("inf") and top_b == float("inf"):
            break
        side = "forward" if top_f <= top_b else "backward"
        if side == "forward":
            heap, closed, open_side, g_this, adj = heap_f, closed_f, open_f, g_f, store.adj
        else:
            heap, closed, open_side, g_this, adj = heap_b, closed_b, open_b, g_b, store.radj
        _d, _t, node = heapq.heappop(heap)
        closed.add(node)
        open_side.discard(node)
        expanded += 1
        try_meet(node)
        for nbr, eid in adj[node]:
            if nbr in closed:
                continue
            ng = g_this[node] + w[eid]
            if ng < g_this.get(nbr, float("inf")):
                g_this[nbr] = ng
                if side == "forward":
                    par_f[nbr] = node
                else:
                    nxt_b[nbr] = node
                tie += 1
                heapq.heappush(heap, (ng, tie, nbr))
                open_side.add(nbr)
                try_meet(nbr)
        frontier_nodes = open_f | open_b
        max_frontier = max(max_frontier, len(frontier_nodes))
        if rec.active:
            fr = sorted(frontier_nodes)
            # a node present in BOTH frontiers shows the smaller g (SCHEMA B.3)
            rec.record(node, fr, side=side, g=_round_map({
                n: min(g_f.get(n, float("inf")), g_b.get(n, float("inf")))
                for n in fr}))

    if meet is None:
        return _finish("bidijkstra", store, mode, time_slot, False, [], expanded,
                       max_frontier, t0, rec, True)
    left = [meet]
    while left[-1] in par_f:
        left.append(par_f[left[-1]])
    left.reverse()
    right = []
    cur = meet
    while cur in nxt_b:
        cur = nxt_b[cur]
        right.append(cur)
    return _finish("bidijkstra", store, mode, time_slot, True, left + right,
                   expanded, max_frontier, t0, rec, True)


# --------------------------------------------------------------- IDA*


def idastar(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
            time_slot: TimeSlot = "07:30", include_trace: bool = True,
            **params) -> Trace:
    """IDA*: repeated depth-first probes bounded by f = g + h.

    Next threshold = max(smallest f that exceeded the bound,
    threshold + epsilon) with epsilon = 5 s (PROMPT-MASTER rule 4), so
    the returned cost is within C* + epsilon — reported via
    metrics.epsilon_bound, optimal_guarantee=true "within epsilon".
    Cycle safety inside a probe: nodes on the current path are skipped.
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    epsilon = float(params.get("epsilon", DEFAULT_EPSILON_S))
    if start == goal:
        t = _trivial("idastar", store, mode, time_slot, start, rec, True, t0)
        t.metrics.epsilon_bound = epsilon
        return t

    w = store.weights(mode, time_slot)
    h_of: dict[str, float] = {}

    def h(n: str) -> float:
        if n not in h_of:
            h_of[n] = store.heuristic(n, goal, mode)
        return h_of[n]

    expanded = 0
    max_frontier = 1
    threshold = h(start)
    for _round in range(int(params.get("max_rounds", IDASTAR_MAX_ROUNDS))):
        # stack frames: (node, g, on_path set via parent chain)
        stack: list[tuple[str, float, str | None]] = [(start, 0.0, None)]
        parent: dict[str, str] = {}
        best_g: dict[str, float] = {}
        min_excess = float("inf")
        while stack:
            node, g, par = stack.pop()
            f = g + h(node)
            if f > threshold + 1e-9:
                min_excess = min(min_excess, f)
                continue
            if node in best_g and best_g[node] <= g:
                continue  # already reached this node cheaper in this round
            best_g[node] = g
            if par is not None:
                parent[node] = par
            expanded += 1
            if rec.active:
                fr_g: dict[str, float] = {}
                for n, sg, _p in stack:
                    if n not in best_g and (n not in fr_g or sg < fr_g[n]):
                        fr_g[n] = sg
                fr = sorted(fr_g)
                rec.record(node, fr, g=_round_map(fr_g),
                           h=_round_map({n: h(n) for n in fr}),
                           f=_round_map({n: fr_g[n] + h(n) for n in fr}))
            if node == goal:
                return _idastar_finish(store, mode, time_slot, parent, goal,
                                       expanded, max_frontier, t0, rec, epsilon)
            for nbr, eid in reversed(store.adj[node]):
                ng = g + w[eid]
                if nbr in best_g and best_g[nbr] <= ng:
                    continue
                stack.append((nbr, ng, node))
            max_frontier = max(max_frontier, len(stack))
        if min_excess == float("inf"):
            break  # search space exhausted below threshold -> unreachable
        threshold = max(min_excess, threshold + epsilon)
    t = _finish("idastar", store, mode, time_slot, False, [], expanded,
                max_frontier, t0, rec, True)
    t.metrics.epsilon_bound = epsilon
    return t


def _idastar_finish(store, mode, slot, parent, goal, expanded, max_frontier,
                    t0, rec, epsilon) -> Trace:
    t = _finish("idastar", store, mode, slot, True, _reconstruct(parent, goal),
                expanded, max_frontier, t0, rec, True)
    t.metrics.epsilon_bound = epsilon
    return t


# --------------------------------------------------------------- Beam


def beam(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
         time_slot: TimeSlot = "07:30", include_trace: bool = True,
         **params) -> Trace:
    """Beam Search: layer-by-layer best-first keeping only the k best
    open nodes (by f = g + h) per layer.

    Deliberately incomplete: pruning can cut every path to the goal, in
    which case found=false with a fully-formed trace (SCHEMA §B.1).
    Default k: 5 on G_demo, 50 on G_real; override via params.beam_width.
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    k = int(params.get("beam_width") or DEFAULT_BEAM_WIDTH[store.level])
    if start == goal:
        t = _trivial("beam", store, mode, time_slot, start, rec, False, t0)
        t.metrics.beam_width = k
        return t

    w = store.weights(mode, time_slot)
    h_of: dict[str, float] = {}

    def h(n: str) -> float:
        if n not in h_of:
            h_of[n] = store.heuristic(n, goal, mode)
        return h_of[n]

    g_of: dict[str, float] = {start: 0.0}
    parent: dict[str, str] = {}
    visited = {start}
    layer = [start]  # current beam, sorted by f
    expanded = 0
    max_frontier = 1
    found = False
    while layer and not found:
        pool: dict[str, float] = {}  # candidates for the next layer

        def snapshot(i: int, node: str) -> None:
            # frontier = rest of the current beam + next-layer candidates
            g_all = {n: g_of[n] for n in layer[i + 1:]} | pool
            fr = sorted(g_all)
            rec.record(node, fr, g=_round_map(g_all),
                       h=_round_map({n: h(n) for n in fr}),
                       f=_round_map({n: g_all[n] + h(n) for n in fr}))

        for i, node in enumerate(layer):
            expanded += 1
            if node == goal:
                found = True
                if rec.active:
                    snapshot(i, node)
                break
            for nbr, eid in store.adj[node]:
                if nbr in visited:
                    continue
                ng = g_of[node] + w[eid]
                if nbr not in pool or ng < pool[nbr]:
                    pool[nbr] = ng
                    parent[nbr] = node
            if rec.active:
                snapshot(i, node)
        if found:
            break
        ranked = sorted(pool.items(), key=lambda kv: kv[1] + h(kv[0]))[:k]
        layer = [n for n, _ in ranked]
        for n, gval in ranked:
            g_of[n] = gval
            visited.add(n)
        max_frontier = max(max_frontier, len(layer))
    t = _finish("beam", store, mode, time_slot, found,
                _reconstruct(parent, goal) if found else [], expanded,
                max_frontier, t0, rec, False)
    t.metrics.beam_width = k
    return t


ADVANCED_ALGORITHMS = {
    "greedy": greedy, "bidijkstra": bidijkstra, "idastar": idastar, "beam": beam,
}
