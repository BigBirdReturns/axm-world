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


/** Complete Program 001's directed first-contract teaching loop and cross the
 * explicit handoff into the reusable multi-representation shell. Cartridges
 * that already boot directly into the shell are returned unchanged. */
export async function enterFullRuntime(page: Page): Promise<void> {
  await enterCartridge(page);
  if (await page.getByTestId("engine-shell").isVisible().catch(() => false)) return;

  const handoff = page.getByTestId("enter-rodoh-runtime");
  if (!(await handoff.isVisible().catch(() => false))) {
    await runSelectedContract(page);
    await resolvePendingDecisions(page);
  }
  await expect(handoff).toBeVisible();
  await handoff.click();
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

/** Mobile stages Board, Contract, and Party as separate player actions. Open the
 * focused Up next contract through the same Board click a player must make. If a
 * user-selected card is already focused, its first click clears selection; click
 * it once more to make the reopening act. Desktop has no staged sheet and is a no-op. */
export async function openMobileContractSheet(page: Page): Promise<void> {
  const sheet = page.getByTestId("mobile-step-contract");
  if (await sheet.isVisible().catch(() => false)) return;

  const boardStep = page.getByTestId("mobile-step-board");
  if ((await boardStep.count()) === 0) return;
  if (!(await page.getByTestId("contract-board").isVisible().catch(() => false))) {
    await page.getByTestId("view-run-graph").click();
  }
  await expect(page.getByTestId("contract-board")).toBeVisible();

  const upNextCard = page.locator('[data-testid^="contract-board-card-"][data-upnext="true"]').first();
  await expect(upNextCard).toBeVisible();
  await upNextCard.click();
  const opened = await sheet.waitFor({ state: "visible", timeout: 1_000 }).then(() => true, () => false);
  if (!opened) await upNextCard.click();
  await expect(sheet).toBeVisible();
  await expect(page.getByTestId("mobile-mission-stage")).toBeVisible();
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
  const encounter = page.getByTestId("encounter-shell");
  if (!(await encounter.isVisible().catch(() => false))) {
    const hallHandoff = page.getByTestId("hall-enter-contract");
    if (await hallHandoff.isVisible().catch(() => false)) {
      await hallHandoff.click();
    } else {
      await page.getByTestId("play-encounter-button").click();
    }
  }
  await expect(encounter).toBeVisible();

  // Program 001's directed opening now makes the deployment decision explicit:
  // briefing -> commit exact plan -> resolve. Imported/shell encounters still
  // open directly on their existing resolve control, so this remains one helper
  // for both routes without inventing a second action path.
  const commitPlan = page.getByTestId("commit-plan");
  if (await commitPlan.isVisible().catch(() => false)) {
    await commitPlan.click();
    await expect(encounter).toHaveAttribute("data-encounter-state", "committed");
  }

  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();

  // The First Charter can emit an Arc-owned required reward choice. Generic
  // loop receipts are not testing that choice's deliberation (the dedicated
  // honest-opening journey does), so choose the first legal candidate here to
  // complete the shared contract loop instead of hanging on a disabled Leave.
  const reward = page.getByTestId("reward-choice");
  if (await reward.count()) {
    await reward.locator('[data-testid^="reward-candidate-"]').first().click();
    await expect(reward).toHaveCount(0);
  }

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
  for (let i = 0; i < 100 && (await card.count()) > 0; i++) {
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
