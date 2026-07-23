import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { resolveOpeningDecision, resolvePendingDecisions } from "./helpers";

const MOVEMENTS = [
  "keep-the-school-lamps",
  "authorize-the-reservoir-route",
  "cross-the-drainage-liturgy",
  "read-the-sleeping-market",
  "wake-the-war-lattice",
  "interrupt-the-surface-sacrifice",
  "return-with-heat",
  "redraw-the-district-map",
] as const;

async function bootLampDistrict(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("play-cartridge-lamp-district").click();
  await resolveOpeningDecision(page);
  await expect(page.getByTestId("engine-shell")).toBeVisible();
  await expect(page.getByTestId("underworld-scene")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-cartridge", "lamp-district");
}

async function clearMovement(page: Page, movementId: string): Promise<void> {
  for (let attempt = 1; attempt <= 32; attempt += 1) {
    const expedition = page.getByTestId("underworld-expedition");
    await expect(expedition).toBeVisible();
    await expect(expedition).toHaveAttribute("data-challenge", movementId);

    const enter = page.getByTestId(`underworld-enter-${movementId}`);
    await expect(enter).toBeVisible();
    await expect(enter).toBeEnabled();
    await enter.click();

    const encounter = page.getByTestId("encounter-shell");
    await expect(encounter).toBeVisible();

    const spend = page.getByTestId("encs-spend-inc");
    if (await spend.isVisible().catch(() => false)) {
      while (await spend.isEnabled().catch(() => false)) await spend.click();
    }

    await page.getByTestId("encs-resolve").click();
    const receipt = page.getByTestId("encs-receipt");
    await expect(receipt).toBeVisible();
    const outcome = await receipt.getAttribute("data-outcome");
    await page.getByTestId("encs-leave").click();
    await resolvePendingDecisions(page);
    const mobileBack = page.getByTestId("mobile-step-back");
    if (await mobileBack.isVisible().catch(() => false)) await mobileBack.click();
    await expect(page.getByTestId("underworld-scene")).toBeVisible();

    if (outcome === "success") return;
  }
  throw new Error(`Lamp District movement ${movementId} did not clear within the bounded retry budget.`);
}

async function assertCompletedTomb(page: Page): Promise<void> {
  const underworld = page.getByTestId("underworld-scene");
  await expect(underworld).toHaveAttribute("data-alarm", "wake");
  await expect(underworld).toHaveAttribute("data-signature", "breached");
  await expect(underworld).toHaveAttribute("data-visibility", "exposed");
  await expect(underworld).toHaveAttribute("data-hub-state", "changed");
  await expect(page.getByTestId("underworld-inherited-count")).toHaveText("8/8");
  for (const layer of ["grave-skin", "shroud", "quiet-works", "common-depths", "custodial-ring", "war-layer", "black-core"]) {
    await expect(page.getByTestId(`underworld-layer-${layer}`)).toBeVisible();
  }
}

async function exportRun(page: Page, testInfo: TestInfo): Promise<string> {
  await page.getByTestId("cartridge-object-button").click();
  const entries = page.getByTestId("ledger-entry");
  expect(await entries.count()).toBeGreaterThanOrEqual(MOVEMENTS.length);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /export run/i }).click();
  const download = await downloadPromise;
  const runPath = testInfo.outputPath("lamp-district.run.json");
  await download.saveAs(runPath);
  return runPath;
}

async function importAndResume(page: Page, runPath: string): Promise<void> {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("open-cartridge").setInputFiles(runPath);
  await expect(page.getByTestId("import-success")).toBeVisible();
  await page.getByTestId("play-cartridge-lamp-district").first().click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await expect(page.getByTestId("engine-shell")).toBeVisible();
  await expect(page.getByTestId("underworld-scene")).toBeVisible();
  await assertCompletedTomb(page);
}

test("Lamp District completes ordinary life, descent, breach, return, export, and exact resume", async ({ page }, testInfo) => {
  test.setTimeout(900_000);
  await bootLampDistrict(page);

  const underworld = page.getByTestId("underworld-scene");
  await expect(underworld).toHaveAttribute("data-alarm", "hush");
  await expect(underworld).toHaveAttribute("data-signature", "credible");
  await expect(underworld).toHaveAttribute("data-visibility", "hidden");
  await expect(page.locator('[data-testid^="underworld-layer-"]')).toHaveCount(7);
  await expect(page.getByText("Anja Vei", { exact: true }).first()).toBeVisible();
  const openingShot = testInfo.outputPath("lamp-district-underworld-opening.png");
  await page.screenshot({ path: openingShot, fullPage: true });
  await testInfo.attach("lamp-district-underworld-opening", { path: openingShot, contentType: "image/png" });

  for (const movement of MOVEMENTS) await clearMovement(page, movement);
  await assertCompletedTomb(page);
  const changedShot = testInfo.outputPath("lamp-district-underworld-changed.png");
  await page.screenshot({ path: changedShot, fullPage: true });
  await testInfo.attach("lamp-district-underworld-changed", { path: changedShot, contentType: "image/png" });

  const runPath = await exportRun(page, testInfo);
  await importAndResume(page, runPath);
  const resumedShot = testInfo.outputPath("lamp-district-underworld-resumed.png");
  await page.screenshot({ path: resumedShot, fullPage: true });
  await testInfo.attach("lamp-district-underworld-resumed", { path: resumedShot, contentType: "image/png" });
});
