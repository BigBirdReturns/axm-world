import { describe, expect, it } from "vitest";
import { runCycle } from "../../src/engine/cycle.js";
import { buildPlayAssignment, compileArcToPlayScene, recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { bootstrapOrg, bootstrapRoster } from "../../src/spoke/bootstrap.js";
import { defaultFoundingInput, foundOrganization } from "../../src/engine/founding.js";
import { MINI_ARC } from "../fixtures/mini-arc.js";

describe("spoke bootstrap", () => {
  it("is only a byte-identical compatibility facade over canonical founding", () => {
    expect(bootstrapOrg(MINI_ARC)).toEqual(foundOrganization(MINI_ARC));
    expect(bootstrapRoster(MINI_ARC)).toEqual(Object.values(foundOrganization(MINI_ARC).agents));

    const input = { ...defaultFoundingInput(MINI_ARC), seed: 12345 };
    expect(bootstrapOrg(MINI_ARC, { seed: input.seed })).toEqual(foundOrganization(MINI_ARC, input));
  });

  it("cannot revive deprecated World-local roster or resource policy", () => {
    const canonical = bootstrapOrg(MINI_ARC, { seed: 12345 });
    const withDeprecatedOptions = bootstrapOrg(MINI_ARC, {
      seed: 12345,
      rosterSize: 99,
      roleFloor: { guardian: 99 },
      startingCurrency: 999_999,
      startingTokens: 999,
    });
    expect(withDeprecatedOptions).toEqual(canonical);
  });

  it("produces a populated, playable org for an arbitrary (non-bundled) arc", () => {
    const org = bootstrapOrg(MINI_ARC);
    const agents = Object.values(org.agents);
    expect(agents.length).toBeGreaterThan(0);
    // Every agent is engine-valid: has a name from the arc's pool and attributes.
    for (const agent of agents) {
      expect(agent.name.length).toBeGreaterThan(0);
      expect(Object.keys(agent.attributes).length).toBeGreaterThan(0);
    }
    // Starting facilities are present so the org can house and rest its roster.
    expect(org.infrastructure.Quarters.level).toBeGreaterThan(0);
  });

  it("represents every arc role at least once in the default roster", () => {
    const roster = bootstrapRoster(MINI_ARC);
    const rolesPresent = new Set(roster.map((a) => a.role).filter(Boolean));
    for (const role of MINI_ARC.roles) {
      expect(rolesPresent.has(role.id)).toBe(true);
    }
  });

  it("is deterministic: same arc + same seed yields an identical org", () => {
    const a = bootstrapOrg(MINI_ARC, { seed: 12345 });
    const b = bootstrapOrg(MINI_ARC, { seed: 12345 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("varies with the seed", () => {
    const a = bootstrapOrg(MINI_ARC, { seed: 1 });
    const b = bootstrapOrg(MINI_ARC, { seed: 2 });
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("bootstraps a roster that the deterministic engine can actually play", () => {
    const org = bootstrapOrg(MINI_ARC, { seed: 777 });
    const scene = compileArcToPlayScene(MINI_ARC, org);
    expect(scene.agents.length).toBe(Object.keys(org.agents).length);

    const node = scene.nodes.find((n) => n.status === "available") ?? scene.nodes[0]!;
    const challenge = MINI_ARC.challenges.find((c) => c.id === node.challengeId)!;
    const selected = recommendAgentsForChallenge(challenge, org, MINI_ARC);
    expect(selected.length).toBeGreaterThanOrEqual(challenge.rosterRequirements.minAgents);

    // Run several cycles end-to-end; the bootstrapped org must keep resolving.
    let state = org;
    for (let cycle = 0; cycle < 3; cycle++) {
      const assignment = buildPlayAssignment(challenge, state, MINI_ARC);
      const result = runCycle({ org: state, arc: MINI_ARC, assignments: [assignment] });
      expect(result.reports).toHaveLength(1);
      state = result.org;
    }
    expect(state.cycle).toBe(3);
  });
});
