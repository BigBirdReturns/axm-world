import { describe, expect, it } from "vitest";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as simulation from "../../src/engine/action/simulation.js";

const nativeSpecPath = process.env.AXM_UNITY_NATIVE_SPEC;
const projectionPath = process.env.AXM_UNITY_PROJECTION;
const outputPath = process.env.AXM_UNITY_VECTOR_MATRIX_OUT;
const enemyKits = ["skirmisher", "duelist", "swarm", "hexer", "breaker"] as const;

type InputFrame = { moveX: number; moveY: number; aimX: number; aimY: number; buttons: number };

type Policy = (spec: any, state: any) => InputFrame;

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

function mode(value: unknown): string {
  return String(value ?? "").replace(/_/g, "-").toLowerCase();
}

function stats(value: any) {
  return {
    hitsLanded: Number(value?.hitsLanded ?? 0),
    heavyHits: Number(value?.heavyHits ?? 0),
    damageTaken: Number(value?.damageTaken ?? 0),
    parries: Number(value?.parries ?? 0),
    dodgedAttacks: Number(value?.dodgedAttacks ?? 0),
    enemiesDefeated: Number(value?.enemiesDefeated ?? 0),
  };
}

function snapshot(state: any) {
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
      mode: mode(state.player.mode),
      modeTick: Number(state.player.modeTick),
    },
    enemies: [...(state.enemies ?? [])]
      .map((enemy: any) => ({
        id: String(enemy.id),
        objectiveId: String(enemy.objectiveId),
        kit: String(enemy.kit),
        x: Number(enemy.x),
        y: Number(enemy.y),
        health: Number(enemy.health),
        mode: mode(enemy.mode),
        modeTick: Number(enemy.modeTick),
        attackResolved: Boolean(enemy.attackResolved),
      }))
      .sort((left: any, right: any) => left.id.localeCompare(right.id)),
    completedObjectiveIds: [...(state.completedObjectiveIds ?? [])].map(String).sort(),
    stats: stats(state.stats),
    result: state.result
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
          stats: stats(state.result.stats),
        }
      : null,
  };
}

function compress(frames: InputFrame[]) {
  const runs: Array<{ ticks: number; input: InputFrame }> = [];
  for (const input of frames) {
    const previous = runs[runs.length - 1];
    if (previous && previous.input.moveX === input.moveX && previous.input.moveY === input.moveY && previous.input.aimX === input.aimX && previous.input.aimY === input.aimY && previous.input.buttons === input.buttons) previous.ticks += 1;
    else runs.push({ ticks: 1, input });
  }
  return runs;
}

function nearest(state: any) {
  let target: any = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const enemy of state.enemies ?? []) {
    if (mode(enemy.mode) === "defeated") continue;
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const candidate = dx * dx + dy * dy;
    if (candidate < distance) {
      target = enemy;
      distance = candidate;
    }
  }
  return { target, distance };
}

function attackPolicy(attackButton: number, defenseButton: number): Policy {
  return (spec, state) => {
    const { target, distance } = nearest(state);
    if (!target) return { moveX: 0, moveY: 0, aimX: 0, aimY: 0, buttons: 0 };
    const dx = Math.sign(target.x - state.player.x);
    const dy = Math.sign(target.y - state.player.y);
    const attack = spec.player.attacks.find((value: any) => value.id === (attackButton === 2 ? "heavy" : "light"));
    const inRange = distance <= attack.range * attack.range;
    let buttons = 0;
    if (mode(state.player.mode) === "idle") {
      const law = spec.enemyLaws[target.kit];
      if (mode(target.mode) === "telegraph" && target.modeTick >= Math.max(0, law.telegraphTicks - (defenseButton === 8 ? spec.player.parryActiveTicks : spec.player.dodgeInvulnerableTicks))) buttons = defenseButton;
      else if (inRange && state.tick % (attackButton === 2 ? 8 : 5) === 0) buttons = attackButton;
    }
    return {
      moveX: inRange ? 0 : dx,
      moveY: inRange ? 0 : dy,
      aimX: dx,
      aimY: dy,
      buttons,
    };
  };
}

const idlePolicy: Policy = () => ({ moveX: 0, moveY: 0, aimX: 1, aimY: 0, buttons: 0 });

function vectorSpec(base: any, kit: string, count: number, maxTicks: number, completionKind: "clear" | "survive" = "clear") {
  const spec = structuredClone(base);
  spec.challengeId = `unity-vector-${kit}-${completionKind}`;
  spec.title = `Unity vector ${kit} ${completionKind}`;
  spec.specDigest = `actspec1_${kit.padEnd(64, "0").slice(0, 64)}`;
  spec.maxTicks = maxTicks;
  spec.objectives = [{
    id: `objective-${kit}`,
    label: `Test ${kit}`,
    brief: `Exercise the ${kit} action grammar.`,
    enemyKit: kit,
    enemyCount: count,
    targetDefeats: count,
    failureKind: kit === "breaker" ? "cascade" : "stress",
    severity: kit === "breaker" ? 0.8 : 0.45,
  }];
  spec.completion = completionKind === "survive"
    ? { kind: "survive", partialObjectiveCount: 0 }
    : { kind: "clear", successObjectiveCount: 1, partialObjectiveCount: 1 };
  return spec;
}

function projectionFor(baseProjection: any, spec: any) {
  return {
    ...structuredClone(baseProjection),
    sourceSpecDigest: spec.specDigest,
    challengeId: spec.challengeId,
    title: spec.title,
    maxTicks: spec.maxTicks,
    objectives: spec.objectives,
    completion: spec.completion,
  };
}

describe("Unity cross-language action vector matrix", () => {
  it("exports exact Arc terminal states across the bounded action grammar", () => {
    const native = JSON.parse(readFileSync(required(nativeSpecPath, "AXM_UNITY_NATIVE_SPEC"), "utf8"));
    const baseProjection = JSON.parse(readFileSync(required(projectionPath, "AXM_UNITY_PROJECTION"), "utf8"));
    const destination = required(outputPath, "AXM_UNITY_VECTOR_MATRIX_OUT");
    const initialize = functionExport(["initialActionState", "createInitialActionState", "initializeActionState"]);
    const advance = functionExport(["stepAction", "stepActionState", "advanceActionState", "runActionTick"]);
    const cases: Array<{ id: string; kit: string; count: number; maxTicks: number; completion: "clear" | "survive"; policy: Policy; seed: number }> = [
      { id: "idle-failure", kit: "skirmisher", count: 1, maxTicks: 120, completion: "clear", policy: idlePolicy, seed: 11 },
      { id: "light-parry-skirmisher", kit: "skirmisher", count: 3, maxTicks: 900, completion: "clear", policy: attackPolicy(1, 8), seed: 12 },
      { id: "heavy-dodge-duelist", kit: "duelist", count: 2, maxTicks: 1050, completion: "clear", policy: attackPolicy(2, 4), seed: 13 },
      { id: "light-dodge-swarm", kit: "swarm", count: 6, maxTicks: 1200, completion: "clear", policy: attackPolicy(1, 4), seed: 14 },
      { id: "heavy-parry-hexer", kit: "hexer", count: 2, maxTicks: 1200, completion: "clear", policy: attackPolicy(2, 8), seed: 15 },
      { id: "heavy-dodge-breaker", kit: "breaker", count: 1, maxTicks: 1200, completion: "clear", policy: attackPolicy(2, 4), seed: 16 },
      { id: "survive-timeout", kit: "skirmisher", count: 1, maxTicks: 60, completion: "survive", policy: (spec, state) => ({ moveX: state.tick % 40 < 20 ? 1 : -1, moveY: 1, aimX: 1, aimY: 0, buttons: state.tick % 30 === 10 ? 4 : 0 }), seed: 17 },
    ];
    const vectors = cases.map((entry) => {
      const spec = vectorSpec(native, entry.kit, entry.count, entry.maxTicks, entry.completion);
      let state = initialize(spec, entry.seed);
      const frames: InputFrame[] = [];
      while (!state.result && state.tick < spec.maxTicks) {
        const input = entry.policy(spec, state);
        frames.push(input);
        const next = advance(spec, state, input);
        if (next !== undefined) state = next;
      }
      expect(state.result, `${entry.id} did not reach a terminal state`).toBeTruthy();
      return {
        id: entry.id,
        seed: entry.seed,
        projection: projectionFor(baseProjection, spec),
        trace: compress(frames),
        expected: snapshot(state),
      };
    });
    const result = {
      format: "axm-action-cross-language-vector-matrix/1",
      arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
      sourceArcDigest: native.arcDigest,
      vectors,
    };
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, JSON.stringify(result, null, 2) + "\n");
    expect(vectors).toHaveLength(cases.length);
    expect(new Set(vectors.map((vector) => vector.expected.result.outcome)).size).toBeGreaterThan(1);
  });
});
