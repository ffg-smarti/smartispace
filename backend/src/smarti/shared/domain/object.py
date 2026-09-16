# smarti/shared/domain/object.py
from __future__ import annotations

import logging
from typing import Self

from pydantic import (
    BaseModel,
    ConfigDict,
    ValidationError,
)

from smarti.shared.exceptions import ValueObjectError
from smarti.shared.result import Failure, Result, Success

logger = logging.getLogger(__name__)


########################################################################################
#                           --- Value Object base ---                                  #
########################################################################################


class BaseValueObjectPydantic(BaseModel):
    """
    Basisklasse für alle Value Objects.

    Value Objects haben folgende Eigenschaften:
    - Keine Identität (keine ID)
    - Immutable (frozen=True)
    - Value-based Equality (alle Felder müssen gleich sein)
    - Hashable (für Sets/Dicts) - mit gecachtem Hash für Performance
    - Keine Domain Events

    Examples:
        class StoryPoints(BaseValueObjectPydantic):
            value: int

        sp1 = StoryPoints(value=5)
        sp2 = StoryPoints(value=5)
        assert sp1 == sp2  # Value-based equality
        assert hash(sp1) == hash(sp2)

        # Immutable - changes create new instance
        sp3 = sp1.copy_with(value=8)
    """

    model_config = ConfigDict(
        frozen=True,  # Immutability
        populate_by_name=True,
        str_strip_whitespace=True,
        extra="forbid",
        ser_json_timedelta="iso8601",
        ser_json_bytes="base64",
    )



    def to_dict(self, exclude_none: bool = True) -> dict:
        """Konvertiert zu Dictionary mit Enums als Strings."""
        return self.model_dump(mode="json", exclude_none=exclude_none)

    def to_json(self, indent: int = 0) -> str:
        """Konvertiert zu JSON-String."""
        return self.model_dump_json(indent=indent if indent > 0 else None)

    @classmethod
    def create(cls, **data) -> Result[Self, ValueObjectError]:
        """
        Bevorzugter Konstruktionsweg an Kompositionsgrenzen (Mapper, Factories).
        Übersetzt ValidationError in ein Result, statt zu raisen.
        """
        try:
            return Success(cls(**data))
        except ValidationError as exc:
            return Failure(ValueObjectError.from_pydantic(exc))
        
    @classmethod
    def from_dict(cls, data: dict) -> Self:
        """Factory method: Erstellt ValueObject aus Dictionary."""
        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> Self:
        """Factory method: Erstellt ValueObject aus JSON-String."""
        import json

        data = json.loads(json_str)
        return cls(**data)

    def __eq__(self, other: object) -> bool:
        """Value-based Equality: Zwei ValueObjects sind gleich wenn alle Felder gleich sind."""

        if not isinstance(other, self.__class__):
            return False
        return all(getattr(self, f) == getattr(other, f) for f in type(self).model_fields)

    def __hash__(self) -> int:
        """
        Hash basiert auf allen Feldern (konsistent mit __eq__).

        Der Hash wird nach der ersten Berechnung gecacht, da das Objekt
        immutable ist (frozen=True). model_dump() wird damit nur einmal
        pro Instanz aufgerufen, statt bei jedem Set/Dict-Zugriff.
        """
        # Prüfe ob Hash bereits gecacht ist
        cached = self.__dict__.get("_hash_cache")
        if cached is not None:
            return cached

        data = self.model_dump()
        computed = hash(
            tuple((k, tuple(v) if isinstance(v, list) else v) for k, v in sorted(data.items()))
        )

        # Cache via object.__setattr__ um frozen=True zu umgehen
        object.__setattr__(self, "_hash_cache", computed)
        return computed

    def __repr__(self) -> str:
        """String representation."""
        fields = ", ".join(f"{k}={v!r}" for k, v in self.model_dump().items())
        return f"{self.__class__.__name__}({fields})"

    def copy_with(self, **updates) -> Self:
        """
        Erstellt eine neue Instanz mit geänderten Werten.

        Da ValueObjects immutable sind (frozen=True), wird eine neue
        Instanz mit den gewünschten Änderungen erstellt.

        Args:
            **updates: Felder die geändert werden sollen

        Returns:
            Neue Instanz mit aktualisierten Werten

        Example:
            sp1 = StoryPoints(value=5)
            sp2 = sp1.copy_with(value=8)  # sp1 bleibt unverändert
        """
        data = self.model_dump()
        data.update(updates)
        return self.__class__(**data)
