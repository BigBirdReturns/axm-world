import { describe, expect, it } from "vitest";
import type { Agent, Facility, InfrastructureFacility, Organization } from "../../src/engine/types.js";
import { runCycle } from "../../src/engine/cycle.js";
import { FIRST_CHARTER, FIRST_CHARTER_STARTING_RELATIONSHIPS, FIRST_CHARTER_STARTING_ROSTER } from "../../src/arcs/index.js";
import { buildPlayAssignment, compileArcToPlayScene, recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";

function defaultFacilities(): Record<InfrastructureFacility, Facility> {
  const names: InfrastructureFacility[] = [
    "Quarters", "Production", "Recreation", "Research", "Training", "Storage", "Medical",
  ];
  const out: Partial<Record<InfrastructureFacility, Facility>> = {};
  for (const n of names) out[n] = { type: n, level: n === "Quarters" || n === "Recreation" ? 1 : 0, assignedAgents: [] };
  return out as Record<InfrastructureFacility, Facility>;
}

function demoOrg(): Organization {
  const agents: Record<string, Agent> = {};
  for (const agent of FIRST_CHARTER_STARTING_ROSTER) agents[agent.id] = { ...agent };
  return {
    id: "pipeline-test",
    name: "Pipeline Test",
    reputation: 0,
    resources: { currency: 100, materials: 0, tokens: 2 },
    infrastructure: defaultFacilities(),
    agents,
    relationships: [...FIRST_CHARTER_STARTING_RELATIONSHIPS],
    precedents: [],
    dramaQueue: [],
    cycle: 0,
    distributionPolicy: "council",
    rngSeed: 424242,
  };
}

describe("arc to play pipeline", () => {
  it("compiles an arc and organization into a playable browser scene", () => {
    const scene = compileArcToPlayScene(FIRST_CHARTER, demoOrg());
    expect(scene.arcId).toBe(FIRST_CHARTER.meta.id);
    expect(scene.nodes).toHaveLength(FIRST_CHARTER.challenges.length);
    expect(scene.agents).toHaveLength(FIRST_CHARTER_STARTING_ROSTER.length);
    expect(scene.nodes.some((node) => node.status === "available")).toBe(true);
  });

  it("builds an assignment that the deterministic engine can resolve", () => {
    const org = demoOrg();
    const challenge = FIRST_CHARTER.challenges.find((c) => c.id === "cellar")!;
    const selected = recommendAgentsForChallenge(challenge, org, FIRST_CHARTER);
    expect(selected.length).toBeGreaterThanOrEqual(challenge.rosterRequirements.minAgents);

    const assignment = buildPlayAssignment(challenge, org, FIRST_CHARTER);
    const result = runCycle({ org, arc: FIRST_CHARTER, assignments: [assignment] });

    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.challengeId).toBe("cellar");
    expect(result.org.cycle).toBe(1);
  });
});
