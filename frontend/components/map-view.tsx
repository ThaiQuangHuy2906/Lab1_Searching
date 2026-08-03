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

import { type RGBA } from "@/lib/colors";
import { ROUTE_FLOW_EXTENSION } from "@/lib/route-flow-extension";
import { usePalette } from "@/lib/use-palette";
import { Home, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Button } from "./ui/button";
import { useAnimation } from "@/lib/use-animation";
import { isEndpointOptionAllowed, isStopOptionAllowed } from "@/lib/interaction-policy";
import type { GraphNode } from "@/lib/types";
import { Legend } from "./legend";
import { Timeline } from "./timeline";

type RoutePathDatum = { path: [number, number][] };

const METERS_PER_DEGREE_LAT = 110_540;
// Compare-only visual separation. PathStyleExtension expresses offsets relative
// to each layer's own width, so casedPath converts this shared pixel distance
// for the casing/body independently. Route coordinates remain untouched.
const COMPARE_ROUTE_OFFSET_PX = 4;
const RESULT_ROUTE_PATH_LAYER_IDS = new Set([
  "route-casing", "route",
  "multi-path-casing", "multi-path",
  "route-compare-casing", "route-compare",
]);
const RESULT_ROUTE_ARROW_LAYER_IDS = new Set([
  "route-arrows", "multi-arrows", "compare-arrows",
]);
const RESULT_ROUTE_OVERLAY_ANCHOR_IDS = new Set(["current-ring", "labels", "chips"]);

function getLayerId(layer: unknown): string | undefined {
  return typeof layer === "object" && layer !== null && "id" in layer
    ? (layer as { id?: string }).id
    : undefined;
}

export function MapView() {
  const graphData = useApp((s) => s.graphData);
  const graphLoading = useApp((s) => s.graphLoading);
  const loadGraph = useApp((s) => s.loadGraph);
  const graph = useApp((s) => s.graph);
  const offline = useApp((s) => s.offlineMode);
  const trafficLayer = useApp((s) => s.trafficLayer);
  const traffic = useApp((s) => s.traffic);
  const trace = useApp((s) => s.trace);
  const compare = useApp((s) => s.compare);
  const multi = useApp((s) => s.multi);
  const drawerTab = useApp((s) => s.drawerTab);
  const start = useApp((s) => s.start);
  const goal = useApp((s) => s.goal);
  const stops = useApp((s) => s.stops);
  const clearMap = useApp((s) => s.clearMap);
  const pickTarget = useApp((s) => s.pickTarget);
  const theme = useApp((s) => s.theme);
  const set = useApp((s) => s.set);
  const anim = useAnimation();
  const P = usePalette();
  const C = P.deck;
  const CONGESTION = P.congestion;

  const [viewState, setViewState] = React.useState<MapViewState | null>(null);
  const [pulse, setPulse] = React.useState(1);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const basemapErrorShown = React.useRef(false);
  const homeView = React.useRef<MapViewState | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const nodeBounds = React.useRef<[[number, number], [number, number]] | null>(null);

  // v11: quantized zoom (half-steps) — the G_real marker sizes scale with it
  // below, and quantizing keeps the layers memo from rebuilding every frame
  const zoomBucket = Math.round((viewState?.zoom ?? 14) * 2) / 2;

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
    if (!nodeBounds.current) return null;
    const el = containerRef.current;
    const vp = new WebMercatorViewport({
      width: el?.clientWidth || 800,
      height: el?.clientHeight || 800,
    }).fitBounds(nodeBounds.current, { padding: 64 });
    return { longitude: vp.longitude, latitude: vp.latitude, zoom: vp.zoom };
  }, []);

  React.useEffect(() => {
    if (!graphData) return;
    const lons = graphData.nodes.map((n) => n.lon);
    const lats = graphData.nodes.map((n) => n.lat);
    nodeBounds.current = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ];
    const home = fitToGraph();
    homeView.current = home;
    setViewState(home);
  }, [graphData, fitToGraph]);

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

  const coord = React.useMemo(() => {
    const m = new Map<string, [number, number]>();
    graphData?.nodes.forEach((n) => m.set(n.id, [n.lon, n.lat]));
    return m;
  }, [graphData]);

  // drop ids missing from the current graph (never draw a path to [0,0])
  const toPath = React.useCallback(
    (ids: string[]): [number, number][] =>
      ids.map((id) => coord.get(id)).filter((c): c is [number, number] => !!c),
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

  const routeFlowPath = React.useMemo(() => {
    if (multi?.found) {
      // The API guarantees chained legs. Drop each repeated join node so the
      // shader sees one continuous Đi -> stops itinerary instead of restarting
      // the highlight on every delivery leg at the same time.
      const routeNodeIds = multi.legs.flatMap((leg, legIndex) =>
        legIndex === 0 ? leg.path : leg.path.slice(1),
      );
      return toPath(routeNodeIds);
    }
    return trace?.found && anim.showPath ? toPath(trace.path) : [];
  }, [multi, trace, anim.showPath, toPath]);
  const routeFlowActive = routeFlowPath.length > 1;

  const nodeColor = React.useCallback(
    (n: GraphNode): RGBA => {
      if (anim.current?.expanded === n.id) return C.current;
      if (anim.expandedSet.has(n.id)) {
        const side = anim.sideByNode.get(n.id);
        if (side === "forward") return C.bidiForward;
        if (side === "backward") return C.bidiBackward;
        return C.expanded;
      }
      if (anim.frontierSet.has(n.id)) return C.frontier;
      return isDemo ? C.node : C.nodeReal;
    },
    [anim, C, isDemo],
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
    const edgeData = graphData.edges.map((e) => ({
      id: e.id,
      source: coord.get(e.u)!,
      target: coord.get(e.v)!,
      level: traffic?.[e.id] ?? 1,
    }));
    const out: unknown[] = [
      new LineLayer({
        id: "edges",
        data: edgeData,
        getSourcePosition: (d: (typeof edgeData)[number]) => d.source,
        getTargetPosition: (d: (typeof edgeData)[number]) => d.target,
        getColor: (d: (typeof edgeData)[number]) =>
          trafficLayer ? CONGESTION[d.level] : isDemo ? C.edgeDim : C.edgeReal,
        getWidth: trafficLayer
          ? (isDemo ? 2.4 : Math.max(1.1, realEdgeW))
          : (isDemo ? 1.35 : realEdgeW),
        widthUnits: "pixels",
        updateTriggers: { getColor: [trafficLayer, traffic, theme] },
      }),
    ];

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
            extensions: [new PathStyleExtension({ offset: true })],
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
      const pts: {
        pos: [number, number]; angle: number; pixelOffset: [number, number];
      }[] = [];
      for (const path of paths) {
        let since = Infinity; // always place one on the first hop
        for (let i = 0; i + 1 < path.length; i += 1) {
          const [x1, y1] = path[i];
          const [x2, y2] = path[i + 1];
          const latMid = (y1 + y2) / 2;
          const dxm = (x2 - x1) * METERS_PER_DEGREE_LAT * Math.cos((latMid * Math.PI) / 180);
          const dym = (y2 - y1) * METERS_PER_DEGREE_LAT;
          const hop = Math.hypot(dxm, dym);
          since += hop;
          if (since >= 220) {
            pts.push({
              pos: [(x1 + x2) / 2, latMid],
              angle: (Math.atan2(dym, dxm) * 180) / Math.PI,
              // Positive PathStyleExtension offset is the right-hand side.
              // Pixel Y grows downward, hence [dym, dxm] is the matching
              // screen-space right normal for the route direction.
              pixelOffset: hop > 0
                ? [(dym / hop) * offsetPixels, (dxm / hop) * offsetPixels]
                : [0, 0],
            });
            since = 0;
          }
        }
      }
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

    if (multi?.found) {
      const legPaths = multi.legs.map((l) => toPath(l.path));
      casedPath("multi-path", legPaths.map((path) => ({ path })), C.path);
      routeArrows("multi-arrows", legPaths, C.path);
    } else if (trace?.found && anim.showPath) {
      const routePath = toPath(trace.path);
      casedPath("route", [{ path: routePath }], C.path);
      routeArrows("route-arrows", [routePath], C.path);
    }
    if (compare?.found && drawerTab === "compare") {
      casedPath("route-compare", [{ path: toPath(compare.path) }],
        C.compareB, 5, [10, 5], COMPARE_ROUTE_OFFSET_PX);
      routeArrows("compare-arrows", [toPath(compare.path)],
        C.compareB, COMPARE_ROUTE_OFFSET_PX);
    }

    // nodes (pickable for G_real start/goal picking)
    out.push(
      new ScatterplotLayer({
        id: "nodes",
        data: graphData.nodes,
        pickable: true,
        getPosition: (n: GraphNode) => [n.lon, n.lat],
        getFillColor: nodeColor,
        getRadius: (n: GraphNode) => {
          if (anim.current?.expanded === n.id) return isDemo ? 7.2 : 5.8;
          if (anim.frontierSet.has(n.id)) return isDemo ? 5.8 : 4.6;
          if (anim.expandedSet.has(n.id)) return isDemo ? 5.2 : 4.1;
          return isDemo ? 4.2 : realNodeR;
        },
        radiusUnits: "pixels",
        stroked: false,
        // anim.steps.length is load-bearing: toggling "Trace trên G_real" OFF
        // empties anim.steps while stepIdx/trace/theme all stay unchanged —
        // without it deck.gl kept the stale expanded/frontier fill colors
        // (audit finding L3-03; same bug class as the label layer below)
        updateTriggers: {
          getFillColor: [anim.stepIdx, anim.steps.length, trace, theme],
          getRadius: [anim.stepIdx, anim.steps.length, trace, zoomBucket],
        },
      }),
    );
    if (isDemo) {
      out.push(
        new ScatterplotLayer({
          id: "nodes-pick-demo",
          data: graphData.nodes,
          pickable: pickTarget !== null,
          opacity: 0,
          getPosition: (n: GraphNode) => [n.lon, n.lat],
          getRadius: 14,
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
            getLineColor: C.frontier,
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
    if (goal && coord.get(goal) && !multi?.found)
      chips.push({ pos: coord.get(goal)!, text: "Đến", bg: C.chipGoal, fg: C.chipText });
    const orderedStops = multi?.found ? multi.order.slice(1) : stops;
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
  }, [graphData, coord, toPath, traffic, trafficLayer, congestedSet, trace, compare,
      multi, anim, nodeColor, isDemo, showLabels, start, goal, stops,
      pickTarget, drawerTab, C, CONGESTION, theme, zoomBucket]);

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

  const onClick = React.useCallback(
    (info: PickingInfo) => {
      const st = useApp.getState();
      if (st.running || st.comparing || st.multiRunning) return; // journey locked mid-flight (L3-04)
      const target = st.pickTarget;
      if (!target || !info.object) return;
      const node = info.object as GraphNode;
      // v11: chuỗi chọn nối tiếp — chọn Đi xong tự chờ chọn Đến (và ngược
      // lại); chế độ thêm điểm giao GIỮ NGUYÊN để gõ liên tục 9 điểm cho
      // cảnh multiroute của video, tự thoát khi chạm trần 15.
      if (target === "start") {
        if (!isEndpointOptionAllowed("start", node.id, st.goal, st.stops)) {
          if (node.id !== st.goal) {
            toast.error("Điểm Đi không thể đồng thời là điểm giao.");
            return;
          }
          toast.error("Điểm Đi phải khác điểm Đến.");
          return;
        }
        // tour mode (đã có điểm giao) không cần Đến -> đừng auto-chuyển
        set({ start: node.id,
              pickTarget: st.goal || st.stops.length > 0 ? null : "goal" });
      } else if (target === "goal") {
        if (!isEndpointOptionAllowed("goal", node.id, st.start, st.stops)) {
          if (node.id !== st.start) {
            toast.error("Điểm Đến không thể đồng thời là điểm giao.");
            return;
          }
          toast.error("Điểm Đến phải khác điểm Đi.");
          return;
        }
        set({ goal: node.id, pickTarget: st.start ? null : "start" });
      } else {
        // đừng nuốt im lặng: đang gõ liên tục 9 điểm cho video, click không
        // ăn mà không nói gì thì người quay tưởng app đơ (review v11)
        if (!isStopOptionAllowed(node.id, st.start, st.goal, st.stops)) {
          if (node.id === st.goal) {
            toast.info("Điểm Đến không thể đồng thời là điểm giao.");
            return;
          }
          if (node.id !== st.start) {
            toast.info("Điểm này đã có trong danh sách giao.");
            return;
          }
          toast.info("Điểm Đi không thể đồng thời là điểm giao.");
          return;
        }
        if (st.stops.length >= 15) return;
        const next = [...st.stops, node.id];
        set({ stops: next, pickTarget: next.length >= 15 ? null : "stop" });
      }
    },
    [set],
  );

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
              Không tải được đồ thị — backend (localhost:8000) đã chạy chưa?
            </span>
            <Button variant="secondary" onClick={() => void loadGraph(graph)}>
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
      role={offline ? "region" : undefined}
      aria-label={offline ? "Bản đồ định tuyến giao thông — chế độ ngoại tuyến" : undefined}
      className="relative h-full w-full bg-surface-map"
    >
      <DeckGL
        _animate={routeFlowActive && !reducedMotion}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
        controller
        layers={deckLayers as never[]}
        onClick={onClick}
        // node G_real teo còn 2px ở zoom xa (v11) — nới vùng ăn click để gõ
        // liên tục 9 điểm giao không phải nhắm từng pixel
        pickingRadius={8}
        getCursor={({ isDragging }) =>
          pickTarget ? "crosshair" : isDragging ? "grabbing" : "grab"
        }
        getTooltip={({ object }) =>
          object && "id" in (object as GraphNode)
            ? {
                text: (object as GraphNode).name ?? `nút ${(object as GraphNode).id}`,
                style: {
                  background: "rgb(var(--surface-raised))",
                  color: "rgb(var(--ink))",
                  border: "1px solid rgb(var(--surface-border))",
                  borderRadius: "8px", fontSize: "12px", padding: "4px 8px",
                },
              }
            : null
        }
      >
        {!offline && (
          <MapLibre
            mapStyle={P.basemap}
            locale={{ "Map.Title": "Bản đồ định tuyến giao thông" }}
            attributionControl={false}
            onError={() => {
              if (!basemapErrorShown.current) {
                basemapErrorShown.current = true;
                toast.warning(
                  "Không tải được bản đồ nền (mạng chập chờn?) — bật \"Chế độ offline\" để demo tiếp.",
                );
              }
            }}
          />
        )}
      </DeckGL>
      {graphLoading && (
        <div role="status" className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-surface-map/65">
          <span className="flex h-11 items-center gap-2 rounded-lg border border-surface-strong bg-surface-raised px-3 text-sm font-medium shadow-float">
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
      <div className="absolute bottom-10 right-3 z-10 flex flex-col gap-1 rounded-lg border border-surface-strong bg-surface-raised p-1 shadow-float">
        <Button variant="ghost" size="iconSm" aria-label="Phóng to"
          onClick={() => setViewState((v) => v && ({ ...v, zoom: (v.zoom ?? 0) + 0.7, transitionDuration: 250 }))}>
          <Plus />
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Thu nhỏ"
          onClick={() => setViewState((v) => v && ({ ...v, zoom: (v.zoom ?? 0) - 0.7, transitionDuration: 250 }))}>
          <Minus />
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Về toàn cảnh"
          onClick={() => {
            // re-fit theo kích thước khung HIỆN TẠI (drawer mở/đóng đổi bề
            // rộng) — homeView cũ có thể được fit lúc khung khác cỡ
            const home = fitToGraph() ?? homeView.current;
            if (!home) return;
            homeView.current = home;
            setViewState({
              ...home,
              transitionDuration: 500,
              transitionInterpolator: new FlyToInterpolator(),
            });
          }}>
          <Home />
        </Button>
        <div className="my-0.5 border-t border-surface-border" />
        <Button variant="ghost" size="iconSm" aria-label="Xoá mọi thứ trên bản đồ"
          className="hover:text-goal"
          disabled={!trace && !compare && !multi && !start && !goal && stops.length === 0}
          onClick={clearMap}>
          <Trash2 />
        </Button>
      </div>
      {pickTarget && (
        <div className="absolute left-1/2 top-3 z-20 flex min-h-11 max-w-[min(680px,calc(100%-8rem))] -translate-x-1/2 items-center gap-2 rounded-lg border border-surface-strong bg-surface-raised px-3 text-sm shadow-float">
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
            onClick={() => set({ pickTarget: null })}
          >
            Xong
          </button>
        </div>
      )}
      <Legend />
      <Timeline />
    </div>
  );
}
