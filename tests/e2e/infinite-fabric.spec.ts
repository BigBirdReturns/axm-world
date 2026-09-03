import { expect, test } from "@playwright/test";

test("Tiny World accepts structured patches and survives reload", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.goto("/fabric.html");
  await expect(page.getByTestId("infinite-fabric-tiny-world")).toBeVisible();

  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await page.keyboard.press("KeyE");
  await page.getByRole("button", { name: "BOARD", exact: true }).click();
  await expect(page.getByText("Collected: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("collectible.collected", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "MAKE", exact: true }).click();
  await page.getByRole("button", { name: "COMPILE PATCH", exact: true }).click();
  await expect(page.getByText("GHOST PREVIEW", { exact: true })).toBeVisible();
  await expect(page.getByText(/cell:village:north/)).toBeVisible();
  await expect(page.getByText("law changes: false", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ACCEPT REVISION", exact: true }).click();

  await page.getByRole("button", { name: "MAP", exact: true }).click();
  await expect(page.getByText("One world, 2 bounded cells", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "MAKE", exact: true }).click();
  await page.getByRole("button", { name: "COMPILE PATCH", exact: true }).click();
  await expect(page.getByText("entity:weather:storm-front.active", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ACCEPT REVISION", exact: true }).click();

  await page.getByRole("button", { name: "BOARD", exact: true }).click();
  await expect(page.getByText("authoring.patch.accepted", { exact: true }).first()).toBeVisible();
  const revisionBeforeReload = await page.locator("header span").first().textContent();

  await page.reload();
  await expect(page.getByTestId("infinite-fabric-tiny-world")).toBeVisible();
  await page.getByRole("button", { name: "MAP", exact: true }).click();
  await expect(page.getByText("One world, 2 bounded cells", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "BOARD", exact: true }).click();
  await expect(page.locator("header span").first()).toHaveText(revisionBeforeReload ?? "");

  expect(browserErrors).toEqual([]);
});
