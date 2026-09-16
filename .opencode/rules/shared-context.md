---
paths:
  - ".opencode/shared/**"
---

# Shared Context Governance

Diese Regeln gelten für alle Dateien unter `.opencode/shared/`. Sie werden automatisch
geladen, sobald Dateien in diesem Bereich geändert werden.

## Regel 1 — Scope (≥2 Konsumenten)

Nur Invarianten, die **mindestens 2 Konsumenten** (Skills/Commands/Rules/Agents) nutzen,
gehören in `shared/`. Einzelnutzer-Inhalt lebt im Konsumenten — z. B. Schicht-Templates
nur in `skills/architect-backend/references/`.

## Regel 2 — Code-frei

`shared/` enthält ausschließlich **code-freie Prinzipien** (Regeln, Entscheidungsbäume,
Kontrakte). Jedes Code-Template oder Beispiel gehört in die spezialisierte Skill-Referenz.

## Regel 3 — Zeilenbudget

Max. ~100 Zeilen pro Modul. Bei Überschreitung: größten Block extrahieren (neues Modul
in `shared/`) oder in den Konsumenten verschieben.

## Konsequenz

Verstößt eine Änderung gegen Regel 1–3, muss sie umgebaut werden: Inhalt in den richtigen
Konsumenten verschieben (Code/Templates → Skill-Referenzen) oder in ein eigenes Modul
extrahieren und den Index in `shared/context.md` aktualisieren.