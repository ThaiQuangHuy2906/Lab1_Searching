"use client";

import * as React from "react";
import { Crosshair, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import {
  applyEdgeOverridePatch, edgeCostBreakdown, effectiveCongestion,
  minimumEdgeLength,
} from "@/lib/scenario";
import { useApp } from "@/lib/store";
import type { RiskKey, TimeSlot } from "@/lib/types";

const SLOTS: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const RISKS: { key: RiskKey; label: string }[] = [
  { key: "flood", label: "Ngập" },
  { key: "construction", label: "Công trình" },
  { key: "narrow_alley", label: "Hẻm hẹp" },
  { key: "traffic_light", label: "Đèn giao thông" },
];

function NumberLine({ label, value, onChange, onBlur, min, max, suffix, inputRef, disabled }: {
  label: string; value: string; onChange: (value: string) => void; onBlur: () => void;
  min: number; max?: number; suffix: string; inputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-ink-dim">
      <span className="min-w-0 flex-1">{label}</span>
      <input
        ref={inputRef}
        type="number" inputMode="decimal" min={min} max={max} step="0.1"
        value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} onBlur={onBlur}
        className="h-8 w-24 rounded-md border border-surface-border bg-surface-control px-2 text-right font-mono text-xs text-ink focus:border-algo-frontier"
      />
      <span className="w-5 text-[11px] text-ink-faint">{suffix}</span>
    </label>
  );
}

function ValueLine({ label, original, current, unit }: {
  label: string; original: number; current: number; unit: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[11px] leading-5">
      <span className="text-ink-dim">{label}</span>
      <span className="font-mono text-ink-faint">{original.toFixed(1)}</span>
      <span className="font-mono text-ink">{current.toFixed(1)} {unit}</span>
    </div>
  );
}

export function ScenarioTab() {
  const s = useApp();
  const edge = s.graphData?.edges.find((item) => item.id === s.selectedEdgeId);
  const override = edge ? s.edgeOverrides[edge.id] : undefined;
  const traffic = s.traffic ?? {};
  const [lengthDraft, setLengthDraft] = React.useState("");
  const [speedDraft, setSpeedDraft] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const firstEditorControl = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!edge) {
      setLengthDraft("");
      setSpeedDraft("");
      setError(null);
      return;
    }
    setLengthDraft(String(override?.length_m ?? edge.length_m));
    setSpeedDraft(String(override?.free_speed_kmh ?? edge.free_speed_kmh));
    setError(null);
  }, [edge?.id, edge?.length_m, edge?.free_speed_kmh, override?.length_m, override?.free_speed_kmh]);

  React.useEffect(() => {
    if (edge && s.edgeEditMode) firstEditorControl.current?.focus();
  }, [edge?.id, s.edgeEditMode]);

  const minLength = edge && s.graphData
    ? minimumEdgeLength(edge, s.graphData.nodes)
    : 0.1;
  const base = edge ? edgeCostBreakdown(edge, traffic, s.slot, undefined) : null;
  const current = edge ? edgeCostBreakdown(edge, traffic, s.slot, override) : null;
  const busy = s.running || s.comparing || s.multiRunning;
  const applied = s.trace?.applied_scenario ?? s.multi?.applied_scenario;

  const commitLength = () => {
    if (!edge) return;
    const value = Number(lengthDraft);
    if (!Number.isFinite(value) || value < minLength) {
      setError(`Chiều dài phải hữu hạn và không nhỏ hơn ${minLength.toFixed(1)} m.`);
      return;
    }
    setError(null);
    s.setEdgeOverride(edge.id, applyEdgeOverridePatch(edge, traffic, override, { length_m: value }));
  };

  const commitSpeed = () => {
    if (!edge) return;
    const value = Number(speedDraft);
    if (!Number.isFinite(value) || value < 1 || value > 200) {
      setError("Tốc độ phải là số hữu hạn trong khoảng 1–200 km/h.");
      return;
    }
    setError(null);
    s.setEdgeOverride(edge.id, applyEdgeOverridePatch(edge, traffic, override, { free_speed_kmh: value }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-surface-border bg-surface-control/60 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink">Sandbox cạnh</p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-dim">
              Chỉ có hiệu lực trong phiên hiện tại, không sửa dataset gốc.
            </p>
          </div>
          <Switch checked={s.edgeEditMode} disabled={busy}
            aria-label="Bật chế độ chỉnh cạnh trên bản đồ" onCheckedChange={s.setEdgeEditMode} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-ink-dim">
          <span>{Object.keys(s.edgeOverrides).length} cạnh đang ghi đè</span>
          <Button variant="ghost" size="sm" disabled={busy || Object.keys(s.edgeOverrides).length === 0}
            onClick={s.resetAllEdgeOverrides}>
            <RotateCcw /> Reset tất cả
          </Button>
        </div>
      </div>

      {!edge ? (
        <div className="flex gap-2 rounded-lg border border-dashed border-surface-strong bg-surface-control/55 p-3 text-xs leading-5 text-ink-dim">
          <Crosshair className="mt-0.5 size-4 shrink-0 text-algo-frontier" />
          {s.edgeEditMode
            ? "Bấm một cạnh trên bản đồ để xem và chỉnh thử các thông số của cạnh đó."
            : "Bật chế độ chỉnh cạnh, rồi chọn một cạnh trên bản đồ."}
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-surface-border bg-surface-panel p-2.5">
            <p className="font-mono text-xs font-semibold text-ink">{edge.id}: {edge.u} → {edge.v}</p>
            <p className="mt-1 text-[11px] text-ink-dim">{edge.name ?? edge.highway}</p>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-surface-border bg-surface-control/55 p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">Thông số hiện tại</p>
            <NumberLine inputRef={firstEditorControl} label="Chiều dài" value={lengthDraft} onChange={setLengthDraft}
              disabled={busy}
              onBlur={commitLength} min={minLength} suffix="m" />
            <NumberLine label="Tốc độ thoáng" value={speedDraft} onChange={setSpeedDraft}
              disabled={busy}
              onBlur={commitSpeed} min={1} max={200} suffix="km/h" />
            <div className="grid grid-cols-2 gap-2 pt-1">
              {SLOTS.map((slot) => (
                <label key={slot} className="flex items-center gap-1.5 text-[11px] text-ink-dim">
                  <span className="font-mono">{slot}</span>
                  <Select value={String(effectiveCongestion(edge.id, traffic, slot, override))} disabled={busy}
                    onValueChange={(value) => s.setEdgeOverride(edge.id, applyEdgeOverridePatch(
                      edge, traffic, override, { congestion: { [slot]: Number(value) } },
                    ))}>
                    <SelectTrigger aria-label={`Ùn tắc ${slot}`} className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3, 4, 5].map((value) => (
                      <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
              {RISKS.map(({ key, label }) => {
                const checked = (override?.risk?.[key] ?? edge.risk[key]) === 1;
                return (
                  <label key={key} className="flex min-h-8 items-center justify-between gap-1.5 text-[11px] text-ink-dim">
                    {label}
                    <Switch checked={checked} disabled={busy} aria-label={`Rủi ro ${label}`} onCheckedChange={(next) =>
                      s.setEdgeOverride(edge.id, applyEdgeOverridePatch(
                        edge, traffic, override, { risk: { [key]: next ? 1 : 0 } },
                      ))
                    } />
                  </label>
                );
              })}
            </div>
            {error && <p role="alert" className="rounded-md bg-goal/10 px-2 py-1.5 text-[11px] leading-4 text-goal">{error}</p>}
            <Button variant="secondary" size="sm" disabled={!override || busy}
              onClick={() => s.setEdgeOverride(edge.id, undefined)}>
              <RotateCcw /> Reset cạnh này
            </Button>
          </div>

          {base && current && (
            <div className="rounded-lg border border-surface-border bg-surface-panel p-2.5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-dim">Original → current</p>
              <ValueLine label="t_free" original={base.t_free_s} current={current.t_free_s} unit="s" />
              <ValueLine label="Factor ùn tắc" original={base.congestion_factor} current={current.congestion_factor} unit="×" />
              <ValueLine label="Phạt ngập" original={base.penalty_flood_s} current={current.penalty_flood_s} unit="s" />
              <ValueLine label="Phạt công trình" original={base.penalty_construction_s} current={current.penalty_construction_s} unit="s" />
              <ValueLine label="Phạt hẻm hẹp" original={base.penalty_narrow_alley_s} current={current.penalty_narrow_alley_s} unit="s" />
              <ValueLine label="Phạt đèn GT" original={base.penalty_traffic_light_s} current={current.penalty_traffic_light_s} unit="s" />
              <ValueLine label="Phạt rủi ro" original={base.penalty_total_s} current={current.penalty_total_s} unit="s" />
              <ValueLine label="Distance" original={base.weight_distance_m} current={current.weight_distance_m} unit="m" />
              <ValueLine label="Time" original={base.weight_time_s} current={current.weight_time_s} unit="s" />
              <ValueLine label="Balanced" original={base.weight_balanced_s} current={current.weight_balanced_s} unit="s" />
            </div>
          )}
        </>
      )}

      {applied && (
        <div className="rounded-lg border border-surface-border bg-surface-control/55 p-2.5 text-[11px] leading-5 text-ink-dim">
          <p>View / override: <span className="font-medium text-ink">{applied.graph_view} / {applied.override_count}</span></p>
          <p>Provenance: <span className="font-medium text-ink">{applied.provenance}</span></p>
          <p>Fingerprint: <span className="break-all font-mono text-[10px] text-ink">{applied.fingerprint}</span></p>
        </div>
      )}
    </div>
  );
}
