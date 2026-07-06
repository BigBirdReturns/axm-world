import { test, expect, type Page } from "@playwright/test";
import { enterCartridge, resolvePendingDecisions, runSelectedContract } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// Program 001 boot-plaque receipt: before the player ever resolves a contract,
// the cartridge bay presents The First Charter as a RODOH-loaded PROGRAM OF
// RECORD — its computed authored identity shown as identity, its save state
// legible (fresh vs resumable), its ledger counted, and a single primary action
// that reads "Enter" when fresh and "Resume" once a run is saved. This is what
// makes Program 001 read as a real RODOH cartridge, not a generic app screen.
//
// Authored receipt: runs via `npm run test:e2e` (Playwright), intentionally NOT
// part of CI (see playwright.config.ts). The CI-gated proofs of the underlying
// data/formatting logic live in vitest — tests/world/save.test.ts and
// tests/world/program-of-record.test.ts.

const DIGEST = PROGRAM_001.authoredArcDigest;

const EYEBROW = "bay-program-eyebrow-first-charter";
const BAY_DIGEST = "bay-cartridge-digest-first-charter";
const SUMMARY = "bay-ledger-summary-first-charter";
const PRIMARY = "play-cartridge-first-charter";

async function gotoBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await expect(page.getByTestId(EYEBROW)).toBeVisible();
}

test("fresh boot: Program 001 presents as a program of record, identity visible, nothing recorded, action reads Enter", async ({ page }) => {
  await gotoBay(page);

  // Program-of-record framing — not a generic cartridge row.
  await expect(page.getByTestId(EYEBROW)).toContainText(/program of record/i);
  await expect(page.getByTestId(EYEBROW)).toContainText(/PROGRAM 001/);

  // The COMPUTED authored identity is shown verbatim — the same digest the board,
  // sim, ledger, and saved result all resolve to.
  await expect(page.getByTestId(BAY_DIGEST)).toHaveText(DIGEST);

  // Fresh program: nothing recorded yet, and the primary action reads Enter.
  await expect(page.getByTestId(SUMMARY)).toContainText(/no runs recorded/i);
  await expect(page.getByTestId(PRIMARY)).toContainText(/enter/i);
  await expect(page.getByTestId(PRIMARY)).not.toContainText(/resume/i);
});

test("after one contract, the same plaque reads resumable, counts the ledger, and Resume restores without replaying the opening", async ({ page }) => {
  // Cold vite compile + the full encounter animation exceed the default budget.
  test.slow();
  await enterCartridge(page);

  // Cold-start focuses the first available node — "The Cellar". Run it to
  // resolution and clear any post-run decision the engine enqueues.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  await runSelectedContract(page);
  await resolvePendingDecisions(page);

  // Return to the bay via the cartridge object's Leave action.
  await page.getByTestId("cartridge-object-button").click();
  await page.getByRole("button", { name: /leave/i }).click();

  // The SAME plaque now reads resumable: the run is remembered, the ledger is
  // counted, the last contract is named, and the primary action reads Resume.
  await expect(page.getByTestId(EYEBROW)).toBeVisible();
  await expect(page.getByTestId(BAY_DIGEST)).toHaveText(DIGEST);
  await expect(page.getByTestId(SUMMARY)).toContainText(/resumable/i);
  await expect(page.getByTestId(SUMMARY)).toContainText(/1 contract recorded/i);
  await expect(page.getByTestId(SUMMARY)).toContainText(/Cellar/i);
  await expect(page.getByTestId(PRIMARY)).toContainText(/resume/i);

  // Resume restores the saved run: the resolved opening decision does NOT replay,
  // and the ledger still holds the one recorded contract under the same digest.
  await page.getByTestId(PRIMARY).click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("cartridge-digest")).toHaveText(DIGEST);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
  await expect(page.getByTestId("ledger-entry").first()).toContainText(/Cellar/i);
});
