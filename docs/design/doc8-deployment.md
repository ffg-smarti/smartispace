# SW Design Principles

## Doc 8 — Deployment Guide

> **Version:** 5.1 **Zuletzt aktualisiert:** 2026-09-11 **Siehe auch:** Doc 1 — Architektur & Prinzipien | Doc 2 — Backend Implementation Guide | Doc 4 — Frontend SPA | Doc 7 — Testing & Build **Zielstruktur:** `.opencode/shared/workspace.md` (maßgebliche Projektstruktur)

---

## Dokumentenübersicht

| Dokument                                                                                                                                                                         | Inhalt                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Doc 1 — Architektur & Prinzipien](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/docs/design/doc1-design-principles-architect.md)          | Tech-Stack, Architektur-Prinzipien                                               |
| [Doc 2 — Backend Implementation Guide](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/docs/design/doc2-design-principles-backend.md)        | CORS-Settings, OpenAPI-Schema-Export                                             |
| [Doc 4 — Frontend SPA Implementierungsguide](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/docs/design/doc4-design-principles-frontend.md) | Umgebungsvariablen, API-Client-Konfiguration                                     |
| **Doc 8 — Deployment Guide** (dieses Dokument)                                                                                                                                   | Deployment-Strategie, Tools, Infrastruktur, Domains, Qualitäts-Gates, Checkliste |
| [Doc 7 — Testing & Build Environment](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/docs/design/doc7-testing-build.md)                     | CI-Pipeline, Test-Ausführung                                                     |

---

## Inhaltsverzeichnis

1. [Monorepo & Deployment-Strategie](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#1-monorepo--deployment-strategie)
2. [Genutzte Tools](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#2-genutzte-tools)
3. [Infrastruktur](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#3-infrastruktur)
4. [Domains](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#4-domains)
5. [Qualitäts-Gates (RFI/RFR)](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#5-qualitts-gates-rfirfr)
6. [Umgebungsvariablen-Referenz](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#6-umgebungsvariablen-referenz)
7. [Monitoring & Fehler-Tracking](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#7-monitoring--fehler-tracking)
8. [Deployment-Checkliste](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#8-deployment-checkliste)
9. [Anhang A — Kosten](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#anhang-a--kosten)
10. [Anhang B — Offene Themen](https://file+.vscode-resource.vscode-cdn.net/home/wawassik/ffg/smarti_p/docs/design/doc8-deployment.md#anhang-b--offene-themen)

---

## 1. Monorepo & Deployment-Strategie

### 1.1 Zielstruktur

Die maßgebliche Projektstruktur liegt in **`.opencode/shared/workspace.md`**. Dieses Dokument beschreibt nur die **Deployment-Prinzipien** (WAS) — die konkrete Umsetzung (WIE) entscheidet der **Deployer-Agent** und schreibt sie in die echten Code-Dateien (`.github/workflows/*`, `*/Dockerfile`, Build-Skripte).

### 1.2 Deployment-Modell

- **Container-Registry:** GitHub Container Registry (`ghcr.io`) — Images werden in CI gebaut und gepusht.
- **Deployment-Tool:** Coolify (self-hosted auf Hetzner-VPS) — SSL, Routing, Logs, Webhooks.
- **Hosting:** Backend + beide Frontends laufen als Docker-Container auf dem Hetzner-VPS.
- **Auslöser:** GitHub Actions (Deploy-Workflow) — **kein** direkter Zugriff des Hosting-Dienstes aufs Repo.
- **Frontends:** Zwei Apps (`apps/parent`, `apps/kids`) teilen sich die Shared Packages (`@smarti/*`). **Kein Vercel** — alles läuft über Coolify + ghcr.io.

### 1.3 Build-Kontext (nicht verhandelbar)

Da die Frontend-Dockerfiles Shared Packages aus `packages/` und das Backend `pyproject.toml`/`uv.lock` aus dem Root benötigen, ist der **Docker-Build-Kontext immer das Repository-Root** (`docker build --file <app>/Dockerfile .`).

### 1.4 Warum Docker statt direktem Git-Deploy

- Kein Repository-Zugriff für den Hosting-Dienst nötig (nur das fertige Image).
- Reproduzierbare Builds (identisches Image in CI und Production).
- Monorepo-kompatibel (Build-Kontext = Root, jedes Dockerfile kopiert selektiv).
- Lokale Entwicklung via `docker-compose.yml` spiegelt die Production-Umgebung.

### 1.5 Backend-Deployment-Struktur (Zielstruktur `workspace.md`)

| Element                    | Pfad / Wert                                      |
| -------------------------- | ------------------------------------------------ |
| Django-Projekt             | `backend/src/dweb/dsmarti/`                      |
| `manage.py`                | `backend/src/dweb/manage.py`                     |
| Settings (Dev)             | `dsmarti.settings`                               |
| Settings (Production)      | `dsmarti.settings_production`                    |
| WSGI                       | `dsmarti.wsgi:application`                       |
| Celery-App                 | `celery -A dsmarti worker/beat`                  |
| OpenAPI-Export-Command     | `manage.py export_openapi_schema`                |
| DDD-Layer (Domain/Appl/Infra) | `backend/src/smarti/<domain>/…`              |
| Django-Apps                | `backend/src/dweb/<app>/` (account, core, …)     |

> **Konvention:** Das DDD-Paket heißt `smarti` (`backend/src/smarti/`), das Django-Projekt heißt `dsmarti` (`backend/src/dweb/dsmarti/`). Beide liegen parallel auf dem `PYTHONPATH` — der Name `smarti` ist für `django-admin startproject` deshalb blockiert.

---

## 2. Genutzte Tools

### CI/CD & Deployment

| Tool                                  | Rolle                                                 |
| ------------------------------------- | ----------------------------------------------------- |
| GitHub Actions                        | CI/CD-Pipeline (RFI/RFR-Workflows, Deploy-Workflow)   |
| GitHub Container Registry (`ghcr.io`) | Image-Registry (Backend + Frontends)                  |
| Docker                                | Container-Build und -Runtime                          |
| Coolify                               | Deployment auf Hetzner (SSL, Routing, Logs, Webhooks) |
| Hetzner VPS                           | Hosting (Backend + Frontends + Datenbank)             |
| GitHub CLI (`gh`)                     | Workflow-/Release-/Secrets-Operationen                |

### Runtime & Build

| Tool             | Rolle                                  |
| ---------------- | -------------------------------------- |
| Node.js 20 + npm | Frontend-Apps + Shared Packages        |
| Python 3.12 + uv | Backend (Abhängigkeiten, CLI)          |
| gunicorn         | WSGI-Server (Backend-Production)       |
| nginx            | Static-Serving (Frontend-Container)    |
| Orval            | OpenAPI → TypeScript-Typen-Generierung |

### Backend-Qualität

| Tool              | Rolle                      |
| ----------------- | -------------------------- |
| ruff              | Linting                    |
| pyrefly           | Type-Checking              |
| pytest            | Unit- & Integration-Tests  |
| Schemathesis      | API-Contract-Tests         |
| pytest-playwright | E2E-Tests (Backend-seitig) |

### Frontend-Qualität

| Tool             | Rolle         |
| ---------------- | ------------- |
| tsc (TypeScript) | Type-Checking |
| ESLint           | Linting       |
| Prettier         | Formatierung  |
| Vitest           | Unit-Tests    |
| Playwright       | E2E-Tests     |

### Projekt-eigene Tools

| Tool                                                | Rolle                                                 |
| --------------------------------------------------- | ----------------------------------------------------- |
| `uv run smarti` CLI (`cli.py`)                      | `test unit-test`, `test api`, `dj runserver`, …       |
| MCP-Server (`backend-mcp`, `kids-app-mcp`, `parent-portal-mcp`) | Test-/Build-Integration für Agenten (in `tools/mcp/`) |
| `tools/`                                            | MCP-Server & Hilfsskripte                             |

### Infrastruktur

| Tool                         | Rolle                  | Phase   |
| ---------------------------- | ---------------------- | ------- |
| PostgreSQL (Coolify-managed) | Datenbank              | Phase 1 |
| Neon PostgreSQL              | Datenbank (Branch-DBs) | Phase 2 |
| Cloudflare                   | DNS + SSL              | Phase 1 |
| MinIO                        | Object Storage (Dev)   | Phase 1 |
| Cloudflare R2                | Object Storage (Prod)  | Phase 1 |
| Redis (Celery-Broker)        | Async-Tasks (Celery)   | Phase 1 |
| Sentry                       | Fehler-Tracking        | Phase 2 |
| Zoho Mail                    | E-Mail-Versand         | Phase 2 |

---

## 3. Infrastruktur

### 3.1 Komponenten

| Komponente         | Dienst                                             | Phase |
| ------------------ | -------------------------------------------------- | ----- |
| Container-Registry | GitHub Container Registry (ghcr.io)                | 1     |
| Datenbank          | Coolify-PostgreSQL                                 | 1     |
| Datenbank          | Neon PostgreSQL (Branch-DBs pro PR)                | 2     |
| Backend-Server     | Hetzner VPS (CX22, 🇩🇪 Falkenstein, Ubuntu 24.04) | 1     |
| Deployment-Tool    | Coolify (self-hosted auf Hetzner)                  | 1     |
| Frontend-Hosting   | Coolify (Docker-Container auf Hetzner)             | 1     |
| Object Storage     | MinIO (Dev) / Cloudflare R2 (Prod)                 | 1     |
| Async-Tasks        | Celery + Redis (Coolify-Service)                   | 1     |
| DNS / SSL          | Cloudflare                                         | 1     |
| E-Mail             | Zoho Mail                                          | 2     |
| Fehler-Tracking    | Sentry                                             | 2     |

### 3.2 Datenbank

- **Phase 1:** Coolify-PostgreSQL (managed Service auf dem VPS, Daten bleiben in Deutschland).
- **Phase 2:** Neon (Frankfurt) — Branch-Datenbanken pro Pull Request.
- Django-Konfiguration identisch — nur `DATABASE_URL` unterscheidet sich.

### 3.3 Object Storage

- **Dev:** MinIO (lokal via `docker-compose`).
- **Prod (Phase 1):** Cloudflare R2 (privater Bucket, signierte URLs) für Audio/Video/PDF/Media-Assets.
- **Dev/Prod-Übergang:** nur `R2_ENDPOINT_URL`/`R2_*`-Umgebungsvariablen ändern.

### 3.4 Fehler-Tracking & Monitoring (Phase 2)

- **Sentry:** separates Projekt für Backend + jedes Frontend.
- **DSGVO-Pflicht:** `send_default_pii=False` — keine Kinderdaten, IPs, Request-Bodies.
- **Logging:** Coolify streamt `stdout`/`stderr` (Service → Logs) und speichert auf dem VPS.

---

## 4. Domains

### 4.1 Phase 1 (Subdomains unter `fit-fuer-gymnasium.de`)

| Subdomain                      | Ziel                                       |
| ------------------------------ | ------------------------------------------ |
| `kids.fit-fuer-gymnasium.de`   | Kinder-Lern-App (`apps/kids`)              |
| `parent.fit-fuer-gymnasium.de` | Eltern-Portal (`apps/parent`)              |
| `copi.fit-fuer-gymnasium.de`   | Backend-API (geteilt von beiden Frontends) |

### 4.2 Phase 2

Die tatsächlich genutzte Domain ist **offen** (aktuell nur `fit-fuer-gymnasium.de` im Besitz). Weitere Domains werden erst nach Klärung ergänzt.

### 4.3 DNS & SSL (Cloudflare)

- SSL-Modus **Full (strict)**, Always Use HTTPS, HSTS.
- **Caching-Regeln:** API-/Admin-Pfade nie cachen (`copi.fit-fuer-gymnasium.de/api/*`, `/admin/*`); statische Assets (`/assets/*`) lang cachen (immutable).
- MX-Einträge (Zoho) **nie** proxied.

---

## 5. Qualitäts-Gates (RFI/RFR)

Die Pipeline hat zwei Stufen — konkrete Umsetzung in `.github/workflows/*` (vom Deployer gepflegt).

### 5.1 RFI (Ready For Integration)

- **Package-Ebene:** Typecheck, Lint, Unit-Tests, Build.
- Läuft bei jedem Push/PR in Feature-Branches.
- Integration-/E2E-Tests **nicht** Pflicht.
- Workflows: Backend-CI, Packages-CI, App-CI (je Target).

### 5.2 RFR (Ready For Release)

- **System-Ebene:** Integration-Tests, Migration-Konsistenz, Security-Audit, Spec-Validierung, Versions-Check.
- Läuft als **reusable Workflow** (`rfr.yml`, `workflow_call`), aufgerufen von `delivery.yml`.
- Muss grün sein, bevor ein Tag erstellt / freigegeben wird.
- Workflow: `rfr.yml` (+ Report).

### 5.3 Release-Tagging & Delivery (auf `main`) — NEU

- **`delivery.yml`** (manuell, auf `main`) orchestriert den Release-Weg:
  1. `rfi-gate` → RFI (reusable `rfi.yml`)
  2. `rfr` → RFR (reusable `rfr.yml`)
  3. `schema-export` + `build-test` → Container für **Testzwecke** bauen (ghcr `:test`)
  4. `release` → **Git-Tag `v{version}` auf `main`** + **GitHub Release** (Doku), nur wenn
     `create_tag=true` **und** alle Gates grün.
- **Gate:** Der Tag entsteht **nur**, wenn RFI + RFR bestanden sind.
- **Zweck:** Der Tag ist das **reale Bezugsobjekt** für den `version-check` (Vergleich
  `pyproject.toml`-Version gegen letzten Git-Tag) und wird manuell gemerged.
- **Deploy (Phase 1):** `deploy.yml` liefert **nur aus** (Build → ghcr). Das eigentliche
  Deployment in Coolify erfolgt aktuell **manuell** und wird in **Phase 2** automatisiert.

### 5.4 Release-Ablauf (real)

1. `main`: RFI-Jobs (`backend-ci`, `packages-ci`, `parent-ci`, `kids-ci`) laufen grün.
2. `delivery.yml` (manuell auf `main`): **RFI-Gate** (rfi.yml) **UND RFR-Gate** (rfr.yml) müssen **beide grün** sein → dann Test-Builds → **Tag `v{version}` auf `main`** + Release-Doku. Ohne grünes RFR-Gate wird **kein** Tag erstellt.
3. **Mensch:** Tag (getaggte main-Commit) **manuell** auf `release` mergen.
4. `deploy.yml` (Trigger `push: release`): Images `:tag` bauen → **ghcr**. Coolify-Deployment manuell (Phase 2: automatisch).



---

## 6. Umgebungsvariablen-Referenz

> Werte werden nicht hier dokumentiert — sie liegen im Deployment-Tool (Coolify) bzw. als GitHub-Secrets. Variable → Zweck.

### 6.1 Übersicht der `.env*`-Dateien (Zweck + Konsument)

| Datei | Status | Zweck | Konsument | Committen? |
|-------|--------|-------|-----------|-----------|
| `./build_config.env` | TRACKED | Projekt-Root-Vorgaben für das `smarti`-CLI-Tool | `cli.py` (lädt via `_load_env_file`) | ja |
| `./secrets.env` | untracked (gitignored) | lokale Dev-Secrets (MinIO, AWS_S3, SSH) | `cli.py` (überschreibt `build_config.env`) | nein |
| `./.env` | untracked (gitignored) | lokale Dev-Konfiguration (MinIO, DATABASE_URL) | `tools/commands/minio.py` | nein |
| `backend/.env` | untracked (gitignored) | **native Django-Dev-Konfiguration** | `settings.py`/`settings_production.py` via `load_dotenv()` (python-dotenv) | nein |

### 6.2 Wer lädt wann was

- **`smarti`-CLI** (`cli.py`): lädt `build_config.env` (Vorgaben) + `secrets.env` (überschreibt) in `os.environ`. Gilt für CLI-Befehle (`test`, `dj`, …) und von dort gestartete Subprozesse.
- **Django-Settings** (`settings.py` / `settings_production.py`): lesen `os.environ` und laden zusätzlich `backend/.env` via `load_dotenv()` (python-dotenv). **Überschreibt** gesetzte ENV-Variablen **nicht** → Coolify/CI-Env hat Vorrang.
- **`docker-compose.yml`**: nutzt **Interpolation** `${VAR:-default}` — liest die Root-`.env` (im Compose-Verzeichnis) und ersetzt nur die im Compose **referenzierten** Variablen; fehlende Variablen fallen auf den `:-default`-Wert zurück. `DATABASE_URL` ist bewusst nicht interpoliert (Container-Host heißt `db`, nicht `localhost`).
- **`tools/commands/minio.py`**: liest `.env` (Root) für MinIO-Zugangsdaten.
- **Coolify (Production)**: liefert die ENV-Variablen zur Laufzeit an den Container (keine Datei nötig).
- **GitHub Actions (CI)**: Secrets via `${{ secrets.* }}` (z. B. `PROD_*`, `COOLIFY_*`).

### 6.3 Backend

| Variable                                                                        | Zweck                                               | Pflicht    |
| ------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- |
| `SECRET_KEY`                                                                    | Django Secret Key                                   | ✅          |
| `DATABASE_URL`                                                                  | Datenbank-Connection-String                         | ✅          |
| `ALLOWED_HOSTS`                                                                 | Erlaubte Hosts (inkl. `localhost` für Health-Check) | ✅          |
| `CORS_ALLOWED_ORIGINS`                                                          | Frontend-Domains                                    | ✅          |
| `DJANGO_SETTINGS_MODULE`                                                        | Production-Settings (`dsmarti.settings_production`)  | ✅          |
| `R2_ENDPOINT_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Object Storage                                      | ✅ (Prod)   |
| `R2_REGION_NAME`                                                                | R2-Region (Default `auto`)                          | –           |
| `SENTRY_DSN`                                                                    | Fehler-Tracking                                     | Empfohlen  |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | SMTP (Zoho)                 | Für E-Mail |
| `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`                                    | Redis-Broker (Celery)                               | Bei Async  |
| `LOG_LEVEL`                                                                     | Log-Level (Default `INFO`)                          | –           |
| `SECURE_SSL_REDIRECT`                                                           | HTTPS-Redirect (Default `True`)                     | –           |

### 6.4 Frontends

| Variable       | Zweck                          | Pflicht |
| -------------- | ------------------------------ | ------- |
| `VITE_API_URL` | Backend-Basis-URL (Build-Zeit) | ✅       |

> **Regel:** Nur `VITE_`-präfixierte Variablen landen im Browser-Bundle — niemals Secrets als `VITE_`-Variable. Shared Packages haben keine eigenen Env-Vars — sie erben die Build-Variablen des einbindenden App-Frontends.

---

## 7. Monitoring & Fehler-Tracking

- **Sentry (Phase 2):** je ein Projekt für Backend + jedes Frontend.
- **DSGVO:** Kinderdaten-PII entfernen (`send_default_pii=False`, `beforeSend` bereinigt `email`/`ip_address`).
- **Logging:** Backend-Logs via Coolify (Service → Logs) und `docker logs <container>`.
- **Health-Check:** Backend-Endpoint für Coolify (ohne Auth) — `/api/v1/health/`.

---

## 8. Deployment-Checkliste

### 8.1 Vor jedem Production-Deployment

```
□ CI-Pipeline grün (alle RFI-Workflows inkl. Packages-CI)
□ RFR-Workflow grün (Integration, Contract, Security, Spec, Version, E2E)
□ Bei Backend-Änderungen: OpenAPI-Schema generiert (Artefakt `openapi-schema`, nicht committet)
□ Bei Shared-Package-Änderungen: Packages-CI + beide App-CIs grün
□ Bei Breaking Changes im API: Frontend-Koordination (Doc 2)
□ Migrationen reviewed (irreversible besonders)
□ Keine offenen kritischen Fehler
□ Release-Tag v{version} erstellt (nur nach bestandenem RFR-Gate)
```

### 8.2 Nach jedem Production-Deployment

```
□ Coolify: Backend-Service "Running" (nicht "Restarting")
□ Coolify-Logs: Migrationen erfolgreich, gunicorn gestartet
□ Smoke-Tests:
  □ kids.fit-fuer-gymnasium.de lädt, Guest-/Kind-Flow funktioniert
  □ parent.fit-fuer-gymnasium.de: Login/Registrierung
  □ copi.fit-fuer-gymnasium.de/api/v1/health/ → 200
  □ Audio-/Media-Upload abspielbar (bei R2 aktiv)
  □ Keine Fehler in Coolify-Logs
```

### 8.3 Erstes Production-Deployment (Infrastruktur)

```
□ Hetzner VPS (CX22, Ubuntu 24.04) angelegt, IPv4 notiert
□ Coolify installiert (curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash)
□ ghcr.io als Registry in Coolify verbunden
□ Datenbank gewählt (Coolify-PG Phase 1 / Neon Phase 2)
□ Backend-Service + je ein Frontend-Service angelegt (Image aus ghcr.io, Port, Domain, Health-Check)
□ Umgebungsvariablen gesetzt (§6)
□ Cloudflare: DNS-Einträge (kids/parent/copi), SSL Full (strict), Caching-Regeln
□ GitHub-Secrets gesetzt (COOLIFY_*, PROD_*)
```

---

## Anhang A — Kosten

| Dienst                       | Plan                     | Kosten/Monat | Phase |
| ---------------------------- | ------------------------ | ------------ | ----- |
| GitHub Container Registry    | Free                     | 0 €          | 1     |
| Hetzner VPS                  | CX22 (2 vCPU, 4 GB)      | ~3,79 €      | 1     |
| Coolify                      | Self-hosted              | 0 €          | 1     |
| Cloudflare                   | Free                     | 0 €          | 1     |
| PostgreSQL (Coolify-managed) | auf VPS                  | 0 €          | 1     |
| MinIO                        | Self-hosted (Dev)        | 0 €          | 1     |
| Neon                         | Free (0.5 GB, Frankfurt) | 0 €          | 2     |
| Cloudflare R2                | Free (10 GB)             | 0 €          | 1     |
| Sentry                       | Free                     | 0 €          | 2     |
| Zoho Mail                    | Free                     | 0 €          | 2     |

---

## Anhang B — Offene Themen

| #   | Thema                                                        | Status              |
| --- | ------------------------------------------------------------ | ------------------- |
| 1   | Coolify Deploy-Webhook — `COOLIFY_SERVICE_UUID` verifizieren | Ausstehend          |
| 2   | Neon Branch-Automatisierung (Branch-DB pro PR)               | Ausstehend          |
| 3   | Staging-Umgebung (zweiter Coolify-Service)                   | Ausstehend          |
| 4   | `openapi.json` im Repo committen (Fallback)                  | Offen               |
| 5   | Celery + Redis auf Hetzner via Coolify                       | Umgesetzt (Phase 1) |
| 6   | DSGVO-Audit Sentry (Kinderdaten)                             | Ausstehend          |
| 7   | Rate Limiting (Auth-Endpoints)                               | Ausstehend          |
| 8   | MinIO-Bucket-Initialisierung automatisieren                  | Ausstehend          |
| 9   | VPS-Monitoring (UptimeRobot o.ä.)                            | Ausstehend          |
| 10  | Phase-2-Domain klären (aktuell nur `fit-fuer-gymnasium.de`)  | Offen               |
| 11  | Git-Tag/Release-Automatisierung (RFR-gated, `v{version}`)   | Umgesetzt (Phase 1) |
