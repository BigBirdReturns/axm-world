import { test, expect } from "@playwright/test";
import { enterCartridge, runSelectedContract, resolvePendingDecisions } from "./helpers";
import { PROGRAM_001 } from "../src/world/program-of-record";

// In-shell identity continuity receipt: desktop keeps the program-of-record strip
// legible throughout play, while mobile deliberately spends that vertical budget on
// its governed one-panel turn flow. The underlying identity remains available in the
// bay and cartridge object on both breakpoints.

const DIGEST = PROGRAM_001.authoredArcDigest;

test("the program identity strip is desktop-only and carries Program 001's computed identity", async ({ page }, testInfo) => {
  await enterCartridge(page);

  const strip = page.getByTestId("program-identity-strip");
  if (testInfo.project.name === "mobile") {
    await expect(strip).toHaveCount(0);
    return;
  }

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

test("the desktop strip ledger updates after a resolved contract without appearing on mobile", async ({ page }, testInfo) => {
  test.slow();
  await enterCartridge(page);

  // Resolve the cold-start contract ("The Cellar") and clear any post-run decision.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  await runSelectedContract(page);
  await resolvePendingDecisions(page);
  await page.getByTestId("enter-rodoh-runtime").click();

  if (testInfo.project.name === "mobile") {
    await expect(page.getByTestId("program-identity-strip")).toHaveCount(0);
    return;
  }

  // The strip reflects the live ledger after the explicit guided-to-shell handoff: one
  // recorded contract, named, under the same program of record.
  await expect(page.getByTestId("strip-ledger")).toContainText(/1 recorded/i);
  await expect(page.getByTestId("strip-ledger")).toContainText(/Cellar/i);
  await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", DIGEST);
});
