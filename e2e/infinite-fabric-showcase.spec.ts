import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PW_BASE_URL ?? "http://127.0.0.1:5173";

test("the showcase drives the actual world, patch, classic, memory, provider, and custody stages", async ({ page }) => {
  test.setTimeout(75_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

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
