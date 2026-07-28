import { describe, expect, it } from "vitest";
import {
  ONE_AM_PLAYER_EVIDENCE_FORMAT,
  validateOneAmPlayerEvidence,
  type OneAmPlayerEvidence,
} from "../../src/world/acceptance/one-am-player-gate.js";

function continuousEvidence(): OneAmPlayerEvidence {
  return {
    format: ONE_AM_PLAYER_EVIDENCE_FORMAT,
    contractId: "underdrain-pilot",
    experienceId: "underdrain-pilot-run-001",
    startedAt: "2026-07-27T00:00:00.000Z",
    completedAt: "2026-07-27T00:08:00.000Z",
    events: [
      { atMs: 1_000, kind: "identity-visible", description: "You are Ren Vane, a plumber, not a soldier." },
      { atMs: 2_000, kind: "goal-visible", description: "Restore Mrs. Kett's water by diagnosing the living blockage." },
      { atMs: 3_000, kind: "stakes-visible", description: "The city is preparing to turn the repair into an extermination campaign." },
      { atMs: 5_000, kind: "action-prompt", description: "Inspect the glowing trap joint." },
      { atMs: 20_000, kind: "meaningful-success", description: "The household tap runs briefly and reveals a living pressure route." },
      { atMs: 40_000, kind: "choice-delta", choiceId: "evidence-first", description: "Elow recognizes the preserved sample and unlocks diagnosis." },
      { atMs: 65_000, kind: "objective-interaction", objectiveId: "spore-valves", interactionKinds: ["inspect", "repair", "combat"], description: "Ren reroutes a valve while Caplings defend the nursery branch." },
      { atMs: 72_000, kind: "critical-reveal", revealId: "nursery-defense", objectiveId: "spore-valves", description: "The living clog is regulating pressure around a nursery." },
      { atMs: 110_000, kind: "world-change", description: "Water returns to Bellwether's east line." },
      { atMs: 112_000, kind: "relationship-change", description: "The Crown recognizes Ren as a civilian repair authority." },
      { atMs: 115_000, kind: "result", description: "Pump Seven is held without purging the nursery." },
      { atMs: 120_000, kind: "successor-playable", description: "Enter the Root Gate parley." },
    ],
    objectives: [
      {
        id: "spore-valves",
        authoredVerb: "Inspect and reroute the living pressure valves",
        mechanicPerformed: "Inspected, selected reroute, and operated the valve under pressure",
        observableStateChange: "The household line regained pressure and the nursery branch became visible",
      },
    ],
    route: {
      choiceId: "evidence-first",
      runtimeDeltas: ["Elow diagnoses defensive tissue", "Present-evidence interaction unlocked"],
    },
    comprehension: {
      whoAmI: "Ren Vane, a civilian plumber",
      whatAmIDoing: "Restoring water without turning a repair into a war",
      whyDoesItMatter: "A purge would destroy a hidden nursery",
      whatChanged: "Water returned and the Crown opened parley",
      whatCanIDoNext: "Play the Root Gate parley",
    },
    continuation: {
      persistentStateChanged: true,
      playableSuccessorId: "root-gate-parley",
    },
  };
}

describe("rodoh-one-am-player-evidence/1", () => {
  it("accepts a continuous authored runtime", () => {
    expect(validateOneAmPlayerEvidence(continuousEvidence())).toEqual({
      ok: true,
      errors: [],
      metrics: {
        firstActionPromptMs: 5_000,
        firstMeaningfulSuccessMs: 20_000,
        maximumRecoveryMs: null,
      },
    });
  });

  it("refuses the shipped Underdrain receiver trace", () => {
    const receiver = continuousEvidence();
    receiver.events = [
      { atMs: 1_000, kind: "action-prompt", description: "Move. Wrench. Orange ring? Dodge." },
      { atMs: 15_000, kind: "meaningful-success", description: "Practice target hit." },
      { atMs: 30_000, kind: "objective-interaction", objectiveId: "spore-valves", interactionKinds: ["combat"], description: "Defeat three Caplings." },
      { atMs: 180_000, kind: "result", description: "Success." },
      { atMs: 180_100, kind: "critical-reveal", revealId: "nursery-defense", description: "Result copy explains the nursery." },
    ];
    receiver.objectives[0] = {
      id: "spore-valves",
      authoredVerb: "Clear the Spore Valves",
      mechanicPerformed: "Defeated three Caplings",
      observableStateChange: "",
    };
    receiver.route.runtimeDeltas = [];
    receiver.continuation = { persistentStateChanged: false, playableSuccessorId: null };
    receiver.comprehension = {
      whoAmI: "",
      whatAmIDoing: "Fight fungus",
      whyDoesItMatter: "",
      whatChanged: "",
      whatCanIDoNext: "",
    };

    const result = validateOneAmPlayerEvidence(receiver);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "The player identity was not visible within 30 seconds.",
      "The immediate goal was not visible within 30 seconds.",
      "The stakes were not visible within 30 seconds.",
      expect.stringContaining("presented as combat only"),
      expect.stringContaining("Critical reveal nursery-defense arrived only"),
      "The selected route changed only remembered metadata or result copy, not the played scene.",
      "The completed experience did not expose a persistent world change.",
      "The experience ended with no playable successor scene.",
      "The successor was described but never became playable.",
      "Runtime evidence cannot answer: Who am I?",
      "Runtime evidence cannot answer: Why does it matter?",
      "Runtime evidence cannot answer: What changed?",
      "Runtime evidence cannot answer: What can I do next?",
    ]));
  });

  it("requires rapid checkpoint recovery without treating death as an ending", () => {
    const evidence = continuousEvidence();
    evidence.events.push(
      { atMs: 75_000, kind: "failure", description: "Ren is knocked down." },
      { atMs: 77_500, kind: "control-restored", description: "Mara triggers the emergency shutoff and the current valve resumes." },
    );
    expect(validateOneAmPlayerEvidence(evidence).metrics.maximumRecoveryMs).toBe(2_500);

    evidence.events[evidence.events.length - 1] = {
      atMs: 82_000,
      kind: "control-restored",
      description: "The player is returned after a long restart.",
    };
    expect(validateOneAmPlayerEvidence(evidence).errors).toContain(
      "Recovery took 7000ms; the 1 AM player gate permits at most 5000ms.",
    );
  });
});
