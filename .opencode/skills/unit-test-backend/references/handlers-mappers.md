# Handler- & Mapper-Tests (Application, isoliert)

Wann laden: wenn du Application-Verhalten testest — Command-/Query-Handler und DTO→Command-Mapper, isoliert mit Fakes (ohne DB). Nicht laden für reine Domain-Tests (→ `domain-model.md`).

## Ablageort & Setup

- `backend/tests/unit/<domain>/appl/test_<handler>.py` — z. B. `account/appl/test_login.py`; Mapper-Tests als `test_<mapper>.py` daneben.
- Fakes: `FakeRepoMixin` aus `smarti/shared/infra/adapter/repo.py` bzw. domänenspezifischer Fake; UoW als In-Memory-Fake mit `commit()`-Flag; externe Dienste (Hasher, Mail, Clock) als einfache Fakes.
- Runner wie in `domain-model.md` (pytest, `--cov` aktiv).

## REQ-Mapping

- Wie in `domain-model.md`: `@pytest.mark.requirement("REQ-…")` pro Feature-Test, Naming `test_<aktion>_when_<bedingung>_returns_<erwartung>`.
- Pro Handler mindestens: Happy-Path (Success + UoW-Commit + Event-Dispatch), fachliche Regelverletzung (Failure mit `ErrorCode`), akkumulierte Failures bei unabhängigen Prüfungen (`Failure(errors=(...))` mit Code-Menge).
- Ob ein Handler akkumuliert, ergibt sich aus dem Design (unabhängige vs. sequentielle Prüfungen) — nur dann den Akkumulations-Test erzeugen.

## Muster (Projekt-Result-API: `rules/backend.md` gilt)

- **Handler:** fail-fast bei abhängigen Prüfungen; unabhängige Validierungen akkumulieren in `Failure(errors=(...))` — es gibt kein `FailureCollection`. Assertions auf `Success`/`Failure` + `result.errors` (Tupel) + `commit()`-Flag + `collect_domain_events()`.
- **Fakes:** Repository-Fakes erben immer von `BaseFakeRepository` — nie ein Mock-Framework für Repository-Ersatz verwenden. UoW als In-Memory-Fake mit `commit()`-Flag; externe Dienste (Hasher, Mail, Clock) als einfache Fakes.
- **Mapper (Unit-Anteil):** dünn prüfen — `_dispatch`-Routing, `Result[Command]`-Return, None-Guard für optionale Felder; kein try/catch im Test umgehen. Mapper-Roundtrips gegen echte DB gehören in `integration-test-backend` (`persistence.md`).
- **Isolation:** keine Django-DB (`@pytest.mark.django_db` verboten), kein ORM, kein `dweb/`-Import; Zeit via `freezegun`.

## Template

```python
# backend/tests/unit/account/appl/test_login.py
from __future__ import annotations

import pytest

pytestmark = pytest.mark.unit

class TestLoginHandler:
    """Spec §3: Login-Handler — Happy-Path, Failure, Commit."""

    @pytest.mark.requirement("REQ-ACCT-LOGIN-001")
    def test_handle_when_valid_returns_success_and_commits(self):
        """REQ-ACCT-LOGIN-001: gültige Credentials → Success + Commit + Event."""
        repo = FakeAccountRepository.with_parent(username="parent")
        uow = FakeUnitOfWork(repo)
        handler = LoginHandler(repo, uow, FakePasswordHasher())

        result = handler.handle(LoginCommand(username="parent", password="Parent123"))

        assert isinstance(result, Success)
        assert uow.committed is True
        assert uow.collected_events != []
```

## Do / Don't

- Do: echte Command-/DTO-Namen aus Spec/Design, keine Platzhalter.
- Don't: keine echte Persistenz — das gehört in `integration-test-backend` (`persistence.md`).
- Don't: keine HTTP-Statuscodes im Handler-Test.

## Ausführung

- Einzeln: `uv run smarti test unit-test -- -k <name>` bzw. via `backend-mcp: unit-test`.
- Parallel: `backend-mcp: para-test` (pytest-xdist).
