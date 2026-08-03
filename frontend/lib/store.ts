"use client";

// Central app state (zustand). One store: config -> data -> animation.
// Actions own all API calls and toast feedback (copy rules: DESIGN.md §7).

import { create } from "zustand";
import { toast } from "sonner";
import { chooseCompareAlgorithm } from "./algorithm-policy";
import { api, BackendError } from "./api";
import { createLatestRequestGuard } from "./latest-request";
import type {
  Algorithm, GraphFile, GraphLevel, Mode, MultirouteResponse, TimeSlot,
  Trace, TspMethod,
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

interface AppState {
  // ---- giao diện Sáng/Tối (DESIGN.md §1 — mặc định Tối)
  theme: Theme;
  initTheme: () => void;
  toggleTheme: () => void;

  // ---- cấu hình
  graph: GraphLevel;
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
  graphData: GraphFile | null;
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
  loadGraph: (level: GraphLevel) => Promise<void>;
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

  loadGraph: async (level) => {
    const requestToken = graphRequests.begin();
    set({
      graphLoading: true, graph: level, graphData: null, traffic: null,
      trace: null, compare: null, multi: null, start: null, goal: null,
      stops: [], stepIdx: 0, playing: false, pickTarget: null,
    });
    try {
      const g = await api.graph(level);
      if (!graphRequests.isCurrent(requestToken) || get().graph !== level) return;
      set({ graphData: g });
      await get().loadTraffic();
    } catch (e) {
      if (!graphRequests.isCurrent(requestToken) || get().graph !== level) return;
      toast.error(e instanceof BackendError ? e.message : "Không tải được đồ thị.");
    } finally {
      if (graphRequests.isCurrent(requestToken)) set({ graphLoading: false });
    }
  },

  loadTraffic: async () => {
    const { slot, graph } = get();
    try {
      const t = await api.traffic(slot, graph);
      // config changed while the request was in flight -> drop stale data
      if (get().slot !== slot || get().graph !== graph) return;
      set({ traffic: t.congestion });
    } catch (e) {
      toast.error(e instanceof BackendError ? e.message : "Không tải được lớp ùn tắc.");
    }
  },

  setSlot: (slot) => {
    set({ slot, trace: null, compare: null, multi: null, stepIdx: 0, playing: false });
    void get().loadTraffic();
  },

  runRoute: async () => {
    const s = get();
    if (s.running || s.comparing || s.multiRunning) return; // one flight at a time (L3-04)
    if (!s.start || !s.goal) {
      // tour mode: đừng đòi điểm Đến mà hint CTA vừa tuyên bố không cần
      toast.error(s.stops.length > 0
        ? "Đang ở chế độ nhiều điểm — dùng nút Tối ưu thứ tự, hoặc xoá các điểm giao để chạy tuyến 2 điểm."
        : "Hãy chọn cả điểm Đi và điểm Đến trước khi chạy.");
      return;
    }
    if (s.start === s.goal) {
      toast.error("Điểm Đi và điểm Đến đang trùng nhau — hãy chọn hai điểm khác nhau.");
      return;
    }
    set({ running: true, playing: false, multi: null, compare: null });
    try {
      const includeTrace = s.graph === "demo" ? true : s.traceOnReal;
      const params: { beam_width?: number; epsilon?: number } = {};
      if (s.algorithm === "beam" && s.beamWidth !== "") params.beam_width = Number(s.beamWidth);
      if (s.algorithm === "idastar" && s.epsilon !== "") params.epsilon = Number(s.epsilon);
      const t = await api.route({
        start: s.start, goal: s.goal, algorithm: s.algorithm, mode: s.mode,
        time_slot: s.slot, graph: s.graph, include_trace: includeTrace,
        params: Object.keys(params).length ? params : undefined,
      });
      // ANY input this result depends on switched mid-flight -> drop it:
      // the journey fields too, not just graph/slot — a response landing
      // after start/goal changed drew the OLD route under NEW chips (L3-04)
      const n = get();
      if (n.graph !== s.graph || n.slot !== s.slot || n.mode !== s.mode ||
          n.algorithm !== s.algorithm || n.start !== s.start || n.goal !== s.goal)
        return;
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
      });
      // stale guards (L3-04): inputs unchanged AND the main trace this
      // comparison was made against must still be on screen (mode B đã
      // khoá theo trace nên không cần so mode hiện tại)
      const n = get();
      if (n.graph !== s.graph || n.slot !== s.slot ||
          n.start !== s.start || n.goal !== s.goal ||
          n.compareAlgo !== compareAlgo || n.trace !== s.trace)
        return;
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
      });
      // stale guards (L3-04): journey edits mid-flight (map click adding a
      // stop was the reproduced case) invalidate this tour
      const n = get();
      if (n.graph !== s.graph || n.slot !== s.slot || n.mode !== s.mode ||
          n.start !== s.start ||
          JSON.stringify(n.stops) !== JSON.stringify(s.stops))
        return;
      set({ multi: m, drawerTab: "metrics" });
      if (m.found && m.savings_pct !== null) {
        toast.success(`Đã tối ưu thứ tự ${s.stops.length} điểm giao — tiết kiệm ${m.savings_pct
          .toFixed(1).replace(".", ",")} %.`);
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
