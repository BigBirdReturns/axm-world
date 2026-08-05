import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHANGED_RUN = path.join(ROOT, "cartridges", "clean-room", "orchard-at-low-tide.changed.run.json");

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
  await expect(page.getByTestId("holder-estate-panel")).toBeVisible();
}

function recordMap(estate: { records: Array<{ key: string; value: string }> }): Record<string, string> {
  return Object.fromEntries(estate.records.map((record) => [record.key, record.value]));
}

test("the holder exports and transactionally restores the complete Rodoh browser estate", async ({ page }, testInfo) => {
  test.slow();
  await coldBay(page);

  await page.getByTestId("open-cartridge").setInputFiles(CHANGED_RUN);
  await expect(page.getByTestId("import-success")).toContainText(/Exact run restored/i);
  await expect(page.getByTestId("cartridge-entry-orchard-at-low-tide").getByTestId("bay-save-state")).toContainText(/Resumable/i);

  await page.evaluate(() => {
    localStorage.setItem("axm-world:locale:v1", "zh-Hant");
    localStorage.setItem("axm-world:sensory:v1", JSON.stringify({ sound: false, reducedMotion: true }));
    localStorage.setItem("axm-world:future-memory@9", JSON.stringify({ opaque: [1, "x"], owner: "holder" }));
  });

  const firstDownload = page.waitForEvent("download");
  await page.getByTestId("export-holder-estate").click();
  const firstPath = testInfo.outputPath(`holder-estate-${testInfo.project.name}.json`);
  await (await firstDownload).saveAs(firstPath);
  const first = JSON.parse(fs.readFileSync(firstPath, "utf8")) as {
    format: string;
    records: Array<{ key: string; value: string }>;
    integrity: { digest: string };
  };
  expect(first.format).toBe("rodoh-holder-estate/v1");
  expect(first.integrity.digest).toMatch(/^estate1_[0-9a-f]{64}$/);
  const before = recordMap(first);
  expect(before["axm-world:locale:v1"]).toBe("zh-Hant");
  expect(before["axm-world:future-memory@9"]).toBe(JSON.stringify({ opaque: [1, "x"], owner: "holder" }));
  expect(Object.keys(before).some((key) => key.startsWith("axm-world:save:v1:cart1_"))).toBe(true);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
  await expect(page.getByTestId("cartridge-entry-orchard-at-low-tide")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("axm-world:stale-holder-state@1", "remove-only-under-replace"));

  await page.getByTestId("holder-estate-input").setInputFiles(firstPath);
  await expect(page.getByTestId("holder-estate-preflight")).toBeVisible();
  const mergePreflight = page.getByTestId("holder-estate-merge-preflight");
  const replacePreflight = page.getByTestId("holder-estate-replace-preflight");
  await expect(mergePreflight).toBeVisible();
  await expect(replacePreflight).toBeVisible();
  await expect(mergePreflight).toHaveAttribute("data-remove", "0");
  await expect(replacePreflight).toHaveAttribute("data-remove", "1");
  await expect(page.getByTestId("holder-estate-preflight")).toContainText(/records|記錄/i);
  await page.getByTestId("holder-estate-replace").click();

  await expect.poll(async () => page.evaluate(() => localStorage.getItem("axm-world:locale:v1")), { timeout: 15_000 }).toBe("zh-Hant");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("axm-world:stale-holder-state@1")), { timeout: 15_000 }).toBeNull();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible({ timeout: 15_000 });
  const orchard = page.getByTestId("cartridge-entry-orchard-at-low-tide");
  await expect(orchard).toBeVisible();
  await expect(orchard.getByTestId("bay-save-state")).toContainText(/Resumable|可繼續/i);
  expect(await page.evaluate(() => localStorage.getItem("axm-world:future-memory@9"))).toBe(JSON.stringify({ opaque: [1, "x"], owner: "holder" }));

  const secondDownload = page.waitForEvent("download");
  await page.getByTestId("export-holder-estate").click();
  const secondPath = testInfo.outputPath(`holder-estate-restored-${testInfo.project.name}.json`);
  await (await secondDownload).saveAs(secondPath);
  const second = JSON.parse(fs.readFileSync(secondPath, "utf8")) as { records: Array<{ key: string; value: string }> };
  expect(recordMap(second)).toEqual(before);
});

test("tampered holder estates are refused before changing the shelf", async ({ page }, testInfo) => {
  await coldBay(page);
  const exportDownload = page.waitForEvent("download");
  await page.getByTestId("export-holder-estate").click();
  const sourcePath = testInfo.outputPath(`holder-estate-source-${testInfo.project.name}.json`);
  await (await exportDownload).saveAs(sourcePath);

  const tampered = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as {
    records: Array<{ value: string }>;
  };
  tampered.records[0]!.value += " ";
  const tamperedPath = testInfo.outputPath(`holder-estate-tampered-${testInfo.project.name}.json`);
  fs.writeFileSync(tamperedPath, JSON.stringify(tampered));

  const before = await page.evaluate(() => localStorage.getItem("axm-world:cartridge-bay:v2"));
  await page.getByTestId("holder-estate-input").setInputFiles(tamperedPath);
  await expect(page.getByTestId("holder-estate-errors")).toBeVisible();
  await expect(page.getByTestId("holder-estate-preflight")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("axm-world:cartridge-bay:v2"))).toBe(before);
});
