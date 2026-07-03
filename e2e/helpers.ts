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

/** Run the currently-selected contract to resolution. Clicking Run hands off to the
 *  EncounterDirector overlay, whose phase machine stalls at its result phase (result
 *  has no auto-advance timer). Escape skips the pre-result animation: it commits the
 *  run (world.runChallenge) and auto-dismisses the overlay. Leaves any post-run
 *  decision for the caller to resolve. */
export async function runSelectedContract(page: Page): Promise<void> {
  await page.getByTestId("run-contract-button").click();
  const overlay = page.getByTestId("encounter-overlay");
  await expect(overlay).toBeVisible();
  // The phase machine auto-advances (dispatch → travel → encounter → resolve-checks),
  // committing world.runChallenge at resolve-checks, then STALLS at its result phase
  // (result has no auto-advance timer) showing the outcome banner. Escape at the
  // result phase dismisses the overlay back to the shell.
  await expect(page.getByTestId("outcome-banner")).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
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
