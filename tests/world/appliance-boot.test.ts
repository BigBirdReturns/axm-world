// PR 054 — the generic appliance boot. `applianceRosterSize` already read a
// cartridge's real roster requirement, but only the appliance tests ever
// passed it to `bootstrapOrg`; the runtime's own fresh-boot path
// (`useArcWorld.ts`) called `bootstrapOrg(arc)` with no options at all, so a
// cartridge whose encounters need more than the bootstrap default's 6 agents
// could never field its own party in the real client.
//
// `applianceBootOptions(arc)` is the pure seam this PR wires into
// `useArcWorld`'s fresh-boot branch: it is the exact `BootstrapOptions`
// object the runtime now passes to `bootstrapOrg`. Testing it directly here
// (rather than rendering `useArcWorld`, which this codebase has no
// react-testing-library seam for) proves the boot DECISION is correct; the
// e2e appliance receipt proves the wiring is live in the running app.
import { beforeEach, describe, expect, it } from "vitest";
import {
  cartridgeForEntry,
  importCartridgeFromJson,
} from "../../src/world/cartridge-bay.js";
import {
  applianceBootOptions,
  applianceRosterSize,
  firstLockoutCartridgeJson,
} from "../../src/world/appliance/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { MINI_ARC } from "../fixtures/mini-arc.js";
import type { Arc } from "../../src/engine/types.js";

// Same in-memory localStorage stand-in as the other appliance tests
// (tests/world/appliance-encounter.test.ts, appliance-ledger.test.ts) — the
// bay's import seam persists to localStorage, which vitest's `node`
// environment doesn't provide.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

/** Boot first-lockout through the real import seam and return its arc — the
 *  cartridge `applianceRosterSize` exists for (its challenges all need 8-10). */
function bootFirstLockout(): Arc {
  const result = importCartridgeFromJson(firstLockoutCartridgeJson());
  if (!result.ok) throw new Error(`import failed: ${result.errors.join(", ")}`);
  return cartridgeForEntry(result.entry).arc;
}

describe("applianceBootOptions — the runtime's fresh-boot sizing decision", () => {
  it("pins bootstrapOrg's own default (today's behavior) at 6", () => {
    // The behavior this whole PR must leave untouched for a requirement-less
    // cartridge: bootstrapOrg's own `rosterSize ?? 6` default.
    const org = bootstrapOrg(MINI_ARC);
    expect(Object.keys(org.agents).length).toBe(6);
  });

  it("sizes a big-roster cartridge (first-lockout: maxAgents 10) to fit its own encounters", () => {
    const arc = bootFirstLockout();
    const opts = applianceBootOptions(arc);
    expect(opts.rosterSize).toBe(10);
    expect(opts.rosterSize).toBe(applianceRosterSize(arc));

    // The org this PR's wiring actually produces — big enough to field the
    // gate-warden's 8-10 agent party, where the old flat default of 6 could not.
    const org = bootstrapOrg(arc, opts);
    expect(Object.keys(org.agents).length).toBe(10);
    expect(Object.keys(org.agents).length).toBeGreaterThanOrEqual(10);
  });

  it("falls back to bootstrapOrg's own default for a cartridge that declares no roster requirements", () => {
    // A cartridge with no challenges at all declares no roster requirement —
    // applianceRosterSize returns undefined (its own documented fallback).
    const noRequirementsArc: Arc = { ...MINI_ARC, challenges: [] };
    const opts = applianceBootOptions(noRequirementsArc);
    expect(opts.rosterSize).toBeUndefined();

    // `bootstrapOrg`'s `?? 6` treats an explicit `rosterSize: undefined` key
    // identically to omitting the option entirely, so passing this object is
    // byte-identical to calling bootstrapOrg(arc) outright (Article 5: old
    // cartridges always boot exactly as they did before this PR).
    const withOptions = bootstrapOrg(noRequirementsArc, opts);
    const withoutOptions = bootstrapOrg(noRequirementsArc);
    expect(Object.keys(withOptions.agents).length).toBe(6);
    // Not just the same count — the identical deterministic org (same seed
    // derivation, same generated agents), proving the key is truly a no-op.
    expect(JSON.stringify(withOptions)).toBe(JSON.stringify(withoutOptions));
  });
});
