"""Regression coverage for the Milestone 2 graph-view boundary.

The independent oracle is the tracked preset IDs plus an induced-edge scan of
the committed G_demo snapshot. Product search/TSP code is deliberately not
used to derive the expected edge sets.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from app.graph_store import GraphStore
from app.models import ScenarioConfig
from app.scenario import (
    GraphViewUnavailable,
    resolve_scenario,
    resolve_view_store,
    validate_teaching_presets,
)


EXPECTED_VIEWS = {
    "teach_7": (7, 24),
    "teach_15": (15, 62),
    "teach_25": (25, 114),
}


def _reachable_count(store: GraphStore, reverse: bool = False) -> int:
    adjacency = store.radj if reverse else store.adj
    root = store.graph.nodes[0].id
    seen = {root}
    stack = [root]
    while stack:
        node = stack.pop()
        for neighbour, _edge_id in adjacency[node]:
            if neighbour not in seen:
                seen.add(neighbour)
                stack.append(neighbour)
    return len(seen)


@pytest.mark.parametrize(("view", "node_count", "edge_count"), [
    (view, *counts) for view, counts in EXPECTED_VIEWS.items()
])
def test_teaching_view_is_induced_profile_complete_and_strongly_connected(
    view: str, node_count: int, edge_count: int,
):
    base = GraphStore.load("demo")
    store = resolve_view_store(base, view)

    view_nodes = {node.id for node in store.graph.nodes}
    expected_edges = {
        edge.id for edge in base.graph.edges
        if edge.u in view_nodes and edge.v in view_nodes
    }

    assert store is not base
    assert store.graph.meta.name == f"{base.graph.meta.name}:{view}"
    assert store.graph.meta.node_count == len(store.graph.nodes) == node_count
    assert store.graph.meta.edge_count == len(store.graph.edges) == edge_count
    assert {edge.id for edge in store.graph.edges} == expected_edges
    assert _reachable_count(store) == node_count
    assert _reachable_count(store, reverse=True) == node_count
    for congestion in store.profiles.profiles.values():
        assert set(congestion) == expected_edges

    # Resolving a view must never mutate the cached committed base snapshot.
    assert base.graph.meta.node_count == 51
    assert base.graph.meta.edge_count == 298
    assert all(len(congestion) == 298 for congestion in base.profiles.profiles.values())


def test_teaching_preset_validator_accepts_the_committed_snapshot():
    base = GraphStore.load("demo")

    validated = validate_teaching_presets(base)

    assert set(validated) == set(EXPECTED_VIEWS)


def test_real_graph_rejects_teaching_view_explicitly():
    with pytest.raises(GraphViewUnavailable) as caught:
        resolve_view_store(GraphStore.load("real"), "teach_7")

    assert caught.value.status_code == 422


def test_absent_empty_and_full_scenario_share_base_semantics_and_fingerprint():
    base = GraphStore.load("demo")

    resolved = [
        resolve_scenario(base, None),
        resolve_scenario(base, ScenarioConfig()),
        resolve_scenario(base, ScenarioConfig(graph_view="full")),
    ]

    fingerprints = {item.applied_scenario.fingerprint for item in resolved}
    assert all(item.store is base for item in resolved)
    assert {item.applied_scenario.graph_view for item in resolved} == {"full"}
    assert {item.applied_scenario.provenance for item in resolved} == {"base"}
    assert {item.applied_scenario.override_count for item in resolved} == {0}
    assert len(fingerprints) == 1
    assert re.fullmatch(r"scenario-v1:[0-9a-f]{64}", fingerprints.pop())


def test_teaching_scenario_uses_a_distinct_graph_view_fingerprint():
    base = GraphStore.load("demo")

    full = resolve_scenario(base, None)
    teach = resolve_scenario(base, ScenarioConfig(graph_view="teach_7"))

    assert teach.applied_scenario.provenance == "graph_view"
    assert teach.applied_scenario.override_count == 0
    assert teach.applied_scenario.fingerprint != full.applied_scenario.fingerprint
    assert teach.store.graph.meta.node_count == 7


def test_teaching_generator_uses_the_same_teach_7_view_and_heuristic_bound(monkeypatch):
    scripts_dir = Path(__file__).resolve().parents[2] / "scripts"
    monkeypatch.syspath_prepend(str(scripts_dir))
    from gen_teaching_doc import build_substore

    base = GraphStore.load("demo")
    generated, labels = build_substore(base)
    resolved = resolve_view_store(base, "teach_7")

    assert {node.id for node in generated.graph.nodes} == {
        node.id for node in resolved.graph.nodes
    }
    assert {edge.id for edge in generated.graph.edges} == {
        edge.id for edge in resolved.graph.edges
    }
    assert generated.v_max_ms == resolved.v_max_ms
    assert len(labels) == 7
