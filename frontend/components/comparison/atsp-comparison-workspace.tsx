"use client";

import * as React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { ATSP_METHOD_LABEL } from "@/components/atsp/atsp-copy";
import { RouteMapCanvas, type RouteMapModel } from "@/components/route-map-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { describeAtspSavings } from "@/lib/atsp-savings";
import { fmtPct } from "@/lib/format";
import { buildRouteMapGeometry } from "@/lib/map-geometry";
import { comparisonGridShape } from "@/lib/comparison-map-policy";
import { formatOutcomeMetricValue, primaryOutcomeMetric } from "@/lib/metric-presentation";
import { useApp } from "@/lib/store";
import type {
  AtspResultEnvelope, CompareRun, CompareRunStatus, MultirouteResponse, TspMethod,
} from "@/lib/types";
import { usePalette } from "@/lib/use-palette";

const STATUS_COPY: Record<CompareRunStatus, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  success: "Hoàn tất",
  no_path: "Không đủ đường",
  error: "Lỗi",
  cancelled: "Đã hủy",
};

function statusVariant(status: CompareRunStatus): "default" | "ok" | "warn" | "danger" {
  if (status === "success") return "ok";
  if (status === "error") return "danger";
  if (status === "no_path" || status === "cancelled") return "warn";
  return "default";
}

function failureCopy(
  response: MultirouteResponse | null,
  nameOf: (nodeId: string) => string,
): string {
  if (response?.contract_version === 2 && !response.found) {
    return `Ma trận có hướng thiếu đường ${nameOf(response.failure.from_node)} → ${nameOf(response.failure.to_node)}. Hãy đổi tập điểm hoặc kịch bản đường.`;
  }
  return "Không dựng được hành trình hợp lệ qua toàn bộ điểm giao.";
}

function savingsCopy(response: MultirouteResponse): string {
  const savings = describeAtspSavings(response.savings_pct);
  if (savings.kind === "unavailable" || savings.absolutePct === null) return "Savings —";
  if (savings.kind === "positive") return `Giảm ${fmtPct(savings.absolutePct)}`;
  if (savings.kind === "negative") return `Tăng ${fmtPct(savings.absolutePct)}`;
  return "Không đổi so với baseline";
}

const AtspMapPane = React.memo(function AtspMapPane({
  method,
  run,
  model,
  geometry,
  className = "",
  nameOf,
}: {
  method: TspMethod;
  run: CompareRun<AtspResultEnvelope> | null;
  model: RouteMapModel;
  geometry: ReturnType<typeof buildRouteMapGeometry> | null;
  className?: string;
  nameOf: (nodeId: string) => string;
}) {
  const retry = useApp((state) => state.retryAtspComparisonRun);
  const comparing = useApp((state) => state.comparing);
  const palette = usePalette();
  const status = run?.status ?? "queued";
  const response = run?.result?.response ?? null;
  const retryable = status === "error" || status === "cancelled";
  const primary = response?.found && response.totals
    ? primaryOutcomeMetric(response.mode) : null;
  const mapModel = React.useMemo<RouteMapModel>(
    () => ({ ...model, multi: response }),
    [model, response],
  );

  return (
    <section
      aria-labelledby={`atsp-comparison-map-${method}`}
      className={`app-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-surface-border/90 ${className}`}
    >
      <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-surface-border/80 bg-surface-panel px-3">
        <h3 id={`atsp-comparison-map-${method}`} className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
          {ATSP_METHOD_LABEL[method]}
        </h3>
        {status === "running" && <Loader2 className="size-3.5 animate-spin text-algo-frontier motion-reduce:animate-none" />}
        <Badge variant={statusVariant(status)} className="shrink-0">
          {run === null ? "Chưa chạy" : STATUS_COPY[status]}
        </Badge>
      </div>
      {response?.found && response.totals && primary && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-surface-border/70 bg-surface-control/80 px-3 py-2 text-xs">
          <Badge variant={response.optimal_guarantee ? "ok" : "warn"}>
            {response.optimal_guarantee ? "Exact trong cấu hình này" : "Heuristic"}
          </Badge>
          <Badge>{response.contract_version === 2 && response.return_to_start ? "Vòng kín" : "Hành trình mở"}</Badge>
          <span className="font-mono font-semibold text-ink">
            {primary.label}: {formatOutcomeMetricValue(primary, response.totals[primary.key])}
          </span>
          <span className="text-ink-dim">{savingsCopy(response)}</span>
        </div>
      )}
      <div className="relative min-h-0 flex-1 bg-surface-map">
        <RouteMapCanvas
          model={mapModel}
          geometry={geometry}
          palette={palette}
          interactionMode="comparison"
          ariaLabel={`Bản đồ kết quả ${ATSP_METHOD_LABEL[method]}`}
        />
        {status !== "success" && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-center">
            <div
              role={status === "error" ? "alert" : "status"}
              aria-live="polite"
              aria-busy={status === "running" || undefined}
              className="floating-chrome pointer-events-auto max-w-[min(320px,calc(100%-1rem))] rounded-lg border border-surface-strong/80 px-3 py-2 text-center shadow-float"
            >
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-ink">
                {status === "running" && <Loader2 className="size-3.5 animate-spin text-algo-frontier motion-reduce:animate-none" />}
                {status === "error" && <AlertTriangle className="size-3.5 text-goal" />}
                {status === "queued" && run === null ? "Sẵn sàng chạy cùng snapshot" : STATUS_COPY[status]}
              </p>
              {run?.error && <p className="mt-1 text-xs leading-5 text-ink-dim">{run.error}</p>}
              {status === "no_path" && (
                <p className="mt-1 text-xs leading-5 text-ink-dim">{failureCopy(response, nameOf)}</p>
              )}
              {retryable && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={comparing}
                  aria-label={`Chạy lại ${ATSP_METHOD_LABEL[method]}`}
                  onClick={() => void retry(method)}
                >
                  <RefreshCw /> Chạy lại
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export function AtspComparisonWorkspace() {
  const state = useApp();
  const session = state.atspComparisonSession;
  const methods = (session?.selectedIds ?? state.atspCompareMethods) as readonly TspMethod[];
  const snapshot = session?.snapshot ?? null;
  const geometry = React.useMemo(
    () => state.graphData
      ? buildRouteMapGeometry(state.graphData.nodes, state.graphData.edges)
      : null,
    [state.graphData],
  );
  const nameOf = React.useCallback(
    (nodeId: string) => state.graphData?.nodes.find((node) => node.id === nodeId)?.name ?? nodeId,
    [state.graphData],
  );

  const liveModel = React.useMemo<RouteMapModel>(() => ({
    graphData: state.graphData,
    graphLoading: state.graphLoading,
    graph: state.graph,
    offline: state.offlineMode,
    trafficLayer: state.trafficLayer,
    traffic: state.traffic,
    slot: state.slot,
    traceOnReal: state.traceOnReal,
    edgeOverrides: state.edgeOverrides,
    edgeEditMode: false,
    selectedEdgeId: null,
    trace: null,
    multi: null,
    optimizationTrace: null,
    timelineSource: null,
    stepIdx: 0,
    drawerTab: "compare",
    start: snapshot?.start ?? state.start,
    goal: null,
    problemMode: "multi_point",
    stops: [...(snapshot?.stops ?? state.stops)],
    activeSnapshot: snapshot,
    pickTarget: null,
    theme: state.theme,
  }), [
    state.graphData, state.graphLoading, state.graph, state.offlineMode,
    state.trafficLayer, state.traffic, state.slot, state.traceOnReal,
    state.edgeOverrides, state.start, state.stops, state.theme, snapshot,
  ]);

  const shape = comparisonGridShape(methods.length);
  const gridShape = shape === "two_columns"
    ? "grid-cols-2 grid-rows-1"
    : "grid-cols-4 grid-rows-2";

  return (
    <div
      role="region"
      aria-label="Không gian so sánh phương pháp ATSP"
      className="flex h-full min-h-0 flex-col bg-surface-map pt-14 max-[959px]:pt-16"
    >
      <div className={`grid min-h-0 flex-1 gap-2 p-2 ${gridShape} max-[959px]:grid-cols-1 max-[959px]:grid-rows-none max-[959px]:auto-rows-[minmax(360px,70dvh)] max-[959px]:overflow-y-auto`}>
        {methods.map((method, index) => (
          <AtspMapPane
            key={method}
            method={method}
            run={session?.runs.find((candidate) => candidate.id === method) ?? null}
            model={liveModel}
            geometry={geometry}
            nameOf={nameOf}
            className={shape === "balanced_three"
              ? `col-span-2 ${index === 2 ? "col-start-2" : ""} max-[959px]:col-span-1 max-[959px]:col-start-auto`
              : ""}
          />
        ))}
      </div>
    </div>
  );
}
