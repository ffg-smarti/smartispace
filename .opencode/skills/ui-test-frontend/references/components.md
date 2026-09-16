# Komponenten-Tests (Vitest + RTL)

Wann laden: wenn du einzelne Komponenten oder kleine Kompositionen testest — Rendering, Interaktion, Loading-/Error-/Empty-Zustände. Nicht laden für seitenweite Router-/Context-Tests (→ `pages-hooks.md`).

## Ablageort & Setup

- Co-located: `<Component>.test.tsx` neben `<Component>.tsx` — `apps/*/src/features/…`, `apps/*/src/shared/…` oder `packages/…`.
- Setup: `apps/*/src/test/setup.ts` (jsdom, `cleanup`, `QueryClient`-Defaults); Config: `vitest.config.ts` je App/Package.

## Muster

- **Query:** `getByRole`/`findByRole` bevorzugen (A11y-Rollen), kein `container.querySelector`-CSS-Selektor.
- **API-Mock (Default):** `@smarti/api`-Hooks mocken (`vi.mock`), niemals echten `fetch`/`axios`; `QueryClientProvider`-Wrapper im Test.
- **Fall-Tabelle pro Komponente:** Render mit minimalen Props (kein Crash, erwarteter Output), Render mit allen Props (optionale Bereiche), User-Interaktion → Callback mit korrekten Argumenten (`vi.fn()` + `toHaveBeenCalledWith`), Fehler-State (`errors[]` → Feld-Fehler sichtbar), Loading-State (`isPending` → Skeleton/disabled Button), Empty-State (Fallback-Text, kein Absturz).
- **Zustände:** jede async Komponente hat Happy- (`data`), Loading- (`isLoading`) und Error-Test (`error` + Retry); Interaktionen via `userEvent.setup()` (nicht `fireEvent`).
- **App-Trennung:** `apps/kids` (kein shadcn/ui, audio-/icon-first — ARIA-Labels wie `name: /nochmal anhören/i` prüfen, kein Tracking) vs. `apps/parent` (shadcn/ui nur via `@smarti/ui`-Primitive, keine Custom-Nachbauten).
- **Registry:** `PLAYER_REGISTRY`-Zuordnung (`medium_type` → Komponente) + `getPlayer()` mit unbekanntem Typ → `null`; neue Player/Interaktionstypen via `getPlayer(type)` mitprüfen. Preview-Mode: `onCompleted` wird nicht aufgerufen.
- **Orval-Generat:** `generated/` hat keine eigenen Tests — Tests decken den Code ab, der die generierten Hooks *verwendet*.

## Template

```tsx
// apps/parent/src/features/dashboard/components/ChildProgressCard.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChildProgressCard } from "./ChildProgressCard";

vi.mock("@smarti/api", () => ({
  useGetChildProgress: () => ({
    data: { childName: "Mila", completedStations: 3, totalStations: 5 },
    isLoading: false,
    error: null,
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

describe("ChildProgressCard", () => {
  it("REQ-DASH-001: zeigt Fortschritt an (Happy-Path)", async () => {
    render(<ChildProgressCard childId="c1" />, { wrapper });

    expect(
      await screen.findByRole("heading", { name: /mila/i })
    ).toBeInTheDocument();
  });

  it("zeigt Loading-State während des Ladens", () => {
    // useGetChildProgress → { isLoading: true } mocken, dann Skeleton prüfen
  });

  it("zeigt Error-State mit Retry-Button", async () => {
    const user = userEvent.setup();
    // useGetChildProgress → { error } mocken, Retry klickbar prüfen
    await user.click(await screen.findByRole("button", { name: /erneut/i }));
  });
}
```

```tsx
// apps/kids: ARIA-first (kein shadcn/ui)
it("REQ-KIDS-PLAYER-002: Icon-Button hat ARIA-Label", async () => {
  render(<VoiceoverReplayButton onReplay={() => {}} />, { wrapper });

  expect(
    await screen.findByRole("button", { name: /nochmal anhören/i })
  ).toBeInTheDocument();
});
```

## Do / Don't

- Do: sichtbaren Text/Rollen prüfen; pro REQ-relevantem Zustand ein Test (§3.1 Happy, §3.2 Regel → Fehlermeldung, §3.3 Edge → Empty).
- Don't: kein direkter `fetch`/`axios`-Mock; keine Snapshot-Tests als alleinige Abdeckung; keine Tailwind-Klassen-Assertions.

## Ausführung

- `ffg-mcp: js-unit` (`apps/kids`) bzw. `smarti-mcp: js-unit` (`apps/parent`).
- Lokal: `npm run test:run --workspace=apps/parent -- <name>` (vitest run, kein watch).
