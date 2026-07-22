import { test, expect, type Page } from "@playwright/test";
import {
  enterCartridge,
  enterFullRuntime,
  resolvePendingDecisions,
  runSelectedContract,
} from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// Program 001's inhabited-world receipt. The directed first-contract experience
// is the fresh entry; after its consequence is recorded, an explicit handoff
// opens the reusable Hall/Map/Board/Globe/Aperture shell over the same ArcWorld.
// Both routes write to one digest-stamped ledger and survive reload.

const DIGEST = PROGRAM_001.authoredArcDigest;

async function showHall(page: Page, opts: { switchCostume: boolean }): Promise<void> {
  const width = page.viewportSize()?.width ?? 9999;
  if (width < 700 && (await page.getByTestId("mobile-step-back").count())) {
    await page.getByTestId("mobile-step-back").click();
  }
  if (opts.switchCostume && await page.getByTestId("view-hall").isVisible().catch(() => false)) {
    await page.getByTestId("view-hall").click();
  }
  await expect(page.getByTestId("hall-scene")).toBeVisible();
}

async function openCartridgeObject(page: Page): Promise<void> {
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("cartridge-digest")).toBeVisible();
}

test("the directed hall presents an authored steward, embodied founders, and the first contract", async ({ page }) => {
  await enterCartridge(page);
  await showHall(page, { switchCostume: false });

  // Fresh: Maren is an authored person, the hall has no prior consequence, and
  // the exact founder roster stands in the room.
  const steward = page.getByTestId("hall-npc");
  await expect(steward).toHaveAttribute("data-resolved", "false");
  await expect(steward).toContainText(/Maren Vos/);
  await expect(page.getByTestId("hall-npc-role")).toContainText(/Charter-Keeper/i);
  await expect(steward.getByTestId("person-sprite-charter-keeper")).toBeVisible();
  await expect(page.getByTestId("hall-speech")).toContainText(/Take the contract when you're ready/i);
  await expect(page.getByTestId("hall-party-bodies")).toBeVisible();
  await expect(page.getByTestId("changed-hall-memory")).toHaveCount(0);

  // The one advancing action names the authored opener and enters the exact-plan
  // briefing rather than silently resolving it.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  await page.getByTestId("hall-enter-contract").click();
  await expect(page.getByTestId("encounter-shell")).toHaveAttribute("data-encounter-state", "briefing");
  await expect(page.getByTestId("encounter-shell")).toContainText(/Cellar/i);
});

test("after the directed mark, the reusable hall and map agree on the same next place", async ({ page }) => {
  await enterFullRuntime(page);
  await showHall(page, { switchCostume: true });

  // The reusable Hall and strategic Map read the same live projection after the
  // Cellar is recorded: Bridge Troll is now the next contract in Proving Grounds.
  await expect(page.getByTestId("hall-contract-region")).toContainText(/Proving Grounds/i);
  await expect(page.getByTestId("hall-contract-region-next")).toBeVisible();

  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await expect(page.getByTestId("wm-recorded-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-next-bridge-troll")).toBeVisible();
  const provingGrounds = page.getByTestId("wm-region-0");
  await expect(provingGrounds).toContainText(/Proving Grounds/i);
  await expect(provingGrounds.getByTestId("wm-pin-bridge-troll")).toBeVisible();
});

test("resolving the directed hall contract records consequence, changes the room, and survives reload", async ({ page }) => {
  test.slow();
  await enterCartridge(page);
  await runSelectedContract(page);
  await resolvePendingDecisions(page);

  await showHall(page, { switchCostume: false });
  await expect(page.getByTestId("changed-hall-memory")).toBeVisible();
  await expect(page.getByTestId("changed-hall-memory")).toContainText(/Cellar/i);

  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);
  await page.getByRole("button", { name: /resume/i }).click();

  // Reload and resume the exact digest. The opening choice does not replay and
  // both the ledger and changed Hall remain present.
  await page.reload();
  await page.locator('[data-testid^="play-cartridge-"]').first().click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await page.getByRole("button", { name: /resume/i }).click();
  await showHall(page, { switchCostume: false });
  await expect(page.getByTestId("changed-hall-memory")).toBeVisible();
});

test("the directed exact-plan encounter resolves through the shared engine and ledger", async ({ page }) => {
  test.slow();
  await enterCartridge(page);
  await page.getByTestId("hall-enter-contract").click();

  const encounter = page.getByTestId("encounter-shell");
  await expect(encounter).toHaveAttribute("data-encounter-state", "briefing");
  await expect(page.getByTestId("experience-party").locator('button[aria-pressed="true"]')).toHaveCount(6);
  await page.getByTestId("commit-plan").click();
  await expect(encounter).toHaveAttribute("data-encounter-state", "committed");

  await runSelectedContract(page);
  await resolvePendingDecisions(page);
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);

  await page.reload();
  await page.locator('[data-testid^="play-cartridge-"]').first().click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await openCartridgeObject(page);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
});
