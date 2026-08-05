import { LayerExtension, type Layer, type LayerContext } from "@deck.gl/core";

interface RouteFlowOptions {
  durationMs: number;
  trailRatio: number;
  featherRatio: number;
}

interface RouteFlowUniforms extends Record<string, unknown> {
  head: number;
  trail: number;
  feather: number;
}

const routeFlowModule = {
  name: "routeFlow",
  inject: {
    "vs:#decl": `
in vec2 instanceRouteProgress;
out float vRouteProgress;
`,
    "vs:#main-end": `
vRouteProgress = mix(instanceRouteProgress.x, instanceRouteProgress.y, positions.x);
`,
    "fs:#decl": `
layout(std140) uniform routeFlowUniforms {
  float head;
  float trail;
  float feather;
} routeFlow;
in float vRouteProgress;
`,
    "fs:DECKGL_FILTER_COLOR": `
float routeFlowDistance = routeFlow.head - vRouteProgress;
if (routeFlowDistance < 0.0 || routeFlowDistance > routeFlow.trail) {
  discard;
}
float routeFlowHeadFade = smoothstep(0.0, routeFlow.feather, routeFlowDistance);
float routeFlowTailFade = 1.0 - smoothstep(
  routeFlow.trail - routeFlow.feather,
  routeFlow.trail,
  routeFlowDistance
);
color.a *= min(routeFlowHeadFade, routeFlowTailFade);
`,
  },
  uniformTypes: {
    head: "f32",
    trail: "f32",
    feather: "f32",
  },
} as const;

/**
 * Adds normalized route progress to PathLayer vertices, then moves a short
 * visible window in the fragment shader. deck.gl redraws it via `_animate`, so
 * React and the large G_real base layers stay untouched between frames.
 */
export class RouteFlowExtension extends LayerExtension<RouteFlowOptions> {
  static extensionName = "RouteFlowExtension";

  constructor(options: Partial<RouteFlowOptions> = {}) {
    super({
      durationMs: options.durationMs ?? 3_200,
      trailRatio: options.trailRatio ?? 0.13,
      featherRatio: options.featherRatio ?? 0.025,
    });
  }

  getShaders() {
    return { modules: [routeFlowModule] };
  }

  initializeState(this: Layer, _context: LayerContext, extension: this) {
    this.getAttributeManager()?.addInstanced({
      instanceRouteProgress: {
        size: 2,
        accessor: "getPath",
        transform: extension.getRouteProgress.bind(this),
      },
    });
  }

  draw(this: Layer, _params: unknown, extension: this) {
    const { durationMs, trailRatio, featherRatio } = extension.opts;
    const cycle = (performance.now() % durationMs) / durationMs;
    const uniforms: RouteFlowUniforms = {
      head: cycle * (1 + trailRatio),
      trail: trailRatio,
      feather: featherRatio,
    };
    this.setShaderModuleProps({ routeFlow: uniforms });
  }

  getRouteProgress(this: Layer, path: number[] | number[][]): number[] {
    const positionSize = this.props.positionFormat === "XY" ? 2 : 3;
    const nested = Array.isArray(path[0]);
    const pointCount = nested ? path.length : path.length / positionSize;
    if (pointCount < 2) return new Array(Math.max(0, pointCount) * 2).fill(0);

    const projected: number[][] = [];
    for (let i = 0; i < pointCount; i += 1) {
      const point = nested
        ? path[i] as number[]
        : (path as number[]).slice(i * positionSize, i * positionSize + positionSize);
      projected.push(this.projectPosition(point));
    }

    const cumulative = [0];
    for (let i = 1; i < projected.length; i += 1) {
      const previous = projected[i - 1];
      const current = projected[i];
      cumulative.push(cumulative[i - 1] + Math.hypot(
        current[0] - previous[0],
        current[1] - previous[1],
        (current[2] ?? 0) - (previous[2] ?? 0),
      ));
    }

    const total = cumulative[cumulative.length - 1];
    const progress: number[] = [];
    for (let i = 0; i < pointCount; i += 1) {
      const start = total > 0 ? cumulative[i] / total : 0;
      const end = total > 0 ? cumulative[Math.min(i + 1, pointCount - 1)] / total : start;
      progress.push(start, end);
    }
    return progress;
  }
}

export const ROUTE_FLOW_EXTENSION = new RouteFlowExtension();
