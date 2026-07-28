#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  console.error("usage: node project-action-spec.mjs <axm-action-spec.json> <unity-projection.json>");
  process.exit(2);
}
const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const errors = [];
const enemyOrder = ["skirmisher", "duelist", "swarm", "hexer", "breaker"];
const playerOrder = ["light", "heavy"];

function integer(value, label, minimum, maximum) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) errors.push(`${label} must be an integer in [${minimum}, ${maximum}].`);
  return value;
}
function text(value, label) {
  if (typeof value !== "string" || value.length === 0) errors.push(`${label} must be a non-empty string.`);
  return value;
}
function exactKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${label} contains unknown field ${key}.`);
}
function target(value, label) {
  exactKeys(value, ["id", "x", "y", "radius"], label);
  text(value?.id, `${label}.id`);
  integer(value?.x, `${label}.x`, -20_000, 20_000);
  integer(value?.y, `${label}.y`, -20_000, 20_000);
  integer(value?.radius, `${label}.radius`, 300, 3000);
}
function semanticCompletion(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object.`);
    return;
  }
  if (value.kind === "interact_count") {
    exactKeys(value, ["kind", "targetCount", "targets"], label);
    integer(value.targetCount, `${label}.targetCount`, 1, 16);
    if (!Array.isArray(value.targets) || value.targets.length !== value.targetCount) {
      errors.push(`${label}.targets must contain exactly targetCount entries.`);
    }
    const ids = new Set();
    for (const [index, entry] of (value.targets ?? []).entries()) {
      target(entry, `${label}.targets.${index}`);
      if (ids.has(entry?.id)) errors.push(`${label}.targets contains duplicate id ${entry?.id}.`);
      ids.add(entry?.id);
    }
    return;
  }
  if (value.kind === "hold_ticks") {
    exactKeys(value, ["kind", "targetTicks", "target"], label);
    integer(value.targetTicks, `${label}.targetTicks`, 1, 18_000);
    target(value.target, `${label}.target`);
    return;
  }
  errors.push(`${label}.kind is unsupported.`);
}

exactKeys(source, ["format", "runtimeVersion", "arcDigest", "challengeId", "title", "difficultyModeId", "tickRate", "maxTicks", "arena", "player", "enemyLaws", "objectives", "completion", "specDigest"], "action spec");
if (source.format !== "axm-action-spec/1") errors.push("Source is not axm-action-spec/1.");
if (!["1.0.0", "1.1.0"].includes(source.runtimeVersion)) errors.push("Source action runtime version is unsupported.");
if (source.tickRate !== 30) errors.push("Source action tick rate is not 30 Hz.");
text(source.arcDigest, "arcDigest");
text(source.specDigest, "specDigest");
text(source.challengeId, "challengeId");
text(source.title, "title");
integer(source.maxTicks, "maxTicks", 1, 18000);

exactKeys(source.arena, ["kit", "radius"], "arena");
if (!source.arena || !["ring", "lane", "islands"].includes(source.arena.kit)) errors.push("Unknown arena kit.");
integer(source.arena?.radius, "arena.radius", 1000, 20000);

exactKeys(source.player, ["kit", "maxHealth", "radius", "movePerTick", "dodgePerTick", "dodgeTicks", "dodgeInvulnerableTicks", "parryTicks", "parryActiveTicks", "parryRecoveryTicks", "staggerTicks", "attacks"], "player");
if (!source.player || !["staff", "blade", "hammer"].includes(source.player.kit)) errors.push("Unknown player kit.");
for (const field of ["maxHealth", "radius", "movePerTick", "dodgePerTick", "dodgeTicks", "dodgeInvulnerableTicks", "parryTicks", "parryActiveTicks", "parryRecoveryTicks", "staggerTicks"]) integer(source.player?.[field], `player.${field}`, 1, 100000);
if (!Array.isArray(source.player?.attacks) || source.player.attacks.length !== 2) errors.push("Player must carry exactly two attack laws.");
const attacks = playerOrder.map((id) => source.player?.attacks?.find((attack) => attack.id === id));
for (const [index, attack] of attacks.entries()) {
  const id = playerOrder[index];
  exactKeys(attack, ["id", "startupTicks", "activeTicks", "recoveryTicks", "damage", "range", "coneNumerator", "coneDenominator", "knockback"], `attack ${id}`);
  if (!attack || attack.id !== id) errors.push(`Player attack ${id} is absent.`);
  for (const field of ["startupTicks", "activeTicks", "recoveryTicks", "damage", "range", "coneNumerator", "coneDenominator", "knockback"]) integer(attack?.[field], `${id}.${field}`, field === "coneNumerator" || field === "startupTicks" || field === "recoveryTicks" ? 0 : 1, 100000);
}

exactKeys(source.enemyLaws, enemyOrder, "enemyLaws");
const enemyLaws = enemyOrder.map((kit) => {
  const law = source.enemyLaws?.[kit];
  exactKeys(law, ["kit", "maxHealth", "radius", "movePerTick", "attackRange", "attackDamage", "telegraphTicks", "activeTicks", "recoveryTicks", "staggerTicks"], `enemy ${kit}`);
  if (!law || law.kit !== kit) errors.push(`Enemy law ${kit} is absent or misidentified.`);
  for (const field of ["maxHealth", "radius", "movePerTick", "attackRange", "attackDamage", "telegraphTicks", "activeTicks", "recoveryTicks", "staggerTicks"]) integer(law?.[field], `${kit}.${field}`, field === "recoveryTicks" ? 0 : 1, 100000);
  return law;
});

if (!Array.isArray(source.objectives) || source.objectives.length === 0) errors.push("Action spec has no objectives.");
const objectiveIds = new Set();
let semanticObjectiveCount = 0;
for (const objective of source.objectives ?? []) {
  exactKeys(objective, ["id", "label", "brief", "enemyKit", "enemyCount", "targetDefeats", "failureKind", "severity", "semanticCompletion"], `objective ${objective?.id ?? "unknown"}`);
  text(objective.id, "objective.id");
  if (objectiveIds.has(objective.id)) errors.push(`Duplicate objective id ${objective.id}.`);
  objectiveIds.add(objective.id);
  if (!enemyOrder.includes(objective.enemyKit)) errors.push(`Objective ${objective.id} uses unknown enemy kit.`);
  const semantic = objective.semanticCompletion !== undefined;
  integer(objective.enemyCount, `${objective.id}.enemyCount`, semantic ? 0 : 1, 12);
  integer(objective.targetDefeats, `${objective.id}.targetDefeats`, semantic ? 0 : 1, objective.enemyCount);
  if (typeof objective.severity !== "number" || !Number.isFinite(objective.severity) || objective.severity < 0 || objective.severity > 1) errors.push(`Objective ${objective.id} severity is invalid.`);
  if (semantic) {
    semanticObjectiveCount += 1;
    semanticCompletion(objective.semanticCompletion, `${objective.id}.semanticCompletion`);
  }
}
if (source.runtimeVersion === "1.0.0" && semanticObjectiveCount > 0) errors.push("Runtime 1.0 cannot carry semantic objective completion law.");
if (source.runtimeVersion === "1.1.0" && semanticObjectiveCount === 0) errors.push("Runtime 1.1 requires at least one semantic objective.");

exactKeys(source.completion, source.completion?.kind === "survive" ? ["kind", "partialObjectiveCount"] : ["kind", "successObjectiveCount", "partialObjectiveCount"], "completion");
if (!source.completion || !["clear", "survive"].includes(source.completion.kind)) errors.push("Unknown completion law.");
integer(source.completion?.partialObjectiveCount, "completion.partialObjectiveCount", 0, source.objectives?.length ?? 0);
if (source.completion?.kind === "clear") integer(source.completion.successObjectiveCount, "completion.successObjectiveCount", 1, source.objectives.length);

if (errors.length) {
  console.error(JSON.stringify({ format: "rodoh-unity-action-projection/1", status: "fail", source: sourcePath, errors }, null, 2));
  process.exit(1);
}

const projection = {
  format: "rodoh-unity-action-spec/1",
  sourceFormat: source.format,
  sourceSpecDigest: source.specDigest,
  sourceArcDigest: source.arcDigest,
  runtimeVersion: source.runtimeVersion,
  challengeId: source.challengeId,
  title: source.title,
  difficultyModeId: source.difficultyModeId ?? null,
  tickRate: source.tickRate,
  maxTicks: source.maxTicks,
  arena: source.arena,
  player: { ...source.player, attacks },
  enemyLaws,
  objectives: source.objectives,
  completion: source.completion,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(projection, null, 2) + "\n");
console.log(JSON.stringify({
  format: "rodoh-unity-action-projection/1",
  status: "pass",
  source: sourcePath,
  output: outputPath,
  sourceSpecDigest: source.specDigest,
  challengeId: source.challengeId,
  runtimeVersion: source.runtimeVersion,
  objectives: source.objectives.length,
  semanticObjectives: semanticObjectiveCount,
  maximumActiveEnemies: Math.max(...source.objectives.map((objective) => objective.enemyCount)),
}, null, 2));
