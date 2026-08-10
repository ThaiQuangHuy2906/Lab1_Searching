import { Badge } from "../ui/badge";
import { CostBreakdown } from "./cost-breakdown";
import { ReferenceRouteComparison } from "./reference-route-comparison";
import { ResultContextStrip } from "./result-context-strip";
import { SearchStepExplanation } from "./search-step";
import { routeExplanationViewModel } from "@/lib/explanation-policy";
import {
  criterionExplanation, objectiveTotalLabel, presentFactor,
} from "@/lib/factor-presentation";
import { fmtKm, fmtMinutes, fmtPct } from "@/lib/format";
import type { SequentialRouteRun } from "@/lib/sequential-route";
import type {
  ExplanationFactor, GraphResponse, Mode, ReferenceRoute, RouteResultEnvelope, Trace, TraceV2,
} from "@/lib/types";

function formatModeValue(mode: Mode, value: number): string {
  if (mode === "distance") return fmtKm(value);
  return `${fmtMinutes(value)}${mode === "balanced" ? " quy đổi" : ""}`;
}

function referenceRelation(reference: ReferenceRoute, mode: Mode): string {
  if (reference.relation_to_selected === "equivalent") return "Tương đương tuyến đã chọn";
  const direction = reference.relation_to_selected === "better" ? "tốt hơn" : "kém hơn";
  return `${direction} ${formatModeValue(mode, Math.abs(reference.reference_minus_selected_cost))}`;
}

function routeVerdict(
  envelope: RouteResultEnvelope,
  sources: readonly Trace[],
): { headline: string; limitation: string; objective: number | null; exactGapPct: number | null } {
  if (envelope.snapshot.problemMode === "two_point") {
    const vm = routeExplanationViewModel(envelope.response);
    const pct = envelope.response.contract_version === 2
      ? envelope.response.explanation.evidence.objective.optimality_gap_pct
      : null;
    return {
      headline: vm.headline,
      limitation: vm.limitation ?? (vm.availability === "legacy_fallback"
        ? "Dữ liệu v1: chỉ trình bày những gì lần chạy thực sự cung cấp; không tự suy quy tắc, cách tính chi phí hoặc chứng minh từ câu mô tả."
        : envelope.response.contract_version === 2 && envelope.response.termination.reachability === "proven_unreachable"
          ? "Đã chứng minh không có đường trong đồ thị có hướng và dữ liệu của lần chạy hiện tại."
          : envelope.response.contract_version === 2 && envelope.response.termination.reachability === "inconclusive"
            ? "Chưa thể kết luận: giới hạn vòng, độ sâu hoặc việc cắt bớt ứng viên không đủ để chứng minh đồ thị vô đường."
            : "Trường hợp trivial: Đi trùng Đến nên không đánh giá chất lượng một tuyến có cạnh."),
      objective: vm.objectiveValue,
      exactGapPct: pct,
    };
  }
  const complete = sources.length === envelope.snapshot.stops.length
    + (envelope.snapshot.returnToStart ? 1 : 0)
    && sources.every((trace) => trace.found);
  const qualities = sources.flatMap((trace) => trace.contract_version === 2
    ? [trace.termination.solution_quality] : []);
  const allExact = qualities.length === sources.length
    && qualities.every((quality) => quality === "exact");
  return {
    headline: complete
      ? `Đã tìm đường qua ${sources.length} chặng theo đúng thứ tự đã khóa.`
      : "Hành trình dừng ở chặng chưa tìm thấy tuyến.",
    limitation: allExact
      ? "Mỗi chặng có bảo đảm tối ưu chính xác (exact); thứ tự giao hàng vẫn là dữ liệu vào cố định và chưa được tối ưu."
      : "Thứ tự giao hàng là dữ liệu vào cố định. Bảo đảm của từng chặng được trình bày riêng; không suy thành bảo đảm tối ưu thứ tự.",
    objective: envelope.response.metrics.total_cost,
    exactGapPct: null,
  };
}

function qualityLabel(envelope: RouteResultEnvelope, sources: readonly Trace[]): string {
  if (envelope.snapshot.problemMode === "multi_point") {
    const structured = sources.filter((trace): trace is TraceV2 => trace.contract_version === 2);
    return structured.length === sources.length
      && structured.every((trace) => trace.termination.solution_quality === "exact")
      ? "Tối ưu chính xác trên từng chặng" : "Chất lượng theo từng chặng";
  }
  const trace = envelope.response;
  if (trace.contract_version !== 2) return "Dữ liệu v1 giới hạn";
  if (trace.termination.solution_quality === "exact") return "Tối ưu chính xác (exact)";
  if (trace.termination.solution_quality === "epsilon_bounded") return "Có bảo đảm sai số ε";
  if (trace.termination.solution_quality === "feasible_unproven") return "Có tuyến, chưa chứng minh tối ưu";
  if (trace.termination.reachability === "proven_unreachable") return "Đã chứng minh không có đường";
  if (trace.termination.reachability === "inconclusive") return "Chưa thể kết luận có đường hay không";
  return "Đi trùng Đến";
}

function FactorItem({ factor, mode }: { factor: ExplanationFactor; mode: Mode }) {
  const display = presentFactor(factor, mode);
  return (
    <li className="rounded-lg border border-surface-border bg-surface-control px-2.5 py-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="font-semibold text-ink">{display.title}</span>
        <Badge variant={factor.affects_objective ? "ok" : "default"}>{display.status}</Badge>
      </div>
      {display.valueText && <p className="mt-1 font-medium text-ink">{display.valueText}</p>}
      <details className="mt-1 text-ink-dim">
        <summary className="flex min-h-8 cursor-pointer items-center">Nguồn dữ liệu</summary>
        <p className="pb-1 leading-5">{display.sourceText}</p>
      </details>
    </li>
  );
}

export function RouteExplanation({
  envelope,
  graphData,
  sequentialRoute,
  stepIdx,
  enableReferenceComparison,
}: {
  envelope: RouteResultEnvelope;
  graphData: GraphResponse | null;
  sequentialRoute: SequentialRouteRun | null;
  stepIdx: number;
  enableReferenceComparison: boolean;
}) {
  const sources = envelope.sourceResponses;
  const verdict = routeVerdict(envelope, sources);
  const quality = qualityLabel(envelope, sources);
  const nameOf = (id: string) => graphData?.nodes.find((node) => node.id === id)?.name ?? id;
  const presentedSource = sequentialRoute?.presentedStepSources[Math.min(stepIdx, sequentialRoute.presentedStepSources.length - 1)];
  const stepTrace = presentedSource ? sources[presentedSource.legIndex] : sources[0] ?? envelope.response;
  const sourceStepIndex = presentedSource?.sourceStepIndex ?? stepIdx;
  const structuredSources = sources.filter((trace): trace is TraceV2 => trace.contract_version === 2);
  const legacy = structuredSources.length !== sources.length;
  const singleTwoPointReference = enableReferenceComparison
    && envelope.snapshot.problemMode === "two_point"
    && envelope.response.contract_version === 2;

  return (
    <div className="flex flex-col gap-3">
      <ResultContextStrip envelope={envelope} graphData={graphData} />

      <section aria-labelledby="explanation-verdict-title" className="rounded-lg border border-algo-frontier/30 bg-algo-frontier/5 p-3">
        <h3 id="explanation-verdict-title" className="text-sm font-bold text-ink">Kết luận</h3>
        <p className="mt-1 text-[13px] font-semibold leading-6 text-ink">{verdict.headline}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant={quality.startsWith("Tối ưu chính xác") ? "ok" : "warn"}>{quality}</Badge>
          {verdict.objective !== null && (
            <Badge className="font-mono">{objectiveTotalLabel(envelope.snapshot.mode)}: {formatModeValue(envelope.snapshot.mode, verdict.objective)}</Badge>
          )}
          {verdict.exactGapPct !== null && <Badge>Chênh so với tuyến tối ưu: {fmtPct(verdict.exactGapPct)}</Badge>}
        </div>
        <p className="mt-2 text-xs leading-5 text-ink-dim">{verdict.limitation}</p>
      </section>

      {singleTwoPointReference && (
        <ReferenceRouteComparison
          envelope={envelope}
          trace={envelope.response}
          graphData={graphData}
        />
      )}

      <section aria-labelledby="explanation-cost-title">
        <h3 id="explanation-cost-title" className="text-sm font-bold text-ink">Chi phí được chia như thế nào?</h3>
        <p className="mb-2 mt-1 text-xs leading-5 text-ink-dim">Bảng dưới tách kết quả thành quãng đường, thời gian do ùn tắc và phần phạt rủi ro để dễ kiểm tra.</p>
        {envelope.snapshot.problemMode === "two_point" && envelope.response.contract_version === 2
          && envelope.response.explanation.evidence.cost_breakdown ? (
            <CostBreakdown mode={envelope.snapshot.mode} breakdown={envelope.response.explanation.evidence.cost_breakdown} />
          ) : structuredSources.length > 0 ? (
            <div className="flex flex-col gap-2">
              {structuredSources.map((trace, index) => trace.explanation.evidence.cost_breakdown && (
                <details key={`${index}-${trace.path.join("-")}`} className="rounded-lg border border-surface-border bg-surface-panel px-2.5">
                  <summary className="flex min-h-10 cursor-pointer items-center text-xs font-semibold text-ink">
                    {sequentialRoute?.legs[index]?.closing_leg ? "Chặng quay về Đi" : `Chặng ${index + 1}`}: {nameOf(trace.path[0] ?? "")} → {nameOf(trace.path.at(-1) ?? "")}
                  </summary>
                  <div className="pb-2"><CostBreakdown mode={envelope.snapshot.mode} breakdown={trace.explanation.evidence.cost_breakdown} /></div>
                </details>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-surface-border bg-surface-control p-2.5 text-xs leading-5 text-ink-dim">
              Dữ liệu v1 chưa cho biết chi phí được chia thành những phần nào; giá trị thiếu không được tự xem là 0.
            </p>
          )}
      </section>

      <section aria-labelledby="explanation-factors-title">
        <h3 id="explanation-factors-title" className="text-sm font-bold text-ink">Vì sao tổng chi phí có giá trị này?</h3>
        <p className="mb-2 mt-1 rounded-lg border border-surface-border bg-surface-panel p-2.5 text-xs leading-5 text-ink-dim">
          {criterionExplanation(envelope.snapshot.mode)} Nhãn “Có tính vào tiêu chí” nghĩa là yếu tố đó có tham gia đánh giá tuyến trong chế độ hiện tại.
        </p>
        {envelope.response.explanation.congested_segments.length > 0 && (
          <p className="mb-2 rounded-lg border border-goal/30 bg-goal/5 px-2.5 py-2 text-xs leading-5 text-ink-dim">
            Đường đỏ trên bản đồ đánh dấu các đoạn thuộc tuyến kết quả có ùn tắc mức 4–5 theo hồ sơ khung giờ; không phải đường thuật toán đang đi ở bước hiện tại.
          </p>
        )}
        {structuredSources.some((trace) => trace.explanation.evidence.factors.length > 0) ? (
          <div className="flex flex-col gap-2">
            {structuredSources.map((trace, legIndex) => {
              const factors = trace.explanation.evidence.factors;
              const total = factors.find((factor) => factor.kind === "objective_truth");
              const details = factors.filter((factor) => factor.kind !== "objective_truth");
              return (
                <article key={`${legIndex}-${trace.path.join("-")}`} className="rounded-lg border border-surface-strong bg-surface-panel p-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-ink">{envelope.snapshot.problemMode === "multi_point" ? sequentialRoute?.legs[legIndex]?.closing_leg ? "Chặng quay về Đi" : `Chặng ${legIndex + 1}` : "Tuyến kết quả"}</h4>
                      <p className="mt-0.5 text-xs text-ink-dim">{nameOf(trace.path[0] ?? "")} → {nameOf(trace.path.at(-1) ?? "")}</p>
                    </div>
                    {total && <Badge className="font-mono">{presentFactor(total, envelope.snapshot.mode).valueText}</Badge>}
                  </div>
                  {details.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {details.map((factor) => <FactorItem key={factor.id} factor={factor} mode={envelope.snapshot.mode} />)}
                    </ul>
                  ) : <p className="mt-2 text-xs text-ink-dim">Không có yếu tố bổ sung ngoài tổng chi phí của chặng.</p>}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="rounded-lg border border-surface-border bg-surface-control p-2.5 text-xs leading-5 text-ink-dim">
            {legacy ? "Dữ liệu v1 không có danh sách yếu tố có cấu trúc; không tự suy nguyên nhân từ câu mô tả." : "Lần chạy này không có yếu tố riêng ngoài các số liệu đã nêu trong phần chi phí."}
          </p>
        )}
      </section>

      {!singleTwoPointReference && (
        <section aria-labelledby="explanation-reference-title">
          <h3 id="explanation-reference-title" className="text-sm font-bold text-ink">Các tuyến tham chiếu để đối chiếu</h3>
          <p className="mt-1 text-xs leading-5 text-ink-dim">
            Tuyến tham chiếu được hệ thống tính thêm sau khi chạy. Không dùng các tuyến hậu kiểm này để kết luận thuật toán chính đã xét hay loại một full route.
          </p>
          {structuredSources.some((trace) => trace.explanation.evidence.reference_routes.length > 0) ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {structuredSources.flatMap((trace, legIndex) => trace.explanation.evidence.reference_routes.map((reference) => (
                <li key={`${legIndex}-${reference.id}`} className="rounded-lg border border-surface-border bg-surface-panel p-2.5 text-xs">
                  <p className="font-semibold text-ink">{envelope.snapshot.problemMode === "multi_point" ? `Chặng ${legIndex + 1} · ` : ""}{reference.kind.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-ink-dim">Hậu kiểm bằng UCS · {referenceRelation(reference, envelope.snapshot.mode)}</p>
                </li>
              ))) }
            </ul>
          ) : envelope.response.explanation.alternatives.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {envelope.response.explanation.alternatives.map((reference) => (
                <li key={reference.label} className="rounded-lg border border-surface-border bg-surface-panel p-2.5 text-xs">
                  <p className="font-semibold text-ink">{reference.label}</p>
                  <p className="mt-1 leading-5 text-ink-dim">Dữ liệu v1 có tuyến hậu kiểm nhưng không đủ tổng chi phí theo đúng tiêu chí để tính mức chênh lệch.</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-xs text-ink-dim">Không có tuyến tham chiếu typed cho result này.</p>}
        </section>
      )}

      {stepTrace && <SearchStepExplanation trace={stepTrace} stepIndex={sourceStepIndex} />}
    </div>
  );
}
