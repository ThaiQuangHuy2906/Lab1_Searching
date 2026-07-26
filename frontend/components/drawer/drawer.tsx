"use client";

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

  if (!open) {
    return (
      <div className="relative z-10 flex h-full items-start border-l border-surface-border bg-surface-panel p-2 shadow-float">
        <Button variant="ghost" size="iconSm" aria-label="Mở panel kết quả"
          onClick={() => set({ drawerOpen: true })}>
          <PanelRightOpen />
        </Button>
      </div>
    );
  }
  return (
    <aside className="relative z-10 flex h-full w-[400px] shrink-0 flex-col border-l border-surface-border bg-surface-panel shadow-float">
      <div className="flex items-center gap-2 border-b border-surface-border px-3 py-2">
        <span className="flex-1 text-sm font-bold">Kết quả</span>
        <Button variant="ghost" size="iconSm" aria-label="Thu gọn panel kết quả"
          onClick={() => set({ drawerOpen: false })}>
          <PanelRightClose />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <Tabs value={tab} onValueChange={(v) => set({ drawerTab: v as DrawerTab })}>
          <TabsList>
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
