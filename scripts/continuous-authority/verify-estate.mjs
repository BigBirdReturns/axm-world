#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
function values(name) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
    result.push(value);
    index += 1;
  }
  return result;
}
function option(name, fallback = null) {
  return values(name)[0] ?? fallback;
}
function plainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
  return value;
}
function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys differ: expected ${wanted.join(", ")}; got ${actual.join(", ")}.`);
  }
}
function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string.`);
  return value;
}
function requiredBoolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} must be a boolean.`);
  return value;
}
function requiredCommit(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    fail(`${label} must be a lowercase 40-character Git SHA.`);
  }
  return value;
}
function requiredRepository(value, label) {
  const repository = requiredString(value, label);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail(`${label} is not owner/repository.`);
  return repository;
}
function parseJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function normalizedPath(path) {
  return path.replace(/\\/g, "/");
}

const lockPath = resolve(option("--lock", "estate/post-v1/continuous-authority.lock.json"));
if (!existsSync(lockPath)) fail(`Continuous authority lock is absent: ${lockPath}`);
const lock = plainObject(parseJson(lockPath, "Continuous authority lock"), "Continuous authority lock");
exactKeys(lock, [
  "$schema", "format", "status", "releaseEffect", "repositories", "genesis", "unity", "formats", "acceptance",
], "Continuous authority lock");
if (lock.$schema !== "./continuous-authority.schema.json") fail("Continuous authority schema reference is unsupported.");
if (lock.format !== "rodoh-continuous-authority-lock/1") fail("Continuous authority lock format is unsupported.");
if (lock.status !== "post-v1-integration") fail("Continuous authority lock status is unsupported.");
if (lock.releaseEffect !== "none") fail("Post-v1 integration must not affect the frozen release.");

const repositories = plainObject(lock.repositories, "repositories");
exactKeys(repositories, ["world", "arc", "embodied"], "repositories");
const world = plainObject(repositories.world, "repositories.world");
exactKeys(world, ["repository", "branch", "receiverCommit", "role"], "repositories.world");
requiredRepository(world.repository, "repositories.world.repository");
requiredString(world.branch, "repositories.world.branch");
requiredCommit(world.receiverCommit, "repositories.world.receiverCommit");
requiredString(world.role, "repositories.world.role");

const arc = plainObject(repositories.arc, "repositories.arc");
exactKeys(arc, [
  "repository", "branch", "actionAuthorityCommit", "narrativeBaselineCommit", "continuousAuthorityCommit", "role",
], "repositories.arc");
requiredRepository(arc.repository, "repositories.arc.repository");
requiredString(arc.branch, "repositories.arc.branch");
requiredCommit(arc.actionAuthorityCommit, "repositories.arc.actionAuthorityCommit");
requiredCommit(arc.narrativeBaselineCommit, "repositories.arc.narrativeBaselineCommit");
requiredCommit(arc.continuousAuthorityCommit, "repositories.arc.continuousAuthorityCommit");
requiredString(arc.role, "repositories.arc.role");

const embodied = plainObject(repositories.embodied, "repositories.embodied");
exactKeys(embodied, ["repository", "branch", "functionalCommit", "closureCommit", "role"], "repositories.embodied");
requiredRepository(embodied.repository, "repositories.embodied.repository");
requiredString(embodied.branch, "repositories.embodied.branch");
requiredCommit(embodied.functionalCommit, "repositories.embodied.functionalCommit");
requiredCommit(embodied.closureCommit, "repositories.embodied.closureCommit");
requiredString(embodied.role, "repositories.embodied.role");

const genesis = plainObject(lock.genesis, "genesis");
exactKeys(genesis, ["kernelCommit"], "genesis");
requiredCommit(genesis.kernelCommit, "genesis.kernelCommit");

const unity = plainObject(lock.unity, "unity");
exactKeys(unity, ["version", "projectPathHint", "physicalReceiptRequired"], "unity");
if (unity.version !== "6000.0.66f2") fail(`Unity version ${String(unity.version)} is not the qualified project version.`);
requiredString(unity.projectPathHint, "unity.projectPathHint");
if (requiredBoolean(unity.physicalReceiptRequired, "unity.physicalReceiptRequired") !== true) {
  fail("The actual Unity and Quest estate must remain a required receipt boundary.");
}

const formats = plainObject(lock.formats, "formats");
const expectedFormats = {
  actionProfile: "axm-action-profile/1",
  actionSpec: "axm-action-spec/1",
  unitySpec: "rodoh-unity-action-spec/1",
  presentationManifest: "rodoh-action-presentation-manifest/1",
  sceneJob: "rodoh-action-scene-job/1",
  executionCandidate: "rodoh-action-execution-candidate/1",
  embodiedSession: "axm-embodied-action-session/1",
  actionReceipt: "axm-action-receipt/1",
  actionNarrativeBinding: "axm-action-narrative-binding/1",
  actionNarrativeIngestion: "axm-action-narrative-ingestion/1",
  narrativeLedger: "axm-narrative-ledger/1",
};
exactKeys(formats, Object.keys(expectedFormats), "formats");
for (const [key, expected] of Object.entries(expectedFormats)) {
  if (formats[key] !== expected) fail(`formats.${key} must be ${expected}.`);
}

const acceptance = plainObject(lock.acceptance, "acceptance");
exactKeys(acceptance, ["physicalIssue", "operatorKitPr", "bookIVActivated", "requiredReceipts"], "acceptance");
if (acceptance.physicalIssue !== "BigBirdReturns/axm-world#204") fail("Physical acceptance issue identity changed.");
if (acceptance.operatorKitPr !== "BigBirdReturns/axm-world#205") fail("Operator kit PR identity changed.");
if (acceptance.bookIVActivated !== false) fail("Book IV must remain outside this integration estate.");
if (!Array.isArray(acceptance.requiredReceipts) || acceptance.requiredReceipts.length < 6) {
  fail("Continuous authority acceptance requires the complete receipt chain.");
}
const receiptSet = new Set(acceptance.requiredReceipts);
if (receiptSet.size !== acceptance.requiredReceipts.length) fail("Continuous authority receipt list contains duplicates.");
for (const format of [
  expectedFormats.executionCandidate,
  expectedFormats.embodiedSession,
  expectedFormats.actionReceipt,
  expectedFormats.actionNarrativeIngestion,
]) {
  if (!receiptSet.has(format)) fail(`Required receipt ${format} is absent.`);
}

function git(repo, command, options = {}) {
  const result = spawnSync("git", ["-C", repo, ...command], { encoding: "utf8" });
  if (!options.allowFailure && result.status !== 0) {
    fail(`git -C ${repo} ${command.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}
function repositoryRoot(raw, label) {
  const path = realpathSync(resolve(raw));
  if (!existsSync(resolve(path, ".git"))) fail(`${label} is not a Git checkout: ${path}`);
  return path;
}
function exactHead(repo, expected, label) {
  const head = git(repo, ["rev-parse", "HEAD"]).stdout.trim();
  if (head !== expected) fail(`${label} expected ${expected}, checked out ${head}.`);
  return head;
}
function requireAncestor(repo, ancestor, descendant, label) {
  const result = git(repo, ["merge-base", "--is-ancestor", ancestor, descendant], { allowFailure: true });
  if (result.status !== 0) fail(`${label}: ${ancestor} is not an ancestor of ${descendant}.`);
}
function requireClean(repo, label) {
  const status = git(repo, ["status", "--porcelain"]).stdout.trim();
  if (status) fail(`${label} checkout is dirty:\n${status}`);
}
function requireFiles(repo, paths, label) {
  for (const path of paths) {
    if (!existsSync(resolve(repo, path))) fail(`${label} required file is absent: ${path}`);
  }
}

const receipt = {
  format: "rodoh-continuous-authority-verification/1",
  status: "pass",
  lock: normalizedPath(relative(process.cwd(), lockPath)),
  lockFormat: lock.format,
  mode: "static",
  repositories: {},
  formats: expectedFormats,
  physicalReceiptRequired: true,
  bookIVActivated: false,
};

const worldPath = option("--world");
const arcPath = option("--arc");
const embodiedPath = option("--embodied");
if ([worldPath, arcPath, embodiedPath].some(Boolean) && ![worldPath, arcPath, embodiedPath].every(Boolean)) {
  fail("--world, --arc, and --embodied must be supplied together.");
}

if (worldPath && arcPath && embodiedPath) {
  receipt.mode = "exact-checkouts";
  const worldRepo = repositoryRoot(worldPath, "World");
  const arcRepo = repositoryRoot(arcPath, "Arc");
  const embodiedRepo = repositoryRoot(embodiedPath, "Embodied");

  const worldHead = git(worldRepo, ["rev-parse", "HEAD"]).stdout.trim();
  requiredCommit(worldHead, "World head");
  requireAncestor(worldRepo, world.receiverCommit, worldHead, "World receiver ancestry");
  requireClean(worldRepo, "World");
  requireFiles(worldRepo, [
    "scripts/run-first-charter-action.ps1",
    "scripts/run-unity-action-estate-v3.ps1",
    "scripts/complete-embodied-action-session.ps1",
  ], "World");

  const arcHead = exactHead(arcRepo, arc.continuousAuthorityCommit, "Arc continuous authority");
  requireAncestor(arcRepo, arc.actionAuthorityCommit, arcHead, "Arc action authority ancestry");
  requireAncestor(arcRepo, arc.narrativeBaselineCommit, arcHead, "Arc narrative authority ancestry");
  requireClean(arcRepo, "Arc");
  requireFiles(arcRepo, [
    "src/engine/action/receipt.ts",
    "src/narrative/action-receipt-seam.ts",
    "tests/narrative/action-receipt-seam.test.ts",
  ], "Arc");

  const embodiedHead = exactHead(embodiedRepo, embodied.closureCommit, "Embodied closure");
  requireAncestor(embodiedRepo, embodied.functionalCommit, embodiedHead, "Embodied functional custody ancestry");
  requireClean(embodiedRepo, "Embodied");
  requireFiles(embodiedRepo, [
    "src/axm_embodied/action_session.py",
    "src/axm_embodied/action_spool.py",
    "src/axm_embodied/strict_json.py",
  ], "Embodied");

  receipt.repositories = {
    world: { head: worldHead, receiverCommit: world.receiverCommit },
    arc: {
      head: arcHead,
      actionAuthorityCommit: arc.actionAuthorityCommit,
      narrativeBaselineCommit: arc.narrativeBaselineCommit,
    },
    embodied: { head: embodiedHead, functionalCommit: embodied.functionalCommit },
  };
}

const outputPath = option("--output");
const text = `${JSON.stringify(receipt, null, 2)}\n`;
if (outputPath) {
  const resolved = resolve(outputPath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, text);
}
process.stdout.write(text);
