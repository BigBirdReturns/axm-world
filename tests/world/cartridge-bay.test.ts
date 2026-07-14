import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import { FIRST_CHARTER } from "../../src/arcs/index.js";
import { foundOrganization } from "../../src/engine/founding.js";
import { compileArcToPlayScene } from "../../src/play-pipeline/compile.js";
import type { Arc } from "../../src/engine/types.js";
import {
  bayImportPreflight,
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
    opening: undefined,
    founding: undefined,
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

  it("cartridgeForEntry resolves bundled Arc-owned opening law", () => {
    const [bundled] = ensureBundledCartridges();
    const cartridge = cartridgeForEntry(bundled!);
    expect(cartridge.arc.opening).toBeDefined();
    expect(cartridge.arc.opening!.triggerType).toBe("founding-oath");
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

  it("imports a full presentation envelope without accepting self-asserted trust", () => {
    const arc = dummyOpsArc();
    const people = [{
      id: "ops-guide",
      name: "Iris Vale",
      role: "Guide",
      bio: "Keeps the operation legible.",
      greeting: "Ready when you are.",
      fulfilledLine: "Recorded.",
    }];
    const result = importCartridgeFromJson(JSON.stringify({
      manifest: {
        id: "spoofed-id",
        name: "Spoofed Name",
        domain: "spoofed-domain",
        engineVersion: "999.0.0",
        trust: "verified",
        preferredCostume: "map",
      },
      arc,
      people,
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");

    const cartridge = cartridgeForEntry(result.entry);
    expect(cartridge.people).toEqual(people);
    expect(cartridge.manifest).toMatchObject({
      id: arc.meta.id,
      name: arc.meta.name,
      domain: arc.meta.domain,
      engineVersion: arc.meta.engineVersion,
      trust: "imported-unsigned",
      preferredCostume: "map",
    });
  });

  it("rejects an envelope-only executable opening through the actual import seam", () => {
    const arc = { ...dummyOpsArc(), opening: undefined };
    const result = importCartridgeFromJson(JSON.stringify({
      manifest: { id: arc.meta.id },
      arc,
      opening: FIRST_CHARTER.opening,
    }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.join(" ")).toMatch(/outside Arc identity/);
    expect(loadCartridgeBay()).toEqual([]);
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
    // This legacy imported Arc authors no opening; World never synthesizes one.
    expect(cartridge.arc.opening).toBeUndefined();

    const org = foundOrganization(cartridge.arc);
    expect(Object.keys(org.agents).length).toBeGreaterThan(0);

    const scene = compileArcToPlayScene(cartridge.arc, org);
    expect(scene.arcId).toBe("operations-lab-demo");
    const titles = scene.nodes.map((n) => n.title);
    expect(titles).toContain("Intake Audit");
    expect(titles).toContain("Handoff Report");
    expect(titles).not.toContain("The Cellar"); // first-charter's own vocabulary must not leak in
  });
});

describe("cartridge bay: import preflight (PR 053, arc-073 parity)", () => {
  it("rejects invalid JSON without mutating the bay, same errors the write path would give", () => {
    const bundled = ensureBundledCartridges();
    const result = bayImportPreflight("{ this is not json", bundled);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors[0]).toMatch(/JSON parse error/);
    // Purity: preflight never touches storage.
    expect(loadCartridgeBay()).toEqual(bundled);
  });

  it("rejects schema-invalid arcs and surfaces validation errors, same as the write path", () => {
    const bundled = ensureBundledCartridges();
    const result = bayImportPreflight(invalidArcJson(), bundled);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("reports 'new' for a cartridge id never seen in the bay", () => {
    const bundled = ensureBundledCartridges();
    const arc = dummyOpsArc();
    const result = bayImportPreflight(JSON.stringify(arc), bundled);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.action).toBe("new");
    expect(result.existing).toBeNull();
    expect(result.sameIdBundled).toBeNull();
    expect(result.digest).toMatch(/^cart1_[0-9a-f]{64}$/);

    // Purity: entries passed in are untouched, and nothing was persisted.
    expect(bundled.length).toBe(ensureBundledCartridges().length);
    expect(loadCartridgeBay().some((e) => e.arc.meta.id === "operations-lab-demo")).toBe(false);
  });

  it("reports 'duplicate' when re-importing byte-identical content already in the bay", () => {
    const arc = dummyOpsArc();
    importCartridgeFromJson(JSON.stringify(arc));
    const entries = listCartridges();

    const result = bayImportPreflight(JSON.stringify(arc), entries);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.action).toBe("duplicate");
    expect(result.existing).not.toBeNull();
    expect(result.existing!.source).toBe("file");
    expect(result.existing!.digest).toBe(result.digest);
  });

  it("reports 'update' for a same-id, different-content re-import — verified against what the write path ACTUALLY does: it replaces the sole file entry with that id", () => {
    const arc = dummyOpsArc();
    importCartridgeFromJson(JSON.stringify(arc));
    const entries = listCartridges();
    const changed = { ...arc, meta: { ...arc.meta, name: "Operations Lab Demo v2" } };

    const result = bayImportPreflight(JSON.stringify(changed), entries);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.action).toBe("update");
    expect(result.existing).not.toBeNull();
    expect(result.existing!.source).toBe("file");
    expect(result.existing!.digest).not.toBe(result.digest);

    // Verify the write path actually does what the report claims: after the
    // real import, there is still exactly one file entry under this id, now
    // carrying the new content — an update, not a second entry.
    importCartridgeFromJson(JSON.stringify(changed));
    const stored = loadCartridgeBay().filter((e) => e.arc.meta.id === "operations-lab-demo");
    expect(stored).toHaveLength(1);
    expect(stored[0]!.arc.meta.name).toBe("Operations Lab Demo v2");
  });

  it("reports sameIdBundled whenever the incoming id matches a bundled entry, independent of action", () => {
    const bundled = ensureBundledCartridges();
    // Same id as the bundled entry, different content — action is "new" (no
    // FILE entry shares this id yet), but sameIdBundled must still fire: the
    // write path never touches the bundled entry for this id either way.
    const shadow: Arc = { ...FIRST_CHARTER, meta: { ...FIRST_CHARTER.meta, name: "Imported Shadow Charter" } };
    const result = bayImportPreflight(JSON.stringify(shadow), bundled);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.action).toBe("new");
    expect(result.sameIdBundled).not.toBeNull();
    expect(result.sameIdBundled!.digest).not.toBe(result.digest);
  });

  it("never mutates the entries array it's given", () => {
    const entries = ensureBundledCartridges();
    const snapshot = JSON.stringify(entries);
    bayImportPreflight(JSON.stringify(dummyOpsArc()), entries);
    expect(JSON.stringify(entries)).toBe(snapshot);
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
