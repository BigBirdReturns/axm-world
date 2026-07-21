// Player-facing reward decision support. Arc remains the authority for
// eligibility, mutation, fairness precedent, and morale consequence; this file
// only explains which eligible founder makes the strongest mechanical use of an
// authored item's bonuses.

import { compareCodepoints } from "../engine/determinism.js";
import type { Arc, Organization } from "../engine/types.js";
import type { PendingRewardChoice } from "../engine/cycle.js";

export interface RewardRecipientRecommendation {
  agentId: string;
  score: number;
  reason: string;
}

export function recommendRewardRecipient(
  choice: PendingRewardChoice,
  org: Organization,
  arc: Arc,
): RewardRecipientRecommendation | null {
  const item = arc.items.find((candidate) => candidate.id === choice.itemId);
  if (!item) return null;
  const candidates = choice.eligibleAgentIds
    .map((id) => org.agents[id])
    .filter((agent): agent is NonNullable<typeof agent> => Boolean(agent))
    .sort((left, right) => compareCodepoints(left.id, right.id));
  if (candidates.length === 0) return null;

  const scored = candidates.map((agent) => {
    const role = arc.roles.find((candidate) => candidate.id === agent.role);
    let roleFit = 0;
    let needFit = 0;
    const reasons: Array<{ name: string; contribution: number }> = [];
    for (const [attributeId, bonus] of Object.entries(item.statBonuses)) {
      const roleWeight = role?.attributeWeights[attributeId] ?? 0;
      const contribution = bonus * roleWeight;
      roleFit += contribution;
      // Need is deliberately subordinate to role fit: it breaks otherwise equal
      // fits without telling the player that the weakest current number is
      // always the correct recipient.
      const current = agent.attributes[attributeId] ?? 0;
      needFit += bonus * Math.max(0, 24 - current) * 0.001;
      reasons.push({
        name: arc.attributes.find((attribute) => attribute.id === attributeId)?.name ?? attributeId,
        contribution,
      });
    }
    const strongest = reasons.sort((left, right) => right.contribution - left.contribution)[0];
    return {
      agent,
      score: roleFit + needFit,
      reason: strongest && strongest.contribution > 0
        ? `${role?.name ?? "Flex"} makes strongest use of ${strongest.name}.`
        : `${role?.name ?? "Flex"} is the best remaining eligible fit.`,
    };
  }).sort((left, right) => right.score - left.score || compareCodepoints(left.agent.id, right.agent.id));

  const best = scored[0]!;
  return { agentId: best.agent.id, score: best.score, reason: best.reason };
}
