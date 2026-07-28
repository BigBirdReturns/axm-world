#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
const root = resolve(option("--root", "demos/underdrain-draft"));
const output = resolve(option("--output", "local/underdrain-draft/index.html"));
const writeHash = args.includes("--write-hash");
const source = resolve(root, "source");
const html = [
  readFileSync(resolve(source, "head.html"), "utf8"),
  readFileSync(resolve(source, "body.html"), "utf8"),
  readFileSync(resolve(source, "authoring-block.html"), "utf8"),
  "<script>",
  readFileSync(resolve(source, "arc-capsule.js"), "utf8"),
  readFileSync(resolve(source, "app-01.js"), "utf8"),
  readFileSync(resolve(source, "app-02.js"), "utf8"),
  "</script>",
  readFileSync(resolve(source, "tail.html"), "utf8"),
].join("");
const sha256 = createHash("sha256").update(html).digest("hex");
const hashPath = resolve(root, "BUILD_SHA256");
if (writeHash) {
  writeFileSync(hashPath, `${sha256}  index.html\n`, "utf8");
} else {
  const expected = readFileSync(hashPath, "utf8").trim().split(/\s+/)[0];
  if (sha256 !== expected) {
    throw new Error(`UNDERDRAIN standalone bytes changed: ${sha256}; expected ${expected}`);
  }
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
process.stdout.write(`${JSON.stringify({
  format: "rodoh-underdrain-build/2",
  status: "pass",
  output,
  bytes: Buffer.byteLength(html),
  sha256,
  arcCapsule: "embedded",
}, null, 2)}\n`);
