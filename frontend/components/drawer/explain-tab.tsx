"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useApp } from "@/lib/store";
import { CONGESTION_HEX } from "@/lib/colors";
import { fmtKm, fmtMinutes } from "@/lib/format";

export function ExplainTab() {
  const trace = useApp((s) => s.trace);

  if (!trace) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-ink-dim">
        <Info className="size-5" />
        <p>Chạy một thuật toán để đọc phần giải thích lộ trình bằng tiếng Việt.</p>
      </div>
    );
  }
  const ex = trace.explanation;
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardHeader><CardTitle>Vì sao chọn tuyến này?</CardTitle></CardHeader>
        <CardContent>
          <p className="text-[13px] leading-relaxed text-ink">{ex.summary_vi}</p>
        </CardContent>
      </Card>

      {ex.congested_segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Đoạn ùn tắc trên tuyến (đang tô đỏ trên bản đồ)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {ex.congested_segments.map((c) => (
              <div key={c.edge} className="flex items-center gap-2 text-xs">
                <span className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CONGESTION_HEX[c.level] }} />
                <span className="min-w-0 flex-1 truncate">{c.name ?? c.edge}</span>
                <span className="font-mono text-ink-dim">mức {c.level}/5</span>
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
