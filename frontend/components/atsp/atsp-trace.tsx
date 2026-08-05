"use client";

import { ListTree, Scissors, Thermometer, Waypoints } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { fmtVi } from "@/lib/format";
import {
  classifySaMove,
  conceptualOptimizationOrder,
  isOptimizationFinalEvent,
  saAcceptanceProbability,
} from "@/lib/atsp-trace-policy";
import { useApp } from "@/lib/store";
import type { OptimizationEvent } from "@/lib/types";

type SequenceCue = {
  label: string;
  nodes: string[];
  notation: "order" | "set";
};

function eventSequence(event: OptimizationEvent): SequenceCue {
  if (event.kind === "held_karp_update") {
    return { label: "Tập DP đang xét", nodes: event.subset, notation: "set" };
  }
  const nodes = conceptualOptimizationOrder(event);
  switch (event.kind) {
    case "held_karp_reconstruct":
      return { label: "Thứ tự dựng lại", nodes, notation: "order" };
    case "nn_decision":
      return { label: "Thứ tự NN hiện tại", nodes, notation: "order" };
    case "local_improvement":
      return { label: "Thứ tự sau cải thiện", nodes, notation: "order" };
    case "sa_seed_boundary":
      return { label: "Current solution của seed", nodes, notation: "order" };
    case "sa_iteration":
      return { label: "Current solution sau bước", nodes, notation: "order" };
    case "sa_final_best":
    case "optimization_summary":
      return { label: "Thứ tự cuối", nodes, notation: "order" };
  }
}

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${fmtVi(value, 1)}`;
}

function eventDescription(event: OptimizationEvent): string {
  switch (event.kind) {
    case "held_karp_update": {
      const previous = event.previous_cost === null
        ? "state này chưa có cost cũ"
        : `cost cũ ${fmtVi(event.previous_cost, 1)}`;
      return `Kết thúc tại ${event.endpoint}: thử ${event.predecessor} → ${event.endpoint}, candidate ${fmtVi(event.candidate_cost, 1)}; ${previous}; cost lưu ${fmtVi(event.new_cost, 1)}.`;
    }
    case "held_karp_reconstruct":
      return "Đã dựng lại thứ tự tối ưu từ bảng quy hoạch động.";
    case "nn_decision":
      return `Chọn ${event.selected} từ ${event.candidates.length} ứng viên kế tiếp.`;
    case "local_improvement":
      return `${event.move_type === "2_opt" ? "2-opt" : "Or-opt"}: chi phí giảm từ ${fmtVi(event.before_cost, 1)} xuống ${fmtVi(event.after_cost, 1)}.`;
    case "sa_seed_boundary":
      return `Seed ${event.seed} ${event.boundary === "start" ? "bắt đầu" : "kết thúc"} ở vòng ${event.iteration}: T=${fmtVi(event.temperature, 3)}, current=${fmtVi(event.current_cost, 1)}, best-so-far=${fmtVi(event.best_cost, 1)}.`;
    case "sa_iteration": {
      const probability = saAcceptanceProbability(event.delta, event.temperature);
      const outcome = {
        accepted_non_worse: "candidate không xấu hơn được chấp nhận",
        accepted_worse: "candidate xấu hơn được chấp nhận",
        rejected_worse: "candidate xấu hơn bị từ chối",
      }[classifySaMove(event.delta, event.accepted)];
      const reason = event.sample_reason === "new_best" ? "best-so-far mới" : "mẫu định kỳ";
      return `Seed ${event.seed}, vòng ${event.iteration} (${reason}): T=${fmtVi(event.temperature, 3)}, Delta=${signed(event.delta)}, p=${fmtVi(probability, 4)}; ${outcome}. Current ${fmtVi(event.current_cost, 1)}, candidate ${fmtVi(event.candidate_cost, 1)}, sau bước ${fmtVi(event.resulting_cost, 1)}, best-so-far ${fmtVi(event.best_cost, 1)}.`;
    }
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
  const sequence = eventSequence(event);
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
        {sequence.nodes.length > 0 && (
          <div className="rounded-md border border-surface-border bg-surface-control/80 px-2 py-1.5">
            <p className="text-[10px] leading-4 text-ink-faint">{sequence.label}</p>
            <p className="font-mono text-[11px] leading-5 text-ink">
              {sequence.notation === "set"
                ? `{ ${sequence.nodes.join(", ")} }`
                : sequence.nodes.join(" → ")}
            </p>
          </div>
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
