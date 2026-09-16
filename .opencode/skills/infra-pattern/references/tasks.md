# SMARTi Backend Code Templates (Coder) - Infrastructure

Konkrete, implementierungsfertige Code-Templates infrastructure Schicht. **Für Coder**. Platzhalter in `{{doppelten Krammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/infra/tasks.py`.

---

## Infrastructure Layer

### Tasks (Celery Async Events)

Celery Tasks verarbeiten asynchrone Domain Events. Sie werden vom `CeleryEventDispatcher` über `task.apply_async()` aufgerufen.

#### Struktur

```python
# smarti/{{context}}/infra/tasks.py
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
def process_{{event_name}}(self, event_data: dict, event_class: str) -> None:
    """Cross-Context Standard-Events."""
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
```

#### Regeln

1. Jeder Celery-Task muss `@shared_task(bind=True, ...)` dekorieren.
2. `max_retries`, `default_retry_delay`, `soft_time_limit`, `time_limit`, `acks_late` müssen gesetzt sein.
3. Event-Handler werden über `_run_handlers()` aufgerufen — nie direkt im Task.
4. `IDeadLetterStore` und `IProcessedEventStore` werden automatisch initialisiert, falls nicht injiziert.
5. Handler-Fehler → Celery-Retry → nach MaxRetries → DeadLetterStore.
6. `SoftTimeLimitExceeded` wird separat behandelt (eigene Retry-Logik).
7. Idempotenz: `IProcessedEventStore.is_processed()` prüft vor jeder Verarbeitung.

#### Anti-Pattern

```python
# ANTI-PATTERN: Handler direkt aufrufen ohne Retry/DeadLetterStore
@shared_task
def bad_task(event_data: dict, event_class: str):
    event = _deserialize_event(event_data, event_class)
    handler(event)  # Kein Retry, kein DeadLetterStore, kein Idempotency!
```

#### Entscheidungsregel

1. Async Events (celery_tasks.py) werden von `CeleryEventDispatcher` über `task.apply_async()` aufgerufen — nie synchron.
2. Sync Events werden über `DomainEventDispatcher` in der Transaktion verarbeitet — nicht via Celery.
3. Jeder Task muss `bind=True` haben, um `self.retry()` aufrufen zu können.
4. DeadLetterStore wird nur bei MaxRetries überschreitung beschrieben — nicht bei jedem Fehler.
5. `processed_store.mark_processed()` wird nur bei erfolgreichem Handler-Aufruf aufgerufen.

---