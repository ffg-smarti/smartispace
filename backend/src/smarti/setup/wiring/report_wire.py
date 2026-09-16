# smarti/setup/wiring/report_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher

logger = logging.getLogger(__name__)


def wire_report_commands(bus: CommandBus) -> None:
    logger.debug("Wiring report domain")
    

def wire_report_events(bus: CompositeEventDispatcher) -> None:
    """Wire report domain sync events."""
    
    logger.debug("Report events wired: 0 handler registered")
