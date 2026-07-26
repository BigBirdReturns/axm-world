#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(message);
  process.exit(1);
}
const args = process.argv.slice(2);
function values(name) {
  const out = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
    out.push(value);
    index += 1;
  }
  return out;
}
function option(name, fallback = null) {
  return values(name)[0] ?? fallback;
}
function flag(name) {
  return args.includes(name);
}
function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}
function isWithin(rootPath, candidatePath) {
  const root = normalizePath(rootPath);
  const candidate = normalizePath(candidatePath);
  return candidate === root || candidate.startsWith(`${root}/`);
}
function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function parseJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const root = resolve(option("--root") ?? ".");
if (!existsSync(root)) fail(`Evidence root is absent: ${root}`);
const rootReal = realpathSync(root);

function containedPath(raw, label, mustExist = true) {
  const resolved = resolve(root, raw);
  if (!isWithin(root, resolved)) fail(`${label} escapes evidence root: ${raw}`);
  if (mustExist && !existsSync(resolved)) fail(`${label} is absent: ${raw}`);
  if (existsSync(resolved)) {
    const real = realpathSync(resolved);
    if (!isWithin(rootReal, real)) fail(`${label} resolves outside evidence root: ${raw}`);
  }
  return resolved;
}
function evidenceName(path) {
  const name = normalizePath(relative(root, path));
  if (!name || name === ".." || name.startsWith("../") || isAbsolute(name)) {
    fail(`Evidence path has no contained relative name: ${path}`);
  }
  return name;
}
function requireCommit(value, label) {
  if (value !== null && !/^[0-9a-f]{40}$/.test(value)) fail(`${label} must be a 40-character lowercase Git SHA.`);
  return value;
}

const sumsPath = containedPath(option("--sums") ?? "SHA256SUMS", "Checksum ledger");
const provenancePath = containedPath(option("--provenance") ?? "provenance.intoto.json", "Provenance statement");
const sumsName = evidenceName(sumsPath);
const provenanceName = evidenceName(provenancePath);
const expectedSubjects = values("--require-subject");
const expectedSboms = values("--require-sbom");
const exactSubjects = flag("--exact-subjects");
const exactSboms = flag("--exact-sboms");
const expectedRepository = option("--expected-repository");
const expectedWorkflow = option("--expected-workflow");
const expectedWorldCommit = requireCommit(option("--world-commit"), "Expected World commit");
const expectedArcCommit = requireCommit(option("--arc-commit"), "Expected Arc commit");

const checked = new Map();
for (const [lineNumber, line] of readFileSync(sumsPath, "utf8").split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
  if (!match) fail(`Malformed SHA256SUMS line ${lineNumber + 1}.`);
  const name = match[2];
  if (name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name) || name === ".." || name.startsWith("../")) {
    fail(`Checksum ledger contains a non-canonical path: ${name}`);
  }
  if (checked.has(name)) fail(`Checksum ledger repeats path: ${name}`);
  const path = containedPath(name, "Checksummed file");
  const actual = sha256(path);
  if (actual !== match[1]) fail(`Checksum mismatch for ${name}: expected ${match[1]}, got ${actual}`);
  checked.set(name, { path, sha256: actual });
}
if (checked.size === 0) fail("Checksum ledger is empty.");
if (!checked.has(provenanceName)) fail(`Checksum ledger does not cover provenance: ${provenanceName}`);
if (checked.has(sumsName)) fail("SHA256SUMS must not recursively checksum itself.");

const statement = parseJson(provenancePath, "Provenance statement");
if (statement?._type !== "https://in-toto.io/Statement/v1") fail("Provenance is not an in-toto Statement v1.");
if (statement?.predicateType !== "https://slsa.dev/provenance/v1") fail("Provenance predicate is not SLSA provenance v1.");
if (!Array.isArray(statement.subject) || statement.subject.length === 0) fail("Provenance has no subjects.");
const subjectNames = new Set();
for (const subject of statement.subject) {
  if (!subject || typeof subject.name !== "string") fail("Provenance subject has no name.");
  if (subjectNames.has(subject.name)) fail(`Provenance repeats subject: ${subject.name}`);
  subjectNames.add(subject.name);
  const checkedSubject = checked.get(subject.name);
  if (!checkedSubject) fail(`Provenance subject is not covered by SHA256SUMS: ${subject.name}`);
  const expected = subject?.digest?.sha256;
  if (!/^[0-9a-f]{64}$/.test(expected ?? "")) fail(`Provenance subject has no SHA-256: ${subject.name}`);
  if (checkedSubject.sha256 !== expected) fail(`Provenance subject mismatch for ${subject.name}.`);
}
for (const expected of expectedSubjects) {
  if (!subjectNames.has(expected)) fail(`Required provenance subject is absent: ${expected}`);
}
if (exactSubjects && subjectNames.size !== expectedSubjects.length) {
  fail(`Provenance subject set is not exact: expected ${expectedSubjects.length}, got ${subjectNames.size}`);
}

const buildDefinition = statement?.predicate?.buildDefinition;
const external = buildDefinition?.externalParameters;
const internal = buildDefinition?.internalParameters;
if (!buildDefinition || typeof buildDefinition !== "object") fail("Provenance has no build definition.");
if (expectedRepository && external?.repository !== expectedRepository) {
  fail(`Provenance repository mismatch: expected ${expectedRepository}, got ${String(external?.repository)}`);
}
if (expectedWorldCommit && external?.commit !== expectedWorldCommit) {
  fail(`Provenance World commit mismatch: expected ${expectedWorldCommit}, got ${String(external?.commit)}`);
}
if (expectedArcCommit && external?.arcCommit !== expectedArcCommit) {
  fail(`Provenance Arc commit mismatch: expected ${expectedArcCommit}, got ${String(external?.arcCommit)}`);
}
if (expectedWorkflow && internal?.workflow !== expectedWorkflow) {
  fail(`Provenance workflow mismatch: expected ${expectedWorkflow}, got ${String(internal?.workflow)}`);
}

const sboms = [...checked.keys()].filter((name) => name.endsWith(".cdx.json")).sort();
for (const name of sboms) {
  const document = parseJson(checked.get(name).path, `SBOM ${name}`);
  if (document?.bomFormat !== "CycloneDX" || document?.specVersion !== "1.7" || document?.version !== 1) {
    fail(`Unsupported SBOM format: ${name}`);
  }
  if (!Array.isArray(document.components) || document.components.length === 0) fail(`SBOM has no components: ${name}`);
  if (!Array.isArray(document.dependencies) || document.dependencies.length === 0) fail(`SBOM has no dependency graph: ${name}`);
  const commit = document?.metadata?.component?.properties
    ?.find?.((entry) => entry?.name === "rodoh:source-commit")?.value;
  if (name.endsWith("axm-world.cdx.json") && expectedWorldCommit && commit !== expectedWorldCommit) {
    fail(`World SBOM source commit mismatch: ${String(commit)}`);
  }
  if (name.endsWith("axm-arc.cdx.json") && expectedArcCommit && commit !== expectedArcCommit) {
    fail(`Arc SBOM source commit mismatch: ${String(commit)}`);
  }
}
for (const expected of expectedSboms) {
  if (!sboms.includes(expected)) fail(`Required SBOM is absent: ${expected}`);
}
if (exactSboms && sboms.length !== expectedSboms.length) {
  fail(`SBOM set is not exact: expected ${expectedSboms.length}, got ${sboms.length}`);
}

const repo = option("--repo") ?? "BigBirdReturns/axm-world";
const bundleRaw = option("--bundle");
const trustedRootRaw = option("--trusted-root");
const attestedSubject = option("--attested-subject");
const predicateType = option("--predicate-type");
const signerWorkflow = option("--signer-workflow");
const sourceDigest = requireCommit(option("--source-digest"), "Signature source digest");
const sourceRef = option("--source-ref");
const requireSignature = flag("--require-signature");
let signature = { attempted: false, verified: false, subject: null, predicateType: null };
if (bundleRaw || trustedRootRaw || attestedSubject || predicateType || signerWorkflow || sourceDigest || sourceRef || requireSignature) {
  signature.attempted = true;
  if (!bundleRaw || !trustedRootRaw) fail("Offline signature verification requires both --bundle and --trusted-root.");
  const bundlePath = containedPath(bundleRaw, "Attestation bundle");
  const trustedRootPath = containedPath(trustedRootRaw, "Trusted root");
  const bundleName = evidenceName(bundlePath);
  const trustedRootName = evidenceName(trustedRootPath);
  if (!checked.has(bundleName)) fail(`Checksum ledger does not cover attestation bundle: ${bundleName}`);
  if (!checked.has(trustedRootName)) fail(`Checksum ledger does not cover trusted root: ${trustedRootName}`);

  const artifact = attestedSubject
    ?? (subjectNames.has("artifacts/rodoh-world-game.tar.gz") ? "artifacts/rodoh-world-game.tar.gz" : null);
  if (!artifact || !subjectNames.has(artifact)) fail(`Attested subject is absent from provenance: ${artifact ?? "<unspecified>"}`);

  const ghArgs = [
    "attestation", "verify", checked.get(artifact).path,
    "--repo", repo,
    "--bundle", bundlePath,
    "--custom-trusted-root", trustedRootPath,
    "--format", "json",
  ];
  if (predicateType) ghArgs.push("--predicate-type", predicateType);
  if (signerWorkflow) ghArgs.push("--signer-workflow", signerWorkflow);
  if (sourceDigest) ghArgs.push("--source-digest", sourceDigest);
  if (sourceRef) ghArgs.push("--source-ref", sourceRef);
  const result = spawnSync("gh", ghArgs, { encoding: "utf8", shell: process.platform === "win32" });
  if (result.error) fail(`Could not launch GitHub attestation verifier: ${result.error.message}`);
  if (result.status !== 0) fail(`GitHub attestation verification failed.\n${result.stdout}\n${result.stderr}`);
  signature = { attempted: true, verified: true, subject: artifact, predicateType };
}

console.log(JSON.stringify({
  format: "rodoh-offline-evidence-verification/2",
  root,
  filesChecked: checked.size,
  provenanceSubjects: subjectNames.size,
  sboms: sboms.length,
  signature,
  status: "pass",
}, null, 2));
