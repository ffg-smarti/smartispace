# Persistenz-Tests (Handler + Test-DB, Query Services)

Wann laden: wenn du Persistenz testest — Command-Handler mit echten Repository-/UoW-Adaptern gegen die Test-DB sowie Query Services direkt via ORM. Nicht laden für reine API-Contract-Tests (→ `endpoints.md`).

## Ablageort & Setup

- `backend/tests/integration/<domain>/test_<handler>_db.py` — z. B. `account/test_create_parent_db.py`.
- Query-Service-Tests bei der jeweiligen Domain (`test_query_services_*.py`).
- `@pytest.mark.django_db` Pflicht; `transaction=True` nur bei UoW-/Event-Commit-Prüfungen.
- Testdaten via `factory-boy`/`Faker` (`backend/tests/fixtures/`); Zeit via `freezegun`; keine harten IDs, keine Reihenfolge-Abhängigkeit.

## Muster

- **Echte Adapter:** Repository/UoW werden nicht gemockt — genau das unterscheidet Integration von Unit (`unit-test-backend/handlers-mappers.md`).
- **Repository:** Save+Load-Roundtrip (gespeichert → identisch wiedergeladen: `uid`, Kernfelder, Status) + `get_by_id` bei unbekannter ID → `None`.
- **Mapper:** Domain→Infra→Domain-Roundtrip; jedes relevante Feld einzeln prüfen (kein pauschales `restored == original`, das verdeckt Feldverschiebungen); unbekannter DB-Wert → `pytest.raises(MappingError)`.
- **Handler-Assertions:** Persistenz per DB-Read verifizieren (ORM-Model existiert), UoW-Commit prüfen, Domain-Events auf Dispatch prüfen.
- **Query Services:** direkt via ORM lesen (kein Umweg über Domain-Aggregates); Read-DTOs nur primitive Typen; N+1 via `select_related`/`prefetch_related` beachten.
- **REQ-Marker:** `@pytest.mark.requirement("REQ-…")` für Feature-Tests; rein strukturelle Tests (Roundtrips, Grundfunktionen) bewusst ohne Tag (→ R10-Ausnahme).

## Template

```python
# backend/tests/integration/account/test_create_parent_db.py
from __future__ import annotations

import pytest

pytestmark = pytest.mark.integration

@pytest.mark.django_db
class TestCreateParentDb:
    """Handler mit echter Test-DB: Persistenz + UoW-Commit."""

    def test_create_parent_persists_account(self, django_user_model):
        """REQ-ACCT-REG-001: Handler persistiert Account in der Test-DB."""
        # Given: Command mit echten VOs
        # When: Handler mit echtem Repository/UoW ausführen
        # Then: ORM-Model existiert (DB-Read), Domain-Event dispatched
        assert True  # Platzhalter für echte Handler-Verdrahtung aus *-design.md
```

## Do / Don't

- Do: nur eigene Persistenz echt testen; externe Dienste (Stripe, TTS, S3) via `responses`-Mock.
- Don't: keine HTTP-Statuscodes hier — Contract gehört in `endpoints.md`.
- Don't: keine Business-Logik im Test duplizieren — Verhalten von außen prüfen.

## Ausführung

- Via `backend-mcp: api-test` bzw. `para-test` (parallel, pytest-xdist).
- Lokaler Filter: `uv run smarti test unit-test -- backend/tests/integration/<domain>/ -k <name>`.
