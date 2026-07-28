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

const root = resolve(option("--root") ?? "demos/underdrain-draft");
const output = resolve(option("--output") ?? "local/underdrain-draft/index.html");
const worldCommit = option("--world-commit");
if (!worldCommit || !/^[0-9a-f]{40}$/.test(worldCommit)) {
  fail("--world-commit must bind the standalone to an exact 40-character lowercase Git SHA.");
}
const source = resolve(root, "source");
const authoringBytes = readFileSync(resolve(root, "authoring.json"));
const authoring = JSON.parse(authoringBytes.toString("utf8"));
if (authoring.format !== "rodoh-underdrain-standalone/2") fail("Underdrain authoring is not the continuous v2 authority.");
const safeAuthoring = JSON.stringify(authoring, null, 2).replace(/<\/script/gi, "<\\/script");
const capsule = readFileSync(resolve(source, "arc-capsule.js"), "utf8");
if (/placeholder\s*:\s*(?:true|!0)/.test(capsule)) fail("The exact Arc capsule has not been generated.");

const html = [
  readFileSync(resolve(source, "head.html"), "utf8"),
  readFileSync(resolve(source, "body.html"), "utf8"),
  `<script id="underdrain-authoring" type="application/json">\n${safeAuthoring}\n</script>`,
  "<script>",
  `globalThis.__UNDERDRAIN_WORLD_COMMIT__=${JSON.stringify(worldCommit)};`,
  capsule,
  readFileSync(resolve(source, "app-01.js"), "utf8"),
  readFileSync(resolve(source, "app-02.js"), "utf8"),
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
  format: "rodoh-underdrain-build/2",
  status: "pass",
  output,
  worldCommit,
  authoringSha256: sha256(authoringBytes),
  bytes: Buffer.byteLength(html),
  sha256: digest,
  arcCapsule: "embedded",
  singleFile: true,
  externalRuntime: false,
}, null, 2)}\n`);
