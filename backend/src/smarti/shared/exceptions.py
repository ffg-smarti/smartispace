# smarti_lms/shared/exceptions.py

# from exceptions import ValidationError
import logging
from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from pydantic import ValidationError

from smarti.shared.objects import AccountId

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


########################################################################################
#                           --- ErrorCode Enum ---                                     #
########################################################################################


class ErrorCode(StrEnum):
    """
    Typsicherer, maschinenlesbarer Fehler-Identifikator.

    Das Backend trägt `ErrorCode` als fachliche Ursache in `Result.Failure`
    (via `BusinessFailure`). HTTP-Status und lokalisierte Meldung werden
    AUSSCHLIESSLICH an der API-Grenze erzeugt (`dweb/dsmarti/api_errors.py`).

    Zwei Ebenen, bewusst in einem Enum:

    1. **Feine fachliche Codes** — beschreiben die konkrete Ursache und werden
       primär verwendet (z. B. `NOT_OWNER`; zukünftig `EMAIL_ALREADY_REGISTERED`,
       `NAME_NOT_UNIQUE`). Für sie liefert der Presentation-Mapper Status + Meldung.

    2. **Grobe Status-Kategorien** (`VALIDATION`, `NOT_FOUND`, `FORBIDDEN`,
       `UNAUTHORIZED`, `CONFLICT`, `PRECONDITION_FAILED`, `INVALID_STATE`,
       `INTERNAL`) — Fallback-Bucket, wenn (noch) kein feiner Code existiert.
       Der Mapper hat dafür Default-Status + Default-Meldung.

    Regel: Bevorzugt feine Codes verwenden; grobe Kategorien nur als Übergang/
    Fallback, nicht als primäre fachliche Aussage (sie verlieren die konkrete
    Ursache — z. B. sagt `CONFLICT` nicht, welcher Konflikt vorliegt).
    """

    # --- Feine fachliche Codes (primär) ---
    NOT_OWNER = "NOT_OWNER"

    # --- Grobe Status-Kategorien (Fallback) ---
    VALIDATION = "VALIDATION"
    NOT_FOUND = "NOT_FOUND"
    FORBIDDEN = "FORBIDDEN"
    UNAUTHORIZED = "UNAUTHORIZED"
    CONFLICT = "CONFLICT"
    PRECONDITION_FAILED = "PRECONDITION_FAILED"
    INVALID_STATE = "INVALID_STATE"
    INTERNAL = "INTERNAL"


# ============================================
# BASE FAILURE  (fachliche Fehler, dünn)
# Basis für erwartbare Business-Failures, die als Result.Failure(errors=(...))
# in den Kontrollfluss eingehen — NICHT als Exception.
# ============================================


class BaseFailure:
    """
    Basisklasse für dünne fachliche Fehler (Business Failures).

    Ein BaseFailure beschreibt die fachliche Ursache, NICHT deren API-/UI-Darstellung.
    Er ist bewusst schlank und enthält **kein** `code`, `message`, `field` oder
    HTTP-Status — das ist allein Aufgabe des API-Adapters (Mapping an der API-Grenze).

    Er geht in den Kontrollfluss über das Result-Pattern ein:

        Failure(errors=(OrderAlreadyExists(order_number=...),))

    und wird in der API-Schicht übersetzt:

        OrderAlreadyExists
            ├── code    = "ORDER_ALREADY_EXISTS"
            ├── message = "Order already exists."
            ├── field   = "order_number"
            └── status  = 409

    Verwendung:
        @dataclass(frozen=True)
        class OrderAlreadyExists(BaseFailure):
            order_number: str

        @dataclass(frozen=True)
        class OrderIsEmpty(BaseFailure):
            pass

    Abgrenzung:
    - Erwartbare fachliche Fehler  → BaseFailure als Result.Failure(errors=(...)).
    - Invarianten-/technische Fehler → Exception (DomainInvariantError, ValueError, ...).
    """

    pass


@dataclass(frozen=True)
class BusinessFailure(BaseFailure):
    """
    Generische, typsichere fachliche Fehlerklasse (Mittelweg: eine Klasse + ErrorCode).

    Trägt die fachliche Ursache (`code` als `ErrorCode`), optional eine
    Entwickler-/Log-Meldung (`message`) und optional eine Feld-Zusatzinfo (`field`).
    KEINE HTTP-/UI-Darstellung — die erzeugt der Mapper an der API-Grenze.

    Beispiel:
        Failure(BusinessFailure(code=ErrorCode.EMAIL_ALREADY_REGISTERED))

    Abgrenzung:
    - Erwartbare fachliche Fehler  → BusinessFailure als Result.Failure(errors=(...)).
    - Invarianten-/technische Fehler → Exception (DomainInvariantError, ValueError, ...).
    """

    code: ErrorCode
    message: str | None = None
    field: str | None = None


# ============================================
# BASE EXCEPTION
# ============================================


class DomainException(Exception):  # noqa
    """
    Basis-Exception für User-Facing-Validierungsfehler (API-/Form-Darstellung).

    Hinweis: Diese Exception trägt bewusst `message`/`code`/`errors` (mit `field`),
    weil sie die Darstellung an der API-/Form-Grenze beschreibt. Sie ist KEIN
    BaseFailure und wird NIE als Result-Failure modelliert. Für fachliche
    Regelverletzungen → BaseFailure als Result.Failure(errors=(...)).
    """

    def __init__(
        self,
        message: str,
        code: str | None = None,
        errors: list[dict[str, Any]] | None = None,
    ):
        self.message = message
        self.errors = errors or []
        self.code = code or self.__class__.__name__
        super().__init__(self.message)

    @classmethod
    def from_pydantic(cls, pydantic_error: ValidationError):
        """
        Erstellt DtoValidationError aus Pydantic ValidationError.
        Übersetzt alle Fehler in benutzerfreundliche deutsche Meldungen.
        """
        translated_errors = []

        for error_dict in pydantic_error.errors():
            code = error_dict.get("type", "unknown")
            loc = error_dict.get("loc", ())
            ctx = error_dict.get("ctx", {})

            # Feldname (letztes Element in loc)
            field = str(loc[-1]) if loc else ""
            field_display = field.replace("_", " ").capitalize()

            # Übersetze Meldung
            message = cls._translate_error(code, field_display, ctx)

            translated_errors.append({"field": field, "message": message, "code": code})

        count = len(translated_errors)
        return cls(
            message=f"Validierung fehlgeschlagen: {count} Fehler gefunden",
            errors=translated_errors,
        )

    @staticmethod
    def _translate_error(code: str, field: str, ctx: dict) -> str:
        """Übersetzt einen Fehlercode in benutzerfreundliche Meldung"""

        # Basis-Übersetzungen
        translations = {
            # Pflichtfelder
            "missing": f"{field} muss ausgefüllt werden",
            "value_error.missing": f"{field} muss ausgefüllt werden",
            # String-Validierung
            "string_too_short": f"{field} muss mindestens {ctx.get('min_length')} Zeichen haben",
            "string_too_long": f"{field} darf maximal {ctx.get('max_length')} Zeichen haben",
            "string_pattern_mismatch": f"{field} hat ein ungültiges Format",
            "string_type": f"{field} muss Text sein",
            # Zahlen
            "int_type": f"{field} muss eine ganze Zahl sein",
            "float_type": f"{field} muss eine Zahl sein",
            "greater_than": f"{field} muss größer als {ctx.get('gt')} sein",
            "greater_than_equal": f"{field} muss mindestens {ctx.get('ge')} sein",
            "less_than": f"{field} muss kleiner als {ctx.get('lt')} sein",
            "less_than_equal": f"{field} darf maximal {ctx.get('le')} sein",
            # E-Mail & URL
            "value_error.email": f"{field} ist keine gültige E-Mail-Adresse",
            "email": f"{field} ist keine gültige E-Mail-Adresse",
            "url_parsing": f"{field} ist keine gültige URL",
            # Datum
            "date_parsing": f"{field} ist kein gültiges Datum",
            "datetime_parsing": f"{field} ist kein gültiges Datum",
            "date_past": f"{field} muss in der Vergangenheit liegen",
            "date_future": f"{field} muss in der Zukunft liegen",
            # Boolean
            "bool_type": f"{field} muss Ja oder Nein sein",
            # Listen
            "too_short": f"{field} muss mindestens {ctx.get('min_length')} Einträge haben",
            "too_long": f"{field} darf maximal {ctx.get('max_length')} Einträge haben",
        }

        # Gib übersetzte Meldung zurück oder Fallback
        return translations.get(code, f"{field} ist ungültig")


# ============================================
# USER-FACING EXCEPTIONS  (erben DomainException)
# Für Fehler, die dem Nutzer angezeigt werden müssen.
# ============================================


class DtoValidationError(DomainException):
    """DTO Validation error, with Pydantic"""

    pass

class EntityValidationError(DomainException):
    """Entity Validation error, with Pydantic"""

    def __str__(self) -> str:
        if not self.errors:
            return self.message
        details = []
        for err in self.errors:
            if isinstance(err, dict):
                field = err.get("field", "")
                msg = err.get("message", str(err))
                field_info = f"[{field}] " if field else ""
                details.append(f"  - {field_info}{msg}")

        return f"{self.message}:\n" + "\n".join(details)


@dataclass(frozen=True)
class NotOwnerError(BaseFailure):
    """
    Fachlicher Fehler: handelnder Account ist nicht der Besitzer der Ressource.

    Dünn: trägt nur die fachlichen Daten (actor, owner) plus einen typisierten
    `code`. Die Darstellung (Status, Meldung) erzeugt der Mapper an der API-Grenze.
    """

    actor: AccountId
    owner: AccountId
    code: ErrorCode = ErrorCode.NOT_OWNER
    message: str | None = None
    field: str | None = None


# ============================================
# DOMAIN / DEVELOPER EXCEPTIONS  (erben direkt Exception)
# Signalisieren Invarianten-Verletzungen und Programmierfehler.
# Diese werden NIE als Result-Failure modelliert — nur als Exception.
# ============================================


class DomainInvariantError(DomainException):
    """
    Wird geworfen wenn eine Domain-Invariante verletzt wird.

    Schicht:  Domain (Aggregate, Entity)
    Ursache:  Ein Zustand wurde erreicht, der strukturell niemals möglich sein
              sollte — ein Zeichen, dass ein Code-Pfad fehlt oder falsch ist.
    Abgrenzung: Für erwartbare Business-Failures → BaseFailure als
                Result.Failure(errors=(...)), NICHT diese Exception.

    Beispiel:
        class Order(BaseDomainModelPydantic):
            def add_line(self, line: OrderLine) -> None:
                if self.status == OrderStatus.CLOSED:
                    raise DomainInvariantError(
                        "Cannot add line to a closed order — "
                        "caller must check status before calling add_line()"
                    )
    """

    pass


class ValueObjectError(DomainException):
    """
    Wird geworfen wenn ein Value Object mit strukturell ungültigen Daten
    konstruiert wird.

    Schicht:  Domain (Value Objects)
    Ursache:  Upstream (Schema / Form) hat nicht korrekt validiert.
              Das Value Object ist die letzte Verteidigungslinie gegen
              invalide Primitive — ein Fehler hier ist immer ein Developer Error.
    Hinweis:  Kann alternativ als ValueError bleiben; ValueObjectError macht
              den Ursprung im Stacktrace jedoch sofort erkennbar.
    Abgrenzung: Für fachliche Regelverletzungen → BaseFailure als
                Result.Failure(errors=(...)), NICHT diese Exception.

    Beispiel:
        class StoryPoints:
            def __init__(self, value: int) -> None:
                if not (1 <= value <= 25):
                    raise ValueObjectError(
                        f"StoryPoints must be between 1 and 25, got {value!r}"
                    )
    """

    pass


# ----------------------------------------------


class MappingError(DomainException):
    """
    Wird geworfen wenn ein ORM ↔ Domain Mapping fehlschlägt.

    Schicht:  Infrastructure (Mapper)
    Ursache:  Ein Feld fehlt, hat den falschen Typ oder einen Wert,
              den kein Domain-Objekt akzeptiert. Signalisiert inkonsistente
              DB-Daten oder einen Mapper-Bug.
    Regel:    Mapper fangen keine Exceptions und wrappen sie nicht in Result.
              MappingError propagiert unmodified.

    Beispiel:
        class ContentItemMapper:
            def infra_to_domain(self, model: ItemModel) -> ContentItem:
                if model.type not in ItemType.values():
                    raise MappingError(
                        "Unknown item type in DB",
                        mapper="ContentItemMapper",
                        field="type",
                        item_id=str(model.id),
                        raw_value=model.type,
                    )
    """

    def __init__(
        self,
        message: str,
        *,
        mapper: str,
        field: str | None = None,
        item_id: str | None = None,
        raw_value: Any = None,
    ):
        self.mapper = mapper
        self.field = field
        self.item_id = item_id
        self.raw_value = raw_value
        super().__init__(
            f"[{mapper}] {message}"
            + (f" | field={field}" if field else "")
            + (f" | item_id={item_id}" if item_id else "")
            + (f" | raw={raw_value!r}" if raw_value is not None else "")
        )

class CommandMappingError(MappingError):
    """Command Mapping error, with Pydantic"""

    pass

class QueryMappingError(MappingError):
    """Query Mapping error, with Pydantic"""

    pass


class RepositoryError(DomainException):
    """
    Wird geworfen bei unerwarteten technischen Fehlern in Repository-Implementierungen.

    Schicht:  Infrastructure (Repository)
    Ursache:  DB-Operation fehlgeschlagen aus technischen Gründen —
              ORM-Constraint verletzt, Connection-Fehler, inkonsistenter DB-Zustand.
    Abgrenzung: 'Nicht gefunden' ist kein Fehler → None / leere Liste zurückgeben,
                kein RepositoryError.
    Regel:    Technischer Fehler → Exception, NIE als Result-Failure wrappen.
              Für fachliche Regelverletzungen → BaseFailure als
              Result.Failure(errors=(...)).

    Beispiel:
        class DjangoOrderRepository(IOrderRepository):
            def save(self, order: Order) -> None:
                try:
                    orm_obj = self._mapper.domain_to_infra(order)
                    orm_obj.save()
                except IntegrityError as e:
                    raise RepositoryError(
                        "Integrity constraint violated while saving Order",
                        repository="DjangoOrderRepository",
                        operation="save",
                    ) from e
    """

    def __init__(
        self,
        message: str,
        *,
        repository: str,
        operation: str | None = None,
    ):
        self.repository = repository
        self.operation = operation
        super().__init__(
            f"[{repository}]" + (f".{operation}" if operation else "") + f" — {message}"
        )


# ============================================
# APPLICATION / BUS EXCEPTIONS  (erben direkt Exception)
# ============================================


class HandlerAlreadyRegisteredError(DomainException):
    """
    Application-/Bus-Exception: Doppelregistrierung eines Command-Handlers.

    Ursache:  Programmier-/Konfigurationsfehler (zwei Handler für denselben Command).
    Abgrenzung: Technischer Fehler → Exception, NIE als Result-Failure.
                Für fachliche Regelverletzungen → BaseFailure als
                Result.Failure(errors=(...)).
    """

    pass


class HandlerNotRegisteredError(DomainException):
    """
    Application-/Bus-Exception: Kein Handler für den Command-/Query-Typ registriert.

    Ursache:  Programmier-/Konfigurationsfehler (fehlende Handler-Registrierung
              im Wiring/Bootstrap).
    Abgrenzung: Technischer Fehler → Exception, NIE als Result-Failure.
                Für fachliche Regelverletzungen → BaseFailure als
                Result.Failure(errors=(...)).
    """

    pass


class HandlerResultContractError(DomainException):
    """
    Application-/API-Exception: Eine mit @handle_api_result dekorierte Funktion
    hat keinen `Result` zurückgegeben (z. B. ein bloßes DTO oder None).

    Ursache:  Programmierfehler — der Endpoint/Handler muss ein `Result` liefern.
    Abgrenzung: Vertragsbruch → Exception (fail-fast), NIE als Result-Failure.
    """

    pass
