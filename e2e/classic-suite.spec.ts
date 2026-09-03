import { expect, test } from "@playwright/test";

const trialNames = [
  "Balance of Oaths",
  "Wall of Terms",
  "Serpent of Memory",
  "Swarm at the Gate",
  "Courier Beyond the Charter",
] as const;

test("The First Charter exposes five playable classic trials", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/classics.html");
  await expect(page.getByTestId("first-charter-classic-suite")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Five Classic Trials" })).toBeVisible();

  for (const trialName of trialNames) {
    await expect(page.getByRole("heading", { name: trialName })).toBeVisible();
  }

  await page.getByRole("button", { name: "ENTER TRIAL" }).first().click();
  await expect(page.getByTestId("classic-game-balance-of-oaths")).toBeVisible();
  await page.keyboard.press("KeyS");
  await page.keyboard.press("KeyR");
  await page.getByRole("button", { name: "ARCHIVE" }).click();
  await expect(page.getByTestId("first-charter-classic-suite")).toBeVisible();

  const wallCard = page.getByRole("heading", { name: "Wall of Terms" }).locator("xpath=ancestor::article");
  await wallCard.getByRole("button", { name: /ENTER TRIAL|PLAY AGAIN/ }).click();
  await expect(page.getByTestId("classic-game-wall-of-terms")).toBeVisible();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "ARCHIVE" }).click();

  expect(errors).toEqual([]);
});
