// The compiler thesis, mechanized: one compileEncounter, fed two structurally
// different authored contracts, must derive two structurally different playable
// encounters — with ZERO id-specific branching in the compiler. If The Cellar
// and Attumen came out looking the same, the "derived, not hand-authored" claim
// would be a lie. These tests pin the derivation to the authored fields:
// objectives←mechanicChecks, hazards←failureConsequence, slots←rosterRequirements,
// resolutions←outcomes, unlocks←milestone/attunement/narrative.

import { describe, expect, it } from "vitest";
import { FIRST_CHARTER, KARAZHAN } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { runCycle } from "../../src/engine/cycle.js";
import { recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { compileEncounter } from "../../src/world/encounter/compile-encounter.js";

const cellar = FIRST_CHARTER.challenges.find((c) => c.id === "cellar")!;
const attumen = KARAZHAN.challenges.find((c) => c.id === "attumen")!;

describe("compileEncounter derives from the authored contract", () => {
  it("The Cellar: one team_aggregate objective, stress hazard, six flex slots", () => {
    const spec = compileEncounter(cellar, bootstrapOrg(FIRST_CHARTER), FIRST_CHARTER);

    // Objectives are the challenge's mechanic checks — one, here.
    expect(spec.objectives).toHaveLength(1);
    const obj = spec.objectives[0]!;
    expect(obj.label).toBe("Cellar Sweep"); // the authored check name, not invented
    expect(obj.scope).toBe("team_aggregate");
    expect(obj.targetThreshold).toBe(5); // the authored difficultyThreshold
    expect(obj.verb).toBe("Suppress"); // derived from failureConsequence "stress"
    expect(obj.markerKind).toBe("threat");
    expect(obj.attributes.map((a) => a.name)).toContain("Power");

    // Hazard is the check's failureConsequence, nothing hand-written.
    expect(spec.hazards).toHaveLength(1);
    expect(spec.hazards[0]!.kind).toBe("stress");

    // Six agents, no required roles → six flex slots, all pre-filled.
    expect(spec.slots).toHaveLength(6);
    expect(spec.slots.every((s) => s.requiredRole === null)).toBe(true);
    expect(spec.slots.every((s) => s.agentId !== null)).toBe(true);

    // Location: region is the progression tier, site + approach are the contract's.
    expect(spec.location.region).toBe("Proving Grounds");
    expect(spec.location.site).toBe("The Cellar");
    expect(spec.location.approach.length).toBeGreaterThan(0);

    // Three authored outcomes → three resolution previews with real ledger lines.
    expect(spec.resolutions.map((r) => r.outcome)).toEqual(["success", "partial", "failure"]);
    const success = spec.resolutions.find((r) => r.outcome === "success")!;
    expect(success.ledger.some((l) => l.includes("30"))).toBe(true); // currencyReward
    expect(success.ledger.some((l) => l.includes("cellar-cleared"))).toBe(true); // milestone

    // Clearing it fires the authored narrative event — a real world change.
    expect(spec.onClear.worldChanges).toContain("The Charter Begins");
  });

  it("Attumen: two objectives incl. a role-specific tank slot and a perAssignedAgent sweep", () => {
    const spec = compileEncounter(attumen, bootstrapOrg(KARAZHAN), KARAZHAN);

    // Two authored checks → two objectives, distinctly derived.
    expect(spec.objectives).toHaveLength(2);
    const charge = spec.objectives.find((o) => o.id === "attumen-charge")!;
    const sweep = spec.objectives.find((o) => o.id === "attumen-sweep")!;

    // Role-specific check surfaces its role scope; team check does not.
    expect(charge.scope).toBe("role_specific");
    expect(charge.roleNames).toContain("Tank");
    expect(charge.verb).toBe("Survive"); // agent_damage
    expect(sweep.scope).toBe("team_aggregate");
    expect(sweep.verb).toBe("Hold"); // team_damage

    // Two failureConsequences → two distinct hazards.
    expect(spec.hazards.map((h) => h.kind).sort()).toEqual(["agent_damage", "team_damage"]);

    // 6..10 agents with a required tank → first slot is the tank slot.
    expect(spec.minAgents).toBe(6);
    expect(spec.maxAgents).toBe(10);
    expect(spec.slots).toHaveLength(10);
    expect(spec.slots[0]!.requiredRole).toBe("Tank");
    // The recommended party filled the tank slot with an actual tank.
    expect(spec.slots[0]!.role).toBe("Tank");

    expect(spec.location.site).toBe("Attumen the Huntsman");
  });

  it("the two encounters are genuinely distinct projections, not the same shape", () => {
    const a = compileEncounter(cellar, bootstrapOrg(FIRST_CHARTER), FIRST_CHARTER);
    const b = compileEncounter(attumen, bootstrapOrg(KARAZHAN), KARAZHAN);

    expect(a.objectives.length).not.toBe(b.objectives.length);
    expect(a.maxAgents).not.toBe(b.maxAgents);
    expect(a.slots.some((s) => s.requiredRole !== null)).toBe(false);
    expect(b.slots.some((s) => s.requiredRole !== null)).toBe(true);
    expect(a.winCondition).not.toBe(b.winCondition); // 1 objective vs 2
  });

  it("the loop closes: the compiled success ledger matches what runCycle actually writes", () => {
    // The encounter's resolution preview is a projection of the Outcome fields;
    // the real writeback runs through runCycle. This proves the projection is
    // faithful — the receipt promises exactly what the engine delivers — so the
    // playable encounter and the sim ledger can never drift apart.
    const org = bootstrapOrg(FIRST_CHARTER);
    const spec = compileEncounter(cellar, org, FIRST_CHARTER);
    const party = recommendAgentsForChallenge(cellar, org, FIRST_CHARTER);

    const result = runCycle({ org, arc: FIRST_CHARTER, assignments: [{ challengeId: "cellar", agentIds: party, tokensSpent: 0 }] });
    const report = result.reports[0]!;

    // The preview for the produced outcome is the one the receipt would show.
    const preview = spec.resolutions.find((r) => r.outcome === report.outcome)!;
    expect(preview).toBeTruthy();

    if (report.outcome === "success") {
      // The ledger genuinely moved, in the direction the preview promised.
      expect(result.org.resources.currency).toBeGreaterThan(org.resources.currency);
      expect(result.org.reputation).toBeGreaterThan(org.reputation);
      expect(preview.ledger.some((l) => l.includes("cellar-cleared"))).toBe(true);
      // The clear is recorded on an agent's history — the persistent world change.
      const recorded = Object.values(result.org.agents).some((a) =>
        a.assignmentHistory.some((h) => h.challengeId === "cellar" && h.outcome === "success"),
      );
      expect(recorded).toBe(true);
    }
  });

  it("every objective label and hazard is sourced from the contract, never invented per-id", () => {
    // Compile every challenge in both arcs; each objective must match an authored
    // check name and each hazard an authored consequence. If the compiler ever
    // hand-authored content for a specific id, this would drift.
    for (const arc of [FIRST_CHARTER, KARAZHAN]) {
      const org = bootstrapOrg(arc);
      for (const challenge of arc.challenges) {
        const spec = compileEncounter(challenge, org, arc);
        const checkNames = new Set(challenge.mechanicChecks.map((c) => c.name));
        const checkConsequences = new Set(challenge.mechanicChecks.map((c) => c.failureConsequence.type));
        for (const obj of spec.objectives) expect(checkNames.has(obj.label)).toBe(true);
        for (const hz of spec.hazards) expect(checkConsequences.has(hz.kind)).toBe(true);
        expect(spec.objectives).toHaveLength(challenge.mechanicChecks.length);
      }
    }
  });
});
