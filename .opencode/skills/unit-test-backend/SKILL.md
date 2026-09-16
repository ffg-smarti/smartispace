---
name: unit-test-backend
description: >
  Implementiere Backend-Unit-Tests für ein SMARTi-Feature — Domain (Aggregate, Value Objects,
  Events) und Application (Handler, Mapper) isoliert ohne DB. Nutze diesen Skill, wenn der Tester
  REQ-IDs aus *-spec.md (§3.1/3.2/3.3) als pytest-Tests abbildet: pro REQ Happy-Path, Regelverletzung
  und Edge Cases mit Result-Assertions. Liefert das Backend-Unit-Test-Muster und verweist auf die
  Templates.
user-invocable: true
---

# Unit-Test-Backend (pytest, ohne DB)

## Rolle

Du implementierst Backend-Unit-Tests: Domain- und Application-Schicht isoliert, ohne Datenbank,
ohne HTTP, ohne Celery. Jeder Test ist genau einer REQ-ID aus `*-spec.md` zugeordnet.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `tester`-Agenten geladen.

1. Lies `references/domain-model.md` wenn du Aggregate, Entities, Value Objects, Events oder Enums testest.
2. Lies `references/handlers-mappers.md` wenn du Command-/Query-Handler oder DTO→Command-Mapper testest.
3. Regeln → `.opencode/rules/backend.md` (§Result-Pattern & Error-Contract, Code Style) + verbindlich `.opencode/rules/testing.md` (R1–R14, Single Source für pflegeleichte Tests).
4. Framework-Idiome → `../tech-stack/references/backend-stack.md` (pytest, pytest-django).

## Muster

- **Einer REQ-ID = mindestens ein Test:** `@pytest.mark.requirement("REQ-…")` auf jedem Test.
- **Naming:** `test_<aktion>_when_<bedingung>_returns_<erwartung>` (z. B. `test_set_guest_email_when_valid_returns_success`).
- **Result-Assertions:** `isinstance(result, Success)` / `isinstance(result, Failure)` + Prüfung auf `result.errors` (Tupel) mit `ErrorCode`; kein HTTP-Status in Unit-Tests.
- **Isolation:** Fakes für Ports (`FakeRepository`, `FakeUoW`, `FakePasswordHasher`), keine Django-DB (`@pytest.mark.django_db` verboten), keine Zeit-Abhängigkeit (`freezegun` bei Datumslogik).
- **Datei-Header:** jede `.py`-Datei beginnt mit `# <import-path>`; Strings in `"doppelten Anführungszeichen"`.

## Output-Qualität

- Echte Domain-Namen aus Spec/Design, keine Platzhalter.
- Pro Spec-§3.1-Zeile ein Happy-Path-Test, pro §3.2-Regel ein Failure-Test, pro §3.3-Edge-Case ein Grenztest.
- Keine DB-, Netzwerk- oder Filesystem-Abhängigkeit.

## Handoff

> "Unit-Tests implementiert. Für DB-/API-Absicherung führe `integration-test-backend` aus."
