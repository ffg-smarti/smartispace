# smarti/shared/domain/model.py
from __future__ import annotations

import logging
from typing import Any, Generic, Self, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
)

from smarti.shared.exceptions import BaseFailure, EntityValidationError, NotOwnerError
from smarti.shared.objects import AccountId, EntityId
from smarti.shared.result import Failure, Result, Success

logger = logging.getLogger(__name__)
########################################################################################
#                           --- Domain model base ---                                  #
########################################################################################
# --- Basisklassen für Aggregate und Entity mit Hilfsmittel ---
IdType = TypeVar("IdType", bound=EntityId)

class BaseDomainModelPydantic(BaseModel, Generic[IdType]):
    """Basis-Entiy mit gemeinsamen Konfigurationen"""

    identifier: IdType = Field(alias="uid")   # kein SkipValidation mehr

    model_config = ConfigDict(
        # Generelle Konfiguration
        frozen=True,                  # <- erzwingt Kapselung generisch, ohne Custom-Code
        arbitrary_types_allowed=True,
        populate_by_name=True,
        extra="forbid",
        
        # populate_by_name=True,        # Erlaubt Aliase uid ↔ identifier
        # validate_assignment=False,    # ⚠️ WICHTIG: Keine automatische Validierung
        # str_strip_whitespace=True,    # Automatisches Trimmen von Strings
        # # JSON/Serialization
        # ser_json_timedelta="iso8601", # Zeitdeltas als ISO
        # ser_json_bytes="base64",      # Bytes als Base64
        # # Extra-Validierung
        # extra="ignore",             # Ignoriere unbekannte Felder
        # Aliases
        # title="Base Domain Model",  # Optional für OpenAPI
        # use_enum_values=True,       # Optional: Enums als Werte serialisieren
    )

    """Gemeinsame Validierungs-Helper für wiederverwendbare Logik"""
    def _evolve(self, **changes: Any) -> Self:
        """
        Einziger Weg zu einer neuen Version dieser Entity.
        Läuft über den normalen Konstruktor -> alle Validatoren
        und Invarianten laufen automatisch erneut. 
        Beispiel für eine Business-Methode:

        def cancel(self) -> Result[Order, DomainError]:
            if self.status == OrderStatus.SHIPPED:
                return Failure(OrderAlreadyShipped(order_id=self.id))
            return Success(self._evolve(status=OrderStatus.CANCELLED))
        """
        data = {**self.model_dump(by_alias=True), **changes}
        return self.__class__(**data)


    def __init__(self, **data):
        """
        Initialisierung mit automatischer Fehlerübersetzung für Frontend.

        Raises:
            EntityValidationError: Bei Validierungsfehlern mit übersetzten Meldungen
        """
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("BaseDomainModelPydantic DATA: %s", data)

        try:
            super().__init__(**data)
        except ValidationError as e:
            # --- 🎯 Iteration über alle Fehler ---
            raise EntityValidationError.from_pydantic(
                e
            ) from e  # Übersetze alle Pydantic-Fehler in Django-kompatibles Format

    def __eq__(self, other: object) -> bool:
        """Entitäten sind gleich, wenn ihre IDs gleich sind."""
        if not isinstance(other, self.__class__):
            return False
        return self.uid == other.uid

    def __hash__(self) -> int:
        """Hashing basiert auf der ID."""
        return hash(self.uid)

    @property
    def uid(self) -> IdType:
        return self.identifier

    @property
    def id(self) -> IdType:
        return self.identifier

    # ===============================================
    # SHARED GUARDS - verfügbar in allen Aggregates #
    # ===============================================

    def _guard(self, condition: bool, error: BaseFailure) -> Result[None, BaseFailure]:
        return Success(None) if condition else Failure(error)

    def _require_owner(self, 
                       actor: AccountId, 
                       owner: AccountId,
                    ) -> Result[None, BaseFailure]:
        return self._guard(actor == owner, 
                           NotOwnerError(actor=actor, 
                                          owner=owner))
