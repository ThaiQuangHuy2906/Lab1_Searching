import type { GraphEdge, GraphNode } from "./types";

export type MapCoordinate = [number, number];
export type MapBounds = [MapCoordinate, MapCoordinate];

const METERS_PER_DEGREE_LAT = 110_540;

export interface RouteArrowPoint {
  pos: MapCoordinate;
  angle: number;
  pixelOffset: MapCoordinate;
}

export interface MapEdgeGeometry {
  id: string;
  u: string;
  v: string;
  name: string;
  source: MapCoordinate;
  target: MapCoordinate;
}

export interface RouteMapGeometry {
  coordinates: ReadonlyMap<string, MapCoordinate>;
  bounds: MapBounds | null;
  edges: readonly MapEdgeGeometry[];
}

export function nodeCoordinateMap(nodes: readonly GraphNode[]): Map<string, MapCoordinate> {
  return new Map(nodes.map((node) => [node.id, [node.lon, node.lat]]));
}

export function graphNodeBounds(nodes: readonly GraphNode[]): MapBounds | null {
  if (nodes.length === 0) return null;
  let minLon = nodes[0].lon;
  let maxLon = nodes[0].lon;
  let minLat = nodes[0].lat;
  let maxLat = nodes[0].lat;
  for (const node of nodes.slice(1)) {
    minLon = Math.min(minLon, node.lon);
    maxLon = Math.max(maxLon, node.lon);
    minLat = Math.min(minLat, node.lat);
    maxLat = Math.max(maxLat, node.lat);
  }
  return [[minLon, minLat], [maxLon, maxLat]];
}

export function buildRouteMapGeometry(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): RouteMapGeometry {
  const coordinates = nodeCoordinateMap(nodes);
  return {
    coordinates,
    bounds: graphNodeBounds(nodes),
    edges: edges.flatMap((edge) => {
      const source = coordinates.get(edge.u);
      const target = coordinates.get(edge.v);
      if (!source || !target) return [];
      return [{
        id: edge.id,
        u: edge.u,
        v: edge.v,
        name: edge.name ?? edge.highway,
        source,
        target,
      }];
    }),
  };
}

export function pathCoordinates(
  nodeIds: readonly string[],
  coordinates: ReadonlyMap<string, MapCoordinate>,
): MapCoordinate[] {
  return nodeIds.flatMap((nodeId) => {
    const coordinate = coordinates.get(nodeId);
    return coordinate ? [coordinate] : [];
  });
}

export function routeArrowPoints(
  paths: readonly MapCoordinate[][],
  offsetPixels = 0,
  spacingMeters = 220,
): RouteArrowPoint[] {
  const points: RouteArrowPoint[] = [];
  for (const path of paths) {
    let since = Infinity;
    for (let index = 0; index + 1 < path.length; index += 1) {
      const [x1, y1] = path[index];
      const [x2, y2] = path[index + 1];
      const latMid = (y1 + y2) / 2;
      const dxm = (x2 - x1) * METERS_PER_DEGREE_LAT * Math.cos((latMid * Math.PI) / 180);
      const dym = (y2 - y1) * METERS_PER_DEGREE_LAT;
      const hop = Math.hypot(dxm, dym);
      since += hop;
      if (since < spacingMeters) continue;
      points.push({
        pos: [(x1 + x2) / 2, latMid],
        angle: (Math.atan2(dym, dxm) * 180) / Math.PI,
        pixelOffset: hop > 0
          ? [(dym / hop) * offsetPixels, (dxm / hop) * offsetPixels]
          : [0, 0],
      });
      since = 0;
    }
  }
  return points;
}
