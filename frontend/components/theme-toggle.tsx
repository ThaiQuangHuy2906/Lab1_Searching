"use client";

import { Palette } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { useApp } from "@/lib/store";
import { THEME_OPTIONS, themeOption, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function ThemeSwatches({ colors }: { colors: readonly [string, string, string] }) {
  return (
    <span className="flex -space-x-1" aria-hidden="true">
      {colors.map((color) => (
        <span
          key={color}
          className="size-3.5 rounded-full border border-white/80 shadow-sm"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}

// Giữ tên export cũ để hai trang không phải biết implementation đã đổi từ
// nút toggle Sáng/Tối thành bộ chọn palette đầy đủ.
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useApp((state) => state.theme);
  const setTheme = useApp((state) => state.setTheme);
  const selected = themeOption(theme);

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as Theme)}>
      <SelectTrigger
        aria-label="Chọn giao diện"
        title={`Giao diện: ${selected.label}`}
        className={cn(
          "h-9 w-[10.5rem] gap-2 rounded-xl border-surface-border/80 bg-surface-control/80 px-2.5 text-xs shadow-none max-[900px]:w-11 max-[900px]:justify-center max-[900px]:px-2 max-[900px]:[&>svg]:hidden",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Palette className="size-4 shrink-0 text-algo-frontier" aria-hidden="true" />
          <span className="truncate font-medium max-[900px]:sr-only">{selected.label}</span>
        </span>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={6} className="min-w-[17rem]">
        {THEME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="py-2">
            <span className="flex items-center gap-3 pr-1">
              <ThemeSwatches colors={option.swatches} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{option.label}</span>
                <span className="block truncate text-[11px] font-normal text-ink-dim">
                  {option.description}
                </span>
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
