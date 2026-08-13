#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const [specArg, presentationArg, outputArg] = process.argv.slice(2);
if (!specArg || !presentationArg || !outputArg) {
  console.error("usage: node build-action-scene-job.mjs <unity-action-spec> <presentation-manifest> <output-job>");
  process.exit(2);
}
const specPath = resolve(specArg);
const presentationPath = resolve(presentationArg);
const outputPath = resolve(outputArg);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const presentation = JSON.parse(readFileSync(presentationPath, "utf8"));
const failures = [];
const enemyKits = ["skirmisher", "duelist", "swarm", "hexer", "breaker"];
const feedbackEvents = ["player_action", "enemy_hit", "player_hit", "parry", "dodge", "objective_completed", "encounter_completed"];
const qualityIds = ["low", "standard", "high"];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failures.push(`${label} must be an object.`);
    return;
  }
  for (const key of Object.keys(value)) if (!keys.includes(key)) failures.push(`${label} contains unknown field ${key}.`);
}
function localAsset(path, label, nullable = true) {
  if (path === null && nullable) return;
  if (typeof path !== "string" || !path.startsWith("Assets/") || path.includes("..") || path.includes("\\")) failures.push(`${label} must be a normalized project-local Assets/ path or null.`);
}
function finite(value, minimum, maximum, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) failures.push(`${label} must be finite in [${minimum}, ${maximum}].`);
}
function integer(value, minimum, maximum, label) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) failures.push(`${label} must be an integer in [${minimum}, ${maximum}].`);
}

if (spec.format !== "rodoh-unity-action-spec/1") failures.push("Scene job source is not rodoh-unity-action-spec/1.");
if (presentation.format !== "rodoh-action-presentation-manifest/1") failures.push("Scene job presentation uses an unknown format.");
if (presentation.sourceActionSpecDigest !== spec.sourceSpecDigest) failures.push("Presentation manifest is bound to a different action spec.");
if (presentation.arena?.kit !== spec.arena?.kit) failures.push("Presentation arena kit differs from action law.");

exactObject(presentation.player, ["actorId", "bodyPrefab", "animatorController", "motionSet", "neutralFallback", "scale"], "player presentation");
localAsset(presentation.player?.bodyPrefab, "player bodyPrefab");
localAsset(presentation.player?.animatorController, "player animatorController");
finite(presentation.player?.scale, 0.01, 10, "player scale");
if (!presentation.player?.neutralFallback && !presentation.player?.bodyPrefab) failures.push("Player has neither authored body nor neutral fallback.");

const motionFields = ["idle", "move", "light", "heavy", "dodge", "parry", "stagger", "defeat"];
exactObject(presentation.player?.motionSet, motionFields, "player motionSet");
for (const field of motionFields) localAsset(presentation.player?.motionSet?.[field], `player motion ${field}`);

const enemyByKit = new Map();
if (!Array.isArray(presentation.enemies) || presentation.enemies.length !== 5) failures.push("Presentation manifest must contain exactly five enemy kits.");
for (const enemy of presentation.enemies ?? []) {
  exactObject(enemy, ["actorId", "kit", "bodyPrefab", "animatorController", "motionSet", "neutralFallback", "scale"], `enemy presentation ${enemy?.kit ?? "unknown"}`);
  if (!enemyKits.includes(enemy?.kit)) failures.push(`Unknown enemy presentation kit ${String(enemy?.kit)}.`);
  else if (enemyByKit.has(enemy.kit)) failures.push(`Duplicate enemy presentation kit ${enemy.kit}.`);
  else enemyByKit.set(enemy.kit, enemy);
  localAsset(enemy?.bodyPrefab, `${enemy?.kit} bodyPrefab`);
  localAsset(enemy?.animatorController, `${enemy?.kit} animatorController`);
  exactObject(enemy?.motionSet, motionFields, `${enemy?.kit} motionSet`);
  for (const field of motionFields) localAsset(enemy?.motionSet?.[field], `${enemy?.kit} motion ${field}`);
  finite(enemy?.scale, 0.01, 10, `${enemy?.kit} scale`);
  if (!enemy?.neutralFallback && !enemy?.bodyPrefab) failures.push(`${enemy?.kit} has neither authored body nor neutral fallback.`);
}
for (const kit of enemyKits) if (!enemyByKit.has(kit)) failures.push(`Presentation manifest lacks ${kit}.`);

exactObject(presentation.arena, ["kit", "recipe", "neutralFallback", "metersPerActionUnit"], "arena presentation");
localAsset(presentation.arena?.recipe, "arena recipe");
finite(presentation.arena?.metersPerActionUnit, 0.00001, 0.01, "metersPerActionUnit");
if (!presentation.arena?.neutralFallback && !presentation.arena?.recipe) failures.push("Arena has neither authored recipe nor neutral fallback.");

const feedbackByEvent = new Map();
for (const cue of presentation.feedback ?? []) {
  exactObject(cue, ["event", "vfxPrefab", "audioClip", "haptic", "cameraImpulse", "hitStopMilliseconds", "neutralFallback"], `feedback ${cue?.event ?? "unknown"}`);
  if (!feedbackEvents.includes(cue?.event)) failures.push(`Unknown feedback event ${String(cue?.event)}.`);
  else if (feedbackByEvent.has(cue.event)) failures.push(`Duplicate feedback event ${cue.event}.`);
  else feedbackByEvent.set(cue.event, cue);
  localAsset(cue?.vfxPrefab, `${cue?.event} vfxPrefab`);
  localAsset(cue?.audioClip, `${cue?.event} audioClip`);
  finite(cue?.haptic, 0, 1, `${cue?.event} haptic`);
  finite(cue?.cameraImpulse, 0, 1, `${cue?.event} cameraImpulse`);
  integer(cue?.hitStopMilliseconds, 0, 100, `${cue?.event} hitStopMilliseconds`);
}
for (const event of feedbackEvents) if (!feedbackByEvent.has(event)) failures.push(`Presentation manifest lacks feedback event ${event}.`);

const qualityById = new Map();
for (const profile of presentation.qualityProfiles ?? []) {
  exactObject(profile, ["id", "renderScale", "maximumSkinnedActors", "maximumParticles", "shadowMode", "postProcessing", "targetFps"], `quality ${profile?.id ?? "unknown"}`);
  if (!qualityIds.includes(profile?.id)) failures.push(`Unknown quality profile ${String(profile?.id)}.`);
  else if (qualityById.has(profile.id)) failures.push(`Duplicate quality profile ${profile.id}.`);
  else qualityById.set(profile.id, profile);
  finite(profile?.renderScale, 0.5, 1.5, `${profile?.id} renderScale`);
  integer(profile?.maximumSkinnedActors, 1, 13, `${profile?.id} maximumSkinnedActors`);
  integer(profile?.maximumParticles, 0, 4096, `${profile?.id} maximumParticles`);
  if (!["none", "one-directional", "baked"].includes(profile?.shadowMode)) failures.push(`${profile?.id} shadowMode is unknown.`);
  if (![30, 60, 72, 90].includes(profile?.targetFps)) failures.push(`${profile?.id} targetFps is unknown.`);
}
for (const id of qualityIds) if (!qualityById.has(id)) failures.push(`Presentation manifest lacks ${id} quality.`);

exactObject(presentation.accessibility, ["telegraphScale", "reducedMotion", "highContrast", "hapticsOptional", "audioOptional", "oneHandedMappings"], "accessibility");
finite(presentation.accessibility?.telegraphScale, 1, 3, "accessibility telegraphScale");
if (presentation.accessibility?.hapticsOptional !== true || presentation.accessibility?.audioOptional !== true) failures.push("Audio and haptics must remain optional.");

exactObject(presentation.provenance, ["format", "license", "assetRoots", "remoteRuntimeReferencesAllowed"], "provenance");
if (presentation.provenance?.format !== "rodoh-action-presentation-provenance/1") failures.push("Unknown presentation provenance format.");
if (presentation.provenance?.remoteRuntimeReferencesAllowed !== false) failures.push("Remote runtime presentation references are prohibited.");
if (!Array.isArray(presentation.provenance?.assetRoots) || presentation.provenance.assetRoots.length === 0) failures.push("Presentation provenance has no asset roots.");
for (const root of presentation.provenance?.assetRoots ?? []) localAsset(root, "provenance assetRoot", false);

const maximumActiveEnemies = Math.max(...spec.objectives.map((objective) => objective.enemyCount));
for (const [id, quality] of qualityById) {
  if (quality.maximumSkinnedActors < Math.min(13, maximumActiveEnemies + 1) && id === "high") failures.push("High quality profile cannot represent the authored maximum actor count.");
}

if (failures.length) {
  const receipt = { format: "rodoh-action-scene-job-build/1", status: "fail", spec: specPath, presentation: presentationPath, failures };
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}

const job = {
  format: "rodoh-action-scene-job/1",
  jobId: `${spec.challengeId}-${presentation.manifestId}`,
  source: {
    actionProjection: specPath,
    actionSpecDigest: spec.sourceSpecDigest,
    arcDigest: spec.sourceArcDigest,
    presentationManifest: presentationPath,
    presentationManifestId: presentation.manifestId,
  },
  scene: {
    title: spec.title,
    arenaKit: spec.arena.kit,
    arenaRadius: spec.arena.radius,
    arenaRecipe: presentation.arena.recipe,
    metersPerActionUnit: presentation.arena.metersPerActionUnit,
    maximumActiveEnemies,
  },
  actors: {
    player: presentation.player,
    enemies: enemyKits.map((kit) => enemyByKit.get(kit)),
  },
  feedback: feedbackEvents.map((event) => feedbackByEvent.get(event)),
  qualityProfiles: qualityIds.map((id) => qualityById.get(id)),
  accessibility: presentation.accessibility,
  provenance: presentation.provenance,
  authority: {
    action: "Arc axm-action-spec/1 and axm-action-receipt/1",
    presentation: "Unity scene generated from cartridge-owned manifest",
    physicalEvidence: "axm-embodied observation stream",
    unityPhysicsCombatAuthority: false,
  },
};
const digest = `unityjob1_${sha256(Buffer.from(canonical(job)))}`;
const output = { ...job, jobDigest: digest };
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({
  format: "rodoh-action-scene-job-build/1",
  status: "pass",
  output: outputPath,
  jobDigest: digest,
  actionSpecDigest: spec.sourceSpecDigest,
  manifestId: presentation.manifestId,
  maximumActiveEnemies,
  lowPowerProfile: qualityById.get("low"),
}, null, 2));
