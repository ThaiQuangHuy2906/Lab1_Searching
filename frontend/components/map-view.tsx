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
import { usePalette } from "@/lib/use-palette";
import { Home, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { Button } from "./ui/button";
import { useAnimation } from "@/lib/use-animation";
import type { GraphNode } from "@/lib/types";
import { Legend } from "./legend";
import { Timeline } from "./timeline";

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
  const pickTarget = useApp((s) => s.pickTarget);
  const theme = useApp((s) => s.theme);
  const set = useApp((s) => s.set);
  const anim = useAnimation();
  const P = usePalette();
  const C = P.deck;
  const CONGESTION = P.congestion;

  const [viewState, setViewState] = React.useState<MapViewState | null>(null);
  const [pulse, setPulse] = React.useState(1);
  const basemapErrorShown = React.useRef(false);
  const homeView = React.useRef<MapViewState | null>(null);

  // initial camera: fit the graph bbox
  React.useEffect(() => {
    if (!graphData) return;
    const [left, bottom, right, top] = graphData.meta.bbox;
    const vp = new WebMercatorViewport({ width: 800, height: 800 }).fitBounds(
      [[left, bottom], [right, top]],
      { padding: 72 },
    );
    const home = { longitude: vp.longitude, latitude: vp.latitude, zoom: vp.zoom };
    homeView.current = home;
    setViewState(home);
  }, [graphData]);

  // the ONLY decorative motion allowed: pulse ring on the current node
  React.useEffect(() => {
    if (!anim.current) return;
    const id = window.setInterval(
      () => setPulse(1 + 0.9 * Math.abs(Math.sin(Date.now() / 280))),
      50,
    );
    return () => window.clearInterval(id);
  }, [anim.current]);

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
      return C.node;
    },
    [anim, C],
  );

  const isDemo = graph === "demo";
  const showLabels = isDemo && (viewState?.zoom ?? 0) >= 12.8;

  const layers = React.useMemo(() => {
    if (!graphData) return [];
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
          trafficLayer ? CONGESTION[d.level] : C.edgeDim,
        getWidth: isDemo ? 3 : 1.6,
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
    const casedPath = (id: string, data: { path: [number, number][] }[],
                       color: RGBA, width = 6) => {
      out.push(
        new PathLayer({
          id: `${id}-casing`, data,
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: C.labelOutline, getWidth: width + 2.5,
          widthUnits: "pixels", jointRounded: true, capRounded: true,
        }),
        new PathLayer({
          id, data,
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: color, getWidth: width,
          widthUnits: "pixels", jointRounded: true, capRounded: true,
        }),
      );
    };
    // ▶ arrows ALONG a result route only (DESIGN 6, v5c): spaced >= ~220 m,
    // dark glyph with an SDF outline in the route color
    const M_PER_DEG_LAT = 110_540;
    const routeArrows = (id: string, paths: [number, number][][], outline: RGBA) => {
      const pts: { pos: [number, number]; angle: number }[] = [];
      for (const path of paths) {
        let since = Infinity; // always place one on the first hop
        for (let i = 0; i + 1 < path.length; i += 1) {
          const [x1, y1] = path[i];
          const [x2, y2] = path[i + 1];
          const latMid = (y1 + y2) / 2;
          const dxm = (x2 - x1) * M_PER_DEG_LAT * Math.cos((latMid * Math.PI) / 180);
          const dym = (y2 - y1) * M_PER_DEG_LAT;
          const hop = Math.hypot(dxm, dym);
          since += hop;
          if (since >= 220) {
            pts.push({
              pos: [(x1 + x2) / 2, latMid],
              angle: (Math.atan2(dym, dxm) * 180) / Math.PI,
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
      out.push(
        new PathLayer({
          id: "route-compare",
          data: [{ path: toPath(compare.path) }],
          getPath: (d: { path: [number, number][] }) => d.path,
          getColor: C.compareB,
          getWidth: 3,
          widthUnits: "pixels",
          jointRounded: true,
          capRounded: true,
          getDashArray: [6, 4],
          dashJustified: true,
          extensions: [new PathStyleExtension({ dash: true })],
        }),
      );
      routeArrows("compare-arrows", [toPath(compare.path)], C.compareB);
    }

    // nodes (pickable for G_real start/goal picking)
    out.push(
      new ScatterplotLayer({
        id: "nodes",
        data: graphData.nodes,
        pickable: true,
        getPosition: (n: GraphNode) => [n.lon, n.lat],
        getFillColor: nodeColor,
        getRadius: isDemo ? 5.5 : 3,
        radiusUnits: "pixels",
        stroked: false,
        updateTriggers: { getFillColor: [anim.stepIdx, trace, theme] },
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

    // pulse ring on the node being expanded
    if (anim.current) {
      const pos = coord.get(anim.current.expanded);
      if (pos) {
        out.push(
          new ScatterplotLayer({
            id: "pulse",
            data: [{ pos }],
            getPosition: (d: { pos: [number, number] }) => d.pos,
            stroked: true,
            filled: false,
            getLineColor: C.pulse,
            lineWidthUnits: "pixels",
            getLineWidth: 2,
            getRadius: (isDemo ? 9 : 6) * pulse,
            radiusUnits: "pixels",
            updateTriggers: { getRadius: pulse },
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
          getSize: 11,
          getColor: C.label,
          getPixelOffset: [0, -14],
          fontFamily: "Be Vietnam Pro, sans-serif",
          characterSet: "auto",
          outlineWidth: 2,
          outlineColor: C.labelOutline,
          fontSettings: { sdf: true },
          // labels yield instead of overlapping (DESIGN 6, review v4)
          extensions: [new CollisionFilterExtension()],
          collisionTestProps: { sizeScale: 1.6 },
        }),
      );
    }

    // start / goal chips + multiroute stop numbers
    const chips: { pos: [number, number]; text: string; bg: RGBA; fg: RGBA }[] = [];
    if (start && coord.get(start)) chips.push({ pos: coord.get(start)!, text: "Đi", bg: C.chipStart, fg: C.chipText });
    if (goal && coord.get(goal)) chips.push({ pos: coord.get(goal)!, text: "Đến", bg: C.chipGoal, fg: C.chipText });
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
      multi, anim, nodeColor, pulse, isDemo, showLabels, start, goal, stops,
      pickTarget, drawerTab, C, CONGESTION, theme]);

  const onClick = React.useCallback(
    (info: PickingInfo) => {
      const target = useApp.getState().pickTarget;
      if (!target || !info.object) return;
      const node = info.object as GraphNode;
      if (target === "start") set({ start: node.id, pickTarget: null });
      else if (target === "goal") set({ goal: node.id, pickTarget: null });
      else {
        const cur = useApp.getState().stops;
        if (!cur.includes(node.id) && cur.length < 15)
          set({ stops: [...cur, node.id], pickTarget: null });
      }
    },
    [set],
  );

  if (!viewState) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface text-ink-dim">
        {graphLoading ? (
          <span>Đang tải đồ thị…</span>
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
    <div className="relative h-full w-full bg-surface">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
        controller
        layers={layers as never[]}
        onClick={onClick}
        getCursor={({ isDragging }) =>
          pickTarget ? "crosshair" : isDragging ? "grabbing" : "grab"
        }
        getTooltip={({ object }) =>
          object && "id" in (object as GraphNode)
            ? {
                text: (object as GraphNode).name ?? `nút ${(object as GraphNode).id}`,
                style: {
                  background: "rgb(var(--surface-panel))",
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
      {!offline && (
        <div className="pointer-events-none absolute bottom-1 right-1.5 z-10 text-[10px] text-ink-dim/80">
          © CARTO · © OpenStreetMap contributors
        </div>
      )}
      {/* map controls (DESIGN 6, v6): zoom +/- and fly-home */}
      <div className="absolute bottom-10 right-3 z-10 flex flex-col gap-1 rounded-lg border border-surface-border bg-surface-panel p-1 shadow-float">
        <Button variant="ghost" size="iconSm" aria-label="Phóng to"
          onClick={() => setViewState((v) => v && ({ ...v, zoom: (v.zoom ?? 0) + 0.7, transitionDuration: 250 }))}>
          <Plus />
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Thu nhỏ"
          onClick={() => setViewState((v) => v && ({ ...v, zoom: (v.zoom ?? 0) - 0.7, transitionDuration: 250 }))}>
          <Minus />
        </Button>
        <Button variant="ghost" size="iconSm" aria-label="Về toàn cảnh"
          onClick={() => homeView.current && setViewState({
            ...homeView.current,
            transitionDuration: 500,
            transitionInterpolator: new FlyToInterpolator(),
          })}>
          <Home />
        </Button>
      </div>
      {pickTarget && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-surface-border bg-surface-panel px-3 py-1.5 text-sm shadow-float">
          Bấm vào một nút giao trên bản đồ để chọn{" "}
          <span className="font-bold text-algo-frontier">
            {pickTarget === "start" ? "điểm Đi" : pickTarget === "goal" ? "điểm Đến" : "điểm giao"}
          </span>
        </div>
      )}
      <Legend />
      <Timeline />
    </div>
  );
}
