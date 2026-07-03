// The Program 001 controlled object binds The First Charter's AUTHORED identity
// to its runtime surfaces + schema versions. These tests pin the invariant that
// makes the whole slice provable: a program's identity is the digest of its
// cartridge's arc — derived, never claimed — and equals the pinned golden value
// every other surface resolves to.

import { describe, it, expect } from "vitest";
import { PROGRAM_001, defineProgram } from "../../src/world/program-of-record";
import { FIRST_CHARTER_CARTRIDGE } from "../../src/world/cartridge";
import { cartridgeIdentity } from "../../src/world/cartridge-identity";
import { EXPECTED_BUNDLED_DIGESTS } from "../../src/world/bundled-digests";

describe("Program 001 — controlled object", () => {
  it("binds The First Charter with its computed authored-arc digest (not a claimed value)", () => {
    expect(PROGRAM_001.programId).toBe("program-001");
    expect(PROGRAM_001.cartridgeId).toBe("first-charter");
    expect(PROGRAM_001.authoredArcDigest).toBe(cartridgeIdentity(FIRST_CHARTER_CARTRIDGE));
    // Resolves to the same pinned golden digest the bundled-digest guard enforces.
    expect(PROGRAM_001.authoredArcDigest).toBe(EXPECTED_BUNDLED_DIGESTS["first-charter"]);
  });

  it("declares save + ledger schema versions and runtime surfaces", () => {
    expect(PROGRAM_001.saveSchemaVersion).toBe(1);
    expect(PROGRAM_001.ledgerSchemaVersion).toBe(1);
    expect(PROGRAM_001.runtimeSurfaces).toContain("ledger");
    expect(PROGRAM_001.runtimeSurfaces).toContain("world");
  });

  it("records the authored-arc digest in bundledAssets keyed by cartridge id", () => {
    expect(PROGRAM_001.bundledAssets[PROGRAM_001.cartridgeId]).toBe(PROGRAM_001.authoredArcDigest);
  });

  it("defineProgram derives the digest from the cartridge, ignoring manifest claims", () => {
    const p = defineProgram("program-test", FIRST_CHARTER_CARTRIDGE, {
      runtimeSurfaces: ["board"],
      saveSchemaVersion: 1,
      ledgerSchemaVersion: 1,
    });
    expect(p.authoredArcDigest).toBe(cartridgeIdentity(FIRST_CHARTER_CARTRIDGE));
    expect(p.cartridgeName).toBe(FIRST_CHARTER_CARTRIDGE.manifest.name);
  });
});
