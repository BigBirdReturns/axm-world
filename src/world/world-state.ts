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
  const latestEntryByChallenge = new Map(
    ledger.entries.map((entry) => [entry.challengeId, entry] as const),
  );

  return nodes.flatMap((node) => {
    if (node.status !== "cleared") return [];

    // "Recorded" is a ledger fact, not a synonym for engine-cleared. A stale,
    // partial, or corrupted run may contain one without the other; in that case
    // custody export must omit the claim rather than fabricate evidence.
    const entry = latestEntryByChallenge.get(node.challengeId);
    if (!entry) return [];

    return [{
      challengeId: node.challengeId,
      title: node.title,
      state: "recorded" as const,
      outcome: entry.outcome,
      worldChanges: entry.consequence.worldChanges.map((change) => change.label),
    }];
  });
}
