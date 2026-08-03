"use client";

import { GitCompareArrows } from "lucide-react";
import { Badge } from "../ui/badge";
import { fmtKm, fmtMinutes, fmtPct, fmtSeconds, fmtVi } from "@/lib/format";
import type { LegMetrics, MultirouteResponse } from "@/lib/types";
import { ATSP_METHOD_LABEL, ATSP_MODE_LABEL } from "./atsp-copy";

type ComparisonRow = {
  label: string;
  before: number;
  after: number;
  format: (value: number) => string;
};

function PercentDelta({ before, after }: { before: number; after: number }) {
  if (before <= 0) return <span className="text-ink-dim">—</span>;
  const percentage = ((after - before) / before) * 100;
  if (Math.abs(percentage) < 0.05) return <span className="text-ink-dim">0 %</span>;
  return (
    <span className={percentage < 0 ? "text-start" : "text-goal"}>
      {percentage < 0 ? "−" : "+"}{fmtVi(Math.abs(percentage), Math.abs(percentage) < 10 ? 1 : 0)} %
    </span>
  );
}

function comparisonRows(multi: MultirouteResponse, before: LegMetrics,
                        after: LegMetrics): ComparisonRow[] {
  const fmtCost = multi.mode === "distance"
    ? fmtKm
    : Math.max(before.total_cost, after.total_cost) >= 90 ? fmtMinutes : fmtSeconds;
  const fmtTime = Math.max(before.total_time_s, after.total_time_s) >= 90
    ? fmtMinutes
    : fmtSeconds;
  return [
    { label: "Tổng chi phí", before: before.total_cost, after: after.total_cost, format: fmtCost },
    { label: "Thời gian", before: before.total_time_s, after: after.total_time_s, format: fmtTime },
    { label: "Quãng đường", before: before.total_distance_m, after: after.total_distance_m, format: fmtKm },
  ];
}

export function AtspCompare({ multi }: { multi: MultirouteResponse }) {
  if (!multi.found || !multi.totals || !multi.original_order_totals) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-control p-3">
        <p className="text-sm font-semibold text-ink">Chưa có hai thứ tự để đối chiếu</p>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Kết quả hiện tại không chứa một hành trình ATSP đầy đủ. Hãy chạy lại sau khi
          kiểm tra các điểm giao hoặc chọn phương pháp khác.
        </p>
      </div>
    );
  }

  const before = multi.original_order_totals;
  const after = multi.totals;
  const savings = multi.savings_pct;
  const rows = comparisonRows(multi, before, after);
  const verdict = savings === null
    ? "API không trả về tỷ lệ tiết kiệm cho kết quả này."
    : Math.abs(savings) < 0.05
      ? "Thứ tự sau tối ưu không làm thay đổi đáng kể tổng chi phí."
      : savings > 0
        ? `Thứ tự sau tối ưu giảm ${fmtPct(savings)} tổng chi phí ${ATSP_MODE_LABEL[multi.mode].toLowerCase()}.`
        : `Thứ tự sau tối ưu tăng ${fmtPct(Math.abs(savings))} tổng chi phí ${ATSP_MODE_LABEL[multi.mode].toLowerCase()}.`;

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-lg border border-surface-border bg-surface-control px-2.5 py-2 font-mono text-[11px] text-ink-dim">
        {ATSP_METHOD_LABEL[multi.method]} · {ATSP_MODE_LABEL[multi.mode]} · {multi.time_slot} ·{" "}
        {multi.graph === "demo" ? "G_demo" : "G_real"}
      </p>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
        <div className="flex items-start gap-2">
          <GitCompareArrows className="mt-0.5 size-4 shrink-0 text-algo-path" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Trước và sau tối ưu</p>
            <p className="mt-1 text-[13px] leading-5 text-ink">{verdict}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge>{ATSP_METHOD_LABEL[multi.method]}</Badge>
          <Badge variant={multi.optimal_guarantee ? "ok" : "warn"}>
            {multi.optimal_guarantee ? "Tối ưu tuyệt đối" : "Nghiệm xấp xỉ"}
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full min-w-[340px] table-fixed text-[11px]">
          <thead className="bg-surface-control text-ink-dim">
            <tr>
              <th scope="col" className="w-[88px] px-2 py-2 text-left font-medium">Chỉ số</th>
              <th scope="col" className="px-1.5 py-2 text-right font-medium">Thứ tự nhập</th>
              <th scope="col" className="px-1.5 py-2 text-right font-medium text-algo-path">Sau tối ưu</th>
              <th scope="col" className="w-[60px] px-2 py-2 text-right font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-surface-border/60">
                <td className="px-2 py-2 text-ink-dim">{row.label}</td>
                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono text-ink-dim">
                  {row.format(row.before)}
                </td>
                <td className="whitespace-nowrap px-1.5 py-2 text-right font-mono font-semibold text-ink">
                  {row.format(row.after)}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-mono font-semibold">
                  <PercentDelta before={row.before} after={row.after} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-5 text-ink-dim">
        Đây là đối chiếu <b className="text-ink">thứ tự nhập</b> với kết quả của một
        phương pháp ATSP. Ứng dụng chưa giữ đồng thời hai kết quả để so sánh hai phương
        pháp ATSP với nhau.
      </p>
    </div>
  );
}
