import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { initialActionState, stepActionSimulation } from "../../src/engine/action/simulation.js";
import {
  ACTION_BUTTON,
  type ActionEncounterSpec,
  type ActionInput,
  type ActionSimulationState,
  type ActionStats,
} from "../../src/engine/action/types.js";

const nativeSpecPath = process.env.AXM_UNITY_NATIVE_SPEC;
const projectionPath = process.env.AXM_UNITY_PROJECTION;
const outputPath = process.env.AXM_UNITY_VECTOR_OUT;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function normalizeMode(value: unknown): string {
  return String(value ?? "").replace(/_/g, "-").toLowerCase();
}

function statsSnapshot(stats: ActionStats) {
  return {
    hitsLanded: Number(stats.hitsLanded),
    heavyHits: Number(stats.heavyHits),
    damageTaken: Number(stats.damageTaken),
    parries: Number(stats.parries),
    dodgedAttacks: Number(stats.dodgedAttacks),
    enemiesDefeated: Number(stats.enemiesDefeated),
    ...(stats.objectiveInteractions === undefined
      ? {}
      : { objectiveInteractions: Number(stats.objectiveInteractions) }),
    ...(stats.objectiveHoldTicks === undefined
      ? {}
      : { objectiveHoldTicks: Number(stats.objectiveHoldTicks) }),
  };
}

function snapshot(state: ActionSimulationState) {
  const enemies = [...state.enemies]
    .map((enemy) => ({
      id: String(enemy.id),
      objectiveId: String(enemy.objectiveId),
      kit: String(enemy.kit),
      x: Number(enemy.x),
      y: Number(enemy.y),
      health: Number(enemy.health),
      mode: normalizeMode(enemy.mode),
      modeTick: Number(enemy.modeTick),
      attackResolved: Boolean(enemy.attackResolved),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const completedObjectiveIds = [...state.completedObjectiveIds].map(String).sort();
  const result = state.result
    ? {
        outcome: String(state.result.outcome),
        completedObjectiveIds: [...state.result.completedObjectiveIds].map(String).sort(),
        objectives: [...state.result.objectives].map((objective) => ({
          id: String(objective.id),
          defeated: Number(objective.defeated),
          target: Number(objective.target),
          completed: Boolean(objective.completed),
          ...(objective.kind === undefined ? {} : { kind: String(objective.kind) }),
          ...(objective.progress === undefined ? {} : { progress: Number(objective.progress) }),
        })),
        playerHealth: Number(state.result.playerHealth),
        playerDefeated: Boolean(state.result.playerDefeated),
        totalTicks: Number(state.result.totalTicks),
        stats: statsSnapshot(state.result.stats),
      }
    : null;
  return {
    tick: Number(state.tick),
    activeObjectiveIndex: Number(state.activeObjectiveIndex),
    previousButtons: Number(state.previousButtons),
    player: {
      x: Number(state.player.x),
      y: Number(state.player.y),
      facingX: Number(state.player.facingX),
      facingY: Number(state.player.facingY),
      health: Number(state.player.health),
      mode: normalizeMode(state.player.mode),
      modeTick: Number(state.player.modeTick),
    },
    enemies,
    completedObjectiveIds,
    ...(state.objectiveProgress === undefined
      ? {}
      : {
          objectiveProgress: Object.fromEntries(
            Object.entries(state.objectiveProgress)
              .map(([id, value]) => [id, Number(value)] as const)
              .sort(([left], [right]) => left.localeCompare(right)),
          ),
        }),
    ...(state.completedInteractionTargetIds === undefined
      ? {}
      : { completedInteractionTargetIds: [...state.completedInteractionTargetIds].map(String).sort() }),
    stats: statsSnapshot(state.stats),
    result,
  };
}

function legacyScheduledInput(tick: number): ActionInput {
  let moveX: ActionInput["moveX"] = 0;
  let moveY: ActionInput["moveY"] = 0;
  let aimX: ActionInput["aimX"] = -1;
  let aimY: ActionInput["aimY"] = 1;
  if (tick < 150) {
    moveX = -1;
    moveY = 1;
  } else if (tick < 240) {
    moveX = 1;
    moveY = -1;
    aimX = 1;
    aimY = -1;
  } else if (tick < 330) {
    moveX = -1;
    moveY = -1;
    aimX = -1;
    aimY = -1;
  }
  let buttons = 0;
  if (tick % 72 === 18) buttons = ACTION_BUTTON.heavy;
  else if (tick % 18 === 6) buttons = ACTION_BUTTON.light;
  else if (tick % 96 === 40) buttons = ACTION_BUTTON.parry;
  else if (tick % 120 === 75) buttons = ACTION_BUTTON.dodge;
  return { moveX, moveY, aimX, aimY, buttons };
}

function semanticInput(spec: ActionEncounterSpec, state: ActionSimulationState): ActionInput | null {
  const objective = spec.objectives[state.activeObjectiveIndex];
  const completion = objective?.semanticCompletion;
  if (!completion) return null;
  const completedTargets = new Set(state.completedInteractionTargetIds ?? []);
  const target = completion.kind === "interact_count"
    ? completion.targets.find((candidate) => !completedTargets.has(candidate.id))
    : completion.target;
  if (!target) return { moveX: 0, moveY: 0, aimX: 0, aimY: 0, buttons: 0 };
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const within = dx * dx + dy * dy <= target.radius * target.radius;
  const moveX = within ? 0 : Math.sign(dx) as ActionInput["moveX"];
  const moveY = within ? 0 : Math.sign(dy) as ActionInput["moveY"];
  if (!within) return { moveX, moveY, aimX: moveX, aimY: moveY, buttons: 0 };
  if (completion.kind === "hold_ticks") {
    return { moveX: 0, moveY: 0, aimX: 0, aimY: 0, buttons: ACTION_BUTTON.interact };
  }
  const pressed = (state.previousButtons & ACTION_BUTTON.interact) !== 0;
  return { moveX: 0, moveY: 0, aimX: 0, aimY: 0, buttons: pressed ? 0 : ACTION_BUTTON.interact };
}

function scheduledInput(spec: ActionEncounterSpec, state: ActionSimulationState): ActionInput {
  return semanticInput(spec, state) ?? legacyScheduledInput(state.tick);
}

function compress(frames: ActionInput[]) {
  const runs: Array<{ ticks: number; input: ActionInput }> = [];
  for (const input of frames) {
    const previous = runs[runs.length - 1];
    if (
      previous
      && previous.input.moveX === input.moveX
      && previous.input.moveY === input.moveY
      && previous.input.aimX === input.aimX
      && previous.input.aimY === input.aimY
      && previous.input.buttons === input.buttons
    ) previous.ticks += 1;
    else runs.push({ ticks: 1, input });
  }
  return runs;
}

describe("Unity cross-language action vector", () => {
  it("exports one exact Arc terminal state from the pinned action source", () => {
    const nativePath = required(nativeSpecPath, "AXM_UNITY_NATIVE_SPEC");
    const projectedPath = required(projectionPath, "AXM_UNITY_PROJECTION");
    const vectorPath = required(outputPath, "AXM_UNITY_VECTOR_OUT");
    const spec = JSON.parse(readFileSync(nativePath, "utf8")) as ActionEncounterSpec;
    const projection = JSON.parse(readFileSync(projectedPath, "utf8"));
    const seed = 0x51a7;
    let state = initialActionState(spec, seed);
    const frames: ActionInput[] = [];
    while (!state.result && state.tick < spec.maxTicks) {
      const input = scheduledInput(spec, state);
      frames.push(input);
      state = stepActionSimulation(spec, state, input);
    }
    expect(state.result).toBeTruthy();
    const vector = {
      format: "axm-action-cross-language-vector/1",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      sourceSpecDigest: spec.specDigest,
      sourceArcDigest: spec.arcDigest,
      seed,
      projection,
      trace: compress(frames),
      expected: snapshot(state),
    };
    mkdirSync(dirname(vectorPath), { recursive: true });
    writeFileSync(vectorPath, JSON.stringify(vector, null, 2) + "\n");
    expect(vector.trace.reduce((total, run) => total + run.ticks, 0)).toBe(state.tick);
  });
});
