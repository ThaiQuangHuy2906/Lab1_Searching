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
  return v === undefined || v === null ? "–" : fmtVi(v, 1);
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
    <div className="max-h-72 overflow-y-auto rounded-lg border border-surface-border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-panel text-left text-ink-dim">
          <tr>
            <th className="px-2.5 py-1.5 font-medium">Node</th>
            {usesG && <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">g</th>}
            {usesH && <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">h</th>}
            {usesF && <th className="whitespace-nowrap px-1.5 py-1.5 text-right font-medium">f</th>}
          </tr>
        </thead>
        <tbody>
          {cur && (
            <tr ref={currentRef} className="bg-hl/10 font-medium text-ink">
              <td className="truncate px-2.5 py-1.5" title={nameOf(cur.expanded)}>
                <span className="mr-1.5 inline-block size-2 rounded-full bg-algo-current align-middle" />
                {nameOf(cur.expanded)}
                <span className="ml-1 text-[10px] text-ink-dim">đang expand</span>
              </td>
              {usesG && <td className="px-2 py-1.5 text-right font-mono">–</td>}
              {usesH && <td className="px-2 py-1.5 text-right font-mono">–</td>}
              {usesF && <td className="px-2 py-1.5 text-right font-mono">–</td>}
            </tr>
          )}
          {cur?.frontier.map((id) => (
            <tr
              key={id}
              onClick={() => jump(id)}
              className="cursor-pointer border-t border-surface-border/50 text-ink-dim hover:bg-surface-border/40"
              title={anim.stepOfNode.has(id)
                ? "Bấm để nhảy tới bước node này được expand"
                : "Node này chưa từng được expand"}
            >
              <td className="truncate px-2.5 py-1.5">
                <span className="mr-1.5 inline-block size-2 rounded-full bg-algo-frontier align-middle" />
                {nameOf(id)}
              </td>
              {usesG && <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{val(cur.g, id)}</td>}
              {usesH && <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{val(cur.h, id)}</td>}
              {usesF && <td className="whitespace-nowrap px-1.5 py-1.5 text-right font-mono">{val(cur.f, id)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="font-mono text-[10px] text-ink-dim">
      g: chi phí đã đi · h: ước lượng còn lại · f = g + h
    </p>
    </div>
  );
}
