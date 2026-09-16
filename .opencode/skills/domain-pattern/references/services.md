# SMARTi Backend Code Templates (Coder) - Domain

Konkrete, implementierungsfertige Code-Templates domain Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/domain/services.py`.

---

## Domain Layer

### Domain Services

Domain Services enthalten Business-Logik, die nicht in einem einzelnen Aggregate oder ValueObject passt. Sie operieren auf Aggregates und ValueObjects, enthalten keine Infrastruktur-Logik und keine Repository-Referenzen.

Domain Services müssen:

- Kein Framework- oder ORM-Import enthalten
- Nur ValueObjects und primitive Typen als Parameter akzeptieren
- Kein Repository, keine DB-Verbindung, keinen Service als Instanzzustand haben
- Fachliche Operationen kapseln, die mehrere Aggregates betreffen
- `Result[T, BaseFailure]` als Rückgabetyp verwenden

#### Wann einen Domain Service erstellen?

- Wenn eine Business-Operation mehrere Aggregates betrifft
- Wenn die Logik nicht in ein einzelnes Aggregate passt (Anemic Model)
- Wenn die Operation komplex ist und mehrere Schritte umfasst

#### Wann NICHT einen Domain Service erstellen?

- Wenn die Logik in einem einzigen Aggregate lebt → Aggregate-Methode
- Wenn die Operation Infrastruktur braucht (Repository, DB) → Application Handler
- Wenn es nur eine einfache Zuordnung ist → Mapper

#### Template

```python
# smarti/{{context}}/domain/services.py
from __future__ import annotations

from smarti.shared.domain.model import BaseDomainModelPydantic
from smarti.shared.result import Result, Success, Failure
from smarti.shared.exceptions import BaseFailure


class {{AggregateRoot}}Service:
    """Domain Service für {{AggregateRoot}}-Operationen."""

    def transfer_between(
        self,
        source: BaseDomainModelPydantic,
        target: BaseDomainModelPydantic,
        amount: int,
    ) -> Result[None, BaseFailure]:
        """Transferiert einen Betrag zwischen zwei Aggregates."""
        if source.status != Active:
            return Failure(
                message="Source is not active",
                code="SOURCE_NOT_ACTIVE",
            )
        if target.status != Active:
            return Failure(
                message="Target is not active",
                code="TARGET_NOT_ACTIVE",
            )
        # Business-Logik hier
        return Success(None)
```

#### Regeln

1. Domain Services haben KEINE Repository- oder DB-Referenzen.
2. Domain Services geben `Result[T, BaseFailure]` zurück — niemals `void` oder `None` allein.
3. Domain Services nehmen ValueObjects oder primitive Typen als Parameter — niemals Domain-Modelle direkt.
4. Kein Zustand (keine Instanzvariablen) — der Service ist zustandslos.
5. Kein Framework-Import (Django, Pydantic-Validierung, etc.) im Domain Service.
6. Mehrere Aggregates können den Service nutzen — aber der Service operiert nur über deren Public-Interfaces.

#### Anti-Pattern

```python
# ANTI-PATTERN: Domain Service mit Repository-Referenz
class BadService:
    def __init__(self, repo: IAggregateRepository):  # Kein Repository im Domain Service!
        self._repo = repo

    def transfer(self, source_id: str, target_id: str, amount: int):
        source = self._repo.find_by_id(source_id)  # Infrastruktur in der Domain!
        # ...
```

```python
# ANTI-PATTERN: Domain Service mit Framework-Import
from django.db import transaction  # Kein Framework in der Domain!

class BadService:
    @transaction.atomic
    def transfer(self, ...):  # Framework-Logik in der Domain!
        # ...
```

#### Entscheidungsregel

1. Business-Logik, die in einem Aggregate lebt → Aggregate-Methode.
2. Business-Logik, die mehrere Aggregates betrifft → Domain Service.
3. Business-Logik, die Infrastruktur braucht → Application Handler.
4. Domain Services sind reine Fachlogik — kein ORM, kein Framework, keine DB.
5. Domain Services sind zustandslos — jeder Methodenaufruf ist unabhängig.

---
