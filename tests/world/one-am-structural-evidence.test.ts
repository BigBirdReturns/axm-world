import { describe, expect, it } from "vitest";
import {
  ONE_AM_STRUCTURAL_EVALUATION_FORMAT,
  ONE_AM_STRUCTURAL_EVIDENCE_FORMAT,
  evaluateOneAmStructuralEvidence,
  type OneAmStructuralEvidence,
} from "../../src/world/acceptance/one-am-structural-evidence.js";

function passingEvidence(): OneAmStructuralEvidence {
  return {
    format: ONE_AM_STRUCTURAL_EVIDENCE_FORMAT,
    candidate: {
      repository: "BigBirdReturns/axm-world",
      commit: "b".repeat(40),
      authoredIdentity: "cart1_underdrain",
      experienceId: "underdrain-pump-seven",
    },
    contractId: "axm-authored-experience:underdrain-pump-seven",
    startedAt: "2026-07-28T00:00:00.000Z",
    completedAt: "2026-07-28T00:02:30.000Z",
    authority: {
      owner: "Arc",
      acceptedResultFormat: "axm-action-receipt/1",
      acceptedResultId: "actrun1_underdrain",
      campaignEffectCommitted: true,
    },
    events: [
      { id: "identity", atMs: 1_000, kind: "identity-visible", description: "You are Ren Vane, a civilian plumber." },
      { id: "goal", atMs: 2_000, kind: "goal-visible", description: "Restore Mrs. Kett's water without starting a war." },
      { id: "stakes", atMs: 3_000, kind: "stakes-visible", description: "The city's purge will destroy a hidden nursery." },
      { id: "prompt", atMs: 5_000, kind: "action-prompt", description: "Inspect the living trap joint." },
      { id: "first-water", atMs: 20_000, kind: "meaningful-success", description: "The household tap runs and exposes a living pressure route." },
      { id: "evidence-route", atMs: 40_000, kind: "choice-delta", choiceId: "evidence-first", description: "Elow recognizes the preserved sample and unlocks diagnosis." },
      { id: "valve-interaction", atMs: 65_000, kind: "objective-interaction", objectiveId: "spore-valves", interactionKinds: ["inspect", "reroute", "combat"], description: "Ren reroutes the first living valve while Caplings defend it." },
      { id: "nursery", atMs: 72_000, kind: "critical-reveal", revealId: "nursery-defense", objectiveId: "spore-valves", description: "The clog regulates pressure around a fungal nursery." },
      { id: "result", atMs: 110_000, kind: "result", description: "Pump Seven reaches a terminal deterministic result." },
      { id: "accepted", atMs: 112_000, kind: "accepted-consequence", description: "Arc replay accepts the result and consequence binding." },
      { id: "water-state", atMs: 115_000, kind: "world-change", description: "Water returns to Bellwether's east line." },
      { id: "crown-state", atMs: 116_000, kind: "relationship-change", description: "The Crown recognizes Ren as a civilian repair authority." },
      { id: "root-gate", atMs: 120_000, kind: "successor-playable", description: "The Root Gate parley is enterable." },
    ],
    objectives: [{
      id: "spore-valves",
      authoredVerb: "Inspect and reroute the living pressure valves",
      mechanicPerformed: "Inspected and operated a content-addressed valve target under pressure",
      observableStateChange: "The household line regained pressure and the nursery branch became visible",
    }],
    route: {
      choiceId: "evidence-first",
      runtimeDeltaEventIds: ["evidence-route"],
    },
    continuation: {
      persistentStateChanged: true,
      playableSuccessorId: "root-gate-parley",
    },
    recoveries: [],
  };
}

describe("rodoh-one-am-structural-evidence/1", () => {
  it("accepts exact runtime fulfillment without pretending it proves player comprehension", () => {
    const evidence = passingEvidence();
    const evaluation = evaluateOneAmStructuralEvidence(evidence);
    expect(evaluation).toEqual({
      format: ONE_AM_STRUCTURAL_EVALUATION_FORMAT,
      candidate: evidence.candidate,
      status: "pass",
      blockers: [],
      metrics: {
        firstActionPromptMs: 5_000,
        firstMeaningfulSuccessMs: 20_000,
        maximumRecoveryMs: null,
      },
    });
    expect(evidence).not.toHaveProperty("comprehension");
    expect(evidence).not.toHaveProperty("observer");
  });

  it("refuses the shipped Underdrain receiver even though its controls and practice success work", () => {
    const evidence = passingEvidence();
    evidence.authority = {
      owner: "Arc",
      acceptedResultFormat: null,
      acceptedResultId: null,
      campaignEffectCommitted: false,
    };
    evidence.events = [
      { id: "prompt", atMs: 1_000, kind: "action-prompt", description: "Move. Wrench. Orange ring? Dodge." },
      { id: "practice", atMs: 15_000, kind: "meaningful-success", description: "Practice target hit." },
      { id: "combat-valves", atMs: 30_000, kind: "objective-interaction", objectiveId: "spore-valves", interactionKinds: ["combat"], description: "Defeat three Caplings." },
      { id: "result", atMs: 180_000, kind: "result", description: "Success." },
      { id: "nursery-copy", atMs: 180_100, kind: "critical-reveal", revealId: "nursery-defense", description: "Result copy explains the nursery." },
    ];
    evidence.objectives[0] = {
      id: "spore-valves",
      authoredVerb: "Clear the Spore Valves",
      mechanicPerformed: "Defeated three Caplings",
      observableStateChange: "",
    };
    evidence.route.runtimeDeltaEventIds = [];
    evidence.continuation = { persistentStateChanged: false, playableSuccessorId: null };

    const result = evaluateOneAmStructuralEvidence(evidence);
    expect(result.status).toBe("fail");
    expect(result.blockers).toEqual(expect.arrayContaining([
      "Player identity was not visible within 30 seconds.",
      "Immediate goal was not visible within 30 seconds.",
      "Stakes were not visible within 30 seconds.",
      "No accepted authority result is bound to the episode.",
      "Campaign effect remains provisional or null.",
      "Objective spore-valves records no observable state change.",
      "Objective spore-valves was fulfilled only by combat rather than the authored mechanism.",
      "Critical reveal nursery-defense arrived only on or after the result screen.",
      "Selected route changed only remembered metadata or result copy.",
      "Accepted consequence produced no visible persistent world change.",
      "Accepted consequence produced no visible relationship change.",
      "Experience ended without a playable successor identity.",
      "Successor was described but never became playable.",
    ]));
  });

  it("refuses presentation that mutates the campaign before Arc acceptance", () => {
    const evidence = passingEvidence();
    const world = evidence.events.find((event) => event.kind === "world-change")!;
    world.atMs = 108_000;
    const result = evaluateOneAmStructuralEvidence(evidence);
    expect(result.status).toBe("fail");
    expect(result.blockers).toContain("World changed before the result was accepted by Arc.");
  });

  it("requires fast recovery without losing completed authored work or replaying exposition", () => {
    const evidence = passingEvidence();
    evidence.events.splice(8, 0,
      { id: "knockdown", atMs: 90_000, kind: "failure", description: "Ren is knocked down at the Purge Wheel." },
      { id: "restored", atMs: 92_500, kind: "control-restored", description: "Mara triggers the shutoff and the wheel resumes." },
    );
    evidence.recoveries = [{
      failureEventId: "knockdown",
      controlRestoredEventId: "restored",
      completedObjectiveIdsBefore: ["spore-valves"],
      completedObjectiveIdsAfter: ["spore-valves"],
      expositionReplayed: false,
    }];
    expect(evaluateOneAmStructuralEvidence(evidence).metrics.maximumRecoveryMs).toBe(2_500);

    evidence.events.find((event) => event.id === "restored")!.atMs = 97_000;
    evidence.recoveries[0]!.completedObjectiveIdsAfter = [];
    evidence.recoveries[0]!.expositionReplayed = true;
    const result = evaluateOneAmStructuralEvidence(evidence);
    expect(result.status).toBe("fail");
    expect(result.blockers).toEqual(expect.arrayContaining([
      "Recovery knockdown took 7000ms; maximum is 5000ms.",
      "Recovery knockdown discarded completed objective spore-valves.",
      "Recovery knockdown replayed completed exposition.",
    ]));
  });

  it("refuses out-of-order or duplicate evidence instead of sorting it into plausibility", () => {
    const evidence = passingEvidence();
    evidence.events[3]!.atMs = 500;
    evidence.events[4]!.id = evidence.events[3]!.id;
    const result = evaluateOneAmStructuralEvidence(evidence);
    expect(result.status).toBe("fail");
    expect(result.blockers.some((blocker) => blocker.includes("duplicate event ids"))).toBe(true);
    expect(result.blockers.some((blocker) => blocker.includes("out of chronological order"))).toBe(true);
  });
});
