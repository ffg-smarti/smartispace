# dweb/dsmarti/api.py
"""Ninja-API-Instanz (DSMARTI / COPI-LP).

Zentraler Ninja-Router fuer die REST-API. Die Endpoints werden nach und nach
in den Django-Apps (account, core, ...) registriert — siehe workspace.md
§Django Fein-Struktur. Das export_openapi_schema-Management-Command liest
von hier das OpenAPI-Schema fuer die CI/CD-Pipeline.
"""
from __future__ import annotations

import logging

from ninja import NinjaAPI
from ninja.errors import HttpError
from ninja.errors import ValidationError as NinjaValidationError

from dweb.dsmarti.schema import ErrorItem, ErrorResponse
from smarti.shared.exceptions import DtoValidationError, EntityValidationError

logger = logging.getLogger(__name__)

api = NinjaAPI(
    title="COPI-LP API",
    version="0.1.0",
    description="Backend der COPI Lernplattform",
)


# ================================================================
#  Globaler Exception-Handler — einheitlicher Fehler-Contract.
#  JEDER Fehlerpfad (Validation, HttpError, technische Exception)
#  mappt auf { "errors": [ { code, message, field } ] }.
# ================================================================


def _domain_error_items(exc) -> list[ErrorItem]:
    """Dünne DomainException (mit übersetzten errors[]) → ErrorItem-Liste."""
    items = [
        ErrorItem(
            message=item.get("message"),
            code=item.get("code"),
            field=item.get("field"),
        )
        for item in (exc.errors or [])
    ]
    if not items:
        items = [ErrorItem(message=exc.message, code=exc.code)]
    return items


@api.exception_handler(DtoValidationError)
@api.exception_handler(EntityValidationError)
def domain_validation_handler(request, exc):
    """Fachliche DTO-/Entity-Validierung → 422."""
    return api.create_response(
        request,
        ErrorResponse(errors=_domain_error_items(exc)).model_dump(),
        status=422,
    )


@api.exception_handler(NinjaValidationError)
def ninja_validation_handler(request, exc):
    """Django-Ninja Request-Parameter-Validierung (Pydantic) → 422."""
    items = [
        ErrorItem(
            message=item.get("msg") or "Ungültige Eingabe.",
            code=item.get("type"),
            field=str(item["loc"][-1]) if item.get("loc") else None,
        )
        for item in exc.errors
    ]
    return api.create_response(
        request,
        ErrorResponse(errors=items).model_dump(),
        status=422,
    )


@api.exception_handler(HttpError)
def http_error_handler(request, exc):
    """HttpError (404/403/…, inkl. Auth/Throttled) → eigener Status."""
    return api.create_response(
        request,
        ErrorResponse(
            errors=[ErrorItem(message=str(exc), code=str(exc.status_code))]
        ).model_dump(),
        status=exc.status_code,
    )


@api.exception_handler(Exception)
def unhandled_exception_handler(request, exc):
    """Unbehandelte (technische) Exception → 500."""
    logger.exception("Unhandled exception: %s", exc)
    return api.create_response(
        request,
        ErrorResponse(
            errors=[
                ErrorItem(
                    message="Ein interner Fehler ist aufgetreten.",
                    code="INTERNAL",
                )
            ]
        ).model_dump(),
        status=500,
    )


# Hier werden spaeter die Router der Django-Apps registriert, z.B.:
# from dsmarti.account.api import router as account_router
# api.add_router("/account/", account_router)
