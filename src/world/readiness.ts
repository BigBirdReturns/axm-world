// Readiness: a faithful, legible projection of the engine's resolver so party
// assignment is a *decision*, not "accept recommended and press Run". It mirrors the
// deterministic core of resolveChallenge (Σ attr·weight + gear + morale + affliction)
// and surfaces the same requirement/threshold logic the contract panel and roster
// panel both read from. The engine adds RNG (variance, volatility) plus relationship
// and trait modifiers at resolve time; those are represented here as a swing band, so
// the readout never claims a certainty the engine doesn't have.
//
// Pure + arc-agnostic: every function takes (… , arc) and works for any cartridge.

import type { Agent, Arc, Challenge, MechanicCheck } from "../engine/types.js";
import { AFFLICTION_PENALTIES } from "../engine/constants.js";

/** The variance/volatility band the resolver can add or subtract at run time. Used to
 *  decide whether a margin is comfortable ("ready"), inside the swing ("thin"), or
 *  unrecoverable ("short"). Kept conservative against resolver.getVolatilitySwing. */
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
  /** Union of every attribute any check reads, ordered by total weight (what to show). */
  checkedAttributes: Array<{ id: string; name: string }>;
}

export type CheckStatus = "ready" | "thin" | "short";

export interface CheckEval {
  id: string;
  name: string;
  scope: MechanicCheck["scope"];
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
}

export interface MissingRole {
  roleName: string;
  have: number;
  need: number;
}

export type ProjectedOutcome = "success" | "partial" | "failure" | "none";

export interface PartyReadiness {
  /** Count is within [min,max] — the only gate the engine enforces to run. */
  countOk: boolean;
  /** Required roles are covered. Not enforced by the engine, but unmet roles project failure. */
  rolesOk: boolean;
  missingRoles: MissingRole[];
  checks: CheckEval[];
  projectedOutcome: ProjectedOutcome;
  /** Human-readable "what's missing / risky", most severe first. Empty when fully ready. */
  reasons: string[];
}

function attrName(arc: Arc, id: string): string {
  return arc.attributes.find((a) => a.id === id)?.name ?? id;
}

function roleName(arc: Arc, id: string): string {
  return arc.roles.find((r) => r.id === id)?.name ?? id;
}

function scopedRoleIds(check: MechanicCheck, challenge: Challenge): string[] {
  if (check.roleIds && check.roleIds.length > 0) return check.roleIds;
  return challenge.rosterRequirements.roleRequirements.map((r) => r.roleId);
}

function scopedRoleNames(check: MechanicCheck, challenge: Challenge, arc: Arc): string[] {
  return scopedRoleIds(check, challenge).map((id) => roleName(arc, id));
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

/** Deterministic core of resolver.scoreAgent for one check (no RNG / rel / trait). */
export function agentBaseScore(agent: Agent, check: MechanicCheck, arc: Arc): number {
  const raw = check.attributeWeights.reduce(
    (s, aw) => s + (agent.attributes[aw.attributeId] ?? 0) * aw.weight,
    0,
  );
  const gear = gearBonusForAttr(agent, primaryAttrId(check), arc);
  const moraleMod = (agent.morale - 50) / 10;
  return raw + gear + moraleMod + afflictionMod(agent);
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
    threshold: c.difficultyThreshold,
    attributes: c.attributeWeights.map((aw) => ({ id: aw.attributeId, name: attrName(arc, aw.attributeId), weight: aw.weight })),
    roleIds: c.scope === "role_specific" ? scopedRoleIds(c, challenge) : [],
    roleNames: c.scope === "role_specific" ? scopedRoleNames(c, challenge, arc) : [],
  }));

  // Union of checked attributes, ranked by summed weight so the most decisive show first.
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

function bandFor(margin: number): CheckStatus {
  if (margin >= SWING) return "ready";
  if (margin >= -SWING) return "thin";
  return "short";
}

function evalFields(projected: number, threshold: number): Pick<CheckEval, "margin" | "reliableTarget" | "shortBy" | "status"> {
  const margin = projected - threshold;
  const reliableTarget = threshold + SWING;
  const shortBy = Math.max(0, reliableTarget - projected);
  return { margin, reliableTarget, shortBy, status: bandFor(margin) };
}

/** team_aggregate and per_agent scopes. role_specific is handled in evaluateParty,
 *  which knows the contract's required roles (the resolver's scoping rule). */
function evalCheck(check: MechanicCheck, party: Agent[], arc: Arc): CheckEval {
  let projected: number;
  let effThreshold = check.difficultyThreshold;

  if (check.scope === "team_aggregate") {
    projected = party.reduce((s, a) => s + agentBaseScore(a, check, arc), 0);
    effThreshold = check.difficultyThreshold * Math.max(1, party.length);
  } else {
    const scores = party.map((a) => agentBaseScore(a, check, arc));
    projected = scores.length ? Math.min(...scores) : 0;
  }

  return { id: check.id, name: check.name, scope: check.scope, threshold: effThreshold, projected, ...evalFields(projected, effThreshold), roleIds: [], roleNames: [] };
}

export function evaluateParty(challenge: Challenge, party: Agent[], arc: Arc): PartyReadiness {
  const rr = challenge.rosterRequirements;
  const countOk = party.length >= rr.minAgents && party.length <= rr.maxAgents;

  // Role coverage
  const missingRoles: MissingRole[] = [];
  for (const req of rr.roleRequirements) {
    const have = party.filter((a) => a.role === req.roleId).length;
    if (have < req.count) missingRoles.push({ roleName: roleName(arc, req.roleId), have, need: req.count });
  }
  const rolesOk = missingRoles.length === 0;

  // Per-check evaluation. role_specific checks score only the roles named on that check.
  const checks: CheckEval[] = challenge.mechanicChecks.map((check) => {
    if (check.scope === "role_specific") {
      const checkRoleIds = scopedRoleIds(check, challenge);
      const checkRoleSet = new Set(checkRoleIds);
      const scoped = party.filter((a) => checkRoleSet.has(a.role ?? ""));
      const scores = scoped.map((a) => agentBaseScore(a, check, arc));
      const projected = scores.length ? Math.min(...scores) : check.difficultyThreshold;
      const fields = scores.length ? evalFields(projected, check.difficultyThreshold) : { margin: 0, reliableTarget: check.difficultyThreshold + SWING, shortBy: 0, status: "ready" as CheckStatus };
      return {
        id: check.id,
        name: check.name,
        scope: check.scope,
        threshold: check.difficultyThreshold,
        projected,
        ...fields,
        roleIds: checkRoleIds,
        roleNames: checkRoleIds.map((id) => roleName(arc, id)),
      };
    }
    return evalCheck(check, party, arc);
  });

  const reasons: string[] = [];
  if (!countOk) {
    reasons.push(
      party.length < rr.minAgents
        ? `Assign at least ${rr.minAgents} ${rr.minAgents === 1 ? "agent" : "agents"} (have ${party.length}).`
        : `Too many assigned — max ${rr.maxAgents} (have ${party.length}).`,
    );
  }
  for (const m of missingRoles) {
    reasons.push(`Missing ${m.need - m.have} ${m.roleName}${m.need - m.have > 1 ? "s" : ""} — that check is projected to fail.`);
  }
  for (const c of checks) {
    if (c.status === "short") reasons.push(`${c.name}: failing by ${Math.round(Math.abs(c.margin))} — needs +${Math.round(c.shortBy)} to become reliable.`);
  }
  for (const c of checks) {
    if (c.status === "thin") reasons.push(`${c.name}: passing by +${Math.round(c.margin)}, but needs +${Math.round(c.shortBy)} more buffer to be reliable.`);
  }

  let projectedOutcome: ProjectedOutcome = "none";
  if (party.length > 0) {
    const anyShort = checks.some((c) => c.status === "short") || !rolesOk;
    const anyThin = checks.some((c) => c.status === "thin");
    projectedOutcome = anyShort ? "failure" : anyThin ? "partial" : "success";
  }

  return { countOk, rolesOk, missingRoles, checks, projectedOutcome, reasons };
}


export type FixSuggestion =
  | {
      kind: "add-agent";
      agentId: string;
      agentName: string;
      reason: string;
      roleName?: string;
    }
  | {
      kind: "swap-agent";
      addAgentId: string;
      addAgentName: string;
      removeAgentId: string;
      removeAgentName: string;
      reason: string;
    }
  | {
      kind: "downtime";
      agentId: string;
      agentName: string;
      action: "rest" | "train" | "rally";
      reason: string;
    }
  | {
      kind: "risk";
      reason: string;
    };

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

function scoreAgentForCheck(agent: Agent, check: MechanicCheck, arc: Arc): number {
  return agentBaseScore(agent, check, arc);
}

function weakestPartyAgent(party: Agent[], challenge: Challenge, arc: Arc): Agent | null {
  return [...party].sort((a, b) => scoreAgentForContract(a, challenge, arc) - scoreAgentForContract(b, challenge, arc))[0] ?? null;
}

function pushAgentFix(
  out: FixSuggestion[],
  candidate: Agent,
  party: Agent[],
  challenge: Challenge,
  arc: Arc,
  reason: string,
  roleLabel?: string,
): void {
  if (party.length < challenge.rosterRequirements.maxAgents) {
    out.push({ kind: "add-agent", agentId: candidate.id, agentName: candidate.name, reason, roleName: roleLabel });
    return;
  }

  const remove = weakestPartyAgent(party, challenge, arc);
  if (!remove || remove.id === candidate.id) return;
  out.push({
    kind: "swap-agent",
    addAgentId: candidate.id,
    addAgentName: candidate.name,
    removeAgentId: remove.id,
    removeAgentName: remove.name,
    reason: `${reason} Swap out ${remove.name}.`,
  });
}

function dedupeFixes(items: FixSuggestion[]): FixSuggestion[] {
  const seen = new Set<string>();
  const out: FixSuggestion[] = [];
  for (const item of items) {
    const key = item.kind === "add-agent"
      ? `${item.kind}:${item.agentId}:${item.reason}`
      : item.kind === "swap-agent"
      ? `${item.kind}:${item.addAgentId}:${item.removeAgentId}:${item.reason}`
      : item.kind === "downtime"
      ? `${item.kind}:${item.agentId}:${item.action}`
      : `${item.kind}:${item.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
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
    const candidates = available
      .filter((agent) => agent.role === role.id)
      .sort((a, b) => scoreAgentForContract(b, challenge, arc) - scoreAgentForContract(a, challenge, arc))
      .slice(0, 2);
    for (const agent of candidates) {
      pushAgentFix(out, agent, party, challenge, arc, `Adds required ${missing.roleName}.`, missing.roleName);
    }
  }

  for (const weak of readiness.checks.filter((check) => check.status !== "ready")) {
    const mechanic = challenge.mechanicChecks.find((check) => check.id === weak.id);
    if (!mechanic) continue;
    const roleScope = mechanic.scope === "role_specific" ? new Set(scopedRoleIds(mechanic, challenge)) : null;
    const candidates = available
      .filter((agent) => !roleScope || roleScope.has(agent.role ?? ""))
      .map((agent) => ({ agent, score: scoreAgentForCheck(agent, mechanic, arc) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
    for (const { agent } of candidates) {
      const attrNames = mechanic.attributeWeights.map((aw) => attrName(arc, aw.attributeId)).join(" + ");
      pushAgentFix(out, agent, party, challenge, arc, `Improves ${weak.name}${attrNames ? ` with ${attrNames}` : ""}.`);
    }
  }

  for (const agent of party) {
    if (agent.stress > 0) {
      out.push({ kind: "downtime", agentId: agent.id, agentName: agent.name, action: "rest", reason: "Reduces stress and improves reliability." });
    }
    if (agent.morale < 70) {
      out.push({ kind: "downtime", agentId: agent.id, agentName: agent.name, action: "rally", reason: "Raises morale and improves projection." });
    }
    out.push({ kind: "downtime", agentId: agent.id, agentName: agent.name, action: "train", reason: "Raises morale but adds stress." });
  }

  const fixes = dedupeFixes(out).slice(0, 5);
  if (fixes.length === 0 && readiness.projectedOutcome === "failure") {
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
