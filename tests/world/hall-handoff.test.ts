// The post-oath Hall handoff must present exactly ONE advancing action — Enter
// the (named) contract, which launches the playable EncounterShell — and must
// never be able to bypass gameplay with a silent quick resolve. Structural guard
// in the codebase's source-inspection idiom (see walkable-world.test.ts): the
// hall has no component-render harness, so we pin the wiring that makes the
// handoff single-routed.
import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("hall opening handoff — one advancing action, no bypass", () => {
  const hall = read("src/world/inhabited/HallScene.tsx");
  const shell = read("src/world/shell/Shell.tsx");

  it("cannot silently quick-resolve — the hall never calls world.runChallenge", () => {
    // The briefing's only advancing action hands off to the shared EncounterShell;
    // resolution happens inside the encounter, not in the hall.
    expect(hall).not.toContain("world.runChallenge");
    expect(hall).not.toContain('data-testid="hall-accept"');
    expect(hall).toContain("onEnterEncounter?.(view.challengeId)");
  });

  it("the briefing exposes one primary (Enter the contract) and one escape (Not yet)", () => {
    expect(hall).toContain('data-testid="hall-enter-contract"');
    expect(hall).toContain("onClick={enterFromBriefing}");
    expect(hall).toContain('t("hall.enterNamed"');
    expect(hall).toContain('data-testid="hall-not-yet"');
    expect(hall).toContain('t("hall.notYet")');
  });

  it("suppresses the competing floor actions while the briefing is open", () => {
    // Talk / View on board / Approach are disabled while the briefing (open) shows,
    // so the only live advancing action is the briefing's Enter.
    const disabledWhileOpen = (hall.match(/disabled=\{modalOpen \|\| open\}/g) ?? []).length;
    expect(disabledWhileOpen).toBeGreaterThanOrEqual(3); // talk, view-on-board, approach
  });

  it("first glance shows the verdict + one reason; raw squad math behind disclosure", () => {
    expect(hall).toContain('data-testid="hall-dialogue-readiness"');
    expect(hall).toContain("heldReadiness.reasons[0]");
    expect(hall).toContain('data-testid="hall-squad-details"'); // progressive disclosure
    expect(hall).toContain("heldReadiness.reasons.slice(1)");
  });

  it("the shell suppresses the duplicated right-rail contract controls during the briefing", () => {
    expect(shell).toContain("onBriefingActiveChange={setHallBriefingActive}");
    expect(shell).toContain("contract && !hallBriefingActive");
  });

  it("carries the Hall's exact challenge id into the encounter without a stale-selection remount", () => {
    expect(shell).toContain("setEncounterChallengeId(challengeId)");
    expect(shell).toContain("challengeId={encounterChallengeId}");
    expect(shell).not.toContain("encounterOpen && ix.selectedId");
  });
});
