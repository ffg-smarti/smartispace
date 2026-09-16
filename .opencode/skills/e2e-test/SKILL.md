---
name: e2e-test
description: >
  Implementiere E2E-Tests für ein SMARTi-Feature — Python pytest-playwright für backend-verankerte
  Flows (backend/tests/e2e/) oder TS-Playwright für frontend-verankerte Journeys (apps/kids,
  apps/parent). Nutze diesen Skill, wenn der Tester Happy-Path plus Error-Path pro Flow aus
  *-spec.md §3.1/§3.3 Ende-zu-Ende absichert (inkl. kids-A11y via axe-core). Liefert das
  E2E-Test-Muster und verweist auf die Templates.
user-invocable: true
---

# E2E-Test (Playwright)

## Rolle

Du implementierst E2E-Tests: vollständige User-Journeys (Login → Aktion → Assertion) gegen laufendes
Backend + Frontend. Jeder Test ist einer Journey aus `*-spec.md` §3.1 (Pflicht) bzw. §3.3 (kritische
Edge Cases) zugeordnet.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `tester`-Agenten geladen.

1. Lies immer `references/journeys-base.md` (Zweig-Entscheidung nach Prüfling, Happy+Error-Muster, Selektoren, Isolation, Projekt-Ports).
2. Nur im TS-Zweig dazu genau eine App-Datei: `references/kids-journeys.md` (apps/kids Port 8081, PIN-Flow, axe-Pflicht) *oder* `references/parent-journeys.md` (apps/parent Port 8080, Login-Form). Nie beide. Im Python-Zweig keine App-Datei laden.
3. Regeln → `.opencode/rules/frontend.md` (kids-A11y/Audio) + `.opencode/rules/backend.md` (Auth/Error-Contract) + verbindlich `.opencode/rules/testing.md` (R1–R14, Single Source für pflegeleichte Tests).
4. Framework-Idiome → `../tech-stack/references/frontend-stack.md` (Vite-URLs, Router).

## Muster

- **Journey-Scope:** eine Datei pro Feature-Flow; pro Flow mindestens Happy-Path + Error-Path (Erfolg → Zielzustand; Fehler → Meldung sichtbar, kein Redirect).
- **Zweig:** backend-verankert → Python (`backend/tests/e2e/test_*.py`, `@pytest.mark.playwright`); frontend-verankert → TS (`apps/*/e2e/*.spec.ts`).
- **Selektoren:** `page.getByRole(...)` → `getByLabel` → `getByText`; keine CSS-/XPath-Selektoren, keine `data-testid`-Inflation.
- **Isolation:** eigene Testnutzer/-daten pro Test (Backend-Fixtures/Seed), kein Shared-State, kein Parallel-Schreiben auf dieselbe Entität.
- **A11y (kids):** `axe-core`-Scan pro kids-Journey (Kontrast, ARIA-Labels, Icon-Buttons); Fehler lassen den Test rot werden.
- **Stabilität:** `expect(...).toBeVisible()` mit Auto-Retry; kein `waitForTimeout`; Netzwerk nur via `expectResponse`-Assertions.

## Output-Qualität

- Echte Routen/Daten aus Spec/Design, keine Platzhalter-URLs.
- Jede Journey hat: Setup (Seed/Login), Aktion (User-Schritte), Assert (sichtbares Ergebnis + API-Seiteneffekt wo nötig).
- Flaky-Verbot: kein fester Sleep, keine order-abhängigen Tests.

## Handoff

> "E2E-Tests implementiert und ausgeführt. Ergebnis als kurze Chat-Zusammenfassung an den Tester zurückgeben."
