import type {
  AtspResultEnvelope, RouteResultEnvelope,
} from "./types";

const ABS_TOLERANCE = 1e-6;
const REL_TOLERANCE = 1e-9;

function equivalent(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(
    ABS_TOLERANCE,
    REL_TOLERANCE * Math.max(Math.abs(left), Math.abs(right)),
  );
}

export interface ComparisonInsight {
  kind:
    | "contract_integrity" | "exact_agreement" | "exact_disagreement"
    | "same_cost_different_path" | "best_displayed" | "no_rankable_result";
  severity: "info" | "warning" | "error";
  message: string;
  resultIds: string[];
}

function sameFingerprint(
  results: readonly (RouteResultEnvelope | AtspResultEnvelope)[],
): boolean {
  return results.every((result) => (
    result.scenarioFingerprint === results[0]?.scenarioFingerprint
    && result.capability === results[0]?.capability
  ));
}

function routeHasExactEvidence(result: RouteResultEnvelope): boolean {
  const sources = result.sourceResponses?.length
    ? result.sourceResponses : [result.response];
  return result.response.found && sources.every((source) => (
    source.contract_version === 2
    && source.found
    && (source.termination.solution_quality === "exact"
      || source.termination.solution_quality === "not_applicable")
  ));
}

export function routeComparisonInsights(
  results: readonly RouteResultEnvelope[],
): ComparisonInsight[] {
  if (results.length === 0) return [{
    kind: "no_rankable_result", severity: "info",
    message: "Chưa có route result thành công để đối chiếu.", resultIds: [],
  }];
  if (!sameFingerprint(results)) return [{
    kind: "contract_integrity", severity: "error",
    message: "Không thể tạo insight vì fingerprint/capability không đồng nhất.",
    resultIds: results.map((result) => result.id),
  }];
  const successful = results.filter((result) => result.response.found
    && result.response.metrics.total_cost !== null);
  if (successful.length === 0) return [{
    kind: "no_rankable_result", severity: "info",
    message: "Không có route result thành công có objective để xếp hạng.",
    resultIds: results.map((result) => result.id),
  }];
  const insights: ComparisonInsight[] = [];
  const exact = successful.filter(routeHasExactEvidence);
  if (exact.length >= 2) {
    const reference = exact[0].response.metrics.total_cost as number;
    const disagree = exact.some((result) => !equivalent(
      result.response.metrics.total_cost as number, reference,
    ));
    insights.push({
      kind: disagree ? "exact_disagreement" : "exact_agreement",
      severity: disagree ? "error" : "info",
      message: disagree
        ? "Các result cùng tự khai exact nhưng objective không equivalent; dừng claim/ranking exact."
        : "Các result exact đồng ý về objective trong raw tolerance.",
      resultIds: exact.map((result) => result.id),
    });
  }
  for (let leftIndex = 0; leftIndex < successful.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < successful.length; rightIndex += 1) {
      const left = successful[leftIndex];
      const right = successful[rightIndex];
      if (equivalent(
        left.response.metrics.total_cost as number,
        right.response.metrics.total_cost as number,
      ) && JSON.stringify(left.response.path) !== JSON.stringify(right.response.path)) {
        insights.push({
          kind: "same_cost_different_path", severity: "info",
          message: "Hai tuyến có objective equivalent nhưng directed path khác nhau.",
          resultIds: [left.id, right.id],
        });
      }
    }
  }
  if (exact.length === 0) {
    const best = successful.reduce((current, candidate) => (
      (candidate.response.metrics.total_cost as number)
        < (current.response.metrics.total_cost as number) ? candidate : current
    ));
    insights.push({
      kind: "best_displayed", severity: "info",
      message: "Đây là objective nhỏ nhất trong các result đang hiển thị; không phải global optimality gap.",
      resultIds: [best.id],
    });
  }
  return insights;
}

export function atspComparisonInsights(
  results: readonly AtspResultEnvelope[],
): ComparisonInsight[] {
  if (results.length === 0) return [{
    kind: "no_rankable_result", severity: "info",
    message: "Chưa có ATSP result thành công để đối chiếu.", resultIds: [],
  }];
  if (!sameFingerprint(results)) return [{
    kind: "contract_integrity", severity: "error",
    message: "Không thể tạo insight vì fingerprint/capability không đồng nhất.",
    resultIds: results.map((result) => result.id),
  }];
  const successful = results.filter((result) => result.response.found
    && result.response.totals !== null);
  if (successful.length === 0) return [{
    kind: "no_rankable_result", severity: "info",
    message: "Không có ATSP result thành công có objective để xếp hạng.",
    resultIds: results.map((result) => result.id),
  }];
  const exact = successful.filter((result) => result.response.optimal_guarantee);
  if (exact.length >= 2) {
    const cost = exact[0].response.totals?.total_cost as number;
    const disagree = exact.some((result) => !equivalent(
      result.response.totals?.total_cost as number, cost,
    ));
    return [{
      kind: disagree ? "exact_disagreement" : "exact_agreement",
      severity: disagree ? "error" : "info",
      message: disagree
        ? "Các ATSP result có guarantee nhưng objective không equivalent; cần integrity warning."
        : "Các ATSP result có guarantee đồng ý trong raw tolerance.",
      resultIds: exact.map((result) => result.id),
    }];
  }
  const best = successful.reduce((current, candidate) => (
    (candidate.response.totals?.total_cost as number)
      < (current.response.totals?.total_cost as number) ? candidate : current
  ));
  return [{
    kind: "best_displayed", severity: "info",
    message: exact.length === 1
      ? "Dùng exact result cùng snapshot làm reference; savings của từng method không phải optimality gap."
      : "Đây là best displayed; chưa có exact reference nên không tính global optimality gap.",
    resultIds: [best.id],
  }];
}
