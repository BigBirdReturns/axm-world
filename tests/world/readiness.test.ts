import { describe, it, expect } from "vitest";
import type { Agent, Arc, Challenge } from "../../src/engine/types.js";
import { FIRST_CHARTER, FIRST_CHARTER_STARTING_ROSTER } from "../../src/arcs/index.js";
import { MINI_ARC, makeAgent } from "../fixtures/mini-arc.js";
import {
  describeContract,
  evaluateParty,
  agentBaseScore,
  recommendationRationale,
} from "../../src/world/readiness.js";

function challenge(arc: Arc, id: string): Challenge {
  const c = arc.challenges.find((x) => x.id === id);
  if (!c) throw new Error(`no challenge ${id}`);
  return c;
}

function withMorale(agent: Agent, morale: number): Agent {
  return { ...agent, morale };
}

describe("readiness — contract requirements", () => {
  it("describes a contract's checks, roles, and checked attributes (First Charter)", () => {
    const c = challenge(FIRST_CHARTER, "bridge-troll");
    const req = describeContract(c, FIRST_CHARTER);

    expect(req.minAgents).toBeGreaterThan(0);
    expect(req.roles.map((r) => r.roleName)).toContain("Vanguard");
    // surfaces the actual mechanic checks, named, with thresholds
    expect(req.checks.length).toBe(c.mechanicChecks.length);
    expect(req.checks.every((ck) => ck.threshold > 0 && ck.name.length > 0)).toBe(true);
    // checked attributes are the union the checks read, by weight
    expect(req.checkedAttributes.length).toBeGreaterThan(0);
    expect(req.checkedAttributes.map((a) => a.name)).toContain("Mettle");
  });

  it("recommendation rationale names the checked attributes (not magic)", () => {
    const req = describeContract(challenge(FIRST_CHARTER, "bridge-troll"), FIRST_CHARTER);
    const why = recommendationRationale(req);
    expect(why).toMatch(/Mettle|Power/);
    expect(why).toMatch(/Vanguard/); // required role is explained
  });
});

describe("readiness — invalid parties explain what's missing", () => {
  const troll = challenge(FIRST_CHARTER, "bridge-troll");

  it("too few agents is not runnable and says so", () => {
    const r = evaluateParty(troll, [], FIRST_CHARTER);
    expect(r.countOk).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/at least/i);
  });

  it("missing a required role projects failure and names the role", () => {
    // a full party drawn only from non-vanguard roles
    const noVanguard = FIRST_CHARTER_STARTING_ROSTER.filter((a) => a.role !== "vanguard").slice(0, troll.rosterRequirements.minAgents);
    const r = evaluateParty(troll, noVanguard, FIRST_CHARTER);
    expect(r.rolesOk).toBe(false);
    expect(r.missingRoles.some((m) => m.roleName === "Vanguard")).toBe(true);
    expect(r.projectedOutcome).toBe("failure");
    expect(r.reasons.join(" ")).toMatch(/Vanguard/);
  });
});

describe("readiness — a sound party reads as ready", () => {
  it("the engine-shaped recommendation projects success/partial, not failure", () => {
    const cellar = challenge(FIRST_CHARTER, "cellar");
    // cellar has no role requirement; assign the whole roster up to max
    const party = FIRST_CHARTER_STARTING_ROSTER.slice(0, cellar.rosterRequirements.maxAgents);
    const r = evaluateParty(cellar, party, FIRST_CHARTER);
    expect(r.countOk).toBe(true);
    expect(r.projectedOutcome).not.toBe("failure");
  });
});

describe("readiness — downtime changes the projection (closes the loop)", () => {
  it("Train (raises morale) strictly raises an agent's projected score", () => {
    const c = challenge(FIRST_CHARTER, "cellar");
    const check = c.mechanicChecks[0]!;
    const agent = FIRST_CHARTER_STARTING_ROSTER[0]!;
    const before = agentBaseScore(withMorale(agent, 50), check, FIRST_CHARTER);
    const after = agentBaseScore(withMorale(agent, 53), check, FIRST_CHARTER); // Train: +3 morale
    expect(after).toBeGreaterThan(before);
  });
});

describe("readiness — generalizes to a second cartridge (Mini Arc)", () => {
  const mini = challenge(MINI_ARC, "mini-challenge");

  it("describes per_agent + team_aggregate checks for a different arc", () => {
    const req = describeContract(mini, MINI_ARC);
    const scopes = req.checks.map((c) => c.scope);
    expect(scopes).toContain("per_agent");
    expect(scopes).toContain("team_aggregate");
    expect(req.checkedAttributes.length).toBeGreaterThan(0);
  });

  it("a strong party out-projects a weak one on the same contract", () => {
    const strong = [makeAgent(1, { tierId: "elite" }), makeAgent(2, { tierId: "elite" })];
    const weak = [makeAgent(3, { tierId: "common" })];
    const rStrong = evaluateParty(mini, strong, MINI_ARC);
    const rWeak = evaluateParty(mini, weak, MINI_ARC);
    const margin = (r: typeof rStrong) => r.checks.reduce((s, c) => s + c.margin, 0);
    expect(margin(rStrong)).toBeGreaterThan(margin(rWeak));
    // and the readout always produces an outcome + reasons array
    expect(["success", "partial", "failure"]).toContain(rStrong.projectedOutcome);
    expect(Array.isArray(rWeak.reasons)).toBe(true);
  });
});
