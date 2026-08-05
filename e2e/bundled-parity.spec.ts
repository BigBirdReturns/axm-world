import { test, expect, type Page } from "@playwright/test";
import { resolvePendingDecisions } from "./helpers";

const CASES = [
  { id: "karazhan", scope: "karazhan", title: /The Waking Tower/i },
  { id: "kind-gods-of-ilyon", scope: "ilyon", title: /Kind Gods of Ilyon/i },
] as const;

async function coldBoot(page: Page, id: string): Promise<void> {
  // Exercise the required non-WebGL representation contract deterministically.
  // Dedicated inhabited-world receipts cover the accelerated renderer; this
  // parity journey proves every cartridge remains complete on constrained hosts.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patchedGetContext(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ): RenderingContext | null {
      if (contextId === "webgl" || contextId === "webgl2") return null;
      return original.call(this, contextId as never, ...(args as []));
    };
  });
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("sensory-switcher")).toBeVisible();
  await page.getByTestId(`play-cartridge-${id}`).click();

  // Cartridge-owned bodies are rendered by the authored opening response. On
  // mobile the post-opening Board is intentionally a compact list and does not
  // keep those bodies mounted, so prove the art at the exact stage that owns it
  // rather than requiring decorative hidden DOM after the decision is closed.
  const decision = page.getByTestId("pending-decision-card");
  await expect(decision).toBeVisible();
  await decision.getByRole("button").first().click();
  await expect(page.locator('[data-appearance]:not([data-appearance^="rodoh:"])').first()).toBeAttached();
  await decision.getByRole("button", { name: /continue/i }).click();
  await expect(decision).toHaveCount(0);
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function enterFirstSharedEncounter(page: Page): Promise<void> {
  const hall = page.getByTestId("hall-enter-contract");
  if (await hall.isVisible().catch(() => false)) {
    await hall.click();
    return;
  }
  // The flat map is the breakpoint-neutral direct route into the same compiled
  // encounter. Using it here proves mobile and desktop share one action seam
  // without depending on the phone-only Board -> Contract staging choreography.
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await page.locator('[data-testid^="wm-enter-"]').first().click();
}

async function assertEveryRepresentation(page: Page): Promise<void> {
  await page.getByTestId("view-run-graph").click();
  await expect(page.getByTestId("contract-board")).toBeVisible();
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await page.getByTestId("view-hall").click();
  await expect(page.getByTestId("hall-scene")).toBeVisible();
  await page.getByTestId("view-aperture").click();
  await expect(page.getByTestId("rodoh-aperture")).toBeVisible();
  await page.getByTestId("view-planet").click();
  await expect(page.getByTestId("walkable-world")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("walkable-world")).toHaveAttribute("data-renderer", "orbital-fallback");
}

for (const item of CASES) {
  test(`${item.id} has equal first-action, custody, art, and representation depth`, async ({ page }) => {
    test.slow();
    await coldBoot(page, item.id);
    await expect(page.getByTestId("cartridge-title")).toContainText(item.title);
    await expect(page.locator("html")).toHaveAttribute("data-cartridge", item.scope);

    await enterFirstSharedEncounter(page);
    const encounter = page.getByTestId("encounter-shell");
    await expect(encounter).toBeVisible();
    await page.getByTestId("encs-resolve").click();
    await expect(page.getByTestId("encs-receipt")).toBeVisible();
    await page.getByTestId("encs-leave").click();
    await resolvePendingDecisions(page);

    await page.getByTestId("cartridge-object-button").click();
    await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
    await page.getByRole("button", { name: /resume/i }).click();
    await assertEveryRepresentation(page);

    await page.reload();
    await page.getByTestId(`play-cartridge-${item.id}`).click();
    await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
    await page.getByTestId("cartridge-object-button").click();
    await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  });
}
