"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  const selectedLabel = language === "en" ? "English" : "Tiếng Việt";

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger
        aria-label="Chọn ngôn ngữ"
        title={`Ngôn ngữ: ${selectedLabel}`}
        className={cn(
          "h-9 w-[8.75rem] gap-2 rounded-lg border-surface-border/80 bg-surface-control/80 px-2.5 text-xs shadow-none max-[959px]:w-11 max-[959px]:justify-center max-[959px]:px-2 max-[959px]:[&>svg]:hidden",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Languages className="size-4 shrink-0 text-algo-frontier" aria-hidden="true" />
          <span className="truncate font-medium max-[959px]:sr-only">{selectedLabel}</span>
        </span>
      </SelectTrigger>
      <SelectContent align="end" sideOffset={6} className="min-w-[10rem]">
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="vi">Tiếng Việt</SelectItem>
      </SelectContent>
    </Select>
  );
}
