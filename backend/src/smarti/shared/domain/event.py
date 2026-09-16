# smarti/shared/domain/event.py
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any, ClassVar

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, field_validator, model_serializer

########################################################################################
#                                 --- Event ---                                        #
########################################################################################

class DomainEventBase(BaseModel):
    """
    Basisklasse für alle Domain-Events.
    """

    model_config = ConfigDict(
        frozen=True,
        # Verbietet nicht-serialisierbare Typen — AsyncDomainEvent benötigt JSON-Kompatibilität.
        arbitrary_types_allowed=False,
        # Es verbietet das Übergeben von Feldern, die nicht in der Klasse definiert sind.
        extra="forbid",
        # Validiert Daten auch dann, wenn sie (theoretisch) zugewiesen werden.
        validate_assignment=True,
        # Entfernt automatisch Leerzeichen am Anfang und Ende von Strings. spart dir manuelle .strip() Aufrufe
        str_strip_whitespace=True,
        # bei einem Feld mit Python-Enum, wird beim Export der Wert (z.B. "ACTIVE") statt des Enum-Objekts (Status.ACTIVE) genommen.
        use_enum_values=True,
        # Definiert Standardformate für Zeitspannen und Binärdaten im JSON-Export.
        ser_json_timedelta="iso8601",
        ser_json_bytes="base64",
        # damit z.B. AccountId nich neu validiert wird
        revalidate_instances="never",
    )

    # Immutable fields
    occurred_on: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        init=False,
        description="Timestamp when event occurred (UTC)",
    )

    event_id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        init=False,
    )

    # Optional: Event version für Event-Sourcing
    event_version: int = Field(
        default=1,
        init=False,
        description="Version of the event schema",
    )

    @field_validator("occurred_on", mode="before")
    @classmethod
    def ensure_timezone(cls, v: Any) -> datetime:
        if isinstance(v, str):
            v = datetime.fromisoformat(v)
        if isinstance(v, datetime) and v.tzinfo is None:
            return v.replace(tzinfo=UTC)
        return v

    @classmethod
    def get_event_type(cls) -> str:
        """Gibt den Event-Typnamen zurück"""
        return cls.__name__

    @property
    def id(self) -> uuid.UUID:
        """Public getter für Event-ID"""
        return self.event_id

    # eretzt to_dcit()
    @model_serializer(mode="wrap")
    def serialize_with_metadata(self, handler: Any) -> dict[str, Any]:
        """
        Pydantic-native Serialisierung.
        Fügt Metadaten hinzu, egal wie das
        Model serialisiert wird, mit model.model_dump() oder model.model_dump_json()
        """
        data = handler(self)
        data["event_type"] = self.__class__.__name__
        # Sicherstellen, dass UUIDs als Strings im Dict landen
        data["event_id"] = str(self.event_id)
        return data

    @classmethod
    def from_dict(cls, data: dict) -> DomainEventBase:
        # def from_dict(cls, data: dict) -> Self: # kann ab python v3.11 genutzt werden automatisch korrekt auf die Unterklasse gesetzt
        """Deserialisiert Event aus Dict"""
        if "event_id" in data:
            # Konvertiere String-ID zurück zu UUID
            data["event_id"] = uuid.UUID(data.pop("event_id"))
        return cls(**data)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}(id={self.id}, occurred_on={self.occurred_on.isoformat()})"
        )


class AsyncDomainEvent(DomainEventBase):
    """
    Base class for all async domain events.
    Must contain only JSON-serializable primitives (str, int, list, UUID as str, ISO-dates).
    """

    _registry: ClassVar[set[type[AsyncDomainEvent]]] = set()

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls._registry.add(cls)


class SyncDomainEvent(DomainEventBase):
    """
    Marker class for synchronous domain events (strong consistency, in-transaction).
    No additional behavior — serves as explicit classification.
    """

    pass


class DomainEventMixin(BaseModel):
    """
    Mixin für Pydantic-Aggregate, um Domain Events zu verwalten.
    Nutzt PrivateAttr, damit Events nicht serialisiert werden.
    """

    # Hier liegt der Trick: default_factory erzeugt für JEDE Instanz eine neue Liste
    # Domain Events (nicht persistiert)
    _domain_events: list[DomainEventBase] = PrivateAttr(default_factory=list)

    def _raise_event(self, event: DomainEventBase) -> None:
        """Fügt Domain Event hinzu"""
        self._domain_events.append(event)

    def collect_domain_events(self) -> tuple[DomainEventBase, ...]:
        """
        Gibt alle Events zurück und leert die Liste (Atomic Operation pattern).
        Wird vom UnitOfWork aufgerufen.
        """
        events = tuple(self._domain_events)  # Kopie erstellen
        self._domain_events.clear()  # Liste leeren
        return events

    @property
    def events(self) -> tuple[DomainEventBase, ...]:
        """Read-only Zugriff für Tests (ohne zu löschen)."""
        return tuple(self._domain_events)
