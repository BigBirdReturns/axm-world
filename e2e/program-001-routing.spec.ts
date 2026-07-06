import { test, expect } from "@playwright/test";
import { enterCartridge } from "./helpers";

// One world, one route (#71): Board / Map / Hall are surfaces of ONE navigable place.
// This receipt walks the full loop — detail panel → map → hall → board — proving each
// surface hands the player to the next through the same view switch and the same
// shared derivations (the steward's contract IS the map's next pin IS the detail's
// selection). Routing only: no new mechanics; the same engine state under every hop.
//
// Desktop-only: the detail panel is the desktop right-rail (mobile stages it into
// steps). Authored receipt: `npm run test:e2e`, not CI-gated.

test("the routing loop: detail → map → hall → board, one contract all the way around", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "detail panel is a desktop right-rail");
  test.slow();
  await enterCartridge(page);

  // Cold start auto-selects the steward's next contract (The Cellar): the detail
  // panel is the action hub — it can route to the map, and (because this IS the
  // steward's contract, same deriveHallView) to the hall.
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
  await expect(page.getByTestId("detail-see-on-map")).toBeVisible();
  await expect(page.getByTestId("detail-take-in-person")).toBeVisible();

  // Detail → Map. The same contract is the map's one "next" pin, and the header
  // roll-up counts the states the pins below already show.
  await page.getByTestId("detail-see-on-map").click();
  await expect(page.getByTestId("world-map")).toBeVisible();
  await expect(page.getByTestId("wm-next-cellar")).toBeVisible();
  await expect(page.getByTestId("wm-state-summary")).toBeVisible();
  await expect(page.getByTestId("wm-count-next")).toHaveAttribute("data-count", "1");

  // Map → Hall. The next pin routes to the steward who holds that same contract.
  await page.getByTestId("wm-go-hall-cellar").click();
  await expect(page.getByTestId("hall-scene")).toBeVisible();
  await expect(page.getByTestId("hall-contract-region-next")).toBeVisible();
  // The hall's party status is the board's own projection (evaluateParty).
  await expect(page.getByTestId("hall-party-status")).toHaveAttribute("data-projected", /success|partial|failure/);

  // Hall → Board. "View on board" selects the held contract and lands on the board
  // with its detail open — the loop closes on the same contract it started with.
  await page.getByTestId("hall-view-on-board").click();
  await expect(page.getByTestId("contract-board")).toBeVisible();
  await expect(page.getByTestId("selected-contract-title")).toContainText(/Cellar/i);
});
