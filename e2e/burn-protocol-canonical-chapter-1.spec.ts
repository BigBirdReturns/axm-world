import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARC_PATH = process.env["BURN_PROTOCOL_CHAPTER_1_ARC_PATH"];
const CARTRIDGE_ID = "burn-protocol-episode-01-chapter-01";

async function coldBay(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
}

async function finishEntryTransition(page: Page): Promise<void> {
  const host = page.getByTestId("canonical-story-host");
  const transition = page.getByTestId("cartridge-enter-transition");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await host.isVisible().catch(() => false)
        && !(await transition.isVisible().catch(() => false))) return;
    const skip = transition.getByRole("button", { name: /skip entry/i });
    if (await skip.isVisible().catch(() => false)) {
      await skip.evaluate((button: HTMLButtonElement) => button.click()).catch(() => undefined);
    }
    await Promise.race([
      host.waitFor({ state: "visible", timeout: 250 }).catch(() => undefined),
      transition.waitFor({ state: "hidden", timeout: 250 }).catch(() => undefined),
      page.waitForTimeout(250),
    ]);
  }
  await expect(host).toBeVisible({ timeout: 20_000 });
  await expect(transition).toHaveCount(0, { timeout: 20_000 });
}

async function enterStory(page: Page): Promise<void> {
  await page.locator(`button[data-testid="play-cartridge-${CARTRIDGE_ID}"]`).click();
  await finishEntryTransition(page);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function next(page: Page, expectedPanelId: string): Promise<void> {
  await page.getByTestId("canonical-story-next").click();
  await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", expectedPanelId);
}

test.describe("The Burn Protocol canonical Chapter 1 receiver", () => {
  test.skip(!ARC_PATH, "Requires the exact Arc Chapter 1 publication output.");
  test.describe.configure({ mode: "serial" });

  test("imports and traverses the eighteen-panel fixed path without simulation", async ({ page }, testInfo) => {
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
    await expect(page.getByTestId("import-success")).toContainText("Episode 1, Chapter 1");
    await expect(page.getByTestId(`cartridge-entry-${CARTRIDGE_ID}`)).toBeVisible();
    await enterStory(page);

    const host = page.getByTestId("canonical-story-host");
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await expect(page.getByText("Chapter 1 · Impact", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-panel-index-"]')).toHaveCount(18);
    await expect(page.getByTestId("canonical-panel-asset-placeholder")).toBeVisible();
    await expect(page.getByTestId("canonical-panel-text-blocked")).toContainText("Canonical text source required");
    await expect(page.getByTestId("canonical-panel-audit-projection")).toContainText("NOT CANONICAL DIALOGUE");
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText("Plate mode remains disabled");

    await expect(page.getByTestId("engine-shell")).toHaveCount(0);
    await expect(page.getByTestId("axm-experience")).toHaveCount(0);
    await expect(page.getByTestId("roster-region")).toHaveCount(0);
    await expect(page.getByTestId("selected-contract")).toHaveCount(0);
    await expect(page.getByText(/success|partial|failure/i)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath(`burn-chapter-1-opening-${testInfo.project.name}.png`),
      fullPage: true,
    });

    for (let panel = 2; panel <= 8; panel += 1) {
      await next(page, `E01-C1-P${String(panel).padStart(2, "0")}`);
    }
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P08");
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterStory(page);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C1-P08");

    for (let panel = 9; panel <= 18; panel += 1) {
      await next(page, `E01-C1-P${String(panel).padStart(2, "0")}`);
    }
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C1-P18");
    await page.screenshot({
      path: testInfo.outputPath(`burn-chapter-1-terminal-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("canonical-story-next").click();
    await expect(page.getByTestId("canonical-story-extent-complete")).toContainText("E01-C2-P19");
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C1-P18");
    await page.getByTestId("canonical-story-previous").click();
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C1-P17");
    await expect(page.getByTestId("canonical-story-extent-complete")).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    expect(externalRequests).toEqual([]);
  });
});
