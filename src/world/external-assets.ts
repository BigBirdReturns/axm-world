import { z } from "zod";
import { parseBoundedJson } from "../engine/bounded-json.js";

export const BURN_PROTOCOL_CARTRIDGE_ID = "burn-protocol-disclosure-probe" as const;
export const BURN_PROTOCOL_AUTHORED_DIGEST =
  "cart1_870f3dfcab909fc9aace115e2c46cd30268339f80bc87a14f0eebcc4e2c28c3e" as const;
export const BURN_PROTOCOL_PUBLICATION_HEAD =
  "4b076089f9b7ae1949ba8fac45f2373aeeb5b344" as const;
export const BURN_PROTOCOL_PARENT_SHA256 =
  "b3b299e14d8c22cde88629eb6bc4d197b8f8015eec7bf46b95f0de2a31b5f0df" as const;
export const BURN_PROTOCOL_HANDOFF_SHA256 =
  "e96874ca4c753f49eed1c6ecf5db7f924ad4bfa006e242bf426319345dfaedde" as const;

export const EXTERNAL_ASSET_JSON_MAX_BYTES = 16 * 1024 * 1024;
export const EXTERNAL_ASSET_FILE_MAX_BYTES = 128 * 1024 * 1024;
export const EXTERNAL_ASSET_BATCH_MAX_BYTES = 1024 * 1024 * 1024;
export const EXTERNAL_ASSET_INDEX_MAX_RECORDS = 5_000;

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40}$/;
const SAFE_CLASSIFICATION = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RENDERABLE_RASTER = /\.(?:png|jpe?g|webp)$/i;

const sha256Schema = z.string().regex(SHA256);
const gitShaSchema = z.string().regex(GIT_SHA);
const countsSchema = z.record(z.number().int().nonnegative());

const boundarySchema = z.object({
  inheritedHistory: z.string().min(1),
  liveRuns: z.string().min(1),
  panelPayloads: z.string().min(1),
  storyChanges: z.string().min(1),
});

const cartridgeSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  engineVersion: z.string().min(1),
  sourcePlane: z.string().min(1),
  authoredArcDigest: z.string().min(1),
  exactParentSha256: sha256Schema,
  publicationAuthorityHead: gitShaSchema,
});

const handoffSchema = z.object({
  sha256: sha256Schema,
  bytes: z.number().int().nonnegative(),
  entries: z.number().int().nonnegative(),
});

const parentSchema = z.object({
  sha256: sha256Schema,
  bytes: z.number().int().nonnegative(),
  entries: z.number().int().nonnegative(),
  manifestRecords: z.number().int().nonnegative(),
  manifestUncompressedBytes: z.number().int().nonnegative(),
});

const assetSummarySchema = z.object({
  sha256: sha256Schema,
  assets: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  counts: countsSchema,
});

const assetIndexSchema = z.object({
  format: z.literal("burn-protocol-corpus-asset-index/1"),
  generatedFrom: z.string().min(1),
  counts: countsSchema,
  assets: z.array(z.object({
    path: z.string().min(1),
    sha256: sha256Schema,
    bytes: z.number().int().nonnegative(),
    classification: z.string().min(1),
  })).min(1).max(EXTERNAL_ASSET_INDEX_MAX_RECORDS),
});

const overlaySchema = z.object({
  format: z.literal("burn-protocol-handoff-publication-overlay/1"),
  status: z.literal("pass"),
  classification: z.string().min(1),
  evidenceTier: z.string().min(1),
  controlQuestion: z.string().min(1),
  authoredBoundary: boundarySchema,
  cartridge: cartridgeSchema,
  externalCustody: z.object({
    relationship: z.string().min(1),
    runtimeBundling: z.string().min(1),
    handoff: handoffSchema,
    parent: parentSchema,
    assetIndex: assetSummarySchema,
  }),
});

const activationReceiptSchema = z.object({
  format: z.literal("burn-protocol-handoff-publication-activation-receipt/1"),
  status: z.literal("pass"),
  evidenceTier: z.string().min(1),
  cartridge: cartridgeSchema,
  authority: z.object({
    runtimeBundling: z.string().min(1),
    custodyRelation: z.string().min(1),
    authoredBoundary: boundarySchema,
  }),
  externalAssets: assetSummarySchema,
  overlay: z.object({
    sha256: sha256Schema,
    bytes: z.number().int().nonnegative(),
    path: z.string().min(1),
  }),
});

type ExternalCustodyOverlayV1 = z.infer<typeof overlaySchema>;
type ExternalCustodyActivationReceiptV1 = z.infer<typeof activationReceiptSchema>;

export type ExternalAssetStanding = "production-exact" | "mechanism-fixture";

export interface ExternalAssetIndexEntry {
  path: string;
  sha256: string;
  bytes: number;
  classification: string;
}

export interface ExternalAssetIndexV1 {
  format: "burn-protocol-corpus-asset-index/1";
  generatedFrom: string;
  counts: Record<string, number>;
  assets: ExternalAssetIndexEntry[];
}

export interface PreparedExternalAssetCustody {
  cartridgeId: typeof BURN_PROTOCOL_CARTRIDGE_ID;
  authoredArcDigest: typeof BURN_PROTOCOL_AUTHORED_DIGEST;
  publicationAuthorityHead: typeof BURN_PROTOCOL_PUBLICATION_HEAD;
  standing: ExternalAssetStanding;
  evidenceTier: string;
  classification: string;
  controlQuestion: string;
  overlaySha256: string;
  indexSha256: string;
  index: ExternalAssetIndexV1;
  totalBytes: number;
  overlay: ExternalCustodyOverlayV1;
  receipt: ExternalCustodyActivationReceiptV1;
}

export interface HolderAssetFile {
  readonly name: string;
  readonly size: number;
  readonly type?: string;
  readonly webkitRelativePath?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface VerifiedExternalAsset {
  asset: ExternalAssetIndexEntry;
  file: HolderAssetFile;
  selectedPath: string;
}

export interface ExternalAssetVerificationResult {
  verified: VerifiedExternalAsset[];
  missing: ExternalAssetIndexEntry[];
  unmatchedFiles: string[];
  verifiedBytes: number;
  complete: boolean;
}

export interface ExternalAssetVerificationProgress {
  processed: number;
  total: number;
  currentPath: string;
}

export interface ExternalAssetSessionEntry extends ExternalAssetIndexEntry {
  selectedPath: string;
  objectUrl: string | null;
  mimeType: string;
}

export interface ExternalAssetSession {
  cartridgeId: typeof BURN_PROTOCOL_CARTRIDGE_ID;
  authoredArcDigest: typeof BURN_PROTOCOL_AUTHORED_DIGEST;
  standing: ExternalAssetStanding;
  evidenceTier: string;
  overlaySha256: string;
  indexSha256: string;
  verifiedBytes: number;
  totalAssets: number;
  complete: boolean;
  createdAt: number;
  assets: ExternalAssetSessionEntry[];
}

function boundedJson(text: string, label: string): unknown {
  try {
    return parseBoundedJson(text, {
      maxBytes: EXTERNAL_ASSET_JSON_MAX_BYTES,
      maxDepth: 64,
      maxNodes: 100_000,
      maxArrayItems: EXTERNAL_ASSET_INDEX_MAX_RECORDS + 100,
      maxObjectMembers: EXTERNAL_ASSET_INDEX_MAX_RECORDS + 100,
      maxStringBytes: 8 * 1024 * 1024,
      maxNumberCharacters: 128,
    });
  } catch (error) {
    throw new Error(`${label} is not valid bounded JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function schemaError(label: string, error: unknown): Error {
  if (error instanceof z.ZodError) {
    const issues = error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
    return new Error(`${label} does not match its format:\n${issues.join("\n")}`);
  }
  return error instanceof Error ? error : new Error(String(error));
}

function parseWith<T>(text: string, label: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(boundedJson(text, label));
  } catch (error) {
    throw schemaError(label, error);
  }
}

export function jsonFormat(text: string): string | null {
  try {
    const value = boundedJson(text, "External custody record");
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const format = (value as Record<string, unknown>)["format"];
    return typeof format === "string" ? format : null;
  } catch {
    return null;
  }
}

export function normalizeExternalAssetPath(pathValue: string): string {
  if (pathValue.includes("\\")) throw new Error(`Asset path uses a backslash: ${pathValue}`);
  if (pathValue.startsWith("/") || /^[A-Za-z]:\//.test(pathValue)) {
    throw new Error(`Asset path is absolute: ${pathValue}`);
  }
  const parts = pathValue.split("/");
  if (parts.length === 0 || parts.some((part) => part.length === 0 || part === "." || part === "..")) {
    throw new Error(`Asset path is not a safe relative path: ${pathValue}`);
  }
  return parts.join("/");
}

function validateCounts(value: Record<string, number>, label: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(value).sort()) {
    if (!SAFE_CLASSIFICATION.test(key)) {
      throw new Error(`${label} has an unsafe classification ${JSON.stringify(key)}.`);
    }
    out[key] = value[key]!;
  }
  return out;
}

function sameCounts(left: Record<string, number>, right: Record<string, number>): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}

function assertCounts(actual: Record<string, number>, expected: Record<string, number>, label: string): void {
  if (!sameCounts(actual, expected)) {
    throw new Error(`${label} does not match the manifest-derived asset classifications.`);
  }
}

function parseIndex(text: string): { index: ExternalAssetIndexV1; totalBytes: number } {
  const parsed = parseWith(text, "Corpus asset index", assetIndexSchema);
  const seen = new Set<string>();
  const computedCounts: Record<string, number> = {};
  let totalBytes = 0;
  const assets = parsed.assets.map((asset): ExternalAssetIndexEntry => {
    const path = normalizeExternalAssetPath(asset.path);
    if (seen.has(path)) throw new Error(`Corpus asset index duplicates ${path}.`);
    seen.add(path);
    if (!SAFE_CLASSIFICATION.test(asset.classification)) {
      throw new Error(`Asset ${path} has an unsafe classification ${JSON.stringify(asset.classification)}.`);
    }
    computedCounts[asset.classification] = (computedCounts[asset.classification] ?? 0) + 1;
    totalBytes += asset.bytes;
    if (!Number.isSafeInteger(totalBytes)) throw new Error("Corpus asset index byte total is not safe.");
    return { ...asset, path };
  });
  const declaredCounts = validateCounts(parsed.counts, "Corpus asset index counts");
  assertCounts(declaredCounts, computedCounts, "Corpus asset index counts");
  return {
    index: {
      format: "burn-protocol-corpus-asset-index/1",
      generatedFrom: parsed.generatedFrom,
      counts: declaredCounts,
      assets,
    },
    totalBytes,
  };
}

function sameBoundary(left: z.infer<typeof boundarySchema>, right: z.infer<typeof boundarySchema>): boolean {
  return left.inheritedHistory === right.inheritedHistory
    && left.liveRuns === right.liveRuns
    && left.panelPayloads === right.panelPayloads
    && left.storyChanges === right.storyChanges;
}

function sameCartridge(left: z.infer<typeof cartridgeSchema>, right: z.infer<typeof cartridgeSchema>): boolean {
  return left.id === right.id
    && left.version === right.version
    && left.engineVersion === right.engineVersion
    && left.sourcePlane === right.sourcePlane
    && left.authoredArcDigest === right.authoredArcDigest
    && left.exactParentSha256 === right.exactParentSha256
    && left.publicationAuthorityHead === right.publicationAuthorityHead;
}

function exactProductionHandoff(value: z.infer<typeof handoffSchema>): boolean {
  return value.sha256 === BURN_PROTOCOL_HANDOFF_SHA256
    && value.bytes === 363_384_929
    && value.entries === 24;
}

function exactProductionParent(value: z.infer<typeof parentSchema>): boolean {
  return value.sha256 === BURN_PROTOCOL_PARENT_SHA256
    && value.bytes === 353_717_668
    && value.entries === 1_986
    && value.manifestRecords === 1_985
    && value.manifestUncompressedBytes === 383_401_783;
}

export async function sha256Bytes(value: ArrayBuffer | Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto SHA-256 is unavailable in this browser.");
  const source = value instanceof Uint8Array ? value : new Uint8Array(value);
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  const digest = await subtle.digest("SHA-256", copy);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Text(value: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(value));
}

export async function prepareExternalAssetCustody(input: {
  overlayText: string;
  receiptText: string;
  indexText: string;
  cartridgeId?: string;
  authoredArcDigest?: string;
}): Promise<PreparedExternalAssetCustody> {
  const overlay = parseWith(input.overlayText, "External custody overlay", overlaySchema);
  const receipt = parseWith(input.receiptText, "External custody activation receipt", activationReceiptSchema);
  const parsedIndex = parseIndex(input.indexText);
  const overlaySha256 = await sha256Text(input.overlayText);
  const indexSha256 = await sha256Text(input.indexText);
  const overlayBytes = new TextEncoder().encode(input.overlayText).byteLength;

  const cartridgeId = input.cartridgeId ?? BURN_PROTOCOL_CARTRIDGE_ID;
  const authoredArcDigest = input.authoredArcDigest ?? BURN_PROTOCOL_AUTHORED_DIGEST;
  if (cartridgeId !== BURN_PROTOCOL_CARTRIDGE_ID) {
    throw new Error(`External custody is bound to ${BURN_PROTOCOL_CARTRIDGE_ID}, not ${cartridgeId}.`);
  }
  if (authoredArcDigest !== BURN_PROTOCOL_AUTHORED_DIGEST) {
    throw new Error("External custody does not match the calibrated Burn cartridge identity.");
  }
  if (overlay.cartridge.id !== cartridgeId || overlay.cartridge.authoredArcDigest !== authoredArcDigest) {
    throw new Error("External custody overlay is bound to a different cartridge revision.");
  }
  if (!sameCartridge(overlay.cartridge, receipt.cartridge)) {
    throw new Error("Activation receipt and external custody overlay identify different cartridge revisions.");
  }
  if (overlay.cartridge.publicationAuthorityHead !== BURN_PROTOCOL_PUBLICATION_HEAD) {
    throw new Error("External custody overlay does not name the calibrated Arc publication authority.");
  }
  if (overlay.cartridge.exactParentSha256 !== BURN_PROTOCOL_PARENT_SHA256) {
    throw new Error("External custody overlay does not name the sealed v0.58.0 parent.");
  }
  if (overlay.cartridge.engineVersion !== "1.3.0" || overlay.cartridge.sourcePlane !== "common-ship-pocket/1") {
    throw new Error("External custody overlay is not bound to the accepted Engine 1.3 Common Ship publication.");
  }

  const requiredBoundary = {
    inheritedHistory: "read-only",
    liveRuns: "counterfactual-only",
    panelPayloads: "not-present",
    storyChanges: "none",
  };
  if (!sameBoundary(overlay.authoredBoundary, requiredBoundary)) {
    throw new Error("External custody overlay changes the authored canon or panel boundary.");
  }
  if (!sameBoundary(receipt.authority.authoredBoundary, overlay.authoredBoundary)) {
    throw new Error("Activation receipt and overlay disagree about the authored boundary.");
  }
  if (overlay.externalCustody.runtimeBundling !== "none" || receipt.authority.runtimeBundling !== "none") {
    throw new Error("External custody attempts to authorize runtime bundling.");
  }
  const relationship = "supplemental-external-evidence-does-not-change-authored-identity";
  if (overlay.externalCustody.relationship !== relationship || receipt.authority.custodyRelation !== relationship) {
    throw new Error("External custody relationship would change authored identity.");
  }

  if (receipt.overlay.sha256 !== overlaySha256 || receipt.overlay.bytes !== overlayBytes) {
    throw new Error("External custody overlay bytes do not match the activation receipt.");
  }
  if (overlay.externalCustody.assetIndex.sha256 !== indexSha256
      || receipt.externalAssets.sha256 !== indexSha256) {
    throw new Error("Corpus asset index bytes do not match the custody records.");
  }
  for (const summary of [overlay.externalCustody.assetIndex, receipt.externalAssets]) {
    if (summary.assets !== parsedIndex.index.assets.length || summary.bytes !== parsedIndex.totalBytes) {
      throw new Error("Corpus asset index totals do not match the custody records.");
    }
    assertCounts(validateCounts(summary.counts, "External custody asset counts"), parsedIndex.index.counts, "External custody asset counts");
  }
  if (overlay.evidenceTier !== receipt.evidenceTier) {
    throw new Error("Activation receipt and overlay disagree about evidence tier.");
  }

  let standing: ExternalAssetStanding;
  if (overlay.evidenceTier === "production-exact-intake") {
    if (!exactProductionHandoff(overlay.externalCustody.handoff)
        || !exactProductionParent(overlay.externalCustody.parent)) {
      throw new Error("Production evidence tier does not carry the exact A13C1 handoff and v0.58.0 parent identities.");
    }
    standing = "production-exact";
  } else if (overlay.evidenceTier === "mechanism-fixture" && /fixture/i.test(overlay.classification)) {
    standing = "mechanism-fixture";
  } else {
    throw new Error(`Unsupported external custody evidence tier ${JSON.stringify(overlay.evidenceTier)}.`);
  }

  return {
    cartridgeId: BURN_PROTOCOL_CARTRIDGE_ID,
    authoredArcDigest: BURN_PROTOCOL_AUTHORED_DIGEST,
    publicationAuthorityHead: BURN_PROTOCOL_PUBLICATION_HEAD,
    standing,
    evidenceTier: overlay.evidenceTier,
    classification: overlay.classification,
    controlQuestion: overlay.controlQuestion,
    overlaySha256,
    indexSha256,
    index: parsedIndex.index,
    totalBytes: parsedIndex.totalBytes,
    overlay,
    receipt,
  };
}

function selectedPath(file: HolderAssetFile): string {
  return normalizeExternalAssetPath(file.webkitRelativePath?.trim() || file.name);
}

function basename(pathValue: string): string {
  return pathValue.slice(pathValue.lastIndexOf("/") + 1);
}

function matchAsset(pathValue: string, fileName: string, assets: ExternalAssetIndexEntry[]): ExternalAssetIndexEntry | null {
  const exact = assets.filter((asset) => pathValue === asset.path || pathValue.endsWith(`/${asset.path}`));
  if (exact.length > 1) throw new Error(`Selected path ${pathValue} matches more than one indexed asset.`);
  if (exact.length === 1) return exact[0]!;
  const byName = assets.filter((asset) => basename(asset.path) === fileName);
  if (byName.length > 1) {
    throw new Error(`Selected file ${fileName} is ambiguous; select its containing directory so the relative path is available.`);
  }
  return byName[0] ?? null;
}

export async function verifyExternalAssetFiles(
  custody: PreparedExternalAssetCustody,
  files: readonly HolderAssetFile[],
  onProgress?: (progress: ExternalAssetVerificationProgress) => void,
): Promise<ExternalAssetVerificationResult> {
  if (files.length === 0) throw new Error("Select at least one external asset file.");
  const matched = new Map<string, { file: HolderAssetFile; selectedPath: string }>();
  const unmatchedFiles: string[] = [];
  let selectedBytes = 0;

  for (const file of files) {
    const pathValue = selectedPath(file);
    const asset = matchAsset(pathValue, file.name, custody.index.assets);
    if (!asset) {
      unmatchedFiles.push(pathValue);
      continue;
    }
    if (matched.has(asset.path)) throw new Error(`More than one selected file claims indexed asset ${asset.path}.`);
    if (file.size > EXTERNAL_ASSET_FILE_MAX_BYTES) {
      throw new Error(`${pathValue} exceeds ${EXTERNAL_ASSET_FILE_MAX_BYTES} bytes.`);
    }
    selectedBytes += file.size;
    if (selectedBytes > EXTERNAL_ASSET_BATCH_MAX_BYTES) {
      throw new Error(`Selected indexed assets exceed ${EXTERNAL_ASSET_BATCH_MAX_BYTES} bytes.`);
    }
    matched.set(asset.path, { file, selectedPath: pathValue });
  }

  if (matched.size === 0) throw new Error("None of the selected files match the verified corpus asset index.");

  const verified: VerifiedExternalAsset[] = [];
  const errors: string[] = [];
  let processed = 0;
  for (const asset of custody.index.assets) {
    const selection = matched.get(asset.path);
    if (!selection) continue;
    onProgress?.({ processed, total: matched.size, currentPath: asset.path });
    if (selection.file.size !== asset.bytes) {
      errors.push(`${asset.path}: expected ${asset.bytes} bytes, received ${selection.file.size}.`);
    } else {
      const actual = await sha256Bytes(await selection.file.arrayBuffer());
      if (actual !== asset.sha256) errors.push(`${asset.path}: SHA-256 does not match the verified manifest.`);
      else verified.push({ asset, file: selection.file, selectedPath: selection.selectedPath });
    }
    processed += 1;
    onProgress?.({ processed, total: matched.size, currentPath: asset.path });
  }

  if (errors.length > 0) {
    throw new Error(`External asset verification refused the selected batch:\n${errors.join("\n")}`);
  }
  const verifiedPaths = new Set(verified.map((item) => item.asset.path));
  const missing = custody.index.assets.filter((asset) => !verifiedPaths.has(asset.path));
  return {
    verified,
    missing,
    unmatchedFiles,
    verifiedBytes: verified.reduce((sum, item) => sum + item.asset.bytes, 0),
    complete: missing.length === 0,
  };
}

const sessions = new Map<string, ExternalAssetSession>();
const listeners = new Map<string, Set<() => void>>();

function notify(authoredArcDigest: string): void {
  for (const listener of listeners.get(authoredArcDigest) ?? []) listener();
}

function revoke(session: ExternalAssetSession | undefined): void {
  if (!session || typeof URL === "undefined") return;
  for (const asset of session.assets) if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
}

function browserObjectUrl(file: HolderAssetFile, pathValue: string): string | null {
  if (!RENDERABLE_RASTER.test(pathValue)) return null;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
  if (typeof Blob === "undefined" || !(file instanceof Blob)) return null;
  return URL.createObjectURL(file);
}

export function installExternalAssetSession(
  custody: PreparedExternalAssetCustody,
  verification: ExternalAssetVerificationResult,
): ExternalAssetSession {
  revoke(sessions.get(custody.authoredArcDigest));
  const session: ExternalAssetSession = {
    cartridgeId: custody.cartridgeId,
    authoredArcDigest: custody.authoredArcDigest,
    standing: custody.standing,
    evidenceTier: custody.evidenceTier,
    overlaySha256: custody.overlaySha256,
    indexSha256: custody.indexSha256,
    verifiedBytes: verification.verifiedBytes,
    totalAssets: custody.index.assets.length,
    complete: verification.complete,
    createdAt: Date.now(),
    assets: verification.verified.map(({ asset, file, selectedPath: pathValue }) => ({
      ...asset,
      selectedPath: pathValue,
      objectUrl: browserObjectUrl(file, asset.path),
      mimeType: file.type ?? "",
    })),
  };
  sessions.set(custody.authoredArcDigest, session);
  notify(custody.authoredArcDigest);
  return session;
}

export function getExternalAssetSession(authoredArcDigest: string): ExternalAssetSession | null {
  return sessions.get(authoredArcDigest) ?? null;
}

export function clearExternalAssetSession(authoredArcDigest: string): void {
  revoke(sessions.get(authoredArcDigest));
  sessions.delete(authoredArcDigest);
  notify(authoredArcDigest);
}

export function subscribeExternalAssetSession(authoredArcDigest: string, listener: () => void): () => void {
  const current = listeners.get(authoredArcDigest) ?? new Set<() => void>();
  current.add(listener);
  listeners.set(authoredArcDigest, current);
  return () => {
    current.delete(listener);
    if (current.size === 0) listeners.delete(authoredArcDigest);
  };
}

export function isRenderableExternalAsset(pathValue: string): boolean {
  return RENDERABLE_RASTER.test(pathValue);
}
