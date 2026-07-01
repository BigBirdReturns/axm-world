import { describe, expect, it } from "vitest";
import { unlockEdges } from "../../src/world/contract-board/adjacency.js";

interface OutcomeLike { milestoneFlag?: string }
function challenge(id: string, needs: string[] = [], grants?: { success?: string; partial?: string; failure?: string }) {
  const outcome = (flag?: string): OutcomeLike => (flag ? { milestoneFlag: flag } : {});
  return {
    id,
    accessRequirements: { orgMilestones: needs },
    outcomes: {
      success: outcome(grants?.success),
      partial: outcome(grants?.partial),
      failure: outcome(grants?.failure),
    },
  } as never;
}
const node = (challengeId: string) => ({ challengeId });

describe("unlockEdges", () => {
  it("links a milestone granter to its consumer", () => {
    const edges = unlockEdges(
      [node("a"), node("b")],
      [challenge("a", [], { success: "a-cleared" }), challenge("b", ["a-cleared"])],
    );
    expect(edges).toEqual([{ fromChallengeId: "a", toChallengeId: "b", milestone: "a-cleared" }]);
  });

  it("draws no edge when the granting challenge is not on the board", () => {
    const edges = unlockEdges(
      [node("b")],
      [challenge("a", [], { success: "a-cleared" }), challenge("b", ["a-cleared"])],
    );
    expect(edges).toEqual([]);
  });

  it("fans out one granter to multiple consumers", () => {
    const edges = unlockEdges(
      [node("a"), node("b"), node("c")],
      [
        challenge("a", [], { success: "a-cleared" }),
        challenge("b", ["a-cleared"]),
        challenge("c", ["a-cleared"]),
      ],
    );
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.toChallengeId).sort()).toEqual(["b", "c"]);
  });

  it("counts milestones granted by partial and failure outcomes too", () => {
    const edges = unlockEdges(
      [node("a"), node("b")],
      [challenge("a", [], { partial: "a-cleared" }), challenge("b", ["a-cleared"])],
    );
    expect(edges).toHaveLength(1);
  });

  it("never links a challenge to itself", () => {
    const edges = unlockEdges(
      [node("a")],
      [challenge("a", ["a-cleared"], { success: "a-cleared" })],
    );
    expect(edges).toEqual([]);
  });

  it("finds the authored First Charter chain in the real cartridge", async () => {
    const { FIRST_CHARTER } = await import("../../src/arcs/first-charter.js");
    const nodes = FIRST_CHARTER.challenges.map((c) => ({ challengeId: c.id }));
    const edges = unlockEdges(nodes, FIRST_CHARTER.challenges);
    // The cartridge authors at least the merchant-escort → mine-collapse gate.
    expect(edges.length).toBeGreaterThanOrEqual(1);
    for (const edge of edges) {
      expect(edge.fromChallengeId).not.toBe(edge.toChallengeId);
      expect(nodes.some((n) => n.challengeId === edge.fromChallengeId)).toBe(true);
      expect(nodes.some((n) => n.challengeId === edge.toChallengeId)).toBe(true);
    }
  });
});
