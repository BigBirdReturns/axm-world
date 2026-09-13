import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateWorldExpressionPack, type WorldForgePlan } from "../../src/world/forge/index.js";
import { readContainedFile, readReceiptFile } from "./receipt-files.js";

const args = process.argv.slice(2);
function option(name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
  return value;
}
function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
function parseGlb(bytes: Buffer, label: string): Record<string, unknown> {
  if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF") fail(`${label} is not a GLB file`);
  if (bytes.readUInt32LE(4) !== 2) fail(`${label} is not glTF 2.0`);
  if (bytes.readUInt32LE(8) !== bytes.length) fail(`${label} declares the wrong GLB byte length`);
  const jsonLength = bytes.readUInt32LE(12);
  if (bytes.readUInt32LE(16) !== 0x4e4f534a) fail(`${label} has no leading JSON chunk`);
  const jsonEnd = 20 + jsonLength;
  if (jsonEnd > bytes.length) fail(`${label} has a truncated JSON chunk`);
  const text = bytes.toString("utf8", 20, jsonEnd).replace(/[\u0000 ]+$/g, "");
  const json = JSON.parse(text) as Record<string, unknown>;
  const meshes = json.meshes;
  if (!Array.isArray(meshes) || meshes.length === 0) fail(`${label} contains no mesh`);
  for (const family of ["buffers", "images"] as const) {
    const entries = json[family];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const uri = entry && typeof entry === "object" ? (entry as { uri?: unknown }).uri : undefined;
      if (typeof uri === "string" && !uri.startsWith("data:")) {
        fail(`${label} is not self-contained; ${family} URI ${uri} must be embedded`);
      }
    }
  }
  return json;
}
function assertPng(bytes: Buffer, label: string): void {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (bytes.length < signature.length || !bytes.subarray(0, signature.length).equals(signature)) {
    fail(`${label} is not a PNG file`);
  }
}

function assertSvg(bytes: Buffer, label: string): void {
  const text = bytes.toString("utf8");
  if (!/<svg\b/i.test(text) || !/\bviewBox\s*=/i.test(text) || !/<title\b/i.test(text) || !/<desc\b/i.test(text)) {
    fail(`${label} lacks SVG root, viewBox, title, or description metadata`);
  }
  if (/<script\b|<foreignObject\b|\son[a-z]+\s*=/i.test(text)) fail(`${label} contains executable SVG content`);
  if (/\b(?:href|xlink:href|src)\s*=\s*["'](?:https?:)?\/\//i.test(text)) fail(`${label} contains a remote SVG reference`);
}

const planArg = option("--plan");
const packArg = option("--pack");
const rootArg = option("--root");
if (!planArg || !packArg || !rootArg) {
  fail("Usage: world-forge:audit -- --plan <plan.json> --pack <pack.json> --root <asset-root>");
}
const plan = JSON.parse(readFileSync(resolve(planArg), "utf8")) as WorldForgePlan;
const packValue = JSON.parse(readFileSync(resolve(packArg), "utf8"));
const structural = validateWorldExpressionPack(packValue, plan, "complete");
if (!structural.ok || !structural.pack) fail(structural.errors.join("\n"));
const root = resolve(rootArg);

for (const asset of structural.pack.assets) {
  const bytes = readReceiptFile(root, asset);
  if (asset.mediaType === "model/gltf-binary") parseGlb(bytes, asset.path);
  else if (asset.mediaType === "image/png") assertPng(bytes, asset.path);
  else if (asset.mediaType === "image/svg+xml") assertSvg(bytes, asset.path);
  assertPng(readContainedFile(root, asset.previewPath), asset.previewPath);
}
console.log(JSON.stringify({
  format: structural.pack.format,
  cartridgeDigest: structural.pack.cartridgeDigest,
  planDigest: structural.pack.planDigest,
  assets: structural.pack.assets.length,
  assetRoot: root,
  status: "pass",
}, null, 2));
