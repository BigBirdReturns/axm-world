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

  it("the exact v3 export carries the full ledger as a namespaced runtime extension", () => {
    const custody = read("src/world/custody.ts");
    const adapter = read("src/world/portable-run.ts");
    const world = read("src/world/useArcWorld.ts");
    expect(custody).toContain("export type CustodyObject = PortableRunV3");
    expect(custody).toContain("buildRodohPortableRun");
    expect(adapter).toContain('export const RODOH_LEDGER_EXTENSION = "rodoh.ledger@2"');
    expect(adapter).toContain("[RODOH_LEDGER_EXTENSION]");
    expect(world).toContain("buildRodohPortableRun({");
    expect(world).toContain("ledger,");
  });

  it("old saves are MIGRATED (not discarded) on load — the save version is unchanged", () => {
    const save = read("src/world/save.ts");
    expect(save).toContain("migrateLedger(ledger as Ledger)");
    // Bumping SAVE_SCHEMA_VERSION would discard old saves wholesale; we keep it at 1
    // and backfill instead, so old runs degrade honestly rather than vanish.
    expect(save).toContain("export const SAVE_SCHEMA_VERSION = 1;");
  });
});
