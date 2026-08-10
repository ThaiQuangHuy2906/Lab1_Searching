import type { Mode, TraceStep } from "./types";

export interface FrontierRow { node: string; g: number | null; overlap: boolean }

export type BidirectionalFrontierPresentation =
  | {
      capability: "two_side_v2";
      forward: FrontierRow[];
      backward: FrontierRow[];
      legacyUnion: FrontierRow[];
      bestPathCost: number | null;
      meetingNode: string | null;
      activeSide: "forward" | "backward" | null;
      unit: "m" | "s";
      backwardLabel: string;
      compatibilityLabel: null;
    }
  | {
      capability: "legacy_union";
      forward: null;
      backward: null;
      legacyUnion: FrontierRow[];
      bestPathCost: null;
      meetingNode: null;
      activeSide: null;
      unit: "m" | "s";
      backwardLabel: null;
      compatibilityLabel: string;
    };

export function presentBidirectionalFrontiers(
  step: TraceStep,
  mode: Mode,
): BidirectionalFrontierPresentation {
  const unit = mode === "distance" ? "m" : "s";
  if ("bidirectional_frontiers" in step && step.bidirectional_frontiers) {
    const payload = step.bidirectional_frontiers;
    const forwardIds = new Set(payload.forward.nodes);
    const backwardIds = new Set(payload.backward.nodes);
    const row = (node: string, g: number | null): FrontierRow => ({
      node,
      g,
      overlap: forwardIds.has(node) && backwardIds.has(node),
    });
    return {
      capability: "two_side_v2",
      forward: payload.forward.nodes.map((node) => row(node, payload.forward.g[node] ?? null)),
      backward: payload.backward.nodes.map((node) => row(node, payload.backward.g[node] ?? null)),
      legacyUnion: step.frontier.map((node) => row(node, step.g?.[node] ?? null)),
      bestPathCost: payload.best_path_cost,
      meetingNode: payload.meeting_node,
      activeSide: step.side ?? null,
      unit,
      backwardLabel: "g phía Đến là chi phí điểm→Đến (node→Goal) trên đồ thị gốc",
      compatibilityLabel: null,
    };
  }
  return {
    capability: "legacy_union",
    forward: null,
    backward: null,
    legacyUnion: step.frontier.map((node) => ({
      node, g: step.g?.[node] ?? null, overlap: false,
    })),
    bestPathCost: null,
    meetingNode: null,
    activeSide: null,
    unit,
    backwardLabel: null,
    compatibilityLabel:
      "Dữ liệu v1 chỉ cung cấp một hàng chờ gộp (union/min-g), không đủ để tách hai phía.",
  };
}

function fmtVi(value: number, digits: number): string {
  const fixed = value.toFixed(digits);
  const [integer, fraction] = fixed.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return fraction && Number(fraction) !== 0 ? `${grouped},${fraction}` : grouped;
}

export function formatBidirectionalCost(value: number | null, mode: Mode): string {
  if (value === null) return "—";
  if (mode === "distance") {
    const kilometres = value / 1000;
    return `${fmtVi(kilometres, Math.abs(value) > 0 && Math.abs(value) < 10 ? 3 : 2)} km`;
  }
  return `${fmtVi(value / 60, 1)} phút${mode === "balanced" ? " quy đổi" : ""}`;
}
