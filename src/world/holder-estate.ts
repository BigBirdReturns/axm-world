// Whole-holder custody for Rodoh. A portable run moves one changed cartridge;
// rodoh-holder-estate/v1 moves every World-owned browser record together without
// making the browser profile or this runtime the owner of those records.

import { sha256Hex } from "../engine/cartridge-digest.js";
import { orderedKeys } from "../engine/determinism.js";
import { CARTRIDGE_BAY_KEY, LEGACY_CARTRIDGE_BAY_KEY } from "./cartridge-bay.js";
import { SAVE_KEY_PREFIX, type KVStorage } from "./save.js";
import { isCostumeId } from "./presentation-prefs.js";

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
    const value = typeof input === "string" ? JSON.parse(input) as unknown : input;
    return !!value && typeof value === "object" && !Array.isArray(value)
      && (value as Record<string, unknown>)["format"] === HOLDER_ESTATE_FORMAT;
  } catch {
    return false;
  }
}

export function parseHolderEstate(input: string | unknown): HolderEstateV1 {
  if (typeof input === "string" && byteLength(input) > HOLDER_ESTATE_MAX_BYTES) {
    throw new Error(`Holder estate exceeds ${HOLDER_ESTATE_MAX_BYTES} bytes.`);
  }
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      throw new Error("Holder estate is not valid JSON.");
    }
  }
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

  const errors = records.flatMap(validateKnownRecord);
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

function validateKnownRecord(record: HolderEstateRecord): string[] {
  try {
    if (record.kind === "opaque-world") return [];
    if (record.kind === "locale") {
      if (record.value !== "en" && record.value !== "zh-Hant") throw new Error("locale is unsupported");
      return [];
    }
    if (record.kind === "presentation") {
      if (!isCostumeId(record.value)) throw new Error("presentation id is unsupported");
      const digest = record.key.slice(COSTUME_PREFIX.length);
      if (!CART_DIGEST.test(digest)) throw new Error("presentation key lacks a cartridge digest");
      return [];
    }
    const value = JSON.parse(record.value) as unknown;
    const raw = plainObject(value, record.key);
    if (record.kind === "run") {
      const digest = record.key.slice(SAVE_KEY_PREFIX.length);
      if (!CART_DIGEST.test(digest) || raw.authoredArcDigest !== digest || raw.version !== 1) {
        throw new Error("run slot identity does not match its key");
      }
    } else if (record.kind === "experience") {
      const digest = record.key.slice(EXPERIENCE_PREFIX.length);
      if (!CART_DIGEST.test(digest) || raw.authoredArcDigest !== digest || raw.version !== 1) {
        throw new Error("experience checkpoint identity does not match its key");
      }
    } else if (record.kind === "sensory") {
      if (typeof raw.sound !== "boolean" || typeof raw.reducedMotion !== "boolean") {
        throw new Error("sensory preferences are malformed");
      }
    } else if (record.kind === "cartridge-bay") {
      if ((raw.version !== 1 && raw.version !== 2) || !Array.isArray(raw.entries)) {
        throw new Error("cartridge bay is malformed");
      }
    }
    return [];
  } catch (error) {
    return [`${record.key}: ${error instanceof Error ? error.message : String(error)}`];
  }
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
  const snapshots = changedKeys.map((key): StoredSnapshot => ({ key, value: storage.getItem(key) }));

  try {
    for (const key of [...preflight.add, ...preflight.change].sort(compareStrings)) {
      storage.setItem(key, incoming.get(key)!);
    }
    for (const key of preflight.remove) storage.removeItem(key);
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
    try {
      if (snapshot.value === null) storage.removeItem(snapshot.key);
      else storage.setItem(snapshot.key, snapshot.value);
    } catch (error) {
      errors.push(`Rollback failed for ${snapshot.key}: ${error instanceof Error ? error.message : String(error)}`);
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
