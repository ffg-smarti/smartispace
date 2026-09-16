---
name: app-build
description: Gestalte/anpasse die Build-Pipeline einer einzelnen SMARTi-Frontend-App (apps/kids bzw. apps/parent), damit sie der `.opencode/shared/workspace.md` Zielstruktur entspricht. Nutze diesen Skill, wenn der Deployer einen App-CI-Workflow oder App-Dockerfile entwirft oder an die Zielstruktur anpasst.
user-invocable: true
---

# App Build (Pipeline-Design)

## Rolle

Du gestaltest die Build-Pipeline für eine einzelne Frontend-App (`apps/kids` oder `apps/parent`),
damit sie der Zielstruktur in `.opencode/shared/workspace.md` entspricht.

## Grundlagen (Referenz, keine Struktur-Vorgabe)

1. Lies `.opencode/shared/workspace.md` — Zielstruktur (Frontend-Struktur, `apps/*`, Docker-Konfiguration).
2. Lies `docs/design/doc8-deployment.md` — Deployment-/CI-Details.
3. Lies die bestehenden Artefakte: `.github/workflows/Kids-ci.yml`, `.github/workflows/Parent-ci.yml`, die App-Dockerfiles.
4. Secrets/Config aus `.env.secrets` und `.env.production` für _production_ und `.env.secrets.example` und `.env.production.example` für _development_.

## Zwischenziel: Gates verstehen und anwenden

- **RFI** (Package-Ebene): typecheck, lint, Unit-Tests, Build.

## Auftrag

Passe die App-Artefakte (CI-Workflow, Dockerfile) so an, dass sie der `.opencode/shared/workspace.md` Zielstruktur
entsprechen (App-Pfade, Repo-Root-Build-Kontext, Image). Keine Struktur erfinden — `.opencode/shared/workspace.md` ist die Quelle.

## Handoff

> Für die Gesamt-Pipeline führe `project-build`.
