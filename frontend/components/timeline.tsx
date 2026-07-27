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

  // mirror useAnimation: toggling trace off on G_real hides the player NOW
  const n = graph === "real" && !traceOnReal ? 0 : trace?.trace.length ?? 0;

  // playback clock
  React.useEffect(() => {
    if (!playing || n === 0) return;
    const id = window.setInterval(() => {
      const s = useApp.getState();
      if (s.stepIdx >= n - 1) {
        set({ playing: false });
      } else {
        set({ stepIdx: s.stepIdx + 1 });
      }
    }, BASE_MS / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, n, set]);

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
        togglePlay();
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
  }, [n, togglePlay, setStep, set]);

  if (n === 0) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-surface-border bg-surface-panel px-4 py-2.5 shadow-float">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="iconSm" aria-label="Lùi một bước"
          onClick={() => { setStep(stepIdx - 1); set({ playing: false }); }}
        >
          <SkipBack />
        </Button>
        <Button
          size="icon"
          aria-label={playing ? "Tạm dừng" : "Phát"}
          onClick={togglePlay}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost" size="iconSm" aria-label="Tiến một bước"
          onClick={() => { setStep(stepIdx + 1); set({ playing: false }); }}
        >
          <SkipForward />
        </Button>
      </div>
      <Slider
        className="w-56 md:w-72"
        min={0}
        max={n - 1}
        step={1}
        value={[Math.min(stepIdx, n - 1)]}
        onValueChange={([v]) => { setStep(v); set({ playing: false }); }}
        aria-label="Bước hiện tại"
      />
      <span className="whitespace-nowrap font-mono text-xs text-ink-dim">
        Bước <span className="font-bold text-ink">{Math.min(stepIdx, n - 1) + 1}</span>/{n}
      </span>
      <Select value={String(speed)} onValueChange={(v) => set({ speed: Number(v) })}>
        <SelectTrigger className="h-8 w-[76px] text-xs" aria-label="Tốc độ phát">
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
