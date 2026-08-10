"use client";

// Central app state (zustand). One store: config -> data -> animation.
// Actions own all API calls and toast feedback (copy rules: DESIGN.md §7).

import { create } from "zustand";
import { toast } from "sonner";
import { ALGORITHM_ORDER } from "./algorithm-policy";
import { api, BackendError, RequestAbortedError } from "./api";
import {
  attachComparisonResult,
  cancelComparisonSession,
  createAtspResultEnvelope,
  createCompareSession,
  createRouteResultEnvelope,
  failComparisonRun,
  markComparisonRunRunning,
  retryComparisonRuns,
} from "./comparison-policy";
import {
  isExplanationOverlayValid,
  leaveExplanationTab,
  selectExplanationOverlay,
  selectExplanationSubject,
} from "./explanation-policy";
import {
  graphViewChangePatch,
  isGraphResponseCurrent,
  isTrafficResponseCurrent,
  routeTraceRequestFlag,
  routeRunBlockReason,
  slotChangePatch,
} from "./interaction-policy";
import { createLatestRequestGuard } from "./latest-request";
import {
  activeJourneyInputs,
  atspRunBlockReason,
  createRunSnapshot,
  DEFAULT_JOURNEY_STATE,
  transitionJourneyMode,
} from "./journey-mode-policy";
import {
  createRunLifecycle,
  isFatalContractError,
  multirouteRequestFromSnapshot,
  routeRequestFromSnapshot,
} from "./run-orchestrator";
import { describeAtspSavings } from "./atsp-savings";
import {
  activeTimelineLength, atspInputsChanged, type TimelineSource,
} from "./atsp-trace-policy";
import { buildScenario, scenarioKey } from "./scenario";
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  resolveStoredTheme,
  type Theme,
} from "./theme";
import {
  mergeSequentialRouteTraces,
  sequentialWaypoints,
  type SequentialRouteRun,
} from "./sequential-route";
import type {
  Algorithm, AtspResultEnvelope, CompareSession, EdgeOverride, ExplanationOverlay,
  ExplanationSubject, GraphLevel, GraphResponse, GraphView, JourneyDrafts, Mode,
  MultiStrategy, MultirouteResponse, OptimizationTrace, ProblemMode,
  RouteResultEnvelope, RunKind, RunSnapshot, TimeSlot, Trace, TspMethod,
} from "./types";

export const ALGO_LABEL: Record<Algorithm, string> = {
  bfs: "BFS",
  dfs: "DFS",
  iddfs: "IDDFS",
  ucs: "UCS",
  astar: "A*",
  greedy: "Greedy Best-First",
  bidijkstra: "Dijkstra hai chiều",
  idastar: "IDA*",
  beam: "Beam Search",
};

export type DrawerTab = "metrics" | "explain" | "compare" | "scenario";
export type { Theme } from "./theme";
const graphRequests = createLatestRequestGuard();
const trafficRequests = createLatestRequestGuard();
const runLifecycle = createRunLifecycle();

interface AppState {
  // ---- giao diện nhiều theme (DESIGN.md §1 — mặc định control room)
  theme: Theme;
  initTheme: () => void;
  setTheme: (theme: Theme) => void;

  // ---- cấu hình
  graph: GraphLevel;
  graphView: GraphView;
  slot: TimeSlot;
  mode: Mode;
  problemMode: ProblemMode;
  multiStrategy: MultiStrategy;
  runKind: RunKind;
  journeyDrafts: JourneyDrafts;
  returnToStart: boolean;
  algorithm: Algorithm;
  routeCompareAlgorithms: Algorithm[];
  // Transitional projections for Phase-1 components. `journeyDrafts` and the
  // explicit mode fields above are the business source of truth.
  start: string | null;
  goal: string | null;
  stops: string[];
  tspMethod: TspMethod; // sống trong store: Section thu gọn unmount con (v11)
  beamWidth: number | "";
  epsilon: number | "";
  offlineMode: boolean;
  trafficLayer: boolean;
  traceOnReal: boolean; // kept for store compatibility; route trace is always enabled
  includeOptimizationTrace: boolean; // opt-in; affects the next ATSP run only
  pickTarget: "start" | "goal" | "stop" | null;
  edgeOverrides: Record<string, EdgeOverride>;
  edgeEditMode: boolean;
  selectedEdgeId: string | null;

  // ---- dữ liệu
  graphData: GraphResponse | null;
  graphLoading: boolean;
  traffic: Record<string, number> | null;
  trace: Trace | null;
  sequentialRoute: SequentialRouteRun | null;
  routeProgress: { current: number; total: number } | null;
  comparisonProgress: {
    currentItem: number;
    totalItems: number;
    currentLeg: number;
    totalLegs: number;
  } | null;
  running: boolean;
  comparing: boolean;
  multi: MultirouteResponse | null;
  multiRunning: boolean;
  optimizationTrace: OptimizationTrace | null;
  runId: number;
  activeSnapshot: RunSnapshot | null;
  singleRouteResult: RouteResultEnvelope | null;
  singleAtspResult: AtspResultEnvelope | null;
  routeComparisonSession: CompareSession<RouteResultEnvelope> | null;
  atspComparisonSession: CompareSession<AtspResultEnvelope> | null;
  explanationSubject: ExplanationSubject;
  explanationOverlay: ExplanationOverlay;
  explanationOverlayVisible: boolean;

  // ---- animation & layout
  stepIdx: number;
  playing: boolean;
  speed: number; // multiplier: 0.5 | 1 | 2 | 4 | 8 | 16
  timelineSource: TimelineSource;
  drawerOpen: boolean;
  drawerTab: DrawerTab;

  // ---- actions
  set: (patch: Partial<AppState>) => void;
  loadGraph: (level: GraphLevel, view?: GraphView) => Promise<void>;
  setGraphView: (view: GraphView) => void;
  setEdgeEditMode: (enabled: boolean) => void;
  selectEdge: (edgeId: string) => void;
  setEdgeOverride: (edgeId: string, override: EdgeOverride | undefined) => void;
  resetAllEdgeOverrides: () => void;
  loadTraffic: () => Promise<void>;
  clearMap: () => void;
  setSlot: (slot: TimeSlot) => void;
  runRoute: () => Promise<void>;
  runRouteComparison: (algorithms: readonly Algorithm[]) => Promise<void>;
  setRouteCompareAlgorithms: (algorithms: readonly Algorithm[]) => void;
  retryRouteComparisonRun: (algorithm: Algorithm) => Promise<void>;
  runMulti: (method: TspMethod) => Promise<void>;
  runAtspComparison: (methods: readonly TspMethod[]) => Promise<void>;
  setProblemMode: (mode: ProblemMode) => void;
  setMultiStrategy: (strategy: MultiStrategy) => void;
  setRunKind: (kind: RunKind) => void;
  setReturnToStart: (enabled: boolean) => void;
  setExplanationSubject: (subject: ExplanationSubject) => void;
  setExplanationOverlay: (overlay: ExplanationOverlay) => void;
  leaveExplanation: () => void;
  cancelActiveRun: () => void;
  setStep: (i: number) => void;
  togglePlay: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  theme: DEFAULT_THEME,
  initTheme: () => {
    const saved = typeof window !== "undefined"
      ? window.localStorage.getItem(THEME_STORAGE_KEY) : null;
    const theme = resolveStoredTheme(saved);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    set({ theme });
  },

  graph: "demo",
  graphView: "full",
  slot: "07:30",
  mode: "balanced",
  problemMode: DEFAULT_JOURNEY_STATE.problemMode,
  multiStrategy: DEFAULT_JOURNEY_STATE.multiStrategy,
  runKind: DEFAULT_JOURNEY_STATE.runKind,
  journeyDrafts: { ...DEFAULT_JOURNEY_STATE.drafts },
  returnToStart: false,
  algorithm: "astar",
  routeCompareAlgorithms: ["astar", "ucs"],
  start: null,
  goal: null,
  stops: [],
  tspMethod: "held_karp",
  beamWidth: "",
  epsilon: "",
  offlineMode: false,
  trafficLayer: false,
  traceOnReal: true,
  includeOptimizationTrace: false,
  pickTarget: null,
  edgeOverrides: {},
  edgeEditMode: false,
  selectedEdgeId: null,

  graphData: null,
  graphLoading: false,
  traffic: null,
  trace: null,
  sequentialRoute: null,
  routeProgress: null,
  comparisonProgress: null,
  running: false,
  comparing: false,
  multi: null,
  multiRunning: false,
  optimizationTrace: null,
  runId: 0,
  activeSnapshot: null,
  singleRouteResult: null,
  singleAtspResult: null,
  routeComparisonSession: null,
  atspComparisonSession: null,
  explanationSubject: null,
  explanationOverlay: null,
  explanationOverlayVisible: false,

  stepIdx: 0,
  playing: false,
  speed: 1,
  timelineSource: null,
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
      const overridesChanged = "edgeOverrides" in patch
        && scenarioKey(state.graphView, patch.edgeOverrides ?? {})
          !== scenarioKey(state.graphView, state.edgeOverrides);
      const activeGoalChanged = goalChanged && state.problemMode === "two_point";
      const activeStopsChanged = stopsChanged && state.problemMode === "multi_point";
      const routeAlgorithmActive = state.problemMode === "two_point"
        || state.multiStrategy === "ordered_search";
      const routeInputChanged = startChanged || activeGoalChanged || activeStopsChanged
        || ("mode" in patch && patch.mode !== state.mode)
        || ("slot" in patch && patch.slot !== state.slot)
        || ("graph" in patch && patch.graph !== state.graph)
        || ("graphView" in patch && patch.graphView !== state.graphView)
        || (routeAlgorithmActive && "algorithm" in patch && patch.algorithm !== state.algorithm)
        || (routeAlgorithmActive && "beamWidth" in patch && patch.beamWidth !== state.beamWidth)
        || (routeAlgorithmActive && "epsilon" in patch && patch.epsilon !== state.epsilon)
        || overridesChanged;
      const optimizerInputChanged = state.problemMode === "multi_point"
        && state.multiStrategy === "atsp"
        && (atspInputsChanged(state, patch) || overridesChanged);
      const problemModeChanged = "problemMode" in patch
        && patch.problemMode !== state.problemMode;
      const runKindChanged = "runKind" in patch && patch.runKind !== state.runKind;
      const multiStrategyChanged = "multiStrategy" in patch
        && patch.multiStrategy !== state.multiStrategy;
      const returnChanged = "returnToStart" in patch
        && patch.returnToStart !== state.returnToStart;
      const explicitModeChanged = problemModeChanged || runKindChanged
        || (state.problemMode === "multi_point" && (multiStrategyChanged || returnChanged));
      const journeyDrafts: JourneyDrafts = {
        ...(patch.journeyDrafts ?? state.journeyDrafts),
        ...(startChanged ? { start: patch.start ?? null } : {}),
        ...(goalChanged ? { twoPointGoal: patch.goal ?? null } : {}),
        ...(stopsChanged && Array.isArray(patch.stops) ? { multiStops: [...patch.stops] } : {}),
        ...("returnToStart" in patch ? { returnToStart: patch.returnToStart ?? false } : {}),
      };
      const journeyDraftChanged = JSON.stringify(journeyDrafts)
        !== JSON.stringify(state.journeyDrafts);
      if (!routeInputChanged && !optimizerInputChanged && !explicitModeChanged
          && !journeyDraftChanged)
        return patch;
      const extra: Partial<AppState> = {};
      if (journeyDraftChanged) extra.journeyDrafts = journeyDrafts;
      if (routeInputChanged && state.trace && !("trace" in patch)) {
        extra.trace = null;
        extra.stepIdx = 0;
        extra.playing = false;
        if (state.timelineSource === "route" && !("timelineSource" in patch))
          extra.timelineSource = null;
      }
      if (routeInputChanged && state.sequentialRoute && !("sequentialRoute" in patch))
        extra.sequentialRoute = null;
      if (optimizerInputChanged && state.multi && !("multi" in patch)) extra.multi = null;
      if (optimizerInputChanged && state.optimizationTrace && !("optimizationTrace" in patch)) {
        extra.optimizationTrace = null;
        extra.stepIdx = 0;
        extra.playing = false;
        if (state.timelineSource === "optimization" && !("timelineSource" in patch))
          extra.timelineSource = null;
      }
      if (routeInputChanged || optimizerInputChanged || explicitModeChanged) {
        const nextRunId = runLifecycle.invalidate();
        extra.runId = nextRunId;
        extra.activeSnapshot = null;
        extra.singleRouteResult = null;
        extra.singleAtspResult = null;
        extra.routeComparisonSession = null;
        extra.atspComparisonSession = null;
        extra.explanationSubject = null;
        extra.explanationOverlay = null;
        extra.explanationOverlayVisible = false;
        extra.comparing = false;
        extra.comparisonProgress = null;
        extra.multiRunning = false;
        extra.running = false;
        if (!("trace" in patch)) extra.trace = null;
        if (!("sequentialRoute" in patch)) extra.sequentialRoute = null;
        if (!("multi" in patch)) extra.multi = null;
        if (!("optimizationTrace" in patch)) extra.optimizationTrace = null;
        if (!("timelineSource" in patch)) extra.timelineSource = null;
        if (!("stepIdx" in patch)) extra.stepIdx = 0;
        if (!("playing" in patch)) extra.playing = false;
      }
      return { ...patch, ...extra };
    }),

  setProblemMode: (mode) => {
    const state = get();
    const transition = transitionJourneyMode({
      problemMode: state.problemMode,
      multiStrategy: state.multiStrategy,
      runKind: state.runKind,
      drafts: state.journeyDrafts,
    }, { type: "problem_mode", value: mode });
    get().set({ problemMode: transition.state.problemMode });
  },

  setMultiStrategy: (strategy) => {
    const state = get();
    const transition = transitionJourneyMode({
      problemMode: state.problemMode,
      multiStrategy: state.multiStrategy,
      runKind: state.runKind,
      drafts: state.journeyDrafts,
    }, { type: "multi_strategy", value: strategy });
    get().set({ multiStrategy: transition.state.multiStrategy });
  },

  setRunKind: (kind) => {
    const state = get();
    const transition = transitionJourneyMode({
      problemMode: state.problemMode,
      multiStrategy: state.multiStrategy,
      runKind: state.runKind,
      drafts: state.journeyDrafts,
    }, { type: "run_kind", value: kind });
    const routeCompareAlgorithms = kind === "compare"
      ? [
          state.algorithm,
          ...state.routeCompareAlgorithms.filter((algorithm) => algorithm !== state.algorithm),
          ...ALGORITHM_ORDER.filter((algorithm) => (
            algorithm !== state.algorithm && !state.routeCompareAlgorithms.includes(algorithm)
          )),
        ].slice(0, Math.max(2, state.routeCompareAlgorithms.length)) as Algorithm[]
      : state.routeCompareAlgorithms;
    get().set({
      runKind: transition.state.runKind,
      routeCompareAlgorithms,
      drawerOpen: true,
      drawerTab: kind === "compare" ? "compare" : "metrics",
      ...(kind === "compare" ? { edgeEditMode: false, selectedEdgeId: null } : {}),
    });
  },

  setRouteCompareAlgorithms: (algorithms) => {
    const state = get();
    if (state.running || state.comparing || state.multiRunning) return;
    const normalized = [...new Set(algorithms)].filter((algorithm): algorithm is Algorithm =>
      ALGORITHM_ORDER.includes(algorithm as Algorithm),
    );
    if (normalized.length < 2 || normalized.length > 4) {
      toast.error("Hãy giữ từ 2 đến 4 thuật toán để so sánh.");
      return;
    }
    if (normalized.length === state.routeCompareAlgorithms.length
        && normalized.every((algorithm, index) => algorithm === state.routeCompareAlgorithms[index]))
      return;
    const runId = runLifecycle.invalidate();
    set({
      routeCompareAlgorithms: normalized,
      routeComparisonSession: null,
      activeSnapshot: null,
      explanationSubject: null,
      explanationOverlay: null,
      explanationOverlayVisible: false,
      comparisonProgress: null,
      comparing: false,
      trace: null,
      sequentialRoute: null,
      timelineSource: null,
      stepIdx: 0,
      playing: false,
      runId,
    });
  },

  setReturnToStart: (enabled) => get().set({ returnToStart: enabled }),

  setExplanationSubject: (subject) => {
    const state = get();
    const next = selectExplanationSubject({
      subject: state.explanationSubject,
      overlay: state.explanationOverlay,
      overlayVisible: state.explanationOverlayVisible,
    }, subject);
    set({
      explanationSubject: next.subject,
      explanationOverlay: next.overlay,
      explanationOverlayVisible: next.overlayVisible,
    });
  },

  setExplanationOverlay: (overlay) => {
    const state = get();
    if (overlay) {
      const candidates = [
        state.singleRouteResult,
        state.singleAtspResult,
        ...(state.routeComparisonSession?.runs.map((run) => run.result) ?? []),
        ...(state.atspComparisonSession?.runs.map((run) => run.result) ?? []),
      ].filter((result): result is RouteResultEnvelope | AtspResultEnvelope => result !== null);
      const owner = candidates.find((result) => result.id === overlay.resultId);
      if (!owner || !isExplanationOverlayValid(owner, overlay)) {
        set({ explanationOverlay: null, explanationOverlayVisible: false });
        return;
      }
    }
    const next = selectExplanationOverlay({
      subject: state.explanationSubject,
      overlay: state.explanationOverlay,
      overlayVisible: state.explanationOverlayVisible,
    }, overlay);
    set({ explanationOverlay: next.overlay, explanationOverlayVisible: next.overlayVisible });
  },

  leaveExplanation: () => {
    const state = get();
    const next = leaveExplanationTab({
      subject: state.explanationSubject,
      overlay: state.explanationOverlay,
      overlayVisible: state.explanationOverlayVisible,
    });
    set({ explanationOverlayVisible: next.overlayVisible });
  },

  cancelActiveRun: () => {
    const state = get();
    const runId = runLifecycle.cancel();
    set({
      runId,
      running: false,
      comparing: false,
      multiRunning: false,
      routeProgress: null,
      comparisonProgress: null,
      routeComparisonSession: state.routeComparisonSession
        ? cancelComparisonSession(state.routeComparisonSession, Date.now()) : null,
      atspComparisonSession: state.atspComparisonSession
        ? cancelComparisonSession(state.atspComparisonSession, Date.now()) : null,
      explanationSubject: null,
      explanationOverlay: null,
      explanationOverlayVisible: false,
    });
  },

  clearMap: () => {
    const runId = runLifecycle.invalidate();
    set({ trace: null, sequentialRoute: null, routeProgress: null,
          multi: null, start: null, goal: null,
          stops: [], optimizationTrace: null, timelineSource: null,
          journeyDrafts: {
            ...get().journeyDrafts,
            start: null, twoPointGoal: null, multiStops: [], returnToStart: false,
          },
          returnToStart: false, activeSnapshot: null,
          comparisonProgress: null,
          singleRouteResult: null, singleAtspResult: null,
          routeComparisonSession: null, atspComparisonSession: null,
          explanationSubject: null, explanationOverlay: null,
          explanationOverlayVisible: false, runId,
          stepIdx: 0, playing: false, pickTarget: null });
    toast.success("Đã xoá kết quả và lựa chọn trên bản đồ.");
  },

  loadGraph: async (level, requestedView = get().graphView) => {
    const graphView = level === "real" ? "full" : requestedView;
    const requestToken = graphRequests.begin();
    const runId = runLifecycle.invalidate();
    set({
      graphLoading: true, graph: level, graphView, graphData: null, traffic: null,
      trace: null, sequentialRoute: null, routeProgress: null,
      multi: null, optimizationTrace: null, timelineSource: null,
      start: null, goal: null,
      stops: [], stepIdx: 0, playing: false, pickTarget: null,
      journeyDrafts: {
        ...get().journeyDrafts,
        start: null, twoPointGoal: null, multiStops: [], returnToStart: false,
      },
      returnToStart: false, activeSnapshot: null,
      comparisonProgress: null,
      singleRouteResult: null, singleAtspResult: null,
      routeComparisonSession: null, atspComparisonSession: null,
      explanationSubject: null, explanationOverlay: null,
      explanationOverlayVisible: false, runId,
      edgeOverrides: {}, edgeEditMode: false, selectedEdgeId: null,
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
    get().set({ ...patch, optimizationTrace: null, timelineSource: null });
    void get().loadTraffic();
  },

  setGraphView: (view) => {
    if (get().graph === "real" && view !== "full") return;
    const patch = graphViewChangePatch(get().graphView, view);
    if (!patch) return;
    const graph = get().graph;
    get().set({ ...patch, optimizationTrace: null, timelineSource: null });
    void get().loadGraph(graph, view);
  },

  setEdgeEditMode: (enabled) => {
    const state = get();
    if (enabled && state.runKind === "compare") return;
    if (state.running || state.comparing || state.multiRunning || state.edgeEditMode === enabled)
      return;
    set({
      edgeEditMode: enabled,
      ...(enabled ? { pickTarget: null, drawerOpen: true, drawerTab: "scenario" as DrawerTab } : {}),
      ...(!enabled ? { selectedEdgeId: null } : {}),
    });
  },

  selectEdge: (edgeId) => {
    const state = get();
    if (!state.edgeEditMode || !state.graphData?.edges.some((edge) => edge.id === edgeId)) return;
    // Selecting an edge finishes the one-shot picking gesture. Keep the edge
    // itself selected for editing, but remove the broad pick layer so a later
    // map click cannot accidentally replace it.
    set({ selectedEdgeId: edgeId, edgeEditMode: false, drawerOpen: true, drawerTab: "scenario" });
  },

  setEdgeOverride: (edgeId, override) => {
    const state = get();
    if (state.runKind === "compare") return;
    const next = { ...state.edgeOverrides };
    if (override) next[edgeId] = override;
    else delete next[edgeId];
    if (scenarioKey(state.graphView, next) === scenarioKey(state.graphView, state.edgeOverrides))
      return;
    // Go through the public setter: a scenario change invalidates every
    // route/compare/tour result that was computed with the previous scenario.
    get().set({ edgeOverrides: next });
  },

  resetAllEdgeOverrides: () => {
    if (get().runKind === "compare") return;
    if (Object.keys(get().edgeOverrides).length === 0) return;
    get().set({ edgeOverrides: {} });
  },

  runRoute: async () => {
    let s = get();
    if (s.running || s.comparing || s.multiRunning) return; // one flight at a time (L3-04)
    if (s.runKind !== "single"
        || (s.problemMode === "multi_point" && s.multiStrategy !== "ordered_search")) {
      get().set({
        runKind: "single",
        ...(s.problemMode === "multi_point" ? { multiStrategy: "ordered_search" as const } : {}),
      });
      s = get();
    }
    const active = activeJourneyInputs({
      problemMode: s.problemMode,
      multiStrategy: s.multiStrategy,
      runKind: "single",
      drafts: s.journeyDrafts,
    });
    const blockedReason = routeRunBlockReason(
      s.problemMode, active.start, active.goal, active.stops,
    );
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    if (!active.start || (s.problemMode === "two_point" && !active.goal)) return;
    const routeParamsByAlgorithm = {
      ...(s.algorithm === "beam" && s.beamWidth !== ""
        ? { beam: { beam_width: Number(s.beamWidth) } } : {}),
      ...(s.algorithm === "idastar" && s.epsilon !== ""
        ? { idastar: { epsilon: Number(s.epsilon) } } : {}),
    };
    const snapshot = createRunSnapshot({
      graph: s.graph,
      graphView: s.graphView,
      slot: s.slot,
      mode: s.mode,
      scenario: buildScenario(s.graphView, s.edgeOverrides),
      problemMode: s.problemMode,
      multiStrategy: s.problemMode === "multi_point" ? "ordered_search" : s.multiStrategy,
      runKind: "single",
      drafts: s.journeyDrafts,
      algorithms: [s.algorithm],
      routeParamsByAlgorithm,
      methods: [],
      includeRouteTrace: routeTraceRequestFlag(s.graph),
      includeOptimizationTrace: false,
    });
    if (!snapshot.start) return;
    const waypoints = sequentialWaypoints(
      snapshot.problemMode, snapshot.start, snapshot.goal, snapshot.stops,
      snapshot.returnToStart,
    );
    const totalLegs = waypoints.length - 1;
    const handle = runLifecycle.begin();
    const resultId = `route-${handle.runId}`;
    set({
      runId: handle.runId,
      activeSnapshot: snapshot,
      running: true, routeProgress: { current: 1, total: totalLegs },
      comparisonProgress: null,
      trace: null, sequentialRoute: null, playing: false, multi: null,
      singleRouteResult: null, singleAtspResult: null,
      routeComparisonSession: null, atspComparisonSession: null,
      explanationSubject: null, explanationOverlay: null,
      explanationOverlayVisible: false,
      optimizationTrace: null, timelineSource: null, stepIdx: 0,
    });
    try {
      const traces: Trace[] = [];
      let authoritativeFingerprint: string | null = null;
      let authoritativeCapability: "v1" | "v2" | null = null;
      for (let index = 0; index < totalLegs; index += 1) {
        set({ routeProgress: { current: index + 1, total: totalLegs } });
        const request = routeRequestFromSnapshot(
          snapshot, s.algorithm, waypoints[index], waypoints[index + 1],
        );
        const t = await api.route(request, { signal: handle.signal });
        if (!runLifecycle.isCurrent(handle.runId)) return;
        if (!t.applied_scenario || t.applied_scenario.graph_view !== snapshot.graphView)
          throw new BackendError(
            "CONTRACT_ERROR",
            "Backend không echo graph view đã chọn; đã bỏ kết quả tuyến.",
          );
        const capability = t.contract_version === 2 ? "v2" : "v1";
        if (authoritativeFingerprint === null) {
          authoritativeFingerprint = t.applied_scenario.fingerprint;
          authoritativeCapability = capability;
        } else if (authoritativeFingerprint !== t.applied_scenario.fingerprint
            || authoritativeCapability !== capability) {
          throw new BackendError(
            "CONTRACT_ERROR",
            "Fingerprint/capability đổi giữa các chặng; đã bỏ toàn bộ hành trình.",
          );
        }
        traces.push(t);
        if (!t.found) break;
      }

      const nameOf = (id: string) =>
        s.graphData?.nodes.find((node) => node.id === id)?.name ?? id;
      const merged = snapshot.problemMode === "multi_point"
        ? mergeSequentialRouteTraces(
          waypoints, traces, nameOf, ALGO_LABEL[s.algorithm],
        )
        : { trace: traces[0], run: null };
      const t = merged.trace;
      if (!t || authoritativeFingerprint === null || authoritativeCapability === null)
        throw new BackendError("CONTRACT_ERROR", "Backend không trả kết quả tuyến hợp lệ.");
      const envelope = createRouteResultEnvelope(
        resultId, handle.runId, snapshot, t, traces,
      );
      if (envelope.capability !== authoritativeCapability
          || envelope.scenarioFingerprint !== authoritativeFingerprint)
        throw new BackendError("CONTRACT_ERROR", "Route envelope authority không khớp source legs.");
      if (!runLifecycle.isCurrent(handle.runId)) return;
      set({
        trace: t,
        sequentialRoute: merged.run,
        singleRouteResult: envelope,
        explanationSubject: { kind: "single_route", runId: resultId },
        explanationOverlay: null,
        explanationOverlayVisible: false,
        stepIdx: Math.max(0, t.trace.length - 1),
        timelineSource: t.trace.length > 0 ? "route" : null,
        optimizationTrace: null,
        drawerTab: t.found ? "metrics" : "explain",
        ...(t.found ? {} : { drawerOpen: true }),
      });
      if (t.found) {
        const legCopy = snapshot.problemMode === "multi_point" ? `${totalLegs} chặng, ` : "";
        toast.success(`Đã chạy ${ALGO_LABEL[s.algorithm]} — ${legCopy}${t.trace.length > 0
          ? `${t.trace.length} bước, ` : ""}${t.metrics.nodes_expanded} node expand.`);
      } else {
        toast.warning(`${ALGO_LABEL[s.algorithm]} không tìm thấy đường — xem tab Giải thích.`);
      }
    } catch (e) {
      if (e instanceof RequestAbortedError || !runLifecycle.isCurrent(handle.runId)) return;
      toast.error(e instanceof Error ? e.message : "Chạy thuật toán thất bại.");
    } finally {
      if (runLifecycle.isCurrent(handle.runId)) set({ running: false, routeProgress: null });
    }
  },

  runRouteComparison: async (algorithms) => {
    let s = get();
    if (s.running || s.comparing || s.multiRunning) return;
    if (s.problemMode === "multi_point" && s.multiStrategy !== "ordered_search")
      get().setMultiStrategy("ordered_search");
    if (get().runKind !== "compare") get().setRunKind("compare");
    s = get();
    const active = activeJourneyInputs({
      problemMode: s.problemMode,
      multiStrategy: s.multiStrategy,
      runKind: "compare",
      drafts: s.journeyDrafts,
    });
    const blockedReason = routeRunBlockReason(
      s.problemMode, active.start, active.goal, active.stops,
    );
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    if (!active.start || (s.problemMode === "two_point" && !active.goal)) return;
    const routeParamsByAlgorithm = {
      ...(algorithms.includes("beam") ? {
        beam: { beam_width: s.beamWidth === "" ? undefined : Number(s.beamWidth) },
      } : {}),
      ...(algorithms.includes("idastar") ? {
        idastar: { epsilon: s.epsilon === "" ? undefined : Number(s.epsilon) },
      } : {}),
    };
    const snapshot = createRunSnapshot({
      graph: s.graph,
      graphView: s.graphView,
      slot: s.slot,
      mode: s.mode,
      scenario: buildScenario(s.graphView, s.edgeOverrides),
      problemMode: s.problemMode,
      multiStrategy: "ordered_search",
      runKind: "compare",
      drafts: s.journeyDrafts,
      algorithms,
      routeParamsByAlgorithm,
      methods: [],
      includeRouteTrace: false,
      includeOptimizationTrace: false,
    });
    if (!snapshot.start) return;
    const waypoints = sequentialWaypoints(
      snapshot.problemMode, snapshot.start, snapshot.goal, snapshot.stops,
      snapshot.returnToStart,
    );
    const handle = runLifecycle.begin();
    const sessionId = `route-compare-${handle.runId}`;
    let session: CompareSession<RouteResultEnvelope>;
    try {
      session = createCompareSession("route", snapshot, algorithms, {
        id: sessionId,
        startedAt: Date.now(),
      }) as CompareSession<RouteResultEnvelope>;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cấu hình comparison không hợp lệ.");
      return;
    }
    set({
      runId: handle.runId,
      activeSnapshot: snapshot,
      routeCompareAlgorithms: [...algorithms],
      comparing: true,
      comparisonProgress: {
        currentItem: 1, totalItems: algorithms.length,
        currentLeg: 0, totalLegs: waypoints.length - 1,
      },
      routeComparisonSession: session,
      atspComparisonSession: null,
      explanationSubject: null,
      explanationOverlay: null,
      explanationOverlayVisible: false,
    });
    for (let algorithmIndex = 0; algorithmIndex < algorithms.length; algorithmIndex += 1) {
      const algorithm = algorithms[algorithmIndex];
      if (!runLifecycle.isCurrent(handle.runId)) return;
      session = markComparisonRunRunning(session, algorithm);
      set({
        routeComparisonSession: session,
        comparisonProgress: {
          currentItem: algorithmIndex + 1, totalItems: algorithms.length,
          currentLeg: 1, totalLegs: waypoints.length - 1,
        },
      });
      try {
        const traces: Trace[] = [];
        let fingerprint: string | null = null;
        let capability: "v1" | "v2" | null = null;
        for (let legIndex = 0; legIndex < waypoints.length - 1; legIndex += 1) {
          set({ comparisonProgress: {
            currentItem: algorithmIndex + 1, totalItems: algorithms.length,
            currentLeg: legIndex + 1, totalLegs: waypoints.length - 1,
          } });
          const leg = await api.route(routeRequestFromSnapshot(
            snapshot, algorithm, waypoints[legIndex], waypoints[legIndex + 1],
          ), { signal: handle.signal });
          if (!runLifecycle.isCurrent(handle.runId)) return;
          const legFingerprint = leg.applied_scenario?.fingerprint;
          if (!legFingerprint)
            throw new BackendError("CONTRACT_ERROR", "Comparison response thiếu server fingerprint.");
          const legCapability = leg.contract_version === 2 ? "v2" : "v1";
          if (fingerprint === null) {
            fingerprint = legFingerprint;
            capability = legCapability;
          } else if (fingerprint !== legFingerprint || capability !== legCapability) {
            throw new BackendError(
              "CONTRACT_ERROR", "Fingerprint/capability đổi giữa các chặng comparison.",
            );
          }
          traces.push(leg);
          if (!leg.found) break;
        }
        if (fingerprint === null || capability === null)
          throw new BackendError("CONTRACT_ERROR", "Comparison không có response leg hợp lệ.");
        const merged = snapshot.problemMode === "multi_point"
          ? mergeSequentialRouteTraces(
            waypoints, traces,
            (id) => s.graphData?.nodes.find((node) => node.id === id)?.name ?? id,
            ALGO_LABEL[algorithm],
          )
          : { trace: traces[0], run: null };
        const response = merged.trace;
        const envelope = createRouteResultEnvelope(
          algorithm, handle.runId, snapshot, response, traces,
        );
        if (envelope.capability !== capability
            || envelope.scenarioFingerprint !== fingerprint)
          throw new BackendError(
            "CONTRACT_ERROR", "Comparison envelope authority không khớp source legs.",
          );
        const attached = attachComparisonResult(session, envelope, Date.now());
        session = attached.session;
        set({ routeComparisonSession: session });
        if (!attached.accepted) {
          runLifecycle.cancel();
          set({ runId: runLifecycle.currentRunId(), comparing: false, comparisonProgress: null });
          toast.error(attached.contractError ?? "Comparison contract error.");
          return;
        }
      } catch (error) {
        if (error instanceof RequestAbortedError || !runLifecycle.isCurrent(handle.runId)) return;
        session = failComparisonRun(
          session, algorithm,
          error instanceof Error ? error.message : "Comparison item thất bại.",
          Date.now(),
        );
        if (isFatalContractError(error)) {
          session = cancelComparisonSession(session, Date.now());
          const nextRunId = runLifecycle.cancel();
          set({
            runId: nextRunId,
            routeComparisonSession: session,
            comparing: false,
            comparisonProgress: null,
          });
          toast.error(error.message);
          return;
        }
        set({ routeComparisonSession: session });
      }
    }
    if (runLifecycle.isCurrent(handle.runId)) {
      set({
        comparing: false,
        comparisonProgress: null,
        drawerOpen: true,
        drawerTab: "compare",
      });
      toast.success(`Đã hoàn tất ${algorithms.length} thuật toán theo cùng snapshot.`);
    }
  },

  retryRouteComparisonRun: async (algorithm) => {
    const state = get();
    const existing = state.routeComparisonSession;
    const run = existing?.runs.find((candidate) => candidate.id === algorithm);
    if (!existing || existing.kind !== "route" || state.running || state.comparing
        || state.multiRunning || !run || !["error", "cancelled"].includes(run.status))
      return;

    const snapshot = existing.snapshot;
    if (!snapshot.start) return;
    const waypoints = sequentialWaypoints(
      snapshot.problemMode,
      snapshot.start,
      snapshot.goal,
      snapshot.stops,
      snapshot.returnToStart,
    );
    const handle = runLifecycle.begin();
    let session = retryComparisonRuns(existing, [algorithm]) as CompareSession<RouteResultEnvelope>;
    session = markComparisonRunRunning(session, algorithm);
    const itemIndex = Math.max(0, session.selectedIds.indexOf(algorithm));
    set({
      runId: handle.runId,
      activeSnapshot: snapshot,
      comparing: true,
      routeComparisonSession: session,
      comparisonProgress: {
        currentItem: itemIndex + 1,
        totalItems: session.selectedIds.length,
        currentLeg: 1,
        totalLegs: waypoints.length - 1,
      },
    });

    try {
      const traces: Trace[] = [];
      for (let legIndex = 0; legIndex < waypoints.length - 1; legIndex += 1) {
        set({ comparisonProgress: {
          currentItem: itemIndex + 1,
          totalItems: session.selectedIds.length,
          currentLeg: legIndex + 1,
          totalLegs: waypoints.length - 1,
        } });
        const leg = await api.route(routeRequestFromSnapshot(
          snapshot,
          algorithm,
          waypoints[legIndex],
          waypoints[legIndex + 1],
        ), { signal: handle.signal });
        if (!runLifecycle.isCurrent(handle.runId)) return;
        traces.push(leg);
        if (!leg.found) break;
      }
      if (traces.length === 0)
        throw new BackendError("CONTRACT_ERROR", "Retry comparison không có response leg hợp lệ.");
      const merged = snapshot.problemMode === "multi_point"
        ? mergeSequentialRouteTraces(
            waypoints,
            traces,
            (id) => get().graphData?.nodes.find((node) => node.id === id)?.name ?? id,
            ALGO_LABEL[algorithm],
          )
        : { trace: traces[0], run: null };
      const envelope = createRouteResultEnvelope(
        algorithm,
        handle.runId,
        snapshot,
        merged.trace,
        traces,
      );
      const attached = attachComparisonResult(session, envelope, Date.now());
      session = attached.session;
      if (!attached.accepted) {
        runLifecycle.cancel();
        set({
          runId: runLifecycle.currentRunId(),
          routeComparisonSession: session,
          comparing: false,
          comparisonProgress: null,
        });
        toast.error(attached.contractError ?? "Comparison contract error.");
        return;
      }
      set({ routeComparisonSession: session });
      toast.success(`Đã chạy lại ${ALGO_LABEL[algorithm]}.`);
    } catch (error) {
      if (error instanceof RequestAbortedError || !runLifecycle.isCurrent(handle.runId)) return;
      session = failComparisonRun(
        session,
        algorithm,
        error instanceof Error ? error.message : "Comparison item thất bại.",
        Date.now(),
      );
      if (isFatalContractError(error)) {
        session = cancelComparisonSession(session, Date.now());
        const nextRunId = runLifecycle.cancel();
        set({
          runId: nextRunId,
          routeComparisonSession: session,
          comparing: false,
          comparisonProgress: null,
          drawerOpen: true,
          drawerTab: "compare",
        });
        toast.error(error.message);
      } else {
        set({ routeComparisonSession: session });
      }
    } finally {
      if (runLifecycle.isCurrent(handle.runId)) {
        set({ comparing: false, comparisonProgress: null, drawerOpen: true, drawerTab: "compare" });
      }
    }
  },

  runMulti: async (method) => {
    let s = get();
    if (s.running || s.comparing || s.multiRunning) return; // L3-04
    if (s.problemMode !== "multi_point" || s.multiStrategy !== "atsp" || s.runKind !== "single") {
      get().set({ problemMode: "multi_point", multiStrategy: "atsp", runKind: "single" });
      s = get();
    }
    const active = activeJourneyInputs({
      problemMode: s.problemMode,
      multiStrategy: "atsp",
      runKind: "single",
      drafts: s.journeyDrafts,
    });
    const eligibilityError = atspRunBlockReason(active.start, active.stops, [method]);
    if (eligibilityError) {
      toast.error(eligibilityError);
      return;
    }
    const snapshot = createRunSnapshot({
      graph: s.graph,
      graphView: s.graphView,
      slot: s.slot,
      mode: s.mode,
      scenario: buildScenario(s.graphView, s.edgeOverrides),
      problemMode: "multi_point",
      multiStrategy: "atsp",
      runKind: "single",
      drafts: s.journeyDrafts,
      algorithms: [],
      methods: [method],
      includeRouteTrace: false,
      includeOptimizationTrace: s.includeOptimizationTrace,
    });
    const handle = runLifecycle.begin();
    const resultId = `atsp-${handle.runId}`;
    set({
      runId: handle.runId,
      activeSnapshot: snapshot,
      multiRunning: true, trace: null, sequentialRoute: null, routeProgress: null,
      comparisonProgress: null,
      playing: false,
      singleRouteResult: null, singleAtspResult: null,
      routeComparisonSession: null, atspComparisonSession: null,
      explanationSubject: null, explanationOverlay: null,
      explanationOverlayVisible: false,
      optimizationTrace: null, timelineSource: null, stepIdx: 0,
    });
    try {
      const m = await api.multiroute(
        multirouteRequestFromSnapshot(snapshot, method),
        { signal: handle.signal },
      );
      if (!runLifecycle.isCurrent(handle.runId)) return;
      if (!m.applied_scenario || m.applied_scenario.graph_view !== snapshot.graphView)
        throw new BackendError(
          "CONTRACT_ERROR", "Backend không echo graph view đã chọn; đã bỏ kết quả nhiều điểm.",
        );
      if (m.contract_version === 2 && m.return_to_start !== snapshot.returnToStart)
        throw new BackendError(
          "CONTRACT_ERROR", "Backend echo open/closed khác immutable request snapshot.",
        );
      if (snapshot.includeOptimizationTrace && m.found && !m.optimization_trace)
        throw new BackendError(
          "CONTRACT_ERROR", "Backend không trả optimization trace đã yêu cầu.",
        );
      const envelope = createAtspResultEnvelope(
        resultId, handle.runId, snapshot, m,
      );
      set({
        multi: m,
        singleAtspResult: envelope,
        explanationSubject: { kind: "single_atsp", runId: resultId },
        explanationOverlay: null,
        explanationOverlayVisible: false,
        optimizationTrace: m.optimization_trace,
        timelineSource: m.optimization_trace ? "optimization" : null,
        stepIdx: 0,
        playing: false,
        drawerTab: "metrics",
      });
      if (m.found && m.savings_pct !== null) {
        const savings = describeAtspSavings(m.savings_pct);
        const pct = savings.absolutePct?.toFixed(1).replace(".", ",");
        if (savings.kind === "positive")
          toast.success(`Đã tối ưu thứ tự ${snapshot.stops.length} điểm giao — tiết kiệm ${pct} %.`);
        else if (savings.kind === "negative")
          toast.warning(`Thứ tự mới tăng chi phí ${pct} % so với thứ tự nhập.`);
        else
          toast.info("Thứ tự mới không đổi tổng chi phí so với thứ tự nhập.");
      }
    } catch (e) {
      if (e instanceof RequestAbortedError || !runLifecycle.isCurrent(handle.runId)) return;
      toast.error(e instanceof BackendError ? e.message : "Tối ưu thứ tự thất bại.");
    } finally {
      if (runLifecycle.isCurrent(handle.runId)) set({ multiRunning: false });
    }
  },

  runAtspComparison: async (methods) => {
    let s = get();
    if (s.running || s.comparing || s.multiRunning) return;
    if (s.problemMode !== "multi_point" || s.multiStrategy !== "atsp" || s.runKind !== "compare") {
      get().set({ problemMode: "multi_point", multiStrategy: "atsp", runKind: "compare" });
      s = get();
    }
    const eligibilityError = atspRunBlockReason(
      s.journeyDrafts.start, s.journeyDrafts.multiStops, methods,
    );
    if (eligibilityError) {
      toast.error(eligibilityError);
      return;
    }
    const snapshot = createRunSnapshot({
      graph: s.graph,
      graphView: s.graphView,
      slot: s.slot,
      mode: s.mode,
      scenario: buildScenario(s.graphView, s.edgeOverrides),
      problemMode: "multi_point",
      multiStrategy: "atsp",
      runKind: "compare",
      drafts: s.journeyDrafts,
      algorithms: [],
      methods,
      includeRouteTrace: false,
      includeOptimizationTrace: false,
    });
    const handle = runLifecycle.begin();
    const sessionId = `atsp-compare-${handle.runId}`;
    let session: CompareSession<AtspResultEnvelope>;
    try {
      session = createCompareSession("atsp", snapshot, methods, {
        id: sessionId, startedAt: Date.now(),
      }) as CompareSession<AtspResultEnvelope>;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cấu hình ATSP comparison không hợp lệ.");
      return;
    }
    set({
      runId: handle.runId,
      activeSnapshot: snapshot,
      comparing: true,
      comparisonProgress: {
        currentItem: 1, totalItems: methods.length, currentLeg: 0, totalLegs: 1,
      },
      atspComparisonSession: session,
      routeComparisonSession: null,
      explanationSubject: null,
      explanationOverlay: null,
      explanationOverlayVisible: false,
    });
    for (let methodIndex = 0; methodIndex < methods.length; methodIndex += 1) {
      const selectedMethod = methods[methodIndex];
      if (!runLifecycle.isCurrent(handle.runId)) return;
      session = markComparisonRunRunning(session, selectedMethod);
      set({
        atspComparisonSession: session,
        comparisonProgress: {
          currentItem: methodIndex + 1, totalItems: methods.length,
          currentLeg: 1, totalLegs: 1,
        },
      });
      try {
        const response = await api.multiroute(
          multirouteRequestFromSnapshot(snapshot, selectedMethod),
          { signal: handle.signal },
        );
        if (!runLifecycle.isCurrent(handle.runId)) return;
        if (response.contract_version === 2
            && response.return_to_start !== snapshot.returnToStart)
          throw new BackendError(
            "CONTRACT_ERROR", "ATSP comparison echo open/closed không khớp snapshot.",
          );
        const envelope = createAtspResultEnvelope(
          selectedMethod, handle.runId, snapshot, response,
        );
        const attached = attachComparisonResult(session, envelope, Date.now());
        session = attached.session;
        set({ atspComparisonSession: session });
        if (!attached.accepted) {
          runLifecycle.cancel();
          set({ runId: runLifecycle.currentRunId(), comparing: false, comparisonProgress: null });
          toast.error(attached.contractError ?? "ATSP comparison contract error.");
          return;
        }
      } catch (error) {
        if (error instanceof RequestAbortedError || !runLifecycle.isCurrent(handle.runId)) return;
        session = failComparisonRun(
          session, selectedMethod,
          error instanceof Error ? error.message : "ATSP comparison item thất bại.",
          Date.now(),
        );
        if (isFatalContractError(error)) {
          session = cancelComparisonSession(session, Date.now());
          const nextRunId = runLifecycle.cancel();
          set({
            runId: nextRunId,
            atspComparisonSession: session,
            comparing: false,
            comparisonProgress: null,
          });
          toast.error(error.message);
          return;
        }
        set({ atspComparisonSession: session });
      }
    }
    if (runLifecycle.isCurrent(handle.runId)) {
      set({ comparing: false, comparisonProgress: null, drawerTab: "compare" });
      toast.success(`Đã hoàn tất ${methods.length} phương pháp ATSP theo cùng snapshot.`);
    }
  },

  setStep: (i) => {
    const s = get();
    const n = activeTimelineLength(
      s.timelineSource, s.trace, s.optimizationTrace, s.graph, s.traceOnReal,
    );
    set({ stepIdx: Math.max(0, Math.min(i, n - 1)) });
  },

  togglePlay: () => {
    const s = get();
    const n = activeTimelineLength(
      s.timelineSource, s.trace, s.optimizationTrace, s.graph, s.traceOnReal,
    );
    if (n === 0) return;
    if (!s.playing && s.stepIdx >= n - 1) set({ stepIdx: 0, playing: true });
    else set({ playing: !s.playing });
  },
}));
