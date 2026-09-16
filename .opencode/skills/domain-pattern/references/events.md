# SMARTi Backend Code Templates (Coder) - Events

Konkrete, implementierungsfertige Code-Templates domain Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/domain/events.py`.

---

## Domain Layer

### SyncDomainEvent vs. AsyncDomainEvent

| | `SyncDomainEvent` | `AsyncDomainEvent` |
|---|---|---|
| **Konsistenz** | Strong (in-transaction) | Eventual (Celery Worker) |
| **Ausführung** | Sofort im Request-Thread | Async via Celery Task |
| **Fehlerbehandlung** | Exception → Rollback | DeadLetterStore + Retry |
| **Wann verwenden** | Fachliche Abhängigkeit im selben Context | Benachrichtigung, externe Integration |
| **Beispiel** | Account gelöscht → Profile gelöscht | Account gelöscht → E-Mail senden |

**Entscheidungsregel (Domain-Schicht):**
- Wenn ein Event fehlschlagen kann und der Kontext atomar sein muss → `SyncDomainEvent`
- Wenn ein Event fehlschlagen kann und eventual consistency akzeptabel ist → `AsyncDomainEvent`
- ACL löst ein anderes Problem (Model-Übersetzung zwischen Contexts)

---

### Domain Events — Template

```python
# smarti/{{context}}/domain/events.py
from smarti.shared.domain.event import AsyncDomainEvent, DomainEventBase, SyncDomainEvent

class {{AggregateRoot}}Created(SyncDomainEvent):
    {{aggregate_root}}_id: str
    account_id: str

class {{AggregateRoot}}{{Action}}ed(AsyncDomainEvent):
    {{aggregate_root}}_id: str
    # weitere relevante Felder
```

---