// Parity guard: the resolver (engine, source of truth) and the readiness projection
// (UI) must scope role_specific checks to the SAME roles. If these ever diverge, the
// UI would explain one game while the engine runs another — the exact bug the roleIds
// change exists to prevent. This test fails loudly on divergence.

import { describe, it, expect } from "vitest";
import type { Agent, Challenge } from "../../src/engine/types.js";
import { FIRST_CHARTER, FIRST_CHARTER_STARTING_ROSTER } from "../../src/arcs/index.js";
import { resolveChallenge } from "../../src/engine/resolver.js";
import { Rng } from "../../src/engine/prng.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { describeContract } from "../../src/world/readiness.js";

const ARC = FIRST_CHARTER;

function escort(): Challenge {
  const c = ARC.challenges.find((x) => x.id === "merchant-escort");
  if (!c) throw new Error("merchant-escort missing");
  return c;
}

/** A party with both a vanguard and a mender present (≥ minAgents). */
function escortParty(): Agent[] {
  const vanguard = FIRST_CHARTER_STARTING_ROSTER.find((a) => a.role === "vanguard")!;
  const mender = FIRST_CHARTER_STARTING_ROSTER.find((a) => a.role === "mender")!;
  const rest = FIRST_CHARTER_STARTING_ROSTER.filter((a) => a.id !== vanguard.id && a.id !== mender.id);
  return [vanguard, mender, ...rest].slice(0, escort().rosterRequirements.minAgents);
}

/** Roles the RESOLVER actually evaluated for a check = roles of agents that did NOT get
 *  the out-of-scope neutral pass (score exactly equal to the threshold, passed). */
function rolesScoredByResolver(challenge: Challenge, party: Agent[], checkId: string): Set<string> {
  const report = resolveChallenge({ challenge, assignedAgents: party, org: bootstrapOrg(ARC), arc: ARC, rng: new Rng(1), cycle: 1 });
  const check = challenge.mechanicChecks.find((c) => c.id === checkId)!;
  const inScope = new Set<string>();
  for (const ar of report.assignedAgents) {
    const mr = ar.mechanicResults.find((r) => r.mechanicId === checkId)!;
    const agent = party.find((p) => p.id === ar.agentId)!;
    // out-of-scope agents are recorded as a neutral pass at exactly the threshold
    const neutral = mr.passed && mr.score === check.difficultyThreshold;
    if (!neutral) inScope.add(agent.role ?? "");
  }
  return inScope;
}

/** Roles the UI projection scopes a role_specific check to. */
function rolesScopedByReadiness(challenge: Challenge, checkId: string): Set<string> {
  const req = describeContract(challenge, ARC);
  const check = req.checks.find((c) => c.id === checkId)!;
  // readiness exposes role names; map back to ids for comparison
  const ids = check.roleIds;
  return new Set(ids);
}

describe("role-scope parity — resolver and UI projection agree", () => {
  it("a roleIds-scoped check (Guard the Wagons → vanguard) is scored for vanguards only, in both", () => {
    const party = escortParty();
    const resolverRoles = rolesScoredByResolver(escort(), party, "escort-guard");
    const readinessRoles = rolesScopedByReadiness(escort(), "escort-guard");

    expect([...resolverRoles]).toEqual(["vanguard"]);
    expect([...readinessRoles]).toEqual(["vanguard"]);
    expect(resolverRoles).toEqual(readinessRoles);
  });

  it("Sustain the March → mender is scored for menders only, in both", () => {
    const party = escortParty();
    expect([...rolesScoredByResolver(escort(), party, "escort-sustain")]).toEqual(["mender"]);
    expect([...rolesScopedByReadiness(escort(), "escort-sustain")]).toEqual(["mender"]);
  });

  it("without roleIds, both fall back to the challenge's required roles (backward compatible)", () => {
    const legacy: Challenge = {
      ...escort(),
      mechanicChecks: escort().mechanicChecks.map((c) =>
        c.id === "escort-guard" ? { ...c, roleIds: undefined } : c,
      ),
    };
    const party = escortParty();
    const resolverRoles = rolesScoredByResolver(legacy, party, "escort-guard");
    const readinessRoles = rolesScopedByReadiness(legacy, "escort-guard");

    // challenge requires vanguard + mender, so both are in scope for the unscoped check
    expect(resolverRoles).toEqual(new Set(["vanguard", "mender"]));
    expect(readinessRoles).toEqual(new Set(["vanguard", "mender"]));
    expect(resolverRoles).toEqual(readinessRoles);
  });
});
