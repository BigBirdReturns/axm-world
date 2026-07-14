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

  // The steward is an authored person, not a generic runtime figure: the First
  // Charter names "Maren Vos, Charter-Keeper".
  await expect(page.getByTestId("hall-npc")).toContainText(/Maren Vos/);
  await expect(page.getByTestId("hall-npc-role")).toContainText(/Charter-Keeper/i);

  // #72: she has an authored face and SPEAKS her authored greeting in the scene,
  // verbatim — a person, not a status row. #73: in the SCENE she stands as her
  // authored BODY (sprite in the scene; the portrait stays in the close-ups).
  await expect(page.getByTestId("hall-npc").getByTestId("person-sprite-charter-keeper")).toBeVisible();
  await expect(page.getByTestId("hall-speech")).toContainText(/Take the contract when you're ready/i);

  // #73: the hall is a PLACE — a floor to stand on, and your squad standing with
  // you as role-keyed bodies (the same recommended party the steward resolves with).
  await expect(page.getByTestId("hall-floor")).toBeVisible();
  await expect(page.getByTestId("hall-party-bodies")).toBeVisible();

  // Talk: the dialogue presents the authored person, their spoken line, and the
  // authored contract name (cold-start focus, "The Cellar").
  await page.getByTestId("hall-talk").click();
  await expect(page.getByTestId("hall-dialogue")).toBeVisible();
  await expect(page.getByTestId("hall-dialogue-speaker")).toContainText(/Maren Vos/);
  await expect(page.getByTestId("hall-dialogue-bio")).toBeVisible();
  await expect(page.getByTestId("hall-dialogue-line")).toContainText(/Take the contract/i);
  await expect(page.getByTestId("hall-dialogue-contract")).toContainText(/Cellar/i);
});

test("the steward's contract and the map's next pin are one place: same region, same up-next marker", async ({ page }) => {
  await enterCartridge(page);
  await showHall(page, { switchCostume: true });

  // In the hall, the steward's contract is named by its region and wears the
  // "▸ Up next" marker — it is the next thing to take.
  await expect(page.getByTestId("hall-contract-region")).toContainText(/Proving Grounds/i);
  await expect(page.getByTestId("hall-contract-region-next")).toBeVisible();

  // Switch to the strategic map: the SAME contract (The Cellar) is the next pin,
  // in the SAME region — one place, not two competing navigation systems.
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await expect(page.getByTestId("wm-next-cellar")).toBeVisible();
  const provingGrounds = page.getByTestId("wm-region-0");
  await expect(provingGrounds).toContainText(/Proving Grounds/i);
  await expect(provingGrounds.getByTestId("wm-pin-cellar")).toBeVisible();
});

test("resolving a contract in the hall writes one digest-stamped ledger entry, changes the world, and survives reload", async ({ page }) => {
  test.slow();
  await enterCartridge(page);
  await showHall(page, { switchCostume: true });

  // Enter the contract in person — the briefing hands off to the SAME playable
  // EncounterShell the board opens (no quick resolve). Play it through to a result.
  if (!(await page.getByTestId("hall-dialogue").count())) await page.getByTestId("hall-talk").click();
  await page.getByTestId("hall-enter-contract").click();
  await expect(page.getByTestId("encounter-shell")).toBeVisible();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();
  await page.getByTestId("encs-leave").click();
  await resolvePendingDecisions(page);

  // The world visibly changed, and exactly one entry was written under the same digest.
  await showHall(page, { switchCostume: false });
  await expect(page.getByTestId("hall-world-change")).toBeVisible();
  // #67: the hall now NAMES what it just recorded and how many the ledger holds —
  // you returned to a place that knows something happened.
  await expect(page.getByTestId("hall-last-recorded")).toContainText(/Cellar/i);
  await expect(page.getByTestId("hall-last-recorded")).toContainText(/1 in the ledger/i);
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

test("walk into the encounter from the hall: the same EncounterShell the board uses, resolving to the same digest-stamped ledger", async ({ page }) => {
  test.slow();
  await enterCartridge(page);
  await showHall(page, { switchCostume: true });

  // The briefing auto-opens after the oath and suppresses the floor actions;
  // dismiss it (Not yet) to explore the walk-to-threshold path.
  if (await page.getByTestId("hall-dialogue").count()) await page.getByTestId("hall-not-yet").click();
  // Navigate to the in-world encounter threshold, then walk in.
  await page.getByTestId("hall-approach").click();
  await page.getByTestId("hall-enter-encounter").click();

  // This is the SAME EncounterShell the board's PLAY ENCOUNTER opens — resolution
  // runs the real engine (encs-resolve → world.runChallenge), not a duplicate.
  await expect(page.getByTestId("encounter-shell")).toBeVisible();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();
  await page.getByTestId("encs-leave").click();
  await expect(page.getByTestId("encounter-shell")).toHaveCount(0);
  await resolvePendingDecisions(page);

  // Same authored result: one digest-stamped ledger entry, world changed, survives reload.
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("cartridge-digest")).toHaveCount(0);

  await page.reload();
  await page.locator('[data-testid^="play-cartridge-"]').first().click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
});
