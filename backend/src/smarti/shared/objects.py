# smarti/shared/objects.py

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Self, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

RefType = TypeVar("RefType")


class ValidationResult(BaseModel):
    """
    Ergebnis einer Validierung.

    NOTE: This is intentionally mutable (frozen=False) as it has
    add_warning() and add_error() methods that mutate state.
    This is a special case - most VOs should be immutable.
    """

    is_valid: bool = Field(default=True)
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)

    model_config = ConfigDict(frozen=False)

    def add_warning(self, msg: str) -> None:
        """
        Fügt eine Warnung hinzu.

        Args:
            msg: Warnungs-Nachricht
        """
        self.warnings.append(msg)

    def add_error(self, msg: str) -> None:
        """
        Fügt einen Fehler hinzu und markiert als invalid.

        Args:
            msg: Fehler-Nachricht
        """
        self.errors.append(msg)
        self.is_valid = False

    def merge(self, other: ValidationResult) -> ValidationResult:
        """
        Merged zwei ValidationResults.

        Args:
            other: Andere ValidationResult

        Returns:
            ValidationResult: Gemergte Result
        """
        return ValidationResult(
            is_valid=self.is_valid and other.is_valid,
            warnings=self.warnings + other.warnings,
            errors=self.errors + other.errors,
        )


def _validate_uuid(value: uuid.UUID | str) -> uuid.UUID:
    """Validate and convert to UUID."""
    if isinstance(value, uuid.UUID):
        return value
    if isinstance(value, str):
        return uuid.UUID(value)
    raise TypeError(f"Expected UUID or str, got {type(value).__name__}")


class EntityId(BaseModel):
    """
    Base class for all domain entity identifiers.
    Uses Pydantic for proper serialization support (model_dump mode="json").
    """

    model_config = ConfigDict(frozen=True)

    value: uuid.UUID

    @field_validator("value", mode="before")
    @classmethod
    def validate_value(cls, v: uuid.UUID | str) -> uuid.UUID:
        """Validate and convert input to UUID."""
        return _validate_uuid(v)

    def __init__(self, value: uuid.UUID | str | None = None, **data):
        """Support both positional and keyword arguments for backward compatibility."""
        if value is not None:
            data["value"] = value
        super().__init__(**data)

    def __str__(self) -> str:
        return str(self.value)


class ShortId(BaseModel):
    """Unique ID for a checklist (from content Domain)"""

    value: str = Field(min_length=1, description="Short ID value")
    model_config = ConfigDict(frozen=True)

    def __str__(self) -> str:
        return self.value

    @classmethod
    def create(
        cls,
        len: int,
    ) -> Self:
        """
        Factory: Erstellt neuen ShortId - ID wird neu generiert.

        Args:
            len: Length of ID

        Returns:
            Neue ShortId Instanz
        """
        from smarti.shared.utils import short_id

        _id = short_id(length=len)
        return cls(value=_id)

    @model_validator(mode="before")
    @classmethod
    def from_string(cls, v):
        if isinstance(v, str):
            return {"value": v}
        return v


# ============================================
# Aggregate IDs
# ============================================


class AccountId(EntityId):
    """
    Unique identifier for user accounts.

    Uses Pydantic for proper serialization support (model_dump mode="json").
    """

    pass


class ProfileId(EntityId):
    """
    Unique identifier for profiles.
    """

    pass


# ============================================
# CONTENT DOMAIN IDs (für Learnplan-Referenzen)
# ============================================


class ItemId(EntityId):
    """
    Unique identifier for Content-Items (LessonItem, TestItem, ParentItem).

    Used by content/ Domain.
    plan/ Domain references these IDs as loose coupling.

    Reasons for own type:
    - Type safety for references
    - Explicit marking of content dependencies
    - Easier refactoring possibilities

    Uses Pydantic for proper serialization support (model_dump mode="json").
    """

    pass


class LessonItemId(ItemId):
    """Unique ID for a learning unit (from content Domain)"""

    pass


class TestItemId(ItemId):
    """Unique ID for a test (from content Domain)"""

    pass


class ParentItemId(ItemId):
    """Unique ID for a parent item (from content Domain)"""

    pass


class SessionId(ItemId):
    """Unique ID for a session (from content Domain)"""

    pass


class ChecklistId(ShortId):
    """Unique ID for a checklist (from content Domain)"""

    pass


class CheckpointId(ShortId):
    """Unique ID for a checkpoint (from content Domain)"""

    pass


class TestResult(BaseModel):
    """Repräsentiert das Ergebnis eines spezifischen Test-Versuchs."""

    test_item_id: ItemId
    passed: bool = False
    # Prozentsatz oder Punkte
    score: int = 0
    achieved_at: datetime
    # Der wievielte Versuch war das?
    attempt_count: int = 0
    feedback: str = ""

    model_config = ConfigDict(frozen=True, arbitrary_types_allowed=True)


# ============================================
# PLAN DOMAIN IDs
# ============================================


class LearnplanId(EntityId):
    """Unique ID for Learnplan Aggregate"""

    pass


class LearnpathId(EntityId):
    """Unique ID for Learning Path Aggregate"""

    pass


class LearnstationId(EntityId):
    """Unique ID for Learnstation Entity"""

    pass


# ============================================
# SESSION DOMAIN IDs
# ============================================


class RewardProgressId(EntityId):
    """Unique ID for Reward Progress Entity"""

    pass


class ReportId(EntityId):
    """Unique ID for Report Aggregate"""

    pass


# ============================================
# NOTIFICATION DOMAIN IDs
# ============================================


class NotificationId(EntityId):
    """Unique ID for Notification Aggregate (notification-domain-spec §3.1)."""

    pass


class DeliveryLogId(EntityId):
    """Unique ID for DeliveryLog Entity (notification-domain-spec §3.2)."""

    pass


class NotificationTemplateId(EntityId):
    """Unique ID for NotificationTemplate Aggregate (notification-domain-spec §3.3)."""

    pass
