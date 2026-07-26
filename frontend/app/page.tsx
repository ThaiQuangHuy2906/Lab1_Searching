"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { ControlPanel } from "@/components/control-panel";
import { Drawer } from "@/components/drawer/drawer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/store";

// Map phải 'use client' + tắt SSR (PROMPT-MASTER 6.5)
const MapView = dynamic(
  () => import("@/components/map-view").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-40 w-40" />
      </div>
    ),
  },
);

export default function Home() {
  const loadGraph = useApp((s) => s.loadGraph);
  React.useEffect(() => {
    void loadGraph("demo");
  }, [loadGraph]);

  return (
    <TooltipProvider delayDuration={250}>
      <main className="flex h-screen">
        <ControlPanel />
        <div className="relative min-w-0 flex-1">
          <MapView />
          <Link
            href="/benchmark"
            className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-panel/95 px-3 py-1.5 text-xs text-ink-dim hover:text-ink"
          >
            <BarChart3 className="size-3.5" /> Benchmark
          </Link>
        </div>
        <Drawer />
      </main>
    </TooltipProvider>
  );
}
