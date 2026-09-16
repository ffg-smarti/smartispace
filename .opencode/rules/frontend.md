---
paths:
  - "apps/**"
  - "packages/*/src/**"
---

# Frontend Development Rules

## Monorepo & Shared Packages
- Die Frontends sind unter: `apps/*/`
- Folgende Apps werden derzeit unterstützt: 
  - `Kids`    : Kinder-Lern-App, Capacitor, kein shadcn/ui
  - `Parent`  : Eltern-Verwaltungs-App, reine Web-App, shadcn/ui via `@smarti/ui`
- Shared Packages via npm Workspaces: `@smarti/api`, `@smarti/ui`, `@smarti/players`, `@smarti/session`
- `npm install` immer im Repository-Root ausführen
- Imports aus Shared Packages: `import { Button } from "@smarti/ui"`, `import { useGetChild } from "@smarti/api"`
- Nie Komponenten zwischen Apps kopieren — immer in `packages/` auslagern

## Layering-Regel (strikt, via eslint-plugin-boundaries erzwungen) #TODO: check
`@smarti/ui` → `@smarti/players` / `@smarti/session` → `features` (App-intern) → `app`
- Niedrigere Schichten dürfen nie aus höheren importieren
- `@smarti/ui` enthält die shadcn/ui-Komponenten
- `@smarti/players` + `@smarti/session` hängen von `@smarti/ui` ab

## kids vs. parent
- **`apps/kids`**: KEIN shadcn/ui — ausschließlich `@smarti/ui` + `@smarti/players`. Audio-/icon-first. `react-hook-form`/`zod` sind als reine Validierungslogik erlaubt.
- **`apps/parent`**: nutzt shadcn/ui via `@smarti/ui`. Keine Abhängigkeit zu `@smarti/players`-Audio-Logik.

## shadcn/ui (nur parent, via @smarti/ui)
- Before creating ANY UI component in parent, check if `@smarti/ui` has it: `ls packages/smarti-ui/src/components/ui/`
- NEVER create custom implementations of: Button, Input, Select, Checkbox, Switch, Dialog, Modal, Alert, Toast, Table, Tabs, Card, Badge, Dropdown, Popover, Tooltip, Navigation, Sidebar, Breadcrumb
- If a shadcn component is missing, add it to `packages/smarti-ui/`: `npx shadcn@latest add <name>`
- Custom components are ONLY for business-specific compositions that internally use shadcn primitives

## Import Pattern
```tsx
// Shared Packages (bevorzugt)
import { Button } from "@smarti/ui"
import { Card, CardHeader, CardTitle, CardContent } from "@smarti/ui"
import { useGetChild } from "@smarti/api"

// Player/Session aus @smarti/players / @smarti/session
import { getPlayer, PLAYER_REGISTRY } from "@smarti/players"
import { SessionShell } from "@smarti/session"
```

## Component Standards
- Use Tailwind CSS exclusively (no inline styles, no CSS modules)
- All components must be responsive (mobile 375px, tablet 768px, desktop 1440px)
- Implement loading states, error states, and empty states
- Use semantic HTML and ARIA labels for accessibility
- Keep components small and focused
- Use TypeScript interfaces for all props

## API-Anbindung (`@smarti/api`)
- Kein direkter `fetch`/`axios` in Komponenten — alles über `@smarti/api`
- Typen aus Backend-OpenAPI generiert (Orval, `packages/smarti-api/src/generated/`)
- Auth: JWT (Bearer) via `@smarti/api` — keine Session-Cookies/CSRF
- Nach Endpoint-Änderung: `npm run generate --workspace=@smarti/api`

## Interaktions-/Player-Baukasten (`@smarti/players`)
- Neue Interaktionstypen ausschließlich in `packages/smarti-players/src/registry.ts` anmelden — nie direkt  verdrahten
- Block-Payload kommt als generisches JSON `{ id, type, payload }` vom Backend
- Jeder Player-Typ liegt co-located unter `packages/smarti-players/src/players/` (`Component.tsx` + `useX.ts`-Hook + Test)

## PWA Manifest (Phase 1, Pflicht)
- `manifest.json` in `public/` je App (`name`, `short_name`, `start_url` aufs Dashboard, `display: standalone`, Icons 192 + 512).
- In HTML/Layout verlinken (`<link rel="manifest">` + `theme-color`).

## Storage-Regeln
- `localStorage` verboten (Stale-State-Risiko über Sessions); `sessionStorage` nicht verwendet.
- Transienter State: React State / TanStack Query Cache.
- `IndexedDB` nur für Service-Worker-Offline-Queue (Phase 2) — sonst nicht verwenden.
- API-Responses nie im Service Worker cachen (Session-State immer frisch).

## Toast
- Ausschließlich `sonner` (via `@smarti/ui`, `packages/smarti-ui/src/components/ui/sonner.tsx`).
- Keine weitere Toast-Lib (`react-hot-toast`, `react-toastify`, …).

## Accessibility & Audio (kids)
- Audio-/icon-first: Kinder lesen möglichst wenig; Voiceover + "Nochmal anhören" (`@smarti/players`)
- Icon-Buttons mit ARIA-Labels, ausreichend Kontrast (axe-core via Playwright)
- Kein Tracking von Kindern

## Auth (JWT Bearer)
- Post-Login-Redirect via `window.location.href` (nicht `router.push`).
- Loading-State in allen Pfaden zurücksetzen (success, error, finally).
- Details: §API-Anbindung (JWT via `@smarti/api`), §Storage-Regeln (kein `localStorage`).