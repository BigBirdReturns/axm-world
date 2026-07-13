import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { LEDGER_SCHEMA_VERSION } from "../../src/world/ledger";
import { PROGRAM_001 } from "../../src/world/program-of-record";

// #69 — the durable truth model is wired end to end: version lockstep, the resolve
// path builds+stamps a consequence, old saves migrate (not discarded), and the
// record exports with the run.

function read(rel: string): string {
  return fs.readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");
}

describe("consequence schema wiring (#69)", () => {
  it("keeps LEDGER_SCHEMA_VERSION and PROGRAM_001.ledgerSchemaVersion in lockstep", () => {
    // The two version literals were unsynchronized by convention; enforce it now.
    expect(PROGRAM_001.ledgerSchemaVersion).toBe(LEDGER_SCHEMA_VERSION);
  });

  it("the resolve path builds a structured consequence and stamps it onto the entry", () => {
    const src = read("src/world/useArcWorld.ts");
    expect(src).toContain("buildConsequence({");
    expect(src).toContain("consequence,");
  });

  it("the exported custody object carries the full ledger, so consequences export with the run", () => {
    const custody = read("src/world/custody.ts");
    const world = read("src/world/useArcWorld.ts");
    expect(custody).toContain("ledger: Ledger;");
    expect(custody).toContain("format: typeof RUN_FORMAT_VERSION");
    expect(custody).toContain("compatibility: CompatibilityReceipt");
    expect(custody).toContain("transformedLocations: deriveWorldTransformations");
    expect(world).toContain("buildCustodyObject({ cartridge, org, openingChoice, nodes: layout.nodes, ledger })");
  });

  it("old saves are MIGRATED (not discarded) on load — the save version is unchanged", () => {
    const save = read("src/world/save.ts");
    expect(save).toContain("migrateLedger(ledger as Ledger)");
    // Bumping SAVE_SCHEMA_VERSION would discard old saves wholesale; we keep it at 1
    // and backfill instead, so old runs degrade honestly rather than vanish.
    expect(save).toContain("export const SAVE_SCHEMA_VERSION = 1;");
  });
});
