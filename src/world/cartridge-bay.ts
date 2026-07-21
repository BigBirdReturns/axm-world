// Cartridge bay: local, revision-preserving custody for every cartridge Rodoh can play.
//
// A held cartridge revision is identified by the computed digest of its validated
// Arc. A new application build or same-id import installs another revision beside
// it; it never rewrites bytes already held by the player. Trust is receiver-owned
// provenance, never file-authored content.

import type { Arc } from "../engine/types.js";
import { cartridgeDigest } from "../engine/cartridge-digest.js";
import {
  BUNDLED_CARTRIDGES,
  parseCartridge,
  type AuthoredPerson,
  type Cartridge,
  type TrustLevel,
} from "./cartridge.js";
import type { CostumeId } from "./presentation-prefs.js";
import { storageWriteFailure, type StorageWriteResult } from "./storage-result.js";

export interface CartridgeBayEntry {
  arc: Arc;
  /** Computed content identity of arc. Recomputed and repaired on load. */
  authoredArcDigest: string;
  trust: TrustLevel;
  importedAt: number;
  source: "bundled" | "file";
  people?: AuthoredPerson[];
  preferredCostume?: CostumeId;
  signature?: string | null;
}

interface BayFileV2 {
  version: 2;
  entries: CartridgeBayEntry[];
}

interface LegacyBayFileV1 {
  version: 1;
  entries: Array<Omit<CartridgeBayEntry, "authoredArcDigest"> & { authoredArcDigest?: string }>;
}

export const CARTRIDGE_BAY_KEY = "axm-world:cartridge-bay:v2";
export const LEGACY_CARTRIDGE_BAY_KEY = "axm-world:cartridge-bay:v1";

export interface CartridgeBayStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function normalizeEntry(value: unknown): CartridgeBayEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<CartridgeBayEntry>;
  if (!candidate.arc || typeof candidate.importedAt !== "number") return null;
  if (candidate.source !== "bundled" && candidate.source !== "file") return null;
  if (!candidate.trust) return null;
  try {
    const cartridge = parseCartridge({
      manifest: {
        preferredCostume: candidate.preferredCostume,
        signature: candidate.signature,
      },
      arc: candidate.arc,
      ...(candidate.people ? { people: candidate.people } : {}),
    }, candidate.trust);
    return {
      arc: cartridge.arc,
      authoredArcDigest: cartridgeDigest(cartridge.arc),
      trust: candidate.trust,
      importedAt: candidate.importedAt,
      source: candidate.source,
      ...(cartridge.people ? { people: cartridge.people } : {}),
      ...(cartridge.manifest.preferredCostume ? { preferredCostume: cartridge.manifest.preferredCostume } : {}),
      ...(cartridge.manifest.signature !== undefined ? { signature: cartridge.manifest.signature } : {}),
    };
  } catch {
    return null;
  }
}

export function loadCartridgeBay(storage: CartridgeBayStorage = localStorage): CartridgeBayEntry[] {
  try {
    const raw = storage.getItem(CARTRIDGE_BAY_KEY) ?? storage.getItem(LEGACY_CARTRIDGE_BAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BayFileV2 | LegacyBayFileV1;
    if (!parsed || !Array.isArray(parsed.entries) || (parsed.version !== 1 && parsed.version !== 2)) return [];
    const entries = parsed.entries.flatMap((entry) => {
      const normalized = normalizeEntry(entry);
      return normalized ? [normalized] : [];
    });
    // Malformed duplicates cannot survive migration. Preserve the first held
    // record for an exact digest and keep same-id/different-digest revisions.
    const seen = new Set<string>();
    return entries.filter((entry) => {
      if (seen.has(entry.authoredArcDigest)) return false;
      seen.add(entry.authoredArcDigest);
      return true;
    });
  } catch (error) {
    console.warn("loadCartridgeBay failed", error);
    return [];
  }
}

export function saveCartridgeBay(
  entries: CartridgeBayEntry[],
  storage: CartridgeBayStorage = localStorage,
): StorageWriteResult {
  try {
    const file: BayFileV2 = { version: 2, entries };
    storage.setItem(CARTRIDGE_BAY_KEY, JSON.stringify(file));
    return { ok: true };
  } catch (error) {
    console.warn("saveCartridgeBay failed", error);
    return storageWriteFailure(error, "Saving the cartridge shelf");
  }
}

/** Idempotently install every exact bundled revision. A changed bundled digest
 * is another held cartridge; it never mutates an earlier revision in place. */
export function ensureBundledCartridges(storage: CartridgeBayStorage = localStorage): CartridgeBayEntry[] {
  const entries = loadCartridgeBay(storage);
  let changed = false;
  for (const cartridge of BUNDLED_CARTRIDGES) {
    const digest = cartridgeDigest(cartridge.arc);
    if (entries.some((entry) => entry.authoredArcDigest === digest)) continue;
    entries.push({
      arc: cartridge.arc,
      authoredArcDigest: digest,
      trust: "bundled",
      importedAt: Date.now(),
      source: "bundled",
      ...(cartridge.people ? { people: cartridge.people } : {}),
      ...(cartridge.manifest.preferredCostume ? { preferredCostume: cartridge.manifest.preferredCostume } : {}),
      ...(cartridge.manifest.signature !== undefined ? { signature: cartridge.manifest.signature } : {}),
    });
    changed = true;
  }
  if (changed) saveCartridgeBay(entries, storage);
  return entries;
}

export function listCartridges(storage: CartridgeBayStorage = localStorage): CartridgeBayEntry[] {
  return ensureBundledCartridges(storage);
}

export type ImportCartridgeResult =
  | { ok: true; entry: CartridgeBayEntry; action: "new" | "revision" | "duplicate" }
  | { ok: false; errors: string[] };

function validateCartridgeJson(json: string): { ok: true; cartridge: Cartridge } | { ok: false; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { ok: false, errors: [`JSON parse error: ${(error as Error).message}`] };
  }
  try {
    return { ok: true, cartridge: parseCartridge(parsed, "imported-unsigned") };
  } catch (error) {
    const message = (error as Error).message;
    const lines = message.split("\n").slice(1).filter(Boolean);
    return { ok: false, errors: lines.length ? lines : [message] };
  }
}

export function installImportedCartridge(
  cartridge: Cartridge,
  storage: CartridgeBayStorage = localStorage,
): ImportCartridgeResult {
  const entries = loadCartridgeBay(storage);
  const digest = cartridgeDigest(cartridge.arc);
  const exact = entries.find((entry) => entry.authoredArcDigest === digest);
  if (exact) return { ok: true, entry: exact, action: "duplicate" };

  const sameId = entries.some((entry) => entry.arc.meta.id === cartridge.arc.meta.id);
  const entry: CartridgeBayEntry = {
    arc: cartridge.arc,
    authoredArcDigest: digest,
    trust: "imported-unsigned",
    importedAt: Date.now(),
    source: "file",
    ...(cartridge.people ? { people: cartridge.people } : {}),
    ...(cartridge.manifest.preferredCostume ? { preferredCostume: cartridge.manifest.preferredCostume } : {}),
    ...(cartridge.manifest.signature !== undefined ? { signature: cartridge.manifest.signature } : {}),
  };
  const write = saveCartridgeBay([...entries, entry], storage);
  if (!write.ok) return { ok: false, errors: [write.message] };
  return { ok: true, entry, action: sameId ? "revision" : "new" };
}

export function importCartridgeFromJson(
  json: string,
  storage: CartridgeBayStorage = localStorage,
): ImportCartridgeResult {
  const validated = validateCartridgeJson(json);
  if (!validated.ok) return validated;
  return installImportedCartridge(validated.cartridge, storage);
}

export type BayImportPreflight =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      digest: string;
      action: "new" | "revision" | "duplicate";
      existing: { digest: string; version: string; source: "bundled" | "file" } | null;
      sameIdBundled: { digest: string; version: string } | null;
    };

export function bayImportPreflight(json: string, entries: CartridgeBayEntry[]): BayImportPreflight {
  const validated = validateCartridgeJson(json);
  if (!validated.ok) return validated;
  const arc = validated.cartridge.arc;
  const digest = cartridgeDigest(arc);
  const sameIdBundledEntry = entries.find((entry) => entry.source === "bundled" && entry.arc.meta.id === arc.meta.id);
  const sameIdBundled = sameIdBundledEntry
    ? { digest: sameIdBundledEntry.authoredArcDigest, version: sameIdBundledEntry.arc.meta.version }
    : null;
  const sameDigest = entries.find((entry) => entry.authoredArcDigest === digest);
  if (sameDigest) {
    return {
      ok: true,
      digest,
      action: "duplicate",
      existing: { digest, version: sameDigest.arc.meta.version, source: sameDigest.source },
      sameIdBundled,
    };
  }
  const sameId = entries.find((entry) => entry.arc.meta.id === arc.meta.id);
  if (sameId) {
    return {
      ok: true,
      digest,
      action: "revision",
      existing: {
        digest: sameId.authoredArcDigest,
        version: sameId.arc.meta.version,
        source: sameId.source,
      },
      sameIdBundled,
    };
  }
  return { ok: true, digest, action: "new", existing: null, sameIdBundled };
}

/** Remove one exact file-sourced revision. Bundled revisions remain the floor. */
export function removeCartridge(
  authoredArcDigest: string,
  storage: CartridgeBayStorage = localStorage,
): StorageWriteResult {
  const entries = loadCartridgeBay(storage);
  const next = entries.filter(
    (entry) => !(entry.source === "file" && entry.authoredArcDigest === authoredArcDigest),
  );
  return saveCartridgeBay(next, storage);
}

export function cartridgeForEntry(entry: CartridgeBayEntry): Cartridge {
  if (entry.source === "bundled") {
    const bundled = BUNDLED_CARTRIDGES.find(
      (candidate) => cartridgeDigest(candidate.arc) === entry.authoredArcDigest,
    );
    if (bundled) return bundled;
  }
  return parseCartridge({
    manifest: {
      preferredCostume: entry.preferredCostume,
      signature: entry.signature,
    },
    arc: entry.arc,
    ...(entry.people ? { people: entry.people } : {}),
  }, entry.trust);
}
