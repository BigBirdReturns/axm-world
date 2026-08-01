import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const FIXTURE_DIR = process.env["BURN_EXTERNAL_ASSET_FIXTURE_DIR"];

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

test.describe("Burn Protocol holder-controlled external asset receiver", () => {
  test.skip(!FIXTURE_DIR, "Requires the content-bound external asset fixture.");

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
    expect(externalRequests).toEqual([]);
  });
});
