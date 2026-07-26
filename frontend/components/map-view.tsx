"use client";

// Map = MapLibre (Carto dark-matter) + deck.gl overlays.
// Offline mode drops the basemap and renders the pure graph on `surface`.
// All colors come from lib/colors.ts (DESIGN.md §3) — no ad-hoc colors.

import * as React from "react";
import DeckGL from "@deck.gl/react";
import { LineLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { PathStyleExtension } from "@deck.gl/extensions";
import { WebMercatorViewport, type MapViewState, type PickingInfo } from "@deck.gl/core";
import { Map as MapLibre } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { type RGBA } from "@/lib/colors";
import { usePalette } from "@/lib/use-palette";
import { useApp } from "@/lib/store";
import { useAnimation } from "@/lib/use-animation";
import type { GraphNode } from "@/lib/types";
import { Legend } from "./legend";
import { Timeline } from "./timeline";

export function MapView() {
  const graphData = useApp((s) => s.graphData);
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

  // initial camera: fit the graph bbox
  React.useEffect(() => {
    if (!graphData) return;
    const [left, bottom, right, top] = graphData.meta.bbox;
    const vp = new WebMercatorViewport({ width: 800, height: 800 }).fitBounds(
      [[left, bottom], [right, top]],
      { padding: 72 },
    );
    setViewState({ longitude: vp.longitude, latitude: vp.latitude, zoom: vp.zoom });
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

  const toPath = React.useCallback(
    (ids: string[]): [number, number][] =>
      ids.map((id) => coord.get(id) ?? ([0, 0] as [number, number])),
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
  const showLabels = isDemo && (viewState?.zoom ?? 0) >= 13.5;

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
        getWidth: isDemo ? 2.5 : 1.5,
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
    if (multi?.found) {
      casedPath("multi-path", multi.legs.map((l) => ({ path: toPath(l.path) })), C.path);
    } else if (trace?.found && anim.showPath) {
      casedPath("route", [{ path: toPath(trace.path) }], C.path);
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
      <div className="flex h-full items-center justify-center bg-surface text-ink-dim">
        Đang tải đồ thị…
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
        {!offline && <MapLibre mapStyle={P.basemap} attributionControl={false} />}
      </DeckGL>
      {!offline && (
        <div className="pointer-events-none absolute bottom-1 right-1.5 z-10 text-[10px] text-ink-dim/80">
          © CARTO · © OpenStreetMap contributors
        </div>
      )}
      {pickTarget && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-surface-border bg-surface-panel/95 px-3 py-1.5 text-sm">
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
