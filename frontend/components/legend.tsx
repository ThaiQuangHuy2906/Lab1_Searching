"use client";

// Legend cố định góc dưới-trái (DESIGN.md §3): nội dung theo ngữ cảnh —
// video cần người xem giải mã màu ngay lập tức.

import { useApp } from "@/lib/store";
import { effectiveTraceSteps } from "@/lib/interaction-policy";
import { isOptimizationFinalEvent } from "@/lib/atsp-trace-policy";
import { usePalette } from "@/lib/use-palette";

function Dot({ color, ring, outline }: { color: string; ring?: boolean; outline?: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{
        background: color,
        boxShadow: outline ? `0 0 0 2px ${outline}` : ring ? `0 0 0 2px ${color}55` : undefined,
      }}
    />
  );
}

function Line({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      className={`inline-block w-[18px] shrink-0 border-t-[3px] ${dashed ? "border-dashed" : "border-solid"}`}
      style={{ borderTopColor: color }}
    />
  );
}

export function Legend() {
  const trace = useApp((s) => s.trace);
  const trafficLayer = useApp((s) => s.trafficLayer);
  const compare = useApp((s) => s.routeComparisonSession?.runs.find(
    (run, index) => index > 0 && run.result?.response.found,
  )?.result?.response ?? null);
  const drawerTab = useApp((s) => s.drawerTab);
  const multi = useApp((s) => s.multi);
  const optimizationTrace = useApp((s) => s.optimizationTrace);
  const timelineSource = useApp((s) => s.timelineSource);
  const stepIdx = useApp((s) => s.stepIdx);
  const graph = useApp((s) => s.graph);
  const traceOnReal = useApp((s) => s.traceOnReal);
  const overrideCount = useApp((s) => Object.keys(s.edgeOverrides).length);
  const P = usePalette();
  const H = P.hex;

  const traceSteps = effectiveTraceSteps(trace, graph, traceOnReal);
  const hasStepLegend = traceSteps.length > 0;
  const hasTraceLegend = hasStepLegend || Boolean(trace?.found);
  const isBidi = hasStepLegend && trace?.algorithm === "bidijkstra";
  const currentTraceStep = traceSteps[Math.min(stepIdx, traceSteps.length - 1)];
  const hasBidiOverlap = Boolean(
    currentTraceStep
    && "bidirectional_frontiers" in currentTraceStep
    && currentTraceStep.bidirectional_frontiers
    && currentTraceStep.bidirectional_frontiers.forward.nodes.some((node) => (
      currentTraceStep.bidirectional_frontiers?.backward.nodes.includes(node)
    )),
  );
  const comparing = drawerTab === "compare" && compare;
  const optimizationActive = timelineSource === "optimization"
    && Boolean(optimizationTrace?.events.length);
  const optimizationEvent = optimizationActive && optimizationTrace
    ? optimizationTrace.events[Math.min(stepIdx, optimizationTrace.events.length - 1)]
    : null;
  const showFinalMultiRoute = isOptimizationFinalEvent(optimizationEvent?.kind)
    || !optimizationEvent;

  // v11: chưa có gì đáng giải mã (không kết quả, không lớp ùn tắc) thì đừng
  // chiếm góc bản đồ chỉ để chú giải mỗi "Nút giao"
  if (!hasTraceLegend && !multi?.found && !optimizationActive && !comparing && !trafficLayer
      && overrideCount === 0) return null;

  // Khi timeline xuất hiện, luôn nâng chú giải lên trên thanh. Ở viewport hẹp,
  // timeline co giãn đủ xa về bên trái ngay cả khi drawer đóng.
  const timelineVisible = hasStepLegend || optimizationActive;
  const lift = timelineVisible;

  return (
    <div className={`floating-chrome pointer-events-none absolute left-3 z-10 flex flex-col gap-1.5 rounded-lg border border-surface-strong/80 px-3 py-2.5 text-xs text-ink-dim transition-[bottom] duration-200 max-[639px]:bottom-[8.5rem] ${
      lift ? "bottom-[5.5rem]" : "bottom-4"}`}>
      <span className="text-xs font-bold text-ink">Chú giải</span>
      {trace && hasTraceLegend && !multi && (
        <>
          {hasStepLegend && (
            isBidi ? (
              <>
                <span className="flex items-center gap-2"><Dot color={H.bidiForward} /> Phía xuôi (từ Đi)</span>
                <span className="flex items-center gap-2"><Dot color={H.bidiBackward} /> Phía ngược (từ Đến)</span>
                {hasBidiOverlap && <span className="flex items-center gap-2"><Dot color={H.bidiForward} outline={H.bidiBackward} /> Ở cả hai phía (viền kép)</span>}
              </>
            ) : (
              <>
                <span className="flex items-center gap-2"><Dot color={H.frontier} /> Đang chờ xét</span>
                <span className="flex items-center gap-2"><Dot color={H.expanded} /> Đã duyệt</span>
              </>
            )
          )}
          {hasStepLegend && (
            <span className="flex items-center gap-2"><Dot color={H.current} ring /> Đang duyệt</span>
          )}
          {trace.found && !comparing && (
            <span className="flex items-center gap-2"><Line color={H.path} /> Tuyến kết quả</span>
          )}
          {trace.found && !comparing && (
            <span className="flex items-center gap-2"><span className="w-4 text-center text-xs leading-none">▶</span> Hướng di chuyển</span>
          )}
        </>
      )}
      {optimizationActive && !showFinalMultiRoute && (
        <>
          {optimizationEvent?.kind === "held_karp_update" && (
            <span className="flex items-center gap-2"><Dot color={H.frontier} /> Tập DP đang xét</span>
          )}
          <span className="flex items-center gap-2"><Line color={H.path} dashed /> Thứ tự ghé đang xét</span>
          <span className="max-w-44 pl-[26px] text-xs leading-5 text-ink-faint">
            Minh hoạ khái niệm, không phải đường xe chạy.
          </span>
        </>
      )}
      {multi?.found && showFinalMultiRoute && (
        <>
          <span className="flex items-center gap-2"><Line color={H.path} /> Lộ trình giao hàng</span>
          <span className="flex items-center gap-2"><span className="w-4 text-center text-xs leading-none">▶</span> Hướng di chuyển</span>
          <span className="flex items-center gap-2">
            <span className="flex size-4 items-center justify-center rounded-full bg-algo-path font-mono text-[11px] font-bold text-surface">1</span>
            Thứ tự giao tối ưu
          </span>
        </>
      )}
      {comparing && (
        <>
          <span className="flex items-center gap-2"><Line color={H.path} /> Thuật toán A</span>
          <span className="flex items-center gap-2"><Line color={H.frontier} dashed /> Thuật toán B</span>
          <span className="max-w-44 pl-[26px] text-xs leading-5 text-ink-faint">
            B lệch hiển thị 4 px; tọa độ không đổi.
          </span>
        </>
      )}
      {trafficLayer && (
        <div className="mt-0.5 flex items-center gap-1.5 border-t border-surface-border pt-1.5">
          <span>Ùn tắc</span>
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l} className="h-2 w-4 rounded-sm" style={{ background: P.congestionHex[l] }} />
          ))}
          <span>1→5</span>
        </div>
      )}
      {overrideCount > 0 && (
        <span className="flex items-center gap-2 border-t border-surface-border pt-1.5">
          <Line color={H.path} /> {overrideCount} cạnh thử nghiệm
        </span>
      )}
    </div>
  );
}
