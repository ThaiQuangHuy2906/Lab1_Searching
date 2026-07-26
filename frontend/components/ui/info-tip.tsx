"use client";

// Icon ? cạnh label — hover/focus mới hiện giải thích (DESIGN.md §8).
// Thay cho kiểu gạch-chấm-dưới label (bỏ sau duyệt vòng 2).

import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Giải thích: ${text}`}
          className="inline-flex shrink-0 cursor-help align-middle text-ink-dim hover:text-ink"
        >
          <CircleHelp className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
