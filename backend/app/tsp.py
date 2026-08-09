"""Multi-stop route optimization — asymmetric TSP (ATSP) on the road graph.

The cost matrix is ASYMMETRIC (one-way streets): c(a,b) != c(b,a) in
general, built with one hand-rolled UCS run per point (plain heapq —
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
import time

from .graph_store import GraphStore
from .models import (
    AtspComputationMetrics, AtspMatrixEvidence, HeldKarpMethodStats, Leg,
    LegMetrics, Mode, MultirouteFailure, MultirouteResponse,
    NnLocalSearchMethodStats, PathCostBreakdown, SaOptimizerStats,
    SimulatedAnnealingMethodStats, TimeSlot, TspMethod, comparison_equivalent,
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

    def __init__(
        self, from_node: str, to_node: str, *,
        reachable_paths: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(f"no route {from_node} -> {to_node}")
        self.from_node = from_node
        self.to_node = to_node
        self.reachable_paths = reachable_paths or {}
        self.partial_cost: dict[tuple[str, str], float] = {}
        self.partial_path: dict[tuple[str, str], list[str]] = {}


# ------------------------------------------------------------ cost matrix


def _ucs_to_targets(store: GraphStore, source: str, targets: set[str],
                    mode: Mode, slot: TimeSlot,
                    instrumentation: dict | None = None) -> dict[str, list[str]]:
    """Shortest paths source -> each target; returns node-path per target."""
    w = store.weights(mode, slot)
    dist = {source: 0.0}
    parent: dict[str, str] = {}
    heap: list[tuple[float, int, str]] = [(0.0, 0, source)]
    done: set[str] = set()
    remaining = set(targets) - {source}
    tie = 0
    if instrumentation is not None:
        instrumentation["matrix_search_runs"] += 1
    while heap and remaining:
        d, _t, node = heapq.heappop(heap)
        if node in done:
            continue
        done.add(node)
        if instrumentation is not None:
            instrumentation["matrix_nodes_expanded"] += 1
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
    for t in sorted(targets):
        if t == source:
            continue
        if t not in done:
            continue
        path = [t]
        while path[-1] != source:
            path.append(parent[path[-1]])
        path.reverse()
        paths[t] = path
    if remaining:
        raise UnreachableStopError(
            source, min(remaining), reachable_paths=paths,
        )
    return paths


def build_matrix(store: GraphStore, points: list[str], mode: Mode,
                 slot: TimeSlot,
                 instrumentation: dict | None = None) -> tuple[dict, dict]:
    """(cost[(a, b)], node_path[(a, b)]) for all ordered point pairs."""
    cost: dict[tuple[str, str], float] = {}
    path: dict[tuple[str, str], list[str]] = {}
    targets = set(points)
    for src in points:
        try:
            paths = _ucs_to_targets(
                store, src, targets, mode, slot, instrumentation,
            )
        except UnreachableStopError as exc:
            paths = exc.reachable_paths
            for dst, p in paths.items():
                c, _dist, _time = store.path_metrics(p, mode, slot)
                cost[(src, dst)] = c
                path[(src, dst)] = p
            exc.partial_cost = cost
            exc.partial_path = path
            raise
        for dst, p in paths.items():
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
    stats_out: dict | None = None,
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
    dp_states_solved = 1
    transitions_evaluated = 0
    for mask in range(1 << n):
        if not (mask & 1) or not dp[mask]:
            continue
        for i, (cost_i, _prev) in list(dp[mask].items()):
            for j in range(1, n):
                if mask & (1 << j):
                    continue
                transitions_evaluated += 1
                nmask = mask | (1 << j)
                cand = cost_i + c[i][j]
                previous = dp[nmask].get(j)
                if previous is None or cand < previous[0]:
                    dp[nmask][j] = (cand, i)
                    if previous is None:
                        dp_states_solved += 1
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
    if stats_out is not None:
        stats_out.update({
            "kind": "held_karp",
            "dp_states_solved": dp_states_solved,
            "transitions_evaluated": transitions_evaluated,
        })
    return order, best


# ---------------------------------------------------------- nn + 2opt


def nearest_neighbour(
    cost: dict,
    points: list[str],
    recorder: OptimizationTraceRecorder | None = None,
    stats_out: dict | None = None,
) -> list[str]:
    order, left = [points[0]], set(points[1:])
    while left:
        current = order[-1]
        if stats_out is not None:
            stats_out["nn_candidates_evaluated"] = (
                stats_out.get("nn_candidates_evaluated", 0) + len(left)
            )
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
    stats_out: dict | None = None,
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
                if stats_out is not None:
                    stats_out["two_opt_candidates_evaluated"] = (
                        stats_out.get("two_opt_candidates_evaluated", 0) + 1
                    )
                if cc < best_cost - TOLERANCE:
                    before, before_cost = list(best), best_cost
                    best, best_cost, improved = cand, cc, True
                    if stats_out is not None:
                        stats_out["accepted_2opt_moves"] = (
                            stats_out.get("accepted_2opt_moves", 0) + 1
                        )
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
                    if stats_out is not None:
                        stats_out["or_opt_candidates_evaluated"] = (
                            stats_out.get("or_opt_candidates_evaluated", 0) + 1
                        )
                    if cc < best_cost - TOLERANCE:
                        before, before_cost = list(best), best_cost
                        best, best_cost, improved = cand, cc, True
                        if stats_out is not None:
                            stats_out["accepted_oropt_moves"] = (
                                stats_out.get("accepted_oropt_moves", 0) + 1
                            )
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
    stats_out: dict | None = None,
) -> tuple[list[str], float]:
    counters: dict = {}
    initial_order = nearest_neighbour(cost, points, recorder, counters)
    initial_cost = tour_cost(cost, initial_order, return_to_start)
    order = two_opt_or_opt(
        cost, initial_order, return_to_start, recorder, counters,
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
    if stats_out is not None:
        stats_out.update({
            "kind": "nn_local_search",
            "nn_initial_cost": initial_cost,
            "nn_candidates_evaluated": counters.get("nn_candidates_evaluated", 0),
            "two_opt_candidates_evaluated": counters.get(
                "two_opt_candidates_evaluated", 0,
            ),
            "or_opt_candidates_evaluated": counters.get(
                "or_opt_candidates_evaluated", 0,
            ),
            "accepted_2opt_moves": counters.get("accepted_2opt_moves", 0),
            "accepted_oropt_moves": counters.get("accepted_oropt_moves", 0),
            "final_cost": total,
            "improvement_after_nn": initial_cost - total,
        })
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
        attempted_moves = 0
        accepted_improving_moves = 0
        accepted_equal_moves = 0
        accepted_worse_moves = 0
        rejected_moves = 0
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
            attempted_moves += 1
            if accepted:
                if delta < 0:
                    accepted_improving_moves += 1
                elif delta == 0:
                    accepted_equal_moves += 1
                else:
                    accepted_worse_moves += 1
            else:
                rejected_moves += 1
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
            "attempted_moves": attempted_moves,
            "accepted_improving_moves": accepted_improving_moves,
            "accepted_equal_moves": accepted_equal_moves,
            "accepted_worse_moves": accepted_worse_moves,
            "rejected_moves": rejected_moves,
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
        "seeds": [{
            key: seed[key] for key in (
                "seed", "iterations", "final_cost", "best_cost", "best_order",
            )
        } for seed in seed_details],
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
        "method_stats": {
            "kind": "simulated_annealing",
            "seed_count": len(seed_details),
            "best_seed": best_seed,
            "best_cost": min(per_seed),
            "mean_best_cost": statistics.mean(per_seed),
            "stddev_best_cost": (
                statistics.stdev(per_seed) if len(per_seed) > 1 else 0.0
            ),
            "attempted_moves": sum(seed["attempted_moves"] for seed in seed_details),
            "accepted_improving_moves": sum(
                seed["accepted_improving_moves"] for seed in seed_details
            ),
            "accepted_equal_moves": sum(
                seed["accepted_equal_moves"] for seed in seed_details
            ),
            "accepted_worse_moves": sum(
                seed["accepted_worse_moves"] for seed in seed_details
            ),
            "rejected_moves": sum(seed["rejected_moves"] for seed in seed_details),
            "seeds": seed_details,
        },
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


def _matrix_evidence(points: list[str], cost: dict) -> AtspMatrixEvidence:
    asymmetric: list[tuple[float, str, str, float, float]] = []
    for left, right in itertools.combinations(sorted(points), 2):
        forward = cost.get((left, right))
        reverse = cost.get((right, left))
        if forward is None or reverse is None or comparison_equivalent(forward, reverse):
            continue
        asymmetric.append((abs(forward - reverse), left, right, forward, reverse))
    asymmetric.sort(key=lambda item: (-item[0], item[1], item[2]))
    example = None
    if asymmetric:
        delta, left, right, forward, reverse = asymmetric[0]
        example = {
            "from_node": left,
            "to_node": right,
            "forward_cost": forward,
            "reverse_cost": reverse,
            "absolute_delta": delta,
        }
    return AtspMatrixEvidence(
        point_count=len(points),
        directed_pair_count=len(points) * (len(points) - 1),
        reachable_directed_pair_count=len(cost),
        asymmetric_unordered_pair_count=len(asymmetric),
        asymmetry_example=example,
    )


def _aggregate_breakdown(legs: list[Leg]) -> PathCostBreakdown:
    return PathCostBreakdown(**{
        field_name: sum(
            getattr(leg.cost_breakdown, field_name)
            for leg in legs if leg.cost_breakdown is not None
        )
        for field_name in PathCostBreakdown.model_fields
    })


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
    if len(points) < 2:
        raise ValueError("at least one stop is required")
    if len(set(points)) != len(points):
        raise ValueError("start/stops must be distinct")
    if len(points) > MAX_POINTS:
        raise ValueError(f"at most {MAX_POINTS} points total, got {len(points)}")

    facade_started = time.perf_counter()
    base = dict(
        contract_version=2,
        method=method,
        mode=mode,
        time_slot=time_slot,
        graph=store.level,
        optimal_guarantee=method == "held_karp",
        return_to_start=return_to_start,
        original_order=points,
    )
    instrumentation = {"matrix_search_runs": 0, "matrix_nodes_expanded": 0}
    matrix_started = time.perf_counter()
    try:
        cost, path = build_matrix(
            store, points, mode, time_slot, instrumentation,
        )
    except UnreachableStopError as exc:
        matrix_raw_ms = (time.perf_counter() - matrix_started) * 1000
        matrix_evidence = _matrix_evidence(points, exc.partial_cost)
        failure = MultirouteFailure(
            kind="matrix_incomplete",
            from_node=exc.from_node,
            to_node=exc.to_node,
        )
        total_raw_ms = (time.perf_counter() - facade_started) * 1000
        computation = AtspComputationMetrics(
            matrix_search_runs=instrumentation["matrix_search_runs"],
            matrix_nodes_expanded=instrumentation["matrix_nodes_expanded"],
            matrix_runtime_ms=round(matrix_raw_ms, 3),
            optimizer_runtime_ms=0.0,
            total_runtime_ms=round(total_raw_ms, 3),
        )
        return MultirouteResponse(
            **base,
            found=False,
            order=[],
            legs=[],
            totals=None,
            totals_breakdown=None,
            original_order_legs=[],
            original_order_totals=None,
            original_order_breakdown=None,
            savings_pct=None,
            matrix_evidence=matrix_evidence,
            computation_metrics=computation,
            failure=failure,
            method_stats=None,
            optimization_trace=None,
            optimizer_stats=None,
        )
    matrix_raw_ms = (time.perf_counter() - matrix_started) * 1000

    recorder = OptimizationTraceRecorder(
        method, enabled=include_trace, point_count=len(points),
    )
    optimizer_started = time.perf_counter()
    optimizer_stats: SaOptimizerStats | None = None
    raw_method_stats: dict = {}
    raw_stats: dict | None = None
    if method == "held_karp":
        order, _ = held_karp(
            cost, points, return_to_start, recorder, raw_method_stats,
        )
    elif method == "nn_2opt":
        order, _ = nn_2opt(
            cost, points, return_to_start, recorder, raw_method_stats,
        )
    else:
        order, _, raw_stats = simulated_annealing(
            cost, points, return_to_start, recorder=recorder,
        )
    optimizer_raw_ms = (time.perf_counter() - optimizer_started) * 1000

    if method == "held_karp":
        method_stats = HeldKarpMethodStats.model_validate(raw_method_stats)
    elif method == "nn_2opt":
        method_stats = NnLocalSearchMethodStats.model_validate(raw_method_stats)
    else:
        assert raw_stats is not None
        method_stats = SimulatedAnnealingMethodStats.model_validate(
            raw_stats["method_stats"],
        )
        optimizer_stats = SaOptimizerStats.model_validate({
            "seeds": [{
                "seed": seed.seed,
                "iterations": seed.iterations,
                "final_cost": seed.final_cost,
                "best_cost": seed.best_cost,
                "best_order": seed.best_order,
            } for seed in method_stats.seeds],
            "best_seed": method_stats.best_seed,
            "best_cost": method_stats.best_cost,
            "mean_best_cost": method_stats.mean_best_cost,
            "stddev_best_cost": method_stats.stddev_best_cost,
        })

    def legs_of(seq: list[str]) -> list[Leg]:
        pairs = list(zip(seq, seq[1:]))
        if return_to_start:
            pairs.append((seq[-1], seq[0]))
        result: list[Leg] = []
        for a, b in pairs:
            lc, ld, lt = store.path_metrics(path[(a, b)], mode, time_slot)
            result.append(Leg(
                from_node=a,
                to_node=b,
                path=path[(a, b)],
                metrics=LegMetrics(
                    total_cost=lc,
                    total_distance_m=ld,
                    total_time_s=lt,
                ),
                cost_breakdown=store.path_cost_breakdown(path[(a, b)], time_slot),
            ))
        return result

    def totals_of(legs: list[Leg]) -> LegMetrics:
        return LegMetrics(
            total_cost=sum(leg.metrics.total_cost for leg in legs),
            total_distance_m=sum(leg.metrics.total_distance_m for leg in legs),
            total_time_s=sum(leg.metrics.total_time_s for leg in legs),
        )

    legs = legs_of(order)
    original_legs = legs_of(points)
    totals = totals_of(legs)
    original = totals_of(original_legs)
    totals_breakdown = _aggregate_breakdown(legs)
    original_breakdown = _aggregate_breakdown(original_legs)
    if comparison_equivalent(original.total_cost, 0.0):
        if not comparison_equivalent(totals.total_cost, 0.0):
            raise ValueError("optimized cost is nonzero while original cost is zero")
        savings = 0.0
    else:
        savings = round(
            (original.total_cost - totals.total_cost)
            / original.total_cost * 100,
            1,
        )
    matrix_evidence = _matrix_evidence(points, cost)
    optimization_trace = recorder.build()
    total_raw_ms = (time.perf_counter() - facade_started) * 1000
    computation = AtspComputationMetrics(
        matrix_search_runs=instrumentation["matrix_search_runs"],
        matrix_nodes_expanded=instrumentation["matrix_nodes_expanded"],
        matrix_runtime_ms=round(matrix_raw_ms, 3),
        optimizer_runtime_ms=round(optimizer_raw_ms, 3),
        total_runtime_ms=round(total_raw_ms, 3),
    )
    return MultirouteResponse(
        **base,
        found=True,
        order=order,
        legs=legs,
        totals=totals,
        totals_breakdown=totals_breakdown,
        original_order_legs=original_legs,
        original_order_totals=original,
        original_order_breakdown=original_breakdown,
        savings_pct=savings,
        matrix_evidence=matrix_evidence,
        computation_metrics=computation,
        failure=None,
        method_stats=method_stats,
        optimization_trace=optimization_trace,
        optimizer_stats=optimizer_stats,
    )
