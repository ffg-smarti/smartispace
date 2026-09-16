---
name: appl-pattern
description: >
  Implementiere die Application-Schicht eines Project Bounded Context — Commands, DTOs, Ports,
  Mapper, Command-/Query-Handler. Nutze diesen Skill, wenn der Coder Use-Case-Logik erstellt
  oder ändert: einen Command/Handler anlegen, einen DTO→Command-Mapper schreiben, einen Query
  Handler implementieren. Liefert das CQRS-Application-Muster und verweist auf die Code-Templates.
user-invocable: true
---

# Application Pattern (Application Layer)

## Rolle

Du implementierst die Application-Schicht: Commands (Write), DTOs, Ports (Interfaces), Mapper,
Command-/Query-Handler. Orchestriert die Domain und liest via Query Services.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `coder`-Agenten geladen.

1. Lies `.references/command.md` wenn du ein Command oder eine Query erstellen sollst.
2. Lies `.references/dto.md` wenn du ein DTO erstellen sollst.
3. Lies `.references/ports.md` wenn du ein Port (Interface) erstellen sollst.
4. Lies `.references/mappers.md` wenn du einen Mapper erstellen sollst.
5. Lies `.references/handlers.md` wenn du einen Command-/Query-/Event-Handler erstellen sollst
6. Lies `../result-pattern/SKILL.md` wenn du das Result Pattern implementieren sollst.

## Muster

- **Commands:** `BaseCommandPydantic`; Felder sind Value Objects, primitive Typen sind zu vermeiden.
- **Queries:** `QueryBasePydantic`; Felder sind primitive Typen ausgelesen aus dem Read-Model.
- **DTOs:** `BaseDTOPydantic`; DTOs nur primitive Typen.
- **Ports (Interfaces):** `Protocol` mit `I<Aggregate>Repository` / `I<Aggregate>UnitOfWork` — in Application definiert, Implementierung in Infrastructure.
- **Mapper:** dünn, kein try/catch; `_dispatch`-Dict + `map()`; `Result[Command]`; None-Guard für optionale Felder.
- **Handler:** `ICommandHandler[TCmd, TResult]` / `IQueryHandler`; fail-fast bei abhängigen Prüfungen. 
- **Kein ORM-Zugriff** aus der Application — nur via Ports/Repository-Interface.

## Output-Qualität

- Echte Namen aus Spec/Architektur-Dokument, keine Platzhalter.
- Mapper dünn; Business-Logik im Handler/Domain.
- Result-Pattern konsistent (`rules/backend.md` §Result-Pattern & Error-Contract).

## Handoff

> "Application-Schicht implementiert. Für die Infrastruktur führe `infra-pattern` aus."
