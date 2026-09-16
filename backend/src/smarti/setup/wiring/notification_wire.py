# smarti/setup/wiring/notification_wire.py
from __future__ import annotations

import logging

from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher

logger = logging.getLogger(__name__)


def wire_notification_commands(bus: CommandBus) -> None:
    logger.debug("Wiring notification domain")
    


def wire_notification_events(bus: CompositeEventDispatcher) -> None:
    """Wire notification domain sync events.

    Registriert:
    - FFGReportNotificationACL für ReportCalculatedEvent.
    """
    
