# SMARTi-LMS — Entwicklungsanleitung für KI-Agenten

**Zweck:** Dieser Kern enthält nur session-kritische Informationen. Detailregeln → `.opencode/rules/`, Design-Docs → `docs/design/`. Pfadauflösung immer via Skill `doc-router` (keine Namenssuche).

---

## System-Architektur (Überblick)

SMARTi-LMS ist ein **Monorepo** mit npm Workspaces. Die Systeme kommunizieren über APIs:

- **Backend** — Django (Python) mit Django-Ninja REST-API. Enthält die Geschäftslogik in einer Clean-Architecture-Struktur (`backend/src/smarti/`) sowie die Django-Apps (`backend/src/dweb/`). Deployed via **Railway**.
- **Frontends** — Zwei React/TypeScript SPAs (Tailwind CSS + shadcn/ui):
  - `apps/parent` — **SMARTi App** (Eltern-Portal, shadcn/ui)
  - `apps/kids` — **FFG Demo App** (Kinder-Lern-App, audio-/icon-first, kein shadcn/ui)
  - Beide greifen auf dasselbe Backend zu.
- **Shared Packages** (`packages/`) — Intern via npm Workspaces, niemals auf npm publiziert:
  - `@smarti/ui` — shadcn/ui-Komponenten, `cn()`-Helper, Design-Tokens
  - `@smarti/players` — Player-Komponenten + Registry
  - `@smarti/session` — Session-Rahmen (SessionShell, useSession)
  - `@smarti/api` — aus dem Backend-OpenAPI-Schema generierte Typen (`openapi-typescript`) + typisierter Fetch-Client (`openapi-fetch`) + JWT-Auth-Handling (Bearer-Token, Auto-Refresh, plattformabhängige Token-Speicherung).
  - `@smarti/design-system` — Design-Tokens, generische UI-Primitives (Button, Card, IconButton) sowie kindgerechte Input-Primitives (PinInput, IconChoiceInput). Enthält **kein shadcn/ui**.
  - `@smarti/interactions` — Interaktions-Baukasten für Lektionen (DragDropSort, MultipleChoiceAudio, Matching, …) inkl. Registry, die `block.type` auf Komponenten mapped.
  - `@smarti/audio` — Sprachausgabe-Layer (Voiceover-Hook, "Nochmal anhören"-Button, Audio-Caching).
- **Feature Specs** liegen in `docs/features/specs/<domain>/`. Lese immer `docs/features/INDEX.md` bevor du Arbeit beginnst.

---

## 1. Quick-Start

**Tech Stack (Versionen):** → §1.5 unten

**CLI-Befehle (täglich):**
```bash
# Workspace-Setup (einmalig / nach Änderungen in package.json)
npm install                                        # Root: installiert alle Workspaces

# Frontend Dev
npm run dev --workspace=apps/parent                # SMARTi App (localhost:8080)
npm run dev --workspace=apps/kids                  # FFG Demo App (localhost:8081)
npm run dev --workspace=packages/smarti-players    # Shared Packages Watch-Modus

# Frontend Build
npm run build --workspace=apps/parent              # SMARTi App Production
npm run build --workspace=apps/kids                # FFG Demo App Production

# Backend
uv run smarti dj runserver                         # Backend Dev (localhost:8000)
uv run smarti test unit-test                        # Backend Tests
uv run smarti test lint                            # Backend Linting

# Docker (alternative lokale Entwicklung)
docker compose up                                  # Alle Dienste
docker compose up db backend minio                 # Nur Backend + DB
```
→ Vollständig: `README.md` (Docker-Variante)

**Projekt-Struktur (Monorepo mit npm Workspaces):** `.opencode/shared/workspace.md`

---

## 1.5 Tech-Stack (gepinnt)

Verbindliche Versionen & Regeln. Framework-Idiome im Detail → Skill `tech-stack`.

| Schicht | Technologie | Version | Regeln |
|--------|-------------|---------|--------|
| Backend-Sprache | Python | `>=3.12` | immer `from __future__ import annotations` |
| Backend-Framework | Django | `>=5.1,<6.0` | ORM statt Raw-SQL; JWT-Auth, keine Session-Cookies |
| API | Django-Ninja | `>=1.6` | `ninja.Schema` (Pydantic v2), kein manuelles Validieren |
| Auth | django-ninja-jwt | `>=5.3` | Bearer-Token |
| Validierung | Pydantic | `>=2.12` | **Pydantic v2** (ConfigDict, `model_dump` — nicht v1-API) |
| Jobs | Celery + Redis | — | via Celery-Tasks |
| DB | PostgreSQL (Prod) / SQLite (Dev) | — | — |
| Tests Backend | pytest-django | `>=4.11,<5.0` | — |
| Linting Backend | ruff | `>=0.11.8` | — |
| Frontend | React | `^18.3.1` | Funktionale Komponenten + Hooks |
| Frontend-Sprache | TypeScript | `^5.7` | strict |
| Bundler | Vite | `^5.4` | Dev-Proxy auf Backend |
| State | TanStack Query | `^5.60` | Server-State; kein direkter fetch/axios in Komponenten |
| Formulare | react-hook-form + zod | `^7.61` / `^3.24` | Validierung |
| Styling | Tailwind CSS | — | kein Inline-Style, keine CSS-Modules |
| Codegen | Orval | `^8.13` | nur in `@smarti/api`, `generated/` nie manuell editieren |
| Router | react-router-dom | `^7.x` | — |

**Verbindliche Idiome (Backend):** Strings in `"doppelten Anführungszeichen"`, Logger via
`logger.info("...%s...", variable)` (keine f-Strings), jede `.py`-Datei beginnt mit `# <import-path>`.

**Verbindliche Idiome (Frontend):** Imports aus `@smarti/*`-Paketen (nie kopieren zwischen Apps),
kein shadcn/ui in `apps/kids`, `npm install` immer im Repository-Root.

---

## 2. Architektur

**Schichten:** `Domain ← Application ← Infrastructure ← Django ← Frontend`

**Domains, Paketstruktur & Architektur-Details:** immer via Skill `doc-router` auflösen (kanonische Design-Docs, keine festen Dateinamen).

### Nicht verhandelbare Regeln
- **Kein ORM-Zugriff aus Domain/Application** — nur via Repository-Interface
- **Kein Cross-Domain-Import** — nur Domain Events oder ACL
- **Kein direkter Django-Model-Zugriff aus Views/APIs** — immer via Command/Query Handler
- **Interfaces in Domain/Application** — Implementierungen in Infrastructure

**Wann vertiefen:** Beim Anlegen neuer Domains, bei Architektur-Fragen, zur Wahl der richtigen Basisklasse → Design-Docs via Skill `doc-router` suchen (keine Namenssuche).

---

## 3. MCP-Server

| Server | Typ | Wann nutzen? | Verwendung |
|--------|-----|--------------|------------|
| `filesystem` | npm | Dateioperationen (lesen/schreiben/suchen) | Dateien lesen, schreiben, und durchsuchen. Alternativ zum Tool-Zugriff |
| `sqlite` | npm | Datenbank-Abfragen | Direkte SQL-Abfragen auf die SQLite-Datenbank |
| `postgres` | npm | Datenbank-Abfragen | Direkte SQL-Abfragen auf PostgreSQL (localhost:5432) |
| `django` | Python (uv) | Django-Struktur verstehen | Django-Modelle, URLs, Settings inspizieren (Port 8000) |
| `playwright` | npm | Browser-Automation | Seiten navigieren, Screenshots, E2E-Tests ausführen |
| `backend-mcp` | Python (uv) | Backend-Test-Ausführung | pytest, Schemathesis, Playwright (Python) starten |
| `ffg-mcp` | Python (uv) | Frontend-Tooling (apps/kids) | Vitest, ESLint, Prettier, Playwright (Frontend), Dev-Server (Port 8081) |
| `smarti-mcp` | Python (uv) | Frontend-Tooling (apps/parent) | Vitest, ESLint, Prettier, Playwright (Frontend), Dev-Server (Port 8080) |

Available tools (MCP-Funktionen):
- **backend-mcp:** `unit-test`, `e2e-test`, `api-test`, `para-test`
- **ffg-mcp:** `js-unit`, `frontend`, `lint`, `format`, `integration-test`, `e2e-test`, `watch`, `run` (zielt auf `apps/kids`, Port 8081)
- **smarti-mcp:** `js-unit`, `frontend`, `lint`, `format`, `integration-test`, `e2e-test`, `watch`, `run` (zielt auf `apps/parent`, Port 8080)

Hinweis: `integration-test` und `e2e-test` setzen entsprechende npm-Scripts im jeweiligen Workspace voraus.

**Custom Commands (`.opencode/command/`):**
| Command | Beschreibung |
|---------|-------------|
| `/designer` | Funktionale Anforderungen eines Features spezifizieren (Designer) |
| `/architect` | Architektur für ein Feature entwerfen (Solution-Architekt) |
| `/coder` | Feature in DDD-Schichten implementieren (Coder) |
| `/tester` | Unit-Tests für ein Feature implementieren und ausführen (Tester) |
| `/deployer` | Build-/CI/CD-Pipeline gestalten oder auf Zielstruktur migrieren (Deployer) |

**Agenten (`.opencode/agents/`):**

| Agent | Beschreibung |
|-------|-------------|
| `designer` | Spezifiziert funktionale Anforderungen; Input für den Architect |
| `architect` | Entwirft die Architektur (High-Level → Backend/Frontend), erzeugt `*-design.md` |
| `coder` | Implementiert das entworfene Feature in DDD-Schichten/Frontend-Komponenten |
| `tester` | Implementiert und führt Unit-Tests aus; prüft gegen Spec + Design |
| `deployer` | Gestaltet die Build-/CI/CD-Pipeline an die Zielstruktur |

**Skills (`.opencode/skills/`):**

| Skill | Beschreibung |
|-------|-------------|
| `app-build` | Build-Pipeline einer einzelnen SMARTi-Frontend-App (apps/kids bzw. apps/parent) an die Zielstruktur anpassen |
| `appl-pattern` | Application-Schicht implementieren: Commands, DTOs, Ports, Mapper, Command-/Query-Handler |
| `architect-backend` | Backend-Architekturdesign: Django + Django-Ninja nach Clean Architecture, DDD, CQRS |
| `architect-frontend` | Frontend-Architekturdesign: React + TypeScript + Vite Monorepo, Layering, State, API |
| `backend-build` | Backend-Teil der Build-Pipeline (Workflows/Dockerfile) an die Zielstruktur anpassen |
| `doc-router` | Projekt-Path-Router: liefert kanonische Pfade für Design-Docs, Kontext-, Regel- und Strukturdateien (von allen Agenten/Commands geladen) |
| `domain-pattern` | Domain-Schicht implementieren: Aggregate Root, Entities, Value Objects, Domain Events, Enums |
| `infra-pattern` | Infrastructure-Schicht implementieren: ORM-Modelle, Mapper, Repository, Unit of Work, Query Services, ACL |
| `presentation-pattern` | Presentation-Schicht implementieren: Django-Ninja-Schemas und Endpoints |
| `project-build` | Vollständige Projekt-Build-Pipeline (RFI-Workflows, RFR-Release-Readiness, Deploy-Jobs) |
| `requirements-analyst` | Ermittelt und strukturiert fachliche Anforderungen für ein Feature |
| `result-pattern` | Korrekte Nutzung des Result-Patterns (Success, Failure) |
| `smarti-spec-creator` | Orchestriert Erstellung einer vollständigen Feature-Spezifikation |
| `smarti-spec-validator` | Validiert alle Specs auf Abhängigkeiten, Widersprüche und Redundanzen |
| `solution-architect` | PM-freundliches High-Level-Architekturdesign (kein Code) |
| `spec-writing` | Erstellt/aktualisiert Software-Dokumente in Modi `requirements` und `design` |
| `tech-stack` | Allgemeines Framework-Wissen (Idiome): Python/Django/Django-Ninja/Pydantic, React/TS/Vite/TanStack — Versionen in AGENTS.md §1.5 |
| `ui-pattern` | Frontend implementieren: Komponenten, Seiten, Hooks, Registry-Erweiterung |
| `e2e-test` | E2E-Tests mit Playwright (Backend-Flows + Frontend-Journeys, kids-A11y) |
| `integration-test-backend` | Backend-Integration-Tests mit Test-DB (Handler, Query Services, Endpoints) |
| `ui-test-frontend` | Frontend-UI-Tests mit Vitest + React Testing Library |
| `unit-test-backend` | Backend-Unit-Tests ohne DB (Domain + Application, REQ-ID-gebunden) |

---

## 4. Namenskonventionen

Alle Namenskonventionen (Domain Entities, Commands, DTOs, Interfaces, TS, REQ-Kennungen,
Bounded-Context-Namen) → **`.opencode/shared/naming-conventions.md`** (Single Source).

---

## 6. Key Conventions

- **Pfadauflösung:** Immer via Skill `doc-router` — kanonische Pfade, keine Namenssuche (`find`/`glob`/`grep`).
- **Feature IDs:** `FEAT-1`, `FEAT-2` (sequential) — siehe `docs/features/INDEX.md`
- **Commits:** `feat(FEAT-X): description`, `fix(FEAT-X): description`
- **Single Responsibility:** One feature per spec file (`docs/features/specs/<domain>/`)
- **Human-in-the-loop:** Immer User-Approval vor Workflow-Fortsetzung
- **shadcn/ui first:** Nie eigene shadcn-Komponenten bauen — → `.opencode/rules/frontend.md`
- **Comments erhalten:** Niemals bestehende Inline-Kommentare, Hinweise oder Annotationen beim Editieren entfernen.
- **Logger-Format:** `logger.info("...%s...", variable)` statt f-Strings (`f"{var}"`)
- **Datei-Header:** Jede `.py`-Datei beginnt mit `# <import-path>` — z.B. `# smarti/session/appl/dtos.py`.
- **npm Workspaces:** `npm install` immer im Repository-Root ausführen. Shared Packages via `@smarti/*` referenziert — kein manuelles Linken nötig. Versionsnummer in allen `packages/*/package.json` bleibt `"0.0.0"`.
- **Shared Packages:** Niemals auf npm publiziert. `openapi.json` + `orval.config.ts` liegen einmal in `packages/smarti-api/`. Player-Komponenten nur in `packages/smarti-players/`. Apps importieren aus `@smarti/*` — kein Kopieren zwischen Apps.
- **Docker Build-Kontext:** Frontend-Dockerfiles brauchen Repository-Root als Kontext (`docker build --file apps/parent/Dockerfile .`), da `packages/` erreichbar sein muss.
- **Deployment: CI/CD via GitHub Actions (`deploy.yml`). → `doc8 §1.4`

### Links

- Product Context: @docs/PD.md
- Feature Overview: @docs/features/INDEX.md
