"use client";

import * as React from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { MetricsTab } from "./metrics-tab";
import { ExplainTab } from "./explain-tab";
import { CompareTab } from "./compare-tab";
import { useApp, type DrawerTab } from "@/lib/store";

export function Drawer() {
  const open = useApp((s) => s.drawerOpen);
  const tab = useApp((s) => s.drawerTab);
  const set = useApp((s) => s.set);
  const openButtonRef = React.useRef<HTMLButtonElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const previousOpen = React.useRef(open);

  React.useEffect(() => {
    if (previousOpen.current === open) return;
    previousOpen.current = open;
    const frame = window.requestAnimationFrame(() => {
      (open ? closeButtonRef.current : openButtonRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  if (!open) {
    return (
      <div className="relative z-10 flex h-full items-start border-l border-surface-border bg-surface-rail p-2 shadow-float">
        <Button ref={openButtonRef} variant="ghost" size="iconSm" aria-label="Mở panel kết quả"
          onClick={() => set({ drawerOpen: true })}>
          <PanelRightOpen />
        </Button>
      </div>
    );
  }
  return (
    <aside aria-label="Kết quả định tuyến" className="relative z-10 flex h-full w-[400px] shrink-0 flex-col border-l border-surface-border bg-surface-rail shadow-float max-[900px]:w-[280px]">
      <div className="flex h-[60px] shrink-0 items-center gap-2 border-b border-surface-border px-4">
        <div className="flex-1">
          <span className="text-[15px] font-bold leading-5">Kết quả</span>
          <p className="text-xs text-ink-dim">Số liệu, giải thích và đối chiếu hành trình</p>
        </div>
        <Button ref={closeButtonRef} variant="ghost" size="iconSm" aria-label="Thu gọn panel kết quả"
          onClick={() => set({ drawerOpen: false })}>
          <PanelRightClose />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
        <Tabs value={tab} onValueChange={(v) => set({ drawerTab: v as DrawerTab })}>
          <TabsList className="sticky top-0 z-20 shadow-sm">
            <TabsTrigger value="metrics">Số liệu</TabsTrigger>
            <TabsTrigger value="explain">Giải thích</TabsTrigger>
            <TabsTrigger value="compare">So sánh</TabsTrigger>
          </TabsList>
          <TabsContent value="metrics"><MetricsTab /></TabsContent>
          <TabsContent value="explain"><ExplainTab /></TabsContent>
          <TabsContent value="compare"><CompareTab /></TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
