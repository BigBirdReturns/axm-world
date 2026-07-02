// Between-cycle agent management: pure engine-state transforms that move an agent's
// stress/morale. Lives in the world spoke (the player), reusable by any costume over
// the shared engine seam. Pure + clamped.

import type { Agent, Organization } from "../engine/types.js";
import { t, type MessageId } from "./i18n/index.js";

export type DowntimeAction = "rest" | "train" | "rally";

export interface DowntimePreview {
  stressDelta: number;
  moraleDelta: number;
}

export const DOWNTIME_ACTIONS: Record<DowntimeAction, DowntimePreview> = {
  rest: { stressDelta: -3, moraleDelta: 1 },
  train: { stressDelta: 1, moraleDelta: 3 },
  rally: { stressDelta: -1, moraleDelta: 2 },
};

const ACTION_LABEL_ID: Record<DowntimeAction, MessageId> = {
  rest: "agentAction.rest",
  train: "agentAction.train",
  rally: "agentAction.rally",
};

/** Locale-aware display label for a downtime action. Chrome, not arc data —
 *  lives in the i18n catalog rather than baked into DOWNTIME_ACTIONS so it
 *  re-resolves live on every render instead of freezing at module load. */
export function downtimeActionLabel(action: DowntimeAction): string {
  return t(ACTION_LABEL_ID[action]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyDowntimeToAgent(agent: Agent, action: DowntimeAction): Agent {
  const preview = DOWNTIME_ACTIONS[action];
  return {
    ...agent,
    stress: clamp(agent.stress + preview.stressDelta, 0, 100),
    morale: clamp(agent.morale + preview.moraleDelta, 0, 100),
  };
}

export function applyAgentDowntime(org: Organization, agentId: string, action: DowntimeAction): Organization {
  const agent = org.agents[agentId];
  if (!agent) return org;
  return {
    ...org,
    agents: {
      ...org.agents,
      [agentId]: applyDowntimeToAgent(agent, action),
    },
  };
}
