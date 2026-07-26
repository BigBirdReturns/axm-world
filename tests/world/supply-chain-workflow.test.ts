import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../..");

describe("coordinated signed-evidence workflow", () => {
  it("requires Arc-owned provenance and CycloneDX attestations for the exact dependency", () => {
    const workflow = readFileSync(resolve(ROOT, ".github/workflows/supply-chain-evidence.yml"), "utf8");
    expect(workflow).toContain("axm-arc-build-provenance-verification.json");
    expect(workflow).toContain("axm-arc-cyclonedx-verification.json");
    expect(workflow).toContain("--predicate-type https://slsa.dev/provenance/v1");
    expect(workflow).toContain("--predicate-type https://cyclonedx.org/bom");
    expect(workflow.match(/--repo BigBirdReturns\/axm-arc/g)).toHaveLength(2);
    expect(workflow.match(/--source-digest "\$ARC_SHA"/g)).toHaveLength(2);
    expect(workflow.match(/--source-ref refs\/heads\/main/g)).toHaveLength(2);
    expect(workflow.match(/--signer-workflow BigBirdReturns\/axm-arc\/.github\/workflows\/supply-chain-evidence.yml/g)).toHaveLength(2);
  });
});
