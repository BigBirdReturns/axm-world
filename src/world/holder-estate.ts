// Whole-holder custody for Rodoh. A portable run moves one changed cartridge;
// rodoh-holder-estate/v1 moves every World-owned browser record together without
// making the browser profile or this runtime the owner of those records.

import { cartridgeDigest, sha256Hex } from "../engine/cartridge-digest.js";
import { normalizePortableRunExtensions } from "../engine/portable-run.js";
import type { Arc, Organization } from "../engine/types.js";
import { orderedKeys } from "../engine/determinism.js";
import { parseBoundedJson, validateBoundedJsonValue, type BoundedJsonLimits } from "../engine/bounded-json.js";
import { CARTRIDGE_BAY_KEY, LEGACY_CARTRIDGE_BAY_KEY } from "./cartridge-bay.js";
import { parseCartridge, type TrustLevel } from "./cartridge.js";
import { validateCheckpoint } from "./experience/checkpoint.js";
import { CONSEQUENCE_SCHEMA_VERSION, LEDGER_SCHEMA_VERSION, gradeForOutcome } from "./ledger.js";
import { isCostumeId } from "./presentation-prefs.js";
import { loadRun, SAVE_KEY_PREFIX, type KVStorage, type ProgramRunState } from "./save.js";

export const HOLDER_ESTATE_FORMAT = "rodoh-holder-estate/v1" as const;
export const HOLDER_ESTATE_INTEGRITY_ALGORITHM = "sha256" as const;
export const HOLDER_ESTATE_DIGEST_PREFIX = "estate1_" as const;
export const HOLDER_ESTATE_MAX_BYTES = 32 * 1024 * 1024;
export const HOLDER_ESTATE_MAX_RECORDS = 4096;
export const HOLDER_ESTATE_MAX_RECORD_BYTES = 8 * 1024 * 1024;

const EXPERIENCE_PREFIX = "axm-world:experience:v1:";
const COSTUME_PREFIX = "axm-world:costume:v2:";
const SENSORY_KEY = "axm-world:sensory:v1";
const LOCALE_KEY = "axm-world:locale:v1";
const HOLDER_NAMESPACES = ["axm-world:", "rodoh:"] as const;
const CART_DIGEST = /^cart1_[0-9a-f]{64}$/;

const HOLDER_ESTATE_JSON_LIMITS: Partial<BoundedJsonLimits> = {
  maxBytes: HOLDER_ESTATE_MAX_BYTES,
  maxDepth: 24,
  maxNodes: 100_000,
  maxArrayItems: HOLDER_ESTATE_MAX_RECORDS,
  maxObjectMembers: HOLDER_ESTATE_MAX_RECORDS * 8,
  maxStringBytes: HOLDER_ESTATE_MAX_RECORD_BYTES,
};

const HOLDER_RECORD_JSON_LIMITS: Partial<BoundedJsonLimits> = {
  maxBytes: HOLDER_ESTATE_MAX_RECORD_BYTES,
  maxDepth: 96,
  maxNodes: 250_000,
  maxArrayItems: 50_000,
  maxObjectMembers: 50_000,
  maxStringBytes: HOLDER_ESTATE_MAX_RECORD_BYTES,
};

export type HolderRecordKind =
  | "cartridge-bay"
  | "run"
  | "experience"
  | "presentation"
  | "sensory"
  | "locale"
  | "opaque-world";

export interface HolderStorage extends KVStorage {
  readonly length: number;
  key(index: number): string | null;
}

export interface HolderEstateRecord {
  key: string;
  kind: HolderRecordKind;
  value: string;
  byteLength: number;
  sha256: string;
}

export interface HolderEstateSummary {
  records: number;
  bytes: number;
  cartridgeBayRecords: number;
  runRecords: number;
  experienceRecords: number;
  presentationRecords: number;
  preferenceRecords: number;
  opaqueRecords: number;
}

export interface HolderEstateCoreV1 {
  format: typeof HOLDER_ESTATE_FORMAT;
  createdAt: string;
  producer: {
    runtime: "axm-world";
    schemaVersion: 1;
  };
  records: HolderEstateRecord[];
  summary: HolderEstateSummary;
}

export interface HolderEstateV1 extends HolderEstateCoreV1 {
  integrity: {
    algorithm: typeof HOLDER_ESTATE_INTEGRITY_ALGORITHM;
    digest: string;
  };
}

export type HolderEstateMode = "merge" | "replace";

export interface HolderEstatePreflight {
  mode: HolderEstateMode;
  incomingRecords: number;
  incomingBytes: number;
  add: string[];
  change: string[];
  unchanged: string[];
  remove: string[];
  warnings: string[];
}

export type HolderEstateImportResult =
  | { ok: true; estate: HolderEstateV1; preflight: HolderEstatePreflight }
  | { ok: false; errors: string[]; rollbackErrors: string[] };

interface StoredSnapshot {
  key: string;
  value: string | null;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isHolderNamespace(key: string): boolean {
  return HOLDER_NAMESPACES.some((prefix) => key.startsWith(prefix));
}

export function holderRecordKind(key: string): HolderRecordKind {
  if (key === CARTRIDGE_BAY_KEY || key === LEGACY_CARTRIDGE_BAY_KEY) return "cartridge-bay";
  if (key.startsWith(SAVE_KEY_PREFIX)) return "run";
  if (key.startsWith(EXPERIENCE_PREFIX)) return "experience";
  if (key.startsWith(COSTUME_PREFIX)) return "presentation";
  if (key === SENSORY_KEY) return "sensory";
  if (key === LOCALE_KEY) return "locale";
  return "opaque-world";
}

function enumerateHolderKeys(storage: HolderStorage): string[] {
  const keys = new Set<string>();
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null && isHolderNamespace(key)) keys.add(key);
  }
  return [...keys].sort(compareStrings);
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function recordFor(storage: HolderStorage, key: string): HolderEstateRecord | null {
  const value = storage.getItem(key);
  if (value === null) return null;
  const bytes = byteLength(value);
  if (bytes > HOLDER_ESTATE_MAX_RECORD_BYTES) {
    throw new Error(`Holder record ${key} exceeds ${HOLDER_ESTATE_MAX_RECORD_BYTES} bytes.`);
  }
  return {
    key,
    kind: holderRecordKind(key),
    value,
    byteLength: bytes,
    sha256: sha256Hex(value),
  };
}

function summarize(records: readonly HolderEstateRecord[]): HolderEstateSummary {
  return {
    records: records.length,
    bytes: records.reduce((sum, record) => sum + record.byteLength, 0),
    cartridgeBayRecords: records.filter((record) => record.kind === "cartridge-bay").length,
    runRecords: records.filter((record) => record.kind === "run").length,
    experienceRecords: records.filter((record) => record.kind === "experience").length,
    presentationRecords: records.filter((record) => record.kind === "presentation").length,
    preferenceRecords: records.filter((record) => record.kind === "sensory" || record.kind === "locale").length,
    opaqueRecords: records.filter((record) => record.kind === "opaque-world").length,
  };
}

function coreDigest(core: HolderEstateCoreV1): string {
  return HOLDER_ESTATE_DIGEST_PREFIX + sha256Hex(canonicalizeJson(core));
}

/** Build an exact holder-owned estate. Unknown World namespaces are carried as
 * opaque strings so a newer or alternate compatible player does not lose state
 * merely because this build cannot interpret it. */
export function buildHolderEstate(
  storage: HolderStorage,
  options: { createdAt?: string } = {},
): HolderEstateV1 {
  const records = enumerateHolderKeys(storage)
    .map((key) => recordFor(storage, key))
    .filter((record): record is HolderEstateRecord => record !== null);
  if (records.length > HOLDER_ESTATE_MAX_RECORDS) {
    throw new Error(`Holder estate contains ${records.length} records; maximum is ${HOLDER_ESTATE_MAX_RECORDS}.`);
  }
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("Holder estate createdAt must be an ISO-compatible date.");
  const core: HolderEstateCoreV1 = {
    format: HOLDER_ESTATE_FORMAT,
    createdAt,
    producer: { runtime: "axm-world", schemaVersion: 1 },
    records,
    summary: summarize(records),
  };
  const estate: HolderEstateV1 = {
    ...core,
    integrity: {
      algorithm: HOLDER_ESTATE_INTEGRITY_ALGORITHM,
      digest: coreDigest(core),
    },
  };
  if (byteLength(JSON.stringify(estate)) > HOLDER_ESTATE_MAX_BYTES) {
    throw new Error(`Holder estate exceeds ${HOLDER_ESTATE_MAX_BYTES} bytes.`);
  }
  return estate;
}

export function isHolderEstateV1(input: unknown): boolean {
  try {
    const value = parseHolderEstateInput(input);
    return !!value && typeof value === "object" && !Array.isArray(value)
      && (value as Record<string, unknown>)["format"] === HOLDER_ESTATE_FORMAT;
  } catch {
    return false;
  }
}

function parseHolderEstateInput(input: unknown): unknown {
  if (typeof input === "string") {
    if (byteLength(input) > HOLDER_ESTATE_MAX_BYTES) {
      throw new Error(`Holder estate exceeds ${HOLDER_ESTATE_MAX_BYTES} bytes.`);
    }
    try {
      return parseBoundedJson(input, HOLDER_ESTATE_JSON_LIMITS);
    } catch (error) {
      throw new Error(`Holder estate is not valid bounded JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    validateBoundedJsonValue(input, HOLDER_ESTATE_JSON_LIMITS);
  } catch (error) {
    throw new Error(`Holder estate is not a valid bounded JSON value: ${error instanceof Error ? error.message : String(error)}`);
  }
  const encoded = JSON.stringify(input);
  if (encoded === undefined) throw new Error("Holder estate does not have a JSON representation.");
  if (byteLength(encoded) > HOLDER_ESTATE_MAX_BYTES) {
    throw new Error(`Holder estate exceeds ${HOLDER_ESTATE_MAX_BYTES} bytes.`);
  }
  return input;
}

export function parseHolderEstate(input: string | unknown): HolderEstateV1 {
  const value = parseHolderEstateInput(input);
  const raw = plainObject(value, "Holder estate");
  assertExactKeys(raw, ["format", "createdAt", "producer", "records", "summary", "integrity"], "Holder estate");
  if (raw.format !== HOLDER_ESTATE_FORMAT) throw new Error(`Unsupported holder estate format "${String(raw.format)}".`);
  if (typeof raw.createdAt !== "string" || !Number.isFinite(Date.parse(raw.createdAt))) {
    throw new Error("Holder estate createdAt is invalid.");
  }

  const producer = plainObject(raw.producer, "Holder estate producer");
  assertExactKeys(producer, ["runtime", "schemaVersion"], "Holder estate producer");
  if (producer.runtime !== "axm-world" || producer.schemaVersion !== 1) {
    throw new Error("Holder estate producer is unsupported.");
  }

  if (!Array.isArray(raw.records)) throw new Error("Holder estate records must be an array.");
  if (raw.records.length > HOLDER_ESTATE_MAX_RECORDS) {
    throw new Error(`Holder estate contains too many records (${raw.records.length}).`);
  }
  const records = raw.records.map((record, index) => parseRecord(record, index));
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.key)) throw new Error(`Holder estate repeats storage key ${record.key}.`);
    seen.add(record.key);
  }
  const ordered = [...records].sort((left, right) => compareStrings(left.key, right.key));
  if (records.some((record, index) => record.key !== ordered[index]?.key)) {
    throw new Error("Holder estate records must be sorted by storage key.");
  }

  const actualSummary = summarize(records);
  const summary = parseSummary(raw.summary);
  if (canonicalizeJson(summary) !== canonicalizeJson(actualSummary)) {
    throw new Error("Holder estate summary does not match its records.");
  }

  const integrity = plainObject(raw.integrity, "Holder estate integrity");
  assertExactKeys(integrity, ["algorithm", "digest"], "Holder estate integrity");
  if (integrity.algorithm !== HOLDER_ESTATE_INTEGRITY_ALGORITHM) {
    throw new Error(`Unsupported holder estate integrity algorithm "${String(integrity.algorithm)}".`);
  }
  if (typeof integrity.digest !== "string" || !/^estate1_[0-9a-f]{64}$/.test(integrity.digest)) {
    throw new Error("Holder estate integrity digest is invalid.");
  }

  const core: HolderEstateCoreV1 = {
    format: HOLDER_ESTATE_FORMAT,
    createdAt: raw.createdAt,
    producer: { runtime: "axm-world", schemaVersion: 1 },
    records,
    summary,
  };
  const expectedDigest = coreDigest(core);
  if (integrity.digest !== expectedDigest) {
    throw new Error(`Holder estate integrity mismatch: file has ${integrity.digest}, computed ${expectedDigest}.`);
  }

  const errors = validateKnownRecords(records);
  if (errors.length > 0) throw new Error(`Holder estate contains invalid known records: ${errors.join(" ")}`);

  return {
    ...core,
    integrity: { algorithm: HOLDER_ESTATE_INTEGRITY_ALGORITHM, digest: expectedDigest },
  };
}

function parseRecord(value: unknown, index: number): HolderEstateRecord {
  const raw = plainObject(value, `Holder estate record ${index}`);
  assertExactKeys(raw, ["key", "kind", "value", "byteLength", "sha256"], `Holder estate record ${index}`);
  if (typeof raw.key !== "string" || !isHolderNamespace(raw.key) || raw.key.includes("\u0000") || raw.key.length > 512) {
    throw new Error(`Holder estate record ${index} has an invalid key.`);
  }
  const kind = holderRecordKind(raw.key);
  if (raw.kind !== kind) throw new Error(`Holder estate record ${raw.key} has kind ${String(raw.kind)}; expected ${kind}.`);
  if (typeof raw.value !== "string") throw new Error(`Holder estate record ${raw.key} value must be a string.`);
  const bytes = byteLength(raw.value);
  if (bytes > HOLDER_ESTATE_MAX_RECORD_BYTES) throw new Error(`Holder estate record ${raw.key} is too large.`);
  if (raw.byteLength !== bytes) throw new Error(`Holder estate record ${raw.key} byteLength is incorrect.`);
  const digest = sha256Hex(raw.value);
  if (raw.sha256 !== digest) throw new Error(`Holder estate record ${raw.key} checksum is incorrect.`);
  return { key: raw.key, kind, value: raw.value, byteLength: bytes, sha256: digest };
}

function parseSummary(value: unknown): HolderEstateSummary {
  const raw = plainObject(value, "Holder estate summary");
  const keys: Array<keyof HolderEstateSummary> = [
    "records", "bytes", "cartridgeBayRecords", "runRecords", "experienceRecords",
    "presentationRecords", "preferenceRecords", "opaqueRecords",
  ];
  assertExactKeys(raw, keys, "Holder estate summary");
  const out = {} as HolderEstateSummary;
  for (const key of keys) {
    if (!Number.isSafeInteger(raw[key]) || (raw[key] as number) < 0) {
      throw new Error(`Holder estate summary.${key} must be a non-negative integer.`);
    }
    out[key] = raw[key] as number;
  }
  return out;
}

const HOLDER_TRUST_LEVELS = new Set<string>(["bundled", "imported-unsigned", "verified", "quarantined"]);
const HOLDER_OUTCOMES = new Set<string>(["success", "partial", "failure"]);
const HOLDER_GRADES = new Set<string>(["cleared", "partial", "failed"]);

interface HolderValidationContext {
  arcs: Map<string, Arc>;
  runs: Map<string, ProgramRunState>;
}

function validateKnownRecords(records: readonly HolderEstateRecord[]): string[] {
  const errors: string[] = [];
  const context: HolderValidationContext = { arcs: new Map(), runs: new Map() };

  for (const record of records.filter((entry) => entry.kind === "cartridge-bay")) {
    try {
      for (const [digest, arc] of parseCartridgeBayArcs(record)) context.arcs.set(digest, arc);
    } catch (error) {
      errors.push(`${record.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const record of records.filter((entry) => entry.kind === "run")) {
    try {
      const digest = record.key.slice(SAVE_KEY_PREFIX.length);
      context.runs.set(digest, validateRunRecord(record, context.arcs));
    } catch (error) {
      errors.push(`${record.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const record of records.filter((entry) => entry.kind !== "cartridge-bay" && entry.kind !== "run")) {
    errors.push(...validateKnownRecord(record, context));
  }
  return errors;
}

function parseCartridgeBayArcs(record: HolderEstateRecord): Array<[string, Arc]> {
  const value = parseBoundedJson(record.value, HOLDER_RECORD_JSON_LIMITS);
  const raw = plainObject(value, record.key);
  assertExactKeys(raw, ["version", "entries"], record.key);
  if ((raw.version !== 1 && raw.version !== 2) || !Array.isArray(raw.entries)) {
    throw new Error("cartridge bay must contain version 1 or 2 entries");
  }
  if (raw.entries.length > HOLDER_ESTATE_MAX_RECORDS) throw new Error("cartridge bay has too many entries");

  const seen = new Set<string>();
  return raw.entries.map((value, index): [string, Arc] => {
    const label = `${record.key}.entries[${index}]`;
    const entry = plainObject(value, label);
    assertAllowedKeys(entry, [
      "arc", "authoredArcDigest", "trust", "importedAt", "source",
      "people", "preferredCostume", "signature",
    ], label);
    assertRequiredKeys(entry, ["arc", "trust", "importedAt", "source"], label);

    const trust = holderTrustLevel(entry.trust, label);
    if (!Number.isSafeInteger(entry.importedAt) || (entry.importedAt as number) < 0) {
      throw new Error(`${label}.importedAt must be a non-negative integer`);
    }
    if (entry.source !== "bundled" && entry.source !== "file") {
      throw new Error(`${label}.source is unsupported`);
    }
    if (entry.preferredCostume !== undefined && (typeof entry.preferredCostume !== "string" || !isCostumeId(entry.preferredCostume))) {
      throw new Error(`${label}.preferredCostume is unsupported`);
    }
    if (entry.signature !== undefined && entry.signature !== null && typeof entry.signature !== "string") {
      throw new Error(`${label}.signature must be a string or null`);
    }

    const cartridge = parseCartridge({
      manifest: {
        ...(entry.preferredCostume !== undefined ? { preferredCostume: entry.preferredCostume } : {}),
        ...(entry.signature !== undefined ? { signature: entry.signature } : {}),
      },
      arc: entry.arc,
      ...(entry.people !== undefined ? { people: entry.people } : {}),
    }, trust);
    const digest = cartridgeDigest(cartridge.arc);
    if (raw.version === 2 && typeof entry.authoredArcDigest !== "string") {
      throw new Error(`${label}.authoredArcDigest is required for bay version 2`);
    }
    if (entry.authoredArcDigest !== undefined && entry.authoredArcDigest !== digest) {
      throw new Error(`${label}.authoredArcDigest does not match its Arc`);
    }
    if (seen.has(digest)) throw new Error(`${label} duplicates held cartridge ${digest}`);
    seen.add(digest);
    return [digest, cartridge.arc];
  });
}

function holderTrustLevel(value: unknown, label: string): TrustLevel {
  if (typeof value !== "string" || !HOLDER_TRUST_LEVELS.has(value)) {
    throw new Error(`${label}.trust is unsupported`);
  }
  return value as TrustLevel;
}

function validateRunRecord(record: HolderEstateRecord, arcs: ReadonlyMap<string, Arc>): ProgramRunState {
  const digest = record.key.slice(SAVE_KEY_PREFIX.length);
  if (!CART_DIGEST.test(digest)) throw new Error("run key lacks a cartridge digest");
  const arc = arcs.get(digest);
  if (!arc) throw new Error(`run slot has no held cartridge law for ${digest}`);

  const raw = plainObject(parseBoundedJson(record.value, HOLDER_RECORD_JSON_LIMITS), record.key);
  assertAllowedKeys(raw, [
    "version", "authoredArcDigest", "game", "ledger", "openingChoice", "openingChoiceId", "extensions",
  ], record.key);
  assertRequiredKeys(raw, ["version", "authoredArcDigest", "game", "ledger", "openingChoice"], record.key);
  if (raw.version !== 1 || raw.authoredArcDigest !== digest) {
    throw new Error("run slot identity does not match its key");
  }
  if (typeof raw.game !== "string") throw new Error("run slot game must be a serialized string");
  if (raw.openingChoice !== null && typeof raw.openingChoice !== "string") {
    throw new Error("run slot openingChoice must be a string or null");
  }
  if (raw.openingChoiceId !== undefined && raw.openingChoiceId !== null && typeof raw.openingChoiceId !== "string") {
    throw new Error("run slot openingChoiceId must be a string or null");
  }
  if (raw.extensions !== undefined) normalizePortableRunExtensions(raw.extensions);

  const storage: KVStorage = {
    getItem: (key) => key === record.key ? record.value : null,
    setItem: () => { throw new Error("holder validation storage is read-only"); },
    removeItem: () => { throw new Error("holder validation storage is read-only"); },
  };
  const state = loadRun(storage, { arc, authoredArcDigest: digest });
  if (!state) throw new Error("run slot cannot be resumed by its held cartridge");

  const game = validateStoredGame(raw.game, arc, state.org);
  validatePendingRewardChoices(game.pendingRewardChoices, arc, state.org);
  validateLedger(raw.ledger, digest, arc);
  return state;
}

function validateStoredGame(gameText: string, arc: Arc, org: Organization): Record<string, unknown> {
  const game = plainObject(parseBoundedJson(gameText, {
    maxBytes: 12 * 1024 * 1024,
    maxDepth: 96,
    maxNodes: 250_000,
    maxArrayItems: 50_000,
    maxObjectMembers: 50_000,
    maxStringBytes: HOLDER_ESTATE_MAX_RECORD_BYTES,
  }), "run slot serialized game");
  assertExactKeys(game, ["version", "savedAt", "arcRef", "organization", "pendingRewardChoices"], "run slot serialized game");
  if (game.version !== 2 && game.version !== 3) throw new Error("serialized game version is unsupported");
  if (typeof game.savedAt !== "string" || !Number.isFinite(Date.parse(game.savedAt))) {
    throw new Error("serialized game savedAt is invalid");
  }
  const arcRef = plainObject(game.arcRef, "run slot serialized game.arcRef");
  assertExactKeys(arcRef, ["id", "version", "digest"], "run slot serialized game.arcRef");
  const digest = cartridgeDigest(arc);
  if (arcRef.id !== arc.meta.id || arcRef.version !== arc.meta.version || arcRef.digest !== digest) {
    throw new Error("serialized game Arc identity does not match held cartridge law");
  }
  if (!Array.isArray(game.pendingRewardChoices)) throw new Error("serialized game pendingRewardChoices must be an array");
  validateOrganization(org, arc);
  return game;
}

function validateOrganization(org: Organization, arc: Arc): void {
  const raw = plainObject(org, "run slot organization");
  assertAllowedKeys(raw, [
    "id", "name", "reputation", "unlockedProgressionTiers", "resources", "infrastructure", "agents",
    "relationships", "precedents", "dramaQueue", "cycle", "distributionPolicy", "rngSeed", "cartridgeState",
    "recruitmentPool",
  ], "run slot organization");
  assertRequiredKeys(raw, [
    "id", "name", "reputation", "resources", "infrastructure", "agents", "relationships",
    "precedents", "dramaQueue", "cycle", "distributionPolicy", "rngSeed",
  ], "run slot organization");
  if (typeof raw.id !== "string" || typeof raw.name !== "string") throw new Error("organization identity is malformed");
  finiteNumber(raw.reputation, "organization.reputation");
  nonNegativeInteger(raw.cycle, "organization.cycle");
  if (!Number.isSafeInteger(raw.rngSeed)) throw new Error("organization.rngSeed must be an integer");
  if (raw.distributionPolicy !== "council" && raw.distributionPolicy !== "points" && raw.distributionPolicy !== "rotation") {
    throw new Error("organization.distributionPolicy is unsupported");
  }
  if (raw.unlockedProgressionTiers !== undefined) stringArray(raw.unlockedProgressionTiers, "organization.unlockedProgressionTiers");

  const resources = plainObject(raw.resources, "organization.resources");
  assertExactKeys(resources, ["currency", "materials", "tokens"], "organization.resources");
  finiteNumber(resources.currency, "organization.resources.currency");
  finiteNumber(resources.materials, "organization.resources.materials");
  finiteNumber(resources.tokens, "organization.resources.tokens");

  const agents = plainObject(raw.agents, "organization.agents");
  for (const [agentId, value] of Object.entries(agents)) validateAgent(value, agentId);
  const agentIds = new Set(Object.keys(agents));

  if (raw.recruitmentPool !== undefined) {
    if (!Array.isArray(raw.recruitmentPool)) throw new Error("organization.recruitmentPool must be an array");
    const candidateIds = new Set<string>();
    raw.recruitmentPool.forEach((candidate, index) => {
      const rawCandidate = plainObject(candidate, `organization.recruitmentPool[${index}]`);
      if (typeof rawCandidate.id !== "string" || rawCandidate.id.length === 0) {
        throw new Error(`organization recruitment candidate ${index} has an invalid id`);
      }
      const candidateId = rawCandidate.id;
      if (agentIds.has(candidateId)) {
        throw new Error(`organization recruitment candidate ${candidateId} overlaps an active agent`);
      }
      if (candidateIds.has(candidateId)) {
        throw new Error(`organization recruitment pool duplicates candidate ${candidateId}`);
      }
      candidateIds.add(candidateId);
      validateAgent(candidate, candidateId);
    });
  }

  const infrastructure = plainObject(raw.infrastructure, "organization.infrastructure");
  for (const [facilityId, value] of Object.entries(infrastructure)) {
    const facility = plainObject(value, `organization.infrastructure.${facilityId}`);
    assertExactKeys(facility, ["type", "level", "assignedAgents"], `organization.infrastructure.${facilityId}`);
    if (facility.type !== facilityId) throw new Error(`facility ${facilityId} type does not match its key`);
    nonNegativeInteger(facility.level, `organization.infrastructure.${facilityId}.level`);
    for (const agentId of stringArray(facility.assignedAgents, `organization.infrastructure.${facilityId}.assignedAgents`)) {
      if (!agentIds.has(agentId)) throw new Error(`facility ${facilityId} assigns unknown agent ${agentId}`);
    }
  }
  if (!Array.isArray(raw.relationships) || !Array.isArray(raw.precedents) || !Array.isArray(raw.dramaQueue)) {
    throw new Error("organization history collections must be arrays");
  }
  if (raw.cartridgeState !== undefined) plainObject(raw.cartridgeState, "organization.cartridgeState");

  const knownTiers = new Set(arc.progressionTiers.map((tier) => tier.id));
  for (const tierId of (raw.unlockedProgressionTiers ?? []) as string[]) {
    if (!knownTiers.has(tierId)) throw new Error(`organization names unknown progression tier ${tierId}`);
  }
}

function validateAgent(value: unknown, key: string): void {
  const agent = plainObject(value, `organization.agents.${key}`);
  assertRequiredKeys(agent, [
    "id", "name", "attributes", "hiddenAttributes", "traits", "role", "secondaryRole", "baseEfficiency",
    "tier", "upkeep", "morale", "stress", "attunements", "assignmentHistory", "afflictionHistory",
    "rewardHistory", "afflictionState", "equippedItems", "downedUntilCycle", "lastClearCycle",
    "revealedHiddenAttrs", "revealedTraits",
  ], `organization.agents.${key}`);
  if (agent.id !== key || typeof agent.name !== "string" || typeof agent.tier !== "string") {
    throw new Error(`organization agent ${key} identity is malformed`);
  }
  if (agent.role !== null && typeof agent.role !== "string") throw new Error(`organization agent ${key}.role is malformed`);
  if (agent.secondaryRole !== null && typeof agent.secondaryRole !== "string") throw new Error(`organization agent ${key}.secondaryRole is malformed`);
  for (const field of ["baseEfficiency", "upkeep", "morale", "stress", "revealedHiddenAttrs", "revealedTraits"] as const) {
    finiteNumber(agent[field], `organization agent ${key}.${field}`);
  }
  if (agent.downedUntilCycle !== null) nonNegativeInteger(agent.downedUntilCycle, `organization agent ${key}.downedUntilCycle`);
  plainObject(agent.attributes, `organization agent ${key}.attributes`);
  plainObject(agent.hiddenAttributes, `organization agent ${key}.hiddenAttributes`);
  plainObject(agent.afflictionState, `organization agent ${key}.afflictionState`);
  plainObject(agent.equippedItems, `organization agent ${key}.equippedItems`);
  plainObject(agent.lastClearCycle, `organization agent ${key}.lastClearCycle`);
  for (const field of ["traits", "attunements"] as const) stringArray(agent[field], `organization agent ${key}.${field}`);
  for (const field of ["assignmentHistory", "afflictionHistory", "rewardHistory"] as const) {
    if (!Array.isArray(agent[field])) throw new Error(`organization agent ${key}.${field} must be an array`);
  }
}

function validatePendingRewardChoices(value: unknown, arc: Arc, org: Organization): void {
  if (!Array.isArray(value)) throw new Error("pending reward choices must be an array");
  const items = new Set(arc.items.map((item) => item.id));
  const challenges = new Set(arc.challenges.map((challenge) => challenge.id));
  const agents = new Set(Object.keys(org.agents));
  value.forEach((candidate, index) => {
    const choice = plainObject(candidate, `pendingRewardChoices[${index}]`);
    assertExactKeys(choice, ["itemId", "eligibleAgentIds", "sourceChallenge", "cycle"], `pendingRewardChoices[${index}]`);
    if (typeof choice.itemId !== "string" || !items.has(choice.itemId)) throw new Error(`pending reward ${index} names an unknown item`);
    if (typeof choice.sourceChallenge !== "string" || !challenges.has(choice.sourceChallenge)) {
      throw new Error(`pending reward ${index} names an unknown challenge`);
    }
    const eligible = stringArray(choice.eligibleAgentIds, `pendingRewardChoices[${index}].eligibleAgentIds`);
    if (new Set(eligible).size !== eligible.length || eligible.some((id) => !agents.has(id))) {
      throw new Error(`pending reward ${index} has invalid eligible agents`);
    }
    nonNegativeInteger(choice.cycle, `pendingRewardChoices[${index}].cycle`);
  });
}

function validateLedger(value: unknown, digest: string, arc: Arc): void {
  const ledger = plainObject(value, "run slot ledger");
  assertExactKeys(ledger, ["version", "authoredArcDigest", "entries"], "run slot ledger");
  if (!Number.isSafeInteger(ledger.version) || (ledger.version as number) < 1 || (ledger.version as number) > LEDGER_SCHEMA_VERSION) {
    throw new Error("ledger version is unsupported");
  }
  if (ledger.authoredArcDigest !== digest || !Array.isArray(ledger.entries)) {
    throw new Error("ledger identity does not match run slot");
  }
  const challenges = new Map(arc.challenges.map((challenge) => [challenge.id, challenge]));
  ledger.entries.forEach((candidate, index) => {
    const entry = plainObject(candidate, `ledger.entries[${index}]`);
    assertAllowedKeys(entry, [
      "authoredArcDigest", "challengeId", "challengeName", "outcome", "cycle", "seq", "consequence",
    ], `ledger.entries[${index}]`);
    assertRequiredKeys(entry, ["authoredArcDigest", "challengeId", "challengeName", "outcome", "cycle", "seq"], `ledger.entries[${index}]`);
    const challenge = typeof entry.challengeId === "string" ? challenges.get(entry.challengeId) : undefined;
    if (entry.authoredArcDigest !== digest || !challenge || entry.challengeName !== challenge.name) {
      throw new Error(`ledger entry ${index} identity is malformed`);
    }
    if (typeof entry.outcome !== "string" || !HOLDER_OUTCOMES.has(entry.outcome)) throw new Error(`ledger entry ${index} outcome is malformed`);
    nonNegativeInteger(entry.cycle, `ledger entry ${index}.cycle`);
    if (entry.seq !== index) throw new Error(`ledger entry ${index} sequence is non-canonical`);
    if (entry.consequence !== undefined) validateConsequence(entry.consequence, entry.challengeId, entry.challengeName, entry.outcome);
  });
}

function validateConsequence(value: unknown, challengeId: unknown, challengeName: unknown, outcome: unknown): void {
  const consequence = plainObject(value, "ledger consequence");
  assertExactKeys(consequence, ["schemaVersion", "outcome", "contract", "party", "objectives", "rewards", "worldChanges"], "ledger consequence");
  if (consequence.schemaVersion !== CONSEQUENCE_SCHEMA_VERSION) throw new Error("consequence schema version is unsupported");

  const consequenceOutcome = plainObject(consequence.outcome, "ledger consequence.outcome");
  assertExactKeys(consequenceOutcome, ["grade"], "ledger consequence.outcome");
  if (typeof consequenceOutcome.grade !== "string" || !HOLDER_GRADES.has(consequenceOutcome.grade)) throw new Error("consequence grade is malformed");
  if (typeof outcome !== "string" || consequenceOutcome.grade !== gradeForOutcome(outcome as "success" | "partial" | "failure")) {
    throw new Error("consequence grade disagrees with ledger outcome");
  }

  const contract = plainObject(consequence.contract, "ledger consequence.contract");
  assertExactKeys(contract, ["id", "title"], "ledger consequence.contract");
  if (contract.id !== challengeId || contract.title !== challengeName) throw new Error("consequence contract disagrees with ledger entry");

  const party = plainObject(consequence.party, "ledger consequence.party");
  assertExactKeys(party, ["members"], "ledger consequence.party");
  if (!Array.isArray(party.members)) throw new Error("consequence party members must be an array");
  party.members.forEach((candidate, index) => {
    const member = plainObject(candidate, `ledger consequence.party.members[${index}]`);
    assertAllowedKeys(member, ["id", "name", "role"], `ledger consequence.party.members[${index}]`);
    assertRequiredKeys(member, ["id", "name"], `ledger consequence.party.members[${index}]`);
    if (typeof member.id !== "string" || typeof member.name !== "string") throw new Error("consequence party member identity is malformed");
    if (member.role !== undefined && typeof member.role !== "string") throw new Error("consequence party member role is malformed");
  });

  if (!Array.isArray(consequence.objectives) || !Array.isArray(consequence.rewards) || !Array.isArray(consequence.worldChanges)) {
    throw new Error("consequence collections must be arrays");
  }
  consequence.objectives.forEach((candidate, index) => {
    const objective = plainObject(candidate, `ledger consequence.objectives[${index}]`);
    assertExactKeys(objective, ["id", "label", "status"], `ledger consequence.objectives[${index}]`);
    if (typeof objective.id !== "string" || typeof objective.label !== "string" || typeof objective.status !== "string" || !HOLDER_GRADES.has(objective.status)) {
      throw new Error(`consequence objective ${index} is malformed`);
    }
  });
  consequence.rewards.forEach((candidate, index) => {
    const reward = plainObject(candidate, `ledger consequence.rewards[${index}]`);
    assertAllowedKeys(reward, ["kind", "label", "amount"], `ledger consequence.rewards[${index}]`);
    assertRequiredKeys(reward, ["kind", "label"], `ledger consequence.rewards[${index}]`);
    if (typeof reward.kind !== "string" || !["reputation", "gold", "supply", "item", "other"].includes(reward.kind) || typeof reward.label !== "string") {
      throw new Error(`consequence reward ${index} is malformed`);
    }
    if (reward.amount !== undefined) finiteNumber(reward.amount, `consequence reward ${index}.amount`);
  });
  consequence.worldChanges.forEach((candidate, index) => {
    const change = plainObject(candidate, `ledger consequence.worldChanges[${index}]`);
    assertExactKeys(change, ["kind", "targetId", "label"], `ledger consequence.worldChanges[${index}]`);
    if (typeof change.kind !== "string" || !["recorded", "unlocked", "flag_changed", "state_changed"].includes(change.kind)
      || typeof change.targetId !== "string" || typeof change.label !== "string") {
      throw new Error(`consequence world change ${index} is malformed`);
    }
  });
}

function validateExperienceRecord(record: HolderEstateRecord, context: HolderValidationContext): void {
  const digest = record.key.slice(EXPERIENCE_PREFIX.length);
  if (!CART_DIGEST.test(digest)) throw new Error("experience key lacks a cartridge digest");
  const arc = context.arcs.get(digest);
  if (!arc) throw new Error(`experience checkpoint has no held cartridge law for ${digest}`);
  const value = parseBoundedJson(record.value, HOLDER_RECORD_JSON_LIMITS);
  const raw = plainObject(value, record.key);
  assertExactKeys(raw, ["version", "authoredArcDigest", "stage", "challengeId", "partyIds", "difficultyModeId", "tokensSpent", "ledgerSeq"], record.key);
  const run = context.runs.get(digest);
  if (raw.stage !== "hall" && !run) throw new Error("non-hall checkpoint has no resumable run");
  const checkpoint = validateCheckpoint(
    value,
    digest,
    new Set(arc.challenges.map((challenge) => challenge.id)),
    new Set(run ? Object.keys(run.org.agents) : []),
    new Set(arc.difficultyModes.map((mode) => mode.id)),
  );
  if (!checkpoint) throw new Error("experience checkpoint cannot be resumed by its held cartridge and run");
}

function validateKnownRecord(record: HolderEstateRecord, context: HolderValidationContext): string[] {
  try {
    if (record.kind === "opaque-world") return [];
    if (record.kind === "locale") {
      if (record.value !== "en" && record.value !== "zh-Hant") throw new Error("locale is unsupported");
      return [];
    }
    if (record.kind === "presentation") {
      if (!isCostumeId(record.value)) throw new Error("presentation id is unsupported");
      const digest = record.key.slice(COSTUME_PREFIX.length);
      if (!CART_DIGEST.test(digest) || !context.arcs.has(digest)) throw new Error("presentation key lacks held cartridge law");
      return [];
    }
    if (record.kind === "experience") {
      validateExperienceRecord(record, context);
      return [];
    }
    if (record.kind === "sensory") {
      const raw = plainObject(parseBoundedJson(record.value, HOLDER_RECORD_JSON_LIMITS), record.key);
      assertExactKeys(raw, ["sound", "reducedMotion"], record.key);
      if (typeof raw.sound !== "boolean" || typeof raw.reducedMotion !== "boolean") throw new Error("sensory preferences are malformed");
      return [];
    }
    throw new Error(`unsupported known record kind ${record.kind}`);
  } catch (error) {
    return [`${record.key}: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function assertAllowedKeys(value: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const accepted = new Set(allowed);
  const unexpected = orderedKeys(value).filter((key) => !accepted.has(key));
  if (unexpected.length > 0) throw new Error(`${label} contains unsupported fields: ${unexpected.join(", ")}`);
}

function assertRequiredKeys(value: Record<string, unknown>, required: readonly string[], label: string): void {
  const missing = required.filter((key) => !(key in value));
  if (missing.length > 0) throw new Error(`${label} is missing required fields: ${missing.join(", ")}`);
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(`${label} must be a non-negative integer`);
  return value as number;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) throw new Error(`${label} must be an array of strings`);
  return value as string[];
}


export function preflightHolderEstate(
  storage: HolderStorage,
  input: HolderEstateV1 | string | unknown,
  mode: HolderEstateMode = "merge",
): HolderEstatePreflight {
  const estate = parseHolderEstate(input);
  const current = new Map(enumerateHolderKeys(storage).map((key) => [key, storage.getItem(key)]));
  const incoming = new Map(estate.records.map((record) => [record.key, record.value]));
  const add: string[] = [];
  const change: string[] = [];
  const unchanged: string[] = [];
  for (const record of estate.records) {
    if (!current.has(record.key)) add.push(record.key);
    else if (current.get(record.key) === record.value) unchanged.push(record.key);
    else change.push(record.key);
  }
  const remove = mode === "replace"
    ? [...current.keys()].filter((key) => !incoming.has(key)).sort(compareStrings)
    : [];
  return {
    mode,
    incomingRecords: estate.summary.records,
    incomingBytes: estate.summary.bytes,
    add,
    change,
    unchanged,
    remove,
    warnings: estate.records
      .filter((record) => record.kind === "opaque-world")
      .map((record) => `Opaque World namespace will be preserved exactly: ${record.key}`),
  };
}

export function importHolderEstate(
  storage: HolderStorage,
  input: HolderEstateV1 | string | unknown,
  options: { mode?: HolderEstateMode } = {},
): HolderEstateImportResult {
  let estate: HolderEstateV1;
  let preflight: HolderEstatePreflight;
  try {
    estate = parseHolderEstate(input);
    preflight = preflightHolderEstate(storage, estate, options.mode ?? "merge");
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : String(error)], rollbackErrors: [] };
  }

  const incoming = new Map(estate.records.map((record) => [record.key, record.value]));
  const changedKeys = [...preflight.add, ...preflight.change, ...preflight.remove];
  let snapshots: StoredSnapshot[];
  try {
    snapshots = changedKeys.map((key): StoredSnapshot => ({ key, value: storage.getItem(key) }));
  } catch (error) {
    return {
      ok: false,
      errors: [`Holder estate snapshot failed: ${error instanceof Error ? error.message : String(error)}`],
      rollbackErrors: [],
    };
  }

  try {
    for (const key of [...preflight.add, ...preflight.change].sort(compareStrings)) {
      storage.setItem(key, incoming.get(key)!);
    }
    for (const key of preflight.remove) {
      storage.removeItem(key);
      if (storage.getItem(key) !== null) throw new Error(`Holder estate removal verification failed for ${key}.`);
    }
    for (const [key, value] of incoming) {
      if (storage.getItem(key) !== value) throw new Error(`Holder estate read-back failed for ${key}.`);
    }
    return { ok: true, estate, preflight };
  } catch (error) {
    const rollbackErrors = restoreSnapshots(storage, snapshots);
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
      rollbackErrors,
    };
  }
}

function restoreSnapshots(storage: HolderStorage, snapshots: StoredSnapshot[]): string[] {
  const errors: string[] = [];
  for (const snapshot of [...snapshots].reverse()) {
    let operationError: unknown = null;
    try {
      if (snapshot.value === null) storage.removeItem(snapshot.key);
      else storage.setItem(snapshot.key, snapshot.value);
    } catch (error) {
      operationError = error;
    }

    try {
      const restored = storage.getItem(snapshot.key);
      if (restored !== snapshot.value) {
        const detail = operationError == null
          ? ""
          : ` after the storage adapter threw ${operationError instanceof Error ? operationError.message : String(operationError)}`;
        errors.push(`Rollback verification failed for ${snapshot.key}${detail}.`);
      }
    } catch (error) {
      errors.push(`Rollback read-back failed for ${snapshot.key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

export function downloadHolderEstate(estate: HolderEstateV1): void {
  const blob = new Blob([`${JSON.stringify(estate, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `rodoh-holder-estate-${estate.createdAt.slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function plainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error(`${label} must be a plain JSON object.`);
  return value as Record<string, unknown>;
}

function assertExactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = orderedKeys(value);
  const wanted = [...expected].sort(compareStrings);
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} fields must be exactly: ${wanted.join(", ")}.`);
  }
}

function canonicalizeJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Cannot canonicalize a non-finite number.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalizeJson(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    const object = plainObject(value, "Canonical holder-estate value");
    return `{${orderedKeys(object).map((key) => `${JSON.stringify(key)}:${canonicalizeJson(object[key])}`).join(",")}}`;
  }
  throw new Error(`Cannot canonicalize a value of type ${typeof value}.`);
}
