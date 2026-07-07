// PR 006 — the appliance cartridge proof: first-lockout, authored in arc,
// imports into world through the native bay seam and digest-identifies to the
// exact same `cart1_` as arc pins. This is the two-client model made testable:
// one cartridge, two expressions, one identity.
import { beforeEach, describe, expect, it } from "vitest";
import {
  cartridgeForEntry,
  importCartridgeFromJson,
  loadCartridgeBay,
} from "../../src/world/cartridge-bay.js";
import { cartridgeIdentity } from "../../src/world/cartridge-identity.js";
import { cartridgeDigest } from "../../src/engine/cartridge-digest.js";
import {
  FIRST_LOCKOUT_DIGEST,
  firstLockoutArc,
  firstLockoutCartridgeJson,
} from "../../src/world/appliance/index.js";

// vitest runs under the `node` environment (no localStorage); the bay's
// persistence idiom is plain localStorage, so mirror cartridge-bay.test.ts's
// in-memory stand-in to exercise the real import path.
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

describe("appliance cartridge: first-lockout", () => {
  it("the pinned digest matches the authored arc's content identity", () => {
    // The pin is the shared truth; if the copied cartridge drifts from arc, this
    // fails before anything downstream can trust it.
    expect(cartridgeDigest(firstLockoutArc as never)).toBe(FIRST_LOCKOUT_DIGEST);
  });

  it("imports through the native bay seam on world's current engine", () => {
    const result = importCartridgeFromJson(firstLockoutCartridgeJson());
    // Validating on world's *vendored* engine — proves no schema drift blocks
    // the appliance path before the diagnostics sync (PR 007).
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.source).toBe("file");
    expect(result.entry.trust).toBe("imported-unsigned");
  });

  it("digest-identifies in world to the same cart1_ arc pins", () => {
    const result = importCartridgeFromJson(firstLockoutCartridgeJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const bay = loadCartridgeBay();
    const entry = bay.find((e) => e.arc.meta.id === result.entry.arc.meta.id);
    expect(entry).toBeDefined();

    // The appliance-client identity of the imported cartridge == arc's pin.
    // Same content, same digest, two clients — the two-client model, verified.
    const identity = cartridgeIdentity(cartridgeForEntry(entry!));
    expect(identity).toBe(FIRST_LOCKOUT_DIGEST);
  });
});
