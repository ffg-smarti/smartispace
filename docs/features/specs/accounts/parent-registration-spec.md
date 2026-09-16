# FEAT-1: Parent Registration — Spec

**Domain:** `accounts`
**Version:** 1.0
**Status:** 🟡 Designed
**REQ-Präfix:** `REQ-ACCOUNTS-PARENT-REGISTRATION-`
**Erstellt:** 2026-09-09
**Zuletzt aktualisiert:** 2026-09-09

---

## KI-Kontext

| Feld                    | Wert                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| **Zweck**               | Eltern ermöglichen, sich selbst über das Eltern-Portal zu registrieren       |
| **Lies zuerst**         | `accounts-domain-spec.md` — Konzepte, Constraints und Grenzen dieser Domain |
| **Stabile Abschnitte**  | §2 (Verhalten), §3 (Anforderungen)                                          |
| **Technisches Design**  | siehe `parent-registration-design.md` (Architektur-Überblick, Designentscheidungen, API-Kontrakt)       |
| **Verwandte Specs**     | keine bekannt                                                              |
| **Verwandter Code**     | —                                                                         |
| **Offene Fragen**       | §4 vor Implementierung lesen                                                |

---

## Scope

**In dieser Spec:**

- Self-Service-Registrierung für Eltern mit E-Mail und eindeutigem Namen
- Passwortbasierte Authentifizierung
- Verifizierungs-Workflow (sofortige E-Mail, Erinnerungen nach 24h, 7 Tagen, 29 Tagen)
- Markierung von Accounts als unverifiziert
- Löschwarnung nach 29 Tagen

**Nicht in dieser Spec:**

- Einschränkung von Features für unverifizierte Accounts → wird in anderen Features durchgeführt (z.B. Kauf von Kursen)
- Login/Authentifizierung nach der Registrierung
- Kind-Account-Erstellung
- Bezahlung, Bestellungen und Lernplan-Zuweisung
- Admin-basierte Account-Erstellung
- Endgültiges Löschen von Accounts (nur die Löschwarnung wird ausgesprochen)

---

## 1. User Stories

> Beschreibe, was der User tun möchte.

- Als **Eltern** möchte ich mich mit meiner E-Mail und einem eindeutigen Namen registrieren, um Zugang zum Eltern-Portal zu erhalten.
- Als **Eltern** möchte ich eine Verifizierungs-E-Mail sofort nach der Registrierung erhalten, um meine E-Mail-Adresse zu bestätigen.
- Als **Eltern** möchte ich Erinnerungs-E-Mails erhalten, falls ich die Verifizierung noch nicht abgeschlossen habe.
- Als **Eltern** möchte ich die Möglichkeit haben, die E-Mail-Verifizierung jederzeit nachzuholen.

---

## 2. Verhalten

### 2.1 Akteure & Einstiegspunkte

| Akteur     | Einstieg              | Ziel                                      |
| ---------- | --------------------- | ----------------------------------------- |
| Elternteil | Frontend `apps/parent` | Sich selbst registrieren                  |
| System     | Intern                | Registrierung verarbeiten, E-Mails senden |

### 2.2 Beteiligte Domains

| Domain    | Verantwortung in diesem Feature | Nicht verantwortlich für |
| --------- | ------------------------------- | ------------------------ |
| accounts  | Registrierung, Account-Management, Verifizierung-Status | Einschränkung von Features für unverifizierte Accounts |

---

## 3. Anforderungen

> REQ-IDs sind stabil und werden **nie umbenannt**.
>
> * `APPROVED` Das Tracing-Skript trackt nur Anforderungen mit Status `APPROVED`.
> * `DRAFT` = work-in-progress
> * `REJECTED` = bewusst nicht umgesetzt (bleibt als Dokumentation)
> * `IMPLEMENTED` = Vollständig implementiert
> * `TESTED` = Vollständig getestet (Unit, Integration, E2E Tests)
> * `INHERITED` = Regel gilt hier, Definition liegt in referenzierter Spec — kein eigener Test nötig.
>
> Constraint-Werte nicht wiederholen — referenzieren: `→ CON-[DOMAIN]-001`

### 3.1 Funktionale Anforderungen

| ID                                              | Anforderung                                                    | Status  | Notes |
| ----------------------------------------------- | -------------------------------------------------------------- | ------- | ----- |
| REQ-ACCOUNTS-PARENT-REGISTRATION-001           | Das System muss Eltern die Möglichkeit bieten, sich selbst zu registrieren (Self-Service) | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-002           | Das System muss bei der Registrierung eine E-Mail-Adresse als Pflichtdaten erheben | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-003           | Das System muss bei der Registrierung einen Namen als Pflichtdaten erheben | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-004           | Das System muss sicherstellen, dass der Name eindeutig ist (kein doppeltes Vorkommen erlaubt) | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-005           | Das System muss ein Passwort für die Authentifizierung erfordern | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-006           | Das System muss Accounts nach Registrierung als unverifiziert markieren | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-007           | Das System muss unmittelbar nach Registrierung eine E-Mail-Verifizierung versenden | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-008           | Das System muss an definierten Intervallen (24h, 7 Tage, 29 Tage) Erinnerungs-E-Mails zur Verifizierung senden | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-009           | Das System muss nach 29 Tagen eine Löschwarnung aussprechen, falls keine Verifizierung erfolgt ist | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-010           | Das System muss Eltern die Möglichkeit geben, die E-Mail-Verifizierung jederzeit abzuschließen | `DRAFT` |       |

### 3.2 Regeln & Invarianten

| ID                                              | Regel                                                        | Typ                | Status     | Notes |
| ----------------------------------------------- | ------------------------------------------------------------ | ------------------ | ---------- | ----- |
| REQ-ACCOUNTS-PARENT-REGISTRATION-R01           | Ein Name darf nur einmal vergeben werden (Eindeutigkeitsregel) | `Geschäftsregel`   | `DRAFT`    |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-R02           | Ein Account ist zunächst als "unverifiziert" zu statusen      | `Invariante`       | `DRAFT`    |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-R03           | Die Registrierung ist ein Self-Service-Prozess – kein Admin erstellt Accounts | `Geschäftsregel` | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-R04           | Der Verifizierungs-Workflow folgt einem festen Zeitplan: sofortige E-Mail → Erinnerung nach 24h → 7 Tage → 29 Tage → Löschwarnung | `Geschäftsregel` | `DRAFT` |       |

### 3.3 Randfälle (Edge Cases)

| ID                                              | Situation                                | Erwartetes Verhalten                    | Status  | Notes |
| ----------------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------- | ----- |
| REQ-ACCOUNTS-PARENT-REGISTRATION-E01           | Ein bereits vergebener Name wird erneut verwendet | Registrierung wird abgelehnt, Fehlermeldung | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-E02           | Eine bereits registrierte E-Mail wird erneut verwendet | Registrierung wird abgelehnt, Fehlermeldung | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-E03           | Ungültiges E-Mail-Format wird eingegeben | Registrierung wird abgelehnt, Validierungsfehler | `DRAFT` |       |
| REQ-ACCOUNTS-PARENT-REGISTRATION-E04           | Verifizierungs-E-Mail kann nicht zugestellt werden | System protokolliert Fehler, Retry-Mechanismus | `DRAFT` |       |

---

## 4. Offene Fragen

| ID   | Frage | Antwort | Status      |
| ---- | ----- | ------- | ----------- |
| F-01 | Keine | Alle Rückfragen des Users wurden beantwortet | `Entschieden` |

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

| Feature | Auswirkung auf diese Spec | Notes |
| ------- | ------------------------- | ----- |
| E-Mail-Verifizierung durchführen | Verifizierungsstatus auf "verifiziert" setzen | Wird in späterem Verlauf implementiert |
| Account-Löschung | Account nach 29 Tagen endgültig löschen | Wird in späterem Verlauf implementiert |
| Login-Funktionalität | Sessions, Token-Management | Trennbar als eigenes Feature |
