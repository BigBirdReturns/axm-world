// Builds the structured, durable consequence record (LedgerEntry.consequence) from
// a resolved run — the truth the runtime can honestly know at resolution time.
// Structured FACTS only; prose is generated from these downstream, never stored.
//
// Pure: given the run report + the arc it belongs to + resolvers, it returns the
// record. It claims a fact ONLY when the report/arc actually produced it — never an
// invented reward, unlock, party contribution, timestamp, or grade.

import type { Arc, Challenge, RunReport } from "../engine/types.js";
import {
  CONSEQUENCE_SCHEMA_VERSION,
  gradeForOutcome,
  type Consequence,
  type ConsequenceGrade,
  type ConsequenceReward,
  type ConsequenceWorldChange,
} from "./ledger.js";
import { onClearChanges } from "./encounter/compile-encounter.js";

/** The minimal per-objective shape the record needs — a structural subset of the
 *  play report's ObjectiveResult, so the caller passes that straight in. */
export interface ObjectiveFact {
  id: string;
  name: string;
  passed: boolean;
  passedCount: number;
  totalCount: number;
}

/** Honest per-objective grade from the engine's own coverage counts — no
 *  invention: fully covered → cleared, some covered → partial, none → failed. */
function objectiveStatus(o: ObjectiveFact): ConsequenceGrade {
  if (o.passed) return "cleared";
  if (o.passedCount > 0) return "partial";
  return "failed";
}

export interface BuildConsequenceInput {
  report: RunReport;
  challenge: Challenge;
  arc: Arc;
  /** Per-objective results, as summarizeReport already derives them. */
  objectives: ObjectiveFact[];
  /** Resolve a committed agent id to a display name (+ role when known). */
  resolveAgent: (agentId: string) => { name: string; role?: string };
  /** Display names for the countable resources, for honest reward labels. */
  resourceNames: { currency: string; reputation: string };
}

export function buildConsequence(input: BuildConsequenceInput): Consequence {
  const { report, challenge, arc, objectives, resolveAgent, resourceNames } = input;

  // Who ran — the agents the engine actually resolved for this run.
  const members = report.assignedAgents.map((ar) => {
    const resolved = resolveAgent(ar.agentId);
    return resolved.role !== undefined
      ? { id: ar.agentId, name: resolved.name, role: resolved.role }
      : { id: ar.agentId, name: resolved.name };
  });

  // Rewards actually granted — only what the report carries, only when positive.
  const rewards: ConsequenceReward[] = [];
  const granted = report.rewardsGranted;
  if (granted) {
    if (granted.reputation > 0) rewards.push({ kind: "reputation", label: resourceNames.reputation, amount: granted.reputation });
    if (granted.currency > 0) rewards.push({ kind: "gold", label: resourceNames.currency, amount: granted.currency });
  }
  for (const drop of report.lootDrops) {
    const item = arc.items.find((it) => it.id === drop.itemId);
    rewards.push({ kind: "item", label: item?.name ?? drop.itemId });
  }

  // The contract entering program memory is honestly true for EVERY resolved run.
  const worldChanges: ConsequenceWorldChange[] = [
    { kind: "recorded", targetId: challenge.id, label: challenge.name },
  ];
  // Unlocks / flags / narrative state changes happen only on a clear (success):
  // the engine applies outcomes.success, so these are facts, not predictions.
  if (report.outcome === "success") {
    const flag = challenge.outcomes.success.milestoneFlag;
    if (flag) worldChanges.push({ kind: "flag_changed", targetId: flag, label: flag });
    const changes = onClearChanges(challenge, arc);
    for (const u of changes.unlocks) worldChanges.push({ kind: "unlocked", targetId: u.id, label: u.label });
    for (const w of changes.worldChanges) worldChanges.push({ kind: "state_changed", targetId: w.id, label: w.label });
  }

  return {
    schemaVersion: CONSEQUENCE_SCHEMA_VERSION,
    outcome: { grade: gradeForOutcome(report.outcome) },
    contract: { id: challenge.id, title: challenge.name },
    party: { members },
    objectives: objectives.map((o) => ({ id: o.id, label: o.name, status: objectiveStatus(o) })),
    rewards,
    worldChanges,
  };
}
