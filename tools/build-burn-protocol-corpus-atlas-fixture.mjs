#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const output = resolve(process.argv[2] ?? "burn-protocol-corpus-atlas-fixture");
mkdirSync(output, { recursive: true });

const CARTRIDGE_ID = "burn-protocol-disclosure-probe";
const CARTRIDGE_DIGEST = "cart1_870f3dfcab909fc9aace115e2c46cd30268339f80bc87a14f0eebcc4e2c28c3e";
const PUBLICATION_HEAD = "4b076089f9b7ae1949ba8fac45f2373aeeb5b344";
const PARENT_SHA256 = "b3b299e14d8c22cde88629eb6bc4d197b8f8015eec7bf46b95f0de2a31b5f0df";
const RELATIONSHIP = "supplemental-external-evidence-does-not-change-authored-identity";
const BOUNDARY = {
  inheritedHistory: "read-only",
  liveRuns: "counterfactual-only",
  panelPayloads: "not-present",
  storyChanges: "none",
};

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function write(name, bytes) {
  const path = resolve(output, name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { path, relativePath: name.replaceAll("\\", "/"), bytes: Buffer.byteLength(bytes), sha256: sha256(bytes) };
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

const definitions = [
  ["assets/E12-C2-P20.png", "panel-raster"],
  ["assets/E12-C3-P01.png", "panel-raster"],
  ["assets/E12-C3-P02.png", "panel-raster"],
  ["assets/E12-C3-PLATE-01.png", "scroll-plate"],
  ["assets/EP13/CH1/PANEL-01.png", "panel-raster"],
  ["evidence/contact-sheet.png", "visual-evidence"],
];

const writtenAssets = definitions.map(([path, classification]) => ({
  ...write(path, png),
  classification,
}));
const counts = {};
for (const asset of writtenAssets) counts[asset.classification] = (counts[asset.classification] ?? 0) + 1;
const indexedBytes = writtenAssets.reduce((sum, asset) => sum + asset.bytes, 0);

const indexText = json({
  format: "burn-protocol-corpus-asset-index/1",
  generatedFrom: "verified nested v0.58.0 manifest",
  counts,
  assets: writtenAssets.map((asset) => ({
    path: asset.relativePath,
    sha256: asset.sha256,
    bytes: asset.bytes,
    classification: asset.classification,
  })),
});
const index = write("corpus-asset-index.json", indexText);

const cartridge = {
  id: CARTRIDGE_ID,
  version: "0.1.1",
  engineVersion: "1.3.0",
  sourcePlane: "common-ship-pocket/1",
  authoredArcDigest: CARTRIDGE_DIGEST,
  exactParentSha256: PARENT_SHA256,
  publicationAuthorityHead: PUBLICATION_HEAD,
};

const overlayText = json({
  format: "burn-protocol-handoff-publication-overlay/1",
  status: "pass",
  classification: "mechanism-fixture-external-custody",
  evidenceTier: "mechanism-fixture",
  controlQuestion: "Can a manifest-derived atlas widen the visible Burn corpus without allowing metadata or presentation to become authored law?",
  authoredBoundary: BOUNDARY,
  cartridge,
  externalCustody: {
    relationship: RELATIONSHIP,
    runtimeBundling: "none",
    handoff: {
      sha256: "f34ab8f692baac30afbad870d033376e587554324f4edc0bfdaad781de8c2dc1",
      bytes: 7084,
      entries: 24,
    },
    parent: {
      sha256: "2f1206eab4a8614eeb5f89565b594e2be38c2d4f266d15fbcc79555666b15fd4",
      bytes: 934,
      entries: 4,
      manifestRecords: 3,
      manifestUncompressedBytes: 131,
    },
    assetIndex: {
      sha256: index.sha256,
      assets: writtenAssets.length,
      bytes: indexedBytes,
      counts,
    },
  },
  sourceEvidence: {
    approvalSha256: "feac7050e9e67be6c276bb1138c4c84abda62f4d92e78ca62317f111bb54f423",
    intakeContractSha256: "cf3aa418f42a56bbf5fcdbb885982cae7ca8ee19ed3e41be193ed9bd0b21dc86",
    intakeReceiptSha256: "1dc84859c0af5d9ac07c6a5e3cb358dbdbefd251f11f15f935bc0b6540a9d61f",
    publicationReceiptSha256: "fd32d604d56b2268a49419497210c5ac602ec28de2edeba1baa44ec7a082e0e2",
  },
});
const overlay = write("burn-protocol-handoff-publication-overlay.json", overlayText);

const receiptText = json({
  format: "burn-protocol-handoff-publication-activation-receipt/1",
  status: "pass",
  evidenceTier: "mechanism-fixture",
  cartridge,
  authority: {
    authoredBoundary: BOUNDARY,
    custodyRelation: RELATIONSHIP,
    runtimeBundling: "none",
  },
  externalAssets: {
    sha256: index.sha256,
    assets: writtenAssets.length,
    bytes: indexedBytes,
    counts,
  },
  overlay: {
    path: basename(overlay.path),
    sha256: overlay.sha256,
    bytes: overlay.bytes,
  },
});
const receipt = write("handoff-publication-activation-receipt.json", receiptText);

const ledgerEntries = [...writtenAssets, index, overlay, receipt];
writeFileSync(
  resolve(output, "SHA256SUMS"),
  `${ledgerEntries.map((entry) => `${entry.sha256}  ${entry.relativePath}`).join("\n")}\n`,
);

console.log(json({
  format: "burn-protocol-corpus-atlas-fixture/1",
  output,
  assets: writtenAssets.map((asset) => ({ path: asset.relativePath, sha256: asset.sha256, bytes: asset.bytes, classification: asset.classification })),
  index: { sha256: index.sha256, bytes: index.bytes },
  overlay: { sha256: overlay.sha256, bytes: overlay.bytes },
  receipt: { sha256: receipt.sha256, bytes: receipt.bytes },
}).trimEnd());
