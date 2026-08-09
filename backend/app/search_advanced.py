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
              5 cost units by default (m for distance, s otherwise) ->
              solution cost <= C* + epsilon, reported as
              metrics.epsilon_bound with optimal_guarantee=true.
- beam        keeps the best k per layer by f; incomplete by design —
              found=false is a legal, well-formed outcome.
"""

from __future__ import annotations

import heapq
import time

from .graph_store import GraphStore
from .models import BidirectionalBoundEvidence, Mode, TimeSlot, Trace
from .search import (
    _Recorder, _candidate_payload, _check_endpoints, _decision_payload, _finish,
    _reconstruct, _round_map, _score_payload, _trivial,
)

DEFAULT_EPSILON = 5.0
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
        record_step = rec.active
        frontier_size_before = len(open_set)
        runner_entry = min(
            (entry for entry in heap if entry[2] not in closed),
            default=None,
        ) if record_step else None
        runner_up = (
            _candidate_payload(runner_entry[2], h=runner_entry[0])
            if runner_entry is not None else None
        )
        closed.add(node)
        open_set.discard(node)
        expanded += 1

        def snapshot(*, neighbors_scanned=0, added=0) -> None:
            frontier = sorted(open_set)
            rec.record(
                node, frontier,
                h=_round_map({n: h(n) for n in open_set}),
                decision=_decision_payload(
                    "lowest_h",
                    selected_scores=_score_payload(h=h(node)),
                    runner_up=runner_up,
                    frontier_size_before=frontier_size_before,
                    frontier_size_after=len(frontier),
                    neighbors_scanned=neighbors_scanned,
                    frontier_added=added,
                ),
            )

        if node == goal:
            if record_step:
                snapshot()
            return _finish("greedy", store, mode, time_slot, True,
                           _reconstruct(parent, goal), expanded, max_frontier,
                           t0, rec, False)
        added = 0
        for nbr, _eid in store.adj[node]:
            if nbr not in closed and nbr not in open_set:
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (h(nbr), tie, nbr))
                open_set.add(nbr)
                added += 1
        max_frontier = max(max_frontier, len(open_set))
        if record_step:
            snapshot(neighbors_scanned=len(store.adj[node]), added=added)
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
    seen so far; the answer is provably optimal (matches UCS).
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
    nxt_b: dict[str, str] = {}
    heap_f: list[tuple[float, int, str]] = [(0.0, 0, start)]
    heap_b: list[tuple[float, int, str]] = [(0.0, 0, goal)]
    open_f, open_b = {start}, {goal}
    closed_f: set[str] = set()
    closed_b: set[str] = set()
    tie = 0
    mu = float("inf")
    meet: str | None = None
    expanded = 0
    max_frontier = len(open_f | open_b)

    def try_meet(n: str) -> None:
        nonlocal mu, meet
        if n in g_f and n in g_b and g_f[n] + g_b[n] < mu:
            mu, meet = g_f[n] + g_b[n], n

    def peek_entry(
        heap: list[tuple[float, int, str]], closed: set[str],
    ) -> tuple[float, int, str] | None:
        while heap and heap[0][2] in closed:
            heapq.heappop(heap)
        return heap[0] if heap else None

    def top_payload(entry: tuple[float, int, str] | None) -> dict | None:
        return None if entry is None else {"node": entry[2], "g": entry[0]}

    stop_forward: tuple[float, int, str] | None = None
    stop_backward: tuple[float, int, str] | None = None

    while True:
        top_f_entry = peek_entry(heap_f, closed_f)
        top_b_entry = peek_entry(heap_b, closed_b)
        top_f = top_f_entry[0] if top_f_entry is not None else float("inf")
        top_b = top_b_entry[0] if top_b_entry is not None else float("inf")
        if top_f + top_b >= mu:
            stop_forward, stop_backward = top_f_entry, top_b_entry
            break
        if top_f == float("inf") and top_b == float("inf"):
            stop_forward, stop_backward = top_f_entry, top_b_entry
            break

        side = "forward" if top_f <= top_b else "backward"
        if side == "forward":
            heap, closed, open_side, g_this, adj = (
                heap_f, closed_f, open_f, g_f, store.adj,
            )
            other_top = top_b_entry
        else:
            heap, closed, open_side, g_this, adj = (
                heap_b, closed_b, open_b, g_b, store.radj,
            )
            other_top = top_f_entry

        record_step = rec.active
        frontier_size_before = len(open_f | open_b)
        mu_before = None if mu == float("inf") else mu
        _d, _t, node = heapq.heappop(heap)

        runner_up = None
        if record_step:
            same_side_candidates = sorted(
                entry for entry in heap
                if entry[2] not in closed and entry[0] == g_this[entry[2]]
            )
            runner_entries = []
            if same_side_candidates:
                runner_entries.append(same_side_candidates[0])
            if other_top is not None:
                runner_entries.append(other_top)
            if runner_entries:
                runner_entry = min(runner_entries)
                runner_up = _candidate_payload(runner_entry[2], g=runner_entry[0])

        closed.add(node)
        open_side.discard(node)
        expanded += 1
        try_meet(node)
        added = updated = 0
        for nbr, eid in adj[node]:
            if nbr in closed:
                continue
            ng = g_this[node] + w[eid]
            if ng < g_this.get(nbr, float("inf")):
                if nbr in g_this:
                    updated += 1
                else:
                    added += 1
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
        if record_step:
            fr = sorted(frontier_nodes)
            g_snapshot: dict[str, float] = {}
            for n in fr:
                if n in open_f and n in open_b:
                    g_snapshot[n] = min(g_f[n], g_b[n])
                elif n in open_f:
                    g_snapshot[n] = g_f[n]
                else:
                    g_snapshot[n] = g_b[n]
            forward_nodes = sorted(open_f)
            backward_nodes = sorted(open_b)
            rec.record(
                node, fr, side=side, g=_round_map(g_snapshot),
                decision=_decision_payload(
                    "bidirectional_min_key",
                    selected_scores=_score_payload(g=_d),
                    runner_up=runner_up,
                    frontier_size_before=frontier_size_before,
                    frontier_size_after=len(fr),
                    neighbors_scanned=len(adj[node]),
                    frontier_added=added,
                    frontier_updated=updated,
                    top_forward=top_payload(top_f_entry),
                    top_backward=top_payload(top_b_entry),
                    mu_before=mu_before,
                ),
                bidirectional_frontiers={
                    "forward": {
                        "nodes": forward_nodes,
                        "g": _round_map({n: g_f[n] for n in forward_nodes}),
                    },
                    "backward": {
                        "nodes": backward_nodes,
                        "g": _round_map({n: g_b[n] for n in backward_nodes}),
                    },
                    "best_path_cost": None if mu == float("inf") else mu,
                    "meeting_node": meet,
                },
            )

    if meet is None:
        return _finish(
            "bidijkstra", store, mode, time_slot, False, [], expanded,
            max_frontier, t0, rec, True,
        )
    left = [meet]
    while left[-1] in par_f:
        left.append(par_f[left[-1]])
    left.reverse()
    right = []
    cur = meet
    while cur in nxt_b:
        cur = nxt_b[cur]
        right.append(cur)
    bound = BidirectionalBoundEvidence(
        top_forward=top_payload(stop_forward),
        top_backward=top_payload(stop_backward),
        mu=mu,
        meeting_node=meet,
    )
    return _finish(
        "bidijkstra", store, mode, time_slot, True, left + right,
        expanded, max_frontier, t0, rec, True,
        termination_reason="bidirectional_bound_met",
        bidirectional_bound=bound,
    )


# --------------------------------------------------------------- IDA*


def idastar(store: GraphStore, start: str, goal: str, mode: Mode = "balanced",
            time_slot: TimeSlot = "07:30", include_trace: bool = True,
            **params) -> Trace:
    """IDA*: repeated depth-first probes bounded by f = g + h.

    Next threshold = max(smallest f that exceeded the bound,
    threshold + epsilon) with epsilon = 5 mode-cost units (metres for
    distance, seconds for time/balanced), so the returned cost is within
    C* + epsilon — reported via metrics.epsilon_bound,
    optimal_guarantee=true "within epsilon".
    Cycle safety inside a probe: nodes on the current path are skipped.
    """
    _check_endpoints(store, start, goal)
    t0 = time.perf_counter()
    rec = _Recorder(include_trace)
    epsilon = float(params.get("epsilon", DEFAULT_EPSILON))
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
    for round_index in range(int(params.get("max_rounds", IDASTAR_MAX_ROUNDS))):
        # The added depth value is observation-only; stack ordering is unchanged.
        stack: list[tuple[str, float, str | None, int]] = [(start, 0.0, None, 0)]
        parent: dict[str, str] = {}
        best_g: dict[str, float] = {}
        min_excess = float("inf")
        while stack:
            node, g, par, depth = stack.pop()
            f = g + h(node)
            if f > threshold + 1e-9:
                min_excess = min(min_excess, f)
                continue
            if node in best_g and best_g[node] <= g:
                continue  # already reached this node cheaper in this round
            best_g[node] = g
            if par is not None:
                parent[node] = par
            record_step = rec.active
            frontier_size_before = 1
            runner_up = None
            if record_step:
                frontier_size_before += len({
                    n for n, _sg, _p, _depth in stack if n not in best_g
                })
                for runner_node, runner_g, _runner_parent, runner_depth in reversed(stack):
                    if runner_node in best_g:
                        continue
                    runner_up = _candidate_payload(
                        runner_node,
                        g=runner_g,
                        h=h(runner_node),
                        f=runner_g + h(runner_node),
                        depth=runner_depth,
                    )
                    break
            expanded += 1
            neighbors_scanned = added = updated = pruned = 0
            if node != goal:
                for nbr, eid in reversed(store.adj[node]):
                    neighbors_scanned += 1
                    ng = g + w[eid]
                    if nbr in best_g and best_g[nbr] <= ng:
                        if record_step:
                            pruned += 1
                        continue
                    if record_step:
                        if any(existing[0] == nbr for existing in stack):
                            updated += 1
                        else:
                            added += 1
                        if ng + h(nbr) > threshold + 1e-9:
                            pruned += 1
                    stack.append((nbr, ng, node, depth + 1))
            max_frontier = max(max_frontier, len(stack))
            if record_step:
                fr_g: dict[str, float] = {}
                for n, sg, _p, _depth in stack:
                    if n not in best_g and (n not in fr_g or sg < fr_g[n]):
                        fr_g[n] = sg
                fr = sorted(fr_g)
                rec.record(
                    node, fr, g=_round_map(fr_g),
                    h=_round_map({n: h(n) for n in fr}),
                    f=_round_map({n: fr_g[n] + h(n) for n in fr}),
                    decision=_decision_payload(
                        "f_bound_dfs",
                        selected_scores=_score_payload(
                            g=g, h=h(node), f=f, depth=depth,
                        ),
                        runner_up=runner_up,
                        frontier_size_before=frontier_size_before,
                        frontier_size_after=len(fr),
                        neighbors_scanned=neighbors_scanned,
                        frontier_added=added,
                        frontier_updated=updated,
                        pruned_count=pruned,
                        iteration=round_index + 1,
                        bound=threshold,
                    ),
                )
            if node == goal:
                return _idastar_finish(store, mode, time_slot, parent, goal,
                                       expanded, max_frontier, t0, rec, epsilon)
        if min_excess == float("inf"):
            # Search space was exhausted: unreachability is established rather
            # than merely assumed because a safety cap stopped the run.
            t = _finish(
                "idastar", store, mode, time_slot, False, [], expanded,
                max_frontier, t0, rec, True,
                termination_reason="frontier_exhausted",
            )
            t.metrics.epsilon_bound = epsilon
            return t
        threshold = max(min_excess, threshold + epsilon)
    # The round cap stopped the proof/search before a solution or exhaustive
    # unreachable result. Do not claim the epsilon guarantee for this run.
    t = _finish(
        "idastar", store, mode, time_slot, False, [], expanded,
        max_frontier, t0, rec, False,
        termination_reason="round_cap_reached",
    )
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
    layer = [start]
    expanded = 0
    max_frontier = 1
    found = False
    ever_pruned = False
    layer_number = 1
    while layer and not found:
        pool: dict[str, float] = {}

        def ranked_pool() -> list[tuple[str, float]]:
            return sorted(
                pool.items(), key=lambda kv: kv[1] + h(kv[0])
            )[:k]

        def snapshot(
            node: str, selected: list[tuple[str, float]], *,
            runner_up: dict | None, frontier_size_before: int,
            neighbors_scanned: int, added: int, updated: int,
        ) -> None:
            g_all = dict(selected)
            fr = sorted(g_all)
            rec.record(
                node, fr, g=_round_map(g_all),
                h=_round_map({n: h(n) for n in fr}),
                f=_round_map({n: g_all[n] + h(n) for n in fr}),
                decision=_decision_payload(
                    "top_k_f",
                    selected_scores=_score_payload(
                        g=g_of[node], h=h(node), f=g_of[node] + h(node),
                    ),
                    runner_up=runner_up,
                    frontier_size_before=frontier_size_before,
                    frontier_size_after=len(fr),
                    neighbors_scanned=neighbors_scanned,
                    frontier_added=added,
                    frontier_updated=updated,
                    pruned_count=max(0, len(pool) - k),
                    layer=layer_number,
                    beam_width=k,
                ),
            )

        for layer_index, node in enumerate(layer):
            record_step = rec.active
            runner_up = None
            if record_step and layer_index + 1 < len(layer):
                runner = layer[layer_index + 1]
                runner_up = _candidate_payload(
                    runner,
                    g=g_of[runner], h=h(runner), f=g_of[runner] + h(runner),
                )
            expanded += 1
            if node == goal:
                found = True
                selected = ranked_pool()
                max_frontier = max(max_frontier, len(selected))
                if record_step:
                    snapshot(
                        node, selected, runner_up=runner_up,
                        frontier_size_before=len(layer) - layer_index,
                        neighbors_scanned=0, added=0, updated=0,
                    )
                break
            added = updated = 0
            for nbr, eid in store.adj[node]:
                if nbr in visited:
                    continue
                ng = g_of[node] + w[eid]
                if nbr not in pool or ng < pool[nbr]:
                    if record_step:
                        if nbr in pool:
                            updated += 1
                        else:
                            added += 1
                    pool[nbr] = ng
                    parent[nbr] = node
            max_frontier = max(max_frontier, min(k, len(pool)))
            if record_step:
                snapshot(
                    node, ranked_pool(), runner_up=runner_up,
                    frontier_size_before=len(layer) - layer_index,
                    neighbors_scanned=len(store.adj[node]),
                    added=added, updated=updated,
                )
        if found:
            break
        if len(pool) > k:
            ever_pruned = True
        ranked = ranked_pool()
        layer = [n for n, _ in ranked]
        for n, gval in ranked:
            g_of[n] = gval
            visited.add(n)
        layer_number += 1
    t = _finish(
        "beam", store, mode, time_slot, found,
        _reconstruct(parent, goal) if found else [], expanded,
        max_frontier, t0, rec, False,
        termination_reason=(
            None if found else
            "beam_exhausted_after_pruning" if ever_pruned else "frontier_exhausted"
        ),
    )
    t.metrics.beam_width = k
    return t


ADVANCED_ALGORITHMS = {
    "greedy": greedy, "bidijkstra": bidijkstra, "idastar": idastar, "beam": beam,
}
