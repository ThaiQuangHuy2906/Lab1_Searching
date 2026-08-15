"use client";

import { BadgeCheck, Clock, ListOrdered, Route as RouteIcon, Sigma } from "lucide-react";
import { AppliedScenarioDetails } from "../applied-scenario-details";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { fmtPct } from "@/lib/format";
import { describeAtspSavings } from "@/lib/atsp-savings";
import { formatOutcomeMetricValue, outcomeMetricsForMode, primaryOutcomeMetric, type OutcomeMetric } from "@/lib/metric-presentation";
import type { GraphFile, LegMetrics, Mode, MultirouteResponse } from "@/lib/types";
import { ATSP_METHOD_LABEL, ATSP_MODE_LABEL } from "./atsp-copy";
import { AtspTrace } from "./atsp-trace";

function formatOutcomeMetric(metric: OutcomeMetric, totals: LegMetrics) {
  return formatOutcomeMetricValue(metric, totals[metric.key]);
}

function savingsComparisonCopy(mode: Mode): string {
  if (mode === "distance") return "So với tổng quãng đường của thứ tự nhập.";
  if (mode === "time") return "So với tổng thời gian ước tính theo ùn tắc của thứ tự nhập.";
  return "So với tổng chi phí cân bằng của thứ tự nhập.";
}

function ResultSummary({ label, totals, emphasized = false, mode }: {
  label: string; totals: LegMetrics; emphasized?: boolean; mode: Mode;
}) {
  const primary = primaryOutcomeMetric(mode);
  const secondary = outcomeMetricsForMode(mode)[1];
  const primaryValue = formatOutcomeMetric(primary, totals);
  const secondaryValue = secondary ? formatOutcomeMetric(secondary, totals) : null;
  const PrimaryIcon = mode === "distance" ? RouteIcon : mode === "time" ? Clock : Sigma;

  return (
    <div className={`rounded-lg border p-2.5 ${emphasized ? "border-algo-path/40 bg-algo-path/5" : "border-surface-border bg-surface-control/70"}`}>
      <p className="text-xs font-semibold text-ink-dim">{label}</p>
      <p className="mt-1 text-xs font-medium text-ink-dim">{primary.label}</p>
      <div className="mt-0.5 flex min-w-0 items-start gap-1.5">
        <PrimaryIcon className="mt-0.5 size-3.5 shrink-0 text-ink-dim" />
        <div className="min-w-0">
          <p className="break-words font-mono text-base font-bold leading-5 text-ink">{primaryValue}</p>
        </div>
      </div>
      {secondary && secondaryValue && (
        <p className="mt-2 flex min-w-0 items-center gap-1 text-xs leading-4 text-ink-dim">
          <RouteIcon className="size-3 shrink-0" />
          <span>{secondary.label}: </span>
          <span className="min-w-0 break-words font-mono text-ink">{secondaryValue}</span>
        </p>
      )}
    </div>
  );
}

export function AtspLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-surface-border bg-surface-panel p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-control text-algo-path"><ListOrdered className="size-4" /></span>
        <div><p className="text-sm font-semibold text-ink">Đang tối ưu thứ tự giao</p><p className="mt-0.5 text-xs leading-5 text-ink-dim">Đang tính ma trận chi phí và thứ tự ghé…</p></div>
      </div>
      <Skeleton className="h-9 w-full" /><Skeleton className="h-6 w-36" /><Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function AtspFailure({ multi, incomplete = false }: { multi: MultirouteResponse; incomplete?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div role="alert" className="rounded-lg border border-goal/40 bg-goal/10 p-3">
        <p className="text-sm font-semibold text-ink">{incomplete ? "Không thể hiển thị đầy đủ kết quả tối ưu" : "Không tìm được lộ trình qua tất cả điểm giao"}</p>
        <p className="mt-1 text-xs leading-5 text-ink-dim">{incomplete ? "Phản hồi hiện tại thiếu số liệu cần thiết theo hợp đồng giao diện." : "Không có chuỗi chặng hợp lệ theo điểm và tiêu chí đang chọn."}</p>
        <p className="mt-2 text-xs leading-5 text-ink">Hãy kiểm tra lại các điểm giao hoặc chọn phương pháp ATSP khác, rồi tối ưu lại.</p>
      </div>
      <AppliedScenarioDetails scenario={multi.applied_scenario} />
    </div>
  );
}

export function AtspResult({ multi, graphData }: { multi: MultirouteResponse; graphData: GraphFile | null }) {
  if (!multi.found) return <AtspFailure multi={multi} />;
  if (!multi.totals || !multi.original_order_totals) return <AtspFailure multi={multi} incomplete />;

  const nameOf = (nodeId: string) => graphData?.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;
  const isClosed = multi.contract_version === 2 && multi.return_to_start;
  const displayOrder = isClosed && multi.order[0]
    ? [...multi.order, multi.order[0]]
    : multi.order;
  const savings = describeAtspSavings(multi.savings_pct);
  const savingsTone = savings.kind === "positive" ? "border-start/35 bg-start/5" : savings.kind === "negative" ? "border-goal/35 bg-goal/10" : "border-surface-border bg-surface-control";
  const savingsText = savings.kind === "positive" ? "text-start" : savings.kind === "negative" ? "text-goal" : "text-ink";

  return (
    <div className="flex flex-col gap-3">
      <div role="status" aria-live="polite" className="rounded-lg border border-start/35 bg-start/5 p-3">
        <p className="text-sm font-semibold text-ink">Đã tối ưu thứ tự ghé</p>
        <p className="mt-1 text-xs leading-5 text-ink-dim">{ATSP_METHOD_LABEL[multi.method]} · {ATSP_MODE_LABEL[multi.mode]} · {multi.time_slot} · {multi.graph === "demo" ? "G_demo" : "G_real"}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={multi.optimal_guarantee ? "ok" : "warn"} className="gap-1">
          {multi.optimal_guarantee && <BadgeCheck className="size-3.5" />}
          {multi.optimal_guarantee ? "Đảm bảo tối ưu" : "Nghiệm xấp xỉ"}
        </Badge>
      </div>
      <div className={`rounded-lg border p-3 ${savingsTone}`}>
        <p className="text-xs font-medium text-ink-dim">{savings.label}</p>
        <p className={`mt-1 font-mono text-xl font-bold leading-none ${savingsText}`}>{savings.absolutePct === null ? "—" : fmtPct(savings.absolutePct)}</p>
        <p className="mt-1.5 text-xs leading-5 text-ink-dim">{savingsComparisonCopy(multi.mode)}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-ink-dim">Trước và sau tối ưu</p>
        <div className="grid grid-cols-2 gap-2">
          <ResultSummary label="Theo thứ tự nhập" totals={multi.original_order_totals} mode={multi.mode} />
          <ResultSummary label="Sau tối ưu" totals={multi.totals} mode={multi.mode} emphasized />
        </div>
      </div>
      <AtspTrace />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2"><ListOrdered className="size-4 text-algo-path" /> Thứ tự ghé sau tối ưu</CardTitle>
          <p className="text-xs leading-5 text-ink-dim">
            {isClosed
              ? "Vòng kín: bắt đầu tại điểm Đi và quay về điểm Đi sau điểm giao cuối."
              : "Hành trình mở: bắt đầu tại điểm Đi và kết thúc ở điểm giao cuối."}
          </p>
        </CardHeader>
        <CardContent>
          <ol aria-label="Thứ tự ghé sau tối ưu">
            {displayOrder.map((nodeId, index) => {
              const name = nameOf(nodeId);
              const isStart = index === 0;
              const isReturn = isClosed && index === displayOrder.length - 1;
              return (
                <li key={`${nodeId}-${index}`} className="relative flex gap-2.5 pb-3 last:pb-0">
                  {index < displayOrder.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-surface-strong" />}
                  <span className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${isStart || isReturn ? "bg-start text-white" : "bg-algo-path text-zinc-950"}`}>{isStart ? "Đi" : isReturn ? "Về" : index}</span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-xs font-bold text-ink-faint">{isStart ? "Điểm Đi" : isReturn ? "Quay về điểm Đi" : `Điểm giao ${index}`}</p>
                    <p className="break-words text-sm font-medium leading-5 text-ink" title={name}>{name}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
      <AppliedScenarioDetails scenario={multi.applied_scenario} />
    </div>
  );
}
