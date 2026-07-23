import { test, expect } from "@playwright/test";
import { enterShellRuntime, runSelectedContract, resolvePendingDecisions } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// In-shell identity continuity receipt: once the player is INSIDE the loop (past
// the boot plaque), the shell keeps reading as a RODOH-loaded program of record —
// RODOH, PROGRAM 001, The First Charter, the computed authored digest, and a live
// ledger summary — and that summary updates after a resolved contract. The strip
// is desktop chrome; mobile carries the same state through its staged flow.
//
// Authored receipt: `npm run test:e2e`, intentionally NOT CI-gated. The
// underlying data/formatting logic (summarizeLedger, programForCartridge) is
// covered by vitest.

const DIGEST = PROGRAM_001.authoredArcDigest;

test("in-shell strip presents Program 001 as a program of record with its computed identity", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "identity strip is desktop-only");
  test.slow();
  await enterShellRuntime(page);

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

  // Entering the shell completes the guided First Charter contract, so the live
  // ledger already carries The Cellar as its first recorded memory.
  await expect(page.getByTestId("strip-ledger")).toContainText(/1 recorded/i);
  await expect(page.getByTestId("strip-ledger")).toContainText(/Cellar/i);
});

test("the in-shell ledger summary updates after a resolved contract", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "identity strip is desktop-only");
  test.slow();
  await enterShellRuntime(page);

  await expect(page.getByTestId("strip-ledger")).toContainText(/1 recorded/i);
  await expect(page.getByTestId("strip-ledger")).toContainText(/Cellar/i);

  // Resolve the next contract ("The Bridge Troll") and clear any post-run decision.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Bridge Troll/i);
  await runSelectedContract(page);
  await resolvePendingDecisions(page);

  // The strip reflects the live ledger without leaving the shell: two recorded
  // contracts, with the newest named under the same program of record.
  await expect(page.getByTestId("strip-ledger")).toContainText(/2 recorded/i);
  await expect(page.getByTestId("strip-ledger")).toContainText(/Bridge Troll/i);
  await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", DIGEST);
});
