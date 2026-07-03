// The contract → encounter projection. This is the missing fifth surface in the
// cartridge projection chain:
//
//   ContractDefinition (engine/types.ts: Challenge)
//     → BoardProjection      play-pipeline/compile.ts  (compileArcToPlayScene + describeContract)
//     → WorldNodeProjection  world/contract.ts         (buildWorldLayout → WorldNode)
//     → EncounterProjection  THIS MODULE               (compileEncounter → EncounterSpec)
//     → ResultProjection     play-pipeline/compile.ts  (summarizeReport → PlayReportView)
//     → LedgerPatch          engine/cycle.ts           (runCycle → next Organization)
//
// The thesis this file exists to prove: a playable spatial encounter is not a
// hand-authored level. It is DERIVED from the same authored Challenge record the
// board card reads. Objectives come from the challenge's mechanicChecks. Hazards
// come from each check's failureConsequence. Party slots come from
// rosterRequirements. Resolution states and the ledger delta come from outcomes.
// Location comes from the progression tier + the challenge's own description.
// Unlocks/world-changes come from the milestone flag, attunement chains, and
// narrative events that key off this challenge.
//
// Nothing here is keyed off a specific challenge id. Feed it The Cellar and you
// get a rat-cellar sweep; feed it Attumen and you get a two-objective stable
// fight with a tank slot — same compiler, different authored input.
//
// PURE: no React, no three, no engine mutation. Given (challenge, org, arc) it
// returns a plain data structure any surface can render.

import type { Arc, Challenge, FailureConsequence, MechanicCheck, Organization, ResourceSpendLever } from "../../engine/types.js";
import { challengeAccess } from "../../engine/access.js";
import { recommendAgentsForChallenge } from "../../play-pipeline/compile.js";
import type { PlayNodeStatus } from "../../play-pipeline/compile.js";

// ── Projection shape ──────────────────────────────────────────────────────────

/** Where the encounter sits in the world: a region (the progression tier) and a
 *  site (the challenge), plus the authored approach line. Derived, not placed. */
export interface EncounterLocation {
  region: string;
  site: string;
  /** First sentence of the challenge's own description — the approach flavor. */
  approach: string;
}

/** The verb a failure consequence implies. This is the only "authoring" the
 *  compiler does, and it is a pure function of the consequence type — not of the
 *  challenge id. Every arc's checks map through the same table. */
export type ObjectiveVerb = "Suppress" | "Survive" | "Hold" | "Cleanse" | "Contain" | "Overcome";

/** A visual marker family for the objective's threat, again derived only from the
 *  consequence type so every cartridge gets consistent primitives for free. */
export type MarkerKind = "threat" | "striker" | "swarm" | "curse" | "breach" | "target";

/** One objective per authored mechanic check. */
export interface EncounterObjective {
  id: string;
  /** The check's authored name — "Cellar Sweep", "Intercept the Charge". */
  label: string;
  verb: ObjectiveVerb;
  /** The check's authored description — the objective brief. */
  brief: string;
  scope: MechanicCheck["scope"];
  /** The authored difficultyThreshold the party must reach. */
  targetThreshold: number;
  /** Attributes the check reads, so the shell can show what the objective tests. */
  attributes: Array<{ id: string; name: string; weight: number }>;
  /** Role names this objective is scoped to (role_specific checks only). */
  roleNames: string[];
  markerKind: MarkerKind;
  /** How many primitive markers to scatter for this objective. Deterministic
   *  function of the threshold + scope — bigger asks read as more markers. */
  markerCount: number;
}

/** A hazard, one per check's failureConsequence — what goes wrong on a miss. */
export interface EncounterHazard {
  id: string;
  kind: FailureConsequence["type"];
  label: string;
  /** Authored severity, 0..1. */
  severity: number;
  fromObjective: string;
}

/** A party slot. Role-required slots come first (from roleRequirements), then
 *  flex slots up to maxAgents. Slots are pre-filled from the recommended party so
 *  the encounter opens with tokens already staged. */
export interface EncounterSlot {
  index: number;
  /** Role name this slot requires, or null for a flex slot. */
  requiredRole: string | null;
  agentId: string | null;
  agentName: string | null;
  role: string | null;
}

/** A resolution preview — one per authored outcome (success/partial/failure). The
 *  ledger lines are the human reading of the Outcome's reward/penalty fields; the
 *  actual writeback still runs through runCycle, this is just the preview. */
export interface EncounterResolution {
  outcome: "success" | "partial" | "failure";
  narrative: string;
  ledger: string[];
}

export interface EncounterSpec {
  challengeId: string;
  title: string;
  location: EncounterLocation;
  /** What "clearing" means, derived from completionCriteria. */
  winCondition: string;
  difficulty: number;
  status: PlayNodeStatus;
  objectives: EncounterObjective[];
  hazards: EncounterHazard[];
  slots: EncounterSlot[];
  minAgents: number;
  maxAgents: number;
  resolutions: EncounterResolution[];
  /** The authored resource-spend lever for this encounter, or null. Derived from
   *  the challenge-level lever, else the first check that authors one. The shell
   *  offers a spend control only when this is present (and gates/tokens allow). */
  spendLever: ResourceSpendLever | null;
  /** What a clear opens up: gated challenges, attunement grants, narrative events.
   *  This is the "world-state change" half of the ledger writeback. */
  onClear: { unlocks: string[]; worldChanges: string[] };
}

// ── Derivation tables (pure, id-agnostic) ─────────────────────────────────────

const VERB_BY_CONSEQUENCE: Record<FailureConsequence["type"], ObjectiveVerb> = {
  stress: "Suppress",
  agent_damage: "Survive",
  team_damage: "Hold",
  debuff: "Cleanse",
  cascade: "Contain",
};

const MARKER_BY_CONSEQUENCE: Record<FailureConsequence["type"], MarkerKind> = {
  stress: "threat",
  agent_damage: "striker",
  team_damage: "swarm",
  debuff: "curse",
  cascade: "breach",
};

const HAZARD_LABEL: Record<FailureConsequence["type"], string> = {
  stress: "Mounting stress",
  agent_damage: "Focused strikes on a single agent",
  team_damage: "Damage across the whole party",
  debuff: "Lingering debuff",
  cascade: "Cascading collapse",
};

function firstSentence(text: string): string {
  const s = text.split(/[.!?]/)[0]?.trim();
  return s && s.length > 0 ? s : text.trim();
}

function attrName(arc: Arc, id: string): string {
  return arc.attributes.find((a) => a.id === id)?.name ?? id;
}

function roleName(arc: Arc, id: string): string {
  return arc.roles.find((r) => r.id === id)?.name ?? id;
}

/** Marker count: a stable read of "how much threat". Team asks read denser than
 *  single-target asks; clamped so the room never floods or empties. */
function markerCountFor(check: MechanicCheck): number {
  const divisor = check.scope === "team_aggregate" ? 4 : 6;
  return Math.max(2, Math.min(8, Math.round(check.difficultyThreshold / divisor)));
}

function winConditionFor(challenge: Challenge): string {
  const n = challenge.mechanicChecks.length;
  switch (challenge.completionCriteria.type) {
    case "all_mechanics_passed":
      return n === 1 ? "Clear the objective" : `Clear all ${n} objectives`;
    case "threshold_passed":
      return "Pass the primary objective";
    case "dps_check":
      return "Break it before the timer runs out";
    case "survival_check":
      return "Survive to the end";
    case "composite":
      return "Clear the composite objective";
    default:
      return n === 1 ? "Clear the objective" : `Clear all ${n} objectives`;
  }
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

function statusFor(challenge: Challenge, org: Organization, arc: Arc): PlayNodeStatus {
  if (clearedChallengeIds(org).has(challenge.id)) return "cleared";
  return challengeAccess(challenge, org, arc).accessible ? "available" : "locked";
}

function regionFor(challenge: Challenge, arc: Arc): string {
  const tier = arc.progressionTiers.find((t) => t.challenges.includes(challenge.id));
  return tier?.name ?? "The Field";
}

// ── Objectives / hazards ──────────────────────────────────────────────────────

function objectiveFor(check: MechanicCheck, challenge: Challenge, arc: Arc): EncounterObjective {
  const roleIds =
    check.scope === "role_specific"
      ? check.roleIds && check.roleIds.length > 0
        ? check.roleIds
        : challenge.rosterRequirements.roleRequirements.map((r) => r.roleId)
      : [];
  return {
    id: check.id,
    label: check.name,
    verb: VERB_BY_CONSEQUENCE[check.failureConsequence.type] ?? "Overcome",
    brief: check.description,
    scope: check.scope,
    targetThreshold: check.difficultyThreshold,
    attributes: check.attributeWeights.map((aw) => ({
      id: aw.attributeId,
      name: attrName(arc, aw.attributeId),
      weight: aw.weight,
    })),
    roleNames: roleIds.map((id) => roleName(arc, id)),
    markerKind: MARKER_BY_CONSEQUENCE[check.failureConsequence.type] ?? "target",
    markerCount: markerCountFor(check),
  };
}

function hazardFor(check: MechanicCheck): EncounterHazard {
  return {
    id: `hazard:${check.id}`,
    kind: check.failureConsequence.type,
    label: HAZARD_LABEL[check.failureConsequence.type] ?? "Setback",
    severity: check.failureConsequence.severity,
    fromObjective: check.id,
  };
}

// ── Party slots (from rosterRequirements + recommended party) ──────────────────

function buildSlots(challenge: Challenge, org: Organization, arc: Arc): EncounterSlot[] {
  const rr = challenge.rosterRequirements;
  const recommended = recommendAgentsForChallenge(challenge, org, arc)
    .map((id) => org.agents[id])
    .filter((a): a is NonNullable<typeof a> => !!a);

  // Required-role slots first, then flex slots up to maxAgents.
  const roleSlots: Array<{ requiredRole: string; roleId: string }> = [];
  for (const req of rr.roleRequirements) {
    for (let i = 0; i < req.count; i++) roleSlots.push({ requiredRole: roleName(arc, req.roleId), roleId: req.roleId });
  }
  const flexCount = Math.max(0, rr.maxAgents - roleSlots.length);

  const pool = [...recommended];
  const takeForRole = (roleId: string) => {
    const idx = pool.findIndex((a) => a.role === roleId);
    return idx >= 0 ? pool.splice(idx, 1)[0] : null;
  };

  const slots: EncounterSlot[] = [];
  let index = 0;
  for (const rs of roleSlots) {
    const agent = takeForRole(rs.roleId);
    slots.push({
      index: index++,
      requiredRole: rs.requiredRole,
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? null,
      role: agent ? roleName(arc, agent.role ?? "") : null,
    });
  }
  for (let i = 0; i < flexCount; i++) {
    const agent = pool.shift() ?? null;
    slots.push({
      index: index++,
      requiredRole: null,
      agentId: agent?.id ?? null,
      agentName: agent?.name ?? null,
      role: agent ? roleName(arc, agent.role ?? "") : null,
    });
  }
  return slots;
}

// ── Resolutions + world-change unlocks ────────────────────────────────────────

function ledgerLines(outcome: Challenge["outcomes"][keyof Challenge["outcomes"]], arc: Arc): string[] {
  const lines: string[] = [];
  if (outcome.currencyReward) lines.push(`+${outcome.currencyReward} ${arc.currencyName}`);
  if (outcome.reputationGain) lines.push(`+${outcome.reputationGain} ${arc.reputationName}`);
  for (const drop of outcome.rewardTable) {
    const item = arc.items.find((it) => it.id === drop.itemId);
    lines.push(`Loot: ${item?.name ?? drop.itemId}`);
  }
  if (outcome.milestoneFlag) lines.push(`Records: ${outcome.milestoneFlag}`);
  if (outcome.stressPenalty) lines.push(`+${outcome.stressPenalty} stress across the party`);
  if (outcome.agentDowntimeCycles) lines.push(`Downtime: ${outcome.agentDowntimeCycles} cycle(s)`);
  if (outcome.tokenRefund) lines.push(`Refund: ${outcome.tokenRefund} ${arc.tokenName}`);
  if (lines.length === 0) lines.push("No ledger change");
  return lines;
}

/** What a clear opens: milestone-gated challenges, attunement grants keyed off
 *  this clear, and narrative events that trigger on it. All derived from the arc. */
function onClearFor(challenge: Challenge, arc: Arc): EncounterSpec["onClear"] {
  const flag = challenge.outcomes.success.milestoneFlag;
  const unlocks: string[] = [];

  if (flag) {
    for (const other of arc.challenges) {
      if (other.id === challenge.id) continue;
      if (other.accessRequirements.orgMilestones.includes(flag)) unlocks.push(other.name);
    }
  }
  for (const chain of arc.attunementChains) {
    const keysOffThis = chain.steps.some((s) => s.type === "challenge_clear" && s.target === challenge.id);
    if (!keysOffThis) continue;
    for (const grantedId of chain.grantsAccessTo) {
      const granted = arc.challenges.find((c) => c.id === grantedId);
      if (granted && !unlocks.includes(granted.name)) unlocks.push(granted.name);
    }
  }

  const worldChanges = arc.narrativeEvents
    .filter((e) => (e.trigger.type === "first_clear" && e.trigger.target === challenge.id))
    .map((e) => e.title);

  return { unlocks, worldChanges };
}

// ── The compiler ──────────────────────────────────────────────────────────────

export function compileEncounter(challenge: Challenge, org: Organization, arc: Arc): EncounterSpec {
  return {
    challengeId: challenge.id,
    title: challenge.name,
    location: {
      region: regionFor(challenge, arc),
      site: challenge.name,
      approach: firstSentence(challenge.description),
    },
    winCondition: winConditionFor(challenge),
    difficulty: challenge.difficultyRating,
    status: statusFor(challenge, org, arc),
    objectives: challenge.mechanicChecks.map((c) => objectiveFor(c, challenge, arc)),
    hazards: challenge.mechanicChecks.map(hazardFor),
    slots: buildSlots(challenge, org, arc),
    minAgents: challenge.rosterRequirements.minAgents,
    maxAgents: challenge.rosterRequirements.maxAgents,
    resolutions: (["success", "partial", "failure"] as const).map((outcome) => ({
      outcome,
      narrative: challenge.outcomes[outcome].narrative,
      ledger: ledgerLines(challenge.outcomes[outcome], arc),
    })),
    spendLever: spendLeverFor(challenge),
    onClear: onClearFor(challenge, arc),
  };
}

/** The encounter's effective spend lever: the challenge-level one, else the first
 *  check that authors its own. Null when the contract authors no spend at all. */
function spendLeverFor(challenge: Challenge): ResourceSpendLever | null {
  return challenge.resourceSpend ?? challenge.mechanicChecks.find((c) => c.resourceSpend)?.resourceSpend ?? null;
}
