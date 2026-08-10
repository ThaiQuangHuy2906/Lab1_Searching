"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Crosshair, Route as RouteIcon, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { useApp } from "@/lib/store";
import { isStopOptionAllowed } from "@/lib/interaction-policy";
import { moveStop, type StopMoveDirection } from "@/lib/single-run-panel-policy";

const MAX_STOPS = 15;

export function AtspSetup() {
  const s = useApp();
  const isDemo = s.graph === "demo";
  const busy = s.running || s.comparing || s.multiRunning;
  const atLimit = s.stops.length >= MAX_STOPS;
  const rowRefs = React.useRef(new Map<string, HTMLLIElement>());
  const [announcement, setAnnouncement] = React.useState("");
  const nameOf = React.useCallback((id: string) => (
    s.graphData?.nodes.find((node) => node.id === id)?.name ?? id
  ), [s.graphData]);

  const reorder = (index: number, direction: StopMoveDirection) => {
    const moved = moveStop(s.stops, index, direction, nameOf);
    if (!moved) return;
    const movedId = moved.order[moved.movedIndex];
    setAnnouncement(moved.announcement);
    s.set({ stops: moved.order });
    window.requestAnimationFrame(() => rowRefs.current.get(movedId)?.focus());
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-dim">Điểm giao hàng</p>
          {s.stops.length > 0 && <p className="mt-0.5 text-xs text-ink-faint">Thứ tự đang chọn</p>}
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
            <p className="mt-1 text-xs leading-5 text-ink-dim">
              Thêm ít nhất một điểm. Thứ tự này được giữ nguyên khi đi lần lượt và là thứ tự ban đầu để ATSP tối ưu.
            </p>
          </div>
        </div>
      ) : (
        <ol className="flex flex-col gap-1.5" aria-label="Thứ tự điểm giao đang chọn">
          {s.stops.map((id, index) => {
            const name = nameOf(id);
            return (
              <li
                key={id}
                ref={(node) => {
                  if (node) rowRefs.current.set(id, node);
                  else rowRefs.current.delete(id);
                }}
                tabIndex={-1}
                className="flex min-h-11 items-center gap-1 rounded-lg border border-surface-border bg-surface-control pl-2.5 text-xs outline-none transition-colors hover:border-surface-strong focus-visible:ring-2 focus-visible:ring-algo-frontier"
              >
                <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-algo-path font-mono text-xs font-bold text-zinc-950">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 break-words px-1 font-medium text-ink">{name}</span>
                <button
                  type="button"
                  aria-label={`Chuyển ${name} lên`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-raised hover:text-ink disabled:opacity-35"
                  disabled={busy || index === 0}
                  onClick={() => reorder(index, "up")}
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Chuyển ${name} xuống`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-surface-raised hover:text-ink disabled:opacity-35"
                  disabled={busy || index === s.stops.length - 1}
                  onClick={() => reorder(index, "down")}
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label={`Xóa điểm giao ${name} ở vị trí ${index + 1}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-goal/10 hover:text-goal disabled:opacity-35"
                  disabled={busy}
                  onClick={() => s.set({ stops: s.stops.filter((stop) => stop !== id) })}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

      {isDemo ? (
        <Select
          value=""
          disabled={busy || atLimit}
          onValueChange={(value) => {
            // Goal is an independent inactive draft in multi-point mode and
            // must not constrain the delivery-stop draft.
            if (isStopOptionAllowed(value, s.start, null, s.stops) && !atLimit)
              s.set({ stops: [...s.stops, value] });
          }}
        >
          <SelectTrigger aria-label="Thêm điểm giao">
            <SelectValue placeholder={atLimit ? "Đã đủ 15 điểm giao" : "Thêm điểm giao…"} />
          </SelectTrigger>
          <SelectContent>
            {s.graphData?.nodes
              .filter((node) => isStopOptionAllowed(node.id, s.start, null, s.stops))
              .map((node) => <SelectItem key={node.id} value={node.id}>{node.name ?? node.id}</SelectItem>)}
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
          {atLimit ? "Đã đủ 15 điểm giao" : s.pickTarget === "stop" ? "Đang chọn trên bản đồ…" : "Thêm điểm từ bản đồ"}
        </Button>
      )}

      {atLimit && <p className="text-xs leading-5 text-ink-dim">Đã đạt giới hạn {MAX_STOPS} điểm giao.</p>}

      <div className="rounded-lg border border-surface-border bg-surface-control/55 px-2.5 py-2">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <label htmlFor="return-to-start" className="text-xs font-medium leading-5 text-ink">
            Quay về điểm Đi sau điểm giao cuối
          </label>
          <Switch
            id="return-to-start"
            checked={s.returnToStart}
            disabled={busy}
            onCheckedChange={s.setReturnToStart}
          />
        </div>
        <p className="text-xs leading-5 text-ink-dim">
          {s.returnToStart
            ? "Vòng kín: thêm đúng một chặng quay về Đi; Đi không trở thành điểm giao mới."
            : "Hành trình mở: kết thúc tại điểm giao cuối."}
        </p>
      </div>
    </div>
  );
}
