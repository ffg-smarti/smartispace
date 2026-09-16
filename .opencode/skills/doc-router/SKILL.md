---
name: doc-router
description: Projekt-Path-Router — liefert anhand eines Datei-/Ordnerpfads, eines Konzepts oder einer Aufgabenbeschreibung die exakten kanonischen Pfade der relevanten Design-Dokumente, Kontext-, Regel- und Strukturdateien. Wird von allen Agenten und Commands als Einstiegspunkt für Datei-Referenzen genutzt, damit keine Datei per Namenssuche gefunden werden muss.
---

# Projekt-Path-Router

## Zweck

Andere Agenten/Commands/Skills rufen diesen Skill auf mit:
- `target` (Pflicht): Datei-/Ordnerpfad **oder** Konzept (z.B. "Zielstruktur", "Backend-Regeln", "Fehlerbehandlung")
- `task_description` (optional): kurze Beschreibung der Aufgabe

Der Router liefert **exakte, kanonische Pfade** — er ist die einzige Quelle für Datei-Referenzen.
Er ersetzt jede eigene Namenssuche (`find`/`glob`/`grep`) nach gleichnamigen Dateien.

## Vorgehen

1. Lade `routing-table.md` aus diesem Skill-Ordner.
2. Bestimme den Zielbereich:
   - Handelt es sich um ein Design-Doc-Thema → **Sektion A** (Design-Docs).
   - Handelt es sich um ein Kontext-/Regel-/Struktur-Konzept → **Sektion B** (kanonische Pfade).
3. Matche `target`/`target_path` gegen die Tabelle → Kandidaten-Set A.
4. Falls `task_description` vorhanden: matche zusätzlich gegen Trigger-Begriffe → Kandidaten-Set B.
5. relevant = A ∪ B.
6. Prüfe Cross-Cutting-Regeln (z.B. Backend + Frontend gleichzeitig → +doc3).
7. Gib die **vollständigen Pfade** zurück.

**Matching-Hinweis:** Pattern-Matching ist inhaltlich, nicht regex-basiert. Bewerte, ob `target` semantisch in das Pattern fällt.

## Kollisions- und Verifikations-Regeln (verbindlich)

- **Immer kanonischen Pfad verwenden.** Mehrere Dateien mit gleichem Namen (z.B. `workspace.md`) existieren. Nur der kanonische Pfad aus der Tabelle (Sektion B) ist gültig.
- **Nie per Namenssuche finden.** Keine Datei über `find`/`glob`/`grep` nach Dateiname suchen,
  wenn ein kanonischer Pfad existiert.
- **SMARTi-Marker verifizieren.** Nach dem Lesen einer Kontextdatei: enthält sie `apps/kids` + `@smarti` → richtig. Enthält sie `copi-lp`/`COPI` → veraltete Kopie. Bei Mismatch: abbrechen + Fehler melden.
- **Fail-Fast.** Lässt sich die Datei unter dem exakten kanonischen Pfad nicht lesen → Fehlermeldung, nicht selbst nach Alternativen suchen.

## Output-Format

Liste von exakten Pfaden, z.B.:
- `docs/design/doc1-design-principles-architect.md`
- `.opencode/shared/workspace.md`
- `docs/design/doc8-deployment.md`

Kein weiterer Text — nur die Pfadliste für den Aufrufer.
