import { test, expect } from "@playwright/test";
import { enterCartridge } from "./helpers";

async function loadedBackgroundAssets(page: import("@playwright/test").Page, urls: string[]): Promise<Array<{ url: string; width: number; height: number }>> {
  return page.evaluate(async (sources) => Promise.all(sources.map((url) => new Promise<{ url: string; width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ url, width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error(`Failed to load runtime Hall asset: ${url}`));
    image.src = url;
  }))), urls);
}

function firstUrl(backgroundImage: string): string {
  const match = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
  if (!match?.[1]) throw new Error(`No runtime asset URL in: ${backgroundImage}`);
  return match[1];
}

test("the First Charter Hall loads its production environment, Maren portrait, and framing on desktop and mobile", async ({ page }, testInfo) => {
  await enterCartridge(page);

  const hall = page.getByTestId("hall-scene");
  await expect(hall).toBeVisible();
  await expect(page.getByTestId("hall-npc")).toContainText(/Maren Vos/i);

  const environmentStyle = await hall.evaluate((element) => getComputedStyle(element).backgroundImage);
  const frameStyle = await hall.evaluate((element) => getComputedStyle(element, "::after").backgroundImage);
  const portrait = page.locator(".axm-steward__portrait");
  await expect(portrait).toBeVisible();
  const portraitStyle = await portrait.evaluate((element) => getComputedStyle(element).backgroundImage);

  expect(environmentStyle).toContain("charter-hall-environment");
  expect(frameStyle).toContain("charter-hall-foreground");
  expect(portraitStyle).toContain("maren-vos-portrait");

  const assets = await loadedBackgroundAssets(page, [
    firstUrl(environmentStyle),
    firstUrl(frameStyle),
    firstUrl(portraitStyle),
  ]);
  expect(assets).toEqual([
    expect.objectContaining({ width: 1600, height: 900 }),
    expect.objectContaining({ width: 1600, height: 900 }),
    expect.objectContaining({ width: 640, height: 800 }),
  ]);

  await page.screenshot({
    path: testInfo.outputPath(`first-charter-hall-${testInfo.project.name}.png`),
    fullPage: true,
  });
});
