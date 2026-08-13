import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { initialActionState, stepActionSimulation } from "../../src/engine/action/simulation.js";
import type { ActionInput, ActionSimulationState } from "../../src/engine/action/types.js";

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
        })),
        playerHealth: Number(state.result.playerHealth),
        playerDefeated: Boolean(state.result.playerDefeated),
        totalTicks: Number(state.result.totalTicks),
        stats: {
          hitsLanded: Number(state.result.stats.hitsLanded),
          heavyHits: Number(state.result.stats.heavyHits),
          damageTaken: Number(state.result.stats.damageTaken),
          parries: Number(state.result.stats.parries),
          dodgedAttacks: Number(state.result.stats.dodgedAttacks),
          enemiesDefeated: Number(state.result.stats.enemiesDefeated),
        },
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
    stats: {
      hitsLanded: Number(state.stats.hitsLanded),
      heavyHits: Number(state.stats.heavyHits),
      damageTaken: Number(state.stats.damageTaken),
      parries: Number(state.stats.parries),
      dodgedAttacks: Number(state.stats.dodgedAttacks),
      enemiesDefeated: Number(state.stats.enemiesDefeated),
    },
    result,
  };
}

function scheduledInput(tick: number): ActionInput {
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
  if (tick % 72 === 18) buttons = 2;
  else if (tick % 18 === 6) buttons = 1;
  else if (tick % 96 === 40) buttons = 8;
  else if (tick % 120 === 75) buttons = 4;
  return { moveX, moveY, aimX, aimY, buttons };
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
    const spec = JSON.parse(readFileSync(nativePath, "utf8"));
    const projection = JSON.parse(readFileSync(projectedPath, "utf8"));
    const seed = 0x51a7;
    let state = initialActionState(spec, seed);
    const frames: ActionInput[] = [];
    while (!state.result && state.tick < spec.maxTicks) {
      const input = scheduledInput(state.tick);
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
