import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const ARC_PATH = process.env["BURN_PROTOCOL_THROUGH_CHAPTER_2_ARC_PATH"];
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

async function next(page: Page, expectedPanelId: string): Promise<void> {
  await page.getByTestId("canonical-story-next").click();
  await expect(page.getByTestId("canonical-story-host")).toHaveAttribute(
    "data-panel-id",
    expectedPanelId,
  );
}

async function advanceRange(page: Page, first: number, last: number): Promise<void> {
  for (let panel = first; panel <= last; panel += 1) {
    const chapter = panel <= 18 ? 1 : 2;
    await next(page, `E01-C${chapter}-P${String(panel).padStart(2, "0")}`);
  }
}

test.describe("The Burn Protocol canonical story through Chapter 2", () => {
  test.skip(!ARC_PATH, "Requires the exact Arc publication through Chapter 2.");
  test.describe.configure({ mode: "serial" });

  test("crosses P18 to P19 and traverses the thirty-eight-panel fixed path", async ({ page }, testInfo) => {
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
    await expect(page.getByTestId("import-success")).toContainText("Episode 1 through Chapter 2");
    await expect(page.getByTestId(`cartridge-entry-${CARTRIDGE_ID}`)).toBeVisible();
    await enterStory(page);

    const host = page.getByTestId("canonical-story-host");
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C1");
    await expect(page.getByText("Chapter 1 · Impact", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-chapter-index-"]')).toHaveCount(2);
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
      path: testInfo.outputPath(`burn-through-chapter-2-opening-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 2, 18);
    await expect(host).toHaveAttribute("data-panel-id", "E01-C1-P18");
    await next(page, "E01-C2-P19");
    await expect(host).toHaveAttribute("data-chapter-id", "E01-C2");
    await expect(page.getByText("Chapter 2 · The Black Box", { exact: true })).toBeVisible();
    await expect(page.locator('[data-testid^="canonical-panel-index-E01-C2-"]')).toHaveCount(20);
    await expect(page.getByTestId("canonical-chapter-index-E01-C2")).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId("canonical-plate-boundary")).toContainText("a01c2-scroll-plates");
    await page.screenshot({
      path: testInfo.outputPath(`burn-chapter-2-seam-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await advanceRange(page, 20, 27);
    await expect(host).toHaveAttribute("data-panel-id", "E01-C2-P27");
    await expectNoHorizontalOverflow(page);

    await page.reload();
    await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
    await enterStory(page);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C2-P27");
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-chapter-id", "E01-C2");

    await advanceRange(page, 28, 38);
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C2-P38");
    await page.screenshot({
      path: testInfo.outputPath(`burn-through-chapter-2-terminal-${testInfo.project.name}.png`),
      fullPage: true,
    });

    await page.getByTestId("canonical-story-next").click();
    await expect(page.getByTestId("canonical-story-extent-complete")).toContainText("E01-C3-P39");
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C2-P38");
    await page.getByTestId("canonical-story-previous").click();
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C2-P37");
    await expect(page.getByTestId("canonical-story-extent-complete")).toHaveCount(0);

    await page.getByTestId("canonical-chapter-index-E01-C1").click();
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C1-P01");
    await page.getByTestId("canonical-chapter-index-E01-C2").click();
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C2-P19");
    await page.getByTestId("canonical-story-previous").click();
    await expect(page.getByTestId("canonical-story-host")).toHaveAttribute("data-panel-id", "E01-C1-P18");

    await expectNoHorizontalOverflow(page);
    expect(externalRequests).toEqual([]);
  });
});
