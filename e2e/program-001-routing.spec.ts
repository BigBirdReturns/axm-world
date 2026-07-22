import { test, expect } from "@playwright/test";
import { enterFullRuntime } from "./helpers";

// One world, one route (#71): Board / Map / Hall are surfaces of ONE navigable place.
// This receipt crosses the directed First Charter opening, then walks the full reusable
// shell loop — detail panel → map → hall → board — over the actual next contract.
// Each surface reads one projection: Cellar is recorded, Bridge Troll is next, and the
// steward's contract is the map's next pin and the detail panel's current selection.
//
// Desktop-only: the detail panel is the desktop right-rail (mobile stages it into
// explicit Board / Contract / Party steps). Authored receipt: `npm run test:e2e`.

test("the routing loop: detail → map → hall → board, one contract all the way around", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "detail panel is a desktop right-rail");
  test.slow();
  await enterFullRuntime(page);

  // The directed Hall has already recorded Cellar. The reusable shell now owns the
  // next contract, Bridge Troll, and its desktop detail rail exposes the route actions.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Bridge Troll/i);
  await expect(page.getByTestId("detail-see-on-map")).toBeVisible();
  await expect(page.getByTestId("detail-take-in-person")).toBeVisible();

  // Detail → Map. The same contract is the map's one next pin, while the directed
  // Cellar mark remains visible as prior world memory.
  await page.getByTestId("detail-see-on-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await expect(page.getByTestId("wm-recorded-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-next-bridge-troll")).toBeVisible();
  await expect(page.getByTestId("wm-state-summary")).toBeVisible();
  await expect(page.getByTestId("wm-count-next")).toHaveAttribute("data-count", "1");

  // Map → Hall. The next pin routes to the steward who now holds Bridge Troll.
  await page.getByTestId("wm-go-hall-bridge-troll").click();
  await expect(page.getByTestId("hall-scene")).toBeVisible();
  await expect(page.getByTestId("hall-contract-region-next")).toBeVisible();
  await expect(page.getByTestId("hall-party-status")).toHaveAttribute("data-projected", /success|partial|failure/);

  // Hall → Board. The Hall action selects the held contract and lands on the Board
  // with the same Bridge Troll detail open, closing the loop without a second state.
  await page.getByTestId("hall-view-on-board").click();
  await expect(page.getByTestId("contract-board")).toBeVisible();
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Bridge Troll/i);
});
