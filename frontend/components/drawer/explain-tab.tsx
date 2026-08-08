"use client";

// Tab Giải thích (v11 — redesign theo góp ý UI, trên nền v7):
// - tên Đi/Đến không bao giờ bị cắt cụt (wrap thay vì truncate);
// - câu ĐẦU của summary là câu "vì sao" -> in đậm làm lead, phần còn lại
//   xuống tông ink-dim (backend text giữ nguyên từng chữ — chỉ tách câu);
// - badge Đảm bảo tối ưu ngay hàng chips (đồng bộ tab Số liệu/So sánh);
// - card ùn tắc: đếm tổng đoạn + "mức x/5" tô đúng màu thang congestion;
// - card tuyến thay thế: thêm Δ so tuyến chính (xanh nhanh hơn / đỏ chậm
//   hơn) — cùng ngữ nghĩa màu với cột Δ của tab So sánh.

import { ArrowRight, Clock, MessageSquareText, Route as RouteIcon, Sigma } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { AtspExplanation } from "../atsp/atsp-explanation";
import { AtspLoading } from "../atsp/atsp-result";
import { EmptyState } from "./metrics-tab";
import { useApp } from "@/lib/store";
import { routeGuaranteeLabel } from "@/lib/algorithm-policy";
import {
  formatOutcomeMetricValue,
  outcomeMetricsForMode,
  presentationUnitForMode,
  presentRouteNarrative,
  primaryOutcomeMetric,
  rawEpsilonToPresentation,
} from "@/lib/metric-presentation";
import { usePalette } from "@/lib/use-palette";
import { fmtKm, fmtMinutes } from "@/lib/format";
import type { Trace } from "@/lib/types";

const MODE_LABEL = {
  balanced: "Cân bằng", time: "Nhanh nhất", distance: "Ngắn nhất",
} as const;

const fmtDur = fmtMinutes;

/** Signed, colored delta vs the main route; lower = better (greener). */
function Delta({ value, fmt, eps }: {
  value: number; fmt: (x: number) => string; eps: number;
}) {
  if (Math.abs(value) < eps)
    return <span className="text-ink-dim">≈ bằng</span>;
  return (
    <span className={value > 0 ? "text-goal" : "text-start"}>
      {value > 0 ? "+" : "−"}{fmt(Math.abs(value))}
    </span>
  );
}

function AltDeltas({ altTime, altDist, trace }: {
  altTime: number; altDist: number; trace: Trace;
}) {
  const t0 = trace.metrics.total_time_s;
  const d0 = trace.metrics.total_distance_m;
  if (t0 === null || d0 === null) return null;
  return (
    <span className="whitespace-nowrap">
      <span className="text-ink-dim">so tuyến chính: </span>
      <Delta value={altTime - t0} fmt={fmtDur} eps={0.5} />
      <span className="text-ink-dim"> · </span>
      <Delta value={altDist - d0} fmt={fmtKm} eps={10} />
    </span>
  );
}

export function ExplainTab() {
  const trace = useApp((s) => s.trace);
  const sequentialRoute = useApp((s) => s.sequentialRoute);
  const multi = useApp((s) => s.multi);
  const multiRunning = useApp((s) => s.multiRunning);
  const graphData = useApp((s) => s.graphData);
  const P = usePalette();

  if (multiRunning) return <AtspLoading />;
  if (multi) return <AtspExplanation multi={multi} />;

  if (!trace) {
    return (
      <EmptyState icon={MessageSquareText} title="Chưa có giải thích"
        hint="Chạy một thuật toán để đọc phần giải thích lộ trình bằng tiếng Việt." />
    );
  }
  const ex = {
    ...trace.explanation,
    summary_vi: presentRouteNarrative(trace.explanation.summary_vi),
  };
  const nameOf = (id: string) =>
    graphData?.nodes.find((n) => n.id === id)?.name ?? id;
  const startId = sequentialRoute?.waypoints[0] ?? trace.path[0];
  const goalId = sequentialRoute?.waypoints[sequentialRoute.waypoints.length - 1]
    ?? trace.path[trace.path.length - 1];
  const start = startId ? nameOf(startId) : null;
  const goal = goalId ? nameOf(goalId) : null;
  const viaCount = sequentialRoute ? Math.max(0, sequentialRoute.waypoints.length - 2) : 0;
  const costUnit = presentationUnitForMode(trace.mode);
  const primaryMetric = primaryOutcomeMetric(trace.mode);
  const secondaryMetric = outcomeMetricsForMode(trace.mode)[1];
  const primaryValue = trace.metrics[primaryMetric.key] ?? 0;
  const primaryDisplay = formatOutcomeMetricValue(primaryMetric, primaryValue);
  const PrimaryIcon = trace.mode === "distance" ? RouteIcon : trace.mode === "time" ? Clock : Sigma;

  // Lead/body: sentence 1 carries the "why" -> emphasized; the rest is
  // supporting detail. Safe to split on ". " in this copy: Vietnamese
  // numbers use decimal COMMAS, so periods only end sentences.
  const sentences = ex.summary_vi.split(/(?<=\.)\s+/);
  const lead = sentences[0] ?? ex.summary_vi;
  const body = sentences.slice(1).join(" ");

  // gộp các đoạn ùn tắc cùng tên đường: "Hai Bà Trưng · 3 đoạn · mức 4/5"
  const congested = new Map<string, { count: number; level: number }>();
  for (const c of ex.congested_segments) {
    const key = c.name ?? c.edge;
    const cur = congested.get(key);
    congested.set(key, {
      count: (cur?.count ?? 0) + 1,
      level: Math.max(cur?.level ?? 0, c.level),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>
            {trace.found ? "Vì sao chọn tuyến này?" : "Vì sao không có tuyến?"}
          </CardTitle>
          {start && goal && (
            // wrap thay vì truncate: "Chùa Xá Lợi" từng hiện thành "Chùa X…"
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] font-medium leading-snug text-ink">
              <span className="break-words">{start}</span>
              <ArrowRight className="size-3.5 shrink-0 text-ink-dim" />
              <span className="break-words">{goal}</span>
              {viaCount > 0 && (
                <span className="shrink-0 text-xs font-normal text-ink-dim">
                  · qua {viaCount} điểm trung gian
                </span>
              )}
            </div>
          )}
          {trace.found && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>{MODE_LABEL[trace.mode]} · {trace.time_slot}</Badge>
              <Badge className="gap-1 font-mono">
                <PrimaryIcon className="size-3" />
                {primaryDisplay}
              </Badge>
              {secondaryMetric && (
                <Badge className="gap-1 font-mono">
                  <RouteIcon className="size-3" />
                  {formatOutcomeMetricValue(secondaryMetric, trace.metrics[secondaryMetric.key] ?? 0)}
                </Badge>
              )}
              <Badge variant={trace.metrics.optimal_guarantee ? "ok" : "warn"}>
                {routeGuaranteeLabel(
                  trace.algorithm,
                  trace.metrics.optimal_guarantee,
                  rawEpsilonToPresentation(trace.mode, trace.metrics.epsilon_bound),
                  costUnit,
                )}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {sequentialRoute && (
            <ol className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Thứ tự chạy các điểm">
              {sequentialRoute.waypoints.map((nodeId, index) => (
                <li key={`${index}-${nodeId}`} className="flex items-center gap-1.5">
                  <span className="rounded-md border border-surface-border bg-surface-control px-2 py-1 text-xs font-medium text-ink">
                    <span className="mr-1 font-mono text-algo-frontier">{index + 1}.</span>
                    {nameOf(nodeId)}
                  </span>
                  {index < sequentialRoute.waypoints.length - 1 && (
                    <ArrowRight className="size-3 shrink-0 text-ink-faint" />
                  )}
                </li>
              ))}
            </ol>
          )}
          <p className="text-[13px] font-medium leading-6 text-ink">{lead}</p>
          {body && (
            <details className="mt-2 rounded-md bg-surface-control/60 px-2.5 py-2 text-[13px] leading-6 text-ink-dim">
              <summary className="cursor-pointer font-medium text-ink">Xem giải thích đầy đủ</summary>
              <p className="mt-1.5">{body}</p>
            </details>
          )}
        </CardContent>
      </Card>

      {congested.size > 0 && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2">
              Đoạn ùn tắc trên tuyến
              <Badge className="px-1.5 py-0 font-mono text-xs">
                {ex.congested_segments.length}
              </Badge>
            </CardTitle>
            <p className="text-xs leading-5 text-ink-dim">
              Đang tô màu tương ứng trên bản đồ — gộp theo tên đường, lấy mức cao nhất.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {[...congested.entries()]
              .sort((a, b) => b[1].level - a[1].level)
              .map(([name, info]) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="size-2.5 shrink-0 rounded-full"
                    style={{ background: P.congestionHex[info.level] }} />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  {info.count > 1 && (
                    <span className="shrink-0 text-ink-dim">{info.count} đoạn</span>
                  )}
                  <span className="shrink-0 font-mono font-semibold text-ink">
                    mức {info.level}/5
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {ex.alternatives.length > 0 && (
        <p className="px-0.5 text-xs font-bold text-ink-dim">
          Tuyến thay thế đã xét — và vì sao bị loại
        </p>
      )}
      {ex.alternatives.map((alt) => (
        <Card key={alt.label}>
          <CardHeader className="gap-1">
            <CardTitle className="border-l-2 border-algo-frontier pl-2">{alt.label}</CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-ink">
              <span>Chi phí cân bằng: {fmtDur(alt.total_time_s)}</span>
              <span>Quãng đường: {fmtKm(alt.total_distance_m)}</span>
              <AltDeltas altTime={alt.total_time_s} altDist={alt.total_distance_m}
                trace={trace} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-[13px] leading-5 text-ink-dim">{presentRouteNarrative(alt.why_not_vi)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
