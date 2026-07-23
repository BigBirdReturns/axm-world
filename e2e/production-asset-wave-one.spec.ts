import { test, expect, type Page } from "@playwright/test";
import { resolveOpeningDecision } from "./helpers";

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
}

async function backgroundImage(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundImage);
}

test("the Rodoh shelf loads the system environment without obscuring cartridge controls", async ({ page }) => {
  await coldBay(page);
  await expect.poll(() => backgroundImage(page, '[data-testid="rodoh-cartridge-bay"]')).toContain("rodoh-bay-environment.svg");
  await expect(page.getByTestId("play-cartridge-first-charter")).toBeVisible();
  await expect(page.getByTestId("play-cartridge-karazhan")).toBeVisible();
  await expect(page.getByTestId("play-cartridge-kind-gods-of-ilyon")).toBeVisible();
  await expect(page.getByTestId("play-cartridge-lamp-district")).toBeVisible();
});

test("The Waking Tower Hall loads its authored environment and lead portrait", async ({ page }) => {
  await coldBay(page);
  await page.getByTestId("play-cartridge-karazhan").click();
  await resolveOpeningDecision(page);
  await expect(page.getByTestId("engine-shell")).toBeVisible();
  await page.getByTestId("view-hall").click();
  const hall = page.getByTestId("hall-scene");
  await expect(hall).toBeVisible();
  await expect.poll(() => hall.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("waking-tower-environment.svg");

  const stewardPortrait = page.locator(".axm-steward__portrait");
  if (await stewardPortrait.count()) {
    await expect.poll(() => stewardPortrait.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("seren-vale-portrait.svg");
  }
});

test("Ilyon loads the Confluence Observatory and Aster Neral evidence portrait", async ({ page }) => {
  await coldBay(page);
  await page.getByTestId("play-cartridge-kind-gods-of-ilyon").click();
  await resolveOpeningDecision(page);
  await expect(page.getByTestId("engine-shell")).toBeVisible();

  await page.getByTestId("view-hall").click();
  const hall = page.getByTestId("hall-scene");
  await expect(hall).toBeVisible();
  await expect.poll(() => hall.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("ilyon-observatory-environment.svg");

  await page.getByTestId("view-aperture").click();
  await expect(page.getByTestId("godscar-pocket-panel")).toBeVisible();
  const aster = page.locator(".godscar-pocket__cast article").first().locator(".godscar-pocket__cast-portrait");
  await expect(aster).toBeVisible();
  await expect.poll(() => aster.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain("aster-neral-portrait.svg");
});