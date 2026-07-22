import { test, expect, type Page } from "@playwright/test";
import { resolveOpeningDecision, resolvePendingDecisions } from "./helpers";

// The Waking Tower dignity-pass receipt (legacy id `karazhan`): the SECOND bundled cartridge runs the same
// self-teaching directing loop as The First Charter, over a genuinely different
// fiction and with NO First-Charter-specific runtime code. Cold entry states the
// tower's stakes, an authored warden (Seren Vale) carries the opening via the
// hall briefing, one action reaches the shared EncounterShell, and the result
// writes back to The Waking Tower's own digest-stamped ledger.
//
// Desktop-scoped. The Waking Tower authors ZERO mobile-specific runtime, so the mobile
// oath→contract-step→EncounterShell handoff is exactly the generic path the
// First Charter mobile receipt (program-001-inhabited) and mobile-play-flow.test
// already prove; re-driving it here would test shared chrome, not this slice.
// Authored receipt: `npm run test:e2e`, not CI-gated (the directing DATA + art
// are covered by vitest: karazhan-opening / people / faces).

async function bootKarazhan(page: Page): Promise<void> {
  await page.goto("/axm-world/game/");
  await page.getByTestId("play-cartridge-karazhan").click();
  // The cold-entry opening beat establishes the tower's conflict + stakes.
  const card = page.getByTestId("pending-decision-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText(/tower|Last Surveyor|Lamplit Survey|wards/i);
  await resolveOpeningDecision(page);
}

/** Reach the shared EncounterShell via the desktop hall briefing the oath opens. */
async function enterFirstEncounter(page: Page): Promise<void> {
  const hallAction = page.getByTestId("hall-enter-contract");
  if (await hallAction.isVisible().catch(() => false)) {
    await expect(page.getByTestId("hall-dialogue-speaker")).toContainText(/Seren Vale/);
    await expect(page.getByTestId("hall-dialogue")).toContainText(/Lamplit Survey/i);
    await hallAction.click();
    return;
  }
  await page.getByTestId("view-run-graph").click();
  await page.getByTestId("play-encounter-button").click();
}

test("The Waking Tower boots as its own cartridge, an authored warden carries the opening, and the first raid records to its ledger", async ({ page, isMobile }) => {
  test.skip(Boolean(isMobile), "The bundled parity journey owns the mobile Waking Tower receipt.");
  test.slow();
  await bootKarazhan(page);

  await enterFirstEncounter(page);

  // The SAME shared EncounterShell the board and First Charter use.
  await expect(page.getByTestId("encounter-shell")).toBeVisible();
  await page.getByTestId("encs-resolve").click();
  await expect(page.getByTestId("encs-receipt")).toBeVisible();
  await page.getByTestId("encs-leave").click();
  await resolvePendingDecisions(page);

  // Exactly one entry was written under The Waking Tower's OWN authored identity — the
  // outcome grade (may be Partial: the opening raid is honestly hard) and the
  // memory state (Recorded) are distinct facts, both true of the same run.
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("cartridge-digest")).toBeVisible();
  await expect(page.getByTestId("cartridge-digest")).toHaveText(/^cart1_/);
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);

  // Survives reload — the digest-stamped writeback is real memory, not session state.
  await page.getByRole("button", { name: /resume/i }).click();
  await expect(page.getByTestId("cartridge-digest")).toHaveCount(0);
  await page.reload();
  // Resume THE WAKING TOWER specifically (its bay button now reads Resume) — not the
  // first bundled cartridge, which is First Charter.
  await page.getByTestId("play-cartridge-karazhan").click();
  await expect(page.getByTestId("pending-decision-card")).toHaveCount(0);
  await page.getByTestId("cartridge-object-button").click();
  await expect(page.getByTestId("ledger-entry")).toHaveCount(1);
});
