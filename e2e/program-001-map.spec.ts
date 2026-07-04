import { test, expect, type Page } from "@playwright/test";
import { enterCartridge, resolvePendingDecisions } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// Map-art polish receipt. The World-map is a STRATEGIC OVERLAY over the same
// WorldNode state every surface reads — not a debug graph. This proves the map
// visibly expresses the playable state that already exists: the cartridge's own
// name, per-region progress and status, the arc's steepness gradient, and the one
// "next" contract (the same node the inhabited hall's steward holds). Acting on a
// pin routes through the SAME EncounterShell / engine path the board and hall use,
// and the map's state advances to match — surviving nothing new: no second
// resolver, save path, or ledger.
//
// Runs on desktop AND mobile (playwright.config.ts). On mobile the representation
// lives in the "board" step and cold-start auto-selects a contract (advancing to
// the contract step), so the helper steps back to the board first.
//
// Authored receipt: `npm run test:e2e`, not CI-gated. The pure derivation
// (deriveWorldMap) is covered by vitest.

const DIGEST = PROGRAM_001.authoredArcDigest;

async function showMap(page: Page): Promise<void> {
  const width = page.viewportSize()?.width ?? 9999;
  if (width < 700 && (await page.getByTestId("mobile-step-back").count())) {
    await page.getByTestId("mobile-step-back").click();
  }
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
}

async function openCartridgeObject(page: Page): Promise<void> {
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("cartridge-digest")).toBeVisible();
}

async function showBoard(page: Page): Promise<void> {
  const width = page.viewportSize()?.width ?? 9999;
  // Mobile cold-start auto-advances to the contract step; step back to the board.
  if (width < 700 && (await page.getByTestId("mobile-step-back").count())) {
    await page.getByTestId("mobile-step-back").click();
  }
  // The board is the default representation; switch back to it if another is active.
  if (!(await page.getByTestId("contract-board").isVisible().catch(() => false))) {
    await page.getByTestId("view-run-graph").click();
  }
  await expect(page.getByTestId("contract-board")).toBeVisible();
}

test("the map presents Program 001 as a cartridge surface: named world, region state, steepness, and the next contract", async ({ page }) => {
  await enterCartridge(page);
  await showMap(page);

  // The map frames itself as THIS cartridge's world (authored name flows verbatim),
  // not a generic node graph — with an arc-wide recorded roll-up starting at 0/6.
  await expect(page.getByTestId("wm-world-name")).toHaveText(/The First Charter/);
  await expect(page.getByTestId("wm-progress")).toHaveAttribute("data-recorded", "0");
  await expect(page.getByTestId("wm-progress")).toHaveAttribute("data-total", "6");

  // Regions carry a rolled-up status: Proving Grounds is open, the later tier locked.
  await expect(page.getByTestId("wm-region-0")).toHaveAttribute("data-status", "active");
  await expect(page.getByTestId("wm-region-1")).toHaveAttribute("data-status", "locked");

  // Exactly one "next" contract, and it is The Cellar — the same contract the hall's
  // steward holds (shared derivation). The steep gradient marks the hard, late
  // contracts (authored difficulty), not the easy opener.
  await expect(page.getByTestId("wm-next-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-pin-cellar")).toHaveAttribute("data-next", "true");
  await expect(page.getByTestId("wm-pin-steep-wardens-keep")).toBeVisible();
  await expect(page.getByTestId("wm-pin-steep-bandit-camp")).toBeVisible();
  await expect(page.getByTestId("wm-pin-steep-cellar")).toHaveCount(0);

  // A state key rides on the map surface so every marker reads without leaving it:
  // all six visible states are explained in place (acceptance for the legend PR).
  await expect(page.getByTestId("wm-legend")).toBeVisible();
  for (const marker of ["next", "available", "active", "steep", "recorded", "locked"]) {
    await expect(page.getByTestId(`wm-legend-${marker}`)).toBeVisible();
  }
});

test("the board speaks the same marker language as the map: the same 'Up next' and 'Steep' contracts", async ({ page }) => {
  await enterCartridge(page);
  await showBoard(page);

  // The map's next pin (cellar) and steep pins (wardens-keep, bandit-camp) read
  // identically on the board cards — one shared projection (deriveNodeMarkers), not
  // a parallel interpretation. Markers are display-only: the card still selects.
  await expect(page.getByTestId("contract-board-card-cellar")).toHaveAttribute("data-upnext", "true");
  await expect(page.getByTestId("contract-board-card-cellar")).not.toHaveAttribute("data-steep", "true");
  await expect(page.getByTestId("contract-board-card-cellar").getByTestId("contract-card-marker-next")).toBeVisible();
  await expect(page.getByTestId("contract-board-card-wardens-keep")).toHaveAttribute("data-steep", "true");
  await expect(page.getByTestId("contract-board-card-bandit-camp")).toHaveAttribute("data-steep", "true");
});

test("board card separates world state from squad fit: a readiness verdict is never the contract state", async ({ page }) => {
  await enterCartridge(page);
  await showBoard(page);

  // An open contract's header state reads its WORLD state — never the squad verdict.
  // The Bridge Troll is available; its risky projection lives only in the squad band.
  const bridge = page.getByTestId("contract-board-card-bridge-troll");
  await expect(bridge).toHaveAttribute("data-state", "available");
  await expect(bridge.getByTestId("contract-card-world-band")).toBeVisible();
  await expect(bridge.getByTestId("contract-card-squad-band")).toBeVisible();

  // A locked contract is world-locked, and its squad fit is "not evaluated" (data
  // "none") — a locked card never implies squad failure.
  const bandit = page.getByTestId("contract-board-card-bandit-camp");
  await expect(bandit).toHaveAttribute("data-state", "locked");
  await expect(bandit.getByTestId("contract-card-squad-band")).toHaveAttribute("data-squadfit", "none");
});

test("world-state markers travel to the commit surface: the detail panel carries Up next / Steep and the two bands", async ({ page }, testInfo) => {
  // The detail panel is the desktop right-rail; on mobile it's staged into separate
  // steps, so this cross-surface check runs on desktop.
  test.skip(testInfo.project.name !== "desktop", "detail panel is a desktop right-rail");
  await enterCartridge(page);
  await showBoard(page);
  const detail = page.getByTestId("contract-detail-stack");

  // Selecting the next contract (cellar) carries ▸ Up next and both bands onto the
  // commit surface — the player never has to remember them from the board.
  await page.getByTestId("contract-board-card-cellar").click();
  if (!(await page.getByTestId("selected-contract-title").isVisible().catch(() => false))) {
    await page.getByTestId("contract-board-card-cellar").click();
  }
  await expect(page.getByTestId("selected-contract-title")).toBeVisible();
  await expect(detail.getByTestId("detail-up-next")).toBeVisible();
  await expect(detail.getByTestId("contract-card-world-band")).toBeVisible();
  await expect(detail.getByTestId("contract-card-squad-band")).toBeVisible();

  // A steep contract carries ⚠ Steep forward too (Bandit Camp: locked + steep).
  await page.getByTestId("contract-board-card-bandit-camp").click();
  await expect(page.getByTestId("selected-contract-title")).toBeVisible();
  await expect(detail.getByTestId("detail-steep")).toBeVisible();
});

test("entering an encounter from the map records it, advances progress, and moves the next marker — same digest-stamped ledger", async ({ page }) => {
  test.slow();
  await enterCartridge(page);
  await showMap(page);

  // Walk into the encounter from the map pin: the SAME EncounterShell the board's
  // PLAY ENCOUNTER and the hall's threshold open (onEnterEncounter → engine), not a
  // duplicate resolver.
  await page.getByTestId("wm-enter-cellar").click();
  await expect(page.getByTestId("encounter-shell")).toBeVisible();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();
  await page.getByTestId("encs-leave").click();
  await expect(page.getByTestId("encounter-shell")).toHaveCount(0);
  await resolvePendingDecisions(page);

  // The map's own state advanced to match: The Cellar reads recorded, the arc-wide
  // progress moved to 1/6, and "next" is no longer The Cellar.
  await showMap(page);
  await expect(page.getByTestId("wm-recorded-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-progress")).toHaveAttribute("data-recorded", "1");
  await expect(page.getByTestId("wm-next-cellar")).toHaveCount(0);
  await expect(page.getByTestId("wm-pin-cellar")).not.toHaveAttribute("data-next", "true");

  // And the writeback is the one digest-stamped Program 001 ledger — no new shape.
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);

  // The ledger reads as memory + proof over the SAME fields: a cumulative count,
  // a per-entry recording order (seq), and a closing seal binding it to the
  // authored identity. Display-only — no new schema, just the record made legible.
  await expect(page.getByTestId("ledger-count")).toHaveText(/1 recorded/i);
  await expect(page.getByTestId("ledger-entry").first().getByTestId("ledger-entry-seq")).toHaveText("01");
  await expect(page.getByTestId("ledger-sealed")).toBeVisible();
});
