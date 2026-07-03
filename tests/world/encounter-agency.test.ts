// Encounter agency: the deploy-your-squad turn is only meaningful if the SAME
// readiness the shell shows genuinely responds to the player's choice, and if the
// engine's own count gate is honored. These tests pin both — and pin the honest
// finding that The Cellar is choice-locked while The Bridge Troll is not.

import { describe, expect, it } from "vitest";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { recommendAgentsForChallenge } from "../../src/play-pipeline/compile.js";
import { evaluateParty } from "../../src/world/readiness.js";

const org = bootstrapOrg(FIRST_CHARTER);
const agent = (id: string) => org.agents[id]!;
const bridge = FIRST_CHARTER.challenges.find((c) => c.id === "bridge-troll")!;
const cellar = FIRST_CHARTER.challenges.find((c) => c.id === "cellar")!;

describe("encounter agency — the deploy choice is real where the contract affords it", () => {
  const roster = Object.values(org.agents);
  const vanguards = roster.filter((a) => a.role === "vanguard");
  const nonVanguards = roster.filter((a) => a.role !== "vanguard");

  it("Bridge Troll: benching every Vanguard flips the projection to failure", () => {
    const withVanguard = evaluateParty(bridge, [vanguards[0]!, ...nonVanguards.slice(0, 3)], FIRST_CHARTER);
    const noVanguard = evaluateParty(bridge, nonVanguards.slice(0, 4), FIRST_CHARTER);

    // Leaving the required role in the reserve is a real, engine-honored mistake.
    expect(noVanguard.rolesOk).toBe(false);
    expect(noVanguard.projectedOutcome).toBe("failure");
    expect(withVanguard.projectedOutcome).not.toBe(noVanguard.projectedOutcome);
  });

  it("Bridge Troll: committing 4 vs all 6 reaches the engine's aggregate math", () => {
    const four = [vanguards[0]!, ...nonVanguards.slice(0, 3)]; // legal min squad, 1 vanguard
    const six = roster; // everyone in
    const r4 = evaluateParty(bridge, four, FIRST_CHARTER);
    const r6 = evaluateParty(bridge, six, FIRST_CHARTER);
    expect(four.length).toBe(4);
    expect(r4.countOk).toBe(true);
    expect(r6.countOk).toBe(true);
    // team_aggregate sums each committed agent — so who/how-many the player sends
    // changes the projected score. The choice is not cosmetic.
    const c4 = r4.checks.find((c) => c.id === "troll-assault")!;
    const c6 = r6.checks.find((c) => c.id === "troll-assault")!;
    expect(c4.projected).not.toBe(c6.projected);
  });

  it("The Cellar is choice-locked: only a full party of 6 is legal (min == max == roster)", () => {
    const full = recommendAgentsForChallenge(cellar, org, FIRST_CHARTER).map(agent);
    expect(full.length).toBe(6);
    // Below the required 6 → the engine count gate is not satisfied, so the shell
    // cannot resolve. There is no honest sub-choice here; that's the contract.
    expect(evaluateParty(cellar, full.slice(0, 5), FIRST_CHARTER).countOk).toBe(false);
    expect(evaluateParty(cellar, full, FIRST_CHARTER).countOk).toBe(true);
  });
});
