# SMARTi-Namenskonventionen

| Konzept | Konvention | Beispiel |
|---|---|---|
| Domain Entities | PascalCase | `Lernplan` |
| Commands | PascalCase + `Command` | `CreateLernplanCommand` |
| DTOs | PascalCase + `DTO` | `LernplanReadDTO` |
| Repository-Interfaces | `I` + PascalCase | `ILernplanRepository` |
| TS-Komponenten/Hooks | PascalCase | `SessionShell`, `useSession` |
| TS-Dateien | kebab-case | `session-shell.tsx` |
| TS generierte Datei | via Orval (pro Tag/`operation_id`) | `src/generated/hooks/*` |
| Interaktions-/Player-Typen | snake_case (Backend-JSON) | `fill_in_the_blanks` |
| Domain Errors (fachlich, `Result`) | PascalCase, **ohne** `Error`-Suffix | `OrderAlreadyExists`, `CustomerNotFound` |
| Exceptions (technisch/Invariante) | PascalCase, **immer** `Error`-Suffix | `DomainInvariantError`, `MappingError` |

Weitere Konventionen:

- Backend-DDD-Domains unter `backend/src/smarti/<domain>/` (`account`, `plan`, `content`,
  `session`, `notification`, `report`, `profiles`).
- Django-Apps (Presentation Layer) unter `backend/src/dweb/dj_<domain>/`.
- Bounded-Context-Name: snake_case (z. B. `assessment`).
- REQ-Kennungen: `REQ-[DOMAIN]-[FEATURE]-NNN`.
