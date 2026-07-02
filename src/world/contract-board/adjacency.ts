// Unlock adjacency for the contract board. PURE — derives "clearing A unlocks B"
// edges from the engine structures that already encode the dependency graph:
// a challenge's outcomes grant `milestoneFlag`s, and another challenge's
// `accessRequirements.orgMilestones` consume them. No display-string parsing,
// no invented state: if the cartridge doesn't author the link, no edge exists.

import type { Challenge } from "../../engine/types.js";
import type { WorldNode } from "../contract.js";

export interface UnlockEdge {
  /** Challenge whose outcome grants the milestone (the unlocker). */
  fromChallengeId: string;
  /** Challenge gated on that milestone (the unlocked). */
  toChallengeId: string;
  /** The org milestone flag that links them. */
  milestone: string;
}

type ChallengeLike = Pick<Challenge, "id" | "accessRequirements" | "outcomes">;

export function unlockEdges(
  nodes: ReadonlyArray<Pick<WorldNode, "challengeId">>,
  challenges: ReadonlyArray<ChallengeLike>,
): UnlockEdge[] {
  const onBoard = new Set(nodes.map((n) => n.challengeId));

  // milestone flag -> the on-board challenge that can grant it
  const granters = new Map<string, string>();
  for (const c of challenges) {
    if (!onBoard.has(c.id)) continue;
    for (const outcome of [c.outcomes.success, c.outcomes.partial, c.outcomes.failure]) {
      if (outcome.milestoneFlag) granters.set(outcome.milestoneFlag, c.id);
    }
  }

  const edges: UnlockEdge[] = [];
  for (const c of challenges) {
    if (!onBoard.has(c.id)) continue;
    for (const milestone of c.accessRequirements.orgMilestones) {
      const from = granters.get(milestone);
      if (from && from !== c.id) {
        edges.push({ fromChallengeId: from, toChallengeId: c.id, milestone });
      }
    }
  }
  return edges;
}
