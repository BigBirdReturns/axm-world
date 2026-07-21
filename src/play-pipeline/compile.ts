import type { Agent, Arc, Challenge, Organization, RunReport } from "../engine/types.js";
import type { ChallengeAssignment } from "../engine/cycle.js";
import { challengeAccess, requiredAttunementChains } from "../engine/access.js";
import { projectMechanics } from "../engine/projections.js";
import { compareCodepoints } from "../engine/determinism.js";

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

/** One agent's contribution to a check, in player terms (score vs target, margin),
 *  never the engine's "score / threshold" fraction. */
export interface AgentContribution {
  agentId: string;
  agentName: string;
  score: number;
  target: number;
  /** score - target: positive when cleared, negative when short. */
  margin: number;
  passed: boolean;
}

/** One mechanic check, read for a player: what it tested, whether the party
 *  cleared it, by how much, and who led. All derived from the engine's report. */
export interface ObjectiveResult {
  id: string;
  name: string;
  /** Primary attribute the check reads (e.g. "Power"), or null if none. */
  attribute: string | null;
  target: number;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  /** Highest-scoring contributor, or null if the check produced no results. */
  best: AgentContribution | null;
  contributions: AgentContribution[];
}

export interface PlayReportView {
  challengeId: string;
  challengeName: string;
  outcome: RunReport["outcome"];
  /** Per-objective summary (one per mechanic check), in player language. */
  objectives: ObjectiveResult[];
  /** Per-agent detail rows, resolved to agent names (not raw ids). */
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

interface RecommendedPartyPlan {
  agentIds: string[];
  failCount: number;
  tightCount: number;
  worstMargin: number;
  totalMargin: number;
}

function partyPlan(challenge: Challenge, agents: Agent[], org: Organization, arc: Arc): RecommendedPartyPlan {
  const projections = projectMechanics({ challenge, assignedAgents: agents, org, arc });
  const margins = projections.map((projection) => projection.margin);
  return {
    agentIds: agents.map((agent) => agent.id).sort(compareCodepoints),
    failCount: projections.filter((projection) => projection.assessment === "fail").length,
    tightCount: projections.filter((projection) => projection.assessment === "tight").length,
    worstMargin: margins.length > 0 ? Math.min(...margins) : Number.NEGATIVE_INFINITY,
    totalMargin: margins.reduce((sum, margin) => sum + margin, 0),
  };
}

function betterRecommendedPlan(candidate: RecommendedPartyPlan, incumbent: RecommendedPartyPlan): boolean {
  if (candidate.failCount !== incumbent.failCount) return candidate.failCount < incumbent.failCount;
  if (candidate.tightCount !== incumbent.tightCount) return candidate.tightCount < incumbent.tightCount;
  if (candidate.worstMargin !== incumbent.worstMargin) return candidate.worstMargin > incumbent.worstMargin;
  if (candidate.totalMargin !== incumbent.totalMargin) return candidate.totalMargin > incumbent.totalMargin;
  // When two plans project identically, deploy fewer people. This avoids
  // manufacturing a "more is always better" rule on per-agent or average checks.
  if (candidate.agentIds.length !== incumbent.agentIds.length) return candidate.agentIds.length < incumbent.agentIds.length;
  return compareCodepoints(candidate.agentIds.join("\u0000"), incumbent.agentIds.join("\u0000")) < 0;
}

function rolesSatisfied(challenge: Challenge, party: Agent[]): boolean {
  return challenge.rosterRequirements.roleRequirements.every(
    (requirement) => party.filter((agent) => agent.role === requirement.roleId).length >= requirement.count,
  );
}

/** Enumerate bounded party combinations without turning the recommender into an
 *  exponential scale hazard. Reference cartridges have small rosters, so they
 *  receive exact projected selection; large raids keep the deterministic greedy
 *  path below until a dedicated indexed squad planner lands. */
function exactRecommendedParty(
  challenge: Challenge,
  available: Agent[],
  org: Organization,
  arc: Arc,
): RecommendedPartyPlan | null {
  const min = challenge.rosterRequirements.minAgents;
  const max = Math.min(challenge.rosterRequirements.maxAgents, available.length);
  if (available.length > 16 || max > 10) return null;

  const ordered = [...available].sort((a, b) => compareCodepoints(a.id, b.id));
  let best: RecommendedPartyPlan | null = null;
  let visited = 0;
  const visitLimit = 50_000;

  const choose = (start: number, targetSize: number, current: Agent[]): void => {
    if (visited >= visitLimit) return;
    if (current.length === targetSize) {
      visited += 1;
      if (!rolesSatisfied(challenge, current)) return;
      const ids = current.map((agent) => agent.id);
      if (!challengeAccess(challenge, org, arc, ids).accessible) return;
      const plan = partyPlan(challenge, current, org, arc);
      if (best === null || betterRecommendedPlan(plan, best)) best = plan;
      return;
    }
    const needed = targetSize - current.length;
    for (let index = start; index <= ordered.length - needed; index += 1) {
      current.push(ordered[index]!);
      choose(index + 1, targetSize, current);
      current.pop();
      if (visited >= visitLimit) return;
    }
  };

  for (let size = min; size <= max; size += 1) choose(0, size, []);
  return best;
}

function greedyRecommendedParty(challenge: Challenge, available: Agent[], org: Organization, arc: Arc): string[] {
  const selected = new Set<string>();
  const ranked = [...available].sort((a, b) => {
    const score = agentScoreForChallenge(b, challenge) - agentScoreForChallenge(a, challenge);
    return score || compareCodepoints(a.id, b.id);
  });

  for (const requirement of challenge.rosterRequirements.roleRequirements) {
    const candidates = ranked.filter((agent) => agent.role === requirement.roleId && !selected.has(agent.id));
    for (const agent of candidates.slice(0, requirement.count)) selected.add(agent.id);
  }
  for (const agent of ranked) {
    if (selected.size >= challenge.rosterRequirements.minAgents) break;
    selected.add(agent.id);
  }

  // Evaluate deterministic prefixes through max size: a fixed aggregate can
  // benefit from an extra strong member, while a per-agent average can worsen.
  let best: RecommendedPartyPlan | null = null;
  const base = [...selected].map((id) => available.find((agent) => agent.id === id)!).filter(Boolean);
  const remaining = ranked.filter((agent) => !selected.has(agent.id));
  const max = Math.min(challenge.rosterRequirements.maxAgents, available.length);
  for (let size = base.length; size <= max; size += 1) {
    const party = [...base, ...remaining.slice(0, Math.max(0, size - base.length))];
    if (party.length < challenge.rosterRequirements.minAgents || !rolesSatisfied(challenge, party)) continue;
    const ids = party.map((agent) => agent.id);
    if (!challengeAccess(challenge, org, arc, ids).accessible) continue;
    const plan = partyPlan(challenge, party, org, arc);
    if (best === null || betterRecommendedPlan(plan, best)) best = plan;
  }
  return best?.agentIds ?? [...selected].slice(0, max);
}

/** Select the strongest legal party according to the same deterministic
 * projections shown to the player. Small cartridges receive an exact search;
 * large rosters receive a bounded deterministic planner. The recommendation is
 * advice only: the committed party remains the party runCycle resolves. */
export function recommendAgentsForChallenge(challenge: Challenge, org: Organization, arc: Arc): string[] {
  const available = Object.values(org.agents).filter((agent) => agent.downedUntilCycle === null);
  const exact = exactRecommendedParty(challenge, available, org, arc);
  return exact?.agentIds ?? greedyRecommendedParty(challenge, available, org, arc);
}

export function buildPlayAssignment(challenge: Challenge, org: Organization, arc: Arc): ChallengeAssignment {
  return {
    challengeId: challenge.id,
    agentIds: recommendAgentsForChallenge(challenge, org, arc),
    // This pipeline has no human spend choice. Match useArcWorld's explicit-
    // spend law: absence of a choice is zero, never a hidden debit.
    tokensSpent: 0,
  };
}

export function summarizeReport(
  report: RunReport,
  arc: Arc,
  resolveAgentName: (agentId: string) => string = (agentId) => agentId,
): PlayReportView {
  const challenge = arc.challenges.find((c) => c.id === report.challengeId);
  const outcome = challenge?.outcomes[report.outcome];
  const itemNames = report.lootDrops
    .map((drop) => arc.items.find((item) => item.id === drop.itemId)?.name ?? drop.itemId);

  // Per-objective summary in PLAYER language: score vs target and margin, never
  // the engine's "score / threshold" fraction (which reads like "77 out of 5").
  // Reads the resolver's own per-agent results; does not re-derive completion.
  const objectives: ObjectiveResult[] = (challenge?.mechanicChecks ?? []).map((check) => {
    const primaryAttr = [...check.attributeWeights].sort((a, b) => b.weight - a.weight)[0];
    const attribute = primaryAttr ? arc.attributes.find((a) => a.id === primaryAttr.attributeId)?.name ?? null : null;

    const contributions: AgentContribution[] = report.assignedAgents
      .flatMap((ar) => ar.mechanicResults.filter((m) => m.mechanicId === check.id).map((m) => ({ ar, m })))
      .map(({ ar, m }) => {
        const score = Math.round(m.score);
        return {
          agentId: ar.agentId,
          agentName: resolveAgentName(ar.agentId),
          score,
          target: m.threshold,
          margin: score - m.threshold,
          passed: m.passed,
        };
      });

    const passedCount = contributions.filter((c) => c.passed).length;
    const best = contributions.length > 0 ? [...contributions].sort((a, b) => b.score - a.score)[0]! : null;

    return {
      id: check.id,
      name: check.name,
      attribute,
      target: check.difficultyThreshold,
      passed: contributions.length > 0 && passedCount === contributions.length,
      passedCount,
      totalCount: contributions.length,
      best,
      contributions,
    };
  });

  // Compact per-agent lines (used by the cinematic director), also in player
  // language: "Name: 77 vs target 5".
  const lines = objectives
    .flatMap((o) => o.contributions.map((c) => `${c.agentName}: ${c.score} vs target ${c.target}`));

  return {
    challengeId: report.challengeId,
    challengeName: challenge?.name ?? report.challengeId,
    outcome: report.outcome,
    objectives,
    lines,
    rewardSummary: [
      outcome?.narrative,
      report.rewardsGranted ? `+${report.rewardsGranted.currency} currency, +${report.rewardsGranted.reputation} reputation` : null,
      itemNames.length > 0 ? `Loot: ${itemNames.join(", ")}` : null,
    ].filter(Boolean).join(" "),
  };
}
