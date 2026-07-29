#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const [specArg, templateArg, outputArg] = process.argv.slice(2);
if (!specArg || !templateArg || !outputArg) {
  console.error("usage: node project-presentation-manifest.mjs <axm-action-spec.json> <template.presentation.json> <output.presentation.json>");
  process.exit(2);
}

const specPath = resolve(specArg);
const templatePath = resolve(templateArg);
const outputPath = resolve(outputArg);
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const template = JSON.parse(readFileSync(templatePath, "utf8"));
const failures = [];

function token(value) {
  return String(value ?? "action")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "action";
}

if (spec.format !== "axm-action-spec/1") failures.push("Source is not axm-action-spec/1.");
if (typeof spec.specDigest !== "string" || !/^actspec1_[0-9a-f]{64}$/.test(spec.specDigest)) failures.push("Source action spec digest is malformed.");
if (!spec.arena || !["ring", "lane", "islands"].includes(spec.arena.kit)) failures.push("Source action arena kit is absent or unknown.");
if (template.format !== "rodoh-action-presentation-manifest/1") failures.push("Presentation template format is unsupported.");
if (!template.player || !Array.isArray(template.enemies) || template.enemies.length !== 5) failures.push("Presentation template lacks the complete actor vocabulary.");
if (!Array.isArray(template.feedback) || template.feedback.length < 6) failures.push("Presentation template lacks the feedback vocabulary.");
if (!Array.isArray(template.qualityProfiles) || template.qualityProfiles.length !== 3) failures.push("Presentation template lacks low, standard, and high quality profiles.");
if (failures.length) {
  console.error(JSON.stringify({ format: "rodoh-action-presentation-projection/1", status: "fail", failures }, null, 2));
  process.exit(1);
}

const challengeToken = token(spec.challengeId);
const manifestId = `neutral-${challengeToken}-v1`;
const presentation = structuredClone(template);
presentation.$schema = "../Schemas/rodoh-action-presentation-manifest-v1.strict.schema.json";
presentation.manifestId = manifestId;
presentation.sourceActionSpecDigest = spec.specDigest;
presentation.themeId = `neutral-${challengeToken}`;
presentation.arena.kit = spec.arena.kit;
presentation.provenance.assetRoots = [`Assets/AXM/Generated/${manifestId}`];

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(presentation, null, 2) + "\n");
console.log(JSON.stringify({
  format: "rodoh-action-presentation-projection/1",
  status: "pass",
  sourceSpecDigest: spec.specDigest,
  challengeId: spec.challengeId,
  arenaKit: spec.arena.kit,
  manifestId,
  output: outputPath,
}, null, 2));
