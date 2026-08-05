"use client";

import {
  BadgeCheck, Clock, Gauge, Layers, MousePointerClick, Network,
  Route as RouteIcon, Sigma, Timer,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { InfoTip } from "../ui/info-tip";
import { GhfTable } from "../ghf-table";
import { AtspLoading, AtspResult } from "../atsp/atsp-result";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { routeGuaranteeLabel } from "@/lib/algorithm-policy";
import { fmtInt, fmtKm, fmtMinutes, fmtMs, fmtVi } from "@/lib/format";

function Stat({ icon: Icon, label, value, sub, tip, emphasis = "effort" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; sub?: string; tip?: string;
  emphasis?: "primary" | "secondary" | "effort";
}) {
  const valueClass = emphasis === "primary"
    ? "text-xl"
    : emphasis === "secondary" ? "text-base" : "text-[15px]";
  return (
    <div className={`rounded-lg border p-2.5 ${emphasis === "primary"
      ? "border-algo-frontier/35 bg-algo-frontier/5"
      : "border-surface-border bg-surface-control/70"}`}>
      <div className="flex items-center gap-1.5 text-xs text-ink-dim">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
        {tip && <InfoTip text={tip} />}
      </div>
      <div className={`mt-1 font-mono font-bold leading-tight text-ink ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] leading-4 text-ink-dim">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; hint: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-surface-strong bg-surface-panel px-4 py-7 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-surface-control text-algo-frontier">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="text-xs leading-5 text-ink-dim">{hint}</p>
    </div>
  );
}

export function MetricsTab() {
  const trace = useApp((s) => s.trace);
  const sequentialRoute = useApp((s) => s.sequentialRoute);
  const multi = useApp((s) => s.multi);
  const multiRunning = useApp((s) => s.multiRunning);
  const graph = useApp((s) => s.graph);
  const graphData = useApp((s) => s.graphData);

  if (multiRunning) return <AtspLoading />;
  if (multi) return <AtspResult multi={multi} graphData={graphData} />;

  if (!trace) {
    const isDemo = graph === "demo";
    return (
      <div className="flex flex-col gap-3">
        <EmptyState icon={MousePointerClick} title="Chưa có kết quả"
          hint={
            // G_real không có dropdown tên nên chọn trực tiếp trên bản đồ;
            // cả hai graph đều ghi trace cho timeline.
            <span className="mx-auto block max-w-60 text-left">
              1. Chọn điểm <b>Đi</b> và <b>Đến</b>{" "}
              {isDemo ? "theo tên địa danh" : <>bằng nút <b>Chọn trên bản đồ</b></>}<br />
              2. Bấm <b className="text-ink">Chạy thuật toán</b><br />
              3. Bấm ▶ trên timeline để xem từng bước
            </span>
          } />
        <div className="flex flex-col gap-1.5 rounded-lg border border-surface-border bg-surface-control/70 p-3">
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
      <p className="rounded-lg border border-surface-border bg-surface-control px-2.5 py-2 font-mono text-[11px] text-ink-dim">
        {ALGO_LABEL[trace.algorithm].split(" — ")[0]} · {modeVi} · {trace.time_slot} ·{" "}
        {trace.graph === "demo" ? "G_demo" : "G_real"}
      </p>
      {sequentialRoute && (
        <div className="rounded-lg border border-algo-frontier/30 bg-algo-frontier/5 p-2.5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
              Hành trình nhiều điểm
            </p>
            <Badge className="shrink-0 font-mono">
              {sequentialRoute.legs.length} chặng
            </Badge>
          </div>
          <ol className="flex flex-col gap-1.5">
            {sequentialRoute.legs.map((leg) => {
              const from = graphData?.nodes.find((node) => node.id === leg.from_node)?.name
                ?? leg.from_node;
              const to = graphData?.nodes.find((node) => node.id === leg.to_node)?.name
                ?? leg.to_node;
              return (
                <li key={`${leg.index}-${leg.from_node}-${leg.to_node}`}
                  className="flex items-center gap-2 rounded-md bg-surface-control/75 px-2 py-1.5 text-[11px]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-algo-frontier font-mono text-[10px] font-bold text-zinc-950">
                    {leg.index + 1}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-ink">
                    {from} <span className="text-ink-dim">→</span> {to}
                  </span>
                  <Badge variant={leg.found ? "ok" : "danger"} className="shrink-0 px-1.5 py-0 text-[10px]">
                    {leg.found ? "Đã tìm" : "Không có đường"}
                  </Badge>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {trace.applied_scenario && (
        <p className="rounded-lg border border-surface-border bg-surface-control/55 px-2.5 py-2 text-[11px] leading-4 text-ink-dim">
          Kịch bản: <span className="font-medium text-ink">{trace.applied_scenario.graph_view}</span>
          {" · "}{trace.applied_scenario.override_count} ghi đè · {trace.applied_scenario.provenance}
          <span className="block break-all font-mono text-[10px] text-ink-faint">{trace.applied_scenario.fingerprint}</span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={m.optimal_guarantee ? "ok" : "warn"} className="gap-1">
          {m.optimal_guarantee && <BadgeCheck className="size-3.5" />}
          {routeGuaranteeLabel(
            trace.algorithm,
            m.optimal_guarantee,
            m.epsilon_bound,
            costUnit,
          )}
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
              emphasis="primary"
              tip="Giá trị hàm chi phí theo tiêu chí đang chọn — thuật toán tối ưu hoá đúng con số này." />
          </div>
          <Stat icon={Clock} label="Thời gian đi"
            value={fmtMinutes(m.total_time_s ?? 0)} sub={`${fmtVi(m.total_time_s ?? 0, 1)} s`}
            emphasis="secondary" />
          <Stat icon={RouteIcon} label="Quãng đường" value={fmtKm(m.total_distance_m ?? 0)}
            emphasis="secondary" />
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
          bằng timeline ngay sau khi chạy thuật toán.
        </p>
      )}
    </div>
  );
}
