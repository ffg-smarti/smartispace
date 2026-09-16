# smarti/shared/appl/ports.py
"""
- ICommandHandler              # Inbound (Commands)
- ICommandBus                  # Inbound (Entry Point)
- IQueryHandler
- IQueryBus
"""

from __future__ import annotations  # ← MUSS OBEN STEHEN!

import logging
import uuid
from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, Generic, TypeVar

from smarti.shared.appl.command import BaseCommandPydantic, QueryBasePydantic
from smarti.shared.appl.dto import BaseDTOPydantic
from smarti.shared.domain.event import AsyncDomainEvent, DomainEventBase
from smarti.shared.domain.model import BaseDomainModelPydantic
from smarti.shared.exceptions import BaseFailure
from smarti.shared.objects import EntityId
from smarti.shared.result import Result

TCommand = TypeVar("TCommand", bound=BaseCommandPydantic)
TEvent = TypeVar("TEvent", bound=DomainEventBase)
TQuery = TypeVar("TQuery", bound=QueryBasePydantic)
TResult = TypeVar("TResult")  # Success-Wertetyp für Handler/Bus
TAggregate = TypeVar("TAggregate", bound=BaseDomainModelPydantic)
TId = TypeVar("TId", bound=EntityId)
TReadModel = TypeVar("TReadModel", bound=BaseDTOPydantic)  # für Query spezifisch, siehe unten

logger = logging.getLogger(__name__)


class IDomainEventDispatcher(ABC):
    """
    PORT für Event Dispatcher.

    Verantwortlich für das Verteilen von Domain Events
    an registrierte Handler.
    """

    @abstractmethod
    def dispatch(self, event: DomainEventBase) -> None:
        """
        Dispatched ein Event an alle registrierten Handler.

        Args:
            event: Das zu dispatchende Event
        """
        pass

    @abstractmethod
    def register(
        self,
        event_type: type[DomainEventBase],
        handler: Callable[..., Any],
    ) -> None:
        """
        Registriert einen Handler für einen Event-Typ.

        Args:
            event_type: Der Event-Typ (Klasse)
            handler: Die Handler-Funktion
        """
        pass


# ============================================
# Event Processing PORTS
# ============================================


class IDeadLetterStore(ABC):
    """
    Port for storing failed event processing attempts.
    Used when all retries are exhausted.
    """

    @abstractmethod
    def store(
        self,
        event_id: uuid.UUID,
        event_class: str,
        event_data: dict,
        error_message: str,
        handler_name: str,
        retry_count: int,
    ) -> None:
        """
        Store a dead letter entry.

        Args:
            event_id: Unique event identifier
            event_class: Fully qualified event class name
            event_data: Serialized event data
            error_message: Error that caused the failure
            handler_name: Name of the handler that failed
            retry_count: Number of retry attempts made
        """
        pass

    @abstractmethod
    def replay(self, dead_letter_id: uuid.UUID) -> None:
        """
        Replay a dead letter by re-enqueueing the original event.

        Args:
            dead_letter_id: ID of the dead letter entry to replay
        """
        pass


class IProcessedEventStore(ABC):
    """
    Port for tracking successfully processed events (idempotency).
    Prevents duplicate execution after retries or worker crashes.
    """

    @abstractmethod
    def is_processed(self, event_id: uuid.UUID, handler_name: str) -> bool:
        """
        Check if an event has already been processed by a specific handler.

        Args:
            event_id: Event identifier
            handler_name: Handler name

        Returns:
            True if already processed, False otherwise
        """
        pass

    @abstractmethod
    def mark_processed(self, event_id: uuid.UUID, handler_name: str) -> None:
        """
        Mark an event as processed by a specific handler.

        Args:
            event_id: Event identifier
            handler_name: Handler name
        """
        pass


# ============================================
# Handler PORTS
# ============================================


class ICommandHandler(ABC, Generic[TCommand, TResult]):
    """
    Base class für alle Command Handlers.
    Ein Handler = eine Business-Operation.
    """

    def __call__(self, command: TCommand) -> Result[TResult, BaseFailure]:
        """Event-Handler-Entry-Point für Event-Dispatcher."""
        return self.handle(command)

    @abstractmethod
    def handle(self, command: TCommand) -> Result[TResult, BaseFailure]:
        """
        Führt die Business-Logik für den Command aus.

        Args:
            command: Der auszuführende Command

        Returns:
            Result[TResult, BaseFailure] mit Erfolg oder Fehler
        """
        ...

class IQueryHandler(ABC, Generic[TQuery, TReadModel]):
# class IQueryHandler(ABC, Generic[TQuery, TResult]):
    """Interface für ALLE Query Handlers (CQRS Read)."""

    def __call__(self, query: TQuery) -> Result[TReadModel, BaseFailure]:
        """Event-Handler-Entry-Point für Event-Dispatcher."""
        return self.handle(query)

    @abstractmethod
    def handle(self, query: TQuery) -> Result[TReadModel, BaseFailure]:
        """Führt Query aus und gibt Read-Model zurück."""
        ...


class IEventHandler(ABC, Generic[TEvent, TResult]):
    """
    Base class für alle Event Handlers.
    Ein Handler = eine Business-Operation.
    WICHTIG: Event Handler MÜSSEN idempotent sein - bei at-least-once
    Delivery kann derselbe Event mehrfach ankommen (Retry, Redelivery).
    """

    def __call__(self, event: TEvent) -> Result[TResult, BaseFailure]:
        """Event-Handler-Entry-Point für Event-Dispatcher."""
        return self.handle(event)

    @abstractmethod
    def handle(self, event: TEvent) -> Result[TResult, BaseFailure]:
        """
        Führt die Business-Logik für den Event aus.

        Args:
            event: Der Event, der den Handler triggert

        Returns:
            Result[TResult, BaseFailure] mit Erfolg oder Fehler
        """
        ...


# ============================================
# BUS PORTS
# ============================================


class ICommandBus(ABC, Generic[TCommand, TResult]):
    """
    Interface für Command Bus.
    Single Entry Point für alle Commands im System.
    """

    @abstractmethod
    def execute(self, command: TCommand) -> Result[TResult, BaseFailure]:
        """Führt registriertes Commando aus."""
        pass

    @abstractmethod
    def register(self, command_type: TCommand, handler: ICommandHandler[TCommand, Any]) -> None:
        """Routet Command zum passenden Handler."""
        pass

    @abstractmethod
    def get_registered_commands(self) -> set[type[BaseCommandPydantic]]:
        """Gibt die Menge der registrierten Command-Typen zurück."""
        pass


class IQueryBus(ABC):
    """Interface für Query Bus (CQRS Read)."""

    @abstractmethod
    def register(
        self, query_type: type[QueryBasePydantic], handler: IQueryHandler[TQuery, Any]
    ) -> None:
        """Routet Query zum passenden Handler."""
        pass

    @abstractmethod
    def execute(self, query: TQuery) -> Result[Any, BaseFailure]:
        """Routet Query zum passenden Handler."""
        pass

    @abstractmethod
    def get_registered_queries(self) -> set[type[QueryBasePydantic]]:
        """Gibt die Menge der registrierten Query-Typen zurück."""
        pass


# ============================================
# Infrastructure PORTS
# ============================================


class IUnitOfWorkSharedPort(ABC):
    """UnitOfWork Pattern für transaktionale Operationen."""

    def __init__(self, dead_letter_store: IDeadLetterStore | None = None):
        """
        Initialisiert die Unit of Work.

        Args:
            dead_letter_store: Optionaler Store für fehlgeschlagene Event-Dispatch-Versuche.
                               Wenn nicht gesetzt, werden Fehler nur geloggt.
        """
        from smarti.setup.bootstrap import get_event_bus

        self._aggregates: list[BaseDomainModelPydantic] = []
        self.dispatcher: IDomainEventDispatcher = get_event_bus()
        self._committed = False
        self._dead_letter_store = dead_letter_store

    def register(self, aggregate):
        """
        Methode um Aggregate in uow zu regestrieren, damit es richtig funktioniert.
        So werden die Aggregate registriert:
        1. repo:
            a. den uow der Repo bekannt machen:
            class DjangoUnitOfWork(BaseUnitOfWork):
                def __init__(self):
                    super().__init__()              # ⬅️ wichtig
                    self._repo = DjangoProfileRepository(self) # ⬅️ wichtig
                    self.transaction_atomic = transaction.atomic()
            b. Aggregate nach dem Laden aus DB in uow registrieren:
            class DjangoProfileRepository(IProfileRepository):
                def __init__(self, uow: BaseUnitOfWork):
                    self.uow = uow

                def get(self, profile_id):
                    orm_obj = ProfileORM.objects.get(id=profile_id)
                    aggregate = Profile.from_orm(orm_obj)

                    self.uow.register(aggregate)
                    return aggregate
        2. application (wie aktuell in Accounts gemacht):
            def _delete_child_account(
                self,
                validated_data: dict,
                delete_data: dict
            ) -> Result:

                with self.uow_factory() as uow:
                    child = validated_data["child"]
                    parent = validated_data["parent"]
                    uow.register(child)
                    uow.register(parent)
                    parent.remove_child(child.uid)
                    uow.repo.update(parent)

                    deleted = uow.repo.delete(child.uid)
        """
        if aggregate not in self._aggregates:
            self._aggregates.append(aggregate)

    def _dispatch_events(self) -> None:
        """
        Dispatch all domain events collected from aggregates in the unit of work.

        Iterates through tracked aggregates, collects their domain events,
        and dispatches each event through the configured domain event dispatcher.

        Sync vs Async events are handled differently:
        - Sync events (SyncDomainEvent): Strong consistency — if a handler fails,
          the exception propagates to trigger a transaction rollback. The event
          was not successfully executed and must not be silently swallowed.
        - Async events (AsyncDomainEvent): Eventual consistency — dispatched via
          Celery worker. Failures are caught and stored in the dead letter store
          for retry, without blocking other events or the transaction.
        """
        try:
            for aggregate in self._aggregates:
                events = aggregate.collect_domain_events()  # type: ignore[attr-defined]
                for event in events:
                    try:
                        self.dispatcher.dispatch(event)
                    except Exception as e:
                        logger.error("Event dispatch failed: %s", e)
                        # Async events: Celery handles retry/DeadLetterStore
                        if isinstance(event, AsyncDomainEvent):
                            if self._dead_letter_store is not None:
                                self._dead_letter_store.store(
                                    event_id=event.event_id,
                                    event_class=event.__class__.__module__ + "." + event.__class__.__qualname__,  # noqa: E501
                                    event_data=event.model_dump(),
                                    error_message=str(e),
                                    handler_name="unknown",
                                    retry_count=0,
                                )
                        # Sync events: propagate exception → transaction rollback
                        else:
                            raise
        finally:
            self._aggregates.clear()  # Wichtig: Events nur einmal dispatchen

    @abstractmethod
    def __enter__(self) -> IUnitOfWorkSharedPort:
        """Startet die UoW / Beginnt eine Transaktion."""
        ...

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool | None:
        """
        Beendet die Transaktion (commit oder rollback).
        Bei Exception: Rollback.
        Ohne Exception und _committed: Dispatched Events vor dem Commit.
        """
        try:
            if exc_type is None and self._committed:
                self._dispatch_events()
            else:
                self._aggregates.clear()
            result = self.transaction_atomic.__exit__(exc_type, exc_val, exc_tb)  # type: ignore[attr-defined]
            return result
        finally:
            self.transaction_atomic = None  # type: ignore[attr-defined]

    @abstractmethod
    def commit(self) -> None:
        """
        Commit alle Änderungen und setzt _committed auf True.
        Darf nicht direkt aufgerufen werden — nur über __exit__ mit with-Block.
        """
        ...

    @abstractmethod
    def rollback(self) -> None:
        """Rollback aller Änderungen."""
        ...

# ===============================================

class IRepositorySharedPort(ABC, Generic[TAggregate, TId]):
    """
    Basis Repository-Interface für alle Aggregates.

    Generic über:
    - TAggregate: Der Aggregate-Typ (Learnplan, Learnpath, etc.)
    - TId: Der ID-Typ (LearnplanId, LearnpathId, etc.)

    Vorteile:
    - DRY: Code wird nicht wiederholt
    - Type Safety: Generics bieten compile-time Checks
    - Konsistenz: Alle Repositories haben gleiche API
    """

    def __init__(self, uow):
        """UnitOfWork ist zwingend erforderlich"""
        if uow is None:
            raise ValueError("UnitOfWork is required - use UnitOfWork.get_repository() instead")
        self._uow = uow
        self._operation_count = 0

    def _validate_uow_context(self, operation_name: str) -> None:
        """
        Validiert dass Repository innerhalb eines aktiven UoW-Context verwendet wird.

        This method should be called at the beginning of every repository operation
        to ensure transaction safety and proper event handling.
        Beispiel:
        def create(self, aggregate: ContentItem) -> Result[None, BaseFailure]:
            self._validate_uow_context("create")

        Supports both Django UoW (transaction_atomic) and Fake UoW (_transaction_active).
        """
        # Django UoW: transaction_atomic is not None when active
        # Fake UoW: _transaction_active is True when active
        transaction_active = getattr(self._uow, "transaction_atomic", None) is not None or getattr(
            self._uow, "_transaction_active", False
        )

        if not transaction_active:
            raise RuntimeError(
                f"Repository operation '{operation_name}' must be used within UnitOfWork context. "
                "Use 'with uow_factory() as uow:' pattern instead of direct repository instantiation."  # noqa: E501
            )

        # Optional: Track operations for debugging
        self._operation_count += 1

    @property
    def uow(self):
        """Read-only access to UnitOfWork for internal operations"""
        return self._uow

    @property
    @abstractmethod
    def _id_cls(self) -> type[TId]:
        """Die konkrete ID-Klasse dieses Aggregats, z. B. OrderId. Von jeder Subklasse zu definieren."""  # noqa: E501
        ...

    def next_identity(self) -> TId:   # generisch über den konkreten ID-Typ, nicht UUID
        """Berechnet eine frei ID - DB muss nicht berücksichtigt werden
        UUID-V4 (Random): Wird einfach durch uuid.uuid4() generiert.
        Kein DB-Check nötig.
        """
        return self._id_cls(value=uuid.uuid4())

    @abstractmethod
    def create(self, aggregate: TAggregate) -> Result[None, BaseFailure]:
        """
        Erstellt neues Aggregate in der Datenbank.
        self._validate_uow_context("create") muss aufgerufen werden, 
        um sicherzustellen, dass die Operation innerhalb eines UoW-Kontexts erfolgt.

        Args:
            aggregate: Das zu speichernde Aggregate

        Returns:
            Success(None) oder Failure(BaseFailure)
        """
        pass

    @abstractmethod
    def update(self, aggregate: TAggregate) -> Result[None, BaseFailure]:
        """
        Aktualisiert existierendes Aggregate.
        self._validate_uow_context("update") muss aufgerufen werden, 
        um sicherzustellen, dass die Operation innerhalb eines UoW-Kontexts erfolgt.
                
        Verwendet Optimistic Locking (version field).

        Args:
            aggregate: Das zu aktualisierende Aggregate

        Returns:
            Success(None) oder Failure(BaseFailure)
        """
        pass

    @abstractmethod
    def find_by_id(self, aggregate_id: TId) -> Result[TAggregate | None, BaseFailure]:
        """
        Findet Aggregate by ID.

        Args:
            aggregate_id: Die Aggregate-ID

        Returns:
            Success(Aggregate), Success(None) wenn nicht gefunden, oder Failure(BaseFailure)
        """
        pass

    @abstractmethod
    def delete(self, aggregate_id: TId) -> Result[None, BaseFailure]:
        """
        Löscht Aggregate (empfohlen: Soft Delete).
        self._validate_uow_context("delete") muss aufgerufen werden, 
        um sicherzustellen, dass die Operation innerhalb eines UoW-Kontexts erfolgt.

        Args:
            aggregate_id: Die ID des zu löschenden Aggregates

        Returns:
            Success(None) oder Failure(BaseFailure)
        """
        pass

    @abstractmethod
    def exists(self, aggregate_id: TId) -> bool:
        """
        Prüft ob Aggregate existiert.

        Performance-optimiert: Keine vollständige Hydration.

        Args:
            aggregate_id: Die zu prüfende ID

        Returns:
            True wenn existiert, False sonst
        """
        pass


class IFileStorageSharedPort(ABC):
    """
    Port interface for file storage operations.

    Verantwortlich für das Speichern und Abrufen von Dateien.
    """

    @abstractmethod
    def store_file(
        self, file: bytes, file_name: str, user_id: str, prefix: str = "scans"
    ) -> Result[str, BaseFailure]:
        """
        Speichert Datei und gibt nutzerspezifischen Pfad zurück.

        Args:
            file: Dateiinhalt als Bytes
            file_name: Originaler Dateiname
            user_id: ID des Nutzers für nutzerspezifischen Pfad
            prefix: Unterordner-Präfix (z.B. "scans", "avatars")

        Returns:
            Success(gespeicherter_pfad) oder Failure(BaseFailure)
        """
        pass

    @abstractmethod
    def get_file_url(self, path: str, user_id: str) -> Result[str, BaseFailure]:
        """
        Generiert URL für Dateizugriff.

        Args:
            path: Der gespeicherte Dateipfad
            user_id: ID des Nutzers

        Returns:
            Result[str, BaseFailure] mit öffentlicher oder signierter URL
        """
        pass

    @abstractmethod
    def delete_file(self, url: str) -> Result[None, BaseFailure]:
        """
        Löscht eine Datei aus dem Speicher.

        Args:
            url: Der Dateipfad oder URL der zu löschenden Datei

        Returns:
            Success(None) bei erfolgreicher Löschung oder Failure(BaseFailure)
        """
        pass

# ===============================================

class IMiddleware(ABC, Generic[TCommand, TResult]):
    @abstractmethod
    def process(self, command_type: TCommand, next: Callable) -> Result[Any, BaseFailure]:
        pass
