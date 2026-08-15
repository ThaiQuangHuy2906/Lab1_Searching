import { Badge } from "../ui/badge";
import { ALGO_LABEL } from "@/lib/store";
import type { AppResultEnvelope, AppliedScenario, GraphResponse, Mode } from "@/lib/types";

const MODE_LABEL: Record<Mode, string> = {
  distance: "Ngắn nhất",
  time: "Nhanh nhất",
  balanced: "Cân bằng",
};

const METHOD_LABEL = {
  held_karp: "Held–Karp",
  nn_2opt: "NN + 2-opt/Or-opt",
  sa: "Simulated Annealing",
} as const;

function scenarioOf(envelope: AppResultEnvelope): AppliedScenario | null {
  if (envelope.kind === "route") {
    return envelope.sourceResponses[0]?.applied_scenario ?? envelope.response.applied_scenario;
  }
  return envelope.response.applied_scenario;
}

export function resultName(envelope: AppResultEnvelope): string {
  return envelope.kind === "route"
    ? ALGO_LABEL[envelope.response.algorithm]
    : METHOD_LABEL[envelope.response.method];
}

export function problemName(envelope: AppResultEnvelope): string {
  if (envelope.kind === "atsp") return "ATSP";
  return envelope.snapshot.problemMode === "two_point" ? "Hai điểm" : "Nhiều điểm theo thứ tự";
}

export function objectiveLabel(mode: Mode): string {
  return MODE_LABEL[mode];
}

export function ResultContextStrip({
  envelope,
  graphData,
}: {
  envelope: AppResultEnvelope;
  graphData: GraphResponse | null;
}) {
  const scenario = scenarioOf(envelope);
  const graphLabel = envelope.snapshot.graph === "demo" ? "G_demo" : "G_real";
  const problem = problemName(envelope);
  const topology = envelope.snapshot.problemMode === "multi_point"
    ? envelope.snapshot.returnToStart ? "Vòng kín" : "Hành trình mở"
    : null;
  const viewLabel = envelope.snapshot.graphView === "full"
    ? `toàn bộ đồ thị${graphData ? `, ${graphData.meta.node_count} đỉnh` : ""}`
    : `${envelope.snapshot.graphView.slice("teach_".length)} điểm minh họa`;

  return (
    <section aria-labelledby="explanation-context-title" className="rounded-lg border border-surface-border bg-surface-control/65 p-2.5">
      <h3 id="explanation-context-title" className="text-sm font-bold text-ink">Giải thích kết quả: {resultName(envelope)}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{problem}</Badge>
        <Badge>{objectiveLabel(envelope.snapshot.mode)}</Badge>
        <Badge>{envelope.snapshot.slot}</Badge>
        <Badge>{graphLabel} · {viewLabel}</Badge>
        {topology && <Badge variant="warn">{topology}</Badge>}
        {scenario ? (
          <Badge variant={scenario.override_count > 0 ? "warn" : "default"}>
            {scenario.provenance === "base" ? "Dữ liệu gốc" : scenario.provenance === "graph_view" ? "Phạm vi đồ thị hiện tại" : "Kịch bản thử nghiệm"}
            {scenario.override_count > 0 ? ` · ${scenario.override_count} đoạn thử` : ""}
          </Badge>
        ) : (
          <Badge variant="warn">Dữ liệu v1 · chưa có thông tin kịch bản</Badge>
        )}
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-dim">
        Theo hồ sơ khung giờ đại diện {envelope.snapshot.slot}, không phải giao thông trực tiếp. Trong graph/view/mode/slot/scenario hiện tại — tức đúng đồ thị, số điểm hiển thị, tiêu chí, khung giờ và kịch bản của lần chạy này.
      </p>
      <details className="mt-1 text-xs text-ink-dim">
        <summary className="flex min-h-10 cursor-pointer items-center font-medium text-ink">Nguồn và chi tiết kỹ thuật</summary>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 pb-1">
          <dt>Result ID</dt><dd className="break-all font-mono">{envelope.id}</dd>
          <dt>Số node</dt><dd>{graphData?.meta.node_count ?? "—"}</dd>
          <dt>Fingerprint</dt><dd className="break-all font-mono">{scenario?.fingerprint ?? envelope.scenarioFingerprint}</dd>
        </dl>
      </details>
    </section>
  );
}
