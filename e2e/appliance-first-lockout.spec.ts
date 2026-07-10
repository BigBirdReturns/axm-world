import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";

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
  await page.goto("/axm-world/game/");

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
  const preflightDigest = page.getByTestId("bay-import-preflight-digest");
  await expect(preflightDigest).toHaveText(new RegExp(FIRST_LOCKOUT_DIGEST.slice(0, 12)));
  await expect(preflightDigest).toHaveAttribute("title", FIRST_LOCKOUT_DIGEST);
  await expect(preflightDigest).toHaveAttribute("aria-label", new RegExp(FIRST_LOCKOUT_DIGEST));
  await expect(page.getByTestId("bay-import-preflight-action")).toContainText(/new/i);

  // Enter it. An imported cartridge carries no authored opening, so we land
  // straight in the embodied shell — no opening decision to resolve.
  await page.getByTestId("play-cartridge-first-lockout").click();

  // The embodied shell loaded, carrying first-lockout's own authored name.
  const strip = page.getByTestId("program-identity-strip");
  await expect(strip).toBeVisible();
  await expect(strip).toContainText(/First Lockout/i);

  // THE PROOF: the in-shell identity is the exact computed digest arc pins —
  // same content, same identity, a different client (the two-client model, live).
  await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", FIRST_LOCKOUT_DIGEST);

  // Honesty check: first-lockout is imported, NOT world's program of record, so
  // the "PROGRAM 001 / program of record" framing must not attach to it.
  await expect(page.getByTestId("strip-program")).toHaveCount(0);

  // PR 054 — the generic appliance boot: first-lockout's own encounters all
  // need an 8-10 agent party (bootstrap's flat default of 6 could never field
  // one). The cold-start selection auto-seeds the party with the engine's own
  // recommendation, so the shell landing here — no extra clicks — is itself
  // the receipt that the fresh-booted org was sized from the cartridge's real
  // requirement, not a fixed constant.
  const partyCount = page.getByTestId("party-count");
  await expect(partyCount).toBeVisible();
  await expect(partyCount).toContainText(/need 8–10/);
  const partyCountText = await partyCount.innerText();
  const fielded = Number(partyCountText.match(/Party (\d+)/)?.[1] ?? 0);
  expect(fielded).toBeGreaterThanOrEqual(8);

  // The run button honestly reflects that the party fits the requirement: it
  // is enabled (not stuck on "ASSIGN 8–10"), i.e. the encounter is actually
  // attemptable from a fresh boot — the thing the old flat default broke.
  await expect(page.getByTestId("run-contract-button")).toBeEnabled();

  // PR 055 — the neutral-skin default, live: first-lockout is unknown to the
  // theme seam (src/world/themes/select.ts), so Shell's palette-scope effect
  // never sets <html data-cartridge>. Absence of the attribute IS the neutral
  // skin — first-lockout must never render wearing Karazhan's or First
  // Charter's clothes.
  await expect(page.locator("html")).not.toHaveAttribute("data-cartridge");

  await page.screenshot({
    path: testInfo.outputPath("first-lockout-appliance.png"),
    fullPage: true,
  });
});
