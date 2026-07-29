#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import vm from "node:vm";

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

const root = resolve(option("--root") ?? "demos/underdrain-draft");
const htmlPath = resolve(option("--html") ?? "local/underdrain-draft/index.html");
const output = option("--output");
const expectedWorldCommit = option("--world-commit");
const expectedArcCommit = option("--arc-commit");
const expectedAuthoringSha256 = option("--authoring-sha256");
const expectedPresentationSha256 = option("--presentation-sha256");
const expectedProductionSha256 = option("--production-sha256");
let currentCheck = "arguments";

function writeReceipt(receipt) {
  const text = `${JSON.stringify(receipt, null, 2)}\n`;
  if (output) {
    mkdirSync(dirname(resolve(output)), { recursive: true });
    writeFileSync(resolve(output), text);
  }
  return text;
}
function fail(message) {
  const receipt = {
    format: "rodoh-underdrain-static-verification/4",
    status: "fail",
    check: currentCheck,
    error: message,
    worldCommit: expectedWorldCommit ?? null,
    arcCommit: expectedArcCommit ?? null,
    authoringSha256: expectedAuthoringSha256 ?? null,
    presentationSha256: expectedPresentationSha256 ?? null,
    productionSha256: expectedProductionSha256 ?? null,
    htmlPath,
    root,
  };
  writeReceipt(receipt);
  console.error(message);
  process.exit(1);
}
function repositoryPath(path, label) {
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith(`..${sep}`)) fail(`${label} escapes Underdrain custody: ${path}.`);
  if (!existsSync(absolute)) fail(`${label} is missing: ${path}.`);
  return absolute;
}

if (!expectedWorldCommit || !/^[0-9a-f]{40}$/.test(expectedWorldCommit)) fail("Expected World commit is invalid.");
if (!expectedArcCommit || !/^[0-9a-f]{40}$/.test(expectedArcCommit)) fail("Expected Arc commit is invalid.");
if (!expectedAuthoringSha256 || !/^[0-9a-f]{64}$/.test(expectedAuthoringSha256)) fail("Expected authoring SHA-256 is invalid.");
if (!expectedPresentationSha256 || !/^[0-9a-f]{64}$/.test(expectedPresentationSha256)) fail("Expected presentation SHA-256 is invalid.");
if (!expectedProductionSha256 || !/^[0-9a-f]{64}$/.test(expectedProductionSha256)) fail("Expected production SHA-256 is invalid.");

currentCheck = "load-inputs";
const manifestPath = resolve(root, "authoring.json");
const presentationPath = resolve(root, "presentation.json");
const productionPath = resolve(root, "production.json");
const html = readFileSync(htmlPath, "utf8");
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const presentationBytes = readFileSync(presentationPath);
const presentation = JSON.parse(presentationBytes.toString("utf8"));
const productionBytes = readFileSync(productionPath);
const production = JSON.parse(productionBytes.toString("utf8"));

currentCheck = "embedded-authoring";
const authoringMatch = html.match(/<script id="underdrain-authoring" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
if (!authoringMatch) fail("Embedded authoring manifest is absent.");
if (JSON.stringify(JSON.parse(authoringMatch[1] ?? "null")) !== JSON.stringify(manifest)) fail("Embedded and companion authoring differ.");

currentCheck = "embedded-presentation";
const presentationMatch = html.match(/<script id="underdrain-presentation" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
if (!presentationMatch) fail("Embedded representation role plan is absent.");
if (JSON.stringify(JSON.parse(presentationMatch[1] ?? "null")) !== JSON.stringify(presentation)) fail("Embedded and companion representation role plans differ.");

currentCheck = "embedded-production";
const productionMatch = html.match(/<script id="underdrain-production" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
if (!productionMatch) fail("Embedded representation production coverage is absent.");
if (JSON.stringify(JSON.parse(productionMatch[1] ?? "null")) !== JSON.stringify(production)) fail("Embedded and companion production coverage differ.");

currentCheck = "representation-role-plan";
if (presentation.format !== "rodoh-representation-plan/1") fail("Representation plan format is unsupported.");
if (presentation.classification !== "authored-pilot-candidate") fail("Representation plan is not bound to the authored-pilot classification.");
if (presentation.namespace !== "underdrain") fail("Representation plan does not own an Underdrain namespace.");
if (presentation.renderer?.action !== "cartridge-assets") fail("Action representation remains primitive-only.");
if (presentation.renderer?.neutralFallbackUsed !== false) fail("Underdrain still uses the neutral white-label fallback.");
if (presentation.provenance?.format !== "rodoh-original-asset-provenance/1") fail("Underdrain representation lacks original-asset provenance.");
const provenancePath = repositoryPath(presentation.provenance.path, "Representation provenance");
const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
if (provenance.format !== presentation.provenance.format) fail("Representation provenance format disagrees with the plan.");

const requiredSurfaces = ["cold-entry", "authored-commitment", "first-action", "accepted-consequence", "playable-successor", "durable-record"];
const requiredPeople = ["rhea-venn", "tess-loam", "marta-sump", "morrowcap", "mrs-kett", "dax-venn"];
const requiredObjectives = ["inspect-living-trap", "restore-kett-water", "diagnose-spore-valves", "operate-purge-wheel", "open-crown-sluice"];
const requiredStates = ["town-water-pressure", "kett-water", "fungus-contact", "crown-grievance", "rhea-status", "evidence-custody", "root-gate-open"];
if (!Array.isArray(presentation.assets) || presentation.assets.length !== 48) fail("Underdrain must retain exactly 48 declared representation roles while art is reworked.");
const roleIds = presentation.assets.map((asset) => asset.id);
const duplicateRoleIds = duplicateValues(roleIds);
if (duplicateRoleIds.length > 0) fail(`Representation plan contains duplicate role ids: ${duplicateRoleIds.join(", ")}.`);
const roleById = new Map(presentation.assets.map((asset) => [asset.id, asset]));
for (const asset of presentation.assets) {
  if (typeof asset.id !== "string" || !asset.id.startsWith("underdrain:")) fail(`Role ${String(asset.id)} escapes the Underdrain namespace.`);
  if (/(?:placeholder|generic|debug|wireframe|bare-doll|neutral)/i.test(asset.id)) fail(`Role ${asset.id} is a placeholder or neutral fallback.`);
  if (typeof asset.accessibleEquivalent !== "string" || asset.accessibleEquivalent.trim() === "") fail(`Role ${asset.id} has no nonvisual equivalent.`);
  repositoryPath(asset.sourcePath, `Role ${asset.id} source`);
}
function requireRole(roleId, label) {
  if (!roleById.has(roleId)) fail(`${label} references missing representation role ${String(roleId)}.`);
}
requireRole(presentation.bindings?.identityAssetId, "Cartridge identity");
const peopleById = new Map((presentation.bindings?.people ?? []).map((binding) => [binding.personId, binding]));
for (const personId of requiredPeople) {
  const binding = peopleById.get(personId);
  if (!binding) fail(`Required person ${personId} lacks portrait/body representation.`);
  requireRole(binding.portraitAssetId, `Person ${personId} portrait`);
  requireRole(binding.bodyAssetId, `Person ${personId} body`);
}
const objectiveById = new Map((presentation.bindings?.objectives ?? []).map((binding) => [binding.objectiveId, binding]));
for (const objectiveId of requiredObjectives) {
  const binding = objectiveById.get(objectiveId);
  if (!binding) fail(`Required objective ${objectiveId} lacks mechanism-state representation.`);
  requireRole(binding.idleAssetId, `Objective ${objectiveId} idle state`);
  requireRole(binding.activeAssetId, `Objective ${objectiveId} active state`);
  requireRole(binding.completeAssetId, `Objective ${objectiveId} completed state`);
}
const stateById = new Map((presentation.bindings?.states ?? []).map((binding) => [binding.stateId, binding]));
for (const stateId of requiredStates) {
  const binding = stateById.get(stateId);
  if (!binding) fail(`Required persistent state ${stateId} lacks a visible mark.`);
  requireRole(binding.assetId, `Persistent state ${stateId}`);
}
const surfaceById = new Map((presentation.surfaces ?? []).map((surface) => [surface.id, surface]));
for (const surfaceId of requiredSurfaces) {
  const surface = surfaceById.get(surfaceId);
  if (!surface) fail(`Required player surface ${surfaceId} lacks representation.`);
  if (!surface.desktop || !surface.mobile) fail(`Player surface ${surfaceId} lacks desktop/mobile parity.`);
  if (!Array.isArray(surface.assetIds) || surface.assetIds.length === 0) fail(`Player surface ${surfaceId} has no representation roles.`);
  for (const roleId of surface.assetIds) requireRole(roleId, `Player surface ${surfaceId}`);
  if (typeof surface.accessibleEquivalent !== "string" || surface.accessibleEquivalent.trim() === "") fail(`Player surface ${surfaceId} has no nonvisual equivalent.`);
}
if (!surfaceById.get("cold-entry")?.assetIds.includes(presentation.bindings.identityAssetId)) fail("Cold entry does not carry the Underdrain identity role.");

currentCheck = "representation-production-coverage";
if (production.format !== "rodoh-representation-production/1") fail("Production coverage format is unsupported.");
if (production.planId !== presentation.id) fail("Production coverage belongs to another representation plan.");
if (production.status !== "mixed") fail("Production coverage must remain mixed until all declared roles have production sources.");
if (!Array.isArray(production.productionAssetIds) || production.productionAssetIds.length !== 1 || production.productionAssetIds[0] !== "underdrain:scene-pump-seven") {
  fail("Current production coverage must contain exactly the Pump Seven scene.");
}
const productionRoleIds = new Set(production.productionAssetIds);
const prototypeRoleIds = roleIds.filter((roleId) => !productionRoleIds.has(roleId));
if (prototypeRoleIds.length !== 47) fail(`Expected 47 prototype roles, found ${prototypeRoleIds.length}.`);
if (!Array.isArray(production.sources) || production.sources.length !== 1) fail("Current production coverage must retain exactly one authored source.");
const pumpSource = production.sources[0];
if (pumpSource.id !== "underdrain-production:pump-seven-webp") fail("Pump Seven production source id is invalid.");
if (pumpSource.mediaType !== "image/webp" || pumpSource.width !== 960 || pumpSource.height !== 540) fail("Pump Seven production source metadata is invalid.");
if (!/^[0-9a-f]{64}$/.test(pumpSource.sha256 ?? "")) fail("Pump Seven production source has no exact SHA-256.");
if (JSON.stringify(pumpSource.assetIds) !== JSON.stringify(["underdrain:scene-pump-seven"])) fail("Pump Seven source binds the wrong representation roles.");
if (!Array.isArray(pumpSource.sourcePaths) || pumpSource.sourcePaths.length !== 5) fail("Pump Seven source must retain five exact chunks.");
const pumpBase64 = pumpSource.sourcePaths.map((path) => readFileSync(repositoryPath(path, "Pump Seven production chunk"), "utf8").trim()).join("");
const pumpBytes = Buffer.from(pumpBase64, "base64");
if (sha256(pumpBytes) !== pumpSource.sha256) fail("Pump Seven production source bytes do not match their receipt.");

currentCheck = "executable-syntax";
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const executable = scripts.find((entry) => !/application\/json/.test(entry[1] ?? ""))?.[2];
if (!executable) fail("Executable inline script is absent.");
try {
  new vm.Script(executable, { filename: htmlPath });
} catch (error) {
  fail(`Executable inline script does not parse: ${error instanceof Error ? error.message : String(error)}`);
}

for (const [pattern, label] of [
  [/<script[^>]+src=/i, "external script"],
  [/<link[^>]+stylesheet/i, "external stylesheet"],
  [/\bfetch\s*\(/, "fetch"],
  [/\bWebSocket\b/, "WebSocket"],
  [/\bEventSource\b/, "EventSource"],
  [/\bserviceWorker\b/, "service worker"],
  [/\bMath\.random\b/, "Math.random"],
  [/\beval\s*\(/, "eval"],
  [/\bnew Function\b/, "dynamic Function"],
]) {
  currentCheck = `forbidden-runtime:${label}`;
  if (pattern.test(html)) fail(`Standalone HTML contains forbidden ${label}.`);
}

for (const marker of [
  "const TICK_RATE=30",
  "rodoh-underdrain-session/2",
  "rodoh-underdrain-episode-record/2",
  "rodoh-one-am-structural-evidence/1",
  "rodoh-representation-runtime-evidence/3",
  "rodoh-representation-production/1",
  "rodoh-underdrain-automated-pilot-qualification/2",
  "rodoh-underdrain-window-name-storage/1",
  "rodoh-underdrain-persistence/1",
  "underdrain-white-label-art/1",
  "underdrain-white-label-v1",
  "underdrain:scene-pump-seven",
  "declaredRoleCountMeaning",
  "productionCoverageComplete:false",
  'releaseClassification:"representation-rework"',
  "commandDeckOutsideRenderedWorld",
  "closeTabRequiresExport",
  "Direct-file mode preserves reload and resume in this tab.",
  "axm-authored-experience/1",
  "axm-action-objectives/1",
  "Arc replay accepted this trace.",
  "blindPlayerReceipt",
  "root-gate-parley",
  "mrs-kett-service-call",
  "breach-crown-pump",
  "prefers-reduced-motion",
  "forced-colors",
]) {
  currentCheck = `required-marker:${marker}`;
  if (!html.includes(marker)) fail(`Standalone HTML is missing ${marker}.`);
}

currentCheck = "action-command-deck";
const stageShell = html.indexOf('<div class="stage-shell">');
const stage = html.indexOf('<div class="stage">', stageShell);
const commandDeck = html.indexOf('<section class="command-deck"', stage);
const touch = html.indexOf('<div class="touch"', commandDeck);
if (stageShell < 0 || stage < 0 || commandDeck < 0 || touch < 0 || !(stageShell < stage && stage < commandDeck && commandDeck < touch)) {
  fail("Action objective and controls are not structurally outside the rendered stage.");
}
if (!html.includes(".stage-shell>.stage") || !html.includes(".command-deck>.objective-ribbon") || !html.includes(".command-deck>.touch")) {
  fail("Standalone lacks the no-overlay command-deck layout law.");
}

currentCheck = "representation-before-boot";
const representationInstall = html.indexOf("UNDERDRAIN representation custody did not load.");
const boot = html.indexOf("const params=new URLSearchParams(location.search);");
if (representationInstall < 0 || boot < 0 || representationInstall > boot) fail("Representation custody is not installed before the game boots.");
if (html.includes('"action":"primitive-only"')) fail("Standalone declares primitive-only action representation.");
if (html.includes('"neutralFallbackUsed":true')) fail("Standalone declares a neutral white-label fallback.");

currentCheck = "authority-copy";
if (html.includes("campaign effect remained provisional")) fail("Standalone retains stale provisional consequence copy after Arc acceptance.");

currentCheck = "direct-file-persistence-law";
if (!html.includes('mode:"window-name"')) fail("Standalone does not declare the direct-file window-name persistence mode.");
if (!html.includes('durability:"current-tab"')) fail("Standalone does not declare the current-tab durability boundary.");
if (!html.includes('Object.defineProperty(globalThis,"localStorage"')) fail("Standalone does not install the direct-file storage adapter before the session runtime.");
if (!html.includes("Download the episode record before closing the tab")) fail("Standalone does not disclose the direct-file export requirement.");

currentCheck = "exact-custody";
if (/placeholder\s*:\s*(?:true|!0)/.test(html)) fail("Standalone still contains the Arc capsule placeholder.");
if (!html.includes(expectedWorldCommit)) fail("Standalone is not bound to the exact World candidate.");
if (!html.includes(expectedArcCommit)) fail("Standalone is not bound to the exact Arc authority.");
if (!html.includes(expectedAuthoringSha256)) fail("Standalone capsule is not bound to the exact authoring bytes.");
if (!html.includes(expectedPresentationSha256)) fail("Standalone is not bound to the exact representation-role bytes.");
if (!html.includes(expectedProductionSha256)) fail("Standalone is not bound to the exact production-coverage bytes.");
if (manifest.format !== "rodoh-underdrain-standalone/2") fail("Manifest format is unsupported.");
if (manifest.classification !== "authored-pilot-candidate") fail("Manifest does not use the authored-pilot candidate classification.");
if (manifest.oneAmBoundary?.independentPlayerReceiptRequired !== true) fail("Manifest does not preserve the independent player boundary.");
if (!manifest.experienceOrder?.includes("root-gate-parley")) fail("Root Gate is not an implemented experience.");

const manifestSha256 = sha256(manifestBytes);
if (manifestSha256 !== expectedAuthoringSha256) fail("World authoring bytes differ from exact Arc custody.");
const presentationSha256 = sha256(presentationBytes);
if (presentationSha256 !== expectedPresentationSha256) fail("World representation-role bytes differ from exact custody.");
const productionSha256 = sha256(productionBytes);
if (productionSha256 !== expectedProductionSha256) fail("World production-coverage bytes differ from exact custody.");
const htmlSha256 = sha256(html);
const receipt = {
  format: "rodoh-underdrain-static-verification/4",
  status: "pass",
  worldCommit: expectedWorldCommit,
  arcCommit: expectedArcCommit,
  html: {
    path: htmlPath,
    bytes: Buffer.byteLength(html),
    sha256: htmlSha256,
    singleFile: true,
    externalRuntime: false,
  },
  authoring: {
    path: manifestPath,
    sha256: manifestSha256,
    actionProfile: manifest.actionProfile.format,
    actionObjectives: manifest.actionObjectives.format,
    authoredExperiences: manifest.authoredExperiences.format,
    narrativeAuthority: manifest.narrativeAuthority,
  },
  representation: {
    path: presentationPath,
    sha256: presentationSha256,
    planId: presentation.id,
    namespace: presentation.namespace,
    declaredRoles: presentation.assets.length,
    productionRoles: production.productionAssetIds.length,
    prototypeRoles: prototypeRoleIds.length,
    productionSources: production.sources.length,
    people: presentation.bindings.people.length,
    objectives: presentation.bindings.objectives.length,
    states: presentation.bindings.states.length,
    surfaces: presentation.surfaces.length,
    actionRenderer: presentation.renderer.action,
    neutralFallbackUsed: presentation.renderer.neutralFallbackUsed,
    provenance: presentation.provenance,
  },
  production: {
    path: productionPath,
    sha256: productionSha256,
    format: production.format,
    status: production.status,
    sourceId: pumpSource.id,
    sourceSha256: pumpSource.sha256,
    mediaType: pumpSource.mediaType,
    width: pumpSource.width,
    height: pumpSource.height,
  },
  checks: {
    executableSyntax: "pass",
    networkRuntime: "absent",
    deterministicTickRate: 30,
    semanticMechanisms: "present",
    representationRolePlan: "present-before-boot",
    productionCoverageComplete: false,
    releaseClassification: "representation-rework",
    actionCommandDeck: "outside-rendered-world",
    representationDesktopMobile: "pass",
    representationAccessibility: "pass",
    safeOpening: "zero-pressure",
    acceptedArcConsequence: "required-before-world-delta",
    rootGate: "playable-but-prototype-represented",
    directFileReload: "window-name-current-tab",
    directFileCloseTab: "episode-record-export-required",
    blindPlayerReceipt: "external-and-unissued",
  },
};
process.stdout.write(writeReceipt(receipt));
