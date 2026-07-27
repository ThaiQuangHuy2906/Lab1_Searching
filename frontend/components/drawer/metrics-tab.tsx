"use client";

import {
  BadgeCheck, Clock, Gauge, Layers, MousePointerClick, Network,
  Route as RouteIcon, Sigma, Timer,
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
    const isDemo = graph === "demo";
    return (
      <div className="flex flex-col gap-3">
        <EmptyState icon={MousePointerClick} title="Chưa có kết quả"
          hint={
            // các bước theo đúng đồ thị đang chọn (v11): G_real không có
            // dropdown tên, và timeline chỉ có khi bật trace
            <span className="mx-auto block max-w-60 text-left">
              1. Chọn điểm <b>Đi</b> và <b>Đến</b>{" "}
              {isDemo ? "theo tên địa danh" : <>bằng nút <b>Chọn trên bản đồ</b></>}<br />
              2. Bấm <b className="text-ink">Chạy thuật toán</b><br />
              3. {isDemo
                ? <>Bấm ▶ trên timeline để xem từng bước</>
                : <>Muốn xem từng bước: bật <b>Trace trên G_real</b> trước khi chạy</>}
            </span>
          } />
        <div className="flex flex-col gap-1.5 rounded-lg border border-surface-border bg-surface-panel/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            Mẹo demo
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-4 text-[11px] leading-relaxed text-ink-dim">
            <li>Chạy xong hãy đổi <b className="text-ink">Khung giờ</b> rồi chạy lại —
              nhiều cặp Đi/Đến đổi hẳn tuyến giữa 07:30 và 22:00.</li>
            <li>Tab <b className="text-ink">So sánh</b>: chạy A* rồi so với Greedy/BFS
              để thấy đánh đổi chất lượng ↔ công sức tìm kiếm.</li>
            <li>Thêm ≥2 <b className="text-ink">điểm giao</b> rồi Tối ưu thứ tự — chi
              phí đi/về khác nhau vì đường một chiều (bài toán ATSP).</li>
          </ul>
        </div>
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
  const modeVi = { balanced: "Cân bằng", time: "Nhanh nhất", distance: "Ngắn nhất" }[trace.mode];
  // vì sao chi phí có thể trùng số card khác: nói thẳng trên card (v11) —
  // balanced: cost == thời gian đi; distance: cost == quãng đường (mét)
  const costSub = {
    balanced: "= thời gian chạy xe + phạt rủi ro — đúng bằng số giây ở card Thời gian đi",
    time: "thời gian chạy xe thuần, CHƯA cộng phạt rủi ro",
    distance: "= quãng đường, tính bằng mét",
  }[trace.mode];
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] text-ink-dim">
        {ALGO_LABEL[trace.algorithm].split(" — ")[0]} · {modeVi} · {trace.time_slot} ·{" "}
        {trace.graph === "demo" ? "G_demo" : "G_real"}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={m.optimal_guarantee ? "ok" : "warn"} className="gap-1">
          {m.optimal_guarantee && <BadgeCheck className="size-3.5" />}
          {m.optimal_guarantee
            ? trace.algorithm === "idastar"
              ? `Tối ưu trong ε = ${fmtVi(m.epsilon_bound ?? 5)} ${costUnit}`
              : "Đảm bảo tối ưu"
            : "Không đảm bảo tối ưu"}
        </Badge>
        {m.beam_width != null && <Badge>k = {m.beam_width}</Badge>}
        {m.trace_truncated && <Badge variant="danger">Trace bị cắt ở 5 000 bước</Badge>}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          Tuyến tìm được
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <Stat icon={Sigma} label={`Tổng chi phí (${costUnit}) — tiêu chí ${modeVi}`}
              value={fmtVi(m.total_cost ?? 0, 1)} sub={costSub}
              tip="Giá trị hàm chi phí theo tiêu chí đang chọn — thuật toán tối ưu hoá đúng con số này." />
          </div>
          <Stat icon={Clock} label="Thời gian đi"
            value={fmtMinutes(m.total_time_s ?? 0)} sub={`${fmtVi(m.total_time_s ?? 0, 1)} s`} />
          <Stat icon={RouteIcon} label="Quãng đường" value={fmtKm(m.total_distance_m ?? 0)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
          Công sức tìm kiếm
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={Network} label="Đã expand" value={fmtInt(m.nodes_expanded)}
            tip="Số node thuật toán phải mở ra xem xét — càng ít càng hiệu quả." />
          <Stat icon={Layers} label="Frontier max" value={fmtInt(m.max_frontier)}
            tip="Kích thước lớn nhất của tập node đang chờ xét — phản ánh bộ nhớ cần dùng." />
          <Stat icon={Timer} label="Runtime" value={fmtMs(m.runtime_ms)} />
        </div>
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
          Bảng g/h/f chỉ có trên G_demo — trên G_real vẫn xem được từng bước
          bằng timeline khi bật &quot;Trace trên G_real&quot; trước khi chạy.
        </p>
      )}
    </div>
  );
}
