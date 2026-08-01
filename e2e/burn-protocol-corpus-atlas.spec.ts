import { expect, test, type Download, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { resolvePendingDecisions } from "./helpers";

const FIXTURE_DIR = process.env["BURN_CORPUS_ATLAS_FIXTURE_DIR"];
const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];

const custodyFiles = [
  "burn-protocol-handoff-publication-overlay.json",
  "handoff-publication-activation-receipt.json",
  "corpus-asset-index.json",
];

const indexedPaths = [
  "assets/E12-C2-P20.png",
  "assets/E12-C3-P01.png",
  "assets/E12-C3-P02.png",
  "assets/E12-C3-PLATE-01.png",
  "assets/EP13/CH1/PANEL-01.png",
  "evidence/contact-sheet.png",
];

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
}

async function finishEntryTransition(page: Page): Promise<void> {
  const transition = page.getByTestId("cartridge-enter-transition");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) break;
    if (await page.getByTestId("engine-shell").isVisible().catch(() => false)) return;
    const skip = transition.getByRole("button", { name: /skip entry/i });
    if (await skip.isVisible().catch(() => false)) {
      await Promise.race([
        skip.click({ timeout: 250 }).catch(() => undefined),
        transition.waitFor({ state: "hidden", timeout: 250 }).catch(() => undefined),
      ]);
    }
    await page.waitForTimeout(25);
  }
  if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) {
    await resolvePendingDecisions(page);
  }
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function enterBurn(page: Page): Promise<void> {
  await page.getByTestId("play-cartridge-burn-protocol-disclosure-probe").click();
  await finishEntryTransition(page);
  await resolvePendingDecisions(page);
}

async function exportRun(page: Page, destination: string): Promise<Record<string, unknown>> {
  const exportButton = page.getByRole("button", { name: /export run/i });
  if (!(await exportButton.isVisible().catch(() => false))) {
    await page.getByTestId("cartridge-object-button").click();
  }
  await expect(exportButton).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await exportButton.click();
  const download: Download = await downloadPromise;
  await download.saveAs(destination);
  await page.getByRole("button", { name: /resume/i }).click();
  return JSON.parse(fs.readFileSync(destination, "utf8")) as Record<string, unknown>;
}

function durableRunState(run: Record<string, unknown>): unknown {
  const engine = run["engine"] as { game?: string };
  const game = JSON.parse(engine.game ?? "{}") as Record<string, unknown>;
  delete game["savedAt"];
  return {
    authoredArcDigest: run["authoredArcDigest"],
    game,
    extensions: run["extensions"],
  };
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
}

test.describe("Burn Protocol manifest-derived corpus atlas", () => {
  test.skip(!FIXTURE_DIR || !ARC_PATH, "Requires the exact Burn Arc and atlas fixture.");

  test("maps indexed episodes and chapters while previewing only a byte-verified panel", async ({ page }, testInfo) => {
    const root = path.resolve(FIXTURE_DIR!);
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if ((url.protocol === "http:" || url.protocol === "https:")
          && !["127.0.0.1", "localhost"].includes(url.hostname)) {
        externalRequests.push(request.url());
      }
    });

    await coldBay(page);
    await page.getByTestId("open-cartridge").setInputFiles(path.resolve(ARC_PATH!));
    await expect(page.getByTestId("import-success")).toContainText("The Burn Protocol: Disclosure and Repair");
    await enterBurn(page);
    const before = await exportRun(page, testInfo.outputPath(`before-atlas-${testInfo.project.name}.run.json`));

    await page.getByTestId("cartridge-object-button").click();
    await page.getByTestId("open-external-corpus").click();
    await expect(page.getByTestId("rodoh-surface-overlay")).toBeVisible();
    await expect(page.getByTestId("engine-shell")).toHaveCount(1);

    await page.getByTestId("external-custody-input").setInputFiles(
      custodyFiles.map((name) => path.join(root, name)),
    );
    await expect(page.getByTestId("external-custody-preflight")).toHaveAttribute("data-standing", "mechanism-fixture");
    await expect(page.getByTestId("external-custody-preflight")).toHaveAttribute("data-assets", "6");
    await page.getByTestId("external-assets-input").setInputFiles(
      path.join(root, "assets", "E12-C3-P01.png"),
    );
    const receiverSession = page.getByTestId("external-asset-session");
    await expect(receiverSession).toHaveAttribute("data-verified", "1");
    await expect(receiverSession).toHaveAttribute("data-total", "6");
    await expect(receiverSession).toHaveAttribute("data-complete", "false");

    await page.getByTestId("external-assets-return-bay").click();
    await expect(page.getByTestId("rodoh-surface-overlay")).toHaveCount(0);
    await expect(page.getByTestId("engine-shell")).toBeVisible();
    await page.getByTestId("live-external-evidence-button").click();
    const drawer = page.getByTestId("live-external-evidence-drawer");
    await expect(drawer).toHaveAttribute("data-standing", "mechanism-fixture");
    await page.getByTestId("live-evidence-mode-atlas").click();
    await expect(drawer).toHaveAttribute("data-mode", "atlas");

    const atlas = page.getByTestId("burn-corpus-atlas");
    await expect(atlas).toHaveAttribute("data-indexed", "6");
    await expect(atlas).toHaveAttribute("data-verified", "1");
    await expect(atlas).toHaveAttribute("data-episodes", "2");
    await expect(atlas).toHaveAttribute("data-chapters", "3");
    await expect(atlas).toHaveAttribute("data-unlocated", "1");
    await expect(page.getByTestId("burn-atlas-chapter-12-2")).toBeVisible();
    await expect(page.getByTestId("burn-atlas-chapter-12-3")).toHaveAttribute("data-indexed", "3");
    await expect(page.getByTestId("burn-atlas-chapter-12-3")).toHaveAttribute("data-verified", "1");

    const verifiedEntry = page.getByTestId("burn-atlas-entry").filter({ has: page.locator('[data-path="assets/E12-C3-P01.png"]') });
    const exactEntry = page.getByTestId("burn-atlas-entry").locator('xpath=.', { hasText: "assets/E12-C3-P01.png" });
    void verifiedEntry;
    await expect(exactEntry).toHaveAttribute("data-verified", "true");
    await exactEntry.click();
    const image = page.getByTestId("burn-atlas-preview-image");
    await expect(image).toBeVisible();
    await expect.poll(async () => image.evaluate((node) => {
      const element = node as HTMLImageElement;
      return { complete: element.complete, width: element.naturalWidth, height: element.naturalHeight };
    })).toEqual({ complete: true, width: 1, height: 1 });

    await page.getByTestId("burn-atlas-episode-13").click();
    await expect(page.getByTestId("burn-atlas-chapter-13-1")).toBeVisible();
    await expect(page.getByTestId("burn-atlas-unlocated")).toHaveAttribute("data-count", "1");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`burn-corpus-atlas-${testInfo.project.name}.png`), fullPage: true });

    await page.getByTestId("close-live-external-evidence").click();
    await expect(drawer).toHaveCount(0);
    const after = await exportRun(page, testInfo.outputPath(`after-atlas-${testInfo.project.name}.run.json`));
    expect(durableRunState(after)).toEqual(durableRunState(before));
    const exportedText = JSON.stringify(after);
    for (const assetPath of indexedPaths) expect(exportedText).not.toContain(assetPath);
    expect(exportedText).not.toContain("blob:");
    expect(exportedText).not.toContain("burn-protocol-corpus-asset-index/1");

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterBurn(page);
    await expect(page.getByTestId("live-external-evidence-button")).toHaveCount(0);
    expect(externalRequests).toEqual([]);
  });
});
