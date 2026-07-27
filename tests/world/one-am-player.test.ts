import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ONE_AM_PLAYER_EVALUATION_FORMAT,
  ONE_AM_PLAYER_RECEIPT_FORMAT,
  evaluateOneAmPlayerReceipt,
  type OneAmPlayerReceipt,
} from "../../src/world/experience/one-am-player.js";

const ROOT = resolve(import.meta.dirname, "../..");

function answer(expectedId: string, observedId = expectedId) {
  return {
    expectedId,
    observedId,
    matched: expectedId === observedId,
    adjudicatorId: "blind-adjudicator-001",
  };
}

function passingReceipt(): OneAmPlayerReceipt {
  return {
    format: ONE_AM_PLAYER_RECEIPT_FORMAT,
    candidate: {
      repository: "BigBirdReturns/axm-world",
      commit: "a".repeat(40),
      authoredIdentity: "cart1_example",
      experienceId: "first-charter-honest-opening",
    },
    run: {
      id: "cold-run-001",
      startedAt: "2026-07-14T22:00:00.000Z",
      completedAt: "2026-07-14T22:02:20.000Z",
      device: "desktop",
      viewport: "1280x800",
    },
    observer: {
      independent: true,
      authoredCandidate: false,
      inspectedSource: false,
      receivedWalkthrough: false,
      assistanceEvents: 0,
    },
    timing: {
      firstAuthoredDecisionMs: 31_000,
      firstAcceptedConsequenceMs: 137_000,
    },
    structural: {
      primaryActionEntersAuthoredSituation: true,
      technicalLanguageRequiredOnPrimaryPath: false,
      tutorialOverlapsDecision: false,
      maximumAdvancingActionsPerBeat: 1,
      authoredDecisionBeforeActionCommit: true,
      choiceChangesRuntimeSurface: true,
      objectiveLabelsMatchPlayerVerbs: true,
      importantRevealOccursDuringPlay: true,
      actorMethodsVisibleDuringPlay: true,
      resultAcceptedByOwningAuthority: true,
      visiblePersistentWorldDelta: true,
      durableRecord: true,
      exactResume: true,
      nextPlayableActionImplemented: true,
      firstMistakePreservesAuthoredContext: true,
      missedPromptCanHardLock: false,
      desktopMobileDecisionParity: true,
      requiredNetworkRequests: 0,
    },
    comprehension: {
      playerRole: answer("charter-operator"),
      immediateConflict: answer("founding-oath-and-cellar"),
      authoredChoice: answer("crown-seal"),
      acceptedConsequence: answer("cellar-recorded"),
      nextPlayableAction: answer("return-to-changed-hall"),
    },
    behavior: {
      wrongTurns: 1,
      knockdowns: 0,
      retries: 0,
      abandonedBeforeConsequence: false,
      voluntarilyContinuedAfterConsequence: true,
    },
  };
}

function underdrainReceiverPrototypeReceipt(): OneAmPlayerReceipt {
  const receipt = passingReceipt();
  return {
    ...receipt,
    candidate: {
      ...receipt.candidate,
      authoredIdentity: "cart1_249b41f73ac97a7d41433db44801f394116ebb989f8db7433eb1064e29661bb0",
      experienceId: "underdrain-action-receiver-v2",
    },
    observer: {
      independent: false,
      authoredCandidate: true,
      inspectedSource: true,
      receivedWalkthrough: false,
      assistanceEvents: 0,
    },
    timing: {
      firstAuthoredDecisionMs: 120_000,
      firstAcceptedConsequenceMs: 0,
    },
    structural: {
      ...receipt.structural,
      primaryActionEntersAuthoredSituation: false,
      authoredDecisionBeforeActionCommit: false,
      choiceChangesRuntimeSurface: false,
      objectiveLabelsMatchPlayerVerbs: false,
      importantRevealOccursDuringPlay: false,
      actorMethodsVisibleDuringPlay: false,
      resultAcceptedByOwningAuthority: false,
      visiblePersistentWorldDelta: false,
      durableRecord: false,
      exactResume: false,
      nextPlayableActionImplemented: false,
    },
    comprehension: {
      playerRole: answer("bellwether-plumber", "wrench-fighter"),
      immediateConflict: answer("restore-water-without-starting-war", "defeat-fungus"),
      authoredChoice: { ...answer("protect-trade-evidence-or-water"), observedId: null, matched: false },
      acceptedConsequence: { ...answer("pump-seven-changes-bellwether"), observedId: null, matched: false },
      nextPlayableAction: { ...answer("parley-at-root-gate"), observedId: null, matched: false },
    },
    behavior: {
      wrongTurns: 0,
      knockdowns: 1,
      retries: 0,
      abandonedBeforeConsequence: false,
      voluntarilyContinuedAfterConsequence: false,
    },
  };
}

describe("one-a.m. player authored-experience gate", () => {
  it("accepts a zero-explanation run that closes the full authored loop despite a wrong turn", () => {
    const evaluation = evaluateOneAmPlayerReceipt(passingReceipt());
    expect(evaluation).toEqual({
      format: ONE_AM_PLAYER_EVALUATION_FORMAT,
      candidate: passingReceipt().candidate,
      status: "pass",
      blockers: [],
    });
  });

  it("refuses the Underdrain v2 action-receiver prototype for the exact gaps the player reported", () => {
    const evaluation = evaluateOneAmPlayerReceipt(underdrainReceiverPrototypeReceipt());
    expect(evaluation.status).toBe("fail");
    expect(evaluation.blockers).toEqual(expect.arrayContaining([
      "Observer was not independent.",
      "Candidate author cannot supply the blind-player receipt.",
      "Observer inspected source or authoring data before play.",
      "First authored decision took longer than 60 seconds.",
      "Primary action bypasses the authored situation.",
      "Action begins before an authored commitment.",
      "Authored choice is remembered only as metadata or prose.",
      "Authored objective labels do not match the verbs the player performs.",
      "Important story reveal occurs only before or after play.",
      "Character methods exist in authoring data but not in the playable sequence.",
      "Result is provisional and was not accepted by the owning authority.",
      "Accepted consequence does not visibly change the continuing world.",
      "Consequence has no durable authored record.",
      "Incomplete or completed experience cannot resume exactly.",
      "Next obligation is a teaser rather than a playable action.",
      "Player role did not match the authored identity.",
      "Immediate conflict did not match the authored identity.",
      "Authored choice was not independently observed.",
      "Accepted consequence was not independently observed.",
      "Next playable action was not independently observed.",
      "Player did not voluntarily continue after the first consequence.",
    ]));
  });

  it("does not let a deterministic bot or candidate author stand in for the blind player", () => {
    const receipt = passingReceipt();
    receipt.observer.authoredCandidate = true;
    receipt.observer.independent = false;
    const evaluation = evaluateOneAmPlayerReceipt(receipt);
    expect(evaluation.status).toBe("fail");
    expect(evaluation.blockers).toContain("Observer was not independent.");
    expect(evaluation.blockers).toContain("Candidate author cannot supply the blind-player receipt.");
  });

  it("does not treat safe controls and successful completion as authored comprehension", () => {
    const receipt = passingReceipt();
    receipt.comprehension.immediateConflict = answer("restore-water-without-starting-war", "defeat-fungus");
    receipt.comprehension.acceptedConsequence = { ...answer("fungus-contact-becomes-parley"), observedId: null, matched: false };
    const evaluation = evaluateOneAmPlayerReceipt(receipt);
    expect(evaluation.status).toBe("fail");
    expect(evaluation.blockers).toContain("Immediate conflict did not match the authored identity.");
    expect(evaluation.blockers).toContain("Accepted consequence was not independently observed.");
  });

  it("keeps historical program identity and authored-experience acceptance as separate gates", () => {
    const programContract = readFileSync(resolve(ROOT, "tests/world/program-of-record.test.ts"), "utf8");
    expect(programContract).toContain("computed authored-arc digest");
    expect(programContract).toContain("runtimeSurfaces");
    expect(programContract).not.toContain("one-a.m.");
    expect(programContract).not.toContain("independent observer");

    const standard = readFileSync(resolve(ROOT, "docs/design/ONE_AM_PLAYER_STANDARD.md"), "utf8");
    expect(standard).toContain("Who am I here?");
    expect(standard).toContain("What changed because of it?");
    expect(standard).toContain("A scripted browser can prove reachability");
    expect(standard).toContain("playable authored episode");

    const schema = JSON.parse(readFileSync(resolve(ROOT, "docs/schemas/rodoh-one-am-player-receipt-v1.schema.json"), "utf8"));
    expect(schema.properties.format.const).toBe(ONE_AM_PLAYER_RECEIPT_FORMAT);
    expect(schema.properties.comprehension.required).toEqual([
      "playerRole",
      "immediateConflict",
      "authoredChoice",
      "acceptedConsequence",
      "nextPlayableAction",
    ]);
  });
});
