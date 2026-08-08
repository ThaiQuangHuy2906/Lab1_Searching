import assert from "node:assert/strict";
import test from "node:test";

import {
  ALGORITHM_GROUPS,
  ALGORITHM_ORDER,
  chooseCompareAlgorithm,
  routeGuaranteeLabel,
} from "../lib/algorithm-policy.ts";
import { createLatestRequestGuard } from "../lib/latest-request.ts";

test("route catalog exposes exactly the nine current algorithms", () => {
  assert.deepEqual(ALGORITHM_ORDER, [
    "bfs", "dfs", "iddfs", "ucs", "astar",
    "greedy", "bidijkstra", "idastar", "beam",
  ]);
  assert.deepEqual(
    [...ALGORITHM_GROUPS.flatMap((group) => group.algos)].sort(),
    [...ALGORITHM_ORDER].sort(),
  );
});

test("compare algorithm is normalized away from the main algorithm", () => {
  assert.equal(chooseCompareAlgorithm("ucs", "ucs"), "bfs");
  assert.equal(chooseCompareAlgorithm("astar", "ucs"), "ucs");
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
