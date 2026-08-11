import assert from "node:assert/strict";
import test from "node:test";

import {
  activePanelControls,
  controlsLayoutPatch,
  moveStop,
  singleRunCta,
} from "../lib/single-run-panel-policy.ts";

test("panel renders only controls for the explicit mode, strategy and run kind", () => {
  assert.deepEqual(activePanelControls("two_point", "ordered_search", "single"), {
    showGoal: true,
    showStops: false,
    showStrategy: false,
    selection: "route_algorithm",
  });
  assert.deepEqual(activePanelControls("multi_point", "ordered_search", "single"), {
    showGoal: false,
    showStops: true,
    showStrategy: true,
    selection: "route_algorithm",
  });
  assert.equal(
    activePanelControls("multi_point", "atsp", "single").selection,
    "atsp_method",
  );
  assert.equal(
    activePanelControls("multi_point", "atsp", "compare").selection,
    "atsp_comparison",
  );
  assert.equal(
    activePanelControls("two_point", "ordered_search", "compare").selection,
    "route_comparison",
  );
});

test("three single-run CTA variants are concrete and expose persistent block reasons", () => {
  const base = {
    runKind: "single",
    start: "A",
    goal: "B",
    stops: ["C"],
    algorithm: "astar",
    method: "held_karp",
  };
  assert.deepEqual(singleRunCta({
    ...base, problemMode: "two_point", multiStrategy: "ordered_search",
  }), {
    label: "Chạy A*: Đi → Đến",
    action: "route",
    blockedReason: null,
  });
  assert.deepEqual(singleRunCta({
    ...base, problemMode: "multi_point", multiStrategy: "ordered_search",
  }), {
    label: "Chạy A* theo thứ tự đã chọn",
    action: "route",
    blockedReason: null,
  });
  assert.deepEqual(singleRunCta({
    ...base, problemMode: "multi_point", multiStrategy: "atsp",
  }), {
    label: "Tối ưu bằng Held–Karp",
    action: "atsp",
    blockedReason: null,
  });
  assert.match(singleRunCta({
    ...base, problemMode: "two_point", multiStrategy: "ordered_search", start: null,
  }).blockedReason ?? "", /Đi/);
  assert.match(singleRunCta({
    ...base, problemMode: "multi_point", multiStrategy: "atsp", stops: Array(15).fill(0).map((_, index) => `S${index}`),
  }).blockedReason ?? "", /giới hạn 15/);
});

test("comparison selection cannot dispatch a single-run action", () => {
  const cta = singleRunCta({
    problemMode: "two_point",
    multiStrategy: "ordered_search",
    runKind: "compare",
    start: "A",
    goal: "B",
    stops: [],
    algorithm: "astar",
    comparisonAlgorithms: ["astar", "ucs", "bidijkstra"],
    method: "held_karp",
  });
  assert.deepEqual(cta, {
    label: "So sánh 3 thuật toán",
    action: "compare_route",
    blockedReason: null,
  });
  assert.match(singleRunCta({
    problemMode: "two_point",
    multiStrategy: "ordered_search",
    runKind: "compare",
    start: "A",
    goal: "B",
    stops: [],
    algorithm: "astar",
    comparisonAlgorithms: ["astar"],
    method: "held_karp",
  }).blockedReason ?? "", /ít nhất 2/);
});

test("ATSP comparison CTA validates 2-3 methods and Held-Karp eligibility", () => {
  const base = {
    problemMode: "multi_point",
    multiStrategy: "atsp",
    runKind: "compare",
    start: "A",
    goal: null,
    stops: ["B", "C"],
    algorithm: "astar",
    comparisonAlgorithms: ["astar", "ucs"],
    method: "held_karp",
  };
  assert.deepEqual(singleRunCta({
    ...base,
    atspComparisonMethods: ["held_karp", "sa"],
  }), {
    label: "So sánh 2 phương pháp ATSP",
    action: "compare_atsp",
    blockedReason: null,
  });
  assert.match(singleRunCta({
    ...base,
    atspComparisonMethods: ["sa"],
  }).blockedReason ?? "", /ít nhất 2/);
  assert.match(singleRunCta({
    ...base,
    stops: Array.from({ length: 15 }, (_, index) => `S${index}`),
    atspComparisonMethods: ["held_karp", "sa"],
  }).blockedReason ?? "", /Held–Karp.*16 điểm.*15/);
});

test("stop reorder respects boundaries and announces the moved item once", () => {
  assert.equal(moveStop(["A", "B", "C"], 0, "up"), null);
  assert.equal(moveStop(["A", "B", "C"], 2, "down"), null);
  assert.deepEqual(moveStop(["A", "B", "C"], 1, "up", (id) => `Điểm ${id}`), {
    order: ["B", "A", "C"],
    movedIndex: 0,
    announcement: "Đã chuyển Điểm B lên vị trí 1/3.",
  });
});

test("desktop collapse policy is layout-only", () => {
  assert.deepEqual(controlsLayoutPatch(false), { controlsOpen: false });
  assert.deepEqual(Object.keys(controlsLayoutPatch(true)), ["controlsOpen"]);
});
