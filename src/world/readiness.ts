// Readiness: a faithful, legible projection of the engine's resolver so party
// assignment is a decision, not "accept recommended and press Run". It mirrors the
// deterministic core of resolveChallenge (Σ attr·weight + gear + morale + affliction)
// and exposes actionable deltas without pretending RNG is knowable.

import type { Agent, Arc, Challenge, MechanicCheck, ThresholdMode } from "../engine/types.js";
import { AFFLICTION_PENALTIES } from "../engine/constants.js";
import { DOWNTIME_ACTIONS, type DowntimeAction } from "./agent-management.js";

/** The resolver adds variance/volatility at run time. A check only becomes
 *  reliable when it clears the authored threshold by this safety buffer. */
export const SWING = 5;

export interface RoleRequirement {
  roleId: string;
  roleName: string;
  count: number;
}

export interface CheckRequirement {
  id: string;
  name: string;
  scope: MechanicCheck["scope"];
  thresholdMode: ThresholdMode;
  /** The authored base threshold (before any party-size scaling). */
  baseThreshold: number;
  threshold: number;
  attributes: Array<{ id: string; name: string; weight: number }>;
  /** Explicit role scope for role_specific checks, if the cartridge defines it. */
  roleIds: string[];
  roleNames: string[];
}

export interface ContractRequirements {
  minAgents: number;
  maxAgents: number;
  roles: RoleRequirement[];
  checks: CheckRequirement[];
  timePressure: { attributeId: string; attributeName: string; rounds: number; aggregateThreshold: number } | null;
  /** Union of every attribute any check reads, ordered by total weight. */
  checkedAttributes: Array<{ id: string; name: string }>;
}

export type CheckStatus = "ready" | "thin" | "short";

export interface CheckContributor {
  agentId: string;
  agentName: string;
  roleName: string;
  base: number;
  gear: number;
  morale: number;
  affliction: number;
  total: number;
  inScope: boolean;
}

export interface CheckEval {
  id: string;
  name: string;
  scope: MechanicCheck["scope"];
  thresholdMode: ThresholdMode;
  /** The authored base threshold (before any party-size scaling). */
  baseThreshold: number;
  /** The effective threshold used for this evaluation (may be baseThreshold × partySize). */
  threshold: number;
  projected: number;
  margin: number;
  /** Score needed to be considered reliable (threshold + SWING). */
  reliableTarget: number;
  /** How much more score is needed to reach reliableTarget. 0 when already ready. */
  shortBy: number;
  status: CheckStatus;
  roleIds: string[];
  roleNames: string[];
  contributors: CheckContributor[];
}

export interface MissingRole {
  roleName: string;
  have: number;
  need: number;
}

export type ProjectedOutcome = "success" | "partial" | "failure" | "none";

export interface PartyReadiness {
  /** Count is within [min,max] — the only hard gate the engine enforces to run. */
  countOk: boolean;
  /** Required roles are covered. Missing roles project failure. */
  rolesOk: boolean;
  missingRoles: MissingRole[];
  checks: CheckEval[];
  projectedOutcome: ProjectedOutcome;
  /** Human-readable "what's missing / risky", most severe first. Empty when fully ready. */
  reasons: string[];
}

export type FixSuggestion =
  | {
      kind: "add-agent";
      agentId: string;
      agentName: string;
      reason: string;
      roleName?: string;
      checkId?: string;
      beforeScore?: number;
      afterScore?: number;
      beforeStatus?: CheckStatus;
      afterStatus?: CheckStatus;
    }
  | {
      kind: "swap-agent";
      addAgentId: string;
      addAgentName: string;
      removeAgentId: string;
      removeAgentName: string;
      reason: string;
      checkId?: string;
      beforeScore?: number;
      afterScore?: number;
      beforeStatus?: CheckStatus;
      afterStatus?: CheckStatus;
    }
  | {
      kind: "downtime";
      agentId: string;
      agentName: string;
      action: DowntimeAction;
      reason: string;
      checkId?: string;
      beforeScore?: number;
      afterScore?: number;
      beforeStatus?: CheckStatus;
      afterStatus?: CheckStatus;
    }
  | {
      kind: "risk";
      reason: string;
    };

function attrName(arc: Arc, id: string): string {
  return arc.attributes.find((a) => a.id === id)?.name ?? id;
}

function roleName(arc: Arc, id: string | null | undefined): string {
  if (!id) return "Flex";
  return arc.roles.find((r) => r.id === id)?.name ?? id;
}

function scopedRoleIds(check: MechanicCheck, challenge: Challenge): string[] {
  if (check.roleIds && check.roleIds.length > 0) return check.roleIds;
  return challenge.rosterRequirements.roleRequirements.map((r) => r.roleId);
}

function primaryAttrId(check: MechanicCheck): string {
  let best = check.attributeWeights[0];
  for (const aw of check.attributeWeights) if (best && aw.weight > best.weight) best = aw;
  return best?.attributeId ?? "";
}

/** Equipped-item bonus to one attribute, at the same 0.5 weighting the resolver uses. */
export function gearBonusForAttr(agent: Agent, attrId: string, arc: Arc): number {
  let bonus = 0;
  for (const itemId of Object.values(agent.equippedItems)) {
    const item = arc.items.find((it) => it.id === itemId);
    if (item) bonus += item.statBonuses[attrId] ?? 0;
  }
  return bonus * 0.5;
}

function afflictionMod(agent: Agent): number {
  if (agent.afflictionState.kind === "none") return 0;
  return AFFLICTION_PENALTIES[agent.afflictionState.kind]?.scoreMod ?? 0;
}

function componentScore(agent: Agent, check: MechanicCheck, arc: Arc): Omit<CheckContributor, "agentId" | "agentName" | "roleName" | "inScope"> {
  const base = check.attributeWeights.reduce(
    (s, aw) => s + (agent.attributes[aw.attributeId] ?? 0) * aw.weight,
    0,
  );
  const gear = gearBonusForAttr(agent, primaryAttrId(check), arc);
  const morale = (agent.morale - 50) / 10;
  const affliction = afflictionMod(agent);
  return { base, gear, morale, affliction, total: base + gear + morale + affliction };
}

/** Deterministic core of resolver.scoreAgent for one check (no RNG / rel / trait). */
export function agentBaseScore(agent: Agent, check: MechanicCheck, arc: Arc): number {
  return componentScore(agent, check, arc).total;
}

export function describeContract(challenge: Challenge, arc: Arc): ContractRequirements {
  const roles: RoleRequirement[] = challenge.rosterRequirements.roleRequirements.map((r) => ({
    roleId: r.roleId,
    roleName: roleName(arc, r.roleId),
    count: r.count,
  }));

  const checks: CheckRequirement[] = challenge.mechanicChecks.map((c) => ({
    id: c.id,
    name: c.name,
    scope: c.scope,
    thresholdMode: c.thresholdMode ?? "fixed",
    baseThreshold: c.difficultyThreshold,
    threshold: c.difficultyThreshold,
    attributes: c.attributeWeights.map((aw) => ({ id: aw.attributeId, name: attrName(arc, aw.attributeId), weight: aw.weight })),
    roleIds: c.scope === "role_specific" ? scopedRoleIds(c, challenge) : [],
    roleNames: c.scope === "role_specific" ? scopedRoleIds(c, challenge).map((id) => roleName(arc, id)) : [],
  }));

  const weightById = new Map<string, number>();
  for (const c of challenge.mechanicChecks) {
    for (const aw of c.attributeWeights) weightById.set(aw.attributeId, (weightById.get(aw.attributeId) ?? 0) + aw.weight);
  }
  const checkedAttributes = [...weightById.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => ({ id, name: attrName(arc, id) }));

  const tp = challenge.timePressure;
  return {
    minAgents: challenge.rosterRequirements.minAgents,
    maxAgents: challenge.rosterRequirements.maxAgents,
    roles,
    checks,
    timePressure: tp
      ? { attributeId: tp.attributeId, attributeName: attrName(arc, tp.attributeId), rounds: tp.rounds, aggregateThreshold: tp.aggregateThreshold }
      : null,
    checkedAttributes,
  };
}

function classify(projected: number, threshold: number): Pick<CheckEval, "margin" | "reliableTarget" | "shortBy" | "status"> {
  const margin = projected - threshold;
  const reliableTarget = threshold + SWING;
  const shortBy = Math.max(0, reliableTarget - projected);
  const status: CheckStatus = margin >= SWING ? "ready" : margin >= -SWING ? "thin" : "short";
  return { margin, reliableTarget, shortBy, status };
}

function contributor(agent: Agent, check: MechanicCheck, arc: Arc, inScope = true): CheckContributor {
  const parts = componentScore(agent, check, arc);
  return {
    agentId: agent.id,
    agentName: agent.name,
    roleName: roleName(arc, agent.role),
    ...parts,
    inScope,
  };
}

function effectiveThreshold(check: MechanicCheck, partySize: number): number {
  if (check.scope === "team_aggregate" && check.thresholdMode === "perAssignedAgent") {
    return check.difficultyThreshold * Math.max(1, partySize);
  }
  return check.difficultyThreshold;
}

function evaluateCheck(check: MechanicCheck, challenge: Challenge, party: Agent[], arc: Arc): CheckEval {
  let projected = 0;
  const baseThreshold = check.difficultyThreshold;
  const thresholdMode: import("../engine/types.js").ThresholdMode = check.thresholdMode ?? "fixed";
  let threshold = effectiveThreshold(check, party.length);
  let roleIds: string[] = [];
  let scopedParty = party;

  if (check.scope === "role_specific") {
    roleIds = scopedRoleIds(check, challenge);
    const roleSet = new Set(roleIds);
    scopedParty = party.filter((a) => roleSet.has(a.role ?? ""));
  }

  const contributors = party.map((agent) => contributor(agent, check, arc, scopedParty.includes(agent)));

  if (check.scope === "team_aggregate") {
    projected = party.reduce((s, a) => s + agentBaseScore(a, check, arc), 0);
  } else if (scopedParty.length > 0) {
    projected = Math.min(...scopedParty.map((a) => agentBaseScore(a, check, arc)));
  } else if (check.scope === "role_specific") {
    // Missing role is represented by role coverage. The check is neutral so the UI
    // does not double-count one absence as both a missing role and a failed check.
    projected = threshold + SWING;
  } else {
    projected = 0;
  }

  return {
    id: check.id,
    name: check.name,
    scope: check.scope,
    thresholdMode,
    baseThreshold,
    threshold,
    projected,
    ...classify(projected, threshold),
    roleIds,
    roleNames: roleIds.map((id) => roleName(arc, id)),
    contributors,
  };
}

export function evaluateParty(challenge: Challenge, party: Agent[], arc: Arc): PartyReadiness {
  const rr = challenge.rosterRequirements;
  const countOk = party.length >= rr.minAgents && party.length <= rr.maxAgents;

  const missingRoles: MissingRole[] = [];
  for (const req of rr.roleRequirements) {
    const have = party.filter((a) => a.role === req.roleId).length;
    if (have < req.count) missingRoles.push({ roleName: roleName(arc, req.roleId), have, need: req.count });
  }
  const rolesOk = missingRoles.length === 0;

  const checks = challenge.mechanicChecks.map((check) => evaluateCheck(check, challenge, party, arc));

  const reasons: string[] = [];
  if (!countOk) {
    reasons.push(
      party.length < rr.minAgents
        ? `Assign at least ${rr.minAgents} ${rr.minAgents === 1 ? "agent" : "agents"} (have ${party.length}).`
        : `Too many assigned — max ${rr.maxAgents} (have ${party.length}).`,
    );
  }
  for (const m of missingRoles) {
    reasons.push(`Missing ${m.need - m.have} ${m.roleName}${m.need - m.have > 1 ? "s" : ""} — add that role before trusting the projection.`);
  }
  for (const c of checks) {
    if (c.status === "short") reasons.push(`${c.name}: failing by ${Math.round(Math.abs(c.margin))} — needs +${Math.round(c.shortBy)} to become reliable.`);
  }
  for (const c of checks) {
    if (c.status === "thin") reasons.push(`${c.name}: passing by +${Math.round(c.margin)} — needs +${Math.round(c.shortBy)} more buffer to be reliable.`);
  }

  let projectedOutcome: ProjectedOutcome = "none";
  if (party.length > 0) {
    const anyShort = checks.some((c) => c.status === "short") || !rolesOk || !countOk;
    const anyThin = checks.some((c) => c.status === "thin");
    projectedOutcome = anyShort ? "failure" : anyThin ? "partial" : "success";
  }

  return { countOk, rolesOk, missingRoles, checks, projectedOutcome, reasons };
}

export function scoreAgentForContract(agent: Agent, challenge: Challenge, arc: Arc): number {
  let score = 0;
  for (const check of challenge.mechanicChecks) {
    score += check.attributeWeights.reduce((sum, aw) => sum + (agent.attributes[aw.attributeId] ?? 0) * aw.weight, 0);
  }
  score += agent.morale / 100;
  score -= agent.stress * 0.15;
  score += Object.values(agent.equippedItems).reduce((sum, itemId) => {
    const item = arc.items.find((it) => it.id === itemId);
    if (!item) return sum;
    return sum + Object.values(item.statBonuses).reduce((a, b) => a + b, 0) * 0.1;
  }, 0);
  return score;
}

function weakestPartyAgent(party: Agent[], challenge: Challenge, arc: Arc): Agent | null {
  return [...party].sort((a, b) => scoreAgentForContract(a, challenge, arc) - scoreAgentForContract(b, challenge, arc))[0] ?? null;
}

function cloneAgentWithDowntime(agent: Agent, action: DowntimeAction): Agent {
  const def = DOWNTIME_ACTIONS[action];
  return {
    ...agent,
    stress: Math.max(0, Math.min(100, agent.stress + def.stressDelta)),
    morale: Math.max(0, Math.min(100, agent.morale + def.moraleDelta)),
  };
}

function checkAfter(readiness: PartyReadiness, checkId?: string): CheckEval | undefined {
  return checkId ? readiness.checks.find((c) => c.id === checkId) : readiness.checks.find((c) => c.status !== "ready");
}

function withProjection<T extends FixSuggestion>(fix: T, before: PartyReadiness, after: PartyReadiness, checkId?: string): T {
  const beforeCheck = checkAfter(before, checkId);
  const afterCheck = checkAfter(after, checkId ?? beforeCheck?.id);
  if (!beforeCheck || !afterCheck || fix.kind === "risk") return fix;
  return {
    ...fix,
    checkId: beforeCheck.id,
    beforeScore: beforeCheck.projected,
    afterScore: afterCheck.projected,
    beforeStatus: beforeCheck.status,
    afterStatus: afterCheck.status,
  } as T;
}

function improves(fix: FixSuggestion): boolean {
  if (fix.kind === "risk") return true;
  if (fix.beforeScore === undefined || fix.afterScore === undefined) return true;
  return fix.afterScore > fix.beforeScore || (fix.beforeStatus !== "ready" && fix.afterStatus === "ready");
}

function addOrSwapFix(input: {
  out: FixSuggestion[];
  candidate: Agent;
  party: Agent[];
  challenge: Challenge;
  arc: Arc;
  before: PartyReadiness;
  reason: string;
  roleLabel?: string;
  checkId?: string;
}): void {
  const { out, candidate, party, challenge, arc, before, reason, roleLabel, checkId } = input;
  let fix: FixSuggestion | null = null;
  let nextParty: Agent[] | null = null;

  if (party.length < challenge.rosterRequirements.maxAgents) {
    nextParty = [...party, candidate];
    fix = { kind: "add-agent", agentId: candidate.id, agentName: candidate.name, reason, roleName: roleLabel };
  } else {
    const remove = weakestPartyAgent(party, challenge, arc);
    if (!remove || remove.id === candidate.id) return;
    nextParty = party.filter((agent) => agent.id !== remove.id).concat(candidate);
    fix = {
      kind: "swap-agent",
      addAgentId: candidate.id,
      addAgentName: candidate.name,
      removeAgentId: remove.id,
      removeAgentName: remove.name,
      reason: `${reason} Swap out ${remove.name}.`,
    };
  }

  const after = evaluateParty(challenge, nextParty, arc);
  const projectedFix = withProjection(fix, before, after, checkId);
  if (roleLabel || improves(projectedFix)) out.push(projectedFix);
}

function dedupeFixes(items: FixSuggestion[]): FixSuggestion[] {
  const seen = new Set<string>();
  const out: FixSuggestion[] = [];
  for (const item of items) {
    const key = item.kind === "add-agent"
      ? `${item.kind}:${item.agentId}:${item.checkId ?? ""}:${item.reason}`
      : item.kind === "swap-agent"
      ? `${item.kind}:${item.addAgentId}:${item.removeAgentId}:${item.checkId ?? ""}:${item.reason}`
      : item.kind === "downtime"
      ? `${item.kind}:${item.agentId}:${item.action}:${item.checkId ?? ""}`
      : `${item.kind}:${item.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function fixRank(fix: FixSuggestion): number {
  if (fix.kind === "risk") return -999;
  const roleBonus = (fix.kind === "add-agent" && fix.roleName) ? 100 : 0;
  const statusBonus = fix.afterStatus === "ready" ? 50 : fix.afterStatus === "thin" ? 20 : 0;
  const delta = fix.beforeScore !== undefined && fix.afterScore !== undefined ? fix.afterScore - fix.beforeScore : 1;
  return roleBonus + statusBonus + delta;
}

export function buildFixPlan(input: {
  challenge: Challenge;
  party: Agent[];
  roster: Agent[];
  arc: Arc;
  readiness: PartyReadiness;
}): FixSuggestion[] {
  const { challenge, party, roster, arc, readiness } = input;
  const partyIds = new Set(party.map((agent) => agent.id));
  const available = roster.filter((agent) => agent.downedUntilCycle === null && !partyIds.has(agent.id));
  const out: FixSuggestion[] = [];

  for (const missing of readiness.missingRoles) {
    const role = arc.roles.find((r) => r.name === missing.roleName);
    if (!role) continue;
    for (const agent of available
      .filter((a) => a.role === role.id)
      .sort((a, b) => scoreAgentForContract(b, challenge, arc) - scoreAgentForContract(a, challenge, arc))
      .slice(0, 2)) {
      addOrSwapFix({ out, candidate: agent, party, challenge, arc, before: readiness, roleLabel: missing.roleName, reason: `Adds required ${missing.roleName}.` });
    }
  }

  for (const weak of readiness.checks.filter((check) => check.status !== "ready")) {
    const mechanic = challenge.mechanicChecks.find((check) => check.id === weak.id);
    if (!mechanic) continue;
    const roleScope = mechanic.scope === "role_specific" ? new Set(scopedRoleIds(mechanic, challenge)) : null;
    const attrNames = mechanic.attributeWeights.map((aw) => attrName(arc, aw.attributeId)).join(" + ");

    for (const { agent } of available
      .filter((a) => !roleScope || roleScope.has(a.role ?? ""))
      .map((agent) => ({ agent, score: agentBaseScore(agent, mechanic, arc) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)) {
      addOrSwapFix({
        out,
        candidate: agent,
        party,
        challenge,
        arc,
        before: readiness,
        checkId: weak.id,
        reason: `Improves ${weak.name}${attrNames ? ` with ${attrNames}` : ""}.`,
      });
    }

    for (const agent of party.filter((a) => !roleScope || roleScope.has(a.role ?? ""))) {
      for (const action of ["rally", "train", "rest"] as const) {
        const mutated = cloneAgentWithDowntime(agent, action);
        const afterParty = party.map((a) => (a.id === agent.id ? mutated : a));
        const after = evaluateParty(challenge, afterParty, arc);
        const def = DOWNTIME_ACTIONS[action];
        const reason = `${def.label} changes Stress ${def.stressDelta >= 0 ? "+" : ""}${def.stressDelta} and Morale ${def.moraleDelta >= 0 ? "+" : ""}${def.moraleDelta}.`;
        const fix: FixSuggestion = { kind: "downtime", agentId: agent.id, agentName: agent.name, action, reason };
        const projectedFix = withProjection(fix, readiness, after, weak.id);
        if (improves(projectedFix)) out.push(projectedFix);
      }
    }
  }

  const fixes = dedupeFixes(out).sort((a, b) => fixRank(b) - fixRank(a)).slice(0, 5);
  if (fixes.length === 0 && readiness.projectedOutcome !== "success") {
    return [{ kind: "risk", reason: "No clean fix is available from the current roster. Run another contract, earn gear, or accept the risk." }];
  }
  return fixes;
}

/** Why the engine recommends who it recommends — surfaced so the pick isn't magic. */
export function recommendationRationale(contract: ContractRequirements): string {
  const attrs = contract.checkedAttributes.map((a) => a.name);
  const attrPart = attrs.length ? attrs.join(" + ") : "the checked attributes";
  const rolePart = contract.roles.length
    ? `fills the required ${contract.roles.map((r) => `${r.count} ${r.roleName}`).join(", ")} first, then `
    : "";
  return `Recommended party ${rolePart}picks the highest ${attrPart}, and deprioritizes stressed agents.`;
}
