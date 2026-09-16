# Shared Context — Index & Kerninvarianten

Einstiegspunkt in `.opencode/shared/`. Enthält die wenigen **Kerninvarianten**, die in
jeder Schicht und jedem Kontext gelten, plus den Modul-Index. Details pro Thema liegen
in den jeweiligen Modulen.

## Kerninvarianten (gelten überall)

1. **Clean Architecture:** Domain (_domain_) ← Application (_appl_) ← Infrastructure (_infra_) ← Presentation (_dweb_).
   Abhängigkeiten zeigen nach innen; Interfaces in Domain/Application, Implementierungen in Infrastructure.
2. **Kein Cross-Domain-Import** — Domains kommunizieren nur über Domain Events oder ACL
   (ID-Referenzen, keine Foreign Keys in Domain).
3. **Result-Pattern:** Erwartbare fachliche Fehler sind Teil des Kontrollflusses (`Result`);
   Invarianten- und technische Fehler sind Exceptions. `Success` → genau ein Value,
   `Failure` → `errors: tuple[E, ...]` (mindestens ein Error).
4. **Zweiseitige Mapping-Strategie:** keine rohen Persistenz- oder Domain-Objekte über
   Schichtgrenzen; nur DTOs / aufgelöste Value Objects an der Grenze.
5. **Namenskonventionen** aus `naming-conventions.md` überall einhalten.

## Modul-Index

| Thema | Modul | Hauptkonsumenten |
|---|---|---|
| Clean Arch, DDD, CQRS | `architecture.md` | `solution-architect`, `architect-backend` |
| Mapping-Strategie | `mapping.md` | architect-backend |
| Namenskonventionen | `naming-conventions.md` | alle |

## Governance

Regeln für Inhalt/Umfang von `shared/` → **`README.md`** (Regel 1–3). Wird von opencode
automatisch geladen (`.opencode/rules/shared-context.md`).

## Referenzen

- Verbindliche Projekt-Spezifikation: `.opencode/shared/workspace.md`
- Backend-Regeln: `.opencode/rules/backend.md`
- Frontend-Regeln: `.opencode/rules/frontend.md`
- Agenten-Anleitung: `AGENTS.md`