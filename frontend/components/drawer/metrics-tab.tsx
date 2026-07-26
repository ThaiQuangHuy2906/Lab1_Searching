"use client";

import { Info } from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { GhfTable } from "../ghf-table";
import { useApp } from "@/lib/store";
import { fmtInt, fmtKm, fmtMinutes, fmtMs, fmtPct, fmtVi } from "@/lib/format";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-surface-border p-2.5">
      <div className="text-[11px] text-ink-dim">{label}</div>
      <div className="font-mono text-sm font-bold text-ink">{value}</div>
      {sub && <div className="font-mono text-[10px] text-ink-dim">{sub}</div>}
    </div>
  );
}

export function MetricsTab() {
  const trace = useApp((s) => s.trace);
  const multi = useApp((s) => s.multi);
  const graph = useApp((s) => s.graph);
  const graphData = useApp((s) => s.graphData);

  if (multi?.found && multi.totals && multi.original_order_totals) {
    const nameOf = (id: string) =>
      graphData?.nodes.find((n) => n.id === id)?.name ?? id;
    return (
      <div className="flex flex-col gap-3">
        <Card>
          <CardHeader><CardTitle>Thứ tự giao tối ưu ({multi.method})</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1 text-xs">
            {multi.order.map((id, i) => (
              <div key={id} className="flex items-center gap-2">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-algo-path font-mono text-[10px] font-bold text-surface">
                  {i === 0 ? "Đi" : i}
                </span>
                <span className="truncate">{nameOf(id)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Theo thứ tự nhập" value={fmtMinutes(multi.original_order_totals.total_time_s)}
            sub={fmtKm(multi.original_order_totals.total_distance_m)} />
          <Stat label="Sau tối ưu" value={fmtMinutes(multi.totals.total_time_s)}
            sub={fmtKm(multi.totals.total_distance_m)} />
        </div>
        <div className="rounded-lg bg-start/10 p-3 text-center">
          <span className="text-xs text-ink-dim">Tiết kiệm</span>{" "}
          <span className="font-mono text-lg font-bold text-start">
            {multi.savings_pct !== null ? fmtPct(multi.savings_pct) : "—"}
          </span>
        </div>
        <Badge variant={multi.optimal_guarantee ? "ok" : "warn"} className="w-fit">
          {multi.optimal_guarantee ? "Tối ưu tuyệt đối (Held-Karp)" : "Nghiệm xấp xỉ"}
        </Badge>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-ink-dim">
        <Info className="size-5" />
        <p>Chọn điểm Đi/Đến ở panel trái rồi bấm<br /><b className="text-ink">Chạy thuật toán</b> để xem số liệu.</p>
      </div>
    );
  }

  const m = trace.metrics;
  if (!trace.found) {
    return (
      <div className="rounded-lg border border-goal/40 bg-goal/10 p-3 text-sm">
        Thuật toán không tìm thấy đường ({fmtInt(m.nodes_expanded)} node đã expand).
        Xem tab Giải thích.
      </div>
    );
  }
  const costUnit = trace.mode === "distance" ? "m" : "s";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={m.optimal_guarantee ? "ok" : "warn"}>
          {m.optimal_guarantee
            ? trace.algorithm === "idastar"
              ? `Tối ưu trong ε = ${fmtVi(m.epsilon_bound ?? 5)} s`
              : "Đảm bảo tối ưu"
            : "Không đảm bảo tối ưu"}
        </Badge>
        {m.beam_width != null && <Badge>k = {m.beam_width}</Badge>}
        {m.trace_truncated && <Badge variant="danger">Trace bị cắt ở 5 000 bước</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={`Tổng chi phí (${costUnit})`} value={fmtVi(m.total_cost ?? 0, 1)} />
        <Stat label="Thời gian ước tính" value={fmtMinutes(m.total_time_s ?? 0)}
          sub={`${fmtVi(m.total_time_s ?? 0, 1)} s`} />
        <Stat label="Quãng đường" value={fmtKm(m.total_distance_m ?? 0)} />
        <Stat label="Node đã expand" value={fmtInt(m.nodes_expanded)} />
        <Stat label="Frontier lớn nhất" value={fmtInt(m.max_frontier)} />
        <Stat label="Thời gian chạy" value={fmtMs(m.runtime_ms)} />
      </div>
      {graph === "demo" ? (
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            Bảng g / h / f — frontier tại bước hiện tại
          </div>
          <GhfTable />
        </div>
      ) : (
        <p className="text-xs text-ink-dim">
          Bảng g/h/f chỉ hiển thị trên G_demo (G_real quá lớn để xem từng bước).
        </p>
      )}
    </div>
  );
}
