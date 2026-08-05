"use client";

import { ListTree, Scissors, Thermometer, Waypoints } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { fmtVi } from "@/lib/format";
import { isOptimizationFinalEvent } from "@/lib/atsp-trace-policy";
import { useApp } from "@/lib/store";
import type { OptimizationEvent } from "@/lib/types";

function eventOrder(event: OptimizationEvent): string[] {
  switch (event.kind) {
    case "held_karp_update": return event.subset;
    case "held_karp_reconstruct": return event.order;
    case "nn_decision": return event.order;
    case "local_improvement": return event.after_order;
    case "sa_seed_boundary": return event.best_order;
    case "sa_iteration": return event.best_order;
    case "sa_final_best": return event.final_order;
    case "optimization_summary": return event.final_order;
  }
}

function eventDescription(event: OptimizationEvent): string {
  switch (event.kind) {
    case "held_karp_update":
      return `DP: ${event.predecessor} → ${event.endpoint}; chi phí mới ${fmtVi(event.new_cost, 1)}.`;
    case "held_karp_reconstruct":
      return "Đã dựng lại thứ tự tối ưu từ bảng quy hoạch động.";
    case "nn_decision":
      return `Chọn ${event.selected} từ ${event.candidates.length} ứng viên kế tiếp.`;
    case "local_improvement":
      return `${event.move_type === "2_opt" ? "2-opt" : "Or-opt"}: chi phí giảm từ ${fmtVi(event.before_cost, 1)} xuống ${fmtVi(event.after_cost, 1)}.`;
    case "sa_seed_boundary":
      return `Seed ${event.seed} ${event.boundary === "start" ? "bắt đầu" : "kết thúc"} ở vòng ${event.iteration}.`;
    case "sa_iteration":
      return `Seed ${event.seed}, vòng ${event.iteration}: ${event.sample_reason === "new_best" ? "nghiệm tốt mới" : "mẫu tuần hoàn"}.`;
    case "sa_final_best":
      return `Chọn nghiệm tốt nhất của 5 seed: ${fmtVi(event.final_cost, 1)}.`;
    case "optimization_summary":
      return `Tóm tắt kết quả cuối: ${fmtVi(event.final_cost, 1)}.`;
  }
}

function samplingLabel(policy: string) {
  if (policy === "all-or-stride-v1") return "giữ toàn bộ hoặc lấy mẫu stride xác định";
  if (policy === "chronological-prefix-final-v1") return "theo thời gian, luôn giữ tóm tắt cuối";
  return "ưu tiên seed/mốc tốt, lấy mẫu mỗi 20 vòng";
}

export function AtspTrace() {
  const trace = useApp((s) => s.optimizationTrace);
  const stepIdx = useApp((s) => s.stepIdx);
  const timelineSource = useApp((s) => s.timelineSource);

  if (!trace || timelineSource !== "optimization" || trace.events.length === 0) return null;
  const event = trace.events[Math.min(stepIdx, trace.events.length - 1)];
  const order = eventOrder(event);
  const isFinalEvent = isOptimizationFinalEvent(event.kind);
  const Icon = event.kind.startsWith("sa_")
    ? Thermometer
    : event.kind === "local_improvement" ? Scissors
      : event.kind === "held_karp_update" ? Waypoints : ListTree;

  return (
    <Card className="border-algo-path/35 bg-algo-path/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-algo-path" />
          Quá trình tối ưu thứ tự ghé
        </CardTitle>
        <p className="text-[11px] leading-4 text-ink-dim">
          {trace.method} · bước {Math.min(stepIdx, trace.events.length - 1) + 1}/{trace.recorded_events}
          {" · "}event #{event.ordinal} · {trace.recorded_events}/{trace.total_events} event
          {" · "}{samplingLabel(trace.sampling_policy)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{event.kind}</Badge>
          {trace.trace_truncated && <Badge variant="warn">Đã lấy mẫu {trace.recorded_events}/{trace.total_events} event</Badge>}
        </div>
        <p className="text-xs leading-5 text-ink-dim">{eventDescription(event)}</p>
        {order.length > 0 && (
          <p className="rounded-md border border-surface-border bg-surface-control/80 px-2 py-1.5 font-mono text-[11px] leading-5 text-ink">
            {order.join(" → ")}
          </p>
        )}
        <p className="text-[10px] leading-4 text-ink-faint">
          {isFinalEvent
            ? "Từ mốc cuối, bản đồ hiển thị các chặng đường giao hàng thực tế."
            : "Nét đứt trên bản đồ chỉ minh hoạ thứ tự đang xét, không phải tuyến đường xe chạy."}
        </p>
      </CardContent>
    </Card>
  );
}
