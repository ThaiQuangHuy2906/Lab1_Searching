"use client";

import * as React from "react";
import {
  ArrowDownUp, ChevronDown, Crosshair, Loader2, PanelLeftClose, Play, Route, X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { InfoTip } from "./ui/info-tip";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { ALGORITHM_GROUPS } from "@/lib/algorithm-policy";
import {
  presentationEpsilonToRaw,
  presentationUnitForMode,
  rawEpsilonToPresentation,
} from "@/lib/metric-presentation";
import { ALGORITHM_SUMMARY } from "@/lib/ui-copy";
import {
  isEndpointOptionAllowed,
  MULTI_ROUTE_ACTIVE_MESSAGE,
} from "@/lib/interaction-policy";
import {
  graphViewForNodeCount,
  MAX_DEMO_NODE_COUNT,
  MIN_DEMO_NODE_COUNT,
  nodeCountForGraphView,
  parseDemoNodeCount,
} from "@/lib/graph-view";
import { ALGO_LABEL, useApp } from "@/lib/store";
import { useMobileDialogFocus } from "@/lib/use-mobile-dialog-focus";
import { fmtVi } from "@/lib/format";
import type { Algorithm, Mode, TimeSlot } from "@/lib/types";
import { AtspSetup } from "./atsp/atsp-setup";
import { EdgeExperimentLauncher } from "./edge-weight-presets";

const SLOTS: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const MODES: { v: Mode; label: string }[] = [
  { v: "balanced", label: "Cân bằng" },
  { v: "time", label: "Nhanh nhất" },
  { v: "distance", label: "Ngắn nhất" },
];

function FieldLabel({ children, tip, dot }: {
  children: React.ReactNode; tip?: string; dot?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-ink-dim">
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      {children}
      {tip && <InfoTip text={tip} />}
    </span>
  );
}

function Field({ label, tip, dot, children }: {
  label: string; tip?: string; dot?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel tip={tip} dot={dot}>{label}</FieldLabel>
      {children}
    </div>
  );
}

function SwitchRow({ label, tip, checked, onChange }: {
  label: string; tip?: string; checked: boolean; onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-2">
      <FieldLabel tip={tip}>{label}</FieldLabel>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Section({ title, tip, children, defaultOpen = true }: {
  title: string; tip?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <section className="app-card flex shrink-0 flex-col gap-2.5 rounded-lg border border-surface-border/80 p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="-m-1 flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-sm font-bold text-ink transition-colors hover:bg-surface-control"
        >
          <span className="truncate">{title}</span>
          <ChevronDown className={`ml-auto size-4 shrink-0 text-ink-dim transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        {tip && <InfoTip text={tip} />}
      </div>
      {open && children}
    </section>
  );
}

function NodePicker({ kind }: { kind: "start" | "goal" }) {
  const graphData = useApp((state) => state.graphData);
  const graph = useApp((state) => state.graph);
  const value = useApp((state) => (kind === "start" ? state.start : state.goal));
  const other = useApp((state) => (kind === "start" ? state.goal : state.start));
  const stops = useApp((state) => state.stops);
  const pickTarget = useApp((state) => state.pickTarget);
  const busy = useApp((state) => state.running || state.comparing || state.multiRunning);
  const set = useApp((state) => state.set);
  const isDemo = graph === "demo";
  const roleColor = kind === "start" ? "rgb(var(--start))" : "rgb(var(--goal))";
  const roleDot = (
    <span
      aria-hidden
      className="pointer-events-none absolute left-3 top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full"
      style={value ? { background: roleColor } : { border: `2px solid ${roleColor}` }}
    />
  );
  const roleBorder = value ? { borderColor: roleColor } : undefined;
  const clear = value ? (
    <button
      type="button"
      aria-label={kind === "start" ? "Xoá điểm đi" : "Xoá điểm đến"}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-goal/10 hover:text-goal disabled:pointer-events-none disabled:opacity-40"
      disabled={busy}
      onClick={() => set(kind === "start"
        ? { start: null }
        : { goal: null, problemMode: "two_point" })}
    >
      <X className="size-4" />
    </button>
  ) : null;

  if (isDemo) {
    return (
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          {roleDot}
          <Select
            value={value ?? ""}
            disabled={busy}
            onValueChange={(nodeId) => {
              if (isEndpointOptionAllowed(kind, nodeId, other, stops))
                set(kind === "start"
                  ? { start: nodeId }
                  : { goal: nodeId, problemMode: "two_point" });
            }}
          >
            <SelectTrigger
              aria-label={kind === "start" ? "Điểm đi" : "Điểm đến"}
              className={`pl-8 ${value ? "font-medium" : ""}`}
              style={roleBorder}
            >
              <SelectValue placeholder={kind === "start" ? "Chọn điểm xuất phát…" : "Chọn điểm đến…"} />
            </SelectTrigger>
            <SelectContent>
              {graphData?.nodes
                .filter((node) => isEndpointOptionAllowed(kind, node.id, other, stops))
                .map((node) => <SelectItem key={node.id} value={node.id}>{node.name ?? node.id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {clear}
      </div>
    );
  }

  const active = pickTarget === kind;
  return (
    <div className="flex items-center gap-1">
      <div className="relative min-w-0 flex-1">
        {roleDot}
        <Button
          variant="secondary"
          disabled={busy}
          className={`w-full pl-8 ${active ? "border-algo-frontier text-algo-frontier" : ""}`}
          style={active ? undefined : roleBorder}
          onClick={() => set({ pickTarget: active ? null : kind })}
        >
          <Crosshair />
          {value ? <>Đã chọn: <span className="font-mono">{value}</span></> : active ? "Bấm vào bản đồ…" : "Chọn trên bản đồ"}
        </Button>
      </div>
      {clear}
    </div>
  );
}

function SwapButton() {
  const state = useApp();
  const busy = state.running || state.comparing || state.multiRunning;
  return (
    <div className="z-10 -mt-1.5 -mb-3.5 flex justify-center">
      <Button
        variant="ghost"
        size="iconSm"
        aria-label="Đảo chiều Đi và Đến"
        className="rounded-full border border-surface-border bg-surface-control shadow-sm"
        disabled={busy || state.problemMode === "multi_point" || (!state.start && !state.goal)}
        onClick={() => state.set({
          start: state.goal, goal: state.start, problemMode: "two_point",
        })}
      >
        <ArrowDownUp className="size-4" />
      </Button>
    </div>
  );
}

function GraphNodeCountInput({ isDemo, busy }: { isDemo: boolean; busy: boolean }) {
  const graphView = useApp((state) => state.graphView);
  const graphLoading = useApp((state) => state.graphLoading);
  const setGraphView = useApp((state) => state.setGraphView);
  const selectedCount = isDemo ? nodeCountForGraphView(graphView) : 2118;
  const [draft, setDraft] = React.useState(String(selectedCount));

  React.useEffect(() => setDraft(String(selectedCount)), [selectedCount]);

  const parsed = isDemo ? parseDemoNodeCount(draft) : null;
  const invalid = isDemo && parsed === null;
  const unchanged = parsed === selectedCount;
  const apply = () => {
    if (parsed === null || busy || graphLoading) return;
    setGraphView(graphViewForNodeCount(parsed));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_DEMO_NODE_COUNT}
            max={MAX_DEMO_NODE_COUNT}
            step={1}
            aria-label="Số điểm muốn hiển thị"
            aria-describedby={invalid ? "graph-view-error" : undefined}
            aria-invalid={invalid}
            value={draft}
            disabled={!isDemo || busy || graphLoading}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") apply(); }}
            className="h-10 w-full appearance-none rounded-lg border border-surface-border bg-surface-control px-3 pr-16 text-sm font-semibold text-ink outline-none transition-colors [appearance:textfield] focus:border-algo-frontier focus:ring-2 focus:ring-algo-frontier/25 disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint">điểm</span>
        </div>
        <Button type="button" size="sm" className="h-10 px-3" disabled={!isDemo || busy || graphLoading || invalid || unchanged} onClick={apply}>
          {graphLoading ? <Loader2 className="animate-spin" /> : "Áp dụng"}
        </Button>
      </div>
      {invalid && (
        <p id="graph-view-error" role="alert" className="text-xs leading-5 text-goal">
          Nhập số nguyên từ {MIN_DEMO_NODE_COUNT} đến {MAX_DEMO_NODE_COUNT}.
        </p>
      )}
    </div>
  );
}

type ControlPanelProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function ControlPanel({ mobileOpen = false, onMobileClose }: ControlPanelProps) {
  const state = useApp();
  const isDemo = state.graph === "demo";
  const busy = state.running || state.comparing || state.multiRunning;
  const epsilonUnit = presentationUnitForMode(state.mode);
  const epsilonDisplay = state.epsilon === "" ? "" : rawEpsilonToPresentation(state.mode, state.epsilon);
  const epsilonMin = state.mode === "distance" ? 0.001 : 0.01;
  const epsilonStep = state.mode === "distance" ? 0.001 : 0.1;
  const epsilonDefault = rawEpsilonToPresentation(state.mode, 5);
  const epsilonDefaultText = fmtVi(epsilonDefault, state.mode === "distance" ? 3 : 1);
  const panelRef = React.useRef<HTMLElement>(null);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const closeMobile = React.useCallback(() => onMobileClose?.(), [onMobileClose]);
  const onMobilePanelKeyDownCapture = useMobileDialogFocus(mobileOpen, panelRef, headingRef, closeMobile);
  const algorithmShortName = ALGO_LABEL[state.algorithm];
  const routeAction = state.problemMode === "multi_point"
    ? `Chạy qua ${state.stops.length} điểm`
    : `Chạy ${algorithmShortName}`;
  const overrideCount = Object.keys(state.edgeOverrides).length;
  const ctaLabel = overrideCount > 0
    ? `${routeAction} · ${overrideCount} đoạn thử`
    : routeAction;
  const mobileClasses = mobileOpen
    ? "max-[959px]:fixed max-[959px]:inset-0 max-[959px]:z-50 max-[959px]:flex max-[959px]:h-[100dvh] max-[959px]:w-full max-[959px]:rounded-none"
    : "max-[959px]:hidden";

  return (
    <aside
      ref={panelRef}
      aria-label="Bảng điều khiển định tuyến"
      aria-modal={mobileOpen || undefined}
      role={mobileOpen ? "dialog" : undefined}
      onKeyDownCapture={mobileOpen ? onMobilePanelKeyDownCapture : undefined}
      className={`app-rail relative z-10 flex h-full w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-surface-border/80 min-[960px]:max-[1279px]:w-[304px] ${mobileClasses}`}
    >
      <div className="app-header flex min-h-[72px] shrink-0 items-center gap-2.5 border-b border-surface-border/80 px-4 py-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-algo-frontier/25 bg-surface-raised text-algo-frontier">
          <Route className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 ref={headingRef} tabIndex={-1} className="break-words text-[19px] font-bold leading-5 text-ink">Định tuyến giao thông TP.HCM</h1>
          <p className="text-xs leading-5 text-ink-dim">Shipper đa điểm — Lab 1 AI</p>
        </div>
        <Button
          variant="ghost"
          size="iconSm"
          className="hidden max-[959px]:inline-flex"
          aria-label="Đóng bảng thiết lập"
          onClick={closeMobile}
        >
          <PanelLeftClose />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-x-hidden overflow-y-auto p-3">
        <Section title="Thiết lập bài toán">
          <Field label="Đồ thị">
            <Select value={state.graph} disabled={busy} onValueChange={(value) => void state.loadGraph(value as "demo" | "real")}>
              <SelectTrigger aria-label="Đồ thị"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">G_demo — 51 địa danh minh hoạ</SelectItem>
                <SelectItem value="real">G_real — 2.118 nút từ topology OSM</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Số điểm hiển thị"
            tip="Nhập từ 3 đến 51. Đổi số sẽ tải lại đồ thị con và xoá hành trình, kết quả cũ."
          >
            <GraphNodeCountInput isDemo={isDemo} busy={busy} />
          </Field>
          <Field label="Khung giờ" tip="Mức ùn tắc trên từng đoạn đường thay đổi theo bốn mốc giờ chụp.">
            <div role="group" aria-label="Chọn khung giờ" className="grid grid-cols-4 gap-0.5 rounded-lg border border-surface-border bg-surface-control p-0.5">
              {SLOTS.map((slot) => (
                <Button key={slot} size="sm" disabled={busy} aria-pressed={state.slot === slot}
                  variant={state.slot === slot ? "default" : "ghost"} className="h-9 px-0 font-mono text-xs" onClick={() => state.setSlot(slot)}>
                  {slot}
                </Button>
              ))}
            </div>
          </Field>
          <Field label="Tiêu chí tối ưu" tip="Cân bằng cộng phần phạt rủi ro vào thời gian; hai chế độ còn lại lần lượt chỉ tối ưu thời gian hoặc quãng đường.">
            <div role="group" aria-label="Chọn tiêu chí tối ưu" className="grid grid-cols-3 gap-0.5 rounded-lg border border-surface-border bg-surface-control p-0.5">
              {MODES.map((mode) => (
                <Button key={mode.v} size="sm" disabled={busy} aria-pressed={state.mode === mode.v}
                  variant={state.mode === mode.v ? "default" : "ghost"} className="h-9 px-0 text-xs" onClick={() => state.set({ mode: mode.v })}>
                  {mode.label}
                </Button>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Hành trình">
          <Field label="Đi — điểm xuất phát"><NodePicker kind="start" /></Field>
          <SwapButton />
          <Field label={state.problemMode === "multi_point" ? "Đến — draft đang được giữ" : "Đến — điểm đích"}><NodePicker kind="goal" /></Field>
          <AtspSetup />
        </Section>

        <Section
          title="Thuật toán"
          tip="UCS, A* và Dijkstra hai chiều đảm bảo tối ưu; IDA* dùng biên ε; các thuật toán còn lại là đánh đổi."
        >
          <Select value={state.algorithm} disabled={busy} onValueChange={(value) => state.set({ algorithm: value as Algorithm })}>
            <SelectTrigger aria-label="Thuật toán"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALGORITHM_GROUPS.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className={`flex items-center gap-1.5 ${group.cls}`}>
                    <span className="size-1.5 rounded-full bg-current" />{group.label}
                  </SelectLabel>
                  {group.algos.map((algorithm) => <SelectItem key={algorithm} value={algorithm}>{ALGO_LABEL[algorithm]}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="rounded-lg border border-surface-border bg-surface-control/70 px-2.5 py-2 text-xs leading-5 text-ink-dim">{ALGORITHM_SUMMARY[state.algorithm]}</p>
          {state.algorithm === "beam" && (
            <Field label="Độ rộng Beam (k)" tip="Số điểm tốt nhất giữ lại ở mỗi lớp; k nhỏ nhanh hơn nhưng có thể mất đường đi.">
              <input type="number" min={1} disabled={busy} value={state.beamWidth}
                placeholder={isDemo ? "Mặc định 5" : "Mặc định 50"}
                className="h-10 rounded-lg border border-surface-border bg-surface-control px-3 font-mono text-sm hover:border-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-55"
                onChange={(event) => state.set({ beamWidth: event.target.value === "" ? "" : Number(event.target.value) })} />
            </Field>
          )}
          {state.algorithm === "idastar" && (
            <Field label={`ε — nới ngưỡng (${epsilonUnit})`} tip={`Mỗi vòng IDA* nới ngưỡng thêm ε ${epsilonUnit}; nghiệm nằm trong khoảng tối ưu + ε.`}>
              <input type="number" min={epsilonMin} step={epsilonStep} disabled={busy} value={epsilonDisplay} placeholder={`Mặc định ${epsilonDefaultText}`}
                className="h-10 rounded-lg border border-surface-border bg-surface-control px-3 font-mono text-sm hover:border-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-55"
                onChange={(event) => {
                  const value = event.target.value;
                  const parsed = Number(value);
                  state.set({ epsilon: value === "" || !Number.isFinite(parsed) ? "" : presentationEpsilonToRaw(state.mode, parsed) });
                }} />
            </Field>
          )}
        </Section>

        <Section title="Hiển thị">
          <SwitchRow label="Lớp ùn tắc" tip="Tô màu đoạn đường theo mức ùn tắc 1 đến 5 của khung giờ đang chọn." checked={state.trafficLayer} onChange={(value) => state.set({ trafficLayer: value })} />
          <SwitchRow label="Chế độ offline" tip="Tắt bản đồ nền và chỉ vẽ đồ thị khi không có mạng ổn định." checked={state.offlineMode} onChange={(value) => state.set({ offlineMode: value })} />
          {!isDemo && <p className="text-xs leading-5 text-ink-dim">Trace từng bước được yêu cầu cho G_real; chỉ nên dùng khi cần quan sát vì có thể rất dài. Giới hạn hiển thị 5.000 bước không cắt công việc tìm kiếm.</p>}
        </Section>

        <Section
          title="Kịch bản thử nghiệm"
          defaultOpen={false}
          tip="Chọn một đoạn đường trên bản đồ; trình chỉnh đầy đủ sẽ mở ở panel bên phải. Dữ liệu gốc không bị sửa."
        >
          <EdgeExperimentLauncher />
        </Section>
      </div>

      <div className="app-footer flex shrink-0 flex-col gap-1.5 border-t border-surface-border/80 px-4 py-3">
        <Button size="lg" className="w-full" disabled={busy} onClick={() => void state.runRoute()}>
          {state.running ? <Loader2 className="animate-spin" /> : <Play />}
          {state.running
            ? state.routeProgress ? `Đang chạy chặng ${state.routeProgress.current}/${state.routeProgress.total}…` : "Đang chạy…"
            : ctaLabel}
        </Button>
        {!state.graphLoading && (
          <p className="min-h-5 text-center text-xs leading-5 text-ink-dim">
            {state.problemMode === "multi_point"
              ? !state.start ? "Còn thiếu điểm Đi." : MULTI_ROUTE_ACTIVE_MESSAGE
              : !state.start || !state.goal
                ? !state.start && !state.goal ? "Chọn điểm Đi và Đến ở mục Hành trình trước." : !state.start ? "Còn thiếu điểm Đi." : "Còn thiếu điểm Đến."
                : ""}
          </p>
        )}
        {state.graphLoading && <Skeleton className="h-5 w-full" />}
      </div>
    </aside>
  );
}
