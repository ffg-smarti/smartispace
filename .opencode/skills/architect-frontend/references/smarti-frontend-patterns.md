# SMARTi Frontend Patterns (Architekt)

**Monorepo:** Zwei Frontends (`apps/kids`, `apps/parent`) teilen sich Shared Packages
(`@smarti/api`, `@smarti/ui`, `@smarti/players`, `@smarti/session`).

- **`apps/kids`** — Kinder-Lern-App (audio-/icon-first, KEIN shadcn/ui)
- **`apps/parent`** — Eltern-Portal (formularlastig, shadcn/ui via `@smarti/ui`)

---

## App-Struktur

> **Regel:** Domain-orientierte Struktur. Feature-Code in `features/<domain>/`, Shared-Code in `shared/`.

```
apps/<app>/src/
├── main.tsx / App.tsx / styles.css        # Entry + Root (Provider) + Styles
├── features/<domain>/                      # Domain-orientierter App-Code
│   ├── components/  players/  hooks/  pages/
├── shared/                                # App-spezifische Infrastruktur
│   ├── components/  context/  hooks/  lib/
└── test/setup.ts                          # Vitest-Setup
```

> **Regel:** `api-mutator.ts` bleibt app-spezifisch. `VITE_API_URL` ist pro App verschieden.

---

## Routing & Pages

- Rollen-Zuordnung über `ProtectedRoute` (`parent` / `child`).
- Eltern-Bereich: `/parent/*` (Dashboard, Plans, Content). Kind-Bereich: `/child/*` (Dashboard, Session).
- Auth-Redirect: nicht eingeloggt → `/login`; falsche Rolle → `/`.

---

## Data Flow & State

- **Server-State:** TanStack Query — Hooks aus `@smarti/api` (Orval-generiert).
- **Client-State:** `useState`/`useReducer`.
- Provider-Reihenfolge: `ErrorBoundary` → `QueryClientProvider` → `BrowserRouter` → `AuthProvider`.

---

## API-Anbindung

- Kein direktes `fetch`/`axios` in Komponenten — alles über `@smarti/api`.
- Typen aus Backend-OpenAPI generiert (Orval, `packages/smarti-api/src/generated/`).
- Auth: JWT (Bearer) via `@smarti/api` (Phase 2) — keine Session-Cookies/CSRF (Phase 2).
- Actionable-Regeln → `.opencode/rules/frontend.md` §API-Anbindung.

---

## Interaktionen / Registry

- Neue Interaktionstypen nur über die Registry in `@smarti/players` anmelden — nie im SessionShell verdrahten.
- Block-Payload kommt als generisches JSON `{ id, type, payload }` vom Backend.

---

## Shared Packages — Import-Kurzliste

- `@smarti/api` — generierte Hooks + Typen
- `@smarti/ui` — shadcn/ui-Komponenten + `cn()`
- `@smarti/players` — Player-Komponenten + Registry
- `@smarti/session` — Session-Rahmen (SessionShell, useSession)

> **Regel:** shadcn/ui nur in `@smarti/ui`; neue Player/Interaktionen nur über die Registry.

---

## Accessibility & Audio (kids)

- Audio-/icon-first: Kinder lesen möglichst wenig; Voiceover + "Nochmal anhören" (`@smarti/players`)
- Icon-Buttons mit ARIA-Labels, ausreichend Kontrast (axe-core via Playwright)
- Kein Tracking von Kindern

---

## Verweise (Single-Source)

| Thema | Quelle |
|---|---|
| Layering-Regel | `.opencode/rules/frontend.md` §Layering-Regel |
| Frontend-Coding-Regeln | `.opencode/rules/frontend.md` |
| PWA/Storage/Toast | `.opencode/rules/frontend.md` (§PWA Manifest, §Storage-Regeln, §Toast) |
| Code-Templates (Coder) | `.opencode/skills/ui-pattern/references/frontend-code-templates.md` |
| Projektstruktur | `.opencode/shared/workspace.md` |
