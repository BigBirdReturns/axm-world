import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveOpeningDecision, resolvePendingDecisions } from "./helpers";

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
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.waitForTimeout(25);
  }
  if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) {
    await resolveOpeningDecision(page);
  }
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function enterOrchard(page: Page): Promise<void> {
  await page.getByTestId("play-cartridge-orchard-at-low-tide").click();
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);
}

async function enterAvailableMapNode(page: Page): Promise<string> {
  const button = page.locator('[data-testid^="wm-enter-"]:visible').first();
  await expect(button).toBeVisible();
  const testId = await button.getAttribute("data-testid");
  expect(testId).toBeTruthy();
  await button.click();
  return testId!.replace("wm-enter-", "");
}

async function setExactParty(page: Page, desired: string[]): Promise<void> {
  const desiredSet = new Set(desired);
  const inRoom = page.getByTestId("encs-in-room");
  const reserve = page.getByTestId("encs-reserve");

  for (const id of ALL) {
    const button = inRoom.getByTestId(`encs-token-${id}`);
    if (!desiredSet.has(id) && await button.count()) await button.click();
  }
  for (const id of desired) {
    const button = reserve.getByTestId(`encs-token-${id}`);
    if (await button.count()) await button.click();
  }

  await expect(inRoom.locator('[data-testid^="encs-token-"]')).toHaveCount(desired.length);
  for (const id of desired) await expect(inRoom.getByTestId(`encs-token-${id}`)).toBeVisible();
}

async function completeChallenge(page: Page, expectedId: string, spend: "none" | "max"): Promise<void> {
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  const entered = await enterAvailableMapNode(page);
  expect(entered).toBe(expectedId);
  await expect(page.getByTestId("encounter-shell")).toBeVisible();

  await setExactParty(page, PARTY[expectedId]!);
  await expect(page.getByTestId("encs-projection")).toHaveAttribute("data-projected", "success");

  const spendPanel = page.getByTestId("encs-spend");
  if (await spendPanel.count()) {
    if (spend === "max") {
      const plus = page.getByTestId("encs-spend-inc");
      while (await plus.isEnabled()) await plus.click();
      await expect(page.getByTestId("encs-spend-count")).not.toHaveText("0");
    } else {
      await expect(page.getByTestId("encs-spend-count")).toHaveText("0");
    }
  }

  const commit = page.getByTestId("commit-plan");
  if (await commit.isVisible().catch(() => false)) await commit.click();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toHaveAttribute("data-outcome", "success");
  const reward = page.getByTestId("reward-choice");
  if (await reward.count()) await reward.locator('[data-testid^="reward-candidate-"]').first().click();
  await page.getByTestId("encs-leave").click();
  await expect(page.getByTestId("encounter-shell")).toHaveCount(0);
  await resolvePendingDecisions(page);
}

async function exportRun(page: Page, destination: string): Promise<Record<string, unknown>> {
  await page.getByTestId("cartridge-object-button").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export run/i }).click();
  await (await downloadPromise).saveAs(destination);
  return JSON.parse(fs.readFileSync(destination, "utf8")) as Record<string, unknown>;
}

function firstPartyAssetUrls(run: string[]): string[] {
  return run.filter((url) => /first-charter|karazhan|waking-tower|ilyon|lamp-district|relief-circuit/i.test(url));
}

/** Prove unfamiliar authored role vocabulary on the roster surface that owns it.
 * Hall is a representation of the same run, but it is not required to duplicate
 * the roster's role badges. Under full-suite load some agents are compact rows;
 * expand those rows until the requested authored role is visible. */
async function expectAuthoredRole(page: Page, role: string): Promise<void> {
  const matchingCard = () => page.getByTestId("roster-card").filter({ hasText: role }).first();
  if (await matchingCard().isVisible().catch(() => false)) return;

  const rows = page.getByTestId("roster-compact-row");
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    await row.scrollIntoViewIfNeeded();
    await row.click();
    if (await matchingCard().isVisible().catch(() => false)) return;
  }

  await expect(matchingCard(), `Expected authored role ${role} on a neutral roster card`).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test("unbundled clean-room cartridge completes, exports, and resumes through neutral Rodoh", async ({ page }, testInfo) => {
  test.slow();
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) external.push(request.url());
  });

  await coldBay(page);
  await importFile(page, SOURCE);
  await expect(page.getByTestId("import-success")).toContainText("The Orchard at Low Tide");
  await expect(page.getByTestId("bay-import-preflight-digest")).toHaveAttribute("title", MANIFEST.cartridgeDigest);

  const entry = page.getByTestId("cartridge-entry-orchard-at-low-tide");
  await expect(entry).toBeVisible();
  await expect(entry).not.toHaveAttribute("data-program-id", /.+/);
  await expect(entry.getByTestId("bay-digest")).toHaveAttribute("title", MANIFEST.cartridgeDigest);
  await expect(entry.getByTestId("trust-chip-imported-unsigned")).toBeVisible();
  await expect(entry).not.toContainText(/PROGRAM \d+/);

  await enterOrchard(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-cartridge", /.+/);
  await expect(page.getByText("Civic Credit", { exact: true })).toBeVisible();
  await expect(page.getByText("Rootstock", { exact: true })).toBeVisible();
  await expect(page.getByText("Lanterns", { exact: true })).toBeVisible();
  await expect(page.getByText("Season Standing", { exact: true })).toBeVisible();
  await expectAuthoredRole(page, "Graftwright");
  await expectAuthoredRole(page, "Tide Diver");

  const assetRequests: string[] = [];
  page.on("requestfinished", (request) => assetRequests.push(request.url()));
  await page.getByTestId("view-run-graph").click();
  await expect(page.getByTestId("contract-board")).toBeVisible();
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await page.getByTestId("view-hall").click();
  await expect(page.getByTestId("hall-scene")).toBeVisible();
  await page.getByTestId("view-aperture").click();
  await expect(page.getByTestId("rodoh-aperture")).toBeVisible();
  await page.getByTestId("view-planet").click();
  await expect(page.getByTestId("walkable-world")).toBeVisible({ timeout: 20_000 });
  expect(firstPartyAssetUrls(assetRequests)).toEqual([]);

  await completeChallenge(page, "count-the-brackish-wells", "none");
  await completeChallenge(page, "negotiate-the-graft-exchange", "max");
  await completeChallenge(page, "dive-the-moon-cistern", "max");
  await completeChallenge(page, "replant-the-ninth-orchard", "max");
  await completeChallenge(page, "publish-the-next-season", "max");

  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map").locator('[data-status="cleared"]')).toHaveCount(5);

  const exportedPath = testInfo.outputPath(`orchard-${testInfo.project.name}.run.json`);
  const exported = await exportRun(page, exportedPath);
  expect(exported["format"]).toBe("axm-cartridge-run/v3");
  expect(exported["authoredArcDigest"]).toBe(MANIFEST.cartridgeDigest);
  expect((exported["arc"] as { extensions?: Record<string, unknown> }).extensions?.["unfamiliar.garden-memory@7"]).toEqual({
    opaque: true,
    keeper: "an unaffiliated tool",
    values: ["silt-note", 17, { route: "moon-cistern", unparsed: ["x", "y"] }],
  });

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
  await importFile(page, exportedPath);
  await expect(page.getByTestId("import-success")).toContainText(/Exact run restored/i);
  const restoredEntry = page.getByTestId("cartridge-entry-orchard-at-low-tide");
  await expect(restoredEntry.getByTestId("bay-save-state")).toContainText(/Resumable/i);
  await enterOrchard(page);
  await page.getByTestId("view-map").click();
  await expect(page.getByTestId("world-map").locator('[data-status="cleared"]')).toHaveCount(5);
  expect(external).toEqual([]);
});

test("clean-room custody preserves unknown memory, refuses malformed source, and stays accessible", async ({ page }, testInfo) => {
  test.slow();
  await coldBay(page);
  await importFile(page, MALFORMED);
  await expect(page.getByTestId("import-errors")).toContainText(/minAgents|maxAgents|roster/i);
  await expect(page.getByTestId("cartridge-entry-orchard-at-low-tide-malformed")).toHaveCount(0);

  await importFile(page, CHANGED_RUN);
  await expect(page.getByTestId("import-success")).toContainText(/Exact run restored/i);
  const entry = page.getByTestId("cartridge-entry-orchard-at-low-tide");
  await expect(entry).not.toHaveAttribute("data-program-id", /.+/);
  const play = page.getByTestId("play-cartridge-orchard-at-low-tide");
  const box = await play.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await play.focus();
  await page.keyboard.press("Enter");
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);

  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await expect(page.getByTestId("engine-shell")).toBeVisible();
  await page.getByTestId("view-map").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("world-map")).toBeVisible();

  const reexportedPath = testInfo.outputPath(`orchard-prebuilt-${testInfo.project.name}.run.json`);
  const reexported = await exportRun(page, reexportedPath);
  expect((reexported["extensions"] as Record<string, unknown>)["holder.field-notes@1"]).toEqual({
    status: "changed-run",
    observations: ["the hidden wells entered the census", "the ninth field remains revisable"],
    arbitraryUnknown: { code: 71, nested: [true, "silt"] },
  });
  expect((reexported["arc"] as { extensions?: Record<string, unknown> }).extensions?.["unfamiliar.garden-memory@7"]).toEqual({
    opaque: true,
    keeper: "an unaffiliated tool",
    values: ["silt-note", 17, { route: "moon-cistern", unparsed: ["x", "y"] }],
  });
});
