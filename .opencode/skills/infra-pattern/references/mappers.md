# SMARTi Backend Code Templates (Coder) - Infrastructure

Konkrete, implementierungsfertige Code-Templates infrastructure Schicht. **Für Coder**. Platzhalter in `{{doppelten Krammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/infra/{{aggregate_root_snake}}_mapper.py`.

---

## Infrastructure Layer

### Infrastructure Mapper (ORM ↔ Domain)

Infra-Mapper übersetzen Domain-Aggregates in ORM-Modelle und umgekehrt. Sie sind der einzige Ort, an dem Domain-Objekte in persistenz-fähige ORM-Instanzen und zurück konvertiert werden.

Infra-Mapper erben von `BaseInfraMapper` (in `# smarti/shared/infra/adapter/mapper.py`):
- `domain_to_infra(domain_obj: T_Domain) -> T_Infra` — Aggregate → ORM-Modell
- `infra_to_domain(infra_obj: T_Infra) -> T_Domain` — ORM-Modell → Aggregate

Infra-Mapper müssen:

* zustandslos sein (keine Repository-, Service- oder DB-Referenzen als Instanzvariablen)
* von `BaseInfraMapper` erben
* Value-Objects immer über `.value` auflösen — niemals Domain-Objekte als ORM-Felder speichern
* bei ungültigen ORM-Daten `MappingError` **raisen** — kein leises Fallback, kein Abschneiden
* `MappingError` **nach außen propagieren** — weder abfangen noch in `Failure` wrappen
* pro Aggregate/Kontext genau eine Mapper-Klasse sein

#### `BaseInfraMapper` Basisklasse

Jeder Infra-Mapper muss von `BaseInfraMapper` erben, definiert in: `# smarti/shared/infra/adapter/mapper.py`.

```python
# smarti/shared/infra/adapter/mapper.py
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T_Domain = TypeVar("T_Domain")
T_Infra = TypeVar("T_Infra")

class BaseInfraMapper(ABC, Generic[T_Domain, T_Infra]):
    """Basis-Interface für alle bidirektionalen Mapper"""

    @abstractmethod
    def domain_to_infra(self, domain_obj: T_Domain) -> T_Infra:
        """Domain-Objekt → Infrastructure-Objekt konvertieren"""
        pass

    @abstractmethod
    def infra_to_domain(self, infra_obj: T_Infra) -> T_Domain:
        """Infrastructure-Objekt → Domain-Objekt konvertieren"""
        pass
```

#### `MappingError`

Mapping-Fehler werden über `MappingError` gemeldet — definiert in `# smarti/shared/exceptions.py`.

`MappingError` erbt von `DomainException` (nicht von `BaseFailure`). Es wird als **technische Exception** geworfen und **unmodified propagiert** — weder im Mapper abgefangen noch in `Failure`/`Result` gewrapped.

Felder:
* `mapper`: Name des Mappers (z.B. `"{{AggregateRoot}}Mapper"`)
* `field`: Betroffenes Feld (optional)
* `item_id`: ID des betroffenen Objekts (optional)
* `raw_value`: Der rohe ORM-Wert, der nicht konvertierbar war (optional)

```python
from smarti.shared.exceptions import MappingError

raise MappingError(
    "Unbekannter status in DB",
    mapper="{{AggregateRoot}}Mapper",
    field="status",
    item_id=str(infra_obj.id),
    raw_value=infra_obj.status,
)
```

**Regel:** Mapper fangen keine Exceptions und wrappen sie nicht in `Result`. `MappingError` propagiert unmodified durch den Repository-Aufruf zur Infrastruktur.

#### Konkreter Infra Mapper

```python
# smarti/{{context}}/infra/{{aggregate_root_snake}}_mapper.py
from __future__ import annotations

from smarti.shared.infra.adapter.mapper import BaseInfraMapper
from smarti.shared.exceptions import MappingError
from dweb.dj_{{context}}.models import {{AggregateRoot}}ORM
from ..domain.model.{{aggregate}} import {{AggregateRoot}}
from ..domain.objects import {{AggregateRoot}}Id
from ..domain.value_objects import {{ValueObject}}
from ..domain.enums import {{Entity}}Status

from smarti.shared.objects import AccountId


class {{AggregateRoot}}Mapper(BaseInfraMapper):
    """Mapper zwischen {{AggregateRoot}}-Domain und {{AggregateRoot}}ORM-Modell."""

    # =========================================================================
    # DOMAIN → INFRA (ORM)
    # =========================================================================

    def domain_to_infra(self, domain_obj: {{AggregateRoot}}) -> {{AggregateRoot}}ORM:
        """Domain-Objekt → ORM-Modell konvertieren."""
        return {{AggregateRoot}}ORM(
            id=domain_obj.id,
            account_id=domain_obj.account_id.value,
            {{field}}=domain_obj.{{field}}.value,
            status=domain_obj.status.value,
        )

    # =========================================================================
    # INFRA → DOMAIN (ORM → AGGREGATE)
    # =========================================================================

    def infra_to_domain(self, infra_obj: {{AggregateRoot}}ORM) -> {{AggregateRoot}}:
        """ORM-Modell → Domain-Aggregat konvertieren."""
        if infra_obj.status not in {{Entity}}Status.values():
            raise MappingError(
                "Unbekannter status in DB",
                mapper="{{AggregateRoot}}Mapper",
                field="status",
                item_id=str(infra_obj.id),
                raw_value=infra_obj.status,
            )
        return {{AggregateRoot}}(
            id={{AggregateRoot}}Id(str(infra_obj.id)),
            account_id=AccountId(str(infra_obj.account_id)),
            {{field}}={{ValueObject}}(infra_obj.{{field}}),
            status={{Entity}}Status(infra_obj.status),
        )
```

#### Anti-Pattern

```python
class {{AggregateRoot}}Mapper(BaseInfraMapper):
    def domain_to_infra(self, domain_obj: {{AggregateRoot}}) -> {{AggregateRoot}}ORM:
        # Domain-Objekt direkt als ORM-Feld speichern -> ORM kennt Domain-Internals
        return {{AggregateRoot}}ORM(
            id=domain_obj.id,
            account_id=domain_obj.account_id,       # Domain-Objekt statt .value
            {{field}}=domain_obj.{{field}},          # VO statt primitive
            status=domain_obj.status,                # Enum-Objekt statt str
        )

    def infra_to_domain(self, infra_obj: {{AggregateRoot}}ORM) -> {{AggregateRoot}}:
        # Ungültiger Status ohne Prüfung → Domain-Invarianz verletzt
        return {{AggregateRoot}}(
            id={{AggregateRoot}}Id(str(infra_obj.id)),
            account_id=AccountId(str(infra_obj.account_id)),
            {{field}}={{ValueObject}}(infra_obj.{{field}}),
            status={{Entity}}Status(infra_obj.status),  # ValueError bei ungültigem Wert
        )

    def domain_to_infra(self, domain_obj: {{AggregateRoot}}) -> {{AggregateRoot}}ORM:
        # MappingError abfangen statt propagieren
        try:
            return ...
        except MappingError as e:
            return Failure(e)   # MappingError gehört NICHT in Result!

# besser: Siehe Konkretes Infra Mapper oben — .value auflösen, MappingError raisen.
```

#### Entscheidungsregel

1. `domain_to_infra`: Value-Objects immer über `.value` auflösen (`domain_obj.account_id.value`), niemals Domain-Objekte als ORM-Felder speichern.
2. `infra_to_domain`: Ungültige DB-Werte (z. B. unbekannter Enum-Status) → `raise MappingError`, kein leises Fallback oder automatisches Ignorieren.
3. `MappingError` propagiert unmodified — weder abfangen noch in `Failure`/`Result` wrappen. Mapper fangen keine Exceptions.
4. Infra-Mapper ist zustandslos — keine Repository-, Service- oder DB-Referenzen als Instanzvariablen.
5. Infra-Mapper ist Repository-intern — er wird nur innerhalb einer Repository-Operation aufgerufen, niemals aus Application/Handler-Ebene.
6. `id`-Feld im ORM-Modell ist die Domain-ID (nicht die ORM-interne PK-Spalte — Domain verwaltet seine eigene Identity).
7. `account_id` im ORM-Modell wird als `str`/`UUID` gespeichert (kein ForeignKey auf Account-Tabelle — ID-Referenz, nicht Join).

#### Hinweise für Repository-Nutzung

Der Infra-Mapper wird vom Repository aufgerufen:
* `repo.save(aggregate)` → `mapper.domain_to_infra(aggregate)` → ORM-Instanz → `session.add()`
* `repo.get_by_id(id)` → `orm_obj = session.get()` → `mapper.infra_to_domain(orm_obj)` → Aggregate

Der Mapper selbst kennt weder Repository noch Session — er transformiert nur das Objekt.

#### MappingError vs Result.Failure in anderen Schichten

| Schicht | Typ-Inkompatibilität | Business-Regel verletzt (VO kann nicht gebaut werden) |
|---------|---------------------|------------------------------------------------------|
| Infra-Mapper | `raise MappingError(...)` | — (kein Business-Kontext im Mapper) |
| Application Mapper | `raise CommandMappingError(...)` | `return Failure(BaseFailure(...))` |
| Handler | — (weiterleiten) | `return Failure(BaseFailure(...))` |

**MappingError** (inkl. `CommandMappingError`) ist ein technischer Fehler: Ein Feld hat den falschen Typ oder einen Wert, den das Ziel-Objekt nicht akzeptiert. Er wird **als Exception geraißt** und propagiert unmodified.

**`Failure(BaseFailure(...))`** ist ein fachlicher Fehler: Ein ValueObject kann nicht gebaut werden, weil eine Geschäftsregel verletzt ist (z. B. ungültiger Status, fehlende Invariante). Er wird **als Result-Failure zurückgegeben**.
