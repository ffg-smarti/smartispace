# Journeys-Base (Gerüst + Zweig-Entscheidung)

Pflichtlektüre für jede E2E-Aufgabe. Danach genau ein Zweig nach Prüfling (ADR-004 wird ignoriert — beide Toolchains sind zugelassen, es zählt die einfachere Testbarkeit):

- Prüfling **backend-verankert** (Auth, Content-CRUD, Session-Lifecycle mit DB-Beteiligung) → Python `pytest-playwright` unter `backend/tests/e2e/test_<seite_oder_flow>.py` (siehe „Python-Zweig" unten).
- Prüfling **frontend-verankert** (Player-Interaktion, Routing, kids-A11y) → TS-Playwright co-located, dazu genau eine App-Datei: `kids-journeys.md` *oder* `parent-journeys.md`. Nie beide App-Dateien gleichzeitig.

## Ablageorte & Dienste (Projekt-Ports gelten, nicht Doc-7-Ports)

- Python-E2E: `backend/tests/e2e/test_<seite_oder_flow>.py` — Marker `@pytest.mark.playwright` (+ `@pytest.mark.requirement("REQ-…")` für Feature-Tests).
- TS-Journeys: `apps/kids/e2e/<domain>/<feature>.spec.ts` bzw. `apps/parent/e2e/<domain>/<feature>.spec.ts`.
- Ports: Backend `localhost:8000`, parent `localhost:8080`, kids `localhost:8081`.
- Dienste: Backend (`uv run smarti dj runserver`) + jeweilige App (`npm run dev --workspace=apps/<name>`) müssen laufen oder via `docker compose up` bereitstehen. In CI (`CI=true`) stellen die Workflows die Server bereit — Fixtures starten sie dann nicht selbst.

## Journey-Gerüst (Setup → Aktion → Assert)

- **Scope:** eine Datei pro Feature-Journey; ein Test = ein Pfad durch Spec §3.1 (Pflicht) bzw. kritische §3.3-Edge-Cases. Keine E2E für jede §3.2-Regel — Regeln gehören in Unit/Integration.
- **Happy + Error pro Flow:** pro Seiten-Flow mindestens zwei Tests — Happy-Path (Erfolg → sichtbarer Zielzustand) + Error-Path (Fehler bleibt auf der Seite, Fehlermeldung sichtbar, kein Redirect).
- **Setup:** frischen Nutzer/Datensatz seeden (Backend-Fixture oder Setup-API), danach Login-Helper (TS: aus `e2e/helpers/`; Python: `logged_in_parent`-Fixture in `conftest.py`). Secrets/Token nur via ENV, nie hardcoded — keine Klartext-Credentials im Test.
- **Aktion:** User-Schritte in sichtbarer Reihenfolge (z. B. Login → Aktion).
- **Assert:** sichtbares Ergebnis (Auto-Retry) + wo nötig API-Seiteneffekt; Netzwerk nur via Response-Assertions.

## Python-Zweig (pytest-playwright)

```python
# backend/tests/e2e/test_auth.py
import pytest

pytestmark = pytest.mark.playwright


def test_parent_login_success(page, logged_in_parent):
    """REQ-ACCT-LOGIN-001: Happy Path → Redirect auf Dashboard."""
    page.wait_for_url("**/parent/dashboard**")
    assert "/parent/dashboard" in page.url


def test_parent_login_wrong_password(page):
    """Error Path: falsches Passwort → Fehlermeldung, kein Redirect."""
    page.goto("/login")
    page.get_by_label("E-Mail").fill("parent@example.com")
    page.get_by_label("Passwort").fill("falsches-passwort")
    page.get_by_role("button", name="Anmelden").click()
    assert "/login" in page.url
    page.get_by_role("alert").wait_for()
```

- Fixtures (`logged_in_parent`, Server-Fixtures, Verfügbarkeits-Fixtures wie `postgres_available`): zentral in Shared-Fixtures (per `pytest_plugins` geladen), nicht in der Testdatei definieren. Startet ein Test einen externen Server oder prüft eine Dienst-Verfügbarkeit, gehört die Fixture dorthin.
- Ausführung: `pytest backend/tests/e2e/`, einzeln `pytest backend/tests/e2e/test_auth.py::test_parent_login_success`, Debugging `--headed`, nur Playwright `-m playwright`, ohne Slow `-m "not slow".

## Selektoren (Priorität)

1. `page.getByRole("button", { name: /anmelden/i })` — Rollen + sichtbarer Name.
2. `page.getByLabel(...)` — Formularfelder.
3. `page.getByText(...)` — statische Inhalte.
- Verboten: CSS-Klassen, XPath, `nth()` ohne Not, `waitForTimeout`, `data-testid`-Inflation.

## Isolation & Stabilität

- Eigene Testnutzer/-daten pro Test, kein Shared-State, kein Parallel-Schreiben auf dieselbe Entität; nach dem Test aufräumen; keine festen Produktions-IDs.
- Flaky-Verbot: kein fester Sleep, keine order-abhängigen Tests.
- Keine externen Dienste (Zahlung, TTS) live treffen — Test-Mode/Stubs.

## Ausführung

- Python-Zweig: `pytest backend/tests/e2e/` (siehe Befehle oben).
- TS-Zweig: via `ffg-mcp: e2e-test` (kids) / `smarti-mcp: e2e-test` (parent); lokal `npx playwright test e2e/<domain>/<feature>.spec.ts --project=chromium`.
