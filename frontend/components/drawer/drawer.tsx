"use client";

import * as React from "react";
import { PanelRightClose, PanelRightOpen, Route, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { MetricsTab } from "./metrics-tab";
import { ExplainTab } from "./explain-tab";
import { CompareTab } from "./compare-tab";
import { ScenarioTab } from "./scenario-tab";
import { useApp, type DrawerTab } from "@/lib/store";
import { useMobileDialogFocus } from "@/lib/use-mobile-dialog-focus";
import {
  availableDrawerWidth,
  clampDrawerWidth,
  DEFAULT_DRAWER_WIDTH,
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
} from "@/lib/drawer-resize-policy";

type DrawerProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function useCompactViewport() {
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(min-width: 960px) and (max-width: 1279px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return compact;
}

export function Drawer({ mobileOpen = false, onMobileClose }: DrawerProps) {
  const open = useApp((s) => s.drawerOpen);
  const tab = useApp((s) => s.drawerTab);
  const set = useApp((s) => s.set);
  const leaveExplanation = useApp((s) => s.leaveExplanation);
  const [desktopWidth, setDesktopWidth] = React.useState(DEFAULT_DRAWER_WIDTH);
  const [maximumWidth, setMaximumWidth] = React.useState(MAX_DRAWER_WIDTH);
  const compactViewport = useCompactViewport();
  const openButtonRef = React.useRef<HTMLButtonElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const sheetRef = React.useRef<HTMLElement>(null);
  const previousOpen = React.useRef(open);
  const wasCompact = React.useRef(false);
  const resizeDrag = React.useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
    previousCursor: string;
    previousUserSelect: string;
  } | null>(null);
  const scenarioActive = tab === "scenario";
  const panelTitle = scenarioActive ? "Thử nghiệm" : "Kết quả";
  const panelSubtitle = scenarioActive
    ? "Chỉnh tạm thời một đoạn đường trên bản đồ"
    : "Số liệu, giải thích và đối chiếu hành trình";

  const finishResize = React.useCallback(() => {
    const drag = resizeDrag.current;
    if (!drag) return;
    document.body.style.cursor = drag.previousCursor;
    document.body.style.userSelect = drag.previousUserSelect;
    resizeDrag.current = null;
  }, []);

  React.useEffect(() => {
    const updateMaximum = () => {
      const maximum = availableDrawerWidth(window.innerWidth);
      setMaximumWidth(maximum);
      setDesktopWidth((current) => clampDrawerWidth(current, maximum));
    };
    updateMaximum();
    window.addEventListener("resize", updateMaximum);
    return () => {
      window.removeEventListener("resize", updateMaximum);
      finishResize();
    };
  }, [finishResize]);

  const closeMobile = React.useCallback(() => onMobileClose?.(), [onMobileClose]);
  const onMobileSheetKeyDownCapture = useMobileDialogFocus(mobileOpen, sheetRef, titleRef, closeMobile);
  const onCompactPanelKeyDownCapture = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (!compactViewport || mobileOpen || event.key !== "Escape") return;
    // Nested Radix controls own the first Escape. Closing their parent panel at
    // capture time would otherwise make a combobox or tooltip disappear with it.
    if (document.querySelector("[role='tooltip'], [role='listbox']")) return;
    event.preventDefault();
    set({ drawerOpen: false });
  }, [compactViewport, mobileOpen, set]);

  React.useEffect(() => {
    if (mobileOpen || previousOpen.current === open) return;
    previousOpen.current = open;
    const frame = window.requestAnimationFrame(() => {
      (open ? titleRef.current : openButtonRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobileOpen, open]);

  React.useEffect(() => {
    if (compactViewport && !wasCompact.current) {
      set({ drawerOpen: false });
    }
    wasCompact.current = compactViewport;
  }, [compactViewport, set]);

  if (!open && !mobileOpen) {
    return (
      <div className="app-rail relative z-10 flex h-full items-start rounded-xl border border-surface-border/80 p-2 max-[1279px]:absolute max-[1279px]:right-2 max-[1279px]:top-2 max-[1279px]:h-auto max-[1279px]:shadow-float max-[959px]:hidden">
        <Button ref={openButtonRef} variant="secondary" size="iconSm" aria-label={`Mở panel ${panelTitle.toLowerCase()}`}
          className="min-[960px]:max-[1279px]:w-auto min-[960px]:max-[1279px]:px-3"
          onClick={() => set({ drawerOpen: true })}>
          <PanelRightOpen />
          <span className="hidden min-[960px]:max-[1279px]:inline">{panelTitle}</span>
        </Button>
      </div>
    );
  }

  const mobileClasses = mobileOpen
    ? "max-[959px]:fixed max-[959px]:inset-0 max-[959px]:z-50 max-[959px]:flex max-[959px]:h-[100dvh] max-[959px]:w-full max-[959px]:rounded-none"
    : "max-[959px]:hidden";

  return (
    <aside
      ref={sheetRef}
      aria-label={scenarioActive ? "Trình thử nghiệm đoạn đường" : "Kết quả định tuyến"}
      aria-modal={mobileOpen || undefined}
      role={mobileOpen ? "dialog" : undefined}
      onKeyDownCapture={mobileOpen
        ? onMobileSheetKeyDownCapture
        : compactViewport ? onCompactPanelKeyDownCapture : undefined}
      style={{ "--drawer-width": `${desktopWidth}px` } as React.CSSProperties}
      className={`app-rail relative z-10 flex h-full w-[400px] shrink-0 flex-col overflow-hidden rounded-xl border border-surface-border/80 min-[1280px]:w-[var(--drawer-width)] min-[960px]:max-[1279px]:absolute min-[960px]:max-[1279px]:bottom-2 min-[960px]:max-[1279px]:right-2 min-[960px]:max-[1279px]:top-2 min-[960px]:max-[1279px]:h-auto min-[960px]:max-[1279px]:w-[min(400px,44vw)] ${mobileClasses}`}
    >
      <div
        role="separator"
        aria-label="Thay đổi độ rộng panel kết quả"
        aria-orientation="vertical"
        aria-valuemin={MIN_DRAWER_WIDTH}
        aria-valuemax={maximumWidth}
        aria-valuenow={desktopWidth}
        aria-valuetext={`${desktopWidth} pixel`}
        tabIndex={0}
        title="Kéo để đổi độ rộng · nhấp đúp để về 400 px"
        className="group absolute bottom-0 left-0 top-0 z-40 hidden w-2 cursor-col-resize touch-none items-center justify-center outline-none min-[1280px]:flex focus-visible:bg-algo-frontier/15"
        onDoubleClick={() => setDesktopWidth(clampDrawerWidth(DEFAULT_DRAWER_WIDTH, maximumWidth))}
        onKeyDown={(event) => {
          let next: number | null = null;
          if (event.key === "ArrowLeft") next = desktopWidth + 24;
          if (event.key === "ArrowRight") next = desktopWidth - 24;
          if (event.key === "Home") next = MIN_DRAWER_WIDTH;
          if (event.key === "End") next = maximumWidth;
          if (next === null) return;
          event.preventDefault();
          setDesktopWidth(clampDrawerWidth(next, maximumWidth));
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          resizeDrag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: desktopWidth,
            previousCursor: document.body.style.cursor,
            previousUserSelect: document.body.style.userSelect,
          };
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        onPointerMove={(event) => {
          const drag = resizeDrag.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          setDesktopWidth(clampDrawerWidth(
            drag.startWidth + drag.startX - event.clientX,
            maximumWidth,
          ));
        }}
        onPointerUp={(event) => {
          if (resizeDrag.current?.pointerId !== event.pointerId) return;
          event.currentTarget.releasePointerCapture(event.pointerId);
          finishResize();
        }}
        onPointerCancel={finishResize}
        onLostPointerCapture={finishResize}
      >
        <span className="h-16 w-0.5 rounded-full bg-surface-strong transition-colors group-hover:bg-algo-frontier group-focus-visible:bg-algo-frontier" />
      </div>
      <div className="app-header flex min-h-[72px] shrink-0 items-center gap-2 border-b border-surface-border/80 px-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-algo-frontier/25 bg-surface-raised text-algo-frontier">
          {scenarioActive ? <SlidersHorizontal className="size-[18px]" /> : <Route className="size-[18px]" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 ref={titleRef} tabIndex={-1} className="text-[19px] font-bold leading-6 text-ink">{panelTitle}</h2>
          <p className="text-xs leading-5 text-ink-dim">{panelSubtitle}</p>
        </div>
        <Button variant="ghost" size="iconSm"
          aria-label={mobileOpen ? `Đóng bảng ${panelTitle.toLowerCase()}` : `Thu gọn panel ${panelTitle.toLowerCase()}`}
          onClick={() => {
            if (mobileOpen) closeMobile();
            else set({ drawerOpen: false });
          }}>
          <PanelRightClose />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3">
        <Tabs value={tab} onValueChange={(value) => {
          const next = value as DrawerTab;
          if (next !== "explain") leaveExplanation();
          set({ drawerTab: next, ...(next === "explain" ? { playing: false } : {}) });
        }}>
          <div className="sticky -top-3 z-20 -mx-3 border-b border-surface-border/80 bg-surface-rail px-3 pb-2 pt-3">
            <TabsList aria-label="Chế độ xem kết quả và kịch bản" className="shadow-sm">
              <TabsTrigger value="metrics">Số liệu</TabsTrigger>
              <TabsTrigger value="explain">Giải thích</TabsTrigger>
              <TabsTrigger value="compare">So sánh</TabsTrigger>
              <TabsTrigger value="scenario">Thử nghiệm</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="metrics"><MetricsTab /></TabsContent>
          <TabsContent value="explain"><ExplainTab /></TabsContent>
          <TabsContent value="compare"><CompareTab /></TabsContent>
          <TabsContent value="scenario"><ScenarioTab /></TabsContent>
        </Tabs>
      </div>
    </aside>
  );
}
