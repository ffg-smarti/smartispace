# Kids-Journeys (apps/kids, Port 8081 — TS-Zweig)

Voraussetzung: `journeys-base.md` wurde geladen (Zweig-Entscheidung: dieser Datei nur folgen, wenn der Prüfling frontend-verankert ist; sonst Python-Zweig aus `journeys-base.md`). Diese Datei enthält nur kids-Spezifika. `parent-journeys.md` nicht laden.

## Kids-Spezifika

- **App:** `apps/kids` (Port 8081, `ffg-mcp: e2e-test`); KEIN shadcn/ui — Icon-/Audio-first.
- **Auth-Flow:** PIN-/Pad-Flow + `ParentalGate` (statt Login-Form/`ProtectedRoute`); Test-Helper z. B. `loginAsChild(page)` in `e2e/helpers/`.
- **A11y-Pflicht:** pro Journey ein `axe-core`-Scan — Fehler lassen den Test rot werden. Prüfpunkte: ARIA-Labels auf Icon-Buttons, Kontrast, Fokus-Reihenfolge, Voiceover-Button erreichbar.
- **Tracking-Verbot:** kein Tracking von Kindern — keine Tracking-Assertions, keine Analytics-Stubs als Erfolgsnachweis.

## Template

```ts
// apps/kids/e2e/session/session-player.spec.ts
import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("FEAT-31 Session Player (kids)", () => {
  test("Happy-Path: Station starten → Player sichtbar + A11y sauber", async ({ page }) => {
    await page.goto("/session/demo-station");

    await expect(
      page.getByRole("button", { name: /nochmal anhören/i })
    ).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```
