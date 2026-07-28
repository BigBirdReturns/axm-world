#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
function fail(message) {
  console.error(message);
  process.exit(1);
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function safeEmbeddedJson(value) {
  return JSON.stringify(value, null, 2).replace(/<\/script/gi, "<\\/script");
}

const root = resolve(option("--root") ?? "demos/underdrain-draft");
const output = resolve(option("--output") ?? "local/underdrain-draft/index.html");
const worldCommit = option("--world-commit");
if (!worldCommit || !/^[0-9a-f]{40}$/.test(worldCommit)) {
  fail("--world-commit must bind the standalone to an exact 40-character lowercase Git SHA.");
}
const source = resolve(root, "source");
const assets = resolve(root, "assets");
const authoringBytes = readFileSync(resolve(root, "authoring.json"));
const authoring = JSON.parse(authoringBytes.toString("utf8"));
if (authoring.format !== "rodoh-underdrain-standalone/2") fail("Underdrain authoring is not the continuous v2 authority.");
const presentationBytes = readFileSync(resolve(root, "presentation.json"));
const presentation = JSON.parse(presentationBytes.toString("utf8"));
if (presentation.format !== "rodoh-representation-plan/1") fail("Underdrain presentation is not a governed white-label plan.");
if (presentation.renderer?.action !== "cartridge-assets" || presentation.renderer?.neutralFallbackUsed !== false) {
  fail("Underdrain presentation permits schematic or neutral fallback rendering.");
}
const safeAuthoring = safeEmbeddedJson(authoring);
const safePresentation = safeEmbeddedJson(presentation);
const presentationSha256 = sha256(presentationBytes);
const capsule = readFileSync(resolve(source, "arc-capsule.js"), "utf8");
if (/placeholder\s*:\s*(?:true|!0)/.test(capsule)) fail("The exact Arc capsule has not been generated.");
const art = readFileSync(resolve(assets, "underdrain-art.js"), "utf8");
const mobileControlsCss = readFileSync(resolve(source, "mobile-controls.css"), "utf8");
const head = readFileSync(resolve(source, "head.html"), "utf8");
if (!head.includes("</style>")) fail("Underdrain head has no inline style boundary.");
const representedHead = head.replace("</style>", `${mobileControlsCss}\n</style>`);
const app02 = readFileSync(resolve(source, "app-02.js"), "utf8");
const bootMarker = "const params=new URLSearchParams(location.search);";
const bootIndex = app02.indexOf(bootMarker);
if (bootIndex < 0) fail("Underdrain app boot marker is absent.");
const app02Definitions = app02.slice(0, bootIndex);
const app02Boot = app02.slice(bootIndex);

const html = [
  representedHead,
  readFileSync(resolve(source, "body.html"), "utf8"),
  `<script id="underdrain-authoring" type="application/json">\n${safeAuthoring}\n</script>`,
  `<script id="underdrain-presentation" type="application/json">\n${safePresentation}\n</script>`,
  "<script>",
  `globalThis.__UNDERDRAIN_WORLD_COMMIT__=${JSON.stringify(worldCommit)};`,
  `globalThis.__UNDERDRAIN_PRESENTATION_SHA256__=${JSON.stringify(presentationSha256)};`,
  capsule,
  readFileSync(resolve(source, "storage-adapter.js"), "utf8"),
  art,
  readFileSync(resolve(source, "app-01.js"), "utf8"),
  app02Definitions,
  readFileSync(resolve(source, "presentation-surface.js"), "utf8"),
  app02Boot,
  readFileSync(resolve(source, "persistence-surface.js"), "utf8"),
  "</script>",
  readFileSync(resolve(source, "tail.html"), "utf8"),
].join("");
const digest = sha256(html);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
const hashOutput = option("--hash-output");
if (hashOutput) {
  mkdirSync(dirname(resolve(hashOutput)), { recursive: true });
  writeFileSync(resolve(hashOutput), `${digest}  index.html\n`, "utf8");
}
process.stdout.write(`${JSON.stringify({
  format: "rodoh-underdrain-build/3",
  status: "pass",
  output,
  worldCommit,
  authoringSha256: sha256(authoringBytes),
  presentationSha256,
  representationPlanId: presentation.id,
  representationAssets: presentation.assets.length,
  bytes: Buffer.byteLength(html),
  sha256: digest,
  arcCapsule: "embedded",
  persistenceAdapter: "embedded",
  whiteLabelRepresentation: "embedded-before-boot",
  narrowScreenControls: "embedded-and-qualified",
  singleFile: true,
  externalRuntime: false,
}, null, 2)}\n`);
