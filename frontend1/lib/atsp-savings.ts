export function describeAtspSavings(value: number | null) {
  if (value === null) {
    return {
      kind: "unavailable" as const,
      label: "Thay đổi tổng chi phí",
      absolutePct: null,
    };
  }
  if (value === 0) {
    return {
      kind: "neutral" as const,
      label: "Thay đổi tổng chi phí",
      absolutePct: 0,
    };
  }
  if (value < 0) {
    return {
      kind: "negative" as const,
      label: "Mức tăng tổng chi phí",
      absolutePct: Math.abs(value),
    };
  }
  return {
    kind: "positive" as const,
    label: "Tiết kiệm theo tổng chi phí",
    absolutePct: value,
  };
}
