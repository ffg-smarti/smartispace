---
paths:
  - "backend/tests/**"
  - "apps/*/src/**/*.test.{ts,tsx}"
  - "apps/*/e2e/**"
  - "packages/*/src/**/*.test.{ts,tsx}"
---

# Testing Rules (verbindlich für den Tester)

Single Source für pflegeleichte Tests. Die thematischen Skill-References (`unit-test-backend`,
`integration-test-backend`, `ui-test-frontend`, `e2e-test`) enthalten nur aufgabenspezifische
Templates und verweisen für R1–R14 hierher. R1–R14 sind verbindlich; ein Verstoß ist ein Befund
wie ein roter Test.

## R1 — Geteilte Werte nur als immutable Konstanten

- Modulebene `UPPER_SNAKE` nur für **immutable** Werte (VOs, Strings, Zahlen).
- Alles Mutable (Aggregates, Commands mit State, DB-Objekte) gehört in Fixtures/Factories (→ R2).
- Gültig: `PARENT_EMAIL = vo.EmailPolicy(value="parent@example.com")`
- Verboten: `guest = Account.create_guest()` als Modul-Global (State wandert zwischen Tests).

## R2 — Fixtures ab der 3. Verwendung

- Wird ein Setup zum **dritten Mal** gebraucht, wird es ausgelagert (Fixture, Factory, Helper).
- Schichtung: domänenweit → `backend/tests/fixtures/` bzw. `conftest.py` der Ebene; klassenspezifisch → lokale Fixture in der Testdatei; Frontend → `src/test/`-Helper; E2E → `e2e/helpers/`.
- Function-Scope ist Default; breiterer Scope nur mit Begründung.
- Fixture-Namen folgen `<domain>_<entity>_<zustand>` (z. B. `plan_learning_plan_draft`) und sagen explizit, was sie liefern und was sie verändern (z. B. `active_parent` statt `user`).
- Server-/Verfügbarkeits-Fixtures (Vite-Dev-Server, DB-Erreichbarkeit) gehören zentral in Shared-Fixtures (per `pytest_plugins` geladen), nicht in die Testdatei.
- Keine versteckten DB-Zugriffe in Fixtures.

## R3 — Parametrisierung ist Pflicht (für Datenvarianten)

- Gleiche Verhaltensprüfung mit mehreren Datensätzen **muss** parametrisiert sein: `pytest.mark.parametrize` (mit `ids=`) / `it.each` / Schleife über Datentabelle in E2E.
- Grenze: kein unterschiedliches Verhalten in einen Test pressen — Happy-Path, Regelverletzung und Edge-Case bleiben getrennte Tests.
- Gültig: ungültige E-Mails als Parametertabelle eines VO-Tests.
- Verboten: Success- und Failure-Fall als zwei Parameter desselben Tests.

## R4 — Testdaten via Builder/Factory

- Ab der 3. Verwendung: `factory-boy`/`Faker` (Backend) bzw. Factory-Helper (Frontend) statt kopierter Dict-/JSON-Literale.
- Keine harten IDs; `Faker` bei Bedarf seeden.

## R5 — Keine Logik im Testkörper

- Kein `if`/`for`/`while`/`try` im Test (einzige Ausnahme: parametrisierte Datentabellen per R3).
- Given/When/Then linear lesen; AAA-Blöcke ggf. als Kommentar trennen.

## R6 — Wiederholte Assertions als Helper (ab 3. Verwendung, Namen frei)

- Taucht derselbe Assert-Block **dreimal** auf, wird er in einen Helper mit sprechendem Namen ausgelagert.
- Helper-Namen sind **nicht** vorgegeben; sie müssen nur die geprüfte Aussage benennen (z. B. Backend-Contract-Prüfung, sichtbarer E2E-Zustand).
- Helper enthalten selbst keine Verzweigungen (→ R5).

## R7 — Zeit ist immer deterministisch

- `freezegun.freeze_time` (Backend) / `vi.useFakeTimers()` (Frontend); keine `now()`-Abhängigkeit im Test.
- Relative Assertions (z. B. `data_expires_at == created_at + 30 Tage`) statt absoluter Daten.

## R8 — Keine hartcodierten IDs, Daten, Ports oder URLs

- Ports/URLs/ENV aus Config/CONST, nie als Literal im Testkörper.
- Keine Reihenfolge-Abhängigkeit, kein Shared-State zwischen Tests; E2E räumt Seed-Daten auf.

## R9 — Keine live externen Dienste

- Stripe/TTS/S3/Netzwerk immer mocken (`responses`, Stubs, Test-Mode); keine echten Audio-Assets oder Calls.

## R10 — Jeder Feature-Test ist einer REQ-ID zugeordnet und lesbar

- Backend: `@pytest.mark.requirement("REQ-…")`; ein Satz Docstring mit REQ-Bezug; Naming `test_<aktion>_when_<bedingung>_returns_<erwartung>`.
- Frontend/E2E: REQ-Bezug im `it`/`test`-Titel (`"REQ-…: …"`).
- Marker-Disziplin: jede Testdatei trägt zusätzlich `@pytest.mark.unit`, `integration` oder `playwright` (E2E); langsame Tests zusätzlich `slow` (deselektierbar via `-m "not slow"`).
- Ausnahme: rein strukturelle Tests (VO-Invarianten, Mapper-Roundtrips, Repository-Grundfunktionen) tragen bewusst **keinen** Requirement-Tag — sie verifizieren Architekturregeln, kein Feature-Verhalten.
- Pro Feature-Spec mit REQ-Tabelle gibt es eine Requirement-Level-Datei `test_feat<NN>_<slug>_requirements.py`, die 1:1 die REQ-Zeilen aus Spec-§3 abbildet; Ablage je Testebene (`unit/`/`integration/`/`e2e/`).

## R11 — Ein Verhalten pro Test

- Single reason to fail; keine Snapshot-Tests als alleinige Abdeckung; keine Tailwind-/CSS-Klassen-Assertions (sichtbaren Text/Rollen prüfen).
- Keine Testfälle in einer Methode zusammenfassen: jeder Fall ist eine eigene Testmethode, kein `assert` nach `assert` für unterschiedliche Szenarien.
- Die Endung `<erwartetes_ergebnis>` im Testnamen ist immer eine von: `raises_value_error`, `returns_failure`, `returns_success`, `raises_mapping_error`, `raises_repository_error`. Keine anderen Endungen verwenden. (Hinweis: Es gibt kein `FailureCollection`-Ergebnis — Akkumulation ist `Failure(errors=...)`, siehe `rules/backend.md`.)

## R12 — Test-Code lintet wie Prod-Code

- Backend: `ruff`; Frontend: `eslint`/`prettier`-Konfig des Workspaces. Keine Ausnahmen ohne Begründung.

## R13 — Frontend: Mocks an der API-Grenze, MSW für Datenstrecken

- Default für Komponenten-Tests: auf `@smarti/api`-Ebene mocken (`vi.mock`), nie `fetch`/`axios` direkt.
- Sobald der Prüfling die Datenstrecke enthält (Seiten, Hooks mit generierten Hooks, Error-Contract aus `errors[]`), mit Mock Service Worker (MSW) testen: Komponente + TanStack Query + `api-mutator` laufen echt, nur die Antwort kommt aus `handlers.ts` (`src/test/handlers.ts`).
- MSW-Regel: Handler bilden Standard-Antworten ab; Fehlerzustände überschreibt der Test lokal via `server.use(...)` — nie die globale Handler-Liste ändern.
- Interaktionen via `userEvent`, Queries via Rollen (`getByRole`/`findByRole`).

## R14 — E2E: stabile Selektoren, keine Sleeps

- Priorität `getByRole → getByLabel → getByText`; verboten: CSS-Klassen, XPath, `nth()` ohne Not, `waitForTimeout`, `data-testid`-Inflation.
- Assertions mit Auto-Retry (`toBeVisible`); Netzwerk nur via `expectResponse`.
