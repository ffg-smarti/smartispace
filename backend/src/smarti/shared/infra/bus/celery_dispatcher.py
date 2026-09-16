# smarti/shared/infra/bus/celery_dispatcher.py
"""Celery Event Dispatcher for async domain events."""

from __future__ import annotations

import logging
from collections.abc import Callable

from smarti.shared.appl.ports import IDomainEventDispatcher
from smarti.shared.domain.event import AsyncDomainEvent, DomainEventBase
from smarti.shared.infra.bus.celery_tasks import (
    process_default_event,
    process_email_event,
    process_external_event,
    process_report_event,
)

logger = logging.getLogger(__name__)

# Task mapping by queue name
TASK_MAP: dict[str, Callable] = {
    "default":  process_default_event,
    "emails":   process_email_event,
    "reports":  process_report_event,
    "external": process_external_event,
}


def _queue_for(event: DomainEventBase) -> str:
    """Determine queue based on event type."""
    event_name = type(event).__name__.lower()
    if "email" in event_name or "mail" in event_name:
        return "emails"
    elif "report" in event_name or "export" in event_name:
        return "reports"
    elif "external" in event_name or "webhook" in event_name or "notification" in event_name:
        return "external"
    return "default"


def _queue_for_class(event_class: str) -> str:
    """Map event class string to queue name."""
    event_lower = event_class.lower()
    if "email" in event_lower or "mail" in event_lower:
        return "emails"
    elif "report" in event_lower or "export" in event_lower:
        return "reports"
    elif "external" in event_lower or "webhook" in event_lower or "notification" in event_lower:
        return "external"
    return "default"


class CeleryEventDispatcher(IDomainEventDispatcher):
    """Dispatches async events to Celery tasks."""

    def __init__(self):
        self._handlers: dict[type[DomainEventBase], list[Callable]] = {}

    def register(self, event_type: type[DomainEventBase], handler: Callable) -> None:
        """Register a handler for an async event type."""
        if not issubclass(event_type, AsyncDomainEvent):
            raise TypeError(f"CeleryEventDispatcher only supports AsyncDomainEvent, got {event_type}")

        if event_type not in self._handlers:
            self._handlers[event_type] = []

        if handler not in self._handlers[event_type]:
            self._handlers[event_type].append(handler)
            logger.info("Registered async handler '%s' for event '%s'", handler.__name__, event_type.__name__)
        else:
            logger.warning("Handler '%s' already registered for event '%s'", handler.__name__, event_type.__name__)

    def has_registrations(self, event_type: type[DomainEventBase]) -> bool:
        """Check if there are any handlers registered for an event type."""
        return event_type in self._handlers and len(self._handlers[event_type]) > 0

    def dispatch(self, event: DomainEventBase) -> None:
        """Dispatch event to Celery task."""
        if not isinstance(event, AsyncDomainEvent):
            raise TypeError("CeleryEventDispatcher supports only AsyncDomainEvent")

        queue = _queue_for(event)
        task = TASK_MAP[queue]
        task.apply_async(  # type: ignore[attr-defined]
            args=(event.model_dump(), f"{type(event).__module__}.{type(event).__qualname__}"),
            routing_key=f"{queue}.{type(event).__name__}",
        )
        logger.info("Dispatched async event %s to queue %s", type(event).__name__, queue)
