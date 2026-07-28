import { describe, expect, it } from "vitest";
import {
  PLAYABLE_PRODUCT_EVALUATION_FORMAT,
  evaluatePlayableProduct,
} from "../../src/world/acceptance/playable-product.js";
import type { OneAmStructuralEvaluation } from "../../src/world/acceptance/one-am-structural-evidence.js";
import type { RepresentationEvaluation } from "../../src/world/acceptance/representation-completeness.js";
import type { OneAmPlayerEvaluation } from "../../src/world/experience/one-am-player.js";

const structural: OneAmStructuralEvaluation = {
  format: "rodoh-one-am-structural-evaluation/1",
  candidate: {
    repository: "BigBirdReturns/axm-world",
    commit: "a".repeat(40),
    authoredIdentity: "cart1_fixture",
    experienceId: "fixture",
  },
  status: "pass",
  blockers: [],
  metrics: { firstActionPromptMs: 1_000, firstMeaningfulSuccessMs: 10_000, maximumRecoveryMs: null },
};

const representation: RepresentationEvaluation = {
  format: "rodoh-representation-evaluation/1",
  planId: "fixture-white-label-v1",
  status: "pass",
  blockers: [],
  metrics: { assets: 20, surfaces: 6, people: 4, objectives: 3, states: 4 },
};

const blindPlayer: OneAmPlayerEvaluation = {
  format: "rodoh-one-am-player-evaluation/1",
  candidate: structural.candidate,
  status: "pass",
  blockers: [],
};

describe("playable product completeness", () => {
  it("refuses authored structure when representation is still schematic", () => {
    const result = evaluatePlayableProduct({
      structural,
      representation: {
        ...representation,
        status: "fail",
        blockers: ["Final action representation is primitive-only rather than cartridge-owned."],
      },
    });
    expect(result).toEqual({
      format: PLAYABLE_PRODUCT_EVALUATION_FORMAT,
      classification: "rejected",
      blockers: ["Representation: Final action representation is primitive-only rather than cartridge-owned."],
      gates: { authoredStructure: "pass", representation: "fail", blindPlayer: "absent" },
    });
  });

  it("calls the candidate machine-qualified only after structure and representation both pass", () => {
    const result = evaluatePlayableProduct({ structural, representation });
    expect(result.classification).toBe("machine-qualified-authored-pilot");
    expect(result.blockers).toEqual(["Blind player: independent zero-assistance receipt is absent."]);
    expect(result.gates).toEqual({ authoredStructure: "pass", representation: "pass", blindPlayer: "absent" });
  });

  it("reserves playable authored episode for the same candidate's independent receipt", () => {
    const result = evaluatePlayableProduct({ structural, representation, blindPlayer });
    expect(result).toEqual({
      format: PLAYABLE_PRODUCT_EVALUATION_FORMAT,
      classification: "accepted-playable-authored-episode",
      blockers: [],
      gates: { authoredStructure: "pass", representation: "pass", blindPlayer: "pass" },
    });
  });
});
