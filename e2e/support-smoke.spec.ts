import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePendingDecisions } from "./helpers";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORCHARD_RUN = path.join(ROOT, "cartridges", "clean-room", "orchard-at-low-tide.changed.run.json");

function recordedChallengeCount(runPath: string): number {
  const portable = JSON.parse(fs.readFileSync(runPath, "utf8")) as {
    engine?: { game?: unknown };
  };
  if (typeof portable.engine?.game !== "string") {
    throw new Error(`Support fixture ${runPath} has no serialized engine game.`);
  }
  const game = JSON.parse(portable.engine.game) as {
    organization?: {
      agents?: Record<string, {
        assignmentHistory?: Array<{ challengeId?: unknown }>;
      }>;
    };
  };
  const challengeIds = new Set<string>();
  for (const agent of Object.values(game.organization?.agents ?? {})) {
    for (const assignment of agent.assignmentHistory ?? []) {
      if (typeof assignment.challengeId === "string" && assignment.challengeId) {
        challengeIds.add(assignment.challengeId);
      }
    }
  }
  if (challengeIds.size === 0) {
    throw new Error(`Support fixture ${runPath} contains no recorded challenge assignments.`);
  }
  return challengeIds.size;
}

const ORCHARD_RECORDED_CHALLENGES = recordedChallengeCount(ORCHARD_RUN);

async function finishEntry(page: Page): Promise<void> {
  const transition = page.getByTestId("cartridge-enter-transition");
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await page.getByTestId("engine-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("pending-decision-card").isVisible().catch(() => false)) {
      await resolvePendingDecisions(page);
      continue;
    }
    const skip = transition.getByRole("button", { name: /skip entry/i });
    if (await skip.isVisible().catch(() => false)) await skip.click();
    await page.waitForTimeout(25);
  }
  await expect(page.getByTestId("engine-shell")).toBeVisible();
  await resolvePendingDecisions(page);
}

test("supported browser can boot, receive an exact run, and render neutral state", async ({ page }) => {
  await page.goto("/axm-world/game/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("rodoh-cartridge-bay")).toBeVisible();
  await expect(page.locator('[data-testid^="cartridge-entry-"]')).toHaveCount(5);

  await page.getByTestId("open-cartridge").setInputFiles(ORCHARD_RUN);
  await expect(page.getByTestId("import-success")).toContainText(/Exact run restored/i);
  const entry = page.getByTestId("cartridge-entry-orchard-at-low-tide");
  await expect(entry).toBeVisible();
  await expect(entry).not.toHaveAttribute("data-program-id", /.+/);
  await expect(entry.getByTestId("trust-chip-imported-unsigned")).toBeVisible();

  await page.getByTestId("play-cartridge-orchard-at-low-tide").click();
  await finishEntry(page);
  await expect(page.locator("html")).not.toHaveAttribute("data-cartridge", /.+/);
  await expect(page.getByText("Rootstock", { exact: true })).toBeVisible();
  await page.getByTestId("view-map").click();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await page.getByTestId("world-map").isVisible().catch(() => false)) break;
    const back = page.getByTestId("mobile-step-back");
    if (await back.isVisible().catch(() => false)) await back.click();
    await page.waitForTimeout(25);
  }
  await expect(page.getByTestId("world-map")).toBeVisible();
  await expect(page.getByTestId("wm-progress")).toHaveAttribute(
    "data-recorded",
    String(ORCHARD_RECORDED_CHALLENGES),
  );
});
