---
name: domain-pattern
description: >
  Implementiere die Domain-Schicht eines SMARTi Bounded Context — Aggregate Root, Entities,
  Value Objects, Domain Events, Enums. Nutze diesen Skill, wenn der Coder Domain-Code erstellt
  oder ändert: Aggregate anlegen, Value Object definieren, Domain Event auslösen, Enum ergänzen.
  Liefert das DDD-Domain-Muster (kein ORM, kein Framework) und verweist auf die Code-Templates.
user-invocable: true
---

# Domain Pattern (Domain Layer)

## Rolle

Du implementierst die Domain-Schicht eines Bounded Contexts: Aggregate Root, Entities,
Value Objects, Domain Events, Enums — frei von Framework-/ORM-Abhängigkeiten.

## Grundlagen

> **Base-Kontext** (`AGENTS.md`, `shared/context.md`, `shared/workspace.md`, `rules/general.md`,
> `docs/features/INDEX.md`, `shared/naming-conventions.md`) wird vom `coder`-Agenten geladen.

1. Lies `.references/events.md` wenn du ein Event erstellen sollst.
2. Lies `.references/model.md` wenn du ein Aggregat oder Entity erstellen sollst.
3. Lies `.references/objects.md` wenn du ein ValueObject oder ein Enum erstellen sollst.
4. Lies `.references/services.md` wenn du einen Domain-Service erstellen sollst.
5. Lies `../result-pattern/SKILL.md` wenn du das Result Pattern implementieren sollst.

## Muster

- **Aggregate Root:** einziger Einstiegspunkt, `create()`-Factory aus Command, Invarianten als `Result`-Failure.
- **Value Objects:** unveränderlich; `BaseValueObjectPydantic`; Invarianten werfen (`ValueError`), fachliche Kombinationsregeln via `create()` → `Result`.
- **Domain Events:** `DomainEventBase`; beim Zustandswechsel `_raise_event(...)`.
- **Enums:** `ChoicesMixin` + `enum.Enum`.
- **Kein ORM/Import aus `dweb/`** in der Domain.

### Sync-Event vs. Async-Event — Entscheidungsbaum (Domain-Schicht)

Wenn ein Domain-Event ausgelöst wird, muss in der Domain klar sein, ob es ein **Sync-Event** oder **Async-Event** ist:

```
Gibt es eine fachliche Abhängigkeit, die atomar erledigt werden muss
(im selben Bounded Context, gleiche Datenbank)?
├── JA → SyncDomainEvent
│   → Wird in derselben Transaktion ausgeführt
│   → Handler-Fehler → Transaction-Rollback (stark konsistent)
│   → Beispiel: ParentAccount gelöscht → ChildAccount gelöscht
└── NEIN → AsyncDomainEvent
    → Wird via Celery-Worker asynchron verarbeitet
    → Handler-Fehler → DeadLetterStore + Retry (eventual consistency)
    → Beispiel: Account gelöscht → E-Mail senden (anderer Context)
```

**ACL ≠ Event-Orchestrierung:**
- ACL übersetzt externe Modelle in die interne Domain-Sprache
- ACL orchestriert keine Kaskaden-Operationen
- Kaskaden zwischen Contexts → Async-Event + DeadLetterStore
```

## Output-Qualität

- Echte Domänennamen aus Spec/Architektur-Dokument, keine Platzhalter.
- Nur primitive Typen + Value Objects in Signatures.
- Result-Pattern für erwartbare Business-Failures; Exceptions für Invarianten.

## Handoff

> "Domain-Schicht implementiert. Für die Application-Schicht führe `appl-pattern` aus."
