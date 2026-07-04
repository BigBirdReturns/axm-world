import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { formatMessage, MESSAGES } from "../../src/world/i18n/messages.js";

// #68 — Encounter staging preview. Before commitment, the encounter brief stages the
// confrontation with bodies: the committed party facing the site's threat, with the
// SAME readiness projection coloring the fit between them. Existing data only — no new
// combat, positioning, enemy mechanics, resolver, art, or schema.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("encounter staging preview (#68)", () => {
  const shell = read("src/world/encounter/EncounterShell.tsx");

  it("stages the confrontation: who is going in, what they face, and the fit between", () => {
    expect(shell).toContain('data-testid="encs-staging"');
    expect(shell).toContain('data-testid="encs-staging-party"');   // who is going in
    expect(shell).toContain('data-testid="encs-staging-threat"');  // what they face
    expect(shell).toContain('data-testid="encs-staging-fit"');     // why the fit reads
  });

  it("the party bodies are the committed squad; the threat is the site — existing data only", () => {
    expect(shell).toContain("world.roster.filter((m) => committedSet.has(m.id))"); // stagedParty
    expect(shell).toContain("encs-staging-body-");
    expect(shell).toContain("spec.location.site");
    expect(shell).toContain("spec.difficulty");
  });

  it("the fit is the SAME projection the deploy control reads — felt, not recalculated", () => {
    // Reuses readiness.projectedOutcome (via projectedOutcome) + OUTCOME_COLOR; it does
    // NOT run a second evaluateParty for the staging.
    expect(shell).toContain("const stagingTone = OUTCOME_COLOR[projectedOutcome]");
    expect(shell).toContain("data-projected={projectedOutcome}");
    // Only the two pre-existing evaluateParty calls remain (base gate + live readiness).
    expect((shell.match(/world\.evaluateParty\(/g) ?? []).length).toBe(2);
  });

  it("the staging chrome is bilingual", () => {
    expect(formatMessage("en", "encounterShell.staging")).toBe("Staging");
    expect(formatMessage("en", "encounterShell.goingIn", { n: 4 })).toMatch(/4/);
    expect(MESSAGES["zh-Hant"]).toHaveProperty("encounterShell.staging");
    expect(MESSAGES["zh-Hant"]).toHaveProperty("encounterShell.goingIn");
    expect(formatMessage("zh-Hant", "encounterShell.goingIn", { n: 4 })).toMatch(/4/);
  });
});
