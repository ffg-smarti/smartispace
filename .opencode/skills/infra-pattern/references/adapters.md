# SMARTi Backend Code Templates (Coder) - Infrastructure

Konkrete, implementierungsfertige Code-Templates infrastructure Schicht. **Für Coder**. Platzhalter in `{{doppelten Krammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/infra/adapters/`.

---

## Infrastructure Layer

### Repository (Django)

Der Django-Repository implementiert den application-Port `I{{AggregateRoot}}Repository` der wiederum von `IRepositorySharedPort` erbt. Er erbt die UoW-Pflicht und Validierung von `IRepositorySharedPort`.

```python
# smarti/{{context}}/infra/adapters/repo.py
from uuid import UUID
from typing import TYPE_CHECKING, Any
from django.db import IntegrityError
from smarti.shared.exceptions import RepositoryError
from smarti.shared.result import Result, Success, Failure
from smarti.shared.objects import {{AggregateRoot}}Id
from ...appl.ports import I{{AggregateRoot}}Repository
# 
from dweb.d{{context}}.models import {{AggregateRoot}}ORM
from ..{{aggregate_root_snake}}_mapper import {{AggregateRoot}}Mapper
if TYPE_CHECKING:
    from ...domain.model.{{aggregate}} import {{AggregateRoot}}

class Django{{AggregateRoot}}Repository(I{{AggregateRoot}}Repository):
    """Repository für {{AggregateRoot}} — nur innerhalb eines UnitOfWork-Contexts nutzbar."""

    def __init__(self, uow: IUnitOfWorkSharedPort):
        super().__init__(uow)
        self._mapper = {{AggregateRoot}}Mapper()

    # =========================================================================
    # FIND
    # =========================================================================

    def find_by_id(self, id: UUID) -> Result[{{AggregateRoot}} | None, BaseFailure]:
        """Findet {{AggregateRoot}} by ID innerhalb eines aktiven UoW-Contexts."""
        self._validate_uow_context("find_by_id")
        try:
            orm_obj = {{AggregateRoot}}ORM.objects.get(id=id)
        except {{AggregateRoot}}ORM.DoesNotExist:
            return Success(None)
        except Exception as e:
            raise RepositoryError(
                f"Failed to find profile in DB: {e}",
                repository="Django{{AggregateRoot}}Repository",
                operation="find_by_id",
            ) from e
        return Success(self._mapper.infra_to_domain(orm_obj))

    # =========================================================================
    # CREATE
    # =========================================================================

    def create(self, aggregate: {{AggregateRoot}}) -> Result[None, BaseFailure]:
        """Erstellt neues {{AggregateRoot}} im aktiven UoW-Context."""
        self._validate_uow_context("create")
        try:
            orm_obj = self._mapper.domain_to_infra(aggregate)
            orm_obj.save()
            return Success(None)
        except IntegrityError as e:
            raise RepositoryError(
                "Integrity-Constraint beim Erstellen von {{AggregateRoot}}",
                repository="Django{{AggregateRoot}}Repository",
                operation="create",
            ) from e

    # =========================================================================
    # UPDATE
    # =========================================================================

    def update(self, aggregate: {{AggregateRoot}}) -> Result[None, BaseFailure]:
        """Aktualisiert existierendes {{AggregateRoot}} mit Optimistic Locking."""
        self._validate_uow_context("update")
        try:
            orm_obj = self._mapper.domain_to_infra(aggregate)
            orm_obj.save()
            return Success(None)
        except IntegrityError as e:
            raise RepositoryError(
                "Integrity-Constraint beim Aktualisieren von {{AggregateRoot}}",
                repository="Django{{AggregateRoot}}Repository",
                operation="update",
            ) from e

    # =========================================================================
    # DELETE
    # =========================================================================

    def delete(self, aggregate_id: UUID) -> Result[None, BaseFailure]:
        """Löscht {{AggregateRoot}} by ID innerhalb eines aktiven UoW-Contexts."""
        self._validate_uow_context("delete")
        try:
            orm_obj = {{AggregateRoot}}ORM.objects.get(id=aggregate_id)
            orm_obj.delete()
            return Success(None)
        except {{AggregateRoot}}ORM.DoesNotExist:
            return Success(None)
        except IntegrityError as e:
            raise RepositoryError(
                "Integrity-Constraint beim Löschen von {{AggregateRoot}}",
                repository="Django{{AggregateRoot}}Repository",
                operation="delete",
            ) from e

    # =========================================================================
    # EXISTS
    # =========================================================================

    def exists(self, aggregate_id: UUID) -> bool:
        """Prüft ob {{AggregateRoot}} existiert."""
        self._validate_uow_context("exists")
        return {{AggregateRoot}}ORM.objects.filter(id=aggregate_id).exists()
```

#### Fake Repository

Konkretes Fake Repository für Tests. Es implementiert `I{{AggregateRoot}}Repository` (Application-Port) und erbt von `FakeRepoMixin` (In-Memory-Funktionalität).

`FakeRepoMixin` ist ein **Mixin für Fake Repositories** mit In-Memory-Speicherung. Keine eigene `__init__` — Initialisierung über `_init_fake_store()`. Konkrete FakeRepos kombinieren diesen Mixin mit dem passenden Application-Port.

Definition: `# smarti/shared/infra/adapter/repo.py`

**`add()` vs `_save()`:**
- `add(aggregate)` — Test-Setup, zählt **nicht** in `_save_calls`
- `_save(aggregate)` — Von UoW/Handler aufgerufen, zählt in `_save_calls`

**`_init_fake_store()`:**
- Wird vom Concrete FakeRepo nach `super().__init__()` aufgerufen
- Initialisiert `_store`, `_indexes`, `_save_calls`, `_delete_calls` und Zähler
- `clear()` ruft intern `_init_fake_store()` auf (kein manuelles Reset nötig)

```python
# smarti/{{context}}/infra/adapters/fake.py
from smarti.shared.infra.adapter.repo import FakeRepoMixin
from ...appl.ports import I{{AggregateRoot}}Repository
from ..domain.model.{{aggregate}} import {{AggregateRoot}}
from smarti.shared.objects import {{AggregateRoot}}Id


class Fake{{AggregateRoot}}Repository(I{{AggregateRoot}}Repository, FakeRepoMixin):
    """Fake Repository für Tests — In-Memory Speicherung."""

    def __init__(self, uow: IUnitOfWorkSharedPort):
        super().__init__(uow)
        self._init_fake_store()

    def _get_index_keys(self, aggregate: {{AggregateRoot}}) -> dict[str, any]:
        return {"account_id": aggregate.account_id.value}
```

### Query Service (Read Side — direktes ORM)

Query Service liest direkt aus dem ORM ohne Umweg über Domain-Aggregate. **Keine Basisklasse** — direktes ORM-Lesen für Read-Seite. Der Query Service implementiert den Application-Port `I{{AggregateRoot}}QueryService`.

```python
# smarti/{{context}}/infra/adapters/query_services.py
from uuid import UUID
from dweb.dj_{{context}}.models import {{AggregateRoot}}ORM
from ...appl.dtos import {{AggregateRoot}}ReadDTO
from ...appl.ports import I{{AggregateRoot}}QueryService

class Django{{AggregateRoot}}QueryService(I{{AggregateRoot}}QueryService):
    """Read Side — kein Umweg über Domain-Aggregates. Direktes ORM-Lesen."""

    def get_by_id(self, id: UUID) -> {{AggregateRoot}}ReadDTO | None:
        try:
            orm_obj = {{AggregateRoot}}ORM.objects.get(id=id)
        except {{AggregateRoot}}ORM.DoesNotExist:
            return None
        return self._to_dto(orm_obj)

    def list_for_account(
        self, account_id: UUID, limit: int = 20, offset: int = 0
    ) -> list[{{AggregateRoot}}ReadDTO]:
        qs = (
            {{AggregateRoot}}ORM.objects
            .filter(account_id=account_id)
            .order_by("-created_at")[offset : offset + limit]
        )
        return [self._to_dto(obj) for obj in qs]

    @staticmethod
    def _to_dto(orm_obj: {{AggregateRoot}}ORM) -> {{AggregateRoot}}ReadDTO:
        return {{AggregateRoot}}ReadDTO(
            id=str(orm_obj.id),
            account_id=str(orm_obj.account_id),
            {{field}}=orm_obj.{{field}},
            status=orm_obj.status,
            created_at=orm_obj.created_at.isoformat(),
        )
```

Oft ist es sinnvoll eine Instance-Queryset für den Service zu definieren, welches dann erweitert werden kann:

```python
    ...
    def _get_base_queryset(self):
        return ProfilesModel.objects.only(
            "id", "account_id", "profile_type", "first_name",
            "school_type", "learning_type_scores",
        )

    # Portimplementierung
    def get_parent_profile_overview(self, account_id: UUID):
        try:
            qs = (
                self._get_base_queryset()
                .filter(account_id=account_id, profile_type="parent")
                .first()
            )
        ...
```

### Unit of Work (Django)

`Django{{AggregateRoot}}UnitOfWork` implementiert `I{{AggregateRoot}}UnitOfWork` (Application-Port), der wieerumg von `IUnitOfWorkSharedPort` erbt. Der `IUnitOfWorkSharedPort` stellt `__init__`, `register()`, `_dispatch_events()` und `__exit__()` (Default-Implementierung) bereit — die Subklasse muss nur `__enter__`, `commit` und `rollback` implementieren.

```python
# smarti/{{context}}/infra/adapters/uow.py
from django.db import transaction
from ...appl.ports import I{{AggregateRoot}}UnitOfWork
from .repo import Django{{AggregateRoot}}Repository # Variante 1: Initialisieren

if TYPE_CHECKING:
    from ...appl.ports import I{{AggregateRoot}}Repository

class Django{{AggregateRoot}}UnitOfWork(I{{AggregateRoot}}UnitOfWork):
    """UnitOfWork für {{AggregateRoot}} mit Django-Transaktions-Context."""
    def __init__(self, {{AggregateRoot}}_repo: I{{AggregateRoot}}Repository | None = None):
        # Variante 1: Initialisieren
        self._{{AggregateRoot}}_repo: I{{AggregateRoot}}Repository = (
            profile_repo or I{{AggregateRoot}}Repository(uow=self)
        )
        # Variante 2: lazy loading
        self._{{AggregateRoot}}_repo: I{{AggregateRoot}}Repository | None = None

        self.transaction_atomic = None  # set in __enter__
        self._committed = False
    
    # Variante 1: Initialisieren
    @property
    def {{AggregateRoot}}repo(self) -> I{{AggregateRoot}}Repository:
        return self._{{AggregateRoot}}_repo

    # Variante 2: lazy loading
    @property
    def {{AggregateRoot}}repo(self) -> I{{AggregateRoot}}Repository:
        if self._{{AggregateRoot}}repo is None:
            from {{context}}.infra.adapters.repo import (
                Django{{AggregateRoot}}Repository,
            )

            self._{{AggregateRoot}}repo = Django{{AggregateRoot}}Repository(
                uow=self
            )
        return self._{{AggregateRoot}}repo

    def __enter__(self):
        self.transaction_atomic = transaction.atomic()
        self.transaction_atomic.__enter__() 
        return self

    def commit(self) -> None:
        """Commit alle Änderungen. Darf NICHT direkt aufgerufen werden — nur über __exit__ mit with-Block."""
        self._committed = True

    def rollback(self) -> None:
        """Rollback aller Änderungen."""
        self._committed = False

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is None and self._committed:
                self._dispatch_events()
            else:
                self._aggregates.clear()
            result = self.transaction_atomic.__exit__(exc_type, exc_val, exc_tb)  # type: ignore[attr-defined]
            return result
        finally:
            self.transaction_atomic = None

    # ──────────────────────────────────────────────
    # _dispatch_events() — Sync vs Async Fehlerbehandlung:
    #   - SyncDomainEvent: Exception propagiert → Rollback
    #     (stark konsistent: Event muss erfolgreich sein)
    #   - AsyncDomainEvent: DeadLetterStore + Logger
    #     (eventual consistency: Event-Verlust ist tolerierbar)
    #   - ACL überschreibt keine Events: Übersetzt nur Modelle zwischen Contexts
    # ──────────────────────────────────────────────
    
```

#### Fake UnitOfWork (Test)

Für Unit-Tests wird "Fake-UnitOfWork" implementiert, die das gleiche Port implementiert wie der echte UoW. Damit kann der Tester Unit-Tests durchführen ohne einer Datenbankverbindung und ohne Mocks.

```python
# smarti/{{context}}/infra/adapters/fake_uow.py
from ...appl.ports import I{{AggregateRoot}}UnitOfWork

class Fake{{AggregateRoot}}UnitOfWork(I{{AggregateRoot}}UnitOfWork):
    """Fake UoW für Tests — simuliert Transaktions-Context ohne DB."""

    def __init__(self):
        super().__init__()
        self._transaction_active = True

    @property
    def transaction_atomic(self):
        """Für _validate_uow_context: transaction_atomic ist nicht None."""
        return self
```

---

### Anti-Pattern

```python
# ANTI-PATTERN 1: Repository ohne UoW instantiieren
class BadRepository:
    def __init__(self):
        self._repo = DjangoProfileRepository()  # Kein UoW → IRepositorySharedPort.__init__ wirft ValueError

    def get_by_id(self, id):
        orm_obj = ProfileORM.objects.get(id=id)
        return Profile.from_orm(orm_obj)  # Kein UoW-Context, kein Event-Dispatch

# ANTI-PATTERN 2: IRepositorySharedPort nicht nutzen → keine UoW-Validierung
class BadRepository(I{{AggregateRoot}}Repository):
    def __init__(self):  # Kein uow-Parameter
        self._mapper = {{AggregateRoot}}Mapper()

    def find_by_id(self, id):
        orm_obj = {{AggregateRoot}}ORM.objects.get(id=id)
        return self._mapper.infra_to_domain(orm_obj)  # Kein _validate_uow_context()

# ANTI-PATTERN 3: Fake Repository add() und _save() verwechseln
class BadFakeRepository(FakeRepoMixin):
    def setup_test(self):
        self._save(aggregate)  # ← FALSCH: Zählt in _save_calls, ist für Test-Setup gedacht
        # Besser: self.add(aggregate)  # ← Test-Setup, zählt nicht

# ANTI-PATTERN 4: UoW __exit__ ohne commit/rollback
class BadUnitOfWork(IUnitOfWorkSharedPort):
    def __exit__(self, exc_type, exc_val, exc_tb):
        pass  # ← FALSCH: Kein commit, kein rollback, Events werden nicht dispatchen
```

### Entscheidungsregel

1. Repository muss `IRepositorySharedPort` erben — `__init__(self, uow: IUnitOfWorkSharedPort)` ist Pflicht.
2. Repository muss `I{{AggregateRoot}}Repository` (erfüllt 1.) implementieren — Ports garantieren Interface-Konsistenz.
3. `_validate_uow_context()` muss am Anfang jeder Repository-Methode stehen — keine Operation außerhalb von UoW.
4. Fake Repository: `add()` für Test-Setup verwenden, `_save()` nur vom UoW/Handler aufgerufen werden lassen.
5. Fake Repository muss `_init_fake_store()` innerhalb der`__init__()` aufrufen — Mixin initialisiert keinen eigenen Store.
6. UoW muss Application-Port implementieren — `__enter__`/`__exit__` Context-Manager implementieren.
7. UoW `__exit__()` muss `_dispatch_events()` VOR `transaction_atomic.__exit__()` aufrufen — Domain Events werden innerhalb der Transaktion dispatchen (damit `transaction.on_commit()` für Async-Events funktioniert).
8. Sync-Event-Fehler müssen propagiert werden (`raise`) — Transaction-Rollback garantiert Datenkonsistenz
9. Async-Event-Fehler werden in `DeadLetterStore` gespeichert — kein Rollback, eventual consistency
10. ACL übersetzt Modelle zwischen Contexts — orchestriert keine Kaskaden-Operationen
11. `commit()` darf NICHT direkt aufgerufen werden — nur über `with uow:` Block. `commit()` setzt `_committed = True`.
12. Query Service hat **keine Basisklasse** — direktes ORM-Lesen, kein Umweg über Domain-Aggregate.
13. `next_identity()` ist in `IRepositorySharedPort` implementiert (UUID-V4) — Repository muss ihn nicht neu implementieren.
14. `exists()` als `bool` zurückgeben — Performance-optimiert, keine vollständige Hydration.

### Sync vs. Async Events — Fehlerbehandlung in der Infrastructure

| | Sync-Event (`SyncDomainEvent`) | Async-Event (`AsyncDomainEvent`) |
|---|---|---|
| **Ausführung** | In-Prozess, sofort | Celery Worker, async |
| **Fehlerbehandlung** | `raise` → Transaction-Rollback | `DeadLetterStore` + Logger |
| **Konsistenz** | Stark (atomar) | Eventual |
| **Warum?** | Event ist Teil der Transaktion → Fehler = Transaktion ungültig | Event wird per Retry verarbeitet → kein Rollback nötig |
| **ACL-Bezug** | Nicht betroffen — ACL übersetzt nur Modelle | Nicht betroffen — ACL übersetzt nur Modelle |

**Wann ACL verwenden (statt Sync/Async Events)?**
- ACL löst das Problem der **Model-Übersetzung** zwischen Bounded Contexts
- Beispiel: Externes `{ "status": "completed" }` → internes `OrderStatus.COMPLETED`
- ACL orchestriert KEINE Kaskaden-Operationen
- Kaskaden zwischen Contexts → Async-Event + DeadLetterStore
- Kaskaden innerhalb eines Contexts → Sync-Event

### Hinweise zur Nutzung

```python
# Korrekte Nutzung:
with uow_factory() as uow:                          # IUnitOfWorkSharedPort als Context-Manager
    repo = Django{{AggregateRoot}}Repository(uow)    # UoW übergeben
    aggregate = await repo.find_by_id(id)            # _validate_uow_context() intern
    repo.update(aggregate)                           # UoW-Context aktiv
    repo.create(new_aggregate)                       # UoW-Context aktiv
    # UoW.__exit__ → _dispatch_events() → commit → transaction auflösen
    # Sync-Events: Fehler → Rollback
    # Async-Events: Fehler → DeadLetterStore (kein Rollback)

# Fake Repository für Tests:
repo = Fake{{AggregateRoot}}Repository()
repo.add(aggregate)                                  # Test-Setup
repo._save(aggregate)                                # Simuliert UoW/Handler
assert repo.get_save_calls()[-1] == aggregate
```
