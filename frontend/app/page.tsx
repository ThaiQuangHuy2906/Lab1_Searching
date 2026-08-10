"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BarChart3, PanelLeftOpen, PanelRightOpen, WifiOff } from "lucide-react";
import { ControlPanel } from "@/components/control-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { Drawer } from "@/components/drawer/drawer";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/lib/store";

const MapView = dynamic(
  () => import("@/components/map-view").then((module) => module.MapView),
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

const RouteComparisonWorkspace = dynamic(
  () => import("@/components/comparison/route-comparison-workspace")
    .then((module) => module.RouteComparisonWorkspace),
  { ssr: false },
);

type MobilePanel = "controls" | "results" | null;

export default function Home() {
  const loadGraph = useApp((state) => state.loadGraph);
  const offline = useApp((state) => state.offlineMode);
  const runKind = useApp((state) => state.runKind);
  const problemMode = useApp((state) => state.problemMode);
  const multiStrategy = useApp((state) => state.multiStrategy);
  const [mobilePanel, setMobilePanel] = React.useState<MobilePanel>(null);
  const [controlsOpen, setControlsOpen] = React.useState(true);
  const lastMobileTrigger = React.useRef<HTMLElement | null>(null);
  const wasMobilePanelOpen = React.useRef(false);
  const routeComparisonMode = runKind === "compare"
    && (problemMode === "two_point" || multiStrategy === "ordered_search");

  React.useEffect(() => {
    void loadGraph("demo");
  }, [loadGraph]);

  React.useEffect(() => {
    if (wasMobilePanelOpen.current && mobilePanel === null) {
      const frame = window.requestAnimationFrame(() => lastMobileTrigger.current?.focus());
      wasMobilePanelOpen.current = false;
      return () => window.cancelAnimationFrame(frame);
    }
    wasMobilePanelOpen.current = mobilePanel !== null;
  }, [mobilePanel]);

  React.useEffect(() => {
    // DeckGL/MapLibre react to resize without changing the controlled camera.
    // Dispatch once after the rail width changes; never fit/fly automatically.
    const frame = window.requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => window.cancelAnimationFrame(frame);
  }, [controlsOpen]);

  const openMobilePanel = (panel: Exclude<MobilePanel, null>) =>
    (event: React.MouseEvent<HTMLButtonElement>) => {
      lastMobileTrigger.current = event.currentTarget;
      setMobilePanel(panel);
    };

  return (
    <TooltipProvider delayDuration={250}>
      <main className="app-shell-surface relative flex h-screen min-w-0 gap-2 overflow-hidden p-2 max-[959px]:block max-[959px]:p-0">
        <ControlPanel
          mobileOpen={mobilePanel === "controls"}
          onMobileClose={() => setMobilePanel(null)}
          desktopOpen={controlsOpen}
          onDesktopOpenChange={setControlsOpen}
        />
        <div className="map-frame relative z-0 min-w-0 flex-1 overflow-hidden rounded-xl border border-surface-border/80 max-[959px]:h-[100dvh] max-[959px]:rounded-none max-[959px]:border-0">
          {routeComparisonMode ? <RouteComparisonWorkspace /> : <MapView />}
          <div
            aria-label="Công cụ ứng dụng"
            role="toolbar"
            className="floating-chrome absolute right-3 top-3 z-20 flex h-11 items-center gap-1 rounded-lg border border-surface-strong/80 p-1 max-[959px]:hidden"
          >
            {offline && (
              <span
                aria-label="Trạng thái: Ngoại tuyến"
                className="flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface-control px-2.5 text-xs font-medium text-ink"
              >
                <WifiOff className="size-3.5 text-algo-frontier" />
                Ngoại tuyến
              </span>
            )}
            <Link
              href="/benchmark"
              aria-label="Mở trang Benchmark"
              className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-dim transition-colors duration-150 hover:bg-surface-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier"
            >
              <BarChart3 className="size-3.5" />
              Benchmark
            </Link>
            <ThemeToggle />
          </div>

          <div
            aria-label="Điều hướng trên màn hình nhỏ"
            role="toolbar"
            className="floating-chrome absolute left-3 right-3 top-3 z-30 hidden min-h-11 items-center gap-1 rounded-lg border border-surface-strong/80 p-1 max-[959px]:flex"
          >
            <Button variant="secondary" size="sm" className="flex-1" onClick={openMobilePanel("controls")}>
              <PanelLeftOpen /> Thiết lập
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={openMobilePanel("results")}>
              <PanelRightOpen /> Kết quả
            </Button>
            {offline && <WifiOff aria-label="Đang ngoại tuyến" className="mx-1 size-4 shrink-0 text-algo-frontier" />}
            <Link
              href="/benchmark"
              aria-label="Mở trang Benchmark"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface-control hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-algo-frontier"
            >
              <BarChart3 className="size-4" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <Drawer
          mobileOpen={mobilePanel === "results"}
          onMobileClose={() => setMobilePanel(null)}
        />
      </main>
    </TooltipProvider>
  );
}
