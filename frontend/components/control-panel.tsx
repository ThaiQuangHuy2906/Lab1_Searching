"use client";

// Panel trái 320px — thứ tự nhóm CỐ ĐỊNH theo DESIGN.md §4:
// Bối cảnh -> Thuật toán -> Hành trình -> nút CHẠY lớn.
// Tooltip = icon ? cạnh label (InfoTip); switch rows thẳng hàng (§8).

import * as React from "react";
import { ArrowDownUp, ChevronDown, Crosshair, Loader2, Play, Route, X } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { InfoTip } from "./ui/info-tip";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { ALGO_LABEL, useApp } from "@/lib/store";
import type { Algorithm, Mode, TimeSlot } from "@/lib/types";
import { AtspSetup } from "./atsp/atsp-setup";

const SLOTS: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const MODES: { v: Mode; label: string }[] = [
  { v: "balanced", label: "Cân bằng" },
  { v: "time", label: "Nhanh nhất" },
  { v: "distance", label: "Ngắn nhất" },
];
// nhóm dropdown thuật toán theo bảo đảm lý thuyết (SCHEMA §B.5) — người chấm
// nhìn menu là thấy ngay nhóm nào cam kết tối ưu, nhóm nào đánh đổi.
// Màu label = đúng ngữ nghĩa Badge ok/warn dùng khắp drawer (start / algo-path).
const ALGO_GROUPS: { label: string; cls: string; algos: Algorithm[] }[] = [
  { label: "Đảm bảo tối ưu", cls: "text-start",
    algos: ["ucs", "dijkstra", "astar", "bidijkstra", "idastar"] },
  { label: "Không đảm bảo — đánh đổi", cls: "text-algo-path",
    algos: ["bfs", "dfs", "iddfs", "greedy", "beam"] },
];

function FieldLabel({ children, tip, dot }: {
  children: React.ReactNode; tip?: string; dot?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
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
  label: string; tip?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-2">
      <FieldLabel tip={tip}>{label}</FieldLabel>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Section({ title, tip, children }: {
  title: string; tip?: string; children: React.ReactNode;
}) {
  // v11: thu gọn được — 1080p từng phải cuộn mới thấy trọn Hành trình;
  // mặc định MỞ hết, trạng thái chỉ sống trong phiên (không persist)
  const [open, setOpen] = React.useState(true);
  return (
    <div className="flex shrink-0 flex-col gap-2.5 rounded-xl border border-surface-border/80 bg-surface-panel p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="-m-1 flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg px-1 text-[11px] font-bold uppercase tracking-wider text-ink transition-colors hover:bg-surface-control"
        >
          <span className="h-3 w-0.5 shrink-0 rounded-full bg-algo-frontier" />
          <span className="truncate">{title}</span>
          <ChevronDown
            className={"ml-auto size-3.5 shrink-0 text-ink-dim transition-transform " +
              (open ? "" : "-rotate-90")}
          />
        </button>
        {tip && <InfoTip text={tip} />}
      </div>
      {open && children}
    </div>
  );
}

function NodePicker({ kind }: { kind: "start" | "goal" }) {
  const graphData = useApp((s) => s.graphData);
  const graph = useApp((s) => s.graph);
  const value = useApp((s) => (kind === "start" ? s.start : s.goal));
  // the OTHER endpoint is excluded from this dropdown: Đi === Đến used to
  // reach the server and 500 before the L3-01 backend guard existed
  const other = useApp((s) => (kind === "start" ? s.goal : s.start));
  const stops = useApp((s) => s.stops);
  const pickTarget = useApp((s) => s.pickTarget);
  const busy = useApp((s) => s.running || s.comparing || s.multiRunning);
  const set = useApp((s) => s.set);
  const isDemo = graph === "demo";

  // ride-hailing style (DESIGN v9d): fixed role color, hollow dot -> filled
  const roleColor = kind === "start" ? "rgb(var(--start))" : "rgb(var(--goal))";
  const roleDot = (
    <span
      aria-hidden
      className="pointer-events-none absolute left-3 top-1/2 z-10 size-2.5 -translate-y-1/2 rounded-full"
      style={value ? { background: roleColor } : { border: `2px solid ${roleColor}` }}
    />
  );
  const roleBorder = value ? { borderColor: roleColor } : undefined;

  // nút ✕ xoá chọn — cùng kiểu với ✕ của hàng Stops (DESIGN §4, duyệt v8)
  const clear = value ? (
    <button
      aria-label={kind === "start" ? "Xoá điểm đi" : "Xoá điểm đến"}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-goal/10 hover:text-goal disabled:pointer-events-none disabled:opacity-40"
      disabled={busy}
      onClick={() => set(kind === "start" ? { start: null } : { goal: null })}
    >
      <X className="size-3.5" />
    </button>
  ) : null;

  if (isDemo) {
    return (
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          {roleDot}
          <Select
            value={value ?? ""} disabled={busy}
            onValueChange={(v) => set(kind === "start" ? { start: v } : { goal: v })}
          >
            <SelectTrigger aria-label={kind === "start" ? "Điểm đi" : "Điểm đến"}
              className={"pl-8 " + (value ? "font-medium" : "")} style={roleBorder}>
              <SelectValue placeholder={kind === "start" ? "Chọn điểm xuất phát…" : "Chọn điểm đến…"} />
            </SelectTrigger>
            <SelectContent>
              {graphData?.nodes
                .filter((n) =>
                  n.id !== other && (kind !== "start" || !stops.includes(n.id)))
                .map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name ?? n.id}</SelectItem>
                ))}
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
          variant="secondary" disabled={busy}
          className={"w-full pl-8 " + (active ? "border-algo-frontier text-algo-frontier" : "")}
          style={active ? undefined : roleBorder}
          onClick={() => set({ pickTarget: active ? null : kind })}
        >
          <Crosshair />
          {value
            ? <>Đã chọn: <span className="font-mono">{value}</span></>
            : active ? "Bấm vào bản đồ…" : "Chọn trên bản đồ"}
        </Button>
      </div>
      {clear}
    </div>
  );
}

function SwapButton() {
  const s = useApp();
  const busy = s.running || s.comparing || s.multiRunning;
  return (
    <div className="z-10 -mt-1.5 -mb-3.5 flex justify-center">
      <Button
        variant="ghost" size="iconSm" aria-label="Đảo chiều Đi ↔ Đến"
        className="rounded-full border border-surface-border bg-surface-control shadow-sm"
        disabled={busy || s.stops.length > 0 || (!s.start && !s.goal)}
        onClick={() => s.set({ start: s.goal, goal: s.start })}
      >
        <ArrowDownUp className="size-3.5" />
      </Button>
    </div>
  );
}

export function ControlPanel() {
  const s = useApp();
  const isDemo = s.graph === "demo";
  const busy = s.running || s.comparing || s.multiRunning;
  const epsilonUnit = s.mode === "distance" ? "mét" : "giây";

  return (
    <aside aria-label="Bảng điều khiển định tuyến" className="relative z-10 flex h-full w-80 shrink-0 flex-col border-r border-surface-border bg-surface-rail shadow-float">
      <div className="flex h-[60px] shrink-0 items-center gap-2.5 border-b border-surface-border bg-surface-rail px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-algo-frontier/15 text-algo-frontier">
          <Route className="size-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold leading-5">Định tuyến giao thông TP.HCM</h1>
          <p className="truncate text-xs text-ink-dim">Shipper giao hàng đa điểm — Lab 1 AI</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-2.5">
      <Section title="Bối cảnh">
        <Field label="Đồ thị">
          <Select value={s.graph} disabled={busy}
            onValueChange={(v) => void s.loadGraph(v as "demo" | "real")}>
            <SelectTrigger aria-label="Đồ thị"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">G_demo — 51 địa danh thật</SelectItem>
              <SelectItem value="real">G_real — 2 118 nút OSM</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Khung giờ" tip="Mức ùn tắc của từng đoạn đường thay đổi theo 4 mốc giờ chụp.">
          <div className="grid grid-cols-4 gap-0.5 rounded-lg border border-surface-border bg-surface-control p-0.5">
            {SLOTS.map((slot) => (
              <Button
                key={slot}
                size="sm"
                disabled={busy}
                variant={s.slot === slot ? "default" : "ghost"}
                className="h-8 px-0 font-mono text-xs"
                onClick={() => s.setSlot(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        </Field>
        <Field label="Tiêu chí tối ưu"
          tip="Cân bằng (mặc định) = thời gian + phạt rủi ro (giây); Nhanh nhất = chỉ thời gian; Ngắn nhất = chỉ quãng đường.">
          {/* segmented thay dropdown (v11): thấy đủ 3 tiêu chí một lúc — đúng
              điểm nhấn "3 mode" khi demo chấm, đỡ một cú click */}
          <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-surface-border bg-surface-control p-0.5">
            {MODES.map((m) => (
              <Button
                key={m.v}
                size="sm"
                disabled={busy}
                variant={s.mode === m.v ? "default" : "ghost"}
                className="h-8 px-0 text-xs"
                onClick={() => s.set({ mode: m.v })}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </Field>
        <div className="flex flex-col">
          <SwitchRow label="Lớp ùn tắc"
            tip="Tô màu từng đoạn đường theo mức ùn tắc 1→5 của khung giờ đang chọn."
            checked={s.trafficLayer} onChange={(v) => s.set({ trafficLayer: v })} />
          <SwitchRow label="Chế độ offline"
            tip="Tắt bản đồ nền, vẽ thuần đồ thị — bảo hiểm khi wifi chập chờn."
            checked={s.offlineMode} onChange={(v) => s.set({ offlineMode: v })} />
        </div>
      </Section>

      <Section title="Thuật toán"
        tip="UCS, Dijkstra, A*, Hai chiều, IDA* đảm bảo tuyến tối ưu; BFS, DFS, IDDFS, Greedy, Beam thì không.">
        <Select value={s.algorithm} disabled={busy}
          onValueChange={(v) => s.set({ algorithm: v as Algorithm })}>
          <SelectTrigger aria-label="Thuật toán"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALGO_GROUPS.map((g) => (
              <SelectGroup key={g.label}>
                <SelectLabel className={`flex items-center gap-1.5 ${g.cls}`}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {g.label}
                </SelectLabel>
                {g.algos.map((a) => (
                  <SelectItem key={a} value={a}>{ALGO_LABEL[a]}</SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {s.algorithm === "beam" && (
          <Field label="Beam width (k)"
            tip="Số node tốt nhất giữ lại mỗi lớp — k nhỏ chạy nhanh nhưng có thể không tìm thấy đường.">
            <input
              type="number" min={1}
              className="h-10 rounded-lg border border-surface-border bg-surface-control px-3 font-mono text-sm hover:border-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel"
              placeholder={isDemo ? "mặc định 5" : "mặc định 50"}
              value={s.beamWidth}
              onChange={(e) => s.set({ beamWidth: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Field>
        )}
        {s.algorithm === "idastar" && (
          <Field label={`ε — nới ngưỡng (${epsilonUnit})`}
            tip={`Mỗi vòng IDA* nới ngưỡng thêm ε ${epsilonUnit}; nghiệm nằm trong khoảng tối ưu + ε.`}>
            <input
              type="number" min={0.1} step={0.5}
              className="h-10 rounded-lg border border-surface-border bg-surface-control px-3 font-mono text-sm hover:border-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel"
              placeholder="mặc định 5"
              value={s.epsilon}
              onChange={(e) => s.set({ epsilon: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Field>
        )}
        {!isDemo && (
          <SwitchRow label="Trace trên G_real"
            tip="Trace từng bước trên G_real có thể rất lớn — chỉ bật khi thật cần."
            checked={s.traceOnReal} onChange={(v) => {
              s.set({ traceOnReal: v });
              if (v && s.graph === "real" && s.trace?.found && s.trace.trace.length === 0)
                toast.info("Đã bật trace — bấm Chạy thuật toán lại để xem từng bước.");
            }} />
        )}
      </Section>

      <Section title="Hành trình">
        <Field label="Đi — điểm xuất phát">
          <NodePicker kind="start" />
        </Field>
        <SwapButton />
        <Field label={s.stops.length > 0 ? "Đến — không dùng trong ATSP" : "Đến — điểm đích"}>
          <NodePicker kind="goal" />
        </Field>
        <AtspSetup />
      </Section>

      </div>
      {/* CTA ghim đáy panel — luôn nhìn thấy (DESIGN 4, duyệt v4) */}
      <div className="flex shrink-0 flex-col gap-1.5 border-t border-surface-border bg-surface-rail px-4 py-3">
        <Button size="lg" className="w-full" disabled={busy} onClick={() => void s.runRoute()}>
          {s.running ? <Loader2 className="animate-spin" /> : <Play />}
          {s.running ? "Đang chạy…" : "Chạy thuật toán"}
        </Button>
        {/* min-h cố định 1 dòng: hint xuất hiện/biến mất không làm nút Chạy
            nhảy lên xuống (review v11) */}
        {!s.graphLoading && (
          <p className="min-h-4 text-center text-[11px] leading-4 text-ink-dim">
            {!s.start || !s.goal
              ? s.stops.length > 0
                // tour mode: Đến không cần — đừng đòi (v11, stops tự bỏ Đến)
                ? (!s.start
                    ? "Chọn điểm Đi rồi dùng nút Tối ưu thứ tự."
                    : "Chế độ nhiều điểm — dùng nút Tối ưu thứ tự (không cần điểm Đến).")
                : !s.start && !s.goal ? "Chọn điểm Đi và Đến ở mục Hành trình trước."
                : !s.start ? "Còn thiếu điểm Đi." : "Còn thiếu điểm Đến."
              : ""}
          </p>
        )}
        {s.graphLoading && <Skeleton className="h-4 w-full" />}
      </div>
    </aside>
  );
}
