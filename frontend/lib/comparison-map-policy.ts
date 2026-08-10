export type ComparisonGridShape = "two_columns" | "balanced_three" | "balanced_quad";

export function comparisonGridShape(count: number): ComparisonGridShape {
  if (count <= 2) return "two_columns";
  return count === 3 ? "balanced_three" : "balanced_quad";
}
