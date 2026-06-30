import { expect, type Page } from "@playwright/test";

/** Boot the player into a running cartridge with the opening decision resolved. */
export async function enterCartridge(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.getByRole("button", { name: /play/i }).first().click();
  await resolveOpeningDecision(page);
}

/** Resolve the authored opening decision (pick the first option, then Continue). */
export async function resolveOpeningDecision(page: Page): Promise<void> {
  const card = page.getByTestId("pending-decision-card");
  await expect(card).toBeVisible();
  await card.getByRole("button").first().click(); // pick an option
  await card.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
}

/** Clear any pending decisions (e.g. a drama card the engine enqueues after a run).
 *  The view switcher is intentionally disabled while a decision is open, so callers
 *  must resolve them before switching representations. */
export async function resolvePendingDecisions(page: Page): Promise<void> {
  const card = page.getByTestId("pending-decision-card");
  for (let i = 0; i < 5 && (await card.count()) > 0; i++) {
    await card.getByRole("button").first().click();
    await card.getByRole("button", { name: /continue/i }).click();
    await expect(card).toHaveCount(0);
  }
}
