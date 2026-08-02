// Holder-controlled external Burn evidence.
//
// This module verifies a local activation chain and individually selected asset
// bytes without changing the Arc, the run, or cartridge trust. It deliberately
// owns no persistence and performs no network fetch. A successful result is a
// session-local presentation capability over holder-supplied Blob objects.

import { parseBoundedJson } from "../engine/bounded-json.js";
import { compareCodepoints } from "../engine/determinism.js";

export const BURN_PROTOCOL_CARTRIDGE_ID = "burn-protocol-disclosure-probe" as const;
export const BURN_PROTOCOL_SOURCE_PLANE = "common-ship-pocket/1" as const;

export const BURN_PROTOCOL_PRODUCTION_HANDOFF = {
  sha256: "e96874ca4c753f49eed1c6ecf5db7f924ad4bfa006e242bf426319345dfaedde",
  bytes: 363_384_929,
  entries: 24,
} as const;

export const BURN_PROTOCOL_PRODUCTION_PARENT = {
  sha256: "b3b299e14d8c22cde88629eb6bc4d197b8f8015eec7bf46b95f0de2a31b5f0df",
  bytes: 353_717_668,
  entries: 1_986,
  manifestRecords: 1_985,
  manifestUncompressedBytes: 383_401_783,
} as const;

const MAX_EVIDENCE_JSON_BYTES = 8 * 1024 * 1024;
const MAX_ASSET_BYTES = 128 * 1024 * 1024;
const ALLOWED_CLASSIFICATIONS = new Set([
  "panel-raster",
  "scroll-plate",
  "reader-evidence",
  "visual-evidence",
]);

const REQUIRED_FORMATS = [
  "burn-protocol-handoff-publication-activation-contract/1",
  "burn-protocol-handoff-publication-activation-receipt/1",
  "burn-protocol-handoff-publication-overlay/1",
  "burn-protocol-handoff-publication-approval/1",
  "burn-protocol-handoff-intake-receipt/1",
  "burn-protocol-handoff-intake-contract/1",
  "burn-protocol-corpus-asset-index/1",
] as const;

type RequiredFormat = typeof REQUIRED_FORMATS[number];
export type BurnEvidenceTier = "production-exact-intake" | "mechanism-fixture";

export interface CurrentCartridgeIdentity {
  id: string;
  version: string;
  engineVersion: string;
  authoredArcDigest: string;
  sourcePlane: string | null;
  exactParentSha256: string | null;
}

/** Browser File normalized to the small contract the verifier needs. Tests may
 * provide the same shape with an in-memory Blob. */
export interface HolderAssetFile {
  name: string;
  relativePath: string;
  size: number;
  type: string;
  blob: Blob;
}

export interface VerifiedExternalAsset {
  path: string;
  sha256: string;
  bytes: number;
  classification: string;
  selectedPath: string;
  file: HolderAssetFile;
}

export interface VerifiedBurnExternalAssetSet {
  format: "burn-protocol-holder-asset-session/1";
  evidenceTier: BurnEvidenceTier;
  classification: string;
  controlQuestion: string;
  cartridge: CurrentCartridgeIdentity;
  authority: {
    inheritedHistory: "read-only";
    liveRuns: "counterfactual-only";
    storyChanges: "none";
    authoredPanels: "not-present";
    runtimeBundling: "none";
    custodyRelation: string;
  };
  indexedAssets: number;
  indexedCounts: Record<string, number>;
  verifiedAssets: VerifiedExternalAsset[];
  missingAssets: number;
  ignoredFiles: number;
  evidence: {
    activationContractSha256: string;
    activationReceiptSha256: string;
    overlaySha256: string;
    approvalSha256: string;
    intakeReceiptSha256: string;
    intakeContractSha256: string;
    assetIndexSha256: string;
  };
}

interface ParsedEvidence {
  format: RequiredFormat;
  file: HolderAssetFile;
  path: string;
  bytes: Uint8Array;
  sha256: string;
  document: Record<string, unknown>;
}

interface AssetRecord {
  path: string;
  sha256: string;
  bytes: number;
  classification: string;
}

export function holderAssetFileFromBrowser(file: File): HolderAssetFile {
  return {
    name: file.name,
    relativePath: file.webkitRelativePath || file.name,
    size: file.size,
    type: file.type,
    blob: file,
  };
}

function fail(message: string): never {
  throw new Error(message);
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string.`);
  return value;
}

function requiredInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(`${label} must be a non-negative safe integer.`);
  return value as number;
}

function requiredSha256(value: unknown, label: string): string {
  const digest = requiredString(value, label).replace(/^sha256:/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) fail(`${label} must be a SHA-256 hex digest.`);
  return digest;
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`${label}: expected ${String(expected)}, got ${String(actual)}.`);
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(input)
        .sort(compareCodepoints)
        .filter((key) => input[key] !== undefined)
        .map((key) => [key, canonical(input[key])]),
    );
  }
  return value;
}

function canonicalString(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function assertCanonicalEqual(actual: unknown, expected: unknown, label: string): void {
  if (canonicalString(actual) !== canonicalString(expected)) fail(`${label} does not match.`);
}

function projection(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const source = plainObject(value, label);
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function normalizePath(value: string, label: string): string {
  const path = value.replace(/^\.\//, "");
  if (path.includes("\\")) fail(`${label} uses a backslash: ${path}`);
  if (path.startsWith("/") || /^[A-Za-z]:\//.test(path)) fail(`${label} is absolute: ${path}`);
  const parts = path.split("/").filter((part) => part.length > 0 && part !== ".");
  if (parts.some((part) => part === "..")) fail(`${label} escapes its root: ${path}`);
  if (parts.length === 0) fail(`${label} is empty.`);
  return parts.join("/");
}

function filePath(file: HolderAssetFile): string {
  return normalizePath(file.relativePath || file.name, `Selected file ${file.name}`);
}

function basename(path: string): string {
  return path.split("/").at(-1) ?? path;
}

function isJsonFile(file: HolderAssetFile): boolean {
  return file.name.toLowerCase().endsWith(".json") || file.type === "application/json";
}

async function bytesFor(file: HolderAssetFile): Promise<Uint8Array> {
  const bytes = new Uint8Array(await file.blob.arrayBuffer());
  assertEqual(bytes.byteLength, file.size, `Selected file bytes for ${filePath(file)}`);
  return bytes;
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) fail("This browser cannot verify SHA-256 asset custody.");
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", input));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Text(text: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(text));
}

async function parseEvidenceFiles(files: readonly HolderAssetFile[]): Promise<Map<RequiredFormat, ParsedEvidence>> {
  const found = new Map<RequiredFormat, ParsedEvidence>();
  for (const file of files) {
    if (!isJsonFile(file) || file.size > MAX_EVIDENCE_JSON_BYTES) continue;
    const bytes = await bytesFor(file);
    let parsed: unknown;
    try {
      parsed = parseBoundedJson(new TextDecoder().decode(bytes), { maxBytes: MAX_EVIDENCE_JSON_BYTES });
    } catch {
      // A selected directory may contain unrelated JSON. Required records are
      // identified by their validated format, not by a filename guess.
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const format = (parsed as Record<string, unknown>)["format"];
    if (!REQUIRED_FORMATS.includes(format as RequiredFormat)) continue;
    if (found.has(format as RequiredFormat)) fail(`External evidence duplicates format ${String(format)}.`);
    found.set(format as RequiredFormat, {
      format: format as RequiredFormat,
      file,
      path: filePath(file),
      bytes,
      sha256: await sha256Bytes(bytes),
      document: parsed as Record<string, unknown>,
    });
  }
  for (const format of REQUIRED_FORMATS) {
    if (!found.has(format)) fail(`External evidence is missing ${format}.`);
  }
  return found;
}

function assertFileRecord(recordValue: unknown, evidence: ParsedEvidence, label: string): void {
  const record = plainObject(recordValue, label);
  assertEqual(requiredSha256(record["sha256"], `${label} SHA-256`), evidence.sha256, `${label} SHA-256`);
  assertEqual(requiredInteger(record["bytes"], `${label} bytes`), evidence.bytes.byteLength, `${label} bytes`);
  const namedPath = requiredString(record["path"], `${label} path`);
  assertEqual(basename(namedPath), basename(evidence.path), `${label} basename`);
}

function validateAssetIndex(document: Record<string, unknown>): {
  assets: AssetRecord[];
  counts: Record<string, number>;
} {
  assertEqual(document["format"], "burn-protocol-corpus-asset-index/1", "Asset index format");
  const rawAssets = document["assets"];
  if (!Array.isArray(rawAssets)) fail("Asset index assets must be an array.");
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  const assets = rawAssets.map((raw, index): AssetRecord => {
    const asset = plainObject(raw, `Asset ${index}`);
    const path = normalizePath(requiredString(asset["path"], `Asset ${index} path`), `Asset ${index} path`);
    if (seen.has(path)) fail(`Asset index duplicates ${path}.`);
    seen.add(path);
    const classification = requiredString(asset["classification"], `Asset ${path} classification`);
    if (!ALLOWED_CLASSIFICATIONS.has(classification)) fail(`Asset ${path} has unsupported classification ${classification}.`);
    counts[classification] = (counts[classification] ?? 0) + 1;
    return {
      path,
      sha256: requiredSha256(asset["sha256"], `Asset ${path} SHA-256`),
      bytes: requiredInteger(asset["bytes"], `Asset ${path} bytes`),
      classification,
    };
  });
  assertCanonicalEqual(document["counts"], counts, "Asset index counts");
  return { assets, counts };
}

function validateProductionIdentity(tier: BurnEvidenceTier, activationContract: Record<string, unknown>): void {
  const binding = requiredString(activationContract["parentBinding"], "Activation parent binding");
  if (tier === "production-exact-intake") {
    assertEqual(binding, "exact-publication-parent", "Production parent binding");
    const intake = plainObject(activationContract["intake"], "Activation intake");
    assertCanonicalEqual(intake["handoff"], BURN_PROTOCOL_PRODUCTION_HANDOFF, "Production handoff identity");
    assertCanonicalEqual(intake["parent"], BURN_PROTOCOL_PRODUCTION_PARENT, "Production parent identity");
    assertEqual(intake["outerManifestRecords"], 23, "Production outer manifest records");
  } else {
    assertEqual(binding, "fixture-structural-only", "Fixture parent binding");
  }
}

async function validateApproval(
  approval: ParsedEvidence,
  intakeReceipt: ParsedEvidence,
  intakeContract: ParsedEvidence,
  assetIndex: ParsedEvidence,
  assetSummary: { assets: AssetRecord[]; counts: Record<string, number> },
): Promise<Record<string, unknown>> {
  const document = approval.document;
  assertEqual(document["status"], "approved", "Approval status");
  assertEqual(document["source"], "verified-handoff-intake-output", "Approval source");
  assertFileRecord(document["intakeContract"], intakeContract, "Approval intake contract");
  assertFileRecord(document["intakeReceipt"], intakeReceipt, "Approval intake receipt");
  assertFileRecord(document["assetIndex"], assetIndex, "Approval asset index");
  const assetRecord = plainObject(document["assetIndex"], "Approval asset index");
  assertEqual(assetRecord["assets"], assetSummary.assets.length, "Approval asset count");
  assertCanonicalEqual(assetRecord["counts"], assetSummary.counts, "Approval asset counts");

  const integrity = plainObject(document["integrity"], "Approval integrity");
  assertEqual(integrity["algorithm"], "sha256", "Approval integrity algorithm");
  const expectedDigest = requiredString(integrity["digest"], "Approval integrity digest");
  const { integrity: _ignored, ...core } = document;
  assertEqual(
    expectedDigest,
    `approval1_${await sha256Text(canonicalString(core))}`,
    "Approval integrity digest",
  );
  return document;
}

function validateIntake(
  receipt: ParsedEvidence,
  contract: ParsedEvidence,
  approval: Record<string, unknown>,
  assetSummary: { assets: AssetRecord[]; counts: Record<string, number> },
): void {
  const receiptDoc = receipt.document;
  const contractDoc = contract.document;
  assertEqual(receiptDoc["status"], "pass", "Intake receipt status");
  assertFileRecord(receiptDoc["contract"], contract, "Intake receipt contract");
  assertCanonicalEqual(
    projection(receiptDoc["handoff"], ["sha256", "bytes", "entries"], "Intake receipt handoff"),
    projection(contractDoc["handoff"], ["sha256", "bytes", "entries"], "Intake contract handoff"),
    "Intake handoff identity",
  );
  assertCanonicalEqual(
    projection(receiptDoc["parent"], ["sha256", "bytes", "entries", "manifestRecords", "manifestUncompressedBytes"], "Intake receipt parent"),
    projection(contractDoc["parent"], ["sha256", "bytes", "entries", "manifestRecords", "manifestUncompressedBytes"], "Intake contract parent"),
    "Intake parent identity",
  );
  const outerReceipt = plainObject(receiptDoc["outerManifest"], "Intake outer manifest");
  const outerContract = plainObject(contractDoc["outerManifest"], "Intake contract outer manifest");
  assertEqual(outerReceipt["records"], outerContract["records"], "Intake outer manifest records");
  assertCanonicalEqual(receiptDoc["authority"], contractDoc["authority"], "Intake authority");
  assertCanonicalEqual(approval["authority"], receiptDoc["authority"], "Approval intake authority");
  const receiptIndex = plainObject(receiptDoc["assetIndex"], "Intake receipt asset index");
  assertEqual(receiptIndex["assets"], assetSummary.assets.length, "Intake asset count");
  assertCanonicalEqual(receiptIndex["counts"], assetSummary.counts, "Intake asset counts");
  assertCanonicalEqual(approval["handoff"], projection(receiptDoc["handoff"], ["sha256", "bytes", "entries"], "Intake handoff"), "Approval handoff");
  assertCanonicalEqual(
    approval["parent"],
    projection(receiptDoc["parent"], ["sha256", "bytes", "entries", "manifestRecords", "manifestUncompressedBytes"], "Intake parent"),
    "Approval parent",
  );
}

function validateActivationContract(
  activation: ParsedEvidence,
  approval: Record<string, unknown>,
  current: CurrentCartridgeIdentity,
): BurnEvidenceTier {
  const document = activation.document;
  const tier = requiredString(document["evidenceTier"], "Activation evidence tier") as BurnEvidenceTier;
  if (tier !== "production-exact-intake" && tier !== "mechanism-fixture") fail(`Unsupported activation evidence tier ${tier}.`);
  validateProductionIdentity(tier, document);

  const publication = plainObject(document["publication"], "Activation publication");
  assertEqual(publication["cartridgeId"], current.id, "Activation cartridge id");
  assertEqual(publication["cartridgeDigest"], current.authoredArcDigest, "Activation cartridge digest");
  assertEqual(publication["version"], current.version, "Activation cartridge version");
  assertEqual(publication["engineVersion"], current.engineVersion, "Activation engine version");
  assertEqual(publication["sourcePlane"], current.sourcePlane, "Activation source plane");
  assertEqual(publication["exactParentSha256"], current.exactParentSha256, "Activation exact parent");

  const intake = plainObject(document["intake"], "Activation intake");
  assertCanonicalEqual(intake["handoff"], approval["handoff"], "Activation handoff");
  assertCanonicalEqual(intake["parent"], approval["parent"], "Activation parent");
  const approvalOuter = plainObject(approval["outerManifest"], "Approval outer manifest");
  assertEqual(intake["outerManifestRecords"], approvalOuter["records"], "Activation outer manifest records");
  assertCanonicalEqual(document["intakeAuthority"], approval["authority"], "Activation intake authority");
  const authority = plainObject(document["authority"], "Activation authority");
  assertEqual(authority["runtimeBundling"], "none", "Activation runtime bundling");
  requiredString(authority["custodyRelation"], "Activation custody relation");
  return tier;
}

function expectedCartridgeRecord(activation: Record<string, unknown>): Record<string, unknown> {
  const publication = plainObject(activation["publication"], "Activation publication");
  return {
    id: publication["cartridgeId"],
    version: publication["version"],
    engineVersion: publication["engineVersion"],
    authoredArcDigest: publication["cartridgeDigest"],
    sourcePlane: publication["sourcePlane"],
    publicationAuthorityHead: publication["arcHead"],
    exactParentSha256: publication["exactParentSha256"],
  };
}

function validateActivationOutputs(
  activation: ParsedEvidence,
  receipt: ParsedEvidence,
  overlay: ParsedEvidence,
  approval: ParsedEvidence,
  intakeReceipt: ParsedEvidence,
  intakeContract: ParsedEvidence,
  assetIndex: ParsedEvidence,
  approvalDoc: Record<string, unknown>,
  tier: BurnEvidenceTier,
  assetSummary: { assets: AssetRecord[]; counts: Record<string, number> },
): void {
  const activationDoc = activation.document;
  const receiptDoc = receipt.document;
  const overlayDoc = overlay.document;
  assertEqual(receiptDoc["status"], "pass", "Activation receipt status");
  assertEqual(overlayDoc["status"], "pass", "Activation overlay status");
  assertEqual(receiptDoc["evidenceTier"], tier, "Activation receipt evidence tier");
  assertEqual(overlayDoc["evidenceTier"], tier, "Activation overlay evidence tier");
  assertEqual(
    overlayDoc["classification"],
    tier === "production-exact-intake" ? "exact-handoff-verified-external-custody" : "mechanism-fixture-external-custody",
    "Activation overlay classification",
  );

  assertFileRecord(receiptDoc["activationContract"], activation, "Activation receipt contract");
  assertFileRecord(receiptDoc["approval"], approval, "Activation receipt approval");
  assertFileRecord(receiptDoc["overlay"], overlay, "Activation receipt overlay");
  const expectedCartridge = expectedCartridgeRecord(activationDoc);
  assertCanonicalEqual(receiptDoc["cartridge"], expectedCartridge, "Activation receipt cartridge");
  assertCanonicalEqual(overlayDoc["cartridge"], expectedCartridge, "Activation overlay cartridge");
  assertCanonicalEqual(overlayDoc["authoredBoundary"], activationDoc["publicationBoundary"], "Activation authored boundary");

  const external = plainObject(overlayDoc["externalCustody"], "External custody");
  const authority = plainObject(activationDoc["authority"], "Activation authority");
  assertEqual(external["runtimeBundling"], "none", "External custody runtime bundling");
  assertEqual(external["relationship"], authority["custodyRelation"], "External custody relationship");
  assertCanonicalEqual(external["handoff"], approvalDoc["handoff"], "External custody handoff");
  assertCanonicalEqual(external["parent"], approvalDoc["parent"], "External custody parent");
  const externalIndex = plainObject(external["assetIndex"], "External custody asset index");
  assertEqual(externalIndex["sha256"], assetIndex.sha256, "External asset index SHA-256");
  assertEqual(externalIndex["bytes"], assetIndex.bytes.byteLength, "External asset index bytes");
  assertEqual(externalIndex["assets"], assetSummary.assets.length, "External asset count");
  assertCanonicalEqual(externalIndex["counts"], assetSummary.counts, "External asset counts");
  assertCanonicalEqual(receiptDoc["externalAssets"], externalIndex, "Activation receipt external assets");

  const sourceEvidence = plainObject(overlayDoc["sourceEvidence"], "Overlay source evidence");
  assertEqual(sourceEvidence["approvalSha256"], approval.sha256, "Overlay approval SHA-256");
  assertEqual(sourceEvidence["intakeReceiptSha256"], intakeReceipt.sha256, "Overlay intake receipt SHA-256");
  assertEqual(sourceEvidence["intakeContractSha256"], intakeContract.sha256, "Overlay intake contract SHA-256");
  requiredSha256(sourceEvidence["publicationReceiptSha256"], "Overlay publication receipt SHA-256");

  const receiptAuthority = plainObject(receiptDoc["authority"], "Activation receipt authority");
  assertCanonicalEqual(receiptAuthority["authoredBoundary"], overlayDoc["authoredBoundary"], "Activation receipt authored boundary");
  assertEqual(receiptAuthority["custodyRelation"], external["relationship"], "Activation receipt custody relation");
  assertEqual(receiptAuthority["runtimeBundling"], "none", "Activation receipt runtime bundling");
}

function selectedFileMatches(expectedPath: string, selectedPath: string): boolean {
  return selectedPath === expectedPath || selectedPath.endsWith(`/${expectedPath}`);
}

async function verifySelectedAssets(
  files: readonly HolderAssetFile[],
  evidenceFiles: ReadonlySet<HolderAssetFile>,
  assets: readonly AssetRecord[],
): Promise<{ verified: VerifiedExternalAsset[]; ignoredFiles: number }> {
  const candidates = files.filter((file) => !evidenceFiles.has(file));
  const verified: VerifiedExternalAsset[] = [];
  const used = new Set<HolderAssetFile>();
  for (const asset of assets) {
    const matches = candidates.filter((file) => selectedFileMatches(asset.path, filePath(file)));
    if (matches.length > 1) fail(`Selected evidence contains multiple candidates for ${asset.path}.`);
    const file = matches[0];
    if (!file) continue;
    if (file.size > MAX_ASSET_BYTES) fail(`Asset ${asset.path} exceeds the ${MAX_ASSET_BYTES}-byte receiver limit.`);
    assertEqual(file.size, asset.bytes, `Asset ${asset.path} bytes`);
    const digest = await sha256Bytes(await bytesFor(file));
    assertEqual(digest, asset.sha256, `Asset ${asset.path} SHA-256`);
    used.add(file);
    verified.push({ ...asset, selectedPath: filePath(file), file });
  }
  if (verified.length === 0) fail("No selected asset matches the verified corpus index.");
  return { verified, ignoredFiles: candidates.filter((file) => !used.has(file)).length };
}

/** Verify one holder-selected evidence set against the currently running exact
 * cartridge. The result carries local Blob references but no object URLs and no
 * persistence. Presentation code may create and revoke URLs for this session. */
export async function verifyBurnExternalAssetSet(
  files: readonly HolderAssetFile[],
  current: CurrentCartridgeIdentity,
): Promise<VerifiedBurnExternalAssetSet> {
  if (current.id !== BURN_PROTOCOL_CARTRIDGE_ID) fail(`External Burn evidence cannot mount on cartridge ${current.id}.`);
  if (files.length === 0) fail("No external evidence files were selected.");
  const evidence = await parseEvidenceFiles(files);
  const activation = evidence.get("burn-protocol-handoff-publication-activation-contract/1")!;
  const activationReceipt = evidence.get("burn-protocol-handoff-publication-activation-receipt/1")!;
  const overlay = evidence.get("burn-protocol-handoff-publication-overlay/1")!;
  const approval = evidence.get("burn-protocol-handoff-publication-approval/1")!;
  const intakeReceipt = evidence.get("burn-protocol-handoff-intake-receipt/1")!;
  const intakeContract = evidence.get("burn-protocol-handoff-intake-contract/1")!;
  const assetIndex = evidence.get("burn-protocol-corpus-asset-index/1")!;
  const assetSummary = validateAssetIndex(assetIndex.document);
  const approvalDoc = await validateApproval(approval, intakeReceipt, intakeContract, assetIndex, assetSummary);
  validateIntake(intakeReceipt, intakeContract, approvalDoc, assetSummary);
  const tier = validateActivationContract(activation, approvalDoc, current);
  validateActivationOutputs(
    activation,
    activationReceipt,
    overlay,
    approval,
    intakeReceipt,
    intakeContract,
    assetIndex,
    approvalDoc,
    tier,
    assetSummary,
  );
  const evidenceFiles = new Set([...evidence.values()].map((entry) => entry.file));
  const selected = await verifySelectedAssets(files, evidenceFiles, assetSummary.assets);
  const overlayDoc = overlay.document;
  const boundary = plainObject(overlayDoc["authoredBoundary"], "Overlay authored boundary");
  const external = plainObject(overlayDoc["externalCustody"], "Overlay external custody");
  assertEqual(boundary["inheritedHistory"], "read-only", "Inherited history boundary");
  assertEqual(boundary["liveRuns"], "counterfactual-only", "Live run boundary");
  assertEqual(boundary["storyChanges"], "none", "Story change boundary");
  assertEqual(boundary["panelPayloads"], "not-present", "Authored panel boundary");
  assertEqual(external["runtimeBundling"], "none", "Runtime bundling boundary");

  return {
    format: "burn-protocol-holder-asset-session/1",
    evidenceTier: tier,
    classification: requiredString(overlayDoc["classification"], "Overlay classification"),
    controlQuestion: requiredString(overlayDoc["controlQuestion"], "Overlay control question"),
    cartridge: current,
    authority: {
      inheritedHistory: "read-only",
      liveRuns: "counterfactual-only",
      storyChanges: "none",
      authoredPanels: "not-present",
      runtimeBundling: "none",
      custodyRelation: requiredString(external["relationship"], "External custody relationship"),
    },
    indexedAssets: assetSummary.assets.length,
    indexedCounts: assetSummary.counts,
    verifiedAssets: selected.verified,
    missingAssets: assetSummary.assets.length - selected.verified.length,
    ignoredFiles: selected.ignoredFiles,
    evidence: {
      activationContractSha256: activation.sha256,
      activationReceiptSha256: activationReceipt.sha256,
      overlaySha256: overlay.sha256,
      approvalSha256: approval.sha256,
      intakeReceiptSha256: intakeReceipt.sha256,
      intakeContractSha256: intakeContract.sha256,
      assetIndexSha256: assetIndex.sha256,
    },
  };
}
