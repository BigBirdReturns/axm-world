// RFC_APPLIANCE_EXPANSION PR 056 — per-cartridge memory, listed. The bay
// surfaces what world's digest-keyed appliance ledger remembers for EVERY
// entry, not only a program of record: a classic (imported) cartridge and
// Karazhan get their own save slot the moment they are played, keyed by their
// own computed authored-arc digest (save.ts, cartridgeIdentity) — exactly the
// same persistence seam a program of record uses. The map (see PR 056's own
// report) found no second ledger location to invent: Player.tsx simply never
// READ that slot for non-program entries before this PR. This test proves the
// read now happens through the ONE existing summarizer (readProgramSaveSummary,
// itself built on summarizeLedger) and that a never-played entry surfaces
// nothing (honest omission, not a fabricated "fresh" claim).
import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  cartridgeForEntry,
  importCartridgeFromJson,
} from "../../src/world/cartridge-bay.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { FIRST_LOCKOUT_DIGEST, firstLockoutCartridgeJson } from "../../src/world/appliance/index.js";
import { appendResult, emptyLedger } from "../../src/world/ledger.js";
import { saveRun, readProgramSaveSummary, type KVStorage } from "../../src/world/save.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

function fakeStorage(): KVStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

// importCartridgeFromJson reads/writes the bay's own localStorage entry
// (unrelated to save.ts's per-digest slots this test otherwise uses a fake
// KVStorage for) — give it a real Storage-shaped global so bootFirstLockout
// doesn't warn on a bare node environment (matches appliance-ledger.test.ts).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, value); }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

function bootFirstLockout() {
  const result = importCartridgeFromJson(firstLockoutCartridgeJson());
  if (!result.ok) throw new Error(`import failed: ${result.errors.join(", ")}`);
  return cartridgeForEntry(result.entry);
}

describe("bay wiring reads the SAME save-slot summary for every entry (#83 PR 056)", () => {
  const player = read("src/world/Player.tsx");
  const card = read("src/world/components/CartridgeBayCard.tsx");

  it("Player.tsx no longer gates the read on being a program of record", () => {
    // The old shape: `program ? readProgramSaveSummary(...) : null`. A classic
    // (imported) cartridge or Karazhan must get the same read.
    expect(player).not.toMatch(/program \? readProgramSaveSummary/);
    expect(player).toContain("readProgramSaveSummary(localStorage, { arc: c.arc, authoredArcDigest: digest })");
  });

  it("CartridgeBayCard renders the memory line via the shared save summary, not a second derivation", () => {
    expect(card).toContain('data-testid="bay-memory"');
    // Built from `save` (readProgramSaveSummary's ProgramSaveSummary), never a
    // parallel summarizeLedger call inside the component.
    expect(card).toContain("function MemoryLine({ save }: { save: ProgramSaveSummary | null })");
    expect(card).not.toContain("summarizeLedger(");
    expect(card).toContain("<MemoryLine save={save} />");
  });
});

describe("bay memory: a committed ledger for an imported cartridge surfaces the right summary", () => {
  it("summarizes plays + last outcome for first-lockout through the real persistence seam", () => {
    const cartridge = bootFirstLockout();
    const digest = cartridgeIdentity(cartridge);
    expect(digest).toBe(FIRST_LOCKOUT_DIGEST);

    // Build the ledger via the same appendResult idiom appliance-ledger.test.ts
    // uses, then commit it through the REAL persistence seam (saveRun) — not a
    // hand-rolled storage blob.
    let ledger = emptyLedger(digest);
    ledger = appendResult(ledger, { challengeId: "the-gate-warden", challengeName: "The Gate-Warden", outcome: "success", cycle: 1 });
    ledger = appendResult(ledger, { challengeId: "the-gate-warden", challengeName: "The Gate-Warden", outcome: "partial", cycle: 2 });

    const storage = fakeStorage();
    const org = bootstrapOrg(cartridge.arc);
    saveRun(storage, { arc: cartridge.arc, authoredArcDigest: digest, state: { org, ledger } });

    // This is exactly what Player.tsx now computes for ANY bay entry, program
    // of record or not — the one shared read.
    const save = readProgramSaveSummary(storage, { arc: cartridge.arc, authoredArcDigest: digest });
    expect(save).not.toBeNull();
    expect(save!.ledgerEntryCount).toBe(2);
    expect(save!.lastResult).toEqual({ challengeName: "The Gate-Warden", outcome: "partial" });
  });

  it("a fresh entry (never played, no save slot) surfaces nothing — honest omission", () => {
    const cartridge = bootFirstLockout();
    const digest = cartridgeIdentity(cartridge);
    const storage = fakeStorage();
    // Nothing saved for this digest at all.
    const save = readProgramSaveSummary(storage, { arc: cartridge.arc, authoredArcDigest: digest });
    expect(save).toBeNull();
  });

  it("a save slot with an opened-but-unplayed cartridge (0 ledger entries) still renders nothing", () => {
    // A save slot can exist (org state persisted the moment WorldHost mounts)
    // before any contract is ever resolved. The bay must not claim a "run"
    // that never happened: MemoryLine treats entryCount 0 the same as no save
    // at all (see CartridgeBayCard.tsx's MemoryLine — entryCount === 0 renders
    // null, not a fabricated fresh/resumable claim).
    const cartridge = bootFirstLockout();
    const digest = cartridgeIdentity(cartridge);
    const storage = fakeStorage();
    saveRun(storage, { arc: cartridge.arc, authoredArcDigest: digest, state: { org: bootstrapOrg(cartridge.arc), ledger: emptyLedger(digest) } });
    const save = readProgramSaveSummary(storage, { arc: cartridge.arc, authoredArcDigest: digest });
    expect(save).not.toBeNull();
    expect(save!.ledgerEntryCount).toBe(0);
    // MemoryLine's own guard (asserted textually above) is what turns this
    // into "render nothing" — this test proves the DATA behind that guard.
  });
});

describe("PR 058 — a11y pass: bay root region + live regions on the import flow (arc 078/068 parity)", () => {
  const player = read("src/world/Player.tsx");

  it("the bay screen root is a named landmark region, reusing the visible heading key", () => {
    // No new i18n key: the region's accessible name is the SAME key the
    // screen's own <h1> already renders (boot.heroTitle) — one fact, not a
    // second string to keep in sync.
    expect(player).toContain('role="region" aria-label={t("boot.heroTitle")}');
  });

  it("the import error display is a role=alert, the preflight/success reports are role=status", () => {
    expect(player).toMatch(/data-testid="import-errors"[\s\S]{0,80}role="alert"/);
    expect(player).toMatch(/data-testid="import-success"[\s\S]{0,80}role="status"/);
    expect(player).toMatch(/data-testid="bay-import-preflight"[\s\S]{0,80}role="status"/);
  });
});

describe("PR 057 — classic-row save-state indicator (bay-save-state)", () => {
  const card = read("src/world/components/CartridgeBayCard.tsx");
  const player = read("src/world/Player.tsx");

  it("ClassicRow renders a save-state line, reusing the same `save` prop as MemoryLine", () => {
    expect(card).toContain('data-testid="bay-save-state"');
    expect(card).toContain("function SaveStateLine({ save }");
    // Same documented semantics the ProgramPlaque already uses: `save !== null`
    // ⇒ resumable. No second derivation invented for the classic row.
    expect(card).toContain("const resumable = save !== null;");
    expect(card).toContain("<SaveStateLine save={save} />");
  });

  it("uses the honest wording pair: reuses boot.resumable, but a neutral boot.freshEntry (not boot.freshProgram)", () => {
    // boot.freshProgram says "program" — true of the ProgramPlaque, a lie on a
    // classic row (an imported cartridge, or Karazhan, are never "a program").
    // SaveStateLine must not reach for that copy.
    const saveStateFn = card.slice(card.indexOf("function SaveStateLine"), card.indexOf("function ClassicRow"));
    expect(saveStateFn).toContain('t("boot.resumable")');
    expect(saveStateFn).toContain('t("boot.freshEntry")');
    expect(saveStateFn).not.toContain('t("boot.freshProgram")');
  });

  it("associates historical evidence only with the exact bundled revision", () => {
    expect(player).toContain('entry.source === "bundled"');
    expect(player).toContain("digest === EXPECTED_BUNDLED_DIGESTS[c.arc.meta.id]");
    expect(player).toContain("LEGACY_BUNDLED_DIGESTS[c.arc.meta.id]");
  });

  it("keeps legacy evidence independent from current resumability", () => {
    expect(card).toContain('data-testid="bay-legacy-evidence"');
    expect(card).toContain("<LegacyEvidenceLine legacySave={legacySave} />");
    expect(card).toContain('t("boot.legacyRunUnavailable")');
    expect(card).toContain("const resumable = save !== null;");
    expect(card).not.toContain("const resumable = legacySave");
  });

  it("the underlying save-presence facts drive resumable vs fresh exactly as documented", () => {
    // Logic-level proof of the same `save !== null` decision SaveStateLine
    // renders: a never-played cartridge has no save slot (fresh); a played one
    // (committed through the real persistence seam) does (resumable).
    const cartridge = bootFirstLockout();
    const digest = cartridgeIdentity(cartridge);
    const storage = fakeStorage();

    const freshSave = readProgramSaveSummary(storage, { arc: cartridge.arc, authoredArcDigest: digest });
    expect(freshSave).toBeNull(); // fresh: no save slot exists yet

    let ledger = emptyLedger(digest);
    ledger = appendResult(ledger, { challengeId: "the-gate-warden", challengeName: "The Gate-Warden", outcome: "success", cycle: 1 });
    const org = bootstrapOrg(cartridge.arc);
    saveRun(storage, { arc: cartridge.arc, authoredArcDigest: digest, state: { org, ledger } });

    const resumableSave = readProgramSaveSummary(storage, { arc: cartridge.arc, authoredArcDigest: digest });
    expect(resumableSave).not.toBeNull(); // resumable: a genuine save slot now exists
  });
});
