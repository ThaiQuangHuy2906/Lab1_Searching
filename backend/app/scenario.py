"""Request-scoped graph-view resolution for the public API.

Base snapshots stay in ``GraphStore.load()``.  Teaching views are recreated as
small induced stores from the tracked preset config, so neither cached base
models nor on-disk JSON can be mutated by an API request.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from .graph_store import GraphStore
from .models import (
    AppliedScenario,
    GraphFile,
    GraphResponse,
    GraphView,
    GraphViewMeta,
    ScenarioConfig,
    TrafficProfiles,
)


ROOT = Path(__file__).resolve().parents[2]
PRESET_PATH = ROOT / "data" / "teaching_graph_presets.json"
TEACHING_VIEWS = ("teach_7", "teach_15", "teach_25")
EXPECTED_VIEW_SHAPES = {
    "teach_7": (7, 24),
    "teach_15": (15, 62),
    "teach_25": (25, 114),
}
CANONICAL_TEACH_7 = (
    "n0018", "n0019", "n0020", "n0022", "n0028", "n0037", "n0038",
)


class GraphViewUnavailable(Exception):
    """Typed boundary failure; details stay in server logs for config errors."""

    def __init__(self, detail: str, status_code: int) -> None:
        super().__init__(detail)
        self.status_code = status_code


@dataclass(frozen=True)
class TeachingPreset:
    node_ids: tuple[str, ...]
    expected_edge_count: int


@dataclass(frozen=True)
class ResolvedScenario:
    store: GraphStore
    applied_scenario: AppliedScenario


def _config_error(detail: str) -> GraphViewUnavailable:
    return GraphViewUnavailable(detail, status_code=500)


def _strongly_connected(node_ids: set[str], edges: list) -> bool:
    if not node_ids:
        return False
    forward = {node_id: [] for node_id in node_ids}
    reverse = {node_id: [] for node_id in node_ids}
    for edge in edges:
        forward[edge.u].append(edge.v)
        reverse[edge.v].append(edge.u)

    def reached(adjacency: dict[str, list[str]]) -> set[str]:
        root = next(iter(node_ids))
        seen = {root}
        stack = [root]
        while stack:
            for neighbour in adjacency[stack.pop()]:
                if neighbour not in seen:
                    seen.add(neighbour)
                    stack.append(neighbour)
        return seen

    return reached(forward) == node_ids and reached(reverse) == node_ids


def validate_teaching_presets(
    base: GraphStore, preset_path: Path = PRESET_PATH,
) -> dict[str, TeachingPreset]:
    """Parse and fully validate the tracked teaching-view config.

    This deliberately uses the same pure-Python SCC check as the data gate,
    not NetworkX, because it is production runtime code.
    """
    try:
        raw = json.loads(preset_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise _config_error(f"cannot read teaching preset config: {exc}") from exc

    if not isinstance(raw, dict) or set(raw) != {
        "version", "base_graph", "base_created", "views",
    }:
        raise _config_error("teaching preset config has an invalid top-level shape")
    if raw["version"] != 1:
        raise _config_error("teaching preset config version must be 1")
    if raw["base_graph"] != base.graph.meta.name:
        raise _config_error("teaching preset base_graph does not match G_demo")
    if raw["base_created"] != base.graph.meta.created.isoformat():
        raise _config_error("teaching preset base_created does not match G_demo")

    views = raw["views"]
    if not isinstance(views, dict) or set(views) != set(TEACHING_VIEWS):
        raise _config_error("teaching preset config must define exactly the three teach views")

    base_node_ids = {node.id for node in base.graph.nodes}
    presets: dict[str, TeachingPreset] = {}
    for view in TEACHING_VIEWS:
        item = views[view]
        if not isinstance(item, dict) or set(item) != {"node_ids", "expected_edge_count"}:
            raise _config_error(f"{view} has an invalid shape")
        node_ids = item["node_ids"]
        expected_edge_count = item["expected_edge_count"]
        if (not isinstance(node_ids, list) or not all(isinstance(node_id, str) for node_id in node_ids)
                or isinstance(expected_edge_count, bool) or not isinstance(expected_edge_count, int)):
            raise _config_error(f"{view} has invalid node_ids or expected_edge_count")
        expected_nodes, expected_edges = EXPECTED_VIEW_SHAPES[view]
        if len(node_ids) != expected_nodes or expected_edge_count != expected_edges:
            raise _config_error(f"{view} does not match its canonical size")
        if len(set(node_ids)) != len(node_ids):
            raise _config_error(f"{view} contains duplicate node IDs")
        unknown = set(node_ids) - base_node_ids
        if unknown:
            raise _config_error(f"{view} contains unknown node IDs: {sorted(unknown)}")
        presets[view] = TeachingPreset(tuple(node_ids), expected_edge_count)

    if presets["teach_7"].node_ids != CANONICAL_TEACH_7:
        raise _config_error("teach_7 no longer matches the teaching-generator source set")

    node_sets = {view: set(preset.node_ids) for view, preset in presets.items()}
    if not (node_sets["teach_7"] < node_sets["teach_15"] < node_sets["teach_25"] < base_node_ids):
        raise _config_error("teaching views are no longer strict nested subsets of G_demo")

    for view, preset in presets.items():
        node_set = node_sets[view]
        induced_edges = [
            edge for edge in base.graph.edges
            if edge.u in node_set and edge.v in node_set
        ]
        if len(induced_edges) != preset.expected_edge_count:
            raise _config_error(
                f"{view} has {len(induced_edges)} induced edges, expected {preset.expected_edge_count}"
            )
        if not _strongly_connected(node_set, induced_edges):
            raise _config_error(f"{view} is not strongly connected")
    return presets


def resolve_view_store(base: GraphStore, view: GraphView) -> GraphStore:
    """Return the full base or a new immutable induced teaching view."""
    if view == "full":
        return base
    if base.level != "demo":
        raise GraphViewUnavailable("G_real only supports view=full", status_code=422)

    presets = validate_teaching_presets(base)
    preset = presets[view]
    node_set = set(preset.node_ids)
    nodes = [node for node in base.graph.nodes if node.id in node_set]
    edges = [
        edge for edge in base.graph.edges
        if edge.u in node_set and edge.v in node_set
    ]
    left = min(node.lon for node in nodes)
    bottom = min(node.lat for node in nodes)
    right = max(node.lon for node in nodes)
    top = max(node.lat for node in nodes)
    graph = GraphFile(
        meta=base.graph.meta.model_copy(update={
            "name": f"{base.graph.meta.name}:{view}",
            "bbox": (left, bottom, right, top),
            "node_count": len(nodes),
            "edge_count": len(edges),
        }),
        nodes=nodes,
        edges=edges,
    )
    edge_ids = {edge.id for edge in edges}
    profiles = TrafficProfiles(
        meta=base.profiles.meta.model_copy(update={"graph": graph.meta.name}),
        profiles={
            slot: {
                edge_id: congestion
                for edge_id, congestion in slot_profile.items()
                if edge_id in edge_ids
            }
            for slot, slot_profile in base.profiles.profiles.items()
        },
    )
    return GraphStore(graph, profiles, base.level)


def graph_response(base: GraphStore, view: GraphView) -> GraphResponse:
    """Build the response-only graph envelope without changing persisted JSON."""
    store = resolve_view_store(base, view)
    return GraphResponse(
        **store.graph.model_dump(mode="python"),
        view_meta=GraphViewMeta(
            base_graph=base.level,
            graph_view=view,
            base_node_count=base.graph.meta.node_count,
        ),
    )


def canonical_fingerprint(base: GraphStore, graph_view: GraphView) -> str:
    """Fingerprint the effective no-override scenario; M4 extends the payload."""
    payload = {
        "version": "scenario-v1",
        "graph_level": base.level,
        "base_graph": {
            "name": base.graph.meta.name,
            "created": base.graph.meta.created.isoformat(),
        },
        "profile": {
            "created": base.profiles.meta.created.isoformat(),
            "source": base.profiles.meta.source,
        },
        "graph_view": graph_view,
        "edge_overrides": [],
    }
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return f"scenario-v1:{hashlib.sha256(serialized).hexdigest()}"


def resolve_scenario(
    base: GraphStore, config: ScenarioConfig | None,
) -> ResolvedScenario:
    """Resolve the M2 no-override scenario and construct its provenance echo."""
    scenario = config or ScenarioConfig()
    store = resolve_view_store(base, scenario.graph_view)
    provenance = "base" if scenario.graph_view == "full" else "graph_view"
    applied = AppliedScenario(
        graph_view=scenario.graph_view,
        override_count=0,
        provenance=provenance,
        fingerprint=canonical_fingerprint(base, scenario.graph_view),
    )
    return ResolvedScenario(store=store, applied_scenario=applied)
