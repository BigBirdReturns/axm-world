import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const DEMO = "/local/underdrain-draft/index.html";
const ROOT = resolve(import.meta.dirname, "..");
const EXPECTED = JSON.parse(
  readFileSync(resolve(ROOT, "demos/underdrain-draft/playtest.json"), "utf8"),
);

test.describe("UNDERDRAIN continuous authored pilot", () => {
  test("cold entry establishes the role, ordinary stake, safe mechanism, and resumable state", async ({ page }) => {
    const pageErrors: string[] = [];
    const externalRequests: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== new URL(page.url() || "http://127.0.0.1").origin && url.protocol !== "data:") {
        externalRequests.push(request.url());
      }
    });

    await page.goto(DEMO);
    await expect(page).toHaveTitle("UNDERDRAIN: The Bloom Below");
    await expect(page.getByRole("heading", { name: "The sink grew a second trap." })).toBeVisible();
    await expect(page.getByText("You are Rhea Venn, a licensed plumber.")).toBeVisible();
    await expect(page.getByText("Restore Mrs. Kett's water.")).toBeVisible();
    await expect(page.getByText("The opening repair has no enemies.")).toBeVisible();
    await expect(page.locator('script[src]')).toHaveCount(0);
    await expect(page.locator('link[rel="stylesheet"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Answer the service call" }).click();
    await expect(page.locator("#action")).toHaveClass(/active/);
    await expect(page.getByLabel("Deterministic Underdrain action encounter")).toBeVisible();
    await expect(page.getByText("This is a safe repair: move to the green mechanism and use WORK. There are no enemies.")).toBeVisible();
    const opening = await page.evaluate(() => {
      const runtime = (window as unknown as { UnderdrainRuntime: { session: any } }).UnderdrainRuntime;
      return {
        challengeId: runtime.session.current.challengeId,
        enemyCount: runtime.session.current.state.enemies.length,
        runtimeVersion: runtime.session.current.spec.runtimeVersion,
        objectiveKinds: runtime.session.current.spec.objectives.map((entry: any) => entry.semanticCompletion?.kind),
      };
    });
    expect(opening).toEqual({
      challengeId: "mrs-kett-service-call",
      enemyCount: 0,
      runtimeVersion: "1.1.0",
      objectiveKinds: ["interact_count", "hold_ticks"],
    });

    await page.getByRole("button", { name: "Pause and return later" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Resume where I stopped" })).toBeVisible();
    await page.getByRole("button", { name: "Resume where I stopped" }).click();
    await expect(page.locator("#action")).toHaveClass(/active/);
    expect(pageErrors).toEqual([]);
    expect(externalRequests).toEqual([]);
  });

  test("the exact Arc capsule completes every route and Root Gate compact deterministically", async ({ page }) => {
    await page.goto(`${DEMO}?autotest=1`);
    await expect(page.locator("body")).toHaveAttribute("data-test-status", "pass", { timeout: 45_000 });
    const result = await page.evaluate(() => (
      window as unknown as { __UNDERDRAIN_TEST_RESULT__: unknown }
    ).__UNDERDRAIN_TEST_RESULT__);

    expect(result).toEqual(EXPECTED);
    expect(result).toMatchObject({
      format: "rodoh-underdrain-automated-pilot-qualification/2",
      status: "pass",
      checks: {
        exactArcCommit: "395bc539165cc525678ba7eb83434c8cd674437b",
        serviceHasNoEnemies: true,
        serviceUsesMechanisms: true,
        pumpUsesMechanisms: true,
        pumpAccepted: true,
        rootGateAccepted: true,
        noWorldInventedOutcome: true,
        blindPlayerReceiptIssuedByRuntime: false,
      },
    });
    const cases = (result as { cases: Array<any> }).cases;
    expect(cases).toHaveLength(9);
    expect(new Set(cases.map((entry) => entry.route))).toEqual(new Set([
      "emergency-plan",
      "service-tunnel",
      "truce-offer",
    ]));
    expect(new Set(cases.map((entry) => entry.compact))).toEqual(new Set([
      "town-first-flow",
      "nursery-first-flow",
      "balanced-flow-compact",
    ]));
    expect(cases.every((entry) => entry.service.outcome === "success")).toBe(true);
    expect(cases.every((entry) => entry.pump.outcome === "success")).toBe(true);
    expect(cases.every((entry) => /^choice1_[0-9a-f]{64}$/.test(entry.root.digest))).toBe(true);
  });

  test("the mobile surface keeps touch ingress and page containment", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only containment check");
    await page.goto(DEMO);
    await expect(page.locator(".touch")).toBeHidden();
    await page.getByRole("button", { name: "Answer the service call" }).click();
    await expect(page.locator(".touch")).toBeVisible();
    await expect(page.getByRole("button", { name: "Move up" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Wrench" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Work on mechanism" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});

declare global {
  interface Window {
    __UNDERDRAIN_TEST_RESULT__: unknown;
    UnderdrainRuntime: { session: unknown };
  }
}
