import { expect, test, type Page } from "@playwright/test";
async function coldBoot(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
  await expect(page.getByTestId("play-cartridge-ilyon-crown-tides")).toBeVisible();
  await page.getByTestId("play-cartridge-ilyon-crown-tides").click();
  await expect(page.getByTestId("strategy-board-runtime")).toBeVisible();
}

async function choose(page: Page, testId: string): Promise<void> {
  const control = page.getByTestId(testId);
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  await control.click();
}

async function expectPrompt(page: Page, kicker: RegExp): Promise<void> {
  await expect(page.getByTestId("strategy-turn-prompt")).toContainText(kicker);
}
test("Crown Tides makes the race legible before the first click", async ({ page }, testInfo) => {
  await coldBoot(page);
  await expect(page.getByRole("heading", { name: "Ilyon: Crown Tides" })).toBeVisible();
  await expect(page.getByTestId("strategy-race")).toContainText("Uncrowned Federation");
  await expect(page.getByTestId("strategy-race")).toContainText("Planetary Crown");
  await expect(page.getByTestId("strategy-turn-prompt")).toContainText("MOVE");
  await expect(page.getByText("Uncrowned Compact", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Final Humanity Benefactors", { exact: true }).first()).toBeVisible();
  if (testInfo.project.name === "desktop") {
    await expect(page.getByTestId("strategy-3d-scene")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("strategy-current-place")).toContainText("Confluence of Tides");
    await page.waitForTimeout(600);
  }

  await page.screenshot({ path: testInfo.outputPath("opening.png"), fullPage: true });
});

test("a deliberate human line beats Benefactor closure through real browser choices", async ({ page }, testInfo) => {
  test.slow();
  await coldBoot(page);

  await expectPrompt(page, /MOVE/);
  await choose(page, "strategy-space-free-observatory");
  await expectPrompt(page, /CONTROL/);
  if (testInfo.project.name === "desktop") {
    await expect(page.getByTestId("strategy-current-place")).toContainText("Free Observatory");
    await page.screenshot({ path: testInfo.outputPath("free-observatory.png"), fullPage: true });
  }
  await choose(page, "strategy-action-purchase-archive-array");
  await expectPrompt(page, /ACT/);
  await choose(page, "strategy-action-programAction-publish-dependency");
  await expectPrompt(page, /REACT/);
  await choose(page, "strategy-action-pass-none");
  await expectPrompt(page, /MOVE/);
  await choose(page, "strategy-space-deep-tide");
  await expectPrompt(page, /CONTROL/);
  await choose(page, "strategy-action-purchase-reef-listener");
  await expectPrompt(page, /ACT/);
  await choose(page, "strategy-action-programAction-fork-the-cure");
  await expectPrompt(page, /REACT/);
  await choose(page, "strategy-action-pass-none");

  await expectPrompt(page, /MOVE/);
  await choose(page, "strategy-space-free-observatory");
  await expectPrompt(page, /CONTROL/);
  await choose(page, "strategy-action-pass-none");
  await expectPrompt(page, /ACT/);
  await choose(page, "strategy-action-programAction-convene-ocean");

  const terminal = page.getByTestId("strategy-board-terminal");
  await expect(terminal).toBeVisible();
  await expect(terminal).toContainText("Uncrowned Federation");
  await expect(terminal).toContainText("Uncrowned Compact reached this ending first");
  await expect(page.getByTestId("strategy-ending-uncrowned-federation")).toContainText("3/3");

  await page.screenshot({ path: testInfo.outputPath("uncrowned-win.png"), fullPage: true });
});
