// Lane 1: the world's projection of the axm-arc resource-spend lever. The engine
// owns the law (variance narrowing); these tests prove the WORLD honors it and
// only surfaces it under the sovereignty rule:
//   - no authored lever → no spend control
//   - below-gate party → no spend control
//   - no tokens → no spend control
//   - authored lever + gates + tokens → spend control, capped by maxTokens/balance
//   - spend narrows the projected risk band WITHOUT moving the mean
//   - the world's steadiness mirrors the resolver (projection is faithful)
//   - the run path passes/clamps tokensSpent; the receipt words the spend
//
// No shipped cartridge authors a lever, so a fixture challenge drives the tests.

import { describe, expect, it } from "vitest";
import type { Challenge, ResourceSpendLever } from "../../src/engine/types.js";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { runCycle } from "../../src/engine/cycle.js";
import { evaluateParty } from "../../src/world/readiness.js";
import { spendOffer, spendWasUsed, steadinessForLever, resolveTokensSpent } from "../../src/world/encounter/spend.js";
import { compileEncounter } from "../../src/world/encounter/compile-encounter.js";
import { formatMessage } from "../../src/world/i18n/messages.js";

const LEVER: ResourceSpendLever = { maxTokens: 3, steadinessPerToken: 0.2, minSteadiness: 0.4 };
const gates = { countOk: true, rolesOk: true };

describe("spend control gating (sovereignty rule)", () => {
  it("no authored lever → no spend control", () => {
    expect(spendOffer(null, gates, 5).available).toBe(false);
  });
  it("below-gate party → no spend control", () => {
    expect(spendOffer(LEVER, { countOk: false, rolesOk: true }, 5).available).toBe(false);
    expect(spendOffer(LEVER, { countOk: true, rolesOk: false }, 5).available).toBe(false);
  });
  it("no tokens → no spend control", () => {
    expect(spendOffer(LEVER, gates, 0).available).toBe(false);
  });
  it("authored lever + gates + tokens → spend control capped by min(maxTokens, balance)", () => {
    expect(spendOffer(LEVER, gates, 5)).toEqual({ available: true, maxSpend: 3 }); // capped by maxTokens
    expect(spendOffer(LEVER, gates, 2)).toEqual({ available: true, maxSpend: 2 }); // capped by balance
  });
});

describe("steadiness mirrors the resolver", () => {
  it("k = 1 with no lever / no spend / gates fail; floors at minSteadiness", () => {
    expect(steadinessForLever(null, true, 3)).toBe(1);
    expect(steadinessForLever(LEVER, true, 0)).toBe(1);
    expect(steadinessForLever(LEVER, false, 3)).toBe(1); // gate independence
    expect(steadinessForLever(LEVER, true, 1)).toBeCloseTo(0.8);
    expect(steadinessForLever(LEVER, true, 3)).toBeCloseTo(0.4); // floored
    expect(steadinessForLever(LEVER, true, 99)).toBeCloseTo(0.4); // honored clamped to maxTokens
  });
});

// A per_agent Power check with an authored lever; the party sits "thin" — just
// inside the reliability buffer, so narrowing the band moves it toward ready.
function thinChallenge(): Challenge {
  return {
    id: "cellar", // reuse an available challenge id so status resolves
    name: "RS", description: "d",
    rosterRequirements: { minAgents: 1, maxAgents: 6, roleRequirements: [] },
    accessRequirements: { orgMilestones: [], agentAttunements: [], attunementThreshold: null },
    difficultyRating: 20,
    mechanicChecks: [{
      id: "pc", name: "Power", description: "d",
      attributeWeights: [{ attributeId: "power", weight: 1.0 }],
      difficultyThreshold: 10, scope: "per_agent",
      failureConsequence: { type: "stress", severity: 0.3 },
    }],
    completionCriteria: { type: "all_mechanics_passed", parameters: {} },
    timePressure: null,
    outcomes: { success: { rewardTable: [], narrative: "s" }, partial: { rewardTable: [], narrative: "p" }, failure: { rewardTable: [], narrative: "f" } },
    resourceSpend: LEVER,
  };
}

describe("spend narrows the projected band without moving the mean", () => {
  const org = bootstrapOrg(FIRST_CHARTER);
  // Pick an agent whose Power lands the check "thin" (projected within ±SWING of 10).
  const agent = Object.values(org.agents).sort((a, b) => (b.attributes.power ?? 0) - (a.attributes.power ?? 0))[0]!;
  const ch = thinChallenge();

  it("projected (mean) is identical with and without spend", () => {
    const base = evaluateParty(ch, [agent], FIRST_CHARTER, 0).checks[0]!;
    const spent = evaluateParty(ch, [agent], FIRST_CHARTER, 3).checks[0]!;
    expect(spent.projected).toBe(base.projected); // the expected strength does not move
    expect(spent.baseThreshold).toBe(base.baseThreshold);
  });

  it("the reliability buffer shrinks (band narrows) with spend", () => {
    const base = evaluateParty(ch, [agent], FIRST_CHARTER, 0).checks[0]!;
    const spent = evaluateParty(ch, [agent], FIRST_CHARTER, 3).checks[0]!;
    // reliableTarget = threshold + SWING·k, so spend lowers it strictly.
    expect(spent.reliableTarget).toBeLessThan(base.reliableTarget);
  });

  it("gate independence: a below-gate party's projection ignores spend", () => {
    // Force below-gate by requiring a role the agent lacks.
    const gated = { ...ch, rosterRequirements: { minAgents: 1, maxAgents: 6, roleRequirements: [{ roleId: "__none__", count: 1 }] } };
    const a0 = evaluateParty(gated, [agent], FIRST_CHARTER, 0);
    const a3 = evaluateParty(gated, [agent], FIRST_CHARTER, 3);
    expect(a3.checks[0]!.reliableTarget).toBe(a0.checks[0]!.reliableTarget); // no narrowing
  });
});

describe("projection is faithful to the resolver (world steadiness ↔ engine variance)", () => {
  it("running the same lever+spend through runCycle narrows the outcome variance", () => {
    // The engine already property-tests this; here we confirm the world's fixture
    // shape flows through runCycle so the projection can't drift from reality.
    const ch = thinChallenge();
    const arc = { ...FIRST_CHARTER, challenges: [ch, ...FIRST_CHARTER.challenges.filter((c) => c.id !== "cellar")] };
    const baseOrg = bootstrapOrg(arc);
    const party = Object.values(baseOrg.agents).slice(0, 3).map((a) => a.id);
    const scores0: number[] = [];
    const scores3: number[] = [];
    for (let seed = 0; seed < 200; seed++) {
      const org = { ...baseOrg, rngSeed: seed, resources: { ...baseOrg.resources, tokens: 10 } };
      const r0 = runCycle({ org, arc, assignments: [{ challengeId: "cellar", agentIds: party, tokensSpent: 0 }] });
      const r3 = runCycle({ org, arc, assignments: [{ challengeId: "cellar", agentIds: party, tokensSpent: 3 }] });
      scores0.push(r0.reports[0]!.assignedAgents[0]!.mechanicResults.find((m) => m.mechanicId === "pc")!.score);
      scores3.push(r3.reports[0]!.assignedAgents[0]!.mechanicResults.find((m) => m.mechanicId === "pc")!.score);
    }
    const variance = (xs: number[]) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length; };
    expect(variance(scores3)).toBeLessThan(variance(scores0));
  });
});

// The shell renders ONE encounter-wide spend control, so compileEncounter may only
// surface a lever that governs the whole challenge coherently: a challenge-level
// lever, or per-check levers that are all identical. Divergent per-check levers
// must NOT collapse into a single misleading control.
describe("spendLever surfaces only a coherent challenge-wide lever", () => {
  const org = bootstrapOrg(FIRST_CHARTER);
  const LEVER_B: ResourceSpendLever = { maxTokens: 2, steadinessPerToken: 0.5, minSteadiness: 0.5 };

  function check(id: string, lever?: ResourceSpendLever) {
    return {
      id, name: id, description: "d",
      attributeWeights: [{ attributeId: "power", weight: 1.0 }],
      difficultyThreshold: 10, scope: "per_agent" as const,
      failureConsequence: { type: "stress" as const, severity: 0.3 },
      ...(lever ? { resourceSpend: lever } : {}),
    };
  }
  function challengeWith(challengeLever: ResourceSpendLever | null, checks: ReturnType<typeof check>[]): Challenge {
    return {
      id: "cellar", name: "RS", description: "d",
      rosterRequirements: { minAgents: 1, maxAgents: 6, roleRequirements: [] },
      accessRequirements: { orgMilestones: [], agentAttunements: [], attunementThreshold: null },
      difficultyRating: 20,
      mechanicChecks: checks,
      completionCriteria: { type: "all_mechanics_passed", parameters: {} },
      timePressure: null,
      outcomes: { success: { rewardTable: [], narrative: "s" }, partial: { rewardTable: [], narrative: "p" }, failure: { rewardTable: [], narrative: "f" } },
      ...(challengeLever ? { resourceSpend: challengeLever } : {}),
    };
  }
  const lever = (ch: Challenge) => compileEncounter(ch, org, FIRST_CHARTER).spendLever;

  it("no lever authored anywhere → null", () => {
    expect(lever(challengeWith(null, [check("a"), check("b")]))).toBeNull();
  });
  it("challenge-level lever → surfaced (global by definition)", () => {
    expect(lever(challengeWith(LEVER, [check("a"), check("b")]))).toEqual(LEVER);
  });
  it("a single per-check lever → surfaced", () => {
    expect(lever(challengeWith(null, [check("a", LEVER), check("b")]))).toEqual(LEVER);
  });
  it("identical per-check levers → surfaced", () => {
    expect(lever(challengeWith(null, [check("a", LEVER), check("b", { ...LEVER })]))).toEqual(LEVER);
  });
  it("divergent per-check levers → null (would misrepresent; awaits per-objective UI)", () => {
    expect(lever(challengeWith(null, [check("a", LEVER), check("b", LEVER_B)]))).toBeNull();
  });
  it("challenge-level lever wins even when per-check levers diverge", () => {
    expect(lever(challengeWith(LEVER, [check("a", LEVER), check("b", LEVER_B)]))).toEqual(LEVER);
  });
});

describe("run path tokensSpent + receipt wording", () => {
  it("resolveTokensSpent honors an explicit choice (clamped) and treats undefined as no spend", () => {
    expect(resolveTokensSpent(2, 5)).toBe(2); // explicit
    expect(resolveTokensSpent(0, 5)).toBe(0); // explicit zero
    expect(resolveTokensSpent(9, 3)).toBe(3); // clamped to balance
    expect(resolveTokensSpent(-4, 5)).toBe(0); // never negative
    // Spend is explicit: an absent override is 0, NEVER an implicit debit — even
    // when tokens are held. Guards against hidden agency from a forgetful caller.
    expect(resolveTokensSpent(undefined, 5)).toBe(0);
    expect(resolveTokensSpent(undefined, 0)).toBe(0);
  });
  it("the receipt spend line is player-worded and gated on actual use", () => {
    expect(spendWasUsed(0)).toBe(false);
    expect(spendWasUsed(2)).toBe(true);
    expect(formatMessage("en", "encounterShell.spentSteadied", { n: 1, token: "Tokens" })).toBe("Spent 1 Tokens: steadied the roll");
  });
});
