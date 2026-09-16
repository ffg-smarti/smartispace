# COPI Lernplattform – Workspace-Spezifikation

Diese Datei beschreibt Struktur, Stack und Konventionen des Workspaces so vollständig,
dass ein Agent daraus ein lauffähiges Grundgerüst aufsetzen kann. Sie ist bewusst auf
Architektur-Entscheidungen fokussiert, nicht auf Implementierungsdetails einzelner Features.

## 1. Produktkontext

Selbstlern-Plattform für Kinder (8–15 Jahre), verkauft als fertige Kurs-Produkte an
Eltern. Themen liegen bewusst außerhalb des deutschen Schulcurriculums (Finanzen,
Digital/KI, Sicherheit im Internet, Programmieren, Weltgeschichte u. a.). Zentrales
Designprinzip: Kinder sollen möglichst wenig lesen und stattdessen interaktiv, audio-
geführt lernen (keine reinen Video-Kurse).

## 2. Repository-Layout (Monorepo)

```
copi-lp/
├── apps/
│   ├── kids/                   # Haupt-Lern-App (Capacitor: Web + iOS + Android)
│   └── parent/                 # Web-Dashboard fuer Eltern (Kauf, Fortschritt, Account)
├── packages/
│   ├── design-system/          # @copi/design-system – Tokens + generische UI-Primitives
│   ├── interactions/           # @copi/interactions – Uebungs-Baukasten (Lernmodul-UI)
│   ├── audio/                  # @copi/audio – Sprachausgabe-Layer (Voiceover, Caching)
│   ├── api-client/             # @copi/api-client – aus OpenAPI generierte Typen + Fetch-Client
│   └── config/                 # geteilte eslint/tsconfig/tailwind-Basis
├── backend/                    # Django + Ninja, Clean Architecture (einzelner Service)
├── docker-compose.yml          # nur lokale Entwicklung
├── pnpm-workspace.yaml
└── .github/workflows/
```

Prinzip: `apps/*` enthält Fachlogik + Routing einer konkreten Anwendung, `packages/*`
enthält alles, was mehrfach verwendet wird. Neue Frontends (z. B. Marketing-Website)
werden als weitere `apps/*` ergänzt und importieren dieselben `packages/*`.

## 3. Backend

- **Framework:** Django 5.x + [Django Ninja](https://django-ninja.dev/) für eine
  typisierte REST-API (Pydantic-Schemas, Auto-OpenAPI unter `/api/openapi.json`).
- **Content-Verwaltung:** eine eigene `courses`-Domain (Kurs → Modul →
  Lektion → Interaktions-Block) mit eigenem `domain/application/infrastructure`-Schnitt.
  Redaktion läuft über **Django Admin**, direkt auf den Infrastructure-Layer-Modellen
  registriert (reines Operations-Werkzeug außerhalb des Request-Flows, kein Bruch der
  "kein direkter Model-Zugriff aus Views/APIs"-Regel). Die JSON-Payloads der
  Interaktions-Blöcke werden im Admin über `django-json-widget` bearbeitet, validiert
  gegen dasselbe Pydantic-Schema wie die Content-Validierung (siehe unten).
- **DB:** PostgreSQL (via `psycopg`).
- **Hintergrundjobs:** Celery + Redis (TTS-Generierung, Auto-Grading, Benachrichtigungen).
- **Storage:** S3-kompatibel (Cloudflare R2 bevorzugt) via `django-storages`, für Audio/
  Video/Bilder, CDN davor.
- **Zahlungen:** Stripe (Checkout + Webhooks).
- **Auth-Modell:** Eltern-Account (E-Mail/Passwort, Billing) mit mehreren Kind-Profilen
  darunter (vereinfachter PIN-/Avatar-Login, kein E-Mail-Zwang fürs Kind).
- **App-Struktur:** eine Django-App pro fachlicher Domäne unter `backend/apps/`
  (`accounts`, `courses`, `progress`, `payments`, `media_pipeline`), jede mit eigenem
  Ninja-Router, Schemas, Tests und – bei `courses` – der Pydantic-basierten
  Content-Schema-Validierung für Lektionsinhalte.
- **Paketverwaltung:** `pyproject.toml` (PEP 621) + `uv` für schnelle, reproduzierbare
  Installationen (`uv sync`).

## 4. Frontend

- **Framework:** React + TypeScript + Vite.
- **App-Vertrieb:** Web als installierbare PWA; native iOS/Android-Apps via
  [Capacitor](https://capacitorjs.com/) auf derselben Codebasis (`apps/kids-app/ios`,
  `apps/kids-app/android`).
- **Paketverwaltung:** pnpm Workspaces (`workspace:*`-Referenzen zwischen `apps/*` und
  `packages/*`, kein separater Build-Schritt pro Package – Vite kompiliert TS direkt).
- **State:** zustand für Client-State, TanStack Query für Server-State/Caching.
- **API-Anbindung:** Typen werden aus dem Backend-OpenAPI-Schema generiert
  (`openapi-typescript`) und über `openapi-fetch` typisiert konsumiert – Single Source
  of Truth ist das Backend-Schema, nicht handgeschriebene Interfaces.
- **Styling:** Tailwind CSS, Design-Tokens zentral in `@copi/design-system`.
- **Layering-Regel (strikt einzuhalten, per `eslint-plugin-boundaries` erzwungen):**
  `design-system` → `interactions` / `audio` → `features` (App-intern) → `app`.
  Niedrigere Schichten dürfen nie aus höheren importieren.

### Interaktions-Baukasten (`@copi/interactions`)

Kernmuster für Wiederverwendbarkeit: Lektionsinhalte kommen vom Backend als generisches
JSON (`{ id, type, payload }`). Eine zentrale `registry.ts` bildet `block.type` auf die
passende React-Komponente ab; `InteractionRenderer` kennt keinen konkreten Blocktyp,
sondern schlägt nur in der Registry nach. Neue Übungstypen werden ausschließlich dort
angemeldet. Jeder Blocktyp liegt co-located (`Component.tsx` + `useX.ts`-Logik-Hook +
Test) unter `packages/interactions/src/blocks/`.

## 5. Testing

| Ebene | Tool | Scope |
|---|---|---|
| Backend Unit/API | pytest, pytest-django, factory-boy | Models, Ninja-Endpoints, Permissions |
| Backend Integration | responses (HTTP-Mocking) | Celery-Tasks, Stripe-Webhooks, TTS-Calls |
| Frontend Unit | Vitest, Testing Library | Komponenten, Hooks |
| Frontend API-Mocking | MSW | typisiert gegen generiertes Schema |
| E2E | Playwright | vollständige Nutzerflows (Kauf → Login → Lektion) |
| Accessibility | @axe-core/playwright | Kontraste, ARIA, Icon-Buttons |
| Content-Validierung | eigenes Management-Command (Pydantic) | Lektionsschema + Audio-Vollständigkeit |

CI-Reihenfolge: Backend-Tests und Frontend-Tests parallel → E2E gegen
docker-compose-Stack → erst danach Image-Build.

## 6. Infrastruktur & Deployment

- **Container:** Docker, Multi-Stage-Dockerfile für Backend (Builder mit `uv`, schlankes
  Runtime-Image). Frontend wird bevorzugt über Coolifys Nixpacks-Buildpack gebaut
  (kein eigenes Dockerfile nötig), alternativ schlankes nginx-Image.
- **Hosting:** Hetzner-VPS mit [Coolify](https://coolify.io/) als selbstgehostetes PaaS.
- **Managed Services:** Postgres und Redis als Coolify-"Services" (inkl. automatisierter
  Backups), nicht im eigenen Compose definiert.
- **Deployment-Fluss:** Git-Push → GitHub Actions (Test, Lint, Image-Build) → Push nach
  GHCR → Webhook triggert Coolify → Coolify zieht fertiges Image, führt
  Post-Deploy-Hooks aus (`migrate`, `collectstatic`), startet neu.
- **Umgebungen:** mind. Staging + Production als getrennte Coolify-Environments.
- **Monitoring:** Sentry (Backend + Frontend), Coolify-eigene Ressourcen-Metriken.

## 7. Mobile-App-Besonderheiten (Kinder-Zielgruppe)

- Parental Gate (z. B. Rechenrätsel) vor jedem Kauf, externen Link oder Eltern-Bereich –
  Pflicht für Apple "Kids Category" und Google "Play Families Policy".
- Keine verhaltensbasierte Werbung/kein Tracking von Kindern.
- Datenschutzerklärung leicht auffindbar, DSGVO/COPPA-konform.
- Signierung: iOS-Zertifikat/Provisioning-Profile über Apple Developer Program,
  Android-Keystore sicher versioniert (nicht im öffentlichen Repo).

## 8. Code-Konventionen

- **Backend:** `ruff` (Lint + Format), `mypy` + `django-stubs` (Typing), `pre-commit`
  für Git-Hooks.
- **Frontend:** ESLint (inkl. `jsx-a11y`), Prettier, `husky` + `lint-staged`.
- **Commits/Branches:** `main` = Produktionsstand, Feature-Branches mit PR-Pflicht,
  CI muss grün sein vor Merge.
- **Secrets:** ausschließlich über Coolify-Environment-Variablen bzw. lokale `.env`
  (nach `.env.example`), niemals im Image oder Repo.

## 9. Setup-Reihenfolge für einen Agenten

1. Monorepo-Root anlegen, `pnpm-workspace.yaml` mit `apps/*` und `packages/*`.
2. `backend/`: `django-admin startproject config .`, Apps unter `apps/` anlegen,
   `pyproject.toml` gemäß Abschnitt 3 befüllen, `uv sync`.
3. `packages/*`: je ein minimales TS-Package mit `package.json`
   (`name: "@copi/<name>"`, `main`/`types` zeigen auf `src/index.ts`).
4. `apps/kids-app`: `pnpm create vite . --template react-ts`, `@copi/*`-Packages als
   `workspace:*`-Dependencies ergänzen, danach `npx cap add ios` / `npx cap add android`.
5. `apps/parent-portal`: analog zu kids-app, ohne Capacitor (reine Web-App) und ohne
   Abhängigkeit zu `@copi/audio`.
6. `docker-compose.yml` für lokale Postgres/Redis/Backend/Frontend-Entwicklung.
7. `.github/workflows/` für Backend-CI, Frontend-CI, E2E, Deploy gemäß Abschnitt 5/6.
8. Coolify-Projekt auf Hetzner anlegen, Postgres-/Redis-Services provisionieren,
   Deploy-Webhook mit GitHub Actions verknüpfen.