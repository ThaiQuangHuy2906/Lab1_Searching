import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseCompareAlgorithm,
  routeGuaranteeLabel,
} from "../lib/algorithm-policy.ts";
import { createLatestRequestGuard } from "../lib/latest-request.ts";

test("compare algorithm is normalized away from the main algorithm", () => {
  assert.equal(chooseCompareAlgorithm("dijkstra", "dijkstra"), "bfs");
  assert.equal(chooseCompareAlgorithm("astar", "dijkstra"), "dijkstra");
});

test("IDA* guarantee copy exposes its epsilon bound", () => {
  assert.equal(
    routeGuaranteeLabel("idastar", true, 5, "m"),
    "Tối ưu trong ε = 5 m",
  );
  assert.equal(
    routeGuaranteeLabel("astar", true, null, "s"),
    "Đảm bảo tối ưu",
  );
  assert.equal(
    routeGuaranteeLabel("beam", false, null, "s"),
    "Không đảm bảo tối ưu",
  );
});

test("only the newest request token remains current", () => {
  const requests = createLatestRequestGuard();
  const first = requests.begin();
  const second = requests.begin();

  assert.equal(requests.isCurrent(first), false);
  assert.equal(requests.isCurrent(second), true);
});
