"""Regression tests for benchmark/report artifact semantics.

These tests use temporary outputs only. They must never rewrite ``results/`` or
the generated teaching document in the repository.
"""

from types import SimpleNamespace

import pytest

from app import benchmark
from scripts import gen_teaching_doc


def test_exp5_avg_time_uses_time_mode_cost(monkeypatch, tmp_path):
    """avg_time_s is travel time, not balanced cost with risk penalties."""

    class FakeStore:
        def reweighted(self, _gamma):
            return self

        def path_metrics(self, path, mode, slot):
            assert path == ["a", "b"]
            assert mode == "time"
            assert slot == "07:30"
            return 12.3, 456.7, 99.9  # time cost, distance, balanced total

    captured = {}
    monkeypatch.setattr(
        benchmark,
        "astar",
        lambda *_args, **_kwargs: SimpleNamespace(path=["a", "b"]),
    )
    monkeypatch.setattr(
        benchmark,
        "write_csv",
        lambda name, header, rows: captured.update(
            name=name, header=header, rows=rows
        ),
    )
    monkeypatch.setattr(benchmark, "FIGS", tmp_path)

    benchmark.exp5(FakeStore(), [("a", "b")])

    assert captured["name"] == "exp5_gamma.csv"
    assert captured["header"] == ["gamma", "avg_time_s", "avg_distance_m"]
    assert [row[1] for row in captured["rows"]] == ["12.3"] * 7
    assert [row[2] for row in captured["rows"]] == ["456.7"] * 7


def test_teaching_claim_reports_positive_gap_from_optimal_ratio(
    monkeypatch, tmp_path
):
    """ratio_optimal=optimal/candidate=0.9 means candidate is 11.1% worse."""

    results = tmp_path / "results"
    results.mkdir()
    (results / "exp3_benchmark.csv").write_text(
        "algorithm,nodes_expanded\n"
        "astar,80\n"
        "ucs,100\n",
        encoding="utf-8",
    )
    (results / "exp7_tsp.csv").write_text(
        "method,total_cost_s,savings_vs_original_pct,runtime_ms,ratio_optimal\n"
        "held_karp,90,10,1,1\n"
        "nn_2opt,100,0,1,0.9\n"
        "sa_best_of_5_seeds,90,10,1,1\n"
        "sa_mean±std,95±5,,,\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(gen_teaching_doc, "ROOT", tmp_path)

    numbers = gen_teaching_doc.load_benchmark_numbers()

    assert numbers["tsp_claim"] == (
        "NN+2-opt cách nghiệm Held-Karp +11,1%, "
        "SA đạt đúng nghiệm Held-Karp"
    )
