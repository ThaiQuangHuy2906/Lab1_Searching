"use client";

import {
  AlertTriangle, Construction, Crosshair, Gauge, Ruler,
  TrafficCone, Waves, type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  applyEdgeOverridePatch,
} from "@/lib/scenario";
import { fmtMinutes, fmtVi } from "@/lib/format";
import { useApp } from "@/lib/store";
import type { EdgeOverridePatch } from "@/lib/scenario";
import type { RiskKey } from "@/lib/types";

const SPEEDS = [20, 30, 40, 50] as const;
const LENGTH_FACTORS = [1, 1.2, 1.5, 2] as const;
const CONGESTION = [1, 2, 3, 4, 5] as const;
const RISKS: Array<{
  key: RiskKey;
  label: string;
  penaltySeconds: number;
  icon: LucideIcon;
}> = [
  { key: "flood", label: "Ngập", penaltySeconds: 60, icon: Waves },
  { key: "construction", label: "Công trình", penaltySeconds: 90, icon: Construction },
  { key: "narrow_alley", label: "Hẻm hẹp", penaltySeconds: 30, icon: AlertTriangle },
  { key: "traffic_light", label: "Đèn đỏ", penaltySeconds: 25, icon: TrafficCone },
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
      className="h-9 px-2 text-xs"
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
        <span className="ml-auto text-xs text-ink-faint">{hint}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function EdgeExperimentLauncher() {
  const s = useApp();
  const edge = s.graphData?.edges.find((item) => item.id === s.selectedEdgeId);
  const busy = s.running || s.comparing || s.multiRunning;
  const editedCount = Object.keys(s.edgeOverrides).length;

  const openEditor = () => {
    if (edge || s.edgeEditMode) {
      s.set({ drawerOpen: true, drawerTab: "scenario" });
      return;
    }
    s.setEdgeEditMode(true);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs leading-5 text-ink-dim">
        Thay đổi tạm thời một đoạn đường rồi chạy lại thuật toán để quan sát tuyến đổi như thế nào.
      </p>
      <Button
        variant={s.edgeEditMode ? "default" : "secondary"}
        disabled={busy || !s.graphData}
        className="w-full justify-start"
        onClick={openEditor}
      >
        <Crosshair />
        {edge
          ? "Mở trình chỉnh đoạn đã chọn"
          : s.edgeEditMode
            ? "Mở hướng dẫn chọn đoạn"
            : "Chọn và chỉnh một đoạn"}
      </Button>
      <div className="flex min-h-8 items-center gap-2 rounded-lg border border-surface-border bg-surface-control/55 px-2.5 py-1.5 text-xs">
        <Badge variant={editedCount > 0 ? "warn" : "default"} className="shrink-0">
          {editedCount > 0 ? `${editedCount} đoạn đã sửa` : "Chưa chỉnh sửa"}
        </Badge>
        <span className="min-w-0 truncate text-ink-dim">
          {edge ? edge.name ?? edge.highway : s.edgeEditMode ? "Đang chờ chọn trên bản đồ" : "Dữ liệu gốc được giữ nguyên"}
        </span>
      </div>
    </div>
  );
}

export function EdgeQuickPresets() {
  const s = useApp();
  const edge = s.graphData?.edges.find((item) => item.id === s.selectedEdgeId);
  if (!edge) return null;

  const override = s.edgeOverrides[edge.id];
  const traffic = s.traffic ?? {};
  const busy = s.running || s.comparing || s.multiRunning;

  const currentSpeed = override?.free_speed_kmh ?? edge.free_speed_kmh;
  const currentLength = override?.length_m ?? edge.length_m;
  const currentCongestion = override?.congestion?.[s.slot] ?? traffic[edge.id] ?? 1;
  const speedOptions = SPEEDS.filter((speed) => speed !== edge.free_speed_kmh);
  const setPatch = (patch: EdgeOverridePatch) => {
    s.setEdgeOverride(
      edge.id,
      applyEdgeOverridePatch(edge, traffic, override, patch),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <Group icon={Gauge} label="Vận tốc xe" hint="km/h">
        <PresetButton active={override?.free_speed_kmh === undefined}
          disabled={busy} onClick={() => setPatch({ free_speed_kmh: edge.free_speed_kmh })}>
          Gốc · {fmtVi(edge.free_speed_kmh, 0)}
        </PresetButton>
        {speedOptions.map((speed) => (
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
            {level === 1 ? "1 · Thoáng" : level === 3 ? "3 · Vừa" : level === 5 ? "5 · Kẹt" : level}
          </PresetButton>
        ))}
      </Group>

      <Group icon={AlertTriangle} label="Điều kiện đường" hint="có thể chọn nhiều">
        {RISKS.map(({ key, label, penaltySeconds, icon: Icon }) => {
          const active = (override?.risk?.[key] ?? edge.risk[key]) === 1;
          return (
            <PresetButton key={key} active={active} disabled={busy}
              onClick={() => setPatch({ risk: { [key]: active ? 0 : 1 } })}>
              <Icon className="size-3" /> {label} · +{fmtMinutes(penaltySeconds)}
            </PresetButton>
          );
        })}
      </Group>

      <p className="rounded-md bg-surface-control/70 px-2.5 py-2 text-xs leading-5 text-ink-dim">
        Preset áp dụng ngay cho đoạn đã chọn. Chuyển sang “Chỉnh chi tiết” nếu cần nhập số chính xác hoặc đặt đủ bốn khung giờ.
      </p>
    </div>
  );
}
