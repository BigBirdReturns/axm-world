import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { resolvePendingDecisions } from "./helpers";

const FIXTURE_DIR = process.env["BURN_EXTERNAL_ASSET_FIXTURE_DIR"];
const ARC_PATH = process.env["BURN_PROTOCOL_ARC_PATH"];
const EXTERNAL_ASSET_JSON_MAX_BYTES = 16 * 1024 * 1024;

const custodyFiles = [
  "burn-protocol-handoff-publication-overlay.json",
  "handoff-publication-activation-receipt.json",
  "corpus-asset-index.json",
];

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual(expect.objectContaining({
    clientWidth: expect.any(Number),
    scrollWidth: expect.any(Number),
  }));
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
}

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

test.describe("Burn Protocol holder-controlled external asset receiver", () => {
  test.skip(!FIXTURE_DIR || !ARC_PATH, "Requires the exact Arc publication and content-bound external asset fixture.");

  test("opens the receiver from the exact live Burn cartridge object", async ({ page }) => {
    await coldBay(page);
    await page.getByTestId("open-cartridge").setInputFiles(path.resolve(ARC_PATH!));
    await expect(page.getByTestId("import-success")).toContainText("The Burn Protocol: Disclosure and Repair");
    await page.getByTestId("play-cartridge-burn-protocol-disclosure-probe").click();
    await finishEntryTransition(page);
    await resolvePendingDecisions(page);
    await page.getByTestId("cartridge-object-button").click();
    const open = page.getByTestId("open-external-corpus");
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/surface=burn-assets/);
    await expect(page.getByTestId("burn-external-asset-receiver")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("binds custody, verifies one raster, renders it, refuses tampering, and forgets bytes on reload", async ({ page }, testInfo) => {
    const root = path.resolve(FIXTURE_DIR!);
    const externalRequests: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if ((url.protocol === "http:" || url.protocol === "https:")
          && !["127.0.0.1", "localhost"].includes(url.hostname)) {
        externalRequests.push(request.url());
      }
    });

    await page.goto("/axm-world/game/?surface=burn-assets");
    await expect(page.getByTestId("burn-external-asset-receiver")).toBeVisible();
    await expect(page.getByText("The Burn Protocol corpus browser", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByTestId("external-custody-input").setInputFiles(
      custodyFiles.map((name) => path.join(root, name)),
    );
    const preflight = page.getByTestId("external-custody-preflight");
    await expect(preflight).toHaveAttribute("data-standing", "mechanism-fixture");
    await expect(preflight).toHaveAttribute("data-assets", "1");
    await expect(preflight.getByText(/cannot acquire production standing/i)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByTestId("external-assets-input").setInputFiles(
      path.join(root, "assets", "E12-C3-P01.png"),
    );
    const session = page.getByTestId("external-asset-session");
    await expect(session).toHaveAttribute("data-verified", "1");
    await expect(session).toHaveAttribute("data-total", "1");
    await expect(session).toHaveAttribute("data-complete", "true");
    const image = page.getByTestId("external-asset-image");
    await expect(image).toBeVisible();
    await expect.poll(async () => image.evaluate((node) => {
      const element = node as HTMLImageElement;
      return { complete: element.complete, width: element.naturalWidth, height: element.naturalHeight };
    })).toEqual({ complete: true, width: 1, height: 1 });
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`burn-external-asset-verified-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("release-external-assets").click();
    await expect(page.getByTestId("external-asset-session")).toHaveCount(0);
    await expect(page.getByTestId("external-assets-status")).toContainText(/No payload bytes were persisted/i);

    await page.getByTestId("external-assets-input").setInputFiles(
      path.join(root, "tampered", "E12-C3-P01.png"),
    );
    await expect(page.getByTestId("external-assets-errors")).toContainText(/SHA-256 does not match/i);
    await expect(page.getByTestId("external-asset-session")).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId("burn-external-asset-receiver")).toBeVisible();
    await expect(page.getByTestId("external-custody-preflight")).toHaveCount(0);
    await expect(page.getByTestId("external-asset-session")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByTestId("external-custody-input").setInputFiles({
      name: "oversized-custody.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(EXTERNAL_ASSET_JSON_MAX_BYTES + 1, 0x20),
    });
    await expect(page.getByTestId("external-assets-errors")).toContainText(/refused before reading/i);
    await expect(page.getByTestId("external-custody-preflight")).toHaveCount(0);

    await page.getByTestId("external-custody-input").setInputFiles({
      name: "unrelated-custody.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"format":"another-project-custody/1"}\n', "utf8"),
    });
    await expect(page.getByTestId("external-assets-errors")).toContainText(/unrelated custody format/i);
    await expect(page.getByTestId("external-custody-preflight")).toHaveCount(0);
    expect(externalRequests).toEqual([]);
  });
});
