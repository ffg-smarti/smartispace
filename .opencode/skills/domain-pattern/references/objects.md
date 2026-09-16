# SMARTi Backend Code Templates (Coder) - Domain

Konkrete, implementierungsfertige Code-Templates domain Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/domain/objects.py`.

**Prinzipien/Patterns** (nicht hier dupliziert):
- CQRS/DDD → `shared/architecture.md`
- Result/Error-Contract → `rules/backend.md` §Result-Pattern & Error-Contract

---

## Domain Layer

### Value Objects

Value Objects sind unveränderliche, identitätslose Werte mit Value-based Equality. Im Unterschied zu DTOs dürfen (und sollen) sie ihre eigenen Invarianten selbst validieren — das ist genau ihr Daseinszweck in DDD.

Value Objects müssen:

* von `BaseValueObjectPydantic` erben
* immutable sein (`frozen=True`, bereits in der Basisklasse)
* keine Identität/ID besitzen
* Value-based Equality haben (bereits in der Basisklasse über `__eq__`/`__hash__`)
* keine Domain Events erzeugen
* ihre eigenen, in sich geschlossenen Invarianten selbst validieren (siehe unten)

#### Erlaubte Datentypen

* `str`, `int`, `float`, `bool`, `None`
* `datetime`, `date`, `Decimal`, `UUID`
* `Enum` — nur mit **skalarem** Wert (`ChoicesMixin`), niemals Tupel-Value-Enums
* `tuple[...]`, `frozenset[...]` — bevorzugt für Sammlungen
* andere Value Objects (Komposition, z. B. `Address` enthält `PostalCode`)

Nicht erlaubt: `Path`, Django Models, QuerySets, Services, Repositories, Request-/Response-Objekte, DTOs, Commands, Entities/Aggregates, beliebige Infrastrukturobjekte.

#### Validierung — der Unterschied zu DTOs

Bei Value Objects ist die  Prüfung explizit erwünscht, solange sie ohne externen State (Repository/DB) auskommt — weil das VO selbst die Instanz ist, deren Gültigkeit als Wert geprüft wird.

```python
# Erlaubt und richtig im Value Object:
class EmailAddress(BaseValueObjectPydantic):
    value: str

    @field_validator("value")
    @classmethod
    def must_be_valid_format(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Ungültiges E-Mail-Format")
        return v.lower()


class StoryPoints(BaseValueObjectPydantic):
    value: int

    @field_validator("value")
    @classmethod
    def must_be_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("StoryPoints dürfen nicht negativ sein")
        return v
```

Weiterhin verboten — auch im Value Object — ist alles, was Repository- oder DB-Zugriff braucht:

```python
# Verboten, auch im VO:
@field_validator("value")
def email_must_not_be_already_registered(cls, v):
    if repo.exists(v):  # Repository-Zugriff!
        raise ValueError(...)
```

Diese Art Regel (Eindeutigkeit über den gesamten Datenbestand) ist keine VO-Invariante, sondern eine Aggregat-/Anwendungsregel und gehört in den Application-Handler.

#### `BaseValueObjectPydantic` Basisklasse

Jedes Value Object muss von der Basis-Klasse `BaseValueObjectPydantic` (`shared/domain/objects.py`) erben.

#### Beispiel

```python
# smarti/notification/domain/objects.py
from __future__ import annotations

from pydantic import field_validator

from smarti.shared.domain.object import BaseValueObjectPydantic


class NotificationMessage(BaseValueObjectPydantic):
    """REQ-NOTIFICATION §4.2 Nachrichtentext einer Notification.

    - text:  Inhalt der Nachricht, max. 500 Zeichen, nicht leer.
    """

    text: str

    @field_validator("text")
    @classmethod
    def must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Nachrichtentext darf nicht leer sein")
        if len(v) > 500:
            raise ValueError("Nachrichtentext darf max. 500 Zeichen haben")
        return v
```

#### Konstruktion an Kompositionsgrenzen: `create()` und `combine()`

Der normale Konstruktor (`EmailAddress(value=...)`) wirft bei ungültigen Daten eine `ValidationError` — das ist korrekt und ausreichend, wenn ein VO als Feld eines anderen VOs komponiert wird (Pydantic validiert dort ohnehin rekursiv beim Aufbau des äußeren Objekts).

An der **Außengrenze** — meist im Mapper, wenn mehrere VOs aus einem DTO gebaut werden — reicht das nicht: Bricht die erste VO-Konstruktion mit einer Exception ab, werden die restlichen Felder nie geprüft, und der Aufrufer bekommt nur den ersten von mehreren Fehlern zu sehen. Dafür `create()` (siehe Basisklasse oben) plus ein `combine()`-Helper im Result-Modul:

```python
# smarti/shared/base.py 
def combine(*results: Result[Any, T_Error]) -> Result[tuple[Any, ...], T_Error]:
    """Führt mehrere Results zusammen. Bei Failure: ALLE Fehler gesammelt, nicht nur der erste."""
    errors = tuple(e for r in results if r.is_failure for e in r.errors)
    if errors:
        return Failure(errors)
    return Success(tuple(r.values[0] for r in results))
```

Verwendung im Mapper:

```python
def map_create(self, dto: CreateOrderDTO) -> Result[CreateOrderCommand, CommandMappingError]:
    combined = combine(
        EmailAddress.create(value=dto.email),
        Money.create(value=dto.amount),
        PhoneNumber.create(value=dto.phone),
    )
    if combined.is_failure:
        return Failure(tuple(CommandMappingError(str(e)) for e in combined.errors))

    email, money, phone = combined.values[0]
    return Success(CreateOrderCommand(email=email, amount=money, phone=phone))
```

So bekommt der Aufrufer bei mehreren ungültigen Feldern alle Fehler in einer Antwort, statt nach jeder Korrektur nur den nächsten Einzelfehler.

#### Anti-Pattern

```python
class Money(BaseValueObjectPydantic):
    amount: float          # float für Geld -> Rundungsfehler, sollte Decimal sein
    account: Account       # Django-Model im VO -> Infrastruktur im Domain-Objekt

    @field_validator("amount")
    def amount_must_match_account_currency(cls, v, info):
        if not repo.currency_matches(v, info.data["account"]):  # Repository-Zugriff!
            raise ValueError(...)
        return v

# besser
class Money(BaseValueObjectPydantic):
    amount: Decimal
    currency: CurrencyCode  # eigenes VO/Enum statt Fremdschlüssel-Referenz

    @field_validator("amount")
    @classmethod
    def must_be_non_negative(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Betrag darf nicht negativ sein")
        return v

# Cross-Aggregat-Regeln (z. B. Währungs-Konsistenz mit einem Account) gehören
# in den Application-Handler, nicht in den VO-Validator.
```

### Entscheidungsregel

1. Ein Value Object validiert alle Invarianten, die sich allein aus seinen eigenen Feldwerten ergeben — direkt im `@field_validator`/`@model_validator`.
2. Eine Regel, die Repository- oder DB-Zugriff braucht, gehört nicht ins Value Object, sondern in den Application-Handler — auch wenn sie inhaltlich wie eine "Validierung" aussieht.
3. Ein Value Object referenziert nie Entities, Aggregates, DTOs, Commands oder Infrastrukturobjekte — nur Primitives, Enums (skalar) und andere Value Objects.
4. `copy_with()` bleibt public — anders als `_evolve()` bei Aggregate/Entity, weil VO-Invarianten vollständig am Konstruktor hängen und nicht zusätzlich durch Business-Methoden geschützt werden müssen.
5. Enum-Felder bleiben echte Enum-Instanzen zur Laufzeit (kein `use_enum_values=True`) — Serialisierung nach außen läuft über `to_dict()`/`to_json()` (`mode="json"`), nicht über eine globale Typ-Umwandlung.
6. VO-in-VO-Komposition nutzt den normalen Konstruktor (Pydantic validiert rekursiv). An Kompositionsgrenzen — insbesondere im Mapper, wenn mehrere VOs aus einem DTO gebaut werden — wird `VO.create(...)` statt des Konstruktors verwendet, damit Fehler über `Result` statt über eine Exception zurückkommen.
7. Werden mehrere VOs im selben Mapping-Schritt gebaut, werden ihre `create()`-Ergebnisse über `combine()` zusammengeführt, damit alle Feldfehler gesammelt zurückgegeben werden — nicht nur der erste.

### Enums

Enums sind die einfachste Form von Value Objects — ein geschlossener, benannter Wertevorrat ohne eigene Felder. Sie sind von Natur aus immutable und identitätslos, brauchen aber keine eigene Pydantic-Basisklasse, weil sie direkt von Pythons enum.Enum erben.

Enums müssen:

- von `str`, `enum.Enum` und `ChoicesMixin` erben
- einen skalaren Wert haben (`str`) — nie ein Tupel aus Code und Label
- nur Werte transportieren, die über die gesamte Laufzeit des Systems stabil bleiben (DB-Spalte, API-Payload, Vergleichslogik)
- Member-Namen in `UPPER_SNAKE_CASE`, Werte in kurzem `lower_snake_case`

#### Warum nur skalare Werte?

Ein Enum-Wert wird überall im System als dieselbe, stabile Identität behandelt — in DB-Spalten, im JSON einer API-Response, in Vergleichen (`if status == Status.ACTIVE`). Ein Tupel-Wert (`DB_VALUE, LABEL`) vermischt zwei unabhängige Belange in einem Attribut: den fachlichen Wert (ändert sich praktisch nie) und den menschenlesbaren Anzeigetext (ändert sich mit Wording/Übersetzung). Sobald sich das Label ändert, ändert sich technisch der komplette Enum-Wert — inklusive aller Stellen, die member.value direkt vergleichen oder speichern. Das Label wird deshalb immer aus dem Member-Namen generiert, nie im Wert selbst hinterlegt.



```python
# smarti/{{context}}/domain/enums.py
from smarti.shared.enums import ChoicesMixin
import enum

class {{Entity}}Status(ChoicesMixin, str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
```

#### Anti-Pattern

```python
class {{Entity}}Status(ChoicesMixin, enum.Enum):
    DRAFT = ("draft", "Entwurf")     # Tupel-Wert -> Label im Wert versteckt
    ACTIVE = ("active", "Aktiv")

# member.value ist jetzt ein Tupel, nicht "draft"/"active". Jeder direkte
# Vergleich, jede Serialisierung und jede DB-Spalte transportiert plötzlich
# ein Tupel statt eines Strings - from_string() und choices() (oben)
# funktionieren dann nicht mehr, weil sie member.value als str behandeln.

# besser: Wert bleibt skalar, individuelles Label über _format_label:
class {{Entity}}Status(ChoicesMixin, str, enum.Enum):
    DRAFT = "draft"

    @classmethod
    def _format_label(cls, enum_name: str) -> str:
        overrides = {"DRAFT": "Entwurf", "ACTIVE": "Aktiv"}
        return overrides.get(enum_name, super()._format_label(enum_name))
```

#### Entscheidungsregel

1. Ein Enum-Wert ist immer skalar (str) — nie ein Tupel aus Code und Label.
2. Anzeige-Labels werden aus dem Member-Namen generiert (_format_label), nicht im Wert gespeichert. Braucht ein Enum abweichende Labels, wird _format_label in der Subklasse überschrieben.
3. Enum-Member-Namen sind UPPER_SNAKE_CASE, Werte sind kurze, stabile lower_snake_case-Strings, die sich nach der ersten Verwendung nicht mehr ändern.
4. Jedes Enum, das Django-choices() braucht, erbt ChoicesMixin zusätzlich zu str, enum.Enum.