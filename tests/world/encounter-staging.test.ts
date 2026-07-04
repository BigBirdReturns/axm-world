// PR B acceptance guards for encounter, outcome, and loot staging
// (docs/design/GAMEPLAY_SCREEN_REDESIGN_SPEC.md §6-§8).
// File-content assertions follow the existing shell-regression pattern.

import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("encounter and reward staging (PR B)", () => {
  it("anchors encounter travel to the selected board card DOM position", () => {
    const board = read("src/world/contract-board/ContractBoard.tsx");
    const encounter = read("src/world/encounter/EncounterDirector.tsx");
    expect(board).toContain("data-contract-board-card-id");
    expect(encounter).toContain("boardTargetFor");
    expect(encounter).toContain("[data-contract-board-card-id]");
    expect(encounter).toContain('data-testid="encounter-travel-token"');
    expect(encounter).toContain('data-testid="encounter-travel-path"');
  });

  it("resolve-checks is keyed to projected outcome instead of a generic dice card", () => {
    const encounter = read("src/world/encounter/EncounterDirector.tsx");
    const css = read("src/world/encounter/encounter.css");
    expect(encounter).toContain("projectedOutcome: ix.readiness?.projectedOutcome");
    expect(encounter).toContain("encounter-resolve-${projection.tone}");
    // Projection labels are now catalog ids (i18n/messages.ts) so they read
    // correctly in both en and zh-Hant.
    expect(encounter).toContain('t("encounter.reliableProjection")');
    expect(encounter).toContain('t("encounter.riskWindow")');
    expect(encounter).toContain('t("encounter.failurePressure")');
    expect(encounter).not.toContain("⚄");
    expect(css).toContain("enc-overlay--projected-reliable");
    expect(css).toContain("enc-overlay--projected-risky");
    expect(css).toContain("enc-overlay--projected-failing");
  });

  it("outcome is staged as a board-level banner and header record, not in the rail", () => {
    const shell = read("src/world/shell/Shell.tsx");
    const encounter = read("src/world/encounter/EncounterDirector.tsx");
    expect(encounter).toContain('data-testid="outcome-banner"');
    // The immediate moment states the canonical grade (Cleared / Partial / Failed)
    // and, on its own axis, that the result was recorded — both catalog ids so they
    // read in en and zh-Hant.
    expect(encounter).toContain('data-testid="outcome-grade"');
    expect(encounter).toContain('"outcome.cleared"');
    expect(encounter).toContain('data-testid="outcome-recorded"');
    expect(encounter).toContain('t("result.recorded")');
    expect(shell).toContain('data-testid="record-history-button"');
    expect(shell).toContain('data-testid="record-history-modal"');
    expect(shell).not.toContain("world.lastReport && <Card style={{ marginBottom: 10 }}><ReportRegion");
    expect(shell).not.toContain("world.lastReport && <ReportRegion");
  });

  it("loot owns the rail until claim and equip produces an after-gear transition marker", () => {
    const shell = read("src/world/shell/Shell.tsx");
    const world = read("src/world/useArcWorld.ts");
    expect(shell).toContain('data-testid="loot-reward-moment"');
    // Now catalog ids (i18n/messages.ts) so this copy reads correctly in both en and zh-Hant.
    expect(shell).toContain('t("shell.rewardMomentBody")');
    expect(shell).toContain('data-testid="equip-flash"');
    expect(shell).toContain('t("shell.readinessRecalculated")');
    expect(world).toContain("lastEquip: LastEquipEvent | null");
    expect(world).toContain("setLastEquip({");
  });
});
