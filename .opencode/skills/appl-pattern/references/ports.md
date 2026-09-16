# SMARTi Backend Code Templates (Coder) - Application

Konkrete, implementierungsfertige Code-Templates für Ports in der Application-Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/appl/ports.py`.

**Prinzipien/Patterns** (nicht hier dupliziert):
- CQRS/DDD → `shared/architecture.md`
- Result/Error-Contract → `rules/backend.md` §Result-Pattern & Error-Contract
- Geteilte Basis-Implementierung (Aggregate-Registrierung, Event-Dispatch, ID-Erzeugung) → `smarti/shared/appl/ports.py`

---

## Application Layer

### Ports (Interfaces)

Ports sind die Schnittstellen, über die die Application-Schicht mit Infrastruktur (DB, Dateispeicher, andere Bounded Contexts) kommuniziert — implementiert wird ausschließlich in der Infra-Schicht. Ein Port selbst enthält **keine** Business-Logik.

---

#### Unit of Work Port

Der Port für Unit of Work erbt von `IUnitOfWorkSharedPort` (aus `smarti.shared.appl.ports`) — einer echten Basisklasse (`ABC`), nicht einem `Protocol`, weil sie geteilte Implementierung mitbringt: `register()` (Aggregat-Registrierung), `_dispatch_events()` (wird aus `__exit__` VOR dem Commit aufgerufen, nie nach `rollback()`).

```python
# smarti/{{context}}/appl/ports.py
from __future__ import annotations

from abc import ABC, abstractmethod

from smarti.shared.appl.ports import IUnitOfWorkSharedPort
from .ports import I{{AggregateRoot}}Repository

class I{{AggregateRoot}}UnitOfWork(IUnitOfWorkSharedPort):
    """Unit of Work interface für den {{Context}}-Kontext."""

    @abstractmethod
    def __enter__(self) -> I{{AggregateRoot}}UnitOfWork: ...

    @abstractmethod
    def __exit__(self, exc_type, exc_val, exc_tb) -> bool | None: ...

    @property
    @abstractmethod
    def {{aggregate_root_plural}}(self) -> I{{AggregateRoot}}Repository: ...

    # Weitere Repositories/QueryServices desselben Kontexts als eigene,
    # sprechend benannte Properties (siehe Beispiel unten) - kein generisches
    # "repo", sobald ein Kontext mehr als ein Repository hat.
```

Unit of Work muss mindestens ein Repository halten. Es kann auch mehrere Repositories oder QueryServices aus dem gleichen Kontext haben.

```python
class IProfileUnitOfWork(IUnitOfWorkSharedPort, ABC):
    """Unit of Work interface for Profile domain operations."""

    @abstractmethod
    def __enter__(self) -> IProfileUnitOfWork: ...

    @abstractmethod
    def __exit__(self, exc_type, exc_val, exc_tb) -> bool | None: ...

    @property
    @abstractmethod
    def profiles(self) -> IProfileRepository: ...

    @property
    @abstractmethod
    def child_learning_assets(self) -> IChildLearningAssetsRepository: ...

    @property
    @abstractmethod
    def child_learning_data(self) -> IChildLearningDataRepository: ...

    @property
    @abstractmethod
    def progress_snapshot(self) -> IChildProgressSnapshotRepository: ...
```

`commit()`/`rollback()` müssen hier **nicht** erneut deklariert werden — sie sind bereits abstrakte Methoden von `IUnitOfWorkSharedPort`.

---

#### Repository Port

Der Port für Repository muss von `IRepositorySharedPort` (aus `smarti.shared.appl.ports`) erben. Der Shared-Port bringt bereits mit:
- `_validate_uow_context(operation_name)` — stellt sicher, dass die Operation innerhalb eines UoW-Kontexts läuft; wird am Anfang jeder konkreten Infra-Implementierung von `create`/`update`/`delete` aufgerufen.
- `next_identity() -> TId` — erzeugt eine neue, eindeutige Aggregat-ID. Die konkrete Erzeugungsstrategie (aktuell `uuid.uuid4()`, potenziell später DB-Sequenz o. Ä.) liegt in der Basisklasse; die Mechanik dahinter (`_id_cls`) ist Sache der konkreten Infra-Implementierung, nicht des Ports — der Port selbst verspricht nur die Signatur `next_identity() -> {{AggregateRoot}}Id`.

**Der Port muss die von `IRepositorySharedPort` geforderten abstrakten Methoden implementieren — nicht durch eigene, abweichende Methoden ersetzen:**

```python
# smarti/{{context}}/appl/ports.py
from abc import abstractmethod

from smarti.shared.appl.ports import IRepositorySharedPort
from smarti.shared.exceptions import BaseFailure
from smarti.shared.objects import {{AggregateRoot}}Id
from smarti.shared.result import Result
from ..domain.model.{{aggregate}} import {{AggregateRoot}}


class I{{AggregateRoot}}Repository(IRepositorySharedPort[{{AggregateRoot}}, {{AggregateRoot}}Id]):
    """
    Implementiert die von IRepositorySharedPort geforderten Methoden:
    create, update, find_by_id, delete, exists.

    next_identity() ist bereits über die Basisklasse verfügbar und liefert
    {{AggregateRoot}}Id (siehe IRepositorySharedPort für die Erzeugungsstrategie
    - dieser Port muss sich um deren Mechanik nicht kümmern, nur um die Signatur).

    Kontext-spezifische Zusatzabfragen werden HIER als weitere abstrakte
    Methoden ergänzt, niemals als Ersatz für die geerbten.
    """

    @abstractmethod
    def find_by_{{field}}(
        self, {{field}}: {{ValueObject}}
    ) -> Result[{{AggregateRoot}} | None, BaseFailure]:
        """Kontext-spezifische Zusatzabfrage, ergänzend zu find_by_id."""
        ...
```

Die konkrete Infra-Implementierung (nicht Teil dieses Ports, aber zur Einordnung):

```python
class Django{{AggregateRoot}}Repository(I{{AggregateRoot}}Repository):
    _id_cls = {{AggregateRoot}}Id   # macht next_identity() funktionsfähig
    ...
```

---

#### Query Service Port

```python
# smarti/{{context}}/appl/ports.py
from __future__ import annotations

from abc import ABC, abstractmethod

from smarti.shared.exceptions import BaseFailure
from smarti.shared.result import Result
from ..appl.dtos import {{AggregateRoot}}ReadDTO


class I{{AggregateRoot}}QueryService(ABC):
    """
    Query Service für optimierte Read-Operationen (CQRS).

    Unterschied zu Repository:
    - Repository: Domain Aggregates (Write-Modell)
    - Query Service: DTOs (Read-Modell, ggf. denormalisiert)

    Vorteile: keine Aggregate-Hydration nötig, direkter Zugriff auf
    DB-Views/Projections möglich, Lese-Logik getrennt von Schreib-Logik.
    """

    @abstractmethod
    def search_xx(
        self,
        query: str,
        filters: dict | None = None,
        pagination: Pagination = Pagination(),
    ) -> Result[list[{{AggregateRoot}}ReadDTO], BaseFailure]:
        """Volltextsuche über {{Suchfelder}}."""
        ...

    @abstractmethod
    def get_{{aggregate_root_plural}}_by_{{field}}(
        self, {{field}}: {{ValueObject}}, pagination: Pagination = Pagination()
    ) -> Result[list[{{AggregateRoot}}ReadDTO], BaseFailure]:
        """Lädt alle {{AggregateRoot}}s zu {{field}}."""
        ...
```

Methodennamen sind sprechend und kontextspezifisch (`search_{{aggregate_root_plural}}`, nicht `search_xx`) — Coder-Agenten übernehmen sonst das Platzhalter-Muster wörtlich in echten Code.

---

#### Anti-Corruption Ports (ACL)

Für synchronen Zugriff auf Daten aus einem anderen Bounded Context ist ein ACL-Port vorgesehen. Falls so ein Zugriff benötigt wird, muss ein entsprechendes ACL-Port erstellt werden.

**Beispiel:**

```python
class IAccountValidationPort(ABC):
    """
    Port (ACL) zur Validierung der Parent-Child-Beziehung in der Account-Domain.
    Implementierung liegt in der Infra-Schicht.
    """

    @abstractmethod
    def is_valid_parent_child_relation(
        self,
        parent_id: AccountId,
        child_id: AccountId,
    ) -> bool:
        """Abfrage der Accounts Domain."""
        # Impl: Prüfe, ob Parent der Erziehungsberechtigte des Child ist.
        # Hier würden wir eine externe API/einen Service aufrufen.
        # Rückgabe muss True oder False sein.
        pass
```

Rückgabe bleibt bewusst `bool`, kein `Result` — ein ACL-Port beantwortet eine synchrone fachliche Ja/Nein-Frage aus einem fremden Kontext; ein technischer Fehler beim Aufruf (Netzwerk, Timeout) ist wie überall eine Exception, keine erwartbare Business-Failure.

---

#### File Storage Port

Der Port für Datei-Speicherung ist optional pro Kontext. Meist reicht der generische `IFileStorageSharedPort` (aus `smarti.shared.appl.ports`) direkt — kein eigener Port nötig, außer der Kontext braucht zusätzliche, spezifische Storage-Operationen.

---

### Anti-Pattern

```python
class I{{AggregateRoot}}Repository(IRepositorySharedPort[{{AggregateRoot}}, {{AggregateRoot}}Id]):
    @abstractmethod
    def get_by_id(self, id: UUID) -> {{AggregateRoot}} | None: ...   # ersetzt find_by_id statt es zu implementieren
    @abstractmethod
    def save(self, aggregate: {{AggregateRoot}}) -> None: ...         # kein Result, ersetzt create/update

class I{{AggregateRoot}}UnitOfWork(IUnitOfWorkSharedPort):            # Protocol statt ABC -> abstrakte Methoden nicht erzwungen
    @property
    @abstractmethod
    def repo(self): I{{AggregateRoot}}Repository                      # fehlender Pfeil: Ausdruck statt Rückgabetyp, immer None

# besser: siehe Templates oben - Basis-Methoden implementieren statt
# ersetzen, Result[..., BaseFailure] konsequent, ABC statt Protocol
# sobald geteilte Implementierung (register/_dispatch_events) involviert ist.
```

### Entscheidungsregel

1. Ein Repository-Port implementiert die von `IRepositorySharedPort` geforderten Methoden (`create`, `update`, `find_by_id`, `delete`, `exists`) — kontextspezifische Zusatzmethoden werden ergänzt, nie als Ersatz für die Basis-Methoden.
2. `next_identity()` kommt von der Basisklasse; die konkrete Infra-Implementierung setzt nur `_id_cls`. Kein Aggregat erzeugt seine ID selbst — ID-Generierung ist Repository-Verantwortung, damit spätere Änderungen der Erzeugungsstrategie (DB-Sequenz, externer Generator) den Domain-Code nicht berühren.
3. Ein UoW-Port erbt von `IUnitOfWorkSharedPort` (ABC), nie von einem `Protocol` — sobald geteilte Implementierung (Aggregate-Registrierung, Event-Dispatch) involviert ist, erzwingt nur eine echte Basisklasse mit `@abstractmethod`, dass eine konkrete UoW `commit`/`rollback`/`__enter__`/`__exit__` tatsächlich überschreibt.
4. Ein Kontext mit mehreren Repositories/QueryServices bekommt für jedes eine eigene, sprechend benannte Property auf der UoW (Plural, z. B. `profiles`, `child_learning_assets`) — kein generisches `repo`.
5. Event-Dispatch (`_dispatch_events()`) läuft ausschließlich aus `__exit__` nach einem **erfolgreichen** Commit, nie nach `rollback()` und nie durch direkten Aufruf von `commit()` außerhalb eines `with`-Blocks.
6. Alle Port-Methoden, die fachlich fehlschlagen können, geben `Result[T, BaseFailure]` zurück — mit beiden Typparametern, nie `Result[T]` allein.
7. Ein ACL-Port beantwortet eine synchrone Ja/Nein-Frage aus einem fremden Kontext direkt als `bool` — kein `Result`, technische Fehler bleiben Exceptions.
8. Methodennamen in Ports sind sprechend und kontextspezifisch — keine Platzhalter-Namen wie `search_xx`/`get_xx` im tatsächlichen Code.
