import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARC_PATH = process.env["BURN_PROTOCOL_EPISODE_1_ARC_PATH"];
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
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
}

function panelId(panel: number): string {
  const chapter = panel <= 18 ? 1 : panel <= 38 ? 2 : 3;
  return `E01-C${chapter}-P${String(panel).padStart(2, "0")}`;
}

async function next(page: Page, expectedPanelId: string): Promise<void> {
  await page.getByTestId("canonical-story-next").click();
  await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
    "data-panel-id",
    expectedPanelId,
  );
}

async function advanceRange(page: Page, first: number, last: number): Promise<void> {
  for (let panel = first; panel <= last; panel += 1) {
    await next(page, panelId(panel));
  }
}

test.describe("The Burn Protocol complete canonical Episode 1", () => {
  test.skip(!ARC_PATH, "Requires the exact complete Episode 1 Arc publication.");
  test.describe.configure({ mode: "serial" });

  test("traverses all sixty panels and both chapter seams without simulation", async ({ page }, testInfo) => {
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
    await expect(page.getByTestId("import-success")).toContainText("The Broken Road");
    await expect(page.getByTestId(`cartridge-entry-${CARTRIDGE_ID}`)).toBeVisible();
    await enterStory(page);

    const host = page.getByTestId("canonical-story-host");
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C1");
    await expect(page.locator('[data-testid^="canonical-chapter-index-"]')).toHaveCount(3);
    await expect(page.locator('[data-testid^="canonical-panel-index-E01-C1-"]')).toHaveCount(18);
    await expect(page.getByTestId("canonical-panel-text-blocked")).toContainText("Canonical text source required");
    await expect(page.getByTestId("canonical-panel-audit-projection")).toContainText("NOT CANONICAL DIALOGUE");
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText("4 scroll-plate assets");
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText("a01c1-scroll-plates");

    await expect(page.getByTestId("engine-shell")).toHaveCount(0);
    await expect(page.getByTestId("axm-experience")).toHaveCount(0);
    await expect(page.getByTestId("roster-region")).toHaveCount(0);
    await expect(page.getByTestId("selected-contract")).toHaveCount(0);
    await expect(page.getByText(/success|partial|failure/i)).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-1-opening-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 2, 18);
    await next(page, "E01-C2-P19");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C2");
    await expect(page.getByText("Chapter 2 · The Black Box", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-panel-index-E01-C2-"]')).toHaveCount(20);

    await advanceRange(page, 20, 38);
    await expect(host).toHaveAttribute("data-panel-id", "E01-C2-P38");
    await next(page, "E01-C3-P39");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C3");
    await expect(page.getByText("Chapter 3 · A Direction in Time", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-panel-index-E01-C3-"]')).toHaveCount(22);
    await expect(page.getByTestId("canonical-chapter-index-E01-C3")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText("a01c3-scroll-plates");
    await page.screenshot({
      path: testInfo.outputPath(`burn-chapter-3-seam-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 40, 49);
    await expect(host).toHaveAttribute("data-panel-id", "E01-C3-P49");
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterStory(page);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C3-P49");
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-chapter-id", "E01-C3");

    await advanceRange(page, 50, 60);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C3-P60");
    await page.screenshot({
      path: testInfo.outputPath(`burn-episode-1-terminal-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("canonical-story-next").click();
    await expect(page.getByTestId("canonical-story-extent-complete")).toContainText("E02-C1-P01");
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C3-P60");
    await page.getByTestId("canonical-story-previous").click();
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C3-P59");
    await expect(page.getByTestId("canonical-story-extent-complete")).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E01-C1").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await page.getByTestId("canonical-chapter-index-E01-C2").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C2-P19");
    await page.getByTestId("canonical-chapter-index-E01-C3").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C3-P39");
    await page.getByTestId("canonical-story-previous").click();
    await expect(host).toHaveAttribute("data-panel-id", "E01-C2-P38");

    await expectNoHorizontalOverflow(page);
    expect(externalRequests).toEqual([]);
  });
});
