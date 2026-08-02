"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BarChart3, WifiOff } from "lucide-react";
import { ControlPanel } from "@/components/control-panel";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <div className="relative flex h-full items-center justify-center bg-surface-map">
        <Skeleton className="h-[72%] w-[68%] opacity-50" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <Skeleton className="h-28 w-36" />
          <Skeleton className="h-40 w-10" />
        </div>
      </div>
    ),
  },
);

export default function Home() {
  const loadGraph = useApp((s) => s.loadGraph);
  const offline = useApp((s) => s.offlineMode);
  React.useEffect(() => {
    void loadGraph("demo");
  }, [loadGraph]);

  return (
    <TooltipProvider delayDuration={250}>
      <main className="flex h-screen">
        <ControlPanel />
        <div className="relative min-w-0 flex-1">
          <MapView />
          <div
            aria-label="Công cụ ứng dụng"
            className="absolute right-3 top-3 z-20 flex h-11 items-center gap-1 rounded-lg border border-surface-strong bg-surface-raised p-1 shadow-float"
          >
            {offline && (
              <span className="flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface-control px-2.5 text-xs font-medium text-ink">
                <WifiOff className="size-3.5 text-algo-frontier" />
                Ngoại tuyến
              </span>
            )}
            <Link
              href="/benchmark"
              className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-dim transition-colors duration-150 hover:bg-surface-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier"
            >
              <BarChart3 className="size-3.5" /> Benchmark
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <Drawer />
      </main>
    </TooltipProvider>
  );
}
