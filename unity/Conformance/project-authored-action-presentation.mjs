#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [specArg, templateArg, outputArg, profileArg] = process.argv.slice(2);
if (!specArg || !templateArg || !outputArg || !profileArg) {
  console.error("usage: node project-authored-action-presentation.mjs <axm-action-spec.json> <authored-template.json> <output.presentation.json> <player-product-profile.json>");
  process.exit(2);
}

const specPath = resolve(specArg);
const templatePath = resolve(templateArg);
const outputPath = resolve(outputArg);
const profilePath = resolve(profileArg);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const template = JSON.parse(readFileSync(templatePath, "utf8"));
const profile = JSON.parse(readFileSync(profilePath, "utf8"));
const failures = [];
const enemyKits = ["skirmisher", "duelist", "swarm", "hexer", "breaker"];

function token(value) {
  return String(value ?? "action")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "action";
}
function assetPath(value, label) {
  const normalized = String(value ?? "").replaceAll("\\", "/");
  if (!normalized.startsWith("Assets/")) failures.push(`${label} must remain under Assets/.`);
  return normalized;
}
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (spec.format !== "axm-action-spec/1") failures.push("Source is not axm-action-spec/1.");
if (!/^actspec1_[0-9a-f]{64}$/.test(spec.specDigest ?? "")) failures.push("Source action spec digest is malformed.");
if (spec.challengeId !== profile.challengeId) failures.push("Source challenge differs from the player-product profile.");
if ((spec.timingProfileId ?? null) !== profile.timingProfileId) failures.push("Source timing profile differs from the player-product profile.");
if (profile.format !== "rodoh-action-player-product-profile/1") failures.push("Player-product profile format is unsupported.");
if (template.format !== "rodoh-action-presentation-manifest/1") failures.push("Authored presentation template format is unsupported.");
if (!template.player || !Array.isArray(template.enemies) || template.enemies.length !== 5) failures.push("Authored template lacks the complete actor vocabulary.");
if (!template.arena) failures.push("Authored template lacks an arena.");
if (template.themeId !== profile.themeId) failures.push("Authored template theme differs from the player-product profile.");
if (template.player?.neutralFallback !== false) failures.push("Authored player primitive fallback remains enabled.");
assetPath(template.player?.bodyPrefab, "Authored player body");

const seen = new Set();
for (const enemy of template.enemies ?? []) {
  if (!enemyKits.includes(enemy?.kit)) failures.push(`Unknown authored enemy kit: ${String(enemy?.kit)}.`);
  else if (seen.has(enemy.kit)) failures.push(`Duplicate authored enemy kit: ${enemy.kit}.`);
  else seen.add(enemy.kit);
  if (enemy?.neutralFallback !== false) failures.push(`Authored enemy primitive fallback remains enabled: ${String(enemy?.kit)}.`);
  assetPath(enemy?.bodyPrefab, `Authored enemy body ${String(enemy?.kit)}`);
}
for (const kit of enemyKits) if (!seen.has(kit)) failures.push(`Authored enemy kit is absent: ${kit}.`);
if (template.arena?.neutralFallback !== false) failures.push("Authored arena primitive fallback remains enabled.");
assetPath(template.arena?.recipe, "Authored arena recipe");
if (template.provenance?.remoteRuntimeReferencesAllowed !== false) failures.push("Authored presentation permits remote runtime assets.");
if (!Array.isArray(template.provenance?.assetRoots) || template.provenance.assetRoots.length === 0) failures.push("Authored presentation asset roots are absent.");
for (const root of template.provenance?.assetRoots ?? []) assetPath(root, "Authored presentation asset root");

const forbiddenRoots = (profile.forbiddenAssetRoots ?? []).map((value) => String(value).replaceAll("\\", "/").replace(/\/$/, ""));
for (const value of [
  template.player?.bodyPrefab,
  template.arena?.recipe,
  ...(template.enemies ?? []).map((enemy) => enemy?.bodyPrefab),
  ...(template.provenance?.assetRoots ?? []),
].map((entry) => String(entry ?? "").replaceAll("\\", "/"))) {
  for (const forbidden of forbiddenRoots) if (value === forbidden || value.startsWith(`${forbidden}/`)) failures.push(`Authored presentation uses forbidden generated asset root: ${value}.`);
}

if (failures.length) {
  console.error(JSON.stringify({ format: "rodoh-authored-action-presentation-projection/1", status: "fail", failures }, null, 2));
  process.exit(1);
}

const presentation = structuredClone(template);
presentation.manifestId = `${token(template.manifestId || profile.productId)}-${token(spec.timingProfileId ?? "default")}`;
presentation.sourceActionSpecDigest = spec.specDigest;
presentation.arena.kit = spec.arena.kit;
presentation.themeId = profile.themeId;
const json = `${JSON.stringify(presentation, null, 2)}\n`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, json);
console.log(JSON.stringify({
  format: "rodoh-authored-action-presentation-projection/1",
  status: "pass",
  sourceSpecDigest: spec.specDigest,
  arcDigest: spec.arcDigest,
  challengeId: spec.challengeId,
  timingProfileId: spec.timingProfileId,
  manifestId: presentation.manifestId,
  themeId: presentation.themeId,
  output: outputPath,
  sha256: sha256(json),
  primitiveFallback: false,
  remoteRuntimeReferences: false,
}, null, 2));
