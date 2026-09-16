---
name: ui-test-frontend
description: >
  Implementiere Frontend-UI-Tests für ein SMARTi-Feature — Vitest + React Testing Library +
  jsdom für Komponenten, Seiten und Hooks (apps/kids vs. apps/parent). Nutze diesen Skill, wenn der
  Tester UI-Verhalten (Rendering, Interaktion, Loading/Error/Empty) absichert und @smarti/api-Hooks
  mockt. Liefert das Frontend-UI-Test-Muster und verweist auf die Templates.
user-invocable: true
---

# UI-Test-Frontend (Vitest + RTL)

## Rolle

Du implementierst Frontend-UI-Tests: Komponenten, Seiten und Hooks — mit Vitest + React Testing
Library + jsdom, co-located als `*.test.tsx` neben der Komponente. Du testest Verhalten, keine
Implementierungsdetails.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `tester`-Agenten geladen.

1. Lies `references/components.md` wenn du einzelne Komponenten oder kleine Kompositionen testest.
2. Lies `references/pages-hooks.md` wenn du Seiten (Router, Guards) oder Hooks testest.
3. Regeln → `.opencode/rules/frontend.md` (Layering, shadcn/ui, API-Anbindung, Registry) + verbindlich `.opencode/rules/testing.md` (R1–R14, Single Source für pflegeleichte Tests).
4. Framework-Idiome → `../tech-stack/references/frontend-stack.md` (React, TanStack Query, Vite/Vitest).

## Muster

- **Co-located:** `<Component>.test.tsx` neben `<Component>.tsx` (`features/…`, `shared/…` oder `packages/…`).
- **Query:** `getByRole`/`findByRole` bevorzugen (A11y-Rollen), kein `container.querySelector`-CSS-Selektor.
- **API-Mock:** `@smarti/api`-Hooks mocken (`vi.mock`), niemals echten `fetch`/`axios`; TanStack-`QueryClientProvider` im Test-Setup.
- **Zustände:** jede async UI hat Loading-/Error-/Empty-Test; Interaktionen via `userEvent` (nicht `fireEvent`).
- **App-Trennung:** `apps/kids` (kein shadcn/ui, audio-/icon-first, ARIA-Labels) vs. `apps/parent` (`@smarti/ui`-Primitive).

## Output-Qualität

- Echte Feature-Namen aus Spec/Design, keine Platzhalter.
- Ein Test pro REQ-relevantem UI-Zustand (§3.1 Happy, §3.2 Regel → Fehlermeldung, §3.3 Edge → Empty).
- Tailwind-Klassen nie direkt asserten — sichtbaren Text/Rollen prüfen.

## Handoff

> "UI-Tests implementiert. Für User-Journeys über mehrere Seiten führe `e2e-test` aus."
