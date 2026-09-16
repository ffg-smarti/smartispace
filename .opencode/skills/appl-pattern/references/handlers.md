# SMARTi Backend Code Templates (Coder) - Application

Konkrete, implementierungsfertige Code-Templates application Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/appl/handlers/`.

---

## Application Layer

### Handler in DDD/CQRS — Übersicht

Alle drei Handler-Typen sind Orchestrierung, keine Business-Logik. Die Business-Regeln leben in Aggregate/Entity/ValueObject — der Handler entscheidet nur, wann er sie aufruft, lädt/speichert Zustand und übersetzt zwischen Schichten. Der Unterschied zwischen den drei liegt in was sie orchestrieren und welche Garantien sie geben müssen.

|                           | Command-Handler           | Query-Handler                       | Event-Handler
|Zweck	                    | Zustand ändern            | Zustand lesen                       | Auf bereits Geschehenes reagieren
|Kardinalität	            | 1 Command → 1 Handler     | 1 Query → 1 Handler                 | 1 Event → 0..N Handler
|Transaktion	            | schreibt, UoW-Commit	    | liest nur, keine Transaktion nötig  | läuft nach dem ursprünglichen Commit
|Rückgabe an Aufrufer	    | Result[T, BaseFailure]  | Result[ReadDTO, BaseFailure]        | keine (fire-and-forget aus Sicht des Auslösers)
|Idempotenz	                | wünschenswert	            | naturgemäß (rein lesend)	          | zwingend (at-least-once Delivery)
|Geht durchs Domain-Modell	| ja, immer über Aggregate	| optional — darf es umgehen          | ja, meist ein anderes Aggregat/eine Projektion

### Command Handler

#### **Zweck:** 

Führt genau eine Schreiboperation aus — lädt das Aggregat, ruft dessen Business-Methode auf, persistiert das Ergebnis. Die dabei entstandenen Events werden über `__exit__` dispatcht und committed.

**Typischer Ablauf:**

```
Command (vom Mapper)
  → Repository.load(id)              # Result[Aggregate, BaseFailure]
  → Aggregate.{{action}}(...)        # Result[Aggregate, BaseFailure]
  → UoW.save(aggregate) + uow.commit()
  # → __exit__ dispatcht die Domain Events VOR dem Commit
  → Result[T, BaseFailure] zurück an den Aufrufer (API-Adapter)
```

#### **Regeln:**

1. Ein Handler pro Command (1:1) — Create{{Aggregate}}CommandHandler.handle(command) -> Result[...].
2. Der Handler bekommt ein bereits validiertes Command vom Mapper — er prüft keine Feld-/Formvalidierung mehr, nur noch das, was Repository-Zugriff braucht (z. B. "existiert der referenzierte Account").
3. Business-Regeln, die innerhalb eines Aggregats liegen, gehören nicht in den Handler, sondern in die Aggregat-Methode selbst — der Handler ruft sie nur auf.
4. Business-Regeln, die Repository-Zugriff brauchen (Eindeutigkeit über den Datenbestand, Existenzprüfung eines fremden Aggregats), gehören in den Handler — genau das, was DTO/VO/Command strukturell nicht prüfen konnten.
5. Der Handler ist die Transaktionsgrenze: UoW-Commit/Rollback umschließt den Handler-Aufruf. Schlägt irgendein Schritt fehl, wird nichts persistiert.
6. Ein Command-Handler ruft nie einen anderen Command-Handler direkt auf. Braucht es Cross-Aggregat-Orchestrierung, läuft das über Domain Events — nicht über verdeckte Handler-zu-Handler-Kopplung.
7. Unerwartete technische Fehler (Repository down, Constraint-Verletzung in der DB) sind Exceptions, keine Failure — das Result-Pattern bildet nur erwartbare fachliche Fehler ab (siehe euer Result-Pattern-Skill).
8. Jeder Command-Handler muss von `ICommandHandler` (`# smarti/shared/appl/ports.py`) erben — `class XHandler(ICommandHandler[XCommand, TResult])`.

#### **Code-Template:**

```python
# smarti/{{context}}/appl/handlers/command/create_xx_handler.py
from __future__ import annotations

import logging
from collections.abc import Callable

from smarti.shared.appl.ports import ICommandHandler
from smarti.shared.exceptions import BaseFailure, BusinessFailure, ErrorCode
from smarti.shared.result import Result, Success, Failure

from ...ports import I{{AggregateRoot}}UnitOfWork
from ...commands.{{context}}_commands import Create{{AggregateRoot}}Command
from ...dtos import {{AggregateRoot}}DTO
logger = logging.getLogger(__name__)


class Create{{AggregateRoot}}Handler(ICommandHandler[Create{{AggregateRoot}}Command, {{AggregateRoot}}DTO]):
    """
    Handler für {{AggregateRoot}}.
    Orchestriert: Erstellen → Speichern.
    """

    def __init__(self, uow_factory: Callable[[], I{{AggregateRoot}}UnitOfWork]):
        self._uow_factory = uow_factory

    def handle(
        self, command: Create{{AggregateRoot}}Command
    ) -> Result[{{AggregateRoot}}DTO , BaseFailure]:
        with self._uow_factory() as uow:
            # Fail-fast: prüfe ob Eintrag bereits existiert
            if uow.repo.exists(command.account_id):
                return Failure(
                    BusinessFailure(
                        code=ErrorCode.{{AGGREGATE}}_ALREADY_EXISTS,
                    )
                )

            # Domain: Aggregate erstellen
            new_id = uow.repo.next_identity()   # TId, nicht UUID
            result = {{AggregateRoot}}.create(new_id=new_id, command)
            if result.is_failure:
                return result
            aggregate = result.values[0]

            uow.repo.save(aggregate)
            uow.commit()

        return Success({{AggregateRoot}}DTO(
            id=aggregate.id.value,
            {{field}}=aggregate.{{field}}.value,
            status=aggregate.status.value,
        ))

```


### Query Handler

#### **Zweck:** 

Liest Daten und liefert ein Read-DTO — ohne Zustandsänderung, ohne Events, ohne Transaktions-Schreibpflicht.

**Typischer Ablauf:**

```
Query (vom Mapper)
  → Autorisierungs-Check (darf actor das sehen?)
  → Read-Repository / Projection / SQL   # darf das Aggregat umgehen
  → Mapping auf ReadDTO
  → Result[ReadDTO, BaseFailure]
```

#### **Regeln:**

1. Ein Handler pro Query (1:1), wie Command — aber rein lesend, keine UoW nötig.
2. Der Query-Handler darf das Domain-Modell bewusst umgehen — das ist der Kernvorteil von CQRS: Lesen muss nicht den vollen Aggregat-Rekonstruktions-Aufwand tragen. Direkter SQL-/ORM-Zugriff oder ein dediziertes Read-Model/Projection ist explizit erlaubt und meist die bessere Wahl.
3. Autorisierung ("darf dieser Actor diese Daten sehen") gehört in den Query-Handler, nicht in die Query selbst.
4. Der Handler liefert ein Read-DTO, nie eine Entity/ein Aggregat direkt — die API-Schicht soll nie an Domain-Objekten hängen.
5. Query-Handler sind zustandslos und wiederholbar (per Definition idempotent) — Caching über Query.cache_key() ist an dieser Stelle der natürliche Ansatzpunkt.
6. Lesemodelle dürfen denormalisiert und von Event-Handlern eigenständig aktuell gehalten werden (Projections) — der Query-Handler liest dann nur noch die Projection, nicht die "Wahrheit" aus dem Aggregat neu zusammen.
7. NotFound ist eine erwartbare fachliche Failure (Result), kein technischer Fehler — anders als z. B. ein DB-Verbindungsabbruch.
8. Jeder Query-Handler muss von `IQueryHandler` (`# smarti/shared/appl/ports.py`) erben — `class XHandler(IQueryHandler[XQuery, TResult])`.

#### **Code-Template:**

```python
# smarti/{{context}}/appl/handlers/query/get_xx_handler.py
from __future__ import annotations

import logging

from smarti.shared.appl.ports import IQueryHandler
from smarti.shared.exceptions import BaseFailure, BusinessFailure, ErrorCode
from smarti.shared.result import Result, Success, Failure

from ...commands.{{context}}_commands import Get{{AggregateRoot}}Query
from ...dtos import {{AggregateRoot}}ReadDTO
from ...ports import I{{AggregateRoot}}Repository

logger = logging.getLogger(__name__)


class Get{{AggregateRoot}}Handler(IQueryHandler[Get{{AggregateRoot}}Query, {{AggregateRoot}}ReadDTO]):
    """
    Handler für {{AggregateRoot}}-Leseoperationen.
    Liest direkt aus der DB und baut DTO — kein Domain-Aggregat.
    """

    def __init__(self, repo: I{{AggregateRoot}}Repository):
        self._repo = repo

    def handle(
        self, query: Get{{AggregateRoot}}Query
    ) -> Result[{{AggregateRoot}}ReadDTO, BaseFailure]:
        result = self._repo.find_by_id(query.{{aggregate_root}}_id)
        if result.is_failure:
            return result

        item = result.values[0]
        if item is None:
            return Failure(
                BusinessFailure(
                    code=ErrorCode.{{AGGREGATE}}_NOT_FOUND,
                )
            )

        return Success(self._build_dto(item))

    def _build_dto(self, item) -> {{AggregateRoot}}ReadDTO:
        """Baut ein DTO aus rohen DB-Daten. DTO enthält nur primitive Typen."""
        return {{AggregateRoot}}ReadDTO(
            id=item.id.value,
            {{field}}=getattr(item, '{{field}}'),
            status=getattr(item, 'status'),
        )
```


### Event Handler

#### **Zweck**: 

Reagiert auf etwas, das bereits passiert ist ({{Aggregate}}{{Action}}ed) — Seiteneffekte, Cross-Aggregat-Konsistenz, Projections aktualisieren, Integration mit externen Systemen.

**Typischer Ablauf:**

```
UoW.commit()
  → collect_domain_events()
  → Dispatcher: für jedes Event → alle registrierten Handler aufrufen
       → Handler A: Projection aktualisieren
       → Handler B: neues Command auf einem anderen Aggregat auslösen
       → Handler C: externe Benachrichtigung anstoßen
```

#### **Regeln:**

1. Kardinalität ist 1:N — mehrere unabhängige Handler dürfen auf dasselbe Event reagieren, ohne voneinander zu wissen.
2. Event-Handler müssen idempotent sein: Bei at-least-once-Delivery (Message-Bus, Outbox-Pattern, Retry nach Fehler) kann ein Event mehrmals ankommen. Ein zweites Verarbeiten desselben Events darf keinen doppelten Effekt erzeugen.
3. Das Event ist bereits Vergangenheit — der Handler reagiert nur, er verändert nicht rückwirkend das Aggregat, das es ausgelöst hat. Braucht es eine Folgeaktion auf einem anderen Aggregat, geschieht das über ein neues Command, nicht über direkten Zugriff auf fremde Aggregate.
4. Ein Event-Handler läuft nach dem Commit der ursprünglichen Transaktion (bei asynchronem Dispatch) — sein Scheitern darf die ursprüngliche Schreiboperation nicht rückgängig machen. Fehlerbehandlung (Retry, Dead-Letter-Queue) ist Sache des Event-Handlers/Dispatchers, nicht des ursprünglichen Command-Handlers.
5. Der ursprüngliche Aufrufer des Commands wartet nicht auf das Ergebnis von Event-Handlern — aus seiner Sicht ist der Dispatch fire-and-forget. Intern darf ein Event-Handler trotzdem das Result-Pattern für seine eigene Orchestrierung nutzen.
6. Keine garantierte Reihenfolge zwischen unterschiedlichen Handlern desselben Events, sofern nicht explizit anders konstruiert (z. B. über Prioritäten im Dispatcher).
7. Events selbst bleiben das, was sie in DomainEventMixin schon sind: immutable Value Objects mit Vergangenheitsform-Namen — der Handler fügt keine neue fachliche Bedeutung hinzu, er reagiert nur.
8. Jeder Event-Handler muss von `IEventHandler` (`# smarti/shared/appl/ports.py`) erben — `class XHandler(IEventHandler[XEvent, TResult])`.

#### **Code-Template:**

```python
# smarti/{{context}}/appl/handlers/event/xx_event_handler.py
from __future__ import annotations

import logging
from collections.abc import Callable

from smarti.shared.appl.ports import IEventHandler
from smarti.shared.exceptions import BaseFailure
from smarti.shared.result import Result, Success

from ...ports import I{{AggregateRoot}}UnitOfWork

logger = logging.getLogger(__name__)


class XxEventHandler(IEventHandler[XxEvent, None]):
    """
    Handler für XxEvent. Reagiert auf Domain Event und führt sekundäre Aktion aus.

    - Idempotent: kann mehrfach mit demselben Event aufgerufen werden.
    - Transaktional: operiert innerhalb eines UoW-Kontexts.
    - Fehlertolerant: gibt Result zurück, wirft keine Exceptions.
    """

    def __init__(self, uow_factory: Callable[[], I{{AggregateRoot}}UnitOfWork]):
        self._uow_factory = uow_factory

    def __call__(self, event: XxEvent) -> Result[None, BaseFailure]:
        """Event-Handler-Entry-Point für Event-Dispatcher."""
        return self.handle(event)

    def handle(self, event: XxEvent) -> Result[None, BaseFailure]:
        with self._uow_factory() as uow:
            # Logik hier — z.B. Projection aktualisieren, Benachrichtigung anstoßen.
            # ...
            uow.commit()

        return Success(None)
```


### Zusammenspiel

API-Request
   │
   ▼
DTO (Struktur-Validierung)
   │
   ▼
Mapper (DTO → Command/Query, VO-Invarianten via .create()/combine())
   │
   ├── Command ──► Command-Handler ──► Aggregate ──► Events ──► Event-Handler(n) ──► Projections
   │                                                                                      │
   └── Query ───► Query-Handler ◄─────────────────────────────────────────── liest Projections/Aggregat

---

### Anti-Pattern

**1. Fat-Handler:**
```python
def handle(self, command: CancelOrderCommand) -> Result[Order, BaseFailure]:
    order = self._repo.load(command.order_id).unwrap()

    if order.status == OrderStatus.SHIPPED:          # Business-Regel im Handler
        return Failure(OrderAlreadyShipped(...))
    order_dict = order.to_dict()
    order_dict["status"] = "CANCELLED"                # Aggregat wird von außen manipuliert
    new_order = Order(**order_dict)

    self._repo.save(new_order)
    return Success(new_order)


# besser: Handler ruft nur auf, Aggregat entscheidet und mutiert sich selbst über _evolve()
def handle(self, command: CancelOrderCommand) -> Result[Order, BaseFailure]:
    order = self._repo.load(command.order_id).unwrap()
    result = order.cancel(command.actor)
    if result.is_failure:
        return result

    new_order = result.values[0]
    self._uow.orders.save(new_order)
    self._uow.commit()
    return Success(new_order)
```
**Faustregel:** Wenn eine if-Bedingung im Handler eine fachliche Frage beantwortet ("darf das? ist das erlaubt? in welchem Zustand ist das?"), gehört sie ins Aggregat/VO — nicht in den Handler. Der Handler darf nur technische Vorbedingungen prüfen (Existenz eines referenzierten Aggregats, o. Ä.).

**2. Mehr als ein Aggregat pro Transaktion: **

Ein Handler, der in derselben Transaktion zwei Aggregate lädt und beide mutiert, weil es "gerade praktisch" ist:

```python
# Anti-Pattern
def handle(self, command: TransferCommand):
    account_a = self._repo.load(command.from_id).unwrap()
    account_b = self._repo.load(command.to_id).unwrap()
    account_a = account_a.withdraw(command.amount)
    account_b = account_b.deposit(command.amount)
    self._repo.save(account_a)
    self._repo.save(account_b)   # zwei Aggregate, eine Transaktion, enge Kopplung

```
**Die DDD-Grundregel ist:** eine Transaktion ändert höchstens ein Aggregat. Cross-Aggregat-Konsistenz läuft über Domain Events (Saga/Process-Manager-Pattern) — account_a.withdraw() raised ein Event, ein Event-Handler löst darauf ein DepositCommand für account_b aus. Das ist bewusst eventual consistency, nicht sofortige — ein häufiger Punkt, an dem Coder-Agenten "vereinfachen" und genau das umgehen.


**3. Handler ruft Handler direkt:**
```python
# Anti-Pattern
class CreateOrderCommandHandler:
    def handle(self, command):
        order = Order.create(command)
        self._repo.save(order)
        SendConfirmationEmailCommandHandler(self._email_service).handle(...)  # direkter Aufruf
```

Versteckte Kopplung zwischen zwei Handlern, die nichts voneinander wissen sollten. Folgeaktionen laufen über die Events, die das Aggregat selbst erzeugt hat — nie über direkte Handler-zu-Handler-Aufrufe, egal ob Command→Command, Query→Command oder Event→Command "der Einfachheit halber".

**4. Exceptions und Result vermischen ("catch-all"):**

```python
# Anti-Pattern (steht auch explizit so in eurem Result-Pattern-Skill als Verstoß)
def handle(self, command) -> Result[Order, BaseFailure]:
    try:
        order = Order.create(command)
        self._repo.save(order)
        return Success(order)
    except Exception as e:
        return Failure(str(e))
```
Das verschluckt technische Fehler (DB down, Constraint-Verletzung) genauso wie fachliche — der Aufrufer kann nicht mehr unterscheiden, was passiert ist, und die API-Grenze bekommt für alles denselben undifferenzierten Fehler. Erwartbare fachliche Fehler kommen explizit aus der Aggregat-/VO-Methode als Result; alles andere ist eine Exception, die durchgereicht (oder von einem globalen Exception-Handler an der API-Grenze behandelt) wird — nicht künstlich in Failure verpackt.

**5. Handler baut sein eigenes Command/Query:**

```python
# Anti-Pattern
class CreateOrderCommandHandler:
    def handle(self, dto: CreateOrderDTO) -> Result[Order, BaseFailure]:
        command = CreateOrderCommand(account_id=AccountId(value=dto.account_id), ...)  # Mapping im Handler
        ...
```

**6. Transportschicht-Kopplung:**

```python
# Anti-Pattern
from django.http import HttpRequest, JsonResponse

class CreateOrderCommandHandler:
    def handle(self, request: HttpRequest) -> JsonResponse:   # Application-Layer kennt HTTP
        ...
```

Handler kennen weder Django-Request/Response-Objekte noch Ninja-Schemas noch HTTP-Status-Codes. Diese Übersetzung passiert ausschließlich am API-Adapter (@handle_api_result).

**7. Aggregat/Entity statt DTO nach außen geben:**

```python
# Anti-Pattern
def handle(self, query: GetOrderQuery) -> Result[Order, BaseFailure]:   # Aggregat als Rückgabewert
    return self._repo.load(query.order_id)
```

Der Query-Handler mappt das gefundene Domain-Objekt explizit auf ein ReadDTO, bevor es zurückgeht — sonst hängt die API am internen Feldnamen/Struktur des Aggregats, und jede interne Umbenennung wird zum Breaking Change im API-Vertrag.

**8. Zustandsbehafteter Handler:**

```python
# Anti-Pattern
class ListNotificationsQueryHandler:
    def __init__(self):
        self._last_query = None       # Instanzzustand zwischen Aufrufen

    def handle(self, query):
        self._last_query = query      # Race Condition bei parallelen Requests, wenn Instanz geteilt wird
        ...
```

Handler sind wie Mapper zustandslos — jede Instanzvariable, die sich zwischen zwei handle()-Aufrufen ändert, ist ein potenzielles Nebenläufigkeitsproblem, sobald dieselbe Handler-Instanz für mehrere Requests wiederverwendet wird (z. B. als Singleton im DI-Container).

**9. Nicht-idempotente Seiteneffekte (v. a. Event-Handler, aber prinzipiell überall):**
```python
# Anti-Pattern
class OrderCreatedEventHandler:
    def handle(self, event: OrderCreated):
        self._email_service.send_confirmation(event.order_id)   # kein Schutz gegen doppelte Zustellung
```

Bei at-least-once-Delivery (Retry nach Timeout, Redelivery aus einer Queue) kommt dasselbe Event mehrfach an. Ohne Idempotenz-Schutz (z. B. processed_events-Tabelle mit Event-ID, oder ein Idempotenz-Key beim externen Aufruf) verschickt ihr die Bestätigungsmail zweimal.

**10. God Handler / inline Dispatch-Logik:**

```python
# Anti-Pattern
class OrderHandler:
    def handle(self, command):
        if isinstance(command, CreateOrderCommand):
            ...
        elif isinstance(command, CancelOrderCommand):
            ...
        elif isinstance(command, ShipOrderCommand):
            ...
```

Ein Handler ist für ein Command/eine Query zuständig (1:1), nicht für eine ganze Aggregat-Familie über isinstance-Verzweigung. Das ist dasselbe Anti-Pattern, das wir beim Mapper schon einmal sauber gelöst haben (Dispatch über eine Registry, nicht über if/elif) — nur dass Handler idealerweise gar keinen Dispatch brauchen, weil die Command-Bus-/Query-Bus-Infrastruktur das Routing (1 Command-Typ → 1 registrierter Handler) bereits übernimmt.

---

### Entscheidungsregel

#### Command Handler

1. Jeder Command-Handler muss von `ICommandHandler` (`# smarti/shared/appl/ports.py`) erben.
2. Domain-Invarianten in Domain-Methoden (`Aggregate.create()`, `Aggregate.action()`) — nicht im Handler.
3. Repository-Zugriff nur über UoW-Port (`self._uow_factory() as uow`).
4. `Failure(BusinessFailure(code=ErrorCode.X))` statt `raise` für erwartete fachlichen Fehler.
5. Command-Handler geben `Success(None)` oder `Success({{AggregateRoot}}DTO)` zurück — je nach Bedarf des Aufrufers.
6. UoW für transaktionale Operationen verwenden (`uow.repo.save()`, `uow.commit()`).
7. `result.is_failure` nach Domain-Methoden-Aufrufen prüfen und direkt zurückgeben.
8. Bei neuem fachlichem Fehler zuerst einen passenden `ErrorCode` suchen (fein → grob als Fallback); nur wenn keiner passt, einen neuen feinen Code in `ErrorCode` anlegen **und** in `dweb/dsmarti/api_errors.py` mappen.

#### Query Handler

1. Jeder Query-Handler muss von `IQueryHandler` (`# smarti/shared/appl/ports.py`) erben.
2. Query-Handler lesen direkt aus dem Repository und bauen DTO aus rohen DB-Daten — kein Domain-Aggregat.
3. Query-Handler nutzen Repository-Interface (`I{{AggregateRoot}}Repository` aus `...ports`) für den Zugriff.
4. `NOT_FOUND` über `Failure(BusinessFailure(code=ErrorCode.{{AGGREGATE}}_NOT_FOUND))` melden (Fallback: `ErrorCode.NOT_FOUND`).
5. Query-Handler geben `Success({{AggregateRoot}}ReadDTO)` zurück — Daten sind Pflicht.
6. Kein `created_at` in Query-Typen (Value-Equality + Cache-Key).
7. Autorisierung gehört in Middleware/Handler-Logic, nicht in die Query.

#### Event Handler

1. Jeder Event-Handler muss von `IEventHandler` (`# smarti/shared/appl/ports.py`) erben.
2. Event-Handler sind idempotent — doppelte Verarbeitung darf keinen Fehler verursachen.
3. Event-Handler operieren innerhalb eines UoW-Kontexts.
4. Fehler über `Failure(BusinessFailure(code=ErrorCode.X))` zurückgeben, nie via `raise`.
5. Domain-Events werden VOR dem Commit dispatchen — UoW.__exit__() ruft _dispatch_events() auf, bevor transaction_atomic.__exit__() die Transaktion committet.
6. `__call__` delegiert an `handle()` — Entry-Point für Event-Dispatcher.
