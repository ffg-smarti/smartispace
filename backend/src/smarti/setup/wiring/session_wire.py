# smarti/setup/wiring/session_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher

logger = logging.getLogger(__name__)


def wire_session_commands(bus: CommandBus) -> None:
    
    logger.debug("Session domain wired: 0 handlers registered")


def wire_session_events(bus: CompositeEventDispatcher) -> None:
    ...


def wire_session_async_events(bus: CompositeEventDispatcher) -> None:
    """Wire session domain async events (placeholder for future events)."""
    pass
