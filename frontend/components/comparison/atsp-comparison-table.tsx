"use client";

import { AlertTriangle, GitCompareArrows, Loader2, RefreshCw } from "lucide-react";

import { ATSP_METHOD_LABEL } from "@/components/atsp/atsp-copy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { describeAtspSavings } from "@/lib/atsp-savings";
import { atspComparisonInsights } from "@/lib/comparison-insights";
import {
  comparisonEquivalent,
  comparisonRankLabel,
  rankComparisonResults,
} from "@/lib/comparison-policy";
import { fmtInt, fmtKm, fmtMinutes, fmtMs, fmtPct } from "@/lib/format";
import {
  exactOptimalityGap,
  formatOutcomeMetricValue,
  outcomeMetricsForMode,
  primaryOutcomeMetric,
} from "@/lib/metric-presentation";
import { useApp } from "@/lib/store";
import type {
  AtspResultEnvelope, CompareRun, CompareRunStatus, MultirouteResponse,
  MultirouteV2Found, TspMethod,
} from "@/lib/types";

const STATUS_COPY: Record<CompareRunStatus, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  success: "Hoàn tất",
  no_path: "Không đủ đường",
  error: "Lỗi",
  cancelled: "Đã hủy",
};

const LABEL_COLUMN_WIDTH = 240;
const METHOD_COLUMN_WIDTH = 220;

function statusVariant(status: CompareRunStatus): "default" | "ok" | "warn" | "danger" {
  if (status === "success") return "ok";
  if (status === "error") return "danger";
  if (status === "no_path" || status === "cancelled") return "warn";
  return "default";
}

function savingsCopy(response: MultirouteResponse): string {
  const savings = describeAtspSavings(response.savings_pct);
  if (savings.kind === "unavailable" || savings.absolutePct === null) return "—";
  if (savings.kind === "negative") return `Tăng ${fmtPct(savings.absolutePct)}`;
  if (savings.kind === "positive") return `Giảm ${fmtPct(savings.absolutePct)}`;
  return "Không đổi";
}

function methodStatsCopy(response: MultirouteResponse): string {
  if (response.contract_version !== 2 || !response.found) return "—";
  const stats = response.method_stats;
  if (stats.kind === "held_karp") {
    return `${fmtInt(stats.dp_states_solved)} trạng thái DP · ${fmtInt(stats.transitions_evaluated)} transition`;
  }
  if (stats.kind === "nn_local_search") {
    const candidates = stats.nn_candidates_evaluated
      + stats.two_opt_candidates_evaluated + stats.or_opt_candidates_evaluated;
    const accepted = stats.accepted_2opt_moves + stats.accepted_oropt_moves;
    return `${fmtInt(candidates)} ứng viên · ${fmtInt(accepted)} move cải thiện được nhận`;
  }
  const objective = primaryOutcomeMetric(response.mode);
  return `${fmtInt(stats.seed_count)} seed · best seed ${stats.best_seed} · best ${formatOutcomeMetricValue(objective, stats.best_cost)} · mean ${formatOutcomeMetricValue(objective, stats.mean_best_cost)} · σ mẫu ${formatOutcomeMetricValue(objective, stats.stddev_best_cost)} · ${fmtInt(stats.attempted_moves)} move`;
}

function orderCopy(
  response: MultirouteResponse,
  nameOf: (nodeId: string) => string,
): string {
  if (!response.found) return "—";
  const order = response.order.map(nameOf);
  if (response.contract_version === 2 && response.return_to_start && order[0]) {
    order.push(order[0]);
  }
  return order.join(" → ");
}

function directedFailureCopy(
  response: MultirouteResponse,
  nameOf: (nodeId: string) => string,
): string | null {
  if (response.contract_version !== 2 || response.found) return null;
  return `Thiếu đường có hướng ${nameOf(response.failure.from_node)} → ${nameOf(response.failure.to_node)}; đổi optimizer không thể sửa ma trận này.`;
}

function ResultActions({
  run,
  sessionId,
  nameOf,
}: {
  run: CompareRun<AtspResultEnvelope>;
  sessionId: string;
  nameOf: (nodeId: string) => string;
}) {
  const retry = useApp((state) => state.retryAtspComparisonRun);
  const comparing = useApp((state) => state.comparing);
  const setSubject = useApp((state) => state.setExplanationSubject);
  const set = useApp((state) => state.set);
  const method = run.id as TspMethod;
  const retryable = run.status === "error" || run.status === "cancelled";
  const failure = run.result ? directedFailureCopy(run.result.response, nameOf) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-control/70 p-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{ATSP_METHOD_LABEL[method]}</p>
        {run.error && <p className="mt-0.5 text-xs leading-5 text-goal">{run.error}</p>}
        {failure && <p className="mt-0.5 text-xs leading-5 text-ink-dim">{failure}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant={statusVariant(run.status)}>{STATUS_COPY[run.status]}</Badge>
        {retryable && (
          <Button
            variant="ghost"
            size="sm"
            disabled={comparing}
            aria-label={`Chạy lại ${ATSP_METHOD_LABEL[method]}`}
            onClick={() => void retry(method)}
          >
            <RefreshCw /> Chạy lại
          </Button>
        )}
        {run.result && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Xem giải thích ${ATSP_METHOD_LABEL[method]}`}
            onClick={() => {
              setSubject({
                kind: "atsp_comparison",
                sessionId,
                resultId: run.result?.id ?? method,
              });
              set({ drawerOpen: true, drawerTab: "explain", playing: false });
            }}
          >
            Giải thích
          </Button>
        )}
      </div>
    </div>
  );
}

function BaselineSummary({
  response,
  nameOf,
}: {
  response: MultirouteV2Found;
  nameOf: (nodeId: string) => string;
}) {
  const primary = primaryOutcomeMetric(response.mode);
  const order = response.original_order.map(nameOf);
  if (response.return_to_start && order[0]) order.push(order[0]);

  return (
    <section aria-labelledby="atsp-baseline-title" className="rounded-lg border border-dashed border-surface-strong bg-surface-control/55 p-3">
      <h3 id="atsp-baseline-title" className="text-sm font-bold text-ink">
        Baseline: thứ tự nhập
      </h3>
      <p className="mt-1 text-xs leading-5 text-ink-dim">
        Đây là mốc đối chiếu chung, không phải phương pháp ATSP và không tạo thêm map.
      </p>
      <p className="mt-2 break-words text-xs leading-5 text-ink">
        {order.join(" → ")}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{primary.label}: {formatOutcomeMetricValue(primary, response.original_order_totals[primary.key])}</Badge>
        <Badge>{fmtInt(response.original_order_legs.length)} chặng</Badge>
      </div>
      <details className="mt-2 text-xs">
        <summary className="flex min-h-10 cursor-pointer items-center font-semibold text-ink">
          Xem các chặng baseline
        </summary>
        <div role="region" aria-label="Bảng các chặng theo thứ tự nhập" tabIndex={0} className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="min-w-[720px] text-xs">
            <caption className="sr-only">Các chặng baseline theo đúng thứ tự điểm giao người dùng nhập</caption>
            <thead className="bg-surface-control text-ink-dim">
              <tr>
                <th scope="col" className="px-2 py-2 text-left">#</th>
                <th scope="col" className="px-2 py-2 text-left">Từ → Đến</th>
                <th scope="col" className="px-2 py-2 text-right">{primary.label}</th>
                <th scope="col" className="px-2 py-2 text-right">Quãng đường</th>
                <th scope="col" className="px-2 py-2 text-right">Thời gian theo ùn tắc</th>
                <th scope="col" className="px-2 py-2 text-right">Chi phí cân bằng</th>
              </tr>
            </thead>
            <tbody>
              {response.original_order_legs.map((leg, index) => (
                <tr key={`${index}-${leg.from_node}-${leg.to_node}`} className="border-t border-surface-border/70">
                  <td className="px-2 py-2 font-mono text-ink-dim">{index + 1}</td>
                  <td className="px-2 py-2 text-ink">{nameOf(leg.from_node)} → {nameOf(leg.to_node)}</td>
                  <td className="px-2 py-2 text-right font-mono text-ink">{formatOutcomeMetricValue(primary, leg.metrics[primary.key])}</td>
                  <td className="px-2 py-2 text-right font-mono text-ink">{fmtKm(leg.metrics.total_distance_m)}</td>
                  <td className="px-2 py-2 text-right font-mono text-ink">{leg.cost_breakdown ? fmtMinutes(leg.cost_breakdown.congestion_adjusted_time_s) : "—"}</td>
                  <td className="px-2 py-2 text-right font-mono text-ink">{leg.cost_breakdown ? `${fmtMinutes(leg.cost_breakdown.balanced_cost_s)} quy đổi` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

export function AtspComparisonTable() {
  const state = useApp();
  const session = state.atspComparisonSession;
  const nameOf = (nodeId: string) =>
    state.graphData?.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <GitCompareArrows className="size-8 text-algo-frontier" />
        <p className="text-sm font-semibold text-ink">Chưa có kết quả so sánh ATSP</p>
        <p className="max-w-72 text-xs leading-5 text-ink-dim">
          Chọn 2–3 phương pháp ở panel trái rồi bấm <b className="text-ink">So sánh</b>. Thứ tự nhập là baseline trong bảng, không tạo thêm bản đồ.
        </p>
      </div>
    );
  }

  const results = session.runs.flatMap((run) => run.result ? [run.result] : []);
  const responses = new Map(results.map((result) => [result.id, result.response]));
  const mode = results[0]?.response.mode ?? session.snapshot.mode;
  const outcomeMetrics = outcomeMetricsForMode(mode);
  const primaryMetric = primaryOutcomeMetric(mode);
  const insights = atspComparisonInsights(results);
  const integrityError = insights.some((insight) => insight.severity === "error");
  const exactResult = !integrityError ? results.find((result) => result.id === "held_karp"
    && result.response.found && result.response.optimal_guarantee
    && result.response.totals !== null) : undefined;
  const exactValue = exactResult?.response.totals?.total_cost ?? null;
  const ranking = integrityError ? [] : rankComparisonResults(
      session,
      (result) => result.response.found ? result.response.totals?.total_cost ?? null : null,
    );
  const rankById = new Map(ranking.map((item) => [item.id, item]));
  const baseline = results.map((result) => result.response).find(
    (response): response is MultirouteV2Found => (
      response.contract_version === 2 && response.found
    ),
  );

  const numericRows = [
    ...outcomeMetrics.map((metric) => ({
      label: metric.label,
      value: (response: MultirouteResponse) => response.found
        ? response.totals?.[metric.key] ?? null : null,
      format: (value: number) => formatOutcomeMetricValue(metric, value),
    })),
    {
      label: "Số lượt search dựng ma trận",
      value: (response: MultirouteResponse) => response.contract_version === 2
        ? response.computation_metrics.matrix_search_runs : null,
      format: fmtInt,
    },
    {
      label: "Node mở rộng khi dựng ma trận",
      value: (response: MultirouteResponse) => response.contract_version === 2
        ? response.computation_metrics.matrix_nodes_expanded : null,
      format: fmtInt,
    },
    {
      label: "Thời gian dựng ma trận",
      value: (response: MultirouteResponse) => response.contract_version === 2
        ? response.computation_metrics.matrix_runtime_ms : null,
      format: fmtMs,
    },
    {
      label: "Thời gian optimizer",
      value: (response: MultirouteResponse) => response.contract_version === 2
        ? response.computation_metrics.optimizer_runtime_ms : null,
      format: fmtMs,
    },
    {
      label: "Tổng xử lý backend",
      value: (response: MultirouteResponse) => response.contract_version === 2
        ? response.computation_metrics.total_runtime_ms : null,
      format: fmtMs,
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {state.comparing && state.comparisonProgress && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border border-algo-frontier/35 bg-algo-frontier/10 px-3 py-2 text-xs text-ink">
          <Loader2 className="size-4 animate-spin text-algo-frontier motion-reduce:animate-none" />
          Đang chạy phương pháp {state.comparisonProgress.currentItem}/{state.comparisonProgress.totalItems}
        </div>
      )}

      <p className="rounded-lg border border-surface-border bg-surface-control/70 px-3 py-2 text-xs leading-5 text-ink-dim">
        {session.snapshot.returnToStart
          ? "Hành trình đóng: mọi phương pháp phải quay về điểm Đi."
          : "Hành trình mở: mọi phương pháp kết thúc ở điểm giao cuối."}
        {" "}Các lượt chạy dùng cùng điểm, thứ tự nhập, mode, khung giờ và scenario fingerprint.
      </p>

      {insights.filter((insight) => insight.kind !== "no_rankable_result").map((insight) => (
        <p
          key={`${insight.kind}-${insight.resultIds.join("-")}`}
          role={insight.severity === "error" ? "alert" : "status"}
          className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
            insight.severity === "error"
              ? "border-goal/40 bg-goal/10 text-ink"
              : "border-surface-border bg-surface-control/70 text-ink-dim"
          }`}
        >
          {insight.severity === "error" && <AlertTriangle className="mr-1 inline size-3.5 text-goal" />}
          {insight.message}
        </p>
      ))}

      {baseline && <BaselineSummary response={baseline} nameOf={nameOf} />}

      <div
        role="region"
        aria-label={`Bảng so sánh ${session.selectedIds.length} phương pháp ATSP`}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-surface-border"
      >
        <table
          className="table-fixed text-xs"
          style={{
            width: `max(100%, ${LABEL_COLUMN_WIDTH + session.selectedIds.length * METHOD_COLUMN_WIDTH}px)`,
          }}
        >
          <caption className="sr-only">Các chỉ số của mọi phương pháp ATSP được chọn trên cùng snapshot</caption>
          <colgroup>
            <col style={{ width: LABEL_COLUMN_WIDTH }} />
            {session.selectedIds.map((id) => <col key={id} style={{ width: METHOD_COLUMN_WIDTH }} />)}
          </colgroup>
          <thead className="bg-surface-control text-ink-dim">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-control px-2.5 py-2 text-left font-medium">Chỉ số</th>
              {session.selectedIds.map((id) => (
                <th key={id} scope="col" className="border-l border-surface-border px-2.5 py-2 text-center font-medium leading-4 text-ink">
                  {ATSP_METHOD_LABEL[id as TspMethod]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-medium text-ink-dim">Trạng thái</th>
              {session.runs.map((run) => (
                <td key={run.id} className="border-l border-surface-border/70 px-2.5 py-2 text-center">
                  <Badge variant={statusVariant(run.status)} className="max-w-full justify-center whitespace-normal text-center leading-4 before:shrink-0">
                    {STATUS_COPY[run.status]}
                  </Badge>
                </td>
              ))}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-medium text-ink-dim">Xếp hạng chi phí mục tiêu</th>
              {session.selectedIds.map((id) => (
                <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center font-mono font-semibold text-ink">
                  {comparisonRankLabel(rankById.get(id))}
                </td>
              ))}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">Số điểm / số chặng</th>
              {session.selectedIds.map((id) => {
                const response = responses.get(id);
                return (
                  <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center font-mono text-ink">
                    {response?.found ? `${fmtInt(response.order.length)} / ${fmtInt(response.legs.length)}` : "—"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">Thứ tự ghé sau tối ưu</th>
              {session.selectedIds.map((id) => {
                const response = responses.get(id);
                return (
                  <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center text-xs leading-5 text-ink">
                    {response ? orderCopy(response, nameOf) : "—"}
                  </td>
                );
              })}
            </tr>
            {numericRows.map((row) => {
              const values = session.selectedIds.map((id) => {
                const response = responses.get(id);
                return response ? row.value(response) : null;
              });
              const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
              const best = finite.length ? Math.min(...finite) : null;
              return (
                <tr key={row.label} className="border-t border-surface-border/60">
                  <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-1.5 text-left font-normal text-ink-dim">{row.label}</th>
                  {values.map((value, index) => (
                    <td
                      key={session.selectedIds[index]}
                      className={`border-l border-surface-border/70 px-2.5 py-1.5 text-center font-mono ${
                        value !== null && best !== null && comparisonEquivalent(value, best)
                          ? "font-bold text-[rgb(var(--start))]" : "text-ink"
                      }`}
                    >
                      {value === null ? "—" : row.format(value)}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">So với thứ tự nhập (savings)</th>
              {session.selectedIds.map((id) => (
                <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center font-mono text-ink">
                  {responses.get(id) ? savingsCopy(responses.get(id) as MultirouteResponse) : "—"}
                </td>
              ))}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">Độ lệch so với Held–Karp exact</th>
              {session.selectedIds.map((id) => {
                const response = responses.get(id);
                const gap = response?.found
                  ? exactOptimalityGap(response.totals?.total_cost ?? null, exactValue)
                  : null;
                return (
                  <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center font-mono text-ink">
                    {integrityError
                      ? "Tạm dừng do integrity"
                      : gap
                      ? `${formatOutcomeMetricValue(primaryMetric, gap.raw)}${gap.pct === null ? "" : ` · ${fmtPct(gap.pct)}`}`
                      : exactValue === null ? "Chưa có exact" : "—"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">Bảo đảm</th>
              {session.selectedIds.map((id) => {
                const response = responses.get(id);
                return (
                  <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center">
                    {response ? (
                      <Badge variant={response.optimal_guarantee ? "ok" : "warn"} className="max-w-full justify-center whitespace-normal text-center leading-4">
                        {response.optimal_guarantee ? "Exact trong cấu hình này" : "Heuristic, chưa chứng minh tối ưu"}
                      </Badge>
                    ) : "—"}
                  </td>
                );
              })}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">Chi tiết riêng của phương pháp</th>
              {session.selectedIds.map((id) => (
                <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center leading-5 text-ink">
                  {responses.get(id) ? methodStatsCopy(responses.get(id) as MultirouteResponse) : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-ink-dim">
        Màu xanh đánh dấu giá trị thấp nhất theo từng hàng. Savings luôn so với baseline thứ tự nhập; exact gap chỉ có khi Held–Karp cùng snapshot chạy thành công. Không đồng bộ event count giữa các phương pháp vì mỗi optimizer có semantics khác nhau.
      </p>

      <div className="flex flex-col gap-2">
        {session.runs.map((run) => (
          <ResultActions key={run.id} run={run} sessionId={session.id} nameOf={nameOf} />
        ))}
      </div>
    </div>
  );
}
