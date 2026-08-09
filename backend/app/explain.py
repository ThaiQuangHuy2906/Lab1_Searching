"""Vietnamese route explanations (assignment requirement 4.8, spec 6.4).

Builds `explanation` for a finished Trace: a natural-language summary
with REAL numbers, the congested segments on the route, and up to two
post-run reference routes described without pretending that the main
algorithm considered and rejected those complete routes.

Template-with-logic, not canned strings: sentences appear only when
their condition holds (congestion present, alternative shorter by
distance, algorithm optimal or not, ...). All numbers use Vietnamese
decimal commas.
"""

from __future__ import annotations

import heapq
import math

from .graph_store import GraphStore
from .models import (
    Alternative, COMPARISON_ABS_TOLERANCE, COMPARISON_REL_TOLERANCE,
    CongestedSegment, Explanation, ExplanationEvidence, ExplanationFactor,
    ExplanationObjective, LegMetrics, Mode, PathCostBreakdown, ReferenceRoute,
    SELECTION_RULE_BY_ALGORITHM, TimeSlot, Trace, comparison_equivalent,
)

ALGO_VI = {
    "bfs": "BFS (tìm theo bề rộng)", "dfs": "DFS (tìm theo chiều sâu)",
    "iddfs": "IDDFS (đào sâu dần)", "ucs": "UCS (chi phí đồng nhất)",
    "astar": "A*", "greedy": "Greedy Best-First",
    "bidijkstra": "Dijkstra hai chiều", "idastar": "IDA*", "beam": "Beam Search",
}
MODE_VI = {
    "balanced": "tổng chi phí cân bằng (thời gian + phạt rủi ro) thấp nhất",
    "time": "thời gian ước tính theo hồ sơ ùn tắc thấp nhất",
    "distance": "quãng đường ngắn nhất",
}
#: what a NON-optimal algorithm actually optimizes — the opening sentence
#: must state the real criterion, not pretend the route is cost-minimal.
ALGO_CRITERION_VI = {
    "bfs": "đi qua ít đoạn đường nhất, không xét trọng số",
    "dfs": "là tuyến đầu tiên tìm thấy khi ưu tiên chiều sâu, không xét trọng số",
    "iddfs": "nông nhất theo số đoạn nhờ đào sâu dần, không xét trọng số",
    "greedy": "luôn tiến về phía đích theo ước lượng heuristic, bỏ qua chi phí đã đi",
    "beam": "tốt nhất trong chùm k tuyến được giữ lại ở mỗi lớp",
}
CONGESTION_THRESHOLD = 4
MAX_NAMED_STOPS = 6


def vi_num(x: float, nd: int = 1) -> str:
    """Vietnamese decimal comma; trims a trailing ',0'."""
    s = f"{x:.{nd}f}".replace(".", ",")
    return s[:-2] if s.endswith(",0") else s


def _cost_unit(mode: Mode) -> str:
    """Unit of total_cost and epsilon for the selected optimization mode."""
    return "m" if mode == "distance" else "s"


def _fmt_route_totals(cost: float, time_s: float, dist_m: float, mode: Mode) -> str:
    distance = f"{vi_num(dist_m / 1000, 2)} km"
    if mode == "distance":
        return f"{distance}; chi phí cân bằng {time_s:.0f} s quy đổi"
    if mode == "time":
        objective = f"thời gian ước tính theo hồ sơ ùn tắc {cost:.0f} s"
        if abs(cost - time_s) > 0.5:
            return f"{objective}; chi phí cân bằng {time_s:.0f} s quy đổi; {distance}"
        return f"{objective}; {distance}"
    return f"chi phí cân bằng {cost:.0f} s quy đổi; {distance}"


def _objective_label(mode: Mode) -> str:
    return {
        "distance": "quãng đường",
        "time": "thời gian ước tính theo hồ sơ ùn tắc",
        "balanced": "chi phí cân bằng",
    }[mode]


def _fmt_distance_delta(delta_m: float) -> str:
    amount = abs(delta_m)
    if amount < 1:
        return "dưới một mét"
    if amount < 1000:
        return f"{vi_num(amount, 1)} m"
    return f"{vi_num(amount / 1000, 2)} km"


def _fmt_objective_delta(delta: float, mode: Mode) -> str:
    if mode == "distance":
        return _fmt_distance_delta(delta)
    return f"{vi_num(abs(delta), 1)} s"


def _relation(left: float, right: float) -> int:
    """Compare raw costs with the UI v2 contract tolerance (SCHEMA §F.1)."""
    if math.isclose(
        left,
        right,
        rel_tol=COMPARISON_REL_TOLERANCE,
        abs_tol=COMPARISON_ABS_TOLERANCE,
    ):
        return 0
    return -1 if left < right else 1


def _path_label(store: GraphStore, path: list[str]) -> str:
    names = [store.nodes[n].name for n in path]
    if all(names):
        if len(names) <= MAX_NAMED_STOPS:
            return " → ".join(names)
        return f"{names[0]} → … → {names[-1]} (qua {len(names) - 2} điểm trung gian)"
    return f"nút {path[0]} → nút {path[-1]} ({len(path) - 2} nút trung gian)"


def _edge_label(store: GraphStore, edge_id: str) -> str:
    """Street name; else 'A → B' from node names; else the raw edge id."""
    e = store.edges[edge_id]
    if e.name:
        return e.name
    nu, nv = store.nodes[e.u].name, store.nodes[e.v].name
    return f"đoạn {nu} → {nv}" if nu and nv else f"đoạn {edge_id}"


def _street_names(store: GraphStore, path: list[str], only_edges: set[str] | None = None,
                  limit: int = 3) -> list[str]:
    seen: list[str] = []
    for a, b in zip(path, path[1:]):
        e = store.edge_by_uv[(a, b)]
        if only_edges is not None and e.id not in only_edges:
            continue
        label = _edge_label(store, e.id)
        if label not in seen:
            seen.append(label)
        if len(seen) >= limit:
            break
    return seen


def _congested_on_path(store: GraphStore, path: list[str], slot: TimeSlot
                       ) -> list[CongestedSegment]:
    out = []
    for a, b in zip(path, path[1:]):
        e = store.edge_by_uv[(a, b)]
        level = store.congestion(e.id, slot)
        if level >= CONGESTION_THRESHOLD:
            out.append(CongestedSegment(edge=e.id, name=e.name, level=level))
    return out


def _risk_counts(store: GraphStore, path: list[str]) -> dict[str, int]:
    c = {"flood": 0, "construction": 0, "traffic_light": 0, "narrow_alley": 0}
    for a, b in zip(path, path[1:]):
        r = store.edge_by_uv[(a, b)].risk
        for k in c:
            c[k] += getattr(r, k)
    return c


def _path_edge_ids(store: GraphStore, path: list[str]) -> list[str]:
    return [store.edge_by_uv[(a, b)].id for a, b in zip(path, path[1:])]


def _signed_pct(delta: float, denominator: float) -> float | None:
    if comparison_equivalent(denominator, 0.0):
        return 0.0 if comparison_equivalent(delta, 0.0) else None
    return delta / denominator * 100.0


def _reference_route(
    store: GraphStore,
    *,
    reference_id: str,
    kind: str,
    generated_for_mode: Mode,
    excluded_edge: str | None,
    path: list[str],
    selected_path: list[str],
    active_mode: Mode,
    slot: TimeSlot,
) -> ReferenceRoute:
    cost, distance_m, balanced_s = store.path_metrics(path, active_mode, slot)
    selected_cost, selected_distance_m, selected_balanced_s = store.path_metrics(
        selected_path, active_mode, slot,
    )
    delta = cost - selected_cost
    relation = (
        "equivalent" if comparison_equivalent(cost, selected_cost) else
        "better" if delta < 0 else "worse"
    )
    return ReferenceRoute(
        id=reference_id,
        kind=kind,
        provenance="posthoc_ucs",
        generated_for_mode=generated_for_mode,
        excluded_edge=excluded_edge,
        path=path,
        metrics=LegMetrics(
            total_cost=cost,
            total_distance_m=distance_m,
            total_time_s=balanced_s,
        ),
        cost_breakdown=store.path_cost_breakdown(path, slot),
        reference_minus_selected_cost=delta,
        reference_minus_selected_pct=_signed_pct(delta, selected_cost),
        reference_minus_selected_distance_m=distance_m - selected_distance_m,
        reference_minus_selected_balanced_cost_s=balanced_s - selected_balanced_s,
        relation_to_selected=relation,
    )


def _route_factors(
    store: GraphStore,
    trace: Trace,
    breakdown: PathCostBreakdown | None,
    gap: float | None,
) -> list[ExplanationFactor]:
    if not trace.found or breakdown is None:
        if trace.termination is not None and trace.termination.reachability == "inconclusive":
            return [ExplanationFactor(
                id=f"algorithm-limit:{trace.termination.reason}",
                kind="algorithm_limit",
                affects_objective=False,
                source="trace",
                edge_ids=[],
                node_ids=[],
                contribution_raw=None,
                contribution_unit=None,
                timeline_step=None,
            )]
        return []

    unit = "m" if trace.mode == "distance" else "s"
    edge_ids = _path_edge_ids(store, trace.path)
    factors = [ExplanationFactor(
        id=f"objective:{trace.mode}",
        kind="objective_truth",
        affects_objective=True,
        source="cost_breakdown",
        edge_ids=edge_ids,
        node_ids=list(dict.fromkeys(trace.path)),
        contribution_raw=breakdown.objective_value(trace.mode),
        contribution_unit=unit,
        timeline_step=None,
    )]
    if gap is not None:
        factors.append(ExplanationFactor(
            id="optimality-gap:same-objective-ucs",
            kind="optimality_gap",
            affects_objective=True,
            source="reference_comparison",
            edge_ids=[],
            node_ids=[],
            contribution_raw=gap,
            contribution_unit=unit,
            timeline_step=None,
        ))

    congestion_edges = [
        edge_id for edge_id in edge_ids if store.congestion(edge_id, trace.time_slot) > 1
    ]
    if congestion_edges:
        affects = trace.mode != "distance"
        factors.append(ExplanationFactor(
            id="cost:congestion-delay",
            kind="congestion",
            affects_objective=affects,
            source="cost_breakdown",
            edge_ids=congestion_edges,
            node_ids=[],
            contribution_raw=breakdown.congestion_delay_s if affects else None,
            contribution_unit="s" if affects else None,
            timeline_step=None,
        ))

    risk_fields = {
        "flood": ("penalty_flood_s", "flood"),
        "construction": ("penalty_construction_s", "construction"),
        "narrow_alley": ("penalty_narrow_alley_s", "narrow_alley"),
        "traffic_light": ("penalty_traffic_light_s", "traffic_light"),
    }
    for risk_name, (breakdown_field, factor_kind) in risk_fields.items():
        risk_edges = [
            edge_id for edge_id in edge_ids
            if getattr(store.edges[edge_id].risk, risk_name) > 0
        ]
        if not risk_edges:
            continue
        affects = trace.mode == "balanced"
        factors.append(ExplanationFactor(
            id=f"cost:risk:{risk_name}",
            kind=factor_kind,
            affects_objective=affects,
            source="cost_breakdown",
            edge_ids=risk_edges,
            node_ids=[],
            contribution_raw=getattr(breakdown, breakdown_field) if affects else None,
            contribution_unit="s" if affects else None,
            timeline_step=None,
        ))

    if trace.found and not trace.metrics.optimal_guarantee:
        factors.append(ExplanationFactor(
            id=f"algorithm-limit:{trace.algorithm}",
            kind="algorithm_limit",
            affects_objective=False,
            source="trace",
            edge_ids=[],
            node_ids=[],
            contribution_raw=None,
            contribution_unit=None,
            timeline_step=None,
        ))
    return factors


def _evidence(
    store: GraphStore,
    trace: Trace,
    *,
    exact_path: list[str] | None = None,
    reference_routes: list[ReferenceRoute] | None = None,
) -> ExplanationEvidence:
    if not trace.found:
        objective = ExplanationObjective(
            mode=trace.mode,
            selected_value=None,
            exact_reference_value=None,
            optimality_gap=None,
            optimality_gap_pct=None,
        )
        return ExplanationEvidence(
            selection_rule=SELECTION_RULE_BY_ALGORITHM[trace.algorithm],
            objective=objective,
            cost_breakdown=None,
            factors=_route_factors(store, trace, None, None),
            reference_routes=[],
        )

    assert trace.metrics.total_cost is not None
    breakdown = store.path_cost_breakdown(trace.path, trace.time_slot)
    exact_value = None
    gap = None
    gap_pct = None
    if exact_path is not None:
        exact_value = store.path_metrics(
            exact_path, trace.mode, trace.time_slot,
        )[0]
        raw_gap = trace.metrics.total_cost - exact_value
        if raw_gap < 0 and not comparison_equivalent(trace.metrics.total_cost, exact_value):
            raise ValueError(
                "guaranteed/reference integrity failure: selected route beats exact UCS"
            )
        gap = 0.0 if comparison_equivalent(trace.metrics.total_cost, exact_value) else raw_gap
        if comparison_equivalent(exact_value, 0.0):
            gap_pct = 0.0 if comparison_equivalent(trace.metrics.total_cost, 0.0) else None
        else:
            gap_pct = gap / exact_value * 100.0
    objective = ExplanationObjective(
        mode=trace.mode,
        selected_value=trace.metrics.total_cost,
        exact_reference_value=exact_value,
        optimality_gap=gap,
        optimality_gap_pct=gap_pct,
    )
    return ExplanationEvidence(
        selection_rule=SELECTION_RULE_BY_ALGORITHM[trace.algorithm],
        objective=objective,
        cost_breakdown=breakdown,
        factors=_route_factors(store, trace, breakdown, gap),
        reference_routes=(reference_routes or [])[:2],
    )


def _ucs_path(store: GraphStore, start: str, goal: str, mode: Mode,
              slot: TimeSlot, banned_edge: str | None = None) -> list[str] | None:
    """Plain internal UCS used only to derive comparison routes."""
    w = store.weights(mode, slot)
    dist = {start: 0.0}
    parent: dict[str, str] = {}
    heap: list[tuple[float, int, str]] = [(0.0, 0, start)]
    done: set[str] = set()
    tie = 0
    while heap:
        d, _t, node = heapq.heappop(heap)
        if node in done:
            continue
        done.add(node)
        if node == goal:
            path = [goal]
            while path[-1] != start:
                path.append(parent[path[-1]])
            path.reverse()
            return path
        for nbr, eid in store.adj[node]:
            if nbr in done or eid == banned_edge:
                continue
            nd = d + w[eid]
            if nd < dist.get(nbr, float("inf")):
                dist[nbr] = nd
                parent[nbr] = node
                tie += 1
                heapq.heappush(heap, (nd, tie, nbr))
    return None


def _why_not(store: GraphStore, alt_path: list[str], slot: TimeSlot, mode: Mode,
             main_cost: float, main_balanced: float, main_dist: float,
             alt_cost: float, alt_balanced: float, alt_dist: float,
             main_optimal: bool = True) -> str:
    reasons: list[str] = []
    congested = _congested_on_path(store, alt_path, slot)
    if congested:
        worst = max(congested, key=lambda cseg: cseg.level)
        reasons.append(
            f"có {_edge_label(store, worst.edge)} ùn tắc mức {worst.level}/5 "
            f"theo hồ sơ khung giờ đại diện {slot}")
    risks = _risk_counts(store, alt_path)
    if risks["flood"]:
        reasons.append(f"đi qua {risks['flood']} đoạn có nguy cơ ngập")
    if risks["construction"]:
        reasons.append(f"vướng {risks['construction']} đoạn có lô cốt thi công")
    if risks["traffic_light"] >= 2:
        reasons.append(f"chờ {risks['traffic_light']} đèn tín hiệu")

    dd = alt_dist - main_dist
    db = alt_balanced - main_balanced
    objective_delta = alt_cost - main_cost
    distance_relation = _relation(alt_dist, main_dist)
    balanced_relation = _relation(alt_balanced, main_balanced)
    objective_relation = _relation(alt_cost, main_cost)
    head = (f"Ngắn hơn {_fmt_distance_delta(dd)}" if distance_relation < 0 else
            f"Dài hơn {_fmt_distance_delta(dd)}" if distance_relation > 0 else
            "Quãng đường tương đương")
    balanced_tail = (
        f"chi phí cân bằng cao hơn ~{vi_num(db, 1)} s quy đổi" if balanced_relation > 0 else
        f"chi phí cân bằng thấp hơn ~{vi_num(abs(db), 1)} s quy đổi" if balanced_relation < 0 else
        "chi phí cân bằng tương đương"
    )
    why = ("Tuyến tham chiếu được hệ thống tính thêm sau khi chạy. "
           f"{head}; {balanced_tail}.")
    if reasons:
        why += " Các yếu tố ghi nhận trên tuyến tham chiếu: " + ", ".join(reasons) + "."
    why += " "
    objective = _objective_label(mode)
    if objective_relation > 0:
        why += (f"Theo tiêu chí hiện tại, {objective} của tuyến tham chiếu "
                f"cao hơn ~{_fmt_objective_delta(objective_delta, mode)} so với tuyến chính.")
    elif objective_relation < 0:
        why += (f"Theo tiêu chí hiện tại, {objective} của tuyến tham chiếu "
                f"thấp hơn ~{_fmt_objective_delta(objective_delta, mode)} so với tuyến chính.")
        if not main_optimal:
            why += (" Kết quả chính không có bảo đảm tối ưu và kém hơn "
                    "tuyến tham chiếu trong đối chiếu hậu kiểm này.")
    else:
        why += f"Hai tuyến tương đương theo tiêu chí hiện tại ({objective})."
    return why


def build_explanation(store: GraphStore, trace: Trace) -> Explanation:
    """Fill Trace.explanation (SCHEMA §B.4) from the finished run."""
    start_goal = (trace.path[0], trace.path[-1]) if trace.path else None
    if not trace.found or start_goal is None:
        reason = trace.termination.reason if trace.termination is not None else None
        conclusion = (
            "Đã duyệt cạn frontier nên snapshot hiện tại chứng minh không có đường đi."
            if reason == "frontier_exhausted" else
            "Lần chạy dừng vì giới hạn/pruning nên kết luận reachability vẫn chưa đầy đủ."
            if reason in (
                "depth_cap_reached", "round_cap_reached",
                "beam_exhausted_after_pruning",
            ) else
            "Lần chạy chưa tìm thấy tuyến."
        )
        return Explanation(
            summary_vi=(f"Lần chạy này chưa tìm thấy tuyến với thuật toán "
                        f"{ALGO_VI[trace.algorithm]}. {conclusion}"),
            congested_segments=[], alternatives=[],
            evidence=_evidence(store, trace),
        )
    start, goal = start_goal
    mode, slot = trace.mode, trace.time_slot
    if len(trace.path) < 2:
        # start == goal: a valid trivial route (SCHEMA §B.1, path=[start]).
        # Without this guard the first_edge lookup below indexed path[1]
        # and turned the whole request into a 500 (audit finding L3-01).
        where = store.nodes[start].name or start
        cost_unit_vi = "m" if mode == "distance" else "giây"
        return Explanation(
            summary_vi=(f"Điểm đi và điểm đến trùng nhau ({where}) — quãng đường "
                        f"0 m, chi phí 0 {cost_unit_vi}, không có đoạn đường nào để phân tích. "
                        "Hãy chọn hai điểm khác nhau để so sánh tuyến."),
            congested_segments=[], alternatives=[],
            evidence=_evidence(store, trace, exact_path=trace.path),
        )
    main_cost = trace.metrics.total_cost
    main_dist = trace.metrics.total_distance_m
    main_balanced = trace.metrics.total_time_s

    congested = _congested_on_path(store, trace.path, slot)
    risks = _risk_counts(store, trace.path)
    exact_path = _ucs_path(store, start, goal, mode, slot)
    if exact_path is None:
        raise ValueError("exact same-objective UCS reference is unexpectedly unreachable")
    reference_routes: list[ReferenceRoute] = []
    if exact_path != trace.path:
        reference_routes.append(_reference_route(
            store,
            reference_id="posthoc:exact:same-objective",
            kind="same_objective_optimum",
            generated_for_mode=mode,
            excluded_edge=None,
            path=exact_path,
            selected_path=trace.path,
            active_mode=mode,
            slot=slot,
        ))

    # ---- alternatives: distance-shortest (or balanced when mode=distance),
    # then greedy, then a first-edge-banned fallback so >=1 truly differs.
    specs: list[tuple[str, Mode, str | None]] = []
    if mode == "distance":
        specs.append(("Tuyến chi phí cân bằng thấp nhất", "balanced", None))
    else:
        specs.append(("Tuyến ngắn nhất theo quãng đường", "distance", None))
    first_edge = store.edge_by_uv[(trace.path[0], trace.path[1])]
    specs.append((f"Tuyến không đi qua {first_edge.name or 'đoạn xuất phát hiện tại'}",
                  mode, first_edge.id))

    alternatives: list[Alternative] = []
    shorter_alt_note: str | None = None
    dominated_note: str | None = None
    distance_alt_differs = False
    for label, alt_mode, banned in specs:
        if len(alternatives) >= 2:
            break
        alt_path = _ucs_path(store, start, goal, alt_mode, slot, banned)
        if not alt_path or alt_path == trace.path or \
                any(a.path == alt_path for a in alternatives):
            continue
        if alt_mode == "distance" and banned is None:
            distance_alt_differs = True
        alt_cost, alt_dist, alt_balanced = store.path_metrics(alt_path, mode, slot)
        why = _why_not(
            store, alt_path, slot, mode,
            main_cost, main_balanced, main_dist,
            alt_cost, alt_balanced, alt_dist,
            main_optimal=trace.metrics.optimal_guarantee,
        )
        alternatives.append(Alternative(
            label=label, path=alt_path, total_distance_m=alt_dist,
            total_time_s=alt_balanced, why_not_vi=why))
        if len(reference_routes) < 2 and not any(
            reference.path == alt_path for reference in reference_routes
        ):
            reference_routes.append(_reference_route(
                store,
                reference_id=(
                    f"posthoc:avoid:{banned}" if banned is not None else
                    f"posthoc:mode:{alt_mode}"
                ),
                kind=(
                    "avoid_edge_counterfactual" if banned is not None else
                    "distance_optimum" if alt_mode == "distance" else
                    "balanced_optimum"
                ),
                generated_for_mode=alt_mode,
                excluded_edge=banned,
                path=alt_path,
                selected_path=trace.path,
                active_mode=mode,
                slot=slot,
            ))
        if alt_dist < main_dist - 10 and alt_cost > main_cost + 0.5:
            names = _street_names(store, alt_path,
                                  {c.edge for c in _congested_on_path(store, alt_path, slot)})
            cause = f" (dính {', '.join(names)})" if names else ""
            shorter_alt_note = (
                f"Tuyến tham chiếu hậu kiểm ngắn hơn "
                f"{vi_num((main_dist - alt_dist) / 1000, 2)} km nhưng "
                f"{_objective_label(mode)} cao hơn "
                f"~{_fmt_objective_delta(alt_cost - main_cost, mode)}{cause}.")
        elif alt_cost < main_cost - 0.5 and \
                not trace.metrics.optimal_guarantee:
            dominated_note = (
                f"Đối chiếu hậu kiểm cho thấy tuyến tham chiếu \"{label}\" có "
                f"{_objective_label(mode)} thấp hơn "
                f"~{_fmt_objective_delta(main_cost - alt_cost, mode)}. "
                f"{ALGO_VI[trace.algorithm]} không có bảo đảm tối ưu cho lần chạy này.")

    # ---- summary assembly -------------------------------------------------
    totals_str = _fmt_route_totals(main_cost, main_balanced, main_dist, mode)
    profile_context = (f"theo hồ sơ khung giờ đại diện {slot}, "
                       "không phải dữ liệu giao thông trực tiếp")
    if trace.metrics.optimal_guarantee and trace.algorithm != "idastar":
        opening = (f"Tuyến {_path_label(store, trace.path)} được chọn vì {MODE_VI[mode]} "
                   f"({totals_str}) theo thuật toán {ALGO_VI[trace.algorithm]}, "
                   f"{profile_context}.")
    elif trace.metrics.optimal_guarantee and trace.algorithm == "idastar":
        opening = (f"Tuyến {_path_label(store, trace.path)} là kết quả của IDA* "
                   f"với bảo đảm sai số cộng trong biên ε; tổng {totals_str}, "
                   f"{profile_context}.")
    else:
        opening = (f"Tuyến {_path_label(store, trace.path)} là kết quả của "
                   f"{ALGO_VI[trace.algorithm]} — tuyến {ALGO_CRITERION_VI[trace.algorithm]} — "
                   f"với tổng {totals_str}, {profile_context}.")
    parts: list[str] = [opening]
    if congested:
        top = sorted(congested, key=lambda cseg: -cseg.level)[:3]
        seen_labels: list[str] = []
        for cseg in top:
            label = f"{_edge_label(store, cseg.edge)} (mức {cseg.level}/5)"
            if label not in seen_labels:
                seen_labels.append(label)
        parts.append("Trên tuyến vẫn còn đoạn ùn tắc: " + ", ".join(seen_labels) + ".")
    else:
        parts.append(f"Tuyến tránh được mọi đoạn ùn tắc nặng (mức ≥ {CONGESTION_THRESHOLD}/5) "
                     f"trong hồ sơ khung giờ đại diện {slot}.")
    risk_bits = []
    if risks["flood"]:
        risk_bits.append(f"{risks['flood']} đoạn nguy cơ ngập")
    if risks["construction"]:
        risk_bits.append(f"{risks['construction']} đoạn có lô cốt")
    if risks["traffic_light"]:
        risk_bits.append(f"{risks['traffic_light']} đèn tín hiệu")
    if risk_bits and mode == "balanced":
        parts.append("Chi phí đã tính phạt cho " + ", ".join(risk_bits) + " dọc tuyến.")
    if shorter_alt_note:
        parts.append(shorter_alt_note)
    elif dominated_note:
        parts.append(dominated_note)
    elif mode != "distance" and not distance_alt_differs:
        parts.append("Tuyến được chọn đồng thời ngắn nhất theo quãng đường "
                     "trong các phương án so sánh.")

    if trace.metrics.optimal_guarantee:
        if trace.algorithm == "idastar":
            parts.append(f"IDA* bảo đảm tối ưu trong ngưỡng ε = "
                         f"{vi_num(trace.metrics.epsilon_bound or 5.0)} "
                         f"{_cost_unit(mode)}.")
        else:
            parts.append(f"{ALGO_VI[trace.algorithm]} bảo đảm đây là tuyến tối ưu "
                         "theo tiêu chí đã chọn.")
    else:
        if exact_path:
            opt_cost, _d, _t = store.path_metrics(exact_path, mode, slot)
            gap = main_cost - opt_cost
            if gap <= 0.5:
                parts.append(f"{ALGO_VI[trace.algorithm]} không bảo đảm tối ưu, "
                             "nhưng lần chạy này trùng chi phí với tuyến tối ưu.")
            else:
                parts.append(
                    f"{ALGO_VI[trace.algorithm]} không bảo đảm tối ưu: tuyến này "
                    f"đắt hơn tuyến tối ưu ~{gap:.0f} {_cost_unit(mode)} "
                    f"(+{vi_num(gap / opt_cost * 100)} %).")

    return Explanation(
        summary_vi=" ".join(parts),
        congested_segments=congested,
        alternatives=alternatives,
        evidence=_evidence(
            store,
            trace,
            exact_path=exact_path,
            reference_routes=reference_routes,
        ),
    )
