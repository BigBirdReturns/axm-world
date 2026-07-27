import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as simulation from "../../src/engine/action/simulation.js";

const nativeSpecPath = process.env.AXM_UNITY_NATIVE_SPEC;
const projectionPath = process.env.AXM_UNITY_PROJECTION;
const outputPath = process.env.AXM_UNITY_VECTOR_OUT;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}.`);
  return resolve(value);
}

function functionExport(names: string[]): (...args: any[]) => any {
  for (const name of names) {
    const candidate = (simulation as Record<string, unknown>)[name];
    if (typeof candidate === "function") return candidate as (...args: any[]) => any;
  }
  throw new Error(`Action simulation export not found. Tried ${names.join(", ")}. Available: ${Object.keys(simulation).sort().join(", ")}`);
}

function normalizeMode(value: unknown): string {
  return String(value ?? "").replace(/_/g, "-").toLowerCase();
}

function snapshot(state: any) {
  const enemies = [...(state.enemies ?? [])]
    .map((enemy: any) => ({
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
    .sort((left: any, right: any) => left.id.localeCompare(right.id));
  const completedObjectiveIds = [...(state.completedObjectiveIds ?? [])].map(String).sort();
  const result = state.result
    ? {
        outcome: String(state.result.outcome),
        completedObjectiveIds: [...(state.result.completedObjectiveIds ?? [])].map(String).sort(),
        objectives: [...(state.result.objectives ?? [])].map((objective: any) => ({
          id: String(objective.id),
          defeated: Number(objective.defeated),
          target: Number(objective.target),
          completed: Boolean(objective.completed),
        })),
        playerHealth: Number(state.result.playerHealth),
        playerDefeated: Boolean(state.result.playerDefeated),
        totalTicks: Number(state.result.totalTicks),
        stats: {
          hitsLanded: Number(state.result.stats?.hitsLanded ?? 0),
          heavyHits: Number(state.result.stats?.heavyHits ?? 0),
          damageTaken: Number(state.result.stats?.damageTaken ?? 0),
          parries: Number(state.result.stats?.parries ?? 0),
          dodgedAttacks: Number(state.result.stats?.dodgedAttacks ?? 0),
          enemiesDefeated: Number(state.result.stats?.enemiesDefeated ?? 0),
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
      hitsLanded: Number(state.stats?.hitsLanded ?? 0),
      heavyHits: Number(state.stats?.heavyHits ?? 0),
      damageTaken: Number(state.stats?.damageTaken ?? 0),
      parries: Number(state.stats?.parries ?? 0),
      dodgedAttacks: Number(state.stats?.dodgedAttacks ?? 0),
      enemiesDefeated: Number(state.stats?.enemiesDefeated ?? 0),
    },
    result,
  };
}

function scheduledInput(tick: number) {
  let moveX = 0;
  let moveY = 0;
  let aimX = -1;
  let aimY = 1;
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

function compress(frames: any[]) {
  const runs: Array<{ ticks: number; input: any }> = [];
  for (const input of frames) {
    const previous = runs[runs.length - 1];
    if (previous && JSON.stringify(previous.input) === JSON.stringify(input)) previous.ticks += 1;
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
    const initialize = functionExport(["initialActionState", "createInitialActionState", "initializeActionState"]);
    const advance = functionExport(["stepAction", "stepActionState", "advanceActionState", "runActionTick"]);
    const seed = 0x51a7;
    let state = initialize(spec, seed);
    const frames: any[] = [];
    while (!state.result && state.tick < spec.maxTicks) {
      const input = scheduledInput(state.tick);
      frames.push(input);
      const next = advance(spec, state, input);
      if (next !== undefined) state = next;
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
