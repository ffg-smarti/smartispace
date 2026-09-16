# Project Clean Architecture setup

## Überblick der Clean Architecture Schichten

### 1. Domain Layer - Innerste Schicht (_domain_)

> Die Schichten sind wie im folgenden nach Bedarf aufzubauen pro _Bounded Context_. 
   
   - **Aggregate:** (_model_)                   Geschäftsobjekte mit Geschäftsregeln
   - **Entities:** (_model_)                    Geschäftsobjekte mit Geschäftsregeln (werden nicht in DB gespeichert)
   - **Value Objects:** (_objects_)             Unveränderliche Objekte (BaseValueObjectPydantic Objekte oder Enums)
   - **Domain Services:** (_services_)          OPTIONAL: Geschäftslogik, die nicht zu einer Entity oder Aggregate gehört
   - **Domain Events:** (_events_)              Datenstrukturen für die Event Handler aus anderen Domain (DomainEventBase Objekte)
   - **Enums:** (_enums_)                       OPTIONAL (nur nach Bedarf): Wertbasierte Enums (ChoicesMixin)
   - **Errors:** (_derr_)                       OPTIONAL: Domain Errors 

### 2. Application Layer - Use Cases/Services/Handler (_application_)
   
   - **DTOs:** (_dtos_)                        Datentransferobjekte für Schnittstellen (BaseDTOPydantic Objekte)
   - **Commands:** (_commands_)                OPTIONAL (nur nach Bedarf): Schreib-Intents (BaseCommandPydantic Objekte)
   - **Ports:** (_ports_)                      Abstrakte Schnittstellen (Repository, UoW, ACL)
   - **Handlers:** (_handlers_)                Die eigentliche Logik für Commands/Events
   - **Mappers:** (_mappers_)                  OPTIONAL (nur nach Bedarf): DTO zu Command Mapping

### 3. Infrastructure Layer (_infra_)
   
   - **Adapters:** (_adapters_)                Implementierung der Interfaces
   - **Repositories:** (_repo.py_)             ORM-spezifische Implementierungen (Adapter)
   - **Unit of Work:** (_uow.py_)              ORM-spezifische Implementierungen (Adapter)
   - **Mappers:** (_mappers.py_)               Übersetzung zwischen Domain und ORM
   - **Query Services:** (_query_services.py_) OPTIONAL (nur nach Bedarf): Datenbank Lesezugriffe (Adapter)
   - **ACL:** (_acl.py_)                       OPTIONAL (nur nach Bedarf): Anti-Corruption Layer - Kommunikation zwischen Domains (Adapter)


### 4. Web Layer - Framework spezifisch (_dweb_)
   
   - **Views:** (_views_)                      OPTIONAL (nur nach Bedarf): Django Views
   - **Models:** (_model_)                     OPTIONAL (nur nach Bedarf): Django Models (ORM)
   - **API:** (_api_)                          Django-Ninja End Points
   - **Forms:** (_forms_)                      OPTIONAL (nur nach Bedarf): Django Forms
   - **Templates:** (_templates_)              OPTIONAL (nur nach Bedarf): HTML-Templates
   - **Commands:** (_management_)              OPTIONAL (nur nach Bedarf): Django Commands 

### 5. Presentation Layer - Frontend (_apps_/_packages_)
   - **Packages:** (_packages_)
   - **{{APP_NAME}}/:**

### 6. Konfiguration (durch alle Schichten)
   
   - **Configuration:**                        Einstellungen
   - **django Configuration:** (_settings_)    Django Settings

### 7. Shared Kernel (durch alle Schichten)
   
   - **base.py:**                              Enthält Basistypen wie BaseDTOPydantic für einheitliche Struktur der Typen
   - **objects.py:**                           Unveränderliche Objekte, die in allen Domains genutzt werden (ID-Typen)
   - **events.py:**                            Basis-Klassen für Domain Events
   - **appl/ports.py:**                        Command/Query Handler Interfaces
   - **infra/bus/:**                           Command Bus und Event Bus Implementierungen
   - **infra/uow.py:**                         Basis-Klassen für Unit of Work

```
┌─────────────────────────────────────────────────┐
│           plan/ (Bounded Context)               │
│  - Lernplan (Aggregate Root)                    │
│  - Lernpfad                                     │
│  - Lernstation                                  │
│  - Lernplanner (Domain Service)                 │
│  - Lernziel, Lernstrategie (Value Objects)      │
└─────────────────────────────────────────────────┘
         │ referenziert (ACL)
         ↓
┌─────────────────────────────────────────────────┐
│  Externe Domains (nur IDs referenzieren!)       │
│  - content/ (LessonItemId, TestItemId)          │
│  - session/ (LernsessionId)                     │
│  - account/ (AccountId)                         │
│  - profiles/ (ProfileId)                        │
└─────────────────────────────────────────────────┘
```

## Projektstruktur

### Grobe Strukturübersicht

```
(Root Ebene)
backend/                    # Backend (Django + Clean Architecture)
│    ├── Dockerfile             # Backend Container (Python 3.12 + uv)
│    ├── src/dweb/              # Django Projekt und App Struktur
│    ├── src/smarti/            # DOMAIN DRIVEN DESIGN LAYERS
│    ├── scripts/                 # Backend spezifische Skripte
│    └── tests/                 # TEST STRUCTURE (siehe unten)
apps/kids               # Frontend App (Vite + React, Tailwind CSS + shadcn/ui)
│    ├── Dockerfile          # Frontend Container (Node.js 20)
│    ├── nginx.conf
│    ├── index.html
│    ├── package.json
│    ├── tsconfig.json (+ tsconfig.app.json, tsconfig.node.json)
│    ├── vite.config.ts
│    ├── vitest.config.ts
│    ├── openapi.json        # OpenAPI Schema (Orval-generiert)
│    ├── orval.config.ts     # Orval API-Client-Konfiguration
│    ├── components.json     # shadcn/ui Konfiguration
│    └── src/                # React/TypeScript Quellcode (feature-basiert)
apps/parent/             # Main SMARTi App (Vite + React, Tailwind CSS + shadcn/ui)
│    ├── Dockerfile
│    ├── nginx.conf
│    ├── vercel.json
│    ├── index.html
│    ├── package.json
│    ├── tsconfig.json (+ tsconfig.app.json, tsconfig.node.json)
│    ├── vite.config.ts
│    ├── vitest.config.ts
│    ├── eslint.config.js
│    ├── openapi.json        # OpenAPI Schema (Orval-generiert)
│    ├── orval.config.ts
│    ├── components.json     # shadcn/ui Konfiguration
│    ├── public/
│    │    ├── smarti-logo.png
│    │    ├── placeholder.svg
│    │    └── robots.txt
│    └── src/
packages/                   # Shared Packages (npm Workspaces, nie publiziert)
│    ├── smarti-api/        # @smarti/api — Orval-generierte TanStack Query Hooks + openapi.json
│    │    ├── src/generated/hooks/ (content, dashboard, plan, session, users)
│    │    └── src/generated/schemas/ (~170 Schema-Dateien)
│    ├── smarti-players/    # @smarti/players — Player-Komponenten (9 Player-Komponenten + Registry)
│    │    ├── src/players/ (AppPlayer, CardPlayer, FillInTheBlanksPlayer)
│    │    ├── src/components/ (AudioPlayer, ItemValidationFallback)
│    │    ├── src/hooks/ (useAudio, useDrag, usePlayerLifecycle)
│    │    └── src/__tests__/ (10 Test-Dateien)
│    ├── smarti-session/    # @smarti/session — Session-Komponenten
│    │    ├── src/components/ (ItemPlayerRenderer, SessionControls, SessionProgress, SessionShell)
│    │    └── src/hooks/ (usePlayerLifecycle, useSession)
│    └── smarti-ui/         # @smarti/ui — shadcn/ui-Komponenten, cn()-Helper, Design-Tokens (~50 Komponenten)
├── AGENTS.md                 # Anleitung für KI-Agenten
├── README.md                 # Projekt-README
├── cli.py                    # Root CLI (uv run smarti)
├── pyproject.toml            # Workspace Root
├── setup.py                  # Python Package Setup
├── uv.lock                   # UV Lock File
├── package.json              # npm Workspace Root
├── openapi.json              # OpenAPI Schema (generiert)
├── docker-compose.yml        # Entwicklungsumgebung
├── docker-compose.test.yml   # Testumgebung
├── .dockerignore             # Docker Ignore Regeln
├── build_config.env          # Build-Konfiguration
├── .env                      # Umgebungsvariablen
├── secrets.env               # Secrets (nicht committen)
├── tools/                    # MCP Server & Hilfsskripte
│    ├── commands/            # CLI Commands (coverage, deps, docker, docs, install, minio, server, spec)
│    ├── core/                # Core Funktionen
│    └── mcp/                 # Backend / Frontend MCP Server
├── build/                    # Build-Artefakte (logs, reports, test)
├── x-agent/                  # Agent-Berichte & Specs (35+ Reports)
├── .opencode/                # opencode Konfiguration
│      ├── agents/            # Agents
│      ├── shared/            # shared Kontext
│      ├── rules/             # generic rules
│      ├── commands/          # Agents Commands
│      └── skills/            # Agent skills
├── .vscode/                  # VS Code Einstellungen (+ tasks.json)
└── .github/workflows/        # CI/CD (10 Workflows)
     ├── backend-ci.yml
     ├── packages-ci.yml
     ├── kids-ci.yml
     ├── parent-ci.yml
     ├── e2e-ci.yml
     ├── schema-contract.yml
     ├── deploy.yml
     └── README.md
```

**Docker Konfiguration:**
- `backend/Dockerfile`: Python 3.12-slim mit uv Package Manager, installiert Abhängigkeiten aus uv.lock
- `apps/kids/Dockerfile`: Node.js 20-alpine, installiert Dependencies via npm ci
- `apps/parent/Dockerfile`: Node.js 20-alpine, installiert Dependencies via npm ci
- `docker-compose.yml`: Entwicklungsumgebung mit Backend (Port 8000) und Frontend (Port 8080)
- `docker-compose.test.yml`: Testumgebung für pytest + ruff (Backend) und npm lint (Frontend)

### Django Fein-Struktur

```
backend/src/
├── dweb/                    # DJANGO APPLICATION LAYER
      ├── dsmarti/ (Django Project Config)
      │    ├── __init__.py
      │    ├── settings.py, settings_production.py
      │    ├── urls.py, api.py, schema.py
      │    ├── endpoints.py             # Globale Endpoints (csrf, health)
      │    ├── celery.py                # Celery Konfiguration
      │    ├── asgi.py, wsgi.py
      │    ├── decorators/
      │    │     ├── handler.py         # @handle_api_result decorator
      │    │     └── auth_decorator.py
      │    ├── models/
      │    │     ├── __init__.py
      │    │     ├── event_processing_failure.py
      │    │     └── processed_event.py
      │    └── management/commands/
      │          ├── __init__.py
      │          └── export_openapi_schema.py
      ├── account/ (Django App)
      │    ├── __init__.py, apps.py, admin.py
      │    ├── models.py, urls.py
      │    └── api/
      │         ├── __init__.py
      │         ├── schema.py
      │         └── endpoints.py        # 8 Endpoints (Login, Register, Logout, Child CRUD)
      │
      ├── core/ (Django App) — siehe §Dashboard-API
      │    ├── __init__.py, apps.py
      │    ├── urls.py
      │    └── api/
      │         ├── __init__.py
      │         ├── schema.py
      │         └── dashboard_endpoints.py  # Child + Parent Dashboard (2 Endpoints)
      ├── logs/
      │    └── errors.log, smarti.log
      └──manage.py

```

### Domain Struktur

```
backend/src/
├── smarti/                       # DOMAIN DRIVEN DESIGN LAYERS
│   ├── account/                    # User Accounts Domain
│   │    ├── domain/                    # Domain Layer
│   │    │     ├── model/account.py         # Aggregate dieser Domain
│   │    │     ├── model/items.py           # Entities dieser Domain
│   │    │     ├── objects/goal_vo.py       # Value Objects dieser Domain
│   │    │     ├── objects/enums.py         # Enums (einfache Value Objects) dieser Domain
│   │    │     ├── services/*.py            # Domain Services dieser Domain
│   │    │     └── events.py                # Domain Events dieser Domain
│   │    ├── appl/                      # Application Layer
│   │    │     ├── commands/*.py            # Commands der Account Domain
│   │    │     ├── dtos/*.py                # DTOs der Account Domain
│   │    │     ├── ports/*.py               # Ports der Account Domain
│   │    │     ├── mappers/*.py             # Mappers zw. DTO und Command usw.
│   │    │     └── handler/                 # Handlers
│   │    │          ├── command/*.py        # Command Handlers
│   │    │          ├── query/*.py          # Query Handlers
│   │    │          └── event/*.py          # Event Handlers
│   │    └── infra/                     # Infrastructure Layer
│   │         ├── mappers.py                # Mapper zw. Domain und Infrastructure
│   │         ├── tasks.py                  # Celery tasks der Account Domain
│   │         └── adapters                  # Adapter (Implementierung der appl-Ports)
│   │               └── hashers.py, repo.py, query_services.py, uow.py, acl.py
│   │
│   ├── setup/                      # Bootstrap
│   │    ├── wiring/                # wirring pro Kontext  (z.B. account_wire.py)
│   │    └── bootstrap.py
│   │
│   ├── shared/                      # SHARED KERNEL
│   │    ├── __init__.py
│   │    ├── result.py              # Result-Pattern: Result, Failure, Success
│   │    ├── enums.py               # Shared Enums
│   │    ├── events.py              # Globale Domain-Events
│   │    ├── exceptions.py          # Basis-Exceptions
│   │    ├── objects.py             # ID ValueObjects
│   │    ├── utils.py               # Hilfsfunktionen
│   │    ├── appl/
│   │    │     ├── command.py       # BaseCommandPydantic, QueryBasePydantic
│   │    │     ├── dto.py           # BaseDTOPydantic + shared DTOs
│   │    │     ├── mapper.py        # DtoMapperBase, CommandMapperBase, QueryMapperBase
│   │    │     └── ports.py         # Bus + Handler & Port Base
│   │    ├── domain/
│   │    │     ├── enum.py          # ChoicesMixin
│   │    │     ├── event.py         # Async/SyncDomainEvent + DomainEventMixin
│   │    │     ├── model.py         # BaseDomainModelPydantic
│   │    │     └── object.py        # BaseValueObjectPydantic
│   │    ├── infra/
│   │    │     ├── adapter          # Base Adapter
│   │    |     │     ├── mapper.py  # BaseInfraMapper
│   │    │     |     └── repo.py    # FakeRepoMixin
│   │    │     └── bus/
│   │    │          ├── command_bus.py, event_bus.py, query_bus.py
│   │    │          ├── middlewares.py, celery_tasks.py, celery_dispatcher.py
│   │    │          ├── composite_dispatcher.py, dead_letter_store.py
│   │    │          └── processed_event_store.py
│   │    ├── content/               # Content Shared (Enums, Skills, Checklisten)
│   │    │     ├── __init__.py
│   │    │     ├── enums.py
│   │    │     ├── skills.py
│   │    │     ├── checklist.py
│   │    │     ├── snapshots.py
│   │    │     ├── mailboxes/registry.py
│   │    │     └── stories/registry.py

```

### Frontend allgemeine Struktur (Vite + React SPA)

```
package.json                        # Root: "workspaces": ["apps/*", "packages/*"]
package-lock.json

apps/
  ├── kids/     # Kinder-Lern-App (Vite + React, Capacitor, KEIN shadcn/ui)
  │   ├── Dockerfile         # Frontend Container (Node.js 20)
  │   ├── nginx.conf
  │   ├── index.html         # Vite Entry Point
  │   ├── package.json
  │   ├── tsconfig.json      # (+ tsconfig.app.json, tsconfig.node.json)
  │   ├── vite.config.ts, vitest.config.ts, eslint.config.js
  │   ├── capacitor.config.ts
  │   ├── ios/  android/                # von `cap add ios/android` generiert
  │   ├── openapi.json                  # OpenAPI Schema (Orval-generiert)
  │   ├── orval.config.ts
  │   └── src/
  │       ├── main.tsx                     # Entry Point
  │       ├── App.tsx                      # Hauptkomponente
  │       ├── AppRoutes.tsx                # React Router
  │       ├── styles.css                   # Globale Styles
  │       ├── api/hooks/                   # generiert via Orval aus @smarti/api
  │       ├── test/setup.ts
  │       ├── features/
  │       │    ├── auth/
  │       │    │    ├── components/{ParentLoginForm.tsx, ChildPinPad.tsx}
  │       │    │    └── pages/LoginPage.tsx
  │       │    ├── courses/
  │       │    │    ├── components/{CourseCard.tsx, ModuleList.tsx}
  │       │    │    └── pages/{CourseOverviewPage.tsx, LessonPage.tsx + .test.tsx}
  │       │    └── progress/
  │       │         ├── components/{BadgeShelf.tsx, StreakCounter.tsx}
  │       │         └── pages/ProgressPage.tsx
  │       └── shared/
  │            ├── components/{ParentalGate.tsx, ProtectedRoute.tsx}
  │            ├── context/AuthContext.tsx
  │            ├── hooks/use-mobile.tsx
  │            └── lib/{api-mutator.ts, parseApiErrors.ts, queryClient.ts}
  │
  └── parent/          # Eltern-Portal (Vite + React, Tailwind + shadcn/ui)
         ├── Dockerfile
         ├── nginx.conf
         ├── index.html
         ├── package.json
         ├── tsconfig.json (+ tsconfig.app.json, tsconfig.node.json)
         ├── vite.config.ts, vitest.config.ts, eslint.config.js
         ├── components.json               # shadcn/ui Konfiguration — via @smarti/ui
         ├── openapi.json
         ├── orval.config.ts    
         ├── public/{smarti-logo.png, placeholder.svg, robots.txt}
         └── src/
             ├── main.tsx, App.tsx, AppRoutes.tsx, styles.css
             ├── api/hooks/
             ├── test/setup.ts
             ├── features/
             │    ├── auth/pages/LoginPage.tsx
             │    ├── checkout/
             │    │    ├── components/{CheckoutForm.tsx, PriceSummary.tsx}
             │    │    └── pages/CheckoutPage.tsx + .test.tsx
             │    ├── dashboard/
             │    │    ├── components/{ChildProgressCard.tsx, PurchasedCoursesList.tsx}
             │    │    └── pages/DashboardPage.tsx + Skeleton + .test.tsx
             │    └── account/
             │         ├── components/{DeviceList.tsx, ChildProfileForm.tsx}
             │         └── pages/AccountSettingsPage.tsx
             └── shared/
                  ├── components/ProtectedRoute.tsx
                  ├── context/AuthContext.tsx
                  └── lib/{api-mutator.ts, parseApiErrors.ts, queryClient.ts}

packages/
   ├── smarti-api/             # @smarti/api — Orval-generierte TanStack-Query-Hooks + openapi.json
   │   └── src/generated/
   │        ├── hooks/    (content, dashboard, plan, session, users)
   │        └── schemas/
   ├── smarti-players/         # @smarti/players — Player-Komponenten + Registry
   │   ├── src/players/        # AppPlayer, CardPlayer, FillInTheBlanksPlayer
   │   ├── src/components/     # AudioPlayer, ItemValidationFallback
   │   ├── src/hooks/          # useAudio, useDrag, usePlayerLifecycle
   │   └── src/registry.ts     # PLAYER_REGISTRY
   ├── smarti-session/         # @smarti/session — Session-Rahmen
   │   ├── src/components/     # SessionShell, BreakScreen, SessionControls, SessionProgress
   │   └── src/hooks/          # useSession, usePlayerLifecycle
   └── smarti-ui/              # @smarti/ui — shadcn/ui-Komponenten, cn(), Design-Tokens
       ├── src/components/ui/  # accordion.tsx, alert.tsx usw.
       └── src/hooks/          # use-toast.ts
    

```


### Backend Test Struktur

```
backend/tests/             # TEST STRUCTURE
├── conftest.py                     # Pytest Configuration
├── fixtures/                       # Test-Fixtures
│    └── account_fix.py, content_fix.py ..
├── unit/                         # Unit Tests
│   ├── conftest/                   # Test-spezifische conftest-Dateien
│   ├── account/
│   │    ├── api/                      # API tests
│   │    ├── appl/                     # handler tests (z.B.:login, mapper, create, delete, logout)
│   │    ├── domain/                   # account, child, guest, vo
│   │    ├── infra/                    # mapper, query service, repo
│   │    └── tasks/                    # Celery tasks
│   ├── setup/test_bootstrap.py
│   └── shared/
│        ├── appl/                     # Tests: command_base, command_bus, event_bus, middleware
│        └── infra/bus/                # Tests: celery, composite, dead_letter
├── integration/                    # Integration Tests
│   ├── content/test_content_api.py
│   ├── test_report_handler.py
│   └── test_query_services_fake.py
└── e2e/                            # E2E Tests
    ├── test_content_players.py
    └── test_content_wizard.py
```

---

