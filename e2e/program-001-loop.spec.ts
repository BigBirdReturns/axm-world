import { test, expect, type Page } from "@playwright/test";
import { enterCartridge, resolvePendingDecisions, runSelectedContract } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// Program 001 receipt: RODOH visibly loads The First Charter, shows its COMPUTED
// authored identity (cartridgeIdentity, not a claimed manifest value), records one
// resolved contract in the ledger, and remembers it across a full reload — the
// board (cleared marks), the sim result, and the ledger all resolving to the same
// cartridge digest.
//
// This is an authored receipt: it runs via `npm run test:e2e` (Playwright), which
// is intentionally NOT part of CI (see playwright.config.ts). The CI-gated proof of
// the same invariant lives in vitest — tests/world/program-loop.test.ts.

const DIGEST = PROGRAM_001.authoredArcDigest;

async function openCartridgeObject(page: Page): Promise<void> {
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("cartridge-digest")).toBeVisible();
}

async function closeCartridgeObject(page: Page): Promise<void> {
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("cartridge-digest")).toHaveCount(0);
}

test("RODOH loads Program 001, displays its authored identity, and starts with an empty ledger", async ({ page }) => {
  await enterCartridge(page);
  await openCartridgeObject(page);

  // The displayed identity is the COMPUTED cartridge digest — not the manifest.
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-empty")).toBeVisible();
});

test("one resolved contract writes one ledger entry under the same digest, and survives reload", async ({ page }) => {
  // Cold vite compile + the full encounter animation + a runtime reload exceed the
  // default 30s budget; this receipt drives the whole visible loop end to end.
  test.slow();
  await enterCartridge(page);

  // The cold-start focuses the first available node — "The Cellar". Run it to
  // resolution (the encounter's result banner is the visible sim outcome for the same
  // contract) and clear any post-run decision the engine enqueues.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  await runSelectedContract(page);
  await resolvePendingDecisions(page);

  // The ledger now holds the contract, under the same authored identity.
  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);
  await closeCartridgeObject(page);

  // Reload the whole runtime. Re-enter the cartridge; the run is remembered via
  // the digest-guarded restore, and the resolved opening decision does not replay.
  await page.reload();
  await page.getByRole("button", { name: /enter/i }).first().click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);

  await openCartridgeObject(page);
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);
});
