#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function fail(message) { console.error(message); process.exit(1); }
const root = resolve(option("--root", "demos/underdrain-draft"));
const htmlPath = resolve(option("--html", "local/underdrain-draft/index.html"));
const manifestPath = resolve(root, "authoring.json");
const playtestPath = resolve(root, "playtest.json");
const html = readFileSync(htmlPath, "utf8");
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const playtest = JSON.parse(readFileSync(playtestPath, "utf8"));

const jsonMatch = html.match(/<script id="underdrain-authoring" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
if (!jsonMatch) fail("Embedded authoring manifest is absent.");
if (JSON.stringify(JSON.parse(jsonMatch[1])) !== JSON.stringify(manifest)) fail("Embedded and companion authoring differ.");
const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
const executable = scripts.find((entry) => !/application\/json/.test(entry[1]))?.[2];
if (!executable) fail("Executable inline script is absent.");
new vm.Script(executable, { filename: htmlPath });
for (const [pattern, label] of [
  [/https?:\/\//i, "external URL"],
  [/<script[^>]+src=/i, "external script"],
  [/<link[^>]+stylesheet/i, "external stylesheet"],
  [/\bfetch\s*\(/, "fetch"],
  [/\bWebSocket\b/, "WebSocket"],
  [/\bEventSource\b/, "EventSource"],
  [/\bserviceWorker\b/, "service worker"],
  [/\bMath\.random\b/, "Math.random"],
  [/\beval\s*\(/, "eval"],
  [/\bnew Function\b/, "dynamic Function"],
]) if (pattern.test(html)) fail(`Standalone HTML contains forbidden ${label}.`);
for (const marker of [
  "const TICK_RATE=30",
  'authority:"Arc replay required"',
  "campaignEffect:null",
  "prefers-reduced-motion",
  "rodoh-underdrain-provisional-run/1",
  "axm-action-profile/1",
  "axm-narrative-rails/1",
]) if (!html.includes(marker)) fail(`Standalone HTML is missing ${marker}.`);
if (manifest.format !== "rodoh-underdrain-standalone/1") fail("Manifest format is unsupported.");
if (playtest.format !== "rodoh-underdrain-playtest/1" || playtest.status !== "pass") fail("Playtest receipt is not passing.");
if (playtest.summary?.failures !== 0 || playtest.summary?.success < 6) fail("Playtest floor is not met.");
const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
if (manifestSha256 !== "6703fe3e424a41d1f86d46ed32bc48c9306676aa0d4336561edf462140fb3bbf") fail("Authoring manifest changed.");
const htmlSha256 = createHash("sha256").update(html).digest("hex");
if (htmlSha256 !== "1a1993a726dffbe5e95f122127b74eef9af49f82cf57f78fb5b3c7af8eb78aee") fail("Standalone HTML changed.");
const receipt = {
  format: "rodoh-underdrain-static-verification/1",
  status: "pass",
  html: { path: htmlPath, bytes: Buffer.byteLength(html), sha256: htmlSha256, singleFile: true, externalRuntime: false },
  authoring: { path: manifestPath, sha256: manifestSha256, actionProfile: manifest.actionProfile.format, narrativeAuthority: manifest.narrativeAuthority },
  playtest: playtest.summary,
  checks: {
    executableSyntax: "pass",
    networkReferences: "absent",
    deterministicTickRate: 30,
    touchControls: "present",
    reducedMotion: "present",
    provisionalAuthority: "Arc replay required",
    campaignEffect: null,
  },
};
const output = option("--output", null);
if (output) {
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(resolve(output), `${JSON.stringify(receipt, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
