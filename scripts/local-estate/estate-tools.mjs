#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const command = args.shift();

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function option(name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
  return value;
}

function has(name) {
  return args.includes(name);
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function canonicalText(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

function git(root, ...gitArgs) {
  const result = spawnSync("git", ["-C", root, ...gitArgs], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) {
    fail(`git ${gitArgs.join(" ")} failed in ${root}:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function shouldSkip(rel, exclusions) {
  const normalized = toPosix(rel);
  return exclusions.some((entry) => normalized === entry || normalized.startsWith(`${entry}/`));
}

function walk(root, exclusions = []) {
  const output = [];
  function visit(current) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const rel = toPosix(relative(root, absolute));
      if (shouldSkip(rel, exclusions)) continue;
      if (entry.isSymbolicLink()) {
        output.push({ path: rel, type: "symlink", target: readFileSync(absolute, "utf8") });
      } else if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile()) {
        const stats = statSync(absolute);
        output.push({
          path: rel,
          type: "file",
          bytes: stats.size,
          sha256: sha256File(absolute),
        });
      }
    }
  }
  if (existsSync(root)) visit(root);
  return output.sort((left, right) => left.path.localeCompare(right.path));
}

function parseVendoredFrom(path) {
  const source = readFileSync(path, "utf8");
  const row = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("paths:"));
  if (!row) fail(`${path} has no paths: record.`);
  return row.slice("paths:".length).trim().split(/\s+/).filter(Boolean);
}

function filesForDeclaredPaths(root, declared) {
  const records = new Map();
  for (const item of declared) {
    const absolute = resolve(root, item);
    if (!existsSync(absolute)) fail(`Declared vendored path is missing: ${absolute}`);
    const stats = lstatSync(absolute);
    if (stats.isDirectory()) {
      for (const record of walk(absolute, [])) {
        const rel = toPosix(join(item, record.path));
        if (rel === "src/engine/VENDORED_FROM") continue;
        records.set(rel, record);
      }
    } else if (stats.isFile()) {
      if (item !== "src/engine/VENDORED_FROM") {
        records.set(toPosix(item), {
          path: toPosix(item),
          type: "file",
          bytes: stats.size,
          sha256: sha256File(absolute),
        });
      }
    }
  }
  return records;
}

function validateLock(lock) {
  const requiredTop = ["format", "releaseTarget", "repositories", "toolchain", "protocols", "products", "localGate"];
  for (const key of requiredTop) {
    if (!(key in lock)) fail(`Estate lock is missing ${key}.`);
  }
  if (lock.format !== "rodoh-local-estate-lock/1") fail(`Unsupported lock format: ${String(lock.format)}`);
  for (const repo of ["arc", "world"]) {
    const record = lock.repositories?.[repo];
    if (!record || typeof record !== "object") fail(`Estate lock is missing repositories.${repo}.`);
    for (const key of ["url", "directory", "branch", "requiredAncestor"]) {
      if (typeof record[key] !== "string" || !record[key]) fail(`repositories.${repo}.${key} is required.`);
    }
  }
  if (lock.localGate?.receipt?.format !== "rodoh-local-operator-acceptance/1") {
    fail("Local operator receipt format is not frozen.");
  }
  return lock;
}

function commandCompareVendored() {
  const world = resolve(option("--world") ?? fail("--world is required."));
  const arc = resolve(option("--arc") ?? fail("--arc is required."));
  const provenance = join(world, "src", "engine", "VENDORED_FROM");
  const declared = parseVendoredFrom(provenance);
  const worldFiles = filesForDeclaredPaths(world, declared);
  const arcFiles = filesForDeclaredPaths(arc, declared);
  const all = [...new Set([...worldFiles.keys(), ...arcFiles.keys()])].sort();
  const mismatches = [];
  for (const path of all) {
    const left = worldFiles.get(path);
    const right = arcFiles.get(path);
    if (!left || !right) {
      mismatches.push(`${path}: ${left ? "missing from Arc" : "missing from World"}`);
      continue;
    }
    if (left.sha256 !== right.sha256 || left.bytes !== right.bytes) {
      mismatches.push(`${path}: World ${left.sha256}/${left.bytes}, Arc ${right.sha256}/${right.bytes}`);
    }
  }
  if (mismatches.length) {
    fail(`Vendored-plane mismatch (${mismatches.length}):\n${mismatches.slice(0, 100).join("\n")}`);
  }
  const receipt = {
    format: "rodoh-vendored-plane-receipt/1",
    world,
    arc,
    declaredPaths: declared,
    filesCompared: all.length,
    status: "match",
  };
  const output = option("--output");
  if (output) {
    mkdirSync(dirname(resolve(output)), { recursive: true });
    writeFileSync(resolve(output), canonicalText(receipt));
  }
  console.log(canonicalText(receipt).trimEnd());
}

function commandTreeHash() {
  const root = resolve(option("--root") ?? fail("--root is required."));
  const exclusions = (option("--exclude", "") || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const files = walk(root, exclusions);
  const digest = sha256Buffer(Buffer.from(files.map((file) => `${file.sha256}  ${file.bytes}  ${file.path}`).join("\n") + "\n"));
  const receipt = { format: "rodoh-tree-hash/1", root, files: files.length, sha256: digest };
  if (has("--json")) console.log(canonicalText(receipt).trimEnd());
  else console.log(digest);
}

function commandValidateLock() {
  const path = resolve(option("--lock") ?? fail("--lock is required."));
  const lock = validateLock(JSON.parse(readFileSync(path, "utf8")));
  console.log(canonicalText({ format: "rodoh-estate-lock-validation/1", path, status: "valid", releaseTarget: lock.releaseTarget }).trimEnd());
}

function commandBuildManifest() {
  const root = resolve(option("--root") ?? fail("--root is required."));
  const output = resolve(option("--output") ?? join(root, "estate.manifest.json"));
  const sumsPath = resolve(option("--sums") ?? join(root, "SHA256SUMS"));
  const exclude = [
    toPosix(relative(root, output)),
    toPosix(relative(root, sumsPath)),
    ".git",
    "node_modules",
  ].filter((item) => item && item !== "..");
  const files = walk(root, exclude);
  const manifest = {
    format: "rodoh-local-estate-manifest/1",
    generatedAt: new Date().toISOString(),
    rootName: basename(root),
    fileCount: files.length,
    files,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, canonicalText(manifest));
  writeFileSync(sumsPath, `${files.map((file) => `${file.sha256}  ${file.path}`).join("\n")}\n`);
  console.log(canonicalText({ format: manifest.format, output, sumsPath, fileCount: files.length }).trimEnd());
}

function commandVerifyManifest() {
  const root = resolve(option("--root") ?? fail("--root is required."));
  const manifestPath = resolve(option("--manifest") ?? join(root, "estate.manifest.json"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.format !== "rodoh-local-estate-manifest/1") fail(`Unsupported manifest format: ${manifest.format}`);
  const errors = [];
  for (const file of manifest.files ?? []) {
    const path = resolve(root, file.path);
    if (!existsSync(path)) {
      errors.push(`${file.path}: missing`);
      continue;
    }
    const stats = statSync(path);
    const digest = sha256File(path);
    if (stats.size !== file.bytes || digest !== file.sha256) {
      errors.push(`${file.path}: expected ${file.sha256}/${file.bytes}, got ${digest}/${stats.size}`);
    }
  }
  if (errors.length) fail(`Estate manifest verification failed:\n${errors.slice(0, 100).join("\n")}`);
  console.log(canonicalText({ format: "rodoh-local-estate-verification/1", manifest: manifestPath, filesVerified: manifest.files.length, status: "pass" }).trimEnd());
}

function commandRepoReceipt() {
  const root = resolve(option("--root") ?? fail("--root is required."));
  const requiredAncestor = option("--required-ancestor");
  const head = git(root, "rev-parse", "HEAD");
  const branch = git(root, "rev-parse", "--abbrev-ref", "HEAD");
  const status = git(root, "status", "--porcelain");
  let ancestorOk = true;
  if (requiredAncestor) {
    const result = spawnSync("git", ["-C", root, "merge-base", "--is-ancestor", requiredAncestor, head], { windowsHide: true });
    ancestorOk = result.status === 0;
  }
  const receipt = {
    format: "rodoh-repository-receipt/1",
    root,
    branch,
    head,
    clean: status.length === 0,
    requiredAncestor: requiredAncestor ?? null,
    requiredAncestorPresent: ancestorOk,
  };
  if (!receipt.clean || !receipt.requiredAncestorPresent) {
    fail(canonicalText(receipt));
  }
  const output = option("--output");
  if (output) {
    mkdirSync(dirname(resolve(output)), { recursive: true });
    writeFileSync(resolve(output), canonicalText(receipt));
  }
  console.log(canonicalText(receipt).trimEnd());
}

switch (command) {
  case "compare-vendored":
    commandCompareVendored();
    break;
  case "tree-hash":
    commandTreeHash();
    break;
  case "validate-lock":
    commandValidateLock();
    break;
  case "build-manifest":
    commandBuildManifest();
    break;
  case "verify-manifest":
    commandVerifyManifest();
    break;
  case "repo-receipt":
    commandRepoReceipt();
    break;
  default:
    fail(`Unknown command ${String(command)}. Expected compare-vendored, tree-hash, validate-lock, build-manifest, verify-manifest, or repo-receipt.`);
}
