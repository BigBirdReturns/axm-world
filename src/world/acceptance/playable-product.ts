import type { OneAmStructuralEvaluation } from "./one-am-structural-evidence.js";
import type { RepresentationEvaluation } from "./representation-completeness.js";
import type { OneAmPlayerEvaluation } from "../experience/one-am-player.js";

export const PLAYABLE_PRODUCT_EVALUATION_FORMAT = "rodoh-playable-product-evaluation/1" as const;

export interface PlayableProductEvaluation {
  format: typeof PLAYABLE_PRODUCT_EVALUATION_FORMAT;
  classification: "rejected" | "machine-qualified-authored-pilot" | "accepted-playable-authored-episode";
  blockers: string[];
  gates: {
    authoredStructure: "pass" | "fail";
    representation: "pass" | "fail";
    blindPlayer: "pass" | "fail" | "absent";
  };
}

export function evaluatePlayableProduct(input: {
  structural: OneAmStructuralEvaluation;
  representation: RepresentationEvaluation;
  blindPlayer?: OneAmPlayerEvaluation | null;
}): PlayableProductEvaluation {
  const blockers: string[] = [];
  if (input.structural.status !== "pass") {
    blockers.push(...input.structural.blockers.map((blocker) => `Authored structure: ${blocker}`));
  }
  if (input.representation.status !== "pass") {
    blockers.push(...input.representation.blockers.map((blocker) => `Representation: ${blocker}`));
  }

  const machineQualified = input.structural.status === "pass" && input.representation.status === "pass";
  if (!machineQualified) {
    return {
      format: PLAYABLE_PRODUCT_EVALUATION_FORMAT,
      classification: "rejected",
      blockers,
      gates: {
        authoredStructure: input.structural.status,
        representation: input.representation.status,
        blindPlayer: input.blindPlayer?.status ?? "absent",
      },
    };
  }

  if (!input.blindPlayer || input.blindPlayer.status !== "pass") {
    if (input.blindPlayer) blockers.push(...input.blindPlayer.blockers.map((blocker) => `Blind player: ${blocker}`));
    else blockers.push("Blind player: independent zero-assistance receipt is absent.");
    return {
      format: PLAYABLE_PRODUCT_EVALUATION_FORMAT,
      classification: "machine-qualified-authored-pilot",
      blockers,
      gates: {
        authoredStructure: "pass",
        representation: "pass",
        blindPlayer: input.blindPlayer?.status ?? "absent",
      },
    };
  }

  return {
    format: PLAYABLE_PRODUCT_EVALUATION_FORMAT,
    classification: "accepted-playable-authored-episode",
    blockers: [],
    gates: {
      authoredStructure: "pass",
      representation: "pass",
      blindPlayer: "pass",
    },
  };
}
