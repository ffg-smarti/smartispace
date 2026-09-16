# dweb/dsmarti/api_errors.py
"""API-Fehlermapping (Presentation-Schicht).

Übersetzt fachliche Fehler (BaseFailure / ErrorCode) in die öffentliche
HTTP-Darstellung: HTTP-Status, Client-Code-String und lokalisierte Meldung.

Die Domain trägt nur die fachliche Ursache (ErrorCode) — weder Status noch
Text noch Darstellung. All diese Entscheidungen leben ausschließlich hier.
"""
from __future__ import annotations

import logging

from dweb.dsmarti.schema import ErrorItem
from smarti.shared.exceptions import BaseFailure, ErrorCode

logger = logging.getLogger(__name__)

# ErrorCode → HTTP-Status (Darstellung an der API-Grenze).
# Enthält feine Codes UND grobe Status-Kategorien (als Fallback).
ERROR_CODE_TO_STATUS: dict[ErrorCode, int] = {
    ErrorCode.NOT_OWNER: 403,
    ErrorCode.VALIDATION: 422,
    ErrorCode.NOT_FOUND: 404,
    ErrorCode.FORBIDDEN: 403,
    ErrorCode.UNAUTHORIZED: 401,
    ErrorCode.CONFLICT: 409,
    ErrorCode.INVALID_STATE: 408,
    ErrorCode.PRECONDITION_FAILED: 412,
    ErrorCode.INTERNAL: 500,
}

# ErrorCode → lokalisierte Meldung (Darstellung an der API-Grenze).
# - Feine fachliche Codes → spezifische Meldung (primär).
# - Grobe Status-Kategorien → generische Default-Meldung (Fallback).
ERROR_CODE_TO_MESSAGE: dict[ErrorCode, str] = {
    ErrorCode.NOT_OWNER: "Sie sind nicht der Besitzer dieser Ressource.",
    ErrorCode.VALIDATION: "Die Eingabe ist ungültig.",
    ErrorCode.NOT_FOUND: "Ressource nicht gefunden.",
    ErrorCode.FORBIDDEN: "Sie haben dafür keine Berechtigung.",
    ErrorCode.UNAUTHORIZED: "Sie sind nicht authentifiziert. Bitte melden Sie sich an.",
    ErrorCode.CONFLICT: "Es besteht ein Konflikt mit vorhandenen Daten.",
    ErrorCode.PRECONDITION_FAILED: "Die Voraussetzungen sind nicht erfüllt.",
    ErrorCode.INVALID_STATE: "Die Ressource befindet sich in einem ungültigen Zustand.",
    ErrorCode.INTERNAL: "Ein interner Fehler ist aufgetreten.",
}

# Fallback-Status für Fehler, die (noch) keinem ErrorCode zugeordnet sind.
DEFAULT_STATUS = 422


def map_failure(error: BaseFailure) -> tuple[int, ErrorItem]:
    """
    Übersetzt einen einzelnen fachlichen Fehler in (HTTP-Status, ErrorItem).

    - Trägt der Fehler einen typisierten `ErrorCode` (BusinessFailure, NotOwnerError),
      wird Status + Meldung aus den Mapping-Tabellen ermittelt.
    - Für verbleibende (veraltete/technische) BaseFailure-Typen ohne ErrorCode
      wird die vorhandene String-`code`/`message` unverändert weitergereicht —
      damit geht kein Entwicklerkontext verloren, bis diese auf ErrorCode umgestellt sind.
    """
    code = getattr(error, "code", None)

    if isinstance(code, ErrorCode):
        status = ERROR_CODE_TO_STATUS.get(code, DEFAULT_STATUS)
        message = (
            ERROR_CODE_TO_MESSAGE.get(code)
            or getattr(error, "message", None)
            or str(code)
        )
        field = getattr(error, "field", None)
        return status, ErrorItem(message=message, code=str(code), field=field)

    message = getattr(error, "message", None) or error.__class__.__name__
    code_str = code if isinstance(code, str) else error.__class__.__name__
    return DEFAULT_STATUS, ErrorItem(message=message, code=code_str)
