"use client";

import { AlertTriangle, GitCompareArrows, Loader2, RefreshCw } from "lucide-react";

import { AtspCompare } from "../atsp/atsp-compare";
import { AtspLoading } from "../atsp/atsp-result";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { routeGuaranteeLabel } from "@/lib/algorithm-policy";
import { routeComparisonInsights } from "@/lib/comparison-insights";
import {
  comparisonEquivalent,
  comparisonRankLabel,
  rankComparisonResults,
} from "@/lib/comparison-policy";
import { fmtInt, fmtMs } from "@/lib/format";
import {
  formatOutcomeMetricValue,
  outcomeMetricsForMode,
  presentationUnitForMode,
  rawEpsilonToPresentation,
} from "@/lib/metric-presentation";
import { ALGO_LABEL, useApp } from "@/lib/store";
import type {
  Algorithm, CompareRun, CompareRunStatus, RouteResultEnvelope, Trace,
} from "@/lib/types";

const STATUS_COPY: Record<CompareRunStatus, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  success: "Hoàn tất",
  no_path: "Không có đường",
  error: "Lỗi",
  cancelled: "Đã hủy",
};

interface MetricRow {
  label: string;
  value: (trace: Trace) => number | null;
  format: (value: number) => string;
}

const METRIC_COLUMN_WIDTH = 240;
const ALGORITHM_COLUMN_WIDTH = 216;

function comparisonMetricRows(mode: Trace["mode"]): MetricRow[] {
  return [
    ...outcomeMetricsForMode(mode).map((metric) => ({
      label: metric.label,
      value: (trace: Trace) => trace.metrics[metric.key],
      format: (value: number) => formatOutcomeMetricValue(metric, value),
    })),
    {
      label: "Số điểm đã duyệt",
      value: (trace: Trace) => trace.metrics.nodes_expanded,
      format: fmtInt,
    },
    {
      label: "Số điểm chờ lớn nhất",
      value: (trace: Trace) => trace.metrics.max_frontier,
      format: fmtInt,
    },
    {
      label: "Thời gian xử lý",
      value: (trace: Trace) => trace.metrics.runtime_ms,
      format: fmtMs,
    },
  ];
}

function statusVariant(status: CompareRunStatus): "default" | "ok" | "warn" | "danger" {
  if (status === "success") return "ok";
  if (status === "error") return "danger";
  if (status === "no_path" || status === "cancelled") return "warn";
  return "default";
}

function ResultActions({
  run,
  sessionId,
}: {
  run: CompareRun<RouteResultEnvelope>;
  sessionId: string;
}) {
  const retry = useApp((state) => state.retryRouteComparisonRun);
  const comparing = useApp((state) => state.comparing);
  const setSubject = useApp((state) => state.setExplanationSubject);
  const set = useApp((state) => state.set);
  const algorithm = run.id as Algorithm;
  const retryable = run.status === "error" || run.status === "cancelled";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-control/70 p-2.5">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink">{ALGO_LABEL[algorithm]}</p>
        {run.error && <p className="mt-0.5 text-xs leading-5 text-goal">{run.error}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant={statusVariant(run.status)}>{STATUS_COPY[run.status]}</Badge>
        {retryable && (
          <Button
            variant="ghost"
            size="sm"
            disabled={comparing}
            aria-label={`Chạy lại ${ALGO_LABEL[algorithm]}`}
            onClick={() => void retry(algorithm)}
          >
            <RefreshCw /> Chạy lại
          </Button>
        )}
        {run.result && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Xem giải thích ${ALGO_LABEL[algorithm]}`}
            onClick={() => {
              setSubject({
                kind: "route_comparison",
                sessionId,
                resultId: run.result?.id ?? algorithm,
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

export function CompareTab() {
  const state = useApp();
  const session = state.routeComparisonSession;
  const routeCompareMode = state.runKind === "compare"
    && (state.problemMode === "two_point" || state.multiStrategy === "ordered_search");

  if (state.multiRunning) return <AtspLoading />;
  if (state.multi) return <AtspCompare multi={state.multi} />;

  if (!routeCompareMode) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <GitCompareArrows className="size-8 text-algo-frontier" />
        <p className="text-sm font-semibold text-ink">Chưa ở chế độ so sánh nhiều</p>
        <p className="max-w-72 text-xs leading-5 text-ink-dim">
          Chọn <b className="text-ink">So sánh nhiều</b> trong mục Chế độ chạy ở panel thiết lập bên trái.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <GitCompareArrows className="size-8 text-algo-frontier" />
        <p className="text-sm font-semibold text-ink">Chưa có kết quả so sánh</p>
        <p className="max-w-72 text-xs leading-5 text-ink-dim">
          Chọn 2–4 thuật toán ở panel trái rồi bấm <b className="text-ink">So sánh</b>. Bảng này chỉ chứa số liệu; mỗi đường đi nằm trên bản đồ riêng ở giữa.
        </p>
      </div>
    );
  }

  const results = session.runs.flatMap((run) => run.result ? [run.result] : []);
  const traces = new Map(results.map((result) => [result.id, result.response]));
  const mode = results[0]?.response.mode ?? session.snapshot.mode;
  const rows = comparisonMetricRows(mode);
  const ranking = rankComparisonResults(session, (result) => result.response.metrics.total_cost);
  const rankById = new Map(ranking.map((item) => [item.id, item]));
  const insights = routeComparisonInsights(results);

  return (
    <div className="flex flex-col gap-3">
      {state.comparing && state.comparisonProgress && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-algo-frontier/35 bg-algo-frontier/10 px-3 py-2 text-xs text-ink">
          <Loader2 className="size-4 animate-spin text-algo-frontier" />
          Đang chạy thuật toán {state.comparisonProgress.currentItem}/{state.comparisonProgress.totalItems}
          {state.comparisonProgress.totalLegs > 1
            ? ` · chặng ${state.comparisonProgress.currentLeg}/${state.comparisonProgress.totalLegs}`
            : ""}
        </div>
      )}

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

      <div
        role="region"
        aria-label={`Bảng so sánh ${session.selectedIds.length} thuật toán định tuyến`}
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-surface-border"
      >
        <table
          className="table-fixed text-xs"
          style={{
            width: `max(100%, ${METRIC_COLUMN_WIDTH + session.selectedIds.length * ALGORITHM_COLUMN_WIDTH}px)`,
          }}
        >
          <caption className="sr-only">Các chỉ số kết quả của mọi thuật toán được chọn</caption>
          <colgroup>
            <col style={{ width: METRIC_COLUMN_WIDTH }} />
            {session.selectedIds.map((id) => (
              <col key={id} style={{ width: ALGORITHM_COLUMN_WIDTH }} />
            ))}
          </colgroup>
          <thead className="bg-surface-control text-ink-dim">
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-control px-2.5 py-2 text-left font-medium">Chỉ số</th>
              {session.selectedIds.map((id) => (
                <th key={id} scope="col" className="border-l border-surface-border px-2.5 py-2 text-center font-medium leading-4 text-ink">
                  {ALGO_LABEL[id as Algorithm]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-medium text-ink-dim">Trạng thái</th>
              {session.runs.map((run) => (
                <td key={run.id} className="border-l border-surface-border/70 px-2.5 py-2 text-center">
                  <Badge
                    variant={statusVariant(run.status)}
                    className="max-w-full justify-center whitespace-normal text-center leading-4 before:shrink-0"
                  >
                    {STATUS_COPY[run.status]}
                  </Badge>
                </td>
              ))}
            </tr>
            <tr className="border-t border-surface-border/60">
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-medium text-ink-dim">Xếp hạng chi phí mục tiêu</th>
              {session.selectedIds.map((id) => {
                const item = rankById.get(id);
                return (
                  <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center font-mono font-semibold text-ink">
                    {comparisonRankLabel(item)}
                  </td>
                );
              })}
            </tr>
            {rows.map((row) => {
              const values = session.selectedIds.map((id) => {
                const trace = traces.get(id);
                return trace ? row.value(trace) : null;
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
              <th scope="row" className="sticky left-0 bg-surface-panel px-2.5 py-2 text-left font-normal text-ink-dim">Bảo đảm kết quả</th>
              {session.selectedIds.map((id) => {
                const trace = traces.get(id);
                return (
                  <td key={id} className="border-l border-surface-border/70 px-2.5 py-2 text-center">
                    {trace ? (
                      <Badge
                        variant={trace.metrics.optimal_guarantee ? "ok" : "warn"}
                        className="max-w-full justify-center whitespace-normal text-center leading-4 before:shrink-0"
                      >
                        {routeGuaranteeLabel(
                          trace.algorithm,
                          trace.metrics.optimal_guarantee,
                          rawEpsilonToPresentation(trace.mode, trace.metrics.epsilon_bound),
                          presentationUnitForMode(trace.mode),
                        )}
                      </Badge>
                    ) : "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-ink-dim">
        Màu xanh đánh dấu giá trị thấp nhất theo từng hàng. Runtime được đo tuần tự trên cùng backend process; không chạy song song.{" "}
        “Đồng hạng” nghĩa là chi phí mục tiêu gốc chênh nhau không quá ngưỡng so sánh.
      </p>

      <div className="flex flex-col gap-2">
        {session.runs.map((run) => (
          <ResultActions key={run.id} run={run} sessionId={session.id} />
        ))}
      </div>
    </div>
  );
}
