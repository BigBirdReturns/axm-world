import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { enterFullRuntime } from "./helpers";

// Proves the shell contract the branch claims: one cartridge state, switched between
// representations without reset; a true modal that representation labels can't bleed
// through. Runs on both a desktop and a mobile viewport (see playwright.config.ts).

/** The guided handoff preserves Hall. Mobile must explicitly return to Board and
 * choose its derived Up next card before the Contract sheet exists; desktop already
 * owns the persistent detail rail. If the same user-selected card is already focused,
 * its first click clears that selection, so click it again to make the reopening act. */
async function openMobileContractSheet(page: Page, testInfo: TestInfo): Promise<void> {
  if (testInfo.project.name !== "mobile") return;
  const sheet = page.getByTestId("mobile-step-contract");
  if (await sheet.isVisible().catch(() => false)) return;
  if (!(await page.getByTestId("contract-board").isVisible().catch(() => false))) {
    await page.getByTestId("view-run-graph").click();
  }
  await expect(page.getByTestId("contract-board")).toBeVisible();
  const upNextCard = page.locator('[data-testid^="contract-board-card-"][data-upnext="true"]').first();
  await expect(upNextCard).toBeVisible();
  await upNextCard.click();
  const opened = await sheet.waitFor({ state: "visible", timeout: 1_000 }).then(() => true, () => false);
  if (!opened) await upNextCard.click();
  await expect(sheet).toBeVisible();
  await expect(page.getByTestId("mobile-mission-stage")).toBeVisible();
}

test("decision modal is a true layer — no representation labels render through it", async ({ page }) => {
  await page.goto("/axm-world/game/");
  await page.getByRole("button", { name: /enter/i }).first().click();

  await expect(page.getByTestId("pending-decision-card")).toBeVisible();
  // Representation labels are unmounted while a modal is open.
  await expect(page.locator(".node-label")).toHaveCount(0);
});

test("Run Graph and Planet are pure representations of the same cartridge state", async ({ page }, testInfo) => {
  await enterFullRuntime(page);
  await openMobileContractSheet(page, testInfo);

  const mobile = testInfo.project.name === "mobile";
  const selectedBefore = mobile
    ? await page.getByTestId("mobile-mission-stage").getByRole("heading").innerText()
    : await page.getByTestId("selected-contract-title").innerText();
  const partyBefore = mobile
    ? await page.getByTestId("mobile-mission-party").locator("figure").count()
    : await page.getByTestId("party-count").innerText();
  const marksBefore = await page.getByTestId("cartridge-mark-count").innerText();
  const digestBefore = mobile ? null : await page.getByTestId("strip-digest").getAttribute("title");

  await page.getByTestId("view-planet").click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0); // decision does not replay
  // Planet intentionally hides off-proximity contract controls. Only shell-level
  // state is asserted while the spatial surface owns focus.
  if (!mobile) await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", digestBefore ?? "");
  await expect(page.getByTestId("cartridge-mark-count")).toHaveText(marksBefore);

  await page.getByTestId("view-run-graph").click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  if (mobile) {
    // Board owns remote contract selection on mobile. Reopen the sheet through the
    // same required player action before asserting its detail survived Planet.
    await openMobileContractSheet(page, testInfo);
    await expect(page.getByTestId("mobile-mission-stage").getByRole("heading")).toHaveText(selectedBefore);
    await expect(page.getByTestId("mobile-mission-party").locator("figure")).toHaveCount(partyBefore as number);
  } else {
    await expect(page.getByTestId("selected-contract-title")).toHaveText(selectedBefore);
    await expect(page.getByTestId("party-count")).toHaveText(partyBefore as string);
  }
});

test("a selected contract has one player-facing commit path", async ({ page }, testInfo) => {
  await enterFullRuntime(page);
  await openMobileContractSheet(page, testInfo);
  await expect(page.getByTestId("play-encounter-button")).toBeVisible();
  await expect(page.getByTestId("play-encounter-button")).toBeEnabled();
  await expect(page.getByTestId("run-contract-button")).toHaveCount(0);
});

test("post-run outcome and cartridge marks persist across a representation switch", async ({ page }, testInfo) => {
  test.slow();
  // The directed Program 001 opening records The Cellar, resolves any queued
  // decision, and crosses the explicit handoff into the reusable shell.
  await enterFullRuntime(page);

  // The board recorded the run as a persistent cartridge mark; that count is what must
  // survive switching between representations of the same cartridge state.
  const marksBefore = await page.getByTestId("cartridge-mark-count").innerText();

  await page.getByTestId("view-planet").click();
  await expect(page.getByTestId("cartridge-mark-count")).toHaveText(marksBefore);

  await page.getByTestId("view-run-graph").click();
  await expect(page.getByTestId("cartridge-mark-count")).toHaveText(marksBefore);

  // Desktop exposes the record-history modal in its top bar. Mobile proves the
  // same persistence through the carried cartridge mark above; it deliberately
  // omits this desktop-only chrome.
  if (testInfo.project.name === "desktop") {
    await page.getByTestId("record-history-button").click();
    await expect(page.getByTestId("outcome-region")).toContainText(/Cellar/i);
  } else {
    await expect(page.getByTestId("record-history-button")).toHaveCount(0);
  }
});

test("the cartridge title is legible (not near-black on black)", async ({ page }) => {
  await enterFullRuntime(page);
  const title = page.getByTestId("cartridge-title");
  await expect(title).toBeVisible();
  const color = await title.evaluate((el) => getComputedStyle(el as HTMLElement).color);
  const m = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  const luminance = 0.2126 * m[0]! + 0.7152 * m[1]! + 0.587 * m[2]!;
  expect(luminance).toBeGreaterThan(120); // light text, not inherited black
});
