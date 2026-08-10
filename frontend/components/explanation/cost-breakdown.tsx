import { Badge } from "../ui/badge";
import { costBreakdownRows } from "@/lib/metric-presentation";
import { fmtKm, fmtMinutes } from "@/lib/format";
import type { Mode, PathCostBreakdown } from "@/lib/types";

function formatBreakdownValue(unit: "m" | "s", value: number, balanced: boolean): string {
  if (unit === "m") return fmtKm(value);
  return `${fmtMinutes(value)}${balanced ? " quy đổi" : ""}`;
}

export function CostBreakdown({ mode, breakdown }: { mode: Mode; breakdown: PathCostBreakdown }) {
  return (
    <div>
      <p className="mb-2 text-xs leading-5 text-ink-dim">“Dùng để tính tiêu chí” nghĩa là số liệu này liên quan trực tiếp đến chế độ đang tối ưu; không phải tất cả các dòng đều được cộng lại với nhau.</p>
      <dl className="flex flex-col gap-1.5">
        {costBreakdownRows(mode, breakdown).map((row) => (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-surface-control px-2.5 py-2 text-xs">
            <dt className="min-w-0 text-ink-dim">
              {row.label}{" "}
              <Badge variant={row.affectsObjective ? "ok" : "default"} className="ml-1 align-middle">
                {row.affectsObjective ? "Dùng để tính tiêu chí" : "Chỉ để tham khảo"}
              </Badge>
            </dt>
            <dd className="whitespace-nowrap font-mono font-medium text-ink">
              {formatBreakdownValue(row.unit, row.value, row.key === "balanced_cost_s")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
