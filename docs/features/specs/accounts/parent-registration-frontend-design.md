# FEAT-1: Parent Registration — Frontend-Architektur-Design

**Feature:** Parent Registration
**Domain:** `account`
**Ziel-App:** `apps/parent` (SMARTi Eltern-Portal)
**Datum:** 2026-09-09
**Status:** Designed

---

## Inhaltsverzeichnis

1. [App-Zuordnung](#1-app-zuordnung)
2. [Komponentenbaum](#2-komponentenbaum)
3. [Layering](#3-layering)
4. [Routing & Pages](#4-routing--pages)
5. [Data Flow & State](#5-data-flow--state)
6. [API-Anbindung](#6-api-anbindung)
7. [Interaktionen](#7-interaktionen)
8. [Accessibility](#8-accessibility)

---

## 1. App-Zuordnung

**App:** `apps/parent`
**Begründung:** Die Spezifikation legt fest, dass die Registrierung ausschließlich in der Eltern-Portal-App (`apps/parent`) verfügbar sein soll. Diese App nutzt shadcn/ui via `@smarti/ui`.

---

## 2. Komponentenbaum

```
apps/parent/src/features/
└── auth/                          # Auth-Bereich (neu)
    ├── components/
    │   ├── RegistrationForm.tsx   # Registrierungsformular (E-Mail, Name, Passwort)
    │   │   ├── EmailInput.tsx     # E-Mail-Eingabefeld mit Validierung
    │   │   ├── NameInput.tsx      # Name-Eingabefeld mit Eindeutigkeitsprüfung
    │   │   └── PasswordInput.tsx  # Passwort-Eingabefeld
    │   ├── RegistrationSuccess.tsx  # Erfolgsmeldung nach Registrierung
    │   └── VerificationNotice.tsx   # Hinweis: E-Mail-Verifizierung erforderlich
    ├── pages/
    │   └── RegisterPage.tsx       # Registrierungsseite (Route: /register)
    └── hooks/
        └── useRegistration.ts     # TanStack Query Hook für Registrierungs-API-Aufruf
```

```
apps/parent/src/shared/
├── components/
│   ├── ProtectedRoute.tsx         # Bereits vorhanden
│   └── ...                       # Weitere geteilte Komponenten
├── context/
│   └── AuthContext.tsx            # Bereits vorhanden (JWT-Auth)
└── lib/
    ├── api-mutator.ts             # Bereits vorhanden
    ├── parseApiErrors.ts          # Bereits vorhanden
    └── queryClient.ts             # Bereits vorhanden
```

---

## 3. Layering

**Import-Kettenfolge** (strikt, durch `eslint-plugin-boundaries` erzwungen):

```
@smarti/ui (Design-System)
    ↓
@smarti/api (API-Client, generierte Typen)
    ↓
features/auth (Feature-Code)
    ↓
shared/context, shared/components (App-Infrastruktur)
    ↓
App.tsx (Root)
```

**Regel:** Niedrigere Schichten importieren nie aus höheren Schichten.

### Schicht-Einordnung:

| Komponente | Schicht |
|-----------|---------|
| `RegistrationForm.tsx` | `features/auth/components/` |
| `useRegistration.ts` | `features/auth/hooks/` |
| `RegisterPage.tsx` | `features/auth/pages/` |
| `@smarti/ui` | Design-System |
| `@smarti/api` | API-Client (Orval-generiert) |
| `AuthContext.tsx` | App-Infrastruktur |

---

## 4. Routing & Pages

### Neue Route

| Route | Komponente | Beschreibung |
|-------|-----------|-------------|
| `/register` | `RegisterPage.tsx` | Registrierungsseite (Parent) |
| `/register/success` | `RegistrationSuccess.tsx` | Erfolgsmeldung nach Registrierung |

### Bestehende Routen (Referenz)

| Route | Komponente | Beschreibung |
|-------|-----------|-------------|
| `/login` | `LoginPage.tsx` | Login-Seite (bereits vorhanden) |
| `/dashboard` | `DashboardPage.tsx` | Eltern-Dashboard (nach Login) |

### ProtectedRoute

- `RegisterPage` ist öffentlich (kein Auth erforderlich)
- Alle anderen Seiten erfordern Authentifizierung (bereits durch `ProtectedRoute` geschützt)
- `RegisterPage` prüft: Falls bereits eingeloggt → Redirect zu `/dashboard`

---

## 5. Data Flow & State

### Server-State (TanStack Query)

- `useRegistration` Hook nutzt `@smarti/api` generierte Mutation
- Mutation: `POST /api/v1/account/register/`
- Query-Client ist bereits konfiguriert (`queryClient.ts`)

### Client-State (useState/useReducer)

- Formular-Validierung: `useState` für E-Mail, Name, Passwort Werte
- Validierungsfehler: `useState` für Field-Errors
- Submit-Status: `useState` für Loading/Error/Success

### Provider-Reihenfolge

```
ErrorBoundary
  → QueryClientProvider
    → BrowserRouter
      → AuthProvider
        → App
```

### Form State Flow

```
RegisterPage
  → RegistrationForm (useState: email, name, password, errors)
    → useRegistration (TanStack Query Mutation)
      → @smarti/api: createParentAccount (generierter Hook)
        → POST /api/v1/account/register/
```

---

## 6. API-Anbindung

### Generierte Typen

- `@smarti/api` generiert automatisch TypeScript-Typen und TanStack Query Hooks aus der OpenAPI-Spec
- Nach Backend-Deploy: Orval generiert `apps/parent/src/api/hooks/account/` Typen

### Generierter Hook (nach Orval-Codegen)

```typescript
// apps/parent/src/api/hooks/account/useParentRegistration.ts
// Generiert via Orval aus @smarti/api
// Basiert auf OpenAPI-Schema: POST /api/v1/account/register/
// Typen: ParentAccountCreateDTO, ParentAccountReadDTO
```

> **Hinweis:** `account_type` ist im Frontend fest auf `PARENT` gesetzt — der User gibt nur E-Mail, Name und Passwort ein. Das Backend setzt `account_type=PARENT` bei der Registrierung.
```

### Auth

- JWT via `django-ninja-jwt` (Backend)
- Token-Speicherung: `localStorage` oder `httpOnly` Cookie
- Bearer Token für authentifizierte Requests
- `AuthContext.tsx` verwaltet Auth-Zustand

### Error Handling

- `parseApiErrors.ts` (bereits vorhanden) parst API-Fehlerantworten
- `@smarti/api` generierte Typen enthalten ErrorResponse-Struktur
- Error-Mapping im Frontend: `errors[]` → Field-Errors im Formular

### API-Vertrag (Backend ↔ Frontend)

| Feld | Request (ParentAccountCreateDTO) | Response (ParentAccountReadDTO) |
|------|----------------------------------|--------------------------------|
| `email` | string (unique) | string |
| `name` | string (unique) | string |
| `account_type` | `PARENT` (fest) | `PARENT` |
| `password` | string | — |
| `is_verified` | — | bool |
| `id` | — | UUID |
| `created_at` | — | datetime |

---

## 7. Interaktionen

### Formular-Interaktionen

1. **E-Mail-Eingabe:** Validierung auf Format und Eindeutigkeit (async API-Call auf Blur/Submit)
2. **Name-Eingabe:** Validierung auf Eindeutigkeit (async API-Call auf Blur/Submit)
3. **Passwort-Eingabe:** Validierung auf Mindestlänge
4. **Submit:** `useRegistration` Mutation → `@smarti/api` → `POST /api/v1/account/register/`
5. **Success:** Redirect zu `/register/success` → `RegistrationSuccess.tsx` zeigt Erfolgsmeldung + Verifizierungshinweis
6. **Error:** `parseApiErrors.ts` parst Error-Antwort → Field-Errors im Formular angezeigt

### Keine neuen Interaktionstypen in `@smarti/players`

Die Registrierung erfordert keine Player-Komponenten (keine Lernsessions, keine Übungen). Keine Registry-Erweiterung nötig.

---

## 8. Accessibility

- **Formular-Labels:** Alle Eingabefelder haben sichtbare `<label>`-Elemente
- **ARIA-Labels:** Fehlermeldungen haben `aria-live="polite"`
- **Focus-Management:** Nach Submit-Fehler: Focus auf erstes fehlerhaftes Feld
- **Keyboard-Navigation:** Tab-Reihenfolge folgt logischer Formular-Reihenfolge (E-Mail → Name → Passwort → Submit)
- **Kontrast:** Alle Texte erfüllen WCAG AA Kontrastanforderungen
- **Shadcn/ui Komponenten:** Bereits zugänglich (Accessibility-vorgegeben durch @smarti/ui)

### Hinweis zu apps/kids

Diese Feature betrifft nur `apps/parent`. Die Kinder-App (`apps/kids`) hat **keinen** Registrierungs-Workflow für Kinder.

---

## Abhängigkeiten (Frontend)

### @smarti/* Packages

| Package | Nutzung |
|---------|---------|
| `@smarti/ui` | shadcn/ui Komponenten (Formular-Elemente, Buttons, Alerts) |
| `@smarti/api` | Orval-generierte TanStack Query Hooks + Typen |

### Bestehende Pakete

| Package | Nutzung |
|---------|---------|
| `@tanstack/react-query` | Server-State-Management |
| `react-router-dom` | Routing |
| `react` | UI-Framework |

---

## Architekturprinzipien (Bestätigt)

- **Layering:** `@smarti/ui` → `@smarti/api` → `features/auth` → `app`
- **Kein direkter Fetch:** Alles über `@smarti/api`
- **Kein shadcn/ui in apps/kids:** Diese Spec betrifft nur `apps/parent`
- **Kein neuer Player:** Keine `@smarti/players` Registry-Erweiterung nötig
- **SMARTi-Namenskonventionen:** TS-Komponenten/Hooks PascalCase (`RegistrationForm`), Dateien kebab-case (`registration-form.tsx`)
