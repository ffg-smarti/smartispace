---
name: tech-stack
description: >
  Allgemeines Framework-Wissen des SMARTi-Tech-Stacks — idiomatische APIs (Versionen stehen ausschließlich in AGENTS.md §1.5).
  Backend: Python, Django, Django-Ninja, Pydantic (v2), pytest, ruff. Frontend: React, TypeScript,
  Vite, TanStack Query, Tailwind, react-hook-form/zod, Orval. Nutze diesen Skill, wenn du Backend- oder
  Frontend-Code schreibst und aktuelle Framework-APIs (nicht projektspezifische Klassen) verwenden willst —
  z. B. Pydantic-v2-ConfigDict, Django-Ninja-Schema, TanStack-Query-Hooks, Vite-Konfiguration.
  Enthält KEINE SMARTi-eigenen Base-Klassen (die sind projektspezifisch → `*-pattern`-Skills).
user-invocable: true
---

# Tech-Stack (allgemeines Framework-Wissen)

## Rolle

Du lieferst das **allgemeine** Framework-Wissen für den SMARTi-Tech-Stack: idiomatische APIs und
aktuelle Muster. Du beschreibst **keine projektspezifischen Klassen**
(kein `smarti/shared/base.py`, kein `@handle_api_result` — das liefern die `*-pattern`-Skills).

## Grundlagen

> **Base-Kontext** (`AGENTS.md` §1.5 Tech-Stack, `shared/context.md`, `shared/workspace.md`) wird vom
> `coder`-/`architect`-Agenten geladen. **Versionen stehen ausschließlich in `AGENTS.md` §1.5**
> (Single Source of Truth) — nicht hier duplizieren.

1. **Backend-Code schreiben/entwerfen** → lies `references/backend-stack.md`.
2. **Frontend-Code schreiben/entwerfen** → lies `references/frontend-stack.md`.
3. **Beides betroffen** → beide References lesen.

## Regeln

- **Gepinnte Versionen aus `AGENTS.md` §1.5** verwenden — Code nie gegen ältere/neuere APIs schreiben.
- **Pydantic v2-API** verwenden (`ConfigDict`, `model_dump`, `field_validator`) — keine v1-`Config`/`.dict()`.
- **Django-Ninja** validiert via `ninja.Schema` (Pydantic v2) — keine manuelle Validierung.
- **TanStack Query** für Server-State — kein `fetch`/`axios` direkt in Komponenten.
- **Kein shadcn/ui in `apps/kids`** — nur in `apps/parent` (via `@smarti/ui`).
- Bei Unsicherheit über eine aktuelle API-Entwicklung: offizielle Doku prüfen, nicht raten.

## Handoff

> "Stack-Wissen geladen. Für die konkrete Schicht-Implementierung den passenden `*-pattern`-Skill laden."