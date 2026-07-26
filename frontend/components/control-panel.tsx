"use client";

// Panel trái 320px — thứ tự nhóm CỐ ĐỊNH theo DESIGN.md §4:
// Bối cảnh -> Thuật toán -> Hành trình -> nút CHẠY lớn.

import * as React from "react";
import { Crosshair, ListOrdered, Loader2, Play, X } from "lucide-react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Skeleton } from "./ui/skeleton";
import { ALGO_LABEL, useApp } from "@/lib/store";
import type { Algorithm, Mode, TimeSlot, TspMethod } from "@/lib/types";

const SLOTS: TimeSlot[] = ["07:30", "12:00", "17:30", "22:00"];
const MODES: { v: Mode; label: string }[] = [
  { v: "balanced", label: "Cân bằng (mặc định)" },
  { v: "time", label: "Nhanh nhất" },
  { v: "distance", label: "Ngắn nhất" },
];

function Row({ label, children, tip }: {
  label: string; children: React.ReactNode; tip?: string;
}) {
  const lab = <span className="text-xs font-medium text-ink-dim">{label}</span>;
  return (
    <label className="flex flex-col gap-1.5">
      {tip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-fit cursor-help underline decoration-dotted underline-offset-2">{lab}</span>
          </TooltipTrigger>
          <TooltipContent>{tip}</TooltipContent>
        </Tooltip>
      ) : lab}
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-surface-border px-4 py-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">{title}</div>
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

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-r border-surface-border bg-surface-panel">
      <div className="border-b border-surface-border px-4 py-3">
        <h1 className="text-sm font-bold">Định tuyến giao thông TP.HCM</h1>
        <p className="text-xs text-ink-dim">Shipper giao hàng đa điểm — Lab 1 AI</p>
      </div>

      <Section title="Bối cảnh">
        <Row label="Đồ thị">
          <Select value={s.graph} onValueChange={(v) => void s.loadGraph(v as "demo" | "real")}>
            <SelectTrigger aria-label="Đồ thị"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">G_demo — 51 địa danh thật</SelectItem>
              <SelectItem value="real">G_real — 2 118 nút OSM</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Khung giờ">
          <div className="grid grid-cols-4 gap-1">
            {SLOTS.map((slot) => (
              <Button
                key={slot}
                size="sm"
                variant={s.slot === slot ? "default" : "secondary"}
                className="px-0 font-mono text-xs"
                onClick={() => s.setSlot(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        </Row>
        <Row label="Chế độ tối ưu">
          <Select value={s.mode} onValueChange={(v) => s.set({ mode: v as Mode })}>
            <SelectTrigger aria-label="Chế độ tối ưu"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.v} value={m.v}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <div className="flex items-center justify-between">
          <Row label="Lớp ùn tắc" tip="Tô màu cạnh theo mức ùn tắc 1→5 của khung giờ đang chọn."><span /></Row>
          <Switch checked={s.trafficLayer} onCheckedChange={(v) => s.set({ trafficLayer: v })} aria-label="Lớp ùn tắc" />
        </div>
        <div className="flex items-center justify-between">
          <Row label="Chế độ offline" tip="Tắt bản đồ nền, vẽ thuần đồ thị — bảo hiểm khi wifi chập chờn."><span /></Row>
          <Switch checked={s.offlineMode} onCheckedChange={(v) => s.set({ offlineMode: v })} aria-label="Chế độ offline" />
        </div>
      </Section>

      <Section title="Thuật toán">
        <Row label="Thuật toán" tip="UCS/Dijkstra/A*/Bidirectional/IDA* đảm bảo tối ưu; BFS/DFS/IDDFS/Greedy/Beam thì không.">
          <Select value={s.algorithm} onValueChange={(v) => s.set({ algorithm: v as Algorithm })}>
            <SelectTrigger aria-label="Thuật toán"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ALGO_LABEL) as Algorithm[]).map((a) => (
                <SelectItem key={a} value={a}>{ALGO_LABEL[a]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        {s.algorithm === "beam" && (
          <Row label="Beam width (k)" tip="Số node tốt nhất giữ lại mỗi lớp — k nhỏ chạy nhanh nhưng có thể không tìm thấy đường.">
            <input
              type="number" min={1}
              className="h-9 rounded-lg border border-surface-border bg-surface-panel px-3 font-mono text-sm"
              placeholder={isDemo ? "mặc định 5" : "mặc định 50"}
              value={s.beamWidth}
              onChange={(e) => s.set({ beamWidth: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Row>
        )}
        {s.algorithm === "idastar" && (
          <Row label="ε — nới ngưỡng (giây)" tip="Mỗi vòng IDA* nới ngưỡng thêm ε giây; nghiệm nằm trong C* + ε.">
            <input
              type="number" min={0.1} step={0.5}
              className="h-9 rounded-lg border border-surface-border bg-surface-panel px-3 font-mono text-sm"
              placeholder="mặc định 5"
              value={s.epsilon}
              onChange={(e) => s.set({ epsilon: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Row>
        )}
        {!isDemo && (
          <div className="flex items-center justify-between">
            <Row label="Trace trên G_real" tip="Trace trên G_real có thể rất lớn — bật khi thật cần."><span /></Row>
            <Switch checked={s.traceOnReal} onCheckedChange={(v) => s.set({ traceOnReal: v })} aria-label="Trace trên G_real" />
          </div>
        )}
      </Section>

      <Section title="Hành trình">
        <Row label="Đi (điểm xuất phát)"><NodePicker kind="start" /></Row>
        <Row label="Đến (điểm đích)"><NodePicker kind="goal" /></Row>
        <Row label={`Điểm giao hàng (${s.stops.length}/15)`} tip="Danh sách điểm cần ghé — bài toán ATSP tối ưu thứ tự ghé.">
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
        </Row>
        {s.stops.length > 0 && (
          <Row label="Phương pháp tối ưu thứ tự" tip="Held-Karp cho nghiệm tối ưu tuyệt đối (≤15 điểm); NN+2-opt và SA là xấp xỉ nhanh.">
            <MultiButtons />
          </Row>
        )}
      </Section>

      <div className="mt-auto flex flex-col gap-2 px-4 py-4">
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
