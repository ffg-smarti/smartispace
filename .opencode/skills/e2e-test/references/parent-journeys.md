# Parent-Journeys (apps/parent, Port 8080 — TS-Zweig)

Voraussetzung: `journeys-base.md` wurde geladen (Zweig-Entscheidung: dieser Datei nur folgen, wenn der Prüfling frontend-verankert ist; sonst Python-Zweig aus `journeys-base.md`). Diese Datei enthält nur parent-Spezifika. `kids-journeys.md` nicht laden.

## Parent-Spezifika

- **App:** `apps/parent` (Port 8080, `smarti-mcp: e2e-test`); shadcn/ui nur via `@smarti/ui`-Primitive (Button, Card, Dialog) — keine Custom-Nachbauten.
- **Auth-Flow:** Login-Form + `ProtectedRoute`; Test-Helper z. B. `loginAsParent(page)` in `e2e/helpers/`.
- **Kein axe-Pflicht-Scan:** A11y nach Bedarf, nicht pro Journey vorgeschrieben (Unterschied zu kids).

## Template

```ts
// apps/parent/e2e/accounts/parent-login.spec.ts
import { expect, test } from "@playwright/test";

import { loginAsParent } from "../helpers/auth";

test.describe("FEAT-6 Parent Sign-In (REQ-ACCT-LOGIN-001)", () => {
  test("Happy-Path: Login → Dashboard sichtbar", async ({ page }) => {
    await loginAsParent(page, { username: "parent", password: "Parent123" });

    await expect(
      page.getByRole("heading", { name: /dashboard/i })
    ).toBeVisible();
  });

  test("Edge-Case (§3.3): falsches Passwort → Fehlermeldung", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/benutzername/i).fill("parent");
    await page.getByLabel(/passwort/i).fill("Wrong123");
    await page.getByRole("button", { name: /anmelden/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
  });
});
```
