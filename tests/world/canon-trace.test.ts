import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");
const TRACE_PATH = resolve(ROOT, "docs/canon/GODSCAR_CANON_TRACE.json");
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as {
  format: string;
  publication: { implementedCanon: string[]; publicationOnlyCanon: string[] };
  implementationBoundary: { implementedVolumes: string[]; stagedVolumes: string[] };
  claims: Array<{
    claimId: string;
    volume: string;
    recension: string;
    claim: string;
    evidenceTier: string;
    sourceAuthority: string[];
    compilerOrEngine: string[];
    tests: string[];
    references: string[];
    worldRepresentations: string[];
    assets: string[];
    releaseEvidence: string[];
    status: string;
  }>;
};

function allReferences(claim: (typeof trace.claims)[number]): string[] {
  return [
    ...claim.sourceAuthority,
    ...claim.compilerOrEngine,
    ...claim.tests,
    ...claim.references,
    ...claim.assets,
    ...claim.releaseEvidence,
  ];
}

describe("Godscar canon trace", () => {
  it("keeps one unique, inspectable claim ledger over implemented canon", () => {
    expect(trace.format).toBe("godscar-canon-trace/1");
    expect(trace.claims.length).toBeGreaterThanOrEqual(12);
    const ids = trace.claims.map((claim) => claim.claimId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(trace.implementationBoundary.implementedVolumes).toEqual([
      "book-i",
      "book-ii",
      "book-iii",
      "second-recension",
    ]);
    expect(trace.implementationBoundary.stagedVolumes).toEqual(["book-iv"]);
    expect(trace.publication.implementedCanon).toContain("second-recension-addenda-books-i-iii");
    expect(trace.publication.publicationOnlyCanon).toEqual(["book-iv-lineage-commons"]);
  });

  it("resolves every repository reference and refuses unsupported implementation claims", () => {
    for (const claim of trace.claims) {
      expect(claim.claim.trim()).not.toBe("");
      for (const reference of allReferences(claim)) {
        expect(existsSync(resolve(ROOT, reference)), `${claim.claimId} references missing path ${reference}`).toBe(true);
      }
      if (claim.status === "implemented") {
        expect(claim.tests.length, `${claim.claimId} must name executable evidence`).toBeGreaterThan(0);
        expect(claim.releaseEvidence.length, `${claim.claimId} must name release evidence`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps Book IV at the reviewed staging boundary", () => {
    const bookIV = trace.claims.filter((claim) => claim.volume === "book-iv");
    expect(bookIV).toHaveLength(1);
    expect(bookIV[0]).toMatchObject({
      status: "staged-post-1.0",
      evidenceTier: "implementation-boundary",
      sourceAuthority: [],
      worldRepresentations: [],
      assets: [],
    });
    const registry = readFileSync(resolve(ROOT, "src/source-planes/registry.ts"), "utf8");
    const programs = readFileSync(resolve(ROOT, "src/world/program-of-record.ts"), "utf8");
    expect(registry).not.toMatch(/lineage[- ]commons|book[- ]?iv/i);
    expect(programs).not.toMatch(/Program 006|PROGRAM 006|lineage[- ]commons/i);
  });
});
