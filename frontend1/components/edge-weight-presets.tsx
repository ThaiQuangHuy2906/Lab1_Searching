"use client";

import {
  AlertTriangle, Construction, Crosshair, Gauge, RotateCcw, Ruler,
  TrafficCone, Waves, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  applyEdgeOverridePatch,
  edgeCostBreakdown,
} from "@/lib/scenario";
import { fmtVi } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { EdgeOverridePatch } from "@/lib/scenario";
import type { RiskKey } from "@/lib/types";

const SPEEDS = [20, 30, 40, 50] as const;
const LENGTH_FACTORS = [1, 1.2, 1.5, 2] as const;
const CONGESTION = [1, 3, 5] as const;
const RISKS: Array<{
  key: RiskKey;
  label: string;
  penalty: string;
  icon: LucideIcon;
}> = [
  { key: "flood", label: "Ngập", penalty: "+60 s", icon: Waves },
  { key: "construction", label: "Công trình", penalty: "+90 s", icon: Construction },
  { key: "narrow_alley", label: "Hẻm hẹp", penalty: "+30 s", icon: AlertTriangle },
  { key: "traffic_light", label: "Đèn đỏ", penalty: "+25 s", icon: TrafficCone },
];

function PresetButton({ active, children, onClick, disabled }: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "secondary"}
      aria-pressed={active}
      disabled={disabled}
      className="h-8 px-2 text-[11px]"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Group({ icon: Icon, label, hint, children }: {
  icon: LucideIcon;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-algo-frontier" />
        <span className="text-xs font-semibold text-ink">{label}</span>
        <span className="ml-auto text-[10px] text-ink-faint">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function EdgeWeightPresets() {
  const s = useApp();
  const edge = s.graphData?.edges.find((item) => item.id === s.selectedEdgeId);
  const override = edge ? s.edgeOverrides[edge.id] : undefined;
  const traffic = s.traffic ?? {};
  const busy = s.running || s.comparing || s.multiRunning;
  const editedCount = Object.keys(s.edgeOverrides).length;

  if (!edge) {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="rounded-lg border border-dashed border-surface-strong bg-surface-control/55 p-2.5 text-[11px] leading-4 text-ink-dim">
          {s.edgeEditMode
            ? "Đang chờ chọn: bấm vào một đoạn đường trên bản đồ. Vùng chọn cạnh đã được mở rộng để dễ thao tác."
            : "Chọn một cạnh rồi dùng các tag vận tốc, quãng đường, ùn tắc và rủi ro bên dưới."}
        </div>
        <Button
          variant={s.edgeEditMode ? "default" : "secondary"}
          size="sm"
          disabled={busy || !s.graphData}
          onClick={() => s.setEdgeEditMode(!s.edgeEditMode)}
        >
          <Crosshair />
          {s.edgeEditMode ? "Huỷ chọn cạnh" : "Chọn cạnh trên bản đồ"}
        </Button>
        {editedCount > 0 && (
          <Button variant="ghost" size="sm" disabled={busy}
            onClick={s.resetAllEdgeOverrides}>
            <RotateCcw /> Reset tất cả ({editedCount})
          </Button>
        )}
      </div>
    );
  }

  const current = edgeCostBreakdown(edge, traffic, s.slot, override);
  const currentSpeed = override?.free_speed_kmh ?? edge.free_speed_kmh;
  const currentLength = override?.length_m ?? edge.length_m;
  const currentCongestion = override?.congestion?.[s.slot] ?? traffic[edge.id] ?? 1;
  const setPatch = (patch: EdgeOverridePatch) => {
    s.setEdgeOverride(
      edge.id,
      applyEdgeOverridePatch(edge, traffic, override, patch),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-algo-frontier/30 bg-algo-frontier/5 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-semibold text-ink">
              {edge.id} · {edge.u} → {edge.v}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ink-dim">
              {edge.name ?? edge.highway}
            </p>
          </div>
          {override && <Badge variant="warn" className="shrink-0">Đã sửa</Badge>}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-md bg-surface-control px-1 py-1.5">
            <p className="font-mono text-xs font-bold text-ink">{fmtVi(current.length_m, 1)} m</p>
            <p className="text-[9px] text-ink-faint">distance</p>
          </div>
          <div className="rounded-md bg-surface-control px-1 py-1.5">
            <p className="font-mono text-xs font-bold text-ink">{fmtVi(current.free_speed_kmh, 0)} km/h</p>
            <p className="text-[9px] text-ink-faint">vận tốc</p>
          </div>
          <div className="rounded-md bg-surface-control px-1 py-1.5">
            <p className="font-mono text-xs font-bold text-ink">{fmtVi(current.weight_balanced_s, 1)} s</p>
            <p className="text-[9px] text-ink-faint">time + phạt</p>
          </div>
        </div>
      </div>

      <Group icon={Gauge} label="Vận tốc xe" hint="km/h">
        <PresetButton active={override?.free_speed_kmh === undefined}
          disabled={busy} onClick={() => setPatch({ free_speed_kmh: edge.free_speed_kmh })}>
          Gốc · {fmtVi(edge.free_speed_kmh, 0)}
        </PresetButton>
        {SPEEDS.map((speed) => (
          <PresetButton key={speed} active={Math.abs(currentSpeed - speed) < 0.01}
            disabled={busy} onClick={() => setPatch({ free_speed_kmh: speed })}>
            {speed}
          </PresetButton>
        ))}
      </Group>

      <Group icon={Ruler} label="Hệ số quãng đường" hint="so với gốc">
        {LENGTH_FACTORS.map((factor) => (
          <PresetButton key={factor}
            active={Math.abs(currentLength - edge.length_m * factor) < 0.11}
            disabled={busy}
            onClick={() => setPatch({
              length_m: Math.round(edge.length_m * factor * 10) / 10,
            })}>
            {factor === 1 ? "Gốc · 1×" : `${String(factor).replace(".", ",")}×`}
          </PresetButton>
        ))}
      </Group>

      <Group icon={TrafficCone} label={`Ùn tắc lúc ${s.slot}`} hint="mức 1–5">
        {CONGESTION.map((level) => (
          <PresetButton key={level} active={currentCongestion === level}
            disabled={busy}
            onClick={() => setPatch({ congestion: { [s.slot]: level } })}>
            {level === 1 ? "1 · Thoáng" : level === 3 ? "3 · Vừa" : "5 · Kẹt"}
          </PresetButton>
        ))}
      </Group>

      <Group icon={AlertTriangle} label="Điều kiện đường" hint="có thể chọn nhiều">
        {RISKS.map(({ key, label, penalty, icon: Icon }) => {
          const active = (override?.risk?.[key] ?? edge.risk[key]) === 1;
          return (
            <PresetButton key={key} active={active} disabled={busy}
              onClick={() => setPatch({ risk: { [key]: active ? 0 : 1 } })}>
              <Icon className="size-3" /> {label} · {penalty}
            </PresetButton>
          );
        })}
      </Group>

      <p className="rounded-md bg-surface-control/70 px-2 py-1.5 text-[10px] leading-4 text-ink-dim">
        t_free = distance ÷ vận tốc. Chạy nhanh hơn làm thời gian giảm; đường dài,
        ùn tắc hoặc có rủi ro làm thời gian tăng. Bấm Chạy thuật toán lại để cập nhật tuyến.
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        <Button variant="secondary" size="sm" disabled={busy}
          onClick={() => s.set({ selectedEdgeId: null })}>
          <Crosshair /> Đổi cạnh
        </Button>
        <Button variant="ghost" size="sm" disabled={busy}
          onClick={() => s.set({ drawerOpen: true, drawerTab: "scenario" })}>
          Chi tiết
        </Button>
        <Button variant="ghost" size="sm" disabled={busy || !override}
          onClick={() => s.setEdgeOverride(edge.id, undefined)}>
          <RotateCcw /> Reset
        </Button>
      </div>
      {editedCount > 1 && (
        <Button variant="ghost" size="sm" disabled={busy}
          onClick={s.resetAllEdgeOverrides}>
          <RotateCcw /> Reset tất cả {editedCount} cạnh
        </Button>
      )}
    </div>
  );
}
