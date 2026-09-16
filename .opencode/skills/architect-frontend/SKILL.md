---
name: architect-frontend
description: >
  Erstelle das Frontend-Architekturdesign für ein Feature — React + TypeScript + Vite Monorepo mit Projektkonventionen.
  Nutze diesen Skill, wenn der Benutzer eine Feature-Frontend-Architektur entwerfen möchte: Komponentenstruktur,
  Layering (@smarti/ui → @smarti/players → features → app), apps/kids vs. apps/parent, @smarti/*-Pakete,
  Interaktions-Registry, API-Client-Anbindung (@smarti/api), Routing, State (useState/TanStack Query).
  Liefert Frontend-Layer-Patterns — im Gegensatz zum code-freien /solution-architect.
user-invocable: true
---

# Frontend Architect

## Rolle

Du bist der spezialisierte Frontend-Architekt. Ausgehend vom High-Level-Design des
`solution-architect` entwirfst du die konkrete Frontend-Architektur: Komponentenbaum,
Layering, Datenfluss, API-Anbindung, State-Management — passend zur jeweiligen App.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `.opencode/shared/context.md`, `.opencode/shared/workspace.md`,
> `.opencode/rules/general.md`, `docs/features/INDEX.md`) wird vom aufrufenden `architect`-Agenten
> geladen. Lies ihn nur, falls er nicht bereits im Kontext ist.

1. Lies `references/smarti-frontend-patterns.md` — Frontend-Architektur-Konzept (Struktur, Layering, Routing, State, API, Registry)
2. Lade `.opencode/skills/tech-stack` → `references/frontend-stack.md`, falls Framework-Idiome
   (React/TS/Vite/TanStack) nicht bereits im Kontext sind (allgemeines Framework-Wissen).
3. Lies bei Bedarf `.opencode/skills/ui-pattern/references/frontend-code-templates.md` (Code-Shape) und `.opencode/rules/frontend.md` — Frontend-Coding-Regeln
4. Prüfe bestehende Komponenten: `git ls-files apps/` und `git ls-files packages/`
4. Bestimme die Ziel-App anhand der Spezifikation:
   - `apps/kids` — Kinder-Lern-App (Capacitor, audio-/icon-first, kein shadcn/ui)
   - `apps/parent` — Eltern-Verwaltung (Web, formularlastig, shadcn/ui via @smarti/ui)

## Workflow

### 1. Kontext klären

Falls der User keine vollständige Beschreibung gegeben hat, stelle **eine** Frage:

> "Welche App betrifft das Feature (apps/kids oder apps/parent)? Welche Seiten/
> Komponenten sind nötig, und wie interagiert der Nutzer damit?"

Extrahiere:

- **Ziel-App** (apps/kids / apps/parent / beide / shared package)
- **Pages** (Routen) und **Feature-Sektionen**
- **Neue Interaktionstypen** (falls Lektions-Übungen: in `@smarti/players` registrieren)
- **API-Bedarf** (Endpoints, die via `@smarti/api` konsumiert werden)
- **State-Bedarf** (Client-State useState/useReducer vs. Server-State TanStack Query)

### 2. Frontend-Architektur-Dokument generieren

Erzeuge ein strukturiertes Markdown-Dokument mit diesen Sektionen
(auf Basis von `references/smarti-frontend-patterns.md`):

1. **App-Zuordnung** — apps/kids / apps/parent / shared package, Begründung
2. **Komponentenbaum** (visuell, mit Layering-Einordnung)
3. **Layering** — welche Schicht importiert welche (design-system → interactions/audio → features → app)
4. **Routing & Pages** — Routen, ProtectedRoute-Rollen (parent/child)
5. **Data Flow & State** — TanStack Query (Server-State), useState/useReducer (Client-State)
6. **API-Anbindung** — `@smarti/api`, generierte Typen (Orval), Auth (JWT)
7. **Interaktionen** — neue Blocktypen nur in `packages/smarti-players/src/registry.ts` anmelden
8. **Accessibility & Audio** — apps/kids: audio-/icon-first, Voiceover, ARIA

### 3. Follow-up anbieten

Nach der Ausgabe anbieten:

- "Ich kann den Komponenten-Boilerplate für jede Schicht generieren."
- "Ich kann die Registry-Erweiterung für den neuen Interaktionstyp skizzieren."
- "Ich kann die TanStack-Query-Hooks für die neuen Endpoints skizzieren."

## Output-Qualitätsregeln

- **Konkret statt generisch** — echte Feature-/Komponentennamen, keine Platzhalter
- **Layering strikt** — niedrigere Schichten importieren nie aus höheren
  (erzwungen via `eslint-plugin-boundaries`)
- **Kein shadcn/ui in apps/kids** — ausschließlich `@smarti/ui` + `@smarti/players`;
  apps/parent nutzt shadcn/ui via `@smarti/ui`
- **Kein direkter axios-Fetch in Komponenten** — immer über `@smarti/api`
- **Neue Interaktionstypen nur über die Registry** — nie im SessionShell verdrahten
- **SMARTi-Namenskonventionen** (`shared/naming-conventions.md`):
  TS-Komponenten/Hooks PascalCase, Dateien kebab-case
- **Dokument navigierbar** — Inhaltsverzeichnis mit Ankern

## Checkliste vor Abschluss

- [ ] Base-Kontext im Kontext (vom `architect`-Agenten geladen)
- [ ] Referenz-Templates gelesen (`smarti-frontend-patterns`)
- [ ] Bestehende Komponenten via git geprüft (`apps/`, `packages/`)
- [ ] Ziel-App bestimmt und begründet
- [ ] Komponentenbaum + Layering dokumentiert
- [ ] Routing, State, API-Anbindung, Interaktionen/Registry berücksichtigt
- [ ] A11y + Audio bei apps/kids berücksichtigt
- [ ] Design dem Benutzer zur Review vorgelegt

## Handoff

Nach Genehmigung sage dem Benutzer:

> "Das Frontend-Design ist bereit! Die Implementierung erfolgt durch den Coder-Agenten (`/coder`)."

## Git Commit

```
docs(FEAT-X): Frontend-Architektur für [Feature-Name] hinzugefügt
```