# smarti/setup/wiring/profiles_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher

logger = logging.getLogger(__name__)


def wire_profile_commands(bus: CommandBus) -> None:

    wire_learning_pace_commands(bus)


def wire_learning_pace_commands(bus: CommandBus) -> None:
    
    wire_learning_assets_commands(bus)


def wire_learning_assets_commands(bus: CommandBus) -> None:
    ...


def wire_profile_events(bus: CompositeEventDispatcher) -> None:
    """Wire profile domain sync events (placeholder for future events)."""
    pass


def wire_learning_pace_events(bus: CompositeEventDispatcher) -> None:
    ...
