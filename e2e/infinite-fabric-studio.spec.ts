import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("the Demonstration Foundry compiles, previews, versions, and exports a bounded cut", async ({ page }) => {
  test.setTimeout(90_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/axm-world/game/studio.html");
  await expect(page).toHaveTitle("AXM Demonstration Foundry · Infinite Fabric");
  await expect(page.getByRole("heading", { name: "Direct the proof. Keep the product." }))
    .toBeVisible();
  await expect(page.getByText("TELEMETRY").first()).toBeVisible();
  await expect(page.getByText("OFF").first()).toBeVisible();

  await page.getByLabel(/Describe the audience/u).fill(
    "Make a 45 second vertical custody demo, muted, clean, and one pass.",
  );
  await page.getByRole("button", { name: "apply bounded direction" }).click();

  await expect(page.getByLabel("Matched direction controls").getByText("edition:social"))
    .toBeVisible();
  await expect(page.getByLabel("Matched direction controls").getByText("focus:custody"))
    .toBeVisible();
  await expect(page.getByLabel("Matched direction controls").getByText("duration:45s"))
    .toBeVisible();
  await expect(page.getByTestId("studio-preview-device")).toHaveAttribute("data-aspect", "9:16");

  const liveLink = page.getByTestId("studio-live-link");
  await expect(liveLink).toHaveAttribute("href", /showcase\.html\?/u);
  await expect(liveLink).toHaveAttribute("href", /proposal=/u);

  const preview = page.frameLocator("iframe");
  await expect(preview.getByTestId("infinite-fabric-showcase")).toBeVisible({ timeout: 30_000 });
  await expect(preview.locator("html")).toHaveAttribute("data-demo-edition", "social");
  await expect(preview.locator("html")).toHaveAttribute("data-demo-aspect", "9:16");
  await expect(preview.locator("html")).toHaveAttribute("data-demo-proposal-status", "encoded");
  await expect(preview.locator("html")).toHaveAttribute("data-demo-digest", /^[0-9a-f]{64}$/u);

  await expect(page.getByRole("heading", { name: "Local versions" })).toBeVisible();
  await expect(page.locator(".demo-studio__versions article")).toHaveCount(1);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "export publication" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.demonstration\.json$/u);
  const path = await download.path();
  expect(path).not.toBeNull();
  const payload = JSON.parse(await readFile(path!, "utf8")) as {
    format: string;
    proposal: { editionId: string; chapterIds: string[] };
    compiled: { aspect: string; chapterIds: string[] };
    authority: { telemetrySent: boolean; runtimeCodeGeneration: boolean };
  };
  expect(payload.format).toBe("axm-demonstration-publication/1");
  expect(payload.proposal.editionId).toBe("social");
  expect(payload.compiled.aspect).toBe("9:16");
  expect(payload.compiled.chapterIds).toEqual([
    "one-world",
    "world-remembers",
    "providers-rotate",
    "take-it-home",
  ]);
  expect(payload.authority.telemetrySent).toBe(false);
  expect(payload.authority.runtimeCodeGeneration).toBe(false);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
