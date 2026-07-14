import { expect, type Page } from "@playwright/test";

/** Boot the player into a running cartridge with the opening decision resolved. */
export async function enterCartridge(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  // Boot the first bundled cartridge via its primary action. The label is Enter
  // for a fresh program and Resume for a resumable one, so target the stable
  // testid rather than the (state-dependent) button text.
  await page.locator('[data-testid^="play-cartridge-"]').first().click();
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

/** Play the currently selected contract through the one player-facing commit path.
 * The compiled encounter resolves through world.runChallenge and leaves any
 * post-run decision for the caller. */
export async function runSelectedContract(page: Page): Promise<void> {
  const hallHandoff = page.getByTestId("hall-enter-contract");
  if (await hallHandoff.isVisible().catch(() => false)) {
    await hallHandoff.click();
  } else {
    await page.getByTestId("play-encounter-button").click();
  }
  const encounter = page.getByTestId("encounter-shell");
  await expect(encounter).toBeVisible();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();
  await page.getByTestId("encs-leave").click();
  await expect(encounter).toHaveCount(0);
}

/** Clear any pending decisions (e.g. a drama card the engine enqueues after a run).
 *  The view switcher is intentionally disabled while a decision is open, so callers
 *  must resolve them before switching representations. */
export async function resolvePendingDecisions(page: Page): Promise<void> {
  const card = page.getByTestId("pending-decision-card");
  // One engine cycle can queue several authored relationship/drama decisions.
  // A new card may replace the response immediately, so waiting for count=0 after
  // every Continue is incorrect; wait for the current card text to change instead.
  for (let i = 0; i < 20 && (await card.count()) > 0; i++) {
    const before = await card.textContent();
    const continueButton = card.getByRole("button", { name: /continue/i });
    if (await continueButton.count()) {
      await continueButton.click();
    } else {
      const choices = card.getByRole("button");
      expect(await choices.count()).toBeGreaterThan(0);
      await choices.first().click();
    }
    await expect.poll(async () => (await card.count()) === 0 ? null : card.textContent()).not.toBe(before);
  }
  await expect(card).toHaveCount(0);
}
