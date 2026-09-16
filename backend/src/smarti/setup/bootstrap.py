# smarti/setup/bootstrap.py
from __future__ import annotations

import logging

from smarti.setup.wiring import (
    ASYNC_EVENT_WIRINGS,
    COMMAND_WIRINGS,
    EVENT_WIRINGS,
    QUERY_WIRINGS,
)
from smarti.shared.appl.ports import (
    ICommandBus,
    IDeadLetterStore,
    IDomainEventDispatcher,
    IProcessedEventStore,
    IQueryBus,
)
from smarti.shared.infra.bus.command_bus import CommandBus
from smarti.shared.infra.bus.composite_dispatcher import CompositeEventDispatcher
from smarti.shared.infra.bus.dead_letter_store import DjangoDBDeadLetterStore
from smarti.shared.infra.bus.middlewares import LoggingMiddleware
from smarti.shared.infra.bus.processed_event_store import DjangoDBProcessedEventStore
from smarti.shared.infra.bus.query_bus import QueryBus

logger = logging.getLogger(__name__)


class Bootstrap:
    """
    Singleton-Factory für zentrale Application Services.
    Lazy Initialization Pattern.

    Das eigentliche Wiring (Handler-Registrierungen) liegt pro
    Bounded Context in `smarti.setup.wiring.*_wire`; hier wird nur
    orchestriert: Busse erzeugen, Wiring-Listen abarbeiten, validieren.
    """

    # Private Class Attributes (Singleton-Instanzen)
    _command_bus: CommandBus | None = None
    _event_bus: CompositeEventDispatcher | None = None
    _query_bus: QueryBus | None = None
    _is_initialized: bool = False

    # ========================================
    # PUBLIC API - Singleton Getters
    # ========================================

    @staticmethod
    def get_command_bus() -> ICommandBus:
        if Bootstrap._command_bus is None:
            Bootstrap._command_bus = Bootstrap._initialize_command_bus()
        return Bootstrap._command_bus

    @staticmethod
    def get_event_bus() -> IDomainEventDispatcher:
        if Bootstrap._event_bus is None:
            logger.info("Initializing EventBus (first access)")
            Bootstrap._event_bus = Bootstrap._initialize_event_bus()
        return Bootstrap._event_bus

    @staticmethod
    def get_query_bus() -> IQueryBus:
        if Bootstrap._query_bus is None:
            Bootstrap._query_bus = Bootstrap._initialize_query_bus()
        return Bootstrap._query_bus

    @staticmethod
    def reset() -> None:
        logger.warning("Bootstrap.reset() called - destroying singletons")
        Bootstrap._command_bus = None
        Bootstrap._event_bus = None
        Bootstrap._query_bus = None
        Bootstrap._is_initialized = False

    # ========================================
    # PRIVATE - CommandBus Initialization
    # ========================================

    @staticmethod
    def _initialize_command_bus() -> CommandBus:
        logger.info("Creating CommandBus instance")
        bus = CommandBus()
        logger.debug("Registering middlewares")
        Bootstrap._register_middlewares(bus)
        logger.debug("Wiring domain handlers")
        for wire in COMMAND_WIRINGS:
            wire(bus)

        logger.info(
            "CommandBus initialized with %d handlers and %d middlewares",
            len(bus.get_registered_commands()),
            len(bus._middlewares),
        )
        return bus

    @staticmethod
    def _register_middlewares(bus: CommandBus) -> None:
        bus.add_middleware(LoggingMiddleware())

    # ========================================
    # PRIVATE - QueryBus Initialization
    # ========================================

    @staticmethod
    def _initialize_query_bus() -> QueryBus:
        logger.info("Creating QueryBus instance")
        bus = QueryBus()
        for wire in QUERY_WIRINGS:
            wire(bus)
        logger.info(
            "QueryBus initialized with %d handlers",
            len(bus.get_registered_queries()),
        )
        return bus

    # ========================================
    # PRIVATE - EventBus Initialization
    # ========================================

    @staticmethod
    def _initialize_event_bus() -> CompositeEventDispatcher:
        logger.info("Creating EventBus instance")
        event_bus = CompositeEventDispatcher()

        # Sync-Events
        for wire in EVENT_WIRINGS:
            wire(event_bus)

        # Async-Events
        for wire in ASYNC_EVENT_WIRINGS:
            wire(event_bus)

        Bootstrap.validate_registrations(event_bus)

        logger.info("EventBus initialized")
        return event_bus

    # ========================================
    # Startup-Validierung
    # ========================================

    @staticmethod
    def validate_registrations(bus: CompositeEventDispatcher) -> None:
        from smarti.shared.domain.event import AsyncDomainEvent

        for event_type in AsyncDomainEvent._registry:
            if not bus._async.has_registrations(event_type):
                logger.warning(
                    "No handlers registered for %s — verify _wire_*_async_events",
                    event_type.__name__,
                )

    @staticmethod
    def validate_configuration() -> bool:
        try:
            bus = Bootstrap.get_command_bus()
            if not bus.get_registered_commands():
                raise RuntimeError("No command handlers registered!")
            logger.info("Bootstrap configuration valid")
            return True
        except Exception as e:
            logger.error("Bootstrap validation failed: %s", e)
            raise


# ========================================
# MODULE-LEVEL CONVENIENCE FUNCTIONS
# ========================================


def get_command_bus() -> ICommandBus:
    return Bootstrap.get_command_bus()


def get_event_bus() -> IDomainEventDispatcher:
    return Bootstrap.get_event_bus()


def get_query_bus() -> IQueryBus:
    return Bootstrap.get_query_bus()


def get_dead_letter_store() -> IDeadLetterStore:
    return DjangoDBDeadLetterStore()


def get_processed_event_store() -> IProcessedEventStore:
    return DjangoDBProcessedEventStore()


# # CONTENT
# def get_content_uow() -> IContentUnitOfWork:
#     from smarti.content.infra.adapters.uow import DjangoContentUnitOfWork

#     return DjangoContentUnitOfWork()
