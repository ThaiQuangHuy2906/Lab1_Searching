import { ArrowRight } from "lucide-react";
import { Badge } from "../ui/badge";
import { CostBreakdown } from "./cost-breakdown";
import { ResultContextStrip } from "./result-context-strip";
import { atspExplanationViewModel } from "@/lib/explanation-policy";
import { describeAtspSavings } from "@/lib/atsp-savings";
import { fmtInt, fmtKm, fmtMinutes, fmtMs, fmtPct } from "@/lib/format";
import type {
  AtspMethodStats, AtspResultEnvelope, GraphResponse, LegMetrics, Mode,
} from "@/lib/types";

function formatObjective(mode: Mode, value: number): string {
  if (mode === "distance") return fmtKm(value);
  return `${fmtMinutes(value)}${mode === "balanced" ? " quy đổi" : ""}`;
}

function totalsRows(mode: Mode, totals: LegMetrics) {
  const rows = [{
    label: mode === "distance" ? "Tổng quãng đường theo tiêu chí" : mode === "time" ? "Tổng thời gian theo tiêu chí" : "Tổng chi phí cân bằng",
    value: formatObjective(mode, totals.total_cost),
  }];
  if (mode !== "distance") rows.push({ label: "Quãng đường", value: fmtKm(totals.total_distance_m) });
  return rows;
}

function methodStatsRows(stats: AtspMethodStats, mode: Mode): Array<{ label: string; value: string }> {
  if (stats.kind === "held_karp") return [
    { label: "Trạng thái DP đã giải", value: fmtInt(stats.dp_states_solved) },
    { label: "Transition đã đánh giá", value: fmtInt(stats.transitions_evaluated) },
  ];
  if (stats.kind === "nn_local_search") return [
    { label: "Ứng viên NN", value: fmtInt(stats.nn_candidates_evaluated) },
    { label: "Ứng viên 2-opt / Or-opt", value: `${fmtInt(stats.two_opt_candidates_evaluated)} / ${fmtInt(stats.or_opt_candidates_evaluated)}` },
    { label: "Move được chấp nhận", value: `${fmtInt(stats.accepted_2opt_moves)} 2-opt · ${fmtInt(stats.accepted_oropt_moves)} Or-opt` },
    { label: "Cải thiện sau NN", value: formatObjective(mode, stats.improvement_after_nn) },
  ];
  return [
    { label: "Seed / seed tốt nhất", value: `${fmtInt(stats.seed_count)} / ${stats.best_seed}` },
    { label: "Move đã thử", value: fmtInt(stats.attempted_moves) },
    { label: "Move tốt hơn / kém hơn được nhận", value: `${fmtInt(stats.accepted_improving_moves)} / ${fmtInt(stats.accepted_worse_moves)}` },
    { label: "Độ lệch chuẩn best cost", value: formatObjective(mode, stats.stddev_best_cost) },
  ];
}

function Order({ ids, nameOf }: { ids: readonly string[]; nameOf: (id: string) => string }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {ids.map((id, index) => (
        <li key={`${index}-${id}`} className="flex items-center gap-1.5">
          <span className="rounded-md border border-surface-border bg-surface-control px-2 py-1 text-xs text-ink">
            <span className="mr-1 font-mono text-algo-frontier">{index + 1}.</span>{nameOf(id)}
          </span>
          {index < ids.length - 1 && <ArrowRight className="size-3 text-ink-faint" />}
        </li>
      ))}
    </ol>
  );
}

export function AtspResultExplanation({
  envelope,
  graphData,
}: {
  envelope: AtspResultEnvelope;
  graphData: GraphResponse | null;
}) {
  const vm = atspExplanationViewModel(envelope);
  const response = envelope.response;
  const savings = describeAtspSavings(response.savings_pct);
  const nameOf = (id: string) => graphData?.nodes.find((node) => node.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-3">
      <ResultContextStrip envelope={envelope} graphData={graphData} />

      <section aria-labelledby="atsp-verdict-title" className="rounded-lg border border-algo-frontier/30 bg-algo-frontier/5 p-3">
        <h3 id="atsp-verdict-title" className="text-sm font-bold text-ink">Kết luận</h3>
        <p className="mt-1 text-[13px] font-semibold leading-6 text-ink">{vm.headline}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant={response.optimal_guarantee ? "ok" : "warn"}>
            {!response.found ? "Không có nghiệm — optimizer chưa chạy" : response.optimal_guarantee ? "Có bảo đảm tối ưu" : "Nghiệm khả thi, chưa chứng minh tối ưu"}
          </Badge>
          <Badge variant={vm.availability === "contract_error" ? "warn" : "default"}>
            {vm.topology === "closed" ? "Vòng kín: quay về Đi" : "Hành trình mở"}
          </Badge>
          {response.totals && <Badge className="font-mono">Tổng theo tiêu chí: {formatObjective(envelope.snapshot.mode, response.totals.total_cost)}</Badge>}
        </div>
        {vm.availability === "legacy_fallback" && (
          <p className="mt-2 text-xs leading-5 text-ink-dim">Response v1: chỉ trình bày các field thực có; không dựng matrix evidence, breakdown hay method stats từ prose.</p>
        )}
      </section>

      {response.contract_version === 2 && !response.found ? (
        <section aria-labelledby="atsp-failure-title" className="rounded-lg border border-goal/35 bg-goal/10 p-3">
          <h3 id="atsp-failure-title" className="text-sm font-bold text-ink">Ma trận có hướng chưa đầy đủ</h3>
          <p className="mt-1 text-xs leading-5 text-ink-dim">
            Không có đường từ <b className="text-ink">{nameOf(response.failure.from_node)}</b> đến <b className="text-ink">{nameOf(response.failure.to_node)}</b>. Bước tối ưu chưa chạy, nên không có thứ tự hay tổng chi phí để hiển thị.
          </p>
        </section>
      ) : response.found && response.totals ? (
        <>
          <section aria-labelledby="atsp-order-title">
            <h3 id="atsp-order-title" className="mb-2 text-sm font-bold text-ink">Thứ tự vào và kết quả</h3>
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-surface-border bg-surface-panel p-2.5">
                <p className="mb-2 text-xs font-semibold text-ink-dim">Thứ tự người dùng nhập</p>
                <Order ids={response.contract_version === 2 ? response.original_order : [envelope.snapshot.start ?? "", ...envelope.snapshot.stops].filter(Boolean)} nameOf={nameOf} />
              </div>
              <div className="rounded-lg border border-algo-path/30 bg-algo-path/5 p-2.5">
                <p className="mb-2 text-xs font-semibold text-ink-dim">Thứ tự optimizer trả về</p>
                <Order ids={response.order} nameOf={nameOf} />
              </div>
            </div>
          </section>

          <section aria-labelledby="atsp-total-title">
            <h3 id="atsp-total-title" className="mb-2 text-sm font-bold text-ink">Tổng kết theo tiêu chí đang chọn</h3>
            <dl className="flex flex-col gap-1.5">
              {totalsRows(envelope.snapshot.mode, response.totals).map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-surface-control px-2.5 py-2 text-xs">
                  <dt className="text-ink-dim">{row.label}</dt><dd className="font-mono font-semibold text-ink">{row.value}</dd>
                </div>
              ))}
              {savings.absolutePct !== null && <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-control px-2.5 py-2 text-xs"><dt className="text-ink-dim">{savings.label} so với thứ tự nhập</dt><dd className="font-mono font-semibold text-ink">{fmtPct(savings.absolutePct)}</dd></div>}
            </dl>
          </section>
        </>
      ) : (
        <p className="rounded-lg border border-surface-border bg-surface-control p-2.5 text-xs text-ink-dim">Dữ liệu v1 không chứa đủ tổng chi phí để trình bày thay đổi; giá trị thiếu không được tự xem là 0.</p>
      )}

      {response.contract_version === 2 && response.found && (
        <section aria-labelledby="atsp-breakdown-title">
          <h3 id="atsp-breakdown-title" className="mb-2 text-sm font-bold text-ink">Điều tạo nên chi phí kết quả</h3>
          <CostBreakdown mode={envelope.snapshot.mode} breakdown={response.totals_breakdown} />
        </section>
      )}

      {response.contract_version === 2 && (
        <section aria-labelledby="atsp-matrix-title" className="rounded-lg border border-surface-border bg-surface-panel p-3">
          <h3 id="atsp-matrix-title" className="text-sm font-bold text-ink">Ma trận có hướng và công sức tính</h3>
          <p className="mt-1 text-xs leading-5 text-ink-dim">
            Đã có {fmtInt(response.matrix_evidence.reachable_directed_pair_count)}/{fmtInt(response.matrix_evidence.directed_pair_count)} cặp có hướng đi được; {fmtInt(response.matrix_evidence.asymmetric_unordered_pair_count)} cặp không đối xứng.
          </p>
          {response.matrix_evidence.asymmetry_example && (
            <p className="mt-1 text-xs leading-5 text-ink-dim">Ví dụ: {nameOf(response.matrix_evidence.asymmetry_example.from_node)} → {nameOf(response.matrix_evidence.asymmetry_example.to_node)} có chi phí {formatObjective(envelope.snapshot.mode, response.matrix_evidence.asymmetry_example.forward_cost)}, chiều ngược {formatObjective(envelope.snapshot.mode, response.matrix_evidence.asymmetry_example.reverse_cost)}.</p>
          )}
          <dl className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs">
            <dt className="text-ink-dim">Lượt tìm đường dựng ma trận</dt><dd className="font-mono text-ink">{fmtInt(response.computation_metrics.matrix_search_runs)}</dd>
            <dt className="text-ink-dim">Thời gian dựng ma trận</dt><dd className="font-mono text-ink">{fmtMs(response.computation_metrics.matrix_runtime_ms)}</dd>
            <dt className="text-ink-dim">Thời gian optimizer</dt><dd className="font-mono text-ink">{fmtMs(response.computation_metrics.optimizer_runtime_ms)}</dd>
          </dl>
          {response.found && (
            <details className="mt-2 text-xs">
              <summary className="flex min-h-10 cursor-pointer items-center font-semibold text-ink">Thống kê riêng của phương pháp</summary>
              <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 pb-1">
                {methodStatsRows(response.method_stats, envelope.snapshot.mode).map((row) => <div className="contents" key={row.label}><dt className="text-ink-dim">{row.label}</dt><dd className="font-mono text-ink">{row.value}</dd></div>)}
              </dl>
            </details>
          )}
        </section>
      )}
    </div>
  );
}
