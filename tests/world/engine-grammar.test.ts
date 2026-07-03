import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout } from "../../src/world/contract.js";
import { firstAvailableNodeId } from "../../src/world/useArcInteraction.js";
import { getEngineCoachMessage } from "../../src/world/shell/coach.js";
import type { Arc } from "../../src/engine/types.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function dummyCartridgeArc(): Arc {
  return {
    ...FIRST_CHARTER,
    meta: {
      ...FIRST_CHARTER.meta,
      id: "dummy-ops-cartridge",
      name: "Dummy Ops Cartridge",
      domain: "operations-lab",
    },
    challenges: FIRST_CHARTER.challenges.map((challenge, index) => ({
      ...challenge,
      id: `dummy-node-${index + 1}`,
      name: ["Audit Intake", "Patch Relay", "Publish Brief", "Escalation Review", "Recovery Sprint", "Final Handoff"][index] ?? `Dummy Node ${index + 1}`,
      description: "Different cartridge content using the same engine grammar.",
      outcomes: {
        ...challenge.outcomes,
        success: {
          ...challenge.outcomes.success,
          milestoneFlag: `dummy-node-${index + 1}-cleared`,
        },
      },
    })),
  };
}

describe("engine-level onboarding grammar", () => {
  it("describes reusable engine states rather than cartridge fiction", () => {
    expect(getEngineCoachMessage({
      pendingDecision: true,
      selected: null,
      partyCount: 0,
      min: 0,
      canRun: false,
      lastReport: null,
      arcComplete: false,
    })).toContain("engine applies");

    expect(getEngineCoachMessage({
      pendingDecision: false,
      selected: { status: "locked" },
      partyCount: 0,
      min: 1,
      canRun: false,
      lastReport: null,
      arcComplete: false,
    })).toBeNull();

    expect(getEngineCoachMessage({
      pendingDecision: false,
      selected: null,
      partyCount: 0,
      min: 0,
      canRun: false,
      lastReport: { challengeId: "dummy-node-1", challengeName: "Audit Intake", outcome: "success", objectives: [], lines: [], rewardSummary: "Recorded" },
      arcComplete: false,
    })).toContain("Outcome recorded");
  });

  it("compiles a second cartridge into the same available/locked/cleared graph grammar", () => {
    const arc = dummyCartridgeArc();
    const org = bootstrapOrg(arc);
    const scene = compileArcToPlayScene(arc, org);
    const layout = buildWorldLayout(scene);

    expect(scene.arcId).toBe("dummy-ops-cartridge");
    expect(scene.nodes.map((node) => node.title)).toContain("Audit Intake");
    expect(layout.nodes.map((node) => node.status)).toContain("available");
    expect(new Set(layout.nodes.map((node) => node.status)).has("locked")).toBe(true);
  });

  it("focuses the first actionable node without treating locked nodes as the next move", () => {
    expect(firstAvailableNodeId([
      { challengeId: "locked-a", status: "locked" },
      { challengeId: "available-a", status: "available" },
      { challengeId: "available-b", status: "available" },
    ])).toBe("available-a");

    expect(firstAvailableNodeId([
      { challengeId: "cleared-a", status: "cleared" },
      { challengeId: "available-a", status: "available" },
      { challengeId: "available-b", status: "available" },
    ], "available-a")).toBe("available-b");
  });

  it("contract board lanes surface the loaded arc's own progression-tier names, not invented chapter titles", () => {
    const arc = dummyCartridgeArc();
    const renamedArc: Arc = {
      ...arc,
      progressionTiers: arc.progressionTiers.map((tier, i) => ({
        ...tier,
        name: i === 0 ? "Intake Lane" : "Recovery Lane",
      })),
    };
    const org = bootstrapOrg(renamedArc);
    const scene = compileArcToPlayScene(renamedArc, org);
    const layout = buildWorldLayout(scene);

    // Every node's tierIndex must resolve to a tier name this arc actually authored.
    const seenTierNames = new Set(
      layout.nodes.map((node) => renamedArc.progressionTiers[node.tierIndex]?.name),
    );
    expect(seenTierNames.size).toBeGreaterThan(0);
    for (const name of seenTierNames) {
      expect(["Intake Lane", "Recovery Lane"]).toContain(name);
    }

    const board = read("src/world/contract-board/ContractBoard.tsx");
    expect(board).toContain("progressionTiers");
    expect(board).not.toContain("Opening Work");
    expect(board).not.toContain("First Pressure");
  });

  it("the status HUD labels reputation with the arc's own reputationName, not a hardcoded label", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain("resources.reputationName");
    expect(regions).not.toContain('"Renown"');
  });

  it("the completion banner does not hardcode First Charter's 'Charter Complete' copy", () => {
    const regions = read("src/world/shell/regions.tsx");
    const shell = read("src/world/shell/Shell.tsx");
    expect(regions).not.toContain("Charter Complete");
    expect(shell).not.toContain("Charter Complete");
  });

  it("the encounter overlay is independent of First Charter's creatures/locations and sources its outcome copy from the challenge's own narrative", () => {
    const director = read("src/world/encounter/EncounterDirector.tsx");
    expect(director).not.toContain("troll");
    expect(director).not.toContain("bandit");
    expect(director).not.toContain("LOCATION_FLAVOR");
    expect(director).toContain("outcomes[");
    expect(director).toContain(".narrative");
  });
});
