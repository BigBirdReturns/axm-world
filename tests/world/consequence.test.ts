import { describe, expect, it } from "vitest";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge";
import { buildConsequence, newlyAvailableContracts, type ObjectiveFact, type AvailabilityNode } from "../../src/world/consequence";
import { CONSEQUENCE_SCHEMA_VERSION } from "../../src/world/ledger";
import type { RunReport } from "../../src/engine/types";

// #69 — the structured consequence record is built HONESTLY from a resolved run:
// only facts the run actually produced. No invented rewards, unlocks, party,
// timestamps, or grades; no prose stored (prose is generated from these downstream).

const arc = FIRST_CHARTER_CARTRIDGE.arc;
const challenge = arc.challenges[0]!; // The opener (The Cellar)

function report(over: Partial<RunReport> = {}): RunReport {
  return {
    challengeId: challenge.id,
    outcome: "success",
    cycle: 3,
    assignedAgents: [
      { agentId: "a1", mechanicResults: [], performanceRating: 0, stressGained: 0, wasDowned: false, isHeroic: false },
    ],
    lootDrops: [],
    dramaTriggers: [],
    narrativeSeed: 0,
    rewardsGranted: { currency: 125, reputation: 20 },
    ...over,
  };
}

const objectivesCleared: ObjectiveFact[] = [
  { id: "obj1", name: "Cellar Sweep", passed: true, passedCount: 2, totalCount: 2 },
];

function build(rep: RunReport, opts: { objectives?: ObjectiveFact[]; newlyAvailable?: Array<{ id: string; label: string }> } = {}) {
  return buildConsequence({
    report: rep,
    challenge,
    arc,
    objectives: opts.objectives ?? objectivesCleared,
    resolveAgent: (id) => (id === "a1" ? { name: "Gwenna Emberveil", role: "Vanguard" } : { name: id }),
    resourceNames: { currency: "Gold", reputation: "Reputation" },
    newlyAvailable: opts.newlyAvailable ?? [],
  });
}

describe("buildConsequence (#69)", () => {
  it("records the versioned grade, contract, and party from the run report", () => {
    const c = build(report());
    expect(c.schemaVersion).toBe(CONSEQUENCE_SCHEMA_VERSION);
    expect(c.outcome.grade).toBe("cleared"); // engine "success" → canonical grade
    expect(c.contract).toEqual({ id: challenge.id, title: challenge.name });
    expect(c.party.members).toEqual([{ id: "a1", name: "Gwenna Emberveil", role: "Vanguard" }]);
  });

  it("maps objective coverage to an honest per-objective status", () => {
    const c = build(report(), {
      objectives: [
        { id: "o1", name: "Full", passed: true, passedCount: 2, totalCount: 2 },
        { id: "o2", name: "Some", passed: false, passedCount: 1, totalCount: 3 },
        { id: "o3", name: "None", passed: false, passedCount: 0, totalCount: 2 },
      ],
    });
    expect(c.objectives).toEqual([
      { id: "o1", label: "Full", status: "cleared" },
      { id: "o2", label: "Some", status: "partial" },
      { id: "o3", label: "None", status: "failed" },
    ]);
  });

  it("records only rewards the run actually granted (positive amounts + CLAIMABLE loot)", () => {
    const c = build(report({ rewardsGranted: { currency: 125, reputation: 20 } }));
    expect(c.rewards).toContainEqual({ kind: "reputation", label: "Reputation", amount: 20 });
    expect(c.rewards).toContainEqual({ kind: "gold", label: "Gold", amount: 125 });

    // Zero amounts are not rewards.
    const none = build(report({ rewardsGranted: { currency: 0, reputation: 0 }, lootDrops: [] }));
    expect(none.rewards).toEqual([]);

    // A loot drop nobody is eligible for never becomes a claimable reward, so it is
    // NOT recorded — only a drop with eligible agents is a reward fact.
    const item = arc.items[0]!;
    const withLoot = build(report({
      rewardsGranted: undefined,
      lootDrops: [
        { itemId: item.id, eligibleAgents: [] },        // unclaimable → dropped
        { itemId: item.id, eligibleAgents: ["a1"] },     // claimable → recorded
      ],
    }));
    expect(withLoot.rewards).toEqual([{ kind: "item", label: item.name }]);
  });

  it("always records the contract as recorded, and 'unlocked' ONLY for real post-run openings", () => {
    const opened = [{ id: "c2", label: "The Bridge Troll" }];
    const c = build(report(), { newlyAvailable: opened });
    expect(c.worldChanges[0]).toEqual({ kind: "recorded", targetId: challenge.id, label: challenge.name });
    expect(c.worldChanges).toContainEqual({ kind: "unlocked", targetId: "c2", label: "The Bridge Troll" });

    // Nothing genuinely opened → only the recorded fact, no unlock claim.
    const nothingOpened = build(report(), { newlyAvailable: [] });
    expect(nothingOpened.worldChanges).toEqual([{ kind: "recorded", targetId: challenge.id, label: challenge.name }]);
  });

  it("stores structured facts, not prose: the authored narrative is never persisted", () => {
    const c = build(report());
    const narrative = challenge.outcomes.success.narrative;
    expect(narrative.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(c);
    expect(serialized).not.toContain(narrative);
    expect(serialized).not.toMatch(/narrative/i);
  });
});

describe("newlyAvailableContracts — the honest post-run unlock delta (#69)", () => {
  const node = (challengeId: string, status: AvailabilityNode["status"]): AvailabilityNode => ({ challengeId, title: `Title ${challengeId}`, status });

  it("returns contracts that became available, not ones that were already available or just cleared", () => {
    const before = [node("c1", "available"), node("c2", "locked"), node("c3", "locked")];
    const after = [node("c1", "cleared"), node("c2", "available"), node("c3", "locked")];
    // c2 newly opened; c1 left available (now cleared) so it is NOT an unlock; c3 still locked.
    expect(newlyAvailableContracts(before, after)).toEqual([{ id: "c2", label: "Title c2" }]);
  });

  it("opens nothing when a multi-step gate stays locked after the clear", () => {
    const before = [node("gate", "locked")];
    const after = [node("gate", "locked")]; // one prerequisite met, gate still locked
    expect(newlyAvailableContracts(before, after)).toEqual([]);
  });
});
