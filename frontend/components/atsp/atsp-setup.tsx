"use client";

import { Crosshair, ListOrdered, Loader2, Route as RouteIcon, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { useApp } from "@/lib/store";
import type { TspMethod } from "@/lib/types";

const MAX_STOPS = 15;
const HELD_KARP_MAX_STOPS = 14;

const METHOD_DETAILS: Record<TspMethod, {
  label: string;
  option: string;
  description: string;
  guarantee: boolean;
}> = {
  held_karp: {
    label: "Held-Karp",
    option: "Held-Karp — tối ưu tuyệt đối",
    description: "Nghiệm tối ưu tuyệt đối; tối đa 14 điểm giao cộng với điểm Đi.",
    guarantee: true,
  },
  nn_2opt: {
    label: "NN + 2-opt",
    option: "NN + 2-opt — xấp xỉ nhanh",
    description: "Nghiệm xấp xỉ bằng láng giềng gần rồi cải thiện thứ tự ghé.",
    guarantee: false,
  },
  sa: {
    label: "Simulated Annealing",
    option: "Simulated Annealing — 5 seed",
    description: "Nghiệm xấp xỉ qua 5 seed theo cấu hình hiện tại.",
    guarantee: false,
  },
};

export function AtspSetup() {
  const s = useApp();
  const isDemo = s.graph === "demo";
  const busy = s.running || s.comparing || s.multiRunning;
  const atLimit = s.stops.length >= MAX_STOPS;
  const method = METHOD_DETAILS[s.tspMethod];
  const tooManyForHeldKarp = s.tspMethod === "held_karp" &&
    s.stops.length > HELD_KARP_MAX_STOPS;
  const startName = s.start
    ? s.graphData?.nodes.find((node) => node.id === s.start)?.name ?? s.start
    : "Chưa chọn điểm Đi";
  const heldKarpWarningId = "held-karp-limit-warning";
  const runningStatusId = "atsp-running-status";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-dim">Điểm giao hàng</p>
          {s.stops.length > 0 && (
            <p className="mt-0.5 text-[11px] text-ink-faint">Thứ tự đang nhập</p>
          )}
        </div>
        <Badge className="shrink-0 font-mono">{s.stops.length}/{MAX_STOPS}</Badge>
      </div>

      {s.stops.length === 0 ? (
        <div className="flex gap-2.5 rounded-lg border border-dashed border-surface-strong bg-surface-control/60 p-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-panel text-algo-path">
            <RouteIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink">Chưa có điểm giao</p>
            <p className="mt-1 text-[11px] leading-[17px] text-ink-dim">
              Chọn điểm Đi, thêm ít nhất một điểm giao, rồi chọn phương pháp để tối ưu thứ tự ghé.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="rounded-lg border border-algo-path/30 bg-algo-path/5 p-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <Badge variant="warn">Chế độ nhiều điểm</Badge>
              <span className="font-mono text-[11px] text-ink-dim">
                {s.stops.length} điểm giao
              </span>
            </div>
            <p className="mt-1.5 truncate text-[11px] leading-4 text-ink-dim" title={startName}>
              Đi: <span className="font-medium text-ink">{startName}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-dim">
              Điểm Đến không tham gia lần tối ưu này.
            </p>
          </div>

          <ol className="flex flex-col gap-1.5" aria-label="Thứ tự điểm giao đang nhập">
            {s.stops.map((id, index) => {
              const name = s.graphData?.nodes.find((node) => node.id === id)?.name ?? id;
              return (
                <li
                  key={id}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-surface-border bg-surface-control pl-2.5 text-xs transition-colors hover:border-surface-strong"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 items-center justify-center rounded-full bg-algo-path font-mono text-[10px] font-bold text-zinc-950"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink" title={name}>
                    {name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Xóa điểm giao: ${name}`}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-goal/10 hover:text-goal focus-visible:ring-offset-surface-panel disabled:pointer-events-none disabled:opacity-55"
                    disabled={busy}
                    onClick={() => s.set({ stops: s.stops.filter((stop) => stop !== id) })}
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {isDemo ? (
        <Select
          value=""
          disabled={busy || atLimit}
          onValueChange={(value) => {
            if (!s.stops.includes(value) && value !== s.start && s.stops.length < MAX_STOPS)
              s.set({ stops: [...s.stops, value] });
          }}
        >
          <SelectTrigger aria-label="Thêm điểm giao">
            <SelectValue placeholder={atLimit ? "Đã đủ 15 điểm giao" : "Thêm điểm giao…"} />
          </SelectTrigger>
          <SelectContent>
            {s.graphData?.nodes
              .filter((node) => node.id !== s.start && !s.stops.includes(node.id))
              .map((node) => (
                <SelectItem key={node.id} value={node.id}>{node.name ?? node.id}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy || atLimit}
          className={s.pickTarget === "stop" ? "border-algo-frontier text-algo-frontier" : ""}
          onClick={() => s.set({ pickTarget: s.pickTarget === "stop" ? null : "stop" })}
        >
          <Crosshair />
          {atLimit
            ? "Đã đủ 15 điểm giao"
            : s.pickTarget === "stop" ? "Đang chọn trên bản đồ…" : "Thêm điểm từ bản đồ"}
        </Button>
      )}

      {atLimit && (
        <p className="text-[11px] leading-4 text-ink-dim">
          Đã đạt giới hạn {MAX_STOPS} điểm giao.
        </p>
      )}

      {s.stops.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-surface-border bg-surface-control/55 p-2.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
              Tối ưu thứ tự ghé (ATSP)
            </p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">
              Chọn phương pháp rồi chạy tối ưu cho Đi + danh sách điểm giao.
            </p>
          </div>
          <Select
            value={s.tspMethod}
            disabled={busy}
            onValueChange={(value) => s.set({ tspMethod: value as TspMethod })}
          >
            <SelectTrigger aria-label="Phương pháp ATSP"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(METHOD_DETAILS) as TspMethod[]).map((value) => (
                <SelectItem key={value} value={value}>{METHOD_DETAILS[value].option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-start gap-2">
            <Badge variant={method.guarantee ? "ok" : "warn"} className="shrink-0">
              {method.guarantee ? "Tối ưu tuyệt đối" : "Nghiệm xấp xỉ"}
            </Badge>
            <p className="min-w-0 text-[11px] leading-4 text-ink-dim">
              <span className="font-medium text-ink">{method.label}.</span>{" "}
              {method.description}
            </p>
          </div>
          {tooManyForHeldKarp && (
            <p
              id={heldKarpWarningId}
              role="status"
              className="rounded-lg border border-algo-path/35 bg-algo-path/10 px-2.5 py-2 text-[11px] leading-4 text-ink"
            >
              Held-Karp nhận tối đa 14 điểm giao + 1 điểm Đi (15 điểm tổng). Hãy đổi sang NN + 2-opt hoặc Simulated Annealing; danh sách sẽ được giữ nguyên.
            </p>
          )}
          <Button
            variant="secondary"
            className="w-full border-algo-path/45 bg-algo-path/10 hover:border-algo-path/70 hover:bg-algo-path/15"
            disabled={busy || tooManyForHeldKarp}
            aria-describedby={tooManyForHeldKarp
              ? heldKarpWarningId
              : s.multiRunning ? runningStatusId : undefined}
            onClick={() => void s.runMulti(s.tspMethod)}
          >
            {s.multiRunning ? <Loader2 className="animate-spin" /> : <ListOrdered />}
            {s.multiRunning ? "Đang tối ưu…" : "Tối ưu thứ tự"}
          </Button>
          {s.multiRunning && (
            <p
              id={runningStatusId}
              role="status"
              aria-live="polite"
              className="text-center text-[11px] leading-4 text-ink-dim"
            >
              Đang tính ma trận chi phí và thứ tự ghé…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
