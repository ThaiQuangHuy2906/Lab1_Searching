"use client";

// Panel trái 320px — thứ tự nhóm CỐ ĐỊNH theo DESIGN.md §4:
// Bối cảnh -> Thuật toán -> Hành trình -> nút CHẠY lớn.
// Tooltip = icon ? cạnh label (InfoTip); switch rows thẳng hàng (§8).

import * as React from "react";
import { Crosshair, ListOrdered, Loader2, Play, Route, X } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { InfoTip } from "./ui/info-tip";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { ALGO_LABEL, useApp } from "@/lib/store";
import type { Algorithm, Mode, TimeSlot, TspMethod } from "@/lib/types";

const SLOTS: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const MODES: { v: Mode; label: string }[] = [
  { v: "balanced", label: "Cân bằng (mặc định)" },
  { v: "time", label: "Nhanh nhất" },
  { v: "distance", label: "Ngắn nhất" },
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
    <div className="flex min-h-8 items-center justify-between gap-2">
      <FieldLabel tip={tip}>{label}</FieldLabel>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function Section({ title, tip, children }: {
  title: string; tip?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-4">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-dim">
        {title}
        {tip && <InfoTip text={tip} />}
      </div>
      {children}
    </div>
  );
}

function NodePicker({ kind }: { kind: "start" | "goal" }) {
  const graphData = useApp((s) => s.graphData);
  const graph = useApp((s) => s.graph);
  const value = useApp((s) => (kind === "start" ? s.start : s.goal));
  const pickTarget = useApp((s) => s.pickTarget);
  const set = useApp((s) => s.set);
  const isDemo = graph === "demo";

  if (isDemo) {
    return (
      <Select
        value={value ?? ""}
        onValueChange={(v) => set(kind === "start" ? { start: v } : { goal: v })}
      >
        <SelectTrigger aria-label={kind === "start" ? "Điểm đi" : "Điểm đến"}>
          <SelectValue placeholder="Chọn địa danh…" />
        </SelectTrigger>
        <SelectContent>
          {graphData?.nodes.map((n) => (
            <SelectItem key={n.id} value={n.id}>{n.name ?? n.id}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  const active = pickTarget === kind;
  return (
    <Button
      variant="secondary"
      className={active ? "border-algo-frontier text-algo-frontier" : ""}
      onClick={() => set({ pickTarget: active ? null : kind })}
    >
      <Crosshair />
      {value ? `Đã chọn: ${value}` : active ? "Bấm vào bản đồ…" : "Chọn trên bản đồ"}
    </Button>
  );
}

export function ControlPanel() {
  const s = useApp();
  const isDemo = s.graph === "demo";
  const busy = s.running || s.comparing || s.multiRunning;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-surface-border bg-surface-panel">
      <div className="flex shrink-0 items-center gap-2.5 border-b border-surface-border px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-algo-frontier/15 text-algo-frontier">
          <Route className="size-4" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold">Định tuyến giao thông TP.HCM</h1>
          <p className="truncate text-xs text-ink-dim">Shipper giao hàng đa điểm — Lab 1 AI</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
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
          <div className="grid grid-cols-4 gap-1">
            {SLOTS.map((slot) => (
              <Button
                key={slot}
                size="sm"
                disabled={busy}
                variant={s.slot === slot ? "default" : "secondary"}
                className="px-0 font-mono text-xs"
                onClick={() => s.setSlot(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        </Field>
        <Field label="Tiêu chí tối ưu"
          tip="Cân bằng = thời gian + phạt rủi ro (giây); Nhanh nhất = chỉ thời gian; Ngắn nhất = chỉ quãng đường.">
          <Select value={s.mode} onValueChange={(v) => s.set({ mode: v as Mode })}>
            <SelectTrigger aria-label="Tiêu chí tối ưu"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <Select value={s.algorithm} onValueChange={(v) => s.set({ algorithm: v as Algorithm })}>
          <SelectTrigger aria-label="Thuật toán"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(ALGO_LABEL) as Algorithm[]).map((a) => (
              <SelectItem key={a} value={a}>{ALGO_LABEL[a]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {s.algorithm === "beam" && (
          <Field label="Beam width (k)"
            tip="Số node tốt nhất giữ lại mỗi lớp — k nhỏ chạy nhanh nhưng có thể không tìm thấy đường.">
            <input
              type="number" min={1}
              className="h-9 rounded-lg border border-surface-border bg-surface-panel px-3 font-mono text-sm"
              placeholder={isDemo ? "mặc định 5" : "mặc định 50"}
              value={s.beamWidth}
              onChange={(e) => s.set({ beamWidth: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Field>
        )}
        {s.algorithm === "idastar" && (
          <Field label="ε — nới ngưỡng (giây)"
            tip="Mỗi vòng IDA* nới ngưỡng thêm ε giây; nghiệm nằm trong khoảng tối ưu + ε.">
            <input
              type="number" min={0.1} step={0.5}
              className="h-9 rounded-lg border border-surface-border bg-surface-panel px-3 font-mono text-sm"
              placeholder="mặc định 5"
              value={s.epsilon}
              onChange={(e) => s.set({ epsilon: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Field>
        )}
        {!isDemo && (
          <SwitchRow label="Trace trên G_real"
            tip="Trace từng bước trên G_real có thể rất lớn — chỉ bật khi thật cần."
            checked={s.traceOnReal} onChange={(v) => s.set({ traceOnReal: v })} />
        )}
      </Section>

      <Section title="Hành trình">
        <Field label="Đi — điểm xuất phát" dot="#047857">
          <NodePicker kind="start" />
        </Field>
        <Field label="Đến — điểm đích" dot="#dc2626">
          <NodePicker kind="goal" />
        </Field>
        <Field label={`Điểm giao hàng (${s.stops.length}/15)`}
          tip="Danh sách điểm cần ghé — bài toán ATSP tìm thứ tự ghé tốt nhất (có đường một chiều nên chi phí đi–về khác nhau).">
          <div className="flex flex-col gap-1.5">
            {s.stops.map((id, i) => {
              const name = s.graphData?.nodes.find((n) => n.id === id)?.name ?? id;
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-surface-border px-2 py-1 text-xs">
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-algo-path font-mono text-[10px] font-bold text-surface">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <button
                    aria-label={`Bỏ ${name}`}
                    className="text-ink-dim hover:text-goal"
                    onClick={() => s.set({ stops: s.stops.filter((x) => x !== id) })}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              );
            })}
            {isDemo ? (
              <Select value="" onValueChange={(v) => {
                if (!s.stops.includes(v) && v !== s.start && s.stops.length < 15)
                  s.set({ stops: [...s.stops, v] });
              }}>
                <SelectTrigger aria-label="Thêm điểm giao">
                  <SelectValue placeholder="+ Thêm điểm giao…" />
                </SelectTrigger>
                <SelectContent>
                  {s.graphData?.nodes
                    .filter((n) => n.id !== s.start && !s.stops.includes(n.id))
                    .map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.name ?? n.id}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <Button variant="secondary" size="sm"
                className={s.pickTarget === "stop" ? "border-algo-frontier text-algo-frontier" : ""}
                onClick={() => s.set({ pickTarget: s.pickTarget === "stop" ? null : "stop" })}>
                <Crosshair /> Thêm điểm từ bản đồ
              </Button>
            )}
          </div>
        </Field>
        {s.stops.length > 0 && (
          <Field label="Phương pháp tối ưu thứ tự"
            tip="Held-Karp cho nghiệm tối ưu tuyệt đối (tối đa 15 điểm); NN + 2-opt và SA là xấp xỉ nhanh.">
            <MultiButtons />
          </Field>
        )}
      </Section>

      </div>
      {/* CTA ghim đáy panel — luôn nhìn thấy (DESIGN 4, duyệt v4) */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-surface-border px-4 py-3">
        <Button size="lg" className="w-full" disabled={s.running} onClick={() => void s.runRoute()}>
          {s.running ? <Loader2 className="animate-spin" /> : <Play />}
          {s.running ? "Đang chạy…" : "Chạy thuật toán"}
        </Button>
        {s.graphLoading && <Skeleton className="h-4 w-full" />}
      </div>
    </aside>
  );
}

function MultiButtons() {
  const s = useApp();
  const [method, setMethod] = React.useState<TspMethod>("held_karp");
  const tooMany = method === "held_karp" && s.stops.length > 14;
  return (
    <div className="flex flex-col gap-1.5">
      <Select value={method} onValueChange={(v) => setMethod(v as TspMethod)}>
        <SelectTrigger aria-label="Phương pháp TSP"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="held_karp">Held-Karp — tối ưu tuyệt đối</SelectItem>
          <SelectItem value="nn_2opt">NN + 2-opt — xấp xỉ nhanh</SelectItem>
          <SelectItem value="sa">Simulated Annealing — 5 seed</SelectItem>
        </SelectContent>
      </Select>
      {tooMany && (
        <p className="text-[11px] text-algo-path">
          Held-Karp nhận tối đa 15 điểm (kể cả điểm Đi) — hãy dùng NN+2-opt hoặc SA.
        </p>
      )}
      <Button variant="secondary" disabled={s.multiRunning || tooMany}
        onClick={() => void s.runMulti(method)}>
        {s.multiRunning ? <Loader2 className="animate-spin" /> : <ListOrdered />}
        {s.multiRunning ? "Đang tối ưu…" : "Tối ưu thứ tự"}
      </Button>
    </div>
  );
}
