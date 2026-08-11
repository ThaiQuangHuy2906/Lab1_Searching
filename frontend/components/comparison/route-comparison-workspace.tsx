"use client";

import * as React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

import { RouteMapCanvas, type RouteMapModel } from "@/components/route-map-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { buildRouteMapGeometry } from "@/lib/map-geometry";
import { comparisonGridShape } from "@/lib/comparison-map-policy";
import { usePalette } from "@/lib/use-palette";
import type {
  Algorithm, CompareRun, CompareRunStatus, RouteResultEnvelope,
} from "@/lib/types";

const STATUS_COPY: Record<CompareRunStatus, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  success: "Hoàn tất",
  no_path: "Không có đường",
  error: "Lỗi",
  cancelled: "Đã hủy",
};

function statusVariant(status: CompareRunStatus): "default" | "ok" | "warn" | "danger" {
  if (status === "success") return "ok";
  if (status === "error") return "danger";
  if (status === "no_path" || status === "cancelled") return "warn";
  return "default";
}

interface ComparisonMapPaneProps {
  algorithm: Algorithm;
  run: CompareRun<RouteResultEnvelope> | null;
  baseModel: RouteMapModel;
  geometry: ReturnType<typeof buildRouteMapGeometry> | null;
  className?: string;
}

const ComparisonMapPane = React.memo(function ComparisonMapPane({
  algorithm,
  run,
  baseModel,
  geometry,
  className = "",
}: ComparisonMapPaneProps) {
  const retry = useApp((state) => state.retryRouteComparisonRun);
  const comparing = useApp((state) => state.comparing);
  const palette = usePalette();
  const status = run?.status ?? "queued";
  const result = run?.result?.response ?? null;
  const canRetry = status === "error" || status === "cancelled";
  const statusText = run === null ? "Chưa chạy" : STATUS_COPY[status];
  const model = React.useMemo<RouteMapModel>(
    () => ({ ...baseModel, trace: result }),
    [baseModel, result],
  );

  return (
    <section
      aria-labelledby={`comparison-map-${algorithm}`}
      className={`app-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-surface-border/90 ${className}`}
    >
      <div className="flex min-h-11 shrink-0 items-center gap-2 border-b border-surface-border/80 bg-surface-panel px-3">
        <h3 id={`comparison-map-${algorithm}`} className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
          {ALGO_LABEL[algorithm]}
        </h3>
        {status === "running" && <Loader2 className="size-3.5 animate-spin text-algo-frontier motion-reduce:animate-none" />}
        <Badge variant={statusVariant(status)} className="shrink-0">{statusText}</Badge>
      </div>
      <div className="relative min-h-0 flex-1 bg-surface-map">
        <RouteMapCanvas
          model={model}
          geometry={geometry}
          finalRouteNodeIds={result?.found ? result.path : null}
          palette={palette}
          interactionMode="comparison"
          ariaLabel={`Bản đồ kết quả ${ALGO_LABEL[algorithm]}`}
        />
        {status !== "success" && (
          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-center">
            <div
              role={status === "error" ? "alert" : "status"}
              aria-live="polite"
              aria-busy={status === "running" || undefined}
              className="floating-chrome pointer-events-auto max-w-[min(300px,calc(100%-1rem))] rounded-lg border border-surface-strong/80 px-3 py-2 text-center shadow-float"
            >
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-ink">
                {status === "running" && <Loader2 className="size-3.5 animate-spin text-algo-frontier motion-reduce:animate-none" />}
                {status === "error" && <AlertTriangle className="size-3.5 text-goal" />}
                {status === "queued" && run === null ? "Sẵn sàng chạy trên cùng hành trình" : STATUS_COPY[status]}
              </p>
              {run?.error && <p className="mt-1 text-xs leading-5 text-ink-dim">{run.error}</p>}
              {status === "no_path" && (
                <p className="mt-1 text-xs leading-5 text-ink-dim">Thuật toán hoàn tất nhưng không nối được hành trình này.</p>
              )}
              {canRetry && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  disabled={comparing}
                  aria-label={`Chạy lại ${ALGO_LABEL[algorithm]}`}
                  onClick={() => void retry(algorithm)}
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

export function RouteComparisonWorkspace() {
  const state = useApp();
  const session = state.routeComparisonSession;
  const algorithms = (session?.selectedIds ?? state.routeCompareAlgorithms) as readonly Algorithm[];
  const snapshot = session?.snapshot ?? null;
  const geometry = React.useMemo(
    () => state.graphData
      ? buildRouteMapGeometry(state.graphData.nodes, state.graphData.edges)
      : null,
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
    goal: snapshot?.goal ?? state.goal,
    problemMode: snapshot?.problemMode ?? state.problemMode,
    stops: [...(snapshot?.stops ?? state.stops)],
    activeSnapshot: snapshot,
    pickTarget: null,
    theme: state.theme,
  }), [
    state.graphData, state.graphLoading, state.graph, state.offlineMode,
    state.trafficLayer, state.traffic, state.slot, state.traceOnReal,
    state.edgeOverrides, state.start, state.goal, state.problemMode, state.stops,
    state.theme, snapshot,
  ]);

  const shape = comparisonGridShape(algorithms.length);
  const gridShape = shape === "two_columns"
    ? "grid-cols-2 grid-rows-1"
    : shape === "balanced_three"
      ? "grid-cols-4 grid-rows-2"
      : "grid-cols-2 grid-rows-2";

  return (
    <div
      role="region"
      aria-label="Không gian so sánh nhiều bản đồ"
      className="flex h-full min-h-0 flex-col bg-surface-map pt-14 max-[959px]:pt-16"
    >
      <div className={`grid min-h-0 flex-1 gap-2 p-2 ${gridShape} max-[959px]:grid-cols-1 max-[959px]:grid-rows-none max-[959px]:auto-rows-[minmax(360px,70dvh)] max-[959px]:overflow-y-auto`}>
        {algorithms.map((algorithm, index) => {
          const run = session?.runs.find((candidate) => candidate.id === algorithm) ?? null;
          return (
            <ComparisonMapPane
              key={algorithm}
              algorithm={algorithm}
              run={run}
              baseModel={liveModel}
              geometry={geometry}
              className={shape === "balanced_three"
                ? `col-span-2 ${index === 2 ? "col-start-2" : ""} max-[959px]:col-span-1 max-[959px]:col-start-auto`
                : ""}
            />
          );
        })}
      </div>
    </div>
  );
}
