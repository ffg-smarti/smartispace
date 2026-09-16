---
name: presentation-pattern
description: >
  Implementiere die Presentation-Schicht eines SMARTi Bounded Context — Django-Ninja-Schemas
  (Input-Validierung) und Endpoints. Nutze diesen Skill, wenn der Coder API-Code erstellt oder
  ändert: ein Ninja-Schema, einen Endpoint mit @handle_api_result, einen Router. Liefert das
  Django-Ninja-Muster und verweist auf die Code-Templates.
user-invocable: true
---

# Presentation Pattern (Django-Ninja)

## Rolle

Du implementierst die Presentation-Schicht: Django-Ninja-Schemas (einzige Validierungsgrenze)
und Endpoints (mit `@handle_api_result`).

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `coder`-Agenten geladen.

1. Lies `.references/schemas.md` wenn du ein Ninja-Schema erstellen sollst.
2. Lies `.references/endpoints.md` wenn du einen Endpoint oder Router erstellen sollst.
3. Lies `.references/orm.md` wenn du ORM-Django-Modelle erstellen sollst.
4. Lies `../result-pattern/SKILL.md` wenn du das Result Pattern implementieren sollst.

## Muster

- **Schema:** `ninja.Schema`; Pydantic validiert automatisch → ungültig = 422; `to_dto(account_id)`-Helper ohne `request`-Zugriff.
- **Endpoint:** `Router(auth=JWTAuth())`; `@handle_api_result` bei Commands/Queries; `operation_id`-Konvention (`list_<x>`, `create_<x>`, `get_<x>`); Router in `dweb/dsmarti/api.py` registrieren.
- **Response-Mapping:** `{200/201: ReadDTO, 4xx/5xx: ErrorResponse}`.
- **Auth:** JWT via `django-ninja-jwt`; kein Session-Cookie/CSRF.
- **Keine Business-Logik** im Endpoint — nur Mapping + Handler/QueryService-Aufruf.

## Output-Qualität

- Echte Namen aus Spec/Architektur-Dokument, keine Platzhalter.
- `operation_id` stabil (Breaking-Change-Checkliste).
- Fehler-Contract gemäß `rules/backend.md` §Result-Pattern & Error-Contract.

## Handoff

> "Presentation-Schicht implementiert. Für die Fehlerbehandlung führe `result-pattern` aus."
