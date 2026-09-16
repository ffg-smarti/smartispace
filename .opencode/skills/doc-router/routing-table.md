# Projekt-Path-Router Routing-Tabelle

## A. Design-Docs (`docs/design/`)

Routing-Tabelle: Pfad/Trigger → Design-Doc

| Doc  | Datei                               | Pfad-Pattern                                                | Trigger-Begriffe                                                                  |
| ---- | ----------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| doc4 | doc4-design-principles-frontend.md  | `frontend/**`, `ffg_frontend/**`, `packages/smarti-api/**`  | SPA-Seiten, TanStack Query, Orval, Hooks, Mutators, Wizard, State Management      |
| doc5 | doc5-design-system.md               | `packages/smarti-ui/**`, `**/*.css`                         | Design Tokens, Komponenten-Hierarchie, Styling, shadcn, Theme, Tailwind, CSS      |
| doc8 | doc8-deployment.md                  | —                                                           | Deployment, Infrastruktur, CI-Pipeline, Docker, Vercel, Railway                   |

## B. Projekt-Kontext-Dateien (kanonische Pfade)

Diese Einträge liefern **exakte** Pfade (ab Repo-Root). Bei Namensgleichheit mehrerer Dateien
(z.B. `workspace.md`) gilt **immer** der kanonische Pfad — keine Namenssuche.

| Konzept                        | Kanonischer Pfad                          | Trigger-Begriffe                                      |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------- |
| Zielstruktur (Repo-Layout)     | `.opencode/shared/workspace.md`           | workspace, Zielstruktur, Repo-Layout, Projektstruktur |
| Kerninvarianten                | `.opencode/shared/context.md`             | Kerninvarianten, Clean Arch, CQRS, Result, Mapping    |
| Architektur-Prinzipien         | `.opencode/shared/architecture.md`        | Architektur, DDD, Basisklassen                        |
| Mapping-Strategie              | `.opencode/shared/mapping.md`             | Mapping, DTO, Mapper                                  |
| Namenskonventionen             | `.opencode/shared/naming-conventions.md`  | Naming, Konventionen                                  |
| Backend-Regeln                 | `.opencode/rules/backend.md`              | Backend-Regeln, Django, ORM                           |
| Frontend-Regeln                | `.opencode/rules/frontend.md`             | Frontend-Regeln, shadcn, Komponenten                  |
| Security-Regeln                | `.opencode/rules/security.md`             | Security, Secrets, `.env*`                            |
| General-Regeln                 | `.opencode/rules/general.md`              | Feature-Tracking, Status, Git, Human-in-the-Loop      |
| Tech-Stack-Skill               | `.opencode/skills/tech-stack/SKILL.md`    | Tech-Stack, Framework, Versionen, Pydantic, Django-Ninja, React, Vite, TanStack |
| Agenten-Anleitung              | `AGENTS.md`                               | Systemarchitektur, Agenten, MCP                       |
| Feature-Status                 | `docs/features/INDEX.md`                  | Feature-Status, FEAT-ID, INDEX                        |
| Produktbeschreibung            | `docs/PD.md`                              | Produkt, Vision, Target Users                         |
| Deployment/CI-Guide            | `docs/design/doc8-deployment.md`          | Deployment, Railway, Vercel, CI                       |
| Result-Pattern Skill           | `.opencode/skills/result-pattern/SKILL.md` | Result-Pattern, Result Pattern, Failure, Success, Error Handling |
| Domain Pattern Skill           | `.opencode/skills/domain-pattern/SKILL.md` | Domain Pattern, Aggregate, Value Object, Domain Event |
| Application Pattern Skill      | `.opencode/skills/appl-pattern/SKILL.md` | Application Pattern, Command, Query, Handler, Mapper, Port |
| Infrastructure Pattern Skill   | `.opencode/skills/infra-pattern/SKILL.md` | Infrastructure Pattern, Repository, UoW, Mapper, Query Service, ACL |
| Presentation Pattern Skill     | `.opencode/skills/presentation-pattern/SKILL.md` | Presentation Pattern, Ninja Schema, Endpoint, handle_api_result |
| UI Pattern Skill               | `.opencode/skills/ui-pattern/SKILL.md` | UI Pattern, Frontend Components, Hooks, Pages, Registry |

## Cross-Cutting-Regeln

- **Player-System:** Wenn `target_path` `kids/smarti-players/**`, oder `packages/smarti-players/**` enthält:
  → zusätzlich **doc4** laden (Player-System-Kapitel, §11)

- **Styling:** Wenn `target_path` `app/kids/**` oder `app/parent/**` enthält:
  → zusätzlich **doc5** laden (Design, Styling, Hierarchie)

- **Shared Packages:** Wenn `target_path` `packages/smarti-session/**` oder `packages/smarti-players/**` enthält
  → **doc4** laden (Package-Verantwortlichkeiten §3.1)

- doc6 und doc8 werden nur bei explizitem Trigger geladen, nicht automatisch über Pfade

## Kollisions-Regeln (verbindlich)

- **Namensgleichheit:** Es existieren mehrere Dateien namens `workspace.md` (z.B. in `docs copy/`). Immer den kanonischen Pfad `.opencode/shared/workspace.md` verwenden.
  **Nie** per Namenssuche (`find`/`glob`/`grep`) nach Datei suchen.

## Algorithmus

```
1. target_path gegen alle Pfad-Pattern matchen → Kandidaten-Set A
2. Falls task_description vorhanden: Trigger-Begriffe matchen → Kandidaten-Set B
3. relevant_docs = A ∪ B
4. Cross-Cutting-Regeln prüfen → ggf. weitere Docs hinzufügen
5. Ergebnis: Liste der Dateipfade zurückgeben (Design-Docs unter /design/, Kontext-Dateien ab Repo-Root)
```

Matching-Hinweis: `*` = ein Pfadsegment, `**` = beliebig viele Segmente. Matching ist nicht case-insensitiv.
