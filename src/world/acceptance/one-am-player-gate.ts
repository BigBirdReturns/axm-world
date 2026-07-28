export const ONE_AM_PLAYER_EVIDENCE_FORMAT = "rodoh-one-am-player-evidence/1" as const;

export type OneAmRuntimeEventKind =
  | "identity-visible"
  | "goal-visible"
  | "stakes-visible"
  | "action-prompt"
  | "meaningful-success"
  | "objective-interaction"
  | "critical-reveal"
  | "choice-delta"
  | "world-change"
  | "relationship-change"
  | "successor-playable"
  | "failure"
  | "control-restored"
  | "result";

export interface OneAmRuntimeEvent {
  atMs: number;
  kind: OneAmRuntimeEventKind;
  objectiveId?: string;
  choiceId?: string;
  revealId?: string;
  interactionKinds?: string[];
  description: string;
}

export interface OneAmPlayerEvidence {
  format: typeof ONE_AM_PLAYER_EVIDENCE_FORMAT;
  contractId: string;
  experienceId: string;
  startedAt: string;
  completedAt: string;
  events: OneAmRuntimeEvent[];
  objectives: Array<{
    id: string;
    authoredVerb: string;
    mechanicPerformed: string;
    observableStateChange: string;
  }>;
  route: {
    choiceId: string | null;
    runtimeDeltas: string[];
  };
  comprehension: {
    whoAmI: string;
    whatAmIDoing: string;
    whyDoesItMatter: string;
    whatChanged: string;
    whatCanIDoNext: string;
  };
  continuation: {
    persistentStateChanged: boolean;
    playableSuccessorId: string | null;
  };
}

export interface OneAmRuntimeValidation {
  ok: boolean;
  errors: string[];
  metrics: {
    firstActionPromptMs: number | null;
    firstMeaningfulSuccessMs: number | null;
    maximumRecoveryMs: number | null;
  };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function firstAt(events: readonly OneAmRuntimeEvent[], kind: OneAmRuntimeEventKind): number | null {
  const event = events.find((candidate) => candidate.kind === kind);
  return event ? event.atMs : null;
}

export function validateOneAmPlayerEvidence(evidence: OneAmPlayerEvidence): OneAmRuntimeValidation {
  const errors: string[] = [];
  const events = [...evidence.events].sort((left, right) => left.atMs - right.atMs);

  if (evidence.format !== ONE_AM_PLAYER_EVIDENCE_FORMAT) {
    errors.push(`Unsupported 1 AM runtime evidence format: ${String(evidence.format)}`);
  }
  if (!nonEmpty(evidence.contractId)) errors.push("Runtime evidence is not bound to an authoring contract.");
  if (!nonEmpty(evidence.experienceId)) errors.push("Runtime evidence has no experience id.");
  if (events.some((event) => !Number.isFinite(event.atMs) || event.atMs < 0)) {
    errors.push("Runtime evidence contains an invalid event time.");
  }

  const identityAt = firstAt(events, "identity-visible");
  const goalAt = firstAt(events, "goal-visible");
  const stakesAt = firstAt(events, "stakes-visible");
  const actionAt = firstAt(events, "action-prompt");
  const successAt = firstAt(events, "meaningful-success");
  if (identityAt === null || identityAt > 30_000) errors.push("The player identity was not visible within 30 seconds.");
  if (goalAt === null || goalAt > 30_000) errors.push("The immediate goal was not visible within 30 seconds.");
  if (stakesAt === null || stakesAt > 30_000) errors.push("The stakes were not visible within 30 seconds.");
  if (actionAt === null || actionAt > 30_000) errors.push("The first actionable prompt was not visible within 30 seconds.");
  if (successAt === null || successAt > 90_000) errors.push("The player did not receive a meaningful success within 90 seconds.");

  if (evidence.objectives.length === 0) errors.push("No authored objective was completed in runtime evidence.");
  const runtimeObjectiveEvents = new Map<string, OneAmRuntimeEvent[]>();
  for (const event of events.filter((candidate) => candidate.objectiveId)) {
    const list = runtimeObjectiveEvents.get(event.objectiveId!) ?? [];
    list.push(event);
    runtimeObjectiveEvents.set(event.objectiveId!, list);
  }
  for (const objective of evidence.objectives) {
    const label = `Objective ${objective.id || "<missing>"}`;
    if (!nonEmpty(objective.authoredVerb)) errors.push(`${label} has no authored verb.`);
    if (!nonEmpty(objective.mechanicPerformed)) errors.push(`${label} records no performed mechanic.`);
    if (!nonEmpty(objective.observableStateChange)) errors.push(`${label} records no observable state change.`);
    const interaction = (runtimeObjectiveEvents.get(objective.id) ?? []).find((event) => event.kind === "objective-interaction");
    if (!interaction) {
      errors.push(`${label} never produced an objective interaction event.`);
    } else if (!interaction.interactionKinds?.some((kind) => kind !== "combat")) {
      errors.push(`${label} was presented as combat only rather than the authored mechanism.`);
    }
  }

  const resultAt = firstAt(events, "result");
  const reveals = events.filter((event) => event.kind === "critical-reveal");
  if (reveals.length === 0) errors.push("No critical story reveal occurred during play.");
  for (const reveal of reveals) {
    if (resultAt !== null && reveal.atMs >= resultAt) {
      errors.push(`Critical reveal ${reveal.revealId ?? reveal.description} arrived only on or after the result screen.`);
    }
  }

  if (evidence.route.choiceId) {
    const deltas = events.filter((event) => event.kind === "choice-delta" && event.choiceId === evidence.route.choiceId);
    if (evidence.route.runtimeDeltas.length === 0 || deltas.length === 0) {
      errors.push("The selected route changed only remembered metadata or result copy, not the played scene.");
    }
    if (resultAt !== null && deltas.some((event) => event.atMs >= resultAt)) {
      errors.push("The selected route did not affect play before the result screen.");
    }
  }

  const worldChanges = events.filter((event) => event.kind === "world-change");
  const relationshipChanges = events.filter((event) => event.kind === "relationship-change");
  if (!evidence.continuation.persistentStateChanged || worldChanges.length === 0) {
    errors.push("The completed experience did not expose a persistent world change.");
  }
  if (relationshipChanges.length === 0) errors.push("The completed experience exposed no relationship change.");
  if (!nonEmpty(evidence.continuation.playableSuccessorId)) errors.push("The experience ended with no playable successor scene.");
  if (!events.some((event) => event.kind === "successor-playable")) errors.push("The successor was described but never became playable.");

  const recoveryTimes: number[] = [];
  for (const failure of events.filter((event) => event.kind === "failure")) {
    const restored = events.find((event) => event.kind === "control-restored" && event.atMs >= failure.atMs);
    if (!restored) {
      errors.push(`Control was never restored after failure at ${failure.atMs}ms.`);
      continue;
    }
    const elapsed = restored.atMs - failure.atMs;
    recoveryTimes.push(elapsed);
    if (elapsed > 5_000) errors.push(`Recovery took ${elapsed}ms; the 1 AM player gate permits at most 5000ms.`);
  }

  const comprehension = evidence.comprehension;
  if (!nonEmpty(comprehension.whoAmI)) errors.push("Runtime evidence cannot answer: Who am I?");
  if (!nonEmpty(comprehension.whatAmIDoing)) errors.push("Runtime evidence cannot answer: What am I doing?");
  if (!nonEmpty(comprehension.whyDoesItMatter)) errors.push("Runtime evidence cannot answer: Why does it matter?");
  if (!nonEmpty(comprehension.whatChanged)) errors.push("Runtime evidence cannot answer: What changed?");
  if (!nonEmpty(comprehension.whatCanIDoNext)) errors.push("Runtime evidence cannot answer: What can I do next?");

  return {
    ok: errors.length === 0,
    errors,
    metrics: {
      firstActionPromptMs: actionAt,
      firstMeaningfulSuccessMs: successAt,
      maximumRecoveryMs: recoveryTimes.length > 0 ? Math.max(...recoveryTimes) : null,
    },
  };
}
