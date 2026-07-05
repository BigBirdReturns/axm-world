import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { formatMessage, MESSAGES } from "../../src/world/i18n/messages.js";

// #70 — Result / Ledger v2: the three post-action surfaces render the STORED
// structured consequence record via one shared component (ConsequenceReport), so the
// immediate overlay, the revisit modal, and the ledger mirror each other. Consumer
// only: uses facts present in `consequence`; no new mechanics/rewards/world events,
// timestamps, tabs, filters, or schema.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("result / ledger v2 (#70)", () => {
  const report = read("src/world/components/ConsequenceReport.tsx");
  const overlay = read("src/world/encounter/EncounterDirector.tsx");
  const modal = read("src/world/shell/regions.tsx");
  const ledger = read("src/world/components/CartridgeObjectPanel.tsx");

  it("ConsequenceReport renders the three structured sections, omitting empty ones", () => {
    expect(report).toContain('data-testid="consequence-objectives"');
    expect(report).toContain('data-testid="consequence-rewards"');
    expect(report).toContain('data-testid="consequence-world-changes"');
    // Each section is gated on the record actually having those facts — no invented panel.
    expect(report).toContain("consequence.objectives.length > 0");
    expect(report).toContain("consequence.rewards.length > 0");
    expect(report).toContain("consequence.worldChanges.length > 0");
    // Rendered through the catalog; never reads a stored prose/summary field.
    expect(report).toContain('t("result.objectives")');
    expect(report).toContain('t("result.rewards")');
    expect(report).toContain('t("result.worldChanges")');
    expect(report).not.toContain("rewardSummary");
  });

  it("all three post-action surfaces render the SAME shared component, so they mirror", () => {
    expect(overlay).toContain("<ConsequenceReport");
    expect(modal).toContain("<ConsequenceReport");
    expect(ledger).toContain("<ConsequenceReport");
    // ...over the STORED record's consequence, not the play report's mashed summary.
    expect(overlay).toContain("lastRecord.consequence");
    expect(modal).toContain("record.consequence");
    expect(ledger).toContain("entry.consequence");
    // The revisit modal no longer renders the old mashed rewardSummary string.
    expect(modal).not.toContain("rewardSummary");
  });

  it("the ledger makes each entry an expandable reading of its stored record", () => {
    expect(ledger).toContain('data-testid="ledger-entry-toggle"');
    expect(ledger).toContain('data-testid="ledger-entry-detail"');
    expect(ledger).toContain("aria-expanded=");
  });

  it("the new result chrome is bilingual, and world-change verbs interpolate the name", () => {
    for (const id of ["result.objectives", "result.rewards", "result.worldChanges", "result.changeRecorded", "result.changeUnlocked"] as const) {
      expect(MESSAGES.en).toHaveProperty(id);
      expect(MESSAGES["zh-Hant"]).toHaveProperty(id);
    }
    expect(formatMessage("en", "result.changeUnlocked", { name: "The Bridge Troll" })).toContain("The Bridge Troll");
    expect(formatMessage("en", "result.changeRecorded", { name: "The Cellar" })).toContain("The Cellar");
    expect(formatMessage("zh-Hant", "result.changeUnlocked", { name: "X" })).toContain("X");
    // The retired mashed-summary section ids are gone from the catalog.
    expect(MESSAGES.en).not.toHaveProperty("result.whatChanged");
    expect(MESSAGES.en).not.toHaveProperty("result.whatHappened");
  });
});
