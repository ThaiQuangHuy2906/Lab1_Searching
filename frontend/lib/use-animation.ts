"use client";

// Derived per-step animation state, shared by the map and the g/h/f table
// so both ALWAYS agree with the timeline (DESIGN.md §5).

import { useMemo } from "react";
import { useApp } from "./store";
import type { TraceStep } from "./types";

export interface AnimationState {
  steps: TraceStep[];
  stepIdx: number;
  current: TraceStep | null;
  /** nodes expanded strictly BEFORE the current step (violet) */
  expandedSet: Set<string>;
  /** frontier of the current step (cyan) */
  frontierSet: Set<string>;
  /** bidijkstra: node -> side it was expanded on (up to current step) */
  sideByNode: Map<string, "forward" | "backward">;
  /** first step index at which a node was expanded (click row -> jump) */
  stepOfNode: Map<string, number>;
  atEnd: boolean;
  /** show the final route (animation finished, or no trace at all) */
  showPath: boolean;
}

export function useAnimation(): AnimationState {
  const trace = useApp((s) => s.trace);
  const stepIdx = useApp((s) => s.stepIdx);
  const graph = useApp((s) => s.graph);
  const traceOnReal = useApp((s) => s.traceOnReal);

  // the G_real trace toggle acts on the CURRENT view too (DESIGN v10c):
  // switching it off hides the step layers instantly, keeping the route
  const steps = useMemo(
    () => (graph === "real" && !traceOnReal ? [] : trace?.trace ?? []),
    [trace, graph, traceOnReal],
  );

  const stepOfNode = useMemo(() => {
    const m = new Map<string, number>();
    steps.forEach((st, i) => {
      if (!m.has(st.expanded)) m.set(st.expanded, i);
    });
    return m;
  }, [steps]);

  return useMemo(() => {
    const current = steps.length ? steps[Math.min(stepIdx, steps.length - 1)] : null;
    const expandedSet = new Set<string>();
    const sideByNode = new Map<string, "forward" | "backward">();
    for (let i = 0; i < Math.min(stepIdx, steps.length); i += 1) {
      expandedSet.add(steps[i].expanded);
      if (steps[i].side) sideByNode.set(steps[i].expanded, steps[i].side!);
    }
    if (current?.side) sideByNode.set(current.expanded, current.side);
    const frontierSet = new Set(current?.frontier ?? []);
    const atEnd = steps.length === 0 || stepIdx >= steps.length - 1;
    return {
      steps, stepIdx, current, expandedSet, frontierSet, sideByNode, stepOfNode,
      atEnd,
      showPath: Boolean(trace?.found) && atEnd,
    };
  }, [steps, stepIdx, stepOfNode, trace]);
}
