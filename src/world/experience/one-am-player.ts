export const ONE_AM_PLAYER_RECEIPT_FORMAT = "rodoh-one-am-player-receipt/1" as const;
export const ONE_AM_PLAYER_EVALUATION_FORMAT = "rodoh-one-am-player-evaluation/1" as const;

export interface OneAmAnswer {
  expectedId: string;
  observedId: string | null;
  matched: boolean;
  adjudicatorId: string;
}

export interface OneAmPlayerReceipt {
  format: typeof ONE_AM_PLAYER_RECEIPT_FORMAT;
  candidate: {
    repository: string;
    commit: string;
    authoredIdentity: string;
    experienceId: string;
  };
  run: {
    id: string;
    startedAt: string;
    completedAt: string;
    device: "desktop" | "mobile" | "other";
    viewport: string;
  };
  observer: {
    independent: boolean;
    authoredCandidate: boolean;
    inspectedSource: boolean;
    receivedWalkthrough: boolean;
    assistanceEvents: number;
  };
  timing: {
    firstAuthoredDecisionMs: number;
    firstAcceptedConsequenceMs: number;
  };
  structural: {
    primaryActionEntersAuthoredSituation: boolean;
    technicalLanguageRequiredOnPrimaryPath: boolean;
    tutorialOverlapsDecision: boolean;
    maximumAdvancingActionsPerBeat: number;
    authoredDecisionBeforeActionCommit: boolean;
    choiceChangesRuntimeSurface: boolean;
    objectiveLabelsMatchPlayerVerbs: boolean;
    importantRevealOccursDuringPlay: boolean;
    actorMethodsVisibleDuringPlay: boolean;
    resultAcceptedByOwningAuthority: boolean;
    visiblePersistentWorldDelta: boolean;
    durableRecord: boolean;
    exactResume: boolean;
    nextPlayableActionImplemented: boolean;
    firstMistakePreservesAuthoredContext: boolean;
    missedPromptCanHardLock: boolean;
    desktopMobileDecisionParity: boolean;
    requiredNetworkRequests: number;
  };
  comprehension: {
    playerRole: OneAmAnswer;
    immediateConflict: OneAmAnswer;
    authoredChoice: OneAmAnswer;
    acceptedConsequence: OneAmAnswer;
    nextPlayableAction: OneAmAnswer;
  };
  behavior: {
    wrongTurns: number;
    knockdowns: number;
    retries: number;
    abandonedBeforeConsequence: boolean;
    voluntarilyContinuedAfterConsequence: boolean | null;
  };
}

export interface OneAmPlayerEvaluation {
  format: typeof ONE_AM_PLAYER_EVALUATION_FORMAT;
  candidate: OneAmPlayerReceipt["candidate"];
  status: "pass" | "fail";
  blockers: string[];
}

function isLowerHex(value: string, length: number): boolean {
  return new RegExp(`^[0-9a-f]{${length}}$`).test(value);
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function answerBlockers(label: string, answer: OneAmAnswer): string[] {
  const blockers: string[] = [];
  if (!isNonEmpty(answer.expectedId)) blockers.push(`${label} has no expected identity.`);
  if (answer.observedId === null || !isNonEmpty(answer.observedId)) blockers.push(`${label} was not independently observed.`);
  if (!answer.matched) blockers.push(`${label} did not match the authored identity.`);
  if (!isNonEmpty(answer.adjudicatorId)) blockers.push(`${label} has no independent adjudicator.`);
  return blockers;
}

export function evaluateOneAmPlayerReceipt(receipt: OneAmPlayerReceipt): OneAmPlayerEvaluation {
  const blockers: string[] = [];

  if (receipt.format !== ONE_AM_PLAYER_RECEIPT_FORMAT) blockers.push(`Unsupported receipt format: ${String(receipt.format)}.`);
  if (!isNonEmpty(receipt.candidate.repository)) blockers.push("Candidate repository is absent.");
  if (!isLowerHex(receipt.candidate.commit, 40)) blockers.push("Candidate commit is not a 40-character lowercase Git SHA.");
  if (!isNonEmpty(receipt.candidate.authoredIdentity)) blockers.push("Authored experience identity is absent.");
  if (!isNonEmpty(receipt.candidate.experienceId)) blockers.push("Experience identity is absent.");
  if (!isNonEmpty(receipt.run.id)) blockers.push("Run identity is absent.");
  if (!Number.isFinite(Date.parse(receipt.run.startedAt)) || !Number.isFinite(Date.parse(receipt.run.completedAt))) {
    blockers.push("Run timestamps are invalid.");
  }

  if (!receipt.observer.independent) blockers.push("Observer was not independent.");
  if (receipt.observer.authoredCandidate) blockers.push("Candidate author cannot supply the blind-player receipt.");
  if (receipt.observer.inspectedSource) blockers.push("Observer inspected source or authoring data before play.");
  if (receipt.observer.receivedWalkthrough) blockers.push("Observer received a walkthrough before or during play.");
  if (!Number.isInteger(receipt.observer.assistanceEvents) || receipt.observer.assistanceEvents !== 0) {
    blockers.push("Blind run included assistance events.");
  }

  if (!Number.isFinite(receipt.timing.firstAuthoredDecisionMs) || receipt.timing.firstAuthoredDecisionMs < 0) {
    blockers.push("First authored-decision timing is invalid.");
  } else if (receipt.timing.firstAuthoredDecisionMs > 60_000) {
    blockers.push("First authored decision took longer than 60 seconds.");
  }
  if (!Number.isFinite(receipt.timing.firstAcceptedConsequenceMs) || receipt.timing.firstAcceptedConsequenceMs < 0) {
    blockers.push("First accepted-consequence timing is invalid.");
  } else if (receipt.timing.firstAcceptedConsequenceMs > 180_000) {
    blockers.push("First accepted consequence took longer than three minutes.");
  }

  const structural = receipt.structural;
  if (!structural.primaryActionEntersAuthoredSituation) blockers.push("Primary action bypasses the authored situation.");
  if (structural.technicalLanguageRequiredOnPrimaryPath) blockers.push("Primary player path requires technical authority language.");
  if (structural.tutorialOverlapsDecision) blockers.push("Tutorial occupies the current decision surface.");
  if (!Number.isInteger(structural.maximumAdvancingActionsPerBeat) || structural.maximumAdvancingActionsPerBeat !== 1) {
    blockers.push("A beat exposes more than one advancing action.");
  }
  if (!structural.authoredDecisionBeforeActionCommit) blockers.push("Action begins before an authored commitment.");
  if (!structural.choiceChangesRuntimeSurface) blockers.push("Authored choice is remembered only as metadata or prose.");
  if (!structural.objectiveLabelsMatchPlayerVerbs) blockers.push("Authored objective labels do not match the verbs the player performs.");
  if (!structural.importantRevealOccursDuringPlay) blockers.push("Important story reveal occurs only before or after play.");
  if (!structural.actorMethodsVisibleDuringPlay) blockers.push("Character methods exist in authoring data but not in the playable sequence.");
  if (!structural.resultAcceptedByOwningAuthority) blockers.push("Result is provisional and was not accepted by the owning authority.");
  if (!structural.visiblePersistentWorldDelta) blockers.push("Accepted consequence does not visibly change the continuing world.");
  if (!structural.durableRecord) blockers.push("Consequence has no durable authored record.");
  if (!structural.exactResume) blockers.push("Incomplete or completed experience cannot resume exactly.");
  if (!structural.nextPlayableActionImplemented) blockers.push("Next obligation is a teaser rather than a playable action.");
  if (!structural.firstMistakePreservesAuthoredContext) blockers.push("First ordinary mistake discards authored context.");
  if (structural.missedPromptCanHardLock) blockers.push("Missing one prompt can hard-lock the first session.");
  if (!structural.desktopMobileDecisionParity) blockers.push("Desktop and mobile do not preserve the same decisions and causal order.");
  if (!Number.isInteger(structural.requiredNetworkRequests) || structural.requiredNetworkRequests !== 0) {
    blockers.push("Standalone authored path requires a network request.");
  }

  blockers.push(...answerBlockers("Player role", receipt.comprehension.playerRole));
  blockers.push(...answerBlockers("Immediate conflict", receipt.comprehension.immediateConflict));
  blockers.push(...answerBlockers("Authored choice", receipt.comprehension.authoredChoice));
  blockers.push(...answerBlockers("Accepted consequence", receipt.comprehension.acceptedConsequence));
  blockers.push(...answerBlockers("Next playable action", receipt.comprehension.nextPlayableAction));

  if (receipt.behavior.abandonedBeforeConsequence) blockers.push("Player abandoned before the first accepted consequence.");
  if (receipt.behavior.voluntarilyContinuedAfterConsequence !== true) {
    blockers.push("Player did not voluntarily continue after the first consequence.");
  }
  for (const [label, value] of Object.entries({
    wrongTurns: receipt.behavior.wrongTurns,
    knockdowns: receipt.behavior.knockdowns,
    retries: receipt.behavior.retries,
  })) {
    if (!Number.isInteger(value) || value < 0) blockers.push(`${label} is not a non-negative integer.`);
  }

  return {
    format: ONE_AM_PLAYER_EVALUATION_FORMAT,
    candidate: receipt.candidate,
    status: blockers.length === 0 ? "pass" : "fail",
    blockers,
  };
}
