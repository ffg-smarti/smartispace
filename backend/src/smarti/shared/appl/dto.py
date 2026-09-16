# smarti/shared/appl/dto.py
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Generic, Self, TypeVar

from pydantic import BaseModel, Field, ValidationError, model_validator

from smarti.shared.exceptions import DtoValidationError

logger = logging.getLogger(__name__)

########################################################################################
#                              ---BASE  DTO---                                        #
########################################################################################

class BaseDTOPydantic(BaseModel):
    """
    Basis-DTO mit gemeinsamen Konfigurationen und Frontend-Integration.

    Features:
    - Automatische Validierung mit Pydantic
    - Übersetzung der Fehler für Frontend
    - Factory-Methoden für verschiedene Datenquellen
    - Unveränderlich (frozen)

    Examples:
        # Direkt aus JSON
        dto = MyDTO.model_validate_json(json_data)

        # Mit Factory
        dto = MyDTO.create({"name": "John"})

        # Aus Django Model
        dto = MyDTO.from_orm(django_model)
    """

    model_config = {
        "frozen": True,  # Unveränderlich
        "populate_by_name": True,  # Erlaubt Aliase
        "from_attributes": True,  # Erlaubt from_orm() - django-modell direkt übergeben
    }

    def __init__(self, **data):
        """
        Initialisierung mit automatischer Fehlerübersetzung für Frontend.

        Raises:
            DtoValidationError: Bei Validierungsfehlern mit übersetzten Meldungen
        """
        if logger.isEnabledFor(logging.DEBUG):
            logger.debug("BaseDTOPydantic DATA: %s", data)

        try:
            super().__init__(**data)
        except ValidationError as e:
            # --- 🎯 Iteration über alle Fehler ---
            raise DtoValidationError.from_pydantic(
                e
            ) from e  # Übersetze alle Pydantic-Fehler in Django-kompatibles Format

    # ===== KONVERTIERUNGS-METHODEN =====

    def to_dict(self, exclude_none: bool = True) -> dict:
        """
        Konvertiert zu Dictionary (konsistent mit dataclass-Variante).

        Args:
            exclude_none: Ob None-Werte ausgeschlossen werden sollen

        Returns:
            Dictionary-Repräsentation des DTOs
        """
        return self.model_dump(exclude_none=exclude_none)

    def to_json(self, indent: int = 0) -> str:
        """
        Konvertiert zu JSON-String.

        Args:
            indent: Einrückung für Pretty-Printing (0 = kompakt)

        Returns:
            JSON-String
        """
        return self.model_dump_json(indent=indent if indent > 0 else None)



########################################################################################
#                       ---API Response DTO ---                                        #
########################################################################################

T = TypeVar("T")

class BaseAPIResponseDTO(BaseDTOPydantic):
    """
    Basisklasse für alle API-Antworten.

    Standardisiert die Struktur für erfolgreiche und fehlgeschlagene Antworten.
    """

    success: bool = Field(
        description="True bei erfolgreicher Operation, False bei Fehler"
    )
    message: str = Field(description="Menschlesbare Meldung")
    code: str | None = Field(
        default=None, description="Maschinenlesbarer Code für Fehler-/Erfolgstypen"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="Zeitpunkt der Antwort-Erstellung (UTC)",
    )

    @model_validator(mode="after")
    def validate_timestamp(self) -> Self:
        """Stellt sicher dass timestamp UTC ist."""
        if self.timestamp.tzinfo is None:
            object.__setattr__(self, "timestamp", self.timestamp.replace(tzinfo=UTC))
        return self


class SuccessAPIResponseDTO(BaseAPIResponseDTO):
    """
    DTO für erfolgreiche API-Antworten.

    Enthält zusätzliche Felder für Daten und Metadaten.
    """

    success: bool = True
    message: str = "Operation erfolgreich"
    data: Any = Field(default=None, description="Ergebnisdaten der Operation")
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Zusätzliche Metadaten (Pagination, etc.)"
    )

# Spezialisierte Response-DTOs für verschiedene Anwendungsfälle
class PageRequestInfoDTO(BaseDTOPydantic):

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=50)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size

class PageResponseInfoDTO(BaseDTOPydantic):
    page: int
    page_size: int
    total: int

    @property
    def total_pages(self) -> int:
        return -(-self.total // self.page_size)  # ceil div

    @property
    def has_more(self) -> bool:
        return self.page * self.page_size < self.total

class PaginatedListDTO(BaseDTOPydantic, Generic[T]):
    """Generische Basis für jede paginierte Liste von Items."""

    items: list[T]
    page_info: PageResponseInfoDTO
