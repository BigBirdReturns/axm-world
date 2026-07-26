import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openMobileContractSheet, resolvePendingDecisions } from "./helpers";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLEAN = path.join(ROOT, "cartridges", "clean-room");
const SOURCE = path.join(CLEAN, "orchard-at-low-tide.arc.json");
const MALFORMED = path.join(CLEAN, "orchard-at-low-tide.invalid.arc.json");
const CHANGED_RUN = path.join(CLEAN, "orchard-at-low-tide.changed.run.json");
const MANIFEST = JSON.parse(fs.readFileSync(path.join(CLEAN, "manifest.json"), "utf8")) as {
  cartridgeDigest: string;
  runIntegrityDigest: string;
};

const ALL = [
  "founder:sol-vey",
  "founder:tavi-reed",
  "founder:edda-loom",
  "founder:malk-ir",
  "founder:pera-moss",
  "founder:ruun-vale",
];

const PARTY: Record<string, string[]> = {
  "count-the-brackish-wells": ["founder:edda-loom", "founder:malk-ir", "founder:ruun-vale", "founder:sol-vey"],
  "negotiate-the-graft-exchange": ["founder:sol-vey", "founder:malk-ir", "founder:ruun-vale"],
  "dive-the-moon-cistern": ["founder:edda-loom", "founder:malk-ir", "founder:ruun-vale", "founder:sol-vey"],
  "replant-the-ninth-orchard": ["founder:sol-vey", "founder:edda-loom", "founder:ruun-vale", "founder:malk-ir"],
  "publish-the-next-season": ["founder:malk-ir", "founder:ruun-vale", "founder:sol-vey", "founder:edda-loom"],
};

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
}

async function importFile(page: Page, file: string): Promise<void> {
  await page.getByTestId("open-cartridge").setInputFiles(file);
}

async function finishEntryTransition(page: Page): Promise<void> {
  const transition = page.getByTestId("cartridge-enter-transition");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) break;
    if (await page.getByTestId("engine-shell").isVisible().catch(() => false)) return;
    const skip = transition.getByRole("button", { name: /skip entry/i });
    if (await skip.isVisible().catch(() => false)) {
      // Visibility is a snapshot. The entry transition may self-complete and
      // detach this button before the click is dispatched. Race one bounded
      // click against transition disappearance; the terminal shell assertion
      // below still fails honestly if neither route reaches playable state.
      await Promise.race([
        skip.click({ timeout: 250 }).catch(() => undefined),
        transition.waitFor({ state: "hidden", timeout: 250 }).catch(() => undefined),
      ]);
    }
    await page.waitForTimeout(25);
  }
  if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) {
    // A fresh cartridge has one opening decision. A restored run may expose that
    // decision followed immediately by queued authored drama. Drain the bounded
    // decision surface instead of asserting that exactly one card existed.
    await resolvePendingDecisions(page);
  }
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function enterOrchard(page: Page): Promise<void> {
  await page.getByTestId("play-cartridge-orchard-at-low-tide").click();
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);
}

/** Choosing a representation updates the underlying Board surface. Mobile may
 * still be presenting a governed Contract or Party sheet above that surface, so
 * leave those sheets through their real Back control before asserting the view. */
async function chooseRepresentation(page: Page, control: string, surface: string): Promise<void> {
  await page.getByTestId(control).click();
  const target = page.getByTestId(surface);
  const back = page.getByTestId("mobile-step-back");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await target.isVisible().catch(() => false)) return;
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await page.waitForTimeout(25);
      continue;
    }
    await page.waitForTimeout(50);
  }
  await expect(target).toBeVisible({ timeout: 15_000 });
}

async function enterAvailableMapNode(page: Page): Promise<string> {
  const button = page.locator('[data-testid^="wm-enter-"]:visible').first();
  await expect(button).toBeVisible();
  const testId = await button.getAttribute("data-testid");
  expect(testId).toBeTruthy();
  await button.click();
  return testId!.replace("wm-enter-", "");
}
