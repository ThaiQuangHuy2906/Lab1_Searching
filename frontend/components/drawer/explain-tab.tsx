"use client";

// Tab Giải thích (redesign v7 theo duyệt): card đầu có tuyến + chips số
// liệu quét nhanh, đoạn văn thoáng; đoạn ùn tắc GỘP theo tên đường.

import { ArrowRight, Clock, MessageSquareText, Route as RouteIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { EmptyState } from "./metrics-tab";
import { useApp } from "@/lib/store";
import { usePalette } from "@/lib/use-palette";
import { fmtKm, fmtMinutes } from "@/lib/format";

const MODE_LABEL = {
  balanced: "Cân bằng", time: "Nhanh nhất", distance: "Ngắn nhất",
} as const;

export function ExplainTab() {
  const trace = useApp((s) => s.trace);
  const multi = useApp((s) => s.multi);
  const graphData = useApp((s) => s.graphData);
  const P = usePalette();

  if (!trace) {
    return (
      <EmptyState icon={MessageSquareText} title="Chưa có giải thích"
        hint={multi?.found
          ? "Kết quả tối ưu thứ tự không kèm giải thích lộ trình — xem tab Số liệu; muốn đọc giải thích, chạy tuyến 2 điểm (Đi/Đến) bằng nút Chạy thuật toán."
          : "Chạy một thuật toán để đọc phần giải thích lộ trình bằng tiếng Việt."} />
    );
  }
  const ex = trace.explanation;
  const nameOf = (id: string) =>
    graphData?.nodes.find((n) => n.id === id)?.name ?? id;
  const start = trace.path[0] ? nameOf(trace.path[0]) : null;
  const goal = trace.path.length > 1 ? nameOf(trace.path[trace.path.length - 1]) : null;
  const viaCount = Math.max(0, trace.path.length - 2);

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
          <CardTitle>Vì sao chọn tuyến này?</CardTitle>
          {start && goal && (
            <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <span className="truncate">{start}</span>
              <ArrowRight className="size-3.5 shrink-0 text-ink-dim" />
              <span className="truncate">{goal}</span>
              {viaCount > 0 && (
                <span className="shrink-0 text-xs font-normal text-ink-dim">
                  · {viaCount} điểm trung gian
                </span>
              )}
            </div>
          )}
          {trace.found && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge>{MODE_LABEL[trace.mode]} · {trace.time_slot}</Badge>
              <Badge className="gap-1 font-mono">
                <Clock className="size-3" />
                {fmtMinutes(trace.metrics.total_time_s ?? 0)}
              </Badge>
              <Badge className="gap-1 font-mono">
                <RouteIcon className="size-3" />
                {fmtKm(trace.metrics.total_distance_m ?? 0)}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-[13px] leading-6 text-ink">{ex.summary_vi}</p>
        </CardContent>
      </Card>

      {congested.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Đoạn ùn tắc trên tuyến (đang tô đỏ trên bản đồ)</CardTitle>
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
                  <span className="shrink-0 font-mono text-ink-dim">mức {info.level}/5</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {ex.alternatives.map((alt) => (
        <Card key={alt.label}>
          <CardHeader>
            <CardTitle className="text-algo-frontier">{alt.label}</CardTitle>
            <div className="font-mono text-xs text-ink-dim">
              {fmtMinutes(alt.total_time_s)} · {fmtKm(alt.total_distance_m)}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs leading-relaxed text-ink-dim">{alt.why_not_vi}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
