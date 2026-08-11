"use client";

import {
  AlertTriangle, BadgeCheck, Clock, Gauge, Layers, MousePointerClick, Network,
  RefreshCw, Route as RouteIcon, Sigma, Timer,
} from "lucide-react";
import { AppliedScenarioDetails } from "../applied-scenario-details";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { InfoTip } from "../ui/info-tip";
import { GhfTable } from "../ghf-table";
import { AtspLoading, AtspResult } from "../atsp/atsp-result";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { routeGuaranteeLabel } from "@/lib/algorithm-policy";
import {
  formatOutcomeMetricValue,
  outcomeMetricsForMode,
  rawEpsilonToPresentation,
  type OutcomeMetric,
} from "@/lib/metric-presentation";
import { MODE_PRESENTATION } from "@/lib/ui-copy";
import { fmtInt, fmtMs } from "@/lib/format";

function Stat({ icon: Icon, label, value, sub, tip, emphasis = "effort" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string; tip?: string;
  emphasis?: "primary" | "secondary" | "effort";
}) {
  const valueClass = emphasis === "primary" ? "text-xl" : emphasis === "secondary" ? "text-base" : "text-[15px]";
  return (
    <div className={`rounded-lg border p-2.5 ${emphasis === "primary" ? "border-algo-frontier/35 bg-algo-frontier/5" : "border-surface-border bg-surface-control/70"}`}>
      <div className="flex items-start gap-1.5 text-xs leading-4 text-ink-dim">
        <Icon className="size-3.5 shrink-0" />
        <span className="min-w-0">{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      <div className={`mt-1 font-mono font-bold leading-tight text-ink ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-xs leading-4 text-ink-dim">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; hint: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-surface-strong bg-surface-panel px-4 py-7 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-surface-control text-algo-frontier"><Icon className="size-5" /></span>
      <p className="text-sm font-medium text-ink">{title}</p>
      <div className="text-xs leading-5 text-ink-dim">{hint}</div>
    </div>
  );
}

function MultiLegSummary() {
  const sequentialRoute = useApp((state) => state.sequentialRoute);
  const graphData = useApp((state) => state.graphData);
  if (!sequentialRoute) return null;

  return (
    <div className="rounded-lg border border-algo-frontier/30 bg-algo-frontier/5 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink-dim">Hành trình nhiều điểm</p>
        <Badge className="shrink-0 font-mono">{sequentialRoute.legs.length} chặng</Badge>
      </div>
      <ol className="flex flex-col gap-1.5">
        {sequentialRoute.legs.map((leg) => {
          const from = graphData?.nodes.find((node) => node.id === leg.from_node)?.name ?? leg.from_node;
          const to = graphData?.nodes.find((node) => node.id === leg.to_node)?.name ?? leg.to_node;
          return (
            <li key={`${leg.index}-${leg.from_node}-${leg.to_node}`} className="flex items-center gap-2 rounded-md bg-surface-control/75 px-2 py-1.5 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-algo-frontier font-mono text-[11px] font-bold text-zinc-950">{leg.index + 1}</span>
              <span className="min-w-0 flex-1 break-words text-ink">{from} <span className="text-ink-dim">→</span> {to}</span>
              <Badge variant={leg.found ? "ok" : "danger"} className="shrink-0 px-1.5 py-0 text-xs">{leg.found ? "Đã tìm" : "Không có đường"}</Badge>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function MetricsTab() {
  const trace = useApp((state) => state.trace);
  const multi = useApp((state) => state.multi);
  const multiRunning = useApp((state) => state.multiRunning);
  const graph = useApp((state) => state.graph);
  const graphData = useApp((state) => state.graphData);
  const stops = useApp((state) => state.stops);
  const problemMode = useApp((state) => state.problemMode);
  const singleRunError = useApp((state) => state.singleRunError);
  const runRoute = useApp((state) => state.runRoute);
  const runMulti = useApp((state) => state.runMulti);
  const tspMethod = useApp((state) => state.tspMethod);

  if (multiRunning) return <AtspLoading />;
  if (singleRunError) {
    return (
      <div role="alert" aria-live="assertive" className="rounded-lg border border-goal/40 bg-goal/10 p-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-goal" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-ink">
              {singleRunError.kind === "atsp" ? "Không thể tối ưu thứ tự" : "Không thể chạy tìm đường"}
            </h3>
            <p className="mt-1 break-words text-xs leading-5 text-ink-dim">{singleRunError.message}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => singleRunError.kind === "atsp"
                ? void runMulti(tspMethod) : void runRoute()}
            >
              <RefreshCw /> Chạy lại
            </Button>
          </div>
        </div>
      </div>
    );
  }
  if (multi) return <AtspResult multi={multi} graphData={graphData} />;

  if (!trace) {
    const isDemo = graph === "demo";
    const hasStops = problemMode === "multi_point";
    return (
      <div className="flex flex-col gap-3">
        <EmptyState
          icon={MousePointerClick}
          title={hasStops ? "Chưa có hành trình nhiều điểm" : "Chưa có kết quả"}
          hint={hasStops ? (
            <ol className="mx-auto max-w-60 list-decimal space-y-1 pl-5 text-left">
              <li>Đã có điểm <b>Đi</b> và {stops.length} điểm giao.</li>
              <li>Dùng <b className="text-ink">Chạy qua {stops.length} điểm giao</b> để đi theo thứ tự đã nhập.</li>
              <li>Hoặc chọn <b className="text-ink">Tối ưu thứ tự ghé</b> ở panel trái để chạy ATSP.</li>
            </ol>
          ) : (
            <ol className="mx-auto max-w-60 list-decimal space-y-1 pl-5 text-left">
              <li>Chọn điểm <b>Đi</b> và <b>Đến</b> {isDemo ? "theo tên địa danh" : <>bằng nút <b>Chọn trên bản đồ</b></>}.</li>
              <li>Bấm nút <b className="text-ink">Chạy</b>.</li>
              <li>Dùng timeline để xem từng bước.</li>
            </ol>
          )}
        />
        <div className="flex flex-col gap-1.5 rounded-lg border border-surface-border bg-surface-control/70 p-3">
          <p className="text-xs font-bold text-ink-dim">Mẹo demo</p>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-xs leading-5 text-ink-dim">
            <li>Đổi <b className="text-ink">Khung giờ</b> rồi chạy lại để thấy tuyến có thể thay đổi.</li>
            <li>Tab <b className="text-ink">So sánh</b> đặt hai thuật toán trên cùng một hành trình.</li>
            <li>Thêm ít nhất hai <b className="text-ink">điểm giao</b> để tối ưu thứ tự ghé bất đối xứng.</li>
          </ul>
        </div>
      </div>
    );
  }

  const metrics = trace.metrics;
  const presentation = MODE_PRESENTATION[trace.mode];
  const unit = presentation.unit;
  const methodName = ALGO_LABEL[trace.algorithm];

  if (!trace.found) {
    return (
      <div className="flex flex-col gap-3">
        <div role="alert" className="rounded-lg border border-goal/40 bg-goal/10 p-3">
          <p className="text-sm font-semibold text-ink">Không tìm thấy đường đi phù hợp</p>
          <p className="mt-1 text-xs leading-5 text-ink-dim">Thuật toán đã duyệt {fmtInt(metrics.nodes_expanded)} điểm nhưng không nối được hành trình đã chọn.</p>
          <p className="mt-2 text-xs leading-5 text-ink">Hãy đổi điểm Đi/Đến hoặc khung giờ, rồi chạy lại. Tab Giải thích giữ nguyên lý do từ phản hồi hiện tại.</p>
        </div>
        <AppliedScenarioDetails scenario={trace.applied_scenario} />
      </div>
    );
  }

  const outcomeMetrics = outcomeMetricsForMode(trace.mode);
  const primaryMetric = outcomeMetrics[0];
  const secondaryMetric = outcomeMetrics[1];
  const metricValue = (metric: OutcomeMetric) => metrics[metric.key] ?? 0;
  const formatMetric = (metric: OutcomeMetric) => formatOutcomeMetricValue(metric, metricValue(metric));
  const primarySub = trace.mode === "balanced"
    ? "Đã gồm phạt rủi ro."
    : trace.mode === "time"
      ? "Không cộng phạt rủi ro."
      : undefined;
  const PrimaryIcon = trace.mode === "distance" ? RouteIcon : trace.mode === "time" ? Clock : Sigma;

  return (
    <div className="flex flex-col gap-3">
      <div role="status" aria-live="polite" className="rounded-lg border border-start/35 bg-start/5 p-3">
        <p className="text-sm font-semibold text-ink">Đã tìm thấy tuyến</p>
        <p className="mt-1 text-xs leading-5 text-ink-dim">{methodName} · {presentation.label} · {trace.time_slot} · {trace.graph === "demo" ? "G_demo" : "G_real"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={metrics.optimal_guarantee ? "ok" : "warn"} className="gap-1">
          {metrics.optimal_guarantee && <BadgeCheck className="size-3.5" />}
          {routeGuaranteeLabel(
            trace.algorithm,
            metrics.optimal_guarantee,
            rawEpsilonToPresentation(trace.mode, metrics.epsilon_bound),
            unit,
          )}
        </Badge>
        {metrics.beam_width != null && <Badge>k = {metrics.beam_width}</Badge>}
        {metrics.trace_truncated && <Badge variant="warn">Nhật ký hiển thị tối đa 5.000 bước</Badge>}
      </div>

      <div className={`grid gap-2 ${secondaryMetric ? "grid-cols-2 max-[639px]:grid-cols-1" : "grid-cols-1"}`}>
        <Stat icon={PrimaryIcon} label={primaryMetric.label} value={formatMetric(primaryMetric)} sub={primarySub} emphasis="primary" tip="Đây là giá trị mà thuật toán đang tối ưu theo tiêu chí đã chọn." />
        {secondaryMetric && (
          <Stat icon={RouteIcon} label={secondaryMetric.label} value={formatMetric(secondaryMetric)} emphasis="secondary" />
        )}
      </div>

      <MultiLegSummary />

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-ink-dim">Công sức tìm kiếm</p>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Network} label="Số điểm đã duyệt" value={fmtInt(metrics.nodes_expanded)} tip="Số điểm thuật toán đã mở để xét; ít hơn thường dùng ít công sức hơn." />
          <Stat icon={Layers} label="Số điểm chờ lớn nhất" value={fmtInt(metrics.max_frontier)} tip="Kích thước lớn nhất của tập điểm đang chờ xét; phản ánh bộ nhớ tìm kiếm." />
          <Stat icon={Timer} label="Thời gian xử lý" value={fmtMs(metrics.runtime_ms)} />
        </div>
      </div>

      {graph === "demo" ? (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-ink-dim">
            <Gauge className="size-3.5" /> Bảng chi phí tại bước đang xem
            <InfoTip text="Các giá trị g, h, f chỉ xuất hiện khi thuật toán thực sự cung cấp chúng ở bước timeline đang chọn." />
          </div>
          <GhfTable />
        </div>
      ) : (
        <p className="text-xs leading-5 text-ink-dim">Bảng g/h/f chỉ phù hợp với G_demo. Trên G_real, dùng timeline để quan sát từng bước đã ghi.</p>
      )}

      <AppliedScenarioDetails scenario={trace.applied_scenario} />
    </div>
  );
}
