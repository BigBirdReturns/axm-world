import { expect, test, type Page } from "@playwright/test";

const DEMO = "/axm-world/game/local/playwright-underdrain/index.html";
const VIEWPORTS = [
  { name: "portrait", width: 390, height: 844 },
  { name: "landscape", width: 844, height: 390 },
] as const;

type Rect = { left: number; right: number; top: number; bottom: number; width: number; height: number };

async function actionGeometry(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const value = document.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
      if (!value) throw new Error(`Missing ${selector}.`);
      return {
        left: value.left,
        right: value.right,
        top: value.top,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      };
    };
    const overlapArea = (left: DOMRect, right: DOMRect) => {
      const overlapX = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
      const overlapY = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
      return overlapX * overlapY;
    };
    const stageNode = document.querySelector<HTMLElement>(".stage")!;
    const canvasNode = document.querySelector<HTMLCanvasElement>("#game")!;
    const deckNode = document.querySelector<HTMLElement>(".command-deck")!;
    const ribbonNode = document.querySelector<HTMLElement>(".objective-ribbon")!;
    const touchNode = document.querySelector<HTMLElement>(".touch")!;
    const stage = stageNode.getBoundingClientRect();
    const canvas = canvasNode.getBoundingClientRect();
    const deck = deckNode.getBoundingClientRect();
    const ribbon = ribbonNode.getBoundingClientRect();
    const touch = touchNode.getBoundingClientRect();
    const stageStyle = getComputedStyle(stageNode);
    const stageBorderX = Number.parseFloat(stageStyle.borderLeftWidth) + Number.parseFloat(stageStyle.borderRightWidth);
    const stageBorderY = Number.parseFloat(stageStyle.borderTopWidth) + Number.parseFloat(stageStyle.borderBottomWidth);
    const stageContentWidth = stage.width - stageBorderX;
    const stageContentHeight = stage.height - stageBorderY;
    const buttons = [...document.querySelectorAll<HTMLElement>(".touch button")].map((button) => {
      const range = document.createRange();
      range.selectNodeContents(button);
      return {
        label: button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "unlabeled",
        rect: button.getBoundingClientRect(),
        labelRect: range.getBoundingClientRect(),
      };
    });
    const tolerance = 1;
    const labelInset = 2;
    const insideDeck = buttons.every(({ rect: value }) =>
      value.left >= deck.left - tolerance
      && value.right <= deck.right + tolerance
      && value.top >= deck.top - tolerance
      && value.bottom <= deck.bottom + tolerance,
    );
    const minimumTarget = buttons.every(({ rect: value }) => value.width >= 44 && value.height >= 44);
    const labelsContained = buttons.every(({ rect: value, labelRect }) =>
      labelRect.left >= value.left + labelInset - tolerance
      && labelRect.right <= value.right - labelInset + tolerance
      && labelRect.top >= value.top + labelInset - tolerance
      && labelRect.bottom <= value.bottom - labelInset + tolerance,
    );
    const pairwiseOverlap = buttons.flatMap((left, index) =>
      buttons.slice(index + 1).map((right) => ({
        left: left.label,
        right: right.label,
        area: overlapArea(left.rect, right.rect),
      })),
    ).filter((entry) => entry.area > tolerance);
    const worldObstructions = [
      { name: "command-deck", area: overlapArea(canvas, deck) },
      { name: "objective-ribbon", area: overlapArea(canvas, ribbon) },
      { name: "touch-controls", area: overlapArea(canvas, touch) },
      ...buttons.map((button) => ({ name: button.label, area: overlapArea(canvas, button.rect) })),
    ].filter((entry) => entry.area > tolerance);
    const stageObstructions = [
      { name: "command-deck", area: overlapArea(stage, deck) },
      { name: "objective-ribbon", area: overlapArea(stage, ribbon) },
      { name: "touch-controls", area: overlapArea(stage, touch) },
    ].filter((entry) => entry.area > tolerance);
    return {
      stage: rect(".stage"),
      stageContent: { width: stageContentWidth, height: stageContentHeight, borderX: stageBorderX, borderY: stageBorderY },
      canvas: rect("#game"),
      deck: rect(".command-deck"),
      ribbon: rect(".objective-ribbon"),
      touch: rect(".touch"),
      buttons: buttons.map(({ label, rect: value, labelRect }) => ({
        label,
        left: value.left,
        right: value.right,
        top: value.top,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
        labelLeft: labelRect.left,
        labelRight: labelRect.right,
        labelTop: labelRect.top,
        labelBottom: labelRect.bottom,
      })),
      insideDeck,
      minimumTarget,
      labelsContained,
      pairwiseOverlap,
      worldObstructions,
      stageObstructions,
      canvasFillsStageContent: Math.abs(canvas.width - stageContentWidth) <= tolerance
        && Math.abs(canvas.height - stageContentHeight) <= tolerance,
      deckIsSibling: deckNode.parentElement?.classList.contains("stage-shell") === true
        && stageNode.parentElement === deckNode.parentElement,
    };
  });
}

test("UNDERDRAIN mobile portrait and landscape keep every command outside the rendered world", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Touch geometry is qualified by the mobile project.");
  test.setTimeout(60_000);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(DEMO);
    await page.evaluate(() => (window as any).UnderdrainRuntime.reset());
    await expect(page.locator("#cold")).toHaveClass(/active/);
    await page.getByRole("button", { name: "Answer the service call" }).click();
    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.locator(".touch")).toBeVisible();

    const geometry = await actionGeometry(page);
    const diagnostic = JSON.stringify({ viewport, geometry }, null, 2);
    expect(geometry.deckIsSibling, diagnostic).toBe(true);
    expect(geometry.canvasFillsStageContent, diagnostic).toBe(true);
    expect(geometry.insideDeck, diagnostic).toBe(true);
    expect(geometry.minimumTarget, diagnostic).toBe(true);
    expect(geometry.labelsContained, diagnostic).toBe(true);
    expect(geometry.pairwiseOverlap, diagnostic).toEqual([]);
    expect(geometry.worldObstructions, diagnostic).toEqual([]);
    expect(geometry.stageObstructions, diagnostic).toEqual([]);
    expect(geometry.canvas.width, diagnostic).toBeGreaterThan(viewport.name === "landscape" ? 500 : 340);
    expect(geometry.canvas.height, diagnostic).toBeGreaterThan(viewport.name === "landscape" ? 280 : 190);
    if (viewport.name === "landscape") {
      expect(geometry.deck.left, diagnostic).toBeGreaterThanOrEqual(geometry.canvas.right - 1);
    } else {
      expect(geometry.deck.top, diagnostic).toBeGreaterThanOrEqual(geometry.canvas.bottom - 1);
    }
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-command-deck-clear.png`), fullPage: true });
  }
});
