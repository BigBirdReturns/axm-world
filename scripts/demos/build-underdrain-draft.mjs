#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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
const production = resolve(assets, "production");
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

const pumpPartNames = readdirSync(production)
  .filter((name) => /^pump-seven\.webp\.b64\.part-\d{2}$/.test(name))
  .sort();
if (pumpPartNames.length !== 5) fail(`Expected five Pump Seven production-art chunks, found ${pumpPartNames.length}.`);
const pumpBase64 = pumpPartNames
  .map((name) => readFileSync(resolve(production, name), "utf8").trim())
  .join("");
if (!/^[A-Za-z0-9+/]+={0,2}$/.test(pumpBase64)) fail("Pump Seven production art is not valid base64 custody.");
const pumpBytes = Buffer.from(pumpBase64, "base64");
const pumpSha256 = sha256(pumpBytes);
const expectedPumpSha256 = "c5810b7362b511a8789e26300517ab0156b2593f99c9b45227765f465ef871ca";
if (pumpSha256 !== expectedPumpSha256) fail(`Pump Seven production-art digest mismatch: ${pumpSha256}.`);
const productionAssets = [
  '"use strict";',
  "(()=>{",
  `  const bytes=${JSON.stringify(pumpBase64)};`,
  "  globalThis.UnderdrainProductionAssets=Object.freeze({",
  '    format:"underdrain-production-assets/1",',
  '    generatedAt:"2026-07-28",',
  "    assets:Object.freeze({",
  '      "underdrain:scene-pump-seven":Object.freeze({',
  '        mediaType:"image/webp",',
  "        width:960,",
  "        height:540,",
  `        sha256:${JSON.stringify(pumpSha256)},`,
  '        provenance:"OpenAI image generation with project-directed crop and service-gantry cleanup",',
  '        dataUrl:`data:image/webp;base64,${bytes}`',
  "      })",
  "    })",
  "  });",
  "})();",
].join("\n");

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
  productionAssets,
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
  format: "rodoh-underdrain-build/4",
  status: "pass",
  output,
  worldCommit,
  authoringSha256: sha256(authoringBytes),
  presentationSha256,
  productionArt: {
    format: "underdrain-production-assets/1",
    pumpSevenSha256: pumpSha256,
    mediaType: "image/webp",
    width: 960,
    height: 540,
  },
  representationPlanId: presentation.id,
  declaredRepresentationRoles: presentation.assets.length,
  bytes: Buffer.byteLength(html),
  sha256: digest,
  arcCapsule: "embedded",
  persistenceAdapter: "embedded",
  whiteLabelRepresentation: "mixed-production-and-prototype",
  narrowScreenControls: "embedded-and-qualified",
  singleFile: true,
  externalRuntime: false,
}, null, 2)}\n`);