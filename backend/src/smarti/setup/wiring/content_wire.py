# smarti/setup/wiring/content_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher

logger = logging.getLogger(__name__)


def wire_content_commands(bus: CommandBus) -> None:
    """Wire content domain commands (placeholder for future commands)."""
    pass


def wire_content_events(bus: CompositeEventDispatcher) -> None:
    """Wire content domain sync events (placeholder for future events)."""
    pass
