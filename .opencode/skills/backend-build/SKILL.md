---
name: backend-build
description: Gestalte/anpasse den Backend-Teil der SMARTi-Build-Pipeline, damit er der `.opencode/shared/workspace.md` Zielstruktur entspricht. Komponente von project-build. Nutze diesen Skill, wenn der Deployer Backend-Workflows/-Dockerfile entwirft oder an die Zielstruktur anpasst.
user-invocable: true
---

# Backend Build (Pipeline-Design)

## Rolle

Du gestaltest den **Backend-Teil** der Build-Pipeline (Backend-CI-Job, Backend-Docker-Image),
damit er der Zielstruktur in `.opencode/shared/workspace.md` entspricht. Komponente innerhalb von `project-build`.

## Grundlagen (Referenz, keine Struktur-Vorgabe)

1. Lies `.opencode/shared/workspace.md` — Zielstruktur (Backend-/Django-/DDD-Aufbau, Docker-Konfiguration).
2. Lies `docs/design/doc8-deployment.md` — Deployment-/CI-Details, Migrationen, ghcr.
3. Lies die bestehenden Artefakte: `.github/workflows/backend-ci.yml`, `backend/Dockerfile`.
4. Secrets/Config aus `.env.secrets` und `.env.production` für _production_ und `.env.secrets.example` und `.env.production.example` für _development_.

## Zwischenziel: Gates verstehen und anwenden

- **RFI** (Package-Ebene): typecheck, lint, Unit-Tests, Build.
- **RFR** (System-Ebene): Integration, API-Contract, Security, Spec, Version, E2E (→ `project-build`/`release-ready`).

## Auftrag

Passe die Backend-Artefakte so an, dass sie der `.opencode/shared/workspace.md` Zielstruktur entsprechen
(Django-/DDD-Pfade, Docker-Build-Kontext, Migrationen). Keine Struktur erfinden — `.opencode/shared/workspace.md` ist die Quelle.

## Handoff

> Für die Gesamt-Pipeline führe `project-build`.
