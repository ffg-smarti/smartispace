# dweb/dsmarti/decorators/handler.py
"""Decorators für Django-Ninja Endpoints."""
from __future__ import annotations

import logging
from functools import wraps

from dweb.dsmarti.api_errors import map_failure
from dweb.dsmarti.schema import ErrorResponse
from smarti.shared.exceptions import HandlerResultContractError
from smarti.shared.result import Result

logger = logging.getLogger(__name__)

########################################################################################
#                          --- @handle_api_result Decorator ---                       #
########################################################################################


def handle_api_result(func=None, *, success_status: int = 200):
    """
    Transport-Adapter für Django-Ninja Endpoints.

    Übersetzt `Result` → HTTP Response, sodass Endpoints nur noch
    Commands/Queries dispatchen und das Ergebnis zurückgeben müssen.

    Rückgabetypen des Handlers:
        Success(values)         → HTTP <success_status>, erstes Value serialisiert
        Failure(errors)         → HTTP <Status des ersten Fehlers>,
                                  {"errors": [ErrorItem, ...]}

    Vertrag: Die dekorierte Funktion MUSS ein `Result` liefern — ein
    Nicht-`Result` (z. B. bloßes DTO/None) ist ein Programmierfehler und wird
    als `HandlerResultContractError` geworfen (fail-fast statt stiller 200).
    Enthält keine Business-Logik und fängt keine unerwarteten Exceptions.

    Usage:
        @handle_api_result                      # success → 200
        @handle_api_result(success_status=201)  # success → 201

    Args:
        func: Die zu dekorierende Funktion (wenn ohne Klammern verwendet)
        success_status: HTTP-Statuscode für Success (default: 200)
    """

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            result = f(*args, **kwargs)

            # --- Vertrag: Endpoint muss Result liefern, sonst Programmierfehler ---
            if not isinstance(result, Result):
                raise HandlerResultContractError(
                    f"Endpoint/Handler must return Result, got {type(result).__name__}"
                )

            # --- Success: explizit <success_status> + erstes Value ---
            if result.is_success:
                return success_status, result.values[0]

            # --- Failure: Sammlung von Fehlern (immer ≥ 1 Element) ---
            status = 0
            items = []
            for index, error in enumerate(result.errors):
                error_status, item = map_failure(error)
                if index == 0:  # F5: HTTP-Status des ersten Fehlers
                    status = error_status
                items.append(item)

            return status, ErrorResponse(errors=items)

        return wrapper

    if func is None:
        return decorator
    return decorator(func)
