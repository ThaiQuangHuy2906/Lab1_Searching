"use client";

import { GitCompareArrows, Loader2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { AtspCompare } from "../atsp/atsp-compare";
import { AtspLoading } from "../atsp/atsp-result";
import {
  ALGORITHM_ORDER,
  chooseCompareAlgorithm,
  routeGuaranteeLabel,
} from "@/lib/algorithm-policy";
import {
  formatOutcomeMetricValue,
  outcomeMetricsForMode,
  presentationUnitForMode,
  primaryOutcomeMetric,
  rawEpsilonToPresentation,
} from "@/lib/metric-presentation";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { fmtInt, fmtMs, fmtVi } from "@/lib/format";
import type { Algorithm, Trace } from "@/lib/types";

/** Real short names for the tight 4-column header — splitting ALGO_LABEL on
 * " — " left "Greedy Best-First"/"Dijkstra hai chiều" full-length and the Δ
 * column got clipped (review v11). */
const SHORT: Record<Algorithm, string> = {
  bfs: "BFS", dfs: "DFS", iddfs: "IDDFS", ucs: "UCS",
  astar: "A*", greedy: "Greedy", bidijkstra: "BiDijkstra", idastar: "IDA*",
  beam: "Beam",
};
const shortName = (a: Algorithm) => SHORT[a];

type Row = {
  label: string;
  fa: number | null;
  fb: number | null;
  fmt: (x: number) => string;
};

/** Rows depend on the mode: total_time_s is a balanced path weight, therefore
 * it never becomes a second outcome row. */
function metricRows(a: Trace, b: Trace): Row[] {
  const rows: Row[] = outcomeMetricsForMode(a.mode).map((metric) => {
    const fa = a.metrics[metric.key];
    const fb = b.metrics[metric.key];
    return {
      label: metric.label,
      fa,
      fb,
      fmt: (value) => formatOutcomeMetricValue(metric, value),
    };
  });
  rows.push(
    { label: "Số điểm đã duyệt", fa: a.metrics.nodes_expanded, fb: b.metrics.nodes_expanded, fmt: fmtInt },
    { label: "Số điểm chờ lớn nhất", fa: a.metrics.max_frontier, fb: b.metrics.max_frontier, fmt: fmtInt },
    { label: "Thời gian xử lý", fa: a.metrics.runtime_ms, fb: b.metrics.runtime_ms, fmt: fmtMs },
  );
  return rows;
}

/** Signed % of B relative to A; lower is better for every numeric row. */
function DeltaCell({ fa, fb }: { fa: number | null; fb: number | null }) {
  if (fa === null || fb === null || fa <= 0)
    return <td className="border-l border-surface-border/70 px-2 py-1.5 text-right font-mono text-ink-dim">—</td>;
  const pct = ((fb - fa) / fa) * 100;
  if (Math.abs(pct) < 0.05)
    return <td className="border-l border-surface-border/70 px-2 py-1.5 text-right font-mono text-ink-dim">0 %</td>;
  const cls = pct > 0 ? "text-goal" : "text-start";
  return (
    <td className={`whitespace-nowrap border-l border-surface-border/70 px-2 py-1.5 text-right font-mono ${cls}`}>
      {pct > 0 ? "+" : "−"}{fmtVi(Math.abs(pct), Math.abs(pct) < 10 ? 1 : 0)} %
    </td>
  );
}

/** One-sentence takeaway: who pays more, and what the loser buys instead. */
function Verdict({ a, b, multiPoint = false }: {
  a: Trace; b: Trace; multiPoint?: boolean;
}) {
  const nameA = shortName(a.algorithm);
  const nameB = shortName(b.algorithm);
  const primaryMetric = primaryOutcomeMetric(a.mode);
  const fmtCost = (value: number) => formatOutcomeMetricValue(primaryMetric, value);
  const ca = a.metrics.total_cost;
  const cb = b.metrics.total_cost;

  if (cb === null || ca === null) {
    return (
      <p className="rounded-lg border border-surface-border bg-surface-control px-3 py-2.5 text-[13px] leading-5">
        {ca === null && cb === null
          ? <>Cả <b>{nameA}</b> lẫn <b>{nameB}</b> đều không tìm được đường ở cấu hình này</>
          : <><b>{cb === null ? nameB : nameA}</b> không tìm được đường ở cấu hình này</>}
        {" "}Hãy xem tab Giải thích để biết nguyên nhân. Bảng dưới vẫn so được công sức tìm kiếm.
      </p>
    );
  }

  const expA = a.metrics.nodes_expanded;
  const expB = b.metrics.nodes_expanded;
  const expClause = expA === expB ? null : (
    <> Về công sức, <b>{expB < expA ? nameB : nameA}</b> duyệt ít điểm hơn
      ({fmtInt(Math.min(expA, expB))} so với {fmtInt(Math.max(expA, expB))} điểm).</>
  );

  if (Math.abs(ca - cb) < 0.05) {
    return (
      <p className="rounded-lg border border-surface-border bg-surface-control px-3 py-2.5 text-[13px] leading-5">
        Hai thuật toán tìm được tuyến <b>cùng chi phí</b> ({fmtCost(ca)}).{expClause}
      </p>
    );
  }
  const [wName, lName, wCost, lCost] = ca < cb
    ? [nameA, nameB, ca, cb] : [nameB, nameA, cb, ca];
  const pct = ((lCost - wCost) / wCost) * 100;
  return (
    <p className="rounded-lg border border-surface-border bg-surface-control px-3 py-2.5 text-[13px] leading-5">
      Tuyến của <b>{lName}</b> đắt hơn <b>{wName}</b>{" "}
      <b className="font-mono">{fmtCost(lCost - wCost)}</b>
      <span className="font-mono"> (+{fmtVi(pct, pct < 10 ? 1 : 0)} %)</span> trên
      {multiPoint ? "cùng hành trình nhiều điểm." : "cùng cặp Đi/Đến."}{expClause}
    </p>
  );
}

function directedEdges(path: string[]) {
  return new Set(path.slice(0, -1).map((node, index) => `${node}\u0000${path[index + 1]}`));
}

/** Geometry-oriented complement to the cost verdict. The percentage is a
 * directed-edge Jaccard score, so 100% means the two node paths are identical
 * even when their search effort differs. */
function RouteOverlap({ a, b }: { a: Trace; b: Trace }) {
  const edgesA = directedEdges(a.path);
  const edgesB = directedEdges(b.path);
  const common = [...edgesA].filter((edge) => edgesB.has(edge)).length;
  const onlyA = edgesA.size - common;
  const onlyB = edgesB.size - common;
  const union = common + onlyA + onlyB;
  const percentage = union === 0 ? null : Math.round((common / union) * 100);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-ink-dim">
          Độ trùng tuyến
        </p>
        <Badge className="shrink-0 font-mono">
          {percentage === null ? "—" : `${percentage} %`}
        </Badge>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-md bg-surface-control px-1.5 py-1.5">
          <p className="font-mono text-sm font-bold text-ink">{fmtInt(common)}</p>
          <p className="text-xs text-ink-dim">đoạn chung</p>
        </div>
        <div className="rounded-md bg-algo-path/10 px-1.5 py-1.5">
          <p className="font-mono text-sm font-bold text-algo-path">{fmtInt(onlyA)}</p>
          <p className="text-xs text-ink-dim">chỉ tuyến A</p>
        </div>
        <div className="rounded-md bg-algo-frontier/10 px-1.5 py-1.5">
          <p className="font-mono text-sm font-bold text-algo-frontier">{fmtInt(onlyB)}</p>
          <p className="text-xs text-ink-dim">chỉ tuyến B</p>
        </div>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-ink-faint">
        Tính theo cạnh có hướng: số đoạn chung chia cho tổng số đoạn khác nhau.
      </p>
    </div>
  );
}

export function CompareTab() {
  const s = useApp();
  const a = s.trace;
  const selectedCompareAlgo = chooseCompareAlgorithm(a?.algorithm, s.compareAlgo);
  const b = s.routeComparisonSession?.runs.find(
    (run) => run.id === selectedCompareAlgo,
  )?.result?.response ?? null;
  const compareAction = `So sánh với ${shortName(selectedCompareAlgo)}`;

  if (s.multiRunning) return <AtspLoading />;
  if (s.multi) return <AtspCompare multi={s.multi} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <div className="mb-1.5 text-xs font-medium text-ink-dim">Thuật toán B</div>
          <Select value={selectedCompareAlgo}
            disabled={s.comparing || s.running || s.multiRunning}
            onValueChange={(v) => s.set({
              compareAlgo: v as Algorithm,
              routeComparisonSession: null,
              explanationSubject: null,
              explanationOverlay: null,
              explanationOverlayVisible: false,
            })}>
            <SelectTrigger aria-label="Thuật toán so sánh"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALGORITHM_ORDER
                .filter((x) => x !== a?.algorithm)
                .map((x) => (
                  <SelectItem key={x} value={x}>{ALGO_LABEL[x]}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary"
          disabled={!a || s.comparing || s.running || s.multiRunning}
          onClick={() => void s.runCompare()}>
          {s.comparing ? <Loader2 className="animate-spin" /> : <GitCompareArrows />}
          {s.comparing ? "Đang so sánh…" : compareAction}
        </Button>
      </div>

      {!a && (
        <p className="py-6 text-center text-sm text-ink-dim">
          Chạy thuật toán chính trước, rồi chọn thuật toán B để so sánh cùng hành trình.
        </p>
      )}
      {a && !b && !s.comparing && (
        <p className="py-6 text-center text-sm text-ink-dim">
          Tuyến A ({ALGO_LABEL[a.algorithm]}) đã sẵn sàng. Thuật toán B đang chọn là{" "}
          <b className="text-ink">{shortName(selectedCompareAlgo)}</b> — bấm{" "}
          <b className="text-ink">{compareAction}</b> để chạy.
        </p>
      )}

      {a && b && (
        <>
          <Verdict a={a} b={b} multiPoint={Boolean(s.sequentialRoute)} />
          <RouteOverlap a={a} b={b} />

          {/* overflow-x-auto chứ không hidden: 4 cột + tên dài không bao giờ
              được phép CẮT CỤT cột Δ (bug class v10, review v11 bắt lại) */}
          <div role="region" aria-label="Bảng so sánh hai thuật toán định tuyến"
            aria-describedby="route-comparison-note" tabIndex={0}
            className="overflow-x-auto rounded-lg border border-surface-border">
            <table className="w-full text-xs">
              <caption className="sr-only">Chỉ số của tuyến A, tuyến B và phần trăm B so với A</caption>
              <thead className="bg-surface-control text-ink-dim">
                <tr>
                  <th scope="col" className="px-2.5 py-2 text-left font-medium">Chỉ số</th>
                  <th scope="col" className="whitespace-nowrap border-l border-surface-border px-2 py-2 text-right font-medium text-algo-path">
                    {/* swatch = map legend: A solid amber */}
                    <span aria-hidden className="mr-1 inline-block h-0.5 w-3.5 rounded bg-algo-path align-middle" />
                    A · {shortName(a.algorithm)}
                  </th>
                  <th scope="col" className="whitespace-nowrap border-l border-surface-border px-2 py-2 text-right font-medium text-algo-frontier">
                    {/* swatch = map legend: B dashed pink */}
                    <span aria-hidden className="mr-1 inline-block w-3.5 border-t-2 border-dashed border-algo-frontier align-middle" />
                    B · {shortName(b.algorithm)}
                  </th>
                  <th scope="col" className="border-l border-surface-border px-2 py-2 text-right font-medium">Δ B/A</th>
                </tr>
              </thead>
              <tbody>
                {metricRows(a, b).map((r) => {
                  // lower is better on every numeric row; winner in solid ink,
                  // the other side dimmed — route colors stay in the header so
                  // "màu tuyến" and "ai thắng" never mix (audit of v10 UI)
                  const tie = r.fa === null || r.fb === null || Math.abs(r.fa - r.fb) < 1e-9;
                  const aWins = !tie && (r.fa as number) < (r.fb as number);
                  const cell = (v: number | null, wins: boolean) => (
                    <td className={`whitespace-nowrap border-l border-surface-border/70 px-2 py-1.5 text-right font-mono ${
                      tie ? "" : wins ? "font-semibold text-ink" : "text-ink-dim"}`}>
                      {v === null ? "—" : r.fmt(v)}
                    </td>
                  );
                  return (
                    <tr key={r.label} className="border-t border-surface-border/60">
                      <td className="px-2.5 py-1.5 text-ink-dim">{r.label}</td>
                      {cell(r.fa, aWins)}
                      {cell(r.fb, !aWins)}
                      <DeltaCell fa={r.fa} fb={r.fb} />
                    </tr>
                  );
                })}
                <tr className="border-t border-surface-border/60">
                  <td className="px-2.5 py-1.5 text-ink-dim">Bảo đảm kết quả</td>
                  {[a, b].map((t, i) => (
                    <td key={i} className="border-l border-surface-border/70 px-2 py-1.5 text-right">
                      <Badge variant={t.metrics.optimal_guarantee ? "ok" : "warn"}
                        className="px-1.5 py-0 text-xs">
                        {routeGuaranteeLabel(
                          t.algorithm,
                          t.metrics.optimal_guarantee,
                          rawEpsilonToPresentation(t.mode, t.metrics.epsilon_bound),
                          presentationUnitForMode(t.mode),
                        )}
                      </Badge>
                    </td>
                  ))}
                  <td className="border-l border-surface-border/70 px-2 py-1.5 text-right font-mono text-ink-dim">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p id="route-comparison-note" className="text-xs leading-5 text-ink-dim">
            Δ = B so với A (xanh: B tốt hơn, đỏ: B kém hơn — mọi chỉ số càng thấp càng
            tốt). Vạch màu ở tiêu đề trùng chú giải tuyến trên bản đồ. Tuyến B được
            dịch ngang 4 px chỉ để lộ phần trùng; tọa độ và số liệu không đổi.
          </p>
        </>
      )}
    </div>
  );
}
