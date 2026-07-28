import { expect, test } from "@playwright/test";

const DEMO = "/axm-world/game/local/playwright-underdrain/index.html";

test("UNDERDRAIN mobile action controls remain inside the stage with 44px targets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Narrow-screen geometry is qualified by the mobile project.");
  await page.goto(DEMO);
  await page.getByRole("button", { name: "Answer the service call" }).click();
  await expect(page.locator("#action")).toHaveClass(/active/);
  await expect(page.locator(".touch")).toBeVisible();

  const geometry = await page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>(".stage")!.getBoundingClientRect();
    const ribbon = document.querySelector<HTMLElement>(".objective-ribbon")!.getBoundingClientRect();
    const buttons = [...document.querySelectorAll<HTMLElement>(".touch button")].map((button) => ({
      label: button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "unlabeled",
      rect: button.getBoundingClientRect(),
    }));
    const tolerance = 1;
    const inside = buttons.every(({ rect }) =>
      rect.left >= stage.left - tolerance
      && rect.right <= stage.right + tolerance
      && rect.top >= stage.top - tolerance
      && rect.bottom <= stage.bottom + tolerance,
    );
    const minimumTarget = buttons.every(({ rect }) => rect.width >= 44 && rect.height >= 44);
    const pairwiseOverlap = buttons.flatMap((left, index) =>
      buttons.slice(index + 1).map((right) => {
        const overlapX = Math.max(0, Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left));
        const overlapY = Math.max(0, Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top));
        return { left: left.label, right: right.label, area: overlapX * overlapY };
      }),
    ).filter((entry) => entry.area > tolerance);
    const controlTop = Math.min(...buttons.map(({ rect }) => rect.top));
    return {
      stage: { left: stage.left, right: stage.right, top: stage.top, bottom: stage.bottom },
      ribbon: { top: ribbon.top, bottom: ribbon.bottom },
      buttons: buttons.map(({ label, rect }) => ({
        label,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      })),
      inside,
      minimumTarget,
      pairwiseOverlap,
      ribbonSeparated: ribbon.bottom <= controlTop + tolerance,
    };
  });

  expect(geometry.inside, JSON.stringify(geometry, null, 2)).toBe(true);
  expect(geometry.minimumTarget, JSON.stringify(geometry, null, 2)).toBe(true);
  expect(geometry.pairwiseOverlap, JSON.stringify(geometry, null, 2)).toEqual([]);
  expect(geometry.ribbonSeparated, JSON.stringify(geometry, null, 2)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile-controls-contained.png"), fullPage: true });
});
