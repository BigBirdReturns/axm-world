#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const argv = process.argv.slice(2);

function fail(message) {
  throw new Error(message);
}

function option(name, fallback = null) {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
  return value;
}

function requiredOption(name) {
  return option(name) ?? fail(`${name} is required.`);
}

function compareCodepoints(a, b) {
  const left = a[Symbol.iterator]();
  const right = b[Symbol.iterator]();
  while (true) {
    const l = left.next();
    const r = right.next();
    if (l.done || r.done) return l.done === r.done ? 0 : l.done ? -1 : 1;
    const lcp = l.value.codePointAt(0);
    const rcp = r.value.codePointAt(0);
    if (lcp !== rcp) return lcp < rcp ? -1 : 1;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(compareCodepoints)
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function canonicalString(value) {
  return JSON.stringify(canonical(value));
}

function canonicalText(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value) {
  return Buffer.from(canonicalText(value), "utf8");
}

function writeBytes(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return {
    path: basename(path),
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function projection(value, keys) {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

const outputRoot = resolve(requiredOption("--output"));
const productionContractPath = resolve(requiredOption("--production-contract"));
const publicationReceiptPath = resolve(requiredOption("--publication-receipt"));
const production = readJson(productionContractPath);
const publicationReceipt = readJson(publicationReceiptPath);
if (production.format !== "burn-protocol-handoff-publication-activation-contract/1") {
  fail(`Unexpected production contract format ${String(production.format)}.`);
}
if (publicationReceipt.format !== "rodoh-corpus-publication-receipt/1" || publicationReceipt.status !== "pass") {
  fail("Publication receipt is not a passing Rodoh corpus publication receipt.");
}
if (production.publication.cartridgeId !== publicationReceipt.cartridgeId) fail("Publication cartridge id drift.");
if (production.publication.engineVersion !== publicationReceipt.engineVersion) fail("Publication engine version drift.");
if (production.publication.sourcePlane !== publicationReceipt.sourcePlane) fail("Publication source-plane drift.");
if (production.publication.exactParentSha256 !== publicationReceipt.exactParentSha256) fail("Publication parent drift.");

const validRoot = join(outputRoot, "valid");
const tamperedRoot = join(outputRoot, "tampered-asset");
mkdirSync(validRoot, { recursive: true });

const panelPath = "assets/E12-C3-P01.svg";
const panelBytes = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Synthetic Burn receiver fixture panel">\n` +
  `<rect width="960" height="540" fill="#0b0a08"/>\n` +
  `<path d="M70 410C210 300 340 330 480 220s280-80 410-160" fill="none" stroke="#c9a14a" stroke-width="12"/>\n` +
  `<circle cx="480" cy="220" r="72" fill="#173338" stroke="#74ad77" stroke-width="8"/>\n` +
  `<text x="70" y="90" fill="#ece4d4" font-family="monospace" font-size="34">MECHANISM FIXTURE · EXTERNAL CUSTODY</text>\n` +
  `<text x="70" y="470" fill="#a59c8b" font-family="monospace" font-size="26">No canonical panel payload is stored in World.</text>\n` +
  `</svg>\n`,
  "utf8",
);
writeBytes(join(validRoot, panelPath), panelBytes);

const assetIndex = {
  format: "burn-protocol-corpus-asset-index/1",
  generatedFrom: "verified nested v0.58.0 manifest",
  counts: { "panel-raster": 1 },
  assets: [{
    path: panelPath,
    sha256: sha256Bytes(panelBytes),
    bytes: panelBytes.length,
    classification: "panel-raster",
  }],
};
const assetIndexRecord = writeBytes(join(validRoot, "corpus-asset-index.json"), jsonBytes(assetIndex));

const fixtureHandoff = {
  sha256: sha256Bytes(Buffer.from("burn-holder-fixture-handoff-v1", "utf8")),
  bytes: 7_084,
  entries: 24,
};
const fixtureParent = {
  sha256: sha256Bytes(Buffer.from("burn-holder-fixture-parent-v1", "utf8")),
  bytes: 934,
  entries: 4,
  manifestRecords: 3,
  manifestUncompressedBytes: 131,
};
const intakeAuthority = {
  inheritedHistory: "read-only",
  liveRuns: "counterfactual-only",
  storyChanges: "none",
};
const intakeContract = {
  format: "burn-protocol-handoff-intake-contract/1",
  handoff: fixtureHandoff,
  parent: fixtureParent,
  outerManifest: { records: 23 },
  authority: intakeAuthority,
};
const intakeContractRecord = writeBytes(
  join(validRoot, "holder-fixture.intake.contract.json"),
  jsonBytes(intakeContract),
);
const intakeReceipt = {
  format: "burn-protocol-handoff-intake-receipt/1",
  status: "pass",
  contract: intakeContractRecord,
  handoff: { ...fixtureHandoff, path: "fixture-handoff.zip" },
  parent: { ...fixtureParent, path: "fixture-parent.zip", manifest: "v0.58.0-file-manifest.json" },
  outerManifest: { path: "handoff-manifest.json", records: 23, uncompressedBytes: 3_080 },
  assetIndex: { path: assetIndexRecord.path, assets: 1, counts: assetIndex.counts },
  authority: intakeAuthority,
};
const intakeReceiptRecord = writeBytes(
  join(validRoot, "handoff-intake-receipt.json"),
  jsonBytes(intakeReceipt),
);

const approvalCore = {
  format: "burn-protocol-handoff-publication-approval/1",
  status: "approved",
  source: "verified-handoff-intake-output",
  intakeContract: intakeContractRecord,
  intakeReceipt: intakeReceiptRecord,
  assetIndex: { ...assetIndexRecord, assets: 1, counts: assetIndex.counts },
  handoff: fixtureHandoff,
  outerManifest: projection(intakeReceipt.outerManifest, ["records", "uncompressedBytes"]),
  parent: fixtureParent,
  authority: intakeAuthority,
};
const approval = {
  ...approvalCore,
  integrity: {
    algorithm: "sha256",
    digest: `approval1_${sha256Bytes(Buffer.from(canonicalString(approvalCore), "utf8"))}`,
  },
};
const approvalRecord = writeBytes(
  join(validRoot, "handoff-publication-approval.json"),
  jsonBytes(approval),
);

const activationContract = {
  ...production,
  evidenceTier: "mechanism-fixture",
  parentBinding: "fixture-structural-only",
  intake: {
    contractFormat: intakeContract.format,
    handoff: fixtureHandoff,
    outerManifestRecords: 23,
    parent: fixtureParent,
  },
  intakeAuthority,
  output: {
    overlay: "burn-protocol-handoff-publication-overlay.json",
    receipt: "handoff-publication-activation-receipt.json",
  },
};
const activationContractRecord = writeBytes(
  join(validRoot, "holder-fixture.activation.json"),
  jsonBytes(activationContract),
);

const cartridge = {
  id: production.publication.cartridgeId,
  version: production.publication.version,
  engineVersion: production.publication.engineVersion,
  authoredArcDigest: production.publication.cartridgeDigest,
  sourcePlane: production.publication.sourcePlane,
  publicationAuthorityHead: production.publication.arcHead,
  exactParentSha256: production.publication.exactParentSha256,
};
const overlay = {
  format: "burn-protocol-handoff-publication-overlay/1",
  status: "pass",
  evidenceTier: "mechanism-fixture",
  classification: "mechanism-fixture-external-custody",
  cartridge,
  authoredBoundary: production.publicationBoundary,
  externalCustody: {
    relationship: production.authority.custodyRelation,
    runtimeBundling: "none",
    handoff: fixtureHandoff,
    parent: fixtureParent,
    assetIndex: {
      sha256: assetIndexRecord.sha256,
      bytes: assetIndexRecord.bytes,
      assets: 1,
      counts: assetIndex.counts,
    },
  },
  sourceEvidence: {
    intakeContractSha256: intakeContractRecord.sha256,
    intakeReceiptSha256: intakeReceiptRecord.sha256,
    approvalSha256: approvalRecord.sha256,
    publicationReceiptSha256: sha256Bytes(readFileSync(publicationReceiptPath)),
  },
  controlQuestion: "Can public truth produce accountable repair without allowing Starfleet, the former Chain, the hearing, or the archive itself to become the new sovereign owner of the record?",
};
const overlayRecord = writeBytes(
  join(validRoot, "burn-protocol-handoff-publication-overlay.json"),
  jsonBytes(overlay),
);
const activationReceipt = {
  format: "burn-protocol-handoff-publication-activation-receipt/1",
  status: "pass",
  evidenceTier: "mechanism-fixture",
  activationContract: activationContractRecord,
  approval: approvalRecord,
  overlay: overlayRecord,
  cartridge,
  externalAssets: overlay.externalCustody.assetIndex,
  authority: {
    authoredBoundary: overlay.authoredBoundary,
    custodyRelation: overlay.externalCustody.relationship,
    runtimeBundling: "none",
  },
};
const activationReceiptRecord = writeBytes(
  join(validRoot, "handoff-publication-activation-receipt.json"),
  jsonBytes(activationReceipt),
);

cpSync(validRoot, tamperedRoot, { recursive: true });
writeFileSync(join(tamperedRoot, panelPath), Buffer.from(`${panelBytes.toString("utf8")}<!-- changed after approval -->\n`, "utf8"));

const summary = {
  format: "burn-protocol-holder-asset-fixture/1",
  classification: "synthetic-mechanism-test-only",
  productionContract: {
    path: productionContractPath,
    sha256: sha256Bytes(readFileSync(productionContractPath)),
    bytes: statSync(productionContractPath).size,
  },
  publicationReceipt: {
    path: publicationReceiptPath,
    sha256: sha256Bytes(readFileSync(publicationReceiptPath)),
    bytes: statSync(publicationReceiptPath).size,
  },
  cartridge,
  valid: validRoot,
  tamperedAsset: tamperedRoot,
  records: {
    assetIndex: assetIndexRecord,
    intakeContract: intakeContractRecord,
    intakeReceipt: intakeReceiptRecord,
    approval: approvalRecord,
    activationContract: activationContractRecord,
    overlay: overlayRecord,
    activationReceipt: activationReceiptRecord,
    asset: { path: panelPath, sha256: sha256Bytes(panelBytes), bytes: panelBytes.length },
  },
};
writeBytes(join(outputRoot, "fixture-set.json"), jsonBytes(summary));
console.log(canonicalText(summary).trimEnd());
