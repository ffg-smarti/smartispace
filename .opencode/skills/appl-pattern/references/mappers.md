# SMARTi Backend Code Templates (Coder) - Application

Konkrete, implementierungsfertige Code-Templates application Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/appl/mappers/`.

---

## Application Layer

### Mapper (DTO → Command / Query)

Mapper übersetzen validierte DTOs in validierte Commands oder Queries. Sie sind der einzige Ort, an dem primitive DTO-Werte in ValueObjects überführt werden.

Beide Mapper-Typen erben von `DtoMapperBase` (in `# smarti/shared/appl/mapper.py`):
- `CommandMapperBase` → `DtoMapperBase[BaseCommandPydantic]`
- `QueryMapperBase` → `DtoMapperBase[QueryBasePydantic]`

Mapper müssen:

* zustandslos sein (keine Repository-, Service- oder DB-Referenzen als Instanzvariablen)
* von `CommandMapperBase` oder `QueryMapperBase` erben
* pro Aggregat/Kontext genau eine Mapper-Klasse sein, die per Dispatch mehrere DTO-Typen auf mehrere Command-/Query-Typen abbildet
* keine Business Rules validieren, die Repository- oder DB-Zugriff brauchen (das bleibt Aufgabe des Handlers)
* Fehler beim **Zusammenbauen von ValueObjects** (Invariante verletzt) über `Result`/`Failure` zurückgeben — **nicht** raisen
* fehlende Dispatch-Registrierung als Programmierfehler behandeln (raisen ist hier ok, siehe unten)
* werden mehrere ValueObjects in einer `map_*`-Methode gebaut, laufen sie über `VO.create(...)` + `combine(...)` (siehe Value-Object-Regeln), damit alle Feldfehler gesammelt zurückkommen — nicht nur der erste

**Namenshinweis:** `Result` selbst hat bereits eine Methode `map()` (Functor-Transformation der Success-Werte, z. B. `result.map(lambda cmd: ...)`). Das ist etwas anderes als `CommandMapperBase.map()` (DTO → Command). Beide heißen zufällig gleich, kollidieren aber nicht im Code, da es unterschiedliche Klassen sind — nur beim Lesen/Reviewen lohnt sich die kurze gedankliche Unterscheidung.

#### `CommandMapperBase` Basisklasse für Command-Mapper

Jeder Command-Mapper muss von `CommandMapperBase` erben, definiert in: `# smarti/shared/appl/mapper.py`.

Zur Abstraktion: map() ist die für alle Mapper identische Template-Method-Logik (Dispatch nachschlagen, Methode aufrufen, ValidationError in Failure übersetzen) und bleibt konkret — sie soll von Subklassen nicht überschrieben werden. `_dispatch` ist abstrakt. Ein Subklassen-Klassenattribut `_dispatch = {...}` überschreibt die abstrakte Property vollständig und erfüllt die Abstraktion ganz normal.

#### Konkreter Command Mapper

```python
# smarti/{{context}}/appl/mappers/cmd_mappers.py
from __future__ import annotations

from smarti.shared.appl.mapper import CommandMapperBase
from smarti.shared.result import Result, Success
from smarti.shared.objects import AccountId
from smarti.shared.exceptions import BaseFailure

from ..dtos import CardBatchCreateDTO, CardItemCreateDTO
from ..commands.{{context}}_commands import CreateCardBatchCommand, CreateCardItemCommand
from ..domain.objects import {{ValueObject}}


class {{AggregateRoot}}CmdMapper(CommandMapperBase):
    _dispatch: dict[type, str] = {
        CardBatchCreateDTO: "map_card_batch_create",
        CardItemCreateDTO: "map_card_item_create",
    }

    # =========================================================================
    # MAP METHODS
    # =========================================================================

    def map_card_item_create(
        self, dto: CardItemCreateDTO
    ) -> Result[CreateCardItemCommand, BaseFailure]:
        """Map CardItemCreateDTO to CreateCardItemCommand."""

        {{value_object}} = self._build_{{value_object}}(dto)

        return Success(
            CreateCardItemCommand(
                account_id=AccountId(value=dto.account_id),
                {{field}}={{value_object}},
            )
        )

    # Map-Methode mit 'combine()'
    def map_card_item_create(
        self, dto: CardItemCreateDTO
    ) -> Result[CreateCardItemCommand, BaseFailure]:
        """Map CardItemCreateDTO to CreateCardItemCommand."""

        combined = combine(
            AccountId.create(value=dto.account_id),
            {{ValueObject}}.create(value=dto.{{field}}),
        )
        if combined.is_failure:
            return Failure(tuple(BaseFailure(str(e)) for e in combined.errors))

        account_id, {{value_object}} = combined.values[0]
        return Success(
            CreateCardItemCommand(
                account_id=account_id,
                {{field}}={{value_object}},
            )
        )

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    def _build_{{value_object}}(self, dto: CardItemCreateDTO) -> {{ValueObject}}:
        """Baut ein ValueObject aus DTO-Rohwerten.

        Wirft pydantic.ValidationError bei Invariantenverletzung -
        wird von `map()` in ein Result.Failure übersetzt.
        """
        return {{ValueObject}}(...)
```

#### Anti-Pattern

```python
class CardCmdMapper(CommandMapperBase):
    def map_card_item_create(self, dto: CardItemCreateDTO) -> Result[CreateCardItemCommand, BaseFailure]:
        if not self._repo.exists(dto.account_id):      # Repository im Mapper -> verboten
            return Failure(...)

        value_object = self._build_value_object(dto)
        if value_object is None:
            raise MappingError(...)              # sollte Failure sein, kein raise

        return Success(CreateCardItemCommand(...))

# besser: Repository-Prüfung gehört in den Handler, nicht in den Mapper.
# ValueObject-Fehler laufen über ValidationError -> von map() automatisch als Failure behandelt.
```

#### Entscheidungsregel

1. Wenn eine Übersetzung DTO → ValueObject/Command ohne externen State (DB/Repository) möglich ist, gehört sie in eine `map_*`-Methode des Mappers.
2. Wenn eine Prüfung Repository- oder DB-Zugriff braucht, gehört sie nicht in den Mapper, sondern in den Handler.
3. Schlägt die Konstruktion eines ValueObjects fehl (Invariante verletzt), gibt der Mapper `Failure(BaseFailure(...))` zurück — kein `raise`.
4. Fehlt ein Dispatch-Eintrag für einen DTO-Typ, ist das ein Programmierfehler und darf raisen (kein Result nötig, da kein Aufrufer das zur Laufzeit sinnvoll behandeln könnte).
5. Ein Mapper referenziert nie Repositories, Services oder andere Infrastrukturobjekte als Instanzzustand.
6. map() wird nie überschrieben — sie enthält die für alle Mapper identische Dispatch- und Fehlerbehandlungslogik. Jede Subklasse definiert stattdessen _dispatch (überschreibt die abstrakte Property der Basisklasse als einfaches Klassenattribut); ohne das schlägt bereits die Instanziierung fehl.

```python
# smarti/{{context}}/appl/mappers/cmd_mappers.py
from ..dtos import Create{{AggregateRoot}}DTO
from ..commands.{{context}}_commands import Create{{AggregateRoot}}Command
from ..domain.objects import {{ValueObject}}
from smarti.shared.objects import AccountId
from smarti.shared.appl.mapper import CommandMapperBase
from smarti.shared.result import Result, Success

class {{AggregateRoot}}CmdMapper(CommandMapperBase):
    _dispatch: dict[type, str] = {
        CardBatchCreateDTO: "map_card_batch_create",
        CardItemCreateDTO: "map_card_item_create",
        ...
    }

    def map(self, dto: BaseDTOPydantic) -> Result[BaseCommandPydantic, BaseFailure]:
        method_name = self._dispatch.get(type(dto))
        if method_name is None:
            raise MappingError(f"Kein Mapping fuer DTO-Typ: {type(dto).__name__}")

        method = getattr(self, method_name)
        return method(dto)

    # =========================================================================
    # MAP METHODS
    # =========================================================================

    def map_card_item_create(
        self, dto: CardItemCreateDTO
    ) -> Result[CreateCardItemCommand, BaseFailure]:
        """Map CardItemCreateDTO to CreateCardItemCommand. """

        {{type}} = self._build_{{type}}()

        return Success(
            CreateCardItemCommand(
                ...
            )
        )

    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    def _build_{{type}}() -> {{type}}:
        ..
```

---

### Mapper (DTO → Query)

Query-Mapper übersetzen validierte DTOs in validierte Queries. Sie folgen exakt demselben Muster wie Command-Mapper, erben aber von `QueryMapperBase` statt `CommandMapperBase`.

Queries sind Read-Objekte — sie transportieren keine geschäftliche Absicht, sondern nur Suchparameter. Daher:
- `QueryMapperBase` erbt von `DtoMapperBase[QueryBasePydantic]`
- `QueryBasePydantic` hat kein `created_at`-Feld (Value-Equality + Cache-Key)
- Query-Mapper brauchen keine Autorisierungs-Logik (die gehört in den Handler)
- Query-Mapper verwenden wiederverwendbare ValueObjects (Pagination, SortOrder) statt roher Parameter

#### `QueryMapperBase` Basisklasse für Query-Mapper

Jeder Query-Mapper muss von `QueryMapperBase` erben, definiert in: `# smarti/shared/appl/mapper.py`.

```python
# smarti/{{context}}/appl/mappers/query_mappers.py
from __future__ import annotations

from smarti.shared.appl.mapper import QueryMapperBase
from smarti.shared.appl.command import QueryBasePydantic
from smarti.shared.result import Result, Success
from smarti.shared.exceptions import BaseFailure
from smarti.shared.objects import AccountId

from ..dtos import ListNotificationsDTO
from ..commands.{{context}}_commands import ListNotificationsQuery
from ..domain.objects import Pagination, SortOrder


class {{AggregateRoot}}QueryMapper(QueryMapperBase):
    _dispatch: dict[type, str] = {
        ListNotificationsDTO: "map_list_notifications",
    }

    def map_list_notifications(
        self, dto: ListNotificationsDTO
    ) -> Result[ListNotificationsQuery, BaseFailure]:
        """Map ListNotificationsDTO to ListNotificationsQuery."""

        pagination = Pagination(page=dto.page, page_size=dto.page_size)
        sort = SortOrder(field=dto.sort_field, descending=dto.sort_descending)

        return Success(
            ListNotificationsQuery(
                account_id=AccountId(value=dto.account_id),
                status=dto.status,
                pagination=pagination,
                sort=sort,
            )
        )
```

#### Beispiel: Query-Mapper mit ValueObjects

```python
# smarti/notification/appl/mappers/query_mappers.py
from __future__ import annotations

from smarti.shared.appl.mapper import QueryMapperBase
from smarti.shared.appl.command import QueryBasePydantic
from smarti.shared.result import Result, Success
from smarti.shared.exceptions import BaseFailure
from smarti.shared.objects import AccountId, NotificationId
from smarti.shared.domain.object import Pagination, SortOrder

from ..dtos import ListNotificationsDTO, GetNotificationDTO
from ..commands.{{context}}_commands import ListNotificationsQuery, GetNotificationQuery
from ..domain.enums import NotificationStatus


class NotificationQueryMapper(QueryMapperBase):
    _dispatch: dict[type, str] = {
        GetNotificationDTO: "map_get_notification",
        ListNotificationsDTO: "map_list_notifications",
    }

    def map_get_notification(
        self, dto: GetNotificationDTO
    ) -> Result[GetNotificationQuery, BaseFailure]:
        """Map GetNotificationDTO to GetNotificationQuery."""

        return Success(
            GetNotificationQuery(
                notification_id=NotificationId(value=dto.notification_id),
                account_id=AccountId(value=dto.account_id),
            )
        )

    def map_list_notifications(
        self, dto: ListNotificationsDTO
    ) -> Result[ListNotificationsQuery, BaseFailure]:
        """Map ListNotificationsDTO to ListNotificationsQuery."""

        pagination = Pagination(page=dto.page, page_size=dto.page_size)
        sort = SortOrder(field=dto.sort_field, descending=dto.sort_descending)

        return Success(
            ListNotificationsQuery(
                account_id=AccountId(value=dto.account_id),
                status=dto.status,
                pagination=pagination,
                sort=sort,
            )
        )
```

#### Anti-Pattern

```python
class ListNotificationsQueryMapper(QueryMapperBase):
    def map_list_notifications(self, dto: ListNotificationsDTO) -> Result[ListNotificationsQuery, BaseFailure]:
        return Success(
            ListNotificationsQuery(
                account_id=dto.account_id,       # str statt AccountId -> kein VO
                page=dto.page,                    # rohe Pagination statt VO -> Duplikation
                page_size=dto.page_size,
                created_at=datetime.now(),        # zerstört Value-Equality/Cache-Key
            )
        )

    def requesting_user_is_admin(self) -> bool:   # Autorisierung gehört in den Handler, nicht in die Query
        ...

# besser: siehe Beispiel oben - AccountId als VO, Pagination/SortOrder als VOs,
# kein Zeitstempel-Feld, keine Autorisierungslogik im Mapper/Query.
```

#### Entscheidungsregel

1. Wenn eine Übersetzung DTO → Query ohne externen State (DB/Repository) möglich ist, gehört sie in eine `map_*`-Methode des Mappers.
2. Query-Mapper verwenden ValueObjects (Pagination, SortOrder, IDs) statt roher primitiver Typen.
3. Query-Mapper enthalten kein `created_at`-Feld — Queries müssen wertgleich und cachebar sein.
4. Schlägt die Konstruktion eines ValueObjects fehl (Invariante verletzt), gibt der Mapper `Failure(BaseFailure(...))` zurück — kein `raise`.
5. Fehlt ein Dispatch-Eintrag für einen DTO-Typ, ist das ein Programmierfehler und darf raisen.
6. Query-Mapper enthalten keine Autorisierungslogik (die gehört in den Query-Handler).
7. Ein Mapper referenziert nie Repositories, Services oder andere Infrastrukturobjekte als Instanzzustand.
8. map() wird nie überschrieben — sie enthält die für alle Mapper identische Dispatch- und Fehlerbehandlungslogik. Jede Subklasse definiert stattdessen _dispatch.
