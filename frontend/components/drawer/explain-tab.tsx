"use client";

import { MessageSquareText } from "lucide-react";
import { AtspResultExplanation } from "../explanation/atsp-explanation";
import { RouteExplanation } from "../explanation/route-explanation";
import { EmptyState } from "./metrics-tab";
import { resolveExplanationSubject } from "@/lib/explanation-policy";
import { useApp } from "@/lib/store";

export function ExplainTab() {
  const subject = useApp((state) => state.explanationSubject);
  const singleRoute = useApp((state) => state.singleRouteResult);
  const singleAtsp = useApp((state) => state.singleAtspResult);
  const routeComparison = useApp((state) => state.routeComparisonSession);
  const atspComparison = useApp((state) => state.atspComparisonSession);
  const graphData = useApp((state) => state.graphData);
  const sequentialRoute = useApp((state) => state.sequentialRoute);
  const stepIdx = useApp((state) => state.stepIdx);
  const running = useApp((state) => state.running);
  const multiRunning = useApp((state) => state.multiRunning);

  if (running || multiRunning) {
    return (
      <div role="status" aria-live="polite" className="rounded-lg border border-surface-border bg-surface-control p-3 text-sm text-ink">
        {multiRunning ? "Đang dựng ma trận và tối ưu thứ tự…" : "Đang tìm đường và ghi bằng chứng giải thích…"}
      </div>
    );
  }

  const routeComparisons = routeComparison ? { [routeComparison.id]: routeComparison } : {};
  const atspComparisons = atspComparison ? { [atspComparison.id]: atspComparison } : {};
  const envelope = resolveExplanationSubject(subject, {
    singleRoutes: singleRoute ? { [singleRoute.id]: singleRoute } : {},
    singleAtsp: singleAtsp ? { [singleAtsp.id]: singleAtsp } : {},
    routeComparisons,
    atspComparisons,
  });

  if (!envelope) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title={subject ? "Kết quả giải thích không còn khả dụng" : "Chưa có kết quả được chọn"}
        hint={subject
          ? "Result hoặc phiên so sánh sở hữu phần giải thích này đã được thay đổi. Hãy chạy hoặc chọn lại một kết quả."
          : "Chạy một tác vụ đơn, hoặc chủ động chọn một kết quả trong phiên so sánh, để mở phần giải thích tương ứng."}
      />
    );
  }

  return envelope.kind === "route" ? (
    <RouteExplanation
      envelope={envelope}
      graphData={graphData}
      sequentialRoute={singleRoute?.id === envelope.id ? sequentialRoute : null}
      stepIdx={stepIdx}
    />
  ) : (
    <AtspResultExplanation envelope={envelope} graphData={graphData} />
  );
}
