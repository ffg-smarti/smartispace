# smarti/shared/infra/bus/processed_event_store.py
"""Processed Event Store Implementation using Django ORM."""

from __future__ import annotations

import uuid

from smarti.shared.appl.ports import IProcessedEventStore


class DjangoDBProcessedEventStore(IProcessedEventStore):
    """Django ORM implementation of IProcessedEventStore."""

    def is_processed(self, event_id: uuid.UUID, handler_name: str) -> bool:
        from dweb.dsmarti.models import ProcessedEvent

        return ProcessedEvent.objects.filter(event_id=event_id, handler_name=handler_name).exists()

    def mark_processed(self, event_id: uuid.UUID, handler_name: str) -> None:
        from dweb.dsmarti.models import ProcessedEvent

        ProcessedEvent.objects.get_or_create(event_id=event_id, handler_name=handler_name)
