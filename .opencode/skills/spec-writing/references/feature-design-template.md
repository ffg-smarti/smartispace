# [FEAT-X]: [Feature Name] — Design

**Domain:** `[domain]`
**Version:** 1.0
**Status:** 🔵 Designed
**Funktionale Anforderungen:** [`[feature]-spec.md`]([feature]-spec.md)
**Erstellt:** [YYYY-MM-DD]
**Zuletzt aktualisiert:** [YYYY-MM-DD]

---

## KI-Kontext

| Feld | Wert |
|------|------|
| **Zweck** | Technisches Design für [Feature] |
| **Lies zuerst** | `[feature]-spec.md` (Anforderungen), `[domain]-domain-spec.md` |
| **Konsumenten** | Coder (Implementierung), Tester (Tests) |
| **Stabile Abschnitte** | §1 Architektur-Überblick, §2 Designentscheidungen |
| **Volatile Abschnitte** | §3 API-Kontrakt (optional, nur wenn vorhanden) |

---

## 1. Architektur-Überblick

**Backend/Frontend/beides:** [Entscheidung]
**Bounded Context:** [name]

### 1.1 Bounded Context Übersicht

**Verantwortlichkeit:** [Was dieser Context verwaltet]
**Aggregate Root:** `[Aggregate]`

### 1.2 ERD

```mermaid
erDiagram
    [Aggregate] {
        uuid id PK
        uuid account_id FK
        string status
    }
```

### 1.3 Layer-Design

| Schicht | Bausteine |
|---------|-----------|
| Domain | [Aggregate, Value Objects, Domain Events, Enums] |
| Application | [Commands, DTOs, Ports, Mapper, Handler] |
| Infrastructure | [ORM, Repository, Unit of Work, Query Service, ACL] |
| Presentation | [Ninja-Schemas, Endpoints] |

### 1.4 Fehlerbehandlung

- Result-Pattern, ErrorCode→HTTP-Mapping → `rules/backend.md` §Result-Pattern & Error-Contract

### 1.5 App-Struktur

```
dweb/<ctx>/…
smarti/<ctx>/…
```

### 1.6 Frontend-Design

**App:** apps/kids | apps/parent | shared package

- **Komponentenbaum & Layering:** …
- **Routing & Pages:** …
- **Data Flow & State:** …
- **API-Anbindung:** `@smarti/api`
- **Interaktionen/Registry:** `@smarti/players`
- **Accessibility & Audio (kids):** …

---

## 2. Designentscheidungen

| ID | Entscheidung | Alternativen | Begründung |
|----|--------------|--------------|------------|
| D-01 | [Entscheidung] | [Alternative] | [Begründung] |

---

## 3. API-Kontrakt *(nur falls Backend/API)*

### `[METHOD] /api/v1/[domain]/[endpoint]/`

**Zweck:** [Beschreibung]
**Request:** `field : type, required/optional — Beschreibung`
**Response ([HTTP-Status]):** `field : type — Beschreibung`
**Fehlercodes:** `[HTTP]` → `[ERROR_CODE]`

---

## 4. Offene Fragen

| ID | Frage | Antwort | Status |
|----|-------|---------|--------|
| F-01 | [Frage] | | `Offen` / `Entschieden` |

---

## 5. Implementierungshinweise

- **Betroffene Schichten:** [domain / appl / infra / presentation / ui]
- **Zu ladende Skills:** [`domain-pattern`, `appl-pattern`, `infra-pattern`, `presentation-pattern`, `ui-pattern`]
- **Offene Punkte:** <optional>
