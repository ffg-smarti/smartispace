# smarti/shared/infra/bus/event_bus.py
"""Event Dispatcher Implementation."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from smarti.shared import exceptions as err
from smarti.shared.appl.ports import IDomainEventDispatcher
from smarti.shared.domain.event import DomainEventBase

logger = logging.getLogger(__name__)


class DomainEventDispatcher(IDomainEventDispatcher):
    """
    Sync Event Dispatcher — dispatches events within the active transaction.

    Registered handlers are called synchronously. Exceptions propagate to
    trigger a transaction rollback.
    """

    def __init__(self):
        self._handlers: dict[type[DomainEventBase], set[Callable]] = {}

    def register(
        self,
        event_type: type[DomainEventBase],
        handler: Callable[..., Any],
    ) -> None:
        """
        Registriert Handler für Event-Typ.

        Mehrere verschiedene Handler für dasselbe Event sind erlaubt.
        Derselbe Handler kann NICHT zweimal registriert werden.

        Args:
            event_type: Event-Klasse
            handler: Callable Handler-Funktion

        Raises:
            ValueError: Wenn Handler bereits registriert ist
        """
        if event_type not in self._handlers:
            self._handlers[event_type] = set()

        # Prüfe ob Handler bereits registriert
        if handler in self._handlers[event_type]:
            handler_name = getattr(handler, "__name__", repr(handler))
            error_msg = (
                f"Handler '{handler_name}' already registered for "
                f"event '{event_type.__name__}'. "
                f"Duplicate registration is not allowed."
            )
            logger.error(error_msg)
            raise err.HandlerAlreadyRegisteredError(error_msg)

        self._handlers[event_type].add(handler)

        handler_name = getattr(handler, "__name__", repr(handler))
        logger.info(
            f"Registered handler '{handler_name}' for event '{event_type.__name__}'"
        )

    def dispatch(self, event: DomainEventBase) -> None:
        """
        Dispatched Event an alle registrierten Handler.

        Handler werden in unbestimmter Reihenfolge ausgeführt!
        (Set hat keine garantierte Ordnung)

        Exceptions werden nicht geschluckt — sie propagieren und lösen
        einen Transaction Rollback aus.
        """
        event_type = type(event)
        handlers = self._handlers.get(event_type, set())

        if not handlers:
            logger.debug("No handlers registered for %s", event_type.__name__)
            return

        logger.info(
            "Dispatching %s to %s handler(s)", event_type.__name__, len(handlers)
        )

        for handler in handlers:
            handler_name = getattr(handler, "__name__", repr(handler))
            try:
                result = handler(event)  # IEventHandler.__call__ → handle() → Result
                if hasattr(result, "is_failure") and result.is_failure:
                    errors = getattr(result, "errors", [])
                    raise RuntimeError(
                        f"Handler '{handler_name}' failed for event "
                        f"'{event_type.__name__}': {errors}"
                    )
            except Exception as e:
                logger.exception(
                    f"Handler '{handler_name}' failed for event "
                    f"'{event_type.__name__}': {e}"
                )
                raise
