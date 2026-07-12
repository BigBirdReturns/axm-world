import path from "node:path";
import { expect, test } from "@playwright/test";

test("enterprise cartridge completes and reloads its receipt offline", async ({ page, context }) => {
  await page.goto("./");
  await page.setInputFiles('[data-testid="open-cartridge"]', path.resolve("e2e/fixtures/enterprise-decision.json"));
  await expect(page.getByTestId("enterprise-cartridge-payments-release")).toContainText("Payments Release Decision");
  await page.getByTestId("play-enterprise-payments-release").click();
  await expect(page.getByTestId("enterprise-client")).toContainText("Staff the reconciliation release");
  await page.getByRole("button", { name: "Authorize selection" }).click();
  await expect(page.getByTestId("enterprise-receipt")).toContainText("genesis://observed/world-reference");

  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.getByTestId("play-enterprise-payments-release").click();
  await expect(page.getByTestId("enterprise-receipt")).toContainText("Decision receipt");
});
