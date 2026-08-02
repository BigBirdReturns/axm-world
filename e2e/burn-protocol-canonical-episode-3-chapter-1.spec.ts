import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARC_PATH = process.env["BURN_PROTOCOL_THROUGH_EPISODE_3_CHAPTER_1_ARC_PATH"];
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

async function advanceEpisode2Chapter3(
  page: Page,
  first: number,
  last: number,
): Promise<void> {
  for (let panel = first; panel <= last; panel += 1) {
    await next(page, `E02-C3-P${String(panel).padStart(2, "0")}`);
  }
}

async function advanceHeadquarters(
  page: Page,
  first: number,
  last: number,
): Promise<void> {
  for (let panel = first; panel <= last; panel += 1) {
    await next(page, `E03-C1-P${String(panel).padStart(2, "0")}`);
  }
}

test.describe("The Burn Protocol canonical story through Episode 3 Headquarters", () => {
  test.skip(!ARC_PATH, "Requires the exact Arc publication through Episode 3 Chapter 1.");
  test.describe.configure({ mode: "serial" });

  test("crosses the third-episode seam and resumes within the unchanged fixed reader", async ({ page }, testInfo) => {
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
    await expect(page.getByTestId("import-success")).toContainText("Headquarters");
    await expect(page.getByTestId(`cartridge-entry-${CARTRIDGE_ID}`)).toBeVisible();
    await enterStory(page);

    const host = page.getByTestId("canonical-story-host");
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await expect(page.getByText("140 panel slots", { exact: true })).toBeVisible();
    await expect(page.getByTestId("engine-shell")).toHaveCount(0);
    await expect(page.getByTestId("axm-experience")).toHaveCount(0);
    await expect(page.getByTestId("roster-region")).toHaveCount(0);
    await expect(page.getByTestId("selected-contract")).toHaveCount(0);
    await expect(page.getByText(/success|partial|failure/i)).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E01-C3").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C3-P39");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C2-P38");

    await page.getByTestId("canonical-chapter-index-E01-C3").click();
    for (let panel = 40; panel <= 60; panel += 1) {
      await next(page, `E01-C3-P${String(panel).padStart(2, "0")}`);
    }
    await next(page, "E02-C1-P01");
    await page.getByTestId("canonical-chapter-index-E02-C3").click();
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P41");
    await expect(page.locator('[data-testid^="canonical-panel-index-E02-C3-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "4 scroll-plate assets",
    );

    await advanceEpisode2Chapter3(page, 42, 60);
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P60");
    await next(page, "E03-C1-P01");
    await expect(host).toHaveAttribute("data-chapter-id", "E03-C1");
    await expect(page.getByText(
      "Episode 3: The Omega Thread · Chapter 1: Headquarters",
      { exact: true },
    )).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-chapter-index-E03-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="canonical-panel-index-E03-C1-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-chapter-index-E03-C1")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "4 scroll-plate assets",
    );
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "estate-archive-v062",
    );
    await expect(page.getByTestId("canonical-panel-text-blocked")).toContainText(
      "Canonical text source required",
    );
    await expect(page.getByText(/PANEL 121 OF 140/)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-3-seam-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceHeadquarters(page, 2, 12);
    await expect(host).toHaveAttribute("data-panel-id", "E03-C1-P12");
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterStory(page);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-panel-id",
      "E03-C1-P12",
    );
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-chapter-id",
      "E03-C1",
    );

    await advanceHeadquarters(page, 13, 20);
    await expect(host).toHaveAttribute("data-panel-id", "E03-C1-P20");
    await page.screenshot({
      path: testInfo.outputPath(`burn-through-episode-3-chapter-1-terminal-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("canonical-story-next").click();
    await expect(page.getByTestId("canonical-story-extent-complete")).toContainText(
      "E03-C2-P21",
    );
    await expect(host).toHaveAttribute("data-panel-id", "E03-C1-P20");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E03-C1-P19");
    await expect(page.getByTestId("canonical-story-extent-complete")).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E03-C1").click();
    await expect(host).toHaveAttribute("data-panel-id", "E03-C1-P01");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P60");
    await expect(host).toHaveAttribute("data-chapter-id", "E02-C3");
    await expect(page.getByText(
      "Episode 2: Ghosts of Then · Chapter 3: Discovery's Echo",
      { exact: true },
    )).toBeVisible();

    await expectNoHorizontalOverflow(page);
    expect(externalRequests).toEqual([]);
  });
});
