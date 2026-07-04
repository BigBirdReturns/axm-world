import { test, expect, type Page } from "@playwright/test";
import { enterCartridge, resolvePendingDecisions } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// First inhabited-world slice receipt (ADR 0001). The player enters The First
// Charter, stands in the hall as a presence marker, talks to the steward, accepts
// one contract IN PERSON, sees the world visibly change, and the result writes
// back to the same digest-stamped Program 001 ledger — surviving reload. The
// board path and this scene path converge (both resolve through the engine).
//
// Runs on desktop AND mobile (playwright.config.ts). On mobile the representation
// lives in the "board" step and cold-start auto-selects a contract (advancing to
// the contract step), so the helper steps back to the board first.
//
// Authored receipt: `npm run test:e2e`, not CI-gated. The pure derivation
// (deriveHallView) is covered by vitest.

const DIGEST = PROGRAM_001.authoredArcDigest;

async function showHall(page: Page, opts: { switchCostume: boolean }): Promise<void> {
  const width = page.viewportSize()?.width ?? 9999;
  if (width < 700 && (await page.getByTestId("mobile-step-back").count())) {
    await page.getByTestId("mobile-step-back").click();
  }
  if (opts.switchCostume) await page.getByTestId("view-hall").click();
  await expect(page.getByTestId("hall-scene")).toBeVisible();
}

async function openCartridgeObject(page: Page): Promise<void> {
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("cartridge-digest")).toBeVisible();
}

test("the hall presents the cartridge as an inhabited scene: a steward holding an authored contract", async ({ page }) => {
  await enterCartridge(page);
  await showHall(page, { switchCostume: true });

  // Fresh: the steward holds a contract (unresolved) and the world has not changed.
  await expect(page.getByTestId("hall-npc")).toHaveAttribute("data-resolved", "false");
  await expect(page.getByTestId("hall-world-change")).toHaveCount(0);

  // Talk: the dialogue presents the authored contract name (cold-start focus, "The Cellar").
  await page.getByTestId("hall-talk").click();
  await expect(page.getByTestId("hall-dialogue")).toBeVisible();
  await expect(page.getByTestId("hall-dialogue-contract")).toContainText(/Cellar/i);
});

test("resolving a contract in the hall writes one digest-stamped ledger entry, changes the world, and survives reload", async ({ page }) => {
  test.slow();
  await enterCartridge(page);
  await showHall(page, { switchCostume: true });

  // Accept & resolve in person — the same engine resolution the board triggers.
  await page.getByTestId("hall-talk").click();
  await page.getByTestId("hall-accept").click();
  await resolvePendingDecisions(page);

  // The world visibly changed, and exactly one entry was written under the same digest.
  await showHall(page, { switchCostume: false });
  await expect(page.getByTestId("hall-world-change")).toBeVisible();
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("cartridge-digest")).toHaveCount(0);

  // Reload the runtime and resume. First the rigorous, viewport-independent proof
  // that the digest-stamped writeback survived — the ledger — which also lets the
  // lazily-loaded shell finish mounting before we inspect the scene.
  await page.reload();
  await page.locator('[data-testid^="play-cartridge-"]').first().click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("cartridge-digest")).toHaveCount(0);

  // The saved "hall" costume reopens the inhabited scene, and the restored run
  // still reads as world-changed.
  await showHall(page, { switchCostume: false });
  await expect(page.getByTestId("hall-world-change")).toBeVisible();
});
