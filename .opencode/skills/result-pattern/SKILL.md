---

name: result-pattern

description: Korrekte Nutzung des Result-Patterns im Backend. Verwende diesen Skill,wenn Backend-Code Business Failures explizit über Result behandelt, Result/Success/Failure verwendet, Domain Errors definiert oder Result-Ergebnisse an die API-Grenze übersetzt. 

Trigger-Phrasen: Result pattern, Failure, Success, Result propagation, "error handling", "handle_api_result", "BaseFailure", "API error mapping".

---

# Result Pattern — Coding Skill

## Role

Du implementierst Business-Failure-Handling im Backend konsistent über `Result`.

Das zentrale Prinzip ist:

> **Erwartbare fachliche Fehler sind Teil des Kontrollflusses und werden als Result behandelt.
> Invarianten- und technische Fehler sind Exceptions.**

Die **Prinzipien** (Entscheidungsbaum, ErrorCode→HTTP-Mapping, Error-Contract, Schichtenfluss)
sind in der Backend-Rule definiert und gelten als verbindlich:

- `.opencode/rules/backend.md` §Result-Pattern & Error-Contract — Entscheidungsbaum, HTTP-Mapping, Error-Contract, API-Grenze
- `.opencode/shared/context.md` — Kerninvarianten

Dieser Skill ergänzt nur die **Coding-Umsetzung** im konkreten Projekt.

## Before Starting

Bevor du Result-bezogenen Code änderst:

1. Lies `.opencode/rules/backend.md` §Result-Pattern & Error-Contract (Prinzipien).
2. Lies die tatsächliche Result-Implementierung im Projekt
   (Backend `shared/result.py` — Pfad verifizieren).
3. Lies `../architect-backend/references/smarti-backend-patterns.md`, sofern vorhanden.
4. Prüfe bestehende API-Error-Modelle und `@handle_api_result`.

**Die tatsächliche Implementierung hat Vorrang vor Beispielen in diesem Skill.**
Erfinde keine Result-Methoden oder Konstruktoren, die im Projekt nicht existieren.

---

# Coding-Umsetzung

## 1. Result über die Schichten

Der bevorzugte Flow ist:

```text
Domain
  │
  │ Result[T, BaseFailure]
  ▼
Application / Handler
  │
  │ Result weiterreichen
  ▼
API Adapter
  │
  │ BaseFailure → ApiError
  ▼
  Django-Ninja / OpenAPI
  │
  │ ErrorResponse
  ▼
Frontend (@smarti/api)
```

### Domain/Application

Domain- und Application-Code beschreibt **was fachlich passiert ist**.

Domain Errors dürfen deshalb nicht von folgenden Dingen abhängen:

- HTTP-Statuscodes
- Django-Ninja
- Pydantic-API-Schemas
- `@smarti/api`
- React Hook Form
- UI-spezifischen Fehlermeldungen
- HTTP-Status-Kategorien (grobe `ErrorCode`-Fallbacks)

Ein Domain Error ist **dünn**: Er beschreibt die fachliche Ursache, nicht deren
HTTP-/UI-Darstellung. **Kein** `code` + `message` + `field` + `error_type`-Mix im Domain-Layer —
das wäre nur ein umgelabeltes API-Fehlerobjekt und brächte keinen Gewinn.

Zwei sinnvolle Ebenen:

**1. Fachlich unterschiedlicher Fehler → eigener Typ (mit fachlichen Daten):**

```python
@dataclass(frozen=True)
class OrderAlreadyExists:
    order_number: str

@dataclass(frozen=True)
class CustomerNotFound:
    customer_id: UUID
```

**2. Fehler ohne zusätzliche Daten → Singleton-artiger Typ:**

```python
@dataclass(frozen=True)
class OrderIsEmpty:
    pass
```

Nur API-Metadaten (`code`, `message`, `field`, `http_status`) gehören **nicht** in den
Domain Error. Die API macht aus `OrderAlreadyExists(order_number)` z. B.:

```json
{
  "errors": [
    { "code": "ORDER_ALREADY_EXISTS", "message": "...", "field": "order_number" }
  ]
}
```

### Namenskonvention

- **Domain Error** (fachlich, `Result`): **kein** `Error`-Suffix — `OrderAlreadyExists`, `CustomerNotFound`, `OrderIsEmpty`.
- **Exception** (geworfen, technisch/Invariante): **immer** `Error`-Suffix — `DomainInvariantError`, `MappingError`, `RepositoryError`.

Die Konvention ist absichtlich: Am Namen erkennt man sofort, welcher Fehlerkanal gemeint
ist — ohne die Vererbungshierarchie prüfen zu müssen.

### Anti-Pattern

```python
# NICHT als Domain Error verwenden — code + message + errors ist API-Shape, keine Fachlichkeit
class OrderAlreadyExists(DomainException):
    ...
```

Domain Error Dataclasses erben **nie** von `Exception`/`BaseException` (also auch nie von
`DomainException`). Sie erben von `BaseFailure`. Wenn eine Klasse von `DomainException`
erbt, ist sie eine Exception (§8) — kein Kandidat für `Result[T, BaseFailure]`.

---

## 2. API-Fehler sind eine Übersetzung

Die API-Schicht übersetzt Domain/Application Errors in das öffentliche API-Format.

Beispiel:

```text
BaseFailure (dünn)
    │
    └── fachliche Ursache, z. B. OrderAlreadyExists(order_number)
          │
          ▼
API Mapping (nur hier!)
    │
    ├── HTTP status
    ├── message
    ├── field
    └── errors[]
```

Das öffentliche API-Format bleibt:

```json
{
  "errors": [
    {
      "code": "ORDER_EMPTY",
      "message": "Bestellung hat keine Positionen",
      "field": null
    }
  ]
}
```

`field`, lokalisierte `message` und HTTP-Status gehören zur API-Darstellung, nicht zur fachlichen Domain.

### ErrorCode — fein vs. grob (konkrete Umsetzung)

Statt einer Klasse pro fachlichem Fehler (Klassenzahl explodiert) trägt das Projekt
**einen** typsicheren Enum `ErrorCode` (`smarti/shared/exceptions.py`) in einer
generischen `BusinessFailure`:

```python
Failure(BusinessFailure(code=ErrorCode.NOT_OWNER, field=None))
```

Zwei Ebenen, bewusst in einem Enum:

- **Feine fachliche Codes** (primär): `NOT_OWNER`, zukünftig `EMAIL_ALREADY_REGISTERED`,
  `NAME_NOT_UNIQUE`, …
- **Grobe Status-Kategorien** (Fallback): `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`,
  `UNAUTHORIZED`, `CONFLICT`, `PRECONDITION_FAILED`, `INVALID_STATE`, `INTERNAL`.

Regel: feine Codes bevorzugen; grobe Kategorien nur als Übergang/Fallback, da sie
die konkrete Ursache verlieren (z. B. sagt `CONFLICT` nicht, welcher Konflikt vorliegt).

Die Presentation übersetzt `ErrorCode` → (HTTP-Status, Client-Code-String, Meldung)
an **einer** Stelle: `dweb/dsmarti/api_errors.py` → `map_failure()`.

```text
ErrorCode (Domain)  →  map_failure  →  (HTTP-Status, ErrorItem)
```

`ERROR_CODE_TO_STATUS` und `ERROR_CODE_TO_MESSAGE` leben dort; für die groben
Kategorien existieren Default-Meldungen.

**Neuen `ErrorCode` anlegen — erst prüfen, dann ergänzen:**

1. Existiert bereits ein passender **feiner** Code? → wiederverwenden, nichts Neues anlegen.
2. Sonst passt eine **grobe Kategorie** (`NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, …)? → als Fallback verwenden.
3. Erst wenn beides nicht passt: einen **neuen feinen** Code in `ErrorCode`
   (`smarti/shared/exceptions.py`) ergänzen **und** ihn in `dweb/dsmarti/api_errors.py`
   mappen (`ERROR_CODE_TO_STATUS` + `ERROR_CODE_TO_MESSAGE`), sonst fällt er auf den Default.

---

## 3. Result-Struktur

Verwende das vorhandene `Result`-Modell des Projekts.

Das Zielbild ist:

```text
Result[T, E]
├── Success(value: tuple[T, ...])  # mindestens ein Value
└── Failure(errors: tuple[E, ...]) # mindestens ein Error
```

Eine `Failure` ist **immer eine Sammlung von Fehlern**; die Anzahl `1` ist nur ein Spezialfall.
Ein `Success` kann mehrere Values enthalten, z. B. wenn ein Use-Case mehrere Ergebnisse liefert.

### Invariante

`errors=()` ist ungültig. Eine `Failure` enthält **immer mindestens einen** fachlichen Fehler:

```python
if not errors:
    raise ValueError("Failure must contain at least one error")
```

Das ist eine technische Invariante des Result-Typs, keine Business Failure.

### Konsument muss nie unterscheiden

Der Konsument muss nie wissen, ob es einen oder zehn Fehler gibt:

```python
# gut — kein Sonderfall, keine Verzweigung
for error in result.errors:
    ...
```

---

## 4. Fail-fast als Standard

Verwende **fail-fast**, wenn Prüfungen voneinander abhängen:

```python
result = load_item(item_id)

if result.is_failure:
    return result

item, = result.unwrap()

result = item.change_visibility(visibility)

if result.is_failure:
    return result

return success(item)
```

Nach einem Failure werden nachfolgende abhängige Schritte nicht mehr ausgeführt.

---

## 5. Fehler akkumulieren, wenn Prüfungen unabhängig sind

Akkumulation ist sinnvoll, wenn mehrere unabhängige Validierungen dem Benutzer gleichzeitig
angezeigt werden sollen.

```python
errors = []

if not valid_email(command.email):
    errors.append(InvalidEmail())

if not valid_username(command.username):
    errors.append(InvalidUsername())

if errors:
    return Failure(errors=tuple(errors))

return success(...)
```

Typische Grenze:

- **abhängige Schritte → fail-fast**
- **unabhängige Validierungen → akkumulieren**

---

## 6. Result propagieren

Wenn eine aufgerufene Operation bereits ein Result liefert, wird dessen Failure normalerweise
weitergereicht.

```python
result = repository.find_by_id(item_id)

if result.is_failure:
    return result

item, = result.unwrap()
```

Verwende vorhandene Result-Combinators wie `map`, `bind` oder vergleichbare Methoden,
**wenn sie tatsächlich in der Projektimplementierung vorhanden sind**.

`unwrap()` wird nur verwendet, wenn der Failure-Zustand vorher ausgeschlossen wurde.

---

## 7. Value Objects

Value Objects haben zwei unterschiedliche Validierungsebenen.

### Technische Invarianten

Beispiele:

- `None`, obwohl ein Wert erforderlich ist
- falscher primitiver Typ
- intern unmöglicher Zustand

→ Exception / Validator

### Fachliche Regeln

Beispiele:

- eine bestimmte Kombination von Werten ist fachlich nicht erlaubt
- ein semantisch ungültiger Zustand soll einem Benutzer gemeldet werden

→ Factory wie:

```python
result = SomeValueObject.create(...)
```

→ `Result[ValueObject, BaseFailure]`

---

## 8. Exceptions

Exceptions sind für Zustände gedacht, die im normalen Business-Control-Flow nicht erwartet werden.

Die konkrete Basis-Hierarchie liegt in `shared/exceptions.py`:

- `DomainException` — Basis-Exception mit `code`/`message`/`errors` (API-Shape).
  Davon erben die user-facing Validierungsfehler: `DtoValidationError`, `EntityValidationError`.
- `DomainInvariantError`, `ValueObjectError`, `MappingError`, `RepositoryError`,
  `HandlerAlreadyRegisteredError`, `HandlerNotRegisteredError`,
  `HandlerResultContractError` — geworfene Exceptions (Invarianten-/technische Fehler).

`DtoValidationError` und `EntityValidationError` sind technische Validierungsfehler,
**kein** fachlicher Regelverstoß — sie werden **niemals** als `BaseFailure` in
`Result[T, BaseFailure]` verwendet.

Typische Fälle:

```text
DomainInvariantError
ValueObjectError / ValueError
MappingError
RepositoryError
Infrastructure Exception
```

Solche Exceptions werden nicht künstlich in `Result` umgewandelt.

Insbesondere:

```python
try:
    ...
except Exception:
    return Failure(...)
```

ist kein allgemeines Result-Pattern. Nur fachlich erwartbare Fehler werden als Result modelliert.

---

## 9. Mapper

Mapper bilden zwischen Transport-/Persistenzmodellen und Domain-/Application-Modellen ab.

Grundprinzip:

```text
API validation
      ↓
DTO
      ↓
Mapper
      ↓
Command / Domain
```

Der Mapper:

- nutzt bereits validierte Eingangsdaten
- propagiert erwartbare Result-Failures
- erzeugt keine künstlichen Business Failures für technische Fehler
- fängt keine beliebigen Exceptions und versteckt sie als Result

Ein echter Mapping-Fehler ist ein technischer Fehler und wird als `MappingError` behandelt.

### DTO-Validierung (vor dem Result-Fluss)

Ein Fehler bei der DTO-Konstruktion (z. B. Pydantic `ValidationError` beim Parsen des
Requests) entsteht, **bevor** ein Command/UseCase überhaupt existiert. Das ist kein
`Result`-Failure, sondern eine geworfene `DtoValidationError` (via `DomainException.from_pydantic`),
die von einem globalen Exception-Handler an der API-Grenze in denselben öffentlichen
Error-Contract (§11) übersetzt wird wie ein `Failure`.

---

## 10. API Adapter

`@handle_api_result` ist ein **Transport-Adapter**.

Seine Aufgabe:

```text
Success → HTTP success response
Failure → ApiErrorResponse
```

Der Adapter:

- übersetzt Domain/Application Errors
- bestimmt HTTP-Repräsentation
- erzeugt das öffentliche `{ "errors": [...] }` Format
- enthält keine Business-Logik
- verschluckt keine unerwarteten Exceptions

Da eine `Failure` immer `errors` (mindestens ein Element) trägt, gibt es innerhalb der
Failure keine zweite Verzweigung:

```python
if result.is_success:
    return result.values[0]

for error in result.errors:
    api_errors.append(map_failure(error))
```

---

### Globaler Exception-Handler

Neben `@handle_api_result` (für `Result`) mappt ein **globaler Exception-Handler**
in `dweb/dsmarti/api.py` alle Nicht-`Result`-Fehlerpfade auf denselben Contract
`{ "errors": [ ... ] }`:

- `DtoValidationError` / `EntityValidationError` → 422 (übersetzte `errors[]`)
- Django-Ninja-`ValidationError` (Request-Parameter-Validierung) → 422
- `HttpError` → eigener Status (`exc.status_code`)
- unbehandelte Exception → 500 (`INTERNAL`)

Damit ist der Contract über Command- **und** Query-Endpoints einheitlich — die
OpenAPI-`response={…: ErrorResponse}`-Deklarationen werden tatsächlich erfüllt.

---

## 11. Öffentlicher API-Vertrag

Die API soll einen konsistenten Fehlervertrag liefern:

```json
{
  "errors": [
    {
      "code": "...",
      "message": "...",
      "field": "..."
    }
  ]
}
```

Der Vertrag ist für Clients wie `@smarti/api`/TanStack Query relevant.

Dabei gilt:

```text
Domain Error
    ↓
API Error Mapping
    ↓
ErrorResponse
    ↓
OpenAPI
    ↓
    @smarti/api (Orval)
```

Pydantic-/Django-Ninja-Validierungsfehler und Business-Fehler sollten nach Möglichkeit in
einen konsistenten öffentlichen Fehlervertrag überführt werden.

---

## 12. Praktisches Vorgehen

Wenn du eine neue Operation implementierst:

### Schritt 1 — Fehler klassifizieren

Welche Fehler können fachlich erwartbar auftreten?

→ Domain/Application Errors definieren.

### Schritt 2 — Result festlegen

Die Operation liefert:

```python
Result[T, BaseFailure]
```

bzw. die tatsächlich im Projekt verwendete Variante. Eine `Failure` trägt immer
`errors: tuple[BaseFailure, ...]` (mindestens ein Element), nie ein einzelnes `error`.

### Schritt 3 — Kontrollfluss implementieren

- sequentielle Abhängigkeiten → fail-fast
- unabhängige Validierungen → akkumulieren
- Result-Failures → propagieren
- unerwartete technische Fehler → Exceptions

### Schritt 4 — API-Grenze prüfen

Nur dort werden:

- HTTP-Status
- UI-/API-Message
- `field`
- `errors[]`

erzeugt. Der API-Adapter iteriert über `result.errors` — es gibt keinen
`error`-vs-`errors`-Sonderfall.

### Schritt 5 — Tests ergänzen

Teste mindestens:

- Success
- erwartete Business Failure
- mehrere unabhängige Failures, falls relevant
- Exception bei verletzter Invariante
- API-Mapping des Failure

---

## 13. Minimaler Coding-Standard

Bei Result-Code gelten diese Prioritäten:

1. **Fachliche Fehler als Result modellieren.**
2. **Invarianten und technische Fehler als Exceptions behandeln.**
3. **Result über Application-Schichten propagieren.**
4. **Fail-fast bei abhängigen Operationen.**
5. **Fehler nur bei unabhängigen Validierungen akkumulieren.**
6. **Domain Errors von API-Details trennen.**
7. **HTTP/UI/API-Darstellung erst an der API-Grenze erzeugen.**
8. **Nur tatsächlich vorhandene Result-Methoden verwenden.**
9. **Bestehende Projektkonventionen vor diesem Skill beachten.**

Dabei gilt für das Zielbild der `Failure`:

- `Failure(errors: tuple[E, ...])` — immer eine Sammlung; `1` ist nur ein Spezialfall.
- `errors=()` ist ungültig (Invariante → `ValueError`).
- `Success(value)` und `Success((value,))` sind äquivalent — der Konstruktor normalisiert jeden einzelnen Wert zu einem Tupel. Intern ist es immer ein Tupel.

### Strukturelle Absicherung

Ein Test sollte sicherstellen, dass kein Failure-Typ, der in einem `Result[T, E]` verwendet
wird, von `BaseException` erbt:

```python
# Pseudocode — echten Test schreibt der tester-Agent
for failure_cls in collect_failure_types(use_case):
    assert not issubclass(failure_cls, BaseException), failure_cls
```

---

## Kontext-Wiederherstellung

Wenn der Kontext verloren geht:

1. `.opencode/rules/backend.md` §Result-Pattern & Error-Contract lesen (Prinzipien, Entscheidungsbaum).
2. Tatsächliche Result-Implementierung im Projekt lesen (`shared/result.py` — Pfad verifizieren).
3. Vorhandene API-Error-Modelle und `@handle_api_result` prüfen.
4. Den Entscheidungsbaum aus dem Shared Context anwenden.
5. Bei Abweichungen immer die tatsächliche Implementierung und die verbindliche
   Design-Dokumentation priorisieren.

---

## Referenzen

* `.opencode/rules/backend.md` §Result-Pattern & Error-Contract
  — verbindliche Result-/Error-Handling-Prinzipien (Entscheidungsbaum, HTTP-Mapping, Contract)

* `.opencode/shared/context.md`
  — Kerninvarianten

* `../architect-backend/references/smarti-backend-patterns.md`
  — bestehende Backend-Architektur- und Mapping-Patterns

* `.opencode/rules/backend.md`
  — verbindliche Backend-Coding-Regeln

---

## Kernregel

> **Result beschreibt den fachlichen Kontrollfluss.
> Exceptions beschreiben unerwartete oder verletzte Invarianten.
> Die API entscheidet, wie ein fachlicher Fehler nach außen dargestellt wird.**

---