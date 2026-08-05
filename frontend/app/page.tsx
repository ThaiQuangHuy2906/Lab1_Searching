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
      <main className="pastel-app-bg flex h-screen gap-2 overflow-hidden p-2">
        <ControlPanel />
        <div className="pastel-map-frame relative min-w-0 flex-1 overflow-hidden rounded-[22px] border border-surface-border/80">
          <MapView />
          <div
            aria-label="Công cụ ứng dụng"
            role="toolbar"
            className="pastel-floating absolute right-3 top-3 z-20 flex h-11 items-center gap-1 rounded-2xl border border-surface-strong/80 p-1"
          >
            {offline && (
              <span
                aria-label="Trạng thái: Ngoại tuyến"
                className="flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface-control px-2.5 text-xs font-medium text-ink"
              >
                <WifiOff className="size-3.5 text-algo-frontier" />
                <span className="max-[900px]:sr-only">Ngoại tuyến</span>
              </span>
            )}
            <Link
              href="/benchmark"
              aria-label="Mở trang Benchmark"
              className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-dim transition-colors duration-150 hover:bg-surface-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier"
            >
              <BarChart3 className="size-3.5" />
              <span className="max-[900px]:sr-only">Benchmark</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <Drawer />
      </main>
    </TooltipProvider>
  );
}
