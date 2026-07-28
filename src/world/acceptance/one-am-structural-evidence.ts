export const ONE_AM_STRUCTURAL_EVIDENCE_FORMAT = "rodoh-one-am-structural-evidence/1" as const;
export const ONE_AM_STRUCTURAL_EVALUATION_FORMAT = "rodoh-one-am-structural-evaluation/1" as const;

export type OneAmStructuralEventKind =
  | "identity-visible"
  | "goal-visible"
  | "stakes-visible"
  | "action-prompt"
  | "meaningful-success"
  | "objective-interaction"
  | "critical-reveal"
  | "choice-delta"
  | "result"
  | "accepted-consequence"
  | "world-change"
  | "relationship-change"
  | "successor-playable"
  | "failure"
  | "control-restored";

export interface OneAmStructuralEvent {
  id: string;
  atMs: number;
  kind: OneAmStructuralEventKind;
  objectiveId?: string;
  choiceId?: string;
  revealId?: string;
  interactionKinds?: string[];
  description: string;
}

export interface OneAmStructuralRecovery {
  failureEventId: string;
  controlRestoredEventId: string;
  completedObjectiveIdsBefore: string[];
  completedObjectiveIdsAfter: string[];
  expositionReplayed: boolean;
}

export interface OneAmStructuralEvidence {
  format: typeof ONE_AM_STRUCTURAL_EVIDENCE_FORMAT;
  candidate: {
    repository: string;
    commit: string;
    authoredIdentity: string;
    experienceId: string;
  };
  contractId: string;
  startedAt: string;
  completedAt: string;
  authority: {
    owner: "Arc";
    acceptedResultFormat: string | null;
    acceptedResultId: string | null;
    campaignEffectCommitted: boolean;
  };
  events: OneAmStructuralEvent[];
  objectives: Array<{
    id: string;
    authoredVerb: string;
    mechanicPerformed: string;
    observableStateChange: string;
  }>;
  route: {
    choiceId: string | null;
    runtimeDeltaEventIds: string[];
  };
  continuation: {
    persistentStateChanged: boolean;
    playableSuccessorId: string | null;
  };
  recoveries: OneAmStructuralRecovery[];
}

export interface OneAmStructuralEvaluation {
  format: typeof ONE_AM_STRUCTURAL_EVALUATION_FORMAT;
  candidate: OneAmStructuralEvidence["candidate"];
  status: "pass" | "fail";
  blockers: string[];
  metrics: {
    firstActionPromptMs: number | null;
    firstMeaningfulSuccessMs: number | null;
    maximumRecoveryMs: number | null;
  };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function lowerHex(value: string, length: number): boolean {
  return new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

function firstEvent(events: readonly OneAmStructuralEvent[], kind: OneAmStructuralEventKind): OneAmStructuralEvent | null {
  return events.find((event) => event.kind === kind) ?? null;
}

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function evaluateOneAmStructuralEvidence(evidence: OneAmStructuralEvidence): OneAmStructuralEvaluation {
  const blockers: string[] = [];
  const events = evidence.events;
  const eventById = new Map(events.map((event) => [event.id, event]));

  if (evidence.format !== ONE_AM_STRUCTURAL_EVIDENCE_FORMAT) {
    blockers.push(`Unsupported structural evidence format: ${String(evidence.format)}.`);
  }
  if (!nonEmpty(evidence.candidate.repository)) blockers.push("Candidate repository is absent.");
  if (!lowerHex(evidence.candidate.commit, 40)) blockers.push("Candidate commit is not a 40-character lowercase Git SHA.");
  if (!nonEmpty(evidence.candidate.authoredIdentity)) blockers.push("Authored identity is absent.");
  if (!nonEmpty(evidence.candidate.experienceId)) blockers.push("Experience identity is absent.");
  if (!nonEmpty(evidence.contractId)) blockers.push("Runtime evidence is not bound to an authored-experience contract.");

  const started = Date.parse(evidence.startedAt);
  const completed = Date.parse(evidence.completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) {
    blockers.push("Evidence timestamps are invalid or reversed.");
  }

  if (events.length === 0) blockers.push("Runtime evidence contains no events.");
  const duplicateEventIds = duplicateValues(events.map((event) => event.id));
  if (duplicateEventIds.length > 0) blockers.push(`Runtime evidence contains duplicate event ids: ${duplicateEventIds.join(", ")}.`);
  let previousTime = -1;
  for (const event of events) {
    if (!nonEmpty(event.id)) blockers.push("Runtime evidence contains an event without an id.");
    if (!Number.isFinite(event.atMs) || event.atMs < 0) blockers.push(`Event ${event.id || "<missing>"} has an invalid time.`);
    if (event.atMs < previousTime) blockers.push(`Event ${event.id || "<missing>"} is out of chronological order.`);
    previousTime = event.atMs;
    if (!nonEmpty(event.description)) blockers.push(`Event ${event.id || "<missing>"} has no description.`);
  }

  const identity = firstEvent(events, "identity-visible");
  const goal = firstEvent(events, "goal-visible");
  const stakes = firstEvent(events, "stakes-visible");
  const action = firstEvent(events, "action-prompt");
  const success = firstEvent(events, "meaningful-success");
  if (!identity || identity.atMs > 30_000) blockers.push("Player identity was not visible within 30 seconds.");
  if (!goal || goal.atMs > 30_000) blockers.push("Immediate goal was not visible within 30 seconds.");
  if (!stakes || stakes.atMs > 30_000) blockers.push("Stakes were not visible within 30 seconds.");
  if (!action || action.atMs > 30_000) blockers.push("First actionable prompt was not visible within 30 seconds.");
  if (!success || success.atMs > 90_000) blockers.push("No meaningful success occurred within 90 seconds.");

  const result = firstEvent(events, "result");
  const accepted = firstEvent(events, "accepted-consequence");
  if (!result) blockers.push("Runtime produced no terminal result event.");
  if (!accepted) blockers.push("Runtime produced no accepted-consequence event.");
  if (result && accepted && accepted.atMs < result.atMs) blockers.push("Accepted consequence precedes the terminal result it claims to accept.");
  if (evidence.authority.owner !== "Arc") blockers.push("Accepted campaign authority is not Arc.");
  if (!nonEmpty(evidence.authority.acceptedResultFormat) || !nonEmpty(evidence.authority.acceptedResultId)) {
    blockers.push("No accepted authority result is bound to the episode.");
  }
  if (!evidence.authority.campaignEffectCommitted) blockers.push("Campaign effect remains provisional or null.");

  if (evidence.objectives.length === 0) blockers.push("No authored objective is represented in runtime evidence.");
  const duplicateObjectiveIds = duplicateValues(evidence.objectives.map((objective) => objective.id));
  if (duplicateObjectiveIds.length > 0) blockers.push(`Runtime evidence contains duplicate objective ids: ${duplicateObjectiveIds.join(", ")}.`);
  for (const objective of evidence.objectives) {
    const label = `Objective ${objective.id || "<missing>"}`;
    if (!nonEmpty(objective.authoredVerb)) blockers.push(`${label} has no authored verb.`);
    if (!nonEmpty(objective.mechanicPerformed)) blockers.push(`${label} records no performed mechanic.`);
    if (!nonEmpty(objective.observableStateChange)) blockers.push(`${label} records no observable state change.`);
    const interactions = events.filter((event) => event.kind === "objective-interaction" && event.objectiveId === objective.id);
    if (interactions.length === 0) {
      blockers.push(`${label} never produced an objective-interaction event.`);
      continue;
    }
    if (!interactions.some((event) => event.interactionKinds?.some((kind) => kind !== "combat"))) {
      blockers.push(`${label} was fulfilled only by combat rather than the authored mechanism.`);
    }
    if (result && interactions.every((event) => event.atMs >= result.atMs)) {
      blockers.push(`${label} interaction occurred only on or after the result screen.`);
    }
  }

  const reveals = events.filter((event) => event.kind === "critical-reveal");
  if (reveals.length === 0) blockers.push("No critical story reveal occurred during play.");
  for (const reveal of reveals) {
    if (!nonEmpty(reveal.revealId)) blockers.push(`Critical reveal event ${reveal.id} has no reveal identity.`);
    if (result && reveal.atMs >= result.atMs) blockers.push(`Critical reveal ${reveal.revealId ?? reveal.id} arrived only on or after the result screen.`);
  }

  if (evidence.route.choiceId !== null) {
    if (!nonEmpty(evidence.route.choiceId)) blockers.push("Selected route has an empty choice identity.");
    if (evidence.route.runtimeDeltaEventIds.length === 0) {
      blockers.push("Selected route changed only remembered metadata or result copy.");
    }
    for (const eventId of evidence.route.runtimeDeltaEventIds) {
      const event = eventById.get(eventId);
      if (!event || event.kind !== "choice-delta" || event.choiceId !== evidence.route.choiceId) {
        blockers.push(`Route delta ${eventId} is absent or belongs to another choice.`);
      } else if (result && event.atMs >= result.atMs) {
        blockers.push(`Route delta ${eventId} did not affect play before the result screen.`);
      }
    }
  } else if (evidence.route.runtimeDeltaEventIds.length > 0) {
    blockers.push("Route delta events exist without a selected authored choice.");
  }

  const worldChanges = events.filter((event) => event.kind === "world-change");
  const relationshipChanges = events.filter((event) => event.kind === "relationship-change");
  if (!evidence.continuation.persistentStateChanged || worldChanges.length === 0) {
    blockers.push("Accepted consequence produced no visible persistent world change.");
  }
  if (relationshipChanges.length === 0) blockers.push("Accepted consequence produced no visible relationship change.");
  if (accepted) {
    if (worldChanges.some((event) => event.atMs < accepted.atMs)) blockers.push("World changed before the result was accepted by Arc.");
    if (relationshipChanges.some((event) => event.atMs < accepted.atMs)) blockers.push("Relationship changed before the result was accepted by Arc.");
  }
  if (!nonEmpty(evidence.continuation.playableSuccessorId)) blockers.push("Experience ended without a playable successor identity.");
  const successor = firstEvent(events, "successor-playable");
  if (!successor) blockers.push("Successor was described but never became playable.");
  if (accepted && successor && successor.atMs < accepted.atMs) blockers.push("Successor became playable before the accepted consequence existed.");

  const recoveryTimes: number[] = [];
  for (const recovery of evidence.recoveries) {
    const failure = eventById.get(recovery.failureEventId);
    const restored = eventById.get(recovery.controlRestoredEventId);
    if (!failure || failure.kind !== "failure") {
      blockers.push(`Recovery references missing failure event ${recovery.failureEventId}.`);
      continue;
    }
    if (!restored || restored.kind !== "control-restored") {
      blockers.push(`Recovery references missing control-restored event ${recovery.controlRestoredEventId}.`);
      continue;
    }
    const elapsed = restored.atMs - failure.atMs;
    recoveryTimes.push(elapsed);
    if (elapsed < 0 || elapsed > 5_000) blockers.push(`Recovery ${recovery.failureEventId} took ${elapsed}ms; maximum is 5000ms.`);
    const after = new Set(recovery.completedObjectiveIdsAfter);
    for (const objectiveId of recovery.completedObjectiveIdsBefore) {
      if (!after.has(objectiveId)) blockers.push(`Recovery ${recovery.failureEventId} discarded completed objective ${objectiveId}.`);
    }
    if (recovery.expositionReplayed) blockers.push(`Recovery ${recovery.failureEventId} replayed completed exposition.`);
  }
  for (const failure of events.filter((event) => event.kind === "failure")) {
    if (!evidence.recoveries.some((recovery) => recovery.failureEventId === failure.id)) {
      blockers.push(`Failure event ${failure.id} has no governed recovery record.`);
    }
  }

  return {
    format: ONE_AM_STRUCTURAL_EVALUATION_FORMAT,
    candidate: evidence.candidate,
    status: blockers.length === 0 ? "pass" : "fail",
    blockers,
    metrics: {
      firstActionPromptMs: action?.atMs ?? null,
      firstMeaningfulSuccessMs: success?.atMs ?? null,
      maximumRecoveryMs: recoveryTimes.length > 0 ? Math.max(...recoveryTimes) : null,
    },
  };
}
