import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRouteMapGeometry,
  graphNodeBounds,
  nodeCoordinateMap,
  pathCoordinates,
  routeArrowPoints,
} from "../lib/map-geometry.ts";

const nodes = [
  { id: "a", name: "A", lat: 10.77, lon: 106.69, type: "landmark" },
  { id: "b", name: "B", lat: 10.78, lon: 106.71, type: "landmark" },
  { id: "c", name: "C", lat: 10.76, lon: 106.70, type: "landmark" },
];
const edges = [
  { id: "a-b", u: "a", v: "b", length_m: 1, t_free_s: 1, highway: "primary", name: "A đến B" },
  { id: "b-missing", u: "b", v: "missing", length_m: 1, t_free_s: 1, highway: "primary" },
];

test("graph geometry uses the actual node cloud and drops missing path IDs", () => {
  const coordinates = nodeCoordinateMap(nodes);
  assert.deepEqual(graphNodeBounds(nodes), [[106.69, 10.76], [106.71, 10.78]]);
  assert.deepEqual(pathCoordinates(["a", "missing", "b"], coordinates), [
    [106.69, 10.77],
    [106.71, 10.78],
  ]);
  assert.equal(graphNodeBounds([]), null);
});

test("shared geometry resolves edge coordinates once and drops invalid endpoints", () => {
  const geometry = buildRouteMapGeometry(nodes, edges);
  assert.deepEqual(geometry.bounds, [[106.69, 10.76], [106.71, 10.78]]);
  assert.equal(geometry.edges.length, 1);
  assert.deepEqual(geometry.edges[0], {
    id: "a-b",
    u: "a",
    v: "b",
    name: "A đến B",
    source: [106.69, 10.77],
    target: [106.71, 10.78],
  });
});

test("route arrows keep geometry unchanged and apply only a screen-space offset", () => {
  const path = [[106.69, 10.77], [106.70, 10.77], [106.71, 10.78]];
  const plain = routeArrowPoints([path], 0);
  const offset = routeArrowPoints([path], 4);
  assert.equal(plain.length, offset.length);
  assert.deepEqual(plain.map((point) => point.pos), offset.map((point) => point.pos));
  assert.ok(plain.every((point) => point.pixelOffset[0] === 0 && point.pixelOffset[1] === 0));
  assert.ok(offset.some((point) => Math.hypot(...point.pixelOffset) > 3.9));
});
