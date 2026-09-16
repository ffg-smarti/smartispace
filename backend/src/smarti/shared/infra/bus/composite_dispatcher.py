# smarti/shared/infra/bus/composite_dispatcher.py
"""Composite Event Dispatcher routing sync/async events."""

from __future__ import annotations

import logging
from collections.abc import Callable

from django.db import transaction

from smarti.shared.appl.ports import IDomainEventDispatcher
from smarti.shared.domain.event import AsyncDomainEvent, DomainEventBase
from smarti.shared.infra.bus.celery_dispatcher import CeleryEventDispatcher
from smarti.shared.infra.bus.event_bus import DomainEventDispatcher

logger = logging.getLogger(__name__)

_composite_dispatcher: CompositeEventDispatcher | None = None


def get_composite_dispatcher() -> CompositeEventDispatcher | None:
    """Get the singleton CompositeEventDispatcher instance."""
    return _composite_dispatcher


def set_composite_dispatcher(dispatcher: CompositeEventDispatcher) -> None:
    """Set the singleton CompositeEventDispatcher instance."""
    global _composite_dispatcher
    _composite_dispatcher = dispatcher


class CompositeEventDispatcher(IDomainEventDispatcher):
    """
    Routes events to sync or async dispatcher based on event type.

    - SyncDomainEvent (or DomainEventBase not AsyncDomainEvent) → DomainEventDispatcher (in-transaction)
    - AsyncDomainEvent → CeleryEventDispatcher (via transaction.on_commit)
    """

    def __init__(self):
        self._sync = DomainEventDispatcher()
        self._async = CeleryEventDispatcher()
        global _composite_dispatcher
        _composite_dispatcher = self

    def register(self, event_type: type[DomainEventBase], handler: Callable) -> None:
        """Register handler, routing by event type classification."""
        if issubclass(event_type, AsyncDomainEvent):
            self._async.register(event_type, handler)
        else:
            self._sync.register(event_type, handler)

    def dispatch(self, event: DomainEventBase) -> None:
        """Dispatch event to appropriate dispatcher."""
        if isinstance(event, AsyncDomainEvent):
            # Async events are dispatched after transaction commits
            transaction.on_commit(lambda: self._async.dispatch(event))
        else:
            # Sync events dispatched immediately (in same transaction)
            self._sync.dispatch(event)

    # Delegate methods for testing/inspection
    @property
    def sync_dispatcher(self) -> DomainEventDispatcher:
        return self._sync

    @property
    def async_dispatcher(self) -> CeleryEventDispatcher:
        return self._async
