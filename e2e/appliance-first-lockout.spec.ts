import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { openMobileContractSheet, runSelectedContract } from "./helpers";

// PR 010 — the appliance capstone receipt: first-lockout, authored in axm-arc,
// imported into world through the real boot importer, boots in the embodied
// client and renders the SAME computed cart1_ digest that arc pins. This is the
// two-client model proven end-to-end in the running UI: one cartridge, two
// expressions (arc's management surface, world's appliance), one identity.
//
// Authored receipt — runs via `npm run test:e2e`, intentionally NOT CI-gated
// (see playwright.config.ts). The digest-identity and encounter/ledger logic are
// proven in vitest (tests/world/appliance-*.test.ts); this drives the real app.

// The pin arc's conformance test fixes (axm-arc tests/cartridges/first-lockout.test.ts)
// and the file imported here is the same artifact (src/world/appliance).
const FIRST_LOCKOUT_DIGEST =
  "cart1_3cc60c051cc5a6834cbdaa60756563669850a0e7b8f4d22f947a71dd645f95c5";
const CARTRIDGE_FILE = fileURLToPath(
  new URL("../src/world/appliance/first-lockout.arc.json", import.meta.url),
);

test("first-lockout imports and boots in the appliance client under arc's digest", async ({ page }, testInfo) => {
  // first-lockout's 8-10 agent roster means resolving even one contract can
  // enqueue a long chain of relationship-tension drama cards afterward (the
  // engine's ordinary post-run simulation, scaled up by the larger party this
  // cartridge itself authors) — slower than the fixed-roster Program 001 loop
  // specs this project's `test.slow()` idiom was written for.
  test.slow();
  await page.goto("/axm-world/game/");

  // PR 058 — a11y pass (arc 078/068 parity): the bay screen is a named landmark
  // region, not a mute full-bleed div — the same fact its visible heading
  // already carries, just exposed to assistive tech.
  const bayRegion = page.getByRole("region", { name: /Cartridge worlds that remember/i });
  await expect(bayRegion).toBeVisible();

  // Import through the real appliance seam — the visually-hidden boot file input.
  await page.setInputFiles('[data-testid="open-cartridge"]', CARTRIDGE_FILE);

  // It lands in the bay as an imported cartridge, under its own authored name.
  const entry = page.getByTestId("cartridge-entry-first-lockout");
  await expect(entry).toBeVisible();
  await expect(entry).toContainText(/First Lockout/i);

  // PR 052 — bay custody honesty: even an ordinary (non-program-of-record) bay
  // entry names its content digest. Short form visible, full digest carried
  // verbatim in title and aria-label — same computed value arc pins, never
  // invented chrome.
  const bayDigest = entry.getByTestId("bay-digest");
  await expect(bayDigest).toBeVisible();
  await expect(bayDigest).toHaveText(new RegExp(FIRST_LOCKOUT_DIGEST.slice(0, 12)));
  await expect(bayDigest).toHaveAttribute("title", FIRST_LOCKOUT_DIGEST);
  await expect(bayDigest).toHaveAttribute("aria-label", new RegExp(FIRST_LOCKOUT_DIGEST));

  // PR 053 — import preflight honesty: the boot screen reports what the
  // import just did (new / update / duplicate) at the one import seam,
  // computed before/alongside the write, never a different story than the
  // bay entry itself now shows. This is a first-time import of a cartridge
  // never seen in this bay before, so the action is "new".
  const preflight = page.getByTestId("bay-import-preflight");
  await expect(preflight).toBeVisible();
  await expect(preflight).toHaveAttribute("role", "status");
  const preflightDigest = page.getByTestId("bay-import-preflight-digest");
  await expect(preflightDigest).toHaveText(new RegExp(FIRST_LOCKOUT_DIGEST.slice(0, 12)));
  await expect(preflightDigest).toHaveAttribute("title", FIRST_LOCKOUT_DIGEST);
  await expect(preflightDigest).toHaveAttribute("aria-label", new RegExp(FIRST_LOCKOUT_DIGEST));
  await expect(page.getByTestId("bay-import-preflight-action")).toContainText(/new/i);

  // Enter it. This Arc authors no opening, so we land
  // straight in the embodied shell — no opening decision to resolve.
  await page.getByTestId("play-cartridge-first-lockout").click();

  // Program identity is persistent desktop shell chrome. Mobile deliberately
  // keeps that vertical budget on its staged play surface.
  const strip = page.getByTestId("program-identity-strip");
  if (testInfo.project.name === "mobile") {
    await expect(strip).toHaveCount(0);
    await expect(page.getByTestId("cartridge-title")).toContainText(/First Lockout/i);
  } else {
    await expect(strip).toBeVisible();
    await expect(strip).toContainText(/First Lockout/i);
    await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", FIRST_LOCKOUT_DIGEST);
    // first-lockout is imported, NOT world's program of record.
    await expect(page.getByTestId("strip-program")).toHaveCount(0);
  }

  // Mobile's Board does not manufacture a player selection. Open the Up next
  // Contract sheet through the required card action before reading its party.
  await openMobileContractSheet(page);

  // The shared engine's frozen legacy founding law reads first-lockout's own
  // encounters, which need an 8-10 agent party. Desktop exposes the persistent
  // detail rail; mobile proves the same recommendation on its visible mission stage.
  if (testInfo.project.name === "mobile") {
    const fielded = await page.getByTestId("mobile-mission-party").locator("figure").count();
    expect(fielded).toBeGreaterThanOrEqual(8);
    expect(fielded).toBeLessThanOrEqual(10);
  } else {
    const partyCount = page.getByTestId("party-count");
    await expect(partyCount).toBeVisible();
    await expect(partyCount).toContainText(/need 8–10/);
    const partyCountText = await partyCount.innerText();
    const fielded = Number(partyCountText.match(/Party (\d+)/)?.[1] ?? 0);
    expect(fielded).toBeGreaterThanOrEqual(8);
  }

  // The run button honestly reflects that the party fits the requirement.
  await expect(page.getByTestId("play-encounter-button")).toBeEnabled();

  // PR 055 — the neutral-skin default, live: first-lockout is unknown to the
  // theme seam, so Shell's palette-scope effect never sets <html data-cartridge>.
  await expect(page.locator("html")).not.toHaveAttribute("data-cartridge");

  await page.screenshot({
    path: testInfo.outputPath("first-lockout-appliance.png"),
    fullPage: true,
  });

  // Resolve the auto-seeded party's contract for real; the run is committed and
  // saved at that point regardless of later relationship-drama cards.
  await runSelectedContract(page);

  // Reload the boot route and read the same persisted save slot.
  await page.goto("/axm-world/game/");

  const returnedEntry = page.getByTestId("cartridge-entry-first-lockout");
  await expect(returnedEntry).toBeVisible();
  const memory = returnedEntry.getByTestId("bay-memory");
  await expect(memory).toBeVisible();
  await expect(memory).toContainText(/1 recorded/i);
  await expect(memory).toContainText(/The Gate-Warden/);

  const saveState = returnedEntry.getByTestId("bay-save-state");
  await expect(saveState).toBeVisible();
  await expect(saveState).toContainText(/resumable/i);

  // A bundled cartridge never played this session has no ledger and remains fresh.
  const karazhanEntry = page.getByTestId("cartridge-entry-karazhan");
  await expect(karazhanEntry).toBeVisible();
  await expect(karazhanEntry.getByTestId("bay-memory")).toHaveCount(0);
  const karazhanSaveState = karazhanEntry.getByTestId("bay-save-state");
  await expect(karazhanSaveState).toBeVisible();
  await expect(karazhanSaveState).toContainText(/fresh/i);

  await page.screenshot({
    path: testInfo.outputPath("first-lockout-bay-memory.png"),
    fullPage: true,
  });
});
