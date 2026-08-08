"use client";

import { BadgeCheck, BookOpenText, Clock, Route as RouteIcon, Sigma } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { fmtPct } from "@/lib/format";
import { describeAtspSavings } from "@/lib/atsp-savings";
import { formatOutcomeMetricValue, isDistanceOutcomeMetric, outcomeMetricsForMode, primaryOutcomeMetric, type OutcomeMetric } from "@/lib/metric-presentation";
import type { MultirouteResponse } from "@/lib/types";
import {
  ATSP_METHOD_EXPLANATION,
  ATSP_METHOD_LABEL,
  ATSP_MODE_LABEL,
} from "./atsp-copy";

function outcomeFormatter(metric: OutcomeMetric) {
  return (value: number) => formatOutcomeMetricValue(metric, value);
}

function ChangeRow({ icon: Icon, label, before, after, format, epsilon }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  before: number;
  after: number;
  format: (value: number) => string;
  epsilon: number;
}) {
  const delta = after - before;
  const unchanged = Math.abs(delta) < epsilon;
  const improved = delta < 0;
  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface-control px-2.5 py-2 text-xs">
      <Icon className="size-3.5 shrink-0 text-ink-dim" />
      <span className="min-w-0 flex-1 text-ink-dim">{label}</span>
      <span className="whitespace-nowrap font-mono text-ink">
        {format(before)} → {format(after)}
      </span>
      <span className={`whitespace-nowrap font-mono font-semibold ${unchanged
        ? "text-ink-dim"
        : improved ? "text-start" : "text-goal"}`}>
        {unchanged ? "≈ giữ nguyên" : `${improved ? "−" : "+"}${format(Math.abs(delta))}`}
      </span>
    </div>
  );
}

export function AtspExplanation({ multi }: { multi: MultirouteResponse }) {
  if (!multi.found || !multi.totals || !multi.original_order_totals) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-control p-3">
        <p className="text-sm font-semibold text-ink">Chưa có lộ trình ATSP để giải thích</p>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Kết quả hiện tại không chứa một hành trình đầy đủ qua tất cả điểm giao. Hãy kiểm tra
          lại điểm đã chọn hoặc thử phương pháp khác.
        </p>
      </div>
    );
  }

  const before = multi.original_order_totals;
  const after = multi.totals;
  const savings = describeAtspSavings(multi.savings_pct);
  const primary = primaryOutcomeMetric(multi.mode);
  const secondary = outcomeMetricsForMode(multi.mode)[1];
  const primaryFormatter = outcomeFormatter(primary);
  const secondaryFormatter = secondary
    ? outcomeFormatter(secondary)
    : null;
  const PrimaryIcon = multi.mode === "distance" ? RouteIcon : multi.mode === "time" ? Clock : Sigma;
  const tradeOffCopy = multi.mode === "distance"
    ? "Tiêu chí này ưu tiên độ dài, không khẳng định chi phí cân bằng thấp nhất."
    : "Quãng đường không bắt buộc cùng giảm khi thứ tự được tối ưu theo tiêu chí này.";

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border border-surface-border bg-surface-control px-2.5 py-2 text-xs text-ink-dim">
        {ATSP_METHOD_LABEL[multi.method]} · {ATSP_MODE_LABEL[multi.mode]} · {multi.time_slot} ·{" "}
        {multi.graph === "demo" ? "G_demo" : "G_real"}
      </p>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <BookOpenText className="size-4 text-algo-path" />
            Kết quả này được tạo như thế nào?
          </CardTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={multi.optimal_guarantee ? "ok" : "warn"} className="gap-1">
              {multi.optimal_guarantee && <BadgeCheck className="size-3.5" />}
              {multi.optimal_guarantee ? "Tối ưu tuyệt đối" : "Nghiệm xấp xỉ"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] leading-6 text-ink">
            {ATSP_METHOD_EXPLANATION[multi.method]}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-ink-dim">
            Hệ thống ưu tiên <b className="text-ink">{primary.label.toLowerCase()}</b>. {tradeOffCopy}
            {" "}Chi phí mỗi chiều có thể khác nhau vì đây là đồ thị đường một chiều, bất đối xứng.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>Tác động của thứ tự mới</CardTitle>
          <p className="text-xs leading-5 text-ink-dim">
            So trực tiếp với đúng thứ tự điểm giao người dùng đã nhập.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <div className={`rounded-lg border px-2.5 py-2 ${savings.kind === "positive"
            ? "border-start/35 bg-start/5"
            : savings.kind === "negative"
              ? "border-goal/35 bg-goal/10"
              : "border-surface-border bg-surface-control"}`}>
            <p className="text-xs text-ink-dim">{savings.label}</p>
            <p className={`mt-0.5 font-mono text-lg font-bold ${savings.kind === "positive"
              ? "text-start"
              : savings.kind === "negative" ? "text-goal" : "text-ink"}`}>
              {savings.absolutePct === null ? "—" : fmtPct(savings.absolutePct)}
            </p>
          </div>
          <ChangeRow icon={PrimaryIcon} label={primary.label} before={before[primary.key]}
            after={after[primary.key]} format={primaryFormatter}
            epsilon={isDistanceOutcomeMetric(primary) ? 10 : 0.5} />
          {secondary && secondaryFormatter && (
            <ChangeRow icon={RouteIcon} label={secondary.label} before={before[secondary.key]}
              after={after[secondary.key]} format={secondaryFormatter} epsilon={10} />
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
        <p className="text-xs font-bold text-ink-dim">Cách đọc hành trình</p>
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-xs leading-5 text-ink-dim">
          <li>Điểm đầu là <b className="text-ink">Đi</b>; các số tiếp theo là thứ tự giao tối ưu.</li>
          <li>Hành trình kết thúc ở điểm giao cuối, không tự quay lại điểm Đi.</li>
          <li>Badge tối ưu/xấp xỉ lấy trực tiếp từ đảm bảo của kết quả hiện tại.</li>
        </ul>
      </div>
    </div>
  );
}
