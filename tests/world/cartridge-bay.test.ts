import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { bootstrapOrg } from "../../src/spoke/bootstrap.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import type { Arc } from "../../src/engine/types.js";
import {
  cartridgeForEntry,
  ensureBundledCartridges,
  importCartridgeFromJson,
  listCartridges,
  loadCartridgeBay,
  removeCartridge,
} from "../../src/world/cartridge-bay.js";

// The bay's persistence idiom is plain localStorage — same as the hub's
// arc-library.ts and world's own presentation-prefs.ts/locale.ts — but this
// suite runs under vitest's `node` environment, which has no localStorage
// global. A tiny in-memory stand-in is enough to exercise the real read/write
// path (rather than skip it, the way the codebase's *other* localStorage
// modules go untested today).
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

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

function dummyOpsArc(): Arc {
  return {
    ...FIRST_CHARTER,
    meta: {
      ...FIRST_CHARTER.meta,
      id: "operations-lab-demo",
      name: "Operations Lab Demo",
      domain: "operations-lab",
    },
    challenges: FIRST_CHARTER.challenges.map((challenge, index) => ({
      ...challenge,
      id: `ops-task-${index + 1}`,
      name: ["Intake Audit", "Patch Rollout", "Incident Review", "Escalation Sync", "Recovery Drill", "Handoff Report"][index] ?? `Ops Task ${index + 1}`,
      description: "A different cartridge's own vocabulary, same engine grammar.",
    })),
  };
}

function invalidArcJson(): string {
  return JSON.stringify({ meta: { id: "not-an-arc" } });
}

beforeEach(() => {
  (globalThis as { localStorage?: Storage }).localStorage = new MemoryStorage();
});

describe("cartridge bay: bundled cartridges", () => {
  it("ensures FIRST_CHARTER is present as a bundled, permanent entry", () => {
    const entries = ensureBundledCartridges();
    const bundled = entries.find((e) => e.source === "bundled");
    expect(bundled).toBeDefined();
    expect(bundled!.arc.meta.id).toBe(FIRST_CHARTER.meta.id);
    expect(bundled!.trust).toBe("bundled");
  });

  it("cartridgeForEntry resolves the bundled entry to the real FIRST_CHARTER_CARTRIDGE, opening included", () => {
    const [bundled] = ensureBundledCartridges();
    const cartridge = cartridgeForEntry(bundled!);
    expect(cartridge.opening).toBeDefined();
    expect(cartridge.opening!.triggerType).toBe("founding-oath");
  });
});

describe("cartridge bay: import", () => {
  it("imports a valid arc and round-trips it into the bay", () => {
    const arc = dummyOpsArc();
    const result = importCartridgeFromJson(JSON.stringify(arc));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.entry.arc.meta.id).toBe("operations-lab-demo");
    expect(result.entry.trust).toBe("imported-unsigned");
    expect(result.entry.source).toBe("file");

    const stored = loadCartridgeBay();
    expect(stored.some((e) => e.arc.meta.id === "operations-lab-demo" && e.source === "file")).toBe(true);
  });

  it("rejects invalid JSON without ever storing a half-loaded cartridge", () => {
    const result = importCartridgeFromJson("{ this is not json");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors[0]).toMatch(/JSON parse error/);
    expect(loadCartridgeBay()).toEqual([]);
  });

  it("rejects schema-invalid arcs and surfaces the validation error, never storing them", () => {
    const result = importCartridgeFromJson(invalidArcJson());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(loadCartridgeBay()).toEqual([]);
  });

  it("re-importing the same id updates the existing file entry rather than duplicating it", () => {
    const arc = dummyOpsArc();
    importCartridgeFromJson(JSON.stringify(arc));
    const renamed = { ...arc, meta: { ...arc.meta, name: "Operations Lab Demo v2" } };
    importCartridgeFromJson(JSON.stringify(renamed));

    const stored = loadCartridgeBay().filter((e) => e.arc.meta.id === "operations-lab-demo");
    expect(stored).toHaveLength(1);
    expect(stored[0]!.arc.meta.name).toBe("Operations Lab Demo v2");
  });
});

describe("cartridge bay: listing and per-arc keying", () => {
  it("listCartridges includes both the bundled entry and imported entries", () => {
    importCartridgeFromJson(JSON.stringify(dummyOpsArc()));
    const entries = listCartridges();
    expect(entries.some((e) => e.source === "bundled" && e.arc.meta.id === FIRST_CHARTER.meta.id)).toBe(true);
    expect(entries.some((e) => e.source === "file" && e.arc.meta.id === "operations-lab-demo")).toBe(true);
  });

  it("an imported arc that reuses the bundled arc's id does not clobber the bundled entry", () => {
    const shadow: Arc = { ...FIRST_CHARTER, meta: { ...FIRST_CHARTER.meta, name: "Imported Shadow Charter" } };
    const result = importCartridgeFromJson(JSON.stringify(shadow));
    expect(result.ok).toBe(true);

    const entries = listCartridges();
    const bundledEntry = entries.find((e) => e.source === "bundled" && e.arc.meta.id === FIRST_CHARTER.meta.id);
    const fileEntry = entries.find((e) => e.source === "file" && e.arc.meta.id === FIRST_CHARTER.meta.id);
    expect(bundledEntry).toBeDefined();
    expect(fileEntry).toBeDefined();
    expect(bundledEntry!.arc.meta.name).toBe(FIRST_CHARTER.meta.name); // untouched
    expect(fileEntry!.arc.meta.name).toBe("Imported Shadow Charter"); // its own, separately keyed
    // The two coexist under the same arc id, distinguished only by source —
    // exactly the (id, source) tuple keying the hub's arc-library.ts uses.
    expect(bundledEntry).not.toBe(fileEntry);
  });
});

describe("cartridge bay: remove", () => {
  it("removes an imported (file) entry", () => {
    importCartridgeFromJson(JSON.stringify(dummyOpsArc()));
    expect(listCartridges().some((e) => e.arc.meta.id === "operations-lab-demo")).toBe(true);

    removeCartridge("operations-lab-demo");
    expect(listCartridges().some((e) => e.arc.meta.id === "operations-lab-demo")).toBe(false);
  });

  it("never removes the bundled entry, even if asked to remove its id", () => {
    ensureBundledCartridges();
    removeCartridge(FIRST_CHARTER.meta.id);
    expect(listCartridges().some((e) => e.source === "bundled" && e.arc.meta.id === FIRST_CHARTER.meta.id)).toBe(true);
  });
});

describe("cartridge bay: behavioral — an imported cartridge with a wholly different vocabulary is playable", () => {
  it("validates, bootstraps a roster, and compiles into a playable scene using the imported names, not first-charter's", () => {
    const arc = dummyOpsArc();
    const result = importCartridgeFromJson(JSON.stringify(arc));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    const cartridge = cartridgeForEntry(result.entry);
    // No authored opening for an imported cartridge — the boot path must not require one.
    expect(cartridge.opening).toBeUndefined();

    const org = bootstrapOrg(cartridge.arc);
    expect(Object.keys(org.agents).length).toBeGreaterThan(0);

    const scene = compileArcToPlayScene(cartridge.arc, org);
    expect(scene.arcId).toBe("operations-lab-demo");
    const titles = scene.nodes.map((n) => n.title);
    expect(titles).toContain("Intake Audit");
    expect(titles).toContain("Handoff Report");
    expect(titles).not.toContain("The Cellar"); // first-charter's own vocabulary must not leak in
  });
});

describe("boot screen: cartridge loader affordances exist", () => {
  it("Player.tsx exposes the open-cartridge file picker and wires the loader", () => {
    const player = read("src/world/Player.tsx");
    expect(player).toContain('data-testid="open-cartridge"');
    expect(player).toContain("importCartridgeFromJson");
    expect(player).toContain("cartridgeForEntry");
    expect(player).toContain("removeCartridge");
  });

  it("CartridgeBayCard renders the per-entry trust chip", () => {
    // The bay row (trust chip + Enter/Resume) moved into CartridgeBayCard when
    // the program-of-record plaque was added; the affordance still exists, just
    // in the component the boot screen renders per entry.
    const card = read("src/world/components/CartridgeBayCard.tsx");
    expect(card).toContain("data-testid={`trust-chip-${entry.trust}`}");
    expect(card).toContain('"boot.trustBundled"');
    expect(card).toContain('"boot.trustImportedUnsigned"');
  });

  it("CartridgeObjectPanel surfaces a Trust row", () => {
    const panel = read("src/world/components/CartridgeObjectPanel.tsx");
    expect(panel).toContain('t("cartridgePanel.trust")');
    expect(panel).toContain("TRUST_LABEL_ID[manifest.trust]");
  });
});
