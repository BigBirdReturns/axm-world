import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUNDLED_CARTRIDGES } from "../../src/world/cartridge.js";
import { EXPECTED_BUNDLED_DIGESTS } from "../../src/world/bundled-digests.js";
import { LEGACY_BUNDLED_DIGESTS } from "../../src/world/legacy-revisions.js";
import { readSecondRecensionNote } from "../../src/godscar/second-recension.js";
import { SOURCE_PLANE_REGISTRY } from "../../src/source-planes/registry.js";
import { parsePortableRun } from "../../src/engine/portable-run.js";
import { connectedOperationFromRun } from "../../src/engine/connected-operation.js";

function sourceFor(id: string): { notes?: unknown; identity?: { version?: string; parentCanons?: string[] } } {
  const cartridge = BUNDLED_CARTRIDGES.find((candidate) => candidate.manifest.id === id);
  if (!cartridge) throw new Error(`Missing bundled cartridge ${id}`);
  const source = Object.values(cartridge.arc.extensions ?? {}).find((value) =>
    value && typeof value === "object" && !Array.isArray(value) &&
    (value as { identity?: { id?: string } }).identity?.id === id
  );
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error(`Missing source extension for ${id}`);
  return source as { notes?: unknown; identity?: { version?: string; parentCanons?: string[] } };
}

describe("Second Recension Books I-III in Rodoh", () => {
  it("vendors three source planes and no Book IV implementation", () => {
    expect(SOURCE_PLANE_REGISTRY.map((entry) => entry.format)).toEqual([
      "godscar-pocket/1", "dark-tomb-pocket/1", "common-ship-pocket/1",
    ]);
    expect(SOURCE_PLANE_REGISTRY.some((entry) => /book.?iv|lineage/i.test(entry.id + entry.format + entry.label))).toBe(false);
  });

  it.each([
    ["kind-gods-of-ilyon", "book-i", "1.1.0", "The Consequence Plane"],
    ["lamp-district", "book-ii", "1.1.0", "The Living Tomb"],
    ["relief-circuit", "book-iii", "1.1.0", "The Expanded Commonship"],
  ] as const)("preserves the reviewed %s note", (id, bookId, version, parentTitle) => {
    const source = sourceFor(id);
    const note = readSecondRecensionNote(source.notes as never);
    expect(note?.bookId).toBe(bookId);
    expect(note?.preservesFirstRecension).toBe(true);
    expect(note?.bookIVExcluded).toBe(true);
    expect(source.identity?.version).toBe(version);
    expect(source.identity?.parentCanons?.some((entry) => entry.includes(parentTitle))).toBe(true);
  });

  it("keeps the immediate prior identities as historical locators", () => {
    for (const id of ["kind-gods-of-ilyon", "lamp-district", "relief-circuit"]) {
      expect(LEGACY_BUNDLED_DIGESTS[id]).toBeTruthy();
      expect(EXPECTED_BUNDLED_DIGESTS[id]).not.toBe(LEGACY_BUNDLED_DIGESTS[id]);
    }
  });

  it("preserves expanded cross-book custody", () => {
    const json = readFileSync(new URL("../../cartridges/relief-circuit-lamp-district.run.json", import.meta.url), "utf8");
    const connected = connectedOperationFromRun(parsePortableRun(json));
    expect(connected?.operation.transfer.provenance).toHaveLength(3);
    expect(connected?.operation.transfer.decisions).toHaveLength(3);
    expect(connected?.operation.transfer.dissent).toHaveLength(1);
    expect(connected?.operation.transfer.uncertainty).toHaveLength(1);
    expect(connected?.operation.transfer.obligations).toHaveLength(3);
    expect(connected?.operation.transfer.unknownMemory).toHaveProperty("meridian.unparsed@1");
    expect(connected?.operation.returnLedger.dissent).toHaveLength(1);
    expect(connected?.operation.returnLedger.unknownMemory).toHaveProperty("lamp-district.uninterpreted@1");
  });
});
