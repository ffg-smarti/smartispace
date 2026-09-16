# smarti/shared/appl/command.py
from __future__ import annotations

from abc import ABC
from typing import Any

from pydantic import BaseModel, ConfigDict, model_validator

########################################################################################
#                               --- Command ---                                        #
########################################################################################

class BaseCommandPydantic(BaseModel, ABC):
    """
    Zentrale Basis für alle Commands mit Pydantic.
    Commands sind immutable und repräsentieren eine Intention.

    Die Command-Schicht sollte bereits validierte Objekte übergeben. -> AccountId statt UUID
    """

    # Verhindert nachträgliche Änderungen (Immutability)
    model_config = ConfigDict(
        frozen=True,
        # arbitrary_types_allowed=True, Kann gezielt pro Command aktiviert werden,
        # wenn ein nicht Pydantic-Objekt übergeben wird (z.B. Django Model). Dann muss das
        # Command aber auch von Hand validiert werden.
        validate_default=True,
        # Validierung bei Zuweisung deaktiviert (frozen=True macht das überflüssig)
        validate_assignment=False,
        # Extra Fields nicht erlauben (strict)
        extra="forbid",
        # Erlaubt aus DTOs direkt zu erstellen
        from_attributes=True,
        # damit z.B. AccountId nich neu validiert wird
        revalidate_instances="never",
    )

    @model_validator(mode="after")
    def additional_validations(self):
        # Validierung - ähnlich zu __post_init__
        # nur zustandslose, cross-field-strukturelle Prüfungen (kein Repository-/DB-Zugriff)
        return self

    def __str__(self) -> str:
        return self.__class__.__name__

    def to_dict(self, exclude_none: bool = True) -> dict[str, Any]:
        """Serialisierung für Logging/Event Store."""
        return self.model_dump(
            exclude_none=exclude_none,
            mode="python",  # Python-native types (datetime bleibt datetime)
        )

    def to_json(self, indent: int = 0) -> str:
        """
        JSON-Serialisierung.

        Args:
            indent: Einrückung für Pretty-Printing (0 = kompakt)

        Returns:
            JSON-String

        Examples:
            >>> command.to_json(indent=2)
            '{
              "email": "test@example.com",
              "name": "John",
              "age": 30,
            }'
        """
        return self.model_dump_json(indent=indent if indent > 0 else None, exclude_none=True)


########################################################################################
#                                 --- QUERY ---                                        #
########################################################################################

class QueryBasePydantic(BaseModel, ABC):
    """
    Zentrale Basis für alle Queries (CQRS Read Side).
    Queries sind immutable und repräsentieren eine Lese-Absicht.
    Analog zu Command, aber für Read-Operations.

    Anders als Commands tragen Queries KEINEN Zeitstempel als Feld:
    Zwei Queries mit identischen Filterwerten sollen gleich sein und
    sich als Cache-Key eignen - ein `created_at`-Feld würde das brechen.
    """

    model_config = ConfigDict(
        frozen=True,                    # Immutability + generiert automatisch __hash__/__eq__
        extra="forbid",
        str_strip_whitespace=True,
        validate_default=True,
        revalidate_instances="never",   # ValueObjects in Feldern werden nicht neu validiert
    )

    def __str__(self) -> str:
        return self.__class__.__name__

    def to_dict(self, exclude_none: bool = True) -> dict[str, Any]:
        """Serialisierung für Logging/Tracing."""
        return self.model_dump(exclude_none=exclude_none, mode="python")

    def to_json(self, indent: int = 0) -> str:
        return self.model_dump_json(indent=indent if indent > 0 else None, exclude_none=True)

    def cache_key(self) -> str:
        """Stabiler Key für Read-Caches - basiert auf Feldwerten, nicht auf Identität."""
        return f"{self.__class__.__name__}:{hash(self)}"

