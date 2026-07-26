"use client";

// Legend cố định góc dưới-trái (DESIGN.md §3): nội dung theo ngữ cảnh —
// video cần người xem giải mã màu ngay lập tức.

import { useApp } from "@/lib/store";
import { CONGESTION_HEX } from "@/lib/colors";

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

  const isBidi = trace?.algorithm === "bidijkstra";
  const comparing = drawerTab === "compare" && compare;

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5 rounded-lg border border-surface-border bg-surface-panel/95 px-3 py-2.5 text-xs text-ink-dim">
      {trace && !multi && (
        <>
          {isBidi ? (
            <>
              <span className="flex items-center gap-2"><Dot color="#22d3ee" /> Phía xuôi (từ Đi)</span>
              <span className="flex items-center gap-2"><Dot color="#fb7185" /> Phía ngược (từ Đến)</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2"><Dot color="#22d3ee" /> Frontier</span>
              <span className="flex items-center gap-2"><Dot color="#a78bfa" /> Đã expand</span>
            </>
          )}
          <span className="flex items-center gap-2"><Dot color="#ffffff" ring /> Đang expand</span>
          <span className="flex items-center gap-2"><Line color="#fbbf24" /> Tuyến kết quả</span>
        </>
      )}
      {multi?.found && (
        <>
          <span className="flex items-center gap-2"><Line color="#fbbf24" /> Lộ trình giao hàng</span>
          <span className="flex items-center gap-2">
            <span className="flex size-3.5 items-center justify-center rounded-full bg-algo-path font-mono text-[9px] font-bold text-surface">1</span>
            Thứ tự giao tối ưu
          </span>
        </>
      )}
      {comparing && (
        <>
          <span className="flex items-center gap-2"><Line color="#fbbf24" /> Thuật toán A</span>
          <span className="flex items-center gap-2"><Line color="#22d3ee" dashed /> Thuật toán B</span>
        </>
      )}
      {!trace && !multi && !comparing && (
        <span className="flex items-center gap-2"><Dot color="#52525b" /> Nút giao</span>
      )}
      {trafficLayer && (
        <div className="mt-0.5 flex items-center gap-1.5 border-t border-surface-border pt-1.5">
          <span>Ùn tắc</span>
          {[1, 2, 3, 4, 5].map((l) => (
            <span key={l} className="h-2 w-4 rounded-sm" style={{ background: CONGESTION_HEX[l] }} />
          ))}
          <span>1→5</span>
        </div>
      )}
    </div>
  );
}
