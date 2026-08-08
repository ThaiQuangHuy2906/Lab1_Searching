"use client";

// Icon ? cạnh label — hover/focus mới hiện giải thích (DESIGN.md §8).
// Thay cho kiểu gạch-chấm-dưới label (bỏ sau duyệt vòng 2).

import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export function InfoTip({ text, label = "Mở giải thích" }: { text: string; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="-m-2 inline-flex size-9 shrink-0 cursor-help items-center justify-center rounded-lg align-middle text-ink-dim transition-colors hover:bg-algo-frontier/10 hover:text-algo-frontier"
        >
          <CircleHelp className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
