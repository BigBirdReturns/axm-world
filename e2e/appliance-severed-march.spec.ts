import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { runSelectedContract } from "./helpers";

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
//
// Authored receipt — runs via `npm run test:e2e`, intentionally NOT CI-gated.

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

  // Import through the real appliance seam — the visually-hidden boot file input.
  // This is the exact mechanism the first-lockout receipt uses; severed-march is
  // fed through it the same way any player's own cartridge would be.
  await page.setInputFiles('[data-testid="open-cartridge"]', CARTRIDGE_FILE);

  // It lands in the bay as an imported cartridge, under its own authored name —
  // computed from `meta.id`/`meta.name`, never a name this repo hardcodes.
  const entry = page.getByTestId("cartridge-entry-severed-march");
  await expect(entry).toBeVisible();
  await expect(entry).toContainText(/The Severed March/i);

  // PR 052 — bay custody honesty: the bay names the computed content digest.
  // Short form visible, full digest carried verbatim in title/aria-label — the
  // SAME value arc's own conformance suite pins for this exact file.
  const bayDigest = entry.getByTestId("bay-digest");
  await expect(bayDigest).toBeVisible();
  await expect(bayDigest).toHaveText(new RegExp(ARC_PINNED_DIGEST.slice(0, 12)));
  await expect(bayDigest).toHaveAttribute("title", ARC_PINNED_DIGEST);
  await expect(bayDigest).toHaveAttribute("aria-label", new RegExp(ARC_PINNED_DIGEST));

  // PR 053 — import preflight honesty: the boot screen reports the incoming
  // digest and the new/update/duplicate verdict at the one import seam. This is
  // a first-time import of a cartridge this bay has never seen, so "new".
  const preflight = page.getByTestId("bay-import-preflight");
  await expect(preflight).toBeVisible();
  await expect(preflight).toHaveAttribute("role", "status");
  const preflightDigest = page.getByTestId("bay-import-preflight-digest");
  await expect(preflightDigest).toHaveText(new RegExp(ARC_PINNED_DIGEST.slice(0, 12)));
  await expect(preflightDigest).toHaveAttribute("title", ARC_PINNED_DIGEST);
  await expect(preflightDigest).toHaveAttribute("aria-label", new RegExp(ARC_PINNED_DIGEST));
  await expect(page.getByTestId("bay-import-preflight-action")).toContainText(/new/i);

  // Enter it. An imported cartridge carries no authored opening, so we land
  // straight in the embodied shell — no opening decision to resolve.
  await page.getByTestId("play-cartridge-severed-march").click();

  // The embodied shell loaded, carrying severed-march's own authored name.
  const strip = page.getByTestId("program-identity-strip");
  await expect(strip).toBeVisible();
  await expect(strip).toContainText(/The Severed March/i);

  // THE PROOF: the in-shell identity is the exact computed digest arc pins for
  // this same file — one cartridge, two independent clients, one identity.
  await expect(page.getByTestId("strip-digest")).toHaveAttribute("title", ARC_PINNED_DIGEST);

  // Honesty check: severed-march is imported, NOT a program of record, so the
  // "PROGRAM 001" framing must not attach to it.
  await expect(page.getByTestId("strip-program")).toHaveCount(0);

  // PR 055 — the neutral-skin default, live: severed-march is unknown to the
  // theme seam (src/world/themes/select.ts), so Shell's palette-scope effect
  // never sets <html data-cartridge>. Absence of the attribute IS the neutral
  // skin — a second unknown cartridge, same guard as first-lockout's.
  await expect(page.locator("html")).not.toHaveAttribute("data-cartridge");

  // PR 054 — the generic appliance boot: severed-march's own challenges top out
  // at a 4-6 agent roster requirement (`applianceRosterSize` reads the largest
  // maxAgents across all its challenges — 6, from walled-market-town/mountain-
  // beacon/traitor-lords-keep/the-sever). The fresh-booted org is sized from
  // that authored declaration, never a hardcoded constant. The cold-start
  // selection lands on the arc's own first reachable challenge — the
  // crossroads-picket (2-4 agents, no role requirements, the opening fight of
  // Chapter I) — and auto-seeds the party with the engine's own recommendation,
  // so the shell landing here, no extra clicks, is itself the receipt that a
  // cartridge world never named boots exactly as generously as one world does
  // know by name.
  const partyCount = page.getByTestId("party-count");
  await expect(partyCount).toBeVisible();
  await expect(partyCount).toContainText(/need 2–4/);
  const partyCountText = await partyCount.innerText();
  const fielded = Number(partyCountText.match(/Party (\d+)/)?.[1] ?? 0);
  expect(fielded).toBeGreaterThanOrEqual(2);
  expect(fielded).toBeLessThanOrEqual(4);

  // The run button honestly reflects that the party fits the requirement: it
  // is enabled — the encounter is genuinely attemptable from a fresh boot.
  await expect(page.getByTestId("play-encounter-button")).toBeEnabled();

  await page.screenshot({
    path: testInfo.outputPath("severed-march-appliance.png"),
    fullPage: true,
  });

  // PR 056 — per-cartridge memory, listed: resolve the auto-seeded party's
  // contract for real (the shared helper every other loop spec uses) — the run
  // is committed (and saved, via useArcWorld's save-on-change effect) at that
  // point.
  await runSelectedContract(page);

  // Return to the bay by reloading the boot route (the same idiom the
  // first-lockout receipt uses), reading the SAME persisted save slot a real
  // "Leave" would land on.
  await page.goto("/axm-world/game/");

  // Back in the bay: the entry now names what its own ledger remembers —
  // memory keyed to THIS digest, read the same way every other bay entry is.
  const returnedEntry = page.getByTestId("cartridge-entry-severed-march");
  await expect(returnedEntry).toBeVisible();
  const memory = returnedEntry.getByTestId("bay-memory");
  await expect(memory).toBeVisible();
  await expect(memory).toContainText(/1 recorded/i);

  // PR 057 — save summaries in the bay: the played entry now has a genuine
  // save slot, so it reads resumable.
  const saveState = returnedEntry.getByTestId("bay-save-state");
  await expect(saveState).toBeVisible();
  await expect(saveState).toContainText(/resumable/i);

  // Honesty check the other way, and the cross-contamination check this
  // capstone specifically asks for: neither of world's own cartridges — the
  // program of record (First Charter) nor the bundled second cartridge
  // (Karazhan) — was touched by any of the above. Karazhan was never played
  // this session, so it has no ledger/save to speak of.
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
