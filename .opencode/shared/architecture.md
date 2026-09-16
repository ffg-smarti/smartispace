# Clean Architecture, DDD & CQRS — Prinzipien

Code-freie Prinzipien. Konkrete Templates → `skills/architect-backend/references/`.

## Clean Architecture (4 Schichten)

- **Domain:** Aggregate, Entities, Value Objects, Domain Events, Enums — keine Framework-Abhängigkeiten.
- **Application:** Commands, DTOs, Ports (Interfaces), Mapper, Handler — orchestriert Domain.
- **Infrastructure:** Repository, Unit of Work, Mapper (ORM↔Domain), Query Services, ACL.
- **Presentation:** Django-Ninja Schemas + Endpoints (Backend) / UI-Komponenten (Frontend).

### Regeln:

- Abhängigkeiten zeigen nach innen; äußere Schichten kennen innere, nie umgekehrt.
- Interfaces in Domain/Application, Implementierungen in Infrastructure (DIP).
- Kein ORM-/Django-Zugriff aus Domain/Application — nur via Repository-Interface.

## DDD (Bounded Contexts)

- Ein Bounded Context = eine fachliche Domäne mit eigenem
  `domain/application/infrastructure`-Schnitt (Backend: ein Domänen-Schnitt unter `backend/src/smarti/<context>/`,
  Django-App unter `backend/src/dweb/<context>/`).
- Aggregate Roots, Entities, Value Objects; Aggregate Root ist der einzige Einstiegspunkt.
- Domains kommunizieren **nur** über Domain Events + ACL, nie durch direkte Imports.
- Fremde Contexts werden nur via ID-Referenz referenziert (kein Join, kein FK in Domain).

## CQRS

- **Write Side:** Commands → Command Handler → Domain Aggregate. Commands sind imperativ
  benannt (`CreateLernplanCommand`); Command-Felder sind Value Objects.
- **Read Side:** Query Services lesen direkt via ORM, kein Umweg über Domain-Aggregates.
  Read DTOs enthalten nur primitive Typen.
- Trennung ist strukturell (eigene Handler/Ports), nicht zwingend getrennte Stores.