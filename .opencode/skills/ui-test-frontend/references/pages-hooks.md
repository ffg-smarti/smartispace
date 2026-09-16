# Seiten- & Hook-Tests (Router, Context, Hooks)

Wann laden: wenn du Seiten (Routing, Guards, Komposition) oder Hooks (z. B. `useSession`, `usePlayerLifecycle`, Form-Hooks) testest. Nicht laden für reine Einzelkomponenten (→ `components.md`).

## Ablageort & Setup

- Co-located wie in `components.md`: `<Page>.test.tsx` neben `<Page>.tsx`, Hook-Tests als `<hook>.test.tsx` neben dem Hook.
- Setup/Config wie in `components.md` (`setup.ts`, `vitest.config.ts`).

## Muster

- **Router:** `MemoryRouter` mit `initialEntries` (z. B. `/login`, `/dashboard`); Redirects nach Login via `window.location.href`-Ziel prüfen, nicht via Router-Interna.
- **Guards:** `ProtectedRoute` (parent) bzw. `ParentalGate` (kids) — AuthContext stubben: unauthentifiziert → Redirect, authentifiziert → Outlet rendert.
- **Seiten-Komposition:** Default `@smarti/api`-Hooks je Zustand mocken (`data`/`isLoading`/`error`); `SessionShell`/`PLAYER_REGISTRY` bei Player-Seiten mitprüfen, aber Player-Logik nicht doppelt testen.
- **MSW-Stufe (Datenstrecke):** Sobald die Seite den echten Query-Pfad prüfen soll, MSW statt `vi.mock` verwenden — QueryClient mit `retry: false`, `setupServer(...handlers)` in `src/test/setup.ts` (`beforeAll(listen)` / `afterEach(resetHandlers)` / `afterAll(close)`); Fehlerzustände lokal via `server.use(...)` überschreiben, nie die globale Handler-Liste ändern. Gemeinsamer `renderWithProviders`-Helper (QueryClient + Router) in `src/test/render-utils.tsx`.
- **Hooks:** `renderHook` aus RTL; Timer/Audio via `vi.useFakeTimers()` bzw. `useAudio`-Mock — keine echten Audio-Assets.
- **Formulare:** `react-hook-form`/`zod`-Validierung über sichtbare Fehlermeldungen prüfen (`getByRole("alert")`), nicht über interne Form-State-Objekte.

## Template

```tsx
// apps/parent/src/features/dashboard/pages/DashboardPage.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DashboardPage } from "./DashboardPage";

vi.mock("@smarti/api", () => ({
  useGetDashboard: () => ({ data: { children: [] }, isLoading: false, error: null }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/dashboard"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DashboardPage", () => {
  it("REQ-DASH-010: zeigt Empty-State ohne Kinder", async () => {
    render(<DashboardPage />, { wrapper });

    expect(await screen.findByText(/kein kind/i)).toBeInTheDocument();
  });
}
```

## Do / Don't

- Do: Verhalten von außen prüfen (sichtbare Route, sichtbarer Guard-Effekt, sichtbarer Hook-Effekt).
- Don't: keine Router-Interna (`navigate`-Mock-Calls) als alleinige Assertion; keine Tailwind-Klassen-Assertions.

## Ausführung

- Wie in `components.md`: `ffg-mcp: js-unit` (kids) bzw. `smarti-mcp: js-unit` (parent).
