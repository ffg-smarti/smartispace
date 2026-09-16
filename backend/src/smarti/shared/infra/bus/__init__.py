# smarti/shared/infra/bus/__init__.py
"""Event Bus Infrastructure Package."""

from smarti.shared.infra.bus.celery_dispatcher import (
    TASK_MAP,
    CeleryEventDispatcher,
)
from smarti.shared.infra.bus.celery_tasks import (
    process_default_event,
    process_email_event,
    process_external_event,
    process_report_event,
)
from smarti.shared.infra.bus.composite_dispatcher import (
    CompositeEventDispatcher,
    get_composite_dispatcher,
    set_composite_dispatcher,
)
from smarti.shared.infra.bus.dead_letter_store import DjangoDBDeadLetterStore
from smarti.shared.infra.bus.event_bus import DomainEventDispatcher
from smarti.shared.infra.bus.processed_event_store import (
    DjangoDBProcessedEventStore,
)

__all__ = [
    "CompositeEventDispatcher",
    "get_composite_dispatcher",
    "set_composite_dispatcher",
    "CeleryEventDispatcher",
    "TASK_MAP",
    "process_default_event",
    "process_email_event",
    "process_report_event",
    "process_external_event",
    "DjangoDBDeadLetterStore",
    "DomainEventDispatcher",
    "DjangoDBProcessedEventStore",
]
