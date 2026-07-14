import { test, expect, type Page } from "@playwright/test";
import { resolveOpeningDecision, resolvePendingDecisions } from "./helpers";
import { fileURLToPath } from "node:url";

// The Library slice receipt: the bay grown into a collection you hold. A stranger
// opening the app sees cartridges as durable objects — identity, provenance,
// memory, resume — shelved by provenance, and can import a third cartridge that
// joins the shelf as an equal. The honest-action rule holds for EVERY cartridge:
// a resumable one says Resume, never the old classic row that lied "Enter" while
// silently resuming. Authored receipt (`npm run test:e2e`), not CI-gated; the
// framing + honesty are pinned by vitest (library.test.ts).

const THIRD = fileURLToPath(new URL("./fixtures/severed-march.arc.json", import.meta.url));

test("the Library shows cartridges as durable objects and a third joins the shelf", async ({ page }) => {
  await page.goto("/axm-world/game/");

  // A named, counted collection shelved by provenance.
  await expect(page.getByTestId("library")).toBeVisible();
  await expect(page.getByTestId("library-count")).toBeVisible();
  await expect(page.getByTestId("library-shelf-bundled")).toBeVisible();
  // Fresh install: nothing imported, so no empty imported shelf (honest omission).
  await expect(page.getByTestId("library-shelf-imported")).toHaveCount(0);

  // Both bundled cartridges present as durable objects, each naming its identity.
  await expect(page.getByTestId("cartridge-entry-first-charter")).toBeVisible();
  await expect(page.getByTestId("cartridge-entry-karazhan")).toBeVisible();
  await expect(page.getByTestId("bay-cartridge-digest-first-charter")).toContainText(/^cart1_/);

  // Import a third, independently-authored cartridge — it joins the imported
  // shelf with its own identity and (unsigned) trust, and a fresh Enter action.
  await page.getByTestId("open-cartridge").setInputFiles(THIRD);
  await expect(page.getByTestId("import-success")).toBeVisible();
  await expect(page.getByTestId("library-shelf-imported")).toBeVisible();
  const third = page.getByTestId("cartridge-entry-severed-march");
  await expect(third).toBeVisible();
  await expect(third.getByTestId("trust-chip-imported-unsigned")).toBeVisible();
  await expect(page.getByTestId("play-cartridge-severed-march")).toContainText(/Enter/i);
  await expect(page.getByTestId("library-count")).toContainText("3");

  // Remove is honest custody: only imported cartridges can be removed, and doing
  // so returns the library to its bundled floor.
  await third.getByTestId("remove-cartridge-severed-march").click();
  await expect(page.getByTestId("cartridge-entry-severed-march")).toHaveCount(0);
  await expect(page.getByTestId("library-count")).toContainText("2");
});

async function leaveToLibrary(page: Page): Promise<void> {
  await page.getByTestId("cartridge-object-button").click();
  await page.getByRole("button", { name: /leave/i }).click();
  await expect(page.getByTestId("library")).toBeVisible();
}

test("playing a bundled cartridge turns its Library action honestly to Resume", async ({ page }, testInfo) => {
  // Desktop-scoped: the in-world hall handoff is the generic path other receipts
  // prove; here the Library-side honest Enter→Resume flip is the subject.
  test.skip(testInfo.project.name === "mobile", "in-world handoff is generic — proven by the inhabited receipts");
  test.slow();
  await page.goto("/axm-world/game/");

  // Karazhan (not the program of record) is fresh — its card honestly says Enter.
  await expect(page.getByTestId("play-cartridge-karazhan")).toContainText(/Enter/i);
  await page.getByTestId("play-cartridge-karazhan").click();
  await resolveOpeningDecision(page);
  if (!(await page.getByTestId("hall-scene").count())) {
    if (await page.getByTestId("view-hall").count()) await page.getByTestId("view-hall").click();
  }
  await page.getByTestId("hall-enter-contract").click();
  await expect(page.getByTestId("encounter-shell")).toBeVisible();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();
  await page.getByTestId("encs-leave").click();
  await resolvePendingDecisions(page);

  await leaveToLibrary(page);

  // The card now tells the truth: Resume, and it remembers what it recorded.
  const kzCard = page.getByTestId("cartridge-entry-karazhan");
  await expect(kzCard.getByTestId("play-cartridge-karazhan")).toContainText(/Resume/i);
  await expect(kzCard.getByTestId("bay-save-state")).toContainText(/Resumable/i);
});
