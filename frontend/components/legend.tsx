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
      className={`inline-block w-[18px] shrink-0 border-t-[3px] ${dashed ? "border-dashed" : "border-solid"}`}
      style={{ borderTopColor: color }}
    />
  );
}

export function Legend() {
  const trace = useApp((s) => s.trace);
  const trafficLayer = useApp((s) => s.trafficLayer);
  const compare = useApp((s) => s.compare);
  const drawerTab = useApp((s) => s.drawerTab);
  const multi = useApp((s) => s.multi);
  const graph = useApp((s) => s.graph);
  const traceOnReal = useApp((s) => s.traceOnReal);
  const drawerOpen = useApp((s) => s.drawerOpen);
  const P = usePalette();
  const H = P.hex;

  const isBidi = trace?.algorithm === "bidijkstra";
  const comparing = drawerTab === "compare" && compare;

  // v11: chưa có gì đáng giải mã (không kết quả, không lớp ùn tắc) thì đừng
  // chiếm góc bản đồ chỉ để chú giải mỗi "Nút giao"
  if (!trace && !multi?.found && !comparing && !trafficLayer) return null;

  // Thanh trình phát nổi giữa-đáy chỉ đè lên chú giải khi bản đồ BỊ THU HẸP
  // (drawer phải đang mở) — chỉ khi đó mới nâng chú giải lên trên thanh
  // (timeline cao ~58px + bottom-4 + khe thở); drawer đóng thì bản đồ đủ
  // rộng, chú giải nằm yên ở góc như cũ.
  const timelineVisible =
    (graph === "real" && !traceOnReal ? 0 : trace?.trace.length ?? 0) > 0;
  const lift = timelineVisible && drawerOpen;

  return (
    <div className={`pointer-events-none absolute left-3 z-10 flex flex-col gap-1.5 rounded-lg border border-surface-strong bg-surface-raised px-3 py-2.5 text-xs text-ink-dim shadow-float transition-[bottom] duration-200 ${
      lift ? "bottom-[5.5rem]" : "bottom-4"}`}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-ink">Chú giải</span>
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
