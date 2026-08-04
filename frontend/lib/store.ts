"use client";

// Central app state (zustand). One store: config -> data -> animation.
// Actions own all API calls and toast feedback (copy rules: DESIGN.md §7).

import { create } from "zustand";
import { toast } from "sonner";
import { chooseCompareAlgorithm } from "./algorithm-policy";
import { api, BackendError } from "./api";
import {
  graphViewChangePatch,
  isGraphResponseCurrent,
  isTrafficResponseCurrent,
  routeRunBlockReason,
  slotChangePatch,
} from "./interaction-policy";
import { createLatestRequestGuard } from "./latest-request";
import { describeAtspSavings } from "./atsp-savings";
import type {
  Algorithm, GraphLevel, GraphResponse, GraphView, Mode, MultirouteResponse,
  TimeSlot, Trace, TspMethod,
} from "./types";

export const ALGO_LABEL: Record<Algorithm, string> = {
  bfs: "BFS — tìm theo bề rộng",
  dfs: "DFS — tìm theo chiều sâu",
  iddfs: "IDDFS — đào sâu dần",
  ucs: "UCS — chi phí đồng nhất",
  dijkstra: "Dijkstra",
  astar: "A*",
  greedy: "Greedy Best-First",
  bidijkstra: "Dijkstra hai chiều",
  idastar: "IDA*",
  beam: "Beam Search",
};

export type DrawerTab = "metrics" | "explain" | "compare";
export type Theme = "dark" | "light";

const THEME_KEY = "traffic-theme";
const graphRequests = createLatestRequestGuard();
const trafficRequests = createLatestRequestGuard();

interface AppState {
  // ---- giao diện Sáng/Tối (DESIGN.md §1 — mặc định Tối)
  theme: Theme;
  initTheme: () => void;
  toggleTheme: () => void;

  // ---- cấu hình
  graph: GraphLevel;
  graphView: GraphView;
  slot: TimeSlot;
  mode: Mode;
  algorithm: Algorithm;
  start: string | null;
  goal: string | null;
  stops: string[];
  tspMethod: TspMethod; // sống trong store: Section thu gọn unmount con (v11)
  beamWidth: number | "";
  epsilon: number | "";
  offlineMode: boolean;
  trafficLayer: boolean;
  traceOnReal: boolean; // guardrail: G_real defaults to no trace
  pickTarget: "start" | "goal" | "stop" | null;

  // ---- dữ liệu
  graphData: GraphResponse | null;
  graphLoading: boolean;
  traffic: Record<string, number> | null;
  trace: Trace | null;
  running: boolean;
  compareAlgo: Algorithm;
  compare: Trace | null;
  comparing: boolean;
  multi: MultirouteResponse | null;
  multiRunning: boolean;

  // ---- animation & layout
  stepIdx: number;
  playing: boolean;
  speed: number; // multiplier: 0.5 | 1 | 2 | 4 | 8 | 16
  drawerOpen: boolean;
  drawerTab: DrawerTab;

  // ---- actions
  set: (patch: Partial<AppState>) => void;
  loadGraph: (level: GraphLevel, view?: GraphView) => Promise<void>;
  setGraphView: (view: GraphView) => void;
  loadTraffic: () => Promise<void>;
  clearMap: () => void;
  setSlot: (slot: TimeSlot) => void;
  runRoute: () => Promise<void>;
  runCompare: () => Promise<void>;
  runMulti: (method: TspMethod) => Promise<void>;
  setStep: (i: number) => void;
  togglePlay: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  theme: "dark",
  initTheme: () => {
    const saved = (typeof window !== "undefined"
      ? window.localStorage.getItem(THEME_KEY) : null) as Theme | null;
    const theme: Theme = saved === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  toggleTheme: () => {
    const theme: Theme = get().theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },

  graph: "demo",
  graphView: "full",
  slot: "07:30",
  mode: "balanced",
  algorithm: "astar",
  start: null,
  goal: null,
  stops: [],
  tspMethod: "held_karp",
  beamWidth: "",
  epsilon: "",
  offlineMode: false,
  trafficLayer: false,
  traceOnReal: false,
  pickTarget: null,

  graphData: null,
  graphLoading: false,
  traffic: null,
  trace: null,
  running: false,
  compareAlgo: "dijkstra",
  compare: null,
  comparing: false,
  multi: null,
  multiRunning: false,

  stepIdx: 0,
  playing: false,
  speed: 1,
  drawerOpen: true,
  drawerTab: "metrics",

  set: (patch) =>
    set((state) => {
      // stale-result invalidation (DESIGN v10f): every on-map result is a
      // function of the journey inputs. The moment start/goal/stops change
      // (any path: dropdown, map click, clear ✕, swap ⇅), kill the results
      // that depended on them so the map can never contradict the panel.
      // Re-applying the same semantic value is not a change: Radix controls
      // and map pickers may emit it again, and must not erase a valid result.
      const startChanged = "start" in patch && patch.start !== state.start;
      const goalChanged = "goal" in patch && patch.goal !== state.goal;
      const stopsChanged = "stops" in patch && (
        !Array.isArray(patch.stops)
        || patch.stops.length !== state.stops.length
        || patch.stops.some((id, i) => id !== state.stops[i])
      );
      if (!startChanged && !goalChanged && !stopsChanged)
        return patch;
      const extra: Partial<AppState> = {};
      if (state.trace && !("trace" in patch)) {
        extra.trace = null;
        extra.stepIdx = 0;
        extra.playing = false;
      }
      if (state.compare && !("compare" in patch)) extra.compare = null;
      if (state.multi && !("multi" in patch)) extra.multi = null;
      // v11: ADDING a delivery stop switches the journey to tour mode —
      // the ATSP tour is Đi + stops only, so a lingering "Đến" is dead
      // input that confuses the map (goal chip) and the run button.
      // Removing a stop never touches the goal.
      if (stopsChanged && Array.isArray(patch.stops) &&
          patch.stops.length > state.stops.length &&
          state.goal && !("goal" in patch)) {
        extra.goal = null;
        queueMicrotask(() => toast.info(
          "Đã bỏ điểm Đến — tối ưu nhiều điểm chỉ cần điểm Đi và các điểm giao."));
      }
      return { ...patch, ...extra };
    }),

  clearMap: () => {
    set({ trace: null, compare: null, multi: null, start: null, goal: null,
          stops: [], stepIdx: 0, playing: false, pickTarget: null });
    toast.success("Đã xoá kết quả và lựa chọn trên bản đồ.");
  },

  loadGraph: async (level, requestedView = get().graphView) => {
    const graphView = level === "real" ? "full" : requestedView;
    const requestToken = graphRequests.begin();
    set({
      graphLoading: true, graph: level, graphView, graphData: null, traffic: null,
      trace: null, compare: null, multi: null, start: null, goal: null,
      stops: [], stepIdx: 0, playing: false, pickTarget: null,
    });
    try {
      const g = await api.graph(level, graphView);
      const current = get();
      if (!isGraphResponseCurrent(
        level, graphView, g.view_meta?.base_graph, g.view_meta?.graph_view,
        current.graph, current.graphView, graphRequests.isCurrent(requestToken),
      )) {
        if (graphRequests.isCurrent(requestToken) && current.graph === level &&
            current.graphView === graphView) {
          throw new BackendError(
            "CONTRACT_ERROR",
            "Backend trả graph view khác cấu hình đã chọn.",
          );
        }
        return;
      }
      set({ graphData: g });
      await get().loadTraffic();
    } catch (e) {
      const current = get();
      if (!graphRequests.isCurrent(requestToken) || current.graph !== level ||
          current.graphView !== graphView) return;
      toast.error(e instanceof BackendError ? e.message : "Không tải được đồ thị.");
    } finally {
      if (graphRequests.isCurrent(requestToken)) set({ graphLoading: false });
    }
  },

  loadTraffic: async () => {
    const requestToken = trafficRequests.begin();
    const { slot, graph, graphView } = get();
    set({ traffic: null });
    try {
      const t = await api.traffic(slot, graph, graphView);
      const current = get();
      if (!isTrafficResponseCurrent(
        slot, graph, graphView, t.graph, t.graph_view,
        current.slot, current.graph, current.graphView,
        trafficRequests.isCurrent(requestToken),
      )) {
        if (trafficRequests.isCurrent(requestToken) && current.slot === slot &&
            current.graph === graph && current.graphView === graphView) {
          throw new BackendError(
            "CONTRACT_ERROR",
            "Backend trả lớp ùn tắc cho graph view khác cấu hình đã chọn.",
          );
        }
        return;
      }
      set({ traffic: t.congestion });
    } catch (e) {
      const current = get();
      if (!trafficRequests.isCurrent(requestToken) || current.slot !== slot ||
          current.graph !== graph || current.graphView !== graphView) return;
      toast.error(e instanceof BackendError ? e.message : "Không tải được lớp ùn tắc.");
    }
  },

  setSlot: (slot) => {
    const patch = slotChangePatch(get().slot, slot);
    if (!patch) return;
    set(patch);
    void get().loadTraffic();
  },

  setGraphView: (view) => {
    if (get().graph === "real" && view !== "full") return;
    const patch = graphViewChangePatch(get().graphView, view);
    if (!patch) return;
    const graph = get().graph;
    set(patch);
    void get().loadGraph(graph, view);
  },

  runRoute: async () => {
    const s = get();
    if (s.running || s.comparing || s.multiRunning) return; // one flight at a time (L3-04)
    const blockedReason = routeRunBlockReason(s.start, s.goal, s.stops);
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    // routeRunBlockReason already rejects this state; keep an explicit
    // narrowing guard so the request contract remains string-only.
    if (!s.start || !s.goal) return;
    set({ running: true, playing: false, multi: null, compare: null });
    try {
      const includeTrace = s.graph === "demo" ? true : s.traceOnReal;
      const params: { beam_width?: number; epsilon?: number } = {};
      if (s.algorithm === "beam" && s.beamWidth !== "") params.beam_width = Number(s.beamWidth);
      if (s.algorithm === "idastar" && s.epsilon !== "") params.epsilon = Number(s.epsilon);
      const scenario = s.graphView === "full" ? undefined : { graph_view: s.graphView };
      const t = await api.route({
        start: s.start, goal: s.goal, algorithm: s.algorithm, mode: s.mode,
        time_slot: s.slot, graph: s.graph, include_trace: includeTrace,
        params: Object.keys(params).length ? params : undefined,
        scenario,
      });
      // ANY input this result depends on switched mid-flight -> drop it:
      // the journey fields too, not just graph/slot — a response landing
      // after start/goal changed drew the OLD route under NEW chips (L3-04)
      const n = get();
      if (n.graph !== s.graph || n.graphView !== s.graphView || n.slot !== s.slot || n.mode !== s.mode ||
          n.algorithm !== s.algorithm || n.start !== s.start || n.goal !== s.goal)
        return;
      if (t.applied_scenario?.graph_view !== s.graphView) {
        toast.error("Backend không echo graph view đã chọn; đã bỏ kết quả tuyến.");
        return;
      }
      set({
        trace: t,
        stepIdx: Math.max(0, t.trace.length - 1),
        drawerTab: t.found ? "metrics" : "explain",
        ...(t.found ? {} : { drawerOpen: true }),
      });
      if (t.found) {
        toast.success(`Đã chạy ${ALGO_LABEL[s.algorithm]} — ${t.trace.length > 0
          ? `${t.trace.length} bước, ` : ""}${t.metrics.nodes_expanded} node expand.`);
      } else {
        toast.warning(`${ALGO_LABEL[s.algorithm]} không tìm thấy đường — xem tab Giải thích.`);
      }
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : "Chạy thuật toán thất bại.");
    } finally {
      set({ running: false });
    }
  },

  runCompare: async () => {
    const s = get();
    if (s.running || s.comparing || s.multiRunning) return; // L3-04
    if (!s.trace || !s.start || !s.goal) {
      toast.error("Hãy chạy thuật toán chính trước, rồi mới so sánh.");
      return;
    }
    const compareAlgo = chooseCompareAlgorithm(s.trace.algorithm, s.compareAlgo);
    set({ comparing: true, compareAlgo });
    try {
      // B chạy bằng ĐÚNG cấu hình của tuyến A (review v11 — UX MAJOR):
      // đổi Tiêu chí không xoá trace A (luật v10f), nên lấy s.mode hiện tại
      // từng làm B chạy mode khác A → bảng so sánh in mét như giây.
      const t = await api.route({
        start: s.start, goal: s.goal, algorithm: compareAlgo,
        mode: s.trace.mode, time_slot: s.trace.time_slot, graph: s.trace.graph,
        include_trace: false,
        scenario: s.graphView === "full" ? undefined : { graph_view: s.graphView },
      });
      // stale guards (L3-04): inputs unchanged AND the main trace this
      // comparison was made against must still be on screen (mode B đã
      // khoá theo trace nên không cần so mode hiện tại)
      const n = get();
      if (n.graph !== s.graph || n.graphView !== s.graphView || n.slot !== s.slot ||
          n.start !== s.start || n.goal !== s.goal ||
          n.compareAlgo !== compareAlgo || n.trace !== s.trace)
        return;
      if (!t.applied_scenario || !s.trace.applied_scenario ||
          t.applied_scenario.fingerprint !== s.trace.applied_scenario.fingerprint) {
        toast.error("Backend trả so sánh cho graph scenario khác; đã bỏ kết quả.");
        return;
      }
      set({ compare: t, drawerTab: "compare" });
      toast.success(`Đã so sánh với ${ALGO_LABEL[compareAlgo]}.`);
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : "So sánh thất bại.");
    } finally {
      set({ comparing: false });
    }
  },

  runMulti: async (method) => {
    const s = get();
    if (s.running || s.comparing || s.multiRunning) return; // L3-04
    if (!s.start || s.stops.length === 0) {
      toast.error("Cần điểm Đi và ít nhất 1 điểm giao để tối ưu thứ tự.");
      return;
    }
    set({ multiRunning: true, trace: null, compare: null, playing: false });
    try {
      const m = await api.multiroute({
        start: s.start, stops: s.stops, method, mode: s.mode,
        time_slot: s.slot, graph: s.graph, return_to_start: false,
        scenario: s.graphView === "full" ? undefined : { graph_view: s.graphView },
      });
      // stale guards (L3-04): journey edits mid-flight (map click adding a
      // stop was the reproduced case) invalidate this tour
      const n = get();
      if (n.graph !== s.graph || n.graphView !== s.graphView || n.slot !== s.slot || n.mode !== s.mode ||
          n.start !== s.start ||
          JSON.stringify(n.stops) !== JSON.stringify(s.stops))
        return;
      if (m.applied_scenario?.graph_view !== s.graphView) {
        toast.error("Backend không echo graph view đã chọn; đã bỏ kết quả nhiều điểm.");
        return;
      }
      set({ multi: m, drawerTab: "metrics" });
      if (m.found && m.savings_pct !== null) {
        const savings = describeAtspSavings(m.savings_pct);
        const pct = savings.absolutePct?.toFixed(1).replace(".", ",");
        if (savings.kind === "positive")
          toast.success(`Đã tối ưu thứ tự ${s.stops.length} điểm giao — tiết kiệm ${pct} %.`);
        else if (savings.kind === "negative")
          toast.warning(`Thứ tự mới tăng chi phí ${pct} % so với thứ tự nhập.`);
        else
          toast.info("Thứ tự mới không đổi tổng chi phí so với thứ tự nhập.");
      }
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : "Tối ưu thứ tự thất bại.");
    } finally {
      set({ multiRunning: false });
    }
  },

  setStep: (i) => {
    const n = get().trace?.trace.length ?? 0;
    set({ stepIdx: Math.max(0, Math.min(i, n - 1)) });
  },

  togglePlay: () => {
    const s = get();
    const n = s.trace?.trace.length ?? 0;
    if (n === 0) return;
    if (!s.playing && s.stepIdx >= n - 1) set({ stepIdx: 0, playing: true });
    else set({ playing: !s.playing });
  },
}));
