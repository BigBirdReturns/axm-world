import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARC_PATH = process.env["BURN_PROTOCOL_THROUGH_EPISODE_5_CHAPTER_2_ARC_PATH"];
const CARTRIDGE_ID = "burn-protocol";

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
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(
    dimensions.clientWidth,
  );
}

async function next(page: Page, expectedPanelId: string): Promise<void> {
  await page.getByTestId("canonical-story-next").click();
  await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
    "data-panel-id",
    expectedPanelId,
  );
}

async function advanceRange(
  page: Page,
  episode: number,
  chapter: number,
  first: number,
  last: number,
): Promise<void> {
  for (let panel = first; panel <= last; panel += 1) {
    await next(
      page,
      `E${String(episode).padStart(2, "0")}-C${chapter}-P${String(panel).padStart(2, "0")}`,
    );
  }
}

test.describe("The Burn Protocol Episode 5 Chapter 2", () => {
  test.skip(!ARC_PATH, "Requires the exact Episode 5 Chapter 2 Arc publication.");
  test.describe.configure({ mode: "serial" });

  test("crosses into The Mother through the unchanged fixed reader", async ({ page }, testInfo) => {
    test.slow();
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
    await expect(page.getByTestId("import-success")).toContainText(
      "The Burn Protocol through Episode 5, Chapter 2",
      { timeout: 15_000 },
    );
    await expect(page.getByTestId(`cartridge-entry-${CARTRIDGE_ID}`)).toBeVisible();
    await enterStory(page);

    const host = page.getByTestId("canonical-story-host");
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await expect(page.getByText("280 panel slots", { exact: true })).toBeVisible();
    await expect(page.getByText("56 plate assets", { exact: true })).toBeVisible();
    await expect(page.getByTestId("engine-shell")).toHaveCount(0);
    await expect(page.getByTestId("axm-experience")).toHaveCount(0);
    await expect(page.getByTestId("roster-region")).toHaveCount(0);
    await expect(page.getByTestId("selected-contract")).toHaveCount(0);
    await expect(page.getByText(/success|partial|failure/i)).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E01-C3").click();
    await advanceRange(page, 1, 3, 40, 60);
    await next(page, "E02-C1-P01");
    await page.getByTestId("canonical-chapter-index-E02-C3").click();
    await advanceRange(page, 2, 3, 42, 60);
    await next(page, "E03-C1-P01");
    await page.getByTestId("canonical-chapter-index-E03-C3").click();
    await advanceRange(page, 3, 3, 42, 60);
    await next(page, "E04-C1-P01");
    await page.getByTestId("canonical-chapter-index-E04-C3").click();
    await advanceRange(page, 4, 3, 42, 60);
    await next(page, "E05-C1-P01");
    await advanceRange(page, 5, 1, 2, 20);
    await next(page, "E05-C2-P21");

    await expect(host).toHaveAttribute("data-chapter-id", "E05-C2");
    await expect(page.getByText(
      "Episode 5: Nursery World · Chapter 2: The Mother",
      { exact: true },
    )).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-chapter-index-E05-"]')).toHaveCount(2);
    await expect(page.locator('[data-testid^="canonical-panel-index-E05-C2-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-chapter-index-E05-C2")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "4 scroll-plate assets",
    );
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "a05c2-scroll-plates",
    );
    await expect(page.getByTestId("canonical-panel-text-blocked")).toContainText(
      "Canonical text source required",
    );
    await expect(page.getByTestId("canonical-panel-asset-placeholder")).toBeVisible();
    await expect(page.getByText(/PANEL 261 OF 280/)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-5-chapter-2-seam-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 5, 2, 22, 30);
    await expect(host).toHaveAttribute("data-panel-id", "E05-C2-P30");
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterStory(page);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-panel-id",
      "E05-C2-P30",
    );
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-chapter-id",
      "E05-C2",
    );

    await advanceRange(page, 5, 2, 31, 40);
    await expect(host).toHaveAttribute("data-panel-id", "E05-C2-P40");
    await expect(page.getByText(/PANEL 280 OF 280/)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-5-chapter-2-terminal-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("canonical-story-next").click();
    await expect(page.getByTestId("canonical-story-extent-complete")).toContainText(
      "E05-C3-P41",
    );
    await expect(host).toHaveAttribute("data-panel-id", "E05-C2-P40");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E05-C2-P39");
    await expect(page.getByTestId("canonical-story-extent-complete")).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E05-C2").click();
    await expect(host).toHaveAttribute("data-panel-id", "E05-C2-P21");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E05-C1-P20");
    await expect(host).toHaveAttribute("data-chapter-id", "E05-C1");

    await expectNoHorizontalOverflow(page);
    expect(externalRequests).toEqual([]);
  });
});
