import type { GraphView } from "./types";

export const MIN_DEMO_NODE_COUNT = 3;
export const MAX_DEMO_NODE_COUNT = 51;

export function parseDemoNodeCount(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value)
    && value >= MIN_DEMO_NODE_COUNT
    && value <= MAX_DEMO_NODE_COUNT
    ? value
    : null;
}

export function graphViewForNodeCount(nodeCount: number): GraphView {
  if (!Number.isInteger(nodeCount)
      || nodeCount < MIN_DEMO_NODE_COUNT
      || nodeCount > MAX_DEMO_NODE_COUNT) {
    throw new RangeError("G_demo node count must be an integer from 3 to 51.");
  }
  return nodeCount === MAX_DEMO_NODE_COUNT ? "full" : `teach_${nodeCount}`;
}

export function nodeCountForGraphView(view: GraphView): number {
  if (view === "full") return MAX_DEMO_NODE_COUNT;
  const match = /^teach_(\d+)$/.exec(view);
  const count = match ? Number(match[1]) : Number.NaN;
  return Number.isInteger(count)
    && count >= MIN_DEMO_NODE_COUNT
    && count < MAX_DEMO_NODE_COUNT
    ? count
    : MAX_DEMO_NODE_COUNT;
}
