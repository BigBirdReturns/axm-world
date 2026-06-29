import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout } from "../../src/world/contract.js";
import { firstAvailableNodeId } from "../../src/world/useArcInteraction.js";
import { getEngineCoachMessage } from "../../src/world/shell/coach.js";
import type { Arc } from "../../src/engine/types.js";

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
      lastReport: { challengeId: "dummy-node-1", challengeName: "Audit Intake", outcome: "success", lines: [], rewardSummary: "Recorded" },
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
});
