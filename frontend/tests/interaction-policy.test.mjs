import assert from "node:assert/strict";
import test from "node:test";

import {
  effectiveTraceSteps,
  isEndpointOptionAllowed,
  isStopOptionAllowed,
  isTrafficResponseCurrent,
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

test("traffic responses require both matching config and the latest token", () => {
  assert.equal(
    isTrafficResponseCurrent("07:30", "demo", "07:30", "demo", true),
    true,
  );
  assert.equal(
    isTrafficResponseCurrent("07:30", "demo", "12:00", "demo", true),
    false,
  );
  assert.equal(
    isTrafficResponseCurrent("07:30", "demo", "07:30", "demo", false),
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
