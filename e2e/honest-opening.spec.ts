import { test, expect, type Page } from "@playwright/test";

const CAPTURE = process.env.CAPTURE_COLD_RUN === "1";
const ARTIFACT = "docs/qa/axm-opening-cold-run";

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function chooseFoundingOath(page: Page): Promise<void> {
  const decision = page.getByTestId("pending-decision-card");
  await expect(decision).toBeVisible();
  await decision.getByRole("button", { name: /take the crown's seal/i }).click();
  await expect(decision).toHaveAttribute("data-phase", "resolved");
  await decision.getByRole("button", { name: /continue/i }).click();
  await expect(decision).toHaveCount(0);
}

test("cold operator founds, commits an engine-honored plan, resumes it exactly, and records the consequence", async ({ page }) => {
  test.slow();
  await coldBay(page);
  await page.getByTestId("play-cartridge-first-charter").click();
  await chooseFoundingOath(page);

  await expect(page.getByTestId("hall-scene")).toBeVisible();
  await expect(page.getByTestId("selected-contract-title")).toContainText("The Cellar");
  if (CAPTURE) await page.screenshot({ path: `${ARTIFACT}/01-founded-hall.png`, fullPage: true });
  await page.getByTestId("hall-enter-contract").click();

  const encounter = page.getByTestId("encounter-shell");
  await expect(encounter).toHaveAttribute("data-encounter-state", "briefing");
  await expect(page.getByTestId("experience-party").locator("button[aria-pressed=true]")).toHaveCount(6);
  await page.getByRole("radio", { name: /commit 1 capacity mark/i }).check();
  await page.getByTestId("commit-plan").click();
  await expect(encounter).toHaveAttribute("data-encounter-state", "committed");
  if (CAPTURE) await page.screenshot({ path: `${ARTIFACT}/02-committed-plan.png`, fullPage: true });

  // Full page reload returns to the shelf first. Re-entering the exact digest must
  // restore the same challenge, committed party, and explicit resource decision.
  await page.reload();
  await page.getByTestId("play-cartridge-first-charter").click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await expect(page.getByTestId("encounter-shell")).toHaveAttribute("data-encounter-state", "committed");
  await expect(page.getByRole("radio", { name: /commit 1 capacity mark/i })).toBeChecked();
  await expect(page.getByTestId("experience-party").locator("button[aria-pressed=true]")).toHaveCount(6);

  await page.getByTestId("encs-resolve").click();
  const action = page.getByTestId("encounter-action");
  await expect(action).toBeVisible();
  await expect(action).toHaveAttribute("data-beat", "descent");
  await expect(action).toHaveAttribute("data-beat", "verdict", { timeout: 4_000 });
  if (CAPTURE) await page.screenshot({ path: `${ARTIFACT}/02b-cellar-action.png`, fullPage: true });
  const receipt = page.getByTestId("encs-receipt");
  await expect(receipt).toBeVisible();
  await expect(receipt).toHaveAttribute("data-outcome", /success|partial|failure/);
  await expect(page.getByTestId("founder-aftermath")).toBeVisible();

  // A successful Cellar drop is a required Arc-owned choice, not a decorative
  // reward line. Reload before choosing proves the unresolved choice is durable.
  const reward = page.getByTestId("reward-choice");
  let rewardedFounderId: string | null = null;
  if (await reward.count()) {
    await expect(page.getByTestId("encs-leave")).toBeDisabled();
    if (CAPTURE) {
      await reward.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${ARTIFACT}/03a-reward-choice.png`, fullPage: true });
    }
    await page.reload();
    await page.getByTestId("play-cartridge-first-charter").click();
    await expect(page.getByTestId("cartridge-enter-transition")).toHaveCount(0, { timeout: 2_000 });
    await expect(page.getByTestId("reward-choice")).toBeVisible();
    const candidate = page.locator('[data-testid^="reward-candidate-"]').first();
    rewardedFounderId = (await candidate.getAttribute("data-testid"))!.replace("reward-candidate-", "");
    await candidate.click();
    await expect(page.getByTestId("reward-memory")).toBeVisible();
    await expect(page.getByTestId("encs-leave")).toBeEnabled();

    // Reload after choosing proves the equipped founder and precedent are part
    // of the exact Arc save, not session-only presentation state.
    await page.reload();
    await page.getByTestId("play-cartridge-first-charter").click();
    await expect(page.getByTestId("cartridge-enter-transition")).toHaveCount(0, { timeout: 2_000 });
    await expect(page.getByTestId("reward-memory")).toBeVisible();
  }

  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry")).toContainText("The Cellar");
  await page.getByRole("button", { name: "Resume" }).click();
  if (CAPTURE) await page.screenshot({ path: `${ARTIFACT}/03-recorded-consequence.png`, fullPage: true });

  // Receipt is itself resumable, not a session-only animation.
  await expect(page.getByText(/ledger entry #1/i)).toBeVisible();
  if (CAPTURE) {
    await page.waitForTimeout(750);
    await page.screenshot({ path: `${ARTIFACT}/04-resumed-receipt.png`, fullPage: true });
  }

  await page.getByTestId("encs-leave").click();
  await expect(page.getByTestId("changed-hall-memory")).toBeVisible();
  if (rewardedFounderId) {
    await expect(page.getByTestId(`founder-${rewardedFounderId}`)).toContainText("Rusty Blade");
    await expect(page.getByTestId("carried-consequence")).toBeVisible();
  }
  if (CAPTURE) {
    await page.waitForTimeout(750);
    await page.screenshot({ path: `${ARTIFACT}/05-changed-hall.png`, fullPage: true });
  }

  // Leave through the run record, then re-enter from the shelf. The changed
  // hall and next-contract carry-forward must still be the first thing shown.
  await page.getByTestId("cartridge-object-button").click();
  await page.getByRole("button", { name: "Leave" }).click();
  await page.getByTestId("play-cartridge-first-charter").click();
  await expect(page.getByTestId("cartridge-enter-transition")).toHaveCount(0, { timeout: 2_000 });
  await expect(page.getByTestId("changed-hall-memory")).toBeVisible();
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Bridge Troll|Cellar/);
});

test("the same receiver mounts a second Arc without a World rewrite", async ({ page }) => {
  await coldBay(page);
  await page.getByTestId("play-cartridge-karazhan").click();
  const decision = page.getByTestId("pending-decision-card");
  await expect(decision).toBeVisible();
  await decision.getByRole("button").first().click();
  await decision.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByTestId("axm-experience")).toBeVisible();
  await expect(page.getByText("Karazhan", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/RODOH WORLD · RECEIVER/i)).toBeVisible();
});
