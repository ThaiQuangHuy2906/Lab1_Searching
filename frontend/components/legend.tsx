"use client";

// Legend cố định góc dưới-trái (DESIGN.md §3): nội dung theo ngữ cảnh —
// video cần người xem giải mã màu ngay lập tức.

import { useApp } from "@/lib/store";
import { usePalette } from "@/lib/use-palette";

function Dot({ color, ring }: { color: string; ring?: boolean }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: color, boxShadow: ring ? `0 0 0 2px ${color}55` : undefined }}
    />
  );
}

function Line({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      className="inline-block h-1 w-4 shrink-0 rounded-full"
      style={
        dashed
          ? { backgroundImage: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` }
          : { background: color }
      }
    />
  );
}

export function Legend() {
  const trace = useApp((s) => s.trace);
  const trafficLayer = useApp((s) => s.trafficLayer);
  const compare = useApp((s) => s.compare);
  const drawerTab = useApp((s) => s.drawerTab);
  const multi = useApp((s) => s.multi);
  const P = usePalette();
  const H = P.hex;

  const isBidi = trace?.algorithm === "bidijkstra";
  const comparing = drawerTab === "compare" && compare;

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border border-surface-border bg-surface-panel px-3 py-2.5 text-xs text-ink-dim shadow-float">
      <span className="text-[10px] font-bold uppercase tracking-wider">Chú giải</span>
      {trace && !multi && (
        <>
          {isBidi ? (
            <>
              <span className="flex items-center gap-2"><Dot color={H.bidiForward} /> Phía xuôi (từ Đi)</span>
              <span className="flex items-center gap-2"><Dot color={H.bidiBackward} /> Phía ngược (từ Đến)</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2"><Dot color={H.frontier} /> Frontier</span>
              <span className="flex items-center gap-2"><Dot color={H.expanded} /> Đã expand</span>
            </>
          )}
          <span className="flex items-center gap-2"><Dot color={H.current} ring /> Đang expand</span>
          <span className="flex items-center gap-2"><Line color={H.path} /> Tuyến kết quả</span>
          <span className="flex items-center gap-2"><span className="w-4 text-center text-[10px] leading-none">▶</span> Hướng di chuyển</span>
        </>
      )}
      {multi?.found && (
        <>
          <span className="flex items-center gap-2"><Line color={H.path} /> Lộ trình giao hàng</span>
          <span className="flex items-center gap-2"><span className="w-4 text-center text-[10px] leading-none">▶</span> Hướng di chuyển</span>
          <span className="flex items-center gap-2">
            <span className="flex size-3.5 items-center justify-center rounded-full bg-algo-path font-mono text-[9px] font-bold text-surface">1</span>
            Thứ tự giao tối ưu
          </span>
        </>
      )}
      {comparing && (
        <>
          <span className="flex items-center gap-2"><Line color={H.path} /> Thuật toán A</span>
          <span className="flex items-center gap-2"><Line color={H.frontier} dashed /> Thuật toán B</span>
        </>
      )}
      {!trace && !multi && !comparing && (
        <span className="flex items-center gap-2"><Dot color={H.node} /> Nút giao</span>
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
    </div>
  );
}
