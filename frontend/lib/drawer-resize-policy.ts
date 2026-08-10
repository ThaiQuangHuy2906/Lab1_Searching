export const DEFAULT_DRAWER_WIDTH = 400;
export const MIN_DRAWER_WIDTH = 360;
export const MAX_DRAWER_WIDTH = 720;

export function availableDrawerWidth(viewportWidth: number): number {
  // Reserve enough room for the 320 px controls rail, gutters and a usable map.
  return Math.min(
    MAX_DRAWER_WIDTH,
    Math.max(DEFAULT_DRAWER_WIDTH, viewportWidth - 680),
  );
}

export function clampDrawerWidth(value: number, maximum: number): number {
  return Math.min(maximum, Math.max(MIN_DRAWER_WIDTH, value));
}
