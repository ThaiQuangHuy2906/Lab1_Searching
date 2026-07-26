"use client";

import {
  Clock, Gauge, Layers, MousePointerClick, Network, Route as RouteIcon,
  Sigma, Timer,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { InfoTip } from "../ui/info-tip";
import { GhfTable } from "../ghf-table";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { fmtInt, fmtKm, fmtMinutes, fmtMs, fmtPct, fmtVi } from "@/lib/format";

function Stat({ icon: Icon, label, value, sub, tip }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string; tip?: string;
}) {
  return (
    <div className="rounded-lg border border-surface-border p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-dim">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      <div className="mt-1 font-mono text-[15px] font-bold leading-tight text-ink">{value}</div>
      {sub && <div className="font-mono text-[10px] text-ink-dim">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; hint: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-surface-border px-4 py-10 text-center">
      <Icon className="size-6 text-ink-dim" />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-xs leading-relaxed text-ink-dim">{hint}</p>
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
          <Stat icon={Clock} label="Theo thứ tự nhập"
            value={fmtMinutes(multi.original_order_totals.total_time_s)}
            sub={fmtKm(multi.original_order_totals.total_distance_m)} />
          <Stat icon={Clock} label="Sau tối ưu"
            value={fmtMinutes(multi.totals.total_time_s)}
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
      <EmptyState icon={MousePointerClick} title="Chưa có kết quả"
        hint={
          <span className="mx-auto block max-w-56 text-left">
            1. Chọn điểm <b>Đi</b> và <b>Đến</b><br />
            2. Bấm <b className="text-ink">Chạy thuật toán</b><br />
            3. Bấm ▶ trên timeline để xem từng bước
          </span>
        } />
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
  const modeVi = { balanced: "Cân bằng", time: "Nhanh nhất", distance: "Ngắn nhất" }[trace.mode];
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] text-ink-dim">
        {ALGO_LABEL[trace.algorithm].split(" — ")[0]} · {modeVi} · {trace.time_slot} ·{" "}
        {trace.graph === "demo" ? "G_demo" : "G_real"}
      </p>
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
        <Stat icon={Sigma} label={`Tổng chi phí (${costUnit})`}
          value={fmtVi(m.total_cost ?? 0, 1)}
          tip="Giá trị hàm chi phí theo tiêu chí đang chọn — thuật toán tối ưu hoá con số này." />
        <Stat icon={Clock} label="Thời gian ước tính"
          value={fmtMinutes(m.total_time_s ?? 0)} sub={`${fmtVi(m.total_time_s ?? 0, 1)} s`} />
        <Stat icon={RouteIcon} label="Quãng đường" value={fmtKm(m.total_distance_m ?? 0)} />
        <Stat icon={Network} label="Node đã expand" value={fmtInt(m.nodes_expanded)}
          tip="Số node thuật toán phải mở ra xem xét — càng ít càng hiệu quả." />
        <Stat icon={Layers} label="Frontier lớn nhất" value={fmtInt(m.max_frontier)}
          tip="Kích thước lớn nhất của tập node đang chờ xét — phản ánh bộ nhớ cần dùng." />
        <Stat icon={Timer} label="Thời gian chạy" value={fmtMs(m.runtime_ms)} />
      </div>
      {graph === "demo" ? (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            <Gauge className="size-3.5" />
            Bảng g / h / f — frontier tại bước hiện tại
            <InfoTip text="Giá trị của các node đang chờ xét tại bước animation hiện tại; kéo timeline để xem từng bước." />
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
