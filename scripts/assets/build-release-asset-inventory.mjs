#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}
const args = process.argv.slice(2);
function option(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
  return value;
}
function flag(name) {
  return args.includes(name);
}

const root = resolve(option("--root") ?? process.cwd());
const rollupPath = resolve(root, option("--rollups") ?? "src/assets/rollups/rodoh-v1-programs.json");
const descriptionPath = resolve(root, option("--descriptions") ?? "src/assets/descriptions/rodoh-v1-dense-assets.json");
const outputPath = resolve(root, option("--output") ?? "docs/release/RODOH_ASSET_INVENTORY.json");
const check = flag("--check");
const rollups = JSON.parse(readFileSync(rollupPath, "utf8"));
const descriptions = JSON.parse(readFileSync(descriptionPath, "utf8"));
if (rollups.format !== "rodoh-program-asset-rollup-set/1") fail("Unsupported asset rollup format.");
if (descriptions.format !== "rodoh-asset-long-description-set/1") fail("Unsupported long-description format.");

const acceptedProvenance = new Set(rollups.provenanceCompatibility);
const descriptionById = new Map(descriptions.descriptions.map((entry) => [entry.id, entry]));
const supported = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg", ".css", ".ts", ".tsx", ".json"]);

function walk(path) {
  if (!existsSync(path)) fail(`Asset rollup path is absent: ${relative(root, path)}`);
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function textOrNull(path) {
  const extension = extname(path).toLowerCase();
  return [".svg", ".css", ".ts", ".tsx", ".json"].includes(extension) ? readFileSync(path, "utf8") : null;
}
function firstMatch(text, pattern) {
  return text ? pattern.exec(text)?.[1] ?? null : null;
}
function vectorElements(text) {
  if (!text) return 0;
  return [...text.matchAll(/<([A-Za-z][A-Za-z0-9:_-]*)(?:\s|\/?>)/g)]
    .filter((match) => !["svg", "title", "desc", "metadata", "defs"].includes(match[1].toLowerCase()))
    .length;
}
function remoteReferences(text) {
  if (!text) return [];
  return [...text.matchAll(/(?:https?:)?\/\/[^\s"'<>\)]+/gi)].map((match) => match[0]).sort();
}
function embeddedRaster(text) {
  return !!text && /(?:href|xlink:href)\s*=\s*["']data:image\/(?!svg\+xml)/i.test(text);
}
function executableSvg(text) {
  return !!text && (/<script\b/i.test(text) || /\son[a-z]+\s*=/i.test(text) || /<foreignObject\b/i.test(text));
}

const ownership = new Map();
const programs = [];
for (const program of rollups.programs) {
  const manifests = program.historicalManifests.map((path) => {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) fail(`${program.id} manifest is absent: ${path}`);
    if (extname(path) !== ".json") return { path, format: "human-authority" };
    const value = JSON.parse(readFileSync(absolute, "utf8"));
    if (!acceptedProvenance.has(value.format)) fail(`${path} uses unrecognized provenance format ${String(value.format)}.`);
    return { path, format: value.format };
  });
  for (const descriptionId of program.denseDescriptions) {
    if (!descriptionById.has(descriptionId)) fail(`${program.id} references missing long description ${descriptionId}.`);
  }
  const roots = [...program.assetRoots, ...program.presentationRoots];
  const paths = [...new Set(roots.flatMap((path) => walk(resolve(root, path))))]
    .filter((path) => supported.has(extname(path).toLowerCase()))
    .sort();
  for (const path of paths) {
    const key = relative(root, path).replace(/\\/g, "/");
    const owners = ownership.get(key) ?? [];
    owners.push(program.id);
    ownership.set(key, owners);
  }
  for (const path of program.acceptance) {
    if (!existsSync(resolve(root, path))) fail(`${program.id} acceptance path is absent: ${path}`);
  }
  programs.push({
    id: program.id,
    name: program.name,
    cartridgeId: program.cartridgeId,
    cartridgeDigest: program.cartridgeDigest,
    status: program.status,
    historicalManifests: manifests,
    assetCount: paths.length,
    denseDescriptions: program.denseDescriptions,
    requiredRoles: program.requiredRoles,
    acceptance: program.acceptance,
    releaseBoundary: program.releaseBoundary,
  });
}

const assets = [...ownership.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, owners]) => {
  const absolute = resolve(root, path);
  const bytes = readFileSync(absolute);
  const text = textOrNull(absolute);
  const extension = extname(path).toLowerCase();
  const title = extension === ".svg" ? firstMatch(text, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim() ?? null : null;
  const description = extension === ".svg" ? firstMatch(text, /<desc[^>]*>([\s\S]*?)<\/desc>/i)?.trim() ?? null : null;
  const viewBox = extension === ".svg" ? firstMatch(text, /\bviewBox\s*=\s*["']([^"']+)["']/i) : null;
  const remote = remoteReferences(text);
  return {
    path,
    owners: [...new Set(owners)].sort(),
    kind: extension.slice(1),
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    viewBox,
    title,
    description,
    vectorElements: extension === ".svg" ? vectorElements(text) : 0,
    remoteReferences: remote,
    embeddedRaster: embeddedRaster(text),
    executableSvg: extension === ".svg" && executableSvg(text),
  };
});

const failures = [];
for (const asset of assets) {
  if (asset.remoteReferences.length) failures.push(`${asset.path} contains remote references.`);
  if (asset.embeddedRaster) failures.push(`${asset.path} contains an embedded raster payload.`);
  if (asset.executableSvg) failures.push(`${asset.path} contains executable or foreign SVG content.`);
  if (asset.kind === "svg" && (!asset.title || !asset.description || !asset.viewBox)) {
    failures.push(`${asset.path} lacks SVG title, description, or viewBox metadata.`);
  }
}
for (const description of descriptions.descriptions) {
  if (!existsSync(resolve(root, description.asset))) failures.push(`Long description ${description.id} names missing asset ${description.asset}.`);
  if (!Array.isArray(description.runtimeEquivalents) || description.runtimeEquivalents.length === 0) failures.push(`${description.id} lacks runtime equivalents.`);
}

const inventory = {
  format: "rodoh-release-asset-inventory/1",
  releaseTarget: rollups.releaseTarget,
  generatedFrom: {
    rollups: relative(root, rollupPath).replace(/\\/g, "/"),
    longDescriptions: relative(root, descriptionPath).replace(/\\/g, "/"),
  },
  provenanceCompatibility: [...acceptedProvenance].sort(),
  summary: {
    programs: programs.length,
    assets: assets.length,
    bytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    svgAssets: assets.filter((asset) => asset.kind === "svg").length,
    vectorElements: assets.reduce((sum, asset) => sum + asset.vectorElements, 0),
    longDescriptions: descriptions.descriptions.length,
    failures: failures.length,
  },
  programs,
  longDescriptions: descriptions.descriptions,
  assets,
  failures,
  status: failures.length === 0 ? "pass" : "fail",
};
const output = `${JSON.stringify(inventory, null, 2)}\n`;
if (check) {
  if (!existsSync(outputPath)) fail(`Committed asset inventory is absent: ${relative(root, outputPath)}`);
  if (readFileSync(outputPath, "utf8") !== output) fail(`Committed asset inventory is stale: ${relative(root, outputPath)}`);
  console.log(`${relative(root, outputPath)} is current.`);
} else {
  writeFileSync(outputPath, output);
  console.log(JSON.stringify({
    format: "rodoh-release-asset-inventory-build/1",
    output: relative(root, outputPath).replace(/\\/g, "/"),
    summary: inventory.summary,
    status: inventory.status,
  }, null, 2));
}
if (failures.length) process.exit(1);
