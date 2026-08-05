"use client";

// /benchmark chỉ đọc các artifact đã lưu qua POST /api/benchmark.
// Trang không chạy benchmark, không diễn giải dữ liệu stale như kết quả hiện hành.

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Database,
  FlaskConical,
  RefreshCw,
  TableProperties,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend as RLegend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, BackendError } from "@/lib/api";
import { fmtInt, fmtVi } from "@/lib/format";
import type { ExperimentResult } from "@/lib/types";
import { usePalette } from "@/lib/use-palette";

type PageState = "loading" | "empty" | "ready" | "error";
type TableCell = React.ReactNode;

interface AlgorithmDatum {
  algorithm: string;
  expanded: number;
  runtime: number;
}

interface GammaDatum {
  gamma: number;
  time: number;
  dist: number;
}

function useBenchmark() {
  const [data, setData] = React.useState<ExperimentResult[] | null>(null);
  const [state, setState] = React.useState<PageState>("loading");
  const [errMsg, setErrMsg] = React.useState("");
  const [retrying, setRetrying] = React.useState(false);
  const mountedRef = React.useRef(true);
  const inFlightRef = React.useRef(false);

  const load = React.useCallback(async (isRetry = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (isRetry) setRetrying(true);
    else setState("loading");
    if (!isRetry) setErrMsg("");

    try {
      const response = await api.benchmark();
      if (!mountedRef.current) return;
      setData(response.experiments);
      setState(response.experiments.length ? "ready" : "empty");
    } catch (error: unknown) {
      if (!mountedRef.current) return;
      if (error instanceof BackendError && error.code === "RESULTS_NOT_FOUND") {
        setData([]);
        setState("empty");
      } else {
        setErrMsg(error instanceof BackendError ? error.message : "Lỗi không xác định.");
        setState("error");
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setRetrying(false);
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return { data, state, errMsg, retrying, retry: () => load(true) };
}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

function mean(rows: Record<string, string>[], key: string): number {
  const values = rows.map((row) => Number(row[key])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function ChartDataTable({
  label,
  columns,
  rows,
  firstColumnNumeric = false,
}: {
  label: string;
  columns: string[];
  rows: TableCell[][];
  firstColumnNumeric?: boolean;
}) {
  return (
    <details className="border-t border-surface-border bg-surface-control/45">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-semibold text-ink-dim hover:bg-surface-control hover:text-ink [&::-webkit-details-marker]:hidden">
        <TableProperties className="size-4" aria-hidden="true" />
        Xem dữ liệu biểu đồ
      </summary>
      <div className="overflow-x-auto border-t border-surface-border" role="region" aria-label={label} tabIndex={0}>
        <table className="w-full min-w-[30rem] border-collapse text-left text-xs">
          <caption className="sr-only">{label}</caption>
          <thead className="bg-surface-control text-ink-dim">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border font-mono tabular-nums text-ink">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-surface-control/60">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={`px-3 py-2 ${cellIndex === 0 && !firstColumnNumeric ? "font-sans" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function MissingChart({ message }: { message: string }) {
  return (
    <div className="flex h-[18rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-surface-strong bg-surface-control/45 px-6 text-center">
      <BarChart3 className="size-7 text-ink-faint" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-ink">Chưa đủ dữ liệu để vẽ biểu đồ</p>
        <p className="mt-1 max-w-sm text-xs leading-5 text-ink-dim">{message}</p>
      </div>
    </div>
  );
}

function StateCard({
  kind,
  message,
  retrying,
  onRetry,
}: {
  kind: "empty" | "error";
  message?: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const isError = kind === "error";
  const Icon = isError ? AlertTriangle : FlaskConical;

  return (
    <Card className={isError ? "border-goal/40" : undefined}>
      <CardContent
        className="flex min-h-64 flex-col items-center justify-center gap-4 py-10 text-center"
        role={isError ? "alert" : "status"}
        aria-live="polite"
        aria-busy={retrying}
      >
        <span className={`flex size-11 items-center justify-center rounded-lg border bg-surface-control ${isError ? "border-goal/35 text-goal" : "border-surface-border text-ink-dim"}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="max-w-xl">
          <h2 className="text-base font-bold text-ink">
            {isError ? "Không thể tải dữ liệu benchmark" : "Chưa có dữ liệu benchmark khả dụng"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-dim">
            {isError
              ? message
              : "Trang này chỉ đọc artifact đã lưu. Hiện chưa có dữ liệu phù hợp để trình bày và trang sẽ không tự tạo hoặc thay đổi kết quả."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button type="button" variant="secondary" onClick={onRetry} disabled={retrying}>
            <RefreshCw className={retrying ? "animate-spin" : undefined} aria-hidden="true" />
            {retrying ? "Đang thử lại…" : "Thử lại"}
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">Về bản đồ</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BenchmarkPage() {
  const { data, state, errMsg, retrying, retry } = useBenchmark();
  const reducedMotion = useReducedMotion();
  const palette = usePalette();
  const inkDim = palette.hex.inkDim;
  const grid = palette.hex.grid;
  const pink = palette.hex.frontier;
  const amber = palette.hex.path;
  const violet = palette.hex.expanded;
  const animateCharts = !reducedMotion;

  const exp3 = data?.find((experiment) => experiment.experiment_id === 3);
  const exp5 = data?.find((experiment) => experiment.experiment_id === 5);

  const byAlgorithm = React.useMemo<AlgorithmDatum[]>(() => {
    if (!exp3) return [];
    const algorithms = [
      ...new Set(exp3.rows.map((row) => String(row.algorithm ?? "").trim()).filter(Boolean)),
    ];
    return algorithms.map((algorithm) => {
      const rows = exp3.rows.filter((row) => row.algorithm === algorithm);
      return {
        algorithm,
        // Trục log không nhận 0; giữ ngưỡng hiển thị đã có của trang cũ.
        expanded: Math.max(1, Math.round(mean(rows, "nodes_expanded"))),
        runtime: Math.max(0.01, Number(mean(rows, "runtime_ms").toFixed(2))),
      };
    });
  }, [exp3]);

  const gamma = React.useMemo<GammaDatum[]>(() => {
    if (!exp5) return [];
    return exp5.rows
      .map((row) => ({
        gamma: Number(row.gamma),
        time: Number(Number(row.avg_time_s).toFixed(1)),
        dist: Number((Number(row.avg_distance_m) / 1000).toFixed(2)),
      }))
      .filter((row) => Number.isFinite(row.gamma) && Number.isFinite(row.time) && Number.isFinite(row.dist));
  }, [exp5]);

  const isPartial = state === "ready" && (!byAlgorithm.length || !gamma.length);
  const formatLogTick = (value: number) =>
    value >= 1000 ? `${fmtVi(value / 1000, 0)}k` : fmtVi(value, value < 1 ? 2 : 0);
  const tooltipStyle = {
    contentStyle: {
      background: palette.hex.panel,
      border: `1px solid ${grid}`,
      borderRadius: 14,
      color: "rgb(var(--ink))",
    },
    labelStyle: { color: inkDim },
  };

  return (
    <main className="pastel-app-bg h-screen overflow-y-auto text-ink">
      <header className="pastel-header sticky top-0 z-20 border-b border-surface-border/80 shadow-sm">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              Bản đồ
            </Link>
          </Button>
          <span className="h-5 w-px bg-surface-border" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">Benchmark</p>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100%-60px)] max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <section aria-labelledby="benchmark-title" className="flex flex-col gap-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-faint">Phân tích thực nghiệm</p>
          <h1 id="benchmark-title" className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Benchmark — 7 thí nghiệm
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ink-dim">
            Góc nhìn trực quan cho các artifact benchmark đã lưu của bài toán tìm đường và ATSP.
          </p>
        </section>

        {state === "ready" ? (
          <section
            aria-labelledby="benchmark-provenance-title"
            className="rounded-lg border border-algo-path/35 bg-algo-path/10 p-3"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-algo-path/30 bg-surface-panel text-algo-path">
                <Database className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="warn">SỐ TẠM</Badge>
                  {isPartial && <Badge>Dữ liệu chưa đủ biểu đồ</Badge>}
                  <h2 id="benchmark-provenance-title" className="text-sm font-bold text-ink">
                    Dữ liệu benchmark đã lưu
                  </h2>
                </div>
                <p className="mt-1 text-xs leading-5 text-ink-dim sm:text-sm">
                  Trang đang đọc artifact trong <code className="font-mono text-ink">results/</code>. Bộ này cũ hơn graph hiện hành,
                  chỉ dùng để minh họa giao diện hoặc tham khảo lịch sử và không phải kết quả chính thức của bộ dữ liệu đang dùng.
                </p>
              </div>
            </div>
          </section>
        ) : state === "loading" ? (
          <section aria-label="Đang xác định trạng thái dữ liệu" className="rounded-lg border border-surface-border bg-surface-panel p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-full max-w-2xl" /></div>
            </div>
          </section>
        ) : (
          <section aria-label="Nguồn dữ liệu benchmark" className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-panel px-3 py-2 text-xs leading-5 text-ink-dim">
            <Database className="size-4 shrink-0" aria-hidden="true" />
            Trang chỉ đọc artifact benchmark đã lưu và không thay đổi <code className="font-mono text-ink">results/</code>.
          </section>
        )}

        {state === "loading" && (
          <section aria-label="Đang tải dữ liệu benchmark" aria-busy="true" className="grid gap-4 lg:grid-cols-2">
            <span className="sr-only" role="status">Đang tải dữ liệu benchmark…</span>
            <Card>
              <CardHeader><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader>
              <CardContent><Skeleton className="h-72" /></CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader>
              <CardContent><Skeleton className="h-72" /></CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/3" /></CardHeader>
              <CardContent><Skeleton className="h-72" /></CardContent>
            </Card>
          </section>
        )}

        {state === "empty" && <StateCard kind="empty" retrying={retrying} onRetry={retry} />}
        {state === "error" && (
          <StateCard kind="error" message={errMsg || "Không nhận được phản hồi hợp lệ từ máy chủ."} retrying={retrying} onRetry={retry} />
        )}

        {state === "ready" && (
          <section aria-label="Biểu đồ benchmark đã lưu" className="grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b border-surface-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="expanded-chart-title" className="text-[15px] font-bold text-ink">Số node expand trung bình theo thuật toán</h2>
                    <p className="mt-1 text-xs leading-5 text-ink-dim">Số node expand trung bình theo thuật toán · thang log</p>
                  </div>
                  <Badge className="shrink-0">Node</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {byAlgorithm.length ? (
                  <>
                    <p id="expanded-chart-desc" className="sr-only">
                      Biểu đồ cột so sánh số node expand trung bình của các thuật toán trên trục log. Dữ liệu là artifact lịch sử đã lưu.
                    </p>
                    <div role="img" aria-labelledby="expanded-chart-title" aria-describedby="expanded-chart-desc" className="h-72 min-w-0">
                      <div aria-hidden="true" className="size-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart accessibilityLayer={false} tabIndex={-1} data={byAlgorithm} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                            <CartesianGrid stroke={grid} vertical={false} />
                            <XAxis dataKey="algorithm" stroke={inkDim} fontSize={10} interval={0} angle={-30} textAnchor="end" height={52} tickMargin={3} />
                            <YAxis stroke={inkDim} fontSize={11} scale="log" domain={[1, "auto"]} tickFormatter={formatLogTick} width={44} />
                            <RTooltip
                              {...tooltipStyle}
                              cursor={{ fill: `${grid}55` }}
                              formatter={(value: number | string): [string, string] => [fmtInt(Number(value)), "Node expand"]}
                            />
                            <Bar dataKey="expanded" name="Node expand" fill={pink} radius={[4, 4, 0, 0]} isAnimationActive={animateCharts} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <MissingChart message="Không có dữ liệu đã lưu phù hợp để dựng biểu đồ này (thí nghiệm 3)." />
                )}
              </CardContent>
              {byAlgorithm.length > 0 && (
                <ChartDataTable
                  label="Bảng số node expand trung bình theo thuật toán"
                  columns={["Thuật toán", "Node expand trung bình"]}
                  rows={byAlgorithm.map((row) => [row.algorithm, fmtInt(row.expanded)])}
                />
              )}
            </Card>

            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b border-surface-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="runtime-chart-title" className="text-[15px] font-bold text-ink">Thời gian chạy trung bình theo thuật toán</h2>
                    <p className="mt-1 text-xs leading-5 text-ink-dim">Runtime trung bình theo thuật toán · thang log</p>
                  </div>
                  <Badge className="shrink-0">ms</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {byAlgorithm.length ? (
                  <>
                    <p id="runtime-chart-desc" className="sr-only">
                      Biểu đồ cột so sánh runtime trung bình tính bằng mili giây trên trục log. Dữ liệu là artifact lịch sử đã lưu.
                    </p>
                    <div role="img" aria-labelledby="runtime-chart-title" aria-describedby="runtime-chart-desc" className="h-72 min-w-0">
                      <div aria-hidden="true" className="size-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart accessibilityLayer={false} tabIndex={-1} data={byAlgorithm} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                            <CartesianGrid stroke={grid} vertical={false} />
                            <XAxis dataKey="algorithm" stroke={inkDim} fontSize={10} interval={0} angle={-30} textAnchor="end" height={52} tickMargin={3} />
                            <YAxis stroke={inkDim} fontSize={11} scale="log" domain={[0.01, "auto"]} tickFormatter={formatLogTick} width={44} />
                            <RTooltip
                              {...tooltipStyle}
                              cursor={{ fill: `${grid}55` }}
                              formatter={(value: number | string): [string, string] => [`${fmtVi(Number(value), 2)} ms`, "Runtime trung bình"]}
                            />
                            <Bar dataKey="runtime" name="Runtime (ms)" fill={violet} radius={[4, 4, 0, 0]} isAnimationActive={animateCharts} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <MissingChart message="Không có dữ liệu đã lưu phù hợp để dựng biểu đồ này (thí nghiệm 3)." />
                )}
              </CardContent>
              {byAlgorithm.length > 0 && (
                <ChartDataTable
                  label="Bảng runtime trung bình theo thuật toán"
                  columns={["Thuật toán", "Runtime trung bình (ms)"]}
                  rows={byAlgorithm.map((row) => [row.algorithm, fmtVi(row.runtime, 2)])}
                />
              )}
            </Card>

            <Card className="min-w-0 overflow-hidden lg:col-span-2">
              <CardHeader className="border-b border-surface-border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="gamma-chart-title" className="text-[15px] font-bold text-ink">Độ nhạy trọng số γ</h2>
                    <p className="mt-1 text-xs leading-5 text-ink-dim">Thời gian và quãng đường trung bình của tuyến được chọn</p>
                  </div>
                  <div className="flex gap-2"><Badge>giây</Badge><Badge>km</Badge></div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {gamma.length ? (
                  <>
                    <p id="gamma-chart-desc" className="sr-only">
                      Biểu đồ đường thể hiện thời gian trung bình tính bằng giây và quãng đường trung bình tính bằng ki-lô-mét theo trọng số gamma. Dữ liệu là artifact lịch sử đã lưu.
                    </p>
                    <div role="img" aria-labelledby="gamma-chart-title" aria-describedby="gamma-chart-desc" className="h-72 min-w-0">
                      <div aria-hidden="true" className="size-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart accessibilityLayer={false} tabIndex={-1} data={gamma} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                            <CartesianGrid stroke={grid} vertical={false} />
                            <XAxis dataKey="gamma" stroke={inkDim} fontSize={11} tickFormatter={(value: number) => fmtVi(Number(value), 1)} />
                            <YAxis yAxisId="t" stroke={amber} fontSize={11} tickFormatter={(value: number) => fmtVi(Number(value), 0)} width={48} />
                            <YAxis yAxisId="d" orientation="right" stroke={violet} fontSize={11} tickFormatter={(value: number) => fmtVi(Number(value), 1)} width={42} />
                            <RTooltip
                              {...tooltipStyle}
                              labelFormatter={(label) => `γ = ${fmtVi(Number(label), 1)}`}
                              formatter={(value: number | string, name: string): [string, string] => [
                                name.includes("km") ? `${fmtVi(Number(value), 2)} km` : `${fmtVi(Number(value), 1)} s`,
                                name,
                              ]}
                            />
                            <RLegend wrapperStyle={{ fontSize: 12, color: inkDim }} />
                            <Line yAxisId="t" dataKey="time" name="Thời gian TB (s)" stroke={amber} dot={{ r: 3 }} strokeWidth={2} isAnimationActive={animateCharts} />
                            <Line yAxisId="d" dataKey="dist" name="Quãng đường TB (km)" stroke={violet} dot={{ r: 3 }} strokeWidth={2} isAnimationActive={animateCharts} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                ) : (
                  <MissingChart message="Không có dữ liệu đã lưu phù hợp để dựng biểu đồ này (thí nghiệm 5)." />
                )}
              </CardContent>
              {gamma.length > 0 && (
                <ChartDataTable
                  label="Bảng độ nhạy trọng số gamma"
                  columns={["γ", "Thời gian TB (s)", "Quãng đường TB (km)"]}
                  rows={gamma.map((row) => [fmtVi(row.gamma, 1), fmtVi(row.time, 1), fmtVi(row.dist, 2)])}
                  firstColumnNumeric
                />
              )}
            </Card>
          </section>
        )}

        <footer className="flex items-center gap-2 border-t border-surface-border py-4 text-xs leading-5 text-ink-faint">
          <Database className="size-4 shrink-0" aria-hidden="true" />
          Chế độ chỉ đọc — trang không chạy lại benchmark hoặc ghi vào results/.
        </footer>
      </div>
    </main>
  );
}
