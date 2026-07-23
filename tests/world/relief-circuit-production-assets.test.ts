import { describe, expect, it } from "vitest";
import fs from "node:fs";

function read(path: string): string {
  return fs.readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
}

const ASSETS = [
  "src/assets/relief-circuit/vessel/relief-circuit-environment.svg",
  "src/assets/relief-circuit/vessel/nima-quell-portrait.svg",
  "src/assets/relief-circuit/vessel/relief-circuit-cross-section.svg",
  "src/assets/relief-circuit/vessel/relief-circuit-symbol-atlas.svg",
] as const;

describe("Relief Circuit production asset preparation", () => {
  it("ships four project-owned semantic vector sources", () => {
    for (const path of ASSETS) {
      const source = read(path);
      expect(source, path).toContain("<svg");
      expect(source, path).toContain('role="img"');
      expect(source, path).toMatch(/viewBox="0 0 \d+ \d+"/);
      expect(source, path).toContain("<title id=\"title\">");
      expect(source, path).toContain("<desc id=\"desc\">");
      expect(source, path).not.toContain("data:image");
      expect(source, path).not.toContain("http://");
      expect(source.length, path).toBeGreaterThan(2_000);
    }
  });

  it("depicts the actual Common Ship operating vocabulary", () => {
    const environment = read(ASSETS[0]);
    expect(environment).toContain("DRY COMMAND / HOST BASELINE");
    expect(environment).toContain("AQUATIC CARE / PRESSURE CONTINUITY");
    expect(environment).toContain("HIGH-GRAVITY WORK / LOAD-RATED ROUTE");
    expect(environment).toContain("COUNTERBORN CONTINUITY / DIVERGENT FORKS");

    const crossSection = read(ASSETS[2]);
    for (const label of [
      "TRANSIT BODY",
      "HABITAT BANDS",
      "COMMON THRESHOLDS",
      "TRANSLATION MESH",
      "WATCH LATTICE",
      "CONTINUITY COMMONS",
      "COMMON CHARTER",
      "SCARWAY TO LAMP DISTRICT",
    ]) {
      expect(crossSection).toContain(label);
    }

    const atlas = read(ASSETS[3]);
    for (const label of [
      "ROLE COVERAGE",
      "TEMPORAL OVERLAP",
      "HABITAT COMPAT.",
      "TRANSLATION RESILIENCE",
      "HANDOFF CONTINUITY",
      "LIFE-FRACTION FAIRNESS",
      "HABITAT INTEGRITY",
      "TEMPORAL COHERENCE",
      "TRANSLATION TRUST",
      "ROSTER RESILIENCE",
      "STORES AND CARE",
      "CONTINUITY",
      "VISIBILITY",
      "COMPATIBILITY DEBT",
    ]) {
      expect(atlas).toContain(label);
    }
  });

  it("records an explicit pre-Gate-6 custody boundary", () => {
    const manifest = JSON.parse(read("src/assets/relief-circuit/vessel/provenance.json")) as {
      format: string;
      status: string;
      authorship: string;
      releaseBoundary: string;
      assets: Array<{ path: string }>;
      validation: { required: string[] };
    };
    expect(manifest.format).toBe("axm-runtime-asset-provenance/1");
    expect(manifest.status).toBe("production-asset-pack-prepared");
    expect(manifest.authorship).toContain("No external art");
    expect(manifest.releaseBoundary).toContain("does not claim Gate 6 is executable");
    expect(manifest.assets.map((entry) => entry.path)).toEqual(ASSETS);
    expect(manifest.validation.required).toContain("no asset is imported by World before Gate 5 source authority is accepted");
  });

  it("does not prematurely bind the prepared pack into the current World runtime", () => {
    const player = read("src/world/Player.tsx");
    expect(player).not.toContain("relief-circuit-environment.svg");
    expect(player).not.toContain("nima-quell-portrait.svg");
    expect(player).not.toContain("relief-circuit-cross-section.svg");
    expect(player).not.toContain("relief-circuit-symbol-atlas.svg");
  });
});