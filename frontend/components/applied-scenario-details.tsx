"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { graphViewLabel, scenarioProvenanceLabel } from "@/lib/ui-copy";
import type { AppliedScenario } from "@/lib/types";

export function AppliedScenarioDetails({ scenario }: { scenario: AppliedScenario | null }) {
  const [copied, setCopied] = React.useState(false);
  if (!scenario) return null;

  const copyFingerprint = async () => {
    try {
      await navigator.clipboard.writeText(scenario.fingerprint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <details className="rounded-lg border border-surface-border bg-surface-control/55 px-2.5 py-2 text-xs leading-5 text-ink-dim">
      <summary className="cursor-pointer font-medium text-ink">
        Dữ liệu và kịch bản · {graphViewLabel(scenario.graph_view)} · {scenario.override_count} điều chỉnh
      </summary>
      <div className="mt-2 flex flex-col gap-1.5">
        <p>Nguồn: <span className="font-medium text-ink">{scenarioProvenanceLabel(scenario.provenance)}</span>.</p>
        <div className="flex items-start gap-1.5">
          <code className="min-w-0 flex-1 break-all rounded bg-surface-panel px-2 py-1 font-mono text-[11px] text-ink">{scenario.fingerprint}</code>
          <Button variant="ghost" size="iconSm" aria-label="Sao chép mã kịch bản" onClick={() => void copyFingerprint()}>
            {copied ? <Check className="text-start" /> : <Copy />}
          </Button>
        </div>
        <span aria-live="polite" className="sr-only">{copied ? "Đã sao chép mã kịch bản." : ""}</span>
      </div>
    </details>
  );
}
