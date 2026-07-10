// Cartridge bay: the localStorage store of cartridges available to axm-world.
//
// This is the loader door the positioning doc calls out — the missing piece
// between "any valid arc is engine-compatible with world" (bootstrapOrg makes
// any arc playable) and "you can actually open one" (this file). It mirrors
// axm-arc's arc-library.ts on purpose: same trust taxonomy, same "never
// half-load an invalid arc" contract, same "bundled entries are permanent,
// only imports can be removed" rule. Do not invent a different shape here —
// the hub and the world should feel like the same platform.
//
// What's stored is the bare, validated Arc plus bay-only provenance (trust,
// when it was imported, and whether it came bundled or from a file) — not a
// full Cartridge envelope. `cartridgeForEntry` is the seam that turns a bay
// entry into something playable: the bundled entry resolves to the real
// FIRST_CHARTER_CARTRIDGE (so its authored opening survives), and every other
// entry is wrapped with `parseCartridge`, which is exactly what a cartridge
// with no authored opening needs — `useArcWorld` already treats a missing
// `cartridge.opening` as "no opening decision", and `bootstrapOrg` already
// gives it a populated roster.

import type { Arc } from "../engine/types.js";
import { validateArc } from "../engine/schema.js";
import { cartridgeDigest } from "../engine/cartridge-digest.js";
import { BUNDLED_CARTRIDGES, parseCartridge, type Cartridge, type TrustLevel } from "./cartridge.js";

export interface CartridgeBayEntry {
  arc: Arc;
  trust: TrustLevel;
  /** When this entry entered the bay. Bundled entries carry the first-seen time. */
  importedAt: number;
  /** Provenance of *how* the arc entered the bay, not of the arc's content. */
  source: "bundled" | "file";
}

interface BayFile {
  version: 1;
  entries: CartridgeBayEntry[];
}

const BAY_KEY = "axm-world:cartridge-bay:v1";

export function loadCartridgeBay(): CartridgeBayEntry[] {
  try {
    const raw = localStorage.getItem(BAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BayFile;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return [];
    return parsed.entries;
  } catch (e) {
    console.warn("loadCartridgeBay failed", e);
    return [];
  }
}

function saveCartridgeBay(entries: CartridgeBayEntry[]): void {
  try {
    const file: BayFile = { version: 1, entries };
    localStorage.setItem(BAY_KEY, JSON.stringify(file));
  } catch (e) {
    console.warn("saveCartridgeBay failed", e);
  }
}

// Idempotently ensure every bundled cartridge (today: just FIRST_CHARTER) has a
// bay entry. Refreshes the arc payload on existing bundled entries (so engine/
// content updates ship to returning users) but preserves the original
// importedAt. Returns the full, current entry list.
export function ensureBundledCartridges(): CartridgeBayEntry[] {
  const entries = loadCartridgeBay();
  for (const cartridge of BUNDLED_CARTRIDGES) {
    const idx = entries.findIndex(
      (e) => e.source === "bundled" && e.arc.meta.id === cartridge.arc.meta.id,
    );
    if (idx >= 0) {
      entries[idx] = { ...entries[idx]!, arc: cartridge.arc, trust: "bundled" };
    } else {
      entries.push({
        arc: cartridge.arc,
        trust: "bundled",
        importedAt: Date.now(),
        source: "bundled",
      });
    }
  }
  saveCartridgeBay(entries);
  return entries;
}

/** Every cartridge available to this player: bundled first, then imports. */
export function listCartridges(): CartridgeBayEntry[] {
  return ensureBundledCartridges();
}

export type ImportCartridgeResult =
  | { ok: true; entry: CartridgeBayEntry }
  | { ok: false; errors: string[] };

// Parse + validate a JSON string against the arc schema, without touching the
// bay. This is the validate-only half of importCartridgeFromJson, factored
// out (arc-library.ts's validateArcJson pattern) so the write path and the
// read-only preflight report below share one validator — never two.
function validateCartridgeJson(json: string): { ok: true; arc: Arc } | { ok: false; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    return { ok: false, errors: [`JSON parse error: ${(e as Error).message}`] };
  }
  try {
    return { ok: true, arc: validateArc(parsed) };
  } catch (e) {
    const msg = (e as Error).message;
    // validateArc throws "Invalid arc:\n[path] msg\n[path] msg" — split it into
    // individual lines so the boot screen can list them, matching the hub.
    const lines = msg.split("\n").slice(1).filter((s) => s.length > 0);
    return { ok: false, errors: lines.length > 0 ? lines : [msg] };
  }
}

// Validate a JSON string and, on success, add it to the bay as an imported,
// unsigned cartridge. Never throws — validation errors come back as strings so
// callers (the boot screen) can render them without a half-loaded cartridge
// ever reaching the player.
export function importCartridgeFromJson(json: string): ImportCartridgeResult {
  const validated = validateCartridgeJson(json);
  if (!validated.ok) return validated;
  const arc = validated.arc;

  const entries = loadCartridgeBay();
  // Re-importing the same id updates the existing file-sourced entry; a
  // bundled entry with the same id is never touched or shadowed.
  const filtered = entries.filter((e) => !(e.source === "file" && e.arc.meta.id === arc.meta.id));
  const entry: CartridgeBayEntry = {
    arc,
    trust: "imported-unsigned",
    importedAt: Date.now(),
    source: "file",
  };
  filtered.push(entry);
  saveCartridgeBay(filtered);
  return { ok: true, entry };
}

// Import preflight: an honest custody report computed BEFORE anything
// persists (arc-073 parity, adapted to the bay's (id, source) keying). It
// reuses `validateCartridgeJson` verbatim — no second validator — and never
// mutates the entries it reads: every lookup below is a `find`, not a filter
// assignment, and the function returns without calling `saveCartridgeBay`.
//
// It reports what `importCartridgeFromJson` will ACTUALLY do, never a
// different story: that function always replaces any existing file-sourced
// entry sharing the incoming id (see the `filtered` line above) and never
// touches a same-id bundled entry. So here:
//   - "duplicate": some held entry (bundled or file) already has this exact
//     content digest — the write would be a byte-identical re-import.
//   - "update": a FILE entry shares this id with different content — the
//     write replaces it, mirroring `filtered`'s same-id/source==="file" test.
//   - "new": neither of the above — the write adds a fresh entry.
// `sameIdBundled` is reported independent of the action above: a bundled
// entry sharing the incoming id is never overwritten by import, no matter
// what action fires, and that fact is worth surfacing whenever it's true.
export type BayImportPreflight =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      digest: string; // cartridgeDigest of the incoming arc
      action: "new" | "update" | "duplicate";
      existing: { digest: string; version: string; source: "bundled" | "file" } | null;
      sameIdBundled: { digest: string; version: string } | null;
    };

export function bayImportPreflight(json: string, entries: CartridgeBayEntry[]): BayImportPreflight {
  const validated = validateCartridgeJson(json);
  if (!validated.ok) return validated;
  const arc = validated.arc;
  const digest = cartridgeDigest(arc);

  const sameIdBundledEntry = entries.find((e) => e.source === "bundled" && e.arc.meta.id === arc.meta.id);
  const sameIdBundled = sameIdBundledEntry
    ? { digest: cartridgeDigest(sameIdBundledEntry.arc), version: sameIdBundledEntry.arc.meta.version }
    : null;

  const sameDigestEntry = entries.find((e) => cartridgeDigest(e.arc) === digest);
  if (sameDigestEntry) {
    return {
      ok: true,
      digest,
      action: "duplicate",
      existing: {
        digest: cartridgeDigest(sameDigestEntry.arc),
        version: sameDigestEntry.arc.meta.version,
        source: sameDigestEntry.source,
      },
      sameIdBundled,
    };
  }

  const sameIdFileEntry = entries.find((e) => e.source === "file" && e.arc.meta.id === arc.meta.id);
  if (sameIdFileEntry) {
    return {
      ok: true,
      digest,
      action: "update",
      existing: {
        digest: cartridgeDigest(sameIdFileEntry.arc),
        version: sameIdFileEntry.arc.meta.version,
        source: sameIdFileEntry.source,
      },
      sameIdBundled,
    };
  }

  return { ok: true, digest, action: "new", existing: null, sameIdBundled };
}

// Only file-sourced entries can be removed. Bundled entries are the floor
// every player always has.
export function removeCartridge(arcId: string): void {
  const entries = loadCartridgeBay();
  const next = entries.filter((e) => !(e.source === "file" && e.arc.meta.id === arcId));
  saveCartridgeBay(next);
}

// Turn a bay entry into the playable Cartridge the world's boot flow needs.
// The bundled entry resolves to the real BUNDLED_CARTRIDGES member (preserving
// its authored opening/preferredCostume); every other entry — imported now, or
// a future non-first-charter bundled cartridge — is wrapped generically, which
// yields no authored opening and the default "board" costume. Both paths are
// fully playable: `useArcWorld` bootstraps a roster via `bootstrapOrg` either
// way and only enqueues an opening card when one exists.
export function cartridgeForEntry(entry: CartridgeBayEntry): Cartridge {
  if (entry.source === "bundled") {
    const bundled = BUNDLED_CARTRIDGES.find((c) => c.arc.meta.id === entry.arc.meta.id);
    if (bundled) return bundled;
  }
  return parseCartridge(entry.arc, entry.trust);
}
