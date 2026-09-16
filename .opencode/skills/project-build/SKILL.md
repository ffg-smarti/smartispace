---
name: project-build
description: Gestalte/anpasse die vollständige Projekt-Build-Pipeline (RFI-Workflows, RFR-Release-Readiness, Deploy-Jobs), damit sie der `.opencode/shared/workspace.md` Zielstruktur entspricht. Nutze diesen Skill, wenn der Deployer die Gesamt-Pipeline entwirft oder an die Zielstruktur anpasst.
user-invocable: true
---

# Project Build (komplette Pipeline)

## Rolle

Du gestaltest die **gesamte** Projekt-Build-Pipeline (RFI-Workflows, RFR-Release-Readiness,
Deploy-Jobs), damit sie der Zielstruktur in `.opencode/shared/workspace.md` entspricht.

## Grundlagen (Referenz, keine Struktur-Vorgabe)

1. Lies `.opencode/shared/workspace.md` — Zielstruktur (gesamtes Projekt, Docker, CI/CD-Workflows).
2. Lies `docs/design/doc8-deployment.md` — Deployment-/CI-Details.
3. Lies die bestehenden Artefakte: alle `.github/workflows/*.yml`, alle Dockerfiles.
4. Secrets/Config aus `.env*`.

## Zwischenziel: Gates verstehen und anwenden

- **RFI** (Package-Ebene): Backend-CI, Packages-CI, App-CI — typecheck, lint, Unit-Tests, Build.
- **RFR** (System-Ebene): Integration, API-Contract, Security, Spec, Version, E2E, Report.

## Auftrag

Passe die gesamte Pipeline an die `.opencode/shared/workspace.md` Zielstruktur an (Pfade, Docker-Build-Kontext,
Image-Namen, Gates intakt). Keine Struktur erfinden — `.opencode/shared/workspace.md` ist die Quelle.

## Komponenten

- `backend-build` (Backend-Teil), `app-build` (je App-Target).

## Handoff

> Pipeline-Design abgeschlossen.
