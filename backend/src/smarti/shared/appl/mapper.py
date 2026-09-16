# smarti/shared/appl/mapper.py
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from pydantic import BaseModel, ValidationError

from smarti.shared.appl.command import BaseCommandPydantic, QueryBasePydantic
from smarti.shared.appl.dto import BaseDTOPydantic
from smarti.shared.exceptions import (
    BaseFailure,
    MappingError,
)
from smarti.shared.result import Result

TOut = TypeVar("TOut", bound=BaseModel)
logger = logging.getLogger(__name__)

class DtoMapperBase(ABC, Generic[TOut]):
    """
    Zentrale Basis für alle DTO→{Command|Query}-Mapper.

    Mapper sind zustandslos und übersetzen ein validiertes DTO in ein
    validiertes Command oder eine validierte Query. Sie enthalten keine
    Business-Logik, die Repository-/DB-Zugriff braucht.
    """

    @property
    @abstractmethod
    def _dispatch(self) -> dict[type, str]:
        """{DTOTyp: "methodenname"} - von jeder Subklasse zu definieren."""
        ...

    def map(self, dto: BaseDTOPydantic) -> Result[TOut, BaseFailure]:
        method_name = self._dispatch.get(type(dto))
        if method_name is None:
            raise MappingError(
                message=f"Kein Mapping registriert für DTO-Typ: {type(dto).__name__}",
                mapper=self.__class__.__name__,
            )

        method = getattr(self, method_name)
        try:
            return method(dto)
        except ValidationError as exc:
            raise MappingError(
                message=f"Mapping fehlgeschlagen für {type(dto).__name__}: {exc}",
                mapper=self.__class__.__name__,
            ) from exc


class CommandMapperBase(DtoMapperBase[BaseCommandPydantic]):
    """Command-spezifische Mapper erben hiervon."""


class QueryMapperBase(DtoMapperBase[QueryBasePydantic]):
    """Query-spezifische Mapper erben hiervon."""

