# [FEAT-X]: [Feature Name] — Spec

**Domain:** `[domain]`
**Version:** 1.0
**Status:** 🔵 Planned | 🟡 In Progress | ✅ Deployed
**REQ-Präfix:** `REQ-[DOMAIN]-[FEATURE]-`
**Erstellt:** [YYYY-MM-DD]
**Zuletzt aktualisiert:** [YYYY-MM-DD]

---

## KI-Kontext

| Feld                    | Wert                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| **Zweck**               | [Kurzbeschreibung des Features]                                             |
| **Lies zuerst**         | `[domain]-domain-spec.md` — Konzepte, Constraints und Grenzen dieser Domain |
| **Stabile Abschnitte**  | §2 (Verhalten), §3 (Anforderungen)                                          |
| **Technisches Design**  | siehe `[feature]-design.md` (API-Kontrakt, Schicht-Design, Entscheidungen)  |
| **Verwandte Specs**     | `[related-spec-1.md]`, `[related-spec-2.md]`                                |
| **Verwandter Code**     | `[path/to/code.py]` ([UseCase/Handler])                                     |
| **Offene Fragen**       | §5 vor Implementierung lesen                                                |

---

## Scope

**In dieser Spec:**

- [Was dieses Feature abdeckt]

**Nicht in dieser Spec:**

- [Abgrenzung] → `[related-spec.md]`
- [Abgrenzung] → `[related-spec.md]`

---

## 1. User Stories

> Beschreibe, was der User tun möchte.

- Als **[User-Typ]** möchte ich **[Aktion]** um **[Ziel zu erreichen]**
- Als **[User-Typ]** möchte ich **[Aktion]** um **[Ziel zu erreichen]**

---

## 2. Verhalten

### 2.1 Akteure & Einstiegspunkte

| Akteur     | Einstieg          | Ziel                          |
| ---------- | ----------------- | ----------------------------- |
| [User-Typ] | [UI/API-Einstieg] | [Was der User erreichen will] |
| [User-Typ] | [UI/API-Einstieg] | [Was der User erreichen will] |

### 2.2 Beteiligte Domains

| Domain   | Verantwortung in diesem Feature | Nicht verantwortlich für |
| -------- | ------------------------------- | ------------------------ |
| [Domain] | [Aufgaben]                      | [Abgrenzung]             |

---

## 3. Anforderungen

> REQ-IDs sind stabil und werden **nie umbenannt**.
> 
> * `APPROVED` Das Tracing-Skript trackt nur Anforderungen mit Status `APPROVED`.
> 
> * `DRAFT` = work-in-progress, 
> 
> * `REJECTED` = bewusst nicht umgesetzt (bleibt als Dokumentation).
> 
> * `IMPLEMENTED` = Volltändig implementiert
> 
> * `TESTED` = Vollständig getestet (Unit, Integration, E2E Tests)
> 
> * `INHERITED` = Regel gilt hier, Definition liegt in referenzierter Spec — kein eigener Test nötig.
> 
> Constraint-Werte nicht wiederholen — referenzieren: `→ CON-[DOMAIN]-001`

### 3.1 Funktionale Anforderungen

> Testtyp: Happy-Path — das Feature tut was es soll.

| ID                         | Anforderung   | Status  | Notes |
| -------------------------- | ------------- | ------- | ----- |
| REQ-[DOMAIN]-[FEATURE]-001 | [Anforderung] | `DRAFT` |       |
| REQ-[DOMAIN]-[FEATURE]-002 | [Anforderung] | `DRAFT` |       |

### 3.2 Regeln & Invarianten

> Testtyp: Guard-Tests — das System verhindert ungültige Zustände.

| ID                         | Regel                     | Typ                                                              | Status     | Notes |
| -------------------------- | ------------------------- | ---------------------------------------------------------------- | ---------- | ----- |
| REQ-[DOMAIN]-[FEATURE]-R01 | [Regelbeschreibung]       | `Invariante`/`Validierung`/`Geschäftsregel`/`Architekturprinzip` | `DRAFT`    |       |
| REQ-[DOMAIN]-[FEATURE]-R02 | `→ REQ-[DOMAIN]-BASE-R0X` | `INHERITED`                                                      | `APPROVED` |       |

### 3.3 Randfälle (Edge Cases)

> Testtyp: Negative Tests — konkrete Fehlersituationen mit erwartetem Verhalten.

| ID                         | Situation   | Erwartetes Verhalten         | Status  | Notes |
| -------------------------- | ----------- | ---------------------------- | ------- | ----- |
| REQ-[DOMAIN]-[FEATURE]-E01 | [Situation] | [HTTP-Code] mit [ERROR_CODE] | `DRAFT` |       |
| REQ-[DOMAIN]-[FEATURE]-E02 | [Situation] | [HTTP-Code] mit [ERROR_CODE] | `DRAFT` |       |


---

## 4. Offene Fragen

| ID   | Frage   | Antwort | Status                  |
| ---- | ------- | ------- | ----------------------- |
| F-01 | [Frage] |         | `Offen` / `Entschieden` |
| F-02 | [Frage] |         | `Offen` / `Entschieden` |

---

## 5. Status

| Feld            | Wert       |
| --------------- | ---------- |
| **Spec-Status** | 🔵 Planned |
| **QA-Report**   | —          |
| **Deployment**  | —          |
| **Git Tag**     | —          |

---

## 6. Phase-2-Erweiterungen

| Feature   | Auswirkung auf diese Spec    | Notes |
| --------- | ---------------------------- | ----- |
| [Feature] | [Neues REQ / neuer Endpunkt] |       |
| [Feature] | [Neues REQ / neuer Endpunkt] |       |
