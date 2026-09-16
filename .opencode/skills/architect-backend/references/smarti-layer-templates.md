# SMARTi Layer-Templates (Architekt)

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/`, Django-Apps unter
`backend/src/dweb/dj_<context>/`, Django-Projekt-Config unter `backend/src/dweb/smarti/`.

---

## 1. Bounded Context Übersicht

```markdown
## 1. Bounded Context: {{context}}

**Verantwortlichkeit:** {{Was dieser Context verwaltet}}
**Aggregate Root:** `{{AggregateRoot}}`

### Abhängigkeiten (nur via ID + ACL)
| Fremder Context | Referenziert als | Kommunikation |
|---|---|---|
| `account` | `AccountId` | — (nur Referenz) |
| `plan` | `LernplanId` | ACL bei `{{EventName}}` |
```

---

## 2. ERD

```mermaid
erDiagram
    {{AggregateRoot}} {
        uuid id PK
        uuid account_id FK "AccountId — kein Join, nur Referenz"
        string status
        datetime created_at
        datetime updated_at
    }

    {{Entity}} {
        uuid id PK
        uuid {{aggregate_root}}_id FK
        string title
        int order_index
    }

    {{AggregateRoot}} ||--o{ {{Entity}} : "enthält"
```

---

## 3. Layer → Datei-Zuordnung

| Schicht | Ort | Enthält (Konzept) |
|---|---|---|
| Domain | `smarti/<ctx>/domain/` | `model/` (Aggregate Root + Entities), `value_objects.py`, `events.py`, `enums.py`, `services.py` |
| Application | `smarti/<ctx>/appl/` | `commands/`, `dtos.py`, `ports.py` (Interfaces), `mappers/`, `handlers/command/`, `handlers/query/` |
| Infrastructure | `smarti/<ctx>/infra/` | `adapters/repositories.py`, `uow.py`, `query_services.py`, `acl.py`, `{{aggregate}}_mapper.py` |
| Presentation | `dweb/<ctx>/` | `api/schema.py` (Ninja-Schemas), `api/endpoints.py` (Router + `@handle_api_result`), `models.py` (ORM), `urls.py` |

> Code-Templates je Schicht → `.opencode/skills/domain-pattern/references/`, `.opencode/skills/appl-pattern/references/`, `.opencode/skills/infra-pattern/references/`, `.opencode/skills/presentation-pattern/references/`.

---

## 8. Django App Struktur

```
dweb/
└── {{context}}/                        # Presentation Layer (Django App)
    ├── api/
    │   ├── schema.py                   # Django-Ninja Schemas (Input-Validierung)
    │   └── endpoints.py                # Router + Endpoints mit @handle_api_result
    ├── migrations/
    ├── models.py                       # ORM Models (nur für Persistenz)
    ├── urls.py
    └── apps.py

smarti/
└── {{context}}/
    ├── domain/
    │   ├── model/
    │   │   └── {{aggregate}}.py        # Aggregate Root + Entities
    │   ├── value_objects.py
    │   ├── events.py
    │   ├── enums.py
    │   └── services.py                 # (optional Domain Services)
    ├── application/
    │   ├── commands/
    │   │   └── {{context}}_commands.py
    │   ├── handlers/
    │   │   ├── command/
    │   │   │   ├── create_handler.py
    │   │   │   └── update_handler.py
    │   │   └── query/
    │   │       └── get_handler.py
    │   ├── mappers/
    │   │   └── cmd_mappers.py
    │   ├── dtos.py
    │   └── ports.py
    └── infra/
        ├── {{aggregate_root_snake}}_mapper.py
        └── adapters/
            ├── repositories.py
            ├── uow.py
            ├── query_services.py
            └── acl.py                  # (wenn Kommunikation mit anderen Contexts)
```
