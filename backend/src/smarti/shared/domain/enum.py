# smarti/shared/domain/enum.py
from __future__ import annotations

from typing import Any, cast


class ChoicesMixin:
    """
    Django-kompatible .choices() für SKALAR-wertige Enums (str-Value = fachlicher Code).

    Vorgabe: member.value ist ein einfacher str. Das Label wird IMMER aus
    member.name generiert (_format_label), nie im Enum-Wert selbst gespeichert.
    Damit bleibt der Enum-Wert stabil, wenn er auch in DTOs transportiert wird.
    """

    @classmethod
    def choices(cls) -> list[tuple[str, str]]:
        members = cast(Any, cls)
        return [(m.value, cls._format_label(m.name)) for m in members]

    @classmethod
    def _format_label(cls, enum_name: str) -> str:
        return enum_name.replace("_", " ").title()

    @classmethod
    def from_string(cls, value: str) -> Any:
        members = cast(Any, cls)
        value_lower = value.lower().strip()
        for member in members:
            if member.value.lower() == value_lower:
                return member
        raise ValueError(f"Unbekannter Wert für {cls.__name__}: {value}")