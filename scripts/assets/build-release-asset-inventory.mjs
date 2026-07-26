#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
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
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function normalized(path) {
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}
function inside(rootPath, candidatePath) {
  const rootValue = normalized(rootPath);
  const candidateValue = normalized(candidatePath);
  return candidateValue === rootValue || candidateValue.startsWith(`${rootValue}/`);
}

const root = resolve(option("--root") ?? process.cwd());
if (!existsSync(root)) fail(`Repository root is absent: ${root}`);
const rootReal = realpathSync(root);
function repositoryPath(path, label) {
  const absolute = resolve(root, path);
  if (!inside(root, absolute)) fail(`${label} escapes the repository root: ${path}`);
  if (existsSync(absolute) && !inside(rootReal, realpathSync(absolute))) {
    fail(`${label} resolves outside the repository root: ${path}`);
  }
  return absolute;
}

const rollupPath = repositoryPath(option("--rollups") ?? "src/assets/rollups/rodoh-v1-programs.json", "Rollup file");
const descriptionPath = repositoryPath(option("--descriptions") ?? "src/assets/descriptions/rodoh-v1-dense-assets.json", "Description file");
const outputPath = repositoryPath(option("--output") ?? "docs/release/RODOH_ASSET_INVENTORY.json", "Inventory output");
const check = flag("--check");
const rollups = JSON.parse(readFileSync(rollupPath, "utf8"));
const descriptions = JSON.parse(readFileSync(descriptionPath, "utf8"));
if (rollups.format !== "rodoh-program-asset-rollup-set/1") fail("Unsupported asset rollup format.");
if (descriptions.format !== "rodoh-asset-long-description-set/1") fail("Unsupported long-description format.");
if (!Array.isArray(rollups.programs) || !Array.isArray(descriptions.descriptions)) fail("Asset custody inputs must contain arrays.");

const programIds = rollups.programs.map((program) => program.id);
if (new Set(programIds).size !== programIds.length) fail("Asset rollups contain duplicate program ids.");
const descriptionIds = descriptions.descriptions.map((entry) => entry.id);
if (new Set(descriptionIds).size !== descriptionIds.length) fail("Asset descriptions contain duplicate ids.");

const acceptedProvenance = new Set(rollups.provenanceCompatibility);
const descriptionById = new Map(descriptions.descriptions.map((entry) => [entry.id, entry]));
const supported = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg", ".css", ".ts", ".tsx", ".js", ".mjs", ".json"]);

function walk(path, label) {
  const absolute = repositoryPath(path, label);
  if (!existsSync(absolute)) fail(`${label} is absent: ${relative(root, absolute)}`);
  const information = lstatSync(absolute);
  if (information.isSymbolicLink()) fail(`${label} may not be a symbolic link: ${relative(root, absolute)}`);
  if (information.isFile()) return [absolute];
  if (!information.isDirectory()) fail(`${label} is neither a file nor directory: ${relative(root, absolute)}`);
  return readdirSync(absolute, { withFileTypes: true })
    .sort((left, right) => compareStrings(left.name, right.name))
    .flatMap((entry) => {
      const child = resolve(absolute, entry.name);
      if (entry.isSymbolicLink()) fail(`${label} contains symbolic link ${relative(root, child)}.`);
      return entry.isDirectory() ? walk(child, label) : [child];
    });
}
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function textOrNull(path) {
  const extension = extname(path).toLowerCase();
  return [".svg", ".css", ".ts", ".tsx", ".js", ".mjs", ".json"].includes(extension) ? readFileSync(path, "utf8") : null;
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
function sourceStringLiterals(text) {
  const literals = [];
  for (let index = 0; index < text.length;) {
    const char = text[index];
    const next = text[index + 1];
    if (char === "/" && next === "/") {
      index += 2;
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index += 1;
      index = Math.min(text.length, index + 2);
      continue;
    }
    if (char !== '"' && char !== "'" && char !== "`") {
      index += 1;
      continue;
    }
    const quote = char;
    let literal = "";
    index += 1;
    while (index < text.length) {
      const current = text[index];
      if (current === "\\") {
        literal += current;
        if (index + 1 < text.length) literal += text[index + 1];
        index += 2;
        continue;
      }
      if (current === quote) {
        index += 1;
        break;
      }
      literal += current;
      index += 1;
    }
    literals.push(literal);
  }
  return literals;
}
const NON_NETWORK_NAMESPACE_PREFIXES = [
  "http://www.w3.org/1999/xhtml",
  "http://www.w3.org/1999/xlink",
  "http://www.w3.org/2000/svg",
  "http://www.w3.org/XML/1998/namespace",
];
function urlLiterals(text) {
  return [...text.matchAll(/(?:https?:\/\/[^\s"'`<>\\)\]}]+|\/\/(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?:[^\s"'`<>\\)\]}]*))/gi)]
    .map((match) => match[0].replace(/[;,]+$/, ""))
    .filter((value) => !NON_NETWORK_NAMESPACE_PREFIXES.some((prefix) => value.startsWith(prefix)));
}
/** Only references capable of loading a runtime asset count here. Repository,
 * provenance, and license URLs inside comments or JSON metadata are records, not
 * network-bearing asset edges. Executable source string literals remain in scope. */
function remoteReferences(path, text) {
  if (!text) return [];
  const extension = extname(path).toLowerCase();
  let values = [];
  if (extension === ".svg") {
    values = [...text.matchAll(/\b(?:href|xlink:href|src)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi)]
      .map((match) => match[1]);
  } else if (extension === ".css") {
    values = [
      ...[...text.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)["']?\s*\)/gi)].map((match) => match[1]),
      ...[...text.matchAll(/@import\s+(?:url\()?\s*["']((?:https?:)?\/\/[^"']+)["']/gi)].map((match) => match[1]),
    ];
  } else if ([".ts", ".tsx", ".js", ".mjs"].includes(extension)) {
    values = sourceStringLiterals(text).flatMap(urlLiterals);
  }
  return [...new Set(values)].sort(compareStrings);
}
function embeddedRaster(path, text) {
  return extname(path).toLowerCase() === ".svg"
    && !!text
    && /(?:href|xlink:href)\s*=\s*["']data:image\/(?!svg\+xml)/i.test(text);
}
function executableSvg(path, text) {
  return extname(path).toLowerCase() === ".svg"
    && !!text
    && (/<script\b/i.test(text) || /\son[a-z]+\s*=/i.test(text) || /<foreignObject\b/i.test(text));
}

const ownership = new Map();
const programs = [];
const referencedDescriptions = new Set();
for (const program of rollups.programs) {
  const manifests = program.historicalManifests.map((path) => {
    const absolute = repositoryPath(path, `${program.id} manifest`);
    if (!existsSync(absolute)) fail(`${program.id} manifest is absent: ${path}`);
    if (lstatSync(absolute).isSymbolicLink()) fail(`${program.id} manifest may not be a symbolic link: ${path}`);
    if (extname(path).toLowerCase() !== ".json") return { path, format: "human-authority" };
    const value = JSON.parse(readFileSync(absolute, "utf8"));
    if (!acceptedProvenance.has(value.format)) fail(`${path} uses unrecognized provenance format ${String(value.format)}.`);
    return { path, format: value.format };
  });
  const roots = [...program.assetRoots, ...program.presentationRoots];
  const paths = [...new Set(roots.flatMap((path) => walk(path, `${program.id} asset root`)))]
    .filter((path) => supported.has(extname(path).toLowerCase()))
    .sort(compareStrings);
  const pathKeys = new Set(paths.map((path) => relative(root, path).replace(/\\/g, "/")));
  for (const descriptionId of program.denseDescriptions) {
    if (referencedDescriptions.has(descriptionId)) fail(`Long description ${descriptionId} is assigned to more than one program.`);
    const description = descriptionById.get(descriptionId);
    if (!description) fail(`${program.id} references missing long description ${descriptionId}.`);
    const descriptionAsset = relative(root, repositoryPath(description.asset, `Long description ${descriptionId} asset`)).replace(/\\/g, "/");
    if (!pathKeys.has(descriptionAsset)) fail(`${descriptionId} describes ${description.asset}, which is outside ${program.id}'s governed roots.`);
    referencedDescriptions.add(descriptionId);
  }
  for (const path of paths) {
    const key = relative(root, path).replace(/\\/g, "/");
    const owners = ownership.get(key) ?? [];
    owners.push(program.id);
    ownership.set(key, owners);
  }
  for (const path of program.acceptance) {
    const absolute = repositoryPath(path, `${program.id} acceptance path`);
    if (!existsSync(absolute)) fail(`${program.id} acceptance path is absent: ${path}`);
    if (lstatSync(absolute).isSymbolicLink()) fail(`${program.id} acceptance path may not be a symbolic link: ${path}`);
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
for (const description of descriptions.descriptions) {
  if (!referencedDescriptions.has(description.id)) fail(`Long description ${description.id} is not assigned to a governed program.`);
}

const assets = [...ownership.entries()].sort(([left], [right]) => compareStrings(left, right)).map(([path, owners]) => {
  const absolute = repositoryPath(path, `Governed asset ${path}`);
  const bytes = readFileSync(absolute);
  const text = textOrNull(absolute);
  const extension = extname(path).toLowerCase();
  const title = extension === ".svg" ? firstMatch(text, /<title[^>]*>([\s\S]*?)<\/title>/i)?.trim() ?? null : null;
  const description = extension === ".svg" ? firstMatch(text, /<desc[^>]*>([\s\S]*?)<\/desc>/i)?.trim() ?? null : null;
  const viewBox = extension === ".svg" ? firstMatch(text, /\bviewBox\s*=\s*["']([^"']+)["']/i) : null;
  const remote = remoteReferences(path, text);
  return {
    path,
    owners: [...new Set(owners)].sort(compareStrings),
    kind: extension.slice(1),
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
    viewBox,
    title,
    description,
    vectorElements: extension === ".svg" ? vectorElements(text) : 0,
    remoteReferences: remote,
    embeddedRaster: embeddedRaster(path, text),
    executableSvg: executableSvg(path, text),
  };
});

const failures = [];
for (const asset of assets) {
  if (asset.remoteReferences.length) failures.push(`${asset.path} contains remote runtime references: ${asset.remoteReferences.join(", ")}.`);
  if (asset.embeddedRaster) failures.push(`${asset.path} contains an embedded raster payload.`);
  if (asset.executableSvg) failures.push(`${asset.path} contains executable or foreign SVG content.`);
  if (asset.kind === "svg" && (!asset.title || !asset.description || !asset.viewBox)) {
    failures.push(`${asset.path} lacks SVG title, description, or viewBox metadata.`);
  }
}
for (const description of descriptions.descriptions) {
  const absolute = repositoryPath(description.asset, `Long description ${description.id} asset`);
  if (!existsSync(absolute)) failures.push(`Long description ${description.id} names missing asset ${description.asset}.`);
  if (!Array.isArray(description.runtimeEquivalents) || description.runtimeEquivalents.length === 0) failures.push(`${description.id} lacks runtime equivalents.`);
}

const inventory = {
  format: "rodoh-release-asset-inventory/1",
  releaseTarget: rollups.releaseTarget,
  generatedFrom: {
    rollups: relative(root, rollupPath).replace(/\\/g, "/"),
    longDescriptions: relative(root, descriptionPath).replace(/\\/g, "/"),
  },
  provenanceCompatibility: [...acceptedProvenance].sort(compareStrings),
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
