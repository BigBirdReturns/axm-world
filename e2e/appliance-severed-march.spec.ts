import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { openMobileContractSheet, runSelectedContract } from "./helpers";

// PR 060 — the RFC_APPLIANCE_EXPANSION capstone receipt: a cartridge world has
// NEVER named (arc's `severed-march`, a war-campaign arc authored purely to
// prove the generic appliance path — no runtime source names it anywhere)
// imports through the real bay UI, boots as an appliance, plays a real
// encounter, and records to the digest-keyed ledger — with ZERO pinned
// constants added to any runtime path. Every fact this spec checks is read
// off the live app: the digest, the roster requirement, the theme (none),
// the memory it leaves behind. The only pin here is the drift guard below,
// which gates nothing at runtime — it only fails this spec if either
// client's digest computation ever drifts apart.

// Pinned from axm-arc tests/cartridges/severed-march.test.ts — if either
// client's computation drifts, this fails; it gates nothing at runtime.
const ARC_PINNED_DIGEST =
  "cart1_c35440901a422f26d846ea6a591ed236fbaf1786fcd21e04f19f318feda893a9";
const CARTRIDGE_FILE = fileURLToPath(
  new URL("./fixtures/severed-march.arc.json", import.meta.url),
);

test("severed-march (never named in world's source) imports, boots, plays, and records under arc's own digest", async ({ page }, testInfo) => {
  test.slow();
  await page.goto("/axm-world/game/");

  const bayRegion = page.getByRole("region", { name: /Cartridge worlds that remember/i });
  await expect(bayRegion).toBeVisible();

  await page.setInputFiles('[data-testid="open-cartridge"]', CARTRIDGE_FILE);

  const entry = page.getByTestId("cartridge-entry-severed-march");
  await expect(entry).toBeVisible();
  await expect(entry).toContainText(/The Severed March/i);

  const bayDigest = entry.getByTestId("bay-digest");
  await expect(bayDigest).toBeVisible();
  await expect(bayDigest).toHaveText(new RegExp(ARC_PINNED_DIGEST.slice(0, 12)));
  await expect(bayDigest).toHaveAttribute("title", ARC_PINNED_DIGEST);
  await expect(bayDigest).toHaveAttribute("aria-label", new RegExp(ARC_PINNED_DIGEST));

  const preflight = page.getByTestId("bay-import-preflight");
  await expect(preflight).toBeVisible();
  await expect(preflight).toHaveAttribute("role", "status");
  const preflightDigest = page.getByTestId("bay-import-preflight-digest");
  await expect(preflightDigest).toHaveText(new RegExp(ARC_PINNED_DIGEST.slice(0, 12)));
  await expect(preflightDigest).toHaveAttribute("title", ARC_PINNED_DIGEST);
  await expect(preflightDigest).toHaveAttribute("aria-label", new RegExp(ARC_PINNED_DIGEST));
  await expect(page.getByTestId("bay-import-preflight-action")).toContainText(/new/i);

  // This Arc authors no opening, so it lands directly in the embodied shell.
  await page.getByTestId("play-cartridge-severed-march").click();

  // Program identity is persistent desktop shell chrome. Mobile deliberately
  // keeps that vertical budget on its staged play surface.
  const strip = page.getByTestId("program-identity-strip");
  if (testInfo.project.name === "mobile") {
    await expect(strip).toHaveCount(0);
    await expect(page.getByTestId("cartridge-title")).toContainText(/The Severed March/i);
  } else {
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/The Severed March/i);
    await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", ARC_PINNED_DIGEST);
    // severed-march is imported, NOT a program of record.
    await expect(page.getByTestId("strip-program")).toHaveCount(0);
  }

  // Unknown cartridges keep the neutral house skin.
  await expect(page.locator("html")).not.toHaveAttribute("data-cartridge");

  // Mobile's Board does not manufacture a player selection. Open the Up next
  // Contract sheet through the required card action before reading its party.
  await openMobileContractSheet(page);

  if (testInfo.project.name === "mobile") {
    const fielded = await page.getByTestId("mobile-mission-party").locator("figure").count();
    expect(fielded).toBeGreaterThanOrEqual(2);
    expect(fielded).toBeLessThanOrEqual(4);
  } else {
    const partyCount = page.getByTestId("party-count");
    await expect(partyCount).toBeVisible();
    await expect(partyCount).toContainText(/need 2–4/);
    const partyCountText = await partyCount.innerText();
    const fielded = Number(partyCountText.match(/Party (\d+)/)?.[1] ?? 0);
    expect(fielded).toBeGreaterThanOrEqual(2);
    expect(fielded).toBeLessThanOrEqual(4);
  }

  await expect(page.getByTestId("play-encounter-button")).toBeEnabled();

  await page.screenshot({
    path: testInfo.outputPath("severed-march-appliance.png"),
    fullPage: true,
  });

  await runSelectedContract(page);

  // Reload the boot route and read the same persisted save slot.
  await page.goto("/axm-world/game/");

  const returnedEntry = page.getByTestId("cartridge-entry-severed-march");
  await expect(returnedEntry).toBeVisible();
  const memory = returnedEntry.getByTestId("bay-memory");
  await expect(memory).toBeVisible();
  await expect(memory).toContainText(/1 recorded/i);

  const saveState = returnedEntry.getByTestId("bay-save-state");
  await expect(saveState).toBeVisible();
  await expect(saveState).toContainText(/resumable/i);

  // Neither bundled cartridge was touched by the imported run.
  const karazhanEntry = page.getByTestId("cartridge-entry-karazhan");
  await expect(karazhanEntry).toBeVisible();
  await expect(karazhanEntry.getByTestId("bay-memory")).toHaveCount(0);
  await expect(karazhanEntry.getByTestId("bay-save-state")).toContainText(/fresh/i);

  const firstCharterEntry = page.getByTestId("cartridge-entry-first-charter");
  await expect(firstCharterEntry).toBeVisible();
  await expect(firstCharterEntry.getByTestId("bay-ledger-summary-first-charter")).toContainText(/no runs recorded/i);

  await page.screenshot({
    path: testInfo.outputPath("severed-march-bay-memory.png"),
    fullPage: true,
  });
});
