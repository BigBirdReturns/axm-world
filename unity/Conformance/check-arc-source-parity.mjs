#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [arcRootArg, fixtureArg, outputArg] = process.argv.slice(2);
if (!arcRootArg || !fixtureArg || !outputArg) {
  console.error("usage: node check-arc-source-parity.mjs <arc-root> <unity-fixture> <receipt>");
  process.exit(2);
}
const arcRoot = resolve(arcRootArg);
const fixturePath = resolve(fixtureArg);
const outputPath = resolve(outputArg);
const typesPath = resolve(arcRoot, "src/engine/action/types.ts");
const compilePath = resolve(arcRoot, "src/engine/action/compile.ts");
const simulationPath = resolve(arcRoot, "src/engine/action/simulation.ts");
const types = readFileSync(typesPath, "utf8");
const compile = readFileSync(compilePath, "utf8");
const simulation = readFileSync(simulationPath, "utf8");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const failures = [];

function requireText(text, fragment, label) {
  if (!text.includes(fragment)) failures.push(`${label} is absent from the pinned Arc source: ${fragment}`);
}
function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

requireText(types, 'ACTION_PROFILE_FORMAT = "axm-action-profile/1"', "profile format");
requireText(types, 'ACTION_SPEC_FORMAT = "axm-action-spec/1"', "spec format");
requireText(types, 'ACTION_RECEIPT_FORMAT = "axm-action-receipt/1"', "receipt format");
requireText(types, 'ACTION_RUNTIME_VERSION = "1.0.0"', "runtime version");
requireText(types, "ACTION_TICK_RATE = 30", "tick rate");
for (const kit of ["ring", "lane", "islands", "staff", "blade", "hammer", "skirmisher", "duelist", "swarm", "hexer", "breaker"]) {
  requireText(types, `"${kit}"`, `kit ${kit}`);
}
requireText(simulation, "const DIRECTIONS", "integer direction table");
requireText(simulation, "Math.trunc", "integer transition arithmetic");
requireText(simulation, "ACTION_BUTTON_MASK", "bounded input mask");

const expectedPlayer = {
  staff: {
    maxHealth: 12, radius: 360, movePerTick: 180, dodgePerTick: 480,
    dodgeTicks: 10, dodgeInvulnerableTicks: 6, parryTicks: 5,
    parryActiveTicks: 3, parryRecoveryTicks: 7, staggerTicks: 12,
  },
};
const expectedEnemies = {
  skirmisher: { maxHealth: 3, radius: 300, movePerTick: 115, attackRange: 900, attackDamage: 1, telegraphTicks: 18, activeTicks: 2, recoveryTicks: 16, staggerTicks: 20 },
  duelist: { maxHealth: 5, radius: 320, movePerTick: 125, attackRange: 980, attackDamage: 2, telegraphTicks: 14, activeTicks: 2, recoveryTicks: 18, staggerTicks: 24 },
  swarm: { maxHealth: 2, radius: 270, movePerTick: 145, attackRange: 760, attackDamage: 1, telegraphTicks: 20, activeTicks: 2, recoveryTicks: 20, staggerTicks: 16 },
  hexer: { maxHealth: 4, radius: 300, movePerTick: 85, attackRange: 2600, attackDamage: 1, telegraphTicks: 28, activeTicks: 2, recoveryTicks: 24, staggerTicks: 22 },
  breaker: { maxHealth: 9, radius: 430, movePerTick: 80, attackRange: 1150, attackDamage: 3, telegraphTicks: 32, activeTicks: 3, recoveryTicks: 28, staggerTicks: 30 },
};

for (const [kit, law] of Object.entries(expectedPlayer)) {
  if (fixture.player.kit !== kit) continue;
  for (const [field, value] of Object.entries(law)) {
    if (fixture.player[field] !== value) failures.push(`Unity fixture ${kit}.${field}=${fixture.player[field]} but pinned Arc law is ${value}.`);
    requireText(compile, `${field}: ${value}`, `${kit}.${field}`);
  }
}
for (const [kit, expected] of Object.entries(expectedEnemies)) {
  const actual = fixture.enemyLaws.find((law) => law.kit === kit);
  if (!actual) {
    failures.push(`Unity fixture lacks enemy law ${kit}.`);
    continue;
  }
  requireText(compile, `${kit}: { kit: "${kit}"`, `Arc enemy law ${kit}`);
  for (const [field, value] of Object.entries(expected)) {
    if (actual[field] !== value) failures.push(`Unity fixture ${kit}.${field}=${actual[field]} but pinned Arc law is ${value}.`);
    requireText(compile, `${field}: ${value}`, `${kit}.${field}`);
  }
}
if (fixture.format !== "rodoh-unity-action-spec/1") failures.push("Unity fixture uses an unknown projection format.");
if (fixture.sourceFormat !== "axm-action-spec/1") failures.push("Unity fixture does not cite axm-action-spec/1.");
if (fixture.runtimeVersion !== "1.0.0") failures.push("Unity fixture runtime version differs from Arc action v1.");
if (fixture.tickRate !== 30) failures.push("Unity fixture tick rate differs from Arc action v1.");
if (Math.max(...fixture.objectives.map((objective) => objective.enemyCount)) > 12) failures.push("Unity fixture exceeds Arc's twelve-enemy ceiling.");

const receipt = {
  format: "rodoh-unity-arc-source-parity/1",
  status: failures.length === 0 ? "pass" : "fail",
  arcActionAuthorityCommit: process.env.ARC_ACTION_AUTHORITY_SHA ?? "unknown",
  files: {
    "src/engine/action/types.ts": sha256(types),
    "src/engine/action/compile.ts": sha256(compile),
    "src/engine/action/simulation.ts": sha256(simulation),
  },
  projection: fixture.format,
  sourceSpecFormat: fixture.sourceFormat,
  runtimeVersion: fixture.runtimeVersion,
  tickRate: fixture.tickRate,
  failures,
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify(receipt, null, 2));
if (failures.length) process.exit(1);
