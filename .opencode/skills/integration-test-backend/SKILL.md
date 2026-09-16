---
name: integration-test-backend
description: >
  Implementiere Backend-Integration-Tests für ein SMARTi-Feature — Handler mit echter Test-DB,
  Query Services und Django-Ninja-Endpoints (inkl. JWT-Auth und Error-Contract). Nutze diesen Skill,
  wenn der Tester Persistenz, API-Verträge oder schichtübergreifende Abläufe absichert. Liefert das
  Backend-Integration-Test-Muster und verweist auf die Templates.
user-invocable: true
---

# Integration-Test-Backend (pytest-django, mit Test-DB)

## Rolle

Du implementierst Backend-Integration-Tests: Command-Handler gegen echte Test-DB (über echte
Repository/UoW-Adapter), Query Services direkt via ORM sowie Ninja-Endpoints über den
Django-Test-Client — inkl. JWT-Auth und Standard-Error-Contract.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `tester`-Agenten geladen.

1. Lies `references/endpoints.md` wenn du Ninja-Endpoints (JWT-Auth, Error-Contract) testest.
2. Lies `references/persistence.md` wenn du Handler mit echter Test-DB oder Query Services testest.
3. Regeln → `.opencode/rules/backend.md` (§API Routes, §Result-Pattern & Error-Contract) + verbindlich `.opencode/rules/testing.md` (R1–R14, Single Source für pflegeleichte Tests).
4. Framework-Idiome → `../tech-stack/references/backend-stack.md` (Django-Ninja, pytest-django).

## Muster

- **Test-DB:** `@pytest.mark.django_db` (ggf. `transaction=True` bei UoW/Events); kein Mock der eigenen Persistenz.
- **Endpoint:** `Ninja TestClient` mit `JWTAuth`-Token; `operation_id`-stabile Routen; Assertions auf Status + `{"errors": [...]}`-Contract bei Failures.
- **Error-Mapping:** `VALIDATION→422`, `NOT_FOUND→404`, `CONFLICT→409`, `PRECONDITION_FAILED→412`, `UNAUTHORIZED→401`, `FORBIDDEN→403` (vgl. `rules/backend.md`).
- **Isolation:** pro Test eigene Daten (Factory/Fixture), keine testübergreifenden Seiteneffekte; externe Dienste (Stripe, TTS) via `responses`-Mock.
- **REQ-Marker:** `@pytest.mark.requirement("REQ-…")` wie in Unit-Tests — Abdeckung bleibt zuordenbar. Nur die für die Aufgabe relevanten Reference-Dateien laden.

## Output-Qualität

- Echte Routen-/DTO-Namen aus Design (`*-design.md` §1.3/§1.5), keine Platzhalter.
- Jeder neue/ geänderte Endpoint hat mindestens: Happy-Path (2xx), Auth-Fehler (401/403) und einen fachlichen Failure (4xx mit `code`-Prüfung).
- Keine Business-Logik im Test duplizieren — Verhalten von außen prüfen.

## Handoff

> "Integration-Tests implementiert. Für UI-Absicherung führe `ui-test-frontend` aus, für User-Journeys `e2e-test`."
