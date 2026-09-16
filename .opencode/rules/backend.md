---
paths:
  - "backend/src/dweb/**"
  - "backend/src/smarti/**"
  - "backend/**"
---

# Backend Development Rules

## Django ORM
- ALWAYS use Django's ORM for database interactions instead of raw SQL
- Use `select_related` and `prefetch_related` to optimize queries and avoid N+1 problems
- Use Django's built-in pagination for list endpoints
- Add database indexes on frequently queried columns
- Use Django-Ninja's built-in query optimization features
- Never hardcode secrets in source code - use environment variables instead
- Use foreign keys with ON DELETE CASCADE where appropriate

## API Routes
- Always check authentication: verify JWT exists (via `django-ninja-jwt`) — keine Session-Cookies/CSRF
- JWT-Claims (verbindlich, Custom Token via `django-ninja-jwt`): `user_id` (UUID), `family_id` (UUID), `roles` (`parent`/`child`/…). Services validieren das Token lokal (nur Signatur — kein Auth-Roundtrip pro Request). `account_id` im Endpoint immer aus den Claims (`request.user`), nie aus dem Request-Body.
- Return meaningful error messages with appropriate HTTP status codes
- Django-Ninja Schema (Pydantic) validiert Input automatisch — keine manuelle Validierung nötig
- `@handle_api_result`-Decorator für alle neuen Endpoints verwenden (siehe §Result-Pattern & Error-Contract)

## Query Patterns
- Query Services lesen direkt via Django ORM — kein Umweg über Domain-Aggregate (Prinzipien: shared/architecture.md)
- Django-Cache-Framework für selten ändernde Daten: `cache.set()` / `cache.get()`
- `select_related()` / `prefetch_related()` für N+1-Vermeidung

## Idempotenz (Mutations)
- POST mit Nebeneffekt: `Idempotency-Key`-Header unterstützen (24h TTL) oder natürliche Idempotenz (`get_or_create`).
- PUT/PATCH: Upsert-Semantik (idempotent per Design).
- DELETE: Löschen nicht-existenter Ressource = 204/404 konsistent (idempotent).
- Grund: TanStack-Query-Retries und Offline-Sync können Requests wiederholen.
- Event-Handler-Idempotenz → `appl-pattern/references/handlers.md`, `infra-pattern/references/tasks.md` (`IProcessedEventStore`).

## Mapper Pattern
- DTO→Command Mapper immer als Klasse mit `_dispatch`-Dict, `map()`-Methode
- Kein try/catch im Mapper — Value-Object-Constructors können ValueError werfen, das sind Entwicklerfehler (shared/mapping.md) #TODO: check
- Optionale Felder mit None-Guard: `field=VO(dto.field) if dto.field else None`

## Type Annotations
- ALWAYS add `from __future__ import annotations` as the first import in every `.py` file
- NEVER use string/forward-reference annotations (`-> "Type"`), use bare types (`-> Type`) instead
- Use `Self` return type for `@classmethod` factories where the class itself is returned

## Result-Pattern & Error-Contract

> **Kernregel:** Result beschreibt den fachlichen Kontrollfluss. Exceptions beschreiben
> unerwartete oder verletzte Invarianten. Die API entscheidet, wie ein fachlicher Fehler
> nach außen dargestellt wird.

### Entscheidungsbaum
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

### ErrorCode → HTTP-Mapping
Jeder `ErrorCode` wird an der API-Grenze (`dweb/dsmarti/api_errors.py`) auf einen
HTTP-Status gemappt. Die groben Status-Kategorien (Fallback) mappen wie folgt:

| ErrorCode (grob) | HTTP | Situation |
|---|---|---|
| VALIDATION | 422 | Input strukturell falsch |
| NOT_FOUND | 404 | Entität existiert nicht |
| CONFLICT | 409 | Zustandskonflikt (Duplikat, Concurrency) |
| PRECONDITION_FAILED | 412 | Domain-Zustand lässt Aktion nicht zu |
| UNAUTHORIZED | 401 | Nicht authentifiziert |
| FORBIDDEN | 403 | Nicht autorisiert |
| INTERNAL | 500 | Unerwarteter Fehler |

### Standard-Error-Contract
Jede Failure → gleiche JSON-Struktur:

```json
{ "errors": [ { "code": "...", "message": "...", "field": null } ] }
```

- `field`, lokalisierte `message`, HTTP-Status gehören zur API-Darstellung, nicht zur Domain.
- Domain Errors sind von HTTP/API/Pydantic unabhängig und **dünn**: Sie beschreiben die
  fachliche Ursache (z. B. `OrderAlreadyExists(order_number)`), nicht deren API-Darstellung.
  Kein `code` + `message` + `field` + `error_type`-Mix im Domain-Layer.

### API-Grenze
- `@handle_api_result` ist ein Transport-Adapter: Success → HTTP success, Failure → ErrorResponse.
- Enthält keine Business-Logik, verschluckt keine unerwarteten Exceptions.
- Domain-Code entscheidet nie anhand eines HTTP-Statuscodes.

## Security
- Never hardcode secrets in source code
- Use environment variables for all credentials
- Validate and sanitize all user input

## Code Style
- use always `"ein string"` instead of `'ein string'`