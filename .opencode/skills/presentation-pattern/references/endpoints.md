# SMARTi Backend Code Templates (Coder) - Presentation

Konkrete, implementierungsfertige Code-Templates presentation Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/dweb/dj_<context>/api/endpoints.py`.

**Prinzipien/Patterns** (nicht hier dupliziert):
- Request-Schemas → `schemas.md` (einzige Validierungsgrenze, `to_dto()` ohne `request`-Zugriff)
- Result/Error-Contract → `rules/backend.md` §Result-Pattern & Error-Contract, `../result-pattern/SKILL.md`
- Router-Registrierung → `dweb/dsmarti/api.py` (`api.add_router(...)`)

---

## Presentation Layer — Django-Ninja

### Endpoint (Router + `@handle_api_result`)

Endpoints enthalten keine Business-Logik — nur Mapping (Schema→DTO→Command) plus Handler-/QueryService-Aufruf. Genau ein `Router` pro Datei, immer mit `auth=JWTAuth()`.

```python
# dweb/dj_{{context}}/api/endpoints.py
from __future__ import annotations

from uuid import UUID

from ninja import Router
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth

from dweb.dsmarti.decorators.handler import handle_api_result
from dweb.dsmarti.schema import ErrorResponse
from smarti.{{context}}.appl.dtos import {{AggregateRoot}}ReadDTO
from smarti.{{context}}.appl.handlers.command.create_handler import Create{{AggregateRoot}}Handler
from smarti.{{context}}.appl.mappers.cmd_mappers import {{AggregateRoot}}CmdMapper
from smarti.{{context}}.infra.adapters.query_services import Django{{AggregateRoot}}QueryService
from smarti.{{context}}.infra.adapters.uow import Django{{AggregateRoot}}UnitOfWork

from .schema import Create{{AggregateRoot}}Request

router = Router(tags=["{{AggregateRoot}}"], auth=JWTAuth())

_qs = Django{{AggregateRoot}}QueryService()
_create_handler = Create{{AggregateRoot}}Handler(uow_factory=Django{{AggregateRoot}}UnitOfWork)
_mapper = {{AggregateRoot}}CmdMapper()


@router.get(
    "/",
    response={
        200: {{AggregateRoot}}ReadDTO,
        422: ErrorResponse,
        404: ErrorResponse,
        500: ErrorResponse},
    operation_id="list_{{aggregate_root_snake}}s",
)
def list_{{aggregate_root_snake}}s(request):
    """Alle {{AggregateRoot}}s des aktuellen Nutzers."""
    return _qs.list_for_account(request.user.id)


@router.post(
    "/",
    response={
        201: {{AggregateRoot}}ReadDTO, 
        400: ErrorResponse, 
        422: ErrorResponse,
        500: ErrorResponse},
    operation_id="create_{{aggregate_root_snake}}",
)
@handle_api_result
def create_{{aggregate_root_snake}}(request, payload: Create{{AggregateRoot}}Request):
    """Neuen {{AggregateRoot}} anlegen."""
    dto = payload.to_dto(account_id=str(request.user.id))
    command = _mapper.to_create_command(dto)
    return _create_handler.handle(command)


@router.get(
    "/{id}/",
    response={
        200: {{AggregateRoot}}ReadDTO,
        422: ErrorResponse,
        404: ErrorResponse,
        500: ErrorResponse},
    operation_id="get_{{aggregate_root_snake}}",
)
def get_{{aggregate_root_snake}}(request, id: UUID):
    """{{AggregateRoot}} per ID abrufen."""
    result = _qs.get_by_id(id)
    if result is None:
        raise HttpError(404, "Nicht gefunden")
    return result
```

### Router-Registrierung

Jeder Context-Router wird zentral in `dweb/dsmarti/api.py` registriert — das `export_openapi_schema`-Management-Command liest das OpenAPI-Schema von dort für die CI/CD-Pipeline (`@smarti/api` via Orval).

```python
# dweb/dsmarti/api.py
from dweb.dj_{{context}}.api.endpoints import router as {{context}}_router

api.add_router("/{{context}}/", {{context}}_router)
```

### CQRS-Komponenten-Tabelle

| Komponente       | Basisklasse                      | Ort                                   |
| ---------------- | -------------------------------- | ------------------------------------- |
| Schema           | `ninja.Schema`                   | `dweb/dj_<ctx>/api/schema.py`         |
| DTO              | `BaseDTOPydantic`                | `smarti/<ctx>/appl/dtos.py`           |
| Command          | `BaseCommandPydantic`            | `smarti/<ctx>/appl/commands/`         |
| Handler          | `ICommandHandler[TCmd, TResult]` | `smarti/<ctx>/appl/handlers/command/` |
| Mapper (DTO→Cmd) | —                                | `smarti/<ctx>/appl/mappers/`          |

#### Regeln

1. Genau ein `Router` pro `endpoints.py` — immer mit `auth=JWTAuth()`; kein Endpoint ohne Auth.
2. `@handle_api_result` **nur auf Command-Endpoints**, deren Handler ein `Result` liefert — Success → HTTP success, Failure → `ErrorResponse`. Query-Endpoints liefern DTOs direkt (kein Decorator). Der Decorator wirft `HandlerResultContractError`, wenn die Funktion kein `Result` zurückgibt.
3. `operation_id`-Konvention einhalten (`list_<x>`, `create_<x>`, `get_<x>`) — Orval generiert daraus Frontend-Hooks; `operation_id` ist stabil (Umbenennung = Breaking Change).
4. Response-Mapping über Status-Code-Dicts: `{200/201: ReadDTO, 4xx/5xx: ErrorResponse}`.
5. `account_id` immer aus `request.user` setzen — nie aus dem Request-Body übernehmen.
6. `None` vom QueryService explizit auf 404 mappen — nie `null` mit 200 zurückgeben.
7. Keine Business-Logik im Endpoint — nur Schema→DTO→Command-Mapping plus Handler-/QueryService-Aufruf.

#### Anti-Pattern

```python
# ANTI-PATTERN 1: Router doppelt instantiieren (zweite Zuweisung gewinnt, Auth geht verloren)
router = Router(tags=["{{AggregateRoot}}"])
router = Router(tags=["{{AggregateRoot}}"], auth=JWTAuth())

# ANTI-PATTERN 2: account_id aus dem Body übernehmen (Client kann fremde IDs setzen)
dto = payload.to_dto()
dto.account_id = payload.account_id  # nie aus dem Body!

# ANTI-PATTERN 3: None mit 200 zurückgeben
def get_{{aggregate_root_snake}}(request, id: UUID):
    return _qs.get_by_id(id)  # None → 200 null statt 404!

# ANTI-PATTERN 4: Business-Logik im Endpoint
def create_{{aggregate_root_snake}}(request, payload: Create{{AggregateRoot}}Request):
    if payload.{{field}} == "verboten":  # gehört in Domain/Application als Result!
        raise HttpError(400, "...")
```

### Entscheidungsregel

1. Schreiben (Command) → Schema→DTO→Command→Handler→`@handle_api_result`; Lesen (Query) → QueryService→DTO direkt.
2. Erwartbarer fachlicher Fehler → `Result`/`Failure` aus Handler, `@handle_api_result` mappt auf `ErrorResponse`.
3. Technischer Request-Fehler (Typ, Länge) → Pydantic im Schema (422 automatisch, kein Endpoint-Code nötig).
4. Fehlende Ressource (`None` vom QueryService) → explizit 404 mappen.
5. Neue Query-/Command-Logik nötig → erst `appl-pattern` (Handler/Mapper), dann hier nur verdrahten.

### Hinweise zur Nutzung

```python
# Korrekte Nutzung:
dto = payload.to_dto(account_id=str(request.user.id))  # account_id aus Auth-Context
command = _mapper.to_create_command(dto)                # DTO→Command via appl-Mapper
return _create_handler.handle(command)                  # @handle_api_result übersetzt Result → HTTP

# Router-Registrierung nicht vergessen:
# dweb/dsmarti/api.py → api.add_router("/{{context}}/", {{context}}_router)
# Danach: export_openapi_schema → @smarti/api neu generieren (Orval-Hooks folgen operation_id)
```
