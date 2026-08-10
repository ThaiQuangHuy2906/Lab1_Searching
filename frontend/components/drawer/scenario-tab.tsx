"use client";

import * as React from "react";
import { Crosshair, RotateCcw, SlidersHorizontal, Zap } from "lucide-react";
import { AppliedScenarioDetails } from "../applied-scenario-details";
import { EdgeQuickPresets } from "../edge-weight-presets";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import {
  applyEdgeOverridePatch, edgeCostBreakdown, effectiveCongestion, minimumEdgeLength,
} from "@/lib/scenario";
import { fmtKm, fmtMinutes, fmtVi } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { RiskKey, TimeSlot } from "@/lib/types";

const SLOTS: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const RISKS: { key: RiskKey; label: string }[] = [
  { key: "flood", label: "Ngập" },
  { key: "construction", label: "Công trình" },
  { key: "narrow_alley", label: "Hẻm hẹp" },
  { key: "traffic_light", label: "Đèn giao thông" },
];

type EditorMode = "quick" | "detail";

function NumberLine({ label, value, onChange, onCommit, onRevert, min, max, step = 0.1, suffix, inputRef, disabled, errorId, invalid }: {
  label: string; value: string; onChange: (value: string) => void; onCommit: () => void; onRevert: () => void;
  min: number; max?: number; step?: number; suffix: string; inputRef?: React.RefObject<HTMLInputElement | null>; disabled?: boolean;
  errorId?: string; invalid?: boolean;
}) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-xs text-ink-dim">
      <span className="min-w-0 flex-1">{label}</span>
      <input ref={inputRef} type="number" inputMode="decimal" min={min} max={max} step={step} value={value}
        disabled={disabled} aria-invalid={invalid || undefined} aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)} onBlur={onCommit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onRevert();
          }
        }}
        className="h-9 w-24 rounded-md border border-surface-border bg-surface-control px-2 text-right font-mono text-xs text-ink outline-none focus:border-algo-frontier focus:ring-2 focus:ring-algo-frontier/25" />
      <span className="w-8 text-xs text-ink-faint">{suffix}</span>
    </label>
  );
}

function ComparisonTable({ base, current }: {
  base: ReturnType<typeof edgeCostBreakdown>;
  current: ReturnType<typeof edgeCostBreakdown>;
}) {
  const rows = [
    { label: "Thời gian thoáng", original: base.t_free_s, next: current.t_free_s, format: fmtMinutes },
    { label: "Hệ số ùn tắc", original: base.congestion_factor, next: current.congestion_factor, format: (value: number) => `${fmtVi(value, 1)} ×` },
    { label: "Phạt ngập", original: base.penalty_flood_s, next: current.penalty_flood_s, format: fmtMinutes },
    { label: "Phạt công trình", original: base.penalty_construction_s, next: current.penalty_construction_s, format: fmtMinutes },
    { label: "Phạt hẻm hẹp", original: base.penalty_narrow_alley_s, next: current.penalty_narrow_alley_s, format: fmtMinutes },
    { label: "Phạt đèn giao thông", original: base.penalty_traffic_light_s, next: current.penalty_traffic_light_s, format: fmtMinutes },
    { label: "Tổng phạt rủi ro", original: base.penalty_total_s, next: current.penalty_total_s, format: fmtMinutes },
    { label: "Chi phí quãng đường", original: base.weight_distance_m, next: current.weight_distance_m, format: fmtKm },
    { label: "Chi phí thời gian", original: base.weight_time_s, next: current.weight_time_s, format: fmtMinutes },
    { label: "Chi phí cân bằng", original: base.weight_balanced_s, next: current.weight_balanced_s, format: fmtMinutes },
  ];

  return (
    <div className="overflow-hidden rounded-lg border border-surface-border">
      <table className="w-full table-fixed border-collapse text-xs">
        <caption className="sr-only">So sánh thông số gốc và thông số đang thử của đoạn đường</caption>
        <colgroup>
          <col className="w-[46%]" />
          <col className="w-[27%]" />
          <col className="w-[27%]" />
        </colgroup>
        <thead className="bg-surface-control text-ink-dim">
          <tr>
            <th scope="col" className="px-2.5 py-2 text-left font-semibold">Thông số</th>
            <th scope="col" className="border-l border-surface-border px-2 py-2 text-right font-semibold">Gốc</th>
            <th scope="col" className="border-l border-surface-border px-2 py-2 text-right font-semibold text-algo-frontier">Đang thử</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border/70 bg-surface-panel">
          {rows.map(({ label, original, next, format }) => {
            const changed = Math.abs(original - next) > 0.049;
            return (
              <tr key={label}>
                <th scope="row" className="px-2.5 py-2 text-left font-medium leading-4 text-ink-dim">{label}</th>
                <td className="border-l border-surface-border/70 px-2 py-2 text-right font-mono text-ink-faint">
                  <span className="whitespace-nowrap">{format(original)}</span>
                </td>
                <td className={`border-l border-surface-border/70 px-2 py-2 text-right font-mono ${changed ? "bg-algo-frontier/10 font-bold text-algo-frontier" : "font-medium text-ink"}`}>
                  <span className="whitespace-nowrap">{format(next)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function lengthDraftInKm(lengthMetres: number): string {
  return String(Number((lengthMetres / 1000).toFixed(4)));
}

export function ScenarioTab() {
  const runKind = useApp((state) => state.runKind);
  const overrideCount = useApp((state) => Object.keys(state.edgeOverrides).length);
  if (runKind === "compare") {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-control/70 p-3">
        <p className="text-sm font-semibold text-ink">Kịch bản đang ở chế độ chỉ đọc</p>
        <p className="mt-1 text-xs leading-5 text-ink-dim">
          Mọi thuật toán so sánh dùng cùng một snapshot
          {overrideCount > 0 ? ` với ${overrideCount} đoạn đã chỉnh` : " không có đoạn chỉnh thêm"}.
          Quay về <b className="text-ink">Chạy một</b> để chọn cạnh hoặc thay trọng số.
        </p>
      </div>
    );
  }
  return <ScenarioEditor />;
}

function ScenarioEditor() {
  const state = useApp();
  const edge = state.graphData?.edges.find((item) => item.id === state.selectedEdgeId);
  const override = edge ? state.edgeOverrides[edge.id] : undefined;
  const traffic = state.traffic ?? {};
  const [editorMode, setEditorMode] = React.useState<EditorMode>("quick");
  const [lengthDraft, setLengthDraft] = React.useState("");
  const [speedDraft, setSpeedDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const firstEditorControl = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!edge) {
      setLengthDraft(""); setSpeedDraft(""); setError(null); return;
    }
    setLengthDraft(lengthDraftInKm(override?.length_m ?? edge.length_m));
    setSpeedDraft(String(override?.free_speed_kmh ?? edge.free_speed_kmh));
    setError(null);
  }, [edge?.id, edge?.length_m, edge?.free_speed_kmh, override?.length_m, override?.free_speed_kmh]);

  React.useEffect(() => {
    if (editorMode === "detail" && edge) firstEditorControl.current?.focus();
  }, [editorMode, edge?.id]);

  const minLength = edge && state.graphData ? minimumEdgeLength(edge, state.graphData.nodes) : 0.1;
  const minLengthKm = minLength / 1000;
  const base = edge ? edgeCostBreakdown(edge, traffic, state.slot, undefined) : null;
  const current = edge ? edgeCostBreakdown(edge, traffic, state.slot, override) : null;
  const busy = state.running || state.comparing || state.multiRunning;
  const editedCount = Object.keys(state.edgeOverrides).length;
  const applied = state.trace?.applied_scenario ?? state.multi?.applied_scenario ?? null;
  const effectiveLength = edge ? override?.length_m ?? edge.length_m : 0;
  const effectiveLengthKm = effectiveLength / 1000;
  const effectiveSpeed = edge ? override?.free_speed_kmh ?? edge.free_speed_kmh : 0;
  const draftDiffers = (draft: string, effective: number) => {
    const value = Number(draft);
    return draft.trim() === "" || !Number.isFinite(value) || Math.abs(value - effective) > 0.0001;
  };
  const hasUncommittedDraft = Boolean(edge) && (
    draftDiffers(lengthDraft, effectiveLengthKm) || draftDiffers(speedDraft, effectiveSpeed)
  );

  const commitLength = () => {
    if (!edge) return;
    const value = Number(lengthDraft) * 1000;
    if (!Number.isFinite(value) || value < minLength) {
      setError(`Chiều dài phải hữu hạn và không nhỏ hơn ${fmtKm(minLength)}.`); return;
    }
    setError(null);
    state.setEdgeOverride(edge.id, applyEdgeOverridePatch(edge, traffic, override, { length_m: value }));
  };
  const commitSpeed = () => {
    if (!edge) return;
    const value = Number(speedDraft);
    if (!Number.isFinite(value) || value < 1 || value > 200) {
      setError("Tốc độ phải là số hữu hạn trong khoảng 1–200 km/h."); return;
    }
    setError(null);
    state.setEdgeOverride(edge.id, applyEdgeOverridePatch(edge, traffic, override, { free_speed_kmh: value }));
  };
  const revertLengthDraft = () => {
    if (!edge) return;
    setLengthDraft(lengthDraftInKm(override?.length_m ?? edge.length_m));
    setError(null);
  };
  const revertSpeedDraft = () => {
    if (!edge) return;
    setSpeedDraft(String(override?.free_speed_kmh ?? edge.free_speed_kmh));
    setError(null);
  };

  const toggleSelection = () => {
    if (state.edgeEditMode) {
      state.setEdgeEditMode(false);
    } else if (edge) {
      chooseAnotherEdge();
    } else {
      state.setEdgeEditMode(true);
    }
  };
  const chooseAnotherEdge = () => {
    state.set({ selectedEdgeId: null });
    if (!state.edgeEditMode) state.setEdgeEditMode(true);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-algo-frontier/25 bg-algo-frontier/5 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Thử nghiệm một đoạn đường</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-dim">Chọn đoạn trên bản đồ, đổi thông số tạm thời rồi chạy lại thuật toán.</p>
          </div>
          <Button variant={state.edgeEditMode ? "default" : "secondary"} size="sm" disabled={busy || !state.graphData} onClick={toggleSelection}>
            <Crosshair /> {state.edgeEditMode ? "Dừng chọn" : edge ? "Chọn đoạn khác" : "Chọn đoạn"}
          </Button>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-algo-frontier/15 pt-2.5">
          <span className="text-xs font-medium text-ink">{editedCount} đoạn đang điều chỉnh</span>
          <Button variant="ghost" size="sm" disabled={busy || editedCount === 0} onClick={state.resetAllEdgeOverrides}>
            <RotateCcw /> Khôi phục tất cả
          </Button>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ink-dim">Dữ liệu gốc không bị sửa; thay đổi chỉ có hiệu lực trong phiên này.</p>
      </div>

      {!edge ? (
        <div className="flex gap-2 rounded-lg border border-dashed border-surface-strong bg-surface-control/55 p-3 text-xs leading-5 text-ink-dim">
          <Crosshair className="mt-0.5 size-4 shrink-0 text-algo-frontier" />
          <span>
            {state.edgeEditMode ? "Bấm vào một đường nối trên bản đồ để chọn đoạn cần chỉnh." : "Bấm “Chọn đoạn”, rồi chọn một đường nối trên bản đồ."}
            <span className="mt-1 block text-ink">Điểm tròn là nút; đường nối giữa hai nút là cạnh hoặc đoạn đường.</span>
          </span>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{edge.name ?? edge.highway}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-ink-faint">Đoạn {edge.id} · {edge.u} → {edge.v}</p>
              </div>
              {override && <Badge variant="warn" className="shrink-0">Đã sửa</Badge>}
            </div>
            {current && (
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-md bg-surface-control px-1 py-2">
                  <p className="font-mono text-xs font-bold text-ink">{fmtKm(current.length_m)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">độ dài</p>
                </div>
                <div className="rounded-md bg-surface-control px-1 py-2">
                  <p className="font-mono text-xs font-bold text-ink">{fmtVi(current.free_speed_kmh, 0)} km/h</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">tốc độ</p>
                </div>
                <div className="rounded-md bg-surface-control px-1 py-2">
                  <p className="font-mono text-xs font-bold text-ink">{fmtMinutes(current.weight_balanced_s)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">cân bằng</p>
                </div>
              </div>
            )}
          </div>

          <div role="group" aria-label="Cách chỉnh thông số đoạn đường" className="grid grid-cols-2 gap-1 rounded-lg border border-surface-border bg-surface-control p-1">
            <Button type="button" size="sm" variant={editorMode === "quick" ? "default" : "ghost"} aria-pressed={editorMode === "quick"} onClick={() => setEditorMode("quick")}>
              <Zap /> Chọn nhanh
            </Button>
            <Button type="button" size="sm" variant={editorMode === "detail" ? "default" : "ghost"} aria-pressed={editorMode === "detail"} onClick={() => setEditorMode("detail")}>
              <SlidersHorizontal /> Chỉnh chi tiết
            </Button>
          </div>

          {editorMode === "quick" ? (
            <div className="rounded-lg border border-surface-border bg-surface-panel p-3">
              <EdgeQuickPresets />
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-lg border border-surface-border bg-surface-control/55 p-3">
              <p className="text-xs font-bold text-ink-dim">Thông số chính xác</p>
              <p id="scenario-draft-help" className="text-xs leading-5 text-ink-dim">
                Nhấn Enter hoặc bấm ra ngoài để áp dụng; Escape để bỏ giá trị chưa áp dụng.
              </p>
              {hasUncommittedDraft && (
                <p role="status" className="rounded-md bg-algo-frontier/10 px-2 py-1.5 text-xs leading-5 text-ink">
                  Chưa áp dụng thay đổi đang nhập.
                </p>
              )}
              <NumberLine inputRef={firstEditorControl} label="Chiều dài" value={lengthDraft} onChange={setLengthDraft}
                onCommit={commitLength} onRevert={revertLengthDraft} disabled={busy} min={minLengthKm} step={0.0001} suffix="km"
                errorId={error ? "scenario-editor-error" : "scenario-draft-help"} invalid={Boolean(error)} />
              <NumberLine label="Tốc độ thoáng" value={speedDraft} onChange={setSpeedDraft}
                onCommit={commitSpeed} onRevert={revertSpeedDraft} disabled={busy} min={1} max={200} suffix="km/h"
                errorId={error ? "scenario-editor-error" : "scenario-draft-help"} invalid={Boolean(error)} />
              <div className="border-t border-surface-border pt-2">
                <p className="mb-2 text-xs font-semibold text-ink-dim">Mức ùn tắc theo khung giờ</p>
                <div className="grid grid-cols-2 gap-2">
                  {SLOTS.map((slot) => (
                    <label key={slot} className="flex items-center gap-1.5 text-xs text-ink-dim">
                      <span className="font-mono">{slot}</span>
                      <Select value={String(effectiveCongestion(edge.id, traffic, slot, override))} disabled={busy}
                        onValueChange={(value) => state.setEdgeOverride(edge.id, applyEdgeOverridePatch(edge, traffic, override, { congestion: { [slot]: Number(value) } }))}>
                        <SelectTrigger aria-label={`Ùn tắc ${slot}`} className="h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent>
                      </Select>
                    </label>
                  ))}
                </div>
              </div>
              <div className="border-t border-surface-border pt-2">
                <p className="mb-1 text-xs font-semibold text-ink-dim">Điều kiện đường</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {RISKS.map(({ key, label }) => {
                    const checked = (override?.risk?.[key] ?? edge.risk[key]) === 1;
                    return (
                      <label key={key} className="flex min-h-9 items-center justify-between gap-1.5 text-xs text-ink-dim">
                        {label}
                        <Switch checked={checked} disabled={busy} aria-label={`Rủi ro ${label}`}
                          onCheckedChange={(next) => state.setEdgeOverride(edge.id, applyEdgeOverridePatch(edge, traffic, override, { risk: { [key]: next ? 1 : 0 } }))} />
                      </label>
                    );
                  })}
                </div>
              </div>
              {error && <p id="scenario-editor-error" role="alert" className="rounded-md bg-goal/10 px-2 py-1.5 text-xs leading-5 text-goal">{error}</p>}
            </div>
          )}

          <Button variant="secondary" size="sm" disabled={!override || busy} onClick={() => state.setEdgeOverride(edge.id, undefined)}>
            <RotateCcw /> Khôi phục đoạn này
          </Button>

          {base && current && (
            <details className="rounded-lg border border-surface-border bg-surface-panel p-3 text-xs text-ink-dim">
              <summary className="cursor-pointer font-semibold text-ink">Chi tiết công thức và số liệu kỹ thuật</summary>
              <div className="mt-3">
                <ComparisonTable base={base} current={current} />
              </div>
            </details>
          )}
        </>
      )}
      <AppliedScenarioDetails scenario={applied} />
    </div>
  );
}
