// PR A acceptance guards for the choosing-surface redesign
// (docs/design/GAMEPLAY_SCREEN_REDESIGN_SPEC.md §1–§5, §10).
// File-content assertions, following this repo's shell-regression pattern.

import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("choosing surface (PR A)", () => {
  it("onboarding lives in a normal-flow shell strip, not an absolute overlay", () => {
    const shell = read("src/world/shell/Shell.tsx");
    expect(shell).toContain('data-testid="onboarding-strip"');
    expect(shell).toContain("ViewContextStrip");
    // The old floating tooltip anchored itself over the play surface:
    expect(shell).not.toContain("RepresentationOverlay");
    expect(shell).not.toContain('position: "absolute", top: 10, left: 10');
  });

  it("detail rail renders exactly one occupant: loot beats contract beats idle", () => {
    const shell = read("src/world/shell/Shell.tsx");
    expect(shell).toContain("one occupant");
    expect(shell).toContain("world.pendingLoot.length > 0 ? (");
    // The old stacked-column layout rendered contract and report as siblings:
    expect(shell).not.toContain("{contract && <Card style={{ marginBottom: 10 }}>{contract}</Card>}");
  });

  it("board renders locked→unlocking adjacency derived from engine milestones", () => {
    const board = read("src/world/contract-board/ContractBoard.tsx");
    expect(board).toContain("unlockEdges");
    expect(board).toContain('data-testid="board-adjacency"');
    // Selecting the already-selected card deselects it (the no-selection state is reachable):
    expect(board).toContain("interaction.selectedId === id ? null : id");

    const adjacency = read("src/world/contract-board/adjacency.ts");
    expect(adjacency).toContain("orgMilestones");
    expect(adjacency).toContain("milestoneFlag");
  });

  it("cold-start auto-select fires once so an explicit deselect sticks", () => {
    const hook = read("src/world/useArcInteraction.ts");
    expect(hook).toContain("coldStartDone");
  });

  it("roster collapses to compact rows and ranks the recommended party first", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain('data-testid="roster-compact-row"');
    expect(regions).toContain("recommendedIds");
    expect(regions).toContain("selectionActive");
    expect(regions).toContain("Recommended party");
    expect(regions).toContain("Bench");
  });

  it("downtime buttons come only from the live fix plan, never unconditionally", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain('fix.kind === "downtime" && fix.agentId === id');
    expect(regions).toContain('data-testid="roster-downtime-fix"');
    // The old roster rendered every downtime action on every card, all the time:
    expect(regions).not.toContain("Object.keys(DOWNTIME_ACTIONS)");
  });

  it("readiness internals are untouched by PR A", () => {
    const regions = read("src/world/shell/regions.tsx");
    // ReadinessPanel still renders through the frozen PixelReadinessRow component.
    expect(regions).toContain("PixelReadinessRow");
    expect(regions).toContain('data-testid="unlock-requirements"');
  });
});
