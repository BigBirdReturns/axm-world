import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("orbital lens proof gates", () => {
  it("requires every release capability to name artifact, receipt, and non-claim", () => {
    const ledger = read("docs/product/capability-ledger.md");
    expect(ledger).toContain("Visible artifact or interaction");
    expect(ledger).toContain("Deterministic receipt");
    expect(ledger).toContain("Explicit non-claim");
    for (const receipt of ["walkable-world.test.ts", "playable-world-acceptance.test.ts", "compatibility-receipt.test.ts", "embodiment-contract.test.ts"]) {
      expect(ledger).toContain(receipt);
    }
  });

  it("keeps ownership and compatibility boundaries normative", () => {
    const ledger = read("docs/product/capability-ledger.md");
    for (const owner of ["AXM-ARC / cartridge", "AXM-WORLD", "Engine", "Theme/assets"]) expect(ledger).toContain(owner);
    expect(ledger).toContain("A different major is `migration-required`");
    expect(ledger).toContain("Malformed versions are `unknown`");
  });

  it("makes the 52/52 score conditional on executable evidence", () => {
    const lessons = read("docs/design/lenses/lessons-gates-and-edges-v0.2.md");
    expect(lessons).toContain("Total: **52/52**, conditional");
    expect(lessons).toContain("No public capability claim without a visible artifact and deterministic receipt");
    expect(lessons).toContain("No roadmap capability presented as demonstrated");
  });
});
