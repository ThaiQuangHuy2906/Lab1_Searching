import assert from "node:assert/strict";
import test from "node:test";

import {
  effectiveTraceSteps,
  isEndpointOptionAllowed,
  isGraphResponseCurrent,
  isStopOptionAllowed,
  isTrafficResponseCurrent,
  graphViewChangePatch,
  routeRunBlockReason,
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

test("two-point route and multiroute inputs are mutually exclusive and unique", () => {
  assert.match(routeRunBlockReason("n1", "n2", ["n3"]), /Chế độ nhiều điểm/);
  assert.equal(isEndpointOptionAllowed("start", "n3", "n2", ["n3"]), false);
  assert.equal(isEndpointOptionAllowed("goal", "n3", "n1", ["n3"]), false);
  assert.equal(isStopOptionAllowed("n2", "n1", "n2", ["n3"]), false);
  assert.equal(isStopOptionAllowed("n4", "n1", "n2", ["n3"]), true);
});

test("effective trace steps disappear when G_real trace is disabled", () => {
  const step = { expanded: "n1", frontier: [] };
  const trace = { trace: [step] };
  assert.deepEqual(effectiveTraceSteps(trace, "demo", false), [step]);
  assert.deepEqual(effectiveTraceSteps(trace, "real", false), []);
  assert.deepEqual(effectiveTraceSteps(trace, "real", true), [step]);
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
