import { presentBidirectionalTermination, presentSearchStep } from "@/lib/search-step-explanation";
import type { Trace } from "@/lib/types";

export function SearchStepExplanation({ trace, stepIndex }: { trace: Trace; stepIndex: number }) {
  const step = presentSearchStep(trace, stepIndex);
  const termination = presentBidirectionalTermination(trace);
  return (
    <section aria-labelledby="explanation-step-title" className="rounded-lg border border-surface-border bg-surface-panel p-3">
      <h3 id="explanation-step-title" className="text-sm font-bold text-ink">Thuật toán đang làm gì? · {step.title}</h3>
      <p className="mt-2 text-xs font-medium leading-5 text-ink">{step.summary}</p>
      <details className="mt-2 rounded-lg border border-surface-border bg-surface-control/70 px-2.5 text-xs">
        <summary className="flex min-h-10 cursor-pointer items-center font-medium text-ink-dim">
          Xem chi tiết kỹ thuật của bước này
        </summary>
        <div className="pb-2">
          <dl className="flex flex-col gap-2 leading-5">
            <div><dt className="font-semibold text-ink">Điểm đang mở rộng</dt><dd className="text-ink-dim">{step.action}</dd></div>
            <div><dt className="font-semibold text-ink">Quy tắc chính xác</dt><dd className="text-ink-dim">{step.rule}</dd></div>
            <div><dt className="font-semibold text-ink">Số liệu trước bước</dt><dd className="text-ink-dim">{step.evidence}</dd></div>
            <div><dt className="font-semibold text-ink">Kết quả sau bước</dt><dd className="text-ink-dim">{step.effect}</dd></div>
          </dl>
          {step.caveat && <p className="mt-2 rounded-md border border-algo-path/30 bg-algo-path/10 px-2 py-1.5 leading-5 text-ink">{step.caveat}</p>}
          {termination && (
            <div className="mt-2 rounded-md border border-algo-frontier/30 bg-algo-frontier/5 px-2 py-1.5 leading-5 text-ink">
              {termination}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
