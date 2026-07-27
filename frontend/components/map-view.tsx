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
import { Home, Minus, Plus, Trash2 } from "lucide-react";
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
  const basemapErrorShown = React.useRef(false);
  const homeView = React.useRef<MapViewState | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const nodeBounds = React.useRef<[[number, number], [number, number]] | null>(null);

  // v11: quantized zoom (half-steps) — the G_real marker sizes scale with it
  // below, and quantizing keeps the layers memo from rebuilding every frame
  const zoomBucket = Math.round((viewState?.zoom ?? 14) * 2) / 2;

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
  // v8: G_demo labels are ALWAYS on (user request) — collision filter handles overlap
  const showLabels = isDemo;

  const layers = React.useMemo(() => {
    if (!graphData) return [];
    // v11: G_real đọc như "cầu tóc rối" khi zoom xa — marker co giãn theo
    // zoom (2→3 px node, 1.1→1.6 px cạnh). MÀU giữ nguyên như duyệt v8;
    // zoom sát trở về đúng kích thước cũ.
    const realNodeR = zoomBucket < 13 ? 2 : zoomBucket < 14 ? 2.5 : 3;
    const realEdgeW = zoomBucket < 13 ? 1.1 : zoomBucket < 14 ? 1.4 : 1.6;
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
        getWidth: isDemo ? 3 : realEdgeW,
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
                       color: RGBA, width = 6, dash?: [number, number]) => {
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
          // dashed body over a SOLID casing (v10d): compare route B reads
          // as one continuous band instead of dissolving into the grid
          ...(dash ? {
            getDashArray: dash, dashJustified: true,
            extensions: [new PathStyleExtension({ dash: true })],
          } : {}),
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
      casedPath("route-compare", [{ path: toPath(compare.path) }],
        C.compareB, 5, [10, 5]);
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
        getRadius: isDemo ? 5.5 : realNodeR,
        radiusUnits: "pixels",
        stroked: false,
        // anim.steps.length is load-bearing: toggling "Trace trên G_real" OFF
        // empties anim.steps while stepIdx/trace/theme all stay unchanged —
        // without it deck.gl kept the stale expanded/frontier fill colors
        // (audit finding L3-03; same bug class as the label layer below)
        updateTriggers: { getFillColor: [anim.stepIdx, anim.steps.length, trace, theme] },
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
      multi, anim, nodeColor, pulse, isDemo, showLabels, start, goal, stops,
      pickTarget, drawerTab, C, CONGESTION, theme, zoomBucket]);

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
        if (node.id === st.goal) {
          toast.error("Điểm Đi phải khác điểm Đến.");
          return;
        }
        // tour mode (đã có điểm giao) không cần Đến -> đừng auto-chuyển
        set({ start: node.id,
              pickTarget: st.goal || st.stops.length > 0 ? null : "goal" });
      } else if (target === "goal") {
        if (node.id === st.start) {
          toast.error("Điểm Đến phải khác điểm Đi.");
          return;
        }
        set({ goal: node.id, pickTarget: st.start ? null : "start" });
      } else {
        // đừng nuốt im lặng: đang gõ liên tục 9 điểm cho video, click không
        // ăn mà không nói gì thì người quay tưởng app đơ (review v11)
        if (node.id === st.start) {
          toast.info("Điểm Đi không thể đồng thời là điểm giao.");
          return;
        }
        if (st.stops.includes(node.id)) {
          toast.info("Điểm này đã có trong danh sách giao.");
          return;
        }
        if (st.stops.length >= 15) return;
        const next = [...st.stops, node.id];
        set({ stops: next, pickTarget: next.length >= 15 ? null : "stop" });
      }
    },
    [set],
  );

  if (!viewState) {
    return (
      <div ref={containerRef}
        className="flex h-full flex-col items-center justify-center gap-3 bg-surface text-ink-dim">
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
    <div ref={containerRef} className="relative h-full w-full bg-surface">
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as MapViewState)}
        controller
        layers={layers as never[]}
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
        <div className="absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-surface-border bg-surface-panel px-3 py-1.5 text-sm shadow-float">
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
            className="rounded border border-surface-border px-1.5 py-0.5 text-xs text-ink-dim transition-colors hover:text-ink"
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
