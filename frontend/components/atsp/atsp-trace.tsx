"use client";

import { ListTree, Scissors, Thermometer, Waypoints } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  describeOptimizationEvent,
  optimizationSamplingLabel,
  optimizationTechnicalSummary,
} from "@/lib/atsp-event-copy";
import { isOptimizationFinalEvent } from "@/lib/atsp-trace-policy";
import { useApp } from "@/lib/store";
import { ATSP_METHOD_LABEL } from "./atsp-copy";

export function AtspTrace() {
  const trace = useApp((state) => state.optimizationTrace);
  const stepIdx = useApp((state) => state.stepIdx);
  const timelineSource = useApp((state) => state.timelineSource);
  const graphData = useApp((state) => state.graphData);
  const resultMode = useApp((state) => state.multi?.mode ?? state.mode);

  if (!trace || timelineSource !== "optimization" || trace.events.length === 0) return null;
  const event = trace.events[Math.min(stepIdx, trace.events.length - 1)];
  const nameOf = (nodeId: string) => graphData?.nodes.find((node) => node.id === nodeId)?.name ?? nodeId;
  const presentation = describeOptimizationEvent(event, nameOf, resultMode);
  const finalEvent = isOptimizationFinalEvent(event.kind);
  const Icon = event.kind.startsWith("sa_") ? Thermometer
    : event.kind === "local_improvement" ? Scissors
      : event.kind === "held_karp_update" ? Waypoints : ListTree;
  const technicalSummary = optimizationTechnicalSummary(event);

  return (
    <Card className="border-algo-path/35 bg-algo-path/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-algo-path" /> Quá trình tối ưu thứ tự ghé
        </CardTitle>
        <p className="text-xs leading-5 text-ink-dim">
          {ATSP_METHOD_LABEL[trace.method]} · Bước {Math.min(stepIdx, trace.events.length - 1) + 1}/{trace.recorded_events}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {trace.trace_truncated && (
          <Badge variant="warn" className="w-fit">Đã lấy mẫu {trace.recorded_events}/{trace.total_events} sự kiện</Badge>
        )}
        <div>
          <h3 className="text-sm font-semibold text-ink">{presentation.title}</h3>
          <p className="mt-1 text-xs leading-5 text-ink-dim">{presentation.description}</p>
        </div>
        {presentation.sequence.length > 0 && (
          <div className="rounded-md border border-surface-border bg-surface-control/80 px-2.5 py-2">
            <p className="text-xs text-ink-dim">{presentation.sequenceLabel}</p>
            <p className="mt-1 break-words text-sm leading-5 text-ink">
              {presentation.notation === "set" ? `{ ${presentation.sequence.join(", ")} }` : presentation.sequence.join(" → ")}
            </p>
          </div>
        )}
        <p className="text-xs leading-5 text-ink-faint">
          {finalEvent
            ? "Từ mốc cuối, bản đồ hiển thị các chặng giao hàng thực tế."
            : "Nét đứt trên bản đồ chỉ minh hoạ thứ tự đang xét, không phải tuyến đường xe chạy."}
        </p>
        <details className="rounded-lg border border-surface-border bg-surface-control/55 px-2.5 py-2 text-xs text-ink-dim">
          <summary className="cursor-pointer font-medium text-ink">Chi tiết kỹ thuật</summary>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 leading-5">
            <dt>Chính sách mẫu</dt><dd className="text-ink">{optimizationSamplingLabel(trace.sampling_policy)}</dd>
            <dt>Sự kiện ghi</dt><dd className="font-mono text-ink">{event.ordinal}</dd>
            {technicalSummary && <><dt>Thông số SA</dt><dd className="font-mono text-ink">{technicalSummary}</dd></>}
          </dl>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-surface-panel p-2 font-mono text-[11px] leading-4 text-ink">{JSON.stringify(event, null, 2)}</pre>
        </details>
      </CardContent>
    </Card>
  );
}
