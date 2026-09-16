# smarti/shared/infra/bus/dead_letter_store.py
"""Dead Letter Store Implementation using Django ORM."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from smarti.shared.appl.ports import IDeadLetterStore

if TYPE_CHECKING:
    pass


class DjangoDBDeadLetterStore(IDeadLetterStore):
    """Django ORM implementation of IDeadLetterStore."""

    def store(
        self,
        event_id: uuid.UUID,
        event_class: str,
        event_data: dict,
        error_message: str,
        handler_name: str,
        retry_count: int,
    ) -> None:
        from dweb.dsmarti.models import EventProcessingFailure

        EventProcessingFailure.objects.get_or_create(
            event_id=event_id,
            handler_name=handler_name,
            defaults={
                "event_class": event_class,
                "event_data": event_data,
                "error_message": error_message,
                "retry_count": retry_count,
            },
        )

    def replay(self, dead_letter_id: uuid.UUID) -> None:
        from dweb.dsmarti.models import EventProcessingFailure
        from smarti.shared.infra.bus.celery_dispatcher import (
            TASK_MAP,
            _queue_for_class,
        )

        letter = EventProcessingFailure.objects.get(id=dead_letter_id)
        queue = _queue_for_class(letter.event_class)
        task = TASK_MAP[queue]
        task.apply_async(args=(letter.event_data, letter.event_class))  # type: ignore[attr-defined]
        letter.status = "replayed"
        letter.save()
