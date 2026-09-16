# SMARTi Backend Code Templates (Coder) - Presentation

Konkrete, implementierungsfertige Code-Templates presentation Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/dweb/dj_<context>/api/schema.py`.

---

## Presentation Layer — Django-Ninja

### Schema (Validierungsgrenze)

Ninja-Schemas sind die einzige Validierungsgrenze für User-Input. Pydantic validiert automatisch → ungültig = 422. Das Schema enthält keine Business-Logik und kennt weder `request` noch `request.user` — der Endpoint setzt `account_id` aus dem Auth-Context.

```python
# dweb/dj_{{context}}/api/schema.py
from __future__ import annotations

from ninja import Field, Schema

from smarti.{{context}}.appl.dtos import Create{{AggregateRoot}}DTO


class Create{{AggregateRoot}}Request(Schema):
    """Einzige Validierungsgrenze für User-Input. Pydantic validiert automatisch."""

    {{field}}: str = Field(min_length=1, max_length=255)

    def to_dto(self, account_id: UUID) -> Create{{AggregateRoot}}DTO:
        """Mappt das validierte Schema auf das Application-DTO."""
        return Create{{AggregateRoot}}DTO(
            account_id=account_id,
            {{field}}=self.{{field}},
        )
```

Read-DTOs (`{{AggregateRoot}}ReadDTO`) leben in `smarti/<ctx>/appl/dtos.py` — sie werden im Endpoint als Response-Typ referenziert, nicht hier dupliziert.

#### Regeln

1. Jedes Request-Schema erbt von `ninja.Schema` — kein plain `dict`, kein Django-Form.
2. `to_dto()` nimmt `account_id` als Parameter — das Schema greift nie auf `request`/`request.user` zu.
3. Feld-Constraints (`Field(min_length=...)`, `max_length=...`) gehören ins Schema — Pydantic validiert vor jedem Handler-Aufruf.
4. Keine Business-Logik im Schema — nur Typen, Constraints und `to_dto()`-Mapping.
5. Keine Read-DTOs in `schema.py` duplizieren — sie kommen aus `smarti/<ctx>/appl/dtos.py`.

#### Anti-Pattern

```python
# ANTI-PATTERN 1: request-Zugriff im Schema
class Create{{AggregateRoot}}Request(Schema):
    def to_dto(self) -> Create{{AggregateRoot}}DTO:
        return Create{{AggregateRoot}}DTO(
            account_id=str(request.user.id),  # NameError — request existiert hier nicht!
        )

# ANTI-PATTERN 2: Business-Validierung im Schema statt Result-Pattern
class Create{{AggregateRoot}}Request(Schema):
    {{field}}: str

    def clean(self):  # Fachliche Regel gehört in Domain/Application als Result, nicht hierher
        if self.{{field}} == "verboten":
            raise ValueError(...)
```

### Entscheidungsregel

1. User-Input validieren → Ninja-Schema (`schema.py`).
2. Fachliche Fehler (erwartbar) → `Result[T, BaseFailure]` in Domain/Application, nie als Schema-Exception.
3. Technische Request-Fehler (Typ, Länge, Format) → Pydantic-Validierung im Schema (HTTP 422 automatisch).
4. `account_id` kommt immer aus dem Auth-Context (`request.user`) im Endpoint — nie aus dem Request-Body.
