import assert from "node:assert/strict";
import test from "node:test";

import {
  effectiveTraceSteps,
  isEndpointOptionAllowed,
  isGraphResponseCurrent,
  isStopOptionAllowed,
  isTrafficResponseCurrent,
  graphViewChangePatch,
  journeyNodePickRadius,
  promoteGoalWhenAddingStop,
  routeRunBlockReason,
  routeTraceRequestFlag,
  slotChangePatch,
} from "../lib/interaction-policy.ts";
import { describeAtspSavings } from "../lib/atsp-savings.ts";

test("same slot is a no-op and a real slot change clears dependent state", () => {
  assert.equal(slotChangePatch("07:30", "07:30"), null);
  assert.deepEqual(slotChangePatch("07:30", "12:00"), {
    slot: "12:00",
    traffic: null,
    trace: null,
    compare: null,
    multi: null,
    sequentialRoute: null,
    stepIdx: 0,
    playing: false,
  });
});

test("graph-view changes are no-ops for the same view and clear dependent state otherwise", () => {
  assert.equal(graphViewChangePatch("full", "full"), null);
  assert.deepEqual(graphViewChangePatch("full", "teach_7"), {
    graphView: "teach_7",
    graphData: null,
    traffic: null,
    trace: null,
    compare: null,
    multi: null,
    sequentialRoute: null,
    start: null,
    goal: null,
    stops: [],
    stepIdx: 0,
    playing: false,
    pickTarget: null,
  });
});

test("graph and traffic responses require matching level, view, and latest token", () => {
  assert.equal(
    isGraphResponseCurrent("demo", "teach_7", "demo", "teach_7", "demo", "teach_7", true),
    true,
  );
  assert.equal(
    isGraphResponseCurrent("demo", "teach_7", "demo", "full", "demo", "teach_7", true),
    false,
  );
  assert.equal(
    isTrafficResponseCurrent(
      "07:30", "demo", "teach_7", "demo", "teach_7",
      "07:30", "demo", "teach_7", true,
    ),
    true,
  );
  assert.equal(
    isTrafficResponseCurrent(
      "07:30", "demo", "teach_7", "demo", "teach_7",
      "12:00", "demo", "teach_7", true,
    ),
    false,
  );
  assert.equal(
    isTrafficResponseCurrent(
      "07:30", "demo", "teach_7", "demo", "full",
      "07:30", "demo", "teach_7", true,
    ),
    false,
  );
  assert.equal(
    isTrafficResponseCurrent(
      "07:30", "demo", "teach_7", "demo", "teach_7",
      "07:30", "demo", "teach_7", false,
    ),
    false,
  );
});

test("two-point and ordered multi-point routes require unique usable inputs", () => {
  assert.equal(routeRunBlockReason("n1", null, ["n2", "n3"]), null);
  assert.match(routeRunBlockReason(null, null, ["n2"]), /điểm Đi/);
  assert.match(routeRunBlockReason("n1", null, ["n2", "n1"]), /trùng/);
  assert.match(routeRunBlockReason("n1", null, []), /Đi và điểm Đến/);
  assert.equal(isEndpointOptionAllowed("start", "n3", "n2", ["n3"]), false);
  assert.equal(isEndpointOptionAllowed("goal", "n3", "n1", ["n3"]), false);
  assert.equal(isStopOptionAllowed("n2", "n1", "n2", ["n3"]), false);
  assert.equal(isStopOptionAllowed("n4", "n1", "n2", ["n3"]), true);
});

test("adding C to A→B preserves B and creates the ordered route A→B→C", () => {
  assert.deepEqual(promoteGoalWhenAddingStop("B", [], ["C"]), ["B", "C"]);
  assert.deepEqual(promoteGoalWhenAddingStop(null, [], ["C"]), ["C"]);
  assert.deepEqual(promoteGoalWhenAddingStop("B", ["C"], []), []);
});

test("route trace stays visible on G_real like G_demo", () => {
  const step = { expanded: "n1", frontier: [] };
  const trace = { trace: [step] };
  assert.deepEqual(effectiveTraceSteps(trace, "demo", false), [step]);
  assert.deepEqual(effectiveTraceSteps(trace, "real", false), [step]);
  assert.deepEqual(effectiveTraceSteps(trace, "real", true), [step]);
});

test("G_real journey nodes have a practical invisible click target", () => {
  assert.equal(journeyNodePickRadius("demo"), 14);
  assert.equal(journeyNodePickRadius("real"), 12);
});

test("the teaching UI requests route trace for both graph levels", () => {
  assert.equal(routeTraceRequestFlag("demo"), true);
  assert.equal(routeTraceRequestFlag("real"), true);
});

test("ATSP savings copy is sign-aware", () => {
  assert.deepEqual(describeAtspSavings(12.5), {
    kind: "positive",
    label: "Tiết kiệm theo tổng chi phí",
    absolutePct: 12.5,
  });
  assert.deepEqual(describeAtspSavings(-4.2), {
    kind: "negative",
    label: "Mức tăng tổng chi phí",
    absolutePct: 4.2,
  });
  assert.equal(describeAtspSavings(-0.01).kind, "negative");
  assert.deepEqual(describeAtspSavings(0), {
    kind: "neutral",
    label: "Thay đổi tổng chi phí",
    absolutePct: 0,
  });
});
