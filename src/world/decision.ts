// World-side decision projection. The vendored engine remains the sole adjudicator;
// this module only captures what it actually changed so presentation can read back
// a resolved choice after the engine has removed the card from the queue.

import { resolveDramaCard } from "../engine/drama.js";
import type { DramaCardEffect, Organization } from "../engine/types.js";

export interface AppliedDecisionEffect {
  target: string;
  type: string;
  before: number;
  after: number;
  delta: number;
}

export interface DecisionResponse {
  cardId: string;
  optionId: string;
  triggerType: string;
  label: string;
  description: string;
  /** Only effects proven by a before/after engine-state delta are included. */
  effects: AppliedDecisionEffect[];
}

export interface WorldDecisionResolution {
  org: Organization;
  response: DecisionResponse;
  openingChoice: { optionId: string; label: string } | null;
}

function effectValue(org: Organization, effect: DramaCardEffect): number | null {
  const agent = org.agents[effect.target];
  if (!agent) return null;
  switch (effect.type) {
    case "morale": return agent.morale;
    case "stress": return agent.stress;
    case "loyalty": return agent.hiddenAttributes.loyalty;
    default: return null;
  }
}

/**
 * Resolve the queue head through the canonical engine, then derive a presentation
 * receipt from actual state. Invalid/stale selections return null and create no
 * response, so the shell can never announce a consequence the engine did not apply.
 */
export function resolveWorldDecision(org: Organization, optionId: string): WorldDecisionResolution | null {
  const card = org.dramaQueue[0];
  if (!card) return null;
  const option = card.options.find((candidate) => candidate.id === optionId);
  if (!option) return null;

  const before = option.effects.map((effect) => effectValue(org, effect));
  const { org: next } = resolveDramaCard(org, card.id, optionId, org.cycle);
  if (next.dramaQueue.some((candidate) => candidate.id === card.id)) return null;

  const effects: AppliedDecisionEffect[] = [];
  option.effects.forEach((effect, index) => {
    const prior = before[index] ?? null;
    const after = effectValue(next, effect);
    if (prior === null || after === null || prior === after) return;
    effects.push({
      target: effect.target,
      type: effect.type,
      before: prior,
      after,
      delta: after - prior,
    });
  });

  return {
    org: next,
    response: {
      cardId: card.id,
      optionId: option.id,
      triggerType: card.triggerType,
      label: option.label,
      description: option.description,
      effects,
    },
    openingChoice: card.id.startsWith("opening:")
      ? { optionId: option.id, label: option.label }
      : null,
  };
}
