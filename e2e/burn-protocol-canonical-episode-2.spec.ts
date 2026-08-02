import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARC_PATH = process.env["BURN_PROTOCOL_THROUGH_EPISODE_2_ARC_PATH"];
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

function panelId(episode: 1 | 2, panel: number): string {
  const chapter = episode === 1
    ? panel <= 18 ? 1 : panel <= 38 ? 2 : 3
    : panel <= 20 ? 1 : panel <= 40 ? 2 : 3;
  return `E${String(episode).padStart(2, "0")}-C${chapter}-P${String(panel).padStart(2, "0")}`;
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
  episode: 1 | 2,
  first: number,
  last: number,
): Promise<void> {
  for (let panel = first; panel <= last; panel += 1) {
    await next(page, panelId(episode, panel));
  }
}

test.describe("The Burn Protocol canonical story through Episode 2", () => {
  test.skip(!ARC_PATH, "Requires the exact Arc publication through Episode 2.");
  test.describe.configure({ mode: "serial" });

  test("traverses 120 panels and the episode seam with the unchanged reader", async ({ page }, testInfo) => {
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
    await expect(page.getByTestId("import-success")).toContainText(/Episodes 1.*2/);
    await expect(page.getByTestId(`cartridge-entry-${CARTRIDGE_ID}`)).toBeVisible();
    await enterStory(page);

    const host = page.getByTestId("canonical-story-host");
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C1");
    await expect(page.getByText("120 panel slots", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-chapter-index-"]')).toHaveCount(3);
    await expect(page.locator('[data-testid^="canonical-panel-index-E01-C1-"]')).toHaveCount(18);
    await expect(page.getByTestId("canonical-panel-text-blocked")).toContainText(
      "Canonical text source required",
    );

    await expect(page.getByTestId("engine-shell")).toHaveCount(0);
    await expect(page.getByTestId("axm-experience")).toHaveCount(0);
    await expect(page.getByTestId("roster-region")).toHaveCount(0);
    await expect(page.getByTestId("selected-contract")).toHaveCount(0);
    await expect(page.getByText(/success|partial|failure/i)).toHaveCount(0);

    await advanceRange(page, 1, 2, 18);
    await next(page, "E01-C2-P19");
    await advanceRange(page, 1, 20, 38);
    await next(page, "E01-C3-P39");
    await advanceRange(page, 1, 40, 60);
    await expect(host).toHaveAttribute("data-panel-id", "E01-C3-P60");

    await next(page, "E02-C1-P01");
    await expect(host).toHaveAttribute("data-chapter-id", "E02-C1");
    await expect(page.getByText(
      "Episode 2: Ghosts of Then · Chapter 1: Reunion",
      { exact: true },
    )).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-chapter-index-E02-"]')).toHaveCount(3);
    await expect(page.locator('[data-testid^="canonical-panel-index-E02-C1-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-chapter-index-E02-C1")).toHaveAttribute(
      "data-selected",
      "true",
    );
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "a02c1-scroll-plates",
    );
    await expect(page.getByText(/PANEL 61 OF 120/)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-2-seam-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 2, 2, 20);
    await next(page, "E02-C2-P21");
    await expect(host).toHaveAttribute("data-chapter-id", "E02-C2");
    await expect(page.getByText("Chapter 2 · Earth and Titan", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-panel-index-E02-C2-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "a02c2-scroll-plates",
    );

    await advanceRange(page, 2, 22, 40);
    await next(page, "E02-C3-P41");
    await expect(host).toHaveAttribute("data-chapter-id", "E02-C3");
    await expect(page.getByText("Chapter 3 · Discovery's Echo", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-panel-index-E02-C3-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "3 scroll-plate assets",
    );
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText(
      "a02c3-scroll-plates",
    );
    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-2-chapter-3-seam-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 2, 42, 49);
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P49");
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterStory(page);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-panel-id",
      "E02-C3-P49",
    );
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-chapter-id",
      "E02-C3",
    );

    await advanceRange(page, 2, 50, 60);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
      "data-panel-id",
      "E02-C3-P60",
    );
    await page.screenshot({
      path: testInfo.outputPath(`burn-through-episode-2-terminal-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("canonical-story-next").click();
    await expect(page.getByTestId("canonical-story-extent-complete")).toContainText(
      "E03-C1-P01",
    );
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P60");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P59");
    await expect(page.getByTestId("canonical-story-extent-complete")).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E02-C1").click();
    await expect(host).toHaveAttribute("data-panel-id", "E02-C1-P01");
    await page.getByTestId("canonical-chapter-index-E02-C2").click();
    await expect(host).toHaveAttribute("data-panel-id", "E02-C2-P21");
    await page.getByTestId("canonical-chapter-index-E02-C3").click();
    await expect(host).toHaveAttribute("data-panel-id", "E02-C3-P41");
    await page.getByTestId("canonical-chapter-index-E02-C1").click();
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C3-P60");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C3");
    await expect(page.getByText(
      "Episode 1: The Broken Road · Chapter 3: A Direction in Time",
      { exact: true },
    )).toBeVisible();

    await expectNoHorizontalOverflow(page);
    expect(externalRequests).toEqual([]);
  });
});
