import { expect, test } from "@playwright/test";

const DEMO = "/local/underdrain-draft/index.html";

test.describe("UNDERDRAIN standalone vertical slice", () => {
  test("a cold player can understand the premise, inspect the rail, play, and receive custody", async ({ page }, testInfo) => {
    await page.goto(DEMO);
    await expect(page).toHaveTitle("UNDERDRAIN: The Bloom Below");
    await expect(page.getByRole("heading", { name: "UNDERDRAIN: The Bloom Below" })).toBeVisible();
    await expect(page.getByText("The drains are not clogged. They are mobilizing.")).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Accept the draft and descend" })).toBeVisible();
    await expect(page.locator('script[src]')).toHaveCount(0);
    await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath("briefing.png"), fullPage: true });

    await page.getByRole("button", { name: "Authoring rails" }).click();
    await expect(page.locator(".beat")).toHaveCount(7);
    await expect(page.getByText("Dax monetizes panic")).toBeVisible();
    await expect(page.getByText("No clean reset")).toBeVisible();

    await page.getByRole("button", { name: "Briefing" }).click();
    await page.getByRole("radio", { name: /Carry a truce/ }).click();
    await page.getByRole("button", { name: "Accept the draft and descend" }).click();
    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.getByLabel("Top-down action game in the Bellwether Crown Pump")).toBeVisible();

    await page.evaluate(async () => {
      const state = simulate("truce-offer", 2026, 0.9);
      await finishRun(state);
    });
    await expect(page.locator("body")).toHaveAttribute("data-run-status", "success");
    await expect(page.locator("#debrief")).toHaveClass(/active/);
    const receipt = JSON.parse(await page.locator("#receipt-json").textContent() ?? "{}");
    expect(receipt).toMatchObject({
      format: "rodoh-underdrain-provisional-run/1",
      status: "pass",
      authority: "Arc replay required",
      campaignEffect: null,
      cartridge: { id: "underdrain-draft", version: "1.0.0" },
      actionSpec: { format: "axm-action-spec/1", challengeId: "breach-crown-pump", tickRate: 30 },
      execution: { outcome: "success", valvesFlushed: 3 },
    });
    expect(receipt.traceDigest).toMatch(/^acttrace1_[0-9a-f]{64}$/);
    expect(receipt.stateDigest).toMatch(/^actstate1_[0-9a-f]{64}$/);
    expect(receipt.receiptDigest).toMatch(/^provrun1_[0-9a-f]{64}$/);
    await page.screenshot({ path: testInfo.outputPath("debrief.png"), fullPage: true });
  });

  test("the in-browser deterministic sweep passes all strategies and seeds", async ({ page }) => {
    await page.goto(`${DEMO}?autotest=1`);
    await expect(page.locator("body")).toHaveAttribute("data-test-status", "pass", { timeout: 30_000 });
    const result = await page.evaluate(() => window.__UNDERDRAIN_TEST_RESULT__);
    expect(result).toMatchObject({
      format: "rodoh-underdrain-playtest/1",
      status: "pass",
      summary: { runs: 9, success: 8, partials: 1, failures: 0 },
      checks: {
        deterministicFixedStep: true,
        noExternalRuntime: true,
        touchControlsPresent: true,
        reducedMotionPresent: true,
        receiptAuthority: "Arc replay required",
        campaignEffect: null,
      },
    });
  });

  test("the responsive player keeps keyboard and touch ingress on one action state", async ({ page }, testInfo) => {
    await page.goto(DEMO);
    const mobile = testInfo.project.name === "mobile";
    if (mobile) {
      await expect(page.locator(".touch")).toBeVisible();
      await expect(page.getByRole("button", { name: "Move up" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Wrench attack" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Flush valve" })).toBeVisible();
    } else {
      await expect(page.locator(".touch")).toBeHidden();
      await expect(page.getByText(/WASD \/ arrows move/)).toBeVisible();
    }
  });
});

declare global {
  interface Window {
    __UNDERDRAIN_TEST_RESULT__: {
      format: string;
      status: string;
      summary: { runs: number; success: number; partials: number; failures: number };
      checks: Record<string, unknown>;
    };
  }
  function simulate(strategy: string, seed: number, skill: number): unknown;
  function finishRun(state: unknown): Promise<void>;
}
