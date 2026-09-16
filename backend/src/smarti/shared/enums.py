# smarti_lms/shared/enums.py
from __future__ import annotations

from enum import Enum

from smarti.shared.domain.enum import ChoicesMixin


class SubjectCategory(ChoicesMixin, str, Enum):
    """REQ-FFG-REPORT Fachkategorien für die FFG-Test-Sessions.

    Wird verwendet um Sessions pro Fach zu gruppieren (§2.5.2).
    FFG testet die Fächer: Mathematik (MATHEMATIK), Deutsch (DEUTSCH), Englisch (ENGLISH).
    """

    MATHEMATIK = "MATHEMATIK"
    DEUTSCH = "DEUTSCH"
    ENGLISH = "ENGLISH"
    SCIENCE = "SCIENCE"
    GENERAL = "GENERAL"


# """Globalen Sortierkonfiguration"""
class BaseSortField(ChoicesMixin, str, Enum):
    """
    Feld über den sortiert wird
    Falls diese Felder nicht genug sind, muss die Domain
    eigenes Enum defineiren
    """

    CREATED_AT = "created_at"
    TITLE = "title"


class SortOrder(ChoicesMixin, str, Enum):
    """Globalen Sortiervarianten"""

    ASC = "asc"
    DESC = "desc"