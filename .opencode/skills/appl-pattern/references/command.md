# SMARTi Backend Code Templates (Coder) - Application

Konkrete, implementierungsfertige Code-Templates application Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/appl/commands.py`.

---

## Application Layer

### Commands & Queries (CQRS Base Classes)

Commands (Write-Side) und Queries (Read-Side) leben im selben Modul:
`smarti.shared.appl.command`. Beide sind **immutable Pydantic-Models** mit
`frozen=True`, `extra="forbid"` und `validate_default=True`.

`frozen=True` generiert in Pydantic v2 automatisch `__hash__`/`__eq__` über alle Feldwerte — die gewünschte Value-Object-Semantik kommt ohne Zusatzcode.

- `CommandBasePydantic` = Write-Seite. Enthält `account_id` (Berechtigung) + domänenspezifische Value Objects.
- `QueryBasePydantic` = Read-Seite (CQRS). Kein `AccountId`-Feld nötig — Queries enthalten nur Suchparameter.
- Beide: `frozen=True`, `extra="forbid"`.

#### Query vs. Command — die zentrale Unterscheidung

Eine Query beschreibt eine Lese-Absicht, keine Zustandsänderung. Daraus folgt eine wichtige Eigenschaft, die Command nicht hat: zwei Queries mit identischen Filterwerten sollen gleich sein (Value-based Equality) — damit sie sich als Cache-Key oder zur Deduplizierung eignen.

Deshalb trägt `QueryBasePydantic` kein automatisches `created_at`-Feld. Bei einer Query würde er das bewirken — zwei inhaltlich identische Queries wären nie mehr gleich, weil sich der Zeitstempel unterscheidet, und jede Cache-Nutzung wäre kaputt, bevor sie überhaupt gebaut ist.

---

### Commands

Commands sind Intent-Objekte für Command-Handler. Sie transportieren eine **validierte Absicht**, keine rohen Eingabedaten.

Commands müssen:

* immutable sein (`frozen=True`, bereits in `BaseCommandPydantic`)
* von `BaseCommandPydantic` erben
* wo eine Invariante existiert, ein **ValueObject statt eines primitiven Typs** verwenden (`AccountId` statt `UUID`, `EmailAddress` statt `str`, ...)
* den Handler von Feldvalidierung entlasten — die Invarianten sind bereits durch die ValueObjects geprüft, wenn das Command beim Handler ankommt
* keine Business Rules selbst durchführen, die Repository- oder DB-Zugriff benötigen
* keine Infrastruktur- oder Runtime-Objekte enthalten
* **kein DTO referenzieren** — Commands werden ausschließlich über einen expliziten Mapper aus einem DTO gebaut, nie direkt weitergereicht

#### Erlaubte Datentypen

* `str`, `int`, `float`, `bool`, `None` — nur wenn kein passendes ValueObject existiert
* **ValueObjects** (Pydantic-`BaseModel`, `frozen=True`, mit eigenen Invarianten) — bevorzugt gegenüber primitiven Typen
* `Enum`
* `datetime`, `date`, `Decimal`, `UUID` — nur als Rohwert innerhalb eines ValueObjects oder wenn (noch) kein VO existiert
* `tuple[...]`, `frozenset[...]` — bevorzugt für Sammlungen (Immutability)
* `list[...]`, `dict[str, ...]` — nur wenn Teil des tatsächlichen Vertrags und Mutierbarkeit explizit notwendig ist (bei Commands selten)

Commands dürfen keine beliebigen Runtime- oder Infrastrukturtypen enthalten, z. B.:

* `Path`
* Django Models
* QuerySets
* Services
* Repositories
* Request-/Response-Objekte
* DTOs
* beliebige Infrastrukturobjekte

**Hinweis zur Basisklasse:** `arbitrary_types_allowed=True` und `from_attributes=True` sind auf Ebene der `BaseCommandPydantic` bewusst kritisch zu hinterfragen — sie erlauben genau die oben verbotenen Fälle (unvalidierte Objekte, direkte ORM-Kopplung via `model_validate(django_instance)`). Wenn ein einzelnes Command das wirklich braucht, lokal aktivieren, nicht global.

#### Validierung

Pydantic darf strukturelle Validierung durchführen, die **ohne externen State (DB/Repository)** auskommt:

* Typprüfung
* Pflichtfelder / optionale Felder
* Cross-Field-Konsistenz (z. B. "wenn `end_date` gesetzt ist, muss `start_date` <= `end_date` sein")

Das gehört in `additional_validations()` (der `model_validator(mode="after")`-Hook der Basisklasse).

Commands dürfen **keine Business Rules** validieren, die einen Repository- oder DB-Zugriff benötigen:

```python
# Verboten in Commands:
@model_validator(mode="after")
def account_must_exist(self):
    if not self._repo.exists(self.account_id):   # Repository-Zugriff!
        raise ValueError(...)
    return self
```

Solche Regeln gehören in den Handler und werden über das Result Pattern behandelt.

#### `BaseCommandPydantic` Basisklasse für Commands

Jedes Application-Command muss von `BaseCommandPydantic` erben, definiert in `# smarti/shared/appl/command.py`.

```python
# smarti/{{context}}/domain/objects.py
from smarti.shared.domain.object import BaseValueObjectPydantic

class Email(BaseValueObjectPydantic):
    value: str
```

```python
# smarti/{{context}}/appl/commands.py
from smarti.shared.appl.command import BaseCommandPydantic
from ..domain.objects import Email
from smarti.shared.objects import AccountId

class Create{{AggregateRoot}}Command(BaseCommandPydantic):
    mail: Email
    {{field}}: str  # primitiv nur, solange kein VO für dieses Feld existiert
```

#### Beispiele

```python
# smarti/notification/appl/commands/commands.py
from __future__ import annotations

from datetime import datetime
from typing import Any
from pydantic import Field
from smarti.shared.appl.command import BaseCommandPydantic, QueryBasePydantic
from smarti.shared.objects import AccountId, NotificationId
from ..domain.enums import NotificationChannel, NotificationType

class CreateNotificationCommand(BaseCommandPydantic):
    """REQ-NOTIFICATION §4.1 Command: Benachrichtigung anlegen und versenden.

    Wird vom ACL (FFGReportNotificationACL) oder zukünftigen HTTP-Endpoints
    ausgelöst. Der Handler erstellt eine PENDING-Notification und reiht
    den Celery-Task zur asynchronen Zustellung ein.

    - account_id:         Empfänger-Account (opaque ID, Domain-übergreifend).
    - notification_type:  Typ der Benachrichtigung (§3.4).
    - channel:            Zustellkanal (§1.3).
    - template_key:       Template-Key (z.B. "ffg_report_de").
    - context:            Template-Variablen (flaches Dict, primitive Typen).
    - recipient_address:  E-Mail-Adresse, Push-Token, etc. — kannalispezifisch.
    - scheduled_at:       None = sofortiger Versand.
    - max_retries:        Maximale Anzahl Versuche (§7, default 3).

    Siehe auch:
    - REQ-NOTIFICATION-R05: context nur primitive Typen.
    - EC-FFG-REPORT-04: E-Mail-Versand fehlgeschlagen → Notification(FAILED).
    """

    account_id: AccountId
    notification_type: NotificationType
    channel: NotificationChannel
    template_key: str
    context: dict[str, Any] = Field(default_factory=dict)
    recipient_address: str | None = None
    scheduled_at: datetime | None = None
    max_retries: int = Field(default=3, ge=1, le=5)


class GetNotificationQuery(QueryBasePydantic):
    """REQ-NOTIFICATION Query: Einzelne Notification abrufen.

    Wird für Status-Abfragen und Admin-Panel verwendet.
    """

    notification_id: NotificationId
    account_id: AccountId
```

#### Anti-Pattern

```python
class CreateNotificationCommand(BaseCommandPydantic):
    account_id: UUID          # kein VO -> Invariante fehlt, Handler muss selbst prüfen
    dto: CreateNotificationDTO  # DTO im Command -> Layer-Bruch
    account: Account            # Django-Model -> Infrastruktur im Command

# besser
class CreateNotificationCommand(BaseCommandPydantic):
    account_id: AccountId
    channel: NotificationChannel
    message: str

# Mapping passiert im dedizierten Mapper, nicht im Handler und nicht im Command selbst
```

#### Entscheidungsregel

1. Wenn ein Feld eine Invariante hat, muss es als ValueObject modelliert werden — nicht als primitiver Typ.
2. Wenn ein Feld ein Runtime- oder Infrastrukturobjekt transportiert, gehört es nicht ins Command.
3. Wenn eine Validierung ohne externen State (DB/Repository) auskommt und mehrere Felder betrifft, gehört sie in `additional_validations()`.
4. Wenn eine Validierung Repository- oder DB-Zugriff braucht, gehört sie nicht ins Command, sondern in den Handler (Result Pattern).
5. Commands referenzieren nie DTOs direkt — die Übersetzung passiert ausschließlich im DTO-Command-Mapper.

```python
# smarti/{{context}}/appl/commands/{{context}}_commands.py
from smarti.shared.appl.command import BaseCommandPydantic
from ..domain.objects import {{ValueObject}}
from smarti.shared.objects import AccountId

class Create{{AggregateRoot}}Command(BaseCommandPydantic):
    account_id: AccountId
    {{field}}: {{ValueObject}}   # ← Value Object, niemals str

class {{Action}}{{AggregateRoot}}Command(BaseCommandPydantic):
    {{aggregate_root}}_id: {{AggregateRoot}}Id
    # weitere Value Objects
```

---

### Queries

Queries sind Read-Objekte für Query-Handler. Eine Query beschreibt "was gelesen werden soll", keine Absicht, etwas zu verändern. Das führt zu einem zentralen Unterschied gegenüber `CommandBasePydantic`: Eine Query sollte wertgleich und damit cachebar sein. Zwei Queries mit identischen Filterwerten sind dieselbe Leseanfrage — sie sollten gleich sein (==) und denselben Hash liefern, damit sie z. B. als Cache-Key oder für Deduplizierung/Memoization taugen.

Queries müssen:

* immutable sein (`frozen=True`, bereits in `QueryBasePydantic`)
* von `QueryBasePydantic` erben
* keine Business Rules selbst durchführen, die Repository- oder DB-Zugriff benötigen
* keine Autorisierungslogik selbst enthalten (z. B. "nur Admins dürfen alle Accounts abfragen" — gehört in den Handler, nicht in die Query)
* keine Infrastruktur- oder Runtime-Objekte enthalten
* wiederkehrende Querying-Konzepte (Pagination, Sortierung) über eigene, wiederverwendbare ValueObjects komponieren — nicht in jeder Query neu als rohe `page: int`/`page_size: int` duplizieren
* kein DTO referenzieren — Queries werden wie Commands über einen expliziten Mapper aus einem DTO gebaut
* wo eine Invariante existiert, ein ValueObject statt eines primitiven Typs verwenden (wie bei Command)

#### Erlaubte Datentypen

- `str`, `int`, `float`, `bool`, `None` — nur wenn kein passendes ValueObject existiert
- `ValueObjects` (Pydantic-BaseModel, `frozen=True`) — bevorzugt gegenüber primitiven Typen
- `Enum`
- `datetime`, `date`, `Decimal`, `UUID` — nur als Rohwert innerhalb eines ValueObjects oder wenn kein VO existiert
- `tuple[...]`, `frozenset[...]` — bevorzugt für Sammlungen (z. B. mehrere Status-Filter)

Nicht erlaubt: `Path`, Django Models, QuerySets, Services, Repositories, Request-/Response-Objekte, DTOs, Commands, beliebige Infrastrukturobjekte.

#### Beispiel: Wiederverwendbare Querying-ValueObjects

```python
from smarti.shared.domain.object import BaseValueObjectPydantic
from pydantic import model_validator


class Pagination(BaseValueObjectPydantic):
    page: int = 1
    page_size: int = 20

    @model_validator(mode="after")
    def check_bounds(self) -> Self:
        if self.page < 1:
            raise ValueError("page muss >= 1 sein")
        if not (1 <= self.page_size <= 100):
            raise ValueError("page_size muss zwischen 1 und 100 liegen")
        return self


class SortOrder(BaseValueObjectPydantic):
    field: str
    descending: bool = False
```

Jede Query, die Listen liefert, komponiert Pagination/SortOrder statt eigener roher Felder.

#### Validierung

Wie bei Command: strukturelle und cross-field Validierung, die ohne externen State (DB/Repository) auskommt, gehört in `@model_validator(mode="after")` der Query-Klasse (z. B. "`date_from` muss vor `date_to` liegen"). Validierungen mit Repository-/DB-Zugriff gehören in den Query-Handler.

#### `QueryBasePydantic` Basisklasse

Bewusst kein `created_at` (siehe oben), kein `arbitrary_types_allowed` (nur lokal ergänzen, falls ein Feld einen generischen ID-Typ trägt), kein `from_attributes` (Queries werden über den Mapper aus DTOs gebaut, nie direkt aus ORM-Objekten).

```python
# smarti/{{context}}/appl/commands/{{context}}_commands.py
from smarti.shared.appl.command import QueryBasePydantic
from smarti.shared.objects import {{AggregateRoot}}Id

class Get{{AggregateRoot}}ByIdQuery(QueryBasePydantic):
    """Einzelnes {{AggregateRoot}} nach ID abfragen."""
    {{aggregate_root}}_id: {{AggregateRoot}}Id

class List{{AggregateRoot}}sQuery(QueryBasePydantic):
    """Liste aller {{AggregateRoot}}s eines Accounts."""
    account_id: AccountId
    limit: int = 20
    offset: int = 0
```

```python
# smarti/notification/appl/queries.py
from __future__ import annotations

from smarti.shared.appl.command import QueryBasePydantic
from smarti.shared.appl.objects import Pagination, SortOrder
from smarti.shared.objects import AccountId
from ..domain.enums import NotificationStatus

class ListNotificationsQuery(QueryBasePydantic):
    """REQ-NOTIFICATION §5.1 Liste der Notifications eines Accounts.

    - account_id:  Empfänger-Account, dessen Notifications gelistet werden.
    - status:      Optionaler Status-Filter.
    - pagination:  Seitengröße/Seitennummer.
    - sort:        Sortierkriterium.
    """

    account_id: AccountId
    status: NotificationStatus | None = None
    pagination: Pagination = Pagination()
    sort: SortOrder = SortOrder(field="created_at", descending=True)


class GetNotificationQuery(QueryBasePydantic):
    """REQ-NOTIFICATION §5.2 Einzelne Notification per ID."""

    notification_id: NotificationId
    account_id: AccountId
```

#### Mapper (DTO → Query)

Gleiches Pattern wie bei Commands: Queries werden nie direkt aus DTOs instanziiert, sondern über einen Mapper (`QueryMapperBase`, analog zu `CommandMapperBase`), der DTO-Rohwerte in ValueObjects (Pagination, SortOrder, IDs) übersetzt und `VO.create(...)` + `combine(...)` nutzt, wenn mehrere VOs gebaut werden.

#### Anti-Pattern

```python
class ListNotificationsQuery(QueryBasePydantic):
    account_id: str                       # kein VO -> Invariante fehlt
    page: int = 1                         # rohe Pagination statt VO -> Duplikation in jeder Liste-Query
    page_size: int = 20
    created_at: datetime = Field(default_factory=datetime.now)  # zerstört Value-Equality/Cache-Key

    def requesting_user_is_admin(self) -> bool:   # Autorisierung gehört in den Handler, nicht in die Query
        ...

# besser: siehe Beispiel oben - AccountId als VO, Pagination als VO,
# kein Zeitstempel-Feld, keine Autorisierungslogik in der Query selbst.
```

#### Entscheidungsregel

1. Ein Feld mit Invariante wird als ValueObject modelliert, nicht als primitiver Typ — wie bei Command.
2. Eine Query trägt kein `created_at`- oder sonstiges instanzabhängiges Zeitstempel-Feld — das würde Value-Equality und Cache-Key-Eignung zerstören.
3. Wiederkehrende Querying-Konzepte (Pagination, Sortierung) werden als eigene, wiederverwendbare ValueObjects komponiert, nicht pro Query neu dupliziert.
4. Validierungen mit Repository-/DB-Zugriff oder Autorisierungslogik gehören nicht in die Query, sondern in den Query-Handler.
5. Queries referenzieren nie DTOs direkt — die Übersetzung passiert ausschließlich im DTO-Query-Mapper, analog zum Command-Mapper.
6. `frozen=True` ist nicht optional — es liefert neben Immutability auch die automatisch generierte `__hash__`/`__eq__`, auf der Caching/Deduplizierung aufbaut.
