import { presentBidirectionalTermination, presentSearchStep } from "@/lib/search-step-explanation";
import type { Trace } from "@/lib/types";

export function SearchStepExplanation({ trace, stepIndex }: { trace: Trace; stepIndex: number }) {
  const step = presentSearchStep(trace, stepIndex);
  const termination = presentBidirectionalTermination(trace);
  return (
    <section aria-labelledby="explanation-step-title" className="rounded-lg border border-surface-border bg-surface-panel p-3">
      <h3 id="explanation-step-title" className="text-sm font-bold text-ink">Bước đang xem · {step.title}</h3>
      <dl className="mt-2 flex flex-col gap-2 text-xs leading-5">
        <div><dt className="font-semibold text-ink">Hành động</dt><dd className="text-ink-dim">{step.action}</dd></div>
        <div><dt className="font-semibold text-ink">Quy tắc</dt><dd className="text-ink-dim">{step.rule}</dd></div>
        <div><dt className="font-semibold text-ink">Bằng chứng trước bước</dt><dd className="text-ink-dim">{step.evidence}</dd></div>
        <div><dt className="font-semibold text-ink">Sau bước này</dt><dd className="text-ink-dim">{step.effect}</dd></div>
      </dl>
      {step.caveat && <p className="mt-2 rounded-md border border-algo-path/30 bg-algo-path/10 px-2 py-1.5 text-xs leading-5 text-ink">{step.caveat}</p>}
      {termination && (
        <div className="mt-2 rounded-md border border-algo-frontier/30 bg-algo-frontier/5 px-2 py-1.5 text-xs leading-5 text-ink">
          {termination}
        </div>
      )}
    </section>
  );
}
