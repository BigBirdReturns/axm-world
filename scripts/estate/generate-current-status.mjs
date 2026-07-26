#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

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

const repoRoot = resolve(option("--repo") ?? process.cwd());
const estateRoot = resolve(option("--estate-root") ?? resolve(repoRoot, ".."));
const jsonOutput = resolve(option("--output-json") ?? resolve(estateRoot, ".rodoh-estate/receipts/current-estate-status.json"));
const markdownOutput = resolve(option("--output-markdown") ?? resolve(estateRoot, ".rodoh-estate/receipts/CURRENT_ESTATE_STATUS.md"));

function text(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}
function json(path) {
  return JSON.parse(text(path));
}
function git(...command) {
  const result = spawnSync("git", ["-C", repoRoot, ...command], { encoding: "utf8" });
  if (result.status !== 0) fail(`git ${command.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}
function optionalJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { invalid: true };
  }
}
function parseVendoredFrom(source) {
  const commit = /^commit:\s*([0-9a-f]{40})$/m.exec(source)?.[1];
  const repository = /^repo:\s*(.+)$/m.exec(source)?.[1]?.trim();
  const paths = /^paths:\s*(.+)$/m.exec(source)?.[1]?.trim().split(/\s+/) ?? [];
  if (!commit || !repository || paths.length === 0) fail("src/engine/VENDORED_FROM is malformed.");
  return { repository, commit, paths };
}
function parseBundledDigests(source) {
  return Object.fromEntries([...source.matchAll(/"([^"]+)":\s*"(cart1_[0-9a-f]{64})"/g)].map((match) => [match[1], match[2]]));
}
function has(path) {
  return existsSync(resolve(repoRoot, path));
}
function receipt(path, expectedFormat) {
  const value = optionalJson(resolve(estateRoot, path));
  return {
    path,
    present: value !== null,
    valid: !!value && !value.invalid && value.format === expectedFormat && value.status === "pass",
    format: value && !value.invalid ? value.format ?? null : null,
    worldCommit: value && !value.invalid ? value.worldCommit ?? value.worldHead ?? value.world?.head ?? null : null,
    arcCommit: value && !value.invalid ? value.arcCommit ?? value.arcHead ?? value.arc?.head ?? null : null,
    operatingSystem: value && !value.invalid ? value.operatingSystem ?? null : null,
    edgeVersion: value && !value.invalid ? value.edgeVersion ?? null : null,
    nvdaVersion: value && !value.invalid ? value.nvdaVersion ?? null : null,
    nodeVersion: value && !value.invalid ? value.nodeVersion ?? value.node ?? null : null,
    npmVersion: value && !value.invalid ? value.npmVersion ?? value.npm ?? null : null,
    playwrightVersion: value && !value.invalid ? value.playwrightVersion ?? null : null,
  };
}

const pkg = json("package.json");
const lock = json("estate/estate.lock.json");
const publication = json("estate/publication/PUBLICATION_MANIFEST.json");
const vendored = parseVendoredFrom(text("src/engine/VENDORED_FROM"));
const products = {
  ...parseBundledDigests(text("src/world/bundled-digests.ts")),
  "orchard-at-low-tide": json("cartridges/clean-room/manifest.json").cartridgeDigest,
};
const worldCommit = git("rev-parse", "HEAD");
const branch = git("branch", "--show-current");
const dirty = git("status", "--porcelain") !== "";
const arcProductAuthority = lock.repositories.arc.productAuthorityCommit ?? lock.repositories.arc.requiredAncestor;
const arcReleaseEvidence = lock.repositories.arc.requiredCommit;
const arcPackageVersion = lock.repositories.arc.packageVersion;

if (typeof arcProductAuthority !== "string" || !/^[0-9a-f]{40}$/.test(arcProductAuthority)) {
  fail("estate.lock.json does not name an exact Arc productAuthorityCommit.");
}
if (typeof arcReleaseEvidence !== "string" || !/^[0-9a-f]{40}$/.test(arcReleaseEvidence)) {
  fail("estate.lock.json does not name an exact Arc requiredCommit for release evidence.");
}
if (typeof arcPackageVersion !== "string" || arcPackageVersion.length === 0) {
  fail("estate.lock.json does not name the Arc package version.");
}

const capabilities = {
  fiveFirstPartyPrograms: Object.keys(parseBundledDigests(text("src/world/bundled-digests.ts"))).length === 5,
  cleanRoomCartridge: has("cartridges/clean-room/orchard-at-low-tide.arc.json"),
  secondRecension: has("src/godscar/second-recension.ts") && has("docs/SECOND_RECENSION_BOOKS_I-III_ALIGNMENT.md"),
  localEstateReplication: has("RODOH.cmd") && has("scripts/local-estate/Invoke-RodohEstate.ps1"),
  holderEstateCustody: has("src/world/holder-estate.ts") && has("docs/HOLDER_ESTATE_V1.md"),
  boundedJsonImports:
    has("src/engine/bounded-json.ts") &&
    has("tests/engine/bounded-json.test.ts") &&
    has("tests/engine/bounded-json-fuzz.test.ts"),
  cart1Canonicalization:
    has("docs/conformance/cart1-v1-vectors.json") &&
    has("tests/engine/cart1-conformance-vectors.test.ts"),
  supplyChainEvidence: has("scripts/supply-chain/generate-cyclonedx.mjs") && has(".github/workflows/supply-chain-evidence.yml"),
  browserSupportMatrix: has("docs/SUPPORT_MATRIX.md") && has("playwright.support.config.ts"),
  performanceBudgets: has("docs/performance/RODOH_PERFORMANCE_BUDGETS.json") && has("scripts/performance/audit-static-build.mjs"),
  canonTrace: has("docs/canon/GODSCAR_CANON_TRACE.json") && has("tests/world/canon-trace.test.ts"),
  creatorRecoveryKitContractPinned: typeof arcReleaseEvidence === "string",
};

const localOperator = receipt(".rodoh-estate/receipts/local-operator-acceptance.json", "rodoh-local-operator-acceptance/1");
const nvdaEdge = receipt(".rodoh-estate/receipts/nvda-edge-acceptance.json", "rodoh-nvda-edge-acceptance/1");
const windowsReplication = receipt(".rodoh-estate/receipts/windows-replication.json", "rodoh-windows-replication-receipt/1");

const registry = text("src/source-planes/registry.ts");
const programs = text("src/world/program-of-record.ts");
const bookIV = {
  publicationCanon: publication.volumes?.some((volume) => volume.id === "book-iv-lineage-commons") ?? false,
  runtimeRegistered: /lineage[- ]commons|book[- ]?iv/i.test(registry),
  programAssigned: /Program 006|PROGRAM 006|lineage[- ]commons/i.test(programs),
  status: "staged-post-1.0",
};
if (bookIV.runtimeRegistered || bookIV.programAssigned) bookIV.status = "implemented";

const blockers = [];
if (pkg.version !== "1.0.0") blockers.push(`World package version is ${pkg.version}, not 1.0.0.`);
if (arcPackageVersion !== "1.0.0") blockers.push(`Arc package version is ${arcPackageVersion}, not 1.0.0.`);
if (dirty) blockers.push("World checkout is dirty.");
if (!localOperator.valid) blockers.push("Local operator acceptance receipt is absent or invalid.");
if (!windowsReplication.valid) blockers.push("Windows replication receipt is absent or invalid.");
if (!nvdaEdge.valid) blockers.push("NVDA and Edge acceptance receipt is absent or invalid.");

function reconcileReceipt(label, entry) {
  if (!entry.valid) return;
  if (!entry.worldCommit) blockers.push(`${label} receipt does not name an exact World commit.`);
  else if (entry.worldCommit !== worldCommit) blockers.push(`${label} receipt names World ${entry.worldCommit}, not ${worldCommit}.`);
  if (!entry.arcCommit) blockers.push(`${label} receipt does not name an exact Arc commit.`);
  else if (entry.arcCommit !== arcReleaseEvidence) {
    blockers.push(`${label} receipt names Arc ${entry.arcCommit}, not ${arcReleaseEvidence}.`);
  }
}
reconcileReceipt("Local operator", localOperator);
reconcileReceipt("Windows replication", windowsReplication);
reconcileReceipt("NVDA and Edge", nvdaEdge);

if (vendored.commit !== arcProductAuthority) {
  blockers.push(`Vendored Arc product authority ${vendored.commit} does not match estate lock ${arcProductAuthority}.`);
}
if (!Object.values(capabilities).every(Boolean)) blockers.push("One or more required estate capabilities are not present in this checkout.");

const status = {
  format: "rodoh-current-estate-status/1",
  generatedAt: new Date().toISOString(),
  repositories: {
    world: {
      repository: "BigBirdReturns/axm-world",
      branch,
      commit: worldCommit,
      dirty,
      packageVersion: pkg.version,
    },
    arc: {
      repository: vendored.repository,
      vendoredCommit: vendored.commit,
      productAuthorityCommit: arcProductAuthority,
      releaseEvidenceCommit: arcReleaseEvidence,
      requiredBranch: lock.repositories.arc.branch,
      vendoredPaths: vendored.paths,
      packageVersion: arcPackageVersion,
    },
  },
  protocols: lock.protocols,
  products,
  capabilities,
  localEvidence: {
    windowsReplication,
    localOperator,
    nvdaEdge,
  },
  release: {
    target: lock.releaseTarget,
    packageVersion: pkg.version,
    arcPackageVersion,
    ready: blockers.length === 0,
    blockers,
  },
  bookIV,
};

const markdown = `# Current RODOH estate status\n\nGenerated from exact local repository facts at \`${status.generatedAt}\`. GitHub issue state is discovery metadata; it is not substituted for source, tests, receipts, or exact content identity.\n\n## Repository pair\n\n| Plane | Identity | Version | Condition |\n|---|---|---:|---|\n| World | \`${worldCommit}\` on \`${branch || "detached"}\` | \`${pkg.version}\` | ${dirty ? "dirty" : "clean"} |\n| Arc product authority | \`${arcProductAuthority}\` | \`${arcPackageVersion}\` | vendored \`${vendored.commit}\` |\n| Arc release evidence | \`${arcReleaseEvidence}\` on \`${lock.repositories.arc.branch}\` | \`${arcPackageVersion}\` | coordinated receipt identity |\n\n## Capabilities\n\n${Object.entries(capabilities).map(([name, present]) => `- [${present ? "x" : " "}] \`${name}\``).join("\n")}\n\n## Local evidence\n\n| Receipt | Present | Valid | World | Arc |\n|---|---|---|---|---|\n${[windowsReplication, localOperator, nvdaEdge].map((entry) => `| \`${entry.path}\` | ${entry.present ? "yes" : "no"} | ${entry.valid ? "yes" : "no"} | ${entry.worldCommit ?? "—"} | ${entry.arcCommit ?? "—"} |`).join("\n")}\n\n## Release\n\n**Target:** ${lock.releaseTarget}\n\n**Ready:** ${status.release.ready ? "yes" : "no"}\n\n${blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "No recorded blockers."}\n\n## Book IV\n\nPublication canon: ${bookIV.publicationCanon ? "yes" : "no"}. Runtime registered: ${bookIV.runtimeRegistered ? "yes" : "no"}. Program assigned: ${bookIV.programAssigned ? "yes" : "no"}. Current boundary: **${bookIV.status}**.\n`;

for (const path of [jsonOutput, markdownOutput]) mkdirSync(dirname(path), { recursive: true });
writeFileSync(jsonOutput, `${JSON.stringify(status, null, 2)}\n`);
writeFileSync(markdownOutput, markdown);
console.log(JSON.stringify({
  format: "rodoh-current-estate-status-generation/1",
  json: relative(process.cwd(), jsonOutput),
  markdown: relative(process.cwd(), markdownOutput),
  ready: status.release.ready,
  blockers: blockers.length,
}, null, 2));
