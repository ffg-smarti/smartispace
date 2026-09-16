# Endpoint-Tests (Ninja, JWT, Error-Contract)

Wann laden: wenn du API-Verträge testest — Ninja-Endpoints über den Test-Client inkl. JWT-Auth und Standard-Error-Contract. Nicht laden für reine DB-/Handler-Persistenz (→ `persistence.md`).

## Ablageort & Setup

- `backend/tests/integration/<domain>/test_<feature>_api.py` — z. B. `account/test_parent_login_api.py`.
- Runner: `pytest` mit `DJANGO_SETTINGS_MODULE=dsmarti.settings` (`backend/pyproject.toml`).
- `@pytest.mark.django_db` auf Klassen-/Testebene; `@pytest.mark.requirement("REQ-…")` pro Test.

## Muster

- **Client:** `ninja.testing.TestClient(router)`; `operation_id`-stabile Routen aus `*-design.md` §1.3/§1.5.
- **Auth:** JWT via `django-ninja-jwt` (`Authorization: Bearer <token>`); Negativfälle Pflicht: ohne Token → 401, falsche Rolle → 403.
- **Error-Mapping:** `VALIDATION→422`, `NOT_FOUND→404`, `CONFLICT→409`, `PRECONDITION_FAILED→412`, `UNAUTHORIZED→401`, `FORBIDDEN→403` (vgl. `rules/backend.md`).
- **Contract:** Success → Status (200/201) + Read-DTO-Felder; Failure → Status + `{"errors": [{"code": "...", ...}]}` + `field`-Prüfung bei 422. Der `code` stammt aus dem `ErrorCode`-Mapping in `dweb/dsmarti/api_errors.py` (`map_failure`); feine Codes bevorzugen, grobe Kategorien nur als Fallback (→ `result-pattern` §2).
- **Mindestabdeckung pro neuem/geändertem Endpoint:** Happy-Path (2xx), Auth-Fehler (401/403) und ein fachlicher Failure (4xx mit `code`-Prüfung).
- **Isolation:** pro Test eigene Daten via `factory-boy`/`Faker` (`backend/tests/fixtures/`); keine Reihenfolge-Abhängigkeit; externe Dienste (Stripe, TTS, S3) via `responses`-Mock.

## Template

```python
# backend/tests/integration/account/test_parent_login_api.py
from __future__ import annotations

import pytest
from ninja.testing import TestClient

from dweb.account.api.endpoints import router

pytestmark = pytest.mark.integration

@pytest.mark.django_db
class TestParentLoginApi:
    """Spec §3.1 + §5: POST /account/login — Happy-Path, Auth, Failure-Contract."""

    def test_login_when_valid_returns_200(self):
        """REQ-ACCT-LOGIN-001: gültige Credentials → 200 + Token."""
        client = TestClient(router)
        response = client.post(
            "/login", json={"username": "parent", "password": "Parent123"}
        )

        assert response.status_code == 200
        assert "access" in response.json()

    def test_login_without_token_on_protected_route_returns_401(self):
        """REQ-ACCT-AUTH-002: geschützte Route ohne Token → 401."""
        client = TestClient(router)
        response = client.get("/me")

        assert response.status_code == 401

    def test_login_when_wrong_password_returns_error_contract(self):
        """REQ-ACCT-LOGIN-003: falsches Passwort → 4xx + {"errors": [{"code": ...}]}."""
        client = TestClient(router)
        response = client.post(
            "/login", json={"username": "parent", "password": "Wrong123"}
        )

        assert response.status_code in (401, 403, 422)
        body = response.json()
        assert "errors" in body
        assert body["errors"][0]["code"]
```

## Do / Don't

- Do: echte Routen-/DTO-Namen aus Spec/Design, keine Platzhalter; `select_related`/`prefetch_related`-Verhalten bei Listen-Endpoints beachten.
- Do: jeder neue/geänderte Endpoint braucht Happy-Path (2xx), Auth-Fehler (401/403) und einen fachlichen Failure (4xx mit `code`).
- Don't: keine Domain-Interna (Aggregate-Zustand) über HTTP behaupten — nur Contract + sichtbare Seiteneffekte.
- Optional: `schemathesis` für automatische Contract-Validierung aller Endpoints.

## Ausführung

- Via `backend-mcp: api-test` (einzelne API-Suite) bzw. `para-test` (parallel, pytest-xdist).
- Lokaler Filter: `uv run smarti test unit-test -- backend/tests/integration/<domain>/ -k <name>`.
