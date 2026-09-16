# SMARTi Tech-Stack & Projektlandkarte

Verbindliche Referenz für den Solution Architect. Autoritative Struktur → `shared/workspace.md`.

## Tech-Stack

| Schicht | Technologie |
|---|---|
| Backend | Django 5 + Django-Ninja, Clean Architecture (Domain/Application/Infrastructure) |
| Auth |  JWT via `django-ninja-jwt`  |
| DB | PostgreSQL (Prod) |
| Hintergrundjobs | Celery + Redis |
| Storage | S3-kompatibel (Cloudflare R2), CDN davor |
| Frontend | React + TypeScript + Vite, npm Workspaces, Tailwind CSS |
| State | TanStack Query (Server) + useState/useReducer (Client) |
| API-Anbindung | Typen aus OpenAPI generiert via Orval (`@smarti/api`) — Single Source of Truth ist das Backend-Schema |

## Domains (Backend, `backend/src/smarti/`)

```
account      # Benutzerkonten (Eltern-Account + Kind-Profile)
```

Jede Domäne: eigener `domain/application/infrastructure`-Schnitt unter `backend/src/smarti/<domain>/`.
Die zugehörige Django-App liegt unter `backend/src/dweb/<domain>/`.

## Frontend (Apps + Pakete)

```
apps/kids            # Kinder-Lern-App. Web-PWA + iOS/Android via Capacitor. Audio-/icon-first, KEIN shadcn/ui
apps/parent          # Eltern-Verwaltungs-App. Reine Web-App (kein Capacitor). Formularlastig, nutzt shadcn/ui via @smarti/ui
packages/smarti-api  # @smarti/api — Orval-generierte TanStack Query Hooks + openapi.json
packages/smarti-ui   # @smarti/ui — shadcn/ui-Komponenten, cn()-Helper, Design-Tokens
packages/smarti-players # @smarti/players — Player-Komponenten + Registry (PLAYER_REGISTRY)
packages/smarti-session # @smarti/session — Session-Rahmen (SessionShell, useSession)
```

**Layering-Regel (strikt, via eslint-plugin-boundaries erzwungen):**
`@smarti/ui` → `@smarti/players` / `@smarti/session` → `features` (App-intern) → `app`.
Niedrigere Schichten dürfen nie aus höheren importieren.

## Architektur-Prinzipien (nicht verhandelbar)

- **Clean Architecture** — 4 Schichten: Domain → Application → Infrastructure → Presentation
- **DDD** — Bounded Contexts, Aggregates, Value Objects, Domain Events; Cross-Domain nur via Events/ACL
- **CQRS** — Write Side (Commands/Handler) strikt getrennt von Read Side (Query Services)
- **Zweiseitige Mapping-Strategie** — keine rohen ORM-Modelle/Domain-Objekte über Schichtgrenzen
- **Result-Pattern** — fachliche Fehler als `Result`, Invarianten/technische Fehler als Exceptions
- **DIP** — Abstraktionen in inneren Schichten, Implementierungen in Infrastructure

Diese Prinzipien sind im Shared Context ausgeführt: `.opencode/shared/context.md` (+ Module).
