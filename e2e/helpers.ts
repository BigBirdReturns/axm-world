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

/** Complete the guided First Charter entry — the honest cold-start path — and hand
 * off to the engine Shell. Program 001 routes every fresh run through the guided
 * experience (RuntimeRouter), so the Shell is only reachable after the first
 * contract resolves. Post-condition: The Cellar is recorded (one ledger entry)
 * and the full runtime chrome is mounted. */
export async function enterShellRuntime(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.locator('[data-testid^="play-cartridge-"]').first().click();
  await resolveOpeningDecision(page);
  // The guided experience holds the first contract; play it through the real engine,
  // then take the explicit handoff into the reusable runtime.
  await runSelectedContract(page);
  await resolvePendingDecisions(page);
  await page.getByTestId("enter-rodoh-runtime").click();
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

/** Mobile shell only: the contract sheet opens on an explicit player act (tapping a
 * board card), never from cold-start auto-focus — that gating is deliberate, so a
 * restored representation is never buried under the contract step. Tapping the
 * already-selected card deselects it first, hence the retry.
 *
 * The sheet itself only surfaces a compact MobileMissionStage preview; the full
 * commit detail (selected-contract-title, party-count, world/squad bands) lives
 * inside a native <details> "Squad fit" disclosure (mobile-mission-details) that
 * is collapsed by default — expand it so that content is genuinely visible, not
 * just present in the DOM. */
export async function openContractSheet(page: Page): Promise<void> {
  if (!(await page.getByTestId("mobile-step-contract").count())) {
    if (await page.getByTestId("mobile-step-back").count()) {
      await page.getByTestId("mobile-step-back").click();
    }
    if (!(await page.getByTestId("contract-board").isVisible().catch(() => false))) {
      await page.getByTestId("view-run-graph").click();
    }
    const card = page.locator('[data-testid^="contract-board-card-"][data-state="available"]').first();
    await card.click();
    try {
      await page.getByTestId("mobile-step-contract").waitFor({ state: "visible", timeout: 1_500 });
    } catch {
      await card.click();
    }
    await expect(page.getByTestId("mobile-step-contract")).toBeVisible();
  }
  const details = page.getByTestId("mobile-mission-details");
  if ((await details.count()) && !(await details.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await details.locator("summary").click();
  }
}

/** Play the currently selected contract through the one player-facing commit path.
 * The compiled encounter resolves through world.runChallenge and leaves any
 * post-run decision for the caller. */
export async function runSelectedContract(page: Page): Promise<void> {
  const hallHandoff = page.getByTestId("hall-enter-contract");
  if (await hallHandoff.isVisible().catch(() => false)) {
    await hallHandoff.click();
  } else {
    if (!(await page.getByTestId("play-encounter-button").isVisible().catch(() => false))) {
      // Mobile shell: the commit surface lives in the user-act-gated contract sheet.
      await openContractSheet(page);
    }
    await page.getByTestId("play-encounter-button").click();
  }
  const encounter = page.getByTestId("encounter-shell");
  await expect(encounter).toBeVisible();
  // The guided experience stages the plan first (briefing → committed); commit it
  // through the same engine path before resolving. Shell encounters resolve directly.
  if (await page.getByTestId("commit-plan").count()) {
    await page.getByTestId("commit-plan").click();
  }
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible({ timeout: 15_000 });
  // A successful drop can require an Arc-owned reward choice before leaving.
  if (await page.getByTestId("reward-choice").count()) {
    await page.locator('[data-testid^="reward-candidate-"]').first().click();
  }
  await expect(page.getByTestId("encs-leave")).toBeEnabled();
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
