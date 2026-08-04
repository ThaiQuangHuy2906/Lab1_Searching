"""Multi-stop route optimization — asymmetric TSP (ATSP) on the road graph.

The cost matrix is ASYMMETRIC (one-way streets): c(a,b) != c(b,a) in
general, built with one hand-rolled Dijkstra per point (plain heapq —
PROMPT-MASTER rule 6), caching each leg's node path for the response.

Methods (PROMPT-MASTER 6.3):
- held_karp   bitmask DP O(n^2 * 2^n): exact ground truth, n <= 15
              points total (warn from 13).
- nn_2opt     nearest neighbour + asymmetric-safe 2-opt + Or-opt.
              2-opt REVERSES a segment, which changes every traversed
              edge's direction on an asymmetric matrix — so each
              candidate tour is re-costed exactly, never delta-shortcut.
- sa          simulated annealing (swap + insert moves, geometric
              cooling T0=0.2*init_cost, alpha=0.995, 2000 iters/seed),
              run over seeds 0..4; best tour returned, per-seed stats
              exposed for the benchmark.

`return_to_start` defaults to False: the shipper ends at the last drop
(assumption recorded in the report). Total points k = 1 + len(stops)
is capped at 16; held_karp additionally requires k <= 15.
"""

from __future__ import annotations

import heapq
import itertools
import math
import random
import statistics

from .graph_store import GraphStore
from .models import (
    Leg, LegMetrics, Mode, MultirouteResponse, SaOptimizerStats, TimeSlot,
    TspMethod,
)
from .optimization_trace import (
    HELD_KARP_TRACE_CAP, NN_LOCAL_TRACE_CAP, SA_TRACE_CAP,
    OptimizationTraceRecorder,
)

MAX_POINTS = 16
HELD_KARP_MAX = 15
HELD_KARP_WARN = 13
SA_SEEDS = range(5)
SA_ITERS = 2000
SA_ALPHA = 0.995
TOLERANCE = 1e-12


class UnreachableStopError(Exception):
    """Raised when some stop cannot be reached from another point."""


# ------------------------------------------------------------ cost matrix


def _dijkstra_to_targets(store: GraphStore, source: str, targets: set[str],
                         mode: Mode, slot: TimeSlot) -> dict[str, list[str]]:
    """Shortest paths source -> each target; returns node-path per target."""
    w = store.weights(mode, slot)
    dist = {source: 0.0}
    parent: dict[str, str] = {}
    heap: list[tuple[float, int, str]] = [(0.0, 0, source)]
    done: set[str] = set()
    remaining = set(targets) - {source}
    tie = 0
    while heap and remaining:
        d, _t, node = heapq.heappop(heap)
        if node in done:
            continue
        done.add(node)
        remaining.discard(node)
        for nbr, eid in store.adj[node]:
            if nbr in done:
                continue
            nd = d + w[eid]
            if nd < dist.get(nbr, float("inf")):
                dist[nbr] = nd
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (nd, tie, nbr))
    paths: dict[str, list[str]] = {}
    for t in targets:
        if t == source:
            continue
        if t not in done:
            raise UnreachableStopError(f"no route {source} -> {t}")
        path = [t]
        while path[-1] != source:
            path.append(parent[path[-1]])
        path.reverse()
        paths[t] = path
    return paths


def build_matrix(store: GraphStore, points: list[str], mode: Mode,
                 slot: TimeSlot) -> tuple[dict, dict]:
    """(cost[(a, b)], node_path[(a, b)]) for all ordered point pairs."""
    cost: dict[tuple[str, str], float] = {}
    path: dict[tuple[str, str], list[str]] = {}
    targets = set(points)
    for src in points:
        for dst, p in _dijkstra_to_targets(store, src, targets, mode, slot).items():
            c, _dist, _time = store.path_metrics(p, mode, slot)
            cost[(src, dst)] = c
            path[(src, dst)] = p
    return cost, path


def tour_cost(cost: dict, order: list[str], return_to_start: bool) -> float:
    total = sum(cost[(a, b)] for a, b in zip(order, order[1:]))
    if return_to_start:
        total += cost[(order[-1], order[0])]
    return total


# ------------------------------------------------------------- held-karp


def held_karp(
    cost: dict,
    points: list[str],
    return_to_start: bool,
    recorder: OptimizationTraceRecorder | None = None,
) -> tuple[list[str], float]:
    """Exact ATSP by bitmask DP. points[0] is the fixed start."""
    n = len(points)
    if n > HELD_KARP_MAX:
        raise ValueError(
            f"held_karp supports at most {HELD_KARP_MAX} points, got {n}")
    if n >= HELD_KARP_WARN:
        print(f"held_karp: n={n} — expect a few seconds of DP")
    c = [[0.0] * n for _ in range(n)]
    for i, a in enumerate(points):
        for j, b in enumerate(points):
            if i != j:
                c[i][j] = cost[(a, b)]

    full = (1 << n) - 1
    # dp[mask][i] = best cost from start visiting exactly `mask`, ending at i
    dp: list[dict[int, tuple[float, int]]] = [dict() for _ in range(1 << n)]
    dp[1][0] = (0.0, -1)
    for mask in range(1 << n):
        if not (mask & 1) or not dp[mask]:
            continue
        for i, (cost_i, _prev) in list(dp[mask].items()):
            for j in range(1, n):
                if mask & (1 << j):
                    continue
                nmask = mask | (1 << j)
                cand = cost_i + c[i][j]
                previous = dp[nmask].get(j)
                if previous is None or cand < previous[0]:
                    dp[nmask][j] = (cand, i)
                    if recorder is not None:
                        recorder.emit(
                            lambda ordinal, nmask=nmask, i=i, j=j, cand=cand, previous=previous: {
                                "kind": "held_karp_update",
                                "ordinal": ordinal,
                                "mask": nmask,
                                "subset": [
                                    points[index] for index in range(n)
                                    if nmask & (1 << index)
                                ],
                                "endpoint": points[j],
                                "predecessor": points[i],
                                "candidate_cost": cand,
                                "previous_cost": previous[0] if previous else None,
                                "new_cost": cand,
                            },
                        )

    def close(i: int) -> float:
        return c[i][0] if return_to_start else 0.0

    end, best = min(((i, dp[full][i][0] + close(i)) for i in dp[full] if i != 0),
                    key=lambda kv: kv[1])
    order_idx = [end]
    mask = full
    while order_idx[-1] != 0:
        _cost, prev = dp[mask][order_idx[-1]]
        mask ^= 1 << order_idx[-1]
        order_idx.append(prev)
    order_idx.reverse()
    order = [points[i] for i in order_idx]
    if recorder is not None:
        recorder.emit(
            lambda ordinal: {
                "kind": "held_karp_reconstruct",
                "ordinal": ordinal,
                "order": list(order),
                "total_cost": best,
            },
            final=True,
        )
        recorder.emit(
            lambda ordinal: {
                "kind": "optimization_summary",
                "ordinal": ordinal,
                "method": "held_karp",
                "final_order": list(order),
                "final_cost": best,
            },
            final=True,
        )
    return order, best


# ---------------------------------------------------------- nn + 2opt


def nearest_neighbour(
    cost: dict,
    points: list[str],
    recorder: OptimizationTraceRecorder | None = None,
) -> list[str]:
    order, left = [points[0]], set(points[1:])
    while left:
        current = order[-1]
        nxt = min(sorted(left), key=lambda p: cost[(current, p)])
        order.append(nxt)
        left.remove(nxt)
        if recorder is not None:
            recorder.emit(
                lambda ordinal, current=current, nxt=nxt: {
                    "kind": "nn_decision",
                    "ordinal": ordinal,
                    "current": current,
                    "candidates": [
                        {"node": node, "cost": candidate_cost}
                        for node, candidate_cost in sorted(
                            ((node, cost[(current, node)]) for node in [nxt, *left]),
                            key=lambda item: (item[1], item[0]),
                        )
                    ],
                    "selected": nxt,
                    "order": list(order),
                },
            )
    return order


def two_opt_or_opt(
    cost: dict,
    order: list[str],
    return_to_start: bool,
    recorder: OptimizationTraceRecorder | None = None,
) -> list[str]:
    """Local search: segment reversal (2-opt) + segment relocation
    (Or-opt, lengths 1-3, orientation preserved). ASYMMETRIC-safe:
    every candidate is fully re-costed (PROMPT-MASTER 6.3 warning)."""
    best = list(order)
    best_cost = tour_cost(cost, best, return_to_start)
    rejected_since_previous = 0
    improved = True
    while improved:
        improved = False
        n = len(best)
        # 2-opt: reverse best[i:j+1] (start at index 0 stays fixed)
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                cand = best[:i] + best[i:j + 1][::-1] + best[j + 1:]
                cc = tour_cost(cost, cand, return_to_start)
                if cc < best_cost - TOLERANCE:
                    before, before_cost = list(best), best_cost
                    best, best_cost, improved = cand, cc, True
                    if recorder is not None:
                        recorder.emit(
                            lambda ordinal, i=i, j=j, before=before, before_cost=before_cost, cc=cc,
                            rejected=rejected_since_previous: {
                                "kind": "local_improvement",
                                "ordinal": ordinal,
                                "move_type": "2_opt",
                                "i": i,
                                "j": j,
                                "segment_length": j - i + 1,
                                "before_order": before,
                                "before_cost": before_cost,
                                "after_order": list(cand),
                                "after_cost": cc,
                                "rejected_candidates_since_previous": rejected,
                            },
                        )
                    rejected_since_previous = 0
                else:
                    rejected_since_previous += 1
        # Or-opt: move a small segment elsewhere, keeping its direction
        for seg_len in (1, 2, 3):
            for i in range(1, n - seg_len + 1):
                seg = best[i:i + seg_len]
                rest = best[:i] + best[i + seg_len:]
                for j in range(1, len(rest) + 1):
                    if j == i:
                        continue
                    cand = rest[:j] + seg + rest[j:]
                    cc = tour_cost(cost, cand, return_to_start)
                    if cc < best_cost - TOLERANCE:
                        before, before_cost = list(best), best_cost
                        best, best_cost, improved = cand, cc, True
                        if recorder is not None:
                            recorder.emit(
                                lambda ordinal, i=i, j=j, seg_len=seg_len, before=before,
                                before_cost=before_cost, cc=cc, rejected=rejected_since_previous: {
                                    "kind": "local_improvement",
                                    "ordinal": ordinal,
                                    "move_type": "or_opt",
                                    "i": i,
                                    "j": j,
                                    "segment_length": seg_len,
                                    "before_order": before,
                                    "before_cost": before_cost,
                                    "after_order": list(cand),
                                    "after_cost": cc,
                                    "rejected_candidates_since_previous": rejected,
                                },
                            )
                        rejected_since_previous = 0
                    else:
                        rejected_since_previous += 1
    return best


def nn_2opt(
    cost: dict,
    points: list[str],
    return_to_start: bool,
    recorder: OptimizationTraceRecorder | None = None,
) -> tuple[list[str], float]:
    order = two_opt_or_opt(
        cost, nearest_neighbour(cost, points, recorder), return_to_start, recorder,
    )
    total = tour_cost(cost, order, return_to_start)
    if recorder is not None:
        recorder.emit(
            lambda ordinal: {
                "kind": "optimization_summary",
                "ordinal": ordinal,
                "method": "nn_2opt",
                "final_order": list(order),
                "final_cost": total,
            },
            final=True,
        )
    return order, total


# ------------------------------------------------------------------- SA


def simulated_annealing(
    cost: dict,
    points: list[str],
    return_to_start: bool,
    seeds=SA_SEEDS,
    recorder: OptimizationTraceRecorder | None = None,
) -> tuple[list[str], float, dict]:
    """SA over seeds; returns (best_order, best_cost, per-seed stats)."""
    per_seed: list[float] = []
    seed_details: list[dict] = []
    best_order: list[str] | None = None
    best_cost = float("inf")
    for seed in seeds:
        rng = random.Random(seed)
        cur = nearest_neighbour(cost, points)
        cur_cost = tour_cost(cost, cur, return_to_start)
        t = max(cur_cost * 0.2, 1e-9)
        loc_best, loc_best_cost = list(cur), cur_cost
        if recorder is not None:
            recorder.emit(
                lambda ordinal, seed=seed, t=t, cur=cur, cur_cost=cur_cost,
                loc_best=loc_best, loc_best_cost=loc_best_cost: {
                    "kind": "sa_seed_boundary",
                    "ordinal": ordinal,
                    "boundary": "start",
                    "seed": seed,
                    "iteration": 0,
                    "temperature": t,
                    "current_order": list(cur),
                    "current_cost": cur_cost,
                    "best_order": list(loc_best),
                    "best_cost": loc_best_cost,
                },
                priority="boundary",
            )
        iterations = 0
        for iteration in range(1, SA_ITERS + 1):
            n = len(cur)
            if n > 2 and rng.random() < 0.5:  # swap two stops
                i, j = rng.sample(range(1, n), 2)
                cand = list(cur)
                cand[i], cand[j] = cand[j], cand[i]
            elif n > 2:  # remove one stop and reinsert elsewhere
                i = rng.randrange(1, n)
                j = rng.randrange(1, n)
                cand = list(cur)
                node = cand.pop(i)
                cand.insert(j, node)
            else:
                break
            cand_cost = tour_cost(cost, cand, return_to_start)
            delta = cand_cost - cur_cost
            current_order, current_cost = list(cur), cur_cost
            accepted = delta <= 0 or rng.random() < math.exp(-delta / t)
            new_best = False
            if accepted:
                cur, cur_cost = cand, cand_cost
                if cur_cost < loc_best_cost:
                    loc_best, loc_best_cost = list(cur), cur_cost
                    new_best = True
            if recorder is not None and (new_best or iteration % 20 == 0):
                reason = "new_best" if new_best else "periodic"
                recorder.emit(
                    lambda ordinal, reason=reason, seed=seed, iteration=iteration, t=t,
                    current_order=current_order, current_cost=current_cost, cand=cand,
                    cand_cost=cand_cost, delta=delta, accepted=accepted, cur=cur,
                    cur_cost=cur_cost, loc_best=loc_best, loc_best_cost=loc_best_cost: {
                        "kind": "sa_iteration",
                        "ordinal": ordinal,
                        "sample_reason": reason,
                        "seed": seed,
                        "iteration": iteration,
                        "temperature": t,
                        "current_order": current_order,
                        "current_cost": current_cost,
                        "candidate_order": list(cand),
                        "candidate_cost": cand_cost,
                        "delta": delta,
                        "accepted": accepted,
                        "resulting_order": list(cur),
                        "resulting_cost": cur_cost,
                        "best_order": list(loc_best),
                        "best_cost": loc_best_cost,
                    },
                    priority=reason,
                )
            t *= SA_ALPHA
            iterations = iteration
        per_seed.append(loc_best_cost)
        seed_details.append({
            "seed": seed,
            "iterations": iterations,
            "final_cost": cur_cost,
            "best_cost": loc_best_cost,
            "best_order": list(loc_best),
        })
        if recorder is not None:
            recorder.emit(
                lambda ordinal, seed=seed, iterations=iterations, t=t, cur=cur,
                cur_cost=cur_cost, loc_best=loc_best, loc_best_cost=loc_best_cost: {
                    "kind": "sa_seed_boundary",
                    "ordinal": ordinal,
                    "boundary": "end",
                    "seed": seed,
                    "iteration": iterations,
                    "temperature": t,
                    "current_order": list(cur),
                    "current_cost": cur_cost,
                    "best_order": list(loc_best),
                    "best_cost": loc_best_cost,
                },
                priority="boundary",
            )
        if loc_best_cost < best_cost:
            best_order, best_cost = loc_best, loc_best_cost
    best_seed = seed_details[min(range(len(per_seed)), key=lambda index: per_seed[index])]["seed"]
    optimizer_stats = {
        "seeds": seed_details,
        "best_seed": best_seed,
        "best_cost": min(per_seed),
        "mean_best_cost": statistics.mean(per_seed),
        "stddev_best_cost": statistics.stdev(per_seed) if len(per_seed) > 1 else 0.0,
    }
    stats = {
        "seeds": list(seeds), "costs": per_seed,
        "best": min(per_seed), "mean": statistics.mean(per_seed),
        "std": statistics.stdev(per_seed) if len(per_seed) > 1 else 0.0,
        "optimizer_stats": optimizer_stats,
    }
    if recorder is not None:
        recorder.emit(
            lambda ordinal: {
                "kind": "sa_final_best",
                "ordinal": ordinal,
                "final_order": list(best_order),
                "final_cost": best_cost,
                "optimizer_stats": optimizer_stats,
            },
            final=True,
        )
        recorder.emit(
            lambda ordinal: {
                "kind": "optimization_summary",
                "ordinal": ordinal,
                "method": "sa",
                "final_order": list(best_order),
                "final_cost": best_cost,
            },
            final=True,
        )
    return best_order, best_cost, stats


# ------------------------------------------------------------- facade


def solve_multiroute(store: GraphStore, start: str, stops: list[str],
                     method: TspMethod, mode: Mode = "balanced",
                     time_slot: TimeSlot = "07:30",
                     return_to_start: bool = False,
                     include_trace: bool = False) -> MultirouteResponse:
    """Full multiroute answer per SCHEMA §C.5 (raises KeyError on unknown
    nodes and ValueError on size-limit violations -> API maps to 404/422)."""
    for node in [start, *stops]:
        if not store.has_node(node):
            raise KeyError(f"node '{node}' not in graph '{store.level}'")
    points = [start, *stops]
    if len(set(points)) != len(points):
        raise ValueError("start/stops must be distinct")
    if len(points) > MAX_POINTS:
        raise ValueError(f"at most {MAX_POINTS} points total, got {len(points)}")

    base = dict(method=method, mode=mode, time_slot=time_slot, graph=store.level,
                optimal_guarantee=method == "held_karp")
    try:
        cost, path = build_matrix(store, points, mode, time_slot)
    except UnreachableStopError:
        return MultirouteResponse(**base, found=False, order=[], legs=[],
                                  totals=None, original_order_totals=None,
                                  savings_pct=None)

    recorder = OptimizationTraceRecorder(
        method, enabled=include_trace, point_count=len(points),
    )
    optimizer_stats: SaOptimizerStats | None = None
    if method == "held_karp":
        order, _ = held_karp(cost, points, return_to_start, recorder)
    elif method == "nn_2opt":
        order, _ = nn_2opt(cost, points, return_to_start, recorder)
    else:
        order, _, raw_stats = simulated_annealing(
            cost, points, return_to_start, recorder=recorder,
        )
        optimizer_stats = SaOptimizerStats.model_validate(raw_stats["optimizer_stats"])

    def totals_of(seq: list[str]) -> LegMetrics:
        pairs = list(zip(seq, seq[1:]))
        if return_to_start:
            pairs.append((seq[-1], seq[0]))
        c = d = t = 0.0
        for a, b in pairs:
            lc, ld, lt = store.path_metrics(path[(a, b)], mode, time_slot)
            c, d, t = c + lc, d + ld, t + lt
        return LegMetrics(total_cost=c, total_distance_m=d, total_time_s=t)

    legs = []
    pairs = list(zip(order, order[1:]))
    if return_to_start:
        pairs.append((order[-1], order[0]))
    for a, b in pairs:
        lc, ld, lt = store.path_metrics(path[(a, b)], mode, time_slot)
        legs.append(Leg(from_node=a, to_node=b, path=path[(a, b)],
                        metrics=LegMetrics(total_cost=lc, total_distance_m=ld,
                                           total_time_s=lt)))

    totals = totals_of(order)
    original = totals_of(points)
    savings = round((original.total_cost - totals.total_cost)
                    / original.total_cost * 100, 1) if original.total_cost else 0.0
    return MultirouteResponse(**base, found=True, order=order, legs=legs,
                              totals=totals, original_order_totals=original,
                              savings_pct=savings,
                              optimization_trace=recorder.build(),
                              optimizer_stats=optimizer_stats)
