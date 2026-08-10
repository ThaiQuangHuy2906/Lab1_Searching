export type MapCanvasMode = "primary" | "comparison";

export interface MapCanvasCapabilities {
  allowJourneyPicking: boolean;
  allowEdgeEditing: boolean;
  allowClear: boolean;
  allowSearchAnimation: boolean;
  showPrimaryChrome: boolean;
  allowNavigation: true;
}

/**
 * Comparison panes are view-only for application data but remain navigable.
 * Keeping this policy pure prevents a comparison pane from accidentally
 * inheriting single-run edge editing, node picking, clearing or animation.
 */
export function mapCanvasCapabilities(mode: MapCanvasMode): MapCanvasCapabilities {
  const primary = mode === "primary";
  return {
    allowJourneyPicking: primary,
    allowEdgeEditing: primary,
    allowClear: primary,
    allowSearchAnimation: primary,
    showPrimaryChrome: primary,
    allowNavigation: true,
  };
}
