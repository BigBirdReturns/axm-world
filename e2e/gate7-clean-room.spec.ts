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

async function assignParty(page: Page, challengeId: string): Promise<void> {
  await openMobileContractSheet(page);
  const desired = new Set(PARTY[challengeId] ?? []);
  for (const founder of ALL) {
    const button = page.getByTestId(`party-toggle-${founder}`);
    if (!await button.isVisible().catch(() => false)) continue;
    const pressed = await button.getAttribute("aria-pressed");
    const should = desired.has(founder);
    if ((pressed === "true") !== should) await button.click();
  }
}

async function completeCurrentChallenge(page: Page): Promise<void> {
  await resolvePendingDecisions(page);
  await chooseRepresentation(page, "representation-world-map", "world-map");
  const challengeId = await enterAvailableMapNode(page);
  await assignParty(page, challengeId);
  const commit = page.getByTestId("commit-encounter");
  await expect(commit).toBeEnabled();
  await commit.click();
  await expect(page.getByTestId("leave-encounter")).toBeVisible();
  await page.getByTestId("leave-encounter").click();
  await resolvePendingDecisions(page);
}

async function completeCampaign(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await page.getByText("All available work is complete").isVisible().catch(() => false)) return;
    await completeCurrentChallenge(page);
  }
  await expect(page.getByText("All available work is complete")).toBeVisible();
}

async function expectRecordedMapNodes(page: Page): Promise<void> {
  const count = await page.locator('[data-testid^="wm-enter-"]').count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(page.locator('[data-testid^="wm-enter-"]').nth(index)).toBeDisabled();
  }
}

async function assertMissionSurfaces(page: Page): Promise<void> {
  await expect(page.getByTestId("challenge-title")).toContainText("Brackish Well Survey");
  await expect(page.getByTestId("recommendation-heading")).toHaveText("Keepers' Counsel");

  await chooseRepresentation(page, "representation-map", "map-view");
  await expect(page.getByText("Orchard Waterworks")).toBeVisible();
  await expect(page.getByText("Stone sluice grid")).toBeVisible();

  await chooseRepresentation(page, "representation-hall", "hall-view");
  await expect(page.getByText("Seasonal Orchard Hall")).toBeVisible();
  await expect(page.getByText("Moss-dark wall anchors")).toBeVisible();

  await chooseRepresentation(page, "representation-aperture", "aperture-view");
  await expect(page.getByText("Orchard Aperture")).toBeVisible();
  await expect(page.getByText("Tideglass Survey Rig")).toBeVisible();

  await chooseRepresentation(page, "representation-globe", "globe-view");
  await expect(page.getByText("Low-Tide Waterworks")).toBeVisible();
  await expect(page.getByText("Visible Pressure")).toBeVisible();

  await chooseRepresentation(page, "representation-underworld", "underworld-view");
  await expect(page.getByText("Cistern Undercroft")).toBeVisible();
  await expect(page.getByText("Drowned archive niches")).toBeVisible();

  await chooseRepresentation(page, "representation-world-map", "world-map");
  await expect(page.getByText("The long coast where orchards root below the tide line.")).toBeVisible();
  await expect(page.getByText("Littoral Orchard")).toBeVisible();
}

test("unbundled clean-room cartridge completes import, play, export, resume, and late-game reachability", async ({ page }) => {
  test.setTimeout(90_000);
  await coldBay(page);
  await importFile(page, MALFORMED);
  await expect(page.getByTestId("cartridge-error")).toContainText("could not be parsed");
  await importFile(page, SOURCE);
  await expect(page.getByTestId("imported-section")).toBeVisible();
  await expect(page.getByTestId("cartridge-trust-orchard-at-low-tide")).toHaveText("holder-owned");
  await expect(page.getByTestId("cartridge-identity-orchard-at-low-tide")).toHaveText(MANIFEST.cartridgeDigest);
  await expect(page.getByTestId("cartridge-identity-first-charter")).not.toHaveText(MANIFEST.cartridgeDigest);
  await enterOrchard(page);
  await assertMissionSurfaces(page);

  await completeCurrentChallenge(page);
  await chooseRepresentation(page, "representation-world-map", "world-map");
  await expectRecordedMapNodes(page);
  const enteredBeforeExport = await page.locator('[data-testid^="wm-enter-"]:visible').count();
  expect(enteredBeforeExport).toBeGreaterThan(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("export-run").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("orchard-at-low-tide-run.json");
  const exported = JSON.parse(await fs.promises.readFile(await download.path(), "utf8")) as {
    format: string;
    cartridgeDigest: string;
    integrity: { algorithm: string; digest: string };
  };
  expect(exported.format).toBe("axm-cartridge-run/v3");
  expect(exported.cartridgeDigest).toBe(MANIFEST.cartridgeDigest);
  expect(exported.integrity.algorithm).toBe("sha256");
  expect(exported.integrity.digest).toMatch(/^[a-f0-9]{64}$/);

  await coldBay(page);
  await page.getByTestId("clear-imported-cartridges").click();
  await expect(page.getByTestId("imported-section")).toHaveCount(0);
  await page.getByTestId("open-run").setInputFiles(await download.path());
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);
  await expect(page.getByTestId("program-kicker")).toHaveText("OUTSIDER RELEASE / TIDEKEEPERS");
  await expect(page.getByTestId("export-run")).toBeVisible();
  await chooseRepresentation(page, "representation-world-map", "world-map");
  await expectRecordedMapNodes(page);
  const enteredAfterResume = await page.locator('[data-testid^="wm-enter-"]:visible').count();
  expect(enteredAfterResume).toBeGreaterThan(0);

  await completeCampaign(page);
});

test("clean-room custody preserves unknown memory and extensions across stored and portable round trips", async ({ page }) => {
  await coldBay(page);
  await importFile(page, SOURCE);
  await enterOrchard(page);

  const extensionRoundTrip = await page.evaluate(() => {
    const key = "axm-world:imported-cartridges:v1";
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error("No imported cartridge storage found.");
    const rows = JSON.parse(raw) as Array<Record<string, unknown>>;
    const cartridge = rows.find((row) => row.id === "orchard-at-low-tide");
    if (!cartridge) throw new Error("Orchard import not found.");
    cartridge.extensions = {
      ...(cartridge.extensions as Record<string, unknown> | undefined),
      "future.clean-room": { tier: 9, note: "preserve me" },
    };
    localStorage.setItem(key, JSON.stringify(rows));
    return cartridge.extensions;
  });
  expect(extensionRoundTrip).toMatchObject({ "future.clean-room": { tier: 9, note: "preserve me" } });

  await page.reload();
  await page.getByTestId("play-cartridge-orchard-at-low-tide").click();
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);
  const persisted = await page.evaluate(() => {
    const raw = localStorage.getItem("axm-world:imported-cartridges:v1");
    return raw ? JSON.parse(raw) : null;
  }) as Array<{ id: string; extensions?: Record<string, unknown> }>;
  expect(persisted.find((row) => row.id === "orchard-at-low-tide")?.extensions).toMatchObject({
    "future.clean-room": { tier: 9, note: "preserve me" },
  });

  await page.evaluate(() => {
    localStorage.setItem("future-holder-extension:v1", JSON.stringify({ keep: "byte-for-byte" }));
  });
  const estateDownload = page.waitForEvent("download");
  await page.getByTestId("export-holder-estate").click();
  const estate = await estateDownload;
  const estatePath = await estate.path();
  expect(estatePath).toBeTruthy();
  await page.evaluate(() => localStorage.clear());
  await page.getByTestId("import-holder-estate").setInputFiles(estatePath!);
  await expect(page.getByTestId("holder-estate-preflight")).toBeVisible();
  await page.getByTestId("holder-estate-mode-replace").check();
  await page.getByTestId("holder-estate-confirm").click();
  await expect(page.getByTestId("holder-estate-result")).toHaveText("Holder estate restored exactly.");
  expect(await page.evaluate(() => localStorage.getItem("future-holder-extension:v1"))).toBe(JSON.stringify({ keep: "byte-for-byte" }));
});

test("changed-content run is refused and source identity stays outside bundled Program of Record", async ({ page }) => {
  await coldBay(page);
  await page.getByTestId("open-run").setInputFiles(CHANGED_RUN);
  await expect(page.getByTestId("cartridge-error")).toContainText("integrity check failed");

  await importFile(page, SOURCE);
  await expect(page.getByTestId("cartridge-identity-orchard-at-low-tide")).toHaveText(MANIFEST.cartridgeDigest);
  await expect(page.getByTestId("cartridge-identity-orchard-at-low-tide")).not.toHaveText(MANIFEST.runIntegrityDigest);
  await expect(page.getByTestId("program-orchard-at-low-tide")).toHaveCount(0);
  await expect(page.getByTestId("program-001")).toHaveCount(1);
  await expect(page.getByTestId("program-005")).toHaveCount(1);
  await expect(page.getByTestId("program-006")).toHaveCount(0);
});
