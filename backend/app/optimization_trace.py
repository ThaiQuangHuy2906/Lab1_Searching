"""Bounded, deterministic recorder for the ATSP optimization trace.

The recorder never controls a solver.  It only counts eligible events and
materializes an event dictionary when the fixed sampling policy retains it;
therefore enabling a trace cannot consume solver RNG or alter its result.
"""

from __future__ import annotations

import math
from collections.abc import Callable
from typing import Literal

from .models import OptimizationTrace, TspMethod


HELD_KARP_TRACE_CAP = 2_000
NN_LOCAL_TRACE_CAP = 2_000
SA_TRACE_CAP = 1_500
SA_PERIODIC_INTERVAL = 20

EventFactory = Callable[[int], dict]
EventPriority = Literal["normal", "boundary", "new_best", "periodic"]


class OptimizationTraceRecorder:
    """Record only the response payload selected by the method's fixed policy."""

    def __init__(self, method: TspMethod, *, enabled: bool, point_count: int):
        self.method = method
        self.enabled = enabled
        self.point_count = point_count
        self.total_events = 0
        self.events: list[dict] = []

        if method == "held_karp":
            self.cap = HELD_KARP_TRACE_CAP
            self.sampling_policy = "all-or-stride-v1"
            # Reconstruction and summary are retained separately.  This is the
            # documented upper bound for successful Held-Karp DP transitions.
            upper_bound = (point_count - 1) + (
                (point_count - 1) * (point_count - 2) * (2 ** max(point_count - 3, 0))
            )
            self._stride = 1 if point_count <= 8 else max(
                1, math.ceil(upper_bound / (self.cap - 2)),
            )
        elif method == "nn_2opt":
            self.cap = NN_LOCAL_TRACE_CAP
            self.sampling_policy = "chronological-prefix-final-v1"
            self._stride = 1
        else:
            self.cap = SA_TRACE_CAP
            self.sampling_policy = "priority-periodic-20-v1"
            self._stride = 1
            # Event dictionaries are intentionally deferred for the two
            # sampleable priority classes. This lets build() first allocate
            # capacity to all new-best events, then periodic events, while
            # materializing only the final retained payload.
            self._sa_pending: dict[str, list[tuple[int, EventFactory]]] = {
                "new_best": [],
                "periodic": [],
            }

    def emit(
        self,
        factory: EventFactory,
        *,
        final: bool = False,
        priority: EventPriority = "normal",
    ) -> None:
        """Count one eligible event; call ``factory`` only when it is retained."""
        ordinal = self.total_events
        self.total_events += 1
        if not self.enabled:
            return
        if self.method == "sa" and priority in ("new_best", "periodic") and not final:
            self._sa_pending[priority].append((ordinal, factory))
            return
        if not self._keep(ordinal, final=final, priority=priority):
            return
        self.events.append(factory(ordinal))

    def _keep(self, ordinal: int, *, final: bool, priority: EventPriority) -> bool:
        if final:
            return True
        if self.method == "held_karp":
            return ordinal % self._stride == 0 and len(self.events) < self.cap - 2
        if self.method == "nn_2opt":
            return len(self.events) < self.cap - 1

        if priority == "boundary":
            return len(self.events) < self.cap - 2
        return False

    def build(self) -> OptimizationTrace | None:
        if not self.enabled:
            return None
        if self.method == "sa":
            self._materialize_sa_samples()
        return OptimizationTrace(
            method=self.method,
            total_events=self.total_events,
            recorded_events=len(self.events),
            sampling_policy=self.sampling_policy,
            trace_truncated=self.total_events > len(self.events),
            events=self.events,
        )

    def _materialize_sa_samples(self) -> None:
        """Finish the documented priority allocation without solver RNG."""
        # Repeated build() calls must be observationally stable.
        if not self._sa_pending["new_best"] and not self._sa_pending["periodic"]:
            return
        remaining = self.cap - len(self.events)
        retained: list[tuple[int, EventFactory]] = []
        for priority in ("new_best", "periodic"):
            selected = self._evenly_sample(self._sa_pending[priority], remaining)
            retained.extend(selected)
            remaining -= len(selected)
        self.events.extend(factory(ordinal) for ordinal, factory in retained)
        self.events.sort(key=lambda event: event["ordinal"])
        self._sa_pending["new_best"].clear()
        self._sa_pending["periodic"].clear()

    @staticmethod
    def _evenly_sample(
        candidates: list[tuple[int, EventFactory]], limit: int,
    ) -> list[tuple[int, EventFactory]]:
        if limit <= 0:
            return []
        if len(candidates) <= limit:
            return candidates
        if limit == 1:
            return [candidates[0]]
        return [
            candidates[(index * (len(candidates) - 1)) // (limit - 1)]
            for index in range(limit)
        ]
