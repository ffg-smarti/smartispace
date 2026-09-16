# smarti/shared/infra/bus/query_bus.py
"""QueryBus — CQRS Query Bus Implementation.

Ein Query Bus routes Queries zu ihren registrierten Handlern.
Implementiert das Gleiche Pattern wie CommandBus, fuer den Read-Stack.
"""
from __future__ import annotations

import logging
from typing import Any

from smarti.shared import exceptions as err
from smarti.shared.appl.command import QueryBasePydantic
from smarti.shared.appl.ports import IQueryBus, IQueryHandler
from smarti.shared.exceptions import BaseFailure
from smarti.shared.result import Result

logger = logging.getLogger(__name__)


class QueryBus(IQueryBus):
    """Query Bus fuer das gesamte System.

    Registriert Query-Typen und routet execute()-Aufrufe
    an den passenden IQueryHandler.
    """

    def __init__(self):
        self._handlers: dict[type[QueryBasePydantic], IQueryHandler] = {}

    def register(
        self,
        query_type: type[QueryBasePydantic],
        handler: IQueryHandler,
        force: bool = False,
    ) -> None:
        """Registriert Handler fuer einen Query-Typ.

        Args:
            query_type: Query-Klasse
            handler: Handler-Instanz
            force: Wenn True, überschreibt existierenden Handler (nur für Tests!)

        Raises:
            HandlerAlreadyRegisteredError: Wenn Handler bereits registriert (und force=False)
        """
        if query_type in self._handlers and not force:
            existing = self._handlers[query_type].__class__.__name__
            new = handler.__class__.__name__

            error_msg = (
                f"Handler for {query_type.__name__} already registered. "
                f"Existing: {existing}, Attempted: {new}. "
                f"This is likely a configuration error in bootstrap. "
                f"Use force=True to explicitly override (not recommended for production)."
            )

            logger.critical(error_msg)
            raise err.HandlerAlreadyRegisteredError(error_msg)

        if query_type in self._handlers and force:
            logger.warning(
                "Force-overwriting handler for %s: %s -> %s",
                query_type.__name__,
                self._handlers[query_type].__class__.__name__,
                handler.__class__.__name__,
            )

        self._handlers[query_type] = handler
        logger.info("Registered handler %s for %s", handler.__class__.__name__, query_type.__name__)

    def get_registered_queries(self) -> set[type[QueryBasePydantic]]:
        """Gibt die Menge der registrierten Query-Typen zurück."""
        return set(self._handlers.keys())

    def unregister(self, query_type: type[QueryBasePydantic]) -> None:
        """Entfernt Handler fuer einen Query-Typ.

        Nützlich für Tests oder dynamisches Neuladen.
        """
        if query_type in self._handlers:
            del self._handlers[query_type]
            logger.info("Unregistered handler for %s", query_type.__name__)

    def execute(self, query: QueryBasePydantic) -> Result[Any, BaseFailure]:
        """Fuehrt Query aus und gibt Result zurueck."""
        handler = self._handlers.get(type(query))
        if not handler:
            raise err.HandlerNotRegisteredError(
                f"No handler registered for query {type(query)}"
            )
        try:
            result = handler.handle(query)
            if not isinstance(result, Result):
                raise TypeError(
                    f"Handler {handler.__class__.__name__} must return Result, "
                    f"got {type(result).__name__}"
                )
            return result
        except Exception as e:
            logger.exception(
                "Query handler %s failed for %s: %s",
                handler.__class__.__name__, type(query).__name__, e,
            )
            raise
