# smarti/shared/infra/bus/celery_tasks.py
"""Celery Tasks for async domain event processing."""

from __future__ import annotations

import logging
from collections.abc import Callable

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded

from smarti.shared.appl.ports import IDeadLetterStore, IProcessedEventStore
from smarti.shared.domain.event import DomainEventBase

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60,
             soft_time_limit=30, time_limit=40, acks_late=True)
def process_default_event(self, event_data: dict, event_class: str) -> None:
    """Cross-BC Standard-Events."""
    _run_handlers(self, event_data, event_class)


@shared_task(bind=True, max_retries=5, default_retry_delay=300,
             soft_time_limit=30, time_limit=40, acks_late=True)
def process_email_event(self, event_data: dict, event_class: str) -> None:
    """E-Mail-Versand — niedrige Priorität, hohe Toleranz für Verzögerung."""
    _run_handlers(self, event_data, event_class)


@shared_task(bind=True, max_retries=5, default_retry_delay=300,
             soft_time_limit=300, time_limit=330, acks_late=True)
def process_report_event(self, event_data: dict, event_class: str) -> None:
    """Report-Generierung, Exporte — langlaufend, wenige Wiederholungen."""
    _run_handlers(self, event_data, event_class)


@shared_task(bind=True, max_retries=5,
             soft_time_limit=60, time_limit=75, acks_late=True)
def process_external_event(self, event_data: dict, event_class: str) -> None:
    """Externe System-Benachrichtigungen — exponentieller Backoff."""
    _run_handlers(self, event_data, event_class)


def _deserialize_event(event_data: dict, event_class: str) -> DomainEventBase:
    """Deserialize event from dict and class name."""
    module_path, class_name = event_class.rsplit(".", 1)
    module = __import__(module_path, fromlist=[class_name])
    event_cls = getattr(module, class_name)
    return event_cls.from_dict(event_data)


def _get_registered_handlers(event_type: type[DomainEventBase]) -> list[Callable]:
    """Get all registered handlers for an event type from the async dispatcher."""
    from smarti.shared.infra.bus.composite_dispatcher import (
        get_composite_dispatcher,
    )

    dispatcher = get_composite_dispatcher()
    if dispatcher and hasattr(dispatcher, "_async"):
        return dispatcher._async._handlers.get(event_type, [])
    return []


def _run_handlers(task, event_data: dict, event_class: str, *,
                  store: IDeadLetterStore | None = None,
                  processed_store: IProcessedEventStore | None = None) -> None:
    """Execute all registered handlers for an event with idempotency and error handling."""
    if store is None:
        from smarti.shared.infra.bus.dead_letter_store import (
            DjangoDBDeadLetterStore,
        )
        store = DjangoDBDeadLetterStore()
    if processed_store is None:
        from smarti.shared.infra.bus.processed_event_store import (
            DjangoDBProcessedEventStore,
        )
        processed_store = DjangoDBProcessedEventStore()

    event = _deserialize_event(event_data, event_class)
    handlers = _get_registered_handlers(type(event))
    if not handlers:
        logger.warning("No handlers registered for %s", event_class)
        return

    for handler in handlers:
        # Idempotenz: bereits verarbeitet überspringen
        if processed_store.is_processed(event.event_id, handler.__name__):
            logger.info("Skipping %s for %s — already processed", handler.__name__, event_class)
            continue

        try:
            handler(event)
            processed_store.mark_processed(event.event_id, handler.__name__)
        except SoftTimeLimitExceeded as exc:
            logger.error("Soft time limit exceeded for %s, handler %s", event_class, handler.__name__)
            try:
                task.retry(exc=exc, countdown=2 ** task.request.retries)
            except task.MaxRetriesExceededError:
                store.store(
                    event_id=event.event_id,
                    event_class=event_class,
                    event_data=event_data,
                    error_message="SoftTimeLimitExceeded",
                    handler_name=handler.__name__,
                    retry_count=task.request.retries,
                )
        except Exception as exc:
            logger.error("Handler %s failed for %s: %s", handler.__name__, event_class, exc)
            try:
                task.retry(exc=exc, countdown=2 ** task.request.retries)
            except task.MaxRetriesExceededError:
                store.store(
                    event_id=event.event_id,
                    event_class=event_class,
                    event_data=event_data,
                    error_message=str(exc),
                    handler_name=handler.__name__,
                    retry_count=task.request.retries,
                )
