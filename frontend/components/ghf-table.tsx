"use client";

// Bảng g/h/f của frontier tại bước hiện tại (DESIGN.md §5) — nửa còn lại
// của SIGNATURE: đọc cùng stepIdx với timeline; hàng node đang expand sáng
// lên và tự cuộn vào tầm nhìn; click một hàng -> nhảy tới bước node đó
// được expand (chiều ngược của đồng bộ).

import * as React from "react";
import { useApp } from "@/lib/store";
import { useAnimation } from "@/lib/use-animation";
import { fmtVi } from "@/lib/format";

function val(m: Record<string, number> | null, id: string): string {
  const v = m?.[id];
  // ≥1000 bỏ thập phân: mode Ngắn nhất g/h/f tính bằng MÉT (4-5 chữ số) —
  // "5 246,8" từng tràn cột h đè lên cột f (review v11)
  return v === undefined || v === null ? "–" : fmtVi(v, v >= 1000 ? 0 : 1);
}

export function GhfTable() {
  const graphData = useApp((s) => s.graphData);
  const trace = useApp((s) => s.trace);
  const setStep = useApp((s) => s.setStep);
  const set = useApp((s) => s.set);
  const anim = useAnimation();
  const currentRef = React.useRef<HTMLTableRowElement>(null);

  React.useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [anim.stepIdx]);

  if (!trace || anim.steps.length === 0) return null;

  const nameOf = (id: string) =>
    graphData?.nodes.find((n) => n.id === id)?.name ?? id;
  const cur = anim.current;
  const usesH = trace.algorithm !== "bfs" && trace.algorithm !== "dfs"
    && trace.algorithm !== "iddfs" && cur?.h !== null;
  const usesG = cur?.g !== null;
  const usesF = cur?.f !== null;

  const jump = (id: string) => {
    const at = anim.stepOfNode.get(id);
    if (at !== undefined) {
      setStep(at);
      set({ playing: false });
    }
  };

  return (
    <div className="flex flex-col gap-1">
    <div className="max-h-72 overflow-y-auto rounded-lg border border-surface-strong bg-surface-control/50">
      {/* table-fixed là bắt buộc: layout auto để tên node dài (Bảo tàng Hồ
          Chí Minh…) đẩy bảng rộng hơn drawer và CẮT CỤT cột f (bug v10);
          với fixed, cột số giữ đúng bề rộng còn tên tự truncate. */}
      <table className="w-full table-fixed text-xs">
        <thead className="sticky top-0 bg-surface-raised text-left text-ink-dim">
          <tr>
            <th scope="col" className="px-2.5 py-1.5 font-medium">Node</th>
            {usesG && <th scope="col" className="w-16 px-1.5 py-1.5 text-right font-medium">g</th>}
            {usesH && <th scope="col" className="w-14 px-1.5 py-1.5 text-right font-medium">h</th>}
            {usesF && <th scope="col" className="w-16 px-1.5 py-1.5 text-right font-medium">f</th>}
          </tr>
        </thead>
        <tbody>
          {cur && (
            <tr ref={currentRef} aria-current="step" className="bg-hl/10 font-medium text-ink">
              <td className="truncate px-2.5 py-1.5" title={nameOf(cur.expanded)}>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-algo-current align-middle" />
                {nameOf(cur.expanded)}
                <span className="ml-1 text-[10px] text-ink-dim">đang expand</span>
              </td>
              {usesG && <td className="px-1.5 py-1.5 text-right font-mono">–</td>}
              {usesH && <td className="px-1.5 py-1.5 text-right font-mono">–</td>}
              {usesF && <td className="px-1.5 py-1.5 text-right font-mono">–</td>}
            </tr>
          )}
          {cur?.frontier.map((id) => {
            const canJump = anim.stepOfNode.has(id);
            return (
            <tr
              key={id}
              tabIndex={canJump ? 0 : -1}
              aria-label={canJump ? `Nhảy tới bước expand ${nameOf(id)}` : undefined}
              onClick={() => jump(id)}
              onKeyDown={(event) => {
                if (!canJump || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                jump(id);
              }}
              className="cursor-pointer border-t border-surface-border/50 text-ink-dim hover:bg-surface-border/40 focus-visible:bg-surface-raised focus-visible:text-ink"
            >
              {/* tooltip gộp tên + affordance: title trên td từng ĐÈ mất
                  hint "bấm để nhảy" của tr (review v11) */}
              <td className="truncate px-2.5 py-1.5"
                title={anim.stepOfNode.has(id)
                  ? `${nameOf(id)} — bấm để nhảy tới bước node này được expand`
                  : `${nameOf(id)} — node này chưa từng được expand`}>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-algo-frontier align-middle" />
                {nameOf(id)}
              </td>
              {usesG && <td className="px-1.5 py-1.5 text-right font-mono">{val(cur.g, id)}</td>}
              {usesH && <td className="px-1.5 py-1.5 text-right font-mono">{val(cur.h, id)}</td>}
              {usesF && <td className="px-1.5 py-1.5 text-right font-mono">{val(cur.f, id)}</td>}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <p className="font-mono text-[10px] text-ink-dim">
      g: chi phí đã đi · h: ước lượng còn lại · f = g + h
    </p>
    </div>
  );
}
