// PR C acceptance guards: the §2 escalation signal and §9 mobile roster
// distinction (docs/design/GAMEPLAY_SCREEN_REDESIGN_SPEC.md).
//
// The escalation signal is DERIVED from engine state, never invented:
// availableSinceCycle comes from the same success records that drive node
// status. The behavioral half of this suite exercises that derivation through
// the real compile pipeline; the file-content half follows this repo's
// shell-regression guard pattern.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import type { Agent, Facility, InfrastructureFacility, Organization } from "../../src/engine/types.js";
import { FIRST_CHARTER, FIRST_CHARTER_STARTING_RELATIONSHIPS, FIRST_CHARTER_STARTING_ROSTER } from "../../src/arcs/index.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import { buildWorldLayout } from "../../src/world/contract.js";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const names: InfrastructureFacility[] = [
    "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
  ];
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const n of names) out[n] = { type: n, level: n === "Quarters" || n === "Recreation" ? 1 : 0, assignedAgents: [] };
  return out as Record<InfrastructureFacility, Facility>;
}

function demoOrg(cycle: number): Organization {
  const agents: Record<string, Agent> = {};
  for (const agent of FIRST_CHARTER_STARTING_ROSTER) agents[agent.id] = { ...agent, assignmentHistory: [...agent.assignmentHistory] };
  return {
    id: "escalation-test",
    name: "Escalation Test",
    reputation: 0,
    resources: { currency: 100, materials: 0, tokens: 2 },
    infrastructure: defaultFacilities(),
    agents,
    relationships: [...FIRST_CHARTER_STARTING_RELATIONSHIPS],
    precedents: [],
    dramaQueue: [],
    cycle,
    distributionPolicy: "council",
    rngSeed: 424242,
  };
}

/** A (granter, gated) challenge pair linked by a milestone flag, from arc data.
 * Attunement-gated challenges are skipped: since the engine:sync that made
 * attunement gates live, a single granter success no longer opens them —
 * that behavior is covered in gate-parity.test.ts. */
function gatedPair(): { granterId: string; gatedId: string } {
  const attunementGated = new Set(
    FIRST_CHARTER.attunementChains.flatMap((c) => c.grantsAccessTo),
  );
  for (const gated of FIRST_CHARTER.challenges) {
    if (attunementGated.has(gated.id) || gated.accessRequirements.agentAttunements.length > 0) continue;
    for (const milestone of gated.accessRequirements.orgMilestones) {
      const wanted = milestone.replace(/-cleared$/, "");
      const granter = FIRST_CHARTER.challenges.find((c) =>
        [c.outcomes.success, c.outcomes.partial, c.outcomes.failure].some(
          (o) => o.milestoneFlag === milestone,
        ) || c.id === wanted,
      );
      if (granter && granter.id !== gated.id) return { granterId: granter.id, gatedId: gated.id };
    }
  }
  throw new Error("first-charter has no gated challenge pair");
}

describe("escalation signal derivation (PR C §2)", () => {
  it("ungated challenges are available since the arc start", () => {
    const scene = compileArcToPlayScene(FIRST_CHARTER, demoOrg(0));
    const ungated = scene.nodes.filter((n) => n.status === "available");
    expect(ungated.length).toBeGreaterThan(0);
    for (const node of ungated) expect(node.availableSinceCycle).toBe(0);
  });

  it("locked nodes carry no availability timestamp", () => {
    const scene = compileArcToPlayScene(FIRST_CHARTER, demoOrg(0));
    const locked = scene.nodes.filter((n) => n.status === "locked");
    expect(locked.length).toBeGreaterThan(0);
    for (const node of locked) expect(node.availableSinceCycle).toBeNull();
  });

  it("a gated node becomes available the cycle after its granter succeeds", () => {
    const { granterId, gatedId } = gatedPair();
    const org = demoOrg(5);
    const firstAgent = Object.values(org.agents)[0]!;
    firstAgent.assignmentHistory = [
      ...firstAgent.assignmentHistory,
      { challengeId: granterId, cycle: 2, outcome: "success" },
    ];

    const scene = compileArcToPlayScene(FIRST_CHARTER, org);
    const gatedNode = scene.nodes.find((n) => n.challengeId === gatedId)!;
    expect(gatedNode.status).toBe("available");
    // Success stamped at cycle 2 -> open from cycle 3 -> waited 2 cycles by cycle 5.
    expect(gatedNode.availableSinceCycle).toBe(3);
  });

  it("every available node has a timestamp — availability and the signal share one derivation", () => {
    const { granterId } = gatedPair();
    const org = demoOrg(4);
    const firstAgent = Object.values(org.agents)[0]!;
    firstAgent.assignmentHistory = [
      ...firstAgent.assignmentHistory,
      { challengeId: granterId, cycle: 1, outcome: "success" },
    ];
    const scene = compileArcToPlayScene(FIRST_CHARTER, org);
    for (const node of scene.nodes) {
      if (node.status === "available") expect(node.availableSinceCycle).not.toBeNull();
      else expect(node.availableSinceCycle).toBeNull();
    }
  });

  it("the world layout threads availableSinceCycle through to WorldNode", () => {
    const scene = compileArcToPlayScene(FIRST_CHARTER, demoOrg(0));
    const layout = buildWorldLayout(scene);
    const byId = new Map(scene.nodes.map((n) => [n.challengeId, n]));
    for (const node of layout.nodes) {
      expect(node.availableSinceCycle).toBe(byId.get(node.challengeId)!.availableSinceCycle);
    }
  });
});

describe("escalation signal rendering guards (PR C §2)", () => {
  it("the board renders a waiting tag from derived data, no string parsing", () => {
    const board = read("src/world/contract-board/ContractBoard.tsx");
    expect(board).toContain('data-testid="escalation-signal"');
    expect(board).toContain("availableSinceCycle");
    expect(board).toContain("ESCALATION_AFTER_CYCLES");
    // The signal must key off node state, not off display strings:
    expect(board).not.toContain('title.includes(');
  });

  it("the derivation lives beside status in the play pipeline and matches its milestone normalization", () => {
    const compile = read("src/play-pipeline/compile.ts");
    expect(compile).toContain("availableSinceCycle");
    expect(compile).toContain("earliestSuccessCycles");
    // Status now delegates to the vendored engine's gate derivation (the same
    // one runCycle enforces); availableSince keeps the matching -cleared
    // normalization, so the two still share one milestone contract:
    expect(compile).toContain("challengeAccess");
    const normalizations = compile.match(/-cleared\$/g) ?? [];
    expect(normalizations.length).toBeGreaterThanOrEqual(1);
    const access = read("src/engine/access.ts");
    expect(access).toContain("-cleared$");
  });

  it("escalated cards stay legible under reduced motion", () => {
    const css = read("src/world/contract-board/contract-board.css");
    expect(css).toContain("contract-board-escalation");
    expect(css).toContain("prefers-reduced-motion");
  });
});

describe("mobile roster distinction (PR C §9)", () => {
  it("strip-mode recommended cards carry their own visible accent", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain('data-testid="strip-recommended-card"');
    // "Recommended" chip text is now a catalog id (i18n/messages.ts) so it
    // reads correctly in both en and zh-Hant.
    expect(regions).toContain('t("shell.recommendedChip")');
  });

  it("recommended party still orders ahead of the bench in every variant", () => {
    const regions = read("src/world/shell/regions.tsx");
    expect(regions).toContain("focusMembers");
    expect(regions.indexOf("focusMembers.map")).toBeLessThan(regions.indexOf("benchMembers.map"));
  });
});
