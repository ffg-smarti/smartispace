# SMARTi Backend Patterns (Architekt)

Design-Patterns für das Backend-Architektur-Dokument. **Prinzipien und Code** liegen
als Single-Source in `shared/` bzw. `rules/` bzw. den `*-pattern/references/` — hier nur Verweise.

## Verweise (Single-Source)

| Thema | Quelle |
|---|---|
| Clean Architecture, DDD, CQRS | `.opencode/shared/architecture.md` |
| Zweiseitige Mapping-Strategie | `.opencode/shared/mapping.md` |
| Result-Pattern & Error-Contract | `.opencode/rules/backend.md` §Result-Pattern & Error-Contract |

## Fehlerbehandlung (Design-Entscheidung)

- `@handle_api_result` nur auf Command-Endpoints (liefern `Result`); Query-Endpoints liefern DTOs direkt. Ein globaler Exception-Handler (`dweb/dsmarti/api.py`) mappt alle Nicht-`Result`-Fehlerpfade auf denselben Error-Contract.
- Fehler-Contract + ErrorCode→HTTP-Mapping → `.opencode/rules/backend.md` §Result-Pattern & Error-Contract.

## OpenAPI Contract — Breaking Changes

| Änderung                          | Breaking?                                |
| --------------------------------- | ---------------------------------------- |
| `operation_id` umbenennen         | ✅ Ja — Frontend Query Keys ändern sich   |
| Tag umbenennen                    | ✅ Ja — generierter Dateiname ändert sich |
| Pflichtfeld zu Request hinzufügen | ✅ Ja                                     |
| Feld aus Response entfernen       | ✅ Ja                                     |
| Optionales Feld hinzufügen        | ❌ Nein                                   |
| Feld zu Response hinzufügen       | ❌ Nein                                   |
| Neuen Endpoint hinzufügen         | ❌ Nein                                   |

> Bei Breaking Changes: Schema-Version in `NinjaAPI(version=...)` erhöhen (SemVer) + GitHub Issue im Frontend-Repo eröffnen.

## API-Versionierung (Design-Regel)

- Alle Router mit `/api/v{{x}}/` präfixieren (Registrierung in `dweb/dsmarti/api.py`).
- Bestehende Version niemals breaking ändern — stattdessen version inkrementieren und parallel einführen; die alte Version bleibt funktionsfähig (Deprecation via `Deprecation`-/`Sunset`-Header).
- Nicht-breaking (direkt in aktuelle Version): neues optionales Request-Feld, neues Response-Feld, neuer Endpoint (siehe Tabelle oben).
