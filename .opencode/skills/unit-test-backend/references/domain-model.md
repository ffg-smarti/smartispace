# Domain-Model-Tests (Aggregate, Value Objects, Events)

Wann laden: wenn du Domain-Verhalten testest — Aggregate-Root, Entities, Value Objects, Domain Events, Enums. Nicht laden für reine Handler-/Mapper-Tests (→ `handlers-mappers.md`).

## Ablageort & Setup

- `backend/tests/unit/<domain>/domain/test_<aggregate>.py` — z. B. `account/domain/test_account.py`.
- Fakes/Fixtures: `backend/tests/unit/conftest/` bzw. `backend/tests/fixtures/`.
- Runner: `pytest>=8.3,<9.0` + `pytest-django>=4.11,<5.0` (`backend/pyproject.toml`); `--cov` bereits aktiv.

## REQ-Mapping

1. Lies `*-spec.md` §3.1 (Happy-Path), §3.2 (Regeln), §3.3 (Edge Cases).
2. Testmatrix: `REQ-ID → Testklasse → Testmethode(n)`; pro §3.1-Zeile ein Happy-Path-Test, pro §3.2-Regel ein Failure-Test, pro §3.3-Edge-Case ein Grenztest.
3. Jeder Test trägt `@pytest.mark.requirement("REQ-…")` und die Naming-Konvention `test_<aktion>_when_<bedingung>_returns_<erwartung>`.

## Muster (Projekt-Result-API: `rules/backend.md` gilt, nicht Doc-7-Schreibweise)

- **Result-Assertions:** `isinstance(result, Success)` / `isinstance(result, Failure)` + Prüfung auf `result.errors` (Tupel, mindestens ein Element). Fehlercodes sind `ErrorCode`-Werte (z. B. `ErrorCode.NOT_A_GUEST`); kein HTTP-Status, kein `error_type`-Mix im Domain-Layer. Es gibt kein `FailureCollection` — Akkumulation ist `Failure(errors=(...))`.
- **Invarianten (Entwicklerfehler):** VO-Konstruktoren werfen (`ValueError`/`ValueObjectError`) → mit `pytest.raises(...)` prüfen.
- **Events:** nach Zustandswechsel `_raise_event(...)` auslösen; im Test via `collect_domain_events()` prüfen (inkl. Leeren nach Read: zweiter Aufruf gibt `[]`).
- **Zeit:** Datumslogik via `freezegun.freeze_time` determinieren.
- **Datei-Header:** jede `.py`-Datei beginnt mit `# <import-path>`; Strings in `"doppelten Anführungszeichen"`.
- **Strukturelle Tests** (VO-Invarianten) tragen bewusst keinen Requirement-Tag (→ R10-Ausnahme); Feature-Tests schon.

## Entscheidungstabelle — was wird wie getestet

| Baustein | Testfälle (alle Pflicht) | Assertion-Ziel |
|---|---|---|
| Value Object — Constructor | Ein Test pro ungültigem Primitiv-Typ (`None`, leerer String, falscher Typ) | `pytest.raises(...)` |
| Value Object — `create()` (nur falls vorhanden) | Ein Test pro Business-Regel-Verletzung + ein Test für gültige Kombination | `Failure` mit `ErrorCode` / `Success` |
| Aggregate-Methode | Ein Test pro Invariante-Verletzung, ein Test pro gültigem Übergang, ein Test pro ungültigem Übergang | `Failure`/`Success` + `collect_domain_events()` |

## Template

```python
# backend/tests/unit/account/domain/test_account.py
from __future__ import annotations

import pytest

pytestmark = pytest.mark.unit

class TestGuestAccountSetEmail:
    """Spec §2.5.2 + §5: Account.set_guest_email() — E-Mail setzen."""

    def test_set_guest_email_when_valid_returns_success(self):
        """REQ-FFG-GUEST-R01: Erfolgreiches Setzen der E-Mail auf GUEST."""
        guest = Account.create_guest()
        guest.collect_domain_events()
        email = vo.EmailPolicy(value="parent@example.com")

        result = guest.set_guest_email(email)

        assert isinstance(result, Success)
        assert guest.email is not None
        assert guest.email.value == "parent@example.com"

    def test_convert_when_non_guest_returns_failure(self):
        """Nicht-GUEST kann nicht konvertiert werden → NOT_A_GUEST."""
        hasher = FakePasswordHasher()
        parent = Account.create_parent_account(
            userid=IdFactory.account_id(),
            username=vo.UsernamePolicy(value="parent"),
            email=vo.EmailPolicy(value="parent@example.com"),
            plain_password=vo.PasswordPolicy(value="Parent123"),
            hasher=hasher,
            birthdate=datetime.now(UTC).date() - timedelta(days=365 * 30),
        )

        result = parent.convert_to_full_account(enums.UserType.PARENT)

        assert isinstance(result, Failure)
        assert result.errors[0].code == ErrorCode.NOT_A_GUEST

    @pytest.mark.requirement("REQ-FFG-GUEST-001")
    def test_create_guest_sets_correct_fields(self):
        """REQ-FFG-GUEST-001: create_guest() setzt Username, PENDING_VERIFICATION, data_expires_at."""
        guest = Account.create_guest()

        assert guest.username.value.startswith("guest_")
        assert guest.status == vo.AccountStatusValue.PENDING_VERIFICATION
        assert guest.data_expires_at is not None
        expected = guest.created_at + timedelta(days=30)
        assert abs((guest.data_expires_at - expected).total_seconds()) < 1
```

## Do / Don't

- Do: `from __future__ import annotations` als ersten Import; keine DB, kein Netzwerk, kein Filesystem.
- Don't: kein `@pytest.mark.django_db`, kein ORM-Import, kein `dweb/`-Import.
- Don't: keine HTTP-Statuscodes, keine ErrorResponse-Struktur — das gehört in `integration-test-backend`.

## Ausführung

- Einzeln: `uv run smarti test unit-test -- -k <name>` bzw. via `backend-mcp: unit-test`.
- Parallel: `backend-mcp: para-test` (pytest-xdist).
