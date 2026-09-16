# `.opencode/shared/` — Shared Context

Dieses Verzeichnis ist die **einzige Quelle** für schichtübergreifende Architektur-Prinzipien.
Es wird von Skills, Commands, Rules und Agents referenziert. Inhalte werden hier **einmal**
definiert und nie dupliziert — Konsumenten referenzieren per relativem Pfad.

## Module

| Datei | Inhalt |
|---|---|
| `context.md` | Index + Kerninvarianten (die wenigen MUST-Regeln überall) |
| `architecture.md` | Clean Architecture, DDD, CQRS — Prinzipien |
| `mapping.md` | Zweiseitige Mapping-Strategie |
| `naming-conventions.md` | SMARTi-Namenskonventionen |

## Governance-Regeln (verbindlich)

### Regel 1 — Scope (≥2 Konsumenten)
Nur Invarianten, die **mindestens 2 Konsumenten** (Skills/Commands/Rules/Agents) nutzen,
gehören in `shared/`. Einzelnutzer-Inhalt lebt im Konsumenten — z. B. Schicht-Templates
nur in `skills/architect-backend/references/`.

### Regel 2 — Code-frei
`shared/` enthält ausschließlich **code-freie Prinzipien** (Regeln, Entscheidungsbäume,
Kontrakte). Jedes Code-Template oder Beispiel gehört in die spezialisierte Skill-Referenz.

### Regel 3 — Zeilenbudget
Max. ~100 Zeilen pro Modul. Bei Überschreitung: größten Block extrahieren (neues Modul
in `shared/`) oder in den Konsumenten verschieben.

## Nutzung

- Referenzieren statt kopieren: `../../shared/<modul>.md` (relativ vom Konsumenten).
- Neue Module nur nach Regel 1–3 anlegen; `context.md` (Index) aktualisieren.
- Governance wird von opencode automatisch geladen, sobald Dateien unter `shared/`
  angefasst werden (`.opencode/rules/shared-context.md`).