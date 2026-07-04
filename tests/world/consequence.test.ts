import { describe, expect, it } from "vitest";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge";
import { buildConsequence, type ObjectiveFact } from "../../src/world/consequence";
import { CONSEQUENCE_SCHEMA_VERSION } from "../../src/world/ledger";
import type { RunReport } from "../../src/engine/types";

// #69 — the structured consequence record is built HONESTLY from a resolved run:
// only facts the report/arc actually produced. No invented rewards, unlocks, party,
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

function build(rep: RunReport, objectives: ObjectiveFact[] = objectivesCleared) {
  return buildConsequence({
    report: rep,
    challenge,
    arc,
    objectives,
    resolveAgent: (id) => (id === "a1" ? { name: "Gwenna Emberveil", role: "Vanguard" } : { name: id }),
    resourceNames: { currency: "Gold", reputation: "Reputation" },
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
    const c = build(report(), [
      { id: "o1", name: "Full", passed: true, passedCount: 2, totalCount: 2 },
      { id: "o2", name: "Some", passed: false, passedCount: 1, totalCount: 3 },
      { id: "o3", name: "None", passed: false, passedCount: 0, totalCount: 2 },
    ]);
    expect(c.objectives).toEqual([
      { id: "o1", label: "Full", status: "cleared" },
      { id: "o2", label: "Some", status: "partial" },
      { id: "o3", label: "None", status: "failed" },
    ]);
  });

  it("records only rewards the run actually granted (positive amounts + real loot)", () => {
    const c = build(report({ rewardsGranted: { currency: 125, reputation: 20 } }));
    expect(c.rewards).toContainEqual({ kind: "reputation", label: "Reputation", amount: 20 });
    expect(c.rewards).toContainEqual({ kind: "gold", label: "Gold", amount: 125 });
    // Zero amounts are not rewards.
    const none = build(report({ rewardsGranted: { currency: 0, reputation: 0 }, lootDrops: [] }));
    expect(none.rewards).toEqual([]);
  });

  it("always records the contract as recorded, and unlock/flag world-changes ONLY on a clear", () => {
    const cleared = build(report({ outcome: "success" }));
    expect(cleared.worldChanges[0]).toEqual({ kind: "recorded", targetId: challenge.id, label: challenge.name });
    // Every non-recorded world change references a REAL arc id — nothing invented.
    const realChallengeIds = new Set(arc.challenges.map((ch) => ch.id));
    for (const wc of cleared.worldChanges) {
      if (wc.kind === "unlocked") expect(realChallengeIds.has(wc.targetId)).toBe(true);
    }

    // Partial / failure: memory is recorded, but nothing is unlocked or flagged.
    for (const outcome of ["partial", "failure"] as const) {
      const c = build(report({ outcome }));
      expect(c.outcome.grade).toBe(outcome === "partial" ? "partial" : "failed");
      expect(c.worldChanges).toEqual([{ kind: "recorded", targetId: challenge.id, label: challenge.name }]);
    }
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
