import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";

function collectBrowserErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("the showcase drives the actual world, patch, classic, memory, provider, and custody stages", async ({ page }) => {
  test.setTimeout(75_000);
  const errors = collectBrowserErrors(page);

  await page.goto(`${BASE_URL}/showcase.html?autoplay=0&loop=0`, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/AXM Infinite Fabric/, { timeout: 15_000 });
  const root = page.getByTestId("infinite-fabric-showcase");
  try {
    await expect(root).toBeVisible({ timeout: 25_000 });
  } catch (error) {
    console.log(`SHOWCASE_URL=${page.url()}`);
    console.log(`SHOWCASE_TITLE=${await page.title()}`);
    console.log(`SHOWCASE_BODY=${(await page.locator("body").innerText()).slice(0, 6000)}`);
    console.log(`SHOWCASE_ERRORS=${JSON.stringify(errors)}`);
    throw error;
  }
  await expect(page.locator("html")).toHaveAttribute("data-demo-ready", "true");
  await expect(page.locator("html")).toHaveAttribute("data-demo-digest", /^[0-9a-f]{64}$/u);
  await expect(page.getByTestId("showcase-start")).toBeVisible();
  await page.getByRole("button", { name: "start muted" }).click();
  await expect(root).toHaveAttribute("data-chapter", "one-world");
  await expect(page.getByRole("heading", { name: "One world. Every game. Still yours." })).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "one-revision");
  await expect(page.getByTestId("showcase-projections")).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "say-the-change");
  await expect(page.getByTestId("showcase-make")).toBeVisible();
  await expect(page.getByText("axm-infinite-fabric-patch/0", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "world-grows");
  await expect(page.getByTestId("showcase-accepted-revision")).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "play-the-story");
  await expect(page.getByTestId("showcase-classic-montage")).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "world-remembers");
  await expect(page.getByTestId("showcase-memory")).toBeVisible();
  await expect(page.getByText("append-only world memory", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "providers-rotate");
  await expect(page.getByTestId("showcase-providers")).toBeVisible();

  await page.getByRole("button", { name: "next →" }).click();
  await expect(root).toHaveAttribute("data-chapter", "take-it-home");
  await expect(page.getByTestId("showcase-custody")).toBeVisible();
  await expect(page.getByText("DISCONNECTED", { exact: true })).toBeVisible();
  await expect(page.getByText("CONTINUING", { exact: true })).toBeVisible();

  await page.keyboard.press("KeyC");
  await expect(root).toHaveClass(/showcase-clean/);
  await page.keyboard.press("KeyC");
  await expect(root).not.toHaveClass(/showcase-clean/);

  expect(errors).toEqual([]);
});

test("a named edition and an encoded proposal resolve to source-bound runtime cuts", async ({ page }) => {
  test.setTimeout(75_000);
  const errors = collectBrowserErrors(page);

  await page.goto(`${BASE_URL}/showcase.html?edition=proof&autoplay=1&loop=0&clean=1`, {
    waitUntil: "domcontentloaded",
  });
  const html = page.locator("html");
  const root = page.getByTestId("infinite-fabric-showcase");
  await expect(root).toBeVisible({ timeout: 25_000 });
  await expect(html).toHaveAttribute("data-demo-edition", "proof");
  await expect(html).toHaveAttribute("data-demo-proposal-status", "edition");
  await expect(html).toHaveAttribute("data-demo-aspect", "16:9");
  await expect(html).toHaveAttribute("data-demo-ready", "true");
  await expect(html).toHaveAttribute("data-demo-digest", /^[0-9a-f]{64}$/u);
  await expect(root).toHaveAttribute("data-chapter", "one-revision");

  const runtime = await page.evaluate(() => window.AxmShowcaseRuntime);
  expect(runtime.chapterIds).toEqual([
    "one-revision",
    "say-the-change",
    "world-grows",
    "world-remembers",
    "providers-rotate",
    "take-it-home",
  ]);
  expect(runtime.evidenceIds.length).toBeGreaterThanOrEqual(7);
  expect(runtime.digest).toMatch(/^[0-9a-f]{64}$/u);

  await page.goto(`${BASE_URL}/showcase.html?proposal=%25%25%25%25&autoplay=0`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByTestId("infinite-fabric-showcase")).toBeVisible({ timeout: 25_000 });
  await expect(page.locator("html")).toHaveAttribute("data-demo-proposal-status", "refused");
  await expect(page.locator("html")).toHaveAttribute("data-demo-edition", "executive");
  await expect(page.getByTestId("showcase-start")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

  expect(errors).toEqual([]);
});
