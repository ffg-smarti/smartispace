---
name: infra-pattern
description: >
  Implementiere die Infrastructure-Schicht eines SMARTi Bounded Context — ORM-Modelle,
  ORM↔Domain-Mapper, Repository, Unit of Work, Query Services, ACL. Nutze diesen Skill, wenn der
  Coder Persistenz-/Infrastruktur-Code erstellt oder ändert. Liefert das Django-ORM-Infra-Muster
  (Implementierung der Application-Ports) und verweist auf die Code-Templates.
user-invocable: true
---

# Infra Pattern (Infrastructure Layer)

## Rolle

Du implementierst die Infrastructure-Schicht: ORM-Modelle (`dweb/dj_<ctx>/models.py`),
ORM↔Domain-Mapper, Repository, Unit of Work, Query Services, ACL. Implementiert die
Application-Ports.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `coder`-Agenten geladen.

1. Lies `.references/acl.md` wenn du ein ACL erstellen sollst.
2. Lies `.references/adapters.md` wenn du ein Repository, Unit of Work, oder Query Service erstellen sollst.
3. Lies `.references/mappers.md` wenn du einen Mapper zwischen ORM und Domain erstellen sollst.
4. Lies `.references/tasks.md` wenn du einen Celery-Task erstellen sollst.
5. Lies `../result-pattern/SKILL.md` wenn du das Result Pattern implementieren sollst.


## Muster

- **ORM-Model:** nur Persistenz; `account_id` als UUID-Feld (kein ForeignKey — ID-Referenz); `db_table` + `app_label`.
- **Infra-Mapper:** `BaseMapper`; Mapping-Fehler → `MappingError`; Value-Object-Auflösung (`.value`).
- **Repository:** implementiert `I<Aggregate>Repository`; `DoesNotExist` → `None` (kein RepositoryError); `IntegrityError` → `RepositoryError`.
- **Unit of Work:** implementiert `I<Aggregate>UnitOfWork`; `_aggregates` + `commit()`-Flag. Events werden in `__exit__` VOR dem Commit dispatched.
- **Query Services (Read Side):** direktes ORM, kein Umweg über Domain-Aggregates; Read-DTOs nur primitive Typen.
- **ACL:** Übersetzt zwischen Bounded Contexts — ORM-Modelle in andere Kontext-Modelle; kein reines ID-Referenz-Mapping.

## Output-Qualität

- Echte Namen aus Spec/Architektur-Dokument, keine Platzhalter.
- Kein ORM in Domain/Application; Implementierung der Ports hier.
- `select_related`/`prefetch_related` für N+1-Vermeidung (Regeln).

## Handoff

> "Infrastructure-Schicht implementiert. Für die API-Schicht führe `presentation-pattern` aus."
