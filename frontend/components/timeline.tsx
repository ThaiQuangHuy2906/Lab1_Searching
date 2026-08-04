"use client";

// SIGNATURE của app (DESIGN.md §5): thanh trình phát nổi giữa-đáy bản đồ.
// Timeline và bảng g/h/f đọc CÙNG stepIdx trong store — kéo là cả bản đồ
// lẫn bảng cùng nhảy. Phím tắt: Space play/pause, mũi tên lùi/tiến.

import * as React from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";
import { activeTimelineLength } from "@/lib/atsp-trace-policy";
import { useApp } from "@/lib/store";

const BASE_MS = 500;
const SPEEDS = [0.5, 1, 2, 4, 8, 16];
const INTERACTIVE_SHORTCUT_TARGETS = [
  "input", "textarea", "select", "button", "a[href]", "[contenteditable]",
  "[role='button']", "[role='checkbox']", "[role='combobox']",
  "[role='listbox']", "[role='menuitem']", "[role='option']",
  "[role='radio']", "[role='slider']", "[role='spinbutton']",
  "[role='switch']", "[role='tab']", "[role='textbox']",
].join(",");

function ownsKeyboardInput(target: EventTarget | null): boolean {
  return target instanceof Element
    && (target.closest(INTERACTIVE_SHORTCUT_TARGETS) !== null
      || (target instanceof HTMLElement && target.isContentEditable));
}

export function Timeline() {
  const trace = useApp((s) => s.trace);
  const stepIdx = useApp((s) => s.stepIdx);
  const playing = useApp((s) => s.playing);
  const speed = useApp((s) => s.speed);
  const setStep = useApp((s) => s.setStep);
  const togglePlay = useApp((s) => s.togglePlay);
  const set = useApp((s) => s.set);
  const graph = useApp((s) => s.graph);
  const traceOnReal = useApp((s) => s.traceOnReal);
  const optimizationTrace = useApp((s) => s.optimizationTrace);
  const timelineSource = useApp((s) => s.timelineSource);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  // Route and optimizer traces share player controls, not event shapes.
  const n = activeTimelineLength(
    timelineSource, trace, optimizationTrace, graph, traceOnReal,
  );
  const isOptimization = timelineSource === "optimization";
  const optimizerEvent = isOptimization && optimizationTrace
    ? optimizationTrace.events[Math.min(stepIdx, optimizationTrace.events.length - 1)]
    : null;

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (reducedMotion && playing) set({ playing: false });
  }, [reducedMotion, playing, set]);

  const safeTogglePlay = React.useCallback(() => {
    if (reducedMotion) {
      set({ playing: false });
      return;
    }
    togglePlay();
  }, [reducedMotion, set, togglePlay]);

  // playback clock
  React.useEffect(() => {
    if (!playing || n === 0 || reducedMotion) return;
    const id = window.setInterval(() => {
      const s = useApp.getState();
      if (s.stepIdx >= n - 1) {
        set({ playing: false });
      } else {
        set({ stepIdx: s.stepIdx + 1 });
      }
    }, BASE_MS / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, n, set, reducedMotion]);

  // keyboard: Space / ArrowLeft / ArrowRight (ignored while typing)
  React.useEffect(() => {
    if (n === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey
        || ownsKeyboardInput(e.target)
      ) return;
      if (e.code === "Space") {
        e.preventDefault();
        safeTogglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setStep(useApp.getState().stepIdx - 1);
        set({ playing: false });
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setStep(useApp.getState().stepIdx + 1);
        set({ playing: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, safeTogglePlay, setStep, set]);

  if (n === 0) return null;

  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex h-[52px] w-[min(760px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2 rounded-lg border border-surface-strong bg-surface-raised px-2.5 py-2 shadow-float max-[900px]:overflow-x-auto">
      <span className="hidden max-w-40 truncate text-[11px] font-medium text-ink-dim min-[700px]:inline" title={isOptimization ? "Quá trình tối ưu thứ tự ghé" : "Các bước tìm đường"}>
        {isOptimization ? `ATSP · ${optimizationTrace?.method ?? "optimization"}` : "Tìm đường"}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="iconSm" aria-label="Lùi một bước"
          aria-keyshortcuts="ArrowLeft"
          disabled={stepIdx <= 0}
          onClick={() => { setStep(stepIdx - 1); set({ playing: false }); }}
        >
          <SkipBack />
        </Button>
        <Button
          size="icon"
          aria-label={playing ? "Tạm dừng" : "Phát"}
          aria-keyshortcuts="Space"
          disabled={reducedMotion}
          onClick={safeTogglePlay}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost" size="iconSm" aria-label="Tiến một bước"
          aria-keyshortcuts="ArrowRight"
          disabled={stepIdx >= n - 1}
          onClick={() => { setStep(stepIdx + 1); set({ playing: false }); }}
        >
          <SkipForward />
        </Button>
      </div>
      <Slider
        className="min-w-24 flex-1"
        min={0}
        max={n - 1}
        step={1}
        value={[Math.min(stepIdx, n - 1)]}
        onValueChange={([v]) => { setStep(v); set({ playing: false }); }}
        aria-label="Bước hiện tại"
      />
      <span className="min-w-[76px] whitespace-nowrap text-right font-mono text-xs text-ink-dim">
        {isOptimization ? "Sự kiện" : "Bước"} <span className="font-bold text-ink">{Math.min(stepIdx, n - 1) + 1}</span>/{n}
      </span>
      {optimizerEvent && (
        <span className="hidden whitespace-nowrap font-mono text-[10px] text-ink-faint min-[700px]:inline">
          Event #{optimizerEvent.ordinal} · {optimizationTrace?.recorded_events}/{optimizationTrace?.total_events}
          {optimizationTrace?.trace_truncated ? " · đã lấy mẫu" : ""}
        </span>
      )}
      <Select value={String(speed)} onValueChange={(v) => set({ speed: Number(v) })}>
        <SelectTrigger className="h-9 w-[72px] text-xs" aria-label="Tốc độ phát">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPEEDS.map((s) => (
            <SelectItem key={s} value={String(s)}>
              {String(s).replace(".", ",")}×
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
