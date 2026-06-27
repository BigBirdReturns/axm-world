import type { Agent, Organization } from "../../engine/types.js";

export type DowntimeAction = "rest" | "train" | "rally";

export interface DowntimePreview {
  label: string;
  stressDelta: number;
  moraleDelta: number;
}

export const DOWNTIME_ACTIONS: Record<DowntimeAction, DowntimePreview> = {
  rest: { label: "Rest", stressDelta: -3, moraleDelta: 1 },
  train: { label: "Train", stressDelta: 1, moraleDelta: 3 },
  rally: { label: "Rally", stressDelta: -1, moraleDelta: 2 },
};

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
