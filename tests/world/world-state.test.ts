import { describe, expect, it } from "vitest";
import type { WorldNode } from "../../src/world/contract.js";
import { appendResult, emptyLedger } from "../../src/world/ledger.js";
import { deriveWorldTransformations } from "../../src/world/world-state.js";

function node(status: WorldNode["status"]): WorldNode {
  return {
    id: "node-cellar",
    challengeId: "cellar",
    title: "The Cellar",
    description: "A cellar.",
    status,
    difficulty: 1,
    tierIndex: 0,
    requirements: [],
    availableSinceCycle: null,
    normal: [0, 1, 0],
    position: [0, 10, 0],
  };
}

describe("deriveWorldTransformations", () => {
  it("does not call a cleared node recorded without a matching ledger entry", () => {
    expect(deriveWorldTransformations([node("cleared")], emptyLedger("cart1_test"))).toEqual([]);
  });

  it("emits a recorded transformation only when cleared state and ledger evidence agree", () => {
    const ledger = appendResult(emptyLedger("cart1_test"), {
      challengeId: "cellar",
      challengeName: "The Cellar",
      outcome: "success",
      cycle: 1,
    });

    expect(deriveWorldTransformations([node("available")], ledger)).toEqual([]);
    expect(deriveWorldTransformations([node("cleared")], ledger)).toEqual([
      expect.objectContaining({
        challengeId: "cellar",
        state: "recorded",
        outcome: "success",
      }),
    ]);
  });
});
