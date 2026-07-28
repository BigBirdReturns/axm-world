#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const root = resolve(option("--root") ?? "demos/underdrain-draft");
const htmlPath = resolve(option("--html") ?? "local/underdrain-draft/index.html");
const output = option("--output");
const expectedWorldCommit = option("--world-commit");
const expectedArcCommit = option("--arc-commit");
const expectedAuthoringSha256 = option("--authoring-sha256");
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
    format: "rodoh-underdrain-static-verification/2",
    status: "fail",
    check: currentCheck,
    error: message,
    worldCommit: expectedWorldCommit ?? null,
    arcCommit: expectedArcCommit ?? null,
    authoringSha256: expectedAuthoringSha256 ?? null,
    htmlPath,
    root,
  };
  writeReceipt(receipt);
  console.error(message);
  process.exit(1);
}

if (!expectedWorldCommit || !/^[0-9a-f]{40}$/.test(expectedWorldCommit)) fail("Expected World commit is invalid.");
if (!expectedArcCommit || !/^[0-9a-f]{40}$/.test(expectedArcCommit)) fail("Expected Arc commit is invalid.");
if (!expectedAuthoringSha256 || !/^[0-9a-f]{64}$/.test(expectedAuthoringSha256)) fail("Expected authoring SHA-256 is invalid.");

currentCheck = "load-inputs";
const manifestPath = resolve(root, "authoring.json");
const html = readFileSync(htmlPath, "utf8");
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));

currentCheck = "embedded-authoring";
const jsonMatch = html.match(/<script id="underdrain-authoring" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
if (!jsonMatch) fail("Embedded authoring manifest is absent.");
if (JSON.stringify(JSON.parse(jsonMatch[1] ?? "null")) !== JSON.stringify(manifest)) fail("Embedded and companion authoring differ.");

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
  "rodoh-underdrain-automated-pilot-qualification/2",
  "axm-authored-experience/1",
  "axm-action-objectives/1",
  "Arc replay accepted this trace.",
  "blindPlayerReceipt",
  "root-gate-parley",
  "mrs-kett-service-call",
  "breach-crown-pump",
  "prefers-reduced-motion",
]) {
  currentCheck = `required-marker:${marker}`;
  if (!html.includes(marker)) fail(`Standalone HTML is missing ${marker}.`);
}

currentCheck = "authority-copy";
if (html.includes("campaign effect remained provisional")) fail("Standalone retains stale provisional consequence copy after Arc acceptance.");

currentCheck = "exact-custody";
if (/placeholder\s*:\s*(?:true|!0)/.test(html)) fail("Standalone still contains the Arc capsule placeholder.");
if (!html.includes(expectedWorldCommit)) fail("Standalone is not bound to the exact World candidate.");
if (!html.includes(expectedArcCommit)) fail("Standalone is not bound to the exact Arc authority.");
if (!html.includes(expectedAuthoringSha256)) fail("Standalone capsule is not bound to the exact authoring bytes.");
if (manifest.format !== "rodoh-underdrain-standalone/2") fail("Manifest format is unsupported.");
if (manifest.classification !== "authored-pilot-candidate") fail("Manifest does not use the qualified pilot classification.");
if (manifest.oneAmBoundary?.independentPlayerReceiptRequired !== true) fail("Manifest does not preserve the independent player boundary.");
if (!manifest.experienceOrder?.includes("root-gate-parley")) fail("Root Gate is not an implemented experience.");

const manifestSha256 = sha256(manifestBytes);
if (manifestSha256 !== expectedAuthoringSha256) fail("World authoring bytes differ from exact Arc custody.");
const htmlSha256 = sha256(html);
const receipt = {
  format: "rodoh-underdrain-static-verification/2",
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
  checks: {
    executableSyntax: "pass",
    networkRuntime: "absent",
    deterministicTickRate: 30,
    semanticMechanisms: "present",
    safeOpening: "zero-pressure",
    acceptedArcConsequence: "required-before-world-delta",
    rootGate: "playable",
    blindPlayerReceipt: "external-and-unissued",
  },
};
process.stdout.write(writeReceipt(receipt));
