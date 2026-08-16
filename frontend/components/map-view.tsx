"use client";

// Single-run map wrapper. It owns application state, editing/picking policy,
// timeline/legend integration and toast copy. The reusable RouteMapCanvas below
// remains prop-driven so navigation-only comparison panes can reuse it
// without cloning Zustand consumers or single-run editor behavior.

import * as React from "react";
import type { PickingInfo } from "@deck.gl/core";
import { toast } from "sonner";

import { useApp } from "@/lib/store";
import { useAnimation } from "@/lib/use-animation";
import { usePalette } from "@/lib/use-palette";
import { buildRouteMapGeometry } from "@/lib/map-geometry";
import { resolveSingleRouteReferenceOverlay } from "@/lib/explanation-policy";
import {
  isEndpointOptionAllowed,
  isStopOptionAllowed,
} from "@/lib/interaction-policy";
import type { GraphNode } from "@/lib/types";
import { Legend } from "./legend";
import {
  RouteMapCanvas,
  type RouteMapModel,
} from "./route-map-canvas";
import { Timeline } from "./timeline";

export function MapView() {
  const graphData = useApp((state) => state.graphData);
  const graphLoading = useApp((state) => state.graphLoading);
  const loadGraph = useApp((state) => state.loadGraph);
  const graph = useApp((state) => state.graph);
  const offline = useApp((state) => state.offlineMode);
  const trafficLayer = useApp((state) => state.trafficLayer);
  const traffic = useApp((state) => state.traffic);
  const slot = useApp((state) => state.slot);
  const traceOnReal = useApp((state) => state.traceOnReal);
  const edgeOverrides = useApp((state) => state.edgeOverrides);
  const edgeEditMode = useApp((state) => state.edgeEditMode);
  const edgeEditFirstNode = useApp((state) => state.edgeEditFirstNode);
  const selectedEdgeId = useApp((state) => state.selectedEdgeId);
  const trace = useApp((state) => state.trace);
  const multi = useApp((state) => state.multi);
  const optimizationTrace = useApp((state) => state.optimizationTrace);
  const timelineSource = useApp((state) => state.timelineSource);
  const stepIdx = useApp((state) => state.stepIdx);
  const drawerTab = useApp((state) => state.drawerTab);
  const start = useApp((state) => state.start);
  const goal = useApp((state) => state.goal);
  const problemMode = useApp((state) => state.problemMode);
  const stops = useApp((state) => state.stops);
  const activeSnapshot = useApp((state) => state.activeSnapshot);
  const runKind = useApp((state) => state.runKind);
  const singleRouteResult = useApp((state) => state.singleRouteResult);
  const explanationOverlay = useApp((state) => state.explanationOverlay);
  const explanationOverlayVisible = useApp((state) => state.explanationOverlayVisible);
  const pickTarget = useApp((state) => state.pickTarget);
  const theme = useApp((state) => state.theme);
  const set = useApp((state) => state.set);
  const clearMap = useApp((state) => state.clearMap);
  const animation = useAnimation();
  const palette = usePalette();
  const basemapErrorShown = React.useRef(false);
  const geometry = React.useMemo(
    () => graphData ? buildRouteMapGeometry(graphData.nodes, graphData.edges) : null,
    [graphData],
  );
  const referenceRouteNodeIds = React.useMemo(() => {
    return resolveSingleRouteReferenceOverlay(
      singleRouteResult,
      explanationOverlay,
      explanationOverlayVisible,
      runKind === "single",
    )?.path ?? null;
  }, [
    runKind, explanationOverlayVisible, explanationOverlay, singleRouteResult,
  ]);

  const model = React.useMemo<RouteMapModel>(() => ({
    graphData,
    graphLoading,
    graph,
    offline,
    trafficLayer,
    traffic,
    slot,
    traceOnReal,
    edgeOverrides,
    edgeEditMode,
    edgeEditFirstNode,
    selectedEdgeId,
    trace,
    multi,
    optimizationTrace,
    timelineSource,
    stepIdx,
    drawerTab,
    start,
    goal,
    problemMode,
    stops,
    activeSnapshot,
    pickTarget,
    theme,
  }), [
    graphData, graphLoading, graph, offline, trafficLayer, traffic, slot,
    traceOnReal, edgeOverrides, edgeEditMode, edgeEditFirstNode, selectedEdgeId, trace,
    multi, optimizationTrace, timelineSource, stepIdx, drawerTab, start, goal,
    problemMode, stops, activeSnapshot, pickTarget, theme,
  ]);

  const onPick = React.useCallback((info: PickingInfo) => {
    const state = useApp.getState();
    if (state.running || state.comparing || state.multiRunning) return;
    if (state.edgeEditMode) {
      // Edges are resolved from two node clicks (§ store.ts pickEdgeNode),
      // never from clicking a road line directly: opposite-direction edges
      // between the same node pair render on the exact same screen line and
      // cannot be told apart by a line click.
      const nodeId = info.object && "id" in (info.object as object)
        ? (info.object as { id?: string }).id
        : undefined;
      if (nodeId) state.pickEdgeNode(nodeId);
      return;
    }
    const target = state.pickTarget;
    if (!target || !info.object) return;
    const node = info.object as GraphNode;

    if (target === "start") {
      const activeGoal = state.problemMode === "two_point" ? state.goal : null;
      const activeStops = state.problemMode === "multi_point" ? state.stops : [];
      if (!isEndpointOptionAllowed("start", node.id, activeGoal, activeStops)) {
        if (activeStops.includes(node.id)) {
          toast.error("Điểm Đi không thể đồng thời là điểm giao.");
          return;
        }
        toast.error("Điểm Đi phải khác điểm Đến.");
        return;
      }
      set({
        start: node.id,
        pickTarget: state.goal || state.problemMode === "multi_point" ? null : "goal",
      });
      return;
    }

    if (target === "goal") {
      if (!isEndpointOptionAllowed("goal", node.id, state.start, [])) {
        toast.error("Điểm Đến phải khác điểm Đi.");
        return;
      }
      set({
        goal: node.id,
        problemMode: "two_point",
        pickTarget: state.start ? null : "start",
      });
      return;
    }

    if (!isStopOptionAllowed(node.id, state.start, null, state.stops)) {
      if (node.id !== state.start) {
        toast.info("Điểm này đã có trong danh sách giao.");
        return;
      }
      toast.info("Điểm Đi không thể đồng thời là điểm giao.");
      return;
    }
    if (state.stops.length >= 15) return;
    const nextStops = [...state.stops, node.id];
    set({
      stops: nextStops,
      problemMode: "multi_point",
      pickTarget: nextStops.length >= 15 ? null : "stop",
    });
  }, [set]);

  const onBasemapError = React.useCallback(() => {
    if (basemapErrorShown.current) return;
    basemapErrorShown.current = true;
    toast.warning(
      "Không tải được bản đồ nền (mạng chập chờn?) — bật \"Chế độ offline\" để demo tiếp.",
    );
  }, []);

  return (
    <RouteMapCanvas
      model={model}
      geometry={geometry}
      referenceRouteNodeIds={referenceRouteNodeIds}
      animation={animation}
      palette={palette}
      interactionMode="primary"
      onPick={onPick}
      onRetryGraph={() => void loadGraph(graph)}
      onClearMap={clearMap}
      onDismissEdgeEditor={() => set({ edgeEditMode: false, selectedEdgeId: null })}
      onDismissPick={() => set({ pickTarget: null })}
      onBasemapError={onBasemapError}
      overlays={(
        <>
          <Legend />
          <Timeline />
        </>
      )}
    />
  );
}
