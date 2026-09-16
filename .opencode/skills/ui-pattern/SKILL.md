---
name: ui-pattern
description: >
  Implementiere Frontend-Komponenten/Seiten/Hooks für SMARTi — React + TypeScript + Vite + Tailwind,
  apps/kids vs. apps/parent, @smarti/*-Pakete, Layering. Nutze diesen Skill, wenn der Coder
  Frontend-Code erstellt oder ändert: eine Seite, eine Komponente, einen Hook, eine Registry-Erweiterung.
  Liefert das Frontend-Implementierungsmuster und verweist auf die Code-Templates.
user-invocable: true
---

# UI Pattern (Frontend)

## Rolle

Du implementierst Frontend-Code: Komponenten, Seiten, Hooks — React + TypeScript + Vite + Tailwind,
passend zu `apps/kids` bzw. `apps/parent`, über `@smarti/*`-Pakete.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `coder`-Agenten geladen.

1. Lies `.references/frontend-code-templates.md` (initApiMutator, Query-Client, App, Routing, Vite, Orval).
2. Regeln → `.opencode/rules/frontend.md` (Layering, shadcn/ui, API-Anbindung, Registry).

## Muster

- **App-Zuordnung:** `apps/kids` (audio-/icon-first, KEIN shadcn/ui) vs. `apps/parent` (shadcn/ui via `@smarti/ui`).
- **Layering strikt:** `@smarti/ui` → `@smarti/players`/`@smarti/session` → `features` → `app`; nie aus höheren importieren.
- **API:** kein direkter `fetch`/`axios` — alles über `@smarti/api` (generierte Hooks).
- **State:** TanStack Query (Server-State), `useState`/`useReducer` (Client-State).
- **Registry:** neue Player/Interaktionstypen nur in `@smarti/players`-Registry anmelden, nie im SessionShell verdrahten.
- **A11y (kids):** Icon-Buttons mit ARIA-Labels, Voiceover, kein Tracking von Kindern.

## Output-Qualität

- Echte Feature-/Komponentennamen aus Spec/Architektur-Dokument, keine Platzhalter.
- `api-mutator.ts` app-spezifisch; `VITE_API_URL` pro App.
- Tailwind ausschließlich; Loading-/Error-/Empty-States; responsive.

## Handoff

> "Frontend implementiert. Für die Tests führe `tester` aus."
