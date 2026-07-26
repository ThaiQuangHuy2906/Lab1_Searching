"use client";

import { GitCompareArrows, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { fmtInt, fmtKm, fmtMs, fmtVi } from "@/lib/format";
import type { Algorithm, Trace } from "@/lib/types";

function CompareRow({ label, a, b, better }: {
  label: string; a: string; b: string; better?: "a" | "b" | null;
}) {
  return (
    <tr className="border-t border-surface-border/60">
      <td className="px-2.5 py-1.5 text-ink-dim">{label}</td>
      <td className={`px-2 py-1.5 text-right font-mono ${better === "a" ? "font-bold text-start" : ""}`}>{a}</td>
      <td className={`px-2 py-1.5 text-right font-mono ${better === "b" ? "font-bold text-start" : ""}`}>{b}</td>
    </tr>
  );
}

function metricRows(a: Trace, b: Trace) {
  const rows: { label: string; fa: number | null; fb: number | null; lowerBetter: boolean; fmt: (x: number) => string }[] = [
    { label: "Tổng chi phí", fa: a.metrics.total_cost, fb: b.metrics.total_cost, lowerBetter: true, fmt: (x) => fmtVi(x, 1) },
    { label: "Thời gian (s)", fa: a.metrics.total_time_s, fb: b.metrics.total_time_s, lowerBetter: true, fmt: (x) => fmtVi(x, 1) },
    { label: "Quãng đường", fa: a.metrics.total_distance_m, fb: b.metrics.total_distance_m, lowerBetter: true, fmt: fmtKm },
    { label: "Node expand", fa: a.metrics.nodes_expanded, fb: b.metrics.nodes_expanded, lowerBetter: true, fmt: fmtInt },
    { label: "Frontier max", fa: a.metrics.max_frontier, fb: b.metrics.max_frontier, lowerBetter: true, fmt: fmtInt },
    { label: "Runtime", fa: a.metrics.runtime_ms, fb: b.metrics.runtime_ms, lowerBetter: true, fmt: fmtMs },
  ];
  return rows;
}

export function CompareTab() {
  const s = useApp();
  const a = s.trace;
  const b = s.compare;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="mb-1.5 text-xs font-medium text-ink-dim">Thuật toán B</div>
          <Select value={s.compareAlgo} onValueChange={(v) => s.set({ compareAlgo: v as Algorithm })}>
            <SelectTrigger aria-label="Thuật toán so sánh"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ALGO_LABEL) as Algorithm[])
                .filter((x) => x !== a?.algorithm)
                .map((x) => (
                  <SelectItem key={x} value={x}>{ALGO_LABEL[x]}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" disabled={!a || s.comparing} onClick={() => void s.runCompare()}>
          {s.comparing ? <Loader2 className="animate-spin" /> : <GitCompareArrows />}
          So sánh
        </Button>
      </div>

      {!a && (
        <p className="py-6 text-center text-sm text-ink-dim">
          Chạy thuật toán chính trước, rồi chọn thuật toán B để so sánh cùng cặp Đi/Đến.
        </p>
      )}
      {a && !b && !s.comparing && (
        <p className="py-6 text-center text-sm text-ink-dim">
          Tuyến A ({ALGO_LABEL[a.algorithm]}) đã sẵn sàng — bấm <b className="text-ink">So sánh</b> để chạy thuật toán B.
        </p>
      )}
      {a && b && (
        <div className="overflow-hidden rounded-lg border border-surface-border">
          <table className="w-full text-xs">
            <thead className="bg-surface text-ink-dim">
              <tr>
                <th className="px-2.5 py-2 text-left font-medium">Chỉ số</th>
                <th className="px-2 py-2 text-right font-medium text-algo-path">A · {a.algorithm}</th>
                <th className="px-2 py-2 text-right font-medium text-algo-frontier">B · {b.algorithm}</th>
              </tr>
            </thead>
            <tbody>
              {metricRows(a, b).map((r) => {
                const better = r.fa === null || r.fb === null ? null
                  : Math.abs(r.fa - r.fb) < 1e-9 ? null
                  : (r.fa < r.fb) === r.lowerBetter ? "a" : "b";
                return (
                  <CompareRow key={r.label} label={r.label}
                    a={r.fa === null ? "—" : r.fmt(r.fa)}
                    b={r.fb === null ? "—" : r.fmt(r.fb)}
                    better={better} />
                );
              })}
              <CompareRow label="Đảm bảo tối ưu"
                a={a.metrics.optimal_guarantee ? "Có" : "Không"}
                b={b.metrics.optimal_guarantee ? "Có" : "Không"} />
            </tbody>
          </table>
        </div>
      )}
      {a && b && (
        <p className="text-[11px] text-ink-dim">
          Trên bản đồ: tuyến A màu vàng liền, tuyến B màu lam nét đứt.
        </p>
      )}
    </div>
  );
}
