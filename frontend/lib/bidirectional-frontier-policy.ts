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
      unit,
      backwardLabel: "g phía Đến = chi phí node→Goal trên graph gốc",
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
    unit,
    backwardLabel: null,
    compatibilityLabel:
      "Backend legacy chỉ cung cấp frontier union/min-g; không đủ dữ liệu để tách hai phía.",
  };
}
