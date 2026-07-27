"use client";

// Tab Giải thích (v11 — redesign theo góp ý UI, trên nền v7):
// - tên Đi/Đến không bao giờ bị cắt cụt (wrap thay vì truncate);
// - câu ĐẦU của summary là câu "vì sao" -> in đậm làm lead, phần còn lại
//   xuống tông ink-dim (backend text giữ nguyên từng chữ — chỉ tách câu);
// - badge Đảm bảo tối ưu ngay hàng chips (đồng bộ tab Số liệu/So sánh);
// - card ùn tắc: đếm tổng đoạn + "mức x/5" tô đúng màu thang congestion;
// - card tuyến thay thế: thêm Δ so tuyến chính (xanh nhanh hơn / đỏ chậm
//   hơn) — cùng ngữ nghĩa màu với cột Δ của tab So sánh.

import { ArrowRight, Clock, MessageSquareText, Route as RouteIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { EmptyState } from "./metrics-tab";
import { useApp } from "@/lib/store";
import { usePalette } from "@/lib/use-palette";
import { fmtKm, fmtMinutes, fmtSeconds } from "@/lib/format";
import type { Trace } from "@/lib/types";

const MODE_LABEL = {
  balanced: "Cân bằng", time: "Nhanh nhất", distance: "Ngắn nhất",
} as const;

const fmtDur = (s: number) => (s >= 90 ? fmtMinutes(s) : fmtSeconds(s));

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
                <Clock className="size-3" />
                {fmtDur(trace.metrics.total_time_s ?? 0)}
              </Badge>
              <Badge className="gap-1 font-mono">
                <RouteIcon className="size-3" />
                {fmtKm(trace.metrics.total_distance_m ?? 0)}
              </Badge>
              <Badge variant={trace.metrics.optimal_guarantee ? "ok" : "warn"}>
                {trace.metrics.optimal_guarantee ? "Đảm bảo tối ưu" : "Không đảm bảo tối ưu"}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-[13px] font-medium leading-6 text-ink">{lead}</p>
          {body && (
            <p className="mt-1.5 text-[13px] leading-6 text-ink-dim">{body}</p>
          )}
        </CardContent>
      </Card>

      {congested.size > 0 && (
        <Card>
          <CardHeader className="gap-1">
            <CardTitle className="flex items-center gap-2">
              Đoạn ùn tắc trên tuyến
              <Badge className="px-1.5 py-0 font-mono text-[10px]">
                {ex.congested_segments.length}
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-ink-dim">
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
                  <span className="shrink-0 font-mono font-semibold"
                    style={{ color: P.congestionHex[info.level] }}>
                    mức {info.level}/5
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {ex.alternatives.length > 0 && (
        <p className="px-0.5 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          Tuyến thay thế đã xét — và vì sao bị loại
        </p>
      )}
      {ex.alternatives.map((alt) => (
        <Card key={alt.label}>
          <CardHeader className="gap-1">
            <CardTitle className="text-algo-frontier">{alt.label}</CardTitle>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-ink">
              {fmtDur(alt.total_time_s)} · {fmtKm(alt.total_distance_m)}
              <AltDeltas altTime={alt.total_time_s} altDist={alt.total_distance_m}
                trace={trace} />
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
