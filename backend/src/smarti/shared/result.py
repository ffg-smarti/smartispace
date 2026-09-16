# smarti/shared/result.py
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from collections.abc import Callable
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)

T_Success = TypeVar("T_Success")
T_Error = TypeVar("T_Error")
U = TypeVar("U")


########################################################################################
#                           --- Result-Pattern ---                                    #
########################################################################################


class Result(Generic[T_Success, T_Error], ABC):
    """
    Base class für Result Pattern (Railway-Oriented Programming)

    Verwendet für Business-Operationen die fehlschlagen KÖNNEN
    (nicht für Invarianten-Verletzungen)

    Zielbild:
        Result[T, E]
        ├── Success(values: tuple[T, ...]) # mindestens ein Value
        └── Failure(errors: tuple[E, ...]) # mindestens ein Error

    Success und Failure sind symmetrisch: Beide tragen eine Sammlung (values bzw. errors);
    die Anzahl 1 ist jeweils nur ein Spezialfall.

    Beispiel:
        result = account.verify_password(password_hash)
        if result.is_success:
            print("Login erfolgreich")
        else:
            for error in result.errors:
                print(f"Fehler: {error}")
    """

    @property
    @abstractmethod
    def is_success(self) -> bool:
        """True wenn Operation erfolgreich war"""
        pass

    @property
    def is_failure(self) -> bool:
        """True wenn Operation fehlgeschlagen ist"""
        return not self.is_success

    @abstractmethod
    def unwrap(self) -> tuple[T_Success, ...]:
        """
        Gibt die Success-Werte (Tuple) zurück
        Wirft Exception bei Failure
        """
        pass

    @abstractmethod
    def map(self, func: Callable[[T_Success], U]) -> Result[U, T_Error]:
        """Transformiert jeden Success-Wert mit Funktion"""
        pass

    @property
    def values(self) -> tuple[T_Success, ...]:
        """Die Success-Werte. Zugriff nur nach is_success-Check, sonst Runtime-Error."""
        raise RuntimeError("Called .values on a non-Success Result")

    @property
    def errors(self) -> tuple[T_Error, ...]:
        """Die Fehler-Sammlung. Zugriff nur nach is_failure-Check, sonst Runtime-Error."""
        raise RuntimeError("Called .errors on a non-Failure Result")


class Failure(Generic[T_Success, T_Error], Result[T_Success, T_Error]):
    """
    Fehlgeschlagene Operation.

    Eine Failure enthält IMMER mindestens einen fachlichen Fehler (errors).
    Es gibt keinen einzelnen `error`-Zustand und keine FailureCollection.

    Beispiel:
        Failure(errors=(OrderAlreadyExists(order_number=...),))
        Failure(errors=(OrderNameTooShort(...), OrderNameInvalid(...)))
    """

    def __init__(
        self,
        errors: tuple[T_Error, ...] | T_Error,
        data: dict[str, Any] | None = None,
    ):
        if isinstance(errors, tuple):
            normalized = errors
        else:
            normalized = (errors,)
        if not normalized:
            raise ValueError("Failure must contain at least one error")
        self._errors = normalized
        self._data = data or {}

    @property
    def errors(self) -> tuple[T_Error, ...]:
        return self._errors

    @property
    def data(self) -> dict[str, Any]:
        return self._data

    @data.setter
    def data(self, value: dict[str, Any]) -> None:
        self._data = value

    @property
    def is_success(self) -> bool:
        return False

    def unwrap(self):
        raise ValueError(f"Called unwrap on Failure: {self.errors}")

    def map(self, func: Callable[[T_Success], U]) -> Result[U, T_Error]:
        return Failure(self.errors)

    def __repr__(self) -> str:
        return f"Failure({self.errors})"


class Success(Generic[T_Success, T_Error], Result[T_Success, T_Error]):
    """Erfolgreiche Operation.

    Analog zu Failure(errors) trägt Success eine Sammlung von values;
    die Anzahl 1 ist nur ein Spezialfall.

    Beispiel:
        Success(values=(item,))
        Success(values=(item1, item2))
    """

    def __init__(
        self,
        values: tuple[T_Success, ...] | T_Success,
        data: dict[str, Any] | None = None,
    ):
        if isinstance(values, tuple):
            normalized = values
        else:
            normalized = (values,)
        if not normalized:
            raise ValueError("Success must contain at least one value")
        self._values = normalized
        self._data = data or {}

    @property
    def values(self) -> tuple[T_Success, ...]:
        return self._values

    @property
    def data(self) -> dict[str, Any]:
        return self._data

    @data.setter
    def data(self, value: dict[str, Any]) -> None:
        self._data = value

    @property
    def is_success(self) -> bool:
        return True

    def unwrap(self) -> tuple[T_Success, ...]:
        return self.values

    def get_data(self) -> dict[str, Any] | None:
        """Gibt optionales Metadata-Dictionary zurück"""
        return self.data

    def map(self, func: Callable[[T_Success], U]) -> Result[U, T_Error]:
        return Success(tuple(func(v) for v in self.values))

    def __repr__(self) -> str:
        return f"Success({self.values})"


def success(values: tuple[T_Success, ...] | T_Success) -> Success[T_Success, T_Error]:
    return Success(values)


def failure(errors: tuple[T_Error, ...] | T_Error) -> Failure[T_Success, T_Error]:
    return Failure(errors)


def combine(*results: Result[Any, T_Error]) -> Result[tuple[Any, ...], T_Error]:
    """Führt mehrere Results zusammen. Bei Failure: ALLE Fehler gesammelt, nicht nur der erste."""
    errors = tuple(e for r in results if r.is_failure for e in r.errors)
    if errors:
        return Failure(errors)
    return Success(tuple(r.values[0] for r in results))


__all__ = ["Result", "Success", "Failure", "combine", "success", "failure"]
