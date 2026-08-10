"use client";

// Map = MapLibre (Carto dark-matter) + deck.gl overlays.
// Offline mode drops the basemap and renders the pure graph on `surface`.
// All colors come from lib/colors.ts (DESIGN.md §3) — no ad-hoc colors.

import * as React from "react";
import DeckGL from "@deck.gl/react";
import { LineLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { CollisionFilterExtension, PathStyleExtension } from "@deck.gl/extensions";
import { FlyToInterpolator, WebMercatorViewport, type MapViewState, type PickingInfo } from "@deck.gl/core";
import { Map as MapLibre } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { type Palette, type RGBA } from "@/lib/colors";
import { ROUTE_FLOW_EXTENSION } from "@/lib/route-flow-extension";
import { Home, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import type { AnimationState } from "@/lib/use-animation";
import {
  activeTimelineLength,
  conceptualOptimizationOrder,
  deliveryMarkerOrder,
  heldKarpHighlightIds,
  isOptimizationFinalEvent,
  mapControlsBottomClass,
  type TimelineSource,
} from "@/lib/atsp-trace-policy";
import {
  journeyNodePickRadius,
  shouldShowGoalMarker,
} from "@/lib/interaction-policy";
import { effectiveCongestion } from "@/lib/scenario";
import {
  buildRouteMapGeometry,
  pathCoordinates,
  routeArrowPoints,
  type MapCoordinate,
  type RouteMapGeometry,
} from "@/lib/map-geometry";
import {
  mapCanvasCapabilities,
  type MapCanvasMode,
} from "@/lib/map-canvas-policy";
import type {
  EdgeOverride, GraphLevel, GraphNode, GraphResponse, MultirouteResponse,
  OptimizationTrace, ProblemMode, RunSnapshot, TimeSlot, Trace,
} from "@/lib/types";
import type { Theme } from "@/lib/theme";

type RoutePathDatum = { path: [number, number][] };

const EMPTY_ANIMATION_STATE: AnimationState = {
  steps: [],
  stepIdx: 0,
  current: null,
  expandedSet: new Set(),
  frontierSet: new Set(),
  forwardFrontierSet: new Set(),
  backwardFrontierSet: new Set(),
  bidiOverlapSet: new Set(),
  sideByNode: new Map(),
  stepOfNode: new Map(),
  atEnd: true,
  showPath: true,
};
const EMPTY_COORDINATES: ReadonlyMap<string, MapCoordinate> = new Map();

const RESULT_ROUTE_PATH_LAYER_IDS = new Set([
  "route-casing", "route",
  "multi-path-casing", "multi-path",
]);
const RESULT_ROUTE_ARROW_LAYER_IDS = new Set([
  "route-arrows", "multi-arrows",
]);
const RESULT_ROUTE_OVERLAY_ANCHOR_IDS = new Set(["journey-endpoints", "current-ring", "labels", "chips"]);

type EdgeLayerDatum = {
  kind: "edge";
  id: string;
  u: string;
  v: string;
  name: string;
  source: [number, number];
  target: [number, number];
  level: number;
  overridden: boolean;
  selected: boolean;
};

function mapTooltipText(object: unknown): string | null {
  if (!object || typeof object !== "object" || !("id" in object)) return null;
  if ("kind" in object && object.kind === "edge") {
    const edge = object as EdgeLayerDatum;
    return `${edge.name}\nĐoạn ${edge.id} · ${edge.u} → ${edge.v}`;
  }
  const node = object as GraphNode;
  return node.name ? `${node.name}\nNút ${node.id}` : `Nút ${node.id}`;
}

function getLayerId(layer: unknown): string | undefined {
  return typeof layer === "object" && layer !== null && "id" in layer
    ? (layer as { id?: string }).id
    : undefined;
}

function deEmphasizeBaseColor(color: RGBA, active: boolean): RGBA {
  if (!active) return color;
  return [color[0], color[1], color[2], Math.min(color[3], 88)];
}

export type RouteMapInteractionMode = MapCanvasMode;
export type RouteMapDrawerTab = "metrics" | "explain" | "compare" | "scenario";
export type RouteMapPickTarget = "start" | "goal" | "stop" | null;

export interface RouteMapModel {
  graphData: GraphResponse | null;
  graphLoading: boolean;
  graph: GraphLevel;
  offline: boolean;
  trafficLayer: boolean;
  traffic: Record<string, number> | null;
  slot: TimeSlot;
  traceOnReal: boolean;
  edgeOverrides: Record<string, EdgeOverride>;
  edgeEditMode: boolean;
  selectedEdgeId: string | null;
  trace: Trace | null;
  multi: MultirouteResponse | null;
  optimizationTrace: OptimizationTrace | null;
  timelineSource: TimelineSource;
  stepIdx: number;
  drawerTab: RouteMapDrawerTab;
  start: string | null;
  goal: string | null;
  problemMode: ProblemMode;
  stops: string[];
  activeSnapshot: RunSnapshot | null;
  pickTarget: RouteMapPickTarget;
  theme: Theme;
}

export interface RouteMapCanvasProps {
  model: RouteMapModel;
  geometry?: RouteMapGeometry | null;
  finalRouteNodeIds?: readonly string[] | null;
  animation?: AnimationState;
  palette: Palette;
  interactionMode?: RouteMapInteractionMode;
  ariaLabel?: string;
  viewState?: MapViewState | null;
  onViewStateChange?: (viewState: MapViewState) => void;
  onPick?: (info: PickingInfo) => void;
  onRetryGraph?: () => void;
  onClearMap?: () => void;
  onDismissEdgeEditor?: () => void;
  onDismissPick?: () => void;
  onBasemapError?: () => void;
  overlays?: React.ReactNode;
}

export function RouteMapCanvas({
  model,
  geometry: sharedGeometry,
  finalRouteNodeIds,
  animation,
  palette: P,
  interactionMode = "primary",
  ariaLabel = "Khung bản đồ, chú giải và diễn biến tìm kiếm",
  viewState: controlledViewState,
  onViewStateChange,
  onPick,
  onRetryGraph,
  onClearMap,
  onDismissEdgeEditor,
  onDismissPick,
  onBasemapError,
  overlays,
}: RouteMapCanvasProps) {
  const {
    graphData, graphLoading, graph, offline, trafficLayer, traffic, slot,
    traceOnReal, edgeOverrides, edgeEditMode: requestedEdgeEditMode, selectedEdgeId, trace,
    multi, optimizationTrace, timelineSource, stepIdx, drawerTab, start, goal,
    problemMode, stops, activeSnapshot, pickTarget: requestedPickTarget, theme,
  } = model;
  const capabilities = mapCanvasCapabilities(interactionMode);
  const edgeEditMode = capabilities.allowEdgeEditing && requestedEdgeEditMode;
  const pickTarget = capabilities.allowJourneyPicking ? requestedPickTarget : null;
  const anim = capabilities.allowSearchAnimation
    ? animation ?? EMPTY_ANIMATION_STATE
    : EMPTY_ANIMATION_STATE;
  const C = P.deck;
  const CONGESTION = P.congestion;

  const [internalViewState, setInternalViewState] = React.useState<MapViewState | null>(null);
  const viewState = controlledViewState === undefined ? internalViewState : controlledViewState;
  const onViewStateChangeRef = React.useRef(onViewStateChange);
  React.useEffect(() => {
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);
  const controlledCamera = controlledViewState !== undefined;
  const setCamera = React.useCallback((next: MapViewState | null) => {
    if (!next) return;
    if (!controlledCamera) setInternalViewState(next);
    onViewStateChangeRef.current?.(next);
  }, [controlledCamera]);
  const [pulse, setPulse] = React.useState(1);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const homeView = React.useRef<MapViewState | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const geometry = React.useMemo(
    () => sharedGeometry ?? (graphData
      ? buildRouteMapGeometry(graphData.nodes, graphData.edges)
      : null),
    [graphData, sharedGeometry],
  );

  // v11: quantized zoom (half-steps) — the G_real marker sizes scale with it
  // below, and quantizing keeps the layers memo from rebuilding every frame
  const zoomBucket = Math.round((viewState?.zoom ?? 14) * 2) / 2;
  const optimizationEvent = capabilities.allowSearchAnimation
    && timelineSource === "optimization" && optimizationTrace
    ? optimizationTrace.events[Math.min(stepIdx, optimizationTrace.events.length - 1)] ?? null
    : null;
  const showFinalMultiRoute = isOptimizationFinalEvent(optimizationEvent?.kind)
    || !optimizationEvent;
  const heldKarpHighlightSet = React.useMemo(
    () => new Set(heldKarpHighlightIds(optimizationEvent)),
    [optimizationEvent],
  );
  const timelineVisible = capabilities.allowSearchAnimation && activeTimelineLength(
    timelineSource, trace, optimizationTrace, graph, traceOnReal,
  ) > 0;

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Fit the camera to the ACTUAL node cloud with the REAL canvas size.
  // meta.bbox covers the river + the empty east bank, so bbox-fitting left
  // G_demo hugging the west side of the frame — especially with the drawer
  // open (user feedback v11). Measured at call time so the ⌂ button
  // re-centers correctly for whatever width the map currently has.
  const fitToGraph = React.useCallback((): MapViewState | null => {
    if (!geometry?.bounds) return null;
    const el = containerRef.current;
    const vp = new WebMercatorViewport({
      width: el?.clientWidth || 800,
      height: el?.clientHeight || 800,
    }).fitBounds(geometry.bounds, { padding: 64 });
    return { longitude: vp.longitude, latitude: vp.latitude, zoom: vp.zoom };
  }, [geometry]);

  React.useEffect(() => {
    if (!geometry) return;
    const home = fitToGraph();
    homeView.current = home;
    setCamera(home);
  }, [geometry, fitToGraph, setCamera]);

  // Functional trace cue: pulse ring on the current node. The result-route
  // flow below has its own reduced-motion fallback and runs only for a final
  // two-point route or a completed multiroute.
  React.useEffect(() => {
    if (!anim.current) return;
    if (reducedMotion) {
      setPulse(1.25);
      return;
    }
    const id = window.setInterval(
      () => setPulse(1 + 0.9 * Math.abs(Math.sin(Date.now() / 280))),
      50,
    );
    return () => window.clearInterval(id);
  }, [anim.current, reducedMotion]);

  const coord = geometry?.coordinates ?? EMPTY_COORDINATES;

  // drop ids missing from the current graph (never draw a path to [0,0])
  const toPath = React.useCallback(
    (ids: string[]): [number, number][] => pathCoordinates(ids, coord),
    [coord],
  );

  const congestedSet = React.useMemo(
    () =>
      drawerTab === "explain" && trace
        ? new Set(trace.explanation.congested_segments.map((c) => c.edge))
        : new Set<string>(),
    [drawerTab, trace],
  );

  const isDemo = graph === "demo";

  const finalRoutePath = React.useMemo(() => {
    const nodeIds = finalRouteNodeIds === undefined
      ? trace?.found ? trace.path : null
      : finalRouteNodeIds;
    return nodeIds ? pathCoordinates(nodeIds, coord) : [];
  }, [coord, finalRouteNodeIds, trace]);

  const routeFlowPath = React.useMemo(() => {
    if (multi?.found && showFinalMultiRoute) {
      // The API guarantees chained legs. Drop each repeated join node so the
      // shader sees one continuous Đi -> stops itinerary instead of restarting
      // the highlight on every delivery leg at the same time.
      const routeNodeIds = multi.legs.flatMap((leg, legIndex) =>
        legIndex === 0 ? leg.path : leg.path.slice(1),
      );
      return toPath(routeNodeIds);
    }
    return anim.showPath ? finalRoutePath : [];
  }, [multi, showFinalMultiRoute, anim.showPath, finalRoutePath, toPath]);
  const routeFlowActive = capabilities.allowSearchAnimation && routeFlowPath.length > 1;
  const hasResultRoute = (anim.showPath && finalRoutePath.length > 1)
    || Boolean(multi?.found && showFinalMultiRoute);

  const nodeColor = React.useCallback(
    (n: GraphNode): RGBA => {
      if (optimizationEvent?.kind === "held_karp_update") {
        if (n.id === optimizationEvent.endpoint) return C.current;
        if (heldKarpHighlightSet.has(n.id)) return C.frontier;
      }
      if (anim.current?.expanded === n.id) return C.current;
      if (anim.expandedSet.has(n.id)) {
        const side = anim.sideByNode.get(n.id);
        if (side === "forward") return C.bidiForward;
        if (side === "backward") return C.bidiBackward;
        return C.expanded;
      }
      if (anim.forwardFrontierSet.has(n.id)) return C.bidiForward;
      if (anim.backwardFrontierSet.has(n.id)) return C.bidiBackward;
      if (anim.frontierSet.has(n.id)) return C.frontier;
      return deEmphasizeBaseColor(isDemo ? C.node : C.nodeReal, hasResultRoute);
    },
    [anim, C, hasResultRoute, heldKarpHighlightSet, isDemo, optimizationEvent],
  );
  // v8: G_demo labels are ALWAYS on (user request) — collision filter handles overlap
  const showLabels = isDemo;

  const layers = React.useMemo(() => {
    if (!graphData) return [];
    // v11: G_real đọc như "cầu tóc rối" khi zoom xa — marker co giãn theo
    // zoom (2→3 px node, 1.1→1.6 px cạnh). MÀU giữ nguyên như duyệt v8;
    // zoom sát trở về đúng kích thước cũ.
    const realNodeR = zoomBucket < 13 ? 1.8 : zoomBucket < 14 ? 2.2 : 2.6;
    const realEdgeW = zoomBucket < 13 ? 0.75 : zoomBucket < 14 ? 0.95 : 1.15;
    const edgeData: EdgeLayerDatum[] = (geometry?.edges ?? []).map((e) => ({
      kind: "edge",
      id: e.id,
      u: e.u,
      v: e.v,
      name: e.name,
      source: coord.get(e.u)!,
      target: coord.get(e.v)!,
      level: effectiveCongestion(e.id, traffic ?? {}, slot, edgeOverrides[e.id]),
      overridden: Boolean(edgeOverrides[e.id]),
      selected: selectedEdgeId === e.id,
    }));
    const out: unknown[] = [
      new LineLayer({
        id: "edges",
        data: edgeData,
        getSourcePosition: (d: (typeof edgeData)[number]) => d.source,
        getTargetPosition: (d: (typeof edgeData)[number]) => d.target,
        getColor: (d: (typeof edgeData)[number]) => {
          if (d.selected) return C.frontier;
          if (d.overridden) return C.path;
          const base = trafficLayer ? CONGESTION[d.level] : isDemo ? C.edgeDim : C.edgeReal;
          return deEmphasizeBaseColor(base, hasResultRoute);
        },
        getWidth: trafficLayer
          ? (isDemo ? 2.4 : Math.max(1.1, realEdgeW))
          : (isDemo ? 1.35 : realEdgeW),
        widthUnits: "pixels",
        updateTriggers: {
          getColor: [trafficLayer, traffic, slot, edgeOverrides, selectedEdgeId, theme, hasResultRoute],
        },
      }),
    ];

    if (edgeEditMode) {
      out.push(new LineLayer({
        id: "edges-pick",
        data: edgeData,
        pickable: true,
        getSourcePosition: (d: (typeof edgeData)[number]) => d.source,
        getTargetPosition: (d: (typeof edgeData)[number]) => d.target,
        // Keep a non-zero alpha so the WebGL line survives the picking pass;
        // alpha=1 remains visually imperceptible on the display pass.
        getColor: [0, 0, 0, 1],
        getWidth: 16,
        widthUnits: "pixels",
      }));
    }

    if (congestedSet.size) {
      out.push(
        new LineLayer({
          id: "congested",
          data: edgeData.filter((e) => congestedSet.has(e.id)),
          getSourcePosition: (d: (typeof edgeData)[number]) => d.source,
          getTargetPosition: (d: (typeof edgeData)[number]) => d.target,
          getColor: CONGESTION[5],
          getWidth: 5,
          widthUnits: "pixels",
        }),
      );
    }

    // final route / compare / multiroute — casing (nền) + màu (DESIGN 6)
    const casedPath = (id: string, data: RoutePathDatum[], color: RGBA,
                       width = 6, dash?: [number, number], offsetPixels = 0) => {
      const casingWidth = width + 2.5;
      const hasOffset = offsetPixels !== 0;
      out.push(
        new PathLayer({
          id: `${id}-casing`, data,
          getPath: (d: RoutePathDatum) => d.path,
          getColor: C.labelOutline, getWidth: casingWidth,
          widthUnits: "pixels", jointRounded: true, capRounded: true,
           ...(hasOffset ? {
             getOffset: offsetPixels / casingWidth,
             // deck.gl's path-style module only initializes its uniform binding
             // during the dash path. [0, 0] is documented as a solid stroke,
             // so this keeps the casing solid while giving offset rendering a
             // complete shader module setup.
             getDashArray: [0, 0],
             extensions: [new PathStyleExtension({ dash: true, offset: true })],
           } : {}),
        }),
        new PathLayer({
          id, data,
          getPath: (d: RoutePathDatum) => d.path,
          getColor: color, getWidth: width,
          widthUnits: "pixels", jointRounded: true, capRounded: true,
          // dashed body over a SOLID casing (v10d): compare route B reads
          // as one continuous band instead of dissolving into the grid
          ...(dash || hasOffset ? {
            ...(dash ? { getDashArray: dash, dashJustified: true } : {}),
            ...(hasOffset ? { getOffset: offsetPixels / width } : {}),
            extensions: [new PathStyleExtension({
              dash: Boolean(dash), offset: hasOffset,
            })],
          } : {}),
        }),
      );
    };
    // ▶ arrows ALONG a result route only (DESIGN 6, v5c): spaced >= ~220 m,
    // dark glyph with an SDF outline in the route color
    const routeArrows = (id: string, paths: [number, number][][],
                         outline: RGBA, offsetPixels = 0) => {
      // Positive PathStyleExtension offset is the right-hand side. Geometry
      // stays untouched; routeArrowPoints derives only a screen-space normal.
      const pts = routeArrowPoints(paths, offsetPixels);
      out.push(
        new TextLayer({
          id,
          data: pts,
          getPosition: (d: (typeof pts)[number]) => d.pos,
          getText: () => "▶",
          getAngle: (d: (typeof pts)[number]) => d.angle,
          getPixelOffset: (d: (typeof pts)[number]) => d.pixelOffset,
          getSize: 14,
          getColor: C.stopText,
          characterSet: ["▶"],
          fontFamily: "sans-serif",
          billboard: false,
          fontSettings: { sdf: true },
          outlineWidth: 4,
          outlineColor: outline,
          updateTriggers: { getColor: [theme] },
        }),
      );
    };

    if (multi?.found && showFinalMultiRoute) {
      const legPaths = multi.legs.map((l) => toPath(l.path));
      casedPath("multi-path", legPaths.map((path) => ({ path })), C.path);
      routeArrows("multi-arrows", legPaths, C.path);
    } else if (optimizationEvent) {
      const orderPath = toPath(conceptualOptimizationOrder(optimizationEvent));
      if (orderPath.length > 1) {
        out.push(new PathLayer({
          id: "optimization-conceptual-order",
          data: [{ path: orderPath }],
          getPath: (datum: RoutePathDatum) => datum.path,
          getColor: C.path,
          getWidth: 3,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
          getDashArray: [7, 5],
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
        }));
      }
    } else if (finalRoutePath.length > 1 && anim.showPath) {
      casedPath("route", [{ path: finalRoutePath }], C.path);
      routeArrows("route-arrows", [finalRoutePath], C.path);
    }
    // nodes (pickable for G_real start/goal picking)
    out.push(
      new ScatterplotLayer({
        id: "nodes",
        data: graphData.nodes,
        pickable: !edgeEditMode,
        getPosition: (n: GraphNode) => [n.lon, n.lat],
        getFillColor: nodeColor,
        getLineColor: (n: GraphNode): RGBA => anim.bidiOverlapSet.has(n.id)
          ? C.bidiBackward : [0, 0, 0, 0],
        getRadius: (n: GraphNode) => {
          if (optimizationEvent?.kind === "held_karp_update" && n.id === optimizationEvent.endpoint)
            return isDemo ? 7.2 : 5.8;
          if (heldKarpHighlightSet.has(n.id)) return isDemo ? 5.8 : 4.6;
          if (anim.current?.expanded === n.id) return isDemo ? 7.2 : 5.8;
          if (anim.frontierSet.has(n.id)) return isDemo ? 5.8 : 4.6;
          if (anim.expandedSet.has(n.id)) return isDemo ? 5.2 : 4.1;
          return isDemo ? 4.2 : realNodeR;
        },
        radiusUnits: "pixels",
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: (n: GraphNode) => anim.bidiOverlapSet.has(n.id) ? 2.5 : 0,
        // anim.steps.length is load-bearing: toggling "Trace trên G_real" OFF
        // empties anim.steps while stepIdx/trace/theme all stay unchanged —
        // without it deck.gl kept the stale expanded/frontier fill colors
        // (audit finding L3-03; same bug class as the label layer below)
        updateTriggers: {
          getFillColor: [anim.stepIdx, anim.steps.length, trace, optimizationEvent, theme],
          getLineColor: [anim.stepIdx, anim.steps.length, trace, theme],
          getLineWidth: [anim.stepIdx, anim.steps.length, trace],
          getRadius: [anim.stepIdx, anim.steps.length, trace, optimizationEvent, zoomBucket],
        },
      }),
    );

    const endpoints: { id: "start" | "goal"; pos: [number, number]; color: RGBA }[] = [];
    if (start && coord.get(start)) endpoints.push({ id: "start", pos: coord.get(start)!, color: C.start });
    if (goal && coord.get(goal) && shouldShowGoalMarker(
      problemMode, Boolean(multi?.found && showFinalMultiRoute),
    ))
      endpoints.push({ id: "goal", pos: coord.get(goal)!, color: C.goal });
    if (endpoints.length) {
      out.push(
        new ScatterplotLayer({
          id: "journey-endpoints",
          data: endpoints,
          getPosition: (d: (typeof endpoints)[number]) => d.pos,
          getFillColor: (d: (typeof endpoints)[number]) => d.color,
          getLineColor: C.labelOutline,
          getRadius: isDemo ? 7.8 : 6.5,
          radiusUnits: "pixels",
          stroked: true,
          filled: true,
          lineWidthUnits: "pixels",
          getLineWidth: 2.25,
          pickable: false,
          updateTriggers: { getFillColor: [theme], getLineColor: [theme] },
        }),
      );
    }
    if (pickTarget !== null && !edgeEditMode) {
      out.push(
        new ScatterplotLayer({
          id: "nodes-pick-journey",
          data: graphData.nodes,
          pickable: true,
          opacity: 0,
          getPosition: (n: GraphNode) => [n.lon, n.lat],
          getRadius: journeyNodePickRadius(graph),
          radiusUnits: "pixels",
        }),
      );
    }

    // Functional current ring: current remains identifiable without relying
    // on fill color alone. The animated outer pulse is isolated below so a
    // 50 ms tick never rebuilds every graph/path/label layer.
    if (anim.current) {
      const pos = coord.get(anim.current.expanded);
      if (pos) {
        out.push(
          new ScatterplotLayer({
            id: "current-ring",
            data: [{ pos }],
            getPosition: (d: { pos: [number, number] }) => d.pos,
            stroked: true,
            filled: false,
            getLineColor: anim.current.side === "forward"
              ? C.bidiForward
              : anim.current.side === "backward" ? C.bidiBackward : C.frontier,
            lineWidthUnits: "pixels",
            getLineWidth: 2,
            getRadius: isDemo ? 8.7 : 7,
            radiusUnits: "pixels",
          }),
        );
      }
    }

    // POI labels on demo
    if (showLabels) {
      out.push(
        new TextLayer({
          id: "labels",
          data: graphData.nodes.filter((n) => n.name),
          getPosition: (n: GraphNode) => [n.lon, n.lat],
          getText: (n: GraphNode) => n.name ?? "",
          getSize: 12.5,
          getColor: C.label,
          getPixelOffset: [0, -15],
          fontFamily: "Be Vietnam Pro, sans-serif",
          fontWeight: 600,
          characterSet: "auto",
          outlineWidth: 3,
          outlineColor: C.labelOutline,
          fontSettings: { sdf: true },
          // labels yield instead of overlapping (DESIGN 6, review v4;
          // v8d: lighter collision box so far more names stay visible)
          extensions: [new CollisionFilterExtension()],
          collisionTestProps: { sizeScale: 1.1 },
          // accessor must re-run on theme switch or labels keep the old
          // theme's color and sink into the basemap (same bug class as v2)
          updateTriggers: { getColor: [theme] },
        }),
      );
    }

    // start / goal chips + multiroute stop numbers
    const chips: { pos: [number, number]; text: string; bg: RGBA; fg: RGBA }[] = [];
    if (start && coord.get(start)) chips.push({ pos: coord.get(start)!, text: "Đi", bg: C.chipStart, fg: C.chipText });
    // multiroute result = Đi -> stops; "Đến" is NOT part of it -> hide its chip
    if (goal && coord.get(goal) && shouldShowGoalMarker(
      problemMode, Boolean(multi?.found && showFinalMultiRoute),
    ))
      chips.push({ pos: coord.get(goal)!, text: "Đến", bg: C.chipGoal, fg: C.chipText });
    const orderedStops = multi?.found && showFinalMultiRoute
      ? deliveryMarkerOrder(
          multi.order,
          activeSnapshot?.start ?? null,
          activeSnapshot?.returnToStart ?? false,
        )
      : stops;
    orderedStops.forEach((id, i) => {
      const pos = coord.get(id);
      if (pos) chips.push({ pos, text: String(i + 1), bg: C.stop, fg: C.stopText });
    });
    if (chips.length) {
      out.push(
        new TextLayer({
          id: "chips",
          data: chips,
          getPosition: (d: (typeof chips)[number]) => d.pos,
          getText: (d: (typeof chips)[number]) => d.text,
          getSize: 12,
          getColor: (d: (typeof chips)[number]) => d.fg,
          getPixelOffset: [0, -22],
          background: true,
          getBackgroundColor: (d: (typeof chips)[number]) => d.bg,
          backgroundPadding: [6, 3, 6, 3],
          fontFamily: "Be Vietnam Pro, sans-serif",
          fontWeight: 700,
          characterSet: "auto",
          fontSettings: { sdf: true },
        }),
      );
    }
    return out;
  }, [graphData, geometry, coord, toPath, traffic, slot, edgeOverrides, edgeEditMode, selectedEdgeId,
      trafficLayer, congestedSet, trace,
      multi, optimizationEvent, heldKarpHighlightSet, showFinalMultiRoute, finalRoutePath, hasResultRoute, anim, nodeColor, isDemo, showLabels, start, goal, problemMode, stops, activeSnapshot,
      pickTarget, drawerTab, graph, C, CONGESTION, theme, zoomBucket]);

  const routeFlowLayers = React.useMemo(() => {
    if (!routeFlowActive) return [];
    const data: RoutePathDatum[] = [{ path: routeFlowPath }];

    if (reducedMotion) {
      return [new PathLayer<RoutePathDatum>({
        id: "route-flow-static",
        data,
        getPath: (d) => d.path,
        getColor: C.routeFlowStatic,
        getWidth: 2,
        widthUnits: "pixels",
        jointRounded: true,
        capRounded: true,
        pickable: false,
      })];
    }

    return [
      new PathLayer<RoutePathDatum>({
        id: "route-flow-halo",
        data,
        getPath: (d) => d.path,
        getColor: C.routeFlowHalo,
        getWidth: 10,
        widthUnits: "pixels",
        jointRounded: true,
        capRounded: true,
        pickable: false,
        extensions: [ROUTE_FLOW_EXTENSION],
      }),
      new PathLayer<RoutePathDatum>({
        id: "route-flow-core",
        data,
        getPath: (d) => d.path,
        getColor: C.routeFlowCore,
        getWidth: 2.5,
        widthUnits: "pixels",
        jointRounded: true,
        capRounded: true,
        pickable: false,
        extensions: [ROUTE_FLOW_EXTENSION],
      }),
    ];
  }, [routeFlowActive, routeFlowPath, reducedMotion, C]);

  const pulseLayer = React.useMemo(() => {
    if (!anim.current) return null;
    const pos = coord.get(anim.current.expanded);
    if (!pos) return null;
    return new ScatterplotLayer({
      id: "pulse",
      data: [{ pos }],
      getPosition: (d: { pos: [number, number] }) => d.pos,
      stroked: true,
      filled: false,
      getLineColor: C.pulse,
      lineWidthUnits: "pixels",
      getLineWidth: reducedMotion ? 1.5 : 2,
      getRadius: (isDemo ? 9 : 7) * pulse,
      radiusUnits: "pixels",
    });
  }, [anim.current, coord, C.pulse, isDemo, pulse, reducedMotion]);

  const deckLayers = React.useMemo(() => {
    const composed = [...layers];
    const routePaths: unknown[] = [];
    const routeArrows: unknown[] = [];

    // Result routes must stay above the dense frontier/expanded node cloud,
    // especially on G_real at overview zoom. Pull the complete route stack out
    // of its construction position, then place it above nodes but below the
    // current ring, labels and endpoint/stop chips. All route layers are
    // non-pickable, so the invisible demo picking layer remains usable.
    for (let index = composed.length - 1; index >= 0; index -= 1) {
      const id = getLayerId(composed[index]);
      if (id && RESULT_ROUTE_ARROW_LAYER_IDS.has(id)) {
        routeArrows.unshift(...composed.splice(index, 1));
      } else if (id && RESULT_ROUTE_PATH_LAYER_IDS.has(id)) {
        routePaths.unshift(...composed.splice(index, 1));
      }
    }
    if (routePaths.length || routeArrows.length || routeFlowLayers.length) {
      const overlayIndex = composed.findIndex((layer) =>
        RESULT_ROUTE_OVERLAY_ANCHOR_IDS.has(getLayerId(layer) ?? ""),
      );
      composed.splice(
        overlayIndex >= 0 ? overlayIndex : composed.length,
        0,
        ...routePaths,
        ...routeFlowLayers,
        ...routeArrows,
      );
    }
    if (pulseLayer) composed.push(pulseLayer);
    return composed;
  }, [layers, routeFlowLayers, pulseLayer]);

  // A graph switch clears graphData before the request starts, while the
  // previous camera can remain valid. Key the shell to BOTH values so a
  // failed switch never leaves an empty canvas with no retry affordance.
  if (!graphData || !viewState) {
    return (
      <div ref={containerRef}
        role={graphLoading ? "status" : "alert"}
        aria-live={graphLoading ? "polite" : "assertive"}
        aria-busy={graphLoading}
        aria-atomic="true"
        className="flex h-full flex-col items-center justify-center gap-3 bg-surface-map text-ink-dim">
        {graphLoading ? (
          <span className="flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin text-algo-frontier" />
            Đang tải đồ thị…
          </span>
        ) : (
          <>
            <span className="max-w-sm text-center text-sm">
              Không tải được đồ thị — backend đã chạy chưa?
            </span>
            <Button variant="secondary" onClick={onRetryGraph} disabled={!onRetryGraph}>
              Thử lại
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className="relative h-full w-full overflow-hidden rounded-lg bg-surface-map max-[959px]:rounded-none"
    >
      <DeckGL
        _animate={routeFlowActive && !reducedMotion}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setCamera(vs as MapViewState)}
        controller
        layers={deckLayers as never[]}
        onClick={capabilities.allowJourneyPicking || capabilities.allowEdgeEditing ? onPick : undefined}
        // node G_real teo còn 2px ở zoom xa (v11) — nới vùng ăn click để gõ
        // liên tục 9 điểm giao không phải nhắm từng pixel
        pickingRadius={8}
        getCursor={({ isDragging }) =>
          capabilities.showPrimaryChrome && (edgeEditMode || pickTarget)
            ? "crosshair" : isDragging ? "grabbing" : "grab"
        }
        getTooltip={({ object }) => {
          const text = mapTooltipText(object);
          return text
            ? {
                text,
                style: {
                  background: "rgb(var(--surface-raised))",
                  color: "rgb(var(--ink))",
                  border: "1px solid rgb(var(--surface-border))",
                  borderRadius: "8px", fontSize: "12px", padding: "6px 10px",
                },
              }
            : null;
        }}
      >
        {!offline && (
          <MapLibre
            mapStyle={P.basemap}
            locale={{ "Map.Title": "Bản đồ định tuyến giao thông" }}
            attributionControl={false}
            onError={onBasemapError}
          />
        )}
      </DeckGL>
      {graphLoading && (
        <div role="status" className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-surface-map/65">
          <span className="floating-chrome flex h-11 items-center gap-2 rounded-lg border border-surface-strong/80 px-3 text-sm font-medium">
            <Loader2 className="size-4 animate-spin text-algo-frontier" />
            Đang tải đồ thị…
          </span>
        </div>
      )}
      {!offline && (
        <div className="pointer-events-none absolute bottom-1 right-1.5 z-10 text-[10px] text-ink-dim/80">
          © CARTO · © OpenStreetMap contributors
        </div>
      )}
      {/* map controls (DESIGN 6, v6): zoom +/- and fly-home */}
      <div className={`floating-chrome absolute right-3 z-10 flex flex-col gap-1 rounded-lg border border-surface-strong/80 p-1 max-[639px]:bottom-[8.5rem] ${mapControlsBottomClass(timelineVisible)}`}>
        <Button variant="ghost" size="iconSm" aria-label="Phóng to"
          onClick={() => viewState && setCamera({ ...viewState, zoom: (viewState.zoom ?? 0) + 0.7, transitionDuration: 250 })}>
          <Plus />
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Thu nhỏ"
          onClick={() => viewState && setCamera({ ...viewState, zoom: (viewState.zoom ?? 0) - 0.7, transitionDuration: 250 })}>
          <Minus />
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Về toàn cảnh"
          onClick={() => {
            // re-fit theo kích thước khung HIỆN TẠI (drawer mở/đóng đổi bề
            // rộng) — homeView cũ có thể được fit lúc khung khác cỡ
            const home = fitToGraph() ?? homeView.current;
            if (!home) return;
            homeView.current = home;
            setCamera({
              ...home,
              transitionDuration: 500,
              transitionInterpolator: new FlyToInterpolator(),
            });
          }}>
          <Home />
        </Button>
        {capabilities.allowClear && (
          <>
            <div className="my-0.5 border-t border-surface-border" />
            <Button variant="ghost" size="iconSm" aria-label="Xoá mọi thứ trên bản đồ"
              className="hover:text-goal"
              disabled={!onClearMap || (!trace && !multi && !start && !goal && stops.length === 0)}
              onClick={onClearMap}>
              <Trash2 />
            </Button>
          </>
        )}
      </div>
      {capabilities.showPrimaryChrome && edgeEditMode && (
        <div className="floating-chrome absolute left-1/2 top-16 z-20 flex min-h-11 max-w-[min(680px,calc(100%-8rem))] -translate-x-1/2 items-center gap-2 rounded-lg border border-algo-frontier/60 px-3 text-sm max-[959px]:max-w-[calc(100%-2rem)]">
          <span>Bấm một cạnh để chỉnh thử trong phiên hiện tại.</span>
          <button type="button"
            className="inline-flex h-9 items-center rounded-lg border border-surface-border bg-surface-control px-2.5 text-xs font-medium text-ink-dim transition-colors hover:border-surface-strong hover:text-ink"
            onClick={onDismissEdgeEditor}>
            Xong
          </button>
        </div>
      )}
      {capabilities.showPrimaryChrome && pickTarget && !edgeEditMode && (
        <div className="floating-chrome absolute left-1/2 top-16 z-20 flex min-h-11 max-w-[min(680px,calc(100%-8rem))] -translate-x-1/2 items-center gap-2 rounded-lg border border-surface-strong/80 px-3 text-sm max-[959px]:max-w-[calc(100%-2rem)]">
          {pickTarget === "stop" ? (
            <span>
              Bấm các nút giao để thêm điểm giao{" "}
              <span className="font-mono font-bold text-algo-frontier">{stops.length}/15</span>
            </span>
          ) : (
            <span>
              Bấm vào một nút giao để chọn{" "}
              <span className="font-bold text-algo-frontier">
                {pickTarget === "start" ? "điểm Đi" : "điểm Đến"}
              </span>
              {((pickTarget === "start" && !goal) || (pickTarget === "goal" && !start)) && (
                <span className="text-ink-dim"> — xong sẽ chọn tiếp {pickTarget === "start" ? "điểm Đến" : "điểm Đi"}</span>
              )}
            </span>
          )}
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-lg border border-surface-border bg-surface-control px-2.5 text-xs font-medium text-ink-dim transition-colors hover:border-surface-strong hover:text-ink"
            onClick={onDismissPick}
          >
            Xong
          </button>
        </div>
      )}
      {overlays}
    </div>
  );
}
