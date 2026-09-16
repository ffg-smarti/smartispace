# Frontend Stack — React / TypeScript / Vite / TanStack Query / Tailwind (allgemeine Idiome)

Allgemeines Framework-Wissen. **Keine SMARTi-Komponenten** (→ `ui-pattern`, `@smarti/*`-Pakete).
Versionen verbindlich: `AGENTS.md` §1.5 (Single Source of Truth).

---

## React

- Funktionale Komponenten + Hooks; **keine Klassen-Komponenten**.
- Hooks-Regeln: nur auf oberster Ebene, Namen mit `use`-Präfix.
- Provider-Reihenfolge: `ErrorBoundary` → `QueryClientProvider` → `Router` → `AuthProvider`.
- `react-router-dom`: `Routes`/`Route`/`Outlet`; geschützte Routen via Wrapper (`ProtectedRoute`).

## TypeScript (strict)

- `strict: true` — keine impliziten `any`.
- Interfaces für Props; type-only imports (`import type { ... }`).
- Generierte Typen (Orval) nie manuell anpassen.

## Vite

- Dev-Server mit Proxy auf Backend (`/api` → `http://localhost:8000`).
- Alias `@` → `./src` üblich; env via `import.meta.env.VITE_*`.
- Build: `npm run build --workspace=<app>`.

## TanStack Query

- **Server-State nur über TanStack Query** — kein `fetch`/`axios` direkt in Komponenten.
- `useQuery({ queryKey, queryFn })` für Reads; `useMutation({ mutationFn, onError, onSuccess })` für Writes.
- `queryKey` stabil und granular; Cache-Invalidierung via `queryClient.invalidateQueries`.
- Defaults: `staleTime`, `retry` (keine Retries bei 4xx).
- Generierte Hooks kommen von **Orval** (aus `operation_id`), nicht manuell schreiben.

## Tailwind CSS

- Ausschließlich Tailwind-Utility-Klassen — **keine Inline-Styles, keine CSS-Modules**.
- Responsive: mobile-first (375px), Tablet (768px), Desktop (1440px).
- Eigene Design-Tokens via `@smarti/ui`-bzw. Design-System-Paket, keine Magic-Numbers.

## Formulare (react-hook-form + zod)

- `react-hook-form` + `zod` mit `zodResolver`.
- Feldfehler aus API-Fehlern in Form-Fehler mappen (`setError`), Toasts für sonstige Fehler.
- Load-/Error-/Empty-States für jede Datenansicht implementieren.

## Orval / Codegen

- Nur in `packages/smarti-api/`: `npm run generate --workspace=@smarti/api`.
- `generated/` wird nie manuell bearbeitet. Nach Backend-Endpoint-Änderung Schema neu exportieren + generieren.

## Accessibility (kids)

- Audio-/icon-first; Voiceover + "Nochmal anhören".
- Icon-Buttons mit ARIA-Labels; ausreichender Kontrast.
- Kein Tracking von Kindern.

## Idiome (verbindlich, aus `AGENTS.md`)

- Imports immer aus `@smarti/*`-Paketen — nie Komponenten zwischen Apps kopieren.
- **Kein shadcn/ui in `apps/kids`** — dort nur `@smarti/ui` + `@smarti/players`.
- `npm install` immer im Repository-Root ausführen.

---

## Wichtige Fallstricke

| Problem | Lösung |
|---|---|
| `fetch`/`axios` direkt in Komponente | TanStack Query Hook aus `@smarti/api` verwenden |
| shadcn-Komponente in kids | Nur `@smarti/ui`-Primitives erlauben |
| Orval-generierte Dateien angefasst | Zurückrollen — nur `npm run generate` |
| `any`-Typen | Durchgenerierte/Interface-Typen verwenden |
| Inline-Style | Tailwind-Utility-Klasse |