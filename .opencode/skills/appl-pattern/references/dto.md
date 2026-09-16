# SMARTi Backend Code Templates (Coder) - Application

Konkrete, implementierungsfertige Code-Templates application Schicht. **Für Coder**. Platzhalter in `{{doppelten Klammern}}` ersetzen.

**Zielstruktur:** DDD-Layer unter `backend/src/smarti/<context>/appl/dtos.py`.

---

## Application Layer

### DTOs

DTOs Sind reine Data Transfer Objects.

DTOs müssen:

* immutable sein
* serialisierbare Datenwerte enthalten
* von `BaseDTOPydantic` (`# smarti/shared/appl/dto.py`) erben
* keine Businesslogik enthalten
* keine Infrastruktur- oder Runtime-Objekte enthalten

#### Erlaubte Datentypen:
- `str`
- `int`
- `float`
- `bool`
- `None`
- `tuple[...]`
- `list[...]`
- `dict[str, ...]`
- `datetime`
- `date`
- `UUID`
- `Decimal`
- `Enum`

DTOs sind immutable. Collections sollen, sofern möglich, immutable Typen wie `tuple` verwenden. `list` und `dict` nur, wenn sie Teil des tatsächlichen Transportvertrags sind.
Enums sind ausdrücklich zulässig.

DTOs dürfen keine beliebigen Runtime- oder Infrastrukturtypen enthalten, z. B.:

* `Path`
* Django Models
* QuerySets
* Services
* Repositories
* Request-/Response-Objekte
* beliebige Infrastrukturobjekte

#### Validierung

Pydantic darf und soll strukturelle Input- und Output-Validierung durchführen.

Beispiele:

* Typprüfung
* Pflichtfelder
* optionale Felder
* Formatvalidierung
* Parsing von `UUID`, `datetime`, `Decimal`, `Enum` usw.

Fehler dieser strukturellen DTO-Validierung führen zu `DtoValidationError` über `BaseDTOPydantic`.

DTOs dürfen **keine Business Rules** validieren.

Business Rules gehören in Domain/Application-Logik und werden über das Result Pattern behandelt:

Das ist also in DTOs Verboten: 

```python
@field_validator("email")
def email_must_not_be_already_registered(...):
    ...
```

#### `BaseDtoPydantic` Basisklasse für DTOs

Jedes Application-DTO muss von `BaseDTOPydantic` erben, definiert in: `# smarti/shared/appl/dto.py`.



```python
# smarti/{{context}}/appl/dtos.py
from smarti.shared.base import BaseDTOPydantic
from uuid import UUID

class Create{{AggregateRoot}}DTO(BaseDTOPydantic):
    account_id: UUID
    {{field}}: str

class {{AggregateRoot}}ReadDTO(BaseDTOPydantic):
    """Read DTO für die API-Antwort."""

    id: UUID
    account_id: UUID
    {{field}}: str
```

#### Beispiele

```python
# smarti/notification/domain/enums.py
from __future__ import annotations

class NotificationStatus(StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# smarti/notification/appl/dtos.py
from __future__ import annotations

from uuid import UUID
from smarti.shared.base import BaseDTOPydantic
from ..domain.enums import NotificationStatus



class NotificationResultDto(BaseDTOPydantic):
    """REQ-NOTIFICATION §4.1 Response-DTO nach CreateNotification.

    Enthält notification_id und Status für den Aufrufer.
    Wird vom CreateNotificationHandler zurückgegeben.

    - notification_id:  Eindeutige ID der erstellten Notification.
    - status:           Status der Notification (PENDING / SKIPPED).
    """

    notification_id: UUID
    status: NotificationStatus

```

#### Anti-Pattern


```python
class FileDTO(BaseDTOPydantic):
    path: Path

# besser
class FileDTO(BaseDTOPydantic):
    path: str

# dann beim Mappen zu einem Command
path = Path(dto.path)
```

### Entscheidungsregel

1. Wenn ein Feld im DTO einen Wert transportiert, ist es zulässig.
2. Wenn ein Feld ein Runtime-Objekt oder Infrastrukturobjekt transportiert, gehört es nicht ins DTO.
3. Wenn eine Validierung nur die Form bzw. den Datentyp der Eingabe betrifft, gehört sie ins Pydantic-DTO.
4. Wenn eine Validierung eine Business Rule betrifft, gehört sie nicht ins DTO, sondern in Domain/Application-Logik.
