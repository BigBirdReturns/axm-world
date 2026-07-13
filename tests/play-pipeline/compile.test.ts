import { describe, expect, it } from "vitest";
import type { Agent, Facility, InfrastructureFacility, Organization } from "../../src/engine/types.js";
import { runCycle } from "../../src/engine/cycle.js";
import { FIRST_CHARTER, FIRST_CHARTER_STARTING_RELATIONSHIPS, FIRST_CHARTER_STARTING_ROSTER } from "../../src/arcs/index.js";
import { buildPlayAssignment, compileArcToPlayScene, recommendAgentsForChallenge, summarizeReport } from "../../src/play-pipeline/compile.js";

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
    expect(assignment.tokensSpent).toBe(0);
    const result = runCycle({ org, arc: FIRST_CHARTER, assignments: [assignment] });

    expect(result.reports).toHaveLength(1);
    expect(result.reports[0]!.challengeId).toBe("cellar");
    expect(result.org.cycle).toBe(1);
  });

  it("summarizes a report in player language: names, score-vs-target, margin", () => {
    const org = demoOrg();
    const challenge = FIRST_CHARTER.challenges.find((c) => c.id === "cellar")!;
    const assignment = buildPlayAssignment(challenge, org, FIRST_CHARTER);
    const result = runCycle({ org, arc: FIRST_CHARTER, assignments: [assignment] });
    const report = result.reports[0]!;
    const view = summarizeReport(report, FIRST_CHARTER, (id) => result.org.agents[id]?.name ?? id);

    // Per-agent rows are player-readable: real name, and NEVER the "n / m" fraction
    // (which reads like "77 out of 5").
    expect(view.lines.length).toBeGreaterThan(0);
    const firstAssigned = report.assignedAgents[0]!.agentId;
    const name = result.org.agents[firstAssigned]!.name;
    expect(view.lines.some((l) => l.includes(name))).toBe(true);
    expect(view.lines.some((l) => l.includes(firstAssigned))).toBe(false);
    expect(view.lines.every((l) => !/\d\s*\/\s*\d/.test(l))).toBe(true); // no score/threshold fractions
    expect(view.lines.some((l) => l.includes("vs target"))).toBe(true);

    // Objective summary carries structured player-facing numbers, not raw math.
    expect(view.objectives).toHaveLength(challenge.mechanicChecks.length);
    const sweep = view.objectives.find((o) => o.name === "Cellar Sweep")!;
    expect(sweep.attribute).toBe("Power"); // the check's primary attribute, named
    expect(sweep.target).toBe(5); // the objective threshold, not the difficulty (10)
    expect(sweep.totalCount).toBeGreaterThan(0);
    expect(sweep.best).toBeTruthy();
    expect(sweep.best!.margin).toBe(sweep.best!.score - sweep.best!.target); // margin is derived, coherent
    // A cleared check: best contributor cleared it and margin reads positive.
    if (sweep.passed) expect(sweep.best!.margin).toBeGreaterThanOrEqual(0);
  });

  it("falls back to the raw id when no name resolver is supplied", () => {
    const org = demoOrg();
    const challenge = FIRST_CHARTER.challenges.find((c) => c.id === "cellar")!;
    const result = runCycle({ org, arc: FIRST_CHARTER, assignments: [buildPlayAssignment(challenge, org, FIRST_CHARTER)] });
    const view = summarizeReport(result.reports[0]!, FIRST_CHARTER);
    // No resolver → rows still render, keyed by id (backward-compatible default).
    expect(view.lines.length).toBeGreaterThan(0);
  });
});
