# SMARTi Backend Code Templates (Coder) - Model

Konkrete, implementierungsfertige Code-Templates domain Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/domain/model`.

**Prinzipien/Patterns** (nicht hier dupliziert):
- CQRS/DDD → `shared/architecture.md`
- Result/Error-Contract → `rules/backend.md` §Result-Pattern & Error-Contract

---

## Domain Layer

Gültig für Aggregate und Entities

### Erlaubte Datentypen

* `str`, `int`, `float`, `bool`, `None` — nur wenn kein passendes ValueObject existiert
* **ValueObjects** (Pydantic-`BaseModel`, `frozen=True`, mit eigenen Invarianten) — bevorzugt gegenüber primitiven Typen
* `Enum`
* `datetime`, `date`, `Decimal`, `UUID` — nur als Rohwert innerhalb eines ValueObjects oder wenn (noch) kein VO existiert
* `tuple[...]`, `frozenset[...]` — bevorzugt für Sammlungen (Immutability)
* `list[...]`, `dict[str, ...]` — nur wenn Teil des tatsächlichen Vertrags und Mutierbarkeit explizit notwendig ist (bei Commands selten)

Aggregate und Entities dürfen keine Abhängigkeit von anderen Schichten enthalten, z. B.:

* Django Models
* QuerySets
* Services
* Repositories
* Request-/Response-Objekte
* DTOs
* beliebige Infrastrukturobjekte

**Hinweis zur Basisklasse:** `arbitrary_types_allowed=True` und `from_attributes=True` sind auf Ebene der `BaseDomainModelPydantic` bewusst kritisch zu hinterfragen — sie erlauben genau die oben verbotenen Fälle (unvalidierte Objekte, direkte ORM-Kopplung via `model_validate(django_instance)`). 

#### Validierung

Pydantic darf strukturelle Validierung durchführen, die **ohne externen State (DB/Repository)** auskommt:

* Typprüfung
* Pflichtfelder / optionale Felder
* Cross-Field-Konsistenz (z. B. "wenn `end_date` gesetzt ist, muss `start_date` <= `end_date` sein")

Das gehört in `additional_validations()` (der `model_validator(mode="after")`-Hook der Basisklasse).


#### `BaseDomainModelPydantic` Basisklasse für Commands

Jedes Aggregat oder Entity muss von `BaseDomainModelPydantic` erben, definiert in `# smarti/shared/domain/model.py`.

**Wichtige Methoden und Properties:**

- **`identifier: IdType`** (`Field(alias="uid")`) — Der eindeutige Identifikator. Konstruktor-Aufruf nutzt `identifier=` oder `uid=`. Properties `id` und `uid` geben `identifier` zurück.
- **`_evolve(**changes) -> Self`** — Einziger Weg zu einer neuen Version der Entity. Läuft über den normalen Konstruktor → alle Validatoren und Invarianten werden automatisch erneut geprüft. Beispiel: `self._evolve(status=OrderStatus.CANCELLED)`.
- **`_guard(condition, error) -> Result[None, DomainException]`** — Gibt `Success(None)` zurück wenn `condition` wahr, sonst `Failure(error)`. Für Invarianten-Prüfungen in Business-Methoden.
- **`_require_owner(actor, owner) -> Result[None, DomainException]`** — Prüft ob `actor == owner`. Gibt `Failure(NotOwnerError)` sonst zurück.
- **`__init__`** — Erhöht `EntityValidationError` bei Pydantic-Validierungsfehlern. Alle Instanziierungen gehen über den Konstruktor.

**ID-Typen:** `{{AggregateRoot}}Id`, `{{Entity}}Id` etc. sind Subclass von `EntityId` (definiert in `smarti.shared.objects`). Beispiele: `LearnplanId(EntityId)`, `AccountId(EntityId)`. IDs werden mit `.generate()` erstellt (erbt von `EntityId` → `uuid.uuid4()`).


### Aggregate Root

Aggregate sind zustandsbehaftete Objekte mit einer eindeutigen Identität und einer Sammlung von Entitäten und Value Objects. Der Aggregate Root ist der einzige Einstiegspunkt für externe Zugriffe.

Aggregate müssen:

* immutable sein (`frozen=True`, bereits in `BaseDomainModelPydantic`)
* von `BaseDomainModelPydantic` erben
* wo eine Invariante existiert, ein **ValueObject statt eines primitiven Typs** verwenden (`AccountId` statt `UUID`, `EmailAddress` statt `str`, ...)

* Prüfung der Business Rules durchführen
* keine Infrastruktur- oder Runtime-Objekte enthalten

Jedes Aggregat muss `DomainEventMixin` erben, definiert in `# smarti/shared/domain/event.py`.

#### Beispiele

```python
# smarti/{{context}}/domain/model/{{aggregate}}.py
from smarti.shared.domain.model import BaseDomainModelPydantic
from smarti.shared.domain.event import DomainEventMixin
from .objects import {{ValueObject}}
from .events import {{EventName}}
from smarti.shared.result import Result, Success, Failure

class {{AggregateRoot}}(BaseDomainModelPydantic[{{AggregateRoot}}Id], DomainEventMixin):
    {{AggregateRoot}}_id: {{AggregateRoot}}Id
    {{field}}: {{ValueObject}}    

    @classmethod
    def create(cls, command: Create{{AggregateRoot}}Command) -> {{AggregateRoot}}:
        instance = cls(
            identifier={{AggregateRoot}}Id.generate(),
            account_id=command.account_id,
            {{field}}=command.{{field}},
        )
        instance._raise_event({{AggregateRoot}}Created(
            {{aggregate_root}}_id=str(instance.id),
            account_id=str(instance.account_id),
        ))
        return instance

    def {{action}}(self, ...) -> Result[None]:
        # Business-Regel prüfen
        if <ungültiger Zustand>:
            return Failure(
                message="{{Fehlermeldung}}",
                code="{{ERROR_CODE}}",
            )
        self._raise_event({{AggregateRoot}}{{Action}}ed(...))
        return Success(None)
```

#### Anti-Pattern

* **Domain-Logik im Controller oder Service** — Business Rules müssen im Aggregate selbst leben, niemals in der Application-Schicht.
* **ORM-Modelle als Aggregate** — Aggregates dürfen nicht von Django-Modellen erben oder diese direkt kapseln. Sie sind Pydantic-Modelle.
* **Value Objects mit eigener Identität** — Value Objects haben keine ID und dürfen nicht in einer Datenbank-Tabelle gespeichert werden.
* **Aggregate Root als passiver Datentransporter** — Ein Aggregate ohne Business-Methoden ist ein Anemic Model und verletzt das DDD-Prinzip.
* **Direkte Repository-Referenz im Aggregate** — Aggregates dürfen keine Repository-Instanzen enthalten; Zustandsänderungen erfolgen über Command→Handler→Aggregate.

### Entity

Entities sind Identifikator-tragende Objekte **innerhalb** eines Aggregate Roots. Sie gehören zu einem Aggregat und werden nie direkt gespeichert — nur der Aggregate Root hat eine Repository-Instanz.

**Unterschied zum Aggregate Root:**

| | Aggregate Root | Entity |
|---|---|---|
| Identität | Eigene Root-ID (`AggregateRootId`) | Eigene Entity-ID (`EntityId`) |
| Domain Events | ✅ Muss `DomainEventMixin` erben | ✅ **Keine** Domain Events |
| Persistenz | Direkt via Repository | Über den Aggregate Root |
| Einstiegspunkt | Ja (einziger Zugriff) | Nein (nur über Aggregate) |
| Business Rules | Eigene `create()`-Factory + Methoden | Methoden zur Zustandsänderung |

**Wann eine Entity erstellen?**
- Wenn ein Objekt eine eigene Identität braucht, aber Teil eines Aggregates bleibt
- Wenn ein Aggregate mehrere untypisierte Kind-Objekte verwaltet
- Beispiel: Ein `Learnplan` (Aggregate Root) enthält `Learnstation`-Entities

**Entity-Template:**

```python
# smarti/{{context}}/domain/model/{{entity}}.py
from smarti.shared.domain.model import BaseDomainModelPydantic
from .objects import {{ValueObject}}
from smarti.shared.result import Result, Success, Failure

class {{Entity}}(BaseDomainModelPydantic[{{Entity}}Id]):
    {{field}}: {{ValueObject}}
    {{Entity}}_id: {{Entity}}Id

    @classmethod
    def create(cls, command: Create{{Entity}}Command) -> {{Entity}}:
        instance = cls(
            identifier={{Entity}}Id.generate(),
            account_id=command.account_id,
            {{field}}=command.{{field}},
        )
        return instance

    def {{action}}(self, ...) -> Result[None]:
        # Business-Regel prüfen
        if <ungültiger Zustand>:
            return Failure(
                message="{{Fehlermeldung}}",
                code="{{ERROR_CODE}}",
            )
        return Success(None)
```

**Wichtig:** Entity wird **niemals** direkt in einem Repository gespeichert. Zustandsänderungen erfolgen über den Aggregate Root, der die Entity als Kind verwaltet und persistantiert.

#### Beispiele


#### Anti-Pattern

* **Entity mit `DomainEventMixin`** — Entities dürfen keine Domain Events emittieren. Events werden nur vom Aggregate Root verwaltet.
* **Entity mit Repository-Dependency** — Entities dürfen keine Repository- oder Service-Referenzen enthalten.
* **Entity als eigener Aggregate Root** — Jede Entity muss einem Aggregate Root zugeordnet sein; direkte Speicherung in Repositories ist nicht erlaubt.
* **Mutable Entity ohne `_evolve()`** — Zustandsänderungen müssen über `_evolve()` oder `create()`-Factory-Methoden erfolgen, niemals über direkte Attribut-Zuweisung.

---

### Entscheidungsregel