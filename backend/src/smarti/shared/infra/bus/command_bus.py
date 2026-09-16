# smarti/shared/infra/bus/command_bus.py

"""

**Warum im Application Layer?**
- Ist **Application Logic** (Orchestration)
- NICHT Infrastructure (kein Framework)
- NICHT Domain (keine Business Rules)
- Koordiniert Commands → Handlers


┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION                         │
│  Django View → Command Bus                              │
└────────────────────┬────────────────────────────────────┘
                     │ (Command)
                     ↓
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION                          │
│  Command Bus → Handler → Repository Port                │
└────────────────────┬────────────────────────────────────┘
                     │ (via Port/Interface)
                     ↓
┌─────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE                        │
│  Repository Adapter → Django ORM                        │
└─────────────────────────────────────────────────────────┘

Verwendung in Django View:
# Repository Adapter erstellen
repository = DjangoProfileRepository()

# Command Bus mit Repository erstellen
command_bus = create_command_bus(repository)

# Command ausführen
result = command_bus.execute(command)
"""

import logging
from typing import Any

from smarti.shared import exceptions as err
from smarti.shared.appl.command import BaseCommandPydantic
from smarti.shared.appl.ports import (
    ICommandBus,
    ICommandHandler,
    IMiddleware,
)
from smarti.shared.exceptions import BaseFailure
from smarti.shared.result import Result

"""
Shared Command Bus Implementation.
Kann von ALLEN Bounded Contexts verwendet werden.
"""


logger = logging.getLogger(__name__)


class CommandBus(ICommandBus):
    """
    Globaler Command Bus für das gesamte System.

    Kann Commands aus ALLEN Bounded Contexts routen:
    - profiles.services.commands
    - learning.services.commands
    - enrollment.services.commands
    - etc.
    """

    def __init__(self):
        # Mapping: Command-Klasse -> Handler-Instanz
        self._handlers: dict[type[BaseCommandPydantic], ICommandHandler] = {}
        self._middlewares: list[IMiddleware] = []

    def register(
        self,
        command_type: type[BaseCommandPydantic],
        handler: ICommandHandler,
        force: bool = False,
    ) -> None:
        """
        Registriert Handler für Command-Typ.

        Args:
            command_type: Command-Klasse
            handler: Handler-Instanz
            force: Wenn True, überschreibt existierenden Handler (nur für Tests!)

        Raises:
            HandlerAlreadyRegisteredError: Wenn Handler bereits registriert (und force=False)
        """
        if command_type in self._handlers and not force:
            existing_handler = self._handlers[command_type].__class__.__name__
            new_handler = handler.__class__.__name__

            error_msg = (
                f"Handler for {command_type.__name__} already registered. "
                f"Existing: {existing_handler}, Attempted: {new_handler}. "
                f"This is likely a configuration error in bootstrap. "
                f"Use force=True to explicitly override (not recommended for production)."
            )

            logger.critical(error_msg)
            raise err.HandlerAlreadyRegisteredError(error_msg)

        if command_type in self._handlers and force:
            logger.warning(
                f"Force-overwriting handler for {command_type.__name__}: "
                f"{self._handlers[command_type].__class__.__name__} -> "
                f"{handler.__class__.__name__}"
            )

        self._handlers[command_type] = handler
        logger.info("Registered handler for %s", command_type.__name__)

    def get_registered_commands(self) -> set[type[BaseCommandPydantic]]:
        """Gibt die Menge der registrierten Command-Typen zurück."""
        return set(self._handlers.keys())

    def unregister(self, command_type: type[BaseCommandPydantic]) -> None:
        """
        Entfernt Handler für Command-Typ.

        Nützlich für Tests oder dynamisches Neuladen.
        """
        if command_type in self._handlers:
            del self._handlers[command_type]
            logger.info("Unregistered handler for %s", command_type.__name__)

    def execute(self, command: BaseCommandPydantic) -> Result[Any, BaseFailure]:
        """Führt Command aus.
        Implementierungshinweis:
        Damit die Middleware-Kette funktioniert, muss die execute-Methode
        des CommandBus die Kette "zusammenbauen" - command-chain-pattern
        """

        # Die innerste Funktion: Den Handler aufrufen
        def invoke_handler(cmd):
            handler = self._handlers.get(type(cmd))
            if not handler:
                raise err.HandlerNotRegisteredError(
                    f"No handler registered for {type(cmd)}"
                )
            try:
                result = handler(cmd)
                logger.debug("🚀 Handler result: %s", result)
                # Validiere dass Handler Result zurückgibt
                if not isinstance(result, Result):
                    raise TypeError(
                        f"Handler {handler.__class__.__name__} must return Result, "
                        f"got {type(result).__name__}"
                    )

                return result
            except Exception as e:
                logger.exception(
                    f"Handler {handler.__class__.__name__} raised exception "
                    f"for command {type(cmd).__name__}: {e}"
                )
                raise

        # Pipeline von hinten nach vorne aufbauen (Zwiebel-Prinzip)
        # den Callable invoke_handler als erstes in die pipeline schieben
        pipeline = invoke_handler
        # jetzt die middleware umwickeln (z. B. [Logging, Validation, Transaction]).:
        # jede Middleware bekommt die "nächste Stufe" (den next_call) übergeben.
        # Durchgang 1: Transaction wird um invoke_handler gewickelt.
        # Durchgang 2: Validation wird um die Transaction-Stufe gewickelt.
        # Durchgang 3: Logging wird um die Validation-Stufe gewickelt.
        for middleware in reversed(self._middlewares):
            # Wir "umwickeln" die bisherige Pipeline mit der Middleware
            pipeline = self._create_next_step(middleware, pipeline)
        # Dies löst eine Kettenreaktion aus:
        # LoggingMiddleware startet -> Sie schreibt "Start", berechnet die Zeit und ruft next_call(command) auf.
        # next_call ist hier die ValidationMiddleware -> Sie prüft die Daten und ruft next_call(command) auf.
        # next_call ist die TransactionMiddleware -> Sie öffnet eine DB-Transaktion und ruft next_call(command) auf.
        # next_call ist schließlich der Handler -> Er führt die Business Logik aus und gibt ein Result zurück.
        return pipeline(command)

        # Sobald der Handler fertig ist, wandert das Result die Kette wieder nach oben zurück:
        # Die TransactionMiddleware empfängt das Resultat, macht ein commit() und gibt es nach oben weiter.
        # Die ValidationMiddleware reicht es einfach durch.
        # Die LoggingMiddleware stoppt die Uhr, schreibt "Erfolg: 15ms" und gibt das Resultat an die View zurück.

    def add_middleware(self, middleware: IMiddleware):
        self._middlewares.append(middleware)

    def _create_next_step(self, mw, next_step):
        return lambda cmd: mw.process(cmd, next_step)
