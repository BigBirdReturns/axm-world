import { test, expect } from "@playwright/test";
import { enterCartridge, resolvePendingDecisions } from "./helpers";

// Proves the shell contract the branch claims: one cartridge state, switched between
// representations without reset; a true modal that representation labels can't bleed
// through. Runs on both a desktop and a mobile viewport (see playwright.config.ts).

test("decision modal is a true layer — no representation labels render through it", async ({ page }) => {
  await page.goto("/axm-world/game/");
  await page.getByRole("button", { name: /play/i }).first().click();

  await expect(page.getByTestId("pending-decision-card")).toBeVisible();
  // Representation labels are unmounted while a modal is open.
  await expect(page.locator(".node-label")).toHaveCount(0);
});

test("Run Graph and Planet are pure representations of the same cartridge state", async ({ page }) => {
  await enterCartridge(page);

  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  const selectedBefore = await page.getByTestId("selected-contract-title").innerText();
  const partyBefore = await page.getByTestId("party-count").innerText();

  await page.getByTestId("view-planet").click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0); // decision does not replay
  await expect(page.getByTestId("selected-contract-title")).toHaveText(selectedBefore);
  await expect(page.getByTestId("party-count")).toHaveText(partyBefore);

  await page.getByTestId("view-run-graph").click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await expect(page.getByTestId("selected-contract-title")).toHaveText(selectedBefore);
  await expect(page.getByTestId("party-count")).toHaveText(partyBefore);
});

test("post-run outcome and cartridge marks persist across a representation switch", async ({ page }) => {
  await enterCartridge(page);

  await page.getByTestId("run-contract-button").click();
  await expect(page.getByTestId("outcome-region")).toBeVisible();
  // A run may enqueue a post-run decision, which gates the view switcher by design;
  // resolve it before switching representations.
  await resolvePendingDecisions(page);
  // The run was on "The Cellar" (first available node); its report is what must persist.
  await expect(page.getByTestId("outcome-region")).toContainText(/Cellar/i);
  const marksBefore = await page.getByTestId("cartridge-mark-count").innerText();

  await page.getByTestId("view-planet").click();
  await expect(page.getByTestId("outcome-region")).toContainText(/Cellar/i);
  await expect(page.getByTestId("cartridge-mark-count")).toHaveText(marksBefore);

  await page.getByTestId("view-run-graph").click();
  await expect(page.getByTestId("outcome-region")).toContainText(/Cellar/i);
  await expect(page.getByTestId("cartridge-mark-count")).toHaveText(marksBefore);
});

test("the cartridge title is legible (not near-black on black)", async ({ page }) => {
  await enterCartridge(page);
  const title = page.getByTestId("cartridge-title");
  await expect(title).toBeVisible();
  const color = await title.evaluate((el) => getComputedStyle(el as HTMLElement).color);
  const m = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  const luminance = 0.2126 * m[0]! + 0.7152 * m[1]! + 0.587 * m[2]!;
  expect(luminance).toBeGreaterThan(120); // light text, not inherited black
});
