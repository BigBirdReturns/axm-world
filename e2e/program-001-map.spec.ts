import { test, expect, type Page } from "@playwright/test";
import { enterFullRuntime, resolvePendingDecisions, runSelectedContract } from "./helpers";
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
  await enterFullRuntime(page);
  await showMap(page);

  // The map frames itself as THIS cartridge's world (authored name flows verbatim),
  // not a generic node graph — with an arc-wide recorded roll-up starting after the directed first mark at 1/6.
  await expect(page.getByTestId("wm-world-name")).toHaveText(/The First Charter/);
  await expect(page.getByTestId("wm-progress")).toHaveAttribute("data-recorded", "1");
  await expect(page.getByTestId("wm-progress")).toHaveAttribute("data-total", "6");

  // Regions carry a rolled-up status: Proving Grounds is open, the later tier locked.
  await expect(page.getByTestId("wm-region-0")).toHaveAttribute("data-status", "active");
  await expect(page.getByTestId("wm-region-1")).toHaveAttribute("data-status", "locked");

  // The directed opening has recorded The Cellar. Exactly one next marker now
  // advances to The Bridge Troll; the same projection drives Hall, Board, and Map.
  await expect(page.getByTestId("wm-recorded-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-next-bridge-troll")).toBeVisible();
  await expect(page.getByTestId("wm-pin-bridge-troll")).toHaveAttribute("data-next", "true");
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
  await enterFullRuntime(page);
  await showBoard(page);

  // The map's next pin (bridge-troll) and steep pins read identically on the
  // board cards — one shared projection, not a parallel interpretation.
  await expect(page.getByTestId("contract-board-card-bridge-troll")).toHaveAttribute("data-upnext", "true");
  await expect(page.getByTestId("contract-board-card-bridge-troll")).not.toHaveAttribute("data-steep", "true");
  await expect(page.getByTestId("contract-board-card-bridge-troll").getByTestId("contract-card-marker-next")).toBeVisible();
  await expect(page.getByTestId("contract-board-card-wardens-keep")).toHaveAttribute("data-steep", "true");
  await expect(page.getByTestId("contract-board-card-bandit-camp")).toHaveAttribute("data-steep", "true");
});

test("board card separates world state from squad fit: a readiness verdict is never the contract state", async ({ page }) => {
  await enterFullRuntime(page);
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
  await enterFullRuntime(page);
  await showBoard(page);
  const detail = page.getByTestId("contract-detail-stack");

  // Selecting the next contract (Bridge Troll) carries Up next and both bands
  // onto the commit surface after the directed Cellar opening.
  await page.getByTestId("contract-board-card-bridge-troll").click();
  if (!(await page.getByTestId("selected-contract-title").isVisible().catch(() => false))) {
    await page.getByTestId("contract-board-card-bridge-troll").click();
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
  await enterFullRuntime(page);
  await showMap(page);

  // Walk into the encounter from the map pin: the SAME EncounterShell the board's
  // PLAY ENCOUNTER and the hall's threshold open (onEnterEncounter → engine), not a
  // duplicate resolver.
  await page.getByTestId("wm-enter-bridge-troll").click();
  await expect(page.getByTestId("encounter-shell")).toBeVisible();

  // #68: before committing, the encounter stages the confrontation as bodies — the
  // committed squad ("N going in") faces the site, with the fit projection between
  // them. Same encounter, resolved through the same engine; staging is display-only.
  await expect(page.getByTestId("encs-staging")).toBeVisible();
  await expect(page.getByTestId("encs-staging-party")).toContainText(/going in/i);
  await expect(page.getByTestId("encs-staging-threat")).toBeVisible();

  // The map opened the shared EncounterShell; the generic helper commits the
  // exact squad, resolves through the engine, and completes any required reward.
  await runSelectedContract(page);
  await resolvePendingDecisions(page);

  // The map's own state advanced to match: Cellar and Bridge Troll are recorded,
  // progress moved to 2/6, and Bridge Troll is no longer next.
  await showMap(page);
  await expect(page.getByTestId("wm-recorded-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-recorded-bridge-troll")).toBeVisible();
  await expect(page.getByTestId("wm-progress")).toHaveAttribute("data-recorded", "2");
  await expect(page.getByTestId("wm-next-bridge-troll")).toHaveCount(0);
  await expect(page.getByTestId("wm-pin-bridge-troll")).not.toHaveAttribute("data-next", "true");

  // And the writeback is the one digest-stamped Program 001 ledger — no new shape.
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(2);
  await expect(page.getByTestId("ledger-entry").last()).toContainText(/Bridge Troll/i);

  // The ledger reads as memory + provenance over the same fields.
  await expect(page.getByTestId("ledger-count")).toHaveText(/2 recorded/i);
  await expect(page.getByTestId("ledger-entry").last().getByTestId("ledger-entry-seq")).toHaveText("02");
  await expect(page.getByTestId("ledger-provenance")).toBeVisible();
});
