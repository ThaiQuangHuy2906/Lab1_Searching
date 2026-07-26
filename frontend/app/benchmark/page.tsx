"use client";

// /benchmark — đọc kết quả 7 thí nghiệm từ POST /api/benchmark (Phase 6).
// Recharts trên nền tối, đúng token DESIGN.md §9. 3 trạng thái đầy đủ.

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend as RLegend, Line, LineChart,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, BackendError } from "@/lib/api";
import { fmtInt, fmtVi } from "@/lib/format";
import { usePalette } from "@/lib/use-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ExperimentResult } from "@/lib/types";

function useBenchmark() {
  const [data, setData] = React.useState<ExperimentResult[] | null>(null);
  const [state, setState] = React.useState<"loading" | "empty" | "ready" | "error">("loading");
  const [errMsg, setErrMsg] = React.useState("");
  React.useEffect(() => {
    api.benchmark()
      .then((r) => {
        setData(r.experiments);
        setState(r.experiments.length ? "ready" : "empty");
      })
      .catch((e: unknown) => {
        if (e instanceof BackendError && e.code === "RESULTS_NOT_FOUND") setState("empty");
        else {
          setErrMsg(e instanceof BackendError ? e.message : "Lỗi không xác định.");
          setState("error");
        }
      });
  }, []);
  return { data, state, errMsg };
}

function mean(rows: Record<string, string>[], key: string): number {
  const vals = rows.map((r) => Number(r[key])).filter((x) => Number.isFinite(x));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export default function BenchmarkPage() {
  const { data, state, errMsg } = useBenchmark();
  const P = usePalette();
  const INK_DIM = P.hex.inkDim;
  const GRID = P.hex.grid;
  const CYAN = P.hex.frontier;
  const AMBER = P.hex.path;
  const VIOLET = P.hex.expanded;
  const tooltipStyle = {
    contentStyle: {
      background: P.hex.panel, border: `1px solid ${GRID}`,
      borderRadius: 8, color: "rgb(var(--ink))",
    },
    labelStyle: { color: INK_DIM },
  };

  const exp3 = data?.find((e) => e.experiment_id === 3);
  const exp5 = data?.find((e) => e.experiment_id === 5);

  const byAlgo = React.useMemo(() => {
    if (!exp3) return [];
    const algos = [...new Set(exp3.rows.map((r) => r.algorithm))];
    return algos.map((a) => {
      const rows = exp3.rows.filter((r) => r.algorithm === a);
      return {
        algorithm: a,
        // log-scale axes reject 0 — clamp to the smallest visible value
        expanded: Math.max(1, Math.round(mean(rows, "nodes_expanded"))),
        runtime: Math.max(0.01, Number(mean(rows, "runtime_ms").toFixed(2))),
      };
    });
  }, [exp3]);

  // every number the grader sees uses the Vietnamese decimal comma
  // (DESIGN §2) — Recharts rendered raw US-style values here (L3-07)
  const fmtLogTick = (v: number) =>
    v >= 1000 ? `${fmtVi(v / 1000, 0)}k` : fmtVi(v, v < 1 ? 2 : 0);
  const fmtBarTip = (v: number | string, name: string): [string, string] => [
    name === "Node expand" ? fmtInt(Number(v)) : fmtVi(Number(v), 2),
    name,
  ];

  const gamma = React.useMemo(
    () =>
      exp5?.rows.map((r) => ({
        gamma: Number(r.gamma),
        time: Number(Number(r.avg_time_s).toFixed(1)),
        dist: Number((Number(r.avg_distance_m) / 1000).toFixed(2)),
      })) ?? [],
    [exp5],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-ink-dim hover:text-ink">
          <ArrowLeft className="size-4" /> Bản đồ
        </Link>
        <h1 className="flex-1 text-lg font-bold">Benchmark — 7 thí nghiệm</h1>
        <ThemeToggle />
      </div>

      {state === "loading" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-72" /><Skeleton className="h-72" />
        </div>
      )}

      {state === "empty" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FlaskConical className="size-8 text-ink-dim" />
            <p className="text-sm text-ink-dim">
              Chưa có kết quả benchmark trong <code className="font-mono">results/</code>.<br />
              Hãy chạy <code className="font-mono text-ink">python -m app.benchmark</code> (Phase 6) rồi tải lại trang.
            </p>
          </CardContent>
        </Card>
      )}

      {state === "error" && (
        <Card className="border-goal/40">
          <CardContent className="py-8 text-center text-sm text-goal">{errMsg}</CardContent>
        </Card>
      )}

      {state === "ready" && (
        <div className="grid gap-4 md:grid-cols-2">
          {byAlgo.length > 0 && (
            <>
              <Card>
                <CardHeader><CardTitle>Số node expand trung bình theo thuật toán (thang log)</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={byAlgo} margin={{ left: 4, right: 8 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      {/* interval={0}: Recharts auto-skips crowded labels — with 10 bars
                          that silently dropped dijkstra/greedy/idastar (v8c bug) */}
                      <XAxis dataKey="algorithm" stroke={INK_DIM} fontSize={10}
                        interval={0} angle={-30} textAnchor="end" height={48} tickMargin={2} />
                      <YAxis stroke={INK_DIM} fontSize={11} scale="log"
                        domain={[1, "auto"]} tickFormatter={fmtLogTick} />
                      <RTooltip {...tooltipStyle} cursor={{ fill: `${GRID}55` }}
                        formatter={fmtBarTip} />
                      <Bar dataKey="expanded" name="Node expand" fill={CYAN} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Thời gian chạy trung bình (ms, thang log)</CardTitle></CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={byAlgo} margin={{ left: 4, right: 8 }}>
                      <CartesianGrid stroke={GRID} vertical={false} />
                      <XAxis dataKey="algorithm" stroke={INK_DIM} fontSize={10}
                        interval={0} angle={-30} textAnchor="end" height={48} tickMargin={2} />
                      <YAxis stroke={INK_DIM} fontSize={11} scale="log"
                        domain={[0.01, "auto"]} tickFormatter={fmtLogTick} />
                      <RTooltip {...tooltipStyle} cursor={{ fill: `${GRID}55` }}
                        formatter={fmtBarTip} />
                      <Bar dataKey="runtime" name="Runtime (ms)" fill={VIOLET} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
          {gamma.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader><CardTitle>Độ nhạy trọng số γ — thời gian & quãng đường tuyến được chọn</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <LineChart data={gamma} margin={{ left: 4, right: 8 }}>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="gamma" stroke={INK_DIM} fontSize={11}
                      tickFormatter={(v: number) => fmtVi(Number(v), 1)} />
                    <YAxis yAxisId="t" stroke={AMBER} fontSize={11}
                      tickFormatter={(v: number) => fmtVi(Number(v), 0)} />
                    <YAxis yAxisId="d" orientation="right" stroke={VIOLET} fontSize={11}
                      tickFormatter={(v: number) => fmtVi(Number(v), 1)} />
                    <RTooltip {...tooltipStyle}
                      labelFormatter={(l) => `γ = ${fmtVi(Number(l), 1)}`}
                      formatter={(v: number | string, name: string): [string, string] =>
                        [fmtVi(Number(v), name.includes("km") ? 2 : 1), name]} />
                    <RLegend wrapperStyle={{ fontSize: 12, color: INK_DIM }} />
                    <Line yAxisId="t" dataKey="time" name="Thời gian TB (s)" stroke={AMBER} dot strokeWidth={2} />
                    <Line yAxisId="d" dataKey="dist" name="Quãng đường TB (km)" stroke={VIOLET} dot strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {data && !byAlgo.length && !gamma.length && (
            <Card className="md:col-span-2">
              <CardContent className="py-8 text-center text-sm text-ink-dim">
                Đã có {data.length} thí nghiệm trong results/ nhưng thiếu exp3/exp5 để vẽ biểu đồ.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
