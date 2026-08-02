import { expect, test, type Download, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { resolvePendingDecisions } from "./helpers";

const CORPUS_DIR = process.env["BURN_CORPUS_ATLAS_FIXTURE_DIR"];
const CROSSWALK_DIR = process.env["BURN_WORLD_CROSSWALK_FIXTURE_DIR"];
const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];

const custodyFiles = [
  "burn-protocol-handoff-publication-overlay.json",
  "handoff-publication-activation-receipt.json",
  "corpus-asset-index.json",
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

async function installCorpusSession(page: Page): Promise<void> {
  const corpusRoot = path.resolve(CORPUS_DIR!);
  await page.getByTestId("cartridge-object-button").click();
  await page.getByTestId("open-external-corpus").click();
  await expect(page.getByTestId("rodoh-surface-overlay")).toBeVisible();
  await expect(page.getByTestId("engine-shell")).toHaveCount(1);
  await page.getByTestId("external-custody-input").setInputFiles(
    custodyFiles.map((name) => path.join(corpusRoot, name)),
  );
  await expect(page.getByTestId("external-custody-preflight")).toHaveAttribute("data-assets", "6");
  await page.getByTestId("external-assets-input").setInputFiles(
    path.join(corpusRoot, "assets", "E12-C3-P01.png"),
  );
  await expect(page.getByTestId("external-asset-session")).toHaveAttribute("data-verified", "1");
  await page.getByTestId("external-assets-return-bay").click();
  await expect(page.getByTestId("rodoh-surface-overlay")).toHaveCount(0);
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function openCrosswalk(page: Page): Promise<void> {
  await page.getByTestId("live-external-evidence-button").click();
  await page.getByTestId("live-evidence-mode-crosswalk").click();
  await expect(page.getByTestId("live-external-evidence-drawer")).toHaveAttribute("data-mode", "crosswalk");
  await expect(page.getByTestId("open-burn-world-crosswalk")).toBeVisible();
}

test.describe("Burn Protocol explicit evidence-to-world crosswalk", () => {
  test.skip(!CORPUS_DIR || !CROSSWALK_DIR || !ARC_PATH, "Requires the exact Burn Arc, atlas fixture, and crosswalk fixture.");

  test("shows only explicit links and previews only a byte-verified linked asset", async ({ page }, testInfo) => {
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
    const before = await exportRun(page, testInfo.outputPath(`before-crosswalk-${testInfo.project.name}.run.json`));
    await installCorpusSession(page);
    await openCrosswalk(page);

    await page.getByTestId("burn-world-crosswalk-input").setInputFiles(
      path.join(path.resolve(CROSSWALK_DIR!), "burn-protocol-world-evidence-crosswalk.json"),
    );
    const crosswalk = page.getByTestId("burn-world-evidence-crosswalk");
    await expect(crosswalk).toHaveAttribute("data-status", "loaded");
    await expect(crosswalk).toHaveAttribute("data-links", "7");
    await expect(crosswalk).toHaveAttribute("data-linked-assets", "6");
    await expect(crosswalk).toHaveAttribute("data-linked-targets", "6");
    await expect(crosswalk).toHaveAttribute("data-verified-links", "2");

    await page.getByTestId("burn-world-crosswalk-kind-watch").click();
    const hearing = page.locator('[data-testid="burn-world-crosswalk-target"][data-target-id="open-the-six-repository-hearing"]');
    await expect(hearing).toBeVisible();
    await expect(hearing).toHaveAttribute("data-links", "2");
    const verifiedHearingLink = hearing.locator('[data-testid="burn-world-crosswalk-link"][data-link-id="fixture-link-hearing-record"]');
    await expect(verifiedHearingLink).toHaveAttribute("data-verified", "true");
    await verifiedHearingLink.click();
    const preview = page.getByTestId("burn-world-crosswalk-preview-image");
    await expect(preview).toBeVisible();
    await expect.poll(async () => preview.evaluate((node) => {
      const image = node as HTMLImageElement;
      return { complete: image.complete, width: image.naturalWidth, height: image.naturalHeight };
    })).toEqual({ complete: true, width: 1, height: 1 });

    await page.getByTestId("burn-world-crosswalk-kind-actor").click();
    const vance = page.locator('[data-testid="burn-world-crosswalk-target"][data-target-id="vance"]');
    await expect(vance).toContainText("Admiral Vance");
    await expect(vance.getByTestId("burn-world-crosswalk-link")).toHaveAttribute("data-verified", "true");

    await page.getByTestId("burn-world-crosswalk-kind-faction").click();
    const starfleet = page.locator('[data-testid="burn-world-crosswalk-target"][data-target-id="starfleet"]');
    await expect(starfleet).toContainText("Starfleet");
    const manifestOnly = starfleet.getByTestId("burn-world-crosswalk-link");
    await expect(manifestOnly).toHaveAttribute("data-verified", "false");
    await expect(manifestOnly).toBeDisabled();

    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`burn-world-evidence-crosswalk-${testInfo.project.name}.png`), fullPage: true });

    await page.getByTestId("close-live-external-evidence").click();
    const after = await exportRun(page, testInfo.outputPath(`after-crosswalk-${testInfo.project.name}.run.json`));
    expect(durableRunState(after)).toEqual(durableRunState(before));
    const exportedText = JSON.stringify(after);
    expect(exportedText).not.toContain("burn-protocol-world-evidence-crosswalk/1");
    expect(exportedText).not.toContain("fixture-link-hearing-record");
    expect(exportedText).not.toContain("explicit-read-only-cross-reference");
    expect(exportedText).not.toContain("blob:");

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterBurn(page);
    await expect(page.getByTestId("live-external-evidence-button")).toHaveCount(0);
    expect(externalRequests).toEqual([]);
  });

  test("refuses an internally valid crosswalk that names an invented authored target", async ({ page }, testInfo) => {
    await coldBay(page);
    await page.getByTestId("open-cartridge").setInputFiles(path.resolve(ARC_PATH!));
    await enterBurn(page);
    await installCorpusSession(page);
    await openCrosswalk(page);
    await page.getByTestId("burn-world-crosswalk-input").setInputFiles(
      path.join(path.resolve(CROSSWALK_DIR!), "burn-protocol-world-evidence-crosswalk-unknown-target.json"),
    );
    await expect(page.getByTestId("burn-world-crosswalk-error")).toContainText(/unknown authored target/);
    await expect(page.getByTestId("burn-world-evidence-crosswalk")).toHaveAttribute("data-status", "refused");
    await expect(page.getByTestId("burn-world-crosswalk-preview")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`burn-world-evidence-crosswalk-refused-${testInfo.project.name}.png`), fullPage: true });
  });
});
