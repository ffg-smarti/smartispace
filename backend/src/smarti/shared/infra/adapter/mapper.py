# smarti/shared/infra/mapper.py

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T_Domain = TypeVar("T_Domain")
T_Infra = TypeVar("T_Infra")

class BaseInfraMapper(ABC, Generic[T_Domain, T_Infra]):
    """Basis-Interface für alle bidirektionalen Mapper"""

    @abstractmethod
    def domain_to_infra(self, domain_obj: T_Domain) -> T_Infra:
        """Domain-Objekt → Infrastructure-Objekt konvertieren"""
        pass

    @abstractmethod
    def infra_to_domain(self, infra_obj: T_Infra) -> T_Domain:
        """Infrastructure-Objekt → Domain-Objekt konvertieren"""
        pass