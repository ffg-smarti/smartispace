# smarti/setup/wiring/plan_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher
from smarti.shared.infra.bus.query_bus import QueryBus

logger = logging.getLogger(__name__)


def wire_learnplan_commands(bus: CommandBus) -> None:
    ...


def wire_learnpath_commands(bus: CommandBus) -> None:
    ...


def wire_learnplan_queries(bus: QueryBus) -> None:
    logger.debug("Wiring learnplan queries")
    


def wire_learnpath_queries(bus: QueryBus) -> None:
    logger.debug("Wiring learnpath queries")
    ...


def wire_plan_events(bus: CompositeEventDispatcher) -> None:
    ...


def wire_plan_async_events(bus: CompositeEventDispatcher) -> None:
    """Wire plan domain async events (placeholder for future events)."""
    ...
