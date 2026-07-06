import { test, expect } from "@playwright/test";
import { enterCartridge, runSelectedContract, resolvePendingDecisions } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// In-shell identity continuity receipt: once the player is INSIDE the loop (past
// the boot plaque), the shell keeps reading as a RODOH-loaded program of record —
// RODOH, PROGRAM 001, The First Charter, the computed authored digest, and a live
// ledger summary — and that summary updates after a resolved contract. Runs on
// desktop AND mobile (see playwright.config.ts projects).
//
// Authored receipt: `npm run test:e2e`, intentionally NOT CI-gated. The
// underlying data/formatting logic (summarizeLedger, programForCartridge) is
// covered by vitest.

const DIGEST = PROGRAM_001.authoredArcDigest;

test("in-shell strip presents Program 001 as a program of record with its computed identity", async ({ page }) => {
  await enterCartridge(page);

  const strip = page.getByTestId("program-identity-strip");
  await expect(strip).toBeVisible();

  // Program-of-record framing persists during play, not just at the boot surface.
  await expect(page.getByTestId("strip-program")).toContainText(/PROGRAM 001/);
  await expect(page.getByTestId("strip-program")).toContainText(/program of record/i);
  // The RODOH runtime token anchors the strip.
  await expect(strip).toContainText(/RODOH/);
  // The First Charter's name flows through as content.
  await expect(strip).toContainText(/First Charter/i);

  // The displayed identity is the COMPUTED digest, verbatim — the full value in the
  // title, a short prefix visible.
  await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", DIGEST);
  await expect(page.getByTestId("strip-digest")).toContainText(DIGEST.slice(0, 12));

  // Fresh run: the live ledger summary reads "no runs recorded".
  await expect(page.getByTestId("strip-ledger")).toContainText(/no runs recorded/i);
});

test("the in-shell ledger summary updates after a resolved contract", async ({ page }) => {
  test.slow();
  await enterCartridge(page);

  await expect(page.getByTestId("strip-ledger")).toContainText(/no runs recorded/i);

  // Resolve the cold-start contract ("The Cellar") and clear any post-run decision.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  await runSelectedContract(page);
  await resolvePendingDecisions(page);

  // The strip reflects the live ledger without leaving the shell: one recorded
  // contract, named, under the same program of record.
  await expect(page.getByTestId("strip-ledger")).toContainText(/1 recorded/i);
  await expect(page.getByTestId("strip-ledger")).toContainText(/Cellar/i);
  await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", DIGEST);
});
