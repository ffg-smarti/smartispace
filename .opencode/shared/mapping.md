# Zweiseitige Mapping-Strategie — Prinzipien

Ziel: keine rohen ORM-Modelle oder Domain-Objekte über Schichtgrenzen.
Code-frei; Templates → `skills/architect-backend/references/`.

## Inbound (Write Side)

```
Ninja-Schema (Pydantic-Validierung — einzige Input-Schranke)
→ DTO (nur primitive Typen)
→ Mapper.to_command() → Command (mit Value Objects)
→ Handler.handle() → Domain Aggregate
```

- Schema ist die einzige Validierungsgrenze — ungültig → automatisch 422.
- Mapper ist dünn: kein try/catch, kein Result, keine Business-Logik.
- Optionale Felder mit None-Guard (`VO(dto.field) if dto.field else None`).

## Outbound (Read Side)

```
Query Service / Domain-Event → Read DTO (nur primitive Typen) → Ninja serialisiert direkt
```

- Read DTO enthält nur primitive Typen; Value Objects werden vorher aufgelöst (`.value`).
- Read Side liest direkt via ORM — kein Umweg über Domain-Aggregates.

## Fehler in Mappern

- Technische Mapping-Fehler → Exception (MappingError), nie als Result versteckt.
- Value-Object-Constructors dürfen für Invarianten werfen (Entwicklerfehler).
- Erwartbare Business-Failures propagieren als Result.