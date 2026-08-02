import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { resolvePendingDecisions } from "./helpers";

const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];
const FIXTURE_DIR = process.env["BURN_PROTOCOL_HOLDER_ASSET_FIXTURE_DIR"];
const TAMPER_DIR = process.env["BURN_PROTOCOL_HOLDER_ASSET_TAMPER_DIR"];

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
  await expect(page.getByTestId("engine-shell")).toBeVisible();
}

async function importBurn(page: Page): Promise<void> {
  await page.getByTestId("open-cartridge").setInputFiles(path.resolve(ARC_PATH!));
  await expect(page.getByTestId("import-success")).toContainText("The Burn Protocol: Disclosure and Repair");
}

async function mountFolder(page: Page, folder: string): Promise<void> {
  await page.getByTestId("external-asset-dock-button").click();
  await page.getByTestId("open-external-asset-folder").setInputFiles(path.resolve(folder));
}

async function exportRun(page: Page, destination: string): Promise<string> {
  await page.getByRole("button", { name: "Close external evidence" }).click();
  await page.getByTestId("cartridge-object-button").click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export run/i }).click();
  await (await downloadPromise).saveAs(destination);
  return fs.readFileSync(destination, "utf8");
}

test.describe("Burn Protocol holder-controlled external asset receiver", () => {
  test.skip(!ARC_PATH || !FIXTURE_DIR || !TAMPER_DIR, "Requires the exact Arc publication and generated holder fixture.");
  test.describe.configure({ mode: "serial" });

  test("verifies, renders, excludes from export, and forgets holder evidence on reload", async ({ page }, testInfo) => {
    test.slow();
    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (!["127.0.0.1", "localhost"].includes(url.hostname)) external.push(request.url());
    });

    await coldBay(page);
    await importBurn(page);
    await enterBurn(page);
    await expect(page.locator("html")).not.toHaveAttribute("data-cartridge", /.+/);

    await mountFolder(page, FIXTURE_DIR!);
    const mounted = page.getByTestId("external-asset-mounted");
    await expect(mounted).toBeVisible();
    await expect(mounted).toHaveAttribute("data-evidence-tier", "mechanism-fixture");
    await expect(mounted).toContainText("1 of 1 indexed assets verified for this session");
    const preview = page.getByTestId("external-asset-preview");
    await expect(preview).toBeVisible();
    await expect.poll(async () => preview.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath(`burn-holder-asset-mounted-${testInfo.project.name}.png`), fullPage: true });

    const storage = await page.evaluate(() => Object.values(localStorage).join("\n"));
    expect(storage).not.toContain("burn-protocol-handoff-publication-overlay/1");
    expect(storage).not.toContain("assets/E12-C3-P01.svg");

    const exportedPath = testInfo.outputPath(`burn-holder-assets-${testInfo.project.name}.run.json`);
    const exported = await exportRun(page, exportedPath);
    expect(exported).not.toContain("burn-protocol-handoff-publication-overlay/1");
    expect(exported).not.toContain("assets/E12-C3-P01.svg");
    expect(exported).not.toContain("mechanism-fixture-external-custody");

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterBurn(page);
    await page.getByTestId("external-asset-dock-button").click();
    await expect(page.getByTestId("external-asset-idle")).toBeVisible();
    await expect(page.getByTestId("external-asset-mounted")).toHaveCount(0);
    expect(external).toEqual([]);
  });

  test("refuses a selected asset changed after the custody chain was issued", async ({ page }, testInfo) => {
    await coldBay(page);
    await importBurn(page);
    await enterBurn(page);
    await mountFolder(page, TAMPER_DIR!);
    await expect(page.getByTestId("external-asset-errors")).toBeVisible();
    await expect(page.getByTestId("external-asset-errors")).toContainText(/bytes|SHA-256/);
    await expect(page.getByTestId("external-asset-preview")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`burn-holder-asset-refused-${testInfo.project.name}.png`), fullPage: true });
  });
});
