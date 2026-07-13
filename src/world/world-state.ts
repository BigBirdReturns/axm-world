import type { WorldNode } from "./contract.js";
import type { ContractOutcome, Ledger } from "./ledger.js";

/** Portable, player-readable proof that an authored location has changed. The
 * engine's node state remains authoritative; ledger facts explain what changed. */
export interface WorldTransformation {
  challengeId: string;
  title: string;
  state: "recorded";
  outcome: ContractOutcome | null;
  worldChanges: string[];
}

export function deriveWorldTransformations(nodes: readonly WorldNode[], ledger: Ledger): WorldTransformation[] {
  return nodes
    .filter((node) => node.status === "cleared")
    .map((node) => {
      const entry = [...ledger.entries].reverse().find((candidate) => candidate.challengeId === node.challengeId);
      return {
        challengeId: node.challengeId,
        title: node.title,
        state: "recorded" as const,
        outcome: entry?.outcome ?? null,
        worldChanges: entry?.consequence.worldChanges.map((change) => change.label) ?? [],
      };
    });
}
