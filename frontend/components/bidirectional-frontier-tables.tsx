"use client";

import { Badge } from "./ui/badge";
import { formatBidirectionalCost, presentBidirectionalFrontiers, type FrontierRow } from "@/lib/bidirectional-frontier-policy";
import type { Mode, TraceStep } from "@/lib/types";

function FrontierTable({
  label,
  rows,
  mode,
  side,
  active,
  nameOf,
  onJump,
}: {
  label: string;
  rows: FrontierRow[];
  mode: Mode;
  side: "forward" | "backward" | "legacy";
  active: boolean;
  nameOf: (id: string) => string;
  onJump: (id: string) => void;
}) {
  return (
    <section aria-label={label} className={`rounded-lg border bg-surface-control/50 ${active ? "border-algo-current" : "border-surface-strong"}`}>
      <div className="flex min-h-10 items-center justify-between gap-2 border-b border-surface-border px-2.5 py-1.5">
        <h4 className="text-xs font-bold text-ink">{label}</h4>
        {active && <Badge variant="ok">Đang mở rộng</Badge>}
      </div>
      <div tabIndex={0} role="region" aria-label={`Danh sách hàng chờ ${label}`} className="max-h-44 overflow-y-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-algo-frontier">
        <table className="w-full table-fixed text-xs">
          <thead className="sticky top-0 bg-surface-raised text-left text-ink-dim">
            <tr><th className="px-2.5 py-1.5 font-medium">Điểm</th><th className="w-24 px-2 py-1.5 text-right font-medium">g</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.node} tabIndex={0} onClick={() => onJump(row.node)} onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault(); onJump(row.node);
              }} className="cursor-pointer border-t border-surface-border/50 text-ink-dim hover:bg-surface-border/40 focus-visible:bg-surface-raised">
                <td className="truncate px-2.5 py-1.5" title={nameOf(row.node)}>
                  <span
                    aria-hidden
                    className={`mr-1.5 inline-block size-2 rounded-full align-middle ${row.overlap || side !== "backward" ? "bg-algo-frontier" : "bg-bidi-backward"}`}
                    style={row.overlap ? { boxShadow: "0 0 0 2px rgb(var(--bidi-backward))" } : undefined}
                  />
                  {nameOf(row.node)}
                  {row.overlap && <span className="ml-1 text-[10px] font-semibold text-ink">cả hai</span>}
                </td>
                <td className="px-2 py-1.5 text-right font-mono text-ink">{formatBidirectionalCost(row.g, mode)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={2} className="px-2.5 py-3 text-center text-ink-faint">Hàng chờ trống</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function BidirectionalFrontierTables({
  step,
  mode,
  nameOf,
  onJump,
}: {
  step: TraceStep;
  mode: Mode;
  nameOf: (id: string) => string;
  onJump: (id: string) => void;
}) {
  const view = presentBidirectionalFrontiers(step, mode);
  if (view.capability === "legacy_union") {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-md border border-surface-border bg-surface-control p-2 text-xs leading-5 text-ink-dim">{view.compatibilityLabel}</p>
        <FrontierTable label="Hàng chờ chung — tương thích dữ liệu v1" rows={view.legacyUnion} mode={mode} side="legacy" active nameOf={nameOf} onJump={onJump} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
        <FrontierTable label="Phía xuôi — từ Đi" rows={view.forward} mode={mode} side="forward" active={view.activeSide === "forward"} nameOf={nameOf} onJump={onJump} />
        <FrontierTable label="Phía ngược — từ Đến" rows={view.backward} mode={mode} side="backward" active={view.activeSide === "backward"} nameOf={nameOf} onJump={onJump} />
      </div>
      <p className="text-xs leading-5 text-ink-dim">{view.backwardLabel}. Node “cả hai” xuất hiện ở hai bảng với g riêng cho từng phía.</p>
      {(view.bestPathCost !== null || view.meetingNode !== null) && (
        <div className="flex flex-wrap gap-1.5">
          {view.bestPathCost !== null && <Badge>μ tốt nhất: {formatBidirectionalCost(view.bestPathCost, mode)}</Badge>}
          {view.meetingNode !== null && <Badge>Điểm gặp: {nameOf(view.meetingNode)}</Badge>}
        </div>
      )}
    </div>
  );
}
