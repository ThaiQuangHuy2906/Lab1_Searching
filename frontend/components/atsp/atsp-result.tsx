"use client";

import { BadgeCheck, Clock, ListOrdered, Route as RouteIcon, Sigma } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { fmtKm, fmtMinutes, fmtPct, fmtVi } from "@/lib/format";
import { describeAtspSavings } from "@/lib/atsp-savings";
import type { GraphFile, LegMetrics, MultirouteResponse } from "@/lib/types";
import { ATSP_METHOD_LABEL, ATSP_MODE_LABEL, atspCostUnit } from "./atsp-copy";

function ResultSummary({ label, totals, emphasized = false, costUnit }: {
  label: string;
  totals: LegMetrics;
  emphasized?: boolean;
  costUnit: "m" | "s";
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${emphasized
      ? "border-algo-path/40 bg-algo-path/5"
      : "border-surface-border bg-surface-control/70"}`}>
      <p className="text-[11px] font-semibold text-ink-dim">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <Clock className="size-3.5 shrink-0 text-ink-dim" />
        <span className="font-mono text-base font-bold text-ink">
          {fmtMinutes(totals.total_time_s)}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] text-ink-dim">
        <span className="flex min-w-0 items-center gap-1">
          <RouteIcon className="size-3 shrink-0" />
          <span className="truncate font-mono">{fmtKm(totals.total_distance_m)}</span>
        </span>
        <span className="flex min-w-0 items-center justify-end gap-1">
          <Sigma className="size-3 shrink-0" />
          <span className="truncate font-mono">{fmtVi(totals.total_cost, 1)} {costUnit}</span>
        </span>
      </div>
    </div>
  );
}

export function AtspLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-lg border border-surface-border bg-surface-panel p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-control text-algo-path">
          <ListOrdered className="size-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Đang tối ưu thứ tự giao</p>
          <p className="mt-0.5 text-xs leading-5 text-ink-dim">
            Đang tính ma trận chi phí và thứ tự ghé…
          </p>
        </div>
      </div>
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">Đang tối ưu thứ tự giao.</span>
    </div>
  );
}

function AtspFailure({ multi, incomplete = false }: {
  multi: MultirouteResponse;
  incomplete?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border border-surface-border bg-surface-control px-2.5 py-2 font-mono text-[11px] text-ink-dim">
        {ATSP_METHOD_LABEL[multi.method]} · {ATSP_MODE_LABEL[multi.mode]} · {multi.time_slot} ·{" "}
        {multi.graph === "demo" ? "G_demo" : "G_real"}
      </p>
      <div role="status" className="rounded-lg border border-algo-path/35 bg-algo-path/10 p-3">
        <div className="flex items-center gap-2">
          <RouteIcon className="size-4 shrink-0 text-algo-path" />
          <p className="text-sm font-semibold text-ink">
            {incomplete
              ? "Không thể hiển thị đầy đủ kết quả ATSP"
              : "Không tìm được lộ trình qua tất cả điểm giao"}
          </p>
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-dim">
          {incomplete
            ? "Kết quả trả về thiếu số liệu theo contract. Hãy chạy lại và kiểm tra phản hồi backend."
            : "Hãy kiểm tra lại các điểm đã chọn hoặc thử một phương pháp ATSP khác."}
        </p>
      </div>
    </div>
  );
}

export function AtspResult({ multi, graphData }: {
  multi: MultirouteResponse;
  graphData: GraphFile | null;
}) {
  if (!multi.found) return <AtspFailure multi={multi} />;
  if (!multi.totals || !multi.original_order_totals)
    return <AtspFailure multi={multi} incomplete />;

  const nameOf = (id: string) =>
    graphData?.nodes.find((node) => node.id === id)?.name ?? id;
  const costUnit = atspCostUnit(multi.mode);
  const savings = describeAtspSavings(multi.savings_pct);
  const savingsTone = savings.kind === "positive"
    ? "border-start/35 bg-start/5"
    : savings.kind === "negative"
      ? "border-goal/35 bg-goal/10"
      : "border-surface-border bg-surface-control";
  const savingsText = savings.kind === "positive"
    ? "text-start"
    : savings.kind === "negative" ? "text-goal" : "text-ink";

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border border-surface-border bg-surface-control px-2.5 py-2 font-mono text-[11px] text-ink-dim">
        {ATSP_METHOD_LABEL[multi.method]} · {ATSP_MODE_LABEL[multi.mode]} · {multi.time_slot} ·{" "}
        {multi.graph === "demo" ? "G_demo" : "G_real"}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={multi.optimal_guarantee ? "ok" : "warn"} className="gap-1">
          {multi.optimal_guarantee && <BadgeCheck className="size-3.5" />}
          {multi.optimal_guarantee ? "Tối ưu tuyệt đối" : "Nghiệm xấp xỉ"}
        </Badge>
        <Badge>{ATSP_METHOD_LABEL[multi.method]}</Badge>
      </div>

      <div className={`rounded-lg border p-3 ${savingsTone}`}>
        <p className="text-xs font-medium text-ink-dim">{savings.label}</p>
        <p className={`mt-1 font-mono text-xl font-bold leading-none ${savingsText}`}>
          {savings.absolutePct === null ? "—" : fmtPct(savings.absolutePct)}
        </p>
        <p className="mt-1.5 text-[11px] leading-4 text-ink-dim">
          So với thứ tự nhập, theo tổng chi phí của tiêu chí {ATSP_MODE_LABEL[multi.mode].toLowerCase()}.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          Trước và sau tối ưu
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ResultSummary
            label="Theo thứ tự nhập"
            totals={multi.original_order_totals}
            costUnit={costUnit}
          />
          <ResultSummary
            label="Sau tối ưu"
            totals={multi.totals}
            costUnit={costUnit}
            emphasized
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="size-4 text-algo-path" />
            Thứ tự ghé sau tối ưu
          </CardTitle>
          <p className="text-[11px] leading-4 text-ink-dim">
            Bắt đầu tại điểm Đi, kết thúc ở điểm giao cuối.
          </p>
        </CardHeader>
        <CardContent>
          <ol aria-label="Thứ tự ghé sau tối ưu">
            {multi.order.map((id, index) => {
              const name = nameOf(id);
              const isStart = index === 0;
              return (
                <li key={`${id}-${index}`} className="relative flex gap-2.5 pb-3 last:pb-0">
                  {index < multi.order.length - 1 && (
                    <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-surface-strong" />
                  )}
                  <span className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold ${isStart
                    ? "bg-start text-white"
                    : "bg-algo-path text-zinc-950"}`}>
                    {isStart ? "Đi" : index}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                      {isStart ? "Điểm Đi" : `Điểm giao ${index}`}
                    </p>
                    <p className="break-words text-xs font-medium leading-5 text-ink" title={name}>
                      {name}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
