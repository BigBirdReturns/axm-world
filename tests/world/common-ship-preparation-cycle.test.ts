import { describe, expect, it } from "vitest";
import { RELIEF_CIRCUIT } from "../../src/arcs/relief-circuit.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { runWatchPreparationCycle } from "../../src/world/useArcWorld.js";

describe("Common Ship preparation cycle", () => {
  it("uses the ordinary deterministic Training cycle instead of granting a receiver bonus", () => {
    const org = foundOrganization(RELIEF_CIRCUIT);
    const party = Object.keys(org.agents).reverse();
    const before = structuredClone(org);

    const result = runWatchPreparationCycle(org, RELIEF_CIRCUIT, party);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.org.cycle).toBe(before.cycle + 1);
    expect(result.reports).toEqual([]);
    expect(result.org.infrastructure.Training.assignedAgents).toEqual(before.infrastructure.Training.assignedAgents);
    expect(result.events.filter((event) => event.type === "training_stat_growth")).toHaveLength(party.length);

    for (const agentId of party) {
      const prior = before.agents[agentId]!;
      const next = result.org.agents[agentId]!;
      const totalBefore = Object.values(prior.attributes).reduce((sum, value) => sum + value, 0);
      const totalAfter = Object.values(next.attributes).reduce((sum, value) => sum + value, 0);
      expect(totalAfter).toBeGreaterThan(totalBefore);
    }
  });

  it("refuses an empty or entirely unavailable watch without advancing time", () => {
    const org = foundOrganization(RELIEF_CIRCUIT);
    expect(runWatchPreparationCycle(org, RELIEF_CIRCUIT, [])).toBeNull();

    const first = Object.keys(org.agents)[0]!;
    const downed = {
      ...org,
      agents: { ...org.agents, [first]: { ...org.agents[first]!, downedUntilCycle: org.cycle + 2 } },
    };
    expect(runWatchPreparationCycle(downed, RELIEF_CIRCUIT, [first])).toBeNull();
  });
});
