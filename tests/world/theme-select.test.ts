// PR 055 — the neutral-skin default, guarded. The generic appliance path (PR
// 051–054) already resolves any unknown/imported arc to the base Rodoh theme
// with no palette scope and no bundled motifs (src/world/themes/select.ts);
// this file is the guard that pins that default so it can never silently
// regress. This is the Article-2/5 guard (docs/adr/0002-platform-
// constitution.md): identity is computed, not claimed, and old/unknown
// cartridges always boot — in their own honest, neutral skin, never another
// cartridge's clothes.
//
// Style-matched to tests/world/karazhan-theme.test.ts, which already covers
// the two bundled cartridges' own scoping; this file adds the missing pin on
// the DEFAULT branch, exercised against a real, validated, unknown arc rather
// than a hand-fabricated one.
import { beforeEach, describe, expect, it } from "vitest";
import type { Arc } from "../../src/engine/types.js";
import { FIRST_CHARTER, KARAZHAN } from "../../src/arcs/index.js";
import {
  cartridgeForEntry,
  importCartridgeFromJson,
} from "../../src/world/cartridge-bay.js";
import { firstLockoutCartridgeJson } from "../../src/world/appliance/index.js";
import {
  RODOH_BASE_THEME,
  FIRST_CHARTER_THEME,
  KARAZHAN_THEME,
  themeForArc,
  cartridgePaletteScope,
  hasCartridgeMotifs,
} from "../../src/world/themes/index.js";

// Same in-memory localStorage stand-in as the other appliance tests
// (tests/world/appliance-boot.test.ts, appliance-first-lockout.test.ts) — the
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

/** A real, validated, UNKNOWN arc — first-lockout, imported through the actual
 *  boot seam exactly as a player's cartridge would be. Its `meta.id` is
 *  "first-lockout", which neither bundled theme claims (confirmed below), so
 *  it stands in for any imported cartridge (e.g. Operations Lab) without
 *  fabricating an arc shape by hand. */
function importFirstLockout(): Arc {
  const result = importCartridgeFromJson(firstLockoutCartridgeJson());
  if (!result.ok) throw new Error(`import failed: ${result.errors.join(", ")}`);
  return cartridgeForEntry(result.entry).arc;
}

describe("theme selection default: unknown/imported arcs", () => {
  it("first-lockout's id is neither bundled theme's id (a genuine unknown)", () => {
    const arc = importFirstLockout();
    expect(arc.meta.id).not.toBe(KARAZHAN_THEME.id);
    expect(arc.meta.id).not.toBe(FIRST_CHARTER_THEME.id);
  });

  it("resolves to the base Rodoh theme — the very singleton, not a copy", () => {
    const arc = importFirstLockout();
    // Identity, not deep-equal: the seam must return the one shared theme
    // object, so nothing downstream can hold a lookalike that later drifts.
    expect(themeForArc(arc)).toBe(RODOH_BASE_THEME);
  });

  it("carries no palette scope — no data-cartridge attribute is ever set for it", () => {
    const arc = importFirstLockout();
    expect(cartridgePaletteScope(arc)).toBeNull();
  });

  it("carries no bundled encounter motifs", () => {
    const arc = importFirstLockout();
    expect(hasCartridgeMotifs(arc)).toBe(false);
  });
});

describe("theme selection positive dispatch (pinned so the default branch above can't be reached by accident)", () => {
  it("Karazhan's own id resolves to KARAZHAN_THEME", () => {
    expect(KARAZHAN.meta.id).toBe(KARAZHAN_THEME.id);
    expect(themeForArc(KARAZHAN)).toBe(KARAZHAN_THEME);
    expect(themeForArc(KARAZHAN).id).toBe(KARAZHAN_THEME.id);
  });

  it("First Charter's own id resolves to FIRST_CHARTER_THEME", () => {
    expect(FIRST_CHARTER.meta.id).toBe(FIRST_CHARTER_THEME.id);
    expect(themeForArc(FIRST_CHARTER)).toBe(FIRST_CHARTER_THEME);
    expect(themeForArc(FIRST_CHARTER).id).toBe(FIRST_CHARTER_THEME.id);
  });
});
