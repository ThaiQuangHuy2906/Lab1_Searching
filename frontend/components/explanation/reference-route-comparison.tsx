"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { fmtKm, fmtMinutes } from "@/lib/format";
import {
  referenceComparisonRows,
  referenceKindLabel,
  referenceTradeoffConclusion,
} from "@/lib/reference-route-presentation";
import { useApp } from "@/lib/store";
import type {
  GraphResponse, Mode, ReferenceRoute, RouteResultEnvelope, TraceV2,
} from "@/lib/types";

function formatValue(unit: "m" | "s", value: number): string {
  return unit === "m" ? fmtKm(value) : fmtMinutes(value);
}

function formatDelta(unit: "m" | "s", value: number): string {
  if (Math.abs(value) < 1e-9) return "0";
  return `${value > 0 ? "+" : "−"}${formatValue(unit, Math.abs(value))}`;
}

function routeLabel(path: readonly string[], graphData: GraphResponse | null): string {
  const nameOf = (id: string) => graphData?.nodes.find((node) => node.id === id)?.name ?? id;
  const names = path.map(nameOf);
  if (names.length <= 6) return names.join(" → ");
  return `${names[0]} → … → ${names.at(-1)} (qua ${names.length - 2} điểm trung gian)`;
}

function objectiveLabel(mode: Mode): string {
  if (mode === "distance") return "quãng đường";
  if (mode === "time") return "thời gian theo ùn tắc";
  return "chi phí cân bằng";
}

export function ReferenceRouteComparison({
  envelope,
  trace,
  graphData,
}: {
  envelope: RouteResultEnvelope;
  trace: TraceV2;
  graphData: GraphResponse | null;
}) {
  const overlay = useApp((state) => state.explanationOverlay);
  const overlayVisible = useApp((state) => state.explanationOverlayVisible);
  const setExplanationOverlay = useApp((state) => state.setExplanationOverlay);
  const leaveExplanation = useApp((state) => state.leaveExplanation);
  const set = useApp((state) => state.set);
  const references = trace.explanation.evidence.reference_routes;
  const overlayReferenceId = overlay?.kind === "reference_route"
    && overlay.resultId === envelope.id ? overlay.referenceId : null;
  const [selectedId, setSelectedId] = React.useState(
    overlayReferenceId ?? references[0]?.id ?? "",
  );

  React.useEffect(() => {
    const preferred = overlayReferenceId && references.some((item) => item.id === overlayReferenceId)
      ? overlayReferenceId : references[0]?.id ?? "";
    setSelectedId(preferred);
  }, [envelope.id, overlayReferenceId, references]);

  if (!trace.explanation.evidence.cost_breakdown) return null;
  if (references.length === 0) {
    return (
      <section className="rounded-lg border border-surface-border bg-surface-panel p-3">
        <h3 className="text-sm font-bold text-ink">Vì sao chọn tuyến này?</h3>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Lần chạy này không tạo được một route hậu kiểm khác route kết quả để đối chiếu. Các số liệu và bảo đảm tối ưu phía trên vẫn giữ nguyên giá trị.
        </p>
      </section>
    );
  }
  const selectedReference = references.find((reference) => reference.id === selectedId)
    ?? references[0];
  const selectedBreakdown = trace.explanation.evidence.cost_breakdown;
  const rows = referenceComparisonRows(
    trace.mode,
    selectedBreakdown,
    selectedReference.cost_breakdown,
  );
  const mapVisible = overlayVisible && overlayReferenceId === selectedReference.id;

  const setReference = (reference: ReferenceRoute) => {
    setSelectedId(reference.id);
    if (overlayVisible) {
      setExplanationOverlay({
        kind: "reference_route",
        resultId: envelope.id,
        referenceId: reference.id,
      });
    }
  };

  return (
    <section
      aria-labelledby="reference-route-title"
      className="rounded-lg border border-surface-strong bg-surface-panel p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="reference-route-title" className="text-sm font-bold text-ink">Vì sao chọn tuyến này?</h3>
          <p className="mt-1 text-xs leading-5 text-ink-dim">
            Đối chiếu route kết quả với một route khác được UCS tính thêm sau khi lần chạy hoàn tất.
          </p>
        </div>
        <Badge>{objectiveLabel(trace.mode)}</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="text-xs font-medium text-ink-dim">
          So sánh với
          <Select
            value={selectedReference.id}
            onValueChange={(id) => {
              const next = references.find((reference) => reference.id === id);
              if (next) setReference(next);
            }}
          >
            <SelectTrigger className="mt-1" aria-label="Chọn tuyến tham chiếu">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {references.map((reference) => (
                <SelectItem key={reference.id} value={reference.id}>
                  {referenceKindLabel(reference.kind)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={mapVisible}
          onClick={() => {
            if (mapVisible) {
              leaveExplanation();
              return;
            }
            set({ stepIdx: Math.max(0, trace.trace.length - 1), playing: false });
            setExplanationOverlay({
              kind: "reference_route",
              resultId: envelope.id,
              referenceId: selectedReference.id,
            });
          }}
        >
          {mapVisible ? <EyeOff /> : <Eye />}
          {mapVisible ? "Ẩn khỏi bản đồ" : "Hiện trên bản đồ"}
        </Button>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-lg bg-surface-control p-2.5">
          <p className="font-semibold text-ink">Tuyến kết quả</p>
          <p className="mt-1 break-words leading-5 text-ink-dim">
            {routeLabel(trace.path, graphData)}
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-algo-frontier/45 bg-algo-frontier/5 p-2.5">
          <p className="font-semibold text-ink">{referenceKindLabel(selectedReference.kind)}</p>
          <p className="mt-1 break-words leading-5 text-ink-dim">
            {routeLabel(selectedReference.path, graphData)}
          </p>
        </div>
      </div>

      <div
        role="region"
        aria-label="Bảng đối chiếu tuyến kết quả và tuyến tham chiếu"
        tabIndex={0}
        className="mt-3 overflow-x-auto rounded-lg border border-surface-border"
      >
        <table className="w-full min-w-[31rem] table-fixed text-xs">
          <thead className="bg-surface-control text-ink-dim">
            <tr>
              <th scope="col" className="w-[34%] px-2.5 py-2 text-left font-medium">Chỉ số</th>
              <th scope="col" className="w-[22%] border-l border-surface-border px-2.5 py-2 text-center font-medium">Kết quả</th>
              <th scope="col" className="w-[22%] border-l border-surface-border px-2.5 py-2 text-center font-medium">Tham chiếu</th>
              <th scope="col" className="w-[22%] border-l border-surface-border px-2.5 py-2 text-center font-medium">Δ tham chiếu − kết quả</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const delta = row.referenceValue - row.selectedValue;
              const equivalent = Math.abs(delta) < 1e-9;
              return (
                <tr key={row.key} className="border-t border-surface-border/70">
                  <th scope="row" className="px-2.5 py-2 text-left font-normal text-ink-dim">
                    {row.label}
                    {row.affectsObjective && <Badge variant="ok" className="ml-1.5 align-middle">Có tính</Badge>}
                  </th>
                  <td className={`border-l border-surface-border/70 px-2.5 py-2 text-center font-mono ${
                    !equivalent && row.selectedValue < row.referenceValue
                      ? "font-bold text-[rgb(var(--start))]" : "text-ink"
                  }`}>
                    {formatValue(row.unit, row.selectedValue)}
                  </td>
                  <td className={`border-l border-surface-border/70 px-2.5 py-2 text-center font-mono ${
                    !equivalent && row.referenceValue < row.selectedValue
                      ? "font-bold text-[rgb(var(--start))]" : "text-ink"
                  }`}>
                    {formatValue(row.unit, row.referenceValue)}
                  </td>
                  <td className="border-l border-surface-border/70 px-2.5 py-2 text-center font-mono text-ink-dim">
                    {formatDelta(row.unit, delta)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 rounded-lg border border-algo-frontier/30 bg-algo-frontier/5 p-2.5 text-xs font-medium leading-5 text-ink">
        {referenceTradeoffConclusion(
          trace.algorithm,
          trace.mode,
          trace.termination.solution_quality,
          selectedReference,
        )}
      </p>
      <p className="mt-2 text-xs leading-5 text-ink-faint">
        Các hàng là những góc nhìn của cùng route, không cộng trực tiếp với nhau. Tuyến tham chiếu là hậu kiểm, không có nghĩa thuật toán chính đã xét hoặc loại toàn bộ route đó.
      </p>
    </section>
  );
}
