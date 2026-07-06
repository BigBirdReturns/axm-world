// Builds the structured, durable consequence record (LedgerEntry.consequence) from
// a resolved run — the truth the runtime can honestly know at resolution time.
// Structured FACTS only; prose is generated from these downstream, never stored.
//
// Pure: given the run report + the arc + the caller's resolvers, it returns the
// record. It claims a fact ONLY when the run actually produced it — never an
// invented reward, unlock, party contribution, timestamp, or grade. In particular:
//   - a loot drop no one is eligible for is NOT a granted reward (it never enters
//     reward history), so it is filtered out;
//   - "unlocked" reflects the REAL post-run availability delta the caller passes,
//     not the encounter brief's aspirational "what this opens" hint (which can
//     over-claim for a multi-step gate).

import type { Arc, Challenge, RunReport } from "../engine/types.js";
import {
  CONSEQUENCE_SCHEMA_VERSION,
  gradeForOutcome,
  type Consequence,
  type ConsequenceGrade,
  type ConsequenceReward,
  type ConsequenceWorldChange,
} from "./ledger.js";

/** The minimal per-objective shape the record needs — a structural subset of the
 *  play report's ObjectiveResult, so the caller passes that straight in. */
export interface ObjectiveFact {
  id: string;
  name: string;
  passed: boolean;
  passedCount: number;
  totalCount: number;
}

/** Minimal node shape for the availability diff — a structural subset of the
 *  play scene's PlayNode. */
export interface AvailabilityNode {
  challengeId: string;
  title: string;
  status: "available" | "locked" | "cleared";
}

/** The HONEST set of contracts a run actually opened: available AFTER the run but
 *  not available BEFORE. This handles multi-step gates correctly — a clear that is
 *  only one prerequisite of a still-locked gate produces nothing here. */
export function newlyAvailableContracts(before: readonly AvailabilityNode[], after: readonly AvailabilityNode[]): Array<{ id: string; label: string }> {
  const wasAvailable = new Set(before.filter((n) => n.status === "available").map((n) => n.challengeId));
  return after
    .filter((n) => n.status === "available" && !wasAvailable.has(n.challengeId))
    .map((n) => ({ id: n.challengeId, label: n.title }));
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
  /** Contracts this run actually opened (real post-run availability delta), from
   *  newlyAvailableContracts. Empty unless something genuinely became available. */
  newlyAvailable: Array<{ id: string; label: string }>;
}

export function buildConsequence(input: BuildConsequenceInput): Consequence {
  const { report, challenge, arc, objectives, resolveAgent, resourceNames, newlyAvailable } = input;

  // Who ran — the agents the engine actually resolved for this run.
  const members = report.assignedAgents.map((ar) => {
    const resolved = resolveAgent(ar.agentId);
    return resolved.role !== undefined
      ? { id: ar.agentId, name: resolved.name, role: resolved.role }
      : { id: ar.agentId, name: resolved.name };
  });

  // Rewards actually granted — only what the report carries, only when positive,
  // and only loot someone was eligible for (an empty-eligibility drop never becomes
  // a claimable reward and never enters reward history, so it is not a reward).
  const rewards: ConsequenceReward[] = [];
  const granted = report.rewardsGranted;
  if (granted) {
    if (granted.reputation > 0) rewards.push({ kind: "reputation", label: resourceNames.reputation, amount: granted.reputation });
    if (granted.currency > 0) rewards.push({ kind: "gold", label: resourceNames.currency, amount: granted.currency });
  }
  for (const drop of report.lootDrops) {
    if (drop.eligibleAgents.length === 0) continue;
    const item = arc.items.find((it) => it.id === drop.itemId);
    rewards.push({ kind: "item", label: item?.name ?? drop.itemId });
  }

  // The contract entering program memory is honestly true for EVERY resolved run.
  // Unlocks are the REAL post-run delta — never the arc's aspirational grant hint.
  const worldChanges: ConsequenceWorldChange[] = [
    { kind: "recorded", targetId: challenge.id, label: challenge.name },
  ];
  for (const opened of newlyAvailable) {
    worldChanges.push({ kind: "unlocked", targetId: opened.id, label: opened.label });
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
