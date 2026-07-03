import type { Agent, Arc, Challenge, Organization, RunReport } from "../engine/types.js";
import type { ChallengeAssignment } from "../engine/cycle.js";
import { challengeAccess, requiredAttunementChains } from "../engine/access.js";

export type PlayNodeStatus = "available" | "locked" | "cleared";

export interface PlayNode {
  id: string;
  challengeId: string;
  title: string;
  description: string;
  x: number;
  y: number;
  tierIndex: number;
  difficulty: number;
  status: PlayNodeStatus;
  requirements: string[];
  /** First cycle this challenge was choosable (0 = arc start), derived from the
   *  same success records that drive `status`. null when locked or cleared. */
  availableSinceCycle: number | null;
}

export interface PlayAgentToken {
  id: string;
  name: string;
  role: string;
  tier: string;
  x: number;
  y: number;
  stress: number;
  morale: number;
  attributes: Record<string, number>;
}

export interface PlayScene {
  arcId: string;
  title: string;
  subtitle: string;
  width: number;
  height: number;
  nodes: PlayNode[];
  agents: PlayAgentToken[];
  cycle: number;
  resources: {
    currency: number;
    tokens: number;
    reputation: number;
    currencyName: string;
    tokenName: string;
    reputationName: string;
  };
}

export interface PlayReportView {
  challengeId: string;
  challengeName: string;
  outcome: RunReport["outcome"];
  lines: string[];
  rewardSummary: string;
}

function clearedChallengeIds(org: Organization): Set<string> {
  const out = new Set<string>();
  for (const agent of Object.values(org.agents)) {
    for (const record of agent.assignmentHistory) {
      if (record.outcome === "success") out.add(record.challengeId);
    }
  }
  return out;
}

// Gate evaluation lives in the vendored engine (engine/access.ts:
// challengeAccess), the same derivation runCycle enforces — milestone gates
// AND attunement-chain gates. Roster feasibility mode: the node shows
// available once any legal party could exist; runCycle re-judges the actual
// party on run.
function statusForChallenge(challenge: Challenge, org: Organization, arc: Arc, cleared: Set<string>): PlayNodeStatus {
  if (cleared.has(challenge.id)) return "cleared";
  return challengeAccess(challenge, org, arc).accessible ? "available" : "locked";
}

/** challengeId -> earliest cycle any agent recorded a success on it. */
function earliestSuccessCycles(org: Organization): Map<string, number> {
  const out = new Map<string, number>();
  for (const agent of Object.values(org.agents)) {
    for (const record of agent.assignmentHistory) {
      if (record.outcome !== "success") continue;
      const prev = out.get(record.challengeId);
      if (prev === undefined || record.cycle < prev) out.set(record.challengeId, record.cycle);
    }
  }
  return out;
}

// First cycle the challenge's milestone gates were all satisfied. Success records
// are stamped with the pre-advance cycle, so a gate cleared at cycle N opens the
// challenge at N+1. Ungated challenges are open from the arc start (cycle 0).
// The `-cleared` normalization here matches engine/access.ts milestoneSatisfied
// (which statusForChallenge delegates to), so this can never disagree with the
// status it annotates. Attunement-gated nodes only get a timestamp once
// available, so the signal never ages a contract the player couldn't take.
function availableSince(challenge: Challenge, successCycles: Map<string, number>): number | null {
  let since = 0;
  for (const m of challenge.accessRequirements.orgMilestones) {
    const clearedAt = successCycles.get(m.replace(/-cleared$/, "")) ?? successCycles.get(m);
    if (clearedAt === undefined) return null;
    since = Math.max(since, clearedAt + 1);
  }
  return since;
}

function tierIndexForChallenge(arc: Arc, challengeId: string): number {
  const idx = arc.progressionTiers.findIndex((tier) => tier.challenges.includes(challengeId));
  return idx >= 0 ? idx : 0;
}

function requirementLabels(challenge: Challenge, arc: Arc): string[] {
  const labels: string[] = [];
  labels.push(`${challenge.rosterRequirements.minAgents}-${challenge.rosterRequirements.maxAgents} agents`);
  for (const req of challenge.rosterRequirements.roleRequirements) {
    const role = arc.roles.find((r) => r.id === req.roleId)?.name ?? req.roleId;
    labels.push(`${req.count} ${role}`);
  }
  for (const milestone of challenge.accessRequirements.orgMilestones) {
    labels.push(`requires ${milestone}`);
  }
  // Attunement gates: a chain's grantsAccessTo and the challenge's own
  // agentAttunements are one gate (engine/access.ts). Label with the authored
  // chain name and how much of the party must hold it.
  for (const chainId of requiredAttunementChains(challenge, arc)) {
    const chain = arc.attunementChains.find((c) => c.id === chainId);
    const threshold = challenge.accessRequirements.attunementThreshold ?? 1;
    const share = threshold >= 1 ? "full party" : `${Math.round(threshold * 100)}% of party`;
    labels.push(`attunement: ${chain?.name ?? chainId} (${share})`);
  }
  return labels;
}

export function compileArcToPlayScene(arc: Arc, org: Organization): PlayScene {
  const width = 960;
  const height = 560;
  const cleared = clearedChallengeIds(org);
  const successCycles = earliestSuccessCycles(org);
  const byTier = new Map<number, Challenge[]>();

  for (const challenge of arc.challenges) {
    const tierIndex = tierIndexForChallenge(arc, challenge.id);
    byTier.set(tierIndex, [...(byTier.get(tierIndex) ?? []), challenge]);
  }

  const tierCount = Math.max(1, byTier.size);
  const nodes: PlayNode[] = [];

  for (const [tierIndex, challenges] of [...byTier.entries()].sort((a, b) => a[0] - b[0])) {
    const x = 140 + tierIndex * ((width - 280) / Math.max(1, tierCount - 1));
    challenges.forEach((challenge, challengeIndex) => {
      const spread = 130;
      const centerY = height / 2;
      const offset = (challengeIndex - (challenges.length - 1) / 2) * spread;
      const status = statusForChallenge(challenge, org, arc, cleared);
      nodes.push({
        id: `node:${challenge.id}`,
        challengeId: challenge.id,
        title: challenge.name,
        description: challenge.description,
        x,
        y: centerY + offset,
        tierIndex,
        difficulty: challenge.difficultyRating,
        status,
        requirements: requirementLabels(challenge, arc),
        availableSinceCycle: status === "available" ? availableSince(challenge, successCycles) : null,
      });
    });
  }

  const agents = Object.values(org.agents).map((agent, index) => {
    const role = arc.roles.find((r) => r.id === agent.role)?.name ?? agent.role ?? "Flex";
    return {
      id: agent.id,
      name: agent.name,
      role,
      tier: agent.tier,
      x: 68,
      y: 96 + index * 54,
      stress: agent.stress,
      morale: agent.morale,
      attributes: agent.attributes,
    };
  });

  return {
    arcId: arc.meta.id,
    title: arc.meta.name,
    subtitle: `${arc.meta.domain} · ${arc.challenges.length} contracts · engine ${arc.meta.engineVersion}`,
    width,
    height,
    nodes,
    agents,
    cycle: org.cycle,
    resources: {
      currency: org.resources.currency,
      tokens: org.resources.tokens,
      reputation: org.reputation,
      currencyName: arc.currencyName,
      tokenName: arc.tokenName,
      reputationName: arc.reputationName,
    },
  };
}

function agentScoreForChallenge(agent: Agent, challenge: Challenge): number {
  let score = 0;
  for (const check of challenge.mechanicChecks) {
    for (const weight of check.attributeWeights) {
      score += (agent.attributes[weight.attributeId] ?? 0) * weight.weight;
    }
  }
  score += agent.morale / 100;
  score -= agent.stress * 0.15;
  return score;
}

export function recommendAgentsForChallenge(challenge: Challenge, org: Organization, arc: Arc): string[] {
  const available = Object.values(org.agents).filter((agent) => agent.downedUntilCycle === null);
  const selected = new Set<string>();

  for (const req of challenge.rosterRequirements.roleRequirements) {
    const candidates = available
      .filter((agent) => agent.role === req.roleId && !selected.has(agent.id))
      .sort((a, b) => agentScoreForChallenge(b, challenge) - agentScoreForChallenge(a, challenge));
    for (const agent of candidates.slice(0, req.count)) selected.add(agent.id);
  }

  const remaining = available
    .filter((agent) => !selected.has(agent.id))
    .sort((a, b) => agentScoreForChallenge(b, challenge) - agentScoreForChallenge(a, challenge));

  for (const agent of remaining) {
    if (selected.size >= challenge.rosterRequirements.minAgents) break;
    selected.add(agent.id);
  }

  if (selected.size < challenge.rosterRequirements.minAgents) {
    for (const agent of remaining) {
      if (selected.size >= challenge.rosterRequirements.maxAgents) break;
      selected.add(agent.id);
    }
  }

  return [...selected].slice(0, challenge.rosterRequirements.maxAgents);
}

export function buildPlayAssignment(challenge: Challenge, org: Organization, arc: Arc): ChallengeAssignment {
  return {
    challengeId: challenge.id,
    agentIds: recommendAgentsForChallenge(challenge, org, arc),
    tokensSpent: org.resources.tokens > 0 ? 1 : 0,
  };
}

export function summarizeReport(report: RunReport, arc: Arc): PlayReportView {
  const challenge = arc.challenges.find((c) => c.id === report.challengeId);
  const outcome = challenge?.outcomes[report.outcome];
  const itemNames = report.lootDrops
    .map((drop) => arc.items.find((item) => item.id === drop.itemId)?.name ?? drop.itemId);

  const lines = report.assignedAgents.map((agentReport) => {
    const best = [...agentReport.mechanicResults].sort((a, b) => (b.score - b.threshold) - (a.score - a.threshold))[0];
    const agentName = Object.values(arc.roles).length ? agentReport.agentId : agentReport.agentId;
    if (!best) return `${agentName}: no mechanic result`;
    const mechanic = challenge?.mechanicChecks.find((check) => check.id === best.mechanicId);
    return `${agentReport.agentId}: ${mechanic?.name ?? best.mechanicId} ${Math.round(best.score)} / ${best.threshold}`;
  });

  return {
    challengeId: report.challengeId,
    challengeName: challenge?.name ?? report.challengeId,
    outcome: report.outcome,
    lines,
    rewardSummary: [
      outcome?.narrative,
      report.rewardsGranted ? `+${report.rewardsGranted.currency} currency, +${report.rewardsGranted.reputation} reputation` : null,
      itemNames.length > 0 ? `Loot: ${itemNames.join(", ")}` : null,
    ].filter(Boolean).join(" "),
  };
}
