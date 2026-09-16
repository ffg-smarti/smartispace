# Result-Pattern & Error-Contract — Prinzipien

> **Kernregel:** Result beschreibt den fachlichen Kontrollfluss. Exceptions beschreiben
> unerwartete oder verletzte Invarianten. Die API entscheidet, wie ein fachlicher Fehler
> nach außen dargestellt wird.

Coding-Anleitung → Skill `result-pattern`; Templates → `skills/architect-backend/references/`.

## Entscheidungsbaum

```
Kann der Zustand bei normaler Nutzung auftreten?
├── Nein  → Exception (Invariante/technischer Fehler)
└── Ja    → Ist es eine fachliche Regelverletzung?
    ├── Ja    → Result Failure
    └── Nein  → technische Behandlung prüfen
```

Mehrere Fehler: abhängig voneinander → fail-fast (erster Failure);
unabhängig voneinander → akkumulieren (alle in einem `Failure(errors=...)`).
Eine `Failure` trägt immer `errors: tuple[BaseFailure, ...]` (mindestens ein Element);


## Result-Algebra (Zielbild)

```
Result[T, E]
├── Success(values: tuple[T, ...])   # mindestens ein Value
└── Failure(errors: tuple[E, ...])   # mindestens ein Error
```

- `Success` → mindestens ein Value; die Anzahl 1 ist nur ein Spezialfall.
- `Failure` → mindestens ein Error; `errors=()` ist ungültig (`ValueError`).
- Eine Failure ist immer eine Sammlung; die Anzahl 1 ist nur ein Spezialfall.

## Schichtenfluss

```
Domain               → Result[T, BaseFailure]
Application/Handler  → Result weiterreichen
API Adapter          → BaseFailure → ApiError
Django-Ninja/OpenAPI → ErrorResponse
Frontend (@smarti/api) → typisierter Fehler
```

## ErrorCode → HTTP-Mapping

Jeder `ErrorCode` wird an der API-Grenze (`dweb/dsmarti/api_errors.py`) auf einen
HTTP-Status gemappt. Die groben Status-Kategorien (Fallback):

| ErrorCode (grob) | HTTP | Situation |
|---|---|---|
| VALIDATION | 422 | Input strukturell falsch |
| NOT_FOUND | 404 | Entität existiert nicht |
| CONFLICT | 409 | Zustandskonflikt (Duplikat, Concurrency) |
| PRECONDITION_FAILED | 412 | Domain-Zustand lässt Aktion nicht zu |
| UNAUTHORIZED | 401 | Nicht authentifiziert |
| FORBIDDEN | 403 | Nicht autorisiert |
| INTERNAL | 500 | Unerwarteter Fehler |

## Standard-Error-Contract

Jede Failure → gleiche JSON-Struktur:

```json
{ "errors": [ { "code": "...", "message": "...", "field": null } ] }
```

- `field`, lokalisierte `message`, HTTP-Status gehören zur API-Darstellung, nicht zur Domain.
- Domain Errors sind von HTTP/API/Pydantic unabhängig und **dünn**: Sie beschreiben die
  fachliche Ursache (z. B. `OrderAlreadyExists(order_number)`), nicht deren API-Darstellung.
  Kein `code` + `message` + `field` + `error_type`-Mix im Domain-Layer.

## API-Grenze

- `@handle_api_result` ist ein Transport-Adapter (nur Command-Endpoints): Success → HTTP success, Failure → `ErrorResponse`. Er wirft `HandlerResultContractError`, wenn kein `Result` zurückgegeben wird.
- Ein globaler Exception-Handler (`dweb/dsmarti/api.py`) mappt Nicht-`Result`-Fehlerpfade (`HttpError`, Request-Validierung, unbehandelte Exceptions) auf denselben Contract.
- Enthält keine Business-Logik, verschluckt keine unerwarteten Exceptions.
- Domain-Code entscheidet nie anhand eines HTTP-Statuscodes.