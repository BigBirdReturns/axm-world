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
const source = resolve(root, "source");
const html = [
  readFileSync(resolve(source, "head.html"), "utf8"),
  readFileSync(resolve(source, "body.html"), "utf8"),
  readFileSync(resolve(source, "authoring-block.html"), "utf8"),
  "<script>",
  readFileSync(resolve(source, "app-01.js"), "utf8"),
  readFileSync(resolve(source, "app-02.js"), "utf8"),
  "</script>",
  readFileSync(resolve(source, "tail.html"), "utf8"),
].join("");
const sha256 = createHash("sha256").update(html).digest("hex");
const expected = "1a1993a726dffbe5e95f122127b74eef9af49f82cf57f78fb5b3c7af8eb78aee";
if (sha256 !== expected) {
  throw new Error(`UNDERDRAIN standalone bytes changed: ${sha256}; expected ${expected}`);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
process.stdout.write(`${JSON.stringify({
  format: "rodoh-underdrain-build/1",
  status: "pass",
  output,
  bytes: Buffer.byteLength(html),
  sha256,
}, null, 2)}\n`);
